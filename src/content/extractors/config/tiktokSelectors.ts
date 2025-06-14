/**
 * TikTok Selector Configuration - 2025
 *
 * Resilient selector configuration for TikTok content extraction
 * Based on 2025 best practices using data-e2e attributes, CSS selectors,
 * and hidden JSON data sources to handle TikTok's dynamic UI changes.
 */

/**
 * Primary selectors based on data-e2e attributes (most reliable in 2025)
 */
export const TikTokSelectors = {
  // Platform detection
  platform: {
    videoElements: [
      '[data-e2e="user-post-item"]',
      '[data-e2e="browse-video"]',
      '[data-e2e="video-detail"]',
      'div[data-e2e*="video"]'
    ],
    pageElements: [
      '[data-e2e="browse-video-container"]',
      '[data-e2e="video-player-container"]',
      '[data-e2e="user-detail"]'
    ]
  },

  // Video content and metadata
  video: {
    container: [
      '[data-e2e="browse-video"]',
      '[data-e2e="user-post-item"]',
      '[data-e2e="video-detail"]',
      'div[data-testid="video-detail"]'
    ],
    description: [
      '[data-e2e="browse-video-desc"]',
      '[data-e2e="user-post-item-desc"]',
      'span.css-j2a19r-SpanText',
      '[data-e2e="video-desc"]',
      'h1[data-e2e="browse-video-desc"]'
    ],
    author: {
      username: [
        '[data-e2e="browser-nickname"]',
        '[data-e2e="user-unique-id"]',
        '[data-e2e="browse-username"]',
        'a[data-e2e="browse-username"]'
      ],
      displayName: [
        '[data-e2e="browser-nickname"] span:first-child',
        '[data-e2e="user-title"]',
        '[data-e2e="browse-username"] span'
      ],
      avatar: [
        '[data-e2e="browse-avatar"] img',
        '[data-e2e="user-avatar"] img',
        'img[data-e2e="browse-avatar"]'
      ]
    },
    timestamp: [
      '[data-e2e="browser-nickname"] span:last-child',
      'span[data-e2e="video-create-time"]',
      'time[datetime]',
      '[data-e2e="browse-time"]'
    ],
    engagement: {
      likes: [
        '[data-e2e="like-count"]',
        '[data-e2e="browse-like-count"]',
        'strong[data-e2e="like-count"]'
      ],
      comments: [
        '[data-e2e="comment-count"]',
        '[data-e2e="browse-comment-count"]',
        'strong[data-e2e="comment-count"]'
      ],
      shares: [
        '[data-e2e="share-count"]',
        '[data-e2e="browse-share-count"]',
        'strong[data-e2e="share-count"]'
      ],
      views: [
        '[data-e2e="video-views"]',
        '[data-e2e="browse-view-count"]',
        'strong[data-e2e="video-views"]'
      ],
      bookmarks: [
        '[data-e2e="undefined-count"]',
        '[data-e2e="collect-count"]'
      ]
    },
    music: {
      title: [
        '.css-pvx3oa-DivMusicText',
        '[data-e2e="music-title"]',
        '[data-e2e="browse-music"] span'
      ],
      author: [
        '[data-e2e="music-author"]',
        '[data-e2e="browse-music-author"]'
      ]
    },
    hashtags: [
      'a[data-e2e="search-common-link"]',
      'a[href*="/tag/"]',
      'strong[data-e2e="search-hashtag-link"]'
    ]
  },

  // Comments section
  comments: {
    container: [
      '[data-e2e="comment-list"]',
      '[data-e2e="browse-comment-list"]',
      'div[data-e2e*="comment"]'
    ],
    item: [
      '[data-e2e="comment-item"]',
      '[data-e2e="browse-comment-item"]',
      'div[data-e2e*="comment-item"]'
    ],
    text: [
      '[data-e2e="comment-text"]',
      '[data-e2e="comment-content"]',
      'span[data-e2e="comment-text"]'
    ],
    author: [
      '[data-e2e="comment-username"]',
      '[data-e2e="comment-author"]',
      'a[data-e2e="comment-username"]'
    ],
    timestamp: [
      '[data-e2e="comment-time"]',
      'span[data-e2e="comment-time"]'
    ],
    likes: [
      '[data-e2e="comment-like-count"]',
      'span[data-e2e="comment-like-count"]'
    ],
    replies: [
      '[data-e2e="comment-reply-count"]',
      'button[data-e2e="comment-reply"]'
    ],
    loadMore: [
      '[data-e2e="comment-load-more"]',
      'button[data-e2e="comment-load-more"]',
      'div[data-e2e*="load-more"]'
    ]
  },

  // Dynamic loading indicators
  loading: {
    spinner: [
      '[data-e2e="loading"]',
      '.loading-spinner',
      '[role="progressbar"]',
      'div[data-e2e*="loading"]'
    ],
    loadMore: [
      '[data-e2e="load-more"]',
      'button[data-e2e*="load-more"]',
      'div[data-e2e*="show-more"]'
    ]
  },

  // Error and restricted content
  restricted: {
    unavailable: [
      '[data-e2e="video-unavailable"]',
      'div[data-e2e*="unavailable"]'
    ],
    private: [
      '[data-e2e="private-video"]',
      'div[data-e2e*="private"]'
    ],
    deleted: [
      '[data-e2e="video-deleted"]',
      'span:contains("Video unavailable")'
    ]
  },

  // Hidden JSON data source (most reliable)
  hiddenData: {
    scriptTag: '#__UNIVERSAL_DATA_FOR_REHYDRATION__',
    nextDataScript: '#__NEXT_DATA__'
  }
} as const;

