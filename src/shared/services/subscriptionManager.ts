/**
 * Subscription Manager Service
 * Handles subscription status validation, grace periods, and premium feature management
 * Following 2025 best practices for browser extension subscription management
 */

import {
  UserSubscription,
  SubscriptionStatus,
  SubscriptionTier,
  SubscriptionValidationResult
} from '@shared/types';
import { StorageService, storageService } from '../storage/storageService';

export class SubscriptionManager {
  private storageService: StorageService;

  // Constants based on 2025 best practices research
  private readonly DEFAULT_VALIDATION_INTERVAL = 30 * 24 * 60 * 60 * 1000; // 30 days
  private readonly DEFAULT_GRACE_PERIOD = 30 * 24 * 60 * 60 * 1000; // 30 days
  private readonly OFFLINE_VALIDATION_BUFFER = 24 * 60 * 60 * 1000; // 24 hours buffer

  constructor(storageService: StorageService) {
    this.storageService = storageService;
  }

  /**
   * Get current subscription with validation check
   */
  async getCurrentSubscription(): Promise<UserSubscription> {
    const stored = await this.storageService.getSubscription();

    // Enhance stored subscription with defaults if missing
    const subscription: UserSubscription = {
      tier: stored.tier || 'free',
      status: stored.status || (stored.tier === 'free' ? 'free_tier' : 'active'),
      features: stored.features || this.getDefaultFeatures(stored.tier || 'free'),
      expiresAt: stored.expiresAt,
      lastValidated: stored.lastValidated || Date.now(),
      validationInterval: stored.validationInterval || this.DEFAULT_VALIDATION_INTERVAL,
      gracePeriodDuration: stored.gracePeriodDuration || this.DEFAULT_GRACE_PERIOD,
      gracePeriodStart: stored.gracePeriodStart,
      paymentMethod: stored.paymentMethod,
      subscriptionId: stored.subscriptionId,
    };

    return subscription;
  }

  /**
   * Validate subscription status with grace period handling
   */
  async validateSubscription(forceValidation: boolean = false): Promise<SubscriptionValidationResult> {
    const subscription = await this.getCurrentSubscription();
    const now = Date.now();

    // Check if validation is needed
    if (!forceValidation && this.isValidationCurrent(subscription, now)) {
      return {
        isValid: subscription.status === 'active' || subscription.status === 'grace_period',
        status: subscription.status,
        expiresAt: subscription.expiresAt,
        gracePeriodEnd: this.calculateGracePeriodEnd(subscription),
        lastChecked: subscription.lastValidated || now
      };
    }

    try {
      // Attempt backend validation (would be implemented with actual API)
      const backendResult = await this.validateWithBackend(subscription);

      // Update subscription based on backend response
      const updatedSubscription = await this.updateSubscriptionFromValidation(subscription, backendResult);

      return {
        isValid: updatedSubscription.status === 'active' || updatedSubscription.status === 'grace_period',
        status: updatedSubscription.status,
        expiresAt: updatedSubscription.expiresAt,
        gracePeriodEnd: this.calculateGracePeriodEnd(updatedSubscription),
        lastChecked: now
      };

    } catch (error) {
      // Handle offline validation with grace period
      return this.handleOfflineValidation(subscription, now, error as Error);
    }
  }

  /**
   * Check if current validation is still valid (within interval)
   */
  private isValidationCurrent(subscription: UserSubscription, now: number): boolean {
    if (!subscription.lastValidated) return false;

    const timeSinceValidation = now - subscription.lastValidated;
    const validationInterval = subscription.validationInterval || this.DEFAULT_VALIDATION_INTERVAL;

    return timeSinceValidation < validationInterval;
  }

