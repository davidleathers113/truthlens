/**
 * Feature Gate Service
 * Controls access to premium features based on subscription status
 * Implements 2025 best practices for feature flagging and permission systems
 */

import { SubscriptionTier } from '@shared/types';
import { SubscriptionManager } from './subscriptionManager';
import { UsageTrackerService } from './usageTracker';

export interface FeatureConfig {
  feature: string;
  tier: SubscriptionTier[];
  usageLimit?: number; // For features with usage limits
  domainRestriction?: boolean; // If feature is restricted to top domains
  description: string;
  category: 'core' | 'analysis' | 'ui' | 'data' | 'integration';
}

export interface FeatureAccessResult {
  hasAccess: boolean;
  reason?: string;
  upgradeRequired?: boolean;
  usageLimitReached?: boolean;
  domainRestricted?: boolean;
  alternativeFeatures?: string[];
}

export class FeatureGateService {
  private subscriptionManager: SubscriptionManager;
  private usageTracker: UsageTrackerService;

  // Feature configuration following 2025 freemium best practices
  private readonly FEATURE_CONFIG: FeatureConfig[] = [
    // Core Features - Available to all tiers
    {
      feature: 'basic_credibility',
      tier: ['free', 'premium', 'enterprise'],
      description: 'Basic credibility scoring',
      category: 'core'
    },
    {
      feature: 'visual_indicators',
      tier: ['free', 'premium', 'enterprise'],
      description: 'Visual credibility indicators on pages',
      category: 'ui'
    },

    // Free Tier Limited Features
    {
      feature: 'limited_checks',
      tier: ['free'],
      usageLimit: 50, // Daily limit
      domainRestriction: true, // Only top 5,000 domains
      description: 'Limited credibility checks (50/day, top domains only)',
      category: 'core'
    },

    // Premium Features
    {
      feature: 'unlimited_checks',
      tier: ['premium', 'enterprise'],
      description: 'Unlimited daily credibility checks',
      category: 'core'
    },
    {
      feature: 'bias_analysis',
      tier: ['premium', 'enterprise'],
      description: 'Political bias detection and analysis',
      category: 'analysis'
    },
    {
      feature: 'detailed_reports',
      tier: ['premium', 'enterprise'],
      description: 'Detailed credibility analysis reports',
      category: 'analysis'
    },
    {
      feature: 'historical_tracking',
      tier: ['premium', 'enterprise'],
      description: 'Historical credibility data tracking',
      category: 'data'
    },
    {
      feature: 'export_data',
      tier: ['premium', 'enterprise'],
      description: 'Export credibility data and reports',
      category: 'data'
    },
    {
      feature: 'priority_support',
      tier: ['premium', 'enterprise'],
      description: 'Priority customer support',
      category: 'integration'
    },
    {
      feature: 'advanced_filters',
      tier: ['premium', 'enterprise'],
      description: 'Advanced filtering and search options',
      category: 'ui'
    },
    {
      feature: 'custom_alerts',
      tier: ['premium', 'enterprise'],
      description: 'Custom credibility alerts and notifications',
      category: 'ui'
    },

    // Enterprise Features
    {
      feature: 'api_access',
      tier: ['enterprise'],
      description: 'API access for integrations',
      category: 'integration'
    },
    {
      feature: 'custom_domains',
      tier: ['enterprise'],
      description: 'Custom domain credibility database',
      category: 'core'
    },
    {
      feature: 'team_management',
      tier: ['enterprise'],
      description: 'Team and organization management',
      category: 'integration'
    },
    {
      feature: 'advanced_analytics',
      tier: ['enterprise'],
      description: 'Advanced analytics and reporting',
      category: 'analysis'
    },
    {
      feature: 'white_label',
      tier: ['enterprise'],
      description: 'White-label customization options',
      category: 'ui'
    }
  ];

  // Top 5,000 domains for free tier (simplified - would be loaded from database)
  private readonly TOP_DOMAINS_SAMPLE = [
    'google.com', 'youtube.com', 'facebook.com', 'twitter.com', 'instagram.com',
    'linkedin.com', 'reddit.com', 'wikipedia.org', 'amazon.com', 'apple.com',
    'microsoft.com', 'netflix.com', 'zoom.us', 'github.com', 'stackoverflow.com'
    // In production, this would be loaded from the domain reputation database
  ];

  constructor(subscriptionManager: SubscriptionManager, usageTracker: UsageTrackerService) {
    this.subscriptionManager = subscriptionManager;
    this.usageTracker = usageTracker;
  }

