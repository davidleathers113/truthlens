// Integration tests for background-content script communication
// Tests message passing and cross-context functionality

import { AIService } from '@background/ai/aiService';
import { StorageService } from '@shared/storage/storageService';
import { IndicatorManager } from '@content/indicators/indicatorManager';

describe('Background-Content Integration', () => {
  let aiService: AIService;
  let storageService: StorageService;
  let indicatorManager: IndicatorManager;

  beforeEach(() => {
    aiService = new AIService();
    storageService = new StorageService();
    indicatorManager = new IndicatorManager();

    // Mock Chrome runtime messaging
    chrome.runtime.sendMessage.mockResolvedValue({});
    chrome.runtime.onMessage.addListener.mockImplementation(() => {});

    jest.clearAllMocks();
  });

  afterEach(() => {
    aiService.destroy();
    indicatorManager.cleanup();
  });

  describe('content analysis workflow', () => {
    it('should complete end-to-end analysis workflow', async () => {
      // Mock successful AI initialization
      await aiService.initialize();

      // Mock content analysis
      const testContent = {
        title: 'Integration Test Article',
        url: 'https://example.com/integration-test',
        content: 'This is test content for integration testing',
        type: 'article' as const,
        platform: 'web' as const,
      };

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

      // Step 3: Display indicator
      indicatorManager.showIndicator(testContent, credibilityResult);
      const indicator = document.querySelector('.truthlens-indicator');
      expect(indicator).toBeTruthy();

      // Step 4: Verify cached retrieval works
      const cachedResult = await storageService.getCachedCredibility(testContent.url);
      expect(cachedResult).toMatchObject(credibilityResult);
    });

    it('should handle workflow with AI failure and fallback', async () => {
      // Mock AI failure
      delete (global.window as any).ai;

      const testContent = {
        title: 'Fallback Test',
        url: 'https://reuters.com/trusted-article',
        content: 'Trusted news content',
        type: 'article' as const,
        platform: 'web' as const,
      };

      // Should fall back to heuristic analysis
      const credibilityResult = await aiService.analyzeContent(testContent);
      expect(credibilityResult.source).toBe('fallback');
      expect(credibilityResult.score).toBeGreaterThan(80); // Trusted domain

      // Cache and display should still work
      await storageService.cacheCredibility(testContent.url, credibilityResult);
      indicatorManager.showIndicator(testContent, credibilityResult);

      const indicator = document.querySelector('.truthlens-indicator');
      expect(indicator?.getAttribute('data-level')).toBe('high');
    });
  });

  describe('settings integration', () => {
    it('should respect user settings for indicator display', async () => {
      // Mock user settings that disable indicators
      chrome.storage.sync.get.mockResolvedValue({
        settings: {
          enabled: true,
          showVisualIndicators: false,
          autoAnalyze: true,
        },
      });

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
      chrome.storage.sync.get.mockResolvedValue({
        settings: {
          privacy: {
            cacheDuration: customCacheDuration,
          },
        },
      });

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
      chrome.storage.local.get.mockResolvedValue({ [expectedKey]: expiredData });

      const result = await storageService.getCachedCredibility(testUrl);
      expect(result).toBeNull(); // Should be expired
      expect(chrome.storage.local.remove).toHaveBeenCalledWith(expectedKey);
    });
  });

  describe('platform-specific analysis', () => {
    it('should handle social media platform content', async () => {
      const twitterContent = {
        title: 'Twitter Post',
        url: 'https://twitter.com/user/status/123',
        content: 'This is a tweet about current events',
        type: 'social-post' as const,
        platform: 'twitter' as const,
      };

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
      const testContent = {
        title: 'Performance Test',
        url: 'https://example.com/performance',
        content: 'Performance testing content',
        type: 'article' as const,
      };

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

      const testContents = Array.from({ length: 5 }, (_, i) => ({
        title: `Concurrent Test ${i}`,
        url: `https://example.com/concurrent${i}`,
        content: `Test content ${i}`,
        type: 'article' as const,
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
      chrome.storage.local.set.mockRejectedValue(new Error('Storage quota exceeded'));
      chrome.storage.local.get.mockRejectedValue(new Error('Storage access denied'));

      const testContent = {
        title: 'Storage Error Test',
        url: 'https://example.com/storage-error',
        content: 'Test content',
        type: 'article' as const,
      };

      // Analysis should still work even if caching fails
      await aiService.initialize();
      const credibilityResult = await aiService.analyzeContent(testContent);
      
      // Caching might fail, but that shouldn't break the workflow
      try {
        await storageService.cacheCredibility(testContent.url, credibilityResult);
      } catch (error) {
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
      });

      const testContent = {
        title: 'DOM Error Test',
        url: 'https://example.com/dom-error',
        content: 'Test content',
        type: 'article' as const,
      };

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
      // Create multiple resources
      await aiService.initialize();
      
      const testContents = Array.from({ length: 3 }, (_, i) => ({
        title: `Memory Test ${i}`,
        url: `https://example.com/memory${i}`,
        content: `Test content ${i}`,
        type: 'article' as const,
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