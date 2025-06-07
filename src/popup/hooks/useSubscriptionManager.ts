/**
 * Enhanced Subscription Management Hook
 * Following 2025 React patterns for subscription status and usage tracking
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { subscriptionManager, usageTracker, featureGate } from '@shared/services';
import { SubscriptionTier, SubscriptionStatus } from '@shared/types';

export interface SubscriptionState {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  isValid: boolean;
  isLoading: boolean;
  error?: string;
  daysUntilExpiry?: number;
  gracePeriodDaysRemaining?: number;
  features: string[];
  needsValidation: boolean;
}

export interface UsageState {
  dailyUsed: number;
  dailyLimit: number;
  dailyRemaining: number;
  percentageUsed: number;
  resetTime: string;
  nearingLimit: boolean;
  limitReached: boolean;
  weeklyTotal: number;
  monthlyTotal: number;
  allTimeTotal: number;
}

export interface UpgradeRecommendation {
  shouldShow: boolean;
  reasons: string[];
  recommendedTier: SubscriptionTier;
  featuresUnlocked: string[];
  estimatedValue: string;
}

export interface SubscriptionManagerHook {
  subscription: SubscriptionState;
  usage: UsageState;
  upgradeRecommendation: UpgradeRecommendation;
  actions: {
    validateSubscription: (force?: boolean) => Promise<void>;
    upgradeToTier: (tier: SubscriptionTier) => Promise<void>;
    cancelSubscription: () => Promise<void>;
    refreshData: () => Promise<void>;
    checkFeatureAccess: (feature: string, domain?: string) => Promise<boolean>;
    useFeature: (feature: string, domain?: string) => Promise<{ success: boolean; reason?: string }>;
  };
}

export const useSubscriptionManager = (): SubscriptionManagerHook => {
  // State management following 2025 patterns
  const [subscription, setSubscription] = useState<SubscriptionState>({
    tier: 'free',
    status: 'free_tier',
    isValid: true,
    isLoading: true,
    features: [],
    needsValidation: false
  });

  const [usage, setUsage] = useState<UsageState>({
    dailyUsed: 0,
    dailyLimit: 50,
    dailyRemaining: 50,
    percentageUsed: 0,
    resetTime: new Date().toISOString(),
    nearingLimit: false,
    limitReached: false,
    weeklyTotal: 0,
    monthlyTotal: 0,
    allTimeTotal: 0
  });

  const [upgradeRecommendation, setUpgradeRecommendation] = useState<UpgradeRecommendation>({
    shouldShow: false,
    reasons: [],
    recommendedTier: 'premium',
    featuresUnlocked: [],
    estimatedValue: ''
  });

  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);

  // Load subscription and usage data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(undefined);

      // Load data in parallel for better performance
      const [subscriptionSummary, usageStats, upgradeRec] = await Promise.all([
        subscriptionManager.getSubscriptionSummary(),
        usageTracker.getUsageStats(),
        featureGate.getUpgradeRecommendations()
      ]);

      setSubscription({
        tier: subscriptionSummary.tier,
        status: subscriptionSummary.status,
        isValid: subscriptionSummary.isValid,
        isLoading: false,
        daysUntilExpiry: subscriptionSummary.daysUntilExpiry,
        gracePeriodDaysRemaining: subscriptionSummary.gracePeriodDaysRemaining,
        features: subscriptionSummary.features,
        needsValidation: subscriptionSummary.needsValidation
      });

      setUsage({
        dailyUsed: usageStats.dailyUsed,
        dailyLimit: usageStats.dailyLimit,
        dailyRemaining: usageStats.dailyRemaining,
        percentageUsed: usageStats.percentageUsed,
        resetTime: usageStats.resetTime,
        nearingLimit: usageStats.nearingLimit,
        limitReached: usageStats.limitReached,
        weeklyTotal: usageStats.weeklyTotal,
        monthlyTotal: usageStats.monthlyTotal,
        allTimeTotal: usageStats.allTimeTotal
      });

      setUpgradeRecommendation({
        shouldShow: upgradeRec.shouldRecommendUpgrade,
        reasons: upgradeRec.reasons,
        recommendedTier: upgradeRec.recommendedTier,
        featuresUnlocked: upgradeRec.featuresUnlocked,
        estimatedValue: upgradeRec.estimatedValue
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load subscription data';
      setError(errorMessage);
      console.error('Subscription data loading error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-refresh data periodically (following 2025 real-time patterns)
  useEffect(() => {
    loadData();

    // Refresh every 5 minutes to keep data current
    const refreshInterval = setInterval(loadData, 5 * 60 * 1000);

    // Cleanup interval on unmount
    return () => clearInterval(refreshInterval);
  }, [loadData]);

  // Actions with optimistic updates following 2025 patterns
  const actions = useMemo(() => ({
    validateSubscription: async (force = false) => {
      try {
        setSubscription(prev => ({ ...prev, isLoading: true }));

        await subscriptionManager.validateSubscription(force);
        const summary = await subscriptionManager.getSubscriptionSummary();

        setSubscription(prev => ({
          ...prev,
          status: summary.status,
          isValid: summary.isValid,
          daysUntilExpiry: summary.daysUntilExpiry,
          gracePeriodDaysRemaining: summary.gracePeriodDaysRemaining,
          needsValidation: summary.needsValidation,
          isLoading: false
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Validation failed');
        setSubscription(prev => ({ ...prev, isLoading: false }));
      }
    },

    upgradeToTier: async (tier: SubscriptionTier) => {
      try {
        // In a real implementation, this would integrate with payment processor
        await subscriptionManager.updateSubscriptionTier(tier);
        await loadData(); // Refresh all data after upgrade
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upgrade failed');
      }
    },

    cancelSubscription: async () => {
      try {
        await subscriptionManager.cancelSubscription();
        await loadData(); // Refresh data after cancellation
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Cancellation failed');
      }
    },

    refreshData: loadData,

    checkFeatureAccess: async (feature: string, domain?: string) => {
      try {
        const access = await featureGate.checkFeatureAccess(feature, domain);
        return access.hasAccess;
      } catch (err) {
        console.error('Feature access check failed:', err);
        return false;
      }
    },

    useFeature: async (feature: string, domain?: string) => {
      try {
        const result = await featureGate.useFeatureWithUsageTracking(feature, domain);

        if (result.success && result.usageResult) {
          // Update usage state optimistically
          setUsage(prev => ({
            ...prev,
            dailyUsed: result.usageResult.currentUsage.dailyChecks,
            dailyRemaining: Math.max(0, prev.dailyLimit - result.usageResult.currentUsage.dailyChecks),
            percentageUsed: (result.usageResult.currentUsage.dailyChecks / prev.dailyLimit) * 100,
            nearingLimit: result.usageResult.warningThreshold,
            limitReached: result.usageResult.limitReached
          }));
        }

        return {
          success: result.success,
          reason: result.accessResult.reason
        };
      } catch (err) {
        return {
          success: false,
          reason: err instanceof Error ? err.message : 'Feature usage failed'
        };
      }
    }
  }), [loadData]);

  // Memoized return value for performance
  return useMemo(() => ({
    subscription: {
      ...subscription,
      error,
      isLoading
    },
    usage,
    upgradeRecommendation,
    actions
  }), [subscription, usage, upgradeRecommendation, actions, error, isLoading]);
};

// Helper hook for feature access checking
export const useFeatureAccess = (feature: string, domain?: string) => {
  const { actions } = useSubscriptionManager();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    actions.checkFeatureAccess(feature, domain).then(setHasAccess);
  }, [feature, domain, actions]);

  return hasAccess;
};

// Helper hook for upgrade prompts
export const useUpgradePrompt = () => {
  const { upgradeRecommendation } = useSubscriptionManager();

  return useMemo(() => ({
    shouldShow: upgradeRecommendation.shouldShow,
    message: upgradeRecommendation.reasons[0],
    tier: upgradeRecommendation.recommendedTier,
    features: upgradeRecommendation.featuresUnlocked,
    value: upgradeRecommendation.estimatedValue
  }), [upgradeRecommendation]);
};
