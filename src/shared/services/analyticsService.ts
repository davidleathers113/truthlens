/**
 * Analytics Service
 * GDPR-compliant analytics tracking for freemium business model
 * Following 2025 best practices for privacy-first analytics and conversion tracking
 */

import { SubscriptionTier } from '@shared/types';
import { StorageService } from '../storage/storageService';
import { logger } from './logger';

export interface AnalyticsEvent {
  event: string;
  timestamp: number;
  sessionId: string;
  userId?: string; // Anonymous hash-based ID
  properties?: Record<string, any>;
  source: 'extension' | 'popup' | 'options' | 'content';
  version: string;
}

export interface ConversionFunnelStep {
  step: string;
  timestamp: number;
  sessionId: string;
  metadata?: Record<string, any>;
}

export interface BusinessMetrics {
  dailyActiveUsers: number;
  monthlyActiveUsers: number;
  retentionRate: number;
  conversionRate: number;
  averageSessionDuration: number;
  featureUsageRates: Record<string, number>;
  churnRate: number;
  upgradePathSuccessRate: number;
}

export interface ConversionFunnel {
  step1_landing: number;
  step2_first_check: number;
  step3_limit_warning: number;
  step4_upgrade_prompt: number;
  step5_payment_page: number;
  step6_payment_success: number;
  conversionRates: {
    landing_to_first_check: number;
    first_check_to_limit: number;
    limit_to_upgrade_prompt: number;
    upgrade_prompt_to_payment: number;
    payment_to_success: number;
    overall_conversion: number;
  };
}

export class AnalyticsService {
  private storageService: StorageService;
  private sessionId: string;
  private userId: string; // Anonymous hash-based ID
  private isInitialized = false;
  private eventQueue: AnalyticsEvent[] = [];
  private readonly MAX_QUEUE_SIZE = 100;
  private readonly BATCH_SEND_INTERVAL = 30000; // 30 seconds
  private readonly STORAGE_KEY_EVENTS = 'analytics_events';
  private readonly STORAGE_KEY_METRICS = 'analytics_metrics';
  private readonly STORAGE_KEY_USER = 'analytics_user';

  // Predefined events for conversion tracking
  private readonly CONVERSION_EVENTS = {
    // Acquisition funnel
    EXTENSION_INSTALLED: 'extension_installed',
    FIRST_LAUNCH: 'first_launch',
    ONBOARDING_STARTED: 'onboarding_started',
    ONBOARDING_COMPLETED: 'onboarding_completed',

    // Usage funnel
    FIRST_CREDIBILITY_CHECK: 'first_credibility_check',
    DAILY_LIMIT_WARNING: 'daily_limit_warning',
    DAILY_LIMIT_REACHED: 'daily_limit_reached',
    PREMIUM_FEATURE_ATTEMPTED: 'premium_feature_attempted',

    // Conversion funnel
    UPGRADE_PROMPT_SHOWN: 'upgrade_prompt_shown',
    UPGRADE_PROMPT_CLICKED: 'upgrade_prompt_clicked',
    PAYMENT_PAGE_OPENED: 'payment_page_opened',
    PAYMENT_STARTED: 'payment_started',
    PAYMENT_SUCCESS: 'payment_success',
    PAYMENT_FAILED: 'payment_failed',

    // Retention events
    SESSION_START: 'session_start',
    SESSION_END: 'session_end',
    FEATURE_USED: 'feature_used',
    SETTINGS_ACCESSED: 'settings_accessed',

    // Engagement events
    HELP_ACCESSED: 'help_accessed',
    FEEDBACK_SUBMITTED: 'feedback_submitted',
    EXPORT_USED: 'export_used',

    // Churn indicators
    SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
    EXTENSION_DISABLED: 'extension_disabled',
    NEGATIVE_FEEDBACK: 'negative_feedback'
  } as const;

  constructor(storageService: StorageService) {
    this.storageService = storageService;
    this.sessionId = this.generateSessionId();
    this.userId = ''; // Will be initialized
  }

