/**
 * Twitter/X Content Extractor - 2025
 *
 * Specialized content extractor for Twitter/X that handles tweets, threads,
 * and embedded content while adapting to UI changes and implementing
 * rate-limiting mechanisms.
 *
 * Based on 2025 best practices for social media content extraction.
 */

import { ContentAnalysis, SocialPlatform } from '@shared/types';
import { IExtractor } from './contentExtractor';
import {
  TwitterSelectors,
  TwitterFallbackSelectors,
  TwitterUrlPatterns,
  TwitterRateLimiting,
  TwitterValidation,
  isTwitterUrl,
  isTweetUrl,
  getOperationDelay
} from './config/twitterSelectors';

/**
 * Twitter-specific content types
 */
export interface TwitterContent {
  type: 'tweet' | 'thread' | 'quote-tweet' | 'reply';
  id?: string;
  text: string;
  author: {
    name?: string;
    username?: string;
    avatarUrl?: string;
  };
  timestamp?: Date;
  engagement: {
    replies?: number;
    retweets?: number;
    likes?: number;
    views?: number;
  };
  media: {
    images: Array<{
      url: string;
      alt?: string;
    }>;
    videos: Array<{
      url: string;
      type: 'video' | 'gif';
      poster?: string;
    }>;
  };
  quotedTweet?: TwitterContent;
  threadContext?: {
    isPartOfThread: boolean;
    threadPosition?: number;
    threadLength?: number;
  };
  extractionMetadata: {
    extractedAt: number;
    confidence: number;
    selectors: string[];
    errors: string[];
  };
}

/**
 * Thread extraction result
 */
export interface TwitterThread {
  tweets: TwitterContent[];
  originalTweet: TwitterContent;
  totalTweets: number;
  isComplete: boolean;
  extractionMetadata: {
    extractedAt: number;
    timeSpent: number;
    errors: string[];
  };
}

/**
 * Cache entry for extracted content
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  url: string;
}

/**
 * TwitterExtractor class implementing IExtractor interface
 * Provides comprehensive Twitter/X content extraction with 2025 best practices
 */
export class TwitterExtractor implements IExtractor {
  private readonly cache = new Map<string, CacheEntry<TwitterContent | TwitterThread>>();
  private readonly mutationObserver?: MutationObserver;
  private readonly performanceMetrics = {
    extractionCount: 0,
    averageTime: 0,
    errorCount: 0,
    lastExtraction: 0
  };
  private isExtracting = false;
  private dynamicContentListeners = new Set<() => void>();
  private threadExtractionState = {
    isExtractingThread: false,
    currentThreadId: '',
    extractedTweets: new Map<string, TwitterContent>(),
    lastScrollPosition: 0
  };

  constructor() {
    this.setupMutationObserver();
    this.setupCacheCleanup();
    this.setupInfiniteScrollDetection();
  }

  /**
   * Check if this extractor can handle the given URL and document
   */
  canHandle(url: string, document: Document): boolean {
    try {
      // Check if URL is Twitter/X
      if (!isTwitterUrl(url)) {
        return false;
      }

      // Verify Twitter elements are present in DOM
      const hasTwitterElements = this.detectTwitterElements(document);
      if (!hasTwitterElements) {
        return false;
      }

      // Additional validation for tweet-specific content
      if (isTweetUrl(url)) {
        const hasTweetElements = this.detectTweetElements(document);
        return hasTweetElements;
      }

      return true;
    } catch (error) {
      console.error('TwitterExtractor.canHandle failed:', error);
      return false;
    }
  }

  /**
   * Extract content from the current Twitter/X page
   */
  async extractPageContent(): Promise<ContentAnalysis> {
    const startTime = performance.now();

    try {
      // Prevent concurrent extractions
      if (this.isExtracting) {
        console.debug('TwitterExtractor: Extraction already in progress, using cache if available');
        const cached = this.getCachedContent(window.location.href);
        if (cached) {
          return this.convertToContentAnalysis(cached);
        }
      }

      this.isExtracting = true;

      // Determine content type and extract accordingly
      const url = window.location.href;

      if (isTweetUrl(url)) {
        // Extract individual tweet or thread
        const content = await this.extractTweetContent();
        this.updatePerformanceMetrics(startTime);
        return this.convertToContentAnalysis(content);
      } else {
        // Extract timeline or profile content
        const content = await this.extractTimelineContent();
        this.updatePerformanceMetrics(startTime);
        return this.convertToContentAnalysis(content);
      }

    } catch (error) {
      console.error('TwitterExtractor.extractPageContent failed:', error);
      this.performanceMetrics.errorCount++;
      return this.createErrorAnalysis(error);
    } finally {
      this.isExtracting = false;
    }
  }

  /**
   * Extract content from a specific tweet page
   */
  private async extractTweetContent(): Promise<TwitterContent> {
    const url = window.location.href;

    // Check cache first
    const cached = this.getCachedContent(url);
    if (cached && 'text' in cached) {
      return cached;
    }

    // Find main tweet container
    const tweetElement = await this.findTweetElement();
    if (!tweetElement) {
      throw new Error('Could not find tweet element on page');
    }

    // Extract tweet data
    const tweetContent = await this.extractTweetFromElement(tweetElement);

    // Check if this is part of a thread
    const threadContext = await this.analyzeThreadContext(tweetElement);
    if (threadContext.isPartOfThread) {
      tweetContent.threadContext = threadContext;
    }

    // Cache the result
    this.cacheContent(url, tweetContent);

    return tweetContent;
  }

