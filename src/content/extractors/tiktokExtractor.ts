/**
 * TikTok Content Extractor - 2025
 *
 * Specialized content extractor for TikTok that captures video descriptions,
 * hashtags, comments, and engagement metrics while respecting platform policies
 * and implementing sophisticated rate limiting.
 *
 * Based on 2025 best practices for TikTok content extraction.
 */

import { ContentAnalysis, SocialPlatform } from '@shared/types';
import { IExtractor } from './contentExtractor';
import {
  TikTokSelectors,
  TikTokFallbackSelectors,
  TikTokRateLimiting,
  TikTokValidation,
  isTikTokUrl,
  isTikTokVideoUrl,
  getTikTokOperationDelay,
  extractTikTokVideoId,
  extractTikTokUsername
} from './config/tiktokSelectors';
import { parseEngagementNumber } from '@shared/utils/engagementParser';
import { parseRelativeTime } from '@shared/utils/dateParser';
import { parseSocialText } from '@shared/utils/socialTextParser';
import { sanitizeUsername } from '@shared/utils/textCleaner';

/**
 * Raw TikTok JSON data structure
 */
interface TikTokRawVideoData {
  id?: string;
  desc?: string;
  createTime?: number;
  author?: {
    uniqueId?: string;
    nickname?: string;
    avatarMedium?: string;
  };
  stats?: {
    diggCount?: number;
    commentCount?: number;
    shareCount?: number;
    playCount?: number;
  };
  music?: {
    title?: string;
    authorName?: string;
  };
}

/**
 * TikTok-specific content types
 */
export interface TikTokContent {
  type: 'video' | 'profile' | 'hashtag';
  id?: string;
  description: string;
  author: {
    username?: string;
    displayName?: string;
    avatarUrl?: string;
  };
  timestamp?: Date;
  engagement: {
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
    bookmarks?: number;
  };
  music?: {
    title?: string;
    author?: string;
  };
  hashtags: string[];
  mentions: string[];
  videoMetadata?: {
    duration?: number;
    resolution?: string;
    format?: string;
  };
  extractionMetadata: {
    extractedAt: number;
    confidence: number;
    selectors: string[];
    errors: string[];
    source: 'dom' | 'json' | 'hybrid';
  };
}

/**
 * Comment extraction result
 */
export interface TikTokComment {
  id?: string;
  text: string;
  author: {
    username?: string;
    displayName?: string;
  };
  timestamp?: Date;
  likes?: number;
  replies?: TikTokComment[];
  parentId?: string;
}

/**
 * Comment collection result
 */
export interface TikTokComments {
  comments: TikTokComment[];
  totalCount: number;
  hasMore: boolean;
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
 * TikTokExtractor class implementing IExtractor interface
 * Provides comprehensive TikTok content extraction with 2025 best practices
 */
export class TikTokExtractor implements IExtractor {
  private readonly cache = new Map<string, CacheEntry<TikTokContent | TikTokComments>>();
  private readonly performanceMetrics = {
    extractionCount: 0,
    averageTime: 0,
    errorCount: 0,
    lastExtraction: 0
  };
  private isExtracting = false;
  private dynamicContentListeners = new Set<() => void>();
  private commentExtractionState = {
    isExtractingComments: false,
    currentVideoId: '',
    extractedComments: new Map<string, TikTokComment>(),
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
      // Check if URL is TikTok
      if (!isTikTokUrl(url)) {
        return false;
      }

      // Verify TikTok elements are present in DOM
      const hasTikTokElements = this.detectTikTokElements(document);
      if (!hasTikTokElements) {
        return false;
      }

      // Additional validation for video-specific content
      if (isTikTokVideoUrl(url)) {
        const hasVideoElements = this.detectVideoElements(document);
        return hasVideoElements;
      }

      return true;
    } catch (error) {
      console.error('TikTokExtractor.canHandle failed:', error);
      return false;
    }
  }

  /**
   * Extract content from the current TikTok page
   */
  async extractPageContent(): Promise<ContentAnalysis> {
    const startTime = performance.now();

    try {
      // Prevent concurrent extractions
      if (this.isExtracting) {
        console.debug('TikTokExtractor: Extraction already in progress, using cache if available');
        const cached = this.getCachedContent(window.location.href);
        if (cached) {
          return this.convertToContentAnalysis(cached);
        }
      }

      this.isExtracting = true;

      // Determine content type and extract accordingly
      const url = window.location.href;

      if (isTikTokVideoUrl(url)) {
        // Extract individual video content
        const content = await this.extractVideoContent();
        this.updatePerformanceMetrics(startTime);
        return this.convertToContentAnalysis(content);
      } else {
        // Extract profile or other page content
        const content = await this.extractProfileContent();
        this.updatePerformanceMetrics(startTime);
        return this.convertToContentAnalysis(content);
      }

    } catch (error) {
      console.error('TikTokExtractor.extractPageContent failed:', error);
      this.performanceMetrics.errorCount++;
      return this.createErrorAnalysis(error);
    } finally {
      this.isExtracting = false;
    }
  }