  /**
   * Check if user has access to a specific feature
   */
  async checkFeatureAccess(featureName: string, domain?: string): Promise<FeatureAccessResult> {
    const featureConfig = this.getFeatureConfig(featureName);

    if (!featureConfig) {
      return {
        hasAccess: false,
        reason: 'Feature not found',
        alternativeFeatures: this.suggestAlternativeFeatures(featureName)
      };
    }

    const subscription = await this.subscriptionManager.getCurrentSubscription();
    const validation = await this.subscriptionManager.validateSubscription();

    // Check if subscription is valid
    if (!validation.isValid && featureConfig.tier[0] !== 'free') {
      return {
        hasAccess: false,
        reason: 'Invalid subscription',
        upgradeRequired: true,
        alternativeFeatures: this.getAlternativeFeatures(featureName, 'free')
      };
    }

    // Check tier access
    if (!featureConfig.tier.includes(subscription.tier)) {
      const requiredTier = this.getMinimumTierForFeature(featureName);
      return {
        hasAccess: false,
        reason: `Feature requires ${requiredTier} tier`,
        upgradeRequired: true,
        alternativeFeatures: this.getAlternativeFeatures(featureName, subscription.tier)
      };
    }

    // Check usage limits for free tier
    if (featureConfig.usageLimit && subscription.tier === 'free') {
      const usageCheck = await this.usageTracker.canPerformCheck();
      if (!usageCheck.canPerform) {
        return {
          hasAccess: false,
          reason: 'Daily usage limit reached',
          usageLimitReached: true,
          upgradeRequired: true,
          alternativeFeatures: ['unlimited_checks']
        };
      }
    }

    // Check domain restrictions for free tier
    if (featureConfig.domainRestriction && subscription.tier === 'free' && domain) {
      const domainAllowed = await this.checkDomainAccess(domain, subscription.tier);
      if (!domainAllowed) {
        return {
          hasAccess: false,
          reason: 'Domain not available in free tier',
          domainRestricted: true,
          upgradeRequired: true,
          alternativeFeatures: ['unlimited_checks']
        };
      }
    }

    return {
      hasAccess: true
    };
  }

  /**
   * Check if domain is accessible for given tier
   */
  async checkDomainAccess(domain: string, tier: SubscriptionTier): Promise<boolean> {
    if (tier === 'premium' || tier === 'enterprise') {
      return true; // Premium tiers have access to all domains
    }

    // For free tier, check against top 5,000 domains
    const normalizedDomain = this.normalizeDomain(domain);
    return this.TOP_DOMAINS_SAMPLE.includes(normalizedDomain);
  }

  /**
   * Get feature configuration by name
   */
  private getFeatureConfig(featureName: string): FeatureConfig | undefined {
    return this.FEATURE_CONFIG.find(config => config.feature === featureName);
  }

  /**
   * Get minimum tier required for a feature
   */
  private getMinimumTierForFeature(featureName: string): SubscriptionTier {
    const config = this.getFeatureConfig(featureName);
    if (!config) return 'enterprise';

    const tierPriority: SubscriptionTier[] = ['free', 'premium', 'enterprise'];
    return config.tier.sort((a, b) => tierPriority.indexOf(a) - tierPriority.indexOf(b))[0];
  }

  /**
   * Get alternative features available for current tier
   */
  private getAlternativeFeatures(requestedFeature: string, currentTier: SubscriptionTier): string[] {
    const requestedConfig = this.getFeatureConfig(requestedFeature);
    if (!requestedConfig) return [];

    return this.FEATURE_CONFIG
      .filter(config =>
        config.category === requestedConfig.category &&
        config.tier.includes(currentTier) &&
        config.feature !== requestedFeature
      )
      .map(config => config.feature);
  }

  /**
   * Suggest alternative features when feature not found
   */
  private suggestAlternativeFeatures(featureName: string): string[] {
    // Simple heuristic-based suggestions
    const keywords = featureName.toLowerCase();

    if (keywords.includes('bias')) {
      return ['bias_analysis'];
    }
    if (keywords.includes('report') || keywords.includes('detail')) {
      return ['detailed_reports'];
    }
    if (keywords.includes('check') || keywords.includes('credibility')) {
      return ['basic_credibility', 'unlimited_checks'];
    }
    if (keywords.includes('data') || keywords.includes('export')) {
      return ['export_data', 'historical_tracking'];
    }

    return ['basic_credibility', 'visual_indicators'];
  }