  /**
   * Extract content from timeline or profile pages
   */
  private async extractTimelineContent(): Promise<TwitterContent> {
    // For timeline content, extract the first visible tweet as primary content
    const tweetElements = await this.findTweetElements();

    if (tweetElements.length === 0) {
      throw new Error('No tweets found on timeline');
    }

    // Extract the first tweet as primary content
    const primaryTweet = await this.extractTweetFromElement(tweetElements[0]);

    // Add context about being from timeline
    primaryTweet.extractionMetadata.selectors.push('timeline-extraction');

    return primaryTweet;
  }

  /**
   * Find the main tweet element on a tweet page
   */
  private async findTweetElement(): Promise<Element | null> {
    // Try multiple strategies to find the tweet element
    const strategies = [
      () => this.findElementWithSelectors(TwitterSelectors.tweet.container),
      () => this.findTweetByUrl(),
      () => this.findElementWithSelectors(TwitterFallbackSelectors.semantic.articles)
    ];

    for (const strategy of strategies) {
      const element = await strategy();
      if (element && this.validateTweetElement(element)) {
        return element;
      }
    }

    return null;
  }

  /**
   * Find multiple tweet elements on timeline pages
   */
  private async findTweetElements(): Promise<Element[]> {
    const elements = this.findElementsWithSelectors(TwitterSelectors.tweet.container);
    return elements.filter(el => this.validateTweetElement(el));
  }

  /**
   * Extract comprehensive data from a tweet element
   */
  private async extractTweetFromElement(element: Element): Promise<TwitterContent> {
    const startTime = performance.now();
    const errors: string[] = [];
    const usedSelectors: string[] = [];

    try {
      // Extract text content
      const text = await this.extractTweetText(element, usedSelectors, errors);

      // Extract author information
      const author = await this.extractAuthorInfo(element, usedSelectors, errors);

      // Extract timestamp
      const timestamp = await this.extractTimestamp(element, usedSelectors, errors);

      // Extract engagement metrics
      const engagement = await this.extractEngagement(element, usedSelectors, errors);

      // Extract media content
      const media = await this.extractMedia(element, usedSelectors, errors);

      // Extract quoted tweet if present
      const quotedTweet = await this.extractQuotedTweet(element, usedSelectors, errors);

      // Calculate confidence based on extracted data quality
      const confidence = this.calculateExtractionConfidence({
        text, author, timestamp, engagement, media
      });

      const tweetContent: TwitterContent = {
        type: 'tweet',
        text,
        author,
        timestamp,
        engagement,
        media,
        quotedTweet,
        extractionMetadata: {
          extractedAt: Date.now(),
          confidence,
          selectors: usedSelectors,
          errors
        }
      };

      // Apply rate limiting delay
      await this.applyRateLimit('betweenTweets');

      return tweetContent;

    } catch (error) {
      errors.push(`Tweet extraction failed: ${error}`);
      throw new Error(`Failed to extract tweet: ${error}`);
    }
  }

  /**
   * Extract tweet text using multiple selector strategies
   */
  private async extractTweetText(
    element: Element,
    usedSelectors: string[],
    errors: string[]
  ): Promise<string> {
    const textSelectors = TwitterSelectors.tweet.text;

    for (const selector of textSelectors) {
      try {
        const textElement = element.querySelector(selector);
        if (textElement?.textContent) {
          const text = textElement.textContent.trim();
          if (this.validateTweetText(text)) {
            usedSelectors.push(`text:${selector}`);
            return text;
          }
        }
      } catch (error) {
        errors.push(`Text selector failed: ${selector} - ${error}`);
      }
    }

    // Fallback: try to get any text content from the element
    const fallbackText = element.textContent?.trim() || '';
    if (this.validateTweetText(fallbackText)) {
      usedSelectors.push('text:fallback');
      return fallbackText;
    }

    errors.push('No valid tweet text found');
    return '';
  }

  /**
   * Extract author information
   */
  private async extractAuthorInfo(
    element: Element,
    usedSelectors: string[],
    errors: string[]
  ): Promise<TwitterContent['author']> {
    const author: TwitterContent['author'] = {};

    // Extract display name
    try {
      const nameElement = this.findElementWithSelectors(
        TwitterSelectors.tweet.author.name,
        element
      );
      if (nameElement?.textContent) {
        author.name = nameElement.textContent.trim();
        usedSelectors.push('author.name');
      }
    } catch (error) {
      errors.push(`Author name extraction failed: ${error}`);
    }

    // Extract username
    try {
      const usernameElement = this.findElementWithSelectors(
        TwitterSelectors.tweet.author.username,
        element
      );
      if (usernameElement) {
        const href = usernameElement.getAttribute('href');
        if (href) {
          const match = href.match(/\/([^\/]+)$/);
          if (match) {
            author.username = match[1];
            usedSelectors.push('author.username');
          }
        }
      }
    } catch (error) {
      errors.push(`Author username extraction failed: ${error}`);
    }

    // Extract avatar URL
    try {
      const avatarElement = this.findElementWithSelectors(
        TwitterSelectors.tweet.author.avatar,
        element
      ) as HTMLImageElement;
      if (avatarElement?.src) {
        author.avatarUrl = avatarElement.src;
        usedSelectors.push('author.avatar');
      }
    } catch (error) {
      errors.push(`Author avatar extraction failed: ${error}`);
    }

    return author;
  }