  /**
   * Extract content from a specific video page
   */
  private async extractVideoContent(): Promise<TikTokContent> {
    const url = window.location.href;

    // Check cache first
    const cached = this.getCachedContent(url);
    if (cached && 'description' in cached) {
      return cached;
    }

    // Try hidden JSON data first (most reliable)
    let videoContent = await this.extractFromHiddenJSON();

    // Fallback to DOM extraction if JSON fails
    if (!videoContent || !this.validateExtractedContent(videoContent)) {
      videoContent = await this.extractFromDOM();
    }

    // Cache the result
    this.cacheContent(url, videoContent);

    return videoContent;
  }

  /**
   * Extract content from profile or other pages
   */
  private async extractProfileContent(): Promise<TikTokContent> {
    // For profile content, extract the first visible video as primary content
    const videoElements = await this.findVideoElements();

    if (videoElements.length === 0) {
      throw new Error('No videos found on profile page');
    }

    // Extract the first video as primary content
    const primaryVideo = await this.extractVideoFromElement(videoElements[0]);

    // Add context about being from profile
    primaryVideo.extractionMetadata.selectors.push('profile-extraction');

    return primaryVideo;
  }

  /**
   * Extract video content from hidden JSON data (most reliable method)
   */
  private async extractFromHiddenJSON(): Promise<TikTokContent | null> {
    const errors: string[] = [];
    const usedSelectors: string[] = [];

    try {
      // Look for the universal data script tag
      const scriptElement = document.querySelector(TikTokSelectors.hiddenData.scriptTag);
      if (!scriptElement?.textContent) {
        // Try alternative script tag
        const nextDataScript = document.querySelector(TikTokSelectors.hiddenData.nextDataScript);
        if (!nextDataScript?.textContent) {
          errors.push('No hidden JSON data found');
          return null;
        }
        usedSelectors.push('nextData');
      } else {
        usedSelectors.push('universalData');
      }

      const jsonData = JSON.parse(scriptElement?.textContent || '{}');

      // Navigate through the JSON structure to find video data
      const videoData = this.extractVideoDataFromJSON(jsonData);
      if (!videoData) {
        errors.push('No video data found in JSON');
        return null;
      }

      // Build TikTokContent from JSON data
      const content: TikTokContent = {
        type: 'video',
        id: videoData.id || extractTikTokVideoId(window.location.href) || undefined,
        description: videoData.desc || '',
        author: {
          username: videoData.author?.uniqueId,
          displayName: videoData.author?.nickname,
          avatarUrl: videoData.author?.avatarMedium
        },
        timestamp: videoData.createTime ? new Date(videoData.createTime * 1000) : undefined,
        engagement: {
          likes: videoData.stats?.diggCount,
          comments: videoData.stats?.commentCount,
          shares: videoData.stats?.shareCount,
          views: videoData.stats?.playCount
        },
        music: {
          title: videoData.music?.title,
          author: videoData.music?.authorName
        },
        hashtags: this.extractHashtagsFromText(videoData.desc || ''),
        mentions: this.extractMentionsFromText(videoData.desc || ''),
        extractionMetadata: {
          extractedAt: Date.now(),
          confidence: 0.95, // JSON data is highly reliable
          selectors: usedSelectors,
          errors,
          source: 'json'
        }
      };

      return content;

    } catch (error) {
      errors.push(`JSON extraction failed: ${error}`);
      console.debug('TikTokExtractor: JSON extraction failed, falling back to DOM');
      return null;
    }
  }

  /**
   * Extract video content from DOM elements (fallback method)
   */
  private async extractFromDOM(): Promise<TikTokContent> {
    const errors: string[] = [];
    const usedSelectors: string[] = [];

    try {
      // Find main video container
      const videoElement = await this.findVideoElement();
      if (!videoElement) {
        throw new Error('Could not find video element on page');
      }

      // Extract video data from DOM
      const videoContent = await this.extractVideoFromElement(videoElement, usedSelectors, errors);

      // Apply rate limiting delay
      await this.applyRateLimit('betweenVideos');

      return videoContent;

    } catch (error) {
      errors.push(`DOM extraction failed: ${error}`);
      throw new Error(`Failed to extract video from DOM: ${error}`);
    }
  }

