import { ContentAnalysis, SocialPlatform } from '@shared/types';
import { GenericExtractor } from './genericExtractor';
import { TwitterExtractor } from './twitterExtractor';
import { TikTokExtractor } from './tiktokExtractor';
import { InstagramExtractor } from './instagramExtractor';
import { isNewsUrl } from '@shared/utils/urlMatcher';

/**
 * Extraction strategy interface for different content types
 */
export interface IExtractor {
  extractPageContent(): Promise<ContentAnalysis>;
  canHandle(url: string, document: Document): boolean;
}

/**
 * Platform detection result
 */
export interface PlatformDetection {
  platform: SocialPlatform | 'generic';
  confidence: number;
  indicators: string[];
}

/**
 * Main content extractor that coordinates different extraction strategies
 * Routes to appropriate extractor based on platform detection
 */
export class ContentExtractor {
  private readonly genericExtractor: GenericExtractor;
  private readonly platformExtractors: Map<SocialPlatform, IExtractor> = new Map();

  constructor() {
    this.genericExtractor = new GenericExtractor({
      maxProcessingTime: 500,
      enablePaywallDetection: true,
      enableLinkAnalysis: true,
      enableMediaDetection: true,
      minContentLength: 100,
      preserveFormatting: false,
      enablePerformanceLogging: false,
    });

    // Register platform-specific extractors
    this.platformExtractors.set('twitter', new TwitterExtractor());
    this.platformExtractors.set('tiktok', new TikTokExtractor());
    this.platformExtractors.set('instagram', new InstagramExtractor());
  }

  /**
   * Extract content from the current page using the appropriate strategy
   */
  async extractPageContent(): Promise<ContentAnalysis> {
    try {
      const startTime = performance.now();

      // Detect platform
      const platformDetection = this.detectPlatform();

      // Choose appropriate extractor
      let extractor: IExtractor;

      if (platformDetection.platform !== 'generic' &&
          this.platformExtractors.has(platformDetection.platform)) {
        extractor = this.platformExtractors.get(platformDetection.platform)!;
        console.debug(`Using ${platformDetection.platform} extractor`);
      } else {
        extractor = this.genericExtractor;
        console.debug('Using generic extractor');
      }

      // Verify extractor can handle this content
      if (extractor !== this.genericExtractor &&
          !extractor.canHandle(window.location.href, document)) {
        console.debug('Platform extractor cannot handle content, falling back to generic');
        extractor = this.genericExtractor;
      }

      // Extract content
      const result = await extractor.extractPageContent();

      // Add platform information if detected
      if (platformDetection.platform !== 'generic') {
        result.platform = platformDetection.platform;
        result.type = 'social-post';
      }

      const extractionTime = performance.now() - startTime;
      console.debug(`Content extraction completed in ${extractionTime.toFixed(2)}ms`);

      return result;

    } catch (error) {
      console.error('Content extraction failed:', error);
      return this.createErrorAnalysis(error);
    }
  }

  /**
   * Detect the platform/content type of the current page
   */
  private detectPlatform(): PlatformDetection {
    const url = window.location.href;
    const hostname = window.location.hostname;
    const indicators: string[] = [];
    let platform: SocialPlatform | 'generic' = 'generic';
    let confidence = 0;

    // Twitter/X detection
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      platform = 'twitter';
      confidence = 0.9;
      indicators.push('Twitter/X domain detected');

      // Check for tweet indicators
      if (url.includes('/status/') || document.querySelector('[data-testid="tweet"]')) {
        confidence = 1.0;
        indicators.push('Tweet-specific URL pattern or elements detected');
      }
    }

    // Facebook detection
    else if (hostname.includes('facebook.com') || hostname.includes('fb.com')) {
      platform = 'facebook';
      confidence = 0.9;
      indicators.push('Facebook domain detected');

      // Check for post indicators
      if (document.querySelector('[role="article"]') ||
          document.querySelector('[data-pagelet="FeedUnit"]')) {
        confidence = 1.0;
        indicators.push('Facebook post elements detected');
      }
    }