  /**
   * Extract timestamp
   */
  private async extractTimestamp(
    element: Element,
    usedSelectors: string[],
    errors: string[]
  ): Promise<Date | undefined> {
    try {
      const timeElement = this.findElementWithSelectors(
        TwitterSelectors.tweet.timestamp,
        element
      ) as HTMLTimeElement;

      if (timeElement) {
        const datetime = timeElement.getAttribute('datetime');
        if (datetime) {
          const date = new Date(datetime);
          if (!isNaN(date.getTime())) {
            usedSelectors.push('timestamp');
            return date;
          }
        }
      }
    } catch (error) {
      errors.push(`Timestamp extraction failed: ${error}`);
    }

    return undefined;
  }

  /**
   * Extract engagement metrics (likes, retweets, replies)
   */
  private async extractEngagement(
    element: Element,
    usedSelectors: string[],
    errors: string[]
  ): Promise<TwitterContent['engagement']> {
    const engagement: TwitterContent['engagement'] = {};

    // Extract replies count
    try {
      const repliesElement = this.findElementWithSelectors(
        TwitterSelectors.tweet.engagement.replies,
        element
      );
      if (repliesElement?.textContent) {
        engagement.replies = this.parseEngagementNumber(repliesElement.textContent);
        usedSelectors.push('engagement.replies');
      }
    } catch (error) {
      errors.push(`Replies count extraction failed: ${error}`);
    }

    // Extract retweets count
    try {
      const retweetsElement = this.findElementWithSelectors(
        TwitterSelectors.tweet.engagement.retweets,
        element
      );
      if (retweetsElement?.textContent) {
        engagement.retweets = this.parseEngagementNumber(retweetsElement.textContent);
        usedSelectors.push('engagement.retweets');
      }
    } catch (error) {
      errors.push(`Retweets count extraction failed: ${error}`);
    }

    // Extract likes count
    try {
      const likesElement = this.findElementWithSelectors(
        TwitterSelectors.tweet.engagement.likes,
        element
      );
      if (likesElement?.textContent) {
        engagement.likes = this.parseEngagementNumber(likesElement.textContent);
        usedSelectors.push('engagement.likes');
      }
    } catch (error) {
      errors.push(`Likes count extraction failed: ${error}`);
    }

    // Extract views count (if available)
    try {
      const viewsElement = this.findElementWithSelectors(
        TwitterSelectors.tweet.engagement.views,
        element
      );
      if (viewsElement?.textContent) {
        engagement.views = this.parseEngagementNumber(viewsElement.textContent);
        usedSelectors.push('engagement.views');
      }
    } catch (error) {
      // Views are optional, don't add to errors
    }

    return engagement;
  }

  /**
   * Extract media content (images, videos, GIFs)
   */
  private async extractMedia(
    element: Element,
    usedSelectors: string[],
    errors: string[]
  ): Promise<TwitterContent['media']> {
    const media: TwitterContent['media'] = {
      images: [],
      videos: []
    };

    // Extract images
    try {
      const imageElements = this.findElementsWithSelectors(
        TwitterSelectors.tweet.media.images,
        element
      ) as HTMLImageElement[];

      for (const img of imageElements) {
        if (img.src) {
          media.images.push({
            url: img.src,
            alt: img.alt || undefined
          });
        }
      }
      if (media.images.length > 0) {
        usedSelectors.push('media.images');
      }
    } catch (error) {
      errors.push(`Image extraction failed: ${error}`);
    }

    // Extract videos
    try {
      const videoElements = this.findElementsWithSelectors(
        TwitterSelectors.tweet.media.videos,
        element
      ) as HTMLVideoElement[];

      for (const video of videoElements) {
        if (video.src || video.poster) {
          media.videos.push({
            url: video.src || video.poster || '',
            type: 'video',
            poster: video.poster || undefined
          });
        }
      }
      if (media.videos.length > 0) {
        usedSelectors.push('media.videos');
      }
    } catch (error) {
      errors.push(`Video extraction failed: ${error}`);
    }

    // Extract GIFs
    try {
      const gifElements = this.findElementsWithSelectors(
        TwitterSelectors.tweet.media.gifs,
        element
      ) as HTMLVideoElement[];

      for (const gif of gifElements) {
        if (gif.src) {
          media.videos.push({
            url: gif.src,
            type: 'gif'
          });
        }
      }
      if (gifElements.length > 0) {
        usedSelectors.push('media.gifs');
      }
    } catch (error) {
      errors.push(`GIF extraction failed: ${error}`);
    }

    return media;
  }

