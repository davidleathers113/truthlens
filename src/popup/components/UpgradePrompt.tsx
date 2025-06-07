/**
 * Upgrade Prompt Component
 * Smart contextual upgrade prompts with multiple display styles
 * Following 2025 React patterns with conversion optimization
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { UpgradePromptConfig, PromptContext } from '@shared/services/upgradePromptManager';
import { SubscriptionTier } from '@shared/types';
import '../styles/UpgradePrompts.css';

interface UpgradePromptProps {
  config: UpgradePromptConfig;
  context?: PromptContext;
  isVisible: boolean;
  onUpgrade: (tier: SubscriptionTier) => void;
  onDismiss: () => void;
  onClose?: () => void;
  style?: React.CSSProperties;
  className?: string;
  // For tooltip positioning
  anchorElement?: HTMLElement | null;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  config,
  context,
  isVisible,
  onUpgrade,
  onDismiss,
  onClose,
  style,
  className,
  anchorElement,
  placement = 'bottom'
}) => {
  const promptRef = useRef<HTMLDivElement>(null);

  // Handle escape key for dismissible prompts
  useEffect(() => {
    if (!isVisible || !config.dismissible) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isVisible, config.dismissible, onDismiss]);

  // Handle backdrop click for modal
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (config.style === 'modal' && config.dismissible && e.target === e.currentTarget) {
      onDismiss();
    }
  }, [config.style, config.dismissible, onDismiss]);

  // Handle upgrade click
  const handleUpgrade = useCallback(() => {
    onUpgrade(config.targetTier);
  }, [onUpgrade, config.targetTier]);

  // Handle close/dismiss
  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      onDismiss();
    }
  }, [onClose, onDismiss]);

  // Personalize message with context data
  const personalizedMessage = React.useMemo(() => {
    let message = config.message;

    if (context) {
      if (context.currentUsage && context.dailyLimit) {
        message = message
          .replace('{usage}', context.currentUsage.toString())
          .replace('{limit}', context.dailyLimit.toString());
      }

      if (context.attemptedFeature) {
        message = message.replace('{feature}', context.attemptedFeature);
      }

      if (context.blockedDomain) {
        message = message.replace('{domain}', context.blockedDomain);
      }

      if (context.userEngagement) {
        message = message.replace('{weeklyChecks}', context.userEngagement.weeklyUsage.toString());
      }
    }

    return message;
  }, [config.message, context]);

  // Personalize FOMO element
  const personalizedFomo = React.useMemo(() => {
    if (!config.fomoElement) return null;

    let fomoMessage = config.fomoElement.message;

    if (context) {
      if (context.blockedDomain) {
        fomoMessage = fomoMessage.replace('{source}', context.blockedDomain);
      }

      if (context.userEngagement) {
        fomoMessage = fomoMessage.replace('{weeklyChecks}', context.userEngagement.weeklyUsage.toString());
      }
    }

    return {
      ...config.fomoElement,
      message: fomoMessage
    };
  }, [config.fomoElement, context]);

  // Get component classes
  const promptClasses = [
    'upgrade-prompt',
    `style-${config.style}`,
    `priority-${config.priority >= 8 ? 'high' : config.priority >= 5 ? 'medium' : 'low'}`,
    isVisible ? 'visible' : 'hidden',
    className || ''
  ].filter(Boolean).join(' ');

  // Get positioning for tooltip
  const getTooltipStyle = (): React.CSSProperties => {
    if (config.style !== 'tooltip' || !anchorElement) {
      return style || {};
    }

    const rect = anchorElement.getBoundingClientRect();
    const tooltipStyle: React.CSSProperties = {
      position: 'fixed',
      zIndex: 100,
      ...style
    };

    switch (placement) {
      case 'top':
        tooltipStyle.bottom = window.innerHeight - rect.top + 8;
        tooltipStyle.left = rect.left + rect.width / 2;
        tooltipStyle.transform = 'translateX(-50%)';
        break;
      case 'bottom':
        tooltipStyle.top = rect.bottom + 8;
        tooltipStyle.left = rect.left + rect.width / 2;
        tooltipStyle.transform = 'translateX(-50%)';
        break;
      case 'left':
        tooltipStyle.right = window.innerWidth - rect.left + 8;
        tooltipStyle.top = rect.top + rect.height / 2;
        tooltipStyle.transform = 'translateY(-50%)';
        break;
      case 'right':
        tooltipStyle.left = rect.right + 8;
        tooltipStyle.top = rect.top + rect.height / 2;
        tooltipStyle.transform = 'translateY(-50%)';
        break;
    }

    return tooltipStyle;
  };

  // Render modal variant
  const renderModal = () => (
    <div
      className={promptClasses}
      onClick={handleBackdropClick}
      style={style}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-prompt-title"
      aria-describedby="upgrade-prompt-description"
    >
      <div className="modal-content" ref={promptRef}>
        <div className="modal-header">
          <div className="modal-title-section">
            <span className="modal-icon" aria-hidden="true">💎</span>
            <h2 id="upgrade-prompt-title" className="modal-title">
              {config.title}
            </h2>
          </div>
          {config.dismissible && (
            <button
              className="modal-close"
              onClick={handleClose}
              aria-label="Close upgrade prompt"
            >
              ×
            </button>
          )}
        </div>

        <div className="modal-body">
          <p id="upgrade-prompt-description" className="modal-message">
            {personalizedMessage}
          </p>

          {personalizedFomo && (
            <div className="modal-fomo">
              {personalizedFomo.message}
            </div>
          )}

          <div className="modal-features">
            <h3 className="features-title">Unlock Premium Features:</h3>
            <ul className="features-list">
              {config.features.slice(0, 4).map((feature, index) => (
                <li key={index} className="feature-item">
                  {feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </li>
              ))}
            </ul>
          </div>

          <div className="modal-value">
            {config.valueProposition}
          </div>
        </div>

        <div className="modal-actions">
          <button
            className="upgrade-cta"
            onClick={handleUpgrade}
            aria-label={`Upgrade to ${config.targetTier}`}
          >
            {config.ctaText}
          </button>
          {config.dismissible && (
            <button
              className="dismiss-button"
              onClick={onDismiss}
              aria-label="Not now"
            >
              Not Now
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // Render banner variant
  const renderBanner = () => (
    <div
      className={promptClasses}
      style={style}
      role="banner"
      aria-live="polite"
      aria-labelledby="banner-title"
    >
      <div className="banner-content">
        <span className="banner-icon" aria-hidden="true">🎯</span>
        <div className="banner-text">
          <h3 id="banner-title" className="banner-title">
            {config.title}
          </h3>
          <p className="banner-message">
            {personalizedMessage}
          </p>
          {personalizedFomo && (
            <p className="banner-fomo">
              {personalizedFomo.message}
            </p>
          )}
        </div>
      </div>
      <div className="banner-actions">
        <button
          className="banner-cta"
          onClick={handleUpgrade}
          aria-label={`Upgrade to ${config.targetTier}`}
        >
          {config.ctaText}
        </button>
        {config.dismissible && (
          <button
            className="banner-dismiss"
            onClick={onDismiss}
            aria-label="Dismiss upgrade prompt"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );

  // Render tooltip variant
  const renderTooltip = () => (
    <div
      className={promptClasses}
      style={getTooltipStyle()}
      role="tooltip"
      aria-live="polite"
    >
      <div className="tooltip-container">
        <div className="tooltip-content">
          <div className="tooltip-header">
            <h3 className="tooltip-title">
              {config.title}
            </h3>
            {config.dismissible && (
              <button
                className="tooltip-close"
                onClick={handleClose}
                aria-label="Close tooltip"
              >
                ×
              </button>
            )}
          </div>
          <p className="tooltip-message">
            {personalizedMessage}
          </p>
          <button
            className="tooltip-cta"
            onClick={handleUpgrade}
            aria-label={`Upgrade to ${config.targetTier}`}
          >
            {config.ctaText}
          </button>
        </div>
        <div className={`tooltip-arrow ${placement}`} />
      </div>
    </div>
  );

  // Render inline variant
  const renderInline = () => (
    <div
      className={promptClasses}
      style={style}
      role="banner"
      aria-live="polite"
    >
      <div className="inline-content">
        <span className="inline-icon" aria-hidden="true">⭐</span>
        <div className="inline-text">
          <h3 className="inline-title">
            {config.title}
          </h3>
          <p className="inline-message">
            {personalizedMessage}
          </p>
        </div>
      </div>
      <div className="inline-actions">
        <button
          className="inline-cta"
          onClick={handleUpgrade}
          aria-label={`Upgrade to ${config.targetTier}`}
        >
          {config.ctaText}
        </button>
        {config.dismissible && (
          <button
            className="inline-dismiss"
            onClick={onDismiss}
            aria-label="Dismiss"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );

  // Don't render if not visible
  if (!isVisible) return null;

  // Render based on style
  let content;
  switch (config.style) {
    case 'modal':
      content = renderModal();
      break;
    case 'banner':
      content = renderBanner();
      break;
    case 'tooltip':
      content = renderTooltip();
      break;
    case 'inline':
      content = renderInline();
      break;
    default:
      content = renderBanner(); // fallback
  }

  // For modal and tooltip, use portal to render outside current DOM tree
  if (config.style === 'modal' || config.style === 'tooltip') {
    return createPortal(content, document.body);
  }

  return content;
};

// Component for managing multiple upgrade prompts
interface UpgradePromptManagerProps {
  prompts: Array<{
    config: UpgradePromptConfig;
    context?: PromptContext;
    isVisible: boolean;
    id: string;
  }>;
  onUpgrade: (tier: SubscriptionTier, promptId: string) => void;
  onDismiss: (promptId: string) => void;
  onClose?: (promptId: string) => void;
}

export const UpgradePromptManager: React.FC<UpgradePromptManagerProps> = ({
  prompts,
  onUpgrade,
  onDismiss,
  onClose
}) => {
  // Only show the highest priority visible prompt
  const activePrompt = React.useMemo(() => {
    return prompts
      .filter(p => p.isVisible)
      .sort((a, b) => b.config.priority - a.config.priority)[0];
  }, [prompts]);

  if (!activePrompt) return null;

  return (
    <UpgradePrompt
      config={activePrompt.config}
      context={activePrompt.context}
      isVisible={activePrompt.isVisible}
      onUpgrade={(tier) => onUpgrade(tier, activePrompt.id)}
      onDismiss={() => onDismiss(activePrompt.id)}
      onClose={onClose ? () => onClose(activePrompt.id) : undefined}
    />
  );
};

export default UpgradePrompt;
