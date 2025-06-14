/**
 * Notification Service
 * Manages subscription renewal alerts, usage limits, and payment notifications
 * Following 2025 GDPR-compliant best practices for Chrome extension notifications
 */

import { SubscriptionTier } from '@shared/types';
import { StorageService } from '../storage/storageService';
import { logger } from './logger';
import { subscriptionManager } from './subscriptionManager';
import { usageTracker } from './usageTracker';
import { analyticsService } from './analyticsService';

export interface NotificationPreferences {
  enableUsageLimitNotifications: boolean;
  enableRenewalReminders: boolean;
  enablePaymentNotifications: boolean;
  enableFeatureNotifications: boolean;
  enablePromotionalNotifications: boolean;
  reminderDaysBeforeRenewal: number[];
  maxNotificationsPerDay: number;
  doNotDisturbMode: boolean;
  doNotDisturbStart?: string; // HH:MM format
  doNotDisturbEnd?: string; // HH:MM format
  consentGiven: boolean;
  consentTimestamp?: number;
}

export interface NotificationTemplate {
  id: string;
  type: 'usage_limit' | 'renewal_reminder' | 'payment_alert' | 'feature_unlock' | 'promotional';
  title: string;
  message: string;
  iconUrl?: string;
  imageUrl?: string;
  buttons?: Array<{
    title: string;
    iconUrl?: string;
    action: string;
  }>;
  priority: 'low' | 'normal' | 'high';
  requiresAction: boolean;
  expiresAfterMs?: number;
}

export interface NotificationHistory {
  notificationId: string;
  templateId: string;
  timestamp: number;
  shown: boolean;
  clicked: boolean;
  dismissed: boolean;
  actionTaken?: string;
  tier: SubscriptionTier;
}

export interface NotificationQuota {
  daily: number;
  perType: Record<string, number>;
  lastReset: number;
}

export class NotificationService {
  private storageService: StorageService;
  private readonly STORAGE_KEY_PREFERENCES = 'notification_preferences';
  private readonly STORAGE_KEY_HISTORY = 'notification_history';
  private readonly STORAGE_KEY_QUOTA = 'notification_quota';
  private readonly DEFAULT_ICON = '/icons/icon-48.png';

  // Notification frequency limits (GDPR-compliant)
  private readonly MAX_DAILY_NOTIFICATIONS = 5;
  private readonly MIN_INTERVAL_BETWEEN_NOTIFICATIONS = 2 * 60 * 60 * 1000; // 2 hours
  // @ts-ignore - Reserved for future promotional notification features
  private readonly PROMOTIONAL_MAX_PER_WEEK = 1;

