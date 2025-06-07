/**
 * Smart Upgrade Prompt Manager
 * Implements contextual upgrade prompts following 2025 conversion optimization best practices
 * Features FOMO techniques, timing strategies, and frequency capping
 */

import { SubscriptionTier } from '@shared/types';
import { StorageService } from '../storage/storageService';

export interface UpgradePromptConfig {
  id: string;
  trigger: PromptTrigger;
  title: string;
  message: string;
  features: string[];
  targetTier: SubscriptionTier;
  priority: number; // Higher priority = shown first
  maxFrequency: 'once' | 'daily' | 'weekly' | 'monthly';
  fomoElement?: FOMAElement;
  valueProposition: string;
  ctaText: string;
  dismissible: boolean;
  style: 'modal' | 'banner' | 'tooltip' | 'inline';
}

export interface FOMAElement {
  type: 'usage_stats' | 'feature_preview' | 'time_limited' | 'user_count';
  data?: any;
  message: string;
}

export type PromptTrigger =
  | 'usage_threshold' // 80% of daily limit
  | 'limit_reached' // 100% of daily limit
  | 'premium_feature_attempt' // Tried to use premium feature
  | 'restricted_domain' // Analyzed domain outside free tier
  | 'engagement_milestone' // High usage pattern
  | 'onboarding_complete' // Finished initial setup
  | 'return_user' // Returning after period of inactivity
  | 'error_recovery'; // After system error

export interface PromptDisplayHistory {
  promptId: string;
  displayedAt: number;
  dismissed: boolean;
  converted: boolean;
  triggerContext?: any;
}

export interface PromptContext {
  currentUsage?: number;
  dailyLimit?: number;
  attemptedFeature?: string;
  blockedDomain?: string;
  userEngagement?: {
    weeklyUsage: number;
    streak: number;
    favoriteFeatures: string[];
  };
}

export class UpgradePromptManager {
  private storageService: StorageService;
  private readonly HISTORY_KEY = 'upgrade_prompt_history';

  // Prompt configurations following 2025 conversion optimization best practices
  private readonly PROMPT_CONFIGS: UpgradePromptConfig[] = [
    {
      id: 'usage_threshold_80',
      trigger: 'usage_threshold',
      title: '🚀 You\'re Power User!',
      message: 'You\'ve used {usage} of your {limit} daily checks. You\'re clearly getting value from TruthLens!',
      features: ['unlimited_checks', 'advanced_analysis', 'priority_support'],
      targetTier: 'premium',
      priority: 8,
      maxFrequency: 'daily',
      fomoElement: {
        type: 'usage_stats',
        message: 'Heavy users save 2+ hours per week with Premium features'
      },
      valueProposition: 'Get unlimited checks and advanced analysis to supercharge your fact-checking workflow',
      ctaText: 'Upgrade to Premium',
      dismissible: true,
      style: 'modal'
    },
    {
      id: 'limit_reached',
      trigger: 'limit_reached',
      title: '⏰ Daily Limit Reached',
      message: 'You\'ve reached your daily limit of {limit} checks. Upgrade for unlimited access!',
      features: ['unlimited_checks'],
      targetTier: 'premium',
      priority: 10,
      maxFrequency: 'daily',
      fomoElement: {
        type: 'time_limited',
        message: 'Don\'t let misinformation spread while you wait for tomorrow\'s reset'
      },
      valueProposition: 'Stay protected with unlimited credibility checks',
      ctaText: 'Get Unlimited Access',
      dismissible: false,
      style: 'modal'
    },
    {
      id: 'premium_feature_bias_analysis',
      trigger: 'premium_feature_attempt',
      title: '🎯 Unlock Bias Detection',
      message: 'Political bias analysis helps you see the full picture of news sources.',
      features: ['bias_analysis', 'detailed_reports'],
      targetTier: 'premium',
      priority: 9,
      maxFrequency: 'weekly',
      fomoElement: {
        type: 'feature_preview',
        message: 'See how {source} leans politically and detect framing techniques'
      },
      valueProposition: 'Understand media bias and make more informed decisions',
      ctaText: 'Unlock Bias Analysis',
      dismissible: true,
      style: 'modal'
    },
    {
      id: 'restricted_domain_access',
      trigger: 'restricted_domain',
      title: '🌍 Expand Your Analysis',
      message: 'This domain isn\'t in our free tier database. Upgrade for access to all domains!',
      features: ['unlimited_domains', 'comprehensive_database'],
      targetTier: 'premium',
      priority: 7,
      maxFrequency: 'weekly',
      fomoElement: {
        type: 'user_count',
        message: 'Join 50,000+ users who trust Premium for comprehensive fact-checking'
      },
      valueProposition: 'Access our complete database of 500,000+ domains',
      ctaText: 'Unlock All Domains',
      dismissible: true,
      style: 'banner'
    },
    {
      id: 'engagement_milestone',
      trigger: 'engagement_milestone',
      title: '⭐ You\'re a Fact-Checking Expert!',
      message: 'You\'ve been actively fighting misinformation. Ready for pro-level tools?',
      features: ['historical_tracking', 'export_data', 'advanced_filters'],
      targetTier: 'premium',
      priority: 6,
      maxFrequency: 'weekly',
      fomoElement: {
        type: 'usage_stats',
        message: 'Track your impact: {weeklyChecks} articles verified this week'
      },
      valueProposition: 'Get professional tools to track and export your fact-checking work',
      ctaText: 'Upgrade to Premium',
      dismissible: true,
      style: 'inline'
    },
    {
      id: 'return_user_winback',
      trigger: 'return_user',
      title: '👋 Welcome Back!',
      message: 'We\'ve missed you! Premium features can help you catch up on the latest news credibly.',
      features: ['priority_analysis', 'trend_alerts'],
      targetTier: 'premium',
      priority: 5,
      maxFrequency: 'monthly',
      fomoElement: {
        type: 'time_limited',
        message: 'Special returning user discount: 20% off your first month'
      },
      valueProposition: 'Stay ahead of misinformation with premium alerts and analysis',
      ctaText: 'Claim Discount',
      dismissible: true,
      style: 'banner'
    }
  ];

