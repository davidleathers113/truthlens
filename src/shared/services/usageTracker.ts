/**
 * Usage Tracker Service
 * Manages daily usage limits for free tier users with UTC midnight reset
 * Implements freemium business model constraints (50 checks/day for free tier)
 */

import { UsageTracker } from '@shared/types';
import { StorageService } from '../storage/storageService';

export class UsageTrackerService {
  private storageService: StorageService;

  // Free tier limits based on PRD requirements
  private readonly FREE_TIER_DAILY_LIMIT = 50;
  private readonly WARNING_THRESHOLD = 0.8; // 80% of limit
  private readonly STORAGE_KEY = 'usage_tracker';

  constructor(storageService: StorageService) {
    this.storageService = storageService;
  }

  /**
   * Get current usage statistics
   */
  async getCurrentUsage(): Promise<UsageTracker> {
    const stored = await this.storageService.get<UsageTracker>(this.STORAGE_KEY, 'local');
    const now = Date.now();

    if (!stored) {
      return this.createNewUsageTracker(now);
    }

    // Check if we need to reset for new day (UTC midnight)
    if (this.shouldResetDaily(stored.lastReset, now)) {
      return this.resetDailyUsage(stored, now);
    }

    return stored;
  }

  /**
   * Increment daily usage counter
   */
  async incrementUsage(): Promise<{
    success: boolean;
    currentUsage: UsageTracker;
    limitReached: boolean;
    warningThreshold: boolean;
  }> {
    const usage = await this.getCurrentUsage();

    // Check if daily limit reached
    if (usage.dailyChecks >= this.FREE_TIER_DAILY_LIMIT) {
      return {
        success: false,
        currentUsage: usage,
        limitReached: true,
        warningThreshold: true
      };
    }

    // Increment counters
    const updatedUsage: UsageTracker = {
      ...usage,
      dailyChecks: usage.dailyChecks + 1,
      totalChecks: usage.totalChecks + 1,
      weeklyChecks: usage.weeklyChecks + 1,
      monthlyChecks: usage.monthlyChecks + 1
    };

    await this.storageService.set(this.STORAGE_KEY, updatedUsage, 'local');

    const warningThreshold = updatedUsage.dailyChecks >= (this.FREE_TIER_DAILY_LIMIT * this.WARNING_THRESHOLD);

    return {
      success: true,
      currentUsage: updatedUsage,
      limitReached: false,
      warningThreshold
    };
  }

  /**
   * Check if user can perform another check
   */
  async canPerformCheck(): Promise<{
    canPerform: boolean;
    remainingChecks: number;
    usage: UsageTracker;
    nearingLimit: boolean;
  }> {
    const usage = await this.getCurrentUsage();
    const remainingChecks = Math.max(0, this.FREE_TIER_DAILY_LIMIT - usage.dailyChecks);
    const canPerform = remainingChecks > 0;
    const nearingLimit = usage.dailyChecks >= (this.FREE_TIER_DAILY_LIMIT * this.WARNING_THRESHOLD);

    return {
      canPerform,
      remainingChecks,
      usage,
      nearingLimit
    };
  }

  /**
   * Get usage statistics for display
   */
  async getUsageStats(): Promise<{
    dailyUsed: number;
    dailyLimit: number;
    dailyRemaining: number;
    percentageUsed: number;
    resetTime: string; // ISO string for next reset
    nearingLimit: boolean;
    limitReached: boolean;
    weeklyTotal: number;
    monthlyTotal: number;
    allTimeTotal: number;
  }> {
    const usage = await this.getCurrentUsage();
    const dailyRemaining = Math.max(0, this.FREE_TIER_DAILY_LIMIT - usage.dailyChecks);
    const percentageUsed = (usage.dailyChecks / this.FREE_TIER_DAILY_LIMIT) * 100;
    const nearingLimit = usage.dailyChecks >= (this.FREE_TIER_DAILY_LIMIT * this.WARNING_THRESHOLD);
    const limitReached = usage.dailyChecks >= this.FREE_TIER_DAILY_LIMIT;

    // Calculate next UTC midnight
    const nextReset = this.getNextUTCMidnight();

    return {
      dailyUsed: usage.dailyChecks,
      dailyLimit: this.FREE_TIER_DAILY_LIMIT,
      dailyRemaining,
      percentageUsed: Math.min(100, percentageUsed),
      resetTime: new Date(nextReset).toISOString(),
      nearingLimit,
      limitReached,
      weeklyTotal: usage.weeklyChecks,
      monthlyTotal: usage.monthlyChecks,
      allTimeTotal: usage.totalChecks
    };
  }

  /**
   * Reset usage for testing or admin purposes
   */
  async resetUsage(resetType: 'daily' | 'weekly' | 'monthly' | 'all' = 'all'): Promise<void> {
    const current = await this.getCurrentUsage();
    const now = Date.now();

    let updatedUsage: UsageTracker;

    switch (resetType) {
      case 'daily':
        updatedUsage = {
          ...current,
          dailyChecks: 0,
          lastReset: now
        };
        break;
      case 'weekly':
        updatedUsage = {
          ...current,
          dailyChecks: 0,
          weeklyChecks: 0,
          lastReset: now
        };
        break;
      case 'monthly':
        updatedUsage = {
          ...current,
          dailyChecks: 0,
          weeklyChecks: 0,
          monthlyChecks: 0,
          lastReset: now
        };
        break;
      case 'all':
      default:
        updatedUsage = this.createNewUsageTracker(now);
        break;
    }

    await this.storageService.set(this.STORAGE_KEY, updatedUsage, 'local');
  }

