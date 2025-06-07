/**
 * Subscription Status Badge Component
 * Displays current subscription tier and status with visual indicators
 * Following 2025 React accessibility and design patterns
 */

import React from 'react';
import { SubscriptionTier, SubscriptionStatus } from '@shared/types';
import '../styles/SubscriptionStatusBadge.css';

interface SubscriptionStatusBadgeProps {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  isValid: boolean;
  daysUntilExpiry?: number;
  gracePeriodDaysRemaining?: number;
  className?: string;
  compact?: boolean;
  onClick?: () => void;
}

export const SubscriptionStatusBadge: React.FC<SubscriptionStatusBadgeProps> = ({
  tier,
  status,
  isValid,
  daysUntilExpiry,
  gracePeriodDaysRemaining,
  className,
  compact = false,
  onClick
}) => {
  // Get badge configuration based on tier and status
  const getBadgeConfig = () => {
    const baseConfig = {
      tier,
      status,
      isValid
    };

    switch (tier) {
      case 'free':
        return {
          ...baseConfig,
          tierLabel: 'Free',
          tierClass: 'free',
          icon: '🆓',
          description: 'Basic features with daily limits'
        };
      case 'premium':
        return {
          ...baseConfig,
          tierLabel: 'Premium',
          tierClass: 'premium',
          icon: '⭐',
          description: 'Unlimited access with advanced features'
        };
      case 'enterprise':
        return {
          ...baseConfig,
          tierLabel: 'Enterprise',
          tierClass: 'enterprise',
          icon: '🏢',
          description: 'Full access with team management'
        };
      default:
        return {
          ...baseConfig,
          tierLabel: 'Unknown',
          tierClass: 'unknown',
          icon: '❓',
          description: 'Unknown subscription tier'
        };
    }
  };

  // Get status message and styling
  const getStatusConfig = () => {
    switch (status) {
      case 'active':
        return {
          statusText: 'Active',
          statusClass: 'active',
          statusIcon: '✅',
          urgent: false
        };
      case 'grace_period':
        return {
          statusText: gracePeriodDaysRemaining
            ? `Grace Period (${gracePeriodDaysRemaining} days left)`
            : 'Grace Period',
          statusClass: 'grace-period',
          statusIcon: '⚠️',
          urgent: true
        };
      case 'expired':
        return {
          statusText: 'Expired',
          statusClass: 'expired',
          statusIcon: '❌',
          urgent: true
        };
      case 'cancelled':
        return {
          statusText: 'Cancelled',
          statusClass: 'cancelled',
          statusIcon: '🚫',
          urgent: true
        };
      case 'free_tier':
        return {
          statusText: 'Active',
          statusClass: 'free-tier',
          statusIcon: '✅',
          urgent: false
        };
      default:
        return {
          statusText: 'Unknown',
          statusClass: 'unknown',
          statusIcon: '❓',
          urgent: false
        };
    }
  };

  const badgeConfig = getBadgeConfig();
  const statusConfig = getStatusConfig();

  // Handle expiry warning
  const showExpiryWarning = daysUntilExpiry && daysUntilExpiry <= 7 && tier !== 'free';

  // Component classes
  const badgeClasses = [
    'subscription-badge',
    `tier-${badgeConfig.tierClass}`,
    `status-${statusConfig.statusClass}`,
    compact ? 'compact' : 'full',
    !isValid ? 'invalid' : 'valid',
    statusConfig.urgent ? 'urgent' : '',
    onClick ? 'clickable' : '',
    className || ''
  ].filter(Boolean).join(' ');

  // Accessibility label
  const ariaLabel = `Subscription: ${badgeConfig.tierLabel} tier, ${statusConfig.statusText}${
    showExpiryWarning ? `, expires in ${daysUntilExpiry} days` : ''
  }`;

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (onClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={badgeClasses}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      aria-label={ariaLabel}
    >
      {/* Tier Section */}
      <div className="badge-tier">
        <span className="tier-icon" aria-hidden="true">
          {badgeConfig.icon}
        </span>
        <div className="tier-info">
          <span className="tier-label">{badgeConfig.tierLabel}</span>
          {!compact && (
            <span className="tier-description">{badgeConfig.description}</span>
          )}
        </div>
      </div>

      {/* Status Section */}
      <div className="badge-status">
        <span className="status-icon" aria-hidden="true">
          {statusConfig.statusIcon}
        </span>
        <span className="status-text">{statusConfig.statusText}</span>
      </div>

      {/* Expiry Warning */}
      {showExpiryWarning && !compact && (
        <div className="expiry-warning" role="alert">
          <span className="warning-icon" aria-hidden="true">⏰</span>
          <span className="warning-text">
            Expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Invalid Status Overlay */}
      {!isValid && (
        <div className="invalid-overlay" role="alert">
          <span className="invalid-icon" aria-hidden="true">🚨</span>
          <span className="invalid-text">Validation Required</span>
        </div>
      )}

      {/* Click indicator for interactive badges */}
      {onClick && (
        <div className="click-indicator" aria-hidden="true">
          <span className="chevron">›</span>
        </div>
      )}
    </div>
  );
};