  // Predefined notification templates following 2025 UX best practices
  private readonly TEMPLATES: Record<string, NotificationTemplate> = {
    USAGE_LIMIT_WARNING: {
      id: 'usage_limit_warning',
      type: 'usage_limit',
      title: 'TruthLens - Approaching Daily Limit',
      message: 'You\'ve used 80% of your daily fact-checks. Upgrade to Premium for unlimited access.',
      iconUrl: this.DEFAULT_ICON,
      buttons: [
        { title: 'Upgrade Now', action: 'upgrade' },
        { title: 'View Usage', action: 'view_usage' }
      ],
      priority: 'normal',
      requiresAction: false,
      expiresAfterMs: 4 * 60 * 60 * 1000 // 4 hours
    },
    USAGE_LIMIT_REACHED: {
      id: 'usage_limit_reached',
      type: 'usage_limit',
      title: 'TruthLens - Daily Limit Reached',
      message: 'You\'ve reached your daily limit of 50 fact-checks. Upgrade to Premium for unlimited access.',
      iconUrl: this.DEFAULT_ICON,
      buttons: [
        { title: 'Upgrade to Premium', action: 'upgrade' },
        { title: 'Reset Tomorrow', action: 'dismiss' }
      ],
      priority: 'high',
      requiresAction: true,
      expiresAfterMs: 12 * 60 * 60 * 1000 // 12 hours
    },
    RENEWAL_REMINDER_7_DAYS: {
      id: 'renewal_reminder_7_days',
      type: 'renewal_reminder',
      title: 'TruthLens Premium - Renewal Reminder',
      message: 'Your Premium subscription renews in 7 days. No action needed - we\'ll handle it automatically.',
      iconUrl: this.DEFAULT_ICON,
      buttons: [
        { title: 'Manage Subscription', action: 'manage_subscription' },
        { title: 'OK', action: 'dismiss' }
      ],
      priority: 'low',
      requiresAction: false,
      expiresAfterMs: 48 * 60 * 60 * 1000 // 48 hours
    },
    PAYMENT_SUCCESS: {
      id: 'payment_success',
      type: 'payment_alert',
      title: 'TruthLens Premium - Payment Successful',
      message: 'Welcome to Premium! You now have unlimited fact-checking and advanced features.',
      iconUrl: this.DEFAULT_ICON,
      buttons: [
        { title: 'Explore Features', action: 'explore_features' },
        { title: 'Thanks!', action: 'dismiss' }
      ],
      priority: 'high',
      requiresAction: false,
      expiresAfterMs: 24 * 60 * 60 * 1000 // 24 hours
    },
    PAYMENT_FAILED: {
      id: 'payment_failed',
      type: 'payment_alert',
      title: 'TruthLens - Payment Issue',
      message: 'We couldn\'t process your payment. Update your payment method to continue Premium access.',
      iconUrl: this.DEFAULT_ICON,
      buttons: [
        { title: 'Update Payment', action: 'update_payment' },
        { title: 'Contact Support', action: 'contact_support' }
      ],
      priority: 'high',
      requiresAction: true,
      expiresAfterMs: 48 * 60 * 60 * 1000 // 48 hours
    },
    FEATURE_UNLOCK: {
      id: 'feature_unlock',
      type: 'feature_unlock',
      title: 'TruthLens - New Feature Available',
      message: 'Bias analysis is now available! Discover political bias in news articles automatically.',
      iconUrl: this.DEFAULT_ICON,
      buttons: [
        { title: 'Try It Now', action: 'try_feature' },
        { title: 'Learn More', action: 'learn_more' }
      ],
      priority: 'normal',
      requiresAction: false,
      expiresAfterMs: 7 * 24 * 60 * 60 * 1000 // 7 days
    },
    GRACE_PERIOD_WARNING: {
      id: 'grace_period_warning',
      type: 'renewal_reminder',
      title: 'TruthLens - Subscription Expiring Soon',
      message: 'Your Premium subscription expires in 3 days. Renew now to avoid losing access.',
      iconUrl: this.DEFAULT_ICON,
      buttons: [
        { title: 'Renew Now', action: 'renew_subscription' },
        { title: 'Manage Subscription', action: 'manage_subscription' }
      ],
      priority: 'high',
      requiresAction: true,
      expiresAfterMs: 24 * 60 * 60 * 1000 // 24 hours
    }
  };

  constructor(storageService: StorageService) {
    this.storageService = storageService;
    this.setupNotificationHandlers();
  }

  /**
   * Initialize notification service with GDPR-compliant defaults
   */
  async initialize(): Promise<void> {
    try {
      // Set up default preferences if not exist
      const preferences = await this.getNotificationPreferences();
      if (!preferences.consentGiven) {
        // Don't initialize until consent is given
        logger.info('Notification service waiting for GDPR consent');
        return;
      }

      // Set up periodic checks for subscription events
      this.setupPeriodicChecks();

      // Request notification permissions
      await this.requestNotificationPermissions();

      logger.info('Notification service initialized with GDPR compliance');
    } catch (error) {
      logger.error('Failed to initialize notification service:', error instanceof Error ? { message: error.message, stack: error.stack } : { error });
      throw error;
    }
  }

