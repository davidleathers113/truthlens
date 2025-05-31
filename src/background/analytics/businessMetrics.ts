// Business Intelligence and Metrics Tracking
// Tracks DAU/MAU, conversion rates, and Gen Z engagement with privacy compliance

import { BusinessMetrics } from '@shared/types';
import { AnalyticsService } from './analyticsService';
import { StorageService } from '@shared/storage/storageService';

export class BusinessMetricsTracker {
  private analytics: AnalyticsService;
  private storage: StorageService;
  private sessionStartTime: number;
  private dailyActiveUsers: Set<string> = new Set();
  private monthlyActiveUsers: Set<string> = new Set();
  
  // Business targets from requirements
  private readonly TARGETS = {
    DAU_MAU_RATIO: 0.40, // 40% target
    PREMIUM_CONVERSION: 0.18, // 18% by month 12
    RETENTION_RATE: 0.60, // 60% minimum
    SESSION_DURATION: 300000, // 5 minutes average
    ENGAGEMENT_RATE: 0.75 // 75% engagement
  };

  constructor(analytics: AnalyticsService) {
    this.analytics = analytics;
    this.storage = new StorageService();
    this.sessionStartTime = Date.now();
    this.initialize();
  }

  async initialize(): Promise<void> {
    await this.loadUserCohorts();
    await this.trackSessionStart();
    this.startPeriodicReporting();
  }

  /**
   * Track daily active users with privacy protection
   */
  async trackActiveUser(userId: string): Promise<void> {
    const anonymizedId = this.anonymizeUserId(userId);
    
    this.dailyActiveUsers.add(anonymizedId);
    this.monthlyActiveUsers.add(anonymizedId);

    await this.analytics.trackEvent('user_activity', {
      type: 'daily_active',
      cohort: await this.getUserCohort(userId),
      isGenZ: await this.isGenZUser(),
      timestamp: Date.now()
    });

    // Update stored metrics
    await this.updateStoredMetrics();
  }

  /**
   * Track conversion events (free to premium)
   */
  async trackConversion(userId: string, conversionType: 'trial' | 'premium' | 'enterprise'): Promise<void> {
    const userCohort = await this.getUserCohort(userId);
    const isGenZ = await this.isGenZUser();
    
    await this.analytics.trackBusinessEvent('conversion', {
      conversionType,
      cohort: userCohort,
      isGenZ,
      timestamp: Date.now()
    });

    // Update conversion rate metrics
    await this.updateConversionMetrics(conversionType);
  }

  /**
   * Track user retention cohorts
   */
  async trackRetention(userId: string, installDate: number): Promise<void> {
    const daysSinceInstall = Math.floor((Date.now() - installDate) / (24 * 60 * 60 * 1000));
    const retentionBucket = this.getRetentionBucket(daysSinceInstall);
    
    await this.analytics.trackBusinessEvent('retention', {
      daysSinceInstall,
      retentionBucket,
      cohort: await this.getUserCohort(userId),
      isGenZ: await this.isGenZUser()
    });
  }

  /**
   * Track feature engagement specifically for Gen Z analysis
   */
  async trackGenZEngagement(feature: string, action: 'viewed' | 'used' | 'abandoned'): Promise<void> {
    const isGenZ = await this.isGenZUser();
    
    if (isGenZ) {
      await this.analytics.trackEvent('genz_engagement', {
        feature,
        action,
        timestamp: Date.now(),
        sessionDuration: Date.now() - this.sessionStartTime
      });
    }

    // Track all users for comparison
    await this.analytics.trackEvent('feature_engagement', {
      feature,
      action,
      userSegment: isGenZ ? 'genz' : 'other',
      timestamp: Date.now()
    });
  }

  /**
   * Track session duration and engagement
   */
  async trackSessionEnd(): Promise<void> {
    const sessionDuration = Date.now() - this.sessionStartTime;
    const isGenZ = await this.isGenZUser();
    
    await this.analytics.trackEngagement({
      sessionDuration,
      timestamp: Date.now()
    });

    // Business metric: track if session meets engagement threshold
    const isEngagedSession = sessionDuration >= this.TARGETS.SESSION_DURATION;
    
    await this.analytics.trackBusinessEvent('retention', {
      sessionDuration,
      isEngagedSession,
      isGenZ,
      timestamp: Date.now()
    });
  }

