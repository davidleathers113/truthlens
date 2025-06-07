/**
 * Twitter/X Selector Configuration - 2025
 *
 * Resilient selector configuration for Twitter/X content extraction
 * Based on 2025 best practices using data-testid attributes and XPath patterns
 * instead of fragile class-based selectors.
 */

/**
 * Primary selectors based on data-testid attributes (most reliable)
 */
export const TwitterSelectors = {
  // Platform detection
  platform: {
    tweetElements: [
      '[data-testid="tweet"]',
      '[data-testid="tweetText"]',
      'article[role="article"][data-testid*="tweet"]',
      'div[data-testid*="tweet"]'
    ],
    timelineElements: [
      '[data-testid="primaryColumn"]',
      '[data-testid="timeline"]',
      '[aria-label*="Timeline"]'
    ]
  },

  // Individual tweet content
  tweet: {
    container: [
      '[data-testid="tweet"]',
      'article[role="article"]',
      'div[data-testid*="tweet"]:not([data-testid*="quoted"])'
    ],
    text: [
      '[data-testid="tweetText"]',
      '[data-testid="tweetText"] span',
      '[lang] span', // Fallback for tweet text with language attribute
      'div[dir="auto"][lang] span'
    ],
    author: {
      name: [
        '[data-testid="User-Name"] span',
        '[data-testid="User-Names"] span:first-child',
        'div[dir="ltr"] span[role="button"] span'
      ],
      username: [
        '[data-testid="User-Name"] a',
        '[data-testid="User-Names"] a',
        'a[role="link"][href*="/"]'
      ],
      avatar: [
        '[data-testid="Tweet-User-Avatar"] img',
        'img[alt*="avatar"]',
        'img[src*="profile_images"]'
      ]
    },
    timestamp: [
      'time[datetime]',
      'a[href*="/status/"] time',
      '[data-testid="Time"] time'
    ],
    engagement: {
      replies: [
        '[data-testid="reply"] span[data-testid="app-text-transition-container"]',
        '[data-testid="reply"] span:not([data-testid])',
        '[aria-label*="reply"] span'
      ],
      retweets: [
        '[data-testid="retweet"] span[data-testid="app-text-transition-container"]',
        '[data-testid="retweet"] span:not([data-testid])',
        '[aria-label*="retweet"] span'
      ],
      likes: [
        '[data-testid="like"] span[data-testid="app-text-transition-container"]',
        '[data-testid="like"] span:not([data-testid])',
        '[aria-label*="like"] span'
      ],
      views: [
        '[data-testid="analytics"] span',
        '[aria-label*="view"] span'
      ]
    },
    media: {
      images: [
        '[data-testid="tweetPhoto"] img',
        'img[src*="pbs.twimg.com"]',
        'img[src*="abs.twimg.com"]'
      ],
      videos: [
        '[data-testid="videoPlayer"] video',
        '[data-testid="tweetVideo"] video',
        'video[poster*="pbs.twimg.com"]'
      ],
      gifs: [
        '[data-testid="tweetGif"] video',
        'video[src*="video.twimg.com"]'
      ]
    },
    quoteTweet: [
      '[data-testid="quote-tweet"]',
      'div[role="blockquote"]',
      'div[data-testid*="quoted"]'
    ]
  },

  // Thread and conversation elements
  thread: {
    showMoreButton: [
      '[data-testid="tweet-thread-show-more"]',
      'button[aria-label*="Show"]',
      'button[aria-label*="more"]'
    ],
    replyButton: [
      '[data-testid="reply"]',
      'button[aria-label*="Reply"]'
    ],
    conversationThread: [
      '[data-testid="conversation-thread"]',
      '[aria-label*="conversation"]'
    ],
    showRepliesButton: [
      'button[aria-label*="Show replies"]',
      'button[aria-label*="Show more replies"]'
    ]
  },

  // Dynamic loading indicators
  loading: {
    spinner: [
      '[data-testid="spinner"]',
      '[role="progressbar"]',
      '.loading-spinner'
    ],
    showMore: [
      'button[aria-label*="Show more"]',
      'div[data-testid*="showMore"]'
    ]
  },

  // Error and restricted content
  restricted: {
    unavailable: [
      '[data-testid="unavailable-tweet"]',
      'div[aria-label*="unavailable"]'
    ],
    suspended: [
      'div[aria-label*="suspended"]',
      'span:contains("Account suspended")'
    ],
    deleted: [
      'div[aria-label*="deleted"]',
      'span:contains("Tweet deleted")'
    ]
  }
} as const;

/**
 * Fallback selectors for when data-testid attributes change
 */
