/**
 * Modern Social Media Text Parser
 * Uses Unicode regex patterns to support multilingual content extraction
 * Handles all scripts including Arabic, Thai, Hindi, Chinese, etc.
 */

export interface SocialTextEntities {
  hashtags: string[];
  mentions: string[];
  urls: string[];
  cashtags: string[];
}

export interface ParsedSocialText {
  text: string;
  entities: SocialTextEntities;
  isValid: boolean;
  length: number;
}

export interface EntityWithIndices {
  text: string;
  indices: [number, number];
}

/**
 * Unicode regex patterns for social media entity extraction
 * Supports all Unicode scripts and proper boundaries
 */
const UNICODE_PATTERNS = {
  // Hashtags: supports all letters, marks, numbers across all scripts
  hashtag: /#([\p{L}\p{M}\p{Nd}_]+)/gu,

  // Mentions: @ followed by valid username chars (letters, numbers, underscore)
  mention: /@([\p{L}\p{Nd}_](?:[\p{L}\p{Nd}_.]*[\p{L}\p{Nd}_])?)/gu,

  // URLs: comprehensive pattern for HTTP(S) URLs
  url: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi,

  // Cashtags: $ followed by uppercase letters (stock symbols)
  cashtag: /\$([A-Z]{1,6}(?:[._][A-Z]{1,2})?)\b/g
};

/**
 * Extract entities with indices for position tracking
 */
function extractEntitiesWithIndices(text: string, pattern: RegExp): EntityWithIndices[] {
  const entities: EntityWithIndices[] = [];
  let match: RegExpExecArray | null;

  // Reset regex lastIndex to ensure proper matching
  pattern.lastIndex = 0;

  while ((match = pattern.exec(text)) !== null) {
    entities.push({
      text: match[1],
      indices: [match.index, match.index + match[0].length]
    });
  }

  return entities;
}

/**
 * Validate text length considering different character weights
 * Approximates Twitter's character counting rules
 */
function calculateTextLength(text: string): number {
  if (!text) return 0;

  // Remove URLs to count them as fixed length (23 chars each)
  let processedText = text;
  const urlMatches = text.match(UNICODE_PATTERNS.url) || [];

  urlMatches.forEach(url => {
    processedText = processedText.replace(url, 'x'.repeat(23));
  });

  // Count grapheme clusters (user-perceived characters)
  // This is a simplified version - for full accuracy, use Intl.Segmenter
  return [...processedText].length;
}

/**
 * Validate if text meets social media platform constraints
 */
function validateSocialText(text: string, maxLength: number = 280): boolean {
  const length = calculateTextLength(text);
  return length > 0 && length <= maxLength;
}

/**
 * Parse social media text and extract all entities
 */
export function parseSocialText(text: string): ParsedSocialText {
  if (!text || typeof text !== 'string') {
    return {
      text: '',
      entities: { hashtags: [], mentions: [], urls: [], cashtags: [] },
      isValid: false,
      length: 0
    };
  }

  // Extract all entities
  const hashtagEntities = extractEntitiesWithIndices(text, UNICODE_PATTERNS.hashtag);
  const mentionEntities = extractEntitiesWithIndices(text, UNICODE_PATTERNS.mention);
  const urlEntities = extractEntitiesWithIndices(text, UNICODE_PATTERNS.url);
  const cashtagEntities = extractEntitiesWithIndices(text, UNICODE_PATTERNS.cashtag);

  // Extract just the text values
  const hashtags = hashtagEntities.map(e => e.text);
  const mentions = mentionEntities.map(e => e.text);
  const urls = urlEntities.map(e => e.text);
  const cashtags = cashtagEntities.map(e => e.text);

  // Calculate length and validate
  const length = calculateTextLength(text);
  const isValid = validateSocialText(text);

  return {
    text: text.trim(),
    entities: {
      hashtags,
      mentions,
      urls,
      cashtags
    },
    isValid,
    length
  };
}

/**
 * Extract only hashtags (legacy compatibility)
 */
export function extractHashtags(text: string): string[] {
  return parseSocialText(text).entities.hashtags;
}

/**
 * Extract only mentions (legacy compatibility)
 */
export function extractMentions(text: string): string[] {
  return parseSocialText(text).entities.mentions;
}

/**
 * Sanitize and normalize social media text
 */
export function sanitizeSocialText(text: string): string {
  if (!text) return '';

  // Basic normalization without regex
  return text.trim();
}

/**
 * Validate and sanitize username
 */
export function sanitizeUsername(username: string): string {
  if (!username) return '';

  // Remove @ prefix if present
  const cleaned = username.replace(/^@/, '');

  // Validate username format (letters, numbers, underscores, dots)
  // Must start/end with letter or number, dots cannot be consecutive
  const usernamePattern = /^[\p{L}\p{Nd}](?:[\p{L}\p{Nd}_.]*[\p{L}\p{Nd}])?$/u;

  if (!usernamePattern.test(cleaned)) {
    console.warn(`Invalid username format: ${username}`);
    return '';
  }

  // Additional validation rules
  if (cleaned.includes('..') || cleaned.length > 30) {
    console.warn(`Invalid username format: ${username}`);
    return '';
  }

  return cleaned.toLowerCase().slice(0, 30);
}
