/**
 * Subscription Lifecycle Manager
 * Comprehensive subscription lifecycle management following 2025 best practices
 * Handles renewals, cancellations, notifications, and win-back flows
 */

import {
  UserSubscription,
  SubscriptionStatus,
  SubscriptionTier,
  SubscriptionValidationResult
} from '@shared/types';
import { StorageService, storageService } from '../storage/storageService';
import { subscriptionManager } from './subscriptionManager';
import { extensionPayService } from './extensionPayService';
import { logger } from './logger';

export interface LifecycleNotification {
  id: string;
  type: 'renewal_reminder' | 'renewal_success' | 'renewal_failed' | 'cancellation_confirmed' | 'grace_period_warning' | 'expiration_notice' | 'win_back_offer';
  title: string;
  message: string;
  actionText?: string;
  actionUrl?: string;
  urgency: 'low' | 'medium' | 'high';
  scheduledAt: number;
  sentAt?: number;
  acknowledged?: boolean;
  metadata?: Record<string, any>;
}

export interface LifecycleEvent {
  type: 'renewal_approaching' | 'renewal_success' | 'renewal_failed' | 'cancellation_requested' | 'subscription_expired' | 'grace_period_started' | 'win_back_triggered';
  timestamp: number;
  subscriptionId?: string;
  tier: SubscriptionTier;
  metadata?: Record<string, any>;
}

export interface WinBackCampaign {
  id: string;
  userId: string;
  triggeredAt: number;
  stage: 'initial' | 'follow_up' | 'final_offer' | 'completed';
  lastContactAt?: number;
  conversionCompleted?: boolean;
  metadata?: Record<string, any>;
}

export interface DataRetentionPolicy {
  tier: SubscriptionTier;
  retentionDays: number;
  gracePeriodDays: number;
  dataTypes: string[];
  autoCleanup: boolean;
}

export class SubscriptionLifecycleManager {
  private storageService: StorageService;

  // 2025 best practice timing (in milliseconds)
  private readonly RENEWAL_REMINDER_SCHEDULE = {
    EARLY: 30 * 24 * 60 * 60 * 1000,    // 30 days
    MEDIUM: 7 * 24 * 60 * 60 * 1000,    // 7 days
    URGENT: 1 * 24 * 60 * 60 * 1000,    // 1 day
    FINAL: 2 * 60 * 60 * 1000           // 2 hours
  };

  private readonly WIN_BACK_SCHEDULE = {
    INITIAL: 1 * 24 * 60 * 60 * 1000,   // 1 day after expiration
    FOLLOW_UP: 7 * 24 * 60 * 60 * 1000, // 7 days after expiration
    FINAL: 30 * 24 * 60 * 60 * 1000     // 30 days after expiration
  };

  private readonly DATA_RETENTION_POLICIES: DataRetentionPolicy[] = [
    {
      tier: 'free',
      retentionDays: 0, // No data retention needed for free tier
      gracePeriodDays: 0,
      dataTypes: [],
      autoCleanup: false
    },
    {
      tier: 'premium',
      retentionDays: 90, // Keep premium data for 90 days after downgrade
      gracePeriodDays: 30, // 30-day grace period
      dataTypes: ['detailed_reports', 'historical_tracking', 'bias_analysis', 'export_data'],
      autoCleanup: true
    },
    {
      tier: 'enterprise',
      retentionDays: 180, // Keep enterprise data for 180 days
      gracePeriodDays: 30,
      dataTypes: ['detailed_reports', 'historical_tracking', 'bias_analysis', 'export_data', 'api_access', 'custom_domains', 'team_management', 'advanced_analytics'],
      autoCleanup: true
    }
  ];

  constructor(storageService: StorageService) {
    this.storageService = storageService;
    this.initializeLifecycleMonitoring();
  }