  /**
   * Get user notification preferences with GDPR-compliant defaults
   */
  async getNotificationPreferences(): Promise<NotificationPreferences> {
    const stored = await this.storageService.get<NotificationPreferences>(this.STORAGE_KEY_PREFERENCES, 'sync');

    return {
      enableUsageLimitNotifications: stored?.enableUsageLimitNotifications ?? true,
      enableRenewalReminders: stored?.enableRenewalReminders ?? true,
      enablePaymentNotifications: stored?.enablePaymentNotifications ?? true,
      enableFeatureNotifications: stored?.enableFeatureNotifications ?? false, // Opt-in for promotional
      enablePromotionalNotifications: stored?.enablePromotionalNotifications ?? false, // Opt-in required
      reminderDaysBeforeRenewal: stored?.reminderDaysBeforeRenewal ?? [7, 3, 1],
      maxNotificationsPerDay: stored?.maxNotificationsPerDay ?? this.MAX_DAILY_NOTIFICATIONS,
      doNotDisturbMode: stored?.doNotDisturbMode ?? false,
      doNotDisturbStart: stored?.doNotDisturbStart,
      doNotDisturbEnd: stored?.doNotDisturbEnd,
      consentGiven: stored?.consentGiven ?? false,
      consentTimestamp: stored?.consentTimestamp
    };
  }

  /**
   * Update notification preferences with GDPR compliance tracking
   */
  async updateNotificationPreferences(preferences: Partial<NotificationPreferences>): Promise<void> {
    const current = await this.getNotificationPreferences();
    const updated = { ...current, ...preferences };

    // Track consent changes for GDPR compliance
    if (preferences.consentGiven !== undefined && preferences.consentGiven !== current.consentGiven) {
      updated.consentTimestamp = Date.now();

      // Track consent in analytics
      await analyticsService.trackEvent('notification_consent_changed', {
        consentGiven: preferences.consentGiven,
        previousConsent: current.consentGiven
      });
    }

    await this.storageService.set(this.STORAGE_KEY_PREFERENCES, updated, 'sync');

    if (updated.consentGiven && !current.consentGiven) {
      // Initialize service now that consent is given
      await this.initialize();
    }
  }

