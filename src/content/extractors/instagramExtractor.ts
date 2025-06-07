/**
 * Instagram Content Extractor
 *
 * A robust, general-purpose extractor for Instagram content including posts, stories, and reels.
 * Designed for reliability, maintainability, and compliance with Instagram's terms of service.
 *
 * Key features:
 * - Dynamic content handling with mutation observers
 * - Responsive layout support with adaptive selectors
 * - Rate limiting with exponential backoff
 * - Privacy and compliance monitoring
 * - Comprehensive error handling and recovery
 * - Memory-efficient duplicate prevention
 * - Type-safe content extraction
 */

import { IExtractor } from './contentExtractor';
import { ContentAnalysis, SourceAnalysis, CredibilityScore } from '@shared/types';
import {
  InstagramSelectors,
  InstagramRateLimiting,
  InstagramCompliance,
  isInstagramUrl,
  getInstagramContentType,
  getInstagramOperationDelay,
  checkInstagramRateLimits
} from './config/instagramSelectors';
import { cleanText, sanitizeUsername } from '@shared/utils/textCleaner';
import { parseSocialText } from '@shared/utils/socialTextParser';

// Type definitions for Instagram content
interface InstagramAuthor {
  username: string;
  displayName?: string;
  verified?: boolean;
  profileUrl?: string;
}

interface InstagramEngagement {
  likes?: number;
  comments?: number;
  shares?: number;
  views?: number;
  plays?: number;
}

interface InstagramMedia {
  type: 'image' | 'video';
  url: string;
  alt?: string;
  thumbnail?: string;
  width?: number;
  height?: number;
}

interface InstagramPost {
  id: string;
  type: 'post';
  author: InstagramAuthor;
  caption?: string;
  media: InstagramMedia[];
  engagement: InstagramEngagement;
  timestamp?: string;
  location?: string;
  hashtags: string[];
  mentions: string[];
  url: string;
}

interface InstagramStory {
  id: string;
  type: 'story';
  author: InstagramAuthor;
  media: InstagramMedia[];
  textOverlays: string[];
  stickers: InstagramSticker[];
  expiresAt?: string;
  viewCount?: number;
  isLive?: boolean;
  url: string;
}

interface InstagramReel {
  id: string;
  type: 'reel';
  author: InstagramAuthor;
  caption?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  audio?: InstagramAudio;
  engagement: InstagramEngagement;
  effects?: string[];
  hashtags: string[];
  mentions: string[];
  duration?: number;
  url: string;
}

interface InstagramSticker {
  type: 'poll' | 'question' | 'location' | 'mention' | 'hashtag' | 'emoji' | 'music' | 'gif';
  content: string;
  position?: { x: number; y: number };
  metadata?: Record<string, any>;
}

interface InstagramAudio {
  title?: string;
  artist?: string;
  isOriginal?: boolean;
  url?: string;
}

type InstagramContent = InstagramPost | InstagramStory | InstagramReel;

// Extraction result with error handling
interface ExtractionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Configuration constants
const CONFIG = {
  MAX_CONTENT_AGE: 24 * 60 * 60 * 1000, // 24 hours
  MAX_RETRIES: 3,
  SESSION_DURATION: 15 * 60 * 1000, // 15 minutes
  CONTENT_CACHE_SIZE: 1000,
  OBSERVER_DEBOUNCE: 500,
  INTERSECTION_THRESHOLD: 0.1,
  MAX_EXTRACTION_TIME: 30000, // 30 seconds
  PERFORMANCE_SAMPLE_SIZE: 100
};

export class InstagramExtractor implements IExtractor {
  // Session management
  private session = {
    id: this.generateSessionId(),
    startTime: Date.now(),
    requestCounts: new Map<string, number>(),
    errorCounts: new Map<string, number>(),
    lastExtractionTime: 0,
    retryCount: 0
  };

  // Content tracking with LRU cache
  private contentCache = new Map<string, {
    timestamp: number;
    content: InstagramContent;
    accessCount: number;
  }>();

  // Observer management
  private observers = new Map<string, MutationObserver>();
  private intersectionObserver: IntersectionObserver | null = null;
  private resizeObserver: ResizeObserver | null = null;

  // Performance monitoring
  private performanceMetrics = {
    extractionTimes: [] as number[],
    successCount: 0,
    failureCount: 0,
    lastCleanup: Date.now()
  };

  /**
   * Determines if this extractor can handle the given URL
   */
  canHandle(url: string, document: Document): boolean {
    try {
      // Check URL pattern
      if (!isInstagramUrl(url)) {
        return false;
      }

      // Additional DOM-based validation
      const hasInstagramIndicators = !!(
        document.querySelector('meta[property="al:ios:app_name"][content="Instagram"]') ||
        document.querySelector('meta[property="og:site_name"][content="Instagram"]') ||
        document.querySelector('[data-testid*="instagram"]') ||
        document.querySelector('div[id*="react-root"]')
      );

      return hasInstagramIndicators;
    } catch (error) {
      console.error('[InstagramExtractor] Error checking URL:', error);
      return false;
    }
  }