    // Instagram detection
    else if (hostname.includes('instagram.com')) {
      platform = 'instagram';
      confidence = 0.9;
      indicators.push('Instagram domain detected');

      // Check for post indicators
      if (url.includes('/p/') || url.includes('/reel/') ||
          document.querySelector('article[role="presentation"]')) {
        confidence = 1.0;
        indicators.push('Instagram post URL pattern or elements detected');
      }
    }

    // TikTok detection
    else if (hostname.includes('tiktok.com')) {
      platform = 'tiktok';
      confidence = 0.9;
      indicators.push('TikTok domain detected');

      // Check for video indicators
      if (url.includes('/video/') || document.querySelector('[data-e2e="browse-video"]')) {
        confidence = 1.0;
        indicators.push('TikTok video URL pattern or elements detected');
      }
    }

    // YouTube detection
    else if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      platform = 'youtube';
      confidence = 0.9;
      indicators.push('YouTube domain detected');

      // Check for video indicators
      if (url.includes('/watch?v=') || url.includes('/shorts/') ||
          document.querySelector('#movie_player')) {
        confidence = 1.0;
        indicators.push('YouTube video URL pattern or elements detected');
      }
    }

    // Reddit detection
    else if (hostname.includes('reddit.com')) {
      platform = 'reddit';
      confidence = 0.9;
      indicators.push('Reddit domain detected');

      // Check for post indicators
      if (url.includes('/comments/') || document.querySelector('[data-testid="post-content"]')) {
        confidence = 1.0;
        indicators.push('Reddit post URL pattern or elements detected');
      }
    }

    // LinkedIn detection
    else if (hostname.includes('linkedin.com')) {
      platform = 'linkedin';
      confidence = 0.9;
      indicators.push('LinkedIn domain detected');

      // Check for post indicators
      if (url.includes('/feed/update/') || url.includes('/posts/') ||
          document.querySelector('[data-urn*="urn:li:activity"]')) {
        confidence = 1.0;
        indicators.push('LinkedIn post URL pattern or elements detected');
      }
    }

    // Generic content - check if it's suitable for readability
    if (platform === 'generic') {
      // Look for article indicators
      const articleIndicators = [
        'article',
        '[role="main"]',
        '.content',
        '.post',
        '.entry',
        'main',
      ];

      for (const selector of articleIndicators) {
        if (document.querySelector(selector)) {
          confidence = 0.8;
          indicators.push(`Article content indicator found: ${selector}`);
          break;
        }
      }

      // Check for news site patterns
      if (isNewsUrl(url)) {
        confidence = Math.max(confidence, 0.7);
        indicators.push('News site URL pattern detected');
      }
    }

    return {
      platform,
      confidence,
      indicators,
    };
  }

  /**
   * Register a platform-specific extractor
   */
  registerPlatformExtractor(platform: SocialPlatform, extractor: IExtractor): void {
    this.platformExtractors.set(platform, extractor);
    console.debug(`Registered ${platform} extractor`);
  }

  /**
   * Remove a platform-specific extractor
   */
  unregisterPlatformExtractor(platform: SocialPlatform): void {
    this.platformExtractors.delete(platform);
    console.debug(`Unregistered ${platform} extractor`);
  }

  /**
   * Get available extractors
   */
  getAvailableExtractors(): string[] {
    return ['generic', ...Array.from(this.platformExtractors.keys())];
  }

  /**
   * Create error analysis when extraction fails
   */
  private createErrorAnalysis(error: any): ContentAnalysis {
    return {
      url: window.location.href,
      title: document.title || 'Error',
      content: '',
      type: 'other',
      analysis: {
        domain: window.location.hostname,
        credibility: {
          score: 0,
          level: 'unknown',
          confidence: 0,
          reasoning: `Content extraction failed: ${error.message}`,
          source: 'fallback',
          timestamp: Date.now(),
        },
      },
    };
  }
}