export const TwitterFallbackSelectors = {
  // Using semantic HTML and ARIA attributes
  semantic: {
    articles: [
      'article[role="article"]',
      'div[role="article"]'
    ],
    buttons: [
      'button[aria-label*="Reply"]',
      'button[aria-label*="Retweet"]',
      'button[aria-label*="Like"]'
    ],
    links: [
      'a[role="link"][href*="/status/"]',
      'a[href*="/status/"]'
    ],
    timeElements: [
      'time[datetime]',
      'time'
    ]
  },

  // XPath patterns for complex element targeting
  xpath: {
    tweetText: [
      '//div[@data-testid="tweetText"]//span',
      '//div[@lang]//span[text()]',
      '//article//div[@dir="auto"]//span'
    ],
    authorName: [
      '//div[@data-testid="User-Name"]//span',
      '//a[@role="link"]//span[1]'
    ],
    engagementCounts: [
      '//button[@data-testid="reply"]//span[last()]',
      '//button[@data-testid="retweet"]//span[last()]',
      '//button[@data-testid="like"]//span[last()]'
    ]
  }
} as const;

/**
 * URL patterns for Twitter/X content identification
 */
export const TwitterUrlPatterns = {
  domains: [
    /^https?:\/\/(www\.)?(twitter|x)\.com/,
    /^https?:\/\/mobile\.(twitter|x)\.com/,
    /^https?:\/\/[a-z]{2}\.(twitter|x)\.com/ // Localized domains
  ],

  tweetUrls: [
    /\/status\/\d+/,
    /\/tweet\/\d+/,
    /\/i\/web\/status\/\d+/
  ],

  profileUrls: [
    /^https?:\/\/(twitter|x)\.com\/[^/]+$/,
    /^https?:\/\/(twitter|x)\.com\/[^/]+\/with_replies$/,
    /^https?:\/\/(twitter|x)\.com\/[^/]+\/media$/
  ],

  embedUrls: [
    /platform\.twitter\.com\/embed/,
    /twitframe\.com/
  ]
} as const;

/**
 * Rate limiting configuration based on 2025 best practices
 */
export const TwitterRateLimiting = {
  // Progressive delays to respect platform limits
  extractionDelays: {
    betweenTweets: 100, // ms between individual tweet extractions
    betweenThreads: 250, // ms between thread navigation
    dynamicContent: 500, // ms to wait for dynamic content loading
    afterError: 2000 // ms to wait after extraction error
  },

  // Retry configuration
  retryConfig: {
    maxRetries: 3,
    backoffMultiplier: 2,
    initialDelay: 1000
  },

  // Cache configuration
  cacheConfig: {
    tweetCacheDuration: 5 * 60 * 1000, // 5 minutes
    threadCacheDuration: 10 * 60 * 1000, // 10 minutes
    maxCacheSize: 100 // number of cached items
  }
} as const;

/**
 * Content validation patterns
 */
export const TwitterValidation = {
  // Minimum content requirements
  minContentLength: 10,
  maxContentLength: 10000,

  // Text patterns for validation
  validTweetPatterns: [
    /\S+/, // At least one non-whitespace character
  ],

  // Spam/invalid content indicators
  invalidContentIndicators: [
    /^\.{3,}$/, // Just dots
    /^-+$/, // Just dashes
    /^loading/i,
    /^error/i,
    /unavailable/i
  ]
} as const;

/**
 * Helper function to get all selectors for a specific element type
 */
export function getAllSelectors(path: string): string[] {
  const pathParts = path.split('.');
  let current: any = TwitterSelectors;

  for (const part of pathParts) {
    if (!current || typeof current !== 'object' || !Object.prototype.hasOwnProperty.call(current, part)) {
      return [];
    }
    current = current[part];
  }

  return Array.isArray(current) ? current : [];
}

/**
 * Helper function to validate if a URL is a Twitter/X URL
 */
export function isTwitterUrl(url: string): boolean {
  return TwitterUrlPatterns.domains.some(pattern => pattern.test(url));
}

/**
 * Helper function to check if URL is a specific tweet
 */
export function isTweetUrl(url: string): boolean {
  return TwitterUrlPatterns.tweetUrls.some(pattern => pattern.test(url));
}

/**
 * Helper function to get delay based on operation type
 */
export function getOperationDelay(operation: keyof typeof TwitterRateLimiting.extractionDelays): number {
  if (!Object.prototype.hasOwnProperty.call(TwitterRateLimiting.extractionDelays, operation)) {
    return 1000; // Default fallback delay
  }
  return TwitterRateLimiting.extractionDelays[operation];
}