  /**
   * Calculate and report business metrics
   */
  async calculateBusinessMetrics(): Promise<BusinessMetrics> {
    const dauCount = this.dailyActiveUsers.size;
    const mauCount = this.monthlyActiveUsers.size;
    const dauMauRatio = mauCount > 0 ? dauCount / mauCount : 0;

    const conversionData = await this.getConversionData();
    const retentionData = await this.getRetentionData();
    const engagementData = await this.getEngagementData();

    const metrics: BusinessMetrics = {
      dailyActiveUsers: dauCount,
      monthlyActiveUsers: mauCount,
      retentionRate: retentionData.overallRetention,
      conversionRate: conversionData.premiumConversionRate,
      avgSessionDuration: engagementData.avgSessionDuration,
      featureUsageRate: await this.getFeatureUsageRates(),
      timestamp: Date.now()
    };

    // Track business performance against targets
    await this.analytics.trackEvent('business_metrics', {
      ...metrics,
      dauMauRatio,
      meetsTargets: this.evaluateBusinessTargets(metrics, dauMauRatio),
      genZMetrics: await this.getGenZSpecificMetrics()
    });

    return metrics;
  }

  /**
   * Get Gen Z specific engagement metrics
   */
  private async getGenZSpecificMetrics(): Promise<any> {
    const analyticsData = await this.analytics.getLocalAnalytics();
    
    const genZEvents = analyticsData.filter(data => 
      data.eventCounts?.genz_engagement > 0
    );

    if (genZEvents.length === 0) {
      return {
        engagement: 0,
        preferredFeatures: [],
        sessionPattern: 'unknown'
      };
    }

    // Analyze Gen Z behavior patterns
    return {
      engagement: this.calculateGenZEngagement(genZEvents),
      preferredFeatures: this.getGenZPreferredFeatures(genZEvents),
      sessionPattern: this.analyzeGenZSessionPatterns(genZEvents)
    };
  }

  /**
   * Calculate Gen Z engagement rate
   */
  private calculateGenZEngagement(events: any[]): number {
    let totalActions = 0;
    let engagedActions = 0;

    events.forEach(event => {
      // Count engagement actions vs abandonment
      totalActions += event.eventCounts?.genz_engagement || 0;
      // Assume 'used' actions are engaged, 'abandoned' are not
      engagedActions += Math.floor((event.eventCounts?.genz_engagement || 0) * 0.7); // Rough estimation
    });

    return totalActions > 0 ? engagedActions / totalActions : 0;
  }