/**
 * Fallback selectors for when data-e2e attributes change
 */
export const TikTokFallbackSelectors = {
  // Using CSS class patterns (less reliable but broader coverage)
  video: {
    containers: [
      'div[class*="DivContainer"]',
      'div[class*="video-feed-item"]',
      'div[class*="VideoFeedItem"]'
    ],
    descriptions: [
      'span[class*="SpanText"]',
      'div[class*="video-meta-caption"]',
      'h1[class*="video-desc"]'
    ],
    usernames: [
      'a[class*="StyledUserLink"]',
      'span[class*="username"]',
      'a[href*="/@"]'
    ]
  },

  // XPath patterns for complex element targeting
  xpath: {
    videoDescription: [
      '//span[@data-e2e="browse-video-desc"]//text()',
      '//h1[@data-e2e="browse-video-desc"]//text()',
      '//span[contains(@class,"SpanText")]//text()'
    ],
    username: [
      '//a[@data-e2e="browse-username"]//text()',
      '//span[@data-e2e="browser-nickname"]//text()[1]'
    ],
    timestamp: [
      '//span[@data-e2e="browser-nickname"]//span[last()]//text()',
      '//time[@datetime]/@datetime'
    ],
    engagementCounts: [
      '//strong[@data-e2e="like-count"]//text()',
      '//strong[@data-e2e="comment-count"]//text()',
      '//strong[@data-e2e="share-count"]//text()'
    ]
  }
} as const;

/**
 * URL patterns for TikTok content identification
 */
export const TikTokUrlPatterns = {
  domains: [
    /^https?:\/\/(www\.)?tiktok\.com/,
    /^https?:\/\/m\.tiktok\.com/,
    /^https?:\/\/[a-z]{2}\.tiktok\.com/, // Localized domains
    /^https?:\/\/vm\.tiktok\.com/ // Short URLs
  ],

  videoUrls: [
    /\/@[^/]+\/video\/\d+/,
    /\/v\/\d+/,
    /\/video\/\d+/,
    /\/t\/[A-Za-z0-9]+/ // Share URLs
  ],

  profileUrls: [
    /\/@[^/]+$/,
    /\/user\/[^/]+$/,
    /\/@[^/]+\?/
  ],

  embedUrls: [
    /embed\.tiktok\.com/,
    /tiktok\.com\/embed/
  ],

  tagUrls: [
    /\/tag\/[^\/]+/,
    /\/discover\/[^\/]+/
  ]
} as const;

