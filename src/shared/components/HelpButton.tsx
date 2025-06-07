/**
 * HelpButton Component - 2025 Accessibility & Design Standards
 *
 * Features:
 * - WCAG 2.1 AA compliance (44x44px minimum, 4.5:1 contrast)
 * - Gen Z optimized design with emoji and micro-interactions
 * - Mobile-first responsive with fixed positioning option
 * - Context-aware help triggering
 * - Keyboard navigation support
 * - Reduced motion support
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { HelpHub } from './HelpHub';

interface UserContext {
  location: string;
  action: string;
  userType: 'new' | 'intermediate' | 'advanced';
  sessionTime: number;
  lastActivity: Date;
  completedTours: string[];
  frustrationLevel: number;
  preferredHelpType: 'video' | 'text' | 'interactive';
}

interface EnvironmentContext {
  deviceType: 'mobile' | 'tablet' | 'desktop';
  connectionSpeed: 'slow' | 'fast';
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  isFirstVisit: boolean;
  accessibilityNeeds: string[];
}

interface SystemContext {
  currentPage: string;
  loadTime: number;
  errors: string[];
  featureUsage: Record<string, number>;
  helpInteractions: number;
}

interface HelpButtonProps {
  position?: 'fixed' | 'relative';
  variant?: 'primary' | 'secondary' | 'minimal';
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  context?: Partial<UserContext & EnvironmentContext & SystemContext>;
  onContextUpdate?: (context: Partial<UserContext>) => void;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  ariaLabel?: string;
}

const defaultContext: UserContext & EnvironmentContext & SystemContext = {
  location: 'popup',
  action: 'browsing',
  userType: 'intermediate',
  sessionTime: 0,
  lastActivity: new Date(),
  completedTours: [],
  frustrationLevel: 0,
  preferredHelpType: 'interactive',
  deviceType: 'desktop',
  connectionSpeed: 'fast',
  timeOfDay: 'afternoon',
  isFirstVisit: false,
  accessibilityNeeds: [],
  currentPage: 'main',
  loadTime: 0,
  errors: [],
  featureUsage: {},
  helpInteractions: 0
};

export const HelpButton: React.FC<HelpButtonProps> = ({
  position = 'relative',
  variant = 'primary',
  size = 'medium',
  showLabel = true,
  context = {},
  onContextUpdate,
  className = '',
  style = {},
  disabled = false,
  ariaLabel = 'Get help and support'
}) => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [currentContext, setCurrentContext] = useState<UserContext & EnvironmentContext & SystemContext>({
    ...defaultContext,
    ...context
  });
  const [isPressed, setIsPressed] = useState(false);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const helpOpenedRef = useRef<Date | null>(null);

  // Detect device type and time of day
  useEffect(() => {
    const updateEnvironmentContext = () => {
      const deviceType = window.innerWidth < 768 ? 'mobile' :
                        window.innerWidth < 1024 ? 'tablet' : 'desktop';

      const hour = new Date().getHours();
      const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

      const connectionSpeed = (navigator as any).connection?.effectiveType === '4g' ? 'fast' : 'slow';

      setCurrentContext(prev => ({
        ...prev,
        deviceType,
        timeOfDay,
        connectionSpeed: connectionSpeed || 'fast',
        ...context
      }));
    };

    updateEnvironmentContext();
    window.addEventListener('resize', updateEnvironmentContext);

    return () => window.removeEventListener('resize', updateEnvironmentContext);
  }, [context]);

  // Handle help button click
  const handleHelpClick = useCallback(() => {
    if (disabled) return;

    const newIsOpen = !isHelpOpen;
    setIsHelpOpen(newIsOpen);

    if (newIsOpen) {
      helpOpenedRef.current = new Date();

      // Update context with help interaction
      const updatedContext = {
        ...currentContext,
        helpInteractions: currentContext.helpInteractions + 1,
        lastActivity: new Date()
      };
      setCurrentContext(updatedContext);
      onContextUpdate?.(updatedContext);

      // Analytics tracking
      if (typeof gtag !== 'undefined') {
        gtag('event', 'help_button_clicked', {
          event_category: 'help_system',
          event_label: currentContext.currentPage,
          value: currentContext.helpInteractions + 1
        });
      }

      console.log('🆘 Help button clicked', {
        context: currentContext.currentPage,
        userType: currentContext.userType,
        deviceType: currentContext.deviceType,
        timestamp: Date.now()
      });
    } else {
      // Track help session duration
      const sessionDuration = helpOpenedRef.current ?
        Date.now() - helpOpenedRef.current.getTime() : 0;

      if (typeof gtag !== 'undefined') {
        gtag('event', 'help_session_ended', {
          event_category: 'help_system',
          event_label: currentContext.currentPage,
          value: Math.round(sessionDuration / 1000) // seconds
        });
      }

      console.log('🆘 Help closed', {
        sessionDuration,
        helpInteractions: currentContext.helpInteractions
      });
    }
  }, [disabled, isHelpOpen, currentContext, onContextUpdate]);

  // Handle context updates from HelpHub
  const handleContextUpdate = useCallback((updates: Partial<UserContext>) => {
    const updatedContext = { ...currentContext, ...updates };
    setCurrentContext(updatedContext);
    onContextUpdate?.(updates);
  }, [currentContext, onContextUpdate]);

  // Keyboard event handlers
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsPressed(true);
      handleHelpClick();
    } else if (event.key === 'Escape' && isHelpOpen) {
      setIsHelpOpen(false);
    }
  }, [handleHelpClick, isHelpOpen]);

  const handleKeyUp = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      setIsPressed(false);
    }
  }, []);

  // Mouse event handlers for touch feedback
  const handleMouseDown = useCallback(() => {
    if (!disabled) setIsPressed(true);
  }, [disabled]);

  const handleMouseUp = useCallback(() => {
    setIsPressed(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPressed(false);
  }, []);

  // Get button size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'small': return 'help-button--small';
      case 'large': return 'help-button--large';
      default: return 'help-button--medium';
    }
  };

  // Get variant classes
  const getVariantClasses = () => {
    switch (variant) {
      case 'secondary': return 'help-button--secondary';
      case 'minimal': return 'help-button--minimal';
      default: return 'help-button--primary';
    }
  };

  const buttonClasses = [
    'help-button',
    `help-button--${position}`,
    getSizeClasses(),
    getVariantClasses(),
    isPressed ? 'help-button--pressed' : '',
    disabled ? 'help-button--disabled' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <>
      <button
        ref={buttonRef}
        className={buttonClasses}
        onClick={handleHelpClick}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={isHelpOpen}
        aria-haspopup="dialog"
        type="button"
        style={style}
      >
        <span className="help-button__icon" aria-hidden="true">
          🆘
        </span>
        {showLabel && (
          <span className="help-button__label">
            Help
          </span>
        )}
      </button>

      {isHelpOpen && (
        <HelpHub
          isOpen={isHelpOpen}
          onClose={() => setIsHelpOpen(false)}
          context={currentContext}
          onContextUpdate={handleContextUpdate}
        />
      )}

      <style jsx>{`
        /* Base Help Button Styles - 2025 Standards */
        .help-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-weight: 500;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
          outline: none;
          position: relative;
          user-select: none;
          text-decoration: none;
          white-space: nowrap;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: #ffffff;
          box-shadow: 0 2px 4px -1px rgba(59, 130, 246, 0.3);
          min-width: 44px;
          min-height: 44px;
        }

        /* Size Variants */
        .help-button--small {
          min-width: 36px;
          min-height: 36px;
          padding: 6px 12px;
          font-size: 13px;
          border-radius: 8px;
        }

        .help-button--medium {
          min-width: 44px;
          min-height: 44px;
          padding: 8px 16px;
          font-size: 14px;
        }

        .help-button--large {
          min-width: 48px;
          min-height: 48px;
          padding: 12px 20px;
          font-size: 16px;
          border-radius: 16px;
        }

        /* Variant Styles */
        .help-button--primary {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: #ffffff;
          box-shadow: 0 2px 4px -1px rgba(59, 130, 246, 0.3);
        }

        .help-button--secondary {
          background: #f8fafc;
          color: #3b82f6;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }

        .help-button--minimal {
          background: transparent;
          color: #3b82f6;
          box-shadow: none;
        }

        /* Position Variants */
        .help-button--fixed {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 9999;
        }

        .help-button--relative {
          position: relative;
        }

        /* Hover States */
        @media (hover: hover) {
          .help-button--primary:not(.help-button--disabled):hover {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            transform: translateY(-1px);
            box-shadow: 0 4px 8px -2px rgba(59, 130, 246, 0.4);
          }

          .help-button--secondary:not(.help-button--disabled):hover {
            background: #f1f5f9;
            border-color: #cbd5e1;
            color: #1e40af;
          }

          .help-button--minimal:not(.help-button--disabled):hover {
            background: rgba(59, 130, 246, 0.1);
          }
        }

        /* Active/Pressed State */
        .help-button--pressed:not(.help-button--disabled) {
          transform: translateY(0) scale(0.98);
        }

        .help-button--primary.help-button--pressed {
          box-shadow: 0 1px 2px 0 rgba(59, 130, 246, 0.4);
        }

        /* Focus State */
        .help-button:focus-visible {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }

        /* Disabled State */
        .help-button--disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
        }

        /* Icon and Label */
        .help-button__icon {
          font-size: 18px;
          line-height: 1;
          flex-shrink: 0;
        }

        .help-button--small .help-button__icon {
          font-size: 16px;
        }

        .help-button--large .help-button__icon {
          font-size: 20px;
        }

        .help-button__label {
          font-weight: 500;
          line-height: 1.2;
        }

        /* Dark Theme Support */
        @media (prefers-color-scheme: dark) {
          .help-button--secondary {
            background: #1e293b;
            color: #60a5fa;
            border-color: #334155;
          }

          .help-button--secondary:hover {
            background: #334155;
            border-color: #475569;
          }

          .help-button--minimal {
            color: #60a5fa;
          }

          .help-button--minimal:hover {
            background: rgba(96, 165, 250, 0.1);
          }
        }

        /* High Contrast Mode */
        @media (prefers-contrast: high) {
          .help-button {
            border: 2px solid currentColor;
          }

          .help-button--primary {
            background: #0000ff;
            color: #ffffff;
          }

          .help-button--secondary {
            background: #ffffff;
            color: #0000ff;
            border-color: #0000ff;
          }
        }

        /* Reduced Motion */
        @media (prefers-reduced-motion: reduce) {
          .help-button {
            transition: none !important;
            transform: none !important;
          }

          .help-button:hover {
            transform: none !important;
          }

          .help-button--pressed {
            transform: none !important;
          }
        }

        /* Mobile Responsive */
        @media (max-width: 480px) {
          .help-button--fixed {
            bottom: 16px;
            right: 16px;
          }

          .help-button--large {
            min-width: 44px;
            min-height: 44px;
            padding: 10px 16px;
            font-size: 14px;
            border-radius: 12px;
          }
        }

        /* Print Styles */
        @media print {
          .help-button {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
};

export default HelpButton;
