/**
 * Premium Feature Indicator Component
 * Shows premium feature badges and upgrade prompts
 * Following 2025 React accessibility and interaction patterns
 */

import React, { useState } from 'react';
import { SubscriptionTier } from '@shared/types';
import '../styles/PremiumFeatureIndicator.css';

export interface PremiumFeature {
  id: string;
  name: string;
  description: string;
  tier: SubscriptionTier;
  icon?: string;
  category: 'core' | 'analysis' | 'ui' | 'data' | 'integration';
}

interface PremiumFeatureIndicatorProps {
  feature: PremiumFeature;
  currentTier: SubscriptionTier;
  hasAccess: boolean;
  isLoading?: boolean;
  onUpgradeClick?: (targetTier: SubscriptionTier) => void;
  onLearnMore?: (featureId: string) => void;
  variant?: 'badge' | 'card' | 'inline';
  showDescription?: boolean;
  className?: string;
}

export const PremiumFeatureIndicator: React.FC<PremiumFeatureIndicatorProps> = ({
  feature,
  currentTier: _currentTier,
  hasAccess,
  isLoading = false,
  onUpgradeClick,
  onLearnMore,
  variant = 'badge',
  showDescription = true,
  className
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Get tier configuration
  const getTierConfig = (tier: SubscriptionTier) => {
    switch (tier) {
      case 'premium':
        return {
          label: 'Premium',
          color: '#f59e0b',
          bgColor: '#fef3c7',
          icon: '⭐'
        };
      case 'enterprise':
        return {
          label: 'Enterprise',
          color: '#8b5cf6',
          bgColor: '#ddd6fe',
          icon: '🏢'
        };
      default:
        return {
          label: 'Free',
          color: '#6b7280',
          bgColor: '#f3f4f6',
          icon: '🆓'
        };
    }
  };

  const tierConfig = getTierConfig(feature.tier);
  const needsUpgrade = !hasAccess && feature.tier !== 'free';

  // Component classes
  const indicatorClasses = [
    'premium-feature-indicator',
    `variant-${variant}`,
    `tier-${feature.tier}`,
    `category-${feature.category}`,
    hasAccess ? 'has-access' : 'no-access',
    needsUpgrade ? 'needs-upgrade' : '',
    isLoading ? 'loading' : '',
    isHovered ? 'hovered' : '',
    className || ''
  ].filter(Boolean).join(' ');

  const handleUpgradeClick = () => {
    if (onUpgradeClick && needsUpgrade) {
      onUpgradeClick(feature.tier);
    }
  };

  const handleLearnMore = () => {
    if (onLearnMore) {
      onLearnMore(feature.id);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, action: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };

  // Render based on variant
  const renderBadgeVariant = () => (
    <div
      className={indicatorClasses}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="region"
      aria-label={`${feature.name} - ${hasAccess ? 'Available' : `Requires ${tierConfig.label}`}`}
    >
      <div className="feature-badge">
        <span className="feature-icon" aria-hidden="true">
          {feature.icon || tierConfig.icon}
        </span>
        <span className="feature-name">{feature.name}</span>
        {needsUpgrade && (
          <span className="tier-badge" style={{ backgroundColor: tierConfig.bgColor, color: tierConfig.color }}>
            {tierConfig.label}
          </span>
        )}
      </div>

      {needsUpgrade && (
        <button
          className="upgrade-badge"
          onClick={handleUpgradeClick}
          onKeyDown={(e) => handleKeyDown(e, handleUpgradeClick)}
          aria-label={`Upgrade to ${tierConfig.label} for ${feature.name}`}
        >
          Upgrade
        </button>
      )}
    </div>
  );

  const renderCardVariant = () => (
    <div
      className={indicatorClasses}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="article"
      aria-labelledby={`feature-${feature.id}-title`}
      aria-describedby={showDescription ? `feature-${feature.id}-desc` : undefined}
    >
      <div className="feature-header">
        <div className="feature-title-section">
          <span className="feature-icon" aria-hidden="true">
            {feature.icon || tierConfig.icon}
          </span>
          <h3 id={`feature-${feature.id}-title`} className="feature-title">
            {feature.name}
          </h3>
        </div>

        <div className="feature-status">
          {hasAccess ? (
            <span className="access-badge available" aria-label="Available">
              ✅ Available
            </span>
          ) : (
            <span
              className="access-badge premium"
              style={{ backgroundColor: tierConfig.bgColor, color: tierConfig.color }}
              aria-label={`Requires ${tierConfig.label}`}
            >
              {tierConfig.icon} {tierConfig.label}
            </span>
          )}
        </div>
      </div>

      {showDescription && (
        <p id={`feature-${feature.id}-desc`} className="feature-description">
          {feature.description}
        </p>
      )}

      {needsUpgrade && (
        <div className="feature-actions">
          {onLearnMore && (
            <button
              className="learn-more-button"
              onClick={handleLearnMore}
              onKeyDown={(e) => handleKeyDown(e, handleLearnMore)}
              aria-label={`Learn more about ${feature.name}`}
            >
              Learn More
            </button>
          )}
          <button
            className="upgrade-button"
            onClick={handleUpgradeClick}
            onKeyDown={(e) => handleKeyDown(e, handleUpgradeClick)}
            aria-label={`Upgrade to ${tierConfig.label} to access ${feature.name}`}
          >
            Upgrade to {tierConfig.label}
          </button>
        </div>
      )}

      {isLoading && (
        <div className="loading-overlay" aria-live="polite" aria-label="Loading feature status">
          <div className="loading-spinner" aria-hidden="true" />
          <span className="loading-text">Checking access...</span>
        </div>
      )}
    </div>
  );

  const renderInlineVariant = () => (
    <span
      className={indicatorClasses}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      role="button"
      tabIndex={needsUpgrade ? 0 : -1}
      onClick={needsUpgrade ? handleUpgradeClick : undefined}
      onKeyDown={needsUpgrade ? (e) => handleKeyDown(e, handleUpgradeClick) : undefined}
      aria-label={hasAccess ? `${feature.name} is available` : `${feature.name} requires ${tierConfig.label} - click to upgrade`}
    >
      <span className="inline-icon" aria-hidden="true">
        {hasAccess ? '✅' : tierConfig.icon}
      </span>

      {!hasAccess && showTooltip && (
        <div className="tooltip" role="tooltip">
          <div className="tooltip-content">
            <strong>{feature.name}</strong> requires {tierConfig.label}
            <button className="tooltip-upgrade" onClick={handleUpgradeClick}>
              Upgrade
            </button>
          </div>
          <div className="tooltip-arrow" aria-hidden="true" />
        </div>
      )}
    </span>
  );

  // Render appropriate variant
  switch (variant) {
    case 'card':
      return renderCardVariant();
    case 'inline':
      return renderInlineVariant();
    case 'badge':
    default:
      return renderBadgeVariant();
  }
};

// Feature list component for displaying multiple features
interface PremiumFeatureListProps {
  features: PremiumFeature[];
  currentTier: SubscriptionTier;
  featureAccess: Record<string, boolean>;
  onUpgradeClick?: (targetTier: SubscriptionTier) => void;
  onLearnMore?: (featureId: string) => void;
  variant?: 'badge' | 'card' | 'inline';
  showOnlyRestricted?: boolean;
  groupByCategory?: boolean;
  className?: string;
}

export const PremiumFeatureList: React.FC<PremiumFeatureListProps> = ({
  features,
  currentTier,
  featureAccess,
  onUpgradeClick,
  onLearnMore,
  variant = 'card',
  showOnlyRestricted = false,
  groupByCategory = false,
  className
}) => {
  // Filter features based on showOnlyRestricted
  const filteredFeatures = showOnlyRestricted
    ? features.filter(feature => !featureAccess[feature.id] && feature.tier !== 'free')
    : features;

  // Group by category if requested
  const renderFeatures = () => {
    if (groupByCategory) {
      const categories = ['core', 'analysis', 'ui', 'data', 'integration'] as const;
      return categories.map(category => {
        const categoryFeatures = filteredFeatures.filter(f => f.category === category);
        if (categoryFeatures.length === 0) return null;

        return (
          <div key={category} className="feature-category">
            <h3 className="category-title">
              {category.charAt(0).toUpperCase() + category.slice(1)} Features
            </h3>
            <div className="category-features">
              {categoryFeatures.map(feature => (
                <PremiumFeatureIndicator
                  key={feature.id}
                  feature={feature}
                  currentTier={currentTier}
                  hasAccess={featureAccess[feature.id]}
                  onUpgradeClick={onUpgradeClick}
                  onLearnMore={onLearnMore}
                  variant={variant}
                />
              ))}
            </div>
          </div>
        );
      });
    }

    return filteredFeatures.map(feature => (
      <PremiumFeatureIndicator
        key={feature.id}
        feature={feature}
        currentTier={currentTier}
        hasAccess={featureAccess[feature.id]}
        onUpgradeClick={onUpgradeClick}
        onLearnMore={onLearnMore}
        variant={variant}
      />
    ));
  };

  return (
    <div className={`premium-feature-list variant-${variant} ${className || ''}`}>
      {renderFeatures()}
    </div>
  );
};
