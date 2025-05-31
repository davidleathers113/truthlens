import { Readability, isProbablyReaderable, ReadabilityResult } from '@mozilla/readability';
import { ContentAnalysis, CredibilityScore } from '@shared/types';

/**
 * Extracted content metadata for credibility analysis
 */
export interface ExtractedMetadata {
  title: string;
  author?: string;
  publishedDate?: Date;
  modifiedDate?: Date;
  siteName?: string;
  description?: string;
  canonicalUrl?: string;
  language?: string;
  keywords?: string[];
  schema?: Record<string, any>;
}

/**
 * Link analysis result for credibility assessment
 */
export interface LinkAnalysis {
  totalLinks: number;
  externalLinks: number;
  internalLinks: number;
  citationLinks: number;
  linkDensity: number;
  credibleDomains: string[];
  suspiciousDomains: string[];
  linkContexts: Array<{
    url: string;
    text: string;
    context: string;
    isCredible: boolean;
    isCitation: boolean;
  }>;
}

/**
 * Media content detection result
 */
export interface MediaContent {
  images: Array<{
    src: string;
    alt?: string;
    caption?: string;
    isRelevant: boolean;
    isLazyLoaded: boolean;
  }>;
  videos: Array<{
    src: string;
    type: string;
    title?: string;
    isEmbedded: boolean;
  }>;
  audio: Array<{
    src: string;
    title?: string;
  }>;
}

/**
 * Paywall detection result
 */
export interface PaywallDetection {
  hasPaywall: boolean;
  confidence: number;
  indicators: string[];
  availableContent: number; // percentage of content available
  previewLength: number; // characters available in preview
}

/**
 * Content extraction configuration
 */
export interface ExtractionConfig {
  maxProcessingTime: number; // milliseconds (default: 500)
  enablePaywallDetection: boolean;
  enableLinkAnalysis: boolean;
  enableMediaDetection: boolean;
  minContentLength: number; // characters
  preserveFormatting: boolean;
  enablePerformanceLogging: boolean;
}

/**
 * Generic content extractor for standard web pages and articles
 * Implements readability algorithm with advanced content analysis
 */
export class GenericExtractor {
  private readonly config: ExtractionConfig;
  private readonly performanceLog: Map<string, number> = new Map();

  constructor(config: Partial<ExtractionConfig> = {}) {
    this.config = {
      maxProcessingTime: 500,
      enablePaywallDetection: true,
      enableLinkAnalysis: true,
      enableMediaDetection: true,
      minContentLength: 100,
      preserveFormatting: false,
      enablePerformanceLogging: false,
      ...config,
    };
  }

  /**
   * Check if this extractor can handle the given URL and document
   */
  canHandle(url: string, document: Document): boolean {
    // Generic extractor can handle any standard web page
    // Return false for social media platforms or other specialized content
    const hostname = new URL(url).hostname.toLowerCase();
    
    // Skip social media platforms (handled by specialized extractors)
    const socialPlatforms = [
      'twitter.com', 'x.com', 'facebook.com', 'fb.com',
      'instagram.com', 'tiktok.com', 'youtube.com', 'youtu.be',
      'reddit.com', 'linkedin.com'
    ];
    
    if (socialPlatforms.some(platform => hostname.includes(platform))) {
      return false;
    }
    
    // Check if document has readable content
    try {
      return isProbablyReaderable(document);
    } catch (error) {
      console.warn('Error checking readability:', error);
      return true; // Default to true if check fails
    }
  }

