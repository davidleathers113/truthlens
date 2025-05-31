import { SocialPlatform, ContentAnalysis } from '@shared/types';

/**
 * Platform detection and analysis result
 */
export interface PlatformAnalysisResult {
  platform: SocialPlatform;
  confidence: number;
  indicators: string[];
  contentSelectors: string[];
}

/**
 * Social media content extraction result
 */
export interface SocialContent {
  text: string;
  author?: string;
  timestamp?: Date;
  engagement?: {
    likes?: number;
    shares?: number;
    comments?: number;
  };
  mediaUrls: string[];
  hashtags: string[];
  mentions: string[];
}

/**
 * Platform analyzer for detecting and extracting content from social media platforms
 * This is a basic implementation that can be extended with platform-specific extractors
 */
export class PlatformAnalyzer {
  private readonly platformConfigs: Map<SocialPlatform, PlatformConfig> = new Map();

  constructor() {
    this.initializePlatformConfigs();
  }

  /**
   * Analyze the current platform
   */
  analyzePlatform(): PlatformAnalysisResult | null {
    const hostname = window.location.hostname.toLowerCase();
    const url = window.location.href;

    for (const [platform, config] of this.platformConfigs) {
      if (config.domainPatterns.some(pattern => pattern.test(hostname))) {
        const indicators: string[] = [`Matched domain pattern for ${platform}`];
        let confidence = 0.7;

        // Check URL patterns
        for (const urlPattern of config.urlPatterns) {
          if (urlPattern.test(url)) {
            indicators.push(`Matched URL pattern: ${urlPattern.source}`);
            confidence += 0.1;
          }
        }

        // Check DOM selectors
        for (const selector of config.domainSelectors) {
          if (document.querySelector(selector)) {
            indicators.push(`Found platform element: ${selector}`);
            confidence += 0.1;
          }
        }

        confidence = Math.min(confidence, 1.0);

        if (confidence >= 0.8) {
          return {
            platform,
            confidence,
            indicators,
            contentSelectors: config.contentSelectors,
          };
        }
      }
    }

    return null;
  }

  /**
   * Extract social media content from the current page
   */
  async extractContent(): Promise<SocialContent[]> {
    const platformResult = this.analyzePlatform();
    if (!platformResult) {
      return [];
    }

    const config = this.platformConfigs.get(platformResult.platform);
    if (!config) {
      return [];
    }

    const content: SocialContent[] = [];

    try {
      // Extract content using platform-specific selectors
      for (const selector of config.contentSelectors) {
        const elements = document.querySelectorAll(selector);
        
        for (const element of elements) {
          const socialContent = await this.extractSocialContent(
            element,
            platformResult.platform,
            config
          );
          
          if (socialContent && socialContent.text.trim()) {
            content.push(socialContent);
          }
        }
      }

      return content;
    } catch (error) {
      console.error(`Failed to extract ${platformResult.platform} content:`, error);
      return [];
    }
  }

  /**
   * Extract social content from a specific element
   */
  private async extractSocialContent(
    element: Element,
    platform: SocialPlatform,
    config: PlatformConfig
  ): Promise<SocialContent | null> {
    try {
      const text = this.extractText(element, config.textSelectors);
      if (!text) return null;

      const author = this.extractAuthor(element, config.authorSelectors);
      const timestamp = this.extractTimestamp(element, config.timestampSelectors);
      const engagement = this.extractEngagement(element, config.engagementSelectors);
      const mediaUrls = this.extractMediaUrls(element, config.mediaSelectors);
      const hashtags = this.extractHashtags(text);
      const mentions = this.extractMentions(text);

      return {
        text,
        author,
        timestamp,
        engagement,
        mediaUrls,
        hashtags,
        mentions,
      };
    } catch (error) {
      console.error('Failed to extract social content from element:', error);
      return null;
    }
  }

  /**
   * Extract text content from element
   */
  private extractText(element: Element, selectors: string[]): string {
    for (const selector of selectors) {
      const textElement = element.querySelector(selector);
      if (textElement?.textContent) {
        return textElement.textContent.trim();
      }
    }
    
    // Fallback to element text content
    return element.textContent?.trim() || '';
  }

  /**
   * Extract author information
   */
  private extractAuthor(element: Element, selectors: string[]): string | undefined {
    for (const selector of selectors) {
      const authorElement = element.querySelector(selector);
      if (authorElement?.textContent) {
        return authorElement.textContent.trim();
      }
    }
    return undefined;
  }