  /**
   * Initialize analytics service with privacy-compliant setup
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Get or create anonymous user ID (GDPR-compliant hash)
      this.userId = await this.getOrCreateAnonymousUserId();

      // Track session start
      await this.trackEvent(this.CONVERSION_EVENTS.SESSION_START, {
        source: 'background'
      });

      // Set up periodic batch sending
      this.setupBatchSending();

      // Load queued events from storage
      await this.loadQueuedEvents();

      this.isInitialized = true;
      logger.info('Analytics service initialized with privacy-compliant tracking');
    } catch (error) {
      logger.error('Failed to initialize analytics service:', error);
      throw error;
    }
  }

  /**
   * Track an analytics event with automatic anonymization
   */
  async trackEvent(
    event: string,
    properties?: Record<string, any>,
    source: AnalyticsEvent['source'] = 'extension'
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const analyticsEvent: AnalyticsEvent = {
      event,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      properties: this.sanitizeProperties(properties || {}),
      source,
      version: chrome.runtime.getManifest().version
    };

    // Add to queue for batch processing
    this.eventQueue.push(analyticsEvent);

    // Ensure queue doesn't exceed size limit
    if (this.eventQueue.length > this.MAX_QUEUE_SIZE) {
      this.eventQueue = this.eventQueue.slice(-this.MAX_QUEUE_SIZE);
    }

    // Store events locally for offline persistence
    await this.persistEvents();

    logger.debug('Analytics event tracked:', { event, source, propertiesCount: Object.keys(analyticsEvent.properties || {}).length });
  }

  /**
   * Track conversion funnel step
   */
  async trackConversionStep(step: string, metadata?: Record<string, any>): Promise<void> {
    const funnelStep: ConversionFunnelStep = {
      step,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      metadata: this.sanitizeProperties(metadata || {})
    };

    await this.trackEvent('conversion_funnel_step', {
      step,
      ...funnelStep.metadata
    });

    // Store funnel step data
    const funnelData = await this.storageService.get<ConversionFunnelStep[]>('conversion_funnel', 'local') || [];
    funnelData.push(funnelStep);

    // Keep only last 1000 steps to manage storage
    if (funnelData.length > 1000) {
      funnelData.splice(0, funnelData.length - 1000);
    }

    await this.storageService.set('conversion_funnel', funnelData, 'local');
  }

  /**
   * Track feature usage with automatic categorization
   */
  async trackFeatureUsage(
    feature: string,
    tier: SubscriptionTier,
    success: boolean = true,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.trackEvent(this.CONVERSION_EVENTS.FEATURE_USED, {
      feature,
      tier,
      success,
      ...this.sanitizeProperties(metadata || {})
    });

    // Update feature usage statistics
    await this.updateFeatureUsageStats(feature, tier, success);
  }

  /**
   * Track user journey milestone
   */
  async trackMilestone(
    milestone: string,
    tier: SubscriptionTier,
    daysFromInstall?: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.trackEvent('user_milestone', {
      milestone,
      tier,
      daysFromInstall,
      ...this.sanitizeProperties(metadata || {})
    });
  }

  /**
   * Track subscription lifecycle event
   */
  async trackSubscriptionEvent(
    event: 'upgrade' | 'downgrade' | 'cancel' | 'reactivate' | 'expire',
    fromTier: SubscriptionTier,
    toTier: SubscriptionTier,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.trackEvent('subscription_lifecycle', {
      lifecycleEvent: event,
      fromTier,
      toTier,
      ...this.sanitizeProperties(metadata || {})
    });

    // Track specific conversion events
    if (event === 'upgrade') {
      await this.trackEvent(this.CONVERSION_EVENTS.PAYMENT_SUCCESS, {
        fromTier,
        toTier,
        upgradeType: fromTier === 'free' ? 'free_to_premium' : 'tier_upgrade'
      });
    }
  }

