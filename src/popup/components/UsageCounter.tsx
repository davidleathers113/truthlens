/**
 * Usage Counter Component
 * Displays daily usage progress with visual indicators and time-based resets
 * Following 2025 React accessibility and animation patterns
 */

import React, { useState, useEffect, useCallback } from 'react';
import '../styles/UsageCounter.css';

interface UsageCounterProps {
  dailyUsed: number;
  dailyLimit: number;
  dailyRemaining: number;
  percentageUsed: number;
  resetTime: string;
  nearingLimit: boolean;
  limitReached: boolean;
  className?: string;
  showProgress?: boolean;
  showTimeUntilReset?: boolean;
  onUpgradeClick?: () => void;
  compact?: boolean;
}

export const UsageCounter: React.FC<UsageCounterProps> = ({
  dailyUsed,
  dailyLimit,
  dailyRemaining,
  percentageUsed,
  resetTime,
  nearingLimit,
  limitReached,
  className,
  showProgress = true,
  showTimeUntilReset = true,
  onUpgradeClick,
  compact = false
}) => {
  const [timeUntilReset, setTimeUntilReset] = useState<string>('');
  const [isAnimating, setIsAnimating] = useState(false);

  // Calculate time until reset
  const calculateTimeUntilReset = useCallback(() => {
    const resetDate = new Date(resetTime);
    const now = new Date();
    const diff = resetDate.getTime() - now.getTime();

    if (diff <= 0) {
      return 'Resetting now...';
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return 'Less than 1m';
    }
  }, [resetTime]);

  // Update countdown every minute
  useEffect(() => {
    const updateCountdown = () => {
      setTimeUntilReset(calculateTimeUntilReset());
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [calculateTimeUntilReset]);

  // Animate progress bar when usage changes
  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 300);
    return () => clearTimeout(timer);
  }, [dailyUsed]);

  // Get status configuration
  const getStatusConfig = () => {
    if (limitReached) {
      return {
        statusClass: 'limit-reached',
        statusIcon: '🚫',
        statusText: 'Daily limit reached',
        statusColor: '#ef4444',
        urgent: true
      };
    } else if (nearingLimit) {
      return {
        statusClass: 'nearing-limit',
        statusIcon: '⚠️',
        statusText: 'Approaching limit',
        statusColor: '#f59e0b',
        urgent: true
      };
    } else {
      return {
        statusClass: 'normal',
        statusIcon: '✅',
        statusText: 'Usage tracking',
        statusColor: '#10b981',
        urgent: false
      };
    }
  };

  const statusConfig = getStatusConfig();

  // Component classes
  const counterClasses = [
    'usage-counter',
    statusConfig.statusClass,
    compact ? 'compact' : 'full',
    isAnimating ? 'animating' : '',
    className || ''
  ].filter(Boolean).join(' ');

  // Progress bar configuration
  const progressWidth = Math.min(100, percentageUsed);
  const progressStyle = {
    width: `${progressWidth}%`,
    backgroundColor: statusConfig.statusColor,
    transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  };

  // Accessibility label
  const ariaLabel = `Daily usage: ${dailyUsed} of ${dailyLimit} checks used. ${dailyRemaining} remaining. ${
    timeUntilReset ? `Resets in ${timeUntilReset}` : ''
  }`;

  return (
    <div className={counterClasses} role="region" aria-label={ariaLabel}>
      {/* Header Section */}
      <div className="counter-header">
        <div className="counter-title">
          <span className="status-icon" aria-hidden="true">
            {statusConfig.statusIcon}
          </span>
          <span className="title-text">Daily Usage</span>
          {statusConfig.urgent && (
            <span className="urgent-indicator" role="alert" aria-label={statusConfig.statusText}>
              !
            </span>
          )}
        </div>

        {!compact && showTimeUntilReset && (
          <div className="reset-time">
            <span className="reset-label">Resets in:</span>
            <span className="reset-value">{timeUntilReset}</span>
          </div>
        )}
      </div>

      {/* Usage Statistics */}
      <div className="usage-stats">
        <div className="usage-numbers">
          <span className="usage-current" aria-label={`${dailyUsed} checks used`}>
            {dailyUsed.toLocaleString()}
          </span>
          <span className="usage-separator">/</span>
          <span className="usage-limit" aria-label={`${dailyLimit} daily limit`}>
            {dailyLimit.toLocaleString()}
          </span>
          <span className="usage-unit">checks</span>
        </div>

        <div className="usage-remaining">
          <span className="remaining-label">Remaining:</span>
          <span className="remaining-value">{dailyRemaining.toLocaleString()}</span>
        </div>
      </div>

      {/* Progress Bar */}
      {showProgress && (
        <div className="progress-container">
          <div className="progress-track" role="progressbar"
               aria-valuenow={dailyUsed}
               aria-valuemin={0}
               aria-valuemax={dailyLimit}
               aria-label={`Usage progress: ${Math.round(percentageUsed)}%`}>
            <div className="progress-fill" style={progressStyle}>
              <div className="progress-shine" aria-hidden="true" />
            </div>

            {/* Warning threshold indicator */}
            {dailyLimit > 0 && (
              <div
                className="warning-threshold"
                style={{ left: '80%' }}
                aria-hidden="true"
              />
            )}
          </div>

          <div className="progress-labels">
            <span className="progress-percentage">
              {Math.round(percentageUsed)}%
            </span>
          </div>
        </div>
      )}

      {/* Status Message */}
      {(limitReached || nearingLimit) && !compact && (
        <div className="status-message" role="alert">
          <span className="message-icon" aria-hidden="true">
            {statusConfig.statusIcon}
          </span>
          <div className="message-content">
            <span className="message-text">
              {limitReached
                ? "You've reached your daily limit. Upgrade for unlimited access!"
                : "You're approaching your daily limit. Consider upgrading for unlimited access."}
            </span>
            {onUpgradeClick && (
              <button
                className="upgrade-button"
                onClick={onUpgradeClick}
                aria-label="Upgrade to premium for unlimited access"
              >
                Upgrade Now
              </button>
            )}
          </div>
        </div>
      )}

      {/* Compact Reset Time */}
      {compact && showTimeUntilReset && (
        <div className="compact-reset">
          <span className="compact-reset-text">
            Resets in {timeUntilReset}
          </span>
        </div>
      )}
    </div>
  );
};