  /**
   * Extract content from the current page
   */
  async extractPageContent(): Promise<ContentAnalysis> {
    const startTime = performance.now();
    
    try {
      // Create a deep clone to avoid modifying the original DOM
      const documentClone = document.cloneNode(true) as Document;
      
      // Check if document is suitable for readability processing
      if (!isProbablyReaderable(documentClone)) {
        this.logPerformance('readability_check', startTime);
        return this.createFallbackAnalysis();
      }

      // Extract main content using Readability algorithm
      const readabilityResult = await this.extractWithReadability(documentClone);
      
      // Extract metadata from various sources
      const metadata = await this.extractMetadata(documentClone);
      
      // Analyze links and citations
      const linkAnalysis = this.config.enableLinkAnalysis 
        ? await this.analyzeLinksCitations(documentClone, readabilityResult)
        : null;
      
      // Detect media content
      const mediaContent = this.config.enableMediaDetection
        ? await this.detectMediaContent(documentClone, readabilityResult)
        : null;
      
      // Check for paywall
      const paywallDetection = this.config.enablePaywallDetection
        ? await this.detectPaywall(documentClone)
        : null;
      
      // Clean and normalize content
      const cleanedContent = await this.cleanNormalizeContent(
        readabilityResult?.textContent || ''
      );

      const totalTime = performance.now() - startTime;
      this.logPerformance('total_extraction', startTime);
      
      // Check performance constraint
      if (totalTime > this.config.maxProcessingTime) {
        console.warn(`Content extraction exceeded time limit: ${totalTime}ms > ${this.config.maxProcessingTime}ms`);
      }

      return this.buildContentAnalysis({
        readabilityResult,
        metadata,
        linkAnalysis,
        mediaContent,
        paywallDetection,
        cleanedContent,
        extractionTime: totalTime,
      });

    } catch (error) {
      console.error('Generic content extraction failed:', error);
      this.logPerformance('extraction_error', startTime);
      return this.createErrorAnalysis(error);
    }
  }

  /**
   * SUBTASK 1: DOM Parsing and Initial Structure
   */
  private async extractWithReadability(documentClone: Document): Promise<ReadabilityResult | null> {
    const startTime = performance.now();
    
    try {
      const reader = new Readability(documentClone, {
        charThreshold: this.config.minContentLength,
        classesToPreserve: ['highlight', 'important', 'citation'],
        disableJSONLD: false,
        linkDensityModifier: 0,
        serializer: this.config.preserveFormatting 
          ? (el: Element) => el 
          : undefined,
      });

      const result = reader.parse();
      this.logPerformance('readability_parse', startTime);
      
      return result;
    } catch (error) {
      console.error('Readability parsing failed:', error);
      return null;
    }
  }

  /**
   * SUBTASK 2: Content Cleaning and Normalization
   */
  private async cleanNormalizeContent(content: string): Promise<string> {
    const startTime = performance.now();
    
    try {
      let cleaned = content;
      
      // Remove excessive whitespace
      cleaned = cleaned.replace(/\s+/g, ' ').trim();
      
      // Normalize Unicode characters
      cleaned = cleaned.normalize('NFKD');
      
      // Remove control characters
      cleaned = cleaned.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
      
      // Decode HTML entities
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = cleaned;
      cleaned = tempDiv.textContent || tempDiv.innerText || '';
      
      // Merge adjacent text nodes (handled by readability, but additional cleanup)
      cleaned = cleaned.replace(/(\r\n|\n|\r)/gm, ' ');
      
      this.logPerformance('content_cleaning', startTime);
      return cleaned;
    } catch (error) {
      console.error('Content cleaning failed:', error);
      return content; // Return original if cleaning fails
    }
  }