  /**
   * Validate subscription with ExtensionPay backend
   */
  private async validateWithBackend(subscription: UserSubscription): Promise<{
    isActive: boolean;
    expiresAt?: number;
    tier: SubscriptionTier;
    features: string[];
  }> {
    // For free tier, no backend validation needed
    if (subscription.tier === 'free') {
      return {
        isActive: true,
        tier: 'free',
        features: this.getDefaultFeatures('free')
      };
    }

    try {
      // Use ExtensionPay for real validation
      const { extensionPayService } = await import('./extensionPayService');
      const paymentStatus = await extensionPayService.checkPaymentStatus();

      if (paymentStatus.hasPaidSubscription) {
        return {
          isActive: true,
          expiresAt: paymentStatus.expiresAt,
          tier: paymentStatus.tier,
          features: this.getDefaultFeatures(paymentStatus.tier)
        };
      } else {
        return {
          isActive: false,
          tier: 'free',
          features: this.getDefaultFeatures('free')
        };
      }
    } catch {
      // Fallback to stored data if ExtensionPay unavailable
      if (subscription.expiresAt && subscription.expiresAt > Date.now()) {
        return {
          isActive: true,
          expiresAt: subscription.expiresAt,
          tier: subscription.tier,
          features: this.getDefaultFeatures(subscription.tier)
        };
      }

      return {
        isActive: false,
        tier: subscription.tier,
        features: this.getDefaultFeatures('free')
      };
    }
  }

  /**
   * Update subscription based on validation result
   */
  private async updateSubscriptionFromValidation(
    subscription: UserSubscription,
    validationResult: { isActive: boolean; expiresAt?: number; tier: SubscriptionTier; features: string[] }
  ): Promise<UserSubscription> {
    const now = Date.now();
    let newStatus: SubscriptionStatus;

    if (validationResult.tier === 'free') {
      newStatus = 'free_tier';
    } else if (validationResult.isActive) {
      newStatus = 'active';
    } else {
      // Check if we should enter grace period
      if (!subscription.gracePeriodStart) {
        newStatus = 'grace_period';
        subscription.gracePeriodStart = now;
      } else {
        const gracePeriodEnd = this.calculateGracePeriodEnd(subscription);
        newStatus = (gracePeriodEnd && now > gracePeriodEnd) ? 'expired' : 'grace_period';
      }
    }

    const updatedSubscription: UserSubscription = {
      ...subscription,
      status: newStatus,
      tier: validationResult.tier,
      features: validationResult.features,
      expiresAt: validationResult.expiresAt,
      lastValidated: now,
      // Clear grace period if subscription is active again
      gracePeriodStart: newStatus === 'active' ? undefined : subscription.gracePeriodStart
    };

    await this.storageService.set('subscription', updatedSubscription, 'sync');
    return updatedSubscription;
  }

  /**
   * Handle validation when offline or backend unavailable
   */
  private async handleOfflineValidation(
    subscription: UserSubscription,
    now: number,
    error: Error
  ): Promise<SubscriptionValidationResult> {
    // Check if we're within offline validation buffer
    const lastValidated = subscription.lastValidated || 0;
    const offlineBufferEnd = lastValidated + this.OFFLINE_VALIDATION_BUFFER;

    if (now <= offlineBufferEnd) {
      // Still within offline buffer, use cached status
      return {
        isValid: subscription.status === 'active' || subscription.status === 'grace_period',
        status: subscription.status,
        expiresAt: subscription.expiresAt,
        gracePeriodEnd: this.calculateGracePeriodEnd(subscription),
        lastChecked: lastValidated,
        error: `Offline validation: ${error.message}`
      };
    }

    // Exceeded offline buffer, enter grace period if not already
    let newStatus = subscription.status;
    let gracePeriodStart = subscription.gracePeriodStart;

    if (subscription.status === 'active' && !gracePeriodStart) {
      newStatus = 'grace_period';
      gracePeriodStart = now;
    } else if (subscription.status === 'grace_period' && gracePeriodStart) {
      const gracePeriodEnd = gracePeriodStart + (subscription.gracePeriodDuration || this.DEFAULT_GRACE_PERIOD);
      if (now > gracePeriodEnd) {
        newStatus = 'expired';
      }
    }

    // Update subscription with new status
    const updatedSubscription: UserSubscription = {
      ...subscription,
      status: newStatus,
      gracePeriodStart,
      lastValidated: now
    };

    await this.storageService.set('subscription', updatedSubscription, 'sync');

    return {
      isValid: newStatus === 'active' || newStatus === 'grace_period',
      status: newStatus,
      expiresAt: subscription.expiresAt,
      gracePeriodEnd: this.calculateGracePeriodEnd(updatedSubscription),
      lastChecked: now,
      error: `Offline validation failed: ${error.message}`
    };
  }