  /**
   * Find the main video element on a video page
   */
  private async findVideoElement(): Promise<Element | null> {
    // Try multiple strategies to find the video element
    const strategies = [
      () => this.findElementWithSelectors(TikTokSelectors.video.container),
      () => this.findVideoByUrl(),
      () => this.findElementWithSelectors(TikTokFallbackSelectors.video.containers)
    ];

    for (const strategy of strategies) {
      const element = await strategy();
      if (element && this.validateVideoElement(element)) {
        return element;
      }
    }

    return null;
  }

  /**
   * Find multiple video elements on profile pages
   */
  private async findVideoElements(): Promise<Element[]> {
    const elements = this.findElementsWithSelectors(TikTokSelectors.video.container);
    return elements.filter(el => this.validateVideoElement(el));
  }

  /**
   * Extract comprehensive data from a video element
   */
  private async extractVideoFromElement(
    element: Element,
    usedSelectors: string[] = [],
    errors: string[] = []
  ): Promise<TikTokContent> {
    try {
      // Extract description
      const description = await this.extractVideoDescription(element, usedSelectors, errors);

      // Extract author information
      const author = await this.extractAuthorInfo(element, usedSelectors, errors);

      // Extract timestamp
      const timestamp = await this.extractTimestamp(element, usedSelectors, errors);

      // Extract engagement metrics
      const engagement = await this.extractEngagement(element, usedSelectors, errors);

      // Extract music information
      const music = await this.extractMusicInfo(element, usedSelectors, errors);

      // Extract hashtags and mentions
      const hashtags = this.extractHashtagsFromText(description);
      const mentions = this.extractMentionsFromText(description);

      // Calculate confidence based on extracted data quality
      const confidence = this.calculateExtractionConfidence({
        description, author, timestamp, engagement, music
      });

      const videoContent: TikTokContent = {
        type: 'video',
        id: extractTikTokVideoId(window.location.href) || undefined,
        description,
        author,
        timestamp,
        engagement,
        music,
        hashtags,
        mentions,
        extractionMetadata: {
          extractedAt: Date.now(),
          confidence,
          selectors: usedSelectors,
          errors,
          source: 'dom'
        }
      };

      return videoContent;

    } catch (error) {
      errors.push(`Video extraction failed: ${error}`);
      throw new Error(`Failed to extract video: ${error}`);
    }
  }

  /**
   * Extract video description using multiple selector strategies
   */
  private async extractVideoDescription(
    element: Element,
    usedSelectors: string[],
    errors: string[]
  ): Promise<string> {
    const descSelectors = TikTokSelectors.video.description;

    for (const selector of descSelectors) {
      try {
        const descElement = element.querySelector(selector);
        if (descElement?.textContent) {
          const description = descElement.textContent.trim();
          if (this.validateVideoDescription(description)) {
            usedSelectors.push(`description:${selector}`);
            return description;
          }
        }
      } catch (error) {
        errors.push(`Description selector failed: ${selector} - ${error}`);
      }
    }

    // Fallback: try to get any text content from the element
    const fallbackDesc = element.textContent?.trim() || '';
    if (this.validateVideoDescription(fallbackDesc)) {
      usedSelectors.push('description:fallback');
      return fallbackDesc;
    }

    errors.push('No valid video description found');
    return '';
  }

  /**
   * Extract author information
   */
  private async extractAuthorInfo(
    element: Element,
    usedSelectors: string[],
    errors: string[]
  ): Promise<TikTokContent['author']> {
    const author: TikTokContent['author'] = {};

    // Extract username
    try {
      const usernameElement = this.findElementWithSelectors(
        TikTokSelectors.video.author.username,
        element
      );
      if (usernameElement) {
        const href = usernameElement.getAttribute('href');
        if (href) {
          const username = extractTikTokUsername(href);
          if (username) {
            author.username = username;
            usedSelectors.push('author.username');
          }
        } else if (usernameElement.textContent) {
          author.username = sanitizeUsername(usernameElement.textContent.trim());
          usedSelectors.push('author.username');
        }
      }
    } catch (error) {
      errors.push(`Author username extraction failed: ${error}`);
    }

    // Extract display name
    try {
      const nameElement = this.findElementWithSelectors(
        TikTokSelectors.video.author.displayName,
        element
      );
      if (nameElement?.textContent) {
        author.displayName = nameElement.textContent.trim();
        usedSelectors.push('author.displayName');
      }
    } catch (error) {
      errors.push(`Author display name extraction failed: ${error}`);
    }

    // Extract avatar URL
    try {
      const avatarElement = this.findElementWithSelectors(
        TikTokSelectors.video.author.avatar,
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
        TikTokSelectors.video.timestamp,
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

        // Try parsing text content as relative time
        const timeText = timeElement.textContent?.trim();
        if (timeText) {
          const parsedDate = this.parseRelativeTime(timeText);
          if (parsedDate) {
            usedSelectors.push('timestamp:relative');
            return parsedDate;
          }
        }
      }
    } catch (error) {
      errors.push(`Timestamp extraction failed: ${error}`);
    }

    return undefined;
  }