  /**
   * Show notification with GDPR compliance and frequency limiting
   */
  async showNotification(
    templateId: string,
    customData?: Record<string, any>,
    forceShow: boolean = false
  ): Promise<{ shown: boolean; reason?: string }> {
    const preferences = await this.getNotificationPreferences();

    // Check GDPR consent
    if (!preferences.consentGiven) {
      return { shown: false, reason: 'No consent given for notifications' };
    }

    const template = this.TEMPLATES[templateId];
    if (!template) {
      return { shown: false, reason: 'Template not found' };
    }

    // Check if notification type is enabled
    if (!this.isNotificationTypeEnabled(template.type, preferences)) {
      return { shown: false, reason: 'Notification type disabled by user' };
    }

    // Check do not disturb mode
    if (this.isDoNotDisturbActive(preferences)) {
      return { shown: false, reason: 'Do not disturb mode active' };
    }

    // Check daily quota (unless force show)
    if (!forceShow && !(await this.checkDailyQuota(template.type))) {
      return { shown: false, reason: 'Daily notification quota exceeded' };
    }

    // Check minimum interval between notifications
    if (!forceShow && !(await this.checkMinimumInterval())) {
      return { shown: false, reason: 'Minimum interval not met' };
    }

    try {
      // Create the notification
      const notificationId = await this.createChromeNotification(template, customData);

      // Record in history and analytics
      await this.recordNotificationHistory(notificationId, templateId, template.type);
      await this.updateDailyQuota(template.type);

      // Track in analytics
      await analyticsService.trackEvent('notification_shown', {
        templateId,
        type: template.type,
        priority: template.priority
      });

      return { shown: true };
    } catch (error) {
      logger.error('Failed to show notification:', error instanceof Error ? { message: error.message, stack: error.stack } : { error });
      return { shown: false, reason: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Handle specific subscription lifecycle notifications
   */
  async handleSubscriptionEvent(
    event: 'payment_success' | 'payment_failed' | 'renewal_reminder' | 'grace_period_warning' | 'subscription_cancelled',
    data?: Record<string, any>
  ): Promise<void> {
    const subscription = await subscriptionManager.getCurrentSubscription();

    switch (event) {
      case 'payment_success':
        await this.showNotification('PAYMENT_SUCCESS', {
          tier: data?.tier || subscription.tier,
          planName: data?.planName || 'Premium'
        });
        break;

      case 'payment_failed':
        await this.showNotification('PAYMENT_FAILED', data, true); // Force show critical notifications
        break;

      case 'renewal_reminder':
        const daysUntilRenewal = data?.daysUntilRenewal || 7;
        if (daysUntilRenewal === 7) {
          await this.showNotification('RENEWAL_REMINDER_7_DAYS', data);
        }
        break;

      case 'grace_period_warning':
        await this.showNotification('GRACE_PERIOD_WARNING', data, true); // Force show critical notifications
        break;
    }
  }

  /**
   * Handle usage limit notifications
   */
  async handleUsageLimitEvent(
    event: 'approaching_limit' | 'limit_reached',
    usageData: { used: number; limit: number; remaining: number }
  ): Promise<void> {
    switch (event) {
      case 'approaching_limit':
        await this.showNotification('USAGE_LIMIT_WARNING', {
          usagePercentage: Math.round((usageData.used / usageData.limit) * 100),
          remaining: usageData.remaining
        });
        break;

      case 'limit_reached':
        await this.showNotification('USAGE_LIMIT_REACHED', {
          limit: usageData.limit,
          resetTime: await usageTracker.getTimeUntilReset()
        });
        break;
    }
  }

  /**
   * Show feature unlock notification for new premium features
   */
  async showFeatureUnlockNotification(
    featureName: string,
    featureDescription: string,
    tier: SubscriptionTier
  ): Promise<void> {
    await this.showNotification('FEATURE_UNLOCK', {
      featureName,
      featureDescription,
      tier
    });
  }

  /**
   * Get notification history for analytics and GDPR compliance
   */
  async getNotificationHistory(days: number = 30): Promise<NotificationHistory[]> {
    const history = await this.storageService.get<NotificationHistory[]>(this.STORAGE_KEY_HISTORY, 'local') || [];
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    return history.filter(item => item.timestamp > cutoff);
  }

  /**
   * Clear notification history for GDPR compliance
   */
  async clearNotificationHistory(): Promise<void> {
    await this.storageService.remove(this.STORAGE_KEY_HISTORY, 'local');
    await this.storageService.remove(this.STORAGE_KEY_QUOTA, 'local');
    logger.info('Notification history cleared for GDPR compliance');
  }

  /**
   * Get notification analytics summary
   */
  async getNotificationAnalytics(): Promise<{
    totalShown: number;
    clickThrough: number;
    dismissRate: number;
    conversionRate: number;
    topPerformingTemplates: Array<{ templateId: string; impressions: number; clicks: number; ctr: number }>;
  }> {
    const history = await this.getNotificationHistory(30);

    const totalShown = history.filter(h => h.shown).length;
    const clicked = history.filter(h => h.clicked).length;
    const dismissed = history.filter(h => h.dismissed).length;
    const converted = history.filter(h => h.actionTaken === 'upgrade' || h.actionTaken === 'payment').length;

    const clickThrough = totalShown > 0 ? (clicked / totalShown) * 100 : 0;
    const dismissRate = totalShown > 0 ? (dismissed / totalShown) * 100 : 0;
    const conversionRate = totalShown > 0 ? (converted / totalShown) * 100 : 0;

    // Calculate template performance
    const templateStats = new Map<string, { impressions: number; clicks: number }>();
    history.forEach(h => {
      if (!templateStats.has(h.templateId)) {
        templateStats.set(h.templateId, { impressions: 0, clicks: 0 });
      }
      const stats = templateStats.get(h.templateId)!;
      if (h.shown) stats.impressions++;
      if (h.clicked) stats.clicks++;
    });

    const topPerformingTemplates = Array.from(templateStats.entries())
      .map(([templateId, stats]) => ({
        templateId,
        impressions: stats.impressions,
        clicks: stats.clicks,
        ctr: stats.impressions > 0 ? (stats.clicks / stats.impressions) * 100 : 0
      }))
      .sort((a, b) => b.ctr - a.ctr)
      .slice(0, 5);

    return {
      totalShown,
      clickThrough,
      dismissRate,
      conversionRate,
      topPerformingTemplates
    };
  }

  /**
   * Private helper methods
   */

  private async requestNotificationPermissions(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!chrome.notifications) {
        resolve(false);
        return;
      }

      // Chrome extensions have notification permissions by default if declared in manifest
      resolve(true);
    });
  }