  /**
   * Initialize lifecycle monitoring and event handlers
   */
  private async initializeLifecycleMonitoring(): Promise<void> {
    try {
      // Set up periodic checks for lifecycle events
      setInterval(() => this.checkLifecycleEvents(), 60 * 60 * 1000); // Check every hour

      // Listen for ExtensionPay events
      if (typeof window !== 'undefined') {
        window.addEventListener('truthlens:payment:success', this.handleRenewalSuccess.bind(this) as EventListener);
        window.addEventListener('truthlens:payment:failed', this.handleRenewalFailure.bind(this) as EventListener);
        window.addEventListener('truthlens:subscription:cancelled', this.handleCancellation.bind(this) as EventListener);
      }

      logger.info('Subscription lifecycle monitoring initialized');
    } catch (error) {
      logger.error('Failed to initialize lifecycle monitoring:', error);
    }
  }

  /**
   * Check for upcoming lifecycle events and trigger appropriate actions
   */
  async checkLifecycleEvents(): Promise<void> {
    try {
      const subscription = await subscriptionManager.getCurrentSubscription();
      const now = Date.now();

      if (subscription.tier === 'free') return;

      // Check for upcoming renewals
      if (subscription.expiresAt) {
        await this.checkRenewalReminders(subscription, now);
      }

      // Check for grace period expiration
      if (subscription.status === 'grace_period') {
        await this.checkGracePeriodExpiration(subscription, now);
      }

      // Check for expired subscriptions needing win-back
      if (subscription.status === 'expired') {
        await this.checkWinBackOpportunities(subscription, now);
      }

      // Process data retention policies
      await this.processDataRetention(subscription, now);

    } catch (error) {
      logger.error('Failed to check lifecycle events:', error);
    }
  }

  /**
   * Check and schedule renewal reminders based on 2025 best practices
   */
  private async checkRenewalReminders(subscription: UserSubscription, now: number): Promise<void> {
    if (!subscription.expiresAt) return;

    const timeUntilRenewal = subscription.expiresAt - now;
    const existingNotifications = await this.getScheduledNotifications();

    // Early reminder (30 days) - Value-focused messaging
    if (timeUntilRenewal <= this.RENEWAL_REMINDER_SCHEDULE.EARLY && timeUntilRenewal > this.RENEWAL_REMINDER_SCHEDULE.MEDIUM) {
      const hasEarlyReminder = existingNotifications.some(n => n.type === 'renewal_reminder' && n.metadata?.stage === 'early');
      if (!hasEarlyReminder) {
        await this.scheduleRenewalReminder('early', subscription);
      }
    }

    // Medium reminder (7 days) - Benefits reinforcement
    if (timeUntilRenewal <= this.RENEWAL_REMINDER_SCHEDULE.MEDIUM && timeUntilRenewal > this.RENEWAL_REMINDER_SCHEDULE.URGENT) {
      const hasMediumReminder = existingNotifications.some(n => n.type === 'renewal_reminder' && n.metadata?.stage === 'medium');
      if (!hasMediumReminder) {
        await this.scheduleRenewalReminder('medium', subscription);
      }
    }

    // Urgent reminder (1 day) - Action-focused
    if (timeUntilRenewal <= this.RENEWAL_REMINDER_SCHEDULE.URGENT && timeUntilRenewal > this.RENEWAL_REMINDER_SCHEDULE.FINAL) {
      const hasUrgentReminder = existingNotifications.some(n => n.type === 'renewal_reminder' && n.metadata?.stage === 'urgent');
      if (!hasUrgentReminder) {
        await this.scheduleRenewalReminder('urgent', subscription);
      }
    }

    // Final reminder (2 hours) - Last chance
    if (timeUntilRenewal <= this.RENEWAL_REMINDER_SCHEDULE.FINAL) {
      const hasFinalReminder = existingNotifications.some(n => n.type === 'renewal_reminder' && n.metadata?.stage === 'final');
      if (!hasFinalReminder) {
        await this.scheduleRenewalReminder('final', subscription);
      }
    }
  }

