/**
 * Dynamic Content Observer
 * Monitors DOM changes to detect new social media content
 * Automatically processes posts/tweets as they're loaded dynamically
 */

import { ContentExtractor } from '../extractors/contentExtractor';
import { indicatorManager } from '../indicators/indicatorManager';

interface ObserverConfig {
  rootSelector?: string;
  targetSelectors: string[];
  platform: string;
  debounceMs?: number;
  batchSize?: number;
  enabled?: boolean;
}

interface ProcessingQueue {
  elements: Element[];
  timeoutId?: ReturnType<typeof setTimeout>;
}

export class DynamicContentObserver {
  private observer: MutationObserver | null = null;
  private config: ObserverConfig;
  private processingQueue: ProcessingQueue = { elements: [] };
  private processedElements = new WeakSet<Element>();
  private isObserving = false;
  private performanceMonitor: PerformanceMonitor;

  constructor(config: ObserverConfig) {
    this.config = {
      debounceMs: 500,
      batchSize: 10,
      enabled: true,
      ...config
    };

    this.performanceMonitor = new PerformanceMonitor(config.platform);
    this.observer = new MutationObserver(this.handleMutations.bind(this));
  }

  /**
   * Start observing for new content
   */
  start(): void {
    if (this.isObserving || !this.config.enabled) {
      return;
    }

    const rootElement = this.config.rootSelector
      ? document.querySelector(this.config.rootSelector)
      : document.body;

    if (!rootElement) {
      console.warn(`Root element not found: ${this.config.rootSelector}`);
      setTimeout(() => this.start(), 1000); // Retry after 1 second
      return;
    }

    this.observer?.observe(rootElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-testid', 'role'], // Common dynamic content indicators
    });

    this.isObserving = true;
    console.debug(`Started observing ${this.config.platform} content`);

    // Process any existing content
    this.processExistingContent();
  }

  /**
   * Stop observing
   */
  stop(): void {
    if (!this.isObserving) {
      return;
    }

    this.observer?.disconnect();
    this.isObserving = false;
    this.clearProcessingQueue();

    console.debug(`Stopped observing ${this.config.platform} content`);
  }

  /**
   * Handle DOM mutations
   */
  private handleMutations(mutations: MutationRecord[]): void {
    const startTime = performance.now();
    const newElements: Element[] = [];

    for (const mutation of mutations) {
      // Handle added nodes
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            const matchingElements = this.findMatchingElements(element);
            newElements.push(...matchingElements);
          }
        });
      }

      // Handle attribute changes (e.g., lazy-loaded content)
      if (mutation.type === 'attributes' && mutation.target.nodeType === Node.ELEMENT_NODE) {
        const element = mutation.target as Element;
        if (this.isTargetElement(element) && !this.processedElements.has(element)) {
          newElements.push(element);
        }
      }
    }

    // Add unique elements to queue
    const uniqueNewElements = newElements.filter(el => !this.processedElements.has(el));
    if (uniqueNewElements.length > 0) {
      this.addToProcessingQueue(uniqueNewElements);
    }

    // Track performance
    const processingTime = performance.now() - startTime;
    this.performanceMonitor.recordMutationProcessing(processingTime, mutations.length);
  }

  /**
   * Find all matching elements within a node
   */
  private findMatchingElements(root: Element): Element[] {
    const elements: Element[] = [];

    // Check if root itself matches
    if (this.isTargetElement(root) && !this.processedElements.has(root)) {
      elements.push(root);
    }

    // Find all matching descendants
    for (const selector of this.config.targetSelectors) {
      const matches = root.querySelectorAll(selector);
      matches.forEach(el => {
        if (!this.processedElements.has(el)) {
          elements.push(el);
        }
      });
    }

    return elements;
  }

  /**
   * Check if element matches target selectors
   */
  private isTargetElement(element: Element): boolean {
    return this.config.targetSelectors.some(selector => {
      try {
        return element.matches(selector);
      } catch {
        // Invalid selector, skip
        return false;
      }
    });
  }

  /**
   * Add elements to processing queue with debouncing
   */
  private addToProcessingQueue(elements: Element[]): void {
    this.processingQueue.elements.push(...elements);

    // Clear existing timeout
    if (this.processingQueue.timeoutId) {
      clearTimeout(this.processingQueue.timeoutId);
    }

    // Set new timeout
    this.processingQueue.timeoutId = setTimeout(() => {
      this.processQueue();
    }, this.config.debounceMs);
  }

  /**
   * Process queued elements in batches
   */
  private async processQueue(): Promise<void> {
    const elements = this.processingQueue.elements.splice(0, this.config.batchSize!);

    if (elements.length === 0) {
      return;
    }

    const startTime = performance.now();

    for (const element of elements) {
      // Mark as processed immediately to avoid duplicates
      this.processedElements.add(element);

      try {
        await this.processElement(element);
      } catch (error) {
        console.error('Failed to process element:', error);
        // Remove from processed set to allow retry
        this.processedElements.delete(element);
      }
    }

    // Track performance
    const processingTime = performance.now() - startTime;
    this.performanceMonitor.recordBatchProcessing(processingTime, elements.length);

    // Process remaining elements if any
    if (this.processingQueue.elements.length > 0) {
      this.processingQueue.timeoutId = setTimeout(() => {
        this.processQueue();
      }, 100); // Short delay between batches
    }
  }

  /**
   * Process a single content element
   */
  private async processElement(element: Element): Promise<void> {
    // Skip if element is no longer in DOM
    if (!element.isConnected) {
      return;
    }

    // Extract content
    const extractor = new ContentExtractor();
    const content = await extractor.extract(element);

    if (!content || !content.content) {
      return;
    }

    // Send to background for analysis
    const response = await chrome.runtime.sendMessage({
      type: 'ANALYZE_CONTENT',
      payload: {
        content,
        platform: this.config.platform,
        url: window.location.href
      }
    });

    // Add indicator if credibility data is available
    if (response.success && response.data) {
      indicatorManager.showIndicator(content, response.data);
    }
  }

  /**
   * Process existing content on page
   */
  private processExistingContent(): void {
    const existingElements: Element[] = [];

    for (const selector of this.config.targetSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (!this.processedElements.has(el)) {
          existingElements.push(el);
        }
      });
    }

    if (existingElements.length > 0) {
      console.debug(`Found ${existingElements.length} existing elements to process`);
      this.addToProcessingQueue(existingElements);
    }
  }

  /**
   * Clear processing queue
   */
  private clearProcessingQueue(): void {
    if (this.processingQueue.timeoutId) {
      clearTimeout(this.processingQueue.timeoutId);
    }
    this.processingQueue.elements = [];
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ObserverConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Restart observer if running
    if (this.isObserving) {
      this.stop();
      this.start();
    }
  }

  /**
   * Get observer statistics
   */
  getStats(): {
    isObserving: boolean;
    processedCount: number;
    queuedCount: number;
    performance: any;
  } {
    return {
      isObserving: this.isObserving,
      processedCount: this.performanceMonitor.getProcessedCount(),
      queuedCount: this.processingQueue.elements.length,
      performance: this.performanceMonitor.getStats()
    };
  }
}

/**
 * Performance monitoring for the observer
 */
class PerformanceMonitor {
  private platform: string;
  private processedCount = 0;
  private mutationProcessingTimes: number[] = [];
  private batchProcessingTimes: number[] = [];
  private maxSamples = 100;

  constructor(platform: string) {
    this.platform = platform;
  }

  recordMutationProcessing(time: number, mutationCount: number): void {
    this.mutationProcessingTimes.push(time);
    if (this.mutationProcessingTimes.length > this.maxSamples) {
      this.mutationProcessingTimes.shift();
    }

    // Log slow processing
    if (time > 50) {
      console.warn(`Slow mutation processing on ${this.platform}: ${time}ms for ${mutationCount} mutations`);
    }
  }

  recordBatchProcessing(time: number, elementCount: number): void {
    this.batchProcessingTimes.push(time);
    this.processedCount += elementCount;

    if (this.batchProcessingTimes.length > this.maxSamples) {
      this.batchProcessingTimes.shift();
    }

    // Log slow processing
    if (time > 200) {
      console.warn(`Slow batch processing on ${this.platform}: ${time}ms for ${elementCount} elements`);
    }
  }

  getProcessedCount(): number {
    return this.processedCount;
  }

  getStats(): {
    avgMutationTime: number;
    avgBatchTime: number;
    totalProcessed: number;
  } {
    const avgMutationTime = this.mutationProcessingTimes.length > 0
      ? this.mutationProcessingTimes.reduce((a, b) => a + b, 0) / this.mutationProcessingTimes.length
      : 0;

    const avgBatchTime = this.batchProcessingTimes.length > 0
      ? this.batchProcessingTimes.reduce((a, b) => a + b, 0) / this.batchProcessingTimes.length
      : 0;

    return {
      avgMutationTime,
      avgBatchTime,
      totalProcessed: this.processedCount
    };
  }
}

/**
 * Factory function to create platform-specific observers
 */
export function createPlatformObserver(platform: string): DynamicContentObserver | null {
  const configs: Record<string, ObserverConfig> = {
    twitter: {
      platform: 'twitter',
      rootSelector: '[data-testid="primaryColumn"]',
      targetSelectors: [
        '[data-testid="tweet"]',
        'article[role="article"]',
        '[data-testid="cellInnerDiv"]'
      ],
      debounceMs: 300
    },
    instagram: {
      platform: 'instagram',
      rootSelector: 'main',
      targetSelectors: [
        'article',
        '[role="presentation"] > div > div',
        'div[class*="Post"]'
      ],
      debounceMs: 500
    },
    tiktok: {
      platform: 'tiktok',
      rootSelector: '#app',
      targetSelectors: [
        '[data-e2e="recommend-list-item-container"]',
        'div[class*="DivItemContainer"]',
        '[class*="video-feed-item"]'
      ],
      debounceMs: 400
    },
    facebook: {
      platform: 'facebook',
      rootSelector: '[role="main"]',
      targetSelectors: [
        '[data-pagelet*="FeedUnit"]',
        '[role="article"]',
        'div[class*="userContentWrapper"]'
      ],
      debounceMs: 500
    }
  };

  const config = configs[platform];
  if (!config) {
    return null;
  }

  return new DynamicContentObserver(config);
}
