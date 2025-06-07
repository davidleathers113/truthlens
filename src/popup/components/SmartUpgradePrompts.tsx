/**
 * Smart Upgrade Prompts Integration Component
 * Combines upgrade prompt UI with prompt management hooks
 * Following 2025 React patterns with automated prompt triggering
 */

import React, { useCallback } from 'react';
import { UpgradePrompt } from './UpgradePrompt';
import { useUpgradePrompts } from '../hooks/useUpgradePrompts';
import { SubscriptionTier } from '@shared/types';

interface SmartUpgradePromptsProps {
  onUpgrade?: (tier: SubscriptionTier, promptId: string) => void;
  onPromptDisplayed?: (promptId: string) => void;
  onPromptDismissed?: (promptId: string) => void;
  onPromptConverted?: (promptId: string) => void;
  // For tooltip positioning when triggered manually
  anchorElement?: HTMLElement | null;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export const SmartUpgradePrompts: React.FC<SmartUpgradePromptsProps> = ({
  onUpgrade,
  onPromptDisplayed,
  onPromptDismissed,
  onPromptConverted,
  anchorElement,
  placement = 'bottom'
}) => {
  const { activePrompt, actions } = useUpgradePrompts();

  // Handle upgrade action
  const handleUpgrade = useCallback(async (tier: SubscriptionTier) => {
    if (activePrompt) {
      // Record conversion in the prompt system
      await actions.acceptPrompt();

      // Call external handler if provided
      if (onUpgrade) {
        onUpgrade(tier, activePrompt.id);
      }

      if (onPromptConverted) {
        onPromptConverted(activePrompt.id);
      }

      console.log(`User upgraded to ${tier} from prompt ${activePrompt.id}`);
    }
  }, [activePrompt, actions, onUpgrade, onPromptConverted]);

  // Handle prompt dismissal
  const handleDismiss = useCallback(async () => {
    if (activePrompt) {
      // Record dismissal in the prompt system
      await actions.dismissPrompt();

      if (onPromptDismissed) {
        onPromptDismissed(activePrompt.id);
      }

      console.log(`User dismissed prompt ${activePrompt.id}`);
    }
  }, [activePrompt, actions, onPromptDismissed]);

  // Handle prompt close (immediate hide)
  const handleClose = useCallback(() => {
    if (activePrompt) {
      // Just hide the prompt without recording dismissal
      actions.hidePrompt();

      console.log(`User closed prompt ${activePrompt.id}`);
    }
  }, [activePrompt, actions]);

  // Notify when prompt is displayed
  React.useEffect(() => {
    if (activePrompt && activePrompt.isVisible && onPromptDisplayed) {
      onPromptDisplayed(activePrompt.id);
    }
  }, [activePrompt?.id, activePrompt?.isVisible, onPromptDisplayed]);

  // Don't render if no active prompt
  if (!activePrompt) {
    return null;
  }

  return (
    <UpgradePrompt
      config={activePrompt}
      context={activePrompt.context}
      isVisible={activePrompt.isVisible}
      onUpgrade={handleUpgrade}
      onDismiss={handleDismiss}
      onClose={handleClose}
      anchorElement={anchorElement}
      placement={placement}
    />
  );
};

// Hook for manually triggering specific upgrade prompts
export const useManualUpgradePrompts = () => {
  const { actions } = useUpgradePrompts();

  return {
    // Trigger when user tries to access premium feature
    triggerFeaturePrompt: useCallback(async (featureName: string, domain?: string) => {
      await actions.triggerPrompt('premium_feature_attempt', {
        attemptedFeature: featureName,
        blockedDomain: domain
      });
    }, [actions]),

    // Trigger when user hits domain restriction
    triggerDomainPrompt: useCallback(async (domain: string) => {
      await actions.triggerPrompt('restricted_domain', {
        blockedDomain: domain
      });
    }, [actions]),

    // Trigger usage threshold prompt
    triggerUsagePrompt: useCallback(async (currentUsage: number, dailyLimit: number) => {
      await actions.triggerPrompt('usage_threshold', {
        currentUsage,
        dailyLimit
      });
    }, [actions]),

    // Trigger limit reached prompt
    triggerLimitPrompt: useCallback(async (dailyLimit: number) => {
      await actions.triggerPrompt('limit_reached', {
        dailyLimit
      });
    }, [actions]),

    // Trigger engagement milestone prompt
    triggerEngagementPrompt: useCallback(async (weeklyUsage: number) => {
      await actions.triggerPrompt('engagement_milestone', {
        userEngagement: {
          weeklyUsage,
          streak: 7, // Could be calculated
          favoriteFeatures: ['basic_credibility'] // Could be tracked
        }
      });
    }, [actions]),

    // Trigger return user prompt
    triggerReturnUserPrompt: useCallback(async () => {
      await actions.triggerPrompt('return_user');
    }, [actions]),

    // Clear all prompts (for testing/admin)
    clearAllPrompts: actions.clearAllPrompts
  };
};

// Component for integrating with feature access controls
interface FeatureGatedUpgradePromptProps {
  featureId: string;
  hasAccess: boolean;
  domain?: string;
  children: React.ReactNode;
  onUpgrade?: (tier: SubscriptionTier) => void;
}

export const FeatureGatedUpgradePrompt: React.FC<FeatureGatedUpgradePromptProps> = ({
  featureId,
  hasAccess,
  domain,
  children,
  onUpgrade
}) => {
  const { triggerFeaturePrompt } = useManualUpgradePrompts();

  const handleFeatureClick = useCallback(async (e: React.MouseEvent) => {
    if (!hasAccess) {
      e.preventDefault();
      await triggerFeaturePrompt(featureId, domain);
    }
  }, [hasAccess, featureId, domain, triggerFeaturePrompt]);

  return (
    <div onClick={handleFeatureClick} style={{ cursor: hasAccess ? 'default' : 'pointer' }}>
      {children}
      <SmartUpgradePrompts onUpgrade={onUpgrade} />
    </div>
  );
};

// Component for analytics dashboard of upgrade prompts
interface UpgradePromptAnalyticsProps {
  className?: string;
}

export const UpgradePromptAnalytics: React.FC<UpgradePromptAnalyticsProps> = ({
  className
}) => {
  const { analytics } = useUpgradePrompts();

  return (
    <div className={`upgrade-prompt-analytics ${className || ''}`}>
      <h3>Upgrade Prompt Performance</h3>

      <div className="analytics-stats">
        <div className="stat-item">
          <span className="stat-label">Total Prompts:</span>
          <span className="stat-value">{analytics.totalPrompts}</span>
        </div>

        <div className="stat-item">
          <span className="stat-label">Conversions:</span>
          <span className="stat-value">{analytics.conversions}</span>
        </div>

        <div className="stat-item">
          <span className="stat-label">Conversion Rate:</span>
          <span className="stat-value">{analytics.conversionRate.toFixed(1)}%</span>
        </div>
      </div>

      {analytics.conversions > 0 && (
        <div className="top-performers">
          <h4>Top Performing Prompts</h4>
          {analytics.topPerformingPrompts?.slice(0, 3).map((prompt) => (
            <div key={prompt.promptId} className="prompt-performance">
              <span className="prompt-id">{prompt.promptId}</span>
              <span className="prompt-rate">{prompt.conversionRate.toFixed(1)}%</span>
              <span className="prompt-stats">
                {prompt.conversions}/{prompt.displays}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SmartUpgradePrompts;
