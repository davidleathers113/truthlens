/**
 * Instagram Selector Configuration - 2025
 *
 * Resilient selector configuration for Instagram content extraction
 * Based on 2025 best practices using data-testid attributes, CSS selectors,
 * and adaptive patterns to handle Instagram's responsive layouts.
 *
 * Note: URL patterns moved to platformUrls.ts for better maintainability
 */

import { detectPlatform, getContentType } from './platformUrls';

/**
 * Primary selectors based on data-testid attributes (most reliable in 2025)
 */
export const InstagramSelectors = {
  // Platform detection
  platform: {
    postElements: [
      '[data-testid="post-content"]',
      '[data-testid="media-content"]',
      'article[role="presentation"]',
      'article:has(img)',
      'main article'
    ],
    storyElements: [
      '[data-testid="story-viewer"]',
      '[data-testid="story-content"]',
      'div[role="button"][aria-label*="story"]',
      'section div[role="button"]'
    ],
    reelElements: [
      '[data-testid="reel-viewer"]',
      '[data-testid="reel-content"]',
      'section article[role="presentation"]',
      'div[role="presentation"]:has(video)'
    ]
  },

  // Post content and metadata
  post: {
    container: [
      'article[role="presentation"]',
      'article',
      'div[role="presentation"]:has(img)',
      'section article'
    ],
    caption: [
      '[data-testid="post-caption"] span',
      'div h1',
      'div span[dir="auto"]',
      'div span[style*="word-wrap"]',
      'meta[property="og:description"]'
    ],
    author: {
      username: [
        'h2 a span',
        'header a span',
        '[data-testid="username"]',
        'a[role="link"] span'
      ],
      displayName: [
        'header h2 span',
        '[data-testid="user-display-name"]'
      ],
      verified: [
        'svg[aria-label*="Verified"]',
        '[title*="Verified"]',
        'span[title*="Verified"]'
      ]
    },
    timestamp: [
      'time[datetime]',
      'a time',
      '[title*="ago"]',
      '[aria-label*="ago"]'
    ],
    location: [
      'a[href*="/locations/"]',
      '[data-testid="location"]',
      'div[role="button"]:has(svg[aria-label*="location"])'
    ],
    engagement: {
      likes: [
        'button span[aria-label*="like"]',
        'section div span',
        '[data-testid="like-count"]'
      ],
      comments: [
        'button span[aria-label*="comment"]',
        '[data-testid="comment-count"]'
      ],
      shares: [
        'button span[aria-label*="share"]',
        '[data-testid="share-count"]'
      ]
    },
    media: {
      image: [
        'div img[src*="instagram"]',
        'img[alt*="Photo"]',
        'img[alt*="post"]'
      ],
      video: [
        'video',
        'div[role="button"] video',
        'video[playsinline]'
      ],
      carousel: [
        'button[aria-label*="Next"]',
        'button[aria-label*="Previous"]',
        '[data-testid="carousel-next"]'
      ]
    },
    hashtags: [
      'a[href*="/explore/tags/"]',
      'span[style*="color"]'
    ],
    mentions: [
      'a[href*="/"]',
      'span[data-testid*="mention"]'
    ]
  },

  // Stories content
  stories: {
    container: [
      'div[data-testid="story-viewer"]',
      'div[data-testid="story-content"]',
      'div[role="button"][style*="cursor"]'
    ],
    content: [
      'div img',
      'div video',
      'div canvas'
    ],
    textOverlay: [
      'div[style*="text"] span',
      'div[style*="color"] span',
      'svg text',
      'div[role="text"]'
    ],
    stickers: [
      'div[role="button"][style*="emoji"]',
      'span[style*="emoji"]',
      'div[data-testid*="sticker"]'
    ],
    interactive: {
      polls: [
        '[aria-label*="poll"]',
        '[data-testid*="poll"]'
      ],
      questions: [
        '[aria-label*="question"]',
        '[data-testid*="question"]'
      ],
      sliders: [
        '[aria-label*="slider"]',
        '[data-testid*="slider"]'
      ]
    }
  },

  // Reels content
  reels: {
    container: [
      'div[data-testid="reel-viewer"]',
      'div[data-testid="reel-content"]',
      'div:has(video[playsinline])'
    ],
    video: [
      'video[playsinline]',
      'div video'
    ],
    caption: [
      '[data-testid="reel-caption"] span',
      'div h1',
      'section div span'
    ],
    audio: {
      info: [
        'div[role="button"] span[aria-label*="audio"]',
        'a[href*="/audio/"] span',
        '[data-testid="audio-info"]'
      ],
      original: [
        'div[role="button"] span:contains("Original audio")'
      ]
    },
    effects: [
      'div[role="button"][aria-label*="effect"]',
      '[data-testid*="effect"]',
      'div[aria-label*="Effect by"]'
    ],
    engagement: {
      plays: [
        'span[aria-label*="play"]',
        '[data-testid="play-count"]',
        'div span:contains("plays")'
      ],
      likes: [
        'button span[aria-label*="like"]',
        '[data-testid="like-count"]'
      ]
    }
  },

  // Responsive layout specific selectors
  responsive: {
    mobile: {
      postContainer: 'article, div[data-testid="mobile-post"]',
      postContent: 'article div, div[data-testid="mobile-content"]',
      storyContainer: 'div[data-testid="mobile-story"]',
      reelContainer: 'div[data-testid="mobile-reel"]'
    },
    tablet: {
      postContainer: 'article[role="presentation"], div[data-testid="tablet-post"]',
      postContent: 'article div[data-testid="post-content"], div[data-testid="tablet-content"]',
      storyContainer: 'div[role="button"][style*="cursor"], div[data-testid="tablet-story"]',
      reelContainer: 'div[role="presentation"], div[data-testid="tablet-reel"]'
    },
    desktop: {
      postContainer: 'article[role="presentation"], article',
      postContent: '[data-testid="post-content"], article div',
      storyContainer: 'div[role="button"][style*="cursor"], section div',
      reelContainer: 'div[role="presentation"], section article'
    }
  },

  // Loading and restricted content
  loading: {
    spinner: [
      'div[role="progressbar"]',
      'svg[aria-label="Loading"]',
      '[data-testid="loading"]',
      '.spinner',
      'div[style*="loading"]'
    ]
  },

  restricted: {
    privateAccount: [
      'div[role="button"][aria-label*="private"]',
      'span:contains("This Account is Private")',
      'span:contains("Follow to see")'
    ],
    unavailable: [
      'span:contains("Sorry, this page isn\'t available")',
      'div:contains("The link you followed may be broken")'
    ]
  }
} as const;

