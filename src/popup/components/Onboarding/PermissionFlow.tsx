/**
 * PermissionFlow Component - 2025 Privacy-First Permission Requests
 *
 * Features:
 * - Context-aware permission explanations
 * - Privacy-first disclosure with clear explanations
 * - Emoji-enhanced UI for Gen Z engagement
 * - Progressive disclosure of permission details
 * - Optional permissions with granular control
 */

import React, { useState, useEffect } from 'react';
import { PopupView } from '../Layout/PopupRouter';

interface PermissionFlowProps {
  onNavigate: (view: PopupView | 'onboarding-setup') => void;
  onComplete: () => void;
  onBack: () => void;
}

interface PermissionItem {
  id: string;
  name: string;
  emoji: string;
  required: boolean;
  granted: boolean;
  description: string;
  usage: string;
  privacy: string;
  learnMoreDetails: string;
}

export const PermissionFlow: React.FC<PermissionFlowProps> = ({
  onNavigate,
  onComplete: _onComplete,
  onBack
}) => {
  // @ts-ignore - onComplete parameter reserved for future use
  _onComplete;

  const [permissions, setPermissions] = useState<PermissionItem[]>([
    {
      id: 'activeTab',
      name: 'Current Page Access',
      emoji: '🌐',
      required: true,
      granted: false,
      description: 'Read content from the current webpage',
      usage: 'Analyze news articles and social media posts for credibility',
      privacy: 'Only current page content, never browsing history',
      learnMoreDetails: 'TruthLens analyzes the text and images on your current webpage to provide credibility scores. We never track your browsing history or store personal data. All analysis happens locally on your device when possible.'
    },
    {
      id: 'storage',
      name: 'Settings Storage',
      emoji: '💾',
      required: true,
      granted: false,
      description: 'Save your preferences and settings',
      usage: 'Remember your customization and privacy choices',
      privacy: 'Only app settings, no personal data',
      learnMoreDetails: 'Your preferences like display settings, notification choices, and privacy controls are stored locally in your browser. This data stays on your device and is never shared with external services.'
    },
    {
      id: 'notifications',
      name: 'Smart Notifications',
      emoji: '🔔',
      required: false,
      granted: false,
      description: 'Alert you about low-credibility content',
      usage: 'Optional alerts when questionable content is detected',
      privacy: 'Only notification preferences, no content tracking',
      learnMoreDetails: 'Receive optional notifications when TruthLens detects potentially misleading content. You control when and how often you receive these alerts. No personal information is included in notifications.'
    }
  ]);

  const [expandedPermission, setExpandedPermission] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPrivacyDetails, setShowPrivacyDetails] = useState(false);

  useEffect(() => {
    // Check current permission status
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    try {
      const hasActiveTab = await chrome.permissions.contains({ permissions: ['activeTab'] });
      const hasStorage = await chrome.permissions.contains({ permissions: ['storage'] });
      const hasNotifications = await chrome.permissions.contains({ permissions: ['notifications'] });

      setPermissions(prev => prev.map(perm => ({
        ...perm,
        granted:
          (perm.id === 'activeTab' && hasActiveTab) ||
          (perm.id === 'storage' && hasStorage) ||
          (perm.id === 'notifications' && hasNotifications) ||
          perm.granted
      })));
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const handlePermissionRequest = async (permissionId: string) => {
    setIsProcessing(true);

    try {
      let granted = false;

      switch (permissionId) {
        case 'activeTab':
          granted = await chrome.permissions.request({ permissions: ['activeTab'] });
          break;
        case 'storage':
          granted = await chrome.permissions.request({ permissions: ['storage'] });
          break;
        case 'notifications':
          granted = await chrome.permissions.request({ permissions: ['notifications'] });
          break;
      }

      setPermissions(prev => prev.map(perm =>
        perm.id === permissionId ? { ...perm, granted } : perm
      ));

      // Track permission grant for analytics
      if (granted) {
        console.log(`✅ Permission granted: ${permissionId}`);
      }
    } catch (error) {
      console.error(`Error requesting permission ${permissionId}:`, error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContinue = () => {
    const requiredPermissions = permissions.filter(p => p.required);
    const allRequiredGranted = requiredPermissions.every(p => p.granted);

    if (allRequiredGranted) {
      onNavigate('onboarding-setup');
    } else {
      // Show which required permissions are missing
      alert('Please grant required permissions to continue.');
    }
  };

  const toggleExpanded = (permissionId: string) => {
    setExpandedPermission(expandedPermission === permissionId ? null : permissionId);
  };

  const requiredPermissions = permissions.filter(p => p.required);
  const optionalPermissions = permissions.filter(p => !p.required);
  const allRequiredGranted = requiredPermissions.every(p => p.granted);

  return (
    <div className="permission-flow">
      {/* Header */}
      <div className="permission-header">
        <button
          className="back-button"
          onClick={onBack}
          aria-label="Go back to welcome screen"
        >
          ← Back
        </button>
        <h2 className="permission-title">
          <span className="title-emoji">🔐</span>
          Privacy & Permissions
        </h2>
      </div>

      {/* Privacy Promise */}
      <div className="privacy-promise">
        <div className="promise-content">
          <span className="promise-emoji">🛡️</span>
          <div className="promise-text">
            <h3>Your Privacy Comes First</h3>
            <p>We process content locally when possible and never sell your data.</p>
          </div>
        </div>
        <button
          className="learn-more-btn"
          onClick={() => setShowPrivacyDetails(!showPrivacyDetails)}
          aria-expanded={showPrivacyDetails}
        >
          {showPrivacyDetails ? 'Less' : 'Learn More'}
        </button>
      </div>

      {showPrivacyDetails && (
        <div className="privacy-details">
          <div className="detail-item">
            <span className="detail-emoji">🏠</span>
            <span className="detail-text">Processing happens on your device</span>
          </div>
          <div className="detail-item">
            <span className="detail-emoji">🚫</span>
            <span className="detail-text">No data selling or sharing</span>
          </div>
          <div className="detail-item">
            <span className="detail-emoji">🗑️</span>
            <span className="detail-text">Delete your data anytime</span>
          </div>
        </div>
      )}

      {/* Required Permissions */}
      <div className="permission-section">
        <h3 className="section-title">
          <span className="section-emoji">⚡</span>
          Required for Core Features
        </h3>

        {requiredPermissions.map(permission => (
          <div key={permission.id} className="permission-card required">
            <div className="permission-main" onClick={() => toggleExpanded(permission.id)}>
              <div className="permission-info">
                <span className="permission-emoji">{permission.emoji}</span>
                <div className="permission-text">
                  <h4 className="permission-name">{permission.name}</h4>
                  <p className="permission-description">{permission.description}</p>
                </div>
              </div>

              <div className="permission-controls">
                {permission.granted ? (
                  <div className="permission-status granted">
                    <span className="status-emoji">✅</span>
                    <span className="status-text">Granted</span>
                  </div>
                ) : (
                  <button
                    className="grant-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePermissionRequest(permission.id);
                    }}
                    disabled={isProcessing}
                    aria-label={`Grant ${permission.name} permission`}
                  >
                    {isProcessing ? '⏳' : 'Grant'}
                  </button>
                )}
              </div>
            </div>

            {expandedPermission === permission.id && (
              <div className="permission-expanded">
                <div className="expanded-item">
                  <strong>How we use it:</strong> {permission.usage}
                </div>
                <div className="expanded-item">
                  <strong>Privacy protection:</strong> {permission.privacy}
                </div>
                <div className="expanded-details">
                  {permission.learnMoreDetails}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Optional Permissions */}
      <div className="permission-section">
        <h3 className="section-title">
          <span className="section-emoji">🎯</span>
          Optional Enhancements
        </h3>

        {optionalPermissions.map(permission => (
          <div key={permission.id} className="permission-card optional">
            <div className="permission-main" onClick={() => toggleExpanded(permission.id)}>
              <div className="permission-info">
                <span className="permission-emoji">{permission.emoji}</span>
                <div className="permission-text">
                  <h4 className="permission-name">{permission.name}</h4>
                  <p className="permission-description">{permission.description}</p>
                </div>
              </div>

              <div className="permission-controls">
                {permission.granted ? (
                  <div className="permission-status granted">
                    <span className="status-emoji">✅</span>
                    <span className="status-text">Enabled</span>
                  </div>
                ) : (
                  <button
                    className="grant-button optional"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePermissionRequest(permission.id);
                    }}
                    disabled={isProcessing}
                    aria-label={`Enable ${permission.name} feature`}
                  >
                    {isProcessing ? '⏳' : 'Enable'}
                  </button>
                )}
              </div>
            </div>

            {expandedPermission === permission.id && (
              <div className="permission-expanded">
                <div className="expanded-item">
                  <strong>How we use it:</strong> {permission.usage}
                </div>
                <div className="expanded-item">
                  <strong>Privacy protection:</strong> {permission.privacy}
                </div>
                <div className="expanded-details">
                  {permission.learnMoreDetails}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Continue Button */}
      <div className="permission-actions">
        <button
          className={`continue-button ${allRequiredGranted ? 'enabled' : 'disabled'}`}
          onClick={handleContinue}
          disabled={!allRequiredGranted}
          aria-label="Continue to setup wizard"
        >
          <span className="button-text">
            {allRequiredGranted ? 'Continue Setup' : 'Grant Required Permissions'}
          </span>
          <span className="button-emoji">→</span>
        </button>

        <p className="permission-note">
          {allRequiredGranted
            ? '🎉 Ready to set up your preferences!'
            : '⚠️ Required permissions needed to continue'
          }
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="onboarding-progress">
        <div className="progress-dots">
          <div className="dot completed" aria-label="Welcome step, completed"></div>
          <div className="dot active" aria-label="Permissions step, currently active"></div>
          <div className="dot" aria-label="Setup step"></div>
        </div>
        <p className="progress-text">Step 2 of 3</p>
      </div>

      <style>{`
        /* PermissionFlow Styles - 2025 Privacy-First Design */
        .permission-flow {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--popup-bg, #ffffff);
          color: var(--text-primary, #1f2937);
          overflow-y: auto;
        }

        /* Header */
        .permission-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-color, #e5e7eb);
          background: var(--header-bg, #f9fafb);
        }

        .back-button {
          background: none;
          border: none;
          font-size: 16px;
          font-weight: 500;
          color: var(--primary-500, #3b82f6);
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
          transition: background 200ms ease-out;
        }

        .back-button:hover {
          background: var(--primary-50, #eff6ff);
        }

        .permission-title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: var(--text-primary, #1f2937);
        }

        .title-emoji {
          font-size: 24px;
        }

        /* Privacy Promise */
        .privacy-promise {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border-radius: 12px;
          margin: 20px;
          border: 1px solid #bae6fd;
        }

        .promise-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .promise-emoji {
          font-size: 24px;
        }

        .promise-text h3 {
          margin: 0 0 4px 0;
          font-size: 16px;
          font-weight: 600;
          color: #0c4a6e;
        }

        .promise-text p {
          margin: 0;
          font-size: 14px;
          color: #0369a1;
        }

        .learn-more-btn {
          background: transparent;
          border: 1px solid #0284c7;
          color: #0284c7;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 200ms ease-out;
        }

        .learn-more-btn:hover {
          background: #0284c7;
          color: white;
        }

        /* Privacy Details */
        .privacy-details {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin: 0 20px 20px 20px;
          padding: 16px;
          background: rgba(240, 249, 255, 0.5);
          border-radius: 8px;
          border-left: 4px solid #0284c7;
        }

        .detail-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .detail-emoji {
          font-size: 16px;
        }

        .detail-text {
          color: #0369a1;
        }

        /* Permission Sections */
        .permission-section {
          margin: 0 20px 24px 20px;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 0 16px 0;
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary, #1f2937);
        }

        .section-emoji {
          font-size: 18px;
        }

        /* Permission Cards */
        .permission-card {
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 12px;
          margin-bottom: 12px;
          background: white;
          transition: all 200ms ease-out;
          overflow: hidden;
        }

        .permission-card.required {
          border-left: 4px solid #ef4444;
        }

        .permission-card.optional {
          border-left: 4px solid #10b981;
        }

        .permission-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transform: translateY(-1px);
        }

        .permission-main {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          cursor: pointer;
        }

        .permission-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .permission-emoji {
          font-size: 24px;
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
        }

        .permission-text {
          flex: 1;
        }

        .permission-name {
          margin: 0 0 4px 0;
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary, #1f2937);
        }

        .permission-description {
          margin: 0;
          font-size: 14px;
          color: var(--text-secondary, #6b7280);
        }

        .permission-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .permission-status {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
        }

        .permission-status.granted {
          background: #dcfce7;
          color: #166534;
        }

        .grant-button {
          background: var(--primary-500, #3b82f6);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 200ms ease-out;
          min-width: 60px;
          min-height: 36px;
        }

        .grant-button:hover:not(:disabled) {
          background: var(--primary-600, #2563eb);
          transform: translateY(-1px);
        }

        .grant-button.optional {
          background: #10b981;
        }

        .grant-button.optional:hover:not(:disabled) {
          background: #059669;
        }

        .grant-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        /* Expanded Details */
        .permission-expanded {
          padding: 16px 20px 20px 20px;
          background: var(--bg-secondary, #f9fafb);
          border-top: 1px solid var(--border-color, #e5e7eb);
          font-size: 14px;
          line-height: 1.5;
        }

        .expanded-item {
          margin-bottom: 12px;
          color: var(--text-primary, #1f2937);
        }

        .expanded-details {
          margin-top: 16px;
          padding: 12px;
          background: rgba(59, 130, 246, 0.05);
          border-radius: 8px;
          color: var(--text-secondary, #6b7280);
          border-left: 3px solid var(--primary-500, #3b82f6);
        }

        /* Actions */
        .permission-actions {
          margin: 24px 20px;
          text-align: center;
        }

        .continue-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 16px 24px;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 200ms ease-out;
          margin-bottom: 12px;
          min-height: 52px;
        }

        .continue-button.enabled {
          background: var(--primary-500, #3b82f6);
          color: white;
        }

        .continue-button.enabled:hover {
          background: var(--primary-600, #2563eb);
          transform: translateY(-1px);
        }

        .continue-button.disabled {
          background: var(--bg-secondary, #f3f4f6);
          color: var(--text-secondary, #9ca3af);
          cursor: not-allowed;
        }

        .button-emoji {
          font-size: 18px;
          transition: transform 200ms ease-out;
        }

        .continue-button.enabled:hover .button-emoji {
          transform: translateX(4px);
        }

        .permission-note {
          margin: 0;
          font-size: 12px;
          color: var(--text-secondary, #6b7280);
        }

        /* Progress Indicator */
        .onboarding-progress {
          text-align: center;
          padding: 20px;
          border-top: 1px solid var(--border-color, #e5e7eb);
          background: var(--bg-secondary, #f9fafb);
        }

        .progress-dots {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--border-color, #d1d5db);
          transition: all 200ms ease-out;
        }

        .dot.active {
          background: var(--primary-500, #3b82f6);
          transform: scale(1.2);
        }

        .dot.completed {
          background: #10b981;
          transform: scale(1.1);
        }

        .progress-text {
          font-size: 12px;
          color: var(--text-secondary, #6b7280);
          margin: 0;
        }

        /* Mobile Responsive */
        @media (max-width: 480px) {
          .permission-flow {
            font-size: 14px;
          }

          .permission-header,
          .permission-section,
          .privacy-promise,
          .permission-actions {
            margin-left: 16px;
            margin-right: 16px;
          }

          .permission-main {
            padding: 12px;
          }

          .permission-name {
            font-size: 15px;
          }

          .permission-description {
            font-size: 13px;
          }

          .grant-button {
            padding: 6px 12px;
            font-size: 13px;
          }
        }

        /* Reduced Motion */
        @media (prefers-reduced-motion: reduce) {
          .permission-card,
          .grant-button,
          .continue-button,
          .back-button,
          .learn-more-btn {
            transition: none;
            transform: none;
          }

          .permission-card:hover,
          .grant-button:hover,
          .continue-button:hover {
            transform: none;
          }
        }
      `}</style>
    </div>
  );
};

export default PermissionFlow;
