/**
 * Modern Date Parsing Utilities
 * Replaces regex-based date extraction with date-fns library
 */

import { parse, isValid, format, parseISO, subDays, subHours, subMinutes, subSeconds } from 'date-fns';

export interface ParsedDate {
  date: Date;
  confidence: number;
  format: string;
  source: 'iso' | 'relative' | 'structured' | 'fuzzy';
}

export interface RelativeTimeResult {
  date: Date | null;
  confidence: number;
  parsed: {
    amount: number;
    unit: string;
    direction: 'ago' | 'from_now';
  } | null;
}

/**
 * Common date formats for parsing
 */
const DATE_FORMATS = [
  // ISO formats
  "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
  "yyyy-MM-dd'T'HH:mm:ssXXX",
  "yyyy-MM-dd'T'HH:mm:ss",
  "yyyy-MM-dd HH:mm:ss",
  "yyyy-MM-dd",

  // US formats
  "MM/dd/yyyy",
  "MM/dd/yy",
  "M/d/yyyy",
  "M/d/yy",

  // European formats
  "dd/MM/yyyy",
  "dd/MM/yy",
  "d/M/yyyy",
  "d/M/yy",

  // Written formats
  "MMMM d, yyyy",
  "MMM d, yyyy",
  "MMMM d yyyy",
  "MMM d yyyy",
  "d MMMM yyyy",
  "d MMM yyyy",

  // Other common formats
  "yyyy.MM.dd",
  "dd.MM.yyyy",
  "yyyy-MM-dd HH:mm",
  "dd-MM-yyyy",
  "MM-dd-yyyy"
];

/**
 * Parse multiple date formats and return the best match
 */
export function parseDate(dateString: string): ParsedDate | null {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }

  const trimmed = dateString.trim();

  // Try ISO format first (highest confidence)
  try {
    const isoDate = parseISO(trimmed);
    if (isValid(isoDate)) {
      return {
        date: isoDate,
        confidence: 0.95,
        format: 'ISO',
        source: 'iso'
      };
    }
  } catch {
    // Continue to other formats
  }

  // Try structured formats
  for (const dateFormat of DATE_FORMATS) {
    try {
      const parsed = parse(trimmed, dateFormat, new Date());
      if (isValid(parsed)) {
        // Check if the parsed date is reasonable (not too far in future/past)
        const now = new Date();
        const yearDiff = Math.abs(parsed.getFullYear() - now.getFullYear());

        if (yearDiff <= 50) { // Reasonable range
          return {
            date: parsed,
            confidence: 0.8,
            format: dateFormat,
            source: 'structured'
          };
        }
      }
    } catch {
      continue;
    }
  }

  // Try relative time parsing
  const relativeResult = parseRelativeTime(trimmed);
  if (relativeResult.date) {
    return {
      date: relativeResult.date,
      confidence: relativeResult.confidence,
      format: 'relative',
      source: 'relative'
    };
  }

  return null;
}

/**
 * Parse relative time expressions (e.g., "2 hours ago", "3 days ago")
 */
export function parseRelativeTime(timeString: string): RelativeTimeResult {
  if (!timeString || typeof timeString !== 'string') {
    return { date: null, confidence: 0, parsed: null };
  }

  const cleaned = timeString.toLowerCase().trim();

  // Define relative time patterns with their corresponding functions
  const patterns = [
    {
      regex: /(\d+)\s*(?:second|sec|s)s?\s*ago/i,
      unit: 'second',
      func: (amount: number) => subSeconds(new Date(), amount)
    },
    {
      regex: /(\d+)\s*(?:minute|min|m)s?\s*ago/i,
      unit: 'minute',
      func: (amount: number) => subMinutes(new Date(), amount)
    },
    {
      regex: /(\d+)\s*(?:hour|hr|h)s?\s*ago/i,
      unit: 'hour',
      func: (amount: number) => subHours(new Date(), amount)
    },
    {
      regex: /(\d+)\s*(?:day|d)s?\s*ago/i,
      unit: 'day',
      func: (amount: number) => subDays(new Date(), amount)
    },
    {
      regex: /(\d+)\s*(?:week|wk|w)s?\s*ago/i,
      unit: 'week',
      func: (amount: number) => subDays(new Date(), amount * 7)
    }
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern.regex);
    if (match) {
      const amount = parseInt(match[1]);
      if (!isNaN(amount) && amount > 0 && amount < 10000) { // Reasonable bounds
        const date = pattern.func(amount);
        return {
          date,
          confidence: 0.7,
          parsed: {
            amount,
            unit: pattern.unit,
            direction: 'ago'
          }
        };
      }
    }
  }

  // Handle special cases
  const specialCases = {
    'just now': subMinutes(new Date(), 0),
    'now': subMinutes(new Date(), 0),
    'a moment ago': subMinutes(new Date(), 1),
    'yesterday': subDays(new Date(), 1),
    'today': new Date(),
    'an hour ago': subHours(new Date(), 1),
    'a day ago': subDays(new Date(), 1)
  };

  for (const [phrase, date] of Object.entries(specialCases)) {
    if (cleaned.includes(phrase)) {
      return {
        date,
        confidence: 0.8,
        parsed: {
          amount: phrase === 'yesterday' || phrase === 'a day ago' ? 1 : 0,
          unit: phrase === 'yesterday' || phrase === 'a day ago' ? 'day' : 'moment',
          direction: 'ago'
        }
      };
    }
  }

  return { date: null, confidence: 0, parsed: null };
}

/**
 * Extract all dates from a text string
 */
export function extractDatesFromText(text: string): ParsedDate[] {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const dates: ParsedDate[] = [];
  const words = text.split(/\s+/);

  // Try to parse potential date strings
  for (let i = 0; i < words.length; i++) {
    // Try single words
    const singleWord = words[i];
    if (singleWord) {
      const parsed = parseDate(singleWord);
      if (parsed && parsed.confidence > 0.7) {
        dates.push(parsed);
      }
    }

    // Try combinations of 2-4 words
    for (let len = 2; len <= 4 && i + len <= words.length; len++) {
      const phrase = words.slice(i, i + len).join(' ');
      const parsed = parseDate(phrase);
      if (parsed && parsed.confidence > 0.6) {
        dates.push(parsed);
      }
    }
  }

  // Remove duplicates and sort by confidence
  const uniqueDates = dates.filter((date, index, array) =>
    array.findIndex(d => Math.abs(d.date.getTime() - date.date.getTime()) < 1000) === index
  );

  return uniqueDates.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Format a date for display (legacy compatibility)
 */
export function formatDateForDisplay(date: Date, formatString = 'PPP'): string {
  try {
    return format(date, formatString);
  } catch {
    return date.toLocaleDateString();
  }
}

/**
 * Validate if a date is reasonable for content timestamps
 */
export function isReasonableContentDate(date: Date): boolean {
  const now = new Date();
  const minDate = new Date('1990-01-01'); // Before modern web
  const maxDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day in future

  return date >= minDate && date <= maxDate;
}