/**
 * Instagram URL utilities using modern URL API
 * Replaces fragile regex patterns with structured URL parsing
 */
export const InstagramUrlUtils = {
  /**
   * Check if URL is Instagram platform
   */
  isInstagramUrl: (url: string): boolean => {
    return detectPlatform(url) === 'instagram';
  },

  /**
   * Get Instagram content type from URL
   */
  getInstagramContentType: (url: string): string | null => {
    return getContentType(url, 'instagram');
  },

  /**
   * Check if URL is Instagram post
   */
  isPostUrl: (url: string): boolean => {
    const contentType = getContentType(url, 'instagram');
    return contentType === 'post';
  },

  /**
   * Check if URL is Instagram reel
   */
  isReelUrl: (url: string): boolean => {
    const contentType = getContentType(url, 'instagram');
    return contentType === 'video' || url.includes('/reel/');
  },

  /**
   * Check if URL is Instagram story
   */
  isStoryUrl: (url: string): boolean => {
    const contentType = getContentType(url, 'instagram');
    return contentType === 'story';
  },

  /**
   * Check if URL is Instagram profile
   */
  isProfileUrl: (url: string): boolean => {
    const contentType = getContentType(url, 'instagram');
    return contentType === 'profile';
  }
} as const;

/**
 * Rate limiting configuration based on 2025 Instagram anti-scraping measures
 */
export const InstagramRateLimiting = {
  // Progressive delays to avoid detection
  extractionDelays: {
    betweenPosts: 2000, // 2s between post extractions
    betweenStories: 1500, // 1.5s between story extractions
    betweenReels: 1800, // 1.8s between reel extractions
    dynamicContent: 1000, // 1s for dynamic content loading
    afterError: 5000, // 5s after extraction error
    scrollDelay: 500, // 0.5s between scroll actions
    pageTransition: 3000 // 3s after page transitions
  },

  // Retry configuration with exponential backoff
  retryConfig: {
    maxRetries: 3,
    backoffMultiplier: 2.0,
    initialDelay: 1000,
    maxDelay: 10000
  },

  // Request limits to prevent detection
  requestLimits: {
    maxPostsPerSession: 50,
    maxStoriesPerSession: 20,
    maxReelsPerSession: 30,
    sessionDuration: 15 * 60 * 1000, // 15 minutes
    cooldownPeriod: 5 * 60 * 1000 // 5 minutes cooldown
  },

  // User agent for anti-detection
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 TruthLens/1.0'
} as const;