  /**
   * Extract quoted tweet if present
   */
  private async extractQuotedTweet(
    element: Element,
    usedSelectors: string[],
    errors: string[]
  ): Promise<TwitterContent | undefined> {
    try {
      const quotedTweetElement = this.findElementWithSelectors(
        TwitterSelectors.tweet.quoteTweet,
        element
      );

      if (quotedTweetElement && this.validateTweetElement(quotedTweetElement)) {
        usedSelectors.push('quotedTweet');
        return await this.extractTweetFromElement(quotedTweetElement);
      }
    } catch (error) {
      errors.push(`Quoted tweet extraction failed: ${error}`);
    }

    return undefined;
  }

  /**
   * Extract full Twitter thread starting from current tweet
   */
  private async extractFullThread(): Promise<TwitterThread> {
    const startTime = performance.now();
    const errors: string[] = [];
    const extractedTweets: TwitterContent[] = [];

    try {
      // Check if we're already extracting a thread to prevent duplicates
      if (this.threadExtractionState.isExtractingThread) {
        throw new Error('Thread extraction already in progress');
      }

      this.threadExtractionState.isExtractingThread = true;

      // Find the main tweet element
      const mainTweetElement = await this.findTweetElement();
      if (!mainTweetElement) {
        throw new Error('Could not find main tweet element for thread extraction');
      }

      // Extract the original tweet
      const originalTweet = await this.extractTweetFromElement(mainTweetElement);
      extractedTweets.push(originalTweet);

      // Look for thread continuation indicators
      const threadIndicators = this.findThreadIndicators();

      if (threadIndicators.hasThread) {
        // Extract thread tweets using progressive loading
        const threadTweets = await this.extractThreadTweets(threadIndicators);
        extractedTweets.push(...threadTweets);
      }

      // Look for replies if this is a conversation
      const replies = await this.extractReplies();
      extractedTweets.push(...replies);

      const totalTime = performance.now() - startTime;

      return {
        tweets: extractedTweets,
        originalTweet: extractedTweets[0],
        totalTweets: extractedTweets.length,
        isComplete: true, // We'll implement completeness detection
        extractionMetadata: {
          extractedAt: Date.now(),
          timeSpent: totalTime,
          errors
        }
      };

    } catch (error) {
      errors.push(`Thread extraction failed: ${error}`);
      throw error;
    } finally {
      this.threadExtractionState.isExtractingThread = false;
    }
  }

  /**
   * Find thread indicators in the current page
   */
  private findThreadIndicators(): {
    hasThread: boolean;
    showMoreButton?: Element;
    threadContainer?: Element;
    threadCount?: number;
  } {
    const indicators = {
      hasThread: false,
      showMoreButton: undefined as Element | undefined,
      threadContainer: undefined as Element | undefined,
      threadCount: undefined as number | undefined
    };

    // Look for "Show this thread" button
    const showMoreButton = this.findElementWithSelectors(TwitterSelectors.thread.showMoreButton);
    if (showMoreButton) {
      indicators.hasThread = true;
      indicators.showMoreButton = showMoreButton;
    }

    // Look for thread container
    const threadContainer = this.findElementWithSelectors(TwitterSelectors.thread.conversationThread);
    if (threadContainer) {
      indicators.hasThread = true;
      indicators.threadContainer = threadContainer;

      // Count tweets in thread
      const tweetElements = this.findElementsWithSelectors(TwitterSelectors.tweet.container, threadContainer);
      indicators.threadCount = tweetElements.length;
    }

    // Look for numeric thread indicators (1/n, 2/n, etc.)
    const tweetText = document.body.textContent || '';
    const threadPattern = /(\d+)\/(\d+)/g;
    const threadMatch = threadPattern.exec(tweetText);
    if (threadMatch) {
      indicators.hasThread = true;
      indicators.threadCount = parseInt(threadMatch[2]);
    }

    return indicators;
  }

  /**
   * Extract tweets from a thread using progressive loading
   */
  private async extractThreadTweets(indicators: ReturnType<typeof this.findThreadIndicators>): Promise<TwitterContent[]> {
    const threadTweets: TwitterContent[] = [];

    try {
      // If there's a "Show more" button, click it to load more content
      if (indicators.showMoreButton) {
        await this.clickShowMoreButton(indicators.showMoreButton);
        await this.waitForDynamicContent();
      }

      // Find all tweet elements in the thread
      const container = indicators.threadContainer || document;
      const tweetElements = this.findElementsWithSelectors(TwitterSelectors.tweet.container, container);

      // Extract each tweet, skipping the original one
      for (let i = 1; i < tweetElements.length; i++) {
        try {
          const tweetContent = await this.extractTweetFromElement(tweetElements[i]);
          tweetContent.threadContext = {
            isPartOfThread: true,
            threadPosition: i + 1,
            threadLength: indicators.threadCount || tweetElements.length
          };
          threadTweets.push(tweetContent);

          // Apply rate limiting between thread tweet extractions
          await this.applyRateLimit('betweenTweets');
        } catch (error) {
          console.warn(`Failed to extract thread tweet ${i}:`, error);
          // Continue with other tweets
        }
      }

    } catch (error) {
      console.error('Thread tweets extraction failed:', error);
    }

    return threadTweets;
  }

