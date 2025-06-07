/**
 * Platform URL Detection - 2025 Best Practices
 *
 * Uses native URL API instead of fragile regex patterns for better maintainability,
 * security, and reliability. Follows modern web standards for URL parsing.
 */

export interface PlatformConfig {
  name: string;
  domains: string[];
  paths: {
    post?: string[];
    profile?: string[];
    video?: string[];
    story?: string[];
    live?: string[];
    explore?: string[];
  };
  parameters?: {
    video?: string[];
    post?: string[];
  };
}

/**
 * Platform configurations using structured data instead of regex
 */
export const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  instagram: {
    name: 'Instagram',
    domains: ['instagram.com', 'www.instagram.com'],
    paths: {
      post: ['/p/', '/tv/', '/reel/'],
      profile: ['/@', '/'],
      story: ['/stories/'],
      explore: ['/explore/', '/explore/tags/'],
      live: ['/live/']
    },
    parameters: {
      post: ['p', 'reel', 'tv'],
      video: ['reel', 'tv']
    }
  },

  tiktok: {
    name: 'TikTok',
    domains: [
      'tiktok.com', 'www.tiktok.com', 'vm.tiktok.com',
      'm.tiktok.com', 'vt.tiktok.com'
    ],
    paths: {
      video: ['/@', '/video/', '/t/'],
      profile: ['/@'],
      live: ['/live/'],
      explore: ['/discover/', '/trending/', '/following/']
    },
    parameters: {
      video: ['v', 'video_id'],
      post: ['video_id']
    }
  },

  twitter: {
    name: 'Twitter/X',
    domains: [
      'twitter.com', 'www.twitter.com', 'mobile.twitter.com',
      'x.com', 'www.x.com', 'mobile.x.com'
    ],
    paths: {
      post: ['/status/', '/i/web/status/'],
      profile: ['/'],
      video: ['/i/broadcasts/', '/i/spaces/'],
      explore: ['/explore/', '/search/']
    },
    parameters: {
      post: ['status', 's'],
      video: ['broadcast_id', 'space_id']
    }
  }
};

/**
 * Detect platform from URL using native URL API
 */
export function detectPlatform(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Remove www. prefix for matching
    const cleanHostname = hostname.replace(/^www\./, '');

    for (const [platformKey, config] of Object.entries(PLATFORM_CONFIGS)) {
      if (config.domains.some(domain =>
        cleanHostname === domain || cleanHostname === domain.replace(/^www\./, '')
      )) {
        return platformKey;
      }
    }

    return null;
  } catch {
    console.warn('Invalid URL provided to detectPlatform:', url);
    return null;
  }
}

/**
 * Get content type from URL structure
 */
export function getContentType(url: string, platform?: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();

    const detectedPlatform = platform || detectPlatform(url);
    if (!detectedPlatform) return null;

    const config = PLATFORM_CONFIGS[detectedPlatform];
    if (!config) return null;

    // Check each content type against path patterns
    for (const [contentType, paths] of Object.entries(config.paths)) {
      if (paths && paths.some(path => pathname.includes(path))) {
        return contentType;
      }
    }

    // Check URL parameters for content type hints
    const searchParams = urlObj.searchParams;
    for (const [contentType, params] of Object.entries(config.parameters || {})) {
      if (params && params.some(param => searchParams.has(param))) {
        return contentType;
      }
    }

    return 'unknown';
  } catch {
    console.warn('Invalid URL provided to getContentType:', url);
    return null;
  }
}

/**
 * Check if URL is supported by any platform
 */
export function isSupportedUrl(url: string): boolean {
  return detectPlatform(url) !== null;
}

/**
 * Get platform configuration
 */
export function getPlatformConfig(platform: string): PlatformConfig | null {
  return PLATFORM_CONFIGS[platform] || null;
}

/**
 * Extract content ID from URL (platform-specific)
 */
export function extractContentId(url: string, platform?: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    const detectedPlatform = platform || detectPlatform(url);
    if (!detectedPlatform) return null;

    switch (detectedPlatform) {
      case 'instagram':
        // Extract from /p/ID/, /reel/ID/, /tv/ID/
        const instagramMatch = pathname.match(/\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
        return instagramMatch?.[2] || null;

      case 'tiktok':
        // Extract from /@user/video/ID or /video/ID
        const tiktokMatch = pathname.match(/\/video\/(\d+)/) ||
                           pathname.match(/@[^/]+\/video\/(\d+)/);
        return tiktokMatch?.[1] || null;

      case 'twitter':
        // Extract from /user/status/ID
        const twitterMatch = pathname.match(/\/status\/(\d+)/);
        return twitterMatch?.[1] || null;

      default:
        return null;
    }
  } catch {
    console.warn('Invalid URL provided to extractContentId:', url);
    return null;
  }
}

/**
 * Validate URL format and accessibility
 */
export function validateUrl(url: string): { isValid: boolean; platform?: string; contentType?: string; error?: string } {
  try {
    const urlObj = new URL(url);

    // Check protocol
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { isValid: false, error: 'Only HTTP/HTTPS URLs are supported' };
    }

    const platform = detectPlatform(url);
    if (!platform) {
      return { isValid: false, error: 'Unsupported platform' };
    }

    const contentType = getContentType(url, platform);

    return {
      isValid: true,
      platform,
      contentType: contentType || 'unknown'
    };
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }
}