  /**
   * Identify Gen Z preferred features
   */
  private getGenZPreferredFeatures(events: any[]): string[] {
    const featureUsage: Record<string, number> = {};
    
    events.forEach(event => {
      // In a real implementation, we'd track specific features
      // This is a simplified example
      if (event.properties?.feature) {
        featureUsage[event.properties.feature] = (featureUsage[event.properties.feature] || 0) + 1;
      }
    });

    return Object.entries(featureUsage)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([feature]) => feature);
  }

  /**
   * Analyze Gen Z session patterns
   */
  private analyzeGenZSessionPatterns(events: any[]): string {
    const sessionDurations = events
      .filter(event => event.properties?.sessionDuration)
      .map(event => event.properties.sessionDuration);

    if (sessionDurations.length === 0) return 'unknown';

    const avgDuration = sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length;

    if (avgDuration < 60000) return 'quick_check'; // < 1 minute
    if (avgDuration < 300000) return 'focused_use'; // 1-5 minutes
    if (avgDuration < 900000) return 'deep_analysis'; // 5-15 minutes
    return 'power_user'; // > 15 minutes
  }

  /**
   * Get conversion data for business metrics
   */
  private async getConversionData(): Promise<any> {
    const subscription = await this.storage.getSubscription();
    
    // In a real implementation, track conversion funnel
    return {
      totalUsers: this.monthlyActiveUsers.size,
      premiumUsers: subscription.tier === 'premium' ? 1 : 0,
      premiumConversionRate: subscription.tier === 'premium' ? 1 / Math.max(this.monthlyActiveUsers.size, 1) : 0,
      conversionFunnel: {
        awareness: this.monthlyActiveUsers.size,
        interest: Math.floor(this.monthlyActiveUsers.size * 0.3),
        consideration: Math.floor(this.monthlyActiveUsers.size * 0.1),
        conversion: subscription.tier === 'premium' ? 1 : 0
      }
    };
  }

  /**
   * Get retention data
   */
  private async getRetentionData(): Promise<any> {
    // Simplified retention calculation
    // In a real implementation, track user return patterns
    return {
      overallRetention: 0.65, // Placeholder
      cohortRetention: {
        day1: 0.80,
        day7: 0.60,
        day30: 0.40,
        day90: 0.25
      }
    };
  }

  /**
   * Get engagement data
   */
  private async getEngagementData(): Promise<any> {
    const analyticsData = await this.analytics.getLocalAnalytics();
    
    const sessionData = analyticsData.filter(data => 
      data.sessionData?.duration
    );

    if (sessionData.length === 0) {
      return {
        avgSessionDuration: this.TARGETS.SESSION_DURATION,
        engagementRate: 0.5
      };
    }

    const avgDuration = sessionData.reduce((sum, data) => 
      sum + (data.sessionData?.duration || 0), 0
    ) / sessionData.length;

    return {
      avgSessionDuration: avgDuration,
      engagementRate: avgDuration >= this.TARGETS.SESSION_DURATION ? 0.8 : 0.5
    };
  }

  /**
   * Get feature usage rates
   */
  private async getFeatureUsageRates(): Promise<Record<string, number>> {
    const settings = await this.storage.getSettings();
    
    // Calculate usage rates based on settings and activity
    return {
      credibilityChecking: settings.enabled ? 0.9 : 0,
      visualIndicators: settings.showVisualIndicators ? 0.8 : 0,
      autoAnalyze: settings.autoAnalyze ? 0.7 : 0,
      notifications: settings.notifications.enabled ? 0.6 : 0,
      customDomains: (settings.trustedDomains.length + settings.blockedDomains.length) > 0 ? 0.3 : 0
    };
  }

  /**
   * Evaluate if current metrics meet business targets
   */
  private evaluateBusinessTargets(metrics: BusinessMetrics, dauMauRatio: number): Record<string, boolean> {
    return {
      dauMauRatio: dauMauRatio >= this.TARGETS.DAU_MAU_RATIO,
      conversionRate: metrics.conversionRate >= this.TARGETS.PREMIUM_CONVERSION,
      retentionRate: metrics.retentionRate >= this.TARGETS.RETENTION_RATE,
      sessionDuration: metrics.avgSessionDuration >= this.TARGETS.SESSION_DURATION,
      overallHealth: (
        dauMauRatio >= this.TARGETS.DAU_MAU_RATIO &&
        metrics.retentionRate >= this.TARGETS.RETENTION_RATE
      )
    };
  }

  /**
   * Update conversion metrics in storage
   */
  private async updateConversionMetrics(conversionType: string): Promise<void> {
    const key = `conversion_${conversionType}_${Date.now()}`;
    await chrome.storage.local.set({ [key]: { type: conversionType, timestamp: Date.now() } });
  }

  /**
   * Update stored business metrics
   */
  private async updateStoredMetrics(): Promise<void> {
    const metrics = await this.calculateBusinessMetrics();
    const key = `business_metrics_${Date.now()}`;
    await chrome.storage.local.set({ [key]: metrics });
  }

  /**
   * Load user cohorts from storage
   */
  private async loadUserCohorts(): Promise<void> {
    // Load existing DAU/MAU data
    const items = await chrome.storage.local.get();
    const today = new Date().toDateString();
    
    Object.entries(items).forEach(([key, value]) => {
      if (key.startsWith('dau_') && key.includes(today)) {
        const userData = value as any;
        if (userData.users) {
          userData.users.forEach((userId: string) => this.dailyActiveUsers.add(userId));
        }
      }
      if (key.startsWith('mau_')) {
        const userData = value as any;
        if (userData.users) {
          userData.users.forEach((userId: string) => this.monthlyActiveUsers.add(userId));
        }
      }
    });
  }

  /**
   * Track session start
   */
  private async trackSessionStart(): Promise<void> {
    await this.analytics.trackEvent('session_start', {
      timestamp: this.sessionStartTime,
      isGenZ: await this.isGenZUser(),
      userTier: (await this.storage.getSubscription()).tier
    });
  }

  /**
   * Start periodic business metrics reporting
   */
  private startPeriodicReporting(): void {
    // Report business metrics every hour
    setInterval(async () => {
      await this.calculateBusinessMetrics();
    }, 60 * 60 * 1000);

    // Clear daily users at midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    setTimeout(() => {
      this.dailyActiveUsers.clear();
      setInterval(() => {
        this.dailyActiveUsers.clear();
      }, 24 * 60 * 60 * 1000);
    }, tomorrow.getTime() - now.getTime());
  }

  /**
   * Helper methods
   */
  private anonymizeUserId(userId: string): string {
    // Simple hash for privacy
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private async getUserCohort(userId: string): Promise<string> {
    const subscription = await this.storage.getSubscription();
    if (subscription.tier === 'premium') return 'premium';
    if (subscription.tier === 'enterprise') return 'enterprise';
    return 'free';
  }

  private async isGenZUser(_userId?: string): Promise<boolean> {
    const settings = await this.storage.getSettings();
    // Use behavior patterns to identify Gen Z users (privacy-safe)
    return settings.theme === 'dark' && 
           settings.notifications.enabled &&
           settings.autoAnalyze;
  }

  private getRetentionBucket(days: number): string {
    if (days <= 1) return 'day1';
    if (days <= 7) return 'week1';
    if (days <= 30) return 'month1';
    if (days <= 90) return 'quarter1';
    return 'long_term';
  }
}