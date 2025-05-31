import { useState, useEffect, useCallback } from 'react';

// Generic storage hook for Chrome extension storage
export function useStorage<T>(
  key: string,
  defaultValue: T,
  storageArea: 'local' | 'sync' = 'local'
): [T, (value: T) => Promise<void>, boolean, string | null] {
  const [storedValue, setStoredValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get storage area
  const storage = storageArea === 'local' ? chrome.storage.local : chrome.storage.sync;

  // Load value from storage
  useEffect(() => {
    const loadStoredValue = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await storage.get(key);

        if (result[key] !== undefined) {
          setStoredValue(result[key]);
        }
      } catch (err) {
        setError(`Failed to load ${key}: ${err}`);
        console.error('Storage load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadStoredValue();
  }, [key, storage]);

  // Listen for storage changes
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes[key]) {
        setStoredValue(changes[key].newValue || defaultValue);
      }
    };

    storage.onChanged.addListener(handleStorageChange);
    return () => storage.onChanged.removeListener(handleStorageChange);
  }, [key, defaultValue, storage]);

  // Set value in storage
  const setValue = useCallback(async (value: T) => {
    try {
      setError(null);
      await storage.set({ [key]: value });
      setStoredValue(value);
    } catch (err) {
      setError(`Failed to save ${key}: ${err}`);
      console.error('Storage save error:', err);
      throw err;
    }
  }, [key, storage]);

  return [storedValue, setValue, loading, error];
}

// Specialized hook for user settings
export function useUserSettings() {
  return useStorage('userSettings', {
    enabled: true,
    showVisualIndicators: true,
    indicatorPosition: 'top-right' as const,
    factCheckingLevel: 'standard' as const,
    autoAnalyze: true,
    trustedDomains: [] as string[],
    blockedDomains: [] as string[],
    theme: 'auto' as const,
    notifications: {
      enabled: true,
      lowCredibilityAlert: true,
      factCheckComplete: false,
    },
    privacy: {
      analyticsEnabled: true,
      localProcessingOnly: false,
      cacheDuration: 24,
    },
  });
}

// Hook for extension statistics
export function useStats() {
  return useStorage('extensionStats', {
    checksPerformed: 0,
    sitesAnalyzed: 0,
    lastAnalysisDate: null as string | null,
    weeklyChecks: 0,
    monthlyChecks: 0,
    averageCredibilityScore: 0,
    flaggedSites: 0,
    totalTimeUsed: 0, // in minutes
  });
}

// Hook for user subscription info
export function useSubscription() {
  return useStorage('userSubscription', {
    tier: 'free' as const,
    expiresAt: null as number | null,
    features: ['basic-analysis'] as string[],
    trialEndDate: null as number | null,
    isTrialActive: false,
  });
}

// Hook for application preferences
export function usePreferences() {
  return useStorage('appPreferences', {
    welcomeShown: false,
    lastViewedTab: 'main' as string,
    dismissedPromotions: [] as string[],
    keyboardShortcutsEnabled: true,
    animationsEnabled: true,
    compactMode: false,
    showTooltips: true,
  });
}