  /**
   * Get business metrics summary
   */
  async getBusinessMetrics(timeRangeMs: number = 30 * 24 * 60 * 60 * 1000): Promise<BusinessMetrics> {
    const events = await this.getRecentEvents(timeRangeMs);
    const now = Date.now();
    const timeRangeStart = now - timeRangeMs;

    // Calculate Daily Active Users (unique sessions in last 24h)
    const last24h = events.filter(e => e.timestamp > now - 24 * 60 * 60 * 1000);
    const dailyActiveUsers = new Set(last24h.map(e => e.userId)).size;

    // Calculate Monthly Active Users (unique sessions in timeRange)
    const monthlyActiveUsers = new Set(events.map(e => e.userId)).size;

    // Calculate average session duration
    const sessionDurations = this.calculateSessionDurations(events);
    const averageSessionDuration = sessionDurations.length > 0
      ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length
      : 0;

    // Calculate feature usage rates
    const featureEvents = events.filter(e => e.event === this.CONVERSION_EVENTS.FEATURE_USED);
    const featureUsageRates = this.calculateFeatureUsageRates(featureEvents);

    // Calculate conversion rate (payment success / upgrade prompt shown)
    const upgradePrompts = events.filter(e => e.event === this.CONVERSION_EVENTS.UPGRADE_PROMPT_SHOWN).length;
    const paymentSuccess = events.filter(e => e.event === this.CONVERSION_EVENTS.PAYMENT_SUCCESS).length;
    const conversionRate = upgradePrompts > 0 ? (paymentSuccess / upgradePrompts) * 100 : 0;

    // Calculate retention rate (users active in current period who were also active in previous period)
    const previousPeriodStart = timeRangeStart - timeRangeMs;
    const previousPeriodEvents = await this.getEventsInTimeRange(previousPeriodStart, timeRangeStart);
    const currentPeriodUsers = new Set(events.map(e => e.userId));
    const previousPeriodUsers = new Set(previousPeriodEvents.map(e => e.userId));
    const retainedUsers = [...previousPeriodUsers].filter(userId => currentPeriodUsers.has(userId));
    const retentionRate = previousPeriodUsers.size > 0 ? (retainedUsers.length / previousPeriodUsers.size) * 100 : 0;

    // Calculate churn rate (subscription cancellations / total active subscriptions)
    const cancellations = events.filter(e => e.event === this.CONVERSION_EVENTS.SUBSCRIPTION_CANCELLED).length;
    const activeSubscriptions = events.filter(e => e.event === this.CONVERSION_EVENTS.PAYMENT_SUCCESS).length;
    const churnRate = activeSubscriptions > 0 ? (cancellations / activeSubscriptions) * 100 : 0;

    // Calculate upgrade path success rate
    const upgradePathSteps = events.filter(e =>
      [this.CONVERSION_EVENTS.UPGRADE_PROMPT_CLICKED, this.CONVERSION_EVENTS.PAYMENT_PAGE_OPENED].includes(e.event as any)
    ).length;
    const upgradePathSuccessRate = upgradePathSteps > 0 ? (paymentSuccess / upgradePathSteps) * 100 : 0;

    return {
      dailyActiveUsers,
      monthlyActiveUsers,
      retentionRate,
      conversionRate,
      averageSessionDuration,
      featureUsageRates,
      churnRate,
      upgradePathSuccessRate
    };
  }

  /**
   * Get conversion funnel analysis
   */
  async getConversionFunnel(): Promise<ConversionFunnel> {
    const events = await this.getRecentEvents(30 * 24 * 60 * 60 * 1000); // Last 30 days

    const step1_landing = events.filter(e => e.event === this.CONVERSION_EVENTS.FIRST_LAUNCH).length;
    const step2_first_check = events.filter(e => e.event === this.CONVERSION_EVENTS.FIRST_CREDIBILITY_CHECK).length;
    const step3_limit_warning = events.filter(e => e.event === this.CONVERSION_EVENTS.DAILY_LIMIT_WARNING).length;
    const step4_upgrade_prompt = events.filter(e => e.event === this.CONVERSION_EVENTS.UPGRADE_PROMPT_SHOWN).length;
    const step5_payment_page = events.filter(e => e.event === this.CONVERSION_EVENTS.PAYMENT_PAGE_OPENED).length;
    const step6_payment_success = events.filter(e => e.event === this.CONVERSION_EVENTS.PAYMENT_SUCCESS).length;

    const conversionRates = {
      landing_to_first_check: step1_landing > 0 ? (step2_first_check / step1_landing) * 100 : 0,
      first_check_to_limit: step2_first_check > 0 ? (step3_limit_warning / step2_first_check) * 100 : 0,
      limit_to_upgrade_prompt: step3_limit_warning > 0 ? (step4_upgrade_prompt / step3_limit_warning) * 100 : 0,
      upgrade_prompt_to_payment: step4_upgrade_prompt > 0 ? (step5_payment_page / step4_upgrade_prompt) * 100 : 0,
      payment_to_success: step5_payment_page > 0 ? (step6_payment_success / step5_payment_page) * 100 : 0,
      overall_conversion: step1_landing > 0 ? (step6_payment_success / step1_landing) * 100 : 0
    };

    return {
      step1_landing,
      step2_first_check,
      step3_limit_warning,
      step4_upgrade_prompt,
      step5_payment_page,
      step6_payment_success,
      conversionRates
    };
  }