  private async createChromeNotification(
    template: NotificationTemplate,
    customData?: Record<string, any>
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!chrome.notifications) {
        reject(new Error('Chrome notifications API not available'));
        return;
      }

      const notificationId = `truthlens_${template.id}_${Date.now()}`;

      const options: chrome.notifications.NotificationOptions<true> = {
        type: 'basic',
        iconUrl: template.iconUrl || this.DEFAULT_ICON,
        title: template.title,
        message: this.interpolateMessage(template.message, customData),
        buttons: template.buttons?.map(btn => ({ title: btn.title, iconUrl: btn.iconUrl })),
        requireInteraction: template.requiresAction,
        priority: template.priority === 'high' ? 2 : template.priority === 'low' ? 0 : 1
      };

      if (template.imageUrl) {
        options.type = 'image';
        options.imageUrl = template.imageUrl;
      }

      chrome.notifications.create(notificationId, options, (id) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(id || notificationId);
        }
      });

      // Auto-clear notification after expiry
      if (template.expiresAfterMs) {
        setTimeout(() => {
          chrome.notifications.clear(notificationId);
        }, template.expiresAfterMs);
      }
    });
  }

  private interpolateMessage(message: string, data?: Record<string, any>): string {
    if (!data) return message;

    return message.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key]?.toString() || match;
    });
  }

  private isNotificationTypeEnabled(type: NotificationTemplate['type'], preferences: NotificationPreferences): boolean {
    switch (type) {
      case 'usage_limit':
        return preferences.enableUsageLimitNotifications;
      case 'renewal_reminder':
        return preferences.enableRenewalReminders;
      case 'payment_alert':
        return preferences.enablePaymentNotifications;
      case 'feature_unlock':
        return preferences.enableFeatureNotifications;
      case 'promotional':
        return preferences.enablePromotionalNotifications;
      default:
        return false;
    }
  }

  private isDoNotDisturbActive(preferences: NotificationPreferences): boolean {
    if (!preferences.doNotDisturbMode || !preferences.doNotDisturbStart || !preferences.doNotDisturbEnd) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = preferences.doNotDisturbStart.split(':').map(Number);
    const [endHour, endMin] = preferences.doNotDisturbEnd.split(':').map(Number);

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Overnight period
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  private async checkDailyQuota(_type: NotificationTemplate['type']): Promise<boolean> {
    const quota = await this.getDailyQuota();
    const preferences = await this.getNotificationPreferences();

    return quota.daily < preferences.maxNotificationsPerDay;
  }

  private async checkMinimumInterval(): Promise<boolean> {
    const history = await this.getNotificationHistory(1); // Last 24 hours

    if (history.length === 0) return true;

    const lastNotification = history
      .filter(h => h.shown)
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    if (!lastNotification) return true;

    return Date.now() - lastNotification.timestamp >= this.MIN_INTERVAL_BETWEEN_NOTIFICATIONS;
  }

  private async getDailyQuota(): Promise<NotificationQuota> {
    const stored = await this.storageService.get<NotificationQuota>(this.STORAGE_KEY_QUOTA, 'local');
    const now = Date.now();
    const today = new Date(now).toDateString();
    const storedDay = stored?.lastReset ? new Date(stored.lastReset).toDateString() : '';

    if (!stored || today !== storedDay) {
      // Reset quota for new day
      const newQuota: NotificationQuota = {
        daily: 0,
        perType: {},
        lastReset: now
      };
      await this.storageService.set(this.STORAGE_KEY_QUOTA, newQuota, 'local');
      return newQuota;
    }

    return stored;
  }

  private async updateDailyQuota(type: NotificationTemplate['type']): Promise<void> {
    const quota = await this.getDailyQuota();
    quota.daily += 1;
    quota.perType[type] = (quota.perType[type] || 0) + 1;
    await this.storageService.set(this.STORAGE_KEY_QUOTA, quota, 'local');
  }

  private async recordNotificationHistory(
    notificationId: string,
    templateId: string,
    _type: NotificationTemplate['type']
  ): Promise<void> {
    const subscription = await subscriptionManager.getCurrentSubscription();
    const history = await this.storageService.get<NotificationHistory[]>(this.STORAGE_KEY_HISTORY, 'local') || [];

    const record: NotificationHistory = {
      notificationId,
      templateId,
      timestamp: Date.now(),
      shown: true,
      clicked: false,
      dismissed: false,
      tier: subscription.tier
    };

    history.push(record);

    // Keep only last 1000 records
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }

    await this.storageService.set(this.STORAGE_KEY_HISTORY, history, 'local');
  }

  private setupNotificationHandlers(): void {
    if (!chrome.notifications) return;

    // Handle notification clicks
    chrome.notifications.onClicked.addListener(async (notificationId) => {
      await this.handleNotificationClick(notificationId);
    });

    // Handle button clicks
    chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
      await this.handleNotificationButtonClick(notificationId, buttonIndex);
    });

    // Handle dismissals
    chrome.notifications.onClosed.addListener(async (notificationId, byUser) => {
      if (byUser) {
        await this.handleNotificationDismissal(notificationId);
      }
    });
  }

  private async handleNotificationClick(notificationId: string): Promise<void> {
    await this.updateNotificationHistory(notificationId, { clicked: true });
    await analyticsService.trackEvent('notification_clicked', { notificationId });
  }

  private async handleNotificationButtonClick(notificationId: string, buttonIndex: number): Promise<void> {
    const templateId = notificationId.split('_')[1];
    const template = this.TEMPLATES[templateId];

    if (template?.buttons?.[buttonIndex]) {
      const action = template.buttons[buttonIndex].action;

      await this.updateNotificationHistory(notificationId, {
        clicked: true,
        actionTaken: action
      });

      await analyticsService.trackEvent('notification_action', {
        notificationId,
        action,
        buttonIndex
      });

      // Handle specific actions
      await this.handleNotificationAction(action);
    }

    // Clear notification after button click
    chrome.notifications.clear(notificationId);
  }

  private async handleNotificationDismissal(notificationId: string): Promise<void> {
    await this.updateNotificationHistory(notificationId, { dismissed: true });
    await analyticsService.trackEvent('notification_dismissed', { notificationId });
  }

  private async updateNotificationHistory(
    notificationId: string,
    updates: Partial<NotificationHistory>
  ): Promise<void> {
    const history = await this.storageService.get<NotificationHistory[]>(this.STORAGE_KEY_HISTORY, 'local') || [];
    const index = history.findIndex(h => h.notificationId === notificationId);

    if (index >= 0) {
      history[index] = { ...history[index], ...updates };
      await this.storageService.set(this.STORAGE_KEY_HISTORY, history, 'local');
    }
  }

  private async handleNotificationAction(action: string): Promise<void> {
    switch (action) {
      case 'upgrade':
        // Trigger upgrade flow
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('truthlens:action:upgrade'));
        }
        break;
      case 'manage_subscription':
        // Open subscription management
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('truthlens:action:manage_subscription'));
        }
        break;
      case 'view_usage':
        // Open usage statistics
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('truthlens:action:view_usage'));
        }
        break;
      // Add more action handlers as needed
    }
  }

  private setupPeriodicChecks(): void {
    // Check subscription renewal dates daily
    setInterval(async () => {
      const subscription = await subscriptionManager.getCurrentSubscription();

      if (subscription.tier !== 'free' && subscription.expiresAt) {
        const daysUntilExpiry = Math.ceil((subscription.expiresAt - Date.now()) / (24 * 60 * 60 * 1000));
        const preferences = await this.getNotificationPreferences();

        if (preferences.reminderDaysBeforeRenewal.includes(daysUntilExpiry)) {
          await this.handleSubscriptionEvent('renewal_reminder', { daysUntilRenewal: daysUntilExpiry });
        }
      }
    }, 24 * 60 * 60 * 1000); // Daily check
  }
}

// Export singleton instance
import { storageService } from '../storage/storageService';
export const notificationService = new NotificationService(storageService);
