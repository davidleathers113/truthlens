// Mock data generators for TruthLens testing
// Provides realistic test data for various scenarios

import { ContentAnalysis, CredibilityScore, UserSettings, UserSubscription } from '@shared/types';

// Export mockCredibilityScore for use in analysis field
export const mockCredibilityScore = {
  high: (overrides?: Partial<CredibilityScore>): CredibilityScore => ({
    score: 92,
    level: 'high',
    confidence: 0.95,
    reasoning: 'Content from verified, reputable source with factual accuracy indicators and transparent sourcing.',
    source: 'ai',
    timestamp: Date.now(),
    ...overrides,
  }),

  medium: (overrides?: Partial<CredibilityScore>): CredibilityScore => ({
    score: 68,
    level: 'medium',
    confidence: 0.78,
    reasoning: 'Mixed signals: some reliable indicators but also potential bias markers. Requires additional verification.',
    source: 'ai',
    timestamp: Date.now(),
    ...overrides,
  }),

  low: (overrides?: Partial<CredibilityScore>): CredibilityScore => ({
    score: 23,
    level: 'low',
    confidence: 0.88,
    reasoning: 'Multiple red flags: sensationalized language, lack of credible sources, and known misinformation patterns.',
    source: 'ai',
    timestamp: Date.now(),
    ...overrides,
  }),

  unknown: (overrides?: Partial<CredibilityScore>): CredibilityScore => ({
    score: 50,
    level: 'unknown',
    confidence: 0.45,
    reasoning: 'Insufficient information available for reliable credibility assessment.',
    source: 'fallback',
    timestamp: Date.now(),
    ...overrides,
  }),

  fallback: (overrides?: Partial<CredibilityScore>): CredibilityScore => ({
    score: 75,
    level: 'high',
    confidence: 0.6,
    reasoning: 'Domain pattern analysis suggests reliable source based on known reputation.',
    source: 'domain-reputation',
    timestamp: Date.now(),
    ...overrides,
  }),
};

/**
 * Generate mock content analysis data
 */
export const mockContentAnalysis = {
  article: (overrides?: Partial<ContentAnalysis>): ContentAnalysis => ({
    title: 'Breaking: Major Scientific Discovery Announced',
    url: 'https://example.com/science-discovery',
    content: 'Scientists at leading university have announced a breakthrough in renewable energy technology that could revolutionize the industry...',
    type: 'article',
    analysis: {
      domain: 'example.com',
      credibility: mockCredibilityScore.high(),
      bias: {
        level: 'center',
        confidence: 0.8,
        indicators: []
      }
    },
    ...overrides,
  }),

  socialPost: (platform: 'twitter' | 'facebook' | 'instagram' | 'tiktok' = 'twitter', overrides?: Partial<ContentAnalysis>): ContentAnalysis => ({
    title: 'Viral Social Media Post',
    url: `https://${platform}.com/user/post/123456`,
    content: 'Just witnessed something incredible! You won\'t believe what happened next... 🔥 #trending #unbelievable',
    type: 'social-post',
    platform,
    analysis: {
      domain: platform + '.com',
      credibility: mockCredibilityScore.medium(),
      bias: {
        level: 'center',
        confidence: 0.5,
        indicators: ['emotional-language']
      }
    },
    ...overrides,
  }),

  newsArticle: (domain: string = 'reuters.com', overrides?: Partial<ContentAnalysis>): ContentAnalysis => ({
    title: 'International Summit Reaches Climate Agreement',
    url: `https://${domain}/article/climate-summit-agreement`,
    content: 'World leaders have reached a historic agreement on climate action following three days of intensive negotiations...',
    type: 'article',
    analysis: {
      domain: domain,
      credibility: mockCredibilityScore.high(),
      bias: {
        level: 'center',
        confidence: 0.9,
        indicators: []
      },
      factualReporting: 'very-high'
    },
    ...overrides,
  }),

  misinformation: (overrides?: Partial<ContentAnalysis>): ContentAnalysis => ({
    title: 'SHOCKING TRUTH They Don\'t Want You to Know!!!',
    url: 'https://fake-news-site.com/shocking-truth',
    content: 'The mainstream media is hiding this incredible secret that will change everything you thought you knew about...',
    type: 'article',
    analysis: {
      domain: 'fake-news-site.com',
      credibility: mockCredibilityScore.low(),
      bias: {
        level: 'extreme',
        confidence: 0.95,
        indicators: ['clickbait', 'emotional-manipulation', 'unsubstantiated-claims']
      },
      factualReporting: 'very-low'
    },
    ...overrides,
  }),

  youtubVideo: (overrides?: Partial<ContentAnalysis>): ContentAnalysis => ({
    title: 'Educational Video: How AI is Changing the World',
    url: 'https://youtube.com/watch?v=abc123',
    content: 'In this video, we explore the latest developments in artificial intelligence and their impact on society...',
    type: 'video',
    platform: 'youtube',
    analysis: {
      domain: 'youtube.com',
      credibility: mockCredibilityScore.high(),
      bias: {
        level: 'center',
        confidence: 0.7,
        indicators: []
      }
    },
    ...overrides,
  }),
};


/**
 * Generate mock user settings
 */
