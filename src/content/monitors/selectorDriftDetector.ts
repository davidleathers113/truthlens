/**
 * Selector Drift Detector
 * Monitors and adapts to changes in social media DOM structures
 * Provides fallback strategies when primary selectors fail
 */

import { StorageService } from '@shared/storage/storageService';

interface SelectorStrategy {
  name: string;
  selector: string;
  confidence: number;
  attributes?: string[];
  textPatterns?: RegExp[];
  structurePattern?: string;
}

interface PlatformSelectors {
  platform: string;
  contentType: string;
  strategies: SelectorStrategy[];
  lastUpdated: number;
  version: number;
}

interface DetectionResult {
  element: Element | null;
  strategy: string;
  confidence: number;
  fallbackUsed: boolean;
  telemetry: {
    attemptedStrategies: string[];
    successfulStrategy: string | null;
    detectionTime: number;
  };
}

interface DriftTelemetry {
  platform: string;
  timestamp: number;
  primarySelectorFailed: boolean;
  fallbackStrategy: string | null;
  confidence: number;
  pageUrl: string;
  userAgent: string;
}

export class SelectorDriftDetector {
  private storage: StorageService;
  private platformSelectors: Map<string, PlatformSelectors[]> = new Map();
  private telemetryQueue: DriftTelemetry[] = [];
  private telemetryBatchSize = 10;
  private telemetryInterval: number | null = null;

  constructor() {
    this.storage = new StorageService();
    this.initializeSelectors();
    this.startTelemetryReporting();
  }

  /**
   * Initialize platform-specific selector strategies
   */
  private initializeSelectors(): void {
    // Twitter/X selectors
    this.platformSelectors.set('twitter', [
      {
        platform: 'twitter',
        contentType: 'tweet',
        lastUpdated: Date.now(),
        version: 1,
        strategies: [
          {
            name: 'primary-testid',
            selector: '[data-testid="tweet"]',
            confidence: 1.0,
            attributes: ['data-testid']
          },
          {
            name: 'article-role',
            selector: 'article[role="article"]',
            confidence: 0.9,
            attributes: ['role']
          },
          {
            name: 'structure-based',
            selector: 'div[class*="css-"][tabindex="-1"]',
            confidence: 0.7,
            structurePattern: 'div>div>div>article'
          },
          {
            name: 'content-heuristic',
            selector: 'div',
            confidence: 0.5,
            textPatterns: [/^[\s\S]{10,500}$/],
            attributes: ['lang', 'dir']
          }
        ]
      },
      {
        platform: 'twitter',
        contentType: 'user-info',
        lastUpdated: Date.now(),
        version: 1,
        strategies: [
          {
            name: 'primary-link',
            selector: 'a[href^="/"][role="link"] span',
            confidence: 1.0
          },
          {
            name: 'username-pattern',
            selector: 'span:has-text(/^@[\\w]+$/)',
            confidence: 0.8,
            textPatterns: [/^@[\w]+$/]
          }
        ]
      }
    ]);

    // Instagram selectors
    this.platformSelectors.set('instagram', [
      {
        platform: 'instagram',
        contentType: 'post',
        lastUpdated: Date.now(),
        version: 1,
        strategies: [
          {
            name: 'article-tag',
            selector: 'article',
            confidence: 1.0
          },
          {
            name: 'role-presentation',
            selector: '[role="presentation"] > div',
            confidence: 0.8,
            attributes: ['role']
          },
          {
            name: 'class-pattern',
            selector: 'div[class*="_aa"]',
            confidence: 0.6,
            structurePattern: 'div>div>article'
          }
        ]
      }
    ]);

    // TikTok selectors
    this.platformSelectors.set('tiktok', [
      {
        platform: 'tiktok',
        contentType: 'video',
        lastUpdated: Date.now(),
        version: 1,
        strategies: [
          {
            name: 'data-e2e',
            selector: '[data-e2e="recommend-list-item-container"]',
            confidence: 1.0,
            attributes: ['data-e2e']
          },
          {
            name: 'class-based',
            selector: 'div[class*="DivItemContainer"]',
            confidence: 0.8
          },
          {
            name: 'video-wrapper',
            selector: 'div:has(video)',
            confidence: 0.6,
            structurePattern: 'div>div>video'
          }
        ]
      }
    ]);

    // Load any saved selector updates
    this.loadSavedSelectors();
  }