  /**
   * Schedule renewal reminder notifications following 2025 UX best practices
   */
  private async scheduleRenewalReminder(stage: 'early' | 'medium' | 'urgent' | 'final', subscription: UserSubscription): Promise<void> {
    const now = Date.now();
    const expiresAt = subscription.expiresAt!;

    const messages = {
      early: {
        title: '🎯 Your TruthLens Premium Benefits',
        message: `Your premium subscription renews in ${Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000))} days. You've fact-checked countless articles with unlimited access!`,
        urgency: 'low' as const,
        actionText: 'View Account'
      },
      medium: {
        title: '⚡ Premium Features Renewal Soon',
        message: `Your subscription renews in ${Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000))} days. Continue enjoying bias analysis, detailed reports, and unlimited fact-checking.`,
        urgency: 'medium' as const,
        actionText: 'Manage Subscription'
      },
      urgent: {
        title: '🔔 Premium Renewal Tomorrow',
        message: `Your TruthLens Premium renews in ${Math.ceil((expiresAt - now) / (60 * 60 * 1000))} hours. Auto-renewal ensures uninterrupted access to all premium features.`,
        urgency: 'high' as const,
        actionText: 'Update Payment'
      },
      final: {
        title: '⏰ Premium Renewal in 2 Hours',
        message: 'Your subscription renews soon. If you need to update payment details or cancel, please do so now to avoid any interruptions.',
        urgency: 'high' as const,
        actionText: 'Manage Now'
      }
    };

    const messageConfig = messages[stage];

    const notification: LifecycleNotification = {
      id: `renewal_${stage}_${Date.now()}`,
      type: 'renewal_reminder',
      title: messageConfig.title,
      message: messageConfig.message,
      actionText: messageConfig.actionText,
      actionUrl: 'premium',
      urgency: messageConfig.urgency,
      scheduledAt: now,
      metadata: { stage, tier: subscription.tier, expiresAt }
    };

    await this.storeNotification(notification);
    await this.logLifecycleEvent('renewal_approaching', subscription.tier, { stage });

    logger.info(`Scheduled ${stage} renewal reminder for tier ${subscription.tier}`);
  }

  /**
   * Handle successful renewal events
   */
  private async handleRenewalSuccess(event: CustomEvent): Promise<void> {
    try {
      const { tier, user } = event.detail;

      const notification: LifecycleNotification = {
        id: `renewal_success_${Date.now()}`,
        type: 'renewal_success',
        title: '✅ Renewal Successful!',
        message: `Your ${tier} subscription has been renewed successfully. Thank you for continuing with TruthLens Premium!`,
        urgency: 'low',
        scheduledAt: Date.now(),
        metadata: { tier, userId: user.email }
      };

      await this.storeNotification(notification);
      await this.logLifecycleEvent('renewal_success', tier, { userId: user.email });

      // Clear any existing win-back campaigns
      await this.clearWinBackCampaigns();

      logger.info(`Renewal successful for tier ${tier}`);
    } catch (error) {
      logger.error('Failed to handle renewal success:', error);
    }
  }

  /**
   * Handle failed renewal events
   */
  private async handleRenewalFailure(event: CustomEvent): Promise<void> {
    try {
      const { tier, error: failureReason } = event.detail;

      const notification: LifecycleNotification = {
        id: `renewal_failed_${Date.now()}`,
        type: 'renewal_failed',
        title: '⚠️ Payment Issue',
        message: 'We couldn\'t process your subscription renewal. Please update your payment method to continue enjoying premium features.',
        actionText: 'Update Payment',
        actionUrl: 'premium',
        urgency: 'high',
        scheduledAt: Date.now(),
        metadata: { tier, failureReason }
      };

      await this.storeNotification(notification);
      await this.logLifecycleEvent('renewal_failed', tier, { failureReason });

      logger.warn(`Renewal failed for tier ${tier}: ${failureReason}`);
    } catch (error) {
      logger.error('Failed to handle renewal failure:', error);
    }
  }