/**
 * Compliance configuration for Instagram
 */
export const InstagramCompliance = {
  // Robots.txt compliance
  robotsTxt: {
    respectDisallow: true,
    crawlDelay: 2000, // 2 seconds minimum
    userAgentPattern: 'TruthLens'
  },

  // Privacy settings
  privacy: {
    skipPrivateAccounts: true,
    skipDeletedContent: true,
    skipRestrictedContent: true,
    anonymizeUserData: false, // Only when required by law
    respectDoNotTrack: true
  },

  // Terms of Service compliance
  termsCompliance: {
    maxRequestsPerMinute: 30,
    respectRateLimits: true,
    identifyAsBot: true,
    nonCommercialUse: true
  },

  // Content filtering
  contentFiltering: {
    skipSensitiveContent: true,
    skipCopyrightedMusic: false,
    skipBrandedContent: false
  }
} as const;

/**
 * Helper function to get all selectors for a specific element type
 */
export function getAllInstagramSelectors(path: string): string[] {
  const pathParts = path.split('.');
  let current: any = InstagramSelectors;

  for (const part of pathParts) {
    if (!current || typeof current !== 'object' || !Object.prototype.hasOwnProperty.call(current, part)) {
      return [];
    }
    current = current[part];
  }

  return Array.isArray(current) ? current : [];
}

/**
 * Helper function to validate if a URL is an Instagram URL
 */
export function isInstagramUrl(url: string): boolean {
  return InstagramUrlPatterns.domains.some(pattern => pattern.test(url));
}

/**
 * Helper function to detect Instagram content type from URL
 */
export function getInstagramContentType(url: string): 'post' | 'reel' | 'story' | 'profile' | 'explore' | 'unknown' {
  if (InstagramUrlPatterns.postUrls.some(pattern => pattern.test(url))) return 'post';
  if (InstagramUrlPatterns.reelUrls.some(pattern => pattern.test(url))) return 'reel';
  if (InstagramUrlPatterns.storyUrls.some(pattern => pattern.test(url))) return 'story';
  if (InstagramUrlPatterns.profileUrls.some(pattern => pattern.test(url))) return 'profile';
  if (InstagramUrlPatterns.exploreUrls.some(pattern => pattern.test(url))) return 'explore';
  return 'unknown';
}

/**
 * Helper function to get delay based on operation type
 */
export function getInstagramOperationDelay(operation: keyof typeof InstagramRateLimiting.extractionDelays): number {
  if (!Object.prototype.hasOwnProperty.call(InstagramRateLimiting.extractionDelays, operation)) {
    return 1000; // Default fallback delay
  }
  return InstagramRateLimiting.extractionDelays[operation];
}

/**
 * Helper function to check if we're within rate limits
 */
export function checkInstagramRateLimits(
  requestCount: number,
  contentType: 'posts' | 'stories' | 'reels',
  sessionStartTime: number
): { allowed: boolean; reason?: string } {
  const now = Date.now();
  const sessionDuration = now - sessionStartTime;

  // Check session duration
  if (sessionDuration > InstagramRateLimiting.requestLimits.sessionDuration) {
    return { allowed: false, reason: 'Session duration exceeded' };
  }

  // Check content-specific limits
  const limits = {
    posts: InstagramRateLimiting.requestLimits.maxPostsPerSession,
    stories: InstagramRateLimiting.requestLimits.maxStoriesPerSession,
    reels: InstagramRateLimiting.requestLimits.maxReelsPerSession
  };

  const validContentTypes = ['posts', 'stories', 'reels'] as const;
  if (validContentTypes.includes(contentType as any) && Object.prototype.hasOwnProperty.call(limits, contentType)) {
    if (requestCount >= limits[contentType as keyof typeof limits]) {
      return { allowed: false, reason: `Maximum ${contentType} limit reached` };
    }
  }

  return { allowed: true };
}