  /**
   * Extract engagement metrics
   */
  private async extractEngagement(
    element: Element,
    usedSelectors: string[],
    errors: string[]
  ): Promise<TikTokContent['engagement']> {
    const engagement: TikTokContent['engagement'] = {};

    // Extract likes count
    try {
      const likesElement = this.findElementWithSelectors(
        TikTokSelectors.video.engagement.likes,
        element
      );
      if (likesElement?.textContent) {
        engagement.likes = this.parseEngagementNumber(likesElement.textContent);
        usedSelectors.push('engagement.likes');
      }
    } catch (error) {
      errors.push(`Likes count extraction failed: ${error}`);
    }

    // Extract comments count
    try {
      const commentsElement = this.findElementWithSelectors(
        TikTokSelectors.video.engagement.comments,
        element
      );
      if (commentsElement?.textContent) {
        engagement.comments = this.parseEngagementNumber(commentsElement.textContent);
        usedSelectors.push('engagement.comments');
      }
    } catch (error) {
      errors.push(`Comments count extraction failed: ${error}`);
    }

    // Extract shares count
    try {
      const sharesElement = this.findElementWithSelectors(
        TikTokSelectors.video.engagement.shares,
        element
      );
      if (sharesElement?.textContent) {
        engagement.shares = this.parseEngagementNumber(sharesElement.textContent);
        usedSelectors.push('engagement.shares');
      }
    } catch (error) {
      errors.push(`Shares count extraction failed: ${error}`);
    }

    // Extract views count
    try {
      const viewsElement = this.findElementWithSelectors(
        TikTokSelectors.video.engagement.views,
        element
      );
      if (viewsElement?.textContent) {
        engagement.views = this.parseEngagementNumber(viewsElement.textContent);
        usedSelectors.push('engagement.views');
      }
    } catch {
      // Views are optional, don't add to errors
    }

    // Extract bookmarks count
    try {
      const bookmarksElement = this.findElementWithSelectors(
        TikTokSelectors.video.engagement.bookmarks,
        element
      );
      if (bookmarksElement?.textContent) {
        engagement.bookmarks = this.parseEngagementNumber(bookmarksElement.textContent);
        usedSelectors.push('engagement.bookmarks');
      }
    } catch {
      // Bookmarks are optional, don't add to errors
    }

    return engagement;
  }

  /**
   * Extract music information
   */
  private async extractMusicInfo(
    element: Element,
    usedSelectors: string[],
    errors: string[]
  ): Promise<TikTokContent['music'] | undefined> {
    const music: TikTokContent['music'] = {};

    // Extract music title
    try {
      const musicTitleElement = this.findElementWithSelectors(
        TikTokSelectors.video.music.title,
        element
      );
      if (musicTitleElement?.textContent) {
        music.title = musicTitleElement.textContent.trim();
        usedSelectors.push('music.title');
      }
    } catch (error) {
      errors.push(`Music title extraction failed: ${error}`);
    }

    // Extract music author
    try {
      const musicAuthorElement = this.findElementWithSelectors(
        TikTokSelectors.video.music.author,
        element
      );
      if (musicAuthorElement?.textContent) {
        music.author = musicAuthorElement.textContent.trim();
        usedSelectors.push('music.author');
      }
    } catch (error) {
      errors.push(`Music author extraction failed: ${error}`);
    }

    return Object.keys(music).length > 0 ? music : undefined;
  }


  /**
   * Extract comments from a container element
   */
  private async extractCommentsFromContainer(container: Element): Promise<TikTokComment[]> {
    const comments: TikTokComment[] = [];
    const commentElements = this.findElementsWithSelectors(TikTokSelectors.comments.item, container);

    for (const commentElement of commentElements) {
      try {
        const comment = await this.extractCommentFromElement(commentElement);
        if (comment) {
          comments.push(comment);

          // Apply rate limiting between comments
          await this.applyRateLimit('betweenComments');
        }
      } catch (error) {
        console.warn('Failed to extract comment:', error);
      }
    }

    return comments;
  }

