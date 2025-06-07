/**
 * Modern Engagement Number Parser
 * Replaces regex-based number parsing with humanize-plus library
 */

import * as humanize from 'humanize-plus';

export interface ParsedNumber {
  value: number;
  formatted: string;
  unit?: string;
  confidence: number;
  source: 'exact' | 'abbreviated' | 'estimated';
}

export interface EngagementMetrics {
  likes?: ParsedNumber;
  shares?: ParsedNumber;
  comments?: ParsedNumber;
  views?: ParsedNumber;
  followers?: ParsedNumber;
  retweets?: ParsedNumber;
  bookmarks?: ParsedNumber;
}

/**
 * Parse a text string that may contain an abbreviated number
 */
export function parseEngagementNumber(text: string): ParsedNumber | null {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const cleaned = text.trim().toLowerCase();

  // Handle special cases first
  const specialCases: Record<string, number> = {
    'none': 0,
    'zero': 0,
    'n/a': 0,
    'na': 0,
    '-': 0,
    '': 0
  };

  if (cleaned in specialCases) {
    return {
      value: specialCases[cleaned],
      formatted: cleaned,
      confidence: 0.9,
      source: 'exact'
    };
  }

  // Try to extract number from text
  const numberMatch = extractNumberFromText(cleaned);
  if (!numberMatch) {
    return null;
  }

  const { number, suffix, rawText } = numberMatch;

  // Convert based on suffix
  let multiplier = 1;
  let unit: string | undefined;
  let source: 'exact' | 'abbreviated' | 'estimated' = 'exact';
  let confidence = 0.9;

  switch (suffix.toLowerCase()) {
    case 'k':
    case 'thousand':
      multiplier = 1000;
      unit = 'thousand';
      source = 'abbreviated';
      break;
    case 'm':
    case 'million':
      multiplier = 1000000;
      unit = 'million';
      source = 'abbreviated';
      break;
    case 'b':
    case 'billion':
      multiplier = 1000000000;
      unit = 'billion';
      source = 'abbreviated';
      break;
    case 't':
    case 'trillion':
      multiplier = 1000000000000;
      unit = 'trillion';
      source = 'abbreviated';
      break;
    default:
      // No suffix, exact number
      if (suffix) {
        confidence = 0.7; // Unknown suffix
      }
  }

  const value = Math.round(number * multiplier);

  // Sanity checks
  if (value < 0 || value > Number.MAX_SAFE_INTEGER) {
    return null;
  }

  return {
    value,
    formatted: rawText,
    unit,
    confidence,
    source
  };
}

/**
 * Extract number and suffix from text string
 */
function extractNumberFromText(text: string): {
  number: number;
  suffix: string;
  rawText: string;
} | null {
  // Remove common non-numeric characters but preserve decimal points
  const cleaned = text.replace(/[^\d.,kKmMbBtT]/g, '');

  if (!cleaned) {
    return null;
  }

  // Look for number followed by optional suffix
  const patterns = [
    /^(\d+(?:[.,]\d+)?)\s*([kKmMbBtT]?)$/,
    /^(\d+(?:,\d{3})*(?:\.\d+)?)\s*([kKmMbBtT]?)$/,
    /^(\d+)\s*([kKmMbBtT]?)$/
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      const numberStr = match[1].replace(/,/g, ''); // Remove commas
      const number = parseFloat(numberStr);
      const suffix = match[2] || '';

      if (!isNaN(number) && isFinite(number)) {
        return {
          number,
          suffix,
          rawText: text.trim()
        };
      }
    }
  }

  return null;
}

/**
 * Format a number as engagement display text
 */