  /**
   * Handle subscription cancellation
   */
  private async handleCancellation(event: CustomEvent): Promise<void> {
    try {
      const { tier, reason } = event.detail;

      const notification: LifecycleNotification = {
        id: `cancellation_${Date.now()}`,
        type: 'cancellation_confirmed',
        title: '👋 Subscription Cancelled',
        message: 'Your subscription has been cancelled. You\'ll continue to have access to premium features until your current period ends.',
        urgency: 'medium',
        scheduledAt: Date.now(),
        metadata: { tier, reason }
      };

      await this.storeNotification(notification);
      await this.logLifecycleEvent('cancellation_requested', tier, { reason });

      // Start win-back campaign after grace period
      await this.scheduleWinBackCampaign(tier);

      logger.info(`Cancellation processed for tier ${tier}`);
    } catch (error) {
      logger.error('Failed to handle cancellation:', error);
    }
  }

  /**
   * Check grace period expiration and notify users
   */
  private async checkGracePeriodExpiration(subscription: UserSubscription, now: number): Promise<void> {
    if (!subscription.gracePeriodStart) return;

    const gracePeriodEnd = subscription.gracePeriodStart + (subscription.gracePeriodDuration || 30 * 24 * 60 * 60 * 1000);
    const timeUntilExpiration = gracePeriodEnd - now;

    // Notify when 7 days left in grace period
    if (timeUntilExpiration <= 7 * 24 * 60 * 60 * 1000 && timeUntilExpiration > 0) {
      const existingWarning = await this.getNotificationsByType('grace_period_warning');
      if (existingWarning.length === 0) {
        const notification: LifecycleNotification = {
          id: `grace_period_${Date.now()}`,
          type: 'grace_period_warning',
          title: '⚠️ Grace Period Ending',
          message: `Your grace period ends in ${Math.ceil(timeUntilExpiration / (24 * 60 * 60 * 1000))} days. Renew now to keep your premium features.`,
          actionText: 'Renew Now',
          actionUrl: 'premium',
          urgency: 'high',
          scheduledAt: now,
          metadata: { tier: subscription.tier, gracePeriodEnd }
        };

        await this.storeNotification(notification);
      }
    }

    // Handle expiration
    if (timeUntilExpiration <= 0) {
      await this.handleSubscriptionExpiration(subscription);
    }
  }

  /**
   * Handle subscription expiration
   */
  private async handleSubscriptionExpiration(subscription: UserSubscription): Promise<void> {
    const notification: LifecycleNotification = {
      id: `expiration_${Date.now()}`,
      type: 'expiration_notice',
      title: '😞 Premium Access Expired',
      message: 'Your premium subscription has expired. You now have access to free tier features. Resubscribe anytime to regain premium benefits.',
      actionText: 'Resubscribe',
      actionUrl: 'premium',
      urgency: 'medium',
      scheduledAt: Date.now(),
      metadata: { tier: subscription.tier }
    };

    await this.storeNotification(notification);
    await this.logLifecycleEvent('subscription_expired', subscription.tier);
    await this.scheduleWinBackCampaign(subscription.tier);

    // Start data retention countdown
    await this.startDataRetentionCountdown(subscription.tier);
  }

  /**
   * Schedule win-back campaign following 2025 best practices
   */
  private async scheduleWinBackCampaign(tier: SubscriptionTier): Promise<void> {
    const campaign: WinBackCampaign = {
      id: `winback_${Date.now()}`,
      userId: 'current_user', // In a real app, this would be the actual user ID
      triggeredAt: Date.now(),
      stage: 'initial'
    };

    await this.storeWinBackCampaign(campaign);
    await this.logLifecycleEvent('win_back_triggered', tier, { campaignId: campaign.id });
  }