  /**
   * Extract replies to the current tweet
   */
  private async extractReplies(): Promise<TwitterContent[]> {
    const replies: TwitterContent[] = [];

    try {
      // Look for "Show replies" button
      const showRepliesButton = this.findElementWithSelectors(TwitterSelectors.thread.showRepliesButton);
      if (showRepliesButton) {
        await this.clickShowMoreButton(showRepliesButton);
        await this.waitForDynamicContent();
      }

      // Find reply elements
      const replyElements = document.querySelectorAll('[data-testid="tweet"][data-testid*="reply"], article[role="article"]:not(:first-child)');

      for (const replyElement of replyElements) {
        try {
          if (this.validateTweetElement(replyElement)) {
            const replyContent = await this.extractTweetFromElement(replyElement);
            replyContent.type = 'reply';
            replies.push(replyContent);

            await this.applyRateLimit('betweenTweets');
          }
        } catch (error) {
          console.warn('Failed to extract reply:', error);
        }
      }

    } catch (error) {
      console.error('Reply extraction failed:', error);
    }

    return replies;
  }

  /**
   * Click "Show more" button and handle potential errors
   */
  private async clickShowMoreButton(button: Element): Promise<void> {
    try {
      // Scroll button into view
      button.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Wait a bit for scroll to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Click the button
      if (button instanceof HTMLElement) {
        button.click();
      } else {
        // Fallback: dispatch click event
        button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }

      // Wait for content to load
      await this.waitForDynamicContent();

    } catch (error) {
      console.warn('Failed to click show more button:', error);
    }
  }

  /**
   * Wait for dynamic content to load
   */
  private async waitForDynamicContent(timeout: number = 3000): Promise<void> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let loadingDetected = false;

      const checkLoading = () => {
        // Check for loading indicators
        const loadingElement = this.findElementWithSelectors(TwitterSelectors.loading.spinner);

        if (loadingElement) {
          loadingDetected = true;
          // Wait for loading to complete
          setTimeout(checkLoading, 200);
        } else if (loadingDetected) {
          // Loading was detected and now it's gone
          resolve();
        } else if (Date.now() - startTime > timeout) {
          // Timeout reached
          resolve();
        } else {
          // Keep checking
          setTimeout(checkLoading, 200);
        }
      };

