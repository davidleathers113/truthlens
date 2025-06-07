/**
 * Upgrade Prompts Hook
 * Manages upgrade prompt state and interactions following 2025 React patterns
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  upgradePromptManager,
  UpgradePromptConfig,
  PromptTrigger,
  PromptContext
} from '@shared/services/upgradePromptManager';
import { useSubscriptionManager } from './useSubscriptionManager';

export interface ActivePrompt extends UpgradePromptConfig {
  isVisible: boolean;
  context?: PromptContext;
}

export interface UpgradePromptsHook {
  activePrompt: ActivePrompt | null;
  isLoading: boolean;
  error?: string;
  actions: {
    triggerPrompt: (trigger: PromptTrigger, context?: PromptContext) => Promise<void>;
    dismissPrompt: () => Promise<void>;
    acceptPrompt: () => Promise<void>;
    hidePrompt: () => void;
    clearAllPrompts: () => Promise<void>;
  };
  analytics: {
    totalPrompts: number;
    conversions: number;
    conversionRate: number;
    topPerformingPrompts: Array<{
      promptId: string;
      displays: number;
      conversions: number;
      conversionRate: number;
    }>;
  };
}

export const useUpgradePrompts = (): UpgradePromptsHook => {
  const { subscription, usage } = useSubscriptionManager();

  const [activePrompt, setActivePrompt] = useState<ActivePrompt | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [analytics, setAnalytics] = useState<{
    totalPrompts: number;
    conversions: number;
    conversionRate: number;
    topPerformingPrompts: Array<{
      promptId: string;
      displays: number;
      conversions: number;
      conversionRate: number;
    }>;
  }>({
    totalPrompts: 0,
    conversions: 0,
    conversionRate: 0,
    topPerformingPrompts: []
  });

  // Load analytics on mount
  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const data = await upgradePromptManager.getPromptAnalytics();
        setAnalytics(data);
      } catch (err) {
        console.error('Failed to load prompt analytics:', err);
      }
    };

    loadAnalytics();
  }, []);

  // Auto-trigger prompts based on usage patterns
  useEffect(() => {
    if (subscription.tier !== 'free') return;

    const checkUsageThreshold = async () => {
      // Trigger usage threshold prompt at 80%
      if (usage.percentageUsed >= 80 && usage.percentageUsed < 100 && !usage.limitReached) {
        const context: PromptContext = {
          currentUsage: usage.dailyUsed,
          dailyLimit: usage.dailyLimit
        };

        const result = await upgradePromptManager.shouldShowPrompt('usage_threshold', context, subscription.tier);
        if (result.shouldShow && result.prompt) {
          setActivePrompt({
            ...result.prompt,
            isVisible: true,
            context
          });
        }
      }

      // Trigger limit reached prompt at 100%
      if (usage.limitReached) {
        const context: PromptContext = {
          currentUsage: usage.dailyUsed,
          dailyLimit: usage.dailyLimit
        };

        const result = await upgradePromptManager.shouldShowPrompt('limit_reached', context, subscription.tier);
        if (result.shouldShow && result.prompt) {
          setActivePrompt({
            ...result.prompt,
            isVisible: true,
            context
          });
        }
      }
    };

    // Check engagement milestone (weekly usage > 200)
    const checkEngagementMilestone = async () => {
      if (usage.weeklyTotal > 200) {
        const context: PromptContext = {
          userEngagement: {
            weeklyUsage: usage.weeklyTotal,
            streak: 7, // Could calculate actual streak
            favoriteFeatures: ['basic_credibility'] // Could track actual usage
          }
        };

        const result = await upgradePromptManager.shouldShowPrompt('engagement_milestone', context, subscription.tier);
        if (result.shouldShow && result.prompt) {
          setActivePrompt({
            ...result.prompt,
            isVisible: true,
            context
          });
        }
      }
    };

    checkUsageThreshold();
    checkEngagementMilestone();
  }, [subscription.tier, usage.percentageUsed, usage.limitReached, usage.dailyUsed, usage.dailyLimit, usage.weeklyTotal]);

  // Trigger a specific prompt
  const triggerPrompt = useCallback(async (trigger: PromptTrigger, context?: PromptContext) => {
    if (subscription.tier !== 'free') return;

    setIsLoading(true);
    setError(undefined);

    try {
      const result = await upgradePromptManager.shouldShowPrompt(trigger, context || {}, subscription.tier);

      if (result.shouldShow && result.prompt) {
        const promptWithContext = {
          ...result.prompt,
          isVisible: true,
          context
        };

        setActivePrompt(promptWithContext);

        // Record that prompt was displayed
        await upgradePromptManager.recordPromptDisplayed(result.prompt.id, context);

        // Update analytics
        const newAnalytics = await upgradePromptManager.getPromptAnalytics();
        setAnalytics(newAnalytics);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to trigger prompt';
      setError(errorMessage);
      console.error('Error triggering upgrade prompt:', err);
    } finally {
      setIsLoading(false);
    }
  }, [subscription.tier]);

  // Dismiss the current prompt
  const dismissPrompt = useCallback(async () => {
    if (!activePrompt) return;

    try {
      // Record dismissal
      await upgradePromptManager.recordPromptDismissed(activePrompt.id);

      // Hide prompt with animation delay
      setActivePrompt(prev => prev ? { ...prev, isVisible: false } : null);

      // Remove from state after animation
      setTimeout(() => {
        setActivePrompt(null);
      }, 300);

      // Update analytics
      const newAnalytics = await upgradePromptManager.getPromptAnalytics();
      setAnalytics(newAnalytics);
    } catch (err) {
      console.error('Error dismissing prompt:', err);
    }
  }, [activePrompt]);

  // Accept the prompt (user clicks upgrade)
  const acceptPrompt = useCallback(async () => {
    if (!activePrompt) return;

    try {
      // Record conversion
      await upgradePromptManager.recordPromptConversion(activePrompt.id);

      // Hide prompt
      setActivePrompt(prev => prev ? { ...prev, isVisible: false } : null);

      // Update analytics
      const newAnalytics = await upgradePromptManager.getPromptAnalytics();
      setAnalytics(newAnalytics);

      // Note: Actual upgrade logic would be handled by parent component
      // This hook only manages prompt state

    } catch (err) {
      console.error('Error recording prompt conversion:', err);
    }
  }, [activePrompt]);

  // Immediately hide prompt without recording dismissal
  const hidePrompt = useCallback(() => {
    setActivePrompt(prev => prev ? { ...prev, isVisible: false } : null);
    setTimeout(() => {
      setActivePrompt(null);
    }, 300);
  }, []);

  // Clear all prompts and history (for testing/admin)
  const clearAllPrompts = useCallback(async () => {
    try {
      await upgradePromptManager.cleanupOldHistory(0); // Remove all history
      setActivePrompt(null);
      setAnalytics({ totalPrompts: 0, conversions: 0, conversionRate: 0, topPerformingPrompts: [] });
    } catch (err) {
      console.error('Error clearing prompts:', err);
    }
  }, []);

  // Memoized actions for performance
  const actions = useMemo(() => ({
    triggerPrompt,
    dismissPrompt,
    acceptPrompt,
    hidePrompt,
    clearAllPrompts
  }), [triggerPrompt, dismissPrompt, acceptPrompt, hidePrompt, clearAllPrompts]);

  return {
    activePrompt,
    isLoading,
    error,
    actions,
    analytics
  };
};

// Specialized hooks for specific triggers
export const useFeatureUpgradePrompt = () => {
  const { actions } = useUpgradePrompts();

  return useCallback(async (attemptedFeature: string, domain?: string) => {
    const context: PromptContext = {
      attemptedFeature,
      blockedDomain: domain
    };

    await actions.triggerPrompt('premium_feature_attempt', context);
  }, [actions]);
};

export const useDomainRestrictedPrompt = () => {
  const { actions } = useUpgradePrompts();

  return useCallback(async (blockedDomain: string) => {
    const context: PromptContext = {
      blockedDomain
    };

    await actions.triggerPrompt('restricted_domain', context);
  }, [actions]);
};

export const useReturnUserPrompt = () => {
  const { actions } = useUpgradePrompts();

  return useCallback(async () => {
    await actions.triggerPrompt('return_user');
  }, [actions]);
};