  /**
   * Check and process win-back opportunities
   */
  private async checkWinBackOpportunities(subscription: UserSubscription, now: number): Promise<void> {
    const campaigns = await this.getActiveWinBackCampaigns();

    for (const campaign of campaigns) {
      const timeSinceTrigger = now - campaign.triggeredAt;
      const timeSinceLastContact = campaign.lastContactAt ? now - campaign.lastContactAt : timeSinceTrigger;

      // Initial win-back (1 day after expiration)
      if (campaign.stage === 'initial' && timeSinceTrigger >= this.WIN_BACK_SCHEDULE.INITIAL) {
        await this.sendWinBackNotification(campaign, 'initial', subscription.tier);
        campaign.stage = 'follow_up';
        campaign.lastContactAt = now;
        await this.updateWinBackCampaign(campaign);
      }

      // Follow-up (7 days after expiration)
      if (campaign.stage === 'follow_up' && timeSinceTrigger >= this.WIN_BACK_SCHEDULE.FOLLOW_UP) {
        await this.sendWinBackNotification(campaign, 'follow_up', subscription.tier);
        campaign.stage = 'final_offer';
        campaign.lastContactAt = now;
        await this.updateWinBackCampaign(campaign);
      }

      // Final offer (30 days after expiration)
      if (campaign.stage === 'final_offer' && timeSinceTrigger >= this.WIN_BACK_SCHEDULE.FINAL) {
        await this.sendWinBackNotification(campaign, 'final_offer', subscription.tier);
        campaign.stage = 'completed';
        await this.updateWinBackCampaign(campaign);
      }
    }
  }

  /**
   * Send win-back notification with personalized messaging
   */
  private async sendWinBackNotification(campaign: WinBackCampaign, stage: string, tier: SubscriptionTier): Promise<void> {
    const messages = {
      initial: {
        title: '💔 We Miss You!',
        message: 'Your premium features are just a click away. Come back and continue enjoying unlimited fact-checking and bias analysis.',
        actionText: 'Reactivate Premium'
      },
      follow_up: {
        title: '🎁 Special Offer Inside',
        message: 'Get 20% off your next premium subscription! Limited time offer for returning subscribers.',
        actionText: 'Claim Offer'
      },
      final_offer: {
        title: '🔥 Last Chance - 30% Off',
        message: 'Final opportunity: 30% off premium subscription. Don\'t let misinformation go unchecked.',
        actionText: 'Subscribe Now'
      }
    };

    const messageConfig = messages[stage as keyof typeof messages];

    const notification: LifecycleNotification = {
      id: `winback_${stage}_${Date.now()}`,
      type: 'win_back_offer',
      title: messageConfig.title,
      message: messageConfig.message,
      actionText: messageConfig.actionText,
      actionUrl: 'premium',
      urgency: stage === 'final_offer' ? 'high' : 'medium',
      scheduledAt: Date.now(),
      metadata: { stage, tier, campaignId: campaign.id }
    };

    await this.storeNotification(notification);
  }

  /**
   * Process data retention policies for downgraded accounts
   */
  private async processDataRetention(subscription: UserSubscription, now: number): Promise<void> {
    if (subscription.tier !== 'free') return;

    const retentionData = await this.getDataRetentionStatus();
    if (!retentionData || !retentionData.startDate) return;

    const policy = this.DATA_RETENTION_POLICIES.find(p => p.tier === retentionData.originalTier);
    if (!policy) return;

    const retentionPeriodEnd = retentionData.startDate + (policy.retentionDays * 24 * 60 * 60 * 1000);

    if (now >= retentionPeriodEnd && policy.autoCleanup) {
      await this.cleanupRetainedData(policy.dataTypes);
      await this.markDataRetentionComplete();
      logger.info('Data retention cleanup completed');
    }
  }

  /**
   * Start data retention countdown for downgraded accounts
   */
  private async startDataRetentionCountdown(originalTier: SubscriptionTier): Promise<void> {
    const retentionData = {
      originalTier,
      startDate: Date.now(),
      completed: false
    };

    await this.storageService.set('dataRetention', retentionData, 'local');
  }

  /**
   * Cleanup retained data after retention period
   */
  private async cleanupRetainedData(dataTypes: string[]): Promise<void> {
    // Implementation would depend on specific data storage structure
    // This is a placeholder for the actual cleanup logic
    for (const dataType of dataTypes) {
      await this.storageService.remove(`retained_${dataType}`, 'local');
    }
  }