  /**
   * Normalize domain for comparison
   */
  private normalizeDomain(domain: string): string {
    return domain.toLowerCase()
      .replace(/^www\./, '')
      .replace(/^https?:\/\//, '')
      .split('/')[0];
  }

  /**
   * Get all features available for a tier
   */
  async getAvailableFeatures(tier?: SubscriptionTier): Promise<FeatureConfig[]> {
    const subscription = await this.subscriptionManager.getCurrentSubscription();
    const targetTier = tier || subscription.tier;

    return this.FEATURE_CONFIG.filter(config => config.tier.includes(targetTier));
  }

  /**
   * Get feature usage summary for UI
   */
  async getFeatureUsageSummary(): Promise<{
    tier: SubscriptionTier;
    dailyUsage: {
      used: number;
      limit: number;
      remaining: number;
    };
    availableFeatures: string[];
    restrictedFeatures: string[];
    upgradeFeatures: string[];
  }> {
    const subscription = await this.subscriptionManager.getCurrentSubscription();
    const usageStats = await this.usageTracker.getUsageStats();

    const availableFeatures = (await this.getAvailableFeatures()).map(f => f.feature);
    const allFeatures = this.FEATURE_CONFIG.map(f => f.feature);
    const restrictedFeatures = allFeatures.filter(f => !availableFeatures.includes(f));

    // Get features available in next tier
    const nextTier = subscription.tier === 'free' ? 'premium' : 'enterprise';
    const upgradeFeatures = (await this.getAvailableFeatures(nextTier))
      .filter(f => !availableFeatures.includes(f.feature))
      .map(f => f.feature);

    return {
      tier: subscription.tier,
      dailyUsage: {
        used: usageStats.dailyUsed,
        limit: usageStats.dailyLimit,
        remaining: usageStats.dailyRemaining
      },
      availableFeatures,
      restrictedFeatures,
      upgradeFeatures
    };
  }

  /**
   * Check multiple features at once for efficient UI rendering
   */
  async checkMultipleFeatures(features: string[], domain?: string): Promise<Record<string, FeatureAccessResult>> {
    const results: Record<string, FeatureAccessResult> = {};

    // Use Promise.all for efficient parallel checking
    const checks = features.map(async feature => {
      const result = await this.checkFeatureAccess(feature, domain);
      return { feature, result };
    });

    const resolved = await Promise.all(checks);
    resolved.forEach(({ feature, result }) => {
      results[feature] = result;
    });

    return results;
  }

  /**
   * Get upgrade recommendations based on usage patterns
   */
  async getUpgradeRecommendations(): Promise<{
    shouldRecommendUpgrade: boolean;
    reasons: string[];
    recommendedTier: SubscriptionTier;
    featuresUnlocked: string[];
    estimatedValue: string;
  }> {
    const subscription = await this.subscriptionManager.getCurrentSubscription();
    const usageStats = await this.usageTracker.getUsageStats();
    const upgradePrompt = await this.usageTracker.shouldShowUpgradePrompt();

    const reasons: string[] = [];
    let recommendedTier: SubscriptionTier = 'premium';

    if (upgradePrompt.shouldShow) {
      switch (upgradePrompt.reason) {
        case 'limit_reached':
          reasons.push('Daily credibility check limit reached');
          break;
        case 'approaching_limit':
          reasons.push('Approaching daily check limit');
          break;
        case 'frequent_user':
          reasons.push('Heavy usage pattern detected');
          break;
      }
    }

    // Additional upgrade reasons based on feature usage patterns
    if (usageStats.weeklyTotal > 200) {
      reasons.push('High weekly usage suggests professional use case');
      recommendedTier = 'enterprise';
    }

    const nextTierFeatures = (await this.getAvailableFeatures(recommendedTier))
      .filter(f => !f.tier.includes(subscription.tier))
      .map(f => f.feature);

    return {
      shouldRecommendUpgrade: upgradePrompt.shouldShow || reasons.length > 0,
      reasons,
      recommendedTier,
      featuresUnlocked: nextTierFeatures,
      estimatedValue: this.calculateEstimatedValue(recommendedTier, usageStats.monthlyTotal)
    };
  }

  /**
   * Calculate estimated value proposition for upgrade
   */
  private calculateEstimatedValue(tier: SubscriptionTier, monthlyUsage: number): string {
    if (tier === 'premium') {
      const timeSaved = Math.floor(monthlyUsage * 0.5); // Assume 30 seconds saved per check
      return `Save ~${timeSaved} minutes/month with unlimited checks and advanced features`;
    } else {
      return 'Professional tools for teams and organizations';
    }
  }

  /**
   * Increment usage counter and check feature access
   */
  async useFeatureWithUsageTracking(featureName: string, domain?: string): Promise<{
    success: boolean;
    accessResult: FeatureAccessResult;
    usageResult?: any;
  }> {
    // First check if feature access is allowed
    const accessResult = await this.checkFeatureAccess(featureName, domain);

    if (!accessResult.hasAccess) {
      return {
        success: false,
        accessResult
      };
    }

    // If feature has usage limits, increment the counter
    const featureConfig = this.getFeatureConfig(featureName);
    if (featureConfig?.usageLimit) {
      const usageResult = await this.usageTracker.incrementUsage();
      return {
        success: usageResult.success,
        accessResult,
        usageResult
      };
    }

    return {
      success: true,
      accessResult
    };
  }
}

// Export singleton instance
import { subscriptionManager } from './subscriptionManager';
import { usageTracker } from './usageTracker';
export const featureGate = new FeatureGateService(subscriptionManager, usageTracker);
