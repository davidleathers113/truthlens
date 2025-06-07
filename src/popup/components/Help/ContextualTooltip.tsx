/**
 * Contextual Tooltip Component - 2025 Implementation
 *
 * Features:
 * - Gen Z focused design (emoji-enhanced, <8 second understanding)
 * - Micro-interactions with immediate feedback
 * - Progressive disclosure
 * - Accessibility compliant (WCAG 2.1 AA)
 * - Mobile-first responsive design
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Tooltip, TooltipContent, HelpAnalytics } from '@shared/types/help';
import { logger } from '@shared/services';
import './ContextualTooltip.css';

export interface ContextualTooltipProps {
  tooltip: Tooltip;
  target: HTMLElement | null;
  onDismiss?: (tooltipId: string) => void;
  onAction?: (tooltipId: string, action: string) => void;
  onAnalytics?: (event: HelpAnalytics) => void;
  children?: React.ReactNode;
  className?: string;
}

export const ContextualTooltip: React.FC<ContextualTooltipProps> = ({
  tooltip,
  target,
  onDismiss,
  onAction,
  onAnalytics,
  children,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [actualPosition, setActualPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('top');
  const [isAnimating, setIsAnimating] = useState(false);

  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Auto-dismiss timer
  useEffect(() => {
    if (isVisible && tooltip.duration) {
      timeoutRef.current = setTimeout(() => {
        handleDismiss('auto_timeout');
      }, tooltip.duration);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isVisible, tooltip.duration]);

  // Position calculation with collision detection
  const calculatePosition = useCallback(() => {
    if (!target || !tooltipRef.current) return;

    const targetRect = target.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    let x = 0, y = 0;
    let preferredPosition = tooltip.position === 'auto' ? 'top' : tooltip.position;

    // Smart positioning with collision detection
    switch (preferredPosition) {
      case 'top':
        x = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
        y = targetRect.top - tooltipRect.height - 8;

        // Check if tooltip would be cut off at top
        if (y < 8) {
          preferredPosition = 'bottom';
          y = targetRect.bottom + 8;
        }
        break;

      case 'bottom':
        x = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
        y = targetRect.bottom + 8;

        // Check if tooltip would be cut off at bottom
        if (y + tooltipRect.height > viewport.height - 8) {
          preferredPosition = 'top';
          y = targetRect.top - tooltipRect.height - 8;
        }
        break;

      case 'left':
        x = targetRect.left - tooltipRect.width - 8;
        y = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);

        // Check if tooltip would be cut off at left
        if (x < 8) {
          preferredPosition = 'right';
          x = targetRect.right + 8;
        }
        break;

      case 'right':
        x = targetRect.right + 8;
        y = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);

        // Check if tooltip would be cut off at right
        if (x + tooltipRect.width > viewport.width - 8) {
          preferredPosition = 'left';
          x = targetRect.left - tooltipRect.width - 8;
        }
        break;
    }

    // Ensure tooltip stays within viewport horizontally
    x = Math.max(8, Math.min(x, viewport.width - tooltipRect.width - 8));

    // Ensure tooltip stays within viewport vertically
    y = Math.max(8, Math.min(y, viewport.height - tooltipRect.height - 8));

    setPosition({ x, y });
    setActualPosition(preferredPosition);
  }, [target, tooltip.position]);

  // Show tooltip with animation
  const showTooltip = useCallback((reason: 'manual' | 'auto' | 'focus' = 'manual') => {
    if (isVisible) return;

    startTimeRef.current = Date.now();
    setIsAnimating(true);
    setIsVisible(true);

    // Delayed position calculation for smooth animation
    setTimeout(() => {
      calculatePosition();
      setIsAnimating(false);
    }, tooltip.delay || 100);

    // Analytics tracking
    onAnalytics?.({
      event: 'tooltip_viewed',
      properties: {
        itemId: tooltip.id,
        category: tooltip.priority,
        context: reason,
        userType: 'unknown' // Would come from context
      },
      timestamp: Date.now(),
      sessionId: 'session_' + Date.now() // Would come from session manager
    });

    logger.info('Tooltip shown', {
      tooltipId: tooltip.id,
      trigger: reason,
      position: actualPosition
    });
  }, [isVisible, calculatePosition, tooltip, onAnalytics, actualPosition]);

  // Hide tooltip
  const handleDismiss = useCallback((reason: 'manual' | 'auto_timeout' | 'outside_click' | 'escape' = 'manual') => {
    if (!isVisible) return;

    const timeSpent = Date.now() - startTimeRef.current;
    setIsAnimating(true);

    setTimeout(() => {
      setIsVisible(false);
      setIsAnimating(false);
      onDismiss?.(tooltip.id);
    }, 150); // Animation duration

    // Analytics tracking
    onAnalytics?.({
      event: 'tooltip_dismissed',
      properties: {
        itemId: tooltip.id,
        category: tooltip.priority,
        timeSpent,
        completed: reason !== 'auto_timeout',
        context: reason
      },
      timestamp: Date.now(),
      sessionId: 'session_' + Date.now()
    });

    logger.info('Tooltip dismissed', {
      tooltipId: tooltip.id,
      reason,
      timeSpent
    });
  }, [isVisible, tooltip.id, onDismiss, onAnalytics]);

  // Handle action button clicks
  const handleAction = useCallback(() => {
    if (tooltip.action) {
      tooltip.action.onClick();
      onAction?.(tooltip.id, 'action_clicked');

      // Analytics for action taken
      onAnalytics?.({
        event: 'tooltip_dismissed',
        properties: {
          itemId: tooltip.id,
          category: tooltip.priority,
          timeSpent: Date.now() - startTimeRef.current,
          completed: true,
          context: 'action_taken'
        },
        timestamp: Date.now(),
        sessionId: 'session_' + Date.now()
      });

      handleDismiss('manual');
    }
  }, [tooltip, onAction, onAnalytics, handleDismiss]);

  // Event handlers for different trigger types
  useEffect(() => {
    if (!target) return;

    const handleTrigger = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();

      if (tooltip.trigger === 'click') {
        if (isVisible) {
          handleDismiss('manual');
        } else {
          showTooltip('manual');
        }
      } else if (tooltip.trigger === 'hover') {
        showTooltip('manual');
      } else if (tooltip.trigger === 'focus') {
        showTooltip('focus');
      }
    };

    const handleMouseLeave = () => {
      if (tooltip.trigger === 'hover' && isVisible) {
        setTimeout(() => {
          if (!tooltipRef.current?.matches(':hover')) {
            handleDismiss('outside_click');
          }
        }, 100);
      }
    };

    const handleBlur = () => {
      if (tooltip.trigger === 'focus') {
        handleDismiss('outside_click');
      }
    };

    // Add event listeners based on trigger type
    if (tooltip.trigger === 'hover') {
      target.addEventListener('mouseenter', handleTrigger);
      target.addEventListener('mouseleave', handleMouseLeave);
    } else if (tooltip.trigger === 'click') {
      target.addEventListener('click', handleTrigger);
    } else if (tooltip.trigger === 'focus') {
      target.addEventListener('focus', handleTrigger);
      target.addEventListener('blur', handleBlur);
    } else if (tooltip.trigger === 'auto') {
      // Auto-show after a delay
      setTimeout(() => showTooltip('auto'), tooltip.delay || 1000);
    }

    return () => {
      target.removeEventListener('mouseenter', handleTrigger);
      target.removeEventListener('mouseleave', handleMouseLeave);
      target.removeEventListener('click', handleTrigger);
      target.removeEventListener('focus', handleTrigger);
      target.removeEventListener('blur', handleBlur);
    };
  }, [target, tooltip.trigger, isVisible, showTooltip, handleDismiss]);

  // Outside click handler
  useEffect(() => {
    if (!isVisible) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!tooltipRef.current?.contains(event.target as Node) &&
          !target?.contains(event.target as Node)) {
        handleDismiss('outside_click');
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleDismiss('escape');
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isVisible, target, handleDismiss]);

  // Window resize handler
  useEffect(() => {
    if (!isVisible) return;

    const handleResize = () => {
      calculatePosition();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
    };
  }, [isVisible, calculatePosition]);

  if (!isVisible && !isAnimating) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <div
        ref={tooltipRef}
        className={`contextual-tooltip contextual-tooltip--${actualPosition} contextual-tooltip--${tooltip.theme || 'light'} ${
          tooltip.animation !== 'none' ? `contextual-tooltip--${tooltip.animation || 'fade'}` : ''
        } ${isAnimating ? 'contextual-tooltip--animating' : ''} ${isVisible ? 'contextual-tooltip--visible' : ''} ${className}`}
        style={{
          left: position.x,
          top: position.y,
          maxWidth: tooltip.maxWidth || 280,
          zIndex: 10000
        }}
        role="tooltip"
        aria-live="polite"
        aria-describedby={`tooltip-content-${tooltip.id}`}
      >
        {/* Arrow */}
        {tooltip.arrow !== false && (
          <div className={`contextual-tooltip__arrow contextual-tooltip__arrow--${actualPosition}`} />
        )}

        {/* Content */}
        <div className="contextual-tooltip__content" id={`tooltip-content-${tooltip.id}`}>
          {/* Header with emoji and title */}
          {(tooltip.emoji || tooltip.title) && (
            <div className="contextual-tooltip__header">
              {tooltip.emoji && (
                <span className="contextual-tooltip__emoji" aria-hidden="true">
                  {tooltip.emoji}
                </span>
              )}
              {tooltip.title && (
                <h3 className="contextual-tooltip__title">{tooltip.title}</h3>
              )}
            </div>
          )}

          {/* Main text */}
          <p className="contextual-tooltip__text">{tooltip.text}</p>

          {/* Learn more link */}
          {tooltip.learnMore && (
            <a
              href={tooltip.learnMore.url}
              className="contextual-tooltip__learn-more"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onAction?.(tooltip.id, 'learn_more_clicked')}
            >
              {tooltip.learnMore.text} →
            </a>
          )}

          {/* Actions */}
          <div className="contextual-tooltip__actions">
            {tooltip.action && (
              <button
                className={`contextual-tooltip__action-btn contextual-tooltip__action-btn--${tooltip.action.style || 'primary'}`}
                onClick={handleAction}
                type="button"
              >
                {tooltip.action.label}
              </button>
            )}

            {tooltip.dismissible !== false && (
              <button
                className="contextual-tooltip__dismiss-btn"
                onClick={() => handleDismiss('manual')}
                aria-label="Dismiss tooltip"
                type="button"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ContextualTooltip;