  // Storage helper methods
  private async storeNotification(notification: LifecycleNotification): Promise<void> {
    const notifications = await this.getStoredNotifications();
    notifications.push(notification);
    await this.storageService.set('lifecycleNotifications', notifications, 'local');
  }

  private async getStoredNotifications(): Promise<LifecycleNotification[]> {
    return await this.storageService.get('lifecycleNotifications', 'local') || [];
  }

  private async getScheduledNotifications(): Promise<LifecycleNotification[]> {
    const notifications = await this.getStoredNotifications();
    return notifications.filter(n => !n.sentAt);
  }

  private async getNotificationsByType(type: LifecycleNotification['type']): Promise<LifecycleNotification[]> {
    const notifications = await this.getStoredNotifications();
    return notifications.filter(n => n.type === type);
  }

  private async logLifecycleEvent(type: LifecycleEvent['type'], tier: SubscriptionTier, metadata?: Record<string, any>): Promise<void> {
    const events = await this.storageService.get('lifecycleEvents', 'local') || [];
    events.push({
      type,
      timestamp: Date.now(),
      tier,
      metadata
    });

    // Keep only last 100 events
    if (events.length > 100) {
      events.splice(0, events.length - 100);
    }

    await this.storageService.set('lifecycleEvents', events, 'local');
  }

  private async storeWinBackCampaign(campaign: WinBackCampaign): Promise<void> {
    const campaigns = await this.storageService.get('winBackCampaigns', 'local') || [];
    campaigns.push(campaign);
    await this.storageService.set('winBackCampaigns', campaigns, 'local');
  }

  private async getActiveWinBackCampaigns(): Promise<WinBackCampaign[]> {
    const campaigns = await this.storageService.get('winBackCampaigns', 'local') || [];
    return campaigns.filter((c: WinBackCampaign) => c.stage !== 'completed' && !c.conversionCompleted);
  }

  private async updateWinBackCampaign(campaign: WinBackCampaign): Promise<void> {
    const campaigns = await this.storageService.get('winBackCampaigns', 'local') || [];
    const index = campaigns.findIndex((c: WinBackCampaign) => c.id === campaign.id);
    if (index !== -1) {
      campaigns[index] = campaign;
      await this.storageService.set('winBackCampaigns', campaigns, 'local');
    }
  }

  private async clearWinBackCampaigns(): Promise<void> {
    await this.storageService.set('winBackCampaigns', [], 'local');
  }

  private async getDataRetentionStatus(): Promise<any> {
    return await this.storageService.get('dataRetention', 'local');
  }

  private async markDataRetentionComplete(): Promise<void> {
    const retentionData = await this.getDataRetentionStatus();
    if (retentionData) {
      retentionData.completed = true;
      await this.storageService.set('dataRetention', retentionData, 'local');
    }
  }

  /**
   * Public API methods for accessing lifecycle data
   */

  /**
   * Get pending notifications for UI display
   */
  async getPendingNotifications(): Promise<LifecycleNotification[]> {
    const notifications = await this.getStoredNotifications();
    return notifications.filter(n => !n.acknowledged && (!n.sentAt || Date.now() - n.sentAt < 24 * 60 * 60 * 1000));
  }

  /**
   * Mark notification as acknowledged
   */
  async acknowledgeNotification(notificationId: string): Promise<void> {
    const notifications = await this.getStoredNotifications();
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.acknowledged = true;
      await this.storageService.set('lifecycleNotifications', notifications, 'local');
    }
  }

  /**
   * Get lifecycle event history
   */
  async getLifecycleHistory(): Promise<LifecycleEvent[]> {
    return await this.storageService.get('lifecycleEvents', 'local') || [];
  }

  /**
   * Manually trigger lifecycle event check (for testing/debugging)
   */
  async triggerLifecycleCheck(): Promise<void> {
    await this.checkLifecycleEvents();
  }
}

// Export singleton instance
export const subscriptionLifecycleManager = new SubscriptionLifecycleManager(storageService);