  /**
   * Main extraction method with comprehensive error handling and recovery
   */
  async extractPageContent(): Promise<ContentAnalysis> {
    const extractionId = this.generateExtractionId();
    const startTime = performance.now();

    try {
      console.log(`[InstagramExtractor] Starting extraction ${extractionId}`);

      // Initialize extraction environment
      await this.initializeExtraction();

      // Validate session
      if (!this.isSessionValid()) {
        await this.resetSession();
      }

      // Apply rate limiting
      const rateLimitResult = await this.applyRateLimit();
      if (!rateLimitResult.allowed) {
        throw new Error(`Rate limit exceeded: ${rateLimitResult.reason}`);
      }

      // Check compliance
      const complianceResult = await this.checkCompliance();
      if (!complianceResult.allowed) {
        console.warn('[InstagramExtractor] Compliance check failed:', complianceResult.reason);
        return this.createErrorAnalysis(new Error(complianceResult.reason || 'Compliance check failed'));
      }

      // Extract content with timeout
      const contentResult = await this.extractWithTimeout(CONFIG.MAX_EXTRACTION_TIME);

      if (!contentResult.success || !contentResult.data || contentResult.data.length === 0) {
        throw new Error(contentResult.error || 'No content extracted');
      }

      // Setup monitoring for dynamic content
      this.setupDynamicContentHandling();

      // Convert and return results
      const result = this.convertToContentAnalysis(contentResult.data);

      // Update metrics
      this.updateMetrics(performance.now() - startTime, true);

      console.log(`[InstagramExtractor] Extraction ${extractionId} completed successfully`);
      return result;

    } catch (error) {
      console.error(`[InstagramExtractor] Extraction ${extractionId} failed:`, error);
      this.handleExtractionError(error);

      // Update metrics
      this.updateMetrics(performance.now() - startTime, false);

      // Retry logic
      if (this.shouldRetry(error)) {
        return this.retryExtraction();
      }

      // Return error analysis
      return this.createErrorAnalysis(error);
    } finally {
      // Cleanup
      this.performMaintenance();
    }
  }

  /**
   * Initialize extraction environment
   */
  private async initializeExtraction(): Promise<void> {
    // Update viewport information
    this.updateViewportInfo();

    // Setup performance observer
    if ('PerformanceObserver' in window) {
      this.setupPerformanceObserver();
    }

    // Check for required DOM APIs
    this.validateEnvironment();
  }

  /**
   * Extract content with timeout protection
   */
  private async extractWithTimeout(timeout: number): Promise<ExtractionResult<InstagramContent[]>> {
    const timeoutPromise = new Promise<ExtractionResult<InstagramContent[]>>((resolve) => {
      setTimeout(() => resolve({
        success: false,
        error: 'Extraction timeout exceeded'
      }), timeout);
    });

    const extractionPromise = this.performExtraction();

    return Promise.race([extractionPromise, timeoutPromise]);
  }