      checkLoading();
    });
  }

  /**
   * Analyze if tweet is part of a thread
   */
  private async analyzeThreadContext(element: Element): Promise<{
    isPartOfThread: boolean;
    threadPosition?: number;
    threadLength?: number;
  }> {
    try {
      // Check for thread indicators around the tweet
      const tweetText = element.textContent || '';

      // Look for numbered thread pattern (1/5, 2/5, etc.)
      const threadPattern = /(\d+)\/(\d+)/;
      const threadMatch = tweetText.match(threadPattern);

      if (threadMatch) {
        return {
          isPartOfThread: true,
          threadPosition: parseInt(threadMatch[1]),
          threadLength: parseInt(threadMatch[2])
        };
      }

      // Check if there are multiple tweet elements in succession (thread pattern)
      const parentContainer = element.closest('[data-testid="cellInnerDiv"], article')?.parentElement;
      if (parentContainer) {
        const siblingTweets = this.findElementsWithSelectors(TwitterSelectors.tweet.container, parentContainer);
        if (siblingTweets.length > 1) {
          const currentIndex = Array.from(siblingTweets).indexOf(element as Element);
          if (currentIndex >= 0) {
            return {
              isPartOfThread: true,
              threadPosition: currentIndex + 1,
              threadLength: siblingTweets.length
            };
          }
        }
      }

      // Check for "Show this thread" or similar indicators
      const hasThreadIndicator = this.findElementWithSelectors(TwitterSelectors.thread.showMoreButton, element.parentElement || document);

      return {
        isPartOfThread: !!hasThreadIndicator
      };

    } catch (error) {
      console.warn('Thread context analysis failed:', error);
      return {
        isPartOfThread: false
      };
    }
  }

  // Helper methods

  /**
   * Find element using multiple selectors with fallbacks
   */
  private findElementWithSelectors(
    selectors: readonly string[],
    container: Element | Document = document
  ): Element | null {
    for (const selector of selectors) {
      try {
        const element = container.querySelector(selector);
        if (element) return element;
      } catch (error) {
        // Invalid selector, continue to next one
        continue;
      }
    }
    return null;
  }

  /**
   * Find multiple elements using selectors
   */
  private findElementsWithSelectors(
    selectors: readonly string[],
    container: Element | Document = document
  ): Element[] {
    const elements: Element[] = [];

    for (const selector of selectors) {
      try {
        const found = Array.from(container.querySelectorAll(selector));
        elements.push(...found);
      } catch (error) {
        // Invalid selector, continue to next one
        continue;
      }
    }

    // Remove duplicates
    return Array.from(new Set(elements));
  }

  /**
   * Find tweet by URL pattern matching
   */
  private findTweetByUrl(): Element | null {
    const url = window.location.href;
    const tweetIdMatch = url.match(/\/status\/(\d+)/);

    if (tweetIdMatch) {
      const tweetId = tweetIdMatch[1];
      // Try to find tweet with specific ID in href
      const tweetLink = document.querySelector(`a[href*="/status/${tweetId}"]`);
      if (tweetLink) {
        // Navigate up to find the tweet container
        let current = tweetLink.parentElement;
        while (current && current !== document.body) {
          if (current.querySelector('[data-testid="tweetText"]')) {
            return current;
          }
          current = current.parentElement;
        }
      }
    }

    return null;
  }

  /**
   * Detect Twitter-specific elements in document
   */
  private detectTwitterElements(document: Document): boolean {
    const detectionSelectors = [
      ...TwitterSelectors.platform.tweetElements,
      ...TwitterSelectors.platform.timelineElements
    ];

    for (const selector of detectionSelectors) {
      if (document.querySelector(selector)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detect tweet-specific elements
   */
  private detectTweetElements(document: Document): boolean {
    return this.findElementWithSelectors(TwitterSelectors.tweet.container, document) !== null;
  }

  /**
   * Validate tweet element
   */
  private validateTweetElement(element: Element): boolean {
    // Check if element has tweet text
    const hasText = this.findElementWithSelectors(TwitterSelectors.tweet.text, element) !== null;

    // Check if element has author info
    const hasAuthor = this.findElementWithSelectors(TwitterSelectors.tweet.author.name, element) !== null;

    return hasText || hasAuthor;
  }

  /**
   * Validate extracted tweet text
   */
  private validateTweetText(text: string): boolean {
    if (!text || text.length < TwitterValidation.minContentLength) {
      return false;
    }

    if (text.length > TwitterValidation.maxContentLength) {
      return false;
    }

    // Check for invalid content patterns
    for (const pattern of TwitterValidation.invalidContentIndicators) {
      if (pattern.test(text)) {
        return false;
      }
    }

    return TwitterValidation.validTweetPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Parse engagement numbers (handles K, M, B suffixes)
   */
  private parseEngagementNumber(text: string): number {
    const cleaned = text.replace(/[^\d.,KMB]/gi, '').trim();
    if (!cleaned) return 0;

    const number = parseFloat(cleaned.replace(/[KMB]/i, ''));
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
   * Calculate extraction confidence score
   */
  private calculateExtractionConfidence(data: {
    text: string;
    author: TwitterContent['author'];
    timestamp?: Date;
    engagement: TwitterContent['engagement'];
    media: TwitterContent['media'];
  }): number {
    let confidence = 0;

    // Text quality (40% weight)
    if (data.text && this.validateTweetText(data.text)) {
      confidence += 0.4;
    }

    // Author info (25% weight)
    if (data.author.name || data.author.username) {
      confidence += 0.25;
      if (data.author.name && data.author.username) {
        confidence += 0.1; // Bonus for complete author info
      }
    }

    // Timestamp (15% weight)
    if (data.timestamp) {
      confidence += 0.15;
    }

    // Engagement data (10% weight)
    const engagementCount = Object.keys(data.engagement).length;
    confidence += Math.min(0.1, engagementCount * 0.025);

    // Media content (10% weight)
    const mediaCount = data.media.images.length + data.media.videos.length;
    confidence += Math.min(0.1, mediaCount * 0.05);

    return Math.min(1, confidence);
  }

  /**
   * Apply rate limiting delay
   */
  private async applyRateLimit(operation: keyof typeof TwitterRateLimiting.extractionDelays): Promise<void> {
    const delay = getOperationDelay(operation);
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  /**
   * Setup mutation observer for dynamic content
   */
  private setupMutationObserver(): void {
    if (typeof MutationObserver === 'undefined') return;

    try {
      // Find the main timeline container or use body as fallback
      const targetElement = this.findElementWithSelectors([
        '[data-testid="primaryColumn"]',
        '[data-testid="timeline"]',
        'main[role="main"]',
        'body'
      ]) || document.body;

      const observer = new MutationObserver((mutations) => {
        this.handleMutations(mutations);
      });

      // Configure observer to watch for:
      // - New child elements (new tweets)
      // - Attribute changes (state updates)
      // - Subtree changes (nested content)
      observer.observe(targetElement, {
        childList: true,        // Watch for added/removed children
        subtree: true,          // Watch entire subtree
        attributes: true,       // Watch for attribute changes
        attributeFilter: [      // Only watch relevant attributes
          'data-testid',
          'aria-expanded',
          'aria-hidden',
          'style'
        ],
        attributeOldValue: true // Keep track of old attribute values
      });

      // Store observer reference for cleanup
      (this as any).mutationObserver = observer;

      console.debug('TwitterExtractor: MutationObserver setup complete');

    } catch (error) {
      console.error('Failed to setup MutationObserver:', error);
    }
  }

  /**
   * Handle mutations detected by MutationObserver
   */
  private handleMutations(mutations: MutationRecord[]): void {
    try {
      let newContentDetected = false;
      let threadContentChanged = false;

      for (const mutation of mutations) {
        switch (mutation.type) {
          case 'childList':
            // New tweets or content added
            if (this.hasNewTweetContent(mutation)) {
              newContentDetected = true;
            }
            if (this.hasThreadContentChanged(mutation)) {
              threadContentChanged = true;
            }
            break;

          case 'attributes':
            // State changes (expanded threads, loaded content)
            if (this.isRelevantAttributeChange(mutation)) {
              newContentDetected = true;
            }
            break;
        }
      }

      // Debounce handling to avoid excessive processing
      if (newContentDetected || threadContentChanged) {
        this.debouncedHandleNewContent();
      }

    } catch (error) {
      console.error('Error handling mutations:', error);
    }
  }

  /**
   * Check if mutation contains new tweet content
   */
  private hasNewTweetContent(mutation: MutationRecord): boolean {
    for (const addedNode of mutation.addedNodes) {
      if (addedNode.nodeType === Node.ELEMENT_NODE) {
        const element = addedNode as Element;

        // Check if it's a tweet element or contains tweet elements
        if (this.validateTweetElement(element) ||
            element.querySelector?.('[data-testid="tweet"]')) {
          return true;
        }

        // Check for thread containers
        if (element.matches?.('[data-testid*="thread"], [aria-label*="thread"]')) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check if thread content has changed
   */
  private hasThreadContentChanged(mutation: MutationRecord): boolean {
    const target = mutation.target as Element;

    // Check if changes occurred in thread-related containers
    return target.closest('[data-testid*="thread"]') !== null ||
           target.closest('[aria-label*="conversation"]') !== null ||
           Array.from(mutation.addedNodes).some(node =>
             node.nodeType === Node.ELEMENT_NODE &&
             (node as Element).querySelector?.('[data-testid*="thread"]')
           );
  }

  /**
   * Check if attribute change is relevant for content extraction
   */
  private isRelevantAttributeChange(mutation: MutationRecord): boolean {
    const target = mutation.target as Element;
    const attributeName = mutation.attributeName;
    const oldValue = mutation.oldValue;
    const newValue = target.getAttribute(attributeName || '');

    // Detect state changes that indicate new content
    if (attributeName === 'aria-expanded' && oldValue === 'false' && newValue === 'true') {
      return true; // Something was expanded (thread, replies, etc.)
    }

    if (attributeName === 'aria-hidden' && oldValue === 'true' && newValue === 'false') {
      return true; // Something became visible
    }

    if (attributeName === 'style' && oldValue?.includes('display: none') && !newValue?.includes('display: none')) {
      return true; // Something became visible
    }

    return false;
  }

  /**
   * Debounced handler for new content detection
   */
  private debouncedHandleNewContent = (() => {
    let timeoutId: number | undefined;

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(() => {
        this.handleNewContentDetected();
      }, 500); // 500ms debounce
    };
  })();

  /**
   * Handle newly detected content
   */
  private handleNewContentDetected(): void {
    try {
      // Notify any listeners about new content
      this.dynamicContentListeners.forEach(listener => {
        try {
          listener();
        } catch (error) {
          console.warn('Dynamic content listener error:', error);
        }
      });

      // Update extraction state if needed
      if (this.threadExtractionState.isExtractingThread) {
        // New content during thread extraction - might need to re-evaluate
        this.invalidateThreadCache();
      }

    } catch (error) {
      console.error('Error handling new content:', error);
    }
  }

  /**
   * Setup infinite scroll detection
   */
  private setupInfiniteScrollDetection(): void {
    if (typeof IntersectionObserver === 'undefined') return;

    try {
      // Create sentinel elements to detect when user scrolls near the end
      const sentinel = document.createElement('div');
      sentinel.style.height = '1px';
      sentinel.style.position = 'absolute';
      sentinel.style.bottom = '100px';
      sentinel.style.width = '100%';
      sentinel.setAttribute('data-scroll-sentinel', 'true');

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.handleScrollNearEnd();
          }
        });
      }, {
        rootMargin: '100px' // Trigger when 100px from the sentinel
      });

      // Add sentinel to the page
      const timeline = this.findElementWithSelectors([
        '[data-testid="primaryColumn"]',
        '[data-testid="timeline"]',
        'main[role="main"]'
      ]);

      if (timeline) {
        timeline.appendChild(sentinel);
        observer.observe(sentinel);
      }

    } catch (error) {
      console.error('Failed to setup infinite scroll detection:', error);
    }
  }

  /**
   * Handle scroll near end detection
   */
  private handleScrollNearEnd(): void {
    // This can be used to prepare for loading more content
    // or to trigger proactive content extraction
    const currentScrollPosition = window.scrollY;

    if (currentScrollPosition > this.threadExtractionState.lastScrollPosition) {
      this.threadExtractionState.lastScrollPosition = currentScrollPosition;

      // Trigger pre-loading of visible content
      this.preloadVisibleContent();
    }
  }

  /**
   * Preload content that's currently visible
   */
  private async preloadVisibleContent(): Promise<void> {
    try {
      // Find tweets currently in viewport
      const visibleTweets = this.findVisibleTweets();

      // Extract and cache visible tweets that aren't already cached
      for (const tweetElement of visibleTweets) {
        try {
          if (this.validateTweetElement(tweetElement)) {
            const tweetContent = await this.extractTweetFromElement(tweetElement);

            // Cache with URL-based key
            const tweetUrl = this.extractTweetUrl(tweetElement);
            if (tweetUrl) {
              this.cacheContent(tweetUrl, tweetContent);
            }
          }
        } catch (error) {
          // Continue with other tweets
          console.debug('Preload extraction failed for tweet:', error);
        }
      }

    } catch (error) {
      console.error('Preload visible content failed:', error);
    }
  }

  /**
   * Find tweets currently visible in the viewport
   */
  private findVisibleTweets(): Element[] {
    const tweetElements = this.findElementsWithSelectors(TwitterSelectors.tweet.container);
    const visibleTweets: Element[] = [];

    for (const tweet of tweetElements) {
      const rect = tweet.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight && rect.bottom > 0;

      if (isVisible) {
        visibleTweets.push(tweet);
      }
    }

    return visibleTweets;
  }

  /**
   * Extract tweet URL from element
   */
  private extractTweetUrl(element: Element): string | null {
    try {
      // Look for timestamp link which usually contains the tweet URL
      const timestampLink = this.findElementWithSelectors(TwitterSelectors.tweet.timestamp, element) as HTMLAnchorElement;
      if (timestampLink?.href) {
        return timestampLink.href;
      }

      // Fallback: look for any link containing status
      const statusLink = element.querySelector('a[href*="/status/"]') as HTMLAnchorElement;
      if (statusLink?.href) {
        return statusLink.href;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Invalidate thread cache when content changes
   */
  private invalidateThreadCache(): void {
    // Clear thread-specific cache entries
    for (const [key] of this.cache.entries()) {
      if (key.includes(this.threadExtractionState.currentThreadId)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Add listener for dynamic content changes
   */
  public addDynamicContentListener(listener: () => void): void {
    this.dynamicContentListeners.add(listener);
  }

  /**
   * Remove dynamic content listener
   */
  public removeDynamicContentListener(listener: () => void): void {
    this.dynamicContentListeners.delete(listener);
  }

  /**
   * Setup cache cleanup
   */
  private setupCacheCleanup(): void {
    setInterval(() => {
      this.cleanupCache();
    }, 60000); // Cleanup every minute
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    const expireTime = TwitterRateLimiting.cacheConfig.tweetCacheDuration;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > expireTime) {
        this.cache.delete(key);
      }
    }

    // Limit cache size
    if (this.cache.size > TwitterRateLimiting.cacheConfig.maxCacheSize) {
      const entries = Array.from(this.cache.entries());
      const sorted = entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = sorted.slice(0, this.cache.size - TwitterRateLimiting.cacheConfig.maxCacheSize);

      for (const [key] of toRemove) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cached content
   */
  private getCachedContent(url: string): TwitterContent | TwitterThread | null {
    const entry = this.cache.get(url);
    if (!entry) return null;

    const now = Date.now();
    const maxAge = TwitterRateLimiting.cacheConfig.tweetCacheDuration;

    if (now - entry.timestamp > maxAge) {
      this.cache.delete(url);
      return null;
    }

    return entry.data;
  }

  /**
   * Cache content
   */
  private cacheContent(url: string, content: TwitterContent | TwitterThread): void {
    this.cache.set(url, {
      data: content,
      timestamp: Date.now(),
      url
    });
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(startTime: number): void {
    const extractionTime = performance.now() - startTime;
    this.performanceMetrics.extractionCount++;
    this.performanceMetrics.averageTime =
      (this.performanceMetrics.averageTime * (this.performanceMetrics.extractionCount - 1) + extractionTime)
      / this.performanceMetrics.extractionCount;
    this.performanceMetrics.lastExtraction = Date.now();
  }

  /**
   * Convert TwitterContent to ContentAnalysis format
   */
  private convertToContentAnalysis(content: TwitterContent | TwitterThread): ContentAnalysis {
    const twitterContent = 'tweets' in content ? content.tweets[0] : content;

    return {
      url: window.location.href,
      title: `Tweet by ${twitterContent.author.name || twitterContent.author.username || 'Unknown'}`,
      content: twitterContent.text,
      type: 'social-post',
      platform: 'twitter' as SocialPlatform,
      analysis: {
        domain: window.location.hostname,
        credibility: {
          score: Math.round(twitterContent.extractionMetadata.confidence * 100),
          level: twitterContent.extractionMetadata.confidence >= 0.8 ? 'high' :
                 twitterContent.extractionMetadata.confidence >= 0.6 ? 'medium' : 'low',
          confidence: twitterContent.extractionMetadata.confidence,
          reasoning: `Twitter content extracted with ${twitterContent.extractionMetadata.selectors.length} selectors`,
          source: 'ai',
          timestamp: Date.now(),
        },
        details: {
          twitterData: twitterContent,
          performanceMetrics: this.performanceMetrics,
          extractionMethod: 'TwitterExtractor2025'
        } as any
      },
    };
  }

  /**
   * Create error analysis
   */
  private createErrorAnalysis(error: any): ContentAnalysis {
    return {
      url: window.location.href,
      title: 'Twitter Extraction Error',
      content: '',
      type: 'social-post',
      platform: 'twitter' as SocialPlatform,
      analysis: {
        domain: window.location.hostname,
        credibility: {
          score: 0,
          level: 'unknown',
          confidence: 0,
          reasoning: `Twitter extraction failed: ${error.message}`,
          source: 'fallback',
          timestamp: Date.now(),
        },
      },
    };
  }

  /**
   * Get extraction performance metrics
   */
  public getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  /**
   * Get cache statistics
   */
  public getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: TwitterRateLimiting.cacheConfig.maxCacheSize,
      entries: Array.from(this.cache.keys())
    };
  }
}
