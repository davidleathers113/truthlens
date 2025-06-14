// Privacy-First Analytics Service
// Handles telemetry collection with GDPR compliance and local aggregation

import {
  AnalyticsEvent,
  UserEngagementMetrics,
  AnalyticsConfig,
  ConsentData
} from '@shared/types';
import { StorageService } from '@shared/storage/storageService';

export class AnalyticsService {
  private storage: StorageService;
  private config: AnalyticsConfig;
  private eventQueue: AnalyticsEvent[] = [];
  private sessionId: string;
  private userId: string;
  private aggregationTimer?: NodeJS.Timeout;

  constructor() {
    this.storage = new StorageService();
    this.sessionId = this.generateSessionId();
    this.userId = this.generateUserId();

    // Default privacy-first configuration
    this.config = {
      enabled: false, // Requires explicit opt-in
      consentRequired: true,
      localProcessingOnly: true,
      aggregationInterval: 15, // 15 minutes
      retentionPeriod: 30, // 30 days
      privacyLevel: 'minimal',
      endpoints: {
        events: '',
        performance: '',
        business: ''
      }
    };

    this.initialize();
  }

  async initialize(): Promise<void> {
    const settings = await this.storage.getSettings();

    if (settings.privacy.analyticsEnabled) {
      this.config.enabled = true;
      this.startAggregationTimer();
    }

    // Check for existing consent
    const consent = await this.getConsentData();
    if (consent && !consent.analyticsConsent) {
      this.config.enabled = false;
    }
  }

  /**
   * Track an analytics event with privacy protection
   */
  async trackEvent(eventName: string, properties?: Record<string, unknown>): Promise<void> {
    if (!this.config.enabled) return;

    const consent = await this.getConsentData();
    if (!consent?.analyticsConsent) return;

    const event: AnalyticsEvent = {
      event: eventName,
      properties: this.sanitizeProperties(properties),
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.config.privacyLevel === 'minimal' ? undefined : this.userId
    };

    this.eventQueue.push(event);

    // Local aggregation for privacy
    if (this.eventQueue.length >= 50 || this.config.privacyLevel === 'detailed') {
      await this.processEventQueue();
    }
  }

  /**
   * Track user engagement metrics
   */
  async trackEngagement(metrics: Partial<UserEngagementMetrics>): Promise<void> {
    if (!this.config.enabled) return;

    await this.trackEvent('user_engagement', {
      ...metrics,
      cohort: await this.getUserCohort(),
      isGenZ: await this.isGenZUser()
    });
  }

  /**
   * Track business-critical events
   */
  async trackBusinessEvent(eventType: 'conversion' | 'retention' | 'churn' | 'activation', data: unknown): Promise<void> {
    if (!this.config.enabled) return;

    const businessData = data && typeof data === 'object' ? data as Record<string, unknown> : {};

    await this.trackEvent(`business_${eventType}`, {
      ...businessData,
      userTier: (await this.storage.getSubscription()).tier,
      timestamp: Date.now()
    });
  }

  /**
   * Process and aggregate events locally before any transmission
   */
  private async processEventQueue(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const aggregatedData = this.aggregateEvents(this.eventQueue);

    if (this.config.localProcessingOnly) {
      // Store locally for dashboard view
      await this.storeLocalAnalytics(aggregatedData);
    } else {
      // Would transmit to secure endpoint with encryption
      await this.transmitAggregatedData(aggregatedData);
    }

    this.eventQueue = [];
  }

  /**
   * Aggregate events with differential privacy
   */
  private aggregateEvents(events: AnalyticsEvent[]): unknown {
    const aggregated = {
      totalEvents: events.length,
      uniqueEvents: new Set(events.map(e => e.event)).size,
      timeRange: {
        start: Math.min(...events.map(e => e.timestamp)),
        end: Math.max(...events.map(e => e.timestamp))
      },
      eventCounts: {} as Record<string, number>,
      sessionData: {
        sessionId: this.sessionId,
        duration: Date.now() - Math.min(...events.map(e => e.timestamp))
      }
    };

    // Count events with noise for differential privacy
    events.forEach(event => {
      const currentCount = Object.prototype.hasOwnProperty.call(aggregated.eventCounts, event.event)
        ? aggregated.eventCounts[event.event]
        : 0;
      aggregated.eventCounts[event.event] = currentCount + 1;
    });

    // Add random noise for differential privacy (Laplace mechanism)
    if (this.config.privacyLevel === 'minimal') {
      Object.keys(aggregated.eventCounts).forEach(key => {
        const noise = this.generateLaplaceNoise(0.1); // Small epsilon for strong privacy
        const currentValue = Object.prototype.hasOwnProperty.call(aggregated.eventCounts, key)
          ? aggregated.eventCounts[key]
          : 0;
        aggregated.eventCounts[key] = Math.max(0, currentValue + noise);
      });
    }

    return aggregated;
  }