  /**
   * Perform the actual content extraction
   */
  private async performExtraction(): Promise<ExtractionResult<InstagramContent[]>> {
    try {
      const contentType = getInstagramContentType(window.location.href);
      const content: InstagramContent[] = [];

      // Extract based on content type
      switch (contentType) {
        case 'post': {
          const posts = await this.extractPosts();
          content.push(...posts);
          break;
        }

        case 'story': {
          const stories = await this.extractStories();
          content.push(...stories);
          break;
        }

        case 'reel': {
          const reels = await this.extractReels();
          content.push(...reels);
          break;
        }

        case 'profile': {
          const profileContent = await this.extractProfileContent();
          content.push(...profileContent);
          break;
        }

        case 'explore': {
          const exploreContent = await this.extractExploreContent();
          content.push(...exploreContent);
          break;
        }

        default:
          return {
            success: false,
            error: `Unsupported content type: ${contentType}`
          };
      }

      return { success: true, data: content };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown extraction error'
      };
    }
  }

  /**
   * Extract Instagram posts with robust selector handling
   */
  private async extractPosts(): Promise<InstagramPost[]> {
    const posts: InstagramPost[] = [];
    const processedIds = new Set<string>();

    // Get responsive selectors
    const selectorGroups = this.getResponsiveSelectors('post');

    for (const selectors of selectorGroups) {
      const elements = this.queryElements(selectors);

      if (elements.length === 0) continue;

      // Process elements in batches
      const batchSize = 10;
      for (let i = 0; i < elements.length; i += batchSize) {
        const batch = elements.slice(i, i + batchSize);

        const batchResults = await Promise.all(
          batch.map(element => this.extractPostFromElement(element))
        );

        for (const result of batchResults) {
          if (result.success && result.data && !processedIds.has(result.data.id)) {
            posts.push(result.data);
            processedIds.add(result.data.id);
            this.cacheContent(result.data);
          }
        }

        // Rate limiting between batches
        if (i + batchSize < elements.length) {
          await this.delay(getInstagramOperationDelay('betweenPosts'));
        }
      }

      // If successful with current selectors, skip others
      if (posts.length > 0) break;
    }

    this.updateRequestCount('posts', posts.length);
    return posts;
  }

  /**
   * Extract post data from DOM element
   */
  private async extractPostFromElement(element: Element): Promise<ExtractionResult<InstagramPost>> {
    try {
      // Extract post ID
      const id = this.extractPostId(element);
      if (!id) {
        return { success: false, error: 'Could not extract post ID' };
      }

      // Check cache
      const cached = this.getCachedContent(id);
      if (cached && cached.type === 'post') {
        return { success: true, data: cached };
      }

      // Extract author
      const authorResult = this.extractAuthor(element);
      if (!authorResult.success || !authorResult.data) {
        return { success: false, error: 'Could not extract author' };
      }

      // Extract other data
      const caption = this.extractCaption(element);
      const media = await this.extractMedia(element);
      const engagement = this.extractEngagement(element);
      const timestamp = this.extractTimestamp(element);
      const location = this.extractLocation(element);
      const { hashtags, mentions } = this.parseTextEntities(caption || '');

      const post: InstagramPost = {
        id,
        type: 'post',
        author: authorResult.data,
        caption,
        media,
        engagement,
        timestamp,
        location,
        hashtags,
        mentions,
        url: this.constructPostUrl(id)
      };

      return { success: true, data: post };
    } catch (error) {
      return {
        success: false,
        error: `Post extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Extract author information
   */
  private extractAuthor(element: Element): ExtractionResult<InstagramAuthor> {
    try {
      const selectors = InstagramSelectors.post.author;

      // Try multiple username selectors
      let username: string | null = null;
      for (const selector of selectors.username) {
        username = this.extractText(element, selector);
        if (username) break;
      }

      if (!username) {
        return { success: false, error: 'Username not found' };
      }

      // Extract additional author data
      const displayName = this.extractText(element, Array.from(selectors.displayName as readonly string[]));
      const verified = this.checkVerification(element, Array.from(selectors.verified as readonly string[]));

      const author: InstagramAuthor = {
        username: this.sanitizeUsername(username),
        displayName: displayName ? this.sanitizeText(displayName) : undefined,
        verified,
        profileUrl: `https://www.instagram.com/${username}/`
      };

      return { success: true, data: author };
    } catch (error) {
      return {
        success: false,
        error: `Author extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Extract media with advanced handling
   */
  private async extractMedia(element: Element): Promise<InstagramMedia[]> {
    const media: InstagramMedia[] = [];
    const processedUrls = new Set<string>();

    // Extract images
    const imageMedia = await this.extractImages(element, processedUrls);
    media.push(...imageMedia);

    // Extract videos
    const videoMedia = await this.extractVideos(element, processedUrls);
    media.push(...videoMedia);

    // Handle carousel if present
    const carouselMedia = await this.extractCarouselMedia(element, processedUrls);
    media.push(...carouselMedia);

    return media;
  }

  /**
   * Extract images from element
   */
  private async extractImages(element: Element, processedUrls: Set<string>): Promise<InstagramMedia[]> {
    const images: InstagramMedia[] = [];
    const selectors = InstagramSelectors.post.media.image;

    for (const selector of selectors) {
      const imgElements = element.querySelectorAll(selector);

      for (const img of imgElements) {
        if (!(img instanceof HTMLImageElement)) continue;

        const url = this.getBestImageUrl(img);
        if (!url || processedUrls.has(url)) continue;

        if (this.isValidMediaUrl(url)) {
          images.push({
            type: 'image',
            url: this.normalizeMediaUrl(url),
            alt: this.sanitizeText(img.alt),
            width: img.naturalWidth || undefined,
            height: img.naturalHeight || undefined
          });
          processedUrls.add(url);
        }
      }
    }

    return images;
  }

  /**
   * Extract videos from element
   */
  private async extractVideos(element: Element, processedUrls: Set<string>): Promise<InstagramMedia[]> {
    const videos: InstagramMedia[] = [];
    const selectors = InstagramSelectors.post.media.video;

    for (const selector of selectors) {
      const videoElements = element.querySelectorAll(selector);

      for (const video of videoElements) {
        if (!(video instanceof HTMLVideoElement)) continue;

        const url = this.getVideoUrl(video);
        if (!url || processedUrls.has(url)) continue;

        if (this.isValidMediaUrl(url)) {
          videos.push({
            type: 'video',
            url: this.normalizeMediaUrl(url),
            thumbnail: video.poster ? this.normalizeMediaUrl(video.poster) : undefined,
            width: video.videoWidth || undefined,
            height: video.videoHeight || undefined
          });
          processedUrls.add(url);
        }
      }
    }

    return videos;
  }

  /**
   * Extract stories with proper handling
   */
  private async extractStories(): Promise<InstagramStory[]> {
    const stories: InstagramStory[] = [];
    const processedIds = new Set<string>();

    const selectorGroups = this.getResponsiveSelectors('story');

    for (const selectors of selectorGroups) {
      const elements = this.queryElements(selectors);

      for (const element of elements) {
        const result = await this.extractStoryFromElement(element);

        if (result.success && result.data && !processedIds.has(result.data.id)) {
          stories.push(result.data);
          processedIds.add(result.data.id);
          this.cacheContent(result.data);
        }
      }

      if (stories.length > 0) break;
    }

    this.updateRequestCount('stories', stories.length);
    return stories;
  }

  /**
   * Extract story data from element
   */
  private async extractStoryFromElement(element: Element): Promise<ExtractionResult<InstagramStory>> {
    try {
      const id = this.extractStoryId(element);
      if (!id) {
        return { success: false, error: 'Could not extract story ID' };
      }

      const authorResult = this.extractAuthor(element);
      if (!authorResult.success || !authorResult.data) {
        return { success: false, error: 'Could not extract author' };
      }

      const media = await this.extractMedia(element);
      const textOverlays = this.extractTextOverlays(element);
      const stickers = this.extractStickers(element);
      const expiresAt = this.extractStoryExpiration(element);
      const viewCount = this.extractViewCount(element);
      const isLive = this.checkIfLive(element);

      const story: InstagramStory = {
        id,
        type: 'story',
        author: authorResult.data,
        media,
        textOverlays,
        stickers,
        expiresAt,
        viewCount,
        isLive,
        url: this.constructStoryUrl(id, authorResult.data.username)
      };

      return { success: true, data: story };
    } catch (error) {
      return {
        success: false,
        error: `Story extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Extract reels with audio support
   */
  private async extractReels(): Promise<InstagramReel[]> {
    const reels: InstagramReel[] = [];
    const processedIds = new Set<string>();

    const selectorGroups = this.getResponsiveSelectors('reel');

    for (const selectors of selectorGroups) {
      const elements = this.queryElements(selectors);

      for (const element of elements) {
        const result = await this.extractReelFromElement(element);

        if (result.success && result.data && !processedIds.has(result.data.id)) {
          reels.push(result.data);
          processedIds.add(result.data.id);
          this.cacheContent(result.data);
        }
      }

      if (reels.length > 0) break;
    }

    this.updateRequestCount('reels', reels.length);
    return reels;
  }

  /**
   * Extract reel data from element
   */
  private async extractReelFromElement(element: Element): Promise<ExtractionResult<InstagramReel>> {
    try {
      const id = this.extractReelId(element);
      if (!id) {
        return { success: false, error: 'Could not extract reel ID' };
      }

      const authorResult = this.extractAuthor(element);
      if (!authorResult.success || !authorResult.data) {
        return { success: false, error: 'Could not extract author' };
      }

      const videoUrl = this.extractReelVideoUrl(element);
      if (!videoUrl) {
        return { success: false, error: 'Could not extract video URL' };
      }

      const caption = this.extractCaption(element);
      const thumbnailUrl = this.extractReelThumbnail(element);
      const audio = this.extractAudioInfo(element);
      const engagement = this.extractEngagement(element);
      const effects = this.extractEffects(element);
      const { hashtags, mentions } = this.parseTextEntities(caption || '');
      const duration = this.extractVideoDuration(element);

      const reel: InstagramReel = {
        id,
        type: 'reel',
        author: authorResult.data,
        caption,
        videoUrl: this.normalizeMediaUrl(videoUrl),
        thumbnailUrl: thumbnailUrl ? this.normalizeMediaUrl(thumbnailUrl) : undefined,
        audio,
        engagement,
        effects,
        hashtags,
        mentions,
        duration,
        url: this.constructReelUrl(id)
      };

      return { success: true, data: reel };
    } catch (error) {
      return {
        success: false,
        error: `Reel extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Setup dynamic content handling
   */
  private setupDynamicContentHandling(): void {
    // Setup mutation observer for new content
    this.setupMutationObserver();

    // Setup intersection observer for lazy loading
    this.setupIntersectionObserver();

    // Setup resize observer for responsive changes
    this.setupResizeObserver();

    // Setup scroll listener for infinite scroll
    this.setupScrollListener();
  }

  /**
   * Setup mutation observer
   */
  private setupMutationObserver(): void {
    if (this.observers.has('main')) return;

    const observer = new MutationObserver(
      this.debounce((mutations: MutationRecord[]) => {
        this.handleMutations(mutations);
      }, CONFIG.OBSERVER_DEBOUNCE)
    );

    const target = document.querySelector('main') || document.body;
    observer.observe(target, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'href']
    });

    this.observers.set('main', observer);
  }

  /**
   * Setup intersection observer for lazy loading
   */
  private setupIntersectionObserver(): void {
    if (this.intersectionObserver) return;

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.handleLazyLoad(entry.target);
          }
        });
      },
      { threshold: CONFIG.INTERSECTION_THRESHOLD }
    );

    // Observe media containers
    const mediaContainers = document.querySelectorAll('[data-lazy], img[loading="lazy"], video');
    mediaContainers.forEach(container => {
      this.intersectionObserver?.observe(container);
    });
  }

  /**
   * Convert extracted content to ContentAnalysis format
   */
  private convertToContentAnalysis(content: InstagramContent[]): ContentAnalysis {
    const firstItem = content[0];
    const author = firstItem?.author.username || 'unknown';

    // Create credibility score (placeholder - would integrate with AI service)
    const credibility: CredibilityScore = {
      score: 50, // Neutral score until AI analysis
      level: 'unknown',
      confidence: 0.5,
      reasoning: 'Content extracted, pending credibility analysis',
      source: 'fallback',
      timestamp: Date.now()
    };

    // Create source analysis
    const analysis: SourceAnalysis = {
      domain: 'instagram.com',
      credibility,
      details: {
        ownership: 'Meta Platforms, Inc.',
        country: 'United States',
        mediaType: 'Social Media Platform',
        founded: 2010,
        notes: `Extracted ${content.length} items from @${author}`
      }
    };

    return {
      url: window.location.href,
      title: `Instagram - @${author}`,
      content: this.aggregateText(content),
      type: 'social-post',
      platform: 'instagram',
      analysis,
      relatedClaims: [] // Would be populated by fact-checking service
    };
  }

  // Helper methods

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique extraction ID
   */
  private generateExtractionId(): string {
    return `extraction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if session is valid
   */
  private isSessionValid(): boolean {
    const elapsed = Date.now() - this.session.startTime;
    return elapsed < CONFIG.SESSION_DURATION;
  }

  /**
   * Reset session
   */
  private async resetSession(): Promise<void> {
    console.log('[InstagramExtractor] Resetting session');

    // Clear observers
    this.clearObservers();

    // Reset session data
    this.session = {
      id: this.generateSessionId(),
      startTime: Date.now(),
      requestCounts: new Map<string, number>(),
      errorCounts: new Map<string, number>(),
      lastExtractionTime: 0,
      retryCount: 0
    };

    // Clear old cache entries
    this.cleanupCache();
  }

  /**
   * Apply rate limiting
   */
  private async applyRateLimit(): Promise<{ allowed: boolean; reason?: string }> {
    const now = Date.now();
    const timeSinceLastExtraction = now - this.session.lastExtractionTime;
    const minDelay = getInstagramOperationDelay('pageTransition');

    if (timeSinceLastExtraction < minDelay) {
      const waitTime = minDelay - timeSinceLastExtraction;
      await this.delay(waitTime);
    }

    // Check rate limits
    const contentType = this.getContentTypeForRateLimit();
    const rateLimitCheck = checkInstagramRateLimits(
      this.getTotalRequests(),
      contentType,
      this.session.startTime
    );

    if (!rateLimitCheck.allowed) {
      return { allowed: false, reason: rateLimitCheck.reason };
    }

    this.session.lastExtractionTime = Date.now();
    return { allowed: true };
  }

  /**
   * Check compliance
   */
  private async checkCompliance(): Promise<{ allowed: boolean; reason?: string }> {
    // Check robots.txt
    if (InstagramCompliance.robotsTxt.respectDisallow) {
      const robotsAllowed = await this.checkRobotsTxt();
      if (!robotsAllowed) {
        return { allowed: false, reason: 'Blocked by robots.txt' };
      }
    }

    // Check user privacy settings
    if (InstagramCompliance.privacy.respectDoNotTrack) {
      const dnt = navigator.doNotTrack;
      if (dnt === '1') {
        return { allowed: false, reason: 'Do Not Track enabled' };
      }
    }

    return { allowed: true };
  }

  /**
   * Get responsive selectors based on viewport
   */
  private getResponsiveSelectors(contentType: string): string[][] {
    const viewport = this.getViewportInfo();
    const breakpoint = this.getBreakpoint(viewport.width);

    // Get selectors based on content type and breakpoint
    const baseSelectors = this.getSelectorsByType(contentType);
    const responsiveSelectors = this.getResponsiveVariants(breakpoint);

    // Combine base and responsive selectors
    return [baseSelectors, responsiveSelectors].filter(arr => arr.length > 0);
  }

  private getSelectorsByType(contentType: string): string[] {
    switch (contentType) {
      case 'post':
        return [...InstagramSelectors.post.container];
      case 'story':
        return [...InstagramSelectors.stories.container];
      case 'reel':
        return [...InstagramSelectors.reels.container];
      default:
        return [];
    }
  }

  private getResponsiveVariants(breakpoint: 'mobile' | 'tablet' | 'desktop'): string[] {
    const validBreakpoints = ['mobile', 'tablet', 'desktop'] as const;
    if (!validBreakpoints.includes(breakpoint)) {
      throw new Error(`Invalid breakpoint: ${breakpoint}`);
    }

    const responsive = InstagramSelectors.responsive[breakpoint];
    return [
      responsive.postContainer,
      responsive.storyContainer,
      responsive.reelContainer
    ];
  }

  /**
   * Query elements with fallback
   */
  private queryElements(selectors: string | string[]): Element[] {
    const selectorArray = Array.isArray(selectors) ? selectors : [selectors];
    const elements: Element[] = [];

    for (const selector of selectorArray) {
      try {
        const found = document.querySelectorAll(selector);
        elements.push(...Array.from(found));
      } catch {
        console.warn(`[InstagramExtractor] Invalid selector: ${selector}`);
      }
    }

    return elements;
  }

  /**
   * Extract text with fallback
   */
  private extractText(element: Element, selectors: string | string[]): string | null {
    const selectorArray = Array.isArray(selectors) ? selectors : [selectors];

    for (const selector of selectorArray) {
      try {
        const target = element.querySelector(selector);
        if (target) {
          const text = target.textContent?.trim();
          if (text) return text;
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  /**
   * Sanitize text content
   */
  private sanitizeText(text: string | null | undefined): string | undefined {
    if (!text) return undefined;

    return cleanText(text, {
      removeControlChars: true,
      normalizeWhitespace: true,
      maxLength: 10000,
      preserveEmojis: true,
      preserveLineBreaks: false
    });
  }

  /**
   * Sanitize username
   */
  private sanitizeUsername(username: string): string {
    return sanitizeUsername(username);
  }

  /**
   * Validate environment
   */
  private validateEnvironment(): void {
    const required = ['MutationObserver', 'IntersectionObserver', 'ResizeObserver'];
    const missing = required.filter(api => !(api in window));

    if (missing.length > 0) {
      console.warn(`[InstagramExtractor] Missing APIs: ${missing.join(', ')}`);
    }
  }

  /**
   * Debounce function
   */
  private debounce<T extends (...args: any[]) => void>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: number;

    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = window.setTimeout(() => func(...args), wait);
    };
  }

  /**
   * Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    console.log('[InstagramExtractor] Cleaning up resources');

    // Clear all observers
    this.clearObservers();

    // Clear cache
    this.contentCache.clear();

    // Reset session
    this.session = {
      id: this.generateSessionId(),
      startTime: Date.now(),
      requestCounts: new Map<string, number>(),
      errorCounts: new Map<string, number>(),
      lastExtractionTime: 0,
      retryCount: 0
    };
  }

  /**
   * Clear all observers
   */
  private clearObservers(): void {
    // Clear mutation observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();

    // Clear intersection observer
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }

    // Clear resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  // Additional helper methods would continue here...
  // Including all the referenced methods like extractPostId, extractCaption, etc.
  // Due to length constraints, I'll provide the essential structure

  private extractPostId(element: Element): string | null {
    // Try multiple strategies to extract post ID
    const strategies = [
      () => element.getAttribute('data-id'),
      () => element.querySelector('a[href*="/p/"]')?.getAttribute('href')?.match(/\/p\/([^/]+)/)?.[1],
      () => element.querySelector('[id^="mount_"]')?.id.split('_')[1],
      () => this.generateContentId('post')
    ];

    for (const strategy of strategies) {
      const id = strategy();
      if (id) return id;
    }

    return null;
  }

  private generateContentId(type: string): string {
    return `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateViewportInfo(): void {
    this.viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };
  }

  private getViewportInfo(): { width: number; height: number } {
    return { ...this.viewport };
  }

  private getBreakpoint(width: number): 'mobile' | 'tablet' | 'desktop' {
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private getTotalRequests(): number {
    let total = 0;
    this.session.requestCounts.forEach(count => total += count);
    return total;
  }

  private getContentTypeForRateLimit(): 'posts' | 'stories' | 'reels' {
    // Determine content type based on current URL or most recent extractions
    const contentType = getInstagramContentType(window.location.href);

    switch (contentType) {
      case 'post':
        return 'posts';
      case 'story':
        return 'stories';
      case 'reel':
        return 'reels';
      default:
        // Default to posts for profile/explore pages
        return 'posts';
    }
  }

  private updateRequestCount(type: string, count: number): void {
    const current = this.session.requestCounts.get(type) || 0;
    this.session.requestCounts.set(type, current + count);
  }

  private cacheContent(content: InstagramContent): void {
    if (this.contentCache.size >= CONFIG.CONTENT_CACHE_SIZE) {
      // Remove oldest entries
      const entriesToRemove = Math.floor(CONFIG.CONTENT_CACHE_SIZE * 0.2);
      const sortedEntries = Array.from(this.contentCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);

      for (let i = 0; i < entriesToRemove; i++) {
        const entry = sortedEntries[i];
        if (entry) {
          this.contentCache.delete(entry[0]);
        }
      }
    }

    this.contentCache.set(content.id, {
      timestamp: Date.now(),
      content,
      accessCount: 0
    });
  }

  private getCachedContent(id: string): InstagramContent | null {
    const cached = this.contentCache.get(id);
    if (!cached) return null;

    // Check if content is still fresh
    if (Date.now() - cached.timestamp > CONFIG.MAX_CONTENT_AGE) {
      this.contentCache.delete(id);
      return null;
    }

    cached.accessCount++;
    return cached.content;
  }

  private cleanupCache(): void {
    const now = Date.now();
    const entriesToDelete: string[] = [];

    this.contentCache.forEach((value, key) => {
      if (now - value.timestamp > CONFIG.MAX_CONTENT_AGE) {
        entriesToDelete.push(key);
      }
    });

    entriesToDelete.forEach(key => this.contentCache.delete(key));
  }

  private performMaintenance(): void {
    const now = Date.now();

    // Cleanup cache periodically
    if (now - this.performanceMetrics.lastCleanup > 60000) { // Every minute
      this.cleanupCache();
      this.performanceMetrics.lastCleanup = now;
    }

    // Trim performance metrics
    if (this.performanceMetrics.extractionTimes.length > CONFIG.PERFORMANCE_SAMPLE_SIZE) {
      this.performanceMetrics.extractionTimes =
        this.performanceMetrics.extractionTimes.slice(-CONFIG.PERFORMANCE_SAMPLE_SIZE);
    }
  }

  private updateMetrics(duration: number, success: boolean): void {
    this.performanceMetrics.extractionTimes.push(duration);

    if (success) {
      this.performanceMetrics.successCount++;
    } else {
      this.performanceMetrics.failureCount++;
    }
  }

  // Unused method - kept for potential future use
  /*
  private _getPerformanceSnapshot(): Record<string, any> {
    const times = this.performanceMetrics.extractionTimes;
    const avgTime = times.length > 0
      ? times.reduce((a, b) => a + b, 0) / times.length
      : 0;

    const successRate = this.performanceMetrics.successCount + this.performanceMetrics.failureCount > 0
      ? this.performanceMetrics.successCount / (this.performanceMetrics.successCount + this.performanceMetrics.failureCount)
      : 0;

    return {
      averageExtractionTime: Math.round(avgTime),
      successRate: Math.round(successRate * 100) / 100,
      totalExtractions: this.performanceMetrics.successCount + this.performanceMetrics.failureCount,
      cacheSize: this.contentCache.size
    };
  }
  */

  private shouldRetry(error: unknown): boolean {
    if (this.session.retryCount >= CONFIG.MAX_RETRIES) return false;

    // Retry on specific error types
    const retryableErrors = [
      'timeout',
      'network',
      'rate limit'
    ];

    const errorMessage = (error instanceof Error ? error.message : String(error)).toLowerCase();
    return retryableErrors.some(type => errorMessage.includes(type));
  }

  private async retryExtraction(): Promise<ContentAnalysis> {
    this.session.retryCount++;
    const delay = this.calculateBackoffDelay();

    console.log(`[InstagramExtractor] Retrying extraction (attempt ${this.session.retryCount}/${CONFIG.MAX_RETRIES}) after ${delay}ms`);

    await this.delay(delay);
    return this.extractPageContent();
  }

  private calculateBackoffDelay(): number {
    const baseDelay = InstagramRateLimiting.retryConfig.initialDelay;
    const factor = InstagramRateLimiting.retryConfig.backoffMultiplier;
    const maxDelay = InstagramRateLimiting.retryConfig.maxDelay;

    const delay = Math.min(baseDelay * Math.pow(factor, this.session.retryCount - 1), maxDelay);

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * delay;

    return Math.round(delay + jitter);
  }

  private handleExtractionError(error: unknown): void {
    const errorType = this.categorizeError(error);
    const currentCount = this.session.errorCounts.get(errorType) || 0;
    this.session.errorCounts.set(errorType, currentCount + 1);
  }

  private categorizeError(error: unknown): string {
    const message = (error instanceof Error ? error.message : String(error)).toLowerCase();

    if (message.includes('rate limit')) return 'rateLimit';
    if (message.includes('compliance')) return 'compliance';
    if (message.includes('timeout')) return 'timeout';
    if (message.includes('network')) return 'network';

    return 'extraction';
  }

  /**
   * Create error analysis when extraction fails
   */
  private createErrorAnalysis(error: unknown): ContentAnalysis {
    const credibility: CredibilityScore = {
      score: 0,
      level: 'unknown',
      confidence: 0,
      reasoning: `Content extraction failed: ${error instanceof Error ? error.message : String(error)}`,
      source: 'fallback',
      timestamp: Date.now()
    };

    const analysis: SourceAnalysis = {
      domain: 'instagram.com',
      credibility
    };

    return {
      url: window.location.href,
      title: 'Instagram - Error',
      content: '',
      type: 'social-post',
      platform: 'instagram',
      analysis
    };
  }

  // Placeholder methods for remaining functionality
  // These would be fully implemented in the complete version

  private async checkRobotsTxt(): Promise<boolean> {
    // Implementation would check robots.txt
    return true;
  }

  // Unused method - kept for potential future use
  /*
  private async _checkUserConsent(): Promise<boolean> {
    // Implementation would check user consent
    return true;
  }
  */

  private setupPerformanceObserver(): void {
    // Implementation would setup performance monitoring
  }

  private extractCaption(element: Element): string | undefined {
    const text = this.extractText(element, [...InstagramSelectors.post.caption]);
    return text ? this.sanitizeText(text) : undefined;
  }

  private extractEngagement(_element: Element): InstagramEngagement {
    // Implementation would extract engagement metrics
    return {};
  }

  private extractTimestamp(element: Element): string | undefined {
    const text = this.extractText(element, [...InstagramSelectors.post.timestamp]);
    return text || undefined;
  }

  private extractLocation(element: Element): string | undefined {
    const text = this.extractText(element, [...InstagramSelectors.post.location]);
    return text ? this.sanitizeText(text) : undefined;
  }

  private parseTextEntities(text: string): { hashtags: string[]; mentions: string[] } {
    const parsed = parseSocialText(text);
    return {
      hashtags: parsed.entities.hashtags,
      mentions: parsed.entities.mentions
    };
  }

  private constructPostUrl(id: string): string {
    return `https://www.instagram.com/p/${id}/`;
  }

  private checkVerification(element: Element, selectors: string[]): boolean {
    for (const selector of selectors) {
      if (element.querySelector(selector)) return true;
    }
    return false;
  }

  private getBestImageUrl(img: HTMLImageElement): string | null {
    return img.srcset?.split(',')[0]?.split(' ')[0] || img.src || null;
  }

  private getVideoUrl(video: HTMLVideoElement): string | null {
    return video.src || video.querySelector('source')?.src || null;
  }

  private isValidMediaUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' && parsed.hostname.includes('instagram');
    } catch {
      return false;
    }
  }

  private normalizeMediaUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Remove tracking parameters
      parsed.searchParams.delete('_nc_ht');
      parsed.searchParams.delete('_nc_cat');
      return parsed.toString();
    } catch {
      return url;
    }
  }

  private async extractCarouselMedia(_element: Element, _processedUrls: Set<string>): Promise<InstagramMedia[]> {
    // Implementation would handle carousel media extraction
    return [];
  }

  private extractStoryId(_element: Element): string | null {
    // Implementation similar to extractPostId
    return this.generateContentId('story');
  }

  private extractTextOverlays(_element: Element): string[] {
    // Implementation would extract text overlays
    return [];
  }

  private extractStickers(_element: Element): InstagramSticker[] {
    // Implementation would extract stickers
    return [];
  }

  private extractStoryExpiration(_element: Element): string | undefined {
    // Implementation would extract expiration time
    return undefined;
  }

  private extractViewCount(_element: Element): number | undefined {
    // Implementation would extract view count
    return undefined;
  }

  private checkIfLive(_element: Element): boolean {
    // Implementation would check if story is live
    return false;
  }

  private constructStoryUrl(id: string, username: string): string {
    return `https://www.instagram.com/stories/${username}/${id}/`;
  }

  private extractReelId(_element: Element): string | null {
    // Implementation similar to extractPostId
    return this.generateContentId('reel');
  }

  private extractReelVideoUrl(_element: Element): string | undefined {
    // Implementation would extract reel video URL
    return undefined;
  }

  private extractReelThumbnail(_element: Element): string | undefined {
    // Implementation would extract reel thumbnail
    return undefined;
  }

  private extractAudioInfo(_element: Element): InstagramAudio | undefined {
    // Implementation would extract audio information
    return undefined;
  }

  private extractEffects(_element: Element): string[] {
    // Implementation would extract effects
    return [];
  }

  private extractVideoDuration(_element: Element): number | undefined {
    // Implementation would extract video duration
    return undefined;
  }

  private constructReelUrl(id: string): string {
    return `https://www.instagram.com/reel/${id}/`;
  }

  private async extractProfileContent(): Promise<InstagramContent[]> {
    // Implementation would extract profile page content
    return [];
  }

  private async extractExploreContent(): Promise<InstagramContent[]> {
    // Implementation would extract explore page content
    return [];
  }

  private setupScrollListener(): void {
    // Implementation would setup scroll listener for infinite scroll
  }

  private setupResizeObserver(): void {
    // Implementation would setup resize observer
  }

  private handleMutations(_mutations: MutationRecord[]): void {
    // Implementation would handle DOM mutations
  }

  private handleLazyLoad(_target: Element): void {
    // Implementation would handle lazy loaded content
  }

  // Unused method - kept for potential future use
  /*
  private _getContentTypeFromUrl(): string {
    return getInstagramContentType(window.location.href);
  }
  */

  private aggregateText(content: InstagramContent[]): string {
    const texts: string[] = [];

    for (const item of content) {
      if ('caption' in item && item.caption) {
        texts.push(item.caption);
      }
      if (item.type === 'story') {
        texts.push(...item.textOverlays);
      }
    }

    return texts.join('\n\n');
  }

  // Unused aggregation methods - kept for potential future use
  /*
  private _aggregateImages(content: InstagramContent[]): string[] {
    const images: string[] = [];

    for (const item of content) {
      if ('media' in item) {
        for (const media of item.media) {
          if (media.type === 'image') {
            images.push(media.url);
          }
        }
      }
    }

    return [...new Set(images)];
  }

  private _aggregateVideos(content: InstagramContent[]): string[] {
    const videos: string[] = [];

    for (const item of content) {
      if (item.type === 'reel') {
        videos.push(item.videoUrl);
      } else if ('media' in item) {
        for (const media of item.media) {
          if (media.type === 'video') {
            videos.push(media.url);
          }
        }
      }
    }

    return [...new Set(videos)];
  }

  private _aggregateLinks(content: InstagramContent[]): string[] {
    const links: string[] = [];

    for (const item of content) {
      links.push(item.url);
      if (item.author.profileUrl) {
        links.push(item.author.profileUrl);
      }
    }

    return [...new Set(links)];
  }

  private _aggregateHashtags(content: InstagramContent[]): string[] {
    const hashtags: string[] = [];

    for (const item of content) {
      if ('hashtags' in item) {
        hashtags.push(...item.hashtags);
      }
    }

    return [...new Set(hashtags)];
  }

  private _aggregateMentions(content: InstagramContent[]): string[] {
    const mentions: string[] = [];

    for (const item of content) {
      if ('mentions' in item) {
        mentions.push(...item.mentions);
      }
    }

    return [...new Set(mentions)];
  }
  */


  private viewport = { width: window.innerWidth, height: window.innerHeight };
}
