/**
 * HelpView Component - 2025 Popup Help Integration
 *
 * Features:
 * - Complete help system integration within popup
 * - Context-aware help based on user location and state
 * - Gen Z optimized interface with quick access patterns
 * - Seamless navigation between help sections
 * - Performance optimized for popup constraints
 */

import React, { useState, useEffect, useCallback } from 'react';
import { HelpHub } from '@shared/components';
import { Header } from '../Header';
import { Footer } from '../Footer';
import { PopupView } from '../Layout/PopupRouter';

interface HelpViewProps {
  onNavigate: (view: PopupView) => void;
}

interface HelpContext {
  currentPage: string;
  userType: 'new' | 'intermediate' | 'advanced';
  deviceType: 'mobile' | 'tablet' | 'desktop';
  sessionTime: number;
  lastActivity: Date;
  helpInteractions: number;
  preferredHelpType: 'video' | 'text' | 'interactive';
  completedTours: string[];
  frustrationLevel: number;
}

export const HelpView: React.FC<HelpViewProps> = ({ onNavigate }) => {
  const [helpContext, setHelpContext] = useState<HelpContext>({
    currentPage: 'help',
    userType: 'intermediate',
    deviceType: 'desktop',
    sessionTime: 0,
    lastActivity: new Date(),
    helpInteractions: 0,
    preferredHelpType: 'interactive',
    completedTours: [],
    frustrationLevel: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize help context on mount
  useEffect(() => {
    const initializeContext = async () => {
      try {
        setIsLoading(true);

        // Detect device type
        const deviceType = window.innerWidth < 768 ? 'mobile' :
                          window.innerWidth < 1024 ? 'tablet' : 'desktop';

        // Get stored user preferences
        const storedContext = await chrome.storage.local.get([
          'userType',
          'preferredHelpType',
          'completedTours',
          'helpInteractions'
        ]);

        // Get session data
        const sessionData = await chrome.storage.session.get([
          'sessionStartTime',
          'lastActivity'
        ]);

        const sessionTime = sessionData.sessionStartTime ?
          Date.now() - sessionData.sessionStartTime : 0;

        setHelpContext(prev => ({
          ...prev,
          deviceType,
          userType: storedContext.userType || 'intermediate',
          preferredHelpType: storedContext.preferredHelpType || 'interactive',
          completedTours: storedContext.completedTours || [],
          helpInteractions: storedContext.helpInteractions || 0,
          sessionTime,
          lastActivity: sessionData.lastActivity ? new Date(sessionData.lastActivity) : new Date()
        }));

        setError(null);
      } catch (err) {
        console.error('Failed to initialize help context:', err);
        setError('Failed to load help system. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    initializeContext();
  }, []);

  // Handle context updates from HelpHub
  const handleContextUpdate = useCallback(async (updates: Partial<HelpContext>) => {
    try {
      setHelpContext(prev => ({ ...prev, ...updates }));

      // Persist user preferences
      await chrome.storage.local.set({
        userType: updates.userType,
        preferredHelpType: updates.preferredHelpType,
        completedTours: updates.completedTours,
        helpInteractions: updates.helpInteractions
      });

      // Update session data
      await chrome.storage.session.set({
        lastActivity: Date.now()
      });

    } catch (err) {
      console.error('Failed to update help context:', err);
    }
  }, []);

  // Handle navigation back to main views
  const handleBackNavigation = useCallback(() => {
    onNavigate('main');
  }, [onNavigate]);

  // Handle help system close
  const handleHelpClose = useCallback(() => {
    onNavigate('main');
  }, [onNavigate]);

  // Analytics tracking
  useEffect(() => {
    // Track help view opened
    if (typeof gtag !== 'undefined') {
      gtag('event', 'help_view_opened', {
        event_category: 'help_system',
        event_label: 'popup_help_view',
        value: helpContext.helpInteractions + 1
      });
    }

    console.log('🆘 Help view opened', {
      context: helpContext,
      timestamp: Date.now()
    });

    // Cleanup function to track view duration
    return () => {
      if (typeof gtag !== 'undefined') {
        gtag('event', 'help_view_closed', {
          event_category: 'help_system',
          event_label: 'popup_help_view'
        });
      }
    };
  }, [helpContext.helpInteractions]);

  if (isLoading) {
    return (
      <div className="help-view help-view--loading">
        <Header
          title="Help & Support"
          onBack={handleBackNavigation}
          showSettings={false}
        />
        <div className="help-view__content help-view__loading">
          <div className="help-view__spinner">
            <div className="spinner"></div>
          </div>
          <p className="help-view__loading-text">Loading help system...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="help-view help-view--error">
        <Header
          title="Help & Support"
          onBack={handleBackNavigation}
          showSettings={false}
        />
        <div className="help-view__content help-view__error">
          <div className="help-view__error-icon">⚠️</div>
          <h3 className="help-view__error-title">Unable to Load Help</h3>
          <p className="help-view__error-message">{error}</p>
          <button
            className="help-view__retry-btn"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="help-view">
      <Header
        title="Help & Support"
        onBack={handleBackNavigation}
        showSettings={false}
      />

      <div className="help-view__content">
        <HelpHub
          isOpen={true}
          onClose={handleHelpClose}
          context={{
            // UserContext
            location: helpContext.currentPage,
            action: 'viewing_help',
            userType: helpContext.userType,
            sessionTime: helpContext.sessionTime,
            lastActivity: helpContext.lastActivity,
            completedTours: helpContext.completedTours,
            frustrationLevel: helpContext.frustrationLevel,
            preferredHelpType: helpContext.preferredHelpType,
            // EnvironmentContext
            deviceType: helpContext.deviceType,
            connectionSpeed: 'fast' as const,
            timeOfDay: 'afternoon' as const,
            isFirstVisit: false,
            accessibilityNeeds: [],
            // SystemContext
            currentPage: helpContext.currentPage,
            loadTime: 0,
            errors: [],
            featureUsage: {},
            helpInteractions: helpContext.helpInteractions
          }}
          onContextUpdate={handleContextUpdate}
          embedded={true}
          showCloseButton={false}
        />
      </div>

      <Footer />

      <style>{`
        /* HelpView Styles - 2025 Design Standards */
        .help-view {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #ffffff;
          overflow: hidden;
        }

        .help-view__content {
          flex: 1;
          overflow: hidden;
          position: relative;
        }

        /* Loading State */
        .help-view__loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          text-align: center;
        }

        .help-view__spinner {
          margin-bottom: 16px;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #f3f4f6;
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .help-view__loading-text {
          color: #6b7280;
          font-size: 14px;
          margin: 0;
        }

        /* Error State */
        .help-view__error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          text-align: center;
        }

        .help-view__error-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .help-view__error-title {
          color: #374151;
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 12px 0;
        }

        .help-view__error-message {
          color: #6b7280;
          font-size: 14px;
          margin: 0 0 24px 0;
          line-height: 1.5;
        }

        .help-view__retry-btn {
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .help-view__retry-btn:hover {
          background: #2563eb;
          transform: translateY(-1px);
        }

        .help-view__retry-btn:active {
          transform: translateY(0);
        }

        /* Dark Theme Support */
        @media (prefers-color-scheme: dark) {
          .help-view {
            background: #1f2937;
          }

          .help-view__loading-text {
            color: #9ca3af;
          }

          .help-view__error-title {
            color: #f9fafb;
          }

          .help-view__error-message {
            color: #d1d5db;
          }

          .spinner {
            border-color: #374151;
            border-top-color: #60a5fa;
          }
        }

        /* Mobile Responsive */
        @media (max-width: 480px) {
          .help-view__loading,
          .help-view__error {
            padding: 20px 16px;
          }

          .help-view__error-icon {
            font-size: 40px;
          }

          .help-view__error-title {
            font-size: 16px;
          }
        }

        /* Reduced Motion */
        @media (prefers-reduced-motion: reduce) {
          .spinner {
            animation: none;
          }

          .help-view__retry-btn {
            transition: none;
          }

          .help-view__retry-btn:hover {
            transform: none;
          }
        }

        /* High Contrast Mode */
        @media (prefers-contrast: high) {
          .help-view__retry-btn {
            border: 2px solid #000000;
          }

          .help-view__loading-text,
          .help-view__error-message {
            color: #000000;
          }
        }
      `}</style>
    </div>
  );
};

export default HelpView;