  /**
   * Export analytics data for GDPR compliance
   */
  async exportUserData(): Promise<{
    userId: string;
    events: AnalyticsEvent[];
    metrics: any;
    exportedAt: number;
  }> {
    const events = await this.getAllUserEvents();
    const metrics = await this.getBusinessMetrics();

    return {
      userId: this.userId,
      events: events.map(event => ({
        ...event,
        userId: 'anonymized' // Remove actual user ID for export
      })),
      metrics,
      exportedAt: Date.now()
    };
  }

  /**
   * Delete all user data for GDPR compliance
   */
  async deleteUserData(): Promise<void> {
    try {
      // Clear all analytics data
      await this.storageService.remove(this.STORAGE_KEY_EVENTS, 'local');
      await this.storageService.remove(this.STORAGE_KEY_METRICS, 'local');
      await this.storageService.remove(this.STORAGE_KEY_USER, 'local');
      await this.storageService.remove('conversion_funnel', 'local');

      // Clear in-memory data
      this.eventQueue = [];

      // Generate new anonymous ID
      this.userId = await this.generateAnonymousUserId();
      await this.storageService.set(this.STORAGE_KEY_USER, { userId: this.userId, createdAt: Date.now() }, 'local');

      logger.info('User analytics data deleted for GDPR compliance');
    } catch (error) {
      logger.error('Failed to delete user analytics data:', error);
      throw error;
    }
  }