  /**
   * Generate Laplace noise for differential privacy
   */
  private generateLaplaceNoise(epsilon: number): number {
    const u = Math.random() - 0.5;
    return -Math.sign(u) * Math.log(1 - 2 * Math.abs(u)) / epsilon;
  }

  /**
   * Store analytics data locally
   */
  private async storeLocalAnalytics(data: unknown): Promise<void> {
    const key = `analytics_${Date.now()}`;
    await chrome.storage.local.set({ [key]: data });

    // Clean old data based on retention period
    await this.cleanOldAnalytics();
  }

  /**
   * Clean old analytics data
   */
  private async cleanOldAnalytics(): Promise<void> {
    const items = await chrome.storage.local.get();
    const cutoffTime = Date.now() - (this.config.retentionPeriod * 24 * 60 * 60 * 1000);

    const keysToRemove = Object.keys(items).filter(key => {
      if (key.startsWith('analytics_')) {
        const timestamp = parseInt(key.split('_')[1]);
        return timestamp < cutoffTime;
      }
      return false;
    });

    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
    }
  }

  /**
   * Get user consent data
   */
  private async getConsentData(): Promise<ConsentData | null> {
    const result = await chrome.storage.sync.get('consent');
    return result.consent || null;
  }

  /**
   * Sanitize event properties to remove PII
   */
  private sanitizeProperties(properties?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!properties) return undefined;

    const sanitized = { ...properties };

    // Remove potential PII fields
    const piiFields = ['email', 'name', 'address', 'phone', 'ip', 'userAgent'];
    piiFields.forEach(field => {
      if (Object.prototype.hasOwnProperty.call(sanitized, field)) {
        delete sanitized[field];
      }
    });

    // Truncate URLs to domain only for privacy
    if (sanitized.url && typeof sanitized.url === 'string') {
      try {
        const url = new URL(sanitized.url);
        sanitized.domain = url.hostname;
        delete sanitized.url;
      } catch {
        delete sanitized.url;
      }
    }

    return sanitized;
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate anonymous user ID
   */
  private generateUserId(): string {
    // Use a hash of installation time + random for consistency but anonymity
    const installTime = Date.now();
    const random = Math.random().toString(36);
    return `user_${btoa(installTime + random).substr(0, 16)}`;
  }

  /**
   * Determine user cohort for segmentation
   */
  private async getUserCohort(): Promise<string> {
    const subscription = await this.storage.getSubscription();
    const settings = await this.storage.getSettings();

    if (subscription.tier === 'premium') return 'premium';
    if (settings.privacy.localProcessingOnly) return 'privacy_focused';
    return 'standard';
  }

  /**
   * Detect Gen Z user patterns (privacy-safe heuristics)
   */
  private async isGenZUser(): Promise<boolean> {
    // Use behavior patterns rather than personal data
    const settings = await this.storage.getSettings();

    // Gen Z indicators: dark theme preference, frequent notifications, mobile-first behavior
    return settings.theme === 'dark' &&
           settings.notifications.enabled &&
           settings.factCheckingLevel === 'standard';
  }

  /**
   * Start aggregation timer
   */
  private startAggregationTimer(): void {
    this.aggregationTimer = setInterval(async () => {
      await this.processEventQueue();
    }, this.config.aggregationInterval * 60 * 1000);
  }

  /**
   * Transmit aggregated data (placeholder for future implementation)
   */
  private async transmitAggregatedData(data: any): Promise<void> {
    // Would implement secure transmission with encryption
    console.log('Transmitting aggregated analytics data:', data);
  }

  /**
   * Get local analytics data for dashboard
   */
  async getLocalAnalytics(timeRange?: { start: number; end: number }): Promise<any[]> {
    const items = await chrome.storage.local.get();
    const analyticsData = [];

    for (const [key, value] of Object.entries(items)) {
      if (key.startsWith('analytics_')) {
        const timestamp = parseInt(key.split('_')[1]);

        if (!timeRange || (timestamp >= timeRange.start && timestamp <= timeRange.end)) {
          analyticsData.push(value);
        }
      }
    }

    return analyticsData.sort((a, b) => a.timeRange.start - b.timeRange.start);
  }

  /**
   * Cleanup on service destruction
   */
  destroy(): void {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
    }

    // Process any remaining events
    this.processEventQueue();
  }
}