  /**
   * Create a new usage tracker instance
   */
  private createNewUsageTracker(timestamp: number): UsageTracker {
    return {
      dailyChecks: 0,
      lastReset: timestamp,
      totalChecks: 0,
      weeklyChecks: 0,
      monthlyChecks: 0
    };
  }

  /**
   * Check if daily reset is needed (UTC midnight)
   */
  private shouldResetDaily(lastReset: number, now: number): boolean {
    const lastResetDate = new Date(lastReset);
    const nowDate = new Date(now);

    // Convert to UTC and check if we've crossed midnight
    const lastResetUTC = new Date(lastResetDate.getUTCFullYear(), lastResetDate.getUTCMonth(), lastResetDate.getUTCDate());
    const nowUTC = new Date(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), nowDate.getUTCDate());

    return nowUTC.getTime() !== lastResetUTC.getTime();
  }

  /**
   * Reset daily usage and update weekly/monthly if needed
   */
  private async resetDailyUsage(current: UsageTracker, now: number): Promise<UsageTracker> {
    const lastResetDate = new Date(current.lastReset);
    const nowDate = new Date(now);

    // Check if we need to reset weekly (Monday UTC)
    const shouldResetWeekly = this.shouldResetWeekly(lastResetDate, nowDate);

    // Check if we need to reset monthly (1st of month UTC)
    const shouldResetMonthly = this.shouldResetMonthly(lastResetDate, nowDate);

    const updatedUsage: UsageTracker = {
      dailyChecks: 0,
      lastReset: now,
      totalChecks: current.totalChecks,
      weeklyChecks: shouldResetWeekly ? 0 : current.weeklyChecks,
      monthlyChecks: shouldResetMonthly ? 0 : current.monthlyChecks
    };

    await this.storageService.set(this.STORAGE_KEY, updatedUsage, 'local');
    return updatedUsage;
  }

  /**
   * Check if weekly reset is needed (Monday UTC)
   */
  private shouldResetWeekly(lastDate: Date, currentDate: Date): boolean {
    const getWeekStart = (date: Date) => {
      const utcDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
      const dayOfWeek = utcDate.getUTCDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday is start of week
      return new Date(utcDate.getTime() + diff * 24 * 60 * 60 * 1000);
    };

    const lastWeekStart = getWeekStart(lastDate);
    const currentWeekStart = getWeekStart(currentDate);

    return lastWeekStart.getTime() !== currentWeekStart.getTime();
  }

  /**
   * Check if monthly reset is needed (1st of month UTC)
   */
  private shouldResetMonthly(lastDate: Date, currentDate: Date): boolean {
    return lastDate.getUTCMonth() !== currentDate.getUTCMonth() ||
           lastDate.getUTCFullYear() !== currentDate.getUTCFullYear();
  }

  /**
   * Get next UTC midnight timestamp
   */
  private getNextUTCMidnight(): number {
    const now = new Date();
    const nextMidnight = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0);
    return nextMidnight.getTime();
  }

  /**
   * Get time until next reset in human readable format
   */
  async getTimeUntilReset(): Promise<string> {
    const nextReset = this.getNextUTCMidnight();
    const now = Date.now();
    const msUntilReset = nextReset - now;

    if (msUntilReset <= 0) {
      return 'Resetting now...';
    }

    const hours = Math.floor(msUntilReset / (1000 * 60 * 60));
    const minutes = Math.floor((msUntilReset % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Check if usage tracking should trigger upgrade prompt
   */
  async shouldShowUpgradePrompt(): Promise<{
    shouldShow: boolean;
    reason: 'approaching_limit' | 'limit_reached' | 'frequent_user' | 'none';
    message?: string;
  }> {
    const stats = await this.getUsageStats();

    if (stats.limitReached) {
      return {
        shouldShow: true,
        reason: 'limit_reached',
        message: `You've reached your daily limit of ${this.FREE_TIER_DAILY_LIMIT} checks. Upgrade to Premium for unlimited access!`
      };
    }

    if (stats.nearingLimit) {
      return {
        shouldShow: true,
        reason: 'approaching_limit',
        message: `You've used ${stats.dailyUsed} of ${this.FREE_TIER_DAILY_LIMIT} daily checks. Upgrade to Premium for unlimited access!`
      };
    }

    // Check if user is a frequent user (>70% of limit for 3+ days in a week)
    if (stats.weeklyTotal >= (this.FREE_TIER_DAILY_LIMIT * 0.7 * 3)) {
      return {
        shouldShow: true,
        reason: 'frequent_user',
        message: 'You\'re an active user! Upgrade to Premium for unlimited checks and advanced features.'
      };
    }

    return {
      shouldShow: false,
      reason: 'none'
    };
  }
}

// Export singleton instance
import { storageService } from '../storage/storageService';
export const usageTracker = new UsageTrackerService(storageService);
