// Unit tests for StorageService
// Tests Chrome storage operations and caching logic

import { StorageService } from '@shared/storage/storageService';
import { UserSettings, CredibilityScore } from '@shared/types';
import { setupTestEnvironment } from '../utils/testHelpers';

describe('StorageService', () => {
  let storageService: StorageService;
  let testEnv: ReturnType<typeof setupTestEnvironment>;

  beforeEach(() => {
    testEnv = setupTestEnvironment();
    storageService = new StorageService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    testEnv.cleanup();
  });

  describe('settings management', () => {
    it('should return default settings when none exist', async () => {
      // Mock empty storage
      (chrome.storage.sync.get as jest.Mock).mockResolvedValue({});

      const settings = await storageService.getSettings();
      
      expect(settings).toMatchObject({
        enabled: true,
        showVisualIndicators: true,
        indicatorPosition: 'top-right',
        factCheckingLevel: 'standard',
        autoAnalyze: true,
        trustedDomains: [],
        blockedDomains: [],
        theme: 'auto',
        notifications: {
          enabled: true,
          lowCredibilityAlert: true,
          factCheckComplete: false,
        },
        privacy: {
          analyticsEnabled: false,
          localProcessingOnly: true,
          cacheDuration: 24,
        },
      });
    });

    it('should merge existing settings with defaults', async () => {
      const existingSettings = {
        enabled: false,
        theme: 'dark',
      };
      chrome.storage.sync.get.mockResolvedValue({ settings: existingSettings });

      const settings = await storageService.getSettings();
      
      expect(settings.enabled).toBe(false);
      expect(settings.theme).toBe('dark');
      expect(settings.showVisualIndicators).toBe(true); // Default value
    });

    it('should update settings correctly', async () => {
      const currentSettings: UserSettings = {
        enabled: true,
        showVisualIndicators: true,
        indicatorPosition: 'top-right',
        factCheckingLevel: 'standard',
        autoAnalyze: true,
        trustedDomains: [],
        blockedDomains: [],
        theme: 'auto',
        notifications: {
          enabled: true,
          lowCredibilityAlert: true,
          factCheckComplete: false,
        },
        privacy: {
          analyticsEnabled: false,
          localProcessingOnly: true,
          cacheDuration: 24,
        },
      };

      chrome.storage.sync.get.mockResolvedValue({ settings: currentSettings });

      const updates = {
        theme: 'dark' as const,
        factCheckingLevel: 'advanced' as const,
      };

      await storageService.updateSettings(updates);

      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        settings: {
          ...currentSettings,
          ...updates,
        },
      });
    });
  });

  describe('credibility caching', () => {
    const mockCredibility: CredibilityScore = {
      score: 75,
      level: 'medium',
      confidence: 0.8,
      reasoning: 'Test analysis',
      source: 'ai',
      timestamp: Date.now(),
    };

    const testUrl = 'https://example.com/article';

    it('should cache credibility scores', async () => {
      await storageService.cacheCredibility(testUrl, mockCredibility);

      const expectedKey = `cache_${(storageService as any).hashUrl(testUrl)}`;
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        [expectedKey]: mockCredibility,
      });
    });

    it('should retrieve cached credibility within cache duration', async () => {
      const recentTimestamp = Date.now() - 1000; // 1 second ago
      const cachedData = { ...mockCredibility, timestamp: recentTimestamp };
      
      const expectedKey = `cache_${(storageService as any).hashUrl(testUrl)}`;
      chrome.storage.local.get.mockResolvedValue({ [expectedKey]: cachedData });

      // Mock settings with 24-hour cache
      chrome.storage.sync.get.mockResolvedValue({
        settings: { privacy: { cacheDuration: 24 } },
      });

      const result = await storageService.getCachedCredibility(testUrl);
      
      expect(result).toEqual(cachedData);
    });

    it('should return null for expired cache', async () => {
      const expiredTimestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
      const expiredData = { ...mockCredibility, timestamp: expiredTimestamp };
      
      const expectedKey = `cache_${(storageService as any).hashUrl(testUrl)}`;
      chrome.storage.local.get.mockResolvedValue({ [expectedKey]: expiredData });

      // Mock settings with 24-hour cache
      chrome.storage.sync.get.mockResolvedValue({
        settings: { privacy: { cacheDuration: 24 } },
      });

      const result = await storageService.getCachedCredibility(testUrl);
      
      expect(result).toBeNull();
      expect(chrome.storage.local.remove).toHaveBeenCalledWith(expectedKey);
    });

    it('should return null for non-existent cache', async () => {
      chrome.storage.local.get.mockResolvedValue({});

      const result = await storageService.getCachedCredibility(testUrl);
      
      expect(result).toBeNull();
    });
  });

  describe('subscription management', () => {
    it('should return default subscription when none exists', async () => {
      chrome.storage.sync.get.mockResolvedValue({});

      const subscription = await storageService.getSubscription();
      
      expect(subscription).toEqual({
        tier: 'free',
        features: ['basic'],
      });
    });

    it('should return stored subscription', async () => {
      const storedSubscription = {
        tier: 'premium',
        features: ['basic', 'advanced', 'priority'],
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      };

      chrome.storage.sync.get.mockResolvedValue({ subscription: storedSubscription });

      const subscription = await storageService.getSubscription();
      
      expect(subscription).toEqual(storedSubscription);
    });
  });

  describe('cache management', () => {
    it('should clear all cache entries', async () => {
      const mockItems = {
        'cache_abc123': { score: 80 },
        'cache_def456': { score: 60 },
        'settings': { enabled: true },
        'subscription': { tier: 'free' },
      };

      chrome.storage.local.get.mockResolvedValue(mockItems);

      await storageService.clearCache();

      expect(chrome.storage.local.remove).toHaveBeenCalledWith([
        'cache_abc123',
        'cache_def456',
      ]);
    });
  });

  describe('URL hashing', () => {
    it('should generate consistent hashes for same URL', () => {
      const url = 'https://example.com/test';
      const hash1 = (storageService as any).hashUrl(url);
      const hash2 = (storageService as any).hashUrl(url);
      
      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for different URLs', () => {
      const url1 = 'https://example.com/test1';
      const url2 = 'https://example.com/test2';
      
      const hash1 = (storageService as any).hashUrl(url1);
      const hash2 = (storageService as any).hashUrl(url2);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('performance', () => {
    it('should complete storage operations within performance targets', async () => {
      chrome.storage.sync.get.mockResolvedValue({});
      chrome.storage.sync.set.mockResolvedValue();

      const startTime = performance.now();
      await storageService.updateSettings({ theme: 'dark' });
      const endTime = performance.now();

      // Storage operations should be fast (<100ms)
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});