  /**
   * SUBTASK 3: Metadata Extraction
   */
  private async extractMetadata(documentClone: Document): Promise<ExtractedMetadata> {
    const startTime = performance.now();
    
    try {
      const metadata: ExtractedMetadata = {
        title: this.extractTitle(documentClone),
      };

      // Extract from meta tags
      const metaTags = documentClone.querySelectorAll('meta');
      metaTags.forEach(meta => {
        const name = meta.getAttribute('name') || meta.getAttribute('property');
        const content = meta.getAttribute('content');
        
        if (name && content) {
          switch (name.toLowerCase()) {
            case 'author':
            case 'article:author':
              metadata.author = content;
              break;
            case 'description':
            case 'og:description':
              metadata.description = content;
              break;
            case 'keywords':
              metadata.keywords = content.split(',').map(k => k.trim());
              break;
            case 'published_time':
            case 'article:published_time':
              metadata.publishedDate = new Date(content);
              break;
            case 'modified_time':
            case 'article:modified_time':
              metadata.modifiedDate = new Date(content);
              break;
            case 'site_name':
            case 'og:site_name':
              metadata.siteName = content;
              break;
            case 'og:locale':
              metadata.language = content;
              break;
          }
        }
      });

      // Extract canonical URL
      const canonical = documentClone.querySelector('link[rel="canonical"]');
      if (canonical) {
        metadata.canonicalUrl = canonical.getAttribute('href') || undefined;
      }

      // Extract JSON-LD structured data
      metadata.schema = this.extractJsonLdSchema(documentClone);

      // Fallback author extraction
      if (!metadata.author) {
        metadata.author = this.extractAuthorFallback(documentClone);
      }

      // Fallback date extraction
      if (!metadata.publishedDate) {
        metadata.publishedDate = this.extractDateFallback(documentClone);
      }

      this.logPerformance('metadata_extraction', startTime);
      return metadata;
    } catch (error) {
      console.error('Metadata extraction failed:', error);
      return { title: document.title || 'Unknown' };
    }
  }

  /**
   * SUBTASK 4: Link and Citation Analysis
   */
  private async analyzeLinksCitations(
    documentClone: Document, 
    readabilityResult: ReadabilityResult | null
  ): Promise<LinkAnalysis> {
    const startTime = performance.now();
    
    try {
      const contentArea = readabilityResult 
        ? this.createElementFromHtml(readabilityResult.content)
        : documentClone.body;
      
      const links = Array.from(contentArea.querySelectorAll('a[href]'));
      const currentDomain = window.location.hostname;
      
      const analysis: LinkAnalysis = {
        totalLinks: links.length,
        externalLinks: 0,
        internalLinks: 0,
        citationLinks: 0,
        linkDensity: 0,
        credibleDomains: [],
        suspiciousDomains: [],
        linkContexts: [],
      };

      // Credible domain patterns (news outlets, academic institutions)
      const crediblePatterns = [
        /\.edu$/,
        /\.gov$/,
        /\.org$/,
        /(reuters|bbc|ap|npr|cnn|nytimes|washingtonpost|theguardian|wsj)\.com/,
        /(nature|science|nejm|lancet)\.com/,
        /(pubmed|scholar\.google|arxiv)\.org/,
      ];

      for (const link of links) {
        const href = link.getAttribute('href');
        if (!href) continue;

        try {
          const url = new URL(href, window.location.href);
          const isExternal = url.hostname !== currentDomain;
          const linkText = link.textContent?.trim() || '';
          const context = this.getLinkContext(link);
          
          if (isExternal) {
            analysis.externalLinks++;
          } else {
            analysis.internalLinks++;
          }

          // Check if it's a citation
          const isCitation = this.isCitationLink(link, linkText, context);
          if (isCitation) {
            analysis.citationLinks++;
          }

          // Check domain credibility
          const isCredible = crediblePatterns.some(pattern => 
            pattern.test(url.hostname)
          );

          if (isCredible && !analysis.credibleDomains.includes(url.hostname)) {
            analysis.credibleDomains.push(url.hostname);
          }

          analysis.linkContexts.push({
            url: href,
            text: linkText,
            context,
            isCredible,
            isCitation,
          });

        } catch (urlError) {
          // Invalid URL, skip
          continue;
        }
      }

      // Calculate link density (links per paragraph)
      const paragraphs = contentArea.querySelectorAll('p');
      analysis.linkDensity = paragraphs.length > 0 
        ? analysis.totalLinks / paragraphs.length 
        : 0;

      this.logPerformance('link_analysis', startTime);
      return analysis;
    } catch (error) {
      console.error('Link analysis failed:', error);
      return {
        totalLinks: 0,
        externalLinks: 0,
        internalLinks: 0,
        citationLinks: 0,
        linkDensity: 0,
        credibleDomains: [],
        suspiciousDomains: [],
        linkContexts: [],
      };
    }
  }