export const mockUserSettings = {
  default: (): UserSettings => ({
    enabled: true,
    showVisualIndicators: true,
    indicatorPosition: 'top-right',
    factCheckingLevel: 'standard',
    autoAnalyze: true,
    trustedDomains: [],
    blockedDomains: [],
    theme: 'auto',
    notifications: {
      enabled: true,
      lowCredibilityAlert: true,
      factCheckComplete: false,
    },
    privacy: {
      analyticsEnabled: false,
      localProcessingOnly: true,
      cacheDuration: 24,
    },
  }),

  powerUser: (): UserSettings => ({
    enabled: true,
    showVisualIndicators: true,
    indicatorPosition: 'top-left',
    factCheckingLevel: 'thorough',
    autoAnalyze: true,
    trustedDomains: ['reuters.com', 'apnews.com', 'nature.com'],
    blockedDomains: ['fake-news.com', 'conspiracy-theory.net'],
    theme: 'dark',
    notifications: {
      enabled: true,
      lowCredibilityAlert: true,
      factCheckComplete: true,
    },
    privacy: {
      analyticsEnabled: false,
      localProcessingOnly: true,
      cacheDuration: 12, // Shorter cache for fresh data
    },
  }),

  privacyFocused: (): UserSettings => ({
    enabled: true,
    showVisualIndicators: false, // Minimal UI
    indicatorPosition: 'bottom-right',
    factCheckingLevel: 'basic',
    autoAnalyze: false, // Manual analysis only
    trustedDomains: [],
    blockedDomains: [],
    theme: 'auto',
    notifications: {
      enabled: false,
      lowCredibilityAlert: false,
      factCheckComplete: false,
    },
    privacy: {
      analyticsEnabled: false,
      localProcessingOnly: true,
      cacheDuration: 1, // Minimal caching
    },
  }),
};

/**
 * Generate mock user subscriptions
 */
export const mockUserSubscription = {
  free: (): UserSubscription => ({
    tier: 'free',
    status: 'active',
    features: ['basic'],
  }),

  premium: (): UserSubscription => ({
    tier: 'premium',
    status: 'active',
    features: ['basic', 'advanced', 'priority'],
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  }),

  enterprise: (): UserSubscription => ({
    tier: 'enterprise',
    status: 'active',
    features: ['basic', 'advanced', 'priority', 'api-access', 'bulk-analysis'],
    expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
  }),
};

/**
 * Generate test DOM structures for different platforms
 */
export const mockDOMStructures = {
  twitter: () => `
    <div data-testid="tweet">
      <div class="tweet-header">
        <span class="username">@newsaccount</span>
        <span class="timestamp">2h</span>
      </div>
      <div class="tweet-content">
        Breaking: Major development in ongoing story. More details to follow.
      </div>
    </div>
  `,

  facebook: () => `
    <div data-pagelet="FeedUnit_1">
      <div class="post-header">
        <span class="author">News Organization</span>
        <span class="timestamp">3 hours ago</span>
      </div>
      <div class="post-content">
        <p>Important update on current events that affects everyone.</p>
      </div>
    </div>
  `,

  article: () => `
    <main>
      <article>
        <header>
          <h1>Important News Article</h1>
          <div class="byline">By Reporter Name</div>
          <time datetime="2024-01-15">January 15, 2024</time>
        </header>
        <div class="content">
          <p>This is the main content of the news article...</p>
        </div>
      </article>
    </main>
  `,

  youtube: () => `
    <div id="above-the-fold">
      <div id="title">
        <h1>Educational Video Title</h1>
      </div>
      <div id="meta">
        <div id="channel-name">Educational Channel</div>
        <div id="info">1M views • 2 days ago</div>
      </div>
    </div>
  `,
};

/**
 * Create batch test data for performance testing
 */
export function createBatchTestData(count: number): {
  contents: ContentAnalysis[];
  credibilityScores: CredibilityScore[];
} {
  const contents: ContentAnalysis[] = [];
  const credibilityScores: CredibilityScore[] = [];

  for (let i = 0; i < count; i++) {
    const contentType = ['article', 'social-post', 'video'][i % 3];
    const credibilityLevel = ['high', 'medium', 'low', 'unknown'][i % 4];

    switch (contentType) {
      case 'article':
        contents.push(mockContentAnalysis.article({
          title: `Test Article ${i}`,
          url: `https://example.com/article${i}`,
        }));
        break;
      case 'social-post':
        contents.push(mockContentAnalysis.socialPost('twitter', {
          title: `Test Post ${i}`,
          url: `https://twitter.com/user/post${i}`,
        }));
        break;
      case 'video':
        contents.push(mockContentAnalysis.youtubVideo({
          title: `Test Video ${i}`,
          url: `https://youtube.com/watch?v=test${i}`,
        }));
        break;
    }

    switch (credibilityLevel) {
      case 'high':
        credibilityScores.push(mockCredibilityScore.high());
        break;
      case 'medium':
        credibilityScores.push(mockCredibilityScore.medium());
        break;
      case 'low':
        credibilityScores.push(mockCredibilityScore.low());
        break;
      case 'unknown':
        credibilityScores.push(mockCredibilityScore.unknown());
        break;
    }
  }

  return { contents, credibilityScores };
}
