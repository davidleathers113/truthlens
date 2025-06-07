/**
 * ExtensionPay Payment Service
 * Integrates ExtensionPay with TruthLens subscription management
 * Following 2025 best practices for payment processing and error handling
 */

import { SubscriptionTier } from '@shared/types';
import { subscriptionManager } from './subscriptionManager';
import { logger } from './logger';

// ExtensionPay types (would normally come from @types/extpay if available)
interface ExtPayUser {
  paid: boolean;
  planNickname?: string;
  paidAt?: string;
  subscribedAt?: string;
  email?: string;
  subscription?: {
    status: string;
    current_period_end: number;
    plan: {
      nickname: string;
      amount: number;
      interval: string;
    };
  };
}

interface ExtPayInstance {
  getUser(): Promise<ExtPayUser>;
  openPaymentPage(planNickname?: string): Promise<void>;
  openTrialPage(planNickname?: string): Promise<void>;
  openManagementPage(): Promise<void>;
  startBackground(): void;
  openLoginPage(): Promise<void>;
  onPaid: {
    addListener(callback: (user: ExtPayUser) => void): void;
    removeListener(callback: (user: ExtPayUser) => void): void;
  };
}

declare global {
  function ExtPay(extensionId: string): ExtPayInstance;
}

export interface PaymentPlan {
  nickname: string;
  tier: SubscriptionTier;
  amount: number;
  interval: 'month' | 'year';
  displayName: string;
  description: string;
}

export interface PaymentResult {
  success: boolean;
  tier?: SubscriptionTier;
  planNickname?: string;
  error?: string;
  userCancelled?: boolean;
}

export class ExtensionPayService {
  private extpay: ExtPayInstance | null = null;
  private readonly extensionId: string;
  private readonly plans: PaymentPlan[];
  private paymentListenerActive = false;

  // Configuration based on 2025 pricing research
  constructor(extensionId: string) {
    this.extensionId = extensionId;
    this.plans = [
      {
        nickname: 'truthlens_monthly',
        tier: 'premium',
        amount: 999, // $9.99
        interval: 'month',
        displayName: 'Monthly Premium',
        description: 'Unlimited fact-checking and premium features'
      },
      {
        nickname: 'truthlens_yearly',
        tier: 'premium',
        amount: 7999, // $79.99 (33% savings)
        interval: 'year',
        displayName: 'Annual Premium',
        description: 'Best value - save 33% with annual billing'
      }
    ];
  }

  /**
   * Initialize ExtensionPay service
   */
  async initialize(): Promise<void> {
    try {
      if (typeof ExtPay === 'undefined') {
        throw new Error('ExtPay library not loaded. Please include the ExtPay script.');
      }

      this.extpay = ExtPay(this.extensionId);
      this.extpay.startBackground();

      // Set up payment success listener
      this.setupPaymentListener();

      logger.info('ExtensionPay service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ExtensionPay service:', error instanceof Error ? { message: error.message, stack: error.stack } : { error });
      throw error;
    }
  }

  /**
   * Check current payment status and sync with subscription manager
   */
  async checkPaymentStatus(): Promise<{
    hasPaidSubscription: boolean;
    tier: SubscriptionTier;
    expiresAt?: number;
    planNickname?: string;
  }> {
    if (!this.extpay) {
      await this.initialize();
    }

    try {
      const user = await this.extpay!.getUser();

      if (user.paid && user.subscription) {
        const plan = this.getPlanByNickname(user.planNickname || user.subscription.plan.nickname);
        const tier = plan?.tier || 'premium';
        const expiresAt = user.subscription.current_period_end ?
          user.subscription.current_period_end * 1000 : // Convert to milliseconds
          undefined;

        // Sync with subscription manager
        await subscriptionManager.updateSubscriptionTier(
          tier,
          expiresAt,
          user.subscription.plan.nickname,
          'extensionpay'
        );

        return {
          hasPaidSubscription: true,
          tier,
          expiresAt,
          planNickname: user.planNickname || user.subscription.plan.nickname
        };
      }

      return {
        hasPaidSubscription: false,
        tier: 'free'
      };
    } catch (error) {
      logger.error('Failed to check payment status:', error instanceof Error ? { message: error.message, stack: error.stack } : { error });

      // Return free tier on error but don't update subscription manager
      return {
        hasPaidSubscription: false,
        tier: 'free'
      };
    }
  }