  /**
   * Calculate grace period end timestamp
   */
  private calculateGracePeriodEnd(subscription: UserSubscription): number | undefined {
    if (!subscription.gracePeriodStart) return undefined;

    const gracePeriodDuration = subscription.gracePeriodDuration || this.DEFAULT_GRACE_PERIOD;
    return subscription.gracePeriodStart + gracePeriodDuration;
  }

  /**
   * Get default features for a subscription tier
   */
  private getDefaultFeatures(tier: SubscriptionTier): string[] {
    switch (tier) {
      case 'free':
        return ['basic_credibility', 'visual_indicators', 'limited_checks'];
      case 'premium':
        return [
          'basic_credibility',
          'visual_indicators',
          'unlimited_checks',
          'bias_analysis',
          'detailed_reports',
          'historical_tracking',
          'export_data',
          'priority_support'
        ];
      case 'enterprise':
        return [
          'basic_credibility',
          'visual_indicators',
          'unlimited_checks',
          'bias_analysis',
          'detailed_reports',
          'historical_tracking',
          'export_data',
          'priority_support',
          'api_access',
          'custom_domains',
          'team_management',
          'advanced_analytics'
        ];
      default:
        return ['basic_credibility'];
    }
  }

  /**
   * Update subscription tier (e.g., after successful payment)
   */
  async updateSubscriptionTier(
    tier: SubscriptionTier,
    expiresAt?: number,
    subscriptionId?: string,
    paymentMethod?: string
  ): Promise<void> {
    const currentSubscription = await this.getCurrentSubscription();

    const updatedSubscription: UserSubscription = {
      ...currentSubscription,
      tier,
      status: tier === 'free' ? 'free_tier' : 'active',
      features: this.getDefaultFeatures(tier),
      expiresAt,
      subscriptionId,
      paymentMethod,
      lastValidated: Date.now(),
      gracePeriodStart: undefined // Clear grace period on successful upgrade
    };

    await this.storageService.set('subscription', updatedSubscription, 'sync');
  }

  /**
   * Cancel subscription (enter grace period)
   */
  async cancelSubscription(): Promise<void> {
    const currentSubscription = await this.getCurrentSubscription();

    if (currentSubscription.tier !== 'free') {
      const updatedSubscription: UserSubscription = {
        ...currentSubscription,
        status: 'cancelled',
        gracePeriodStart: Date.now()
      };

      await this.storageService.set('subscription', updatedSubscription, 'sync');
    }
  }

  /**
   * Check if user has access to specific feature
   */
  async hasFeatureAccess(feature: string): Promise<boolean> {
    const subscription = await this.getCurrentSubscription();
    const validation = await this.validateSubscription();

    if (!validation.isValid) {
      // Only allow basic features when subscription is invalid
      const basicFeatures = ['basic_credibility', 'visual_indicators'];
      return basicFeatures.includes(feature);
    }

    return subscription.features.includes(feature);
  }

  /**
   * Get subscription status summary for UI
   */
  async getSubscriptionSummary(): Promise<{
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    isValid: boolean;
    daysUntilExpiry?: number;
    gracePeriodDaysRemaining?: number;
    features: string[];
    needsValidation: boolean;
  }> {
    const subscription = await this.getCurrentSubscription();
    const validation = await this.validateSubscription();
    const now = Date.now();

    let daysUntilExpiry: number | undefined;
    let gracePeriodDaysRemaining: number | undefined;

    if (subscription.expiresAt) {
      daysUntilExpiry = Math.max(0, Math.ceil((subscription.expiresAt - now) / (24 * 60 * 60 * 1000)));
    }

    if (validation.gracePeriodEnd) {
      gracePeriodDaysRemaining = Math.max(0, Math.ceil((validation.gracePeriodEnd - now) / (24 * 60 * 60 * 1000)));
    }

    return {
      tier: subscription.tier,
      status: subscription.status,
      isValid: validation.isValid,
      daysUntilExpiry,
      gracePeriodDaysRemaining,
      features: subscription.features,
      needsValidation: !this.isValidationCurrent(subscription, now)
    };
  }
}

// Export singleton instance
export const subscriptionManager = new SubscriptionManager(storageService);