  /**
   * Extract timestamp
   */
  private extractTimestamp(element: Element, selectors: string[]): Date | undefined {
    for (const selector of selectors) {
      const timeElement = element.querySelector(selector);
      if (timeElement) {
        const datetime = timeElement.getAttribute('datetime') || 
                        timeElement.getAttribute('title') ||
                        timeElement.textContent;
        
        if (datetime) {
          const date = new Date(datetime);
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      }
    }
    return undefined;
  }

  /**
   * Extract engagement metrics
   */
  private extractEngagement(element: Element, selectors: EngagementSelectors): any {
    const engagement: any = {};

    if (selectors.likes) {
      const likesElement = element.querySelector(selectors.likes);
      if (likesElement?.textContent) {
        engagement.likes = this.parseEngagementNumber(likesElement.textContent);
      }
    }

    if (selectors.shares) {
      const sharesElement = element.querySelector(selectors.shares);
      if (sharesElement?.textContent) {
        engagement.shares = this.parseEngagementNumber(sharesElement.textContent);
      }
    }

    if (selectors.comments) {
      const commentsElement = element.querySelector(selectors.comments);
      if (commentsElement?.textContent) {
        engagement.comments = this.parseEngagementNumber(commentsElement.textContent);
      }
    }

    return Object.keys(engagement).length > 0 ? engagement : undefined;
  }

  /**
   * Extract media URLs
   */
  private extractMediaUrls(element: Element, selectors: string[]): string[] {
    const urls: string[] = [];

    for (const selector of selectors) {
      const mediaElements = element.querySelectorAll(selector);
      for (const mediaElement of mediaElements) {
        const src = mediaElement.getAttribute('src') || 
                   mediaElement.getAttribute('data-src') ||
                   mediaElement.getAttribute('href');
        
        if (src && !urls.includes(src)) {
          urls.push(src);
        }
      }
    }

    return urls;
  }

  /**
   * Extract hashtags from text
   */
  private extractHashtags(text: string): string[] {
    const hashtagRegex = /#[\w\u00c0-\u024f\u1e00-\u1eff]+/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.substring(1)) : [];
  }

  /**
   * Extract mentions from text
   */
  private extractMentions(text: string): string[] {
    const mentionRegex = /@[\w\u00c0-\u024f\u1e00-\u1eff]+/g;
    const matches = text.match(mentionRegex);
    return matches ? matches.map(mention => mention.substring(1)) : [];
  }

  /**
   * Parse engagement numbers (handles K, M suffixes)
   */
  private parseEngagementNumber(text: string): number {
    const cleaned = text.replace(/[^\d.,KMB]/gi, '');
    const number = parseFloat(cleaned.replace(',', ''));
    
    if (isNaN(number)) return 0;
    
    const suffix = cleaned.toUpperCase().slice(-1);
    switch (suffix) {
      case 'K': return Math.round(number * 1000);
      case 'M': return Math.round(number * 1000000);
      case 'B': return Math.round(number * 1000000000);
      default: return Math.round(number);
    }
  }

  /**
   * Initialize platform configurations
   */
  private initializePlatformConfigs(): void {
    // Twitter/X configuration
    this.platformConfigs.set('twitter', {
      domainPatterns: [/twitter\.com/, /x\.com/],
      urlPatterns: [/\/status\/\d+/, /\/tweet\//],
      domainSelectors: ['[data-testid="tweet"]', '[role="article"]'],
      contentSelectors: ['[data-testid="tweet"]', 'article[role="article"]'],
      textSelectors: ['[data-testid="tweetText"]', '[lang]'],
      authorSelectors: ['[data-testid="User-Name"] a', '[data-testid="User-Names"] a'],
      timestampSelectors: ['time[datetime]'],
      engagementSelectors: {
        likes: '[data-testid="like"] span',
        shares: '[data-testid="retweet"] span',
        comments: '[data-testid="reply"] span',
      },
      mediaSelectors: ['img[src*="pbs.twimg.com"]', 'video', '[data-testid="videoPlayer"]'],
    });

    // Facebook configuration
    this.platformConfigs.set('facebook', {
      domainPatterns: [/facebook\.com/, /fb\.com/],
      urlPatterns: [/\/posts\//, /\/photo\//, /\/video\//],
      domainSelectors: ['[role="article"]', '[data-pagelet="FeedUnit"]'],
      contentSelectors: ['[role="article"]', '[data-pagelet="FeedUnit"]'],
      textSelectors: ['[data-ad-preview="message"]', '[data-testid="post_message"]'],
      authorSelectors: ['[data-testid="story-subtitle"] a', 'h3 a'],
      timestampSelectors: ['[data-testid="story-subtitle"] a[role="link"]'],
      engagementSelectors: {
        likes: '[aria-label*="reaction"]',
        shares: '[aria-label*="share"]',
        comments: '[aria-label*="comment"]',
      },
      mediaSelectors: ['img[data-imgperflogname]', 'video'],
    });

    // Instagram configuration
    this.platformConfigs.set('instagram', {
      domainPatterns: [/instagram\.com/],
      urlPatterns: [/\/p\//, /\/reel\//, /\/tv\//],
      domainSelectors: ['article[role="presentation"]', 'article'],
      contentSelectors: ['article'],
      textSelectors: ['[data-testid="post-text"]', 'span'],
      authorSelectors: ['header a[role="link"]'],
      timestampSelectors: ['time[datetime]'],
      engagementSelectors: {
        likes: 'section span[title*="like"]',
        comments: 'a[href*="/comments/"]',
      },
      mediaSelectors: ['img[src*="cdninstagram"]', 'video'],
    });

    // YouTube configuration
    this.platformConfigs.set('youtube', {
      domainPatterns: [/youtube\.com/, /youtu\.be/],
      urlPatterns: [/\/watch\?v=/, /\/shorts\//, /\/embed\//],
      domainSelectors: ['#movie_player', '[data-testid="video-title"]'],
      contentSelectors: ['#meta', '#meta-contents'],
      textSelectors: ['#title h1', 'h1.title'],
      authorSelectors: ['#channel-name a', '#owner-text a'],
      timestampSelectors: ['#date span'],
      engagementSelectors: {
        likes: '#segmented-like-button span',
        comments: '#count span',
      },
      mediaSelectors: ['video', '#movie_player video'],
    });

    // LinkedIn configuration
    this.platformConfigs.set('linkedin', {
      domainPatterns: [/linkedin\.com/],
      urlPatterns: [/\/feed\/update\//, /\/posts\//],
      domainSelectors: ['[data-urn*="urn:li:activity"]', '.feed-shared-update-v2'],
      contentSelectors: ['[data-urn*="urn:li:activity"]', '.feed-shared-update-v2'],
      textSelectors: ['.feed-shared-text', '.break-words'],
      authorSelectors: ['.feed-shared-actor__name', '.feed-shared-actor__title'],
      timestampSelectors: ['.feed-shared-actor__sub-description time'],
      engagementSelectors: {
        likes: '.social-counts-reactions__count',
        comments: '.social-counts-comments__count',
      },
      mediaSelectors: ['.feed-shared-image img', '.feed-shared-video video'],
    });

    // Reddit configuration
    this.platformConfigs.set('reddit', {
      domainPatterns: [/reddit\.com/],
      urlPatterns: [/\/comments\//, /\/r\/.*\/comments\//],
      domainSelectors: ['[data-testid="post-content"]', '.Post'],
      contentSelectors: ['[data-testid="post-content"]', '.Post'],
      textSelectors: ['[data-testid="post-text"]', '.RichTextJSON-root'],
      authorSelectors: ['[data-testid="post-author-link"]', '.Post__author-link'],
      timestampSelectors: ['[data-testid="post-timestamp"]', '._3jOxDPIQ0KaOWpzvSQo-1s'],
      engagementSelectors: {
        likes: '[data-testid="post-vote-count"]',
        comments: '[data-testid="post-comment-count"]',
      },
      mediaSelectors: ['[data-testid="post-image"]', '[data-testid="post-video"]'],
    });

    // TikTok configuration  
    this.platformConfigs.set('tiktok', {
      domainPatterns: [/tiktok\.com/],
      urlPatterns: [/\/video\//, /@.*\/video\//],
      domainSelectors: ['[data-e2e="browse-video"]', '[data-e2e="video-desc"]'],
      contentSelectors: ['[data-e2e="browse-video"]'],
      textSelectors: ['[data-e2e="video-desc"]', '[data-e2e="browse-video-desc"]'],
      authorSelectors: ['[data-e2e="video-author-uniqueid"]', '[data-e2e="video-author-avatar"]'],
      timestampSelectors: [],
      engagementSelectors: {
        likes: '[data-e2e="like-count"]',
        shares: '[data-e2e="share-count"]',
        comments: '[data-e2e="comment-count"]',
      },
      mediaSelectors: ['[data-e2e="browse-video"] video'],
    });
  }
}

/**
 * Platform configuration interface
 */
interface PlatformConfig {
  domainPatterns: RegExp[];
  urlPatterns: RegExp[];
  domainSelectors: string[];
  contentSelectors: string[];
  textSelectors: string[];
  authorSelectors: string[];
  timestampSelectors: string[];
  engagementSelectors: EngagementSelectors;
  mediaSelectors: string[];
}

/**
 * Engagement selectors interface
 */
interface EngagementSelectors {
  likes?: string;
  shares?: string;
  comments?: string;
}