  /**
   * SUBTASK 5: Image and Media Content Detection
   */
  private async detectMediaContent(
    documentClone: Document,
    readabilityResult: ReadabilityResult | null
  ): Promise<MediaContent> {
    const startTime = performance.now();
    
    try {
      const contentArea = readabilityResult 
        ? this.createElementFromHtml(readabilityResult.content)
        : documentClone.body;

      const mediaContent: MediaContent = {
        images: [],
        videos: [],
        audio: [],
      };

      // Extract images
      const images = Array.from(contentArea.querySelectorAll('img'));
      for (const img of images) {
        const src = img.getAttribute('src') || img.getAttribute('data-src');
        if (!src) continue;

        const alt = img.getAttribute('alt') || '';
        const caption = this.getImageCaption(img);
        const isRelevant = this.isRelevantImage(img, alt, caption);
        const isLazyLoaded = img.hasAttribute('data-src') || img.hasAttribute('loading');

        mediaContent.images.push({
          src,
          alt,
          caption,
          isRelevant,
          isLazyLoaded,
        });
      }

      // Extract videos
      const videos = Array.from(contentArea.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]'));
      for (const video of videos) {
        let src = '';
        let type = '';
        let title = '';
        let isEmbedded = false;

        if (video.tagName === 'VIDEO') {
          src = video.getAttribute('src') || '';
          type = 'video';
          title = video.getAttribute('title') || '';
        } else if (video.tagName === 'IFRAME') {
          src = video.getAttribute('src') || '';
          type = 'embedded';
          title = video.getAttribute('title') || '';
          isEmbedded = true;
        }

        if (src) {
          mediaContent.videos.push({
            src,
            type,
            title,
            isEmbedded,
          });
        }
      }

      // Extract audio
      const audioElements = Array.from(contentArea.querySelectorAll('audio'));
      for (const audio of audioElements) {
        const src = audio.getAttribute('src');
        if (src) {
          mediaContent.audio.push({
            src,
            title: audio.getAttribute('title') || '',
          });
        }
      }

      this.logPerformance('media_detection', startTime);
      return mediaContent;
    } catch (error) {
      console.error('Media detection failed:', error);
      return { images: [], videos: [], audio: [] };
    }
  }

  /**
   * SUBTASK 6: Paywall Detection and Handling
   */
  private async detectPaywall(documentClone: Document): Promise<PaywallDetection> {
    const startTime = performance.now();
    
    try {
      const indicators: string[] = [];
      let confidence = 0;
      let hasPaywall = false;
      let availableContent = 100;
      let previewLength = 0;

      // Common paywall indicators
      const paywallSelectors = [
        '[class*="paywall"]',
        '[id*="paywall"]',
        '[class*="subscription"]',
        '[class*="premium"]',
        '[class*="subscriber"]',
        '[aria-label*="subscribe"]',
        '.paid-content',
        '.subscription-required',
      ];

      // Check for paywall elements
      for (const selector of paywallSelectors) {
        const elements = documentClone.querySelectorAll(selector);
        if (elements.length > 0) {
          hasPaywall = true;
          confidence += 0.3;
          indicators.push(`Found paywall element: ${selector}`);
        }
      }

      // Check for common paywall text patterns
      const paywallKeywords = [
        'subscribe to continue reading',
        'this article is for subscribers only',
        'premium content',
        'subscriber exclusive',
        'sign up to read more',
        'this story continues for subscribers',
        'to access this article',
      ];

      const bodyText = documentClone.body.textContent?.toLowerCase() || '';
      for (const keyword of paywallKeywords) {
        if (bodyText.includes(keyword)) {
          hasPaywall = true;
          confidence += 0.2;
          indicators.push(`Found paywall keyword: ${keyword}`);
        }
      }

      // Check for blurred or fade-out content
      const fadeElements = documentClone.querySelectorAll('[style*="opacity"], [class*="fade"], [class*="blur"]');
      if (fadeElements.length > 0) {
        confidence += 0.1;
        indicators.push('Found fade/blur elements suggesting partial content');
      }

      // Estimate available content
      const totalText = bodyText.length;
      if (hasPaywall && totalText > 0) {
        // Try to find where content gets cut off
        const cutoffIndicators = ['...', '(continued)', 'read more', 'subscribe'];
        for (const indicator of cutoffIndicators) {
          const index = bodyText.lastIndexOf(indicator);
          if (index > 0) {
            previewLength = index;
            availableContent = Math.round((index / totalText) * 100);
            break;
          }
        }
      }

      // Normalize confidence
      confidence = Math.min(confidence, 1);

      this.logPerformance('paywall_detection', startTime);
      
      return {
        hasPaywall,
        confidence,
        indicators,
        availableContent,
        previewLength: previewLength || totalText,
      };
    } catch (error) {
      console.error('Paywall detection failed:', error);
      return {
        hasPaywall: false,
        confidence: 0,
        indicators: [],
        availableContent: 100,
        previewLength: 0,
      };
    }
  }

