import { jest } from '@jest/globals';
// Integration tests for background-content script communication
// Tests message passing and cross-context functionality

// Mock logger to avoid errors
jest.mock('@shared/services/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }
}));

import { AIService } from '@background/ai/aiService';
import { StorageService } from '@shared/storage/storageService';
import { IndicatorManager } from '@content/indicators/indicatorManager';
import type { ContentAnalysis, SourceAnalysis } from '@shared/types';

describe('Background-Content Integration', () => {
  let aiService: AIService;
  let storageService: StorageService;
  let indicatorManager: IndicatorManager;
  let originalGetBoundingClientRect: any;

  // Helper to create valid ContentAnalysis objects
  const createTestContent = (overrides: Partial<ContentAnalysis> = {}): ContentAnalysis => {
    const defaultAnalysis: SourceAnalysis = {
      domain: 'example.com',
      credibility: {
        score: 75,
        level: 'high',
        confidence: 0.8,
        reasoning: 'Test credibility analysis',
        source: 'ai',
        timestamp: Date.now()
      },
      bias: {
        level: 'center',
        confidence: 0.7,
        indicators: []
      },
      factualReporting: 'high'
    };

    return {
      title: 'Test Article',
      url: 'https://example.com/test',
      content: 'Test content',
      type: 'article',
      ...overrides,
      analysis: { ...defaultAnalysis, ...(overrides.analysis || {}) }
    };
  };

  beforeEach(() => {
    // Store the original getBoundingClientRect
    originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;

    // Ensure window.ai is properly mocked before creating services
    if (!(global.window as any).ai) {
      (global.window as any).ai = {
        languageModel: {
          availability: jest.fn(() => Promise.resolve('readily')),
          create: jest.fn(() => Promise.resolve({
            prompt: jest.fn(() => Promise.resolve('{"score":75,"level":"high","confidence":0.8,"reasoning":"Test analysis","biasIndicators":[]}')),
            destroy: jest.fn(),
          })),
        },
        summarizer: {
          availability: jest.fn(() => Promise.resolve('readily')),
          create: jest.fn(() => Promise.resolve({
            summarize: jest.fn(() => Promise.resolve('Test summary content')),
            destroy: jest.fn(),
          })),
        },
      };
    }

    aiService = new AIService();
    storageService = new StorageService();
    indicatorManager = new IndicatorManager();

    // Mock Chrome runtime messaging
    (chrome.runtime.sendMessage as jest.MockedFunction<typeof chrome.runtime.sendMessage>).mockImplementation(() => Promise.resolve({}));
    (chrome.runtime.onMessage.addListener as unknown as jest.Mock).mockImplementation(() => {});

    // Reset storage mocks to default behavior
    (chrome.storage.local.get as jest.MockedFunction<typeof chrome.storage.local.get>).mockImplementation(() => Promise.resolve({}));
    (chrome.storage.local.set as jest.MockedFunction<typeof chrome.storage.local.set>).mockImplementation(() => Promise.resolve());
    (chrome.storage.local.remove as jest.MockedFunction<typeof chrome.storage.local.remove>).mockImplementation(() => Promise.resolve());

    jest.clearAllMocks();
  });

  afterEach(() => {
    aiService.destroy();
    indicatorManager.cleanup();

    // Restore the original getBoundingClientRect
    Object.defineProperty(Element.prototype, 'getBoundingClientRect', {
      value: originalGetBoundingClientRect,
      configurable: true,
      writable: true,
    });
  });

  describe('content analysis workflow', () => {
    it('should complete end-to-end analysis workflow', async () => {
      // Create a DOM element for the indicator to attach to
      document.body.innerHTML = '<main>Main content area</main>';

      // Mock successful AI initialization
      await aiService.initialize();

      // Mock content analysis
      const testContent = createTestContent({
        title: 'Integration Test Article',
        url: 'https://example.com/integration-test',
        content: 'This is test content for integration testing',
        type: 'article',
      });

      // Step 1: Analyze content
      const credibilityResult = await aiService.analyzeContent(testContent);
      expect(credibilityResult).toMatchObject({
        score: expect.any(Number),
        level: expect.stringMatching(/^(high|medium|low|unknown)$/),
        source: 'ai',
      });

      // Step 2: Cache the result
      await storageService.cacheCredibility(testContent.url, credibilityResult);
      expect(chrome.storage.local.set).toHaveBeenCalled();

      // Mock the cached data for retrieval
      const expectedKey = `cache_${(storageService as any).hashUrl(testContent.url)}`;
      (chrome.storage.local.get as jest.MockedFunction<typeof chrome.storage.local.get>).mockImplementation((keys) => {
        if (keys === expectedKey || (Array.isArray(keys) && keys.includes(expectedKey))) {
          return Promise.resolve({ [expectedKey]: credibilityResult });
        }
        return Promise.resolve({});
      });

      // Step 3: Display indicator
      indicatorManager.showIndicator(testContent, credibilityResult);
      const indicator = document.querySelector('.truthlens-indicator');
      expect(indicator).toBeTruthy();

      // Step 4: Verify cached retrieval works
      const cachedResult = await storageService.getCachedCredibility(testContent.url);
      expect(cachedResult).toMatchObject(credibilityResult);
    });

    it('should handle workflow with AI failure and fallback', async () => {
      // Create a DOM element for the indicator to attach to
      document.body.innerHTML = '<main>Main content area</main>';

      // Mock AI failure
      delete (global.window as any).ai;

      const testContent = createTestContent({
        title: 'Fallback Test',
        url: 'https://reuters.com/trusted-article',
        content: 'Trusted news content',
        type: 'article',
      });

      // Should fall back to heuristic analysis
      const credibilityResult = await aiService.analyzeContent(testContent);
      expect(credibilityResult.source).toBe('fallback');
      expect(credibilityResult.score).toBeGreaterThan(80); // Trusted domain

      // Cache and display should still work
      await storageService.cacheCredibility(testContent.url, credibilityResult);
      indicatorManager.showIndicator(testContent, credibilityResult);

      const indicator = document.querySelector('.truthlens-indicator');
      expect(indicator).toBeTruthy();
      expect(indicator?.getAttribute('data-level')).toBe('high');
    });
  });

  describe('settings integration', () => {
    it('should respect user settings for indicator display', async () => {
      // Mock user settings that disable indicators
      (chrome.storage.sync.get as jest.MockedFunction<typeof chrome.storage.sync.get>).mockImplementation(() => Promise.resolve({
        settings: {
          enabled: true,
          showVisualIndicators: false,
          autoAnalyze: true,
        },
      }));

      const settings = await storageService.getSettings();
      expect(settings.showVisualIndicators).toBe(false);

      // Indicators should be hidden when disabled
      if (!settings.showVisualIndicators) {
        // Skip indicator display
        const indicators = document.querySelectorAll('.truthlens-indicator');
        expect(indicators.length).toBe(0);
      }
    });

    it('should use custom cache duration from settings', async () => {
      const customCacheDuration = 12; // 12 hours
      (chrome.storage.sync.get as jest.MockedFunction<typeof chrome.storage.sync.get>).mockImplementation(() => Promise.resolve({
        settings: {
          privacy: {
            cacheDuration: customCacheDuration,
          },
        },
      }));

      const testUrl = 'https://example.com/test';
      const expiredTimestamp = Date.now() - (customCacheDuration + 1) * 60 * 60 * 1000;
      const expiredData = {
        score: 80,
        level: 'high',
        confidence: 0.9,
        reasoning: 'Test',
        source: 'ai',
        timestamp: expiredTimestamp,
      };

      const expectedKey = `cache_${(storageService as any).hashUrl(testUrl)}`;
      (chrome.storage.local.get as jest.MockedFunction<typeof chrome.storage.local.get>).mockImplementation(() => Promise.resolve({ [expectedKey]: expiredData }));

      const result = await storageService.getCachedCredibility(testUrl);
      expect(result).toBeNull(); // Should be expired
      expect(chrome.storage.local.remove).toHaveBeenCalledWith(expectedKey);
    });
  });

  describe('platform-specific analysis', () => {
    it('should handle social media platform content', async () => {
      const twitterContent = createTestContent({
        title: 'Twitter Post',
        url: 'https://twitter.com/user/status/123',
        content: 'This is a tweet about current events',
        type: 'social-post' as const,
        platform: 'twitter' as const,
      });

      // Mock Twitter-specific DOM
      document.body.innerHTML = '<div data-testid="tweet">Tweet content</div>';

      await aiService.initialize();
      const credibilityResult = await aiService.analyzeContent(twitterContent);

      indicatorManager.showIndicator(twitterContent, credibilityResult);

      // Should find and target Twitter-specific element
      const indicator = document.querySelector('.truthlens-indicator');
      expect(indicator).toBeTruthy();
    });
  });

  describe('performance integration', () => {
    it('should complete full workflow within performance target', async () => {
      const testContent = createTestContent({
        title: 'Performance Test',
        url: 'https://example.com/performance',
        content: 'Performance testing content',
        type: 'article'
      });

      const startTime = performance.now();

      // Full workflow: analyze, cache, display
      await aiService.initialize();
      const credibilityResult = await aiService.analyzeContent(testContent);
      await storageService.cacheCredibility(testContent.url, credibilityResult);
      indicatorManager.showIndicator(testContent, credibilityResult);

      const endTime = performance.now();

      // Full workflow should complete within 1.5 seconds
      expect(endTime - startTime).toBeLessThan(1500);
    });

    it('should handle concurrent analysis requests', async () => {
      await aiService.initialize();

      const testContents = Array.from({ length: 5 }, (_, i) => createTestContent({
        title: `Concurrent Test ${i}`,
        url: `https://example.com/concurrent${i}`,
        content: `Test content ${i}`,
        type: 'article'
      }));

      const startTime = performance.now();

      // Analyze multiple pieces of content concurrently
      const results = await Promise.all(
        testContents.map(content => aiService.analyzeContent(content))
      );

      const endTime = performance.now();

      // Concurrent analysis should be efficient
      expect(results).toHaveLength(5);
      expect(endTime - startTime).toBeLessThan(2000); // 2 seconds for 5 analyses
    });
  });

  describe('error handling integration', () => {
    it('should gracefully handle storage failures', async () => {
      // Create a DOM element for the indicator to attach to
      document.body.innerHTML = '<main>Main content area</main>';

      (chrome.storage.local.set as jest.MockedFunction<typeof chrome.storage.local.set>).mockImplementation(() => Promise.reject(new Error('Storage quota exceeded')));
      (chrome.storage.local.get as jest.MockedFunction<typeof chrome.storage.local.get>).mockImplementation(() => Promise.reject(new Error('Storage access denied')));

      const testContent = createTestContent({
        title: 'Storage Error Test',
        url: 'https://example.com/storage-error',
        content: 'Test content',
        type: 'article'
      });

      // Analysis should still work even if caching fails
      await aiService.initialize();
      const credibilityResult = await aiService.analyzeContent(testContent);

      // Caching might fail, but that shouldn't break the workflow
      try {
        await storageService.cacheCredibility(testContent.url, credibilityResult);
      } catch {
        // Expected to fail
      }

      // Display should still work
      indicatorManager.showIndicator(testContent, credibilityResult);
      const indicator = document.querySelector('.truthlens-indicator');
      expect(indicator).toBeTruthy();
    });

    it('should handle DOM manipulation errors gracefully', async () => {
      // Mock DOM that might cause positioning errors
      Object.defineProperty(Element.prototype, 'getBoundingClientRect', {
        value: jest.fn(() => {
          throw new Error('DOM access error');
        }),
        configurable: true,
        writable: true,
      });

      const testContent = createTestContent({
        title: 'DOM Error Test',
        url: 'https://example.com/dom-error',
        content: 'Test content',
        type: 'article'
      });

      const credibilityResult = {
        score: 80,
        level: 'high' as const,
        confidence: 0.9,
        reasoning: 'Test',
        source: 'ai' as const,
        timestamp: Date.now(),
      };

      // Should not throw even if positioning fails
      expect(() => {
        indicatorManager.showIndicator(testContent, credibilityResult);
      }).not.toThrow();
    });
  });

  describe('memory management integration', () => {
    it('should properly clean up all resources', async () => {
      // Create a DOM element for the indicator to attach to
      document.body.innerHTML = '<main>Main content area</main>';

      // Create multiple resources
      await aiService.initialize();

      const testContents = Array.from({ length: 3 }, (_, i) => createTestContent({
        title: `Memory Test ${i}`,
        url: `https://example.com/memory${i}`,
        content: `Test content ${i}`,
        type: 'article'
      }));

      for (const content of testContents) {
        const credibility = await aiService.analyzeContent(content);
        await storageService.cacheCredibility(content.url, credibility);
        indicatorManager.showIndicator(content, credibility);
      }

      // Verify resources were created
      expect(document.querySelectorAll('.truthlens-indicator').length).toBe(3);

      // Clean up all resources
      aiService.destroy();
      indicatorManager.cleanup();

      // Verify cleanup
      expect(document.querySelectorAll('.truthlens-indicator').length).toBe(0);
    });
  });
});