  /**
   * Get anonymized usage statistics for dashboard
   */
  async getAnonymizedStats(): Promise<{
    totalUsers: number;
    activeUsers24h: number;
    conversions30d: number;
    topFeatures: { feature: string; usage: number }[];
    avgSessionDuration: number;
  }> {
    const events = await this.getRecentEvents(30 * 24 * 60 * 60 * 1000);
    const last24h = events.filter(e => e.timestamp > Date.now() - 24 * 60 * 60 * 1000);

    const totalUsers = new Set(events.map(e => e.userId)).size;
    const activeUsers24h = new Set(last24h.map(e => e.userId)).size;
    const conversions30d = events.filter(e => e.event === this.CONVERSION_EVENTS.PAYMENT_SUCCESS).length;

    const featureEvents = events.filter(e => e.event === this.CONVERSION_EVENTS.FEATURE_USED);
    const featureUsage = featureEvents.reduce((acc, event) => {
      const feature = event.properties?.feature || 'unknown';
      acc[feature] = (acc[feature] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topFeatures = Object.entries(featureUsage)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([feature, usage]) => ({ feature, usage }));

    const sessionDurations = this.calculateSessionDurations(events);
    const avgSessionDuration = sessionDurations.length > 0
      ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length
      : 0;

    return {
      totalUsers,
      activeUsers24h,
      conversions30d,
      topFeatures,
      avgSessionDuration
    };
  }

  /**
   * Private helper methods
   */

  private async getOrCreateAnonymousUserId(): Promise<string> {
    const stored = await this.storageService.get<{ userId: string; createdAt: number }>(this.STORAGE_KEY_USER, 'local');

    if (stored?.userId) {
      return stored.userId;
    }

    const newUserId = await this.generateAnonymousUserId();
    await this.storageService.set(this.STORAGE_KEY_USER, {
      userId: newUserId,
      createdAt: Date.now()
    }, 'local');

    return newUserId;
  }

  private async generateAnonymousUserId(): Promise<string> {
    // Generate privacy-compliant anonymous ID using installation ID + random salt
    const installationId = chrome.runtime.id;
    const randomSalt = crypto.getRandomValues(new Uint8Array(16));
    const data = new TextEncoder().encode(installationId + Array.from(randomSalt).join(''));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
  }

  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private sanitizeProperties(properties: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(properties)) {
      // Remove any potentially sensitive data
      if (key.toLowerCase().includes('email') ||
          key.toLowerCase().includes('password') ||
          key.toLowerCase().includes('token') ||
          key.toLowerCase().includes('secret')) {
        continue;
      }

      // Sanitize values
      if (typeof value === 'string' && value.length > 100) {
        sanitized[key] = value.substring(0, 100) + '...';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = JSON.stringify(value).substring(0, 200);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private async persistEvents(): Promise<void> {
    try {
      const existingEvents = await this.storageService.get<AnalyticsEvent[]>(this.STORAGE_KEY_EVENTS, 'local') || [];
      const allEvents = [...existingEvents, ...this.eventQueue];

      // Keep only last 5000 events to manage storage
      const eventsToStore = allEvents.slice(-5000);

      await this.storageService.set(this.STORAGE_KEY_EVENTS, eventsToStore, 'local');
    } catch (error) {
      logger.error('Failed to persist analytics events:', error);
    }
  }

  private async loadQueuedEvents(): Promise<void> {
    try {
      const events = await this.storageService.get<AnalyticsEvent[]>(this.STORAGE_KEY_EVENTS, 'local');
      if (events) {
        // Load recent events to queue for potential resending
        const recentEvents = events.filter(e => Date.now() - e.timestamp < this.BATCH_SEND_INTERVAL);
        this.eventQueue = [...this.eventQueue, ...recentEvents].slice(-this.MAX_QUEUE_SIZE);
      }
    } catch (error) {
      logger.error('Failed to load queued analytics events:', error);
    }
  }

  private setupBatchSending(): void {
    // In a real implementation, this would send events to analytics service
    // For privacy compliance, we're storing locally and could send anonymized aggregates
    setInterval(async () => {
      if (this.eventQueue.length > 0) {
        logger.debug(`Processing ${this.eventQueue.length} analytics events`);
        // This is where you would send to external analytics service if needed
        // For now, events are stored locally for privacy
        this.eventQueue = [];
      }
    }, this.BATCH_SEND_INTERVAL);
  }

  private async getRecentEvents(timeRangeMs: number): Promise<AnalyticsEvent[]> {
    const allEvents = await this.storageService.get<AnalyticsEvent[]>(this.STORAGE_KEY_EVENTS, 'local') || [];
    const cutoff = Date.now() - timeRangeMs;
    return allEvents.filter(event => event.timestamp > cutoff);
  }

  private async getEventsInTimeRange(start: number, end: number): Promise<AnalyticsEvent[]> {
    const allEvents = await this.storageService.get<AnalyticsEvent[]>(this.STORAGE_KEY_EVENTS, 'local') || [];
    return allEvents.filter(event => event.timestamp >= start && event.timestamp <= end);
  }

  private async getAllUserEvents(): Promise<AnalyticsEvent[]> {
    return await this.storageService.get<AnalyticsEvent[]>(this.STORAGE_KEY_EVENTS, 'local') || [];
  }

  private calculateSessionDurations(events: AnalyticsEvent[]): number[] {
    const sessions = new Map<string, { start: number; end: number }>();

    events.forEach(event => {
      if (!sessions.has(event.sessionId)) {
        sessions.set(event.sessionId, { start: event.timestamp, end: event.timestamp });
      } else {
        const session = sessions.get(event.sessionId)!;
        session.end = Math.max(session.end, event.timestamp);
      }
    });

    return Array.from(sessions.values()).map(session => session.end - session.start);
  }

  private calculateFeatureUsageRates(featureEvents: AnalyticsEvent[]): Record<string, number> {
    const usage = featureEvents.reduce((acc, event) => {
      const feature = event.properties?.feature || 'unknown';
      acc[feature] = (acc[feature] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const total = featureEvents.length;
    const rates: Record<string, number> = {};

    for (const [feature, count] of Object.entries(usage)) {
      rates[feature] = total > 0 ? (count / total) * 100 : 0;
    }

    return rates;
  }

  private async updateFeatureUsageStats(feature: string, tier: SubscriptionTier, success: boolean): Promise<void> {
    try {
      const stats = await this.storageService.get<Record<string, any>>('feature_usage_stats', 'local') || {};

      if (!stats[feature]) {
        stats[feature] = { total: 0, success: 0, byTier: {} };
      }

      stats[feature].total += 1;
      if (success) stats[feature].success += 1;

      if (!stats[feature].byTier[tier]) {
        stats[feature].byTier[tier] = { total: 0, success: 0 };
      }

      stats[feature].byTier[tier].total += 1;
      if (success) stats[feature].byTier[tier].success += 1;

      await this.storageService.set('feature_usage_stats', stats, 'local');
    } catch (error) {
      logger.error('Failed to update feature usage stats:', error);
    }
  }
}

// Export singleton instance
import { storageService } from '../storage/storageService';
export const analyticsService = new AnalyticsService(storageService);

// Export predefined events for easy usage
export const ANALYTICS_EVENTS = new AnalyticsService(storageService)['CONVERSION_EVENTS'];
