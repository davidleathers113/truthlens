/**
 * Subscription Summary Component
 * Comprehensive overview of subscription status, usage, and features
 * Following 2025 React patterns with integrated subscription management
 */

import React, { useMemo } from 'react';
import { SubscriptionStatusBadge } from './SubscriptionStatusBadge';
import { UsageCounter } from './UsageCounter';
import { PremiumFeatureList, PremiumFeature } from './PremiumFeatureIndicator';
import { useSubscriptionManager } from '../hooks/useSubscriptionManager';
import { SubscriptionTier } from '@shared/types';
import '../styles/SubscriptionSummary.css';

interface SubscriptionSummaryProps {
  onUpgradeClick?: (tier: SubscriptionTier) => void;
  onManageSubscription?: () => void;
  onFeatureLearnMore?: (featureId: string) => void;
  variant?: 'full' | 'compact' | 'minimal';
  showUsageCounter?: boolean;
  showFeatureList?: boolean;
  showUpgradePrompts?: boolean;
  className?: string;
}

export const SubscriptionSummary: React.FC<SubscriptionSummaryProps> = ({
  onUpgradeClick,
  onManageSubscription,
  onFeatureLearnMore,
  variant = 'full',
  showUsageCounter = true,
  showFeatureList = true,
  showUpgradePrompts = true,
  className
}) => {
  const { subscription, usage, upgradeRecommendation, actions } = useSubscriptionManager();

  // Define available features (would typically come from a config or API)
  const availableFeatures: PremiumFeature[] = useMemo(() => [
    {
      id: 'unlimited_checks',
      name: 'Unlimited Checks',
      description: 'Unlimited daily credibility checks with no restrictions',
      tier: 'premium',
      icon: '∞',
      category: 'core'
    },
    {
      id: 'bias_analysis',
      name: 'Bias Analysis',
      description: 'Detect political bias and analyze content framing',
      tier: 'premium',
      icon: '🎯',
      category: 'analysis'
    },
    {
      id: 'detailed_reports',
      name: 'Detailed Reports',
      description: 'Comprehensive credibility analysis with explanations',
      tier: 'premium',
      icon: '📊',
      category: 'analysis'
    },
    {
      id: 'historical_tracking',
      name: 'Historical Tracking',
      description: 'Track and analyze credibility trends over time',
      tier: 'premium',
      icon: '📈',
      category: 'data'
    },
    {
      id: 'export_data',
      name: 'Data Export',
      description: 'Export your credibility data and reports',
      tier: 'premium',
      icon: '💾',
      category: 'data'
    },
    {
      id: 'api_access',
      name: 'API Access',
      description: 'Integrate credibility checking into your applications',
      tier: 'enterprise',
      icon: '🔗',
      category: 'integration'
    },
    {
      id: 'team_management',
      name: 'Team Management',
      description: 'Manage team members and organization settings',
      tier: 'enterprise',
      icon: '👥',
      category: 'integration'
    }
  ], []);

  // Get feature access status
  const featureAccess = useMemo(() => {
    const access: Record<string, boolean> = {};
    availableFeatures.forEach(feature => {
      access[feature.id] = subscription.features.includes(feature.id);
    });
    return access;
  }, [availableFeatures, subscription.features]);

  // Handle upgrade click
  const handleUpgradeClick = async (tier: SubscriptionTier) => {
    if (onUpgradeClick) {
      onUpgradeClick(tier);
    } else {
      // Default upgrade action - in real app, this would open payment flow
      console.log(`Upgrading to ${tier}`);
    }
  };

  // Handle subscription management
  const handleManageSubscription = () => {
    if (onManageSubscription) {
      onManageSubscription();
    } else {
      // Default action - in real app, this would open subscription management
      console.log('Opening subscription management');
    }
  };

  // Get component classes
  const summaryClasses = [
    'subscription-summary',
    `variant-${variant}`,
    `tier-${subscription.tier}`,
    subscription.isLoading ? 'loading' : '',
    subscription.error ? 'error' : '',
    className || ''
  ].filter(Boolean).join(' ');

  // Show upgrade recommendation
  const shouldShowUpgradeRecommendation =
    showUpgradePrompts &&
    upgradeRecommendation.shouldShow &&
    subscription.tier === 'free';

  return (
    <div className={summaryClasses} role="region" aria-label="Subscription summary">
      {/* Loading State */}
      {subscription.isLoading && (
        <div className="loading-state" aria-live="polite">
          <div className="loading-spinner" aria-hidden="true" />
          <span>Loading subscription data...</span>
        </div>
      )}

      {/* Error State */}
      {subscription.error && (
        <div className="error-state" role="alert">
          <span className="error-icon" aria-hidden="true">⚠️</span>
          <div className="error-content">
            <p className="error-message">{subscription.error}</p>
            <button
              className="retry-button"
              onClick={actions.refreshData}
              aria-label="Retry loading subscription data"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!subscription.isLoading && !subscription.error && (
        <>
          {/* Subscription Status */}
          <div className="summary-section subscription-status">
            <SubscriptionStatusBadge
              tier={subscription.tier}
              status={subscription.status}
              isValid={subscription.isValid}
              daysUntilExpiry={subscription.daysUntilExpiry}
              gracePeriodDaysRemaining={subscription.gracePeriodDaysRemaining}
              compact={variant === 'compact' || variant === 'minimal'}
              onClick={subscription.tier !== 'free' ? handleManageSubscription : undefined}
            />

            {subscription.needsValidation && (
              <div className="validation-warning" role="alert">
                <span className="warning-icon" aria-hidden="true">🔄</span>
                <span className="warning-text">Subscription validation required</span>
                <button
                  className="validate-button"
                  onClick={() => actions.validateSubscription(true)}
                  aria-label="Validate subscription now"
                >
                  Validate Now
                </button>
              </div>
            )}
          </div>

          {/* Usage Counter (for free tier or when enabled) */}
          {showUsageCounter && (subscription.tier === 'free' || variant === 'full') && (
            <div className="summary-section usage-section">
              <UsageCounter
                dailyUsed={usage.dailyUsed}
                dailyLimit={usage.dailyLimit}
                dailyRemaining={usage.dailyRemaining}
                percentageUsed={usage.percentageUsed}
                resetTime={usage.resetTime}
                nearingLimit={usage.nearingLimit}
                limitReached={usage.limitReached}
                compact={variant === 'compact'}
                showTimeUntilReset={variant === 'full'}
                onUpgradeClick={() => handleUpgradeClick('premium')}
              />
            </div>
          )}

          {/* Upgrade Recommendation */}
          {shouldShowUpgradeRecommendation && (
            <div className="summary-section upgrade-recommendation" role="alert">
              <div className="recommendation-header">
                <span className="recommendation-icon" aria-hidden="true">💡</span>
                <h3 className="recommendation-title">Upgrade Recommended</h3>
              </div>

              <div className="recommendation-content">
                <p className="recommendation-reason">
                  {upgradeRecommendation.reasons[0]}
                </p>

                {upgradeRecommendation.estimatedValue && (
                  <p className="recommendation-value">
                    {upgradeRecommendation.estimatedValue}
                  </p>
                )}

                <div className="recommendation-features">
                  <span className="features-label">Unlock:</span>
                  <span className="features-list">
                    {upgradeRecommendation.featuresUnlocked.slice(0, 3).join(', ')}
                    {upgradeRecommendation.featuresUnlocked.length > 3 &&
                      ` and ${upgradeRecommendation.featuresUnlocked.length - 3} more`}
                  </span>
                </div>

                <button
                  className="upgrade-cta-button"
                  onClick={() => handleUpgradeClick(upgradeRecommendation.recommendedTier)}
                  aria-label={`Upgrade to ${upgradeRecommendation.recommendedTier}`}
                >
                  Upgrade to {upgradeRecommendation.recommendedTier.charAt(0).toUpperCase() + upgradeRecommendation.recommendedTier.slice(1)}
                </button>
              </div>
            </div>
          )}

          {/* Feature List */}
          {showFeatureList && variant === 'full' && (
            <div className="summary-section features-section">
              <div className="section-header">
                <h3 className="section-title">Available Features</h3>
                {subscription.tier === 'free' && (
                  <button
                    className="view-all-features"
                    onClick={() => handleUpgradeClick('premium')}
                    aria-label="View all premium features"
                  >
                    View All Features
                  </button>
                )}
              </div>

              <PremiumFeatureList
                features={availableFeatures}
                currentTier={subscription.tier}
                featureAccess={featureAccess}
                onUpgradeClick={handleUpgradeClick}
                onLearnMore={onFeatureLearnMore}
                variant="card"
                showOnlyRestricted={subscription.tier === 'free'}
                groupByCategory={false}
              />
            </div>
          )}

          {/* Quick Stats (for compact/minimal variants) */}
          {(variant === 'compact' || variant === 'minimal') && subscription.tier !== 'free' && (
            <div className="summary-section quick-stats">
              <div className="stat-item">
                <span className="stat-label">Features:</span>
                <span className="stat-value">{subscription.features.length}</span>
              </div>
              {subscription.daysUntilExpiry && (
                <div className="stat-item">
                  <span className="stat-label">Expires:</span>
                  <span className="stat-value">{subscription.daysUntilExpiry} days</span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {variant === 'full' && (
            <div className="summary-section actions-section">
              {subscription.tier !== 'free' && (
                <button
                  className="manage-subscription-button"
                  onClick={handleManageSubscription}
                  aria-label="Manage subscription settings"
                >
                  Manage Subscription
                </button>
              )}

              {subscription.tier === 'free' && (
                <button
                  className="explore-premium-button"
                  onClick={() => handleUpgradeClick('premium')}
                  aria-label="Explore premium features"
                >
                  Explore Premium
                </button>
              )}

              <button
                className="refresh-button"
                onClick={actions.refreshData}
                aria-label="Refresh subscription data"
              >
                Refresh
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