  // Helper methods for the subtasks...

  private extractTitle(document: Document): string {
    // Try multiple strategies for title extraction
    const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
    if (ogTitle) return ogTitle;

    const titleTag = document.querySelector('title')?.textContent;
    if (titleTag) return titleTag.trim();

    const h1 = document.querySelector('h1')?.textContent;
    if (h1) return h1.trim();

    return 'Unknown';
  }

  private extractJsonLdSchema(document: Document): Record<string, any> | undefined {
    try {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of scripts) {
        const content = script.textContent;
        if (content) {
          return JSON.parse(content);
        }
      }
    } catch (error) {
      console.warn('Failed to parse JSON-LD schema:', error);
    }
    return undefined;
  }

  private extractAuthorFallback(document: Document): string | undefined {
    // Check various author patterns
    const authorSelectors = [
      '[rel="author"]',
      '.author',
      '.byline',
      '.writer',
      '[class*="author"]',
      '[itemprop="author"]',
    ];

    for (const selector of authorSelectors) {
      const element = document.querySelector(selector);
      if (element?.textContent) {
        return element.textContent.trim();
      }
    }

    return undefined;
  }

  private extractDateFallback(document: Document): Date | undefined {
    // Check time elements and date patterns
    const timeElement = document.querySelector('time[datetime]');
    if (timeElement) {
      const datetime = timeElement.getAttribute('datetime');
      if (datetime) {
        return new Date(datetime);
      }
    }

    // Look for date patterns in text
    const datePatterns = [
      /(\d{1,2}\/\d{1,2}\/\d{4})/,
      /(\d{4}-\d{2}-\d{2})/,
      /(\w+ \d{1,2}, \d{4})/,
    ];

    const bodyText = document.body.textContent || '';
    for (const pattern of datePatterns) {
      const match = bodyText.match(pattern);
      if (match) {
        const date = new Date(match[1]);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    return undefined;
  }

  private createElementFromHtml(html: string): Element {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div;
  }

  private getLinkContext(link: Element): string {
    const parent = link.parentElement;
    if (!parent) return '';
    
    const context = parent.textContent || '';
    const linkStart = context.indexOf(link.textContent || '');
    const start = Math.max(0, linkStart - 50);
    const end = Math.min(context.length, linkStart + (link.textContent?.length || 0) + 50);
    
    return context.substring(start, end).trim();
  }

  private isCitationLink(link: Element, linkText: string, context: string): boolean {
    // Check for citation patterns
    const citationPatterns = [
      /^\[\d+\]$/,           // [1], [23], etc.
      /^see\s+/i,            // "see ..."
      /^according\s+to/i,    // "according to ..."
      /^source:/i,           // "source: ..."
      /^ref\s*:/i,           // "ref: ..."
    ];

    return citationPatterns.some(pattern => pattern.test(linkText.trim())) ||
           context.toLowerCase().includes('citation') ||
           context.toLowerCase().includes('reference');
  }

  private getImageCaption(img: Element): string | undefined {
    // Look for captions in various places
    const parent = img.parentElement;
    if (!parent) return undefined;

    // Check figcaption
    const figcaption = parent.querySelector('figcaption');
    if (figcaption) return figcaption.textContent?.trim();

    // Check caption class
    const caption = parent.querySelector('.caption, .image-caption');
    if (caption) return caption.textContent?.trim();

    return undefined;
  }

  private isRelevantImage(img: Element, alt: string, caption?: string): boolean {
    // Skip decorative images
    if (alt.toLowerCase().includes('decoration') || 
        alt.toLowerCase().includes('spacer') ||
        !alt) {
      return false;
    }

    // Check image size
    const width = parseInt(img.getAttribute('width') || '0');
    const height = parseInt(img.getAttribute('height') || '0');
    
    if (width > 0 && height > 0 && (width < 50 || height < 50)) {
      return false; // Too small, likely decorative
    }

    return true;
  }

  private logPerformance(operation: string, startTime: number): void {
    if (this.config.enablePerformanceLogging) {
      const duration = performance.now() - startTime;
      this.performanceLog.set(operation, duration);
      console.debug(`GenericExtractor: ${operation} took ${duration.toFixed(2)}ms`);
    }
  }

  private createFallbackAnalysis(): ContentAnalysis {
    return {
      url: window.location.href,
      title: document.title || 'Unknown',
      content: document.body.textContent?.substring(0, 1000) || '',
      type: 'article',
      analysis: {
        domain: window.location.hostname,
        credibility: {
          score: 50,
          level: 'unknown',
          confidence: 0.1,
          reasoning: 'Fallback analysis - content not suitable for readability processing',
          source: 'fallback',
          timestamp: Date.now(),
        },
      },
    };
  }

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

  private buildContentAnalysis({
    readabilityResult,
    metadata,
    linkAnalysis,
    mediaContent,
    paywallDetection,
    cleanedContent,
    extractionTime,
  }: {
    readabilityResult: ReadabilityResult | null;
    metadata: ExtractedMetadata;
    linkAnalysis: LinkAnalysis | null;
    mediaContent: MediaContent | null;
    paywallDetection: PaywallDetection | null;
    cleanedContent: string;
    extractionTime: number;
  }): ContentAnalysis {
    
    // Calculate initial credibility score based on extraction quality
    let credibilityScore = 50; // baseline
    let confidence = 0.5;
    const reasoningFactors: string[] = [];

    // Adjust based on content quality
    if (readabilityResult && readabilityResult.length > this.config.minContentLength) {
      credibilityScore += 10;
      confidence += 0.1;
      reasoningFactors.push('High-quality content extracted');
    }

    // Adjust based on metadata availability
    if (metadata.author && metadata.publishedDate) {
      credibilityScore += 10;
      confidence += 0.1;
      reasoningFactors.push('Complete metadata available');
    }

    // Adjust based on link analysis
    if (linkAnalysis && linkAnalysis.credibleDomains.length > 0) {
      credibilityScore += 15;
      confidence += 0.1;
      reasoningFactors.push(`${linkAnalysis.credibleDomains.length} credible sources linked`);
    }

    // Adjust based on paywall detection
    if (paywallDetection?.hasPaywall) {
      credibilityScore -= 5;
      reasoningFactors.push('Content may be incomplete due to paywall');
    }

    // Normalize score and confidence
    credibilityScore = Math.max(0, Math.min(100, credibilityScore));
    confidence = Math.max(0, Math.min(1, confidence));

    const level: 'high' | 'medium' | 'low' | 'unknown' = 
      credibilityScore >= 70 ? 'high' :
      credibilityScore >= 50 ? 'medium' :
      credibilityScore >= 30 ? 'low' : 'unknown';

    return {
      url: window.location.href,
      title: metadata.title,
      content: cleanedContent,
      type: 'article',
      analysis: {
        domain: window.location.hostname,
        credibility: {
          score: credibilityScore,
          level,
          confidence,
          reasoning: reasoningFactors.join('; '),
          source: 'ai',
          timestamp: Date.now(),
        },
        details: {
          extractionTime: `${extractionTime.toFixed(2)}ms`,
          contentLength: cleanedContent.length,
          hasReadabilityResult: !!readabilityResult,
          metadata,
          linkAnalysis,
          mediaContent,
          paywallDetection,
        } as any,
      },
    };
  }
}