  /**
   * Detect content using multiple strategies
   */
  async detectContent(
    platform: string,
    contentType: string,
    context: Element | Document = document
  ): Promise<DetectionResult> {
    const startTime = performance.now();
    const platformConfigs = this.platformSelectors.get(platform);

    if (!platformConfigs) {
      return this.createFailureResult('Platform not supported', startTime);
    }

    const config = platformConfigs.find(c => c.contentType === contentType);
    if (!config) {
      return this.createFailureResult('Content type not supported', startTime);
    }

    const telemetry = {
      attemptedStrategies: [] as string[],
      successfulStrategy: null as string | null,
      detectionTime: 0
    };

    // Try each strategy in order of confidence
    for (const strategy of config.strategies) {
      telemetry.attemptedStrategies.push(strategy.name);

      try {
        const element = await this.tryStrategy(strategy, context);

        if (element && this.validateElement(element, strategy)) {
          telemetry.successfulStrategy = strategy.name;
          telemetry.detectionTime = performance.now() - startTime;

          // Report telemetry if fallback was used
          if (strategy !== config.strategies[0]) {
            this.reportDrift(platform, strategy.name, strategy.confidence);
          }

          return {
            element,
            strategy: strategy.name,
            confidence: strategy.confidence,
            fallbackUsed: strategy !== config.strategies[0],
            telemetry
          };
        }
      } catch (error) {
        console.debug(`Strategy ${strategy.name} failed:`, error);
      }
    }

    // All strategies failed
    telemetry.detectionTime = performance.now() - startTime;
    this.reportDrift(platform, null, 0);

    return {
      element: null,
      strategy: 'none',
      confidence: 0,
      fallbackUsed: true,
      telemetry
    };
  }

  /**
   * Try a specific selector strategy
   */
  private async tryStrategy(
    strategy: SelectorStrategy,
    context: Element | Document
  ): Promise<Element | null> {
    // Handle special selector syntax
    const selector = strategy.selector;
    if (selector.includes(':has-text')) {
      // Custom implementation for text matching
      const match = selector.match(/:has-text\((.+)\)/);
      if (match) {
        const pattern = new RegExp(match[1].slice(1, -1)); // Remove regex delimiters
        const baseSelector = selector.split(':has-text')[0];
        const elements = context.querySelectorAll(baseSelector);

        for (const el of elements) {
          if (pattern.test(el.textContent || '')) {
            return el;
          }
        }
        return null;
      }
    }

    // Handle :has() selector (CSS4, may need polyfill)
    if (selector.includes(':has(')) {
      try {
        return context.querySelector(selector);
      } catch {
        // Fallback for browsers without :has() support
        return this.polyfillHasSelector(selector, context);
      }
    }

    // Standard selector
    return context.querySelector(selector);
  }

  /**
   * Polyfill for :has() selector
   */
  private polyfillHasSelector(selector: string, context: Element | Document): Element | null {
    const match = selector.match(/(.+):has\((.+)\)/);
    if (!match) return null;

    const [, baseSelector, innerSelector] = match;
    const elements = context.querySelectorAll(baseSelector);

    for (const el of elements) {
      if (el.querySelector(innerSelector)) {
        return el;
      }
    }

    return null;
  }

  /**
   * Validate that the found element matches expected patterns
   */
  private validateElement(element: Element, strategy: SelectorStrategy): boolean {
    // Check attributes
    if (strategy.attributes) {
      for (const attr of strategy.attributes) {
        if (!element.hasAttribute(attr)) {
          return false;
        }
      }
    }

    // Check text patterns
    if (strategy.textPatterns) {
      const text = element.textContent || '';
      const matchesAnyPattern = strategy.textPatterns.some(pattern => pattern.test(text));
      if (!matchesAnyPattern) {
        return false;
      }
    }

    // Check structure pattern
    if (strategy.structurePattern) {
      const path = this.getElementPath(element);
      if (!path.includes(strategy.structurePattern)) {
        return false;
      }
    }

    // Basic content validation
    const hasReasonableContent = (element.textContent?.length || 0) > 10;
    const isVisible = element instanceof HTMLElement && element.offsetWidth > 0 && element.offsetHeight > 0;

    return hasReasonableContent && isVisible;
  }