  /**
   * Open payment page for specific plan
   */
  async openPaymentPage(planNickname: string): Promise<PaymentResult> {
    if (!this.extpay) {
      await this.initialize();
    }

    const plan = this.getPlanByNickname(planNickname);
    if (!plan) {
      return {
        success: false,
        error: `Invalid plan nickname: ${planNickname}`
      };
    }

    try {
      await this.extpay!.openPaymentPage(planNickname);

      // Note: ExtPay doesn't provide immediate success/failure feedback
      // Payment success is handled via the onPaid listener
      return {
        success: true,
        tier: plan.tier,
        planNickname
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to open payment page:', error instanceof Error ? { message: error.message, stack: error.stack } : { error });

      // Check if user cancelled vs network/other error
      const userCancelled = errorMessage.toLowerCase().includes('user') ||
                           errorMessage.toLowerCase().includes('cancel') ||
                           errorMessage.toLowerCase().includes('close');

      return {
        success: false,
        error: errorMessage,
        userCancelled
      };
    }
  }

  /**
   * Open management page for existing subscribers
   */
  async openManagementPage(): Promise<void> {
    if (!this.extpay) {
      await this.initialize();
    }

    try {
      await this.extpay!.openManagementPage();
    } catch (error) {
      logger.error('Failed to open management page:', error instanceof Error ? { message: error.message, stack: error.stack } : { error });
      throw error;
    }
  }

  /**
   * Open login page for existing users
   */
  async openLoginPage(): Promise<void> {
    if (!this.extpay) {
      await this.initialize();
    }

    try {
      await this.extpay!.openLoginPage();
    } catch (error) {
      logger.error('Failed to open login page:', error instanceof Error ? { message: error.message, stack: error.stack } : { error });
      throw error;
    }
  }

  /**
   * Get available payment plans
   */
  getAvailablePlans(): PaymentPlan[] {
    return [...this.plans];
  }

  /**
   * Get plan by nickname
   */
  getPlanByNickname(nickname: string): PaymentPlan | undefined {
    return this.plans.find(plan => plan.nickname === nickname);
  }

  /**
   * Get plan by tier
   */
  getPlansByTier(tier: SubscriptionTier): PaymentPlan[] {
    return this.plans.filter(plan => plan.tier === tier);
  }

  /**
   * Format price for display
   */
  formatPrice(amount: number, interval: 'month' | 'year'): string {
    const price = (amount / 100).toFixed(2);
    const intervalText = interval === 'month' ? '/month' : '/year';
    return `$${price}${intervalText}`;
  }

  /**
   * Calculate savings for annual plan
   */
  calculateAnnualSavings(): { percentage: number; amount: number } {
    const monthlyPlan = this.plans.find(p => p.interval === 'month');
    const yearlyPlan = this.plans.find(p => p.interval === 'year');

    if (!monthlyPlan || !yearlyPlan) {
      return { percentage: 0, amount: 0 };
    }

    const monthlyYearlyPrice = monthlyPlan.amount * 12;
    const actualYearlyPrice = yearlyPlan.amount;
    const savings = monthlyYearlyPrice - actualYearlyPrice;
    const percentage = Math.round((savings / monthlyYearlyPrice) * 100);

    return {
      percentage,
      amount: savings / 100 // Convert to dollars
    };
  }

  /**
   * Handle subscription cancellation (for lifecycle management)
   */
  async handleSubscriptionCancellation(reason?: string): Promise<void> {
    try {
      const subscription = await subscriptionManager.getCurrentSubscription();

      // Dispatch cancellation event for lifecycle manager
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('truthlens:subscription:cancelled', {
          detail: { tier: subscription.tier, reason }
        }));
      }

      logger.info('Subscription cancellation handled:', { tier: subscription.tier, reason });
    } catch (error) {
      logger.error('Failed to handle subscription cancellation:', error instanceof Error ? { message: error.message, stack: error.stack } : { error });
    }
  }

  /**
   * Handle payment failure (for lifecycle management)
   */
  async handlePaymentFailure(error: string, tier: SubscriptionTier): Promise<void> {
    try {
      // Dispatch payment failure event for lifecycle manager
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('truthlens:payment:failed', {
          detail: { tier, error }
        }));
      }

      logger.warn('Payment failure handled:', { tier, error });
    } catch (err) {
      logger.error('Failed to handle payment failure:', err instanceof Error ? { message: err.message, stack: err.stack } : { err });
    }
  }

  /**
   * Setup payment success listener and enhanced lifecycle event handling
   */
  private setupPaymentListener(): void {
    if (!this.extpay || this.paymentListenerActive) return;

    const handlePaymentSuccess = async (user: ExtPayUser) => {
      try {
        logger.info('Payment successful, updating subscription:', user as unknown as Record<string, unknown>);

        if (user.subscription) {
          const plan = this.getPlanByNickname(user.planNickname || user.subscription.plan.nickname);
          const tier = plan?.tier || 'premium';
          const expiresAt = user.subscription.current_period_end * 1000;

          await subscriptionManager.updateSubscriptionTier(
            tier,
            expiresAt,
            user.subscription.plan.nickname,
            'extensionpay'
          );

          // Dispatch custom event for UI updates and lifecycle management
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('truthlens:payment:success', {
              detail: { tier, planNickname: user.planNickname, user }
            }));
          }
        }
      } catch (error) {
        logger.error('Failed to handle payment success:', error instanceof Error ? { message: error.message, stack: error.stack } : { error });

        // Dispatch failure event if payment processing fails
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('truthlens:payment:failed', {
            detail: {
              tier: 'premium',
              error: error instanceof Error ? error.message : 'Payment processing failed'
            }
          }));
        }
      }
    };

    this.extpay.onPaid.addListener(handlePaymentSuccess);
    this.paymentListenerActive = true;
  }

  /**
   * Check if ExtensionPay is properly configured
   */
  static async checkConfiguration(): Promise<{
    isConfigured: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if ExtPay is available
    if (typeof ExtPay === 'undefined') {
      errors.push('ExtPay library not loaded. Include ExtPay script in manifest.');
    }

    // Check CSP configuration
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      try {
        const manifest = chrome.runtime.getManifest();
        const csp = manifest.content_security_policy;

        if (csp && typeof csp === 'string') {
          if (!csp.includes('https://extensionpay.com')) {
            warnings.push('Add "connect-src https://extensionpay.com" to content_security_policy in manifest.json');
          }
        } else if (csp && typeof csp === 'object' && csp.extension_pages) {
          if (!csp.extension_pages.includes('https://extensionpay.com')) {
            warnings.push('Add "connect-src https://extensionpay.com" to content_security_policy.extension_pages in manifest.json');
          }
        }
      } catch (error) {
        warnings.push('Could not verify CSP configuration');
      }
    }

    return {
      isConfigured: errors.length === 0,
      errors,
      warnings
    };
  }
}

// Export singleton instance
// Note: Extension ID should be configured based on environment
const EXTENSION_ID = process.env.NODE_ENV === 'production'
  ? 'truthlens-chrome-extension' // Replace with actual production extension ID
  : 'truthlens-dev'; // Development extension ID

export const extensionPayService = new ExtensionPayService(EXTENSION_ID);