  constructor(storageService: StorageService) {
    this.storageService = storageService;
  }

  /**
   * Determine if an upgrade prompt should be shown for a specific trigger
   */
  async shouldShowPrompt(
    trigger: PromptTrigger,
    context: PromptContext,
    currentTier: SubscriptionTier = 'free'
  ): Promise<{
    shouldShow: boolean;
    prompt?: UpgradePromptConfig;
    reason?: string;
  }> {
    // Don't show prompts to non-free users
    if (currentTier !== 'free') {
      return { shouldShow: false, reason: 'User has premium subscription' };
    }

    // Get applicable prompts for this trigger
    const applicablePrompts = this.PROMPT_CONFIGS
      .filter(config => config.trigger === trigger)
      .sort((a, b) => b.priority - a.priority);

    if (applicablePrompts.length === 0) {
      return { shouldShow: false, reason: 'No prompts configured for trigger' };
    }

    // Check each prompt against frequency and history constraints
    for (const prompt of applicablePrompts) {
      const canShow = await this.canShowPrompt(prompt, context);
      if (canShow.allowed) {
        return {
          shouldShow: true,
          prompt: this.personalizePrompt(prompt, context)
        };
      }
    }

    return { shouldShow: false, reason: 'All prompts blocked by frequency limits' };
  }

  /**
   * Check if a specific prompt can be shown based on frequency limits and history
   */
  private async canShowPrompt(
    prompt: UpgradePromptConfig,
    _context: PromptContext
  ): Promise<{ allowed: boolean; reason?: string }> {
    const history = await this.getPromptHistory();
    const promptHistory = history.filter(h => h.promptId === prompt.id);

    // Check if user already converted from this prompt
    if (promptHistory.some(h => h.converted)) {
      return { allowed: false, reason: 'User already converted from this prompt' };
    }

    const now = Date.now();

    // Apply frequency limits
    switch (prompt.maxFrequency) {
      case 'once':
        if (promptHistory.length > 0) {
          return { allowed: false, reason: 'Prompt can only be shown once' };
        }
        break;

      case 'daily':
        const today = new Date().setHours(0, 0, 0, 0);
        if (promptHistory.some(h => h.displayedAt >= today)) {
          return { allowed: false, reason: 'Prompt already shown today' };
        }
        break;

      case 'weekly':
        const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
        if (promptHistory.some(h => h.displayedAt >= weekAgo)) {
          return { allowed: false, reason: 'Prompt shown within last week' };
        }
        break;

      case 'monthly':
        const monthAgo = now - (30 * 24 * 60 * 60 * 1000);
        if (promptHistory.some(h => h.displayedAt >= monthAgo)) {
          return { allowed: false, reason: 'Prompt shown within last month' };
        }
        break;
    }

    // Check if user dismissed recently (respect user choice)
    const recentDismissal = promptHistory
      .filter(h => h.dismissed)
      .sort((a, b) => b.displayedAt - a.displayedAt)[0];

    if (recentDismissal) {
      const timeSinceDismissal = now - recentDismissal.displayedAt;
      const cooldownPeriod = 24 * 60 * 60 * 1000; // 24 hours

      if (timeSinceDismissal < cooldownPeriod) {
        return { allowed: false, reason: 'User recently dismissed prompt' };
      }
    }

    return { allowed: true };
  }