  /**
   * Get element path for structure validation
   */
  private getElementPath(element: Element): string {
    const path: string[] = [];
    let current: Element | null = element;

    while (current && current !== document.body) {
      path.unshift(current.tagName.toLowerCase());
      current = current.parentElement;
    }

    return path.join('>');
  }

  /**
   * Report selector drift for telemetry
   */
  private reportDrift(
    platform: string,
    fallbackStrategy: string | null,
    confidence: number
  ): void {
    const telemetry: DriftTelemetry = {
      platform,
      timestamp: Date.now(),
      primarySelectorFailed: true,
      fallbackStrategy,
      confidence,
      pageUrl: window.location.href,
      userAgent: navigator.userAgent
    };

    this.telemetryQueue.push(telemetry);

    // Trigger batch send if queue is full
    if (this.telemetryQueue.length >= this.telemetryBatchSize) {
      this.sendTelemetryBatch();
    }
  }

  /**
   * Send telemetry batch to background
   */
  private async sendTelemetryBatch(): Promise<void> {
    if (this.telemetryQueue.length === 0) {
      return;
    }

    const batch = this.telemetryQueue.splice(0, this.telemetryBatchSize);

    try {
      await chrome.runtime.sendMessage({
        type: 'SELECTOR_DRIFT_TELEMETRY',
        payload: { batch }
      });
    } catch (error) {
      console.error('Failed to send telemetry:', error);
      // Re-add to queue for retry
      this.telemetryQueue.unshift(...batch);
    }
  }

  /**
   * Start periodic telemetry reporting
   */
  private startTelemetryReporting(): void {
    // Send telemetry every 5 minutes
    this.telemetryInterval = window.setInterval(() => {
      this.sendTelemetryBatch();
    }, 5 * 60 * 1000);
  }

  /**
   * Stop telemetry reporting
   */
  stopTelemetryReporting(): void {
    if (this.telemetryInterval) {
      clearInterval(this.telemetryInterval);
      this.telemetryInterval = null;
    }

    // Send any remaining telemetry
    this.sendTelemetryBatch();
  }

  /**
   * Load saved selector updates from storage
   */
  private async loadSavedSelectors(): Promise<void> {
    try {
      const saved = await this.storage.get('selectorUpdates');
      if (saved && typeof saved === 'object') {
        // Merge with default selectors
        Object.entries(saved).forEach(([platform, updates]) => {
          if (Array.isArray(updates)) {
            this.platformSelectors.set(platform, updates);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load saved selectors:', error);
    }
  }

  /**
   * Update selectors based on telemetry analysis
   */
  async updateSelectors(updates: Record<string, PlatformSelectors[]>): Promise<void> {
    Object.entries(updates).forEach(([platform, configs]) => {
      this.platformSelectors.set(platform, configs);
    });

    // Save to storage
    try {
      await this.storage.set('selectorUpdates', Object.fromEntries(this.platformSelectors));
    } catch (error) {
      console.error('Failed to save selector updates:', error);
    }
  }

  /**
   * Create failure result
   */
  private createFailureResult(_reason: string, startTime: number): DetectionResult {
    return {
      element: null,
      strategy: 'none',
      confidence: 0,
      fallbackUsed: true,
      telemetry: {
        attemptedStrategies: [],
        successfulStrategy: null,
        detectionTime: performance.now() - startTime
      }
    };
  }

  /**
   * Get detection statistics
   */
  getStats(): {
    platformStats: Map<string, { attempts: number; failures: number }>;
    telemetryQueueSize: number;
  } {
    // This would be enhanced with actual tracking
    return {
      platformStats: new Map(),
      telemetryQueueSize: this.telemetryQueue.length
    };
  }
}

// Export singleton instance
export const selectorDriftDetector = new SelectorDriftDetector();