/**
 * Rate limiting configuration based on 2025 TikTok anti-scraping measures
 */
export const TikTokRateLimiting = {
  // Progressive delays to avoid detection
  extractionDelays: {
    betweenVideos: 150, // ms between video extractions
    betweenComments: 200, // ms between comment extractions
    dynamicContent: 800, // ms to wait for dynamic content loading
    afterError: 3000, // ms to wait after extraction error
    scrollDelay: 500, // ms between scroll actions
    buttonClick: 1000 // ms after clicking load more buttons
  },

  // Retry configuration with exponential backoff
  retryConfig: {
    maxRetries: 3,
    backoffMultiplier: 2.5,
    initialDelay: 1500,
    maxDelay: 15000
  },

  // Cache configuration to minimize requests
  cacheConfig: {
    videoCacheDuration: 10 * 60 * 1000, // 10 minutes
    commentCacheDuration: 5 * 60 * 1000, // 5 minutes
    maxCacheSize: 50 // number of cached items
  },

  // User agent rotation for anti-detection
  userAgents: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15'
  ]
} as const;

/**
 * Content validation patterns
 */
export const TikTokValidation = {
  // Minimum content requirements
  minDescriptionLength: 1,
  maxDescriptionLength: 2200, // TikTok's character limit

  // Valid content patterns
  validDescriptionPatterns: [
    /\S+/, // At least one non-whitespace character
  ],

  // Invalid content indicators
  invalidContentIndicators: [
    /^loading/i,
    /^error/i,
    /unavailable/i,
    /private.*account/i,
    /video.*removed/i
  ],

  // Valid engagement number patterns
  engagementPatterns: [
    /^\d+(\.\d+)?[KMB]?$/i, // Numbers with K, M, B suffixes
    /^\d+$/ // Plain numbers
  ]
} as const;

/**
 * Helper function to get all selectors for a specific element type
 */
export function getAllTikTokSelectors(path: string): string[] {
  const pathParts = path.split('.');
  let current: any = TikTokSelectors;

  for (const part of pathParts) {
    if (!current || typeof current !== 'object' || !Object.prototype.hasOwnProperty.call(current, part)) {
      return [];
    }
    current = current[part];
  }

  return Array.isArray(current) ? current : [];
}

/**
 * Helper function to validate if a URL is a TikTok URL
 */
export function isTikTokUrl(url: string): boolean {
  return TikTokUrlPatterns.domains.some(pattern => pattern.test(url));
}

/**
 * Helper function to check if URL is a specific video
 */
export function isTikTokVideoUrl(url: string): boolean {
  return TikTokUrlPatterns.videoUrls.some(pattern => pattern.test(url));
}

/**
 * Helper function to check if URL is a user profile
 */
export function isTikTokProfileUrl(url: string): boolean {
  return TikTokUrlPatterns.profileUrls.some(pattern => pattern.test(url));
}

/**
 * Helper function to get delay based on operation type
 */
export function getTikTokOperationDelay(operation: keyof typeof TikTokRateLimiting.extractionDelays): number {
  if (!Object.prototype.hasOwnProperty.call(TikTokRateLimiting.extractionDelays, operation)) {
    return 1000; // Default fallback delay
  }
  return TikTokRateLimiting.extractionDelays[operation];
}

/**
 * Helper function to get random user agent for anti-detection
 */
export function getRandomUserAgent(): string {
  const agents = TikTokRateLimiting.userAgents;
  return agents[Math.floor(Math.random() * agents.length)];
}

/**
 * Helper function to extract video ID from TikTok URL
 */
export function extractTikTokVideoId(url: string): string | null {
  const patterns = [
    /\/video\/(\d+)/,
    /\/v\/(\d+)/,
    /\/t\/([A-Za-z0-9]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Helper function to extract username from TikTok URL using URL API
 */
export function extractTikTokUsername(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const match = pathname.match(/\/@([^/?]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
