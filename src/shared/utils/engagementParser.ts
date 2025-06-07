/**
 * Modern Engagement Number Parser
 * Supports locale-specific number suffixes across multiple languages
 * Handles Chinese (万/亿), German (Mio/Mrd), Russian (тыс/млн), and more
 */

import * as humanize from 'humanize-plus';

export interface ParsedNumber {
  value: number;
  formatted: string;
  unit?: string;
  confidence: number;
  source: 'exact' | 'abbreviated' | 'estimated';
  locale?: string;
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
 * Locale-specific number suffixes with their multipliers
 */
const LOCALE_SUFFIXES: Record<string, Record<string, number>> = {
  'en': {
    'k': 1e3,
    'thousand': 1e3,
    'm': 1e6,
    'million': 1e6,
    'b': 1e9,
    'billion': 1e9,
    't': 1e12,
    'trillion': 1e12
  },
  'zh': {
    '千': 1e3,
    '万': 1e4,
    '萬': 1e4,  // Traditional Chinese
    '十万': 1e5,
    '百万': 1e6,
    '千万': 1e7,
    '亿': 1e8,
    '億': 1e8,  // Traditional Chinese
    '十亿': 1e9,
    '百亿': 1e10,
    '千亿': 1e11,
    '万亿': 1e12
  },
  'ja': {
    '千': 1e3,
    '万': 1e4,
    '十万': 1e5,
    '百万': 1e6,
    '千万': 1e7,
    '億': 1e8,
    '十億': 1e9,
    '百億': 1e10,
    '千億': 1e11,
    '兆': 1e12
  },
  'ko': {
    '천': 1e3,
    '만': 1e4,
    '십만': 1e5,
    '백만': 1e6,
    '천만': 1e7,
    '억': 1e8,
    '십억': 1e9,
    '백억': 1e10,
    '천억': 1e11,
    '조': 1e12
  },
  'de': {
    'tsd': 1e3,
    'tausend': 1e3,
    'mio': 1e6,
    'million': 1e6,
    'millionen': 1e6,
    'mrd': 1e9,
    'milliarde': 1e9,
    'milliarden': 1e9,
    'bio': 1e12,
    'billion': 1e12,
    'billionen': 1e12
  },
  'ru': {
    'тыс': 1e3,
    'тысяч': 1e3,
    'тысячи': 1e3,
    'млн': 1e6,
    'миллион': 1e6,
    'миллиона': 1e6,
    'миллионов': 1e6,
    'млрд': 1e9,
    'миллиард': 1e9,
    'миллиарда': 1e9,
    'миллиардов': 1e9,
    'трлн': 1e12,
    'триллион': 1e12
  },
  'es': {
    'mil': 1e3,
    'millón': 1e6,
    'millones': 1e6,
    'mln': 1e6,
    'mm': 1e6,
    'mil millones': 1e9,
    'billón': 1e12,
    'billones': 1e12
  },
  'fr': {
    'mille': 1e3,
    'milliers': 1e3,
    'mio': 1e6,
    'million': 1e6,
    'millions': 1e6,
    'mrd': 1e9,
    'milliard': 1e9,
    'milliards': 1e9,
    'billion': 1e12,
    'billions': 1e12
  },
  'pt': {
    'mil': 1e3,
    'milhão': 1e6,
    'milhões': 1e6,
    'mi': 1e6,
    'bilhão': 1e9,
    'bilhões': 1e9,
    'bi': 1e9,
    'trilhão': 1e12,
    'trilhões': 1e12,
    'tri': 1e12
  },
  'ar': {
    'ألف': 1e3,
    'آلاف': 1e3,
    'مليون': 1e6,
    'ملايين': 1e6,
    'مليار': 1e9,
    'مليارات': 1e9,
    'تريليون': 1e12,
    'تريليونات': 1e12
  },
  'hi': {
    'हज़ार': 1e3,
    'हजार': 1e3,
    'लाख': 1e5,
    'करोड़': 1e7,
    'अरब': 1e9,
    'खरब': 1e11
  }
};

/**
 * Detect locale from text content and context
 */
function detectLocale(text: string): string {
  // Check for locale-specific characters
  if (/[\u4e00-\u9fff]/.test(text)) return 'zh'; // Chinese
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja'; // Japanese
  if (/[\uac00-\ud7af]/.test(text)) return 'ko'; // Korean
  if (/[\u0400-\u04ff]/.test(text)) return 'ru'; // Cyrillic
  if (/[\u0600-\u06ff]/.test(text)) return 'ar'; // Arabic
  if (/[\u0900-\u097f]/.test(text)) return 'hi'; // Devanagari (Hindi)

  // Check for specific suffixes
  const lowerText = text.toLowerCase();
  if (/\b(tsd|mio|mrd)\b/.test(lowerText)) return 'de';
  if (/\b(millón|millones|mil millones)\b/.test(lowerText)) return 'es';
  if (/\b(mille|milliard)\b/.test(lowerText)) return 'fr';
  if (/\b(milhão|bilhão)\b/.test(lowerText)) return 'pt';

  return 'en'; // Default to English
}

/**
 * Parse a text string that may contain an abbreviated number
 * Supports locale-specific suffixes across multiple languages
 */
export function parseEngagementNumber(text: string, forceLocale?: string): ParsedNumber | null {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const trimmed = text.trim();

  // Handle special cases first
  const specialCases: Record<string, number> = {
    'none': 0,
    'zero': 0,
    'n/a': 0,
    'na': 0,
    '-': 0,
    '—': 0,
    '': 0
  };

  if (trimmed.toLowerCase() in specialCases) {
    return {
      value: specialCases[trimmed.toLowerCase()],
      formatted: trimmed,
      confidence: 0.9,
      source: 'exact',
      locale: 'en'
    };
  }

  // Detect locale
  const locale = forceLocale || detectLocale(trimmed);
  const suffixMap = LOCALE_SUFFIXES[locale] || LOCALE_SUFFIXES['en'];

  // Try to extract number from text
  const numberMatch = extractNumberFromText(trimmed, locale);
  if (!numberMatch) {
    return null;
  }

  const { number, suffix, rawText } = numberMatch;

  // Find multiplier from locale-specific suffixes
  let multiplier = 1;
  let unit: string | undefined;
  let source: 'exact' | 'abbreviated' | 'estimated' = 'exact';
  let confidence = 0.9;

  if (suffix) {
    // Try exact match first
    const lowerSuffix = suffix.toLowerCase();
    if (suffixMap[lowerSuffix] !== undefined) {
      multiplier = suffixMap[lowerSuffix];
      unit = suffix;
      source = 'abbreviated';
    } else {
      // Try case-sensitive match for non-Latin scripts
      if (suffixMap[suffix] !== undefined) {
        multiplier = suffixMap[suffix];
        unit = suffix;
        source = 'abbreviated';
      } else {
        // Check other locales as fallback
        for (const [loc, locSuffixes] of Object.entries(LOCALE_SUFFIXES)) {
          if (locSuffixes[lowerSuffix] !== undefined || locSuffixes[suffix] !== undefined) {
            multiplier = locSuffixes[lowerSuffix] || locSuffixes[suffix];
            unit = suffix;
            source = 'abbreviated';
            confidence = 0.8; // Lower confidence for cross-locale match
            break;
          }
        }

        if (multiplier === 1) {
          confidence = 0.6; // Unknown suffix
        }
      }
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
    source,
    locale
  };
}

/**
 * Extract number and suffix from text string
 * Enhanced to handle locale-specific formats and suffixes
 */
function extractNumberFromText(text: string, locale: string): {
  number: number;
  suffix: string;
  rawText: string;
} | null {
  if (!text) return null;

  // Build pattern based on locale suffixes
  const suffixList = Object.keys(LOCALE_SUFFIXES[locale] || LOCALE_SUFFIXES['en']);
  const escapedSuffixes = suffixList.map(s =>
    s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
  );

  // Create suffix pattern that matches any locale suffix
  const suffixPattern = escapedSuffixes.length > 0
    ? `(${escapedSuffixes.join('|')})?`
    : '()';

  // Different number formats by locale
  const numberPatterns = {
    // Standard: 1,234.56 or 1234.56
    standard: /(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)/,
    // European: 1.234,56 or 1234,56
    european: /(\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+(?:,\d+)?)/,
    // Asian: direct numbers (no separators commonly)
    asian: /(\d+(?:\.\d+)?)/,
    // Arabic/Persian: ١٢٣٤
    arabic: /([٠-٩]+(?:[٫٬][٠-٩]+)?)/,
    // Devanagari: १२३४
    devanagari: /([०-९]+(?:[।][०-९]+)?)/
  };

  // Select appropriate number pattern
  let selectedPattern: RegExp;
  switch (locale) {
    case 'de':
    case 'es':
    case 'fr':
    case 'pt':
    case 'ru':
      selectedPattern = numberPatterns.european;
      break;
    case 'zh':
    case 'ja':
    case 'ko':
      selectedPattern = numberPatterns.asian;
      break;
    case 'ar':
      selectedPattern = numberPatterns.arabic;
      break;
    case 'hi':
      selectedPattern = numberPatterns.devanagari;
      break;
    default:
      selectedPattern = numberPatterns.standard;
  }

  // Combine number pattern with suffix pattern
  const fullPattern = new RegExp(
    `^\\s*${selectedPattern.source}\\s*${suffixPattern}\\s*$`,
    'i'
  );

  const match = text.match(fullPattern);
  if (match) {
    let numberStr = match[1];
    const suffix = match[2] || '';

    // Normalize number string based on locale
    if (locale === 'de' || locale === 'es' || locale === 'fr' || locale === 'pt' || locale === 'ru') {
      // European format: 1.234,56 -> 1234.56
      numberStr = numberStr.replace(/\./g, '').replace(',', '.');
    } else if (locale === 'ar') {
      // Convert Arabic-Indic numerals to Western
      numberStr = numberStr.replace(/[٠-٩]/g, d => String.fromCharCode(d.charCodeAt(0) - 1632));
      numberStr = numberStr.replace(/٫/, '.');
    } else if (locale === 'hi') {
      // Convert Devanagari numerals to Western
      numberStr = numberStr.replace(/[०-९]/g, d => String.fromCharCode(d.charCodeAt(0) - 2358));
    } else {
      // Standard format: remove commas
      numberStr = numberStr.replace(/,/g, '');
    }

    const number = parseFloat(numberStr);
    if (!isNaN(number) && isFinite(number)) {
      return {
        number,
        suffix,
        rawText: text.trim()
      };
    }
  }

  // Fallback: try basic extraction
  const basicMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(.+)?/);
  if (basicMatch) {
    const number = parseFloat(basicMatch[1].replace(/,/g, '.'));
    const suffix = basicMatch[2]?.trim() || '';

    if (!isNaN(number) && isFinite(number)) {
      return {
        number,
        suffix,
        rawText: text.trim()
      };
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
