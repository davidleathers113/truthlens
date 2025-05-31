// Mock data generators for TruthLens testing
// Provides realistic test data for various scenarios

import { ContentAnalysis, CredibilityScore, UserSettings, UserSubscription } from '@shared/types';

/**
 * Generate mock content analysis data
 */
export const mockContentAnalysis = {
  article: (overrides?: Partial<ContentAnalysis>): ContentAnalysis => ({
    title: 'Breaking: Major Scientific Discovery Announced',
    url: 'https://example.com/science-discovery',
    content: 'Scientists at leading university have announced a breakthrough in renewable energy technology that could revolutionize the industry...',
    type: 'article',
    platform: 'web',
    author: 'Dr. Jane Smith',
    publishedAt: Date.now() - 3600000, // 1 hour ago
    analysis: {
      sourceRating: 4,
      sentimentScore: 0.2,
      biasIndicators: [],
      factualityMarkers: ['citation', 'expert-quote'],
      languageComplexity: 'medium',
    },
    ...overrides,
  }),

  socialPost: (platform: 'twitter' | 'facebook' | 'instagram' | 'tiktok' = 'twitter', overrides?: Partial<ContentAnalysis>): ContentAnalysis => ({
    title: 'Viral Social Media Post',
    url: `https://${platform}.com/user/post/123456`,
    content: 'Just witnessed something incredible! You won\'t believe what happened next... 🔥 #trending #unbelievable',
    type: 'social-post',
    platform,
    author: '@trendy_user',
    publishedAt: Date.now() - 1800000, // 30 minutes ago
    analysis: {
      sourceRating: 2,
      sentimentScore: 0.8,
      biasIndicators: ['emotional-language', 'clickbait'],
      factualityMarkers: [],
      languageComplexity: 'simple',
    },
    engagementMetrics: {
      likes: 15420,
      shares: 2341,
      comments: 567,
    },
    ...overrides,
  }),

  newsArticle: (domain: string = 'reuters.com', overrides?: Partial<ContentAnalysis>): ContentAnalysis => ({
    title: 'International Summit Reaches Climate Agreement',
    url: `https://${domain}/article/climate-summit-agreement`,
    content: 'World leaders have reached a historic agreement on climate action following three days of intensive negotiations...',
    type: 'article',
    platform: 'web',
    author: 'International Correspondent',
    publishedAt: Date.now() - 7200000, // 2 hours ago
    metadata: {
      wordCount: 1250,
      readingTime: 5,
      category: 'politics',
    },
    ...overrides,
  }),

  misinformation: (overrides?: Partial<ContentAnalysis>): ContentAnalysis => ({
    title: 'SHOCKING TRUTH They Don\'t Want You to Know!!!',
    url: 'https://fake-news-site.com/shocking-truth',
    content: 'The mainstream media is hiding this incredible secret that will change everything you thought you knew about...',
    type: 'article',
    platform: 'web',
    author: 'Anonymous Truth Teller',
    publishedAt: Date.now() - 86400000, // 1 day ago
    metadata: {
      hasClickbaitTitle: true,
      hasAllCapsText: true,
      hasEmotionalLanguage: true,
    },
    ...overrides,
  }),

  youtubVideo: (overrides?: Partial<ContentAnalysis>): ContentAnalysis => ({
    title: 'Educational Video: How AI is Changing the World',
    url: 'https://youtube.com/watch?v=abc123',
    content: 'In this video, we explore the latest developments in artificial intelligence and their impact on society...',
    type: 'video',
    platform: 'youtube',
    author: 'Tech Education Channel',
    publishedAt: Date.now() - 43200000, // 12 hours ago
    metadata: {
      duration: 1240, // 20:40
      viewCount: 45678,
      category: 'education',
    },
    ...overrides,
  }),
};

/**
 * Generate mock credibility scores
 */
export const mockCredibilityScore = {
  high: (overrides?: Partial<CredibilityScore>): CredibilityScore => ({
    score: 92,
    level: 'high',
    confidence: 0.95,
    reasoning: 'Content from verified, reputable source with factual accuracy indicators and transparent sourcing.',
    source: 'ai',
    timestamp: Date.now(),
    biasIndicators: [],
    factChecks: [
      {
        claim: 'Climate agreement reached',
        verdict: 'verified',
        source: 'fact-check-org',
      },
    ],
    ...overrides,
  }),

  medium: (overrides?: Partial<CredibilityScore>): CredibilityScore => ({
    score: 68,
    level: 'medium',
    confidence: 0.78,
    reasoning: 'Mixed signals: some reliable indicators but also potential bias markers. Requires additional verification.',
    source: 'ai',
    timestamp: Date.now(),
    biasIndicators: ['opinion-heavy'],
    factChecks: [],
    ...overrides,
  }),

  low: (overrides?: Partial<CredibilityScore>): CredibilityScore => ({
    score: 23,
    level: 'low',
    confidence: 0.88,
    reasoning: 'Multiple red flags: sensationalized language, lack of credible sources, and known misinformation patterns.',
    source: 'ai',
    timestamp: Date.now(),
    biasIndicators: ['clickbait', 'emotional-manipulation', 'unsubstantiated-claims'],
    factChecks: [
      {
        claim: 'Shocking secret revealed',
        verdict: 'false',
        source: 'snopes',
      },
    ],
    ...overrides,
  }),

  unknown: (overrides?: Partial<CredibilityScore>): CredibilityScore => ({
    score: 50,
    level: 'unknown',
    confidence: 0.45,
    reasoning: 'Insufficient information available for reliable credibility assessment.',
    source: 'fallback',
    timestamp: Date.now(),
    biasIndicators: [],
    factChecks: [],
    ...overrides,
  }),

  fallback: (domain?: string, overrides?: Partial<CredibilityScore>): CredibilityScore => {
    const trustedDomains = ['reuters.com', 'apnews.com', 'bbc.com', 'npr.org'];
    const untrustedPatterns = ['fake', 'hoax', 'conspiracy'];
    
    let score = 50;
    let level: 'high' | 'medium' | 'low' | 'unknown' = 'unknown';
    
    if (domain) {
      if (trustedDomains.some(trusted => domain.includes(trusted))) {
        score = 85;
        level = 'high';
      } else if (untrustedPatterns.some(pattern => domain.includes(pattern))) {
        score = 20;
        level = 'low';
      }
    }
    
    return {
      score,
      level,
      confidence: 0.6,
      reasoning: 'Basic domain-based heuristic analysis (AI unavailable)',
      source: 'fallback',
      timestamp: Date.now(),
      biasIndicators: [],
      factChecks: [],
      ...overrides,
    };
  },
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
    factCheckingLevel: 'advanced',
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
    features: ['basic'],
    dailyAnalysisLimit: 50,
    rateLimit: {
      requestsPerMinute: 10,
      requestsPerHour: 100,
    },
  }),

  premium: (): UserSubscription => ({
    tier: 'premium',
    features: ['basic', 'advanced', 'priority'],
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    dailyAnalysisLimit: 1000,
    rateLimit: {
      requestsPerMinute: 60,
      requestsPerHour: 2000,
    },
  }),

  enterprise: (): UserSubscription => ({
    tier: 'enterprise',
    features: ['basic', 'advanced', 'priority', 'api-access', 'bulk-analysis'],
    expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
    dailyAnalysisLimit: 10000,
    rateLimit: {
      requestsPerMinute: 300,
      requestsPerHour: 10000,
    },
    organizationId: 'org_123456',
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