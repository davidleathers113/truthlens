/**
 * Modern Text Cleaning Utilities
 * Replaces regex-based text sanitization with validator library
 */

import validator from 'validator';

export interface CleaningOptions {
  removeControlChars?: boolean;
  normalizeWhitespace?: boolean;
  maxLength?: number;
  preserveEmojis?: boolean;
  preserveLineBreaks?: boolean;
  allowedChars?: string;
  removeUrls?: boolean;
  removeMentions?: boolean;
  removeHashtags?: boolean;
}

export interface TextAnalysis {
  originalLength: number;
  cleanedLength: number;
  removedChars: number;
  containsUrls: boolean;
  containsMentions: boolean;
  containsHashtags: boolean;
  encoding: string;
  hasControlChars: boolean;
}

/**
 * Default cleaning options
 */
const DEFAULT_OPTIONS: CleaningOptions = {
  removeControlChars: true,
  normalizeWhitespace: true,
  maxLength: 10000,
  preserveEmojis: true,
  preserveLineBreaks: false,
  removeUrls: false,
  removeMentions: false,
  removeHashtags: false
};

/**
 * Clean and sanitize text content
 */
export function cleanText(text: string, options: CleaningOptions = {}): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };
  let cleaned = text;

  // Remove or escape dangerous content
  cleaned = validator.escape(cleaned);

  // Remove URLs if requested
  if (opts.removeUrls) {
    // Simple URL removal - more reliable than regex
    const words = cleaned.split(/\s+/);
    cleaned = words.filter(word => !validator.isURL(word)).join(' ');
  }

  // Remove control characters
  if (opts.removeControlChars) {
    cleaned = removeControlCharacters(cleaned);
  }

  // Handle line breaks
  if (!opts.preserveLineBreaks) {
    cleaned = cleaned.replace(/[\r\n]+/g, ' ');
  } else {
    cleaned = cleaned.replace(/[\r\n]+/g, '\n');
  }

  // Normalize whitespace
  if (opts.normalizeWhitespace) {
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
  }

  // Remove social media elements if requested
  if (opts.removeMentions) {
    cleaned = removeMentions(cleaned);
  }

  if (opts.removeHashtags) {
    cleaned = removeHashtags(cleaned);
  }

  // Apply character whitelist if provided
  if (opts.allowedChars) {
    cleaned = validator.whitelist(cleaned, opts.allowedChars);
  }

  // Enforce maximum length
  if (opts.maxLength && cleaned.length > opts.maxLength) {
    cleaned = cleaned.substring(0, opts.maxLength).trim();
    // Try to break at word boundary
    const lastSpace = cleaned.lastIndexOf(' ');
    if (lastSpace > opts.maxLength * 0.8) {
      cleaned = cleaned.substring(0, lastSpace);
    }
  }

  return cleaned;
}

/**
 * Remove control characters using safe character filtering
 */
function removeControlCharacters(text: string): string {
  return text
    .split('')
    .filter(char => {
      const code = char.charCodeAt(0);
      // Keep printable ASCII, common Unicode ranges, and line breaks
      return (
        (code >= 32 && code <= 126) ||      // Printable ASCII
        (code >= 128 && code <= 65535) ||   // Extended Unicode
        code === 9 ||                       // Tab
        code === 10 ||                      // Line feed
        code === 13                         // Carriage return
      );
    })
    .join('');
}

/**
 * Remove mentions (@username) from text
 */
function removeMentions(text: string): string {
  return text
    .split(/\s+/)
    .filter(word => !word.startsWith('@'))
    .join(' ');
}

/**
 * Remove hashtags (#tag) from text
 */
function removeHashtags(text: string): string {
  return text
    .split(/\s+/)
    .filter(word => !word.startsWith('#'))
    .join(' ');
}

/**
 * Analyze text content and provide statistics
 */
export function analyzeText(text: string): TextAnalysis {
  if (!text || typeof text !== 'string') {
    return {
      originalLength: 0,
      cleanedLength: 0,
      removedChars: 0,
      containsUrls: false,
      containsMentions: false,
      containsHashtags: false,
      encoding: 'utf-8',
      hasControlChars: false
    };
  }

  const cleaned = cleanText(text);
  const words = text.split(/\s+/);

  return {
    originalLength: text.length,
    cleanedLength: cleaned.length,
    removedChars: text.length - cleaned.length,
    containsUrls: words.some(word => validator.isURL(word)),
    containsMentions: words.some(word => word.startsWith('@')),
    containsHashtags: words.some(word => word.startsWith('#')),
    encoding: 'utf-8', // Modern browsers use UTF-8
    hasControlChars: hasControlCharacters(text)
  };
}

/**
 * Check if text contains control characters
 */
function hasControlCharacters(text: string): boolean {
  return text.split('').some(char => {
    const code = char.charCodeAt(0);
    return (code >= 0 && code <= 31 && code !== 9 && code !== 10 && code !== 13) ||
           (code >= 127 && code <= 159);
  });
}

/**
 * Sanitize username (legacy compatibility)
 */
export function sanitizeUsername(username: string): string {
  if (!username || typeof username !== 'string') {
    return '';
  }

  // Remove @ prefix if present
  let cleaned = username.replace(/^@/, '');

  // Use character whitelist for usernames
  cleaned = validator.whitelist(cleaned, 'a-zA-Z0-9._-');

  // Convert to lowercase and limit length
  return cleaned.toLowerCase().substring(0, 30);
}

/**
 * Normalize Unicode text
 */
export function normalizeUnicode(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  try {
    // Normalize to NFKD (canonical decomposition, then canonical combining)
    return text.normalize('NFKD');
  } catch {
    return text;
  }
}

/**
 * Validate text content quality
 */
export function validateTextQuality(text: string, minLength = 1, maxLength = 10000): {
  isValid: boolean;
  issues: string[];
  score: number;
} {
  const issues: string[] = [];
  let score = 1.0;

  if (!text || typeof text !== 'string') {
    return { isValid: false, issues: ['Invalid input'], score: 0 };
  }

  // Length checks
  if (text.length < minLength) {
    issues.push(`Text too short (${text.length} < ${minLength})`);
    score -= 0.5;
  }

  if (text.length > maxLength) {
    issues.push(`Text too long (${text.length} > ${maxLength})`);
    score -= 0.3;
  }

  // Quality checks
  const analysis = analyzeText(text);

  if (analysis.hasControlChars) {
    issues.push('Contains control characters');
    score -= 0.2;
  }

  if (analysis.removedChars / analysis.originalLength > 0.5) {
    issues.push('High proportion of removed characters');
    score -= 0.3;
  }

  const words = text.trim().split(/\s+/);
  if (words.length === 1 && words[0].length > 100) {
    issues.push('Appears to be single long word/string');
    score -= 0.2;
  }

  score = Math.max(0, score);
  const isValid = score >= 0.5 && issues.length === 0;

  return { isValid, issues, score };
}
