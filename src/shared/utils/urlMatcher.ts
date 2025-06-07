/**
 * Modern URL Pattern Matching
 * Replaces regex-based URL parsing with url-pattern and url-parse libraries
 */

import UrlPattern = require('url-pattern');
import urlParse = require('url-parse');

export interface ContentMatch {
  platform: string;
  contentType: string;
  contentId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface UrlPatternConfig {
  platform: string;
  patterns: {
    pattern: UrlPattern;
    contentType: string;
    extractor: (match: any, url: any) => ContentMatch;
  }[];
}

// Modern URL pattern configurations
const URL_CONFIGS: UrlPatternConfig[] = [
  {
    platform: 'instagram',
    patterns: [
      {
        pattern: new UrlPattern('(http(s)\\://)instagram.com/p/:contentId/*'),
        contentType: 'post',
        extractor: (match, url) => ({
          platform: 'instagram',
          contentType: 'post',
          contentId: match.contentId,
          metadata: { pathname: url.pathname }
        })
      },
      {
        pattern: new UrlPattern('(http(s)\\://)instagram.com/reel/:contentId/*'),
        contentType: 'reel',
        extractor: (match, url) => ({
          platform: 'instagram',
          contentType: 'reel',
          contentId: match.contentId,
          metadata: { pathname: url.pathname }
        })
      },
      {
        pattern: new UrlPattern('(http(s)\\://)instagram.com/:userId/*'),
        contentType: 'profile',
        extractor: (match, url) => ({
          platform: 'instagram',
          contentType: 'profile',
          userId: match.userId,
          metadata: { pathname: url.pathname }
        })
      }
    ]
  },
  {
    platform: 'tiktok',
    patterns: [
      {
        pattern: new UrlPattern('(http(s)\\://)tiktok.com/@:userId/video/:contentId'),
        contentType: 'video',
        extractor: (match, url) => ({
          platform: 'tiktok',
          contentType: 'video',
          contentId: match.contentId,
          userId: match.userId,
          metadata: { pathname: url.pathname }
        })
      },
      {
        pattern: new UrlPattern('(http(s)\\://)tiktok.com/video/:contentId'),
        contentType: 'video',
        extractor: (match, url) => ({
          platform: 'tiktok',
          contentType: 'video',
          contentId: match.contentId,
          metadata: { pathname: url.pathname }
        })
      },
      {
        pattern: new UrlPattern('(http(s)\\://)tiktok.com/@:userId/*'),
        contentType: 'profile',
        extractor: (match, url) => ({
          platform: 'tiktok',
          contentType: 'profile',
          userId: match.userId,
          metadata: { pathname: url.pathname }
        })
      }
    ]
  },
  {
    platform: 'twitter',
    patterns: [
      {
        pattern: new UrlPattern('(http(s)\\://)twitter.com/:userId/status/:contentId'),
        contentType: 'tweet',
        extractor: (match, url) => ({
          platform: 'twitter',
          contentType: 'tweet',
          contentId: match.contentId,
          userId: match.userId,
          metadata: { pathname: url.pathname }
        })
      },
      {
        pattern: new UrlPattern('(http(s)\\://)x.com/:userId/status/:contentId'),
        contentType: 'tweet',
        extractor: (match, url) => ({
          platform: 'twitter',
          contentType: 'tweet',
          contentId: match.contentId,
          userId: match.userId,
          metadata: { pathname: url.pathname }
        })
      }
    ]
  }
];

/**
 * Match URL against all known patterns
 */
export function matchUrl(urlString: string): ContentMatch | null {
  try {
    const url = urlParse(urlString, true);

    for (const config of URL_CONFIGS) {
      for (const { pattern, extractor } of config.patterns) {
        const match = pattern.match(urlString);
        if (match) {
          return extractor(match, url);
        }
      }
    }

    return null;
  } catch (error) {
    console.warn('Failed to parse URL:', urlString, error);
    return null;
  }
}

/**
 * Check if URL is a news/article URL (replaces regex patterns)
 */
export function isNewsUrl(urlString: string): boolean {
  try {
    const url = urlParse(urlString, true);

    // Check domain patterns
    const newsDomains = ['.com', '.org', '.net'];
    const newsKeywords = ['news', 'article', 'story', 'post'];

    const hasNewsDomain = newsDomains.some(domain => url.hostname.endsWith(domain));
    const hasNewsPath = newsKeywords.some(keyword => url.pathname.includes(`/${keyword}`));

    // Check for date-based URLs (YYYY/MM/DD pattern)
    const hasDatePattern = /\/\d{4}\/\d{2}\/\d{2}\//.test(url.pathname);

    return hasNewsDomain && (hasNewsPath || hasDatePattern);
  } catch {
    return false;
  }
}

/**
 * Extract content ID from social media URL
 */
export function extractContentId(urlString: string): string | null {
  const match = matchUrl(urlString);
  return match?.contentId || null;
}

/**
 * Extract user ID from social media URL
 */
export function extractUserId(urlString: string): string | null {
  const match = matchUrl(urlString);
  return match?.userId || null;
}

/**
 * Get platform from URL
 */
export function detectPlatform(urlString: string): string | null {
  const match = matchUrl(urlString);
  return match?.platform || null;
}

/**
 * Validate URL and return detailed analysis
 */
export function analyzeUrl(urlString: string): {
  isValid: boolean;
  platform?: string;
  contentType?: string;
  contentId?: string;
  userId?: string;
  isNewsUrl?: boolean;
  error?: string;
} {
  try {
    const url = urlParse(urlString, true);

    // Basic validation
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { isValid: false, error: 'Only HTTP/HTTPS URLs are supported' };
    }

    const match = matchUrl(urlString);
    const isNews = isNewsUrl(urlString);

    return {
      isValid: true,
      platform: match?.platform,
      contentType: match?.contentType,
      contentId: match?.contentId,
      userId: match?.userId,
      isNewsUrl: isNews
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Invalid URL format'
    };
  }
}