  /**
   * Extract individual comment from element
   */
  private async extractCommentFromElement(element: Element): Promise<TikTokComment | null> {
    try {
      const text = this.extractCommentText(element);
      if (!text) return null;

      const author = this.extractCommentAuthor(element);
      const timestamp = this.extractCommentTimestamp(element);
      const likes = this.extractCommentLikes(element);

      return {
        text,
        author,
        timestamp,
        likes
      };
    } catch (error) {
      console.error('Failed to extract comment from element:', error);
      return null;
    }
  }

  /**
   * Handle "Load more comments" pagination
   * @private - Currently unused but reserved for future comment pagination features
   */
   
  // @ts-ignore - Unused but reserved for future features
  private async loadMoreComments(container: Element, comments: TikTokComment[]): Promise<void> {
    const maxLoadAttempts = 5;
    let loadAttempts = 0;

    while (loadAttempts < maxLoadAttempts) {
      const loadMoreButton = this.findElementWithSelectors(TikTokSelectors.comments.loadMore, container);

      if (!loadMoreButton) {
        break; // No more comments to load
      }

      try {
        // Click load more button
        await this.clickLoadMoreButton(loadMoreButton);

        // Wait for new comments to load
        await this.waitForDynamicContent();

        // Extract newly loaded comments
        const newComments = await this.extractCommentsFromContainer(container);
        const uniqueNewComments = newComments.filter(newComment =>
          !comments.some(existing => existing.text === newComment.text)
        );

        if (uniqueNewComments.length === 0) {
          break; // No new comments loaded
        }

        comments.push(...uniqueNewComments);
        loadAttempts++;

        // Apply rate limiting between load attempts
        await this.applyRateLimit('buttonClick');

      } catch (error) {
        console.warn('Failed to load more comments:', error);
        break;
      }
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
      } catch {
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
      } catch {
        // Invalid selector, continue to next one
        continue;
      }
    }

