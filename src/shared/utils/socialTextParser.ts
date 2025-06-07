/**
 * Modern Social Media Text Parser
 * Replaces regex-based hashtag and mention extraction with twitter-text library
 */

import * as twitterText from 'twitter-text';

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

  // Extract all entities using twitter-text simple extract functions
  const hashtags = twitterText.extractHashtags(text);
  const mentions = twitterText.extractMentions(text);
  const urls = twitterText.extractUrls(text);
  const cashtags = twitterText.extractCashtags(text);

  // Validate text length and format
  const isValid = twitterText.isValidTweet(text);
  const parsedLength = twitterText.getTweetLength(text);

  return {
    text: text.trim(),
    entities: {
      hashtags,
      mentions,
      urls,
      cashtags
    },
    isValid,
    length: parsedLength
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

  // Use twitter-text validation
  const isValid = twitterText.isValidUsername(cleaned);

  if (!isValid) {
    console.warn(`Invalid username format: ${username}`);
    return '';
  }

  return cleaned.toLowerCase().slice(0, 30);
}