export function formatEngagementNumber(value: number, options: {
  style?: 'short' | 'long' | 'exact';
  maxDecimalPlaces?: number;
} = {}): string {
  const { style = 'short', maxDecimalPlaces = 1 } = options;

  if (!Number.isFinite(value) || value < 0) {
    return '0';
  }

  switch (style) {
    case 'exact':
      return value.toLocaleString();

    case 'long':
      return humanize.compactInteger(value, maxDecimalPlaces);

    case 'short':
    default:
      // Use our own abbreviated format for consistency
      if (value >= 1000000000) {
        const billions = value / 1000000000;
        return `${billions.toFixed(billions >= 10 ? 0 : 1)}B`;
      } else if (value >= 1000000) {
        const millions = value / 1000000;
        return `${millions.toFixed(millions >= 10 ? 0 : 1)}M`;
      } else if (value >= 1000) {
        const thousands = value / 1000;
        return `${thousands.toFixed(thousands >= 10 ? 0 : 1)}K`;
      } else {
        return value.toString();
      }
  }
}

/**
 * Parse multiple engagement metrics from an object
 */
export function parseEngagementMetrics(data: Record<string, any>): EngagementMetrics {
  const metrics: EngagementMetrics = {};

  const metricKeys = ['likes', 'shares', 'comments', 'views', 'followers', 'retweets', 'bookmarks'];

  for (const key of metricKeys) {
    if (data[key] !== undefined) {
      const parsed = parseEngagementNumber(String(data[key]));
      if (parsed) {
        metrics[key as keyof EngagementMetrics] = parsed;
      }
    }
  }

  return metrics;
}

/**
 * Validate engagement number for reasonableness
 */
export function validateEngagementNumber(value: number, type: string): {
  isValid: boolean;
  issues: string[];
  score: number;
} {
  const issues: string[] = [];
  let score = 1.0;

  if (!Number.isFinite(value) || value < 0) {
    return { isValid: false, issues: ['Invalid number'], score: 0 };
  }

  // Type-specific validation
  const limits: Record<string, { max: number; typical: number }> = {
    likes: { max: 100000000, typical: 1000000 },     // 100M max, 1M typical
    shares: { max: 10000000, typical: 100000 },      // 10M max, 100K typical
    comments: { max: 1000000, typical: 10000 },      // 1M max, 10K typical
    views: { max: 1000000000, typical: 10000000 },   // 1B max, 10M typical
    followers: { max: 500000000, typical: 1000000 }, // 500M max, 1M typical
    retweets: { max: 10000000, typical: 100000 },    // 10M max, 100K typical
    bookmarks: { max: 1000000, typical: 10000 }      // 1M max, 10K typical
  };

  const limit = limits[type.toLowerCase()];
  if (limit) {
    if (value > limit.max) {
      issues.push(`${type} count seems too high (${value} > ${limit.max})`);
      score -= 0.5;
    } else if (value > limit.typical) {
      issues.push(`${type} count is unusually high (${value} > ${limit.typical})`);
      score -= 0.2;
    }
  }

  // General sanity checks
  if (value > 1000000000) { // 1 billion
    issues.push('Extremely high engagement number');
    score -= 0.3;
  }

  score = Math.max(0, score);
  const isValid = score >= 0.5;

  return { isValid, issues, score };
}

/**
 * Compare engagement numbers (for sorting/ranking)
 */
export function compareEngagement(a: ParsedNumber, b: ParsedNumber): number {
  // Weight by confidence
  const aWeighted = a.value * a.confidence;
  const bWeighted = b.value * b.confidence;

  return bWeighted - aWeighted; // Descending order
}

/**
 * Calculate engagement rate (likes vs followers ratio)
 */
export function calculateEngagementRate(
  likes: number,
  followers: number
): { rate: number; label: string; isGood: boolean } {
  if (followers === 0) {
    return { rate: 0, label: 'unknown', isGood: false };
  }

  const rate = (likes / followers) * 100;

  let label: string;
  let isGood: boolean;

  if (rate >= 10) {
    label = 'excellent';
    isGood = true;
  } else if (rate >= 5) {
    label = 'good';
    isGood = true;
  } else if (rate >= 2) {
    label = 'average';
    isGood = false;
  } else {
    label = 'low';
    isGood = false;
  }

  return { rate: parseFloat(rate.toFixed(2)), label, isGood };
}