  /**
   * Personalize prompt content based on context
   */
  private personalizePrompt(
    prompt: UpgradePromptConfig,
    context: PromptContext
  ): UpgradePromptConfig {
    let personalizedMessage = prompt.message;
    let personalizedFomo = prompt.fomoElement?.message || '';

    // Replace placeholders with actual data
    if (context.currentUsage && context.dailyLimit) {
      personalizedMessage = personalizedMessage
        .replace('{usage}', context.currentUsage.toString())
        .replace('{limit}', context.dailyLimit.toString());
    }

    if (context.attemptedFeature) {
      personalizedMessage = personalizedMessage
        .replace('{feature}', context.attemptedFeature);
    }

    if (context.blockedDomain) {
      personalizedMessage = personalizedMessage
        .replace('{domain}', context.blockedDomain);
      personalizedFomo = personalizedFomo
        .replace('{source}', context.blockedDomain);
    }

    if (context.userEngagement) {
      personalizedFomo = personalizedFomo
        .replace('{weeklyChecks}', context.userEngagement.weeklyUsage.toString());
    }

    return {
      ...prompt,
      message: personalizedMessage,
      fomoElement: prompt.fomoElement ? {
        ...prompt.fomoElement,
        message: personalizedFomo
      } : undefined
    };
  }

  /**
   * Record that a prompt was displayed
   */
  async recordPromptDisplayed(
    promptId: string,
    context?: PromptContext
  ): Promise<void> {
    const history = await this.getPromptHistory();
    const record: PromptDisplayHistory = {
      promptId,
      displayedAt: Date.now(),
      dismissed: false,
      converted: false,
      triggerContext: context
    };

    history.push(record);
    await this.storageService.set(this.HISTORY_KEY, history, 'local');
  }

  /**
   * Record that a prompt was dismissed
   */
  async recordPromptDismissed(promptId: string): Promise<void> {
    const history = await this.getPromptHistory();
    const record = history
      .filter(h => h.promptId === promptId)
      .sort((a, b) => b.displayedAt - a.displayedAt)[0];

    if (record) {
      record.dismissed = true;
      await this.storageService.set(this.HISTORY_KEY, history, 'local');
    }
  }

  /**
   * Record that a user converted (upgraded) from a prompt
   */
  async recordPromptConversion(promptId: string): Promise<void> {
    const history = await this.getPromptHistory();
    const record = history
      .filter(h => h.promptId === promptId)
      .sort((a, b) => b.displayedAt - a.displayedAt)[0];

    if (record) {
      record.converted = true;
      await this.storageService.set(this.HISTORY_KEY, history, 'local');
    }
  }

  /**
   * Get prompt display history
   */
  private async getPromptHistory(): Promise<PromptDisplayHistory[]> {
    const history = await this.storageService.get<PromptDisplayHistory[]>(this.HISTORY_KEY, 'local');
    return history || [];
  }

  /**
   * Get conversion analytics for optimization
   */
  async getPromptAnalytics(): Promise<{
    totalPrompts: number;
    conversions: number;
    conversionRate: number;
    topPerformingPrompts: Array<{
      promptId: string;
      displays: number;
      conversions: number;
      conversionRate: number;
    }>;
  }> {
    const history = await this.getPromptHistory();

    const totalPrompts = history.length;
    const conversions = history.filter(h => h.converted).length;
    const conversionRate = totalPrompts > 0 ? (conversions / totalPrompts) * 100 : 0;

    // Group by prompt ID and calculate performance
    const promptStats = new Map<string, { displays: number; conversions: number }>();

    history.forEach(record => {
      const stats = promptStats.get(record.promptId) || { displays: 0, conversions: 0 };
      stats.displays++;
      if (record.converted) stats.conversions++;
      promptStats.set(record.promptId, stats);
    });

    const topPerformingPrompts = Array.from(promptStats.entries())
      .map(([promptId, stats]) => ({
        promptId,
        displays: stats.displays,
        conversions: stats.conversions,
        conversionRate: stats.displays > 0 ? (stats.conversions / stats.displays) * 100 : 0
      }))
      .sort((a, b) => b.conversionRate - a.conversionRate);

    return {
      totalPrompts,
      conversions,
      conversionRate,
      topPerformingPrompts
    };
  }

  /**
   * Clean up old prompt history to maintain performance
   */
  async cleanupOldHistory(retentionDays: number = 90): Promise<void> {
    const history = await this.getPromptHistory();
    const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);

    const filteredHistory = history.filter(record => record.displayedAt >= cutoffTime);
    await this.storageService.set(this.HISTORY_KEY, filteredHistory, 'local');
  }

  /**
   * Get prompt configuration by ID
   */
  getPromptConfig(promptId: string): UpgradePromptConfig | undefined {
    return this.PROMPT_CONFIGS.find(config => config.id === promptId);
  }

  /**
   * Get all available prompts for a trigger
   */
  getPromptsForTrigger(trigger: PromptTrigger): UpgradePromptConfig[] {
    return this.PROMPT_CONFIGS
      .filter(config => config.trigger === trigger)
      .sort((a, b) => b.priority - a.priority);
  }
}

// Export singleton instance
import { storageService } from '../storage/storageService';
export const upgradePromptManager = new UpgradePromptManager(storageService);