    // Remove duplicates
    return Array.from(new Set(elements));
  }

  /**
   * Find video by URL pattern matching
   */
  private findVideoByUrl(): Element | null {
    const url = window.location.href;
    const videoId = extractTikTokVideoId(url);

    if (videoId) {
      // Try to find video with specific ID in href or data attributes
      const videoLink = document.querySelector(`a[href*="/video/${videoId}"]`);
      if (videoLink) {
        // Navigate up to find the video container
        let current = videoLink.parentElement;
        while (current && current !== document.body) {
          if (current.querySelector('[data-e2e*="video"]')) {
            return current;
          }
          current = current.parentElement;
        }
      }
    }

    return null;
  }

  /**
   * Detect TikTok-specific elements in document
   */
  private detectTikTokElements(document: Document): boolean {
    const detectionSelectors = [
      ...TikTokSelectors.platform.videoElements,
      ...TikTokSelectors.platform.pageElements
    ];

    for (const selector of detectionSelectors) {
      if (document.querySelector(selector)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detect video-specific elements
   */
  private detectVideoElements(document: Document): boolean {
    return this.findElementWithSelectors(TikTokSelectors.video.container, document) !== null;
  }

  /**
   * Validate video element
   */
  private validateVideoElement(element: Element): boolean {
    // Check if element has video description or author info
    const hasDescription = this.findElementWithSelectors(TikTokSelectors.video.description, element) !== null;
    const hasAuthor = this.findElementWithSelectors(TikTokSelectors.video.author.username, element) !== null;

    return hasDescription || hasAuthor;
  }

  /**
   * Validate extracted video description
   */
  private validateVideoDescription(description: string): boolean {
    if (!description || description.length < TikTokValidation.minDescriptionLength) {
      return false;
    }

    if (description.length > TikTokValidation.maxDescriptionLength) {
      return false;
    }

    // Check for invalid content patterns
    for (const pattern of TikTokValidation.invalidContentIndicators) {
      if (pattern.test(description)) {
        return false;
      }
    }

    return TikTokValidation.validDescriptionPatterns.some(pattern => pattern.test(description));
  }

  /**
   * Validate extracted content quality
   */
  private validateExtractedContent(content: TikTokContent): boolean {
    return !!(content.description || content.author.username || content.engagement.likes);
  }

  /**
   * Parse engagement numbers (handles K, M, B suffixes)
   */
  private parseEngagementNumber(text: string): number {
    const parsed = parseEngagementNumber(text);
    return parsed?.value || 0;
  }

  /**
   * Parse relative time strings (e.g., "2h ago", "1d ago")
   */
  private parseRelativeTime(timeText: string): Date | null {
    const result = parseRelativeTime(timeText);
    return result.date;
  }

  /**
   * Extract hashtags from text
   */
  private extractHashtagsFromText(text: string): string[] {
    const parsed = parseSocialText(text);
    return parsed.entities.hashtags;
  }

  /**
   * Extract mentions from text
   */
  private extractMentionsFromText(text: string): string[] {
    const parsed = parseSocialText(text);
    return parsed.entities.mentions;
  }

  /**
   * Type guard to validate TikTok video data structure
   */
  private isTikTokRawVideoData(data: unknown): data is TikTokRawVideoData {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const obj = data as Record<string, unknown>;

    // Check if it has at least some video-like properties
    return Boolean(
      typeof obj.desc === 'string' ||
      typeof obj.id === 'string' ||
      (obj.author && typeof obj.author === 'object') ||
      (obj.stats && typeof obj.stats === 'object')
    );
  }

  /**
   * Safely get nested property from object
   */
  private getNestedProperty(obj: Record<string, unknown>, path: string[]): unknown {
    let current: unknown = obj;

    for (const key of path) {
      if (!current || typeof current !== 'object') {
        return undefined;
      }
      const currentObj = current as Record<string, unknown>;
      if (!Object.prototype.hasOwnProperty.call(currentObj, key)) {
        return undefined;
      }
      current = currentObj[key];
    }

    return current;
  }

  /**
   * Extract video data from hidden JSON structure
   */
  private extractVideoDataFromJSON(jsonData: unknown): TikTokRawVideoData | null {
    // Navigate through common JSON structures used by TikTok
    try {
      if (!jsonData || typeof jsonData !== 'object') {
        return null;
      }

      const data = jsonData as Record<string, unknown>;

      // Try different possible paths in the JSON structure
      const possiblePaths = [
        this.getNestedProperty(data, ['props', 'pageProps', 'videoData']),
        this.getNestedProperty(data, ['props', 'pageProps', 'itemInfo', 'itemStruct']),
        this.getNestedProperty(data, ['seo', 'metaParams']),
        this.getNestedProperty(data, ['ItemModule'])
      ];

      for (const path of possiblePaths) {
        if (this.isTikTokRawVideoData(path)) {
          return path;
        }
      }

      // If direct paths don't work, search recursively
      return this.findVideoDataRecursively(jsonData);
    } catch (error) {
      console.debug('Failed to extract video data from JSON:', error);
      return null;
    }
  }

  /**
   * Recursively search for video data in JSON structure
   */
  private findVideoDataRecursively(obj: unknown, depth = 0): TikTokRawVideoData | null {
    if (depth > 5 || !obj || typeof obj !== 'object') {
      return null;
    }

    const data = obj as Record<string, unknown>;

    // Check if current object matches video data structure
    if (this.isTikTokRawVideoData(data)) {
      return data;
    }

    // Recursively search in object properties
    const keys = Object.keys(data);
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const value = Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
        if (value !== null) {
          const result = this.findVideoDataRecursively(value, depth + 1);
          if (result) return result;
        }
      }
    }

    return null;
  }

  /**
   * Extract comment text
   */
  private extractCommentText(element: Element): string {
    const textElement = this.findElementWithSelectors(TikTokSelectors.comments.text, element);
    return textElement?.textContent?.trim() || '';
  }

  /**
   * Extract comment author
   */
  private extractCommentAuthor(element: Element): TikTokComment['author'] {
    const authorElement = this.findElementWithSelectors(TikTokSelectors.comments.author, element);
    return {
      username: authorElement?.textContent?.trim() || undefined
    };
  }

  /**
   * Extract comment timestamp
   */
  private extractCommentTimestamp(element: Element): Date | undefined {
    const timeElement = this.findElementWithSelectors(TikTokSelectors.comments.timestamp, element);
    if (timeElement?.textContent) {
      return this.parseRelativeTime(timeElement.textContent.trim()) || undefined;
    }
    return undefined;
  }

  /**
   * Extract comment likes
   */
  private extractCommentLikes(element: Element): number | undefined {
    const likesElement = this.findElementWithSelectors(TikTokSelectors.comments.likes, element);
    if (likesElement?.textContent) {
      return this.parseEngagementNumber(likesElement.textContent);
    }
    return undefined;
  }

  /**
   * Check if there are more comments to load
   * @private - Currently unused but reserved for future comment pagination features
   */
   
  // @ts-ignore - Unused but reserved for future features
  private hasMoreCommentsToLoad(): boolean {
    return this.findElementWithSelectors(TikTokSelectors.comments.loadMore) !== null;
  }

  /**
   * Click load more button with error handling
   */
  private async clickLoadMoreButton(button: Element): Promise<void> {
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

    } catch (error) {
      console.warn('Failed to click load more button:', error);
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
        const loadingElement = this.findElementWithSelectors(TikTokSelectors.loading.spinner);

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
   * Calculate extraction confidence score
   */
  private calculateExtractionConfidence(data: {
    description: string;
    author: TikTokContent['author'];
    timestamp?: Date;
    engagement: TikTokContent['engagement'];
    music?: TikTokContent['music'];
  }): number {
    let confidence = 0;

    // Description quality (40% weight)
    if (data.description && this.validateVideoDescription(data.description)) {
      confidence += 0.4;
    }

    // Author info (25% weight)
    if (data.author.username || data.author.displayName) {
      confidence += 0.25;
      if (data.author.username && data.author.displayName) {
        confidence += 0.1; // Bonus for complete author info
      }
    }

    // Timestamp (15% weight)
    if (data.timestamp) {
      confidence += 0.15;
    }

    // Engagement data (15% weight)
    const engagementCount = Object.keys(data.engagement).length;
    confidence += Math.min(0.15, engagementCount * 0.03);

    // Music content (5% weight)
    if (data.music && Object.keys(data.music).length > 0) {
      confidence += 0.05;
    }

    return Math.min(1, confidence);
  }

  /**
   * Apply rate limiting delay
   */
  private async applyRateLimit(operation: keyof typeof TikTokRateLimiting.extractionDelays): Promise<void> {
    const delay = getTikTokOperationDelay(operation);
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
      const targetElement = this.findElementWithSelectors([
        '[data-e2e="browse-video-container"]',
        '[data-e2e="video-player-container"]',
        'main',
        'body'
      ]) || document.body;

      const observer = new MutationObserver((mutations) => {
        this.handleMutations(mutations);
      });

      observer.observe(targetElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [
          'data-e2e',
          'aria-expanded',
          'aria-hidden',
          'style'
        ],
        attributeOldValue: true
      });

      // Store observer reference for cleanup
      (this as any).mutationObserver = observer;

      console.debug('TikTokExtractor: MutationObserver setup complete');

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

      for (const mutation of mutations) {
        switch (mutation.type) {
          case 'childList':
            if (this.hasNewVideoContent(mutation)) {
              newContentDetected = true;
            }
            break;

          case 'attributes':
            if (this.isRelevantAttributeChange(mutation)) {
              newContentDetected = true;
            }
            break;
        }
      }

      // Debounce handling to avoid excessive processing
      if (newContentDetected) {
        this.debouncedHandleNewContent();
      }

    } catch (error) {
      console.error('Error handling mutations:', error);
    }
  }

  /**
   * Check if mutation contains new video content
   */
  private hasNewVideoContent(mutation: MutationRecord): boolean {
    for (const addedNode of mutation.addedNodes) {
      if (addedNode.nodeType === Node.ELEMENT_NODE) {
        const element = addedNode as Element;

        // Check if it's a video element or contains video elements
        if (this.validateVideoElement(element) ||
            element.querySelector?.('[data-e2e*="video"]')) {
          return true;
        }
      }
    }
    return false;
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
      return true;
    }

    if (attributeName === 'aria-hidden' && oldValue === 'true' && newValue === 'false') {
      return true;
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
        rootMargin: '100px'
      });

      const container = this.findElementWithSelectors([
        '[data-e2e="browse-video-container"]',
        '[data-e2e="video-player-container"]',
        'main'
      ]);

      if (container) {
        container.appendChild(sentinel);
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
    const currentScrollPosition = window.scrollY;

    if (currentScrollPosition > this.commentExtractionState.lastScrollPosition) {
      this.commentExtractionState.lastScrollPosition = currentScrollPosition;

      // Trigger pre-loading of visible content
      this.preloadVisibleContent();
    }
  }

  /**
   * Preload content that's currently visible
   */
  private async preloadVisibleContent(): Promise<void> {
    try {
      const visibleVideos = this.findVisibleVideos();

      // Extract and cache visible videos that aren't already cached
      for (const videoElement of visibleVideos) {
        try {
          if (this.validateVideoElement(videoElement)) {
            const videoContent = await this.extractVideoFromElement(videoElement);

            // Cache with URL-based key
            const videoUrl = this.extractVideoUrl(videoElement);
            if (videoUrl) {
              this.cacheContent(videoUrl, videoContent);
            }
          }
        } catch (error) {
          console.debug('Preload extraction failed for video:', error);
        }
      }

    } catch (error) {
      console.error('Preload visible content failed:', error);
    }
  }

  /**
   * Find videos currently visible in the viewport
   */
  private findVisibleVideos(): Element[] {
    const videoElements = this.findElementsWithSelectors(TikTokSelectors.video.container);
    const visibleVideos: Element[] = [];

    for (const video of videoElements) {
      const rect = video.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight && rect.bottom > 0;

      if (isVisible) {
        visibleVideos.push(video);
      }
    }

    return visibleVideos;
  }

  /**
   * Extract video URL from element
   */
  private extractVideoUrl(element: Element): string | null {
    try {
      // Look for video link in the element
      const videoLink = element.querySelector('a[href*="/video/"]') as HTMLAnchorElement;
      if (videoLink?.href) {
        return videoLink.href;
      }

      return null;
    } catch {
      return null;
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
    const expireTime = TikTokRateLimiting.cacheConfig.videoCacheDuration;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > expireTime) {
        this.cache.delete(key);
      }
    }

    // Limit cache size
    if (this.cache.size > TikTokRateLimiting.cacheConfig.maxCacheSize) {
      const entries = Array.from(this.cache.entries());
      const sorted = entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = sorted.slice(0, this.cache.size - TikTokRateLimiting.cacheConfig.maxCacheSize);

      for (const [key] of toRemove) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cached content
   */
  private getCachedContent(url: string): TikTokContent | TikTokComments | null {
    const entry = this.cache.get(url);
    if (!entry) return null;

    const now = Date.now();
    const maxAge = TikTokRateLimiting.cacheConfig.videoCacheDuration;

    if (now - entry.timestamp > maxAge) {
      this.cache.delete(url);
      return null;
    }

    return entry.data;
  }

  /**
   * Cache content
   */
  private cacheContent(url: string, content: TikTokContent | TikTokComments): void {
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
   * Convert TikTokContent to ContentAnalysis format
   */
  private convertToContentAnalysis(content: TikTokContent | TikTokComments): ContentAnalysis {
    const tikTokContent = 'description' in content ? content : {
      type: 'video' as const,
      description: 'Comments extracted',
      author: { username: 'TikTok' },
      engagement: {},
      hashtags: [],
      mentions: [],
      extractionMetadata: {
        extractedAt: content.extractionMetadata.extractedAt,
        confidence: 0.7,
        selectors: [],
        errors: content.extractionMetadata.errors,
        source: 'dom' as const
      }
    } as TikTokContent;

    return {
      url: window.location.href,
      title: `TikTok by ${tikTokContent.author.displayName || tikTokContent.author.username || 'Unknown'}`,
      content: tikTokContent.description,
      type: 'social-post',
      platform: 'tiktok' as SocialPlatform,
      analysis: {
        domain: window.location.hostname,
        credibility: {
          score: Math.round(tikTokContent.extractionMetadata.confidence * 100),
          level: tikTokContent.extractionMetadata.confidence >= 0.8 ? 'high' :
                 tikTokContent.extractionMetadata.confidence >= 0.6 ? 'medium' : 'low',
          confidence: tikTokContent.extractionMetadata.confidence,
          reasoning: `TikTok content extracted with ${tikTokContent.extractionMetadata.selectors.length} selectors using ${tikTokContent.extractionMetadata.source} method`,
          source: 'ai',
          timestamp: Date.now(),
        },
        details: {
          tikTokData: tikTokContent,
          performanceMetrics: this.performanceMetrics,
          extractionMethod: 'TikTokExtractor2025'
        } as any
      },
    };
  }

  /**
   * Create error analysis
   */
  private createErrorAnalysis(error: unknown): ContentAnalysis {
    return {
      url: window.location.href,
      title: 'TikTok Extraction Error',
      content: '',
      type: 'social-post',
      platform: 'tiktok' as SocialPlatform,
      analysis: {
        domain: window.location.hostname,
        credibility: {
          score: 0,
          level: 'unknown',
          confidence: 0,
          reasoning: `TikTok extraction failed: ${error instanceof Error ? error.message : String(error)}`,
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
      maxSize: TikTokRateLimiting.cacheConfig.maxCacheSize,
      entries: Array.from(this.cache.keys())
    };
  }
}
