/**
 * QuickSetupWizard Component - 2025 3-Step Setup Experience
 *
 * Features:
 * - Maximum 3 steps, under 30-second completion
 * - Touch-optimized controls for mobile
 * - Visual toggles and sliders
 * - Privacy settings with clear indicators
 * - Progress tracking with completion percentage
 */

import React, { useState, useEffect } from 'react';
import { PopupView } from '../Layout/PopupRouter';
import { storageService } from '@shared/storage/storageService';
import { UserSettings } from '@shared/types';

interface QuickSetupWizardProps {
  onNavigate: (view: PopupView) => void;
  onComplete: () => void;
  onBack: () => void;
}

interface SetupStep {
  id: string;
  title: string;
  emoji: string;
  description: string;
}

interface SetupSettings {
  theme: 'auto' | 'light' | 'dark';
  factCheckingLevel: 'basic' | 'standard' | 'comprehensive';
  privacy: {
    analyticsEnabled: boolean;
    localProcessingOnly: boolean;
    cacheDuration: number;
  };
  notifications: {
    enabled: boolean;
    lowCredibilityAlert: boolean;
    factCheckComplete: boolean;
  };
}

export const QuickSetupWizard: React.FC<QuickSetupWizardProps> = ({
  onNavigate,
  onComplete,
  onBack
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [settings, setSettings] = useState<SetupSettings>({
    theme: 'auto',
    factCheckingLevel: 'standard',
    privacy: {
      analyticsEnabled: false,
      localProcessingOnly: true,
      cacheDuration: 24,
    },
    notifications: {
      enabled: true,
      lowCredibilityAlert: true,
      factCheckComplete: false,
    },
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [startTime] = useState(Date.now());

  const steps: SetupStep[] = [
    {
      id: 'appearance',
      title: 'Choose Your Look',
      emoji: '🎨',
      description: 'Pick a theme that matches your style',
    },
    {
      id: 'analysis',
      title: 'Analysis Level',
      emoji: '🧠',
      description: 'How thorough should fact-checking be?',
    },
    {
      id: 'privacy',
      title: 'Privacy & Notifications',
      emoji: '🔒',
      description: 'Control your data and alerts',
    },
  ];

  const updateSetting = <K extends keyof SetupSettings>(
    key: K,
    value: SetupSettings[K]
  ) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateNestedSetting = <K extends keyof SetupSettings>(
    parentKey: K,
    childKey: keyof SetupSettings[K],
    value: any
  ) => {
    setSettings(prev => ({
      ...prev,
      [parentKey]: {
        ...prev[parentKey],
        [childKey]: value,
      },
    }));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      onBack();
    }
  };

  const handleComplete = async () => {
    setIsProcessing(true);

    try {
      // Convert setup settings to UserSettings format
      const userSettings: Partial<UserSettings> = {
        theme: settings.theme,
        factCheckingLevel: settings.factCheckingLevel,
        privacy: settings.privacy,
        notifications: settings.notifications,
      };

      // Save settings
      await storageService.updateSettings(userSettings);

      // Track onboarding completion
      const completionTime = Date.now() - startTime;
      console.log(`🎉 Onboarding completed in ${completionTime}ms`);

      // Mark onboarding as complete
      await storageService.set('onboarding_completed', true);
      await storageService.set('onboarding_completion_time', completionTime);

      onComplete();
    } catch (error) {
      console.error('Error saving setup settings:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderStepContent = () => {
    const step = steps[currentStep];

    switch (step.id) {
      case 'appearance':
        return (
          <div className="step-content">
            <div className="setting-group">
              <label className="setting-label">
                <span className="label-text">Theme Preference</span>
                <span className="label-emoji">🌈</span>
              </label>
              <div className="theme-options">
                {[
                  { value: 'auto', label: 'Auto', emoji: '🌅', desc: 'Follows system' },
                  { value: 'light', label: 'Light', emoji: '☀️', desc: 'Always bright' },
                  { value: 'dark', label: 'Dark', emoji: '🌙', desc: 'Always dark' },
                ].map(theme => (
                  <button
                    key={theme.value}
                    className={`theme-option ${settings.theme === theme.value ? 'selected' : ''}`}
                    onClick={() => updateSetting('theme', theme.value as any)}
                    aria-label={`Select ${theme.label} theme`}
                  >
                    <span className="theme-emoji">{theme.emoji}</span>
                    <span className="theme-label">{theme.label}</span>
                    <span className="theme-desc">{theme.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'analysis':
        return (
          <div className="step-content">
            <div className="setting-group">
              <label className="setting-label">
                <span className="label-text">Fact-Checking Level</span>
                <span className="label-emoji">🔍</span>
              </label>
              <div className="analysis-options">
                {[
                  {
                    value: 'basic',
                    label: 'Quick Check',
                    emoji: '⚡',
                    desc: 'Fast basic verification',
                    features: ['Basic source check', 'Simple credibility score']
                  },
                  {
                    value: 'standard',
                    label: 'Balanced',
                    emoji: '⚖️',
                    desc: 'Thorough yet efficient',
                    features: ['Multiple source verification', 'Context analysis', 'Bias detection']
                  },
                  {
                    value: 'comprehensive',
                    label: 'Deep Dive',
                    emoji: '🧠',
                    desc: 'Maximum accuracy',
                    features: ['Comprehensive fact-check', 'Historical context', 'Expert validation']
                  },
                ].map(level => (
                  <button
                    key={level.value}
                    className={`analysis-option ${settings.factCheckingLevel === level.value ? 'selected' : ''}`}
                    onClick={() => updateSetting('factCheckingLevel', level.value as any)}
                    aria-label={`Select ${level.label} analysis level`}
                  >
                    <div className="option-header">
                      <span className="option-emoji">{level.emoji}</span>
                      <div className="option-text">
                        <span className="option-label">{level.label}</span>
                        <span className="option-desc">{level.desc}</span>
                      </div>
                    </div>
                    <ul className="option-features">
                      {level.features.map((feature, index) => (
                        <li key={index}>{feature}</li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'privacy':
        return (
          <div className="step-content">
            <div className="setting-group">
              <label className="setting-label">
                <span className="label-text">Privacy Controls</span>
                <span className="label-emoji">🛡️</span>
              </label>

              <div className="privacy-toggle">
                <div className="toggle-item">
                  <div className="toggle-info">
                    <span className="toggle-emoji">🏠</span>
                    <div className="toggle-text">
                      <span className="toggle-label">Local Processing Only</span>
                      <span className="toggle-desc">Process content on your device</span>
                    </div>
                  </div>
                  <button
                    className={`toggle-switch ${settings.privacy.localProcessingOnly ? 'on' : 'off'}`}
                    onClick={() => updateNestedSetting('privacy', 'localProcessingOnly', !settings.privacy.localProcessingOnly)}
                    aria-label="Toggle local processing"
                  >
                    <div className="toggle-handle"></div>
                  </button>
                </div>

                <div className="toggle-item">
                  <div className="toggle-info">
                    <span className="toggle-emoji">📊</span>
                    <div className="toggle-text">
                      <span className="toggle-label">Anonymous Analytics</span>
                      <span className="toggle-desc">Help improve TruthLens</span>
                    </div>
                  </div>
                  <button
                    className={`toggle-switch ${settings.privacy.analyticsEnabled ? 'on' : 'off'}`}
                    onClick={() => updateNestedSetting('privacy', 'analyticsEnabled', !settings.privacy.analyticsEnabled)}
                    aria-label="Toggle anonymous analytics"
                  >
                    <div className="toggle-handle"></div>
                  </button>
                </div>
              </div>
            </div>

            <div className="setting-group">
              <label className="setting-label">
                <span className="label-text">Smart Notifications</span>
                <span className="label-emoji">🔔</span>
              </label>

              <div className="notification-toggle">
                <div className="toggle-item">
                  <div className="toggle-info">
                    <span className="toggle-emoji">⚠️</span>
                    <div className="toggle-text">
                      <span className="toggle-label">Low Credibility Alerts</span>
                      <span className="toggle-desc">Get warned about questionable content</span>
                    </div>
                  </div>
                  <button
                    className={`toggle-switch ${settings.notifications.lowCredibilityAlert ? 'on' : 'off'}`}
                    onClick={() => updateNestedSetting('notifications', 'lowCredibilityAlert', !settings.notifications.lowCredibilityAlert)}
                    aria-label="Toggle low credibility alerts"
                  >
                    <div className="toggle-handle"></div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="setup-wizard">
      {/* Header */}
      <div className="setup-header">
        <button
          className="back-button"
          onClick={handlePrevious}
          aria-label="Go back to previous step"
        >
          ← Back
        </button>
        <div className="step-info">
          <h2 className="step-title">
            <span className="step-emoji">{steps[currentStep].emoji}</span>
            {steps[currentStep].title}
          </h2>
          <p className="step-description">{steps[currentStep].description}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-container">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <span className="progress-text">{Math.round(progress)}% Complete</span>
      </div>

      {/* Step Content */}
      <div className="wizard-content">
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="wizard-actions">
        <button
          className="next-button"
          onClick={handleNext}
          disabled={isProcessing}
          aria-label={currentStep === steps.length - 1 ? 'Complete setup' : 'Continue to next step'}
        >
          <span className="button-text">
            {isProcessing ? 'Saving...' : currentStep === steps.length - 1 ? 'Complete Setup' : 'Next'}
          </span>
          <span className="button-emoji">
            {isProcessing ? '⏳' : currentStep === steps.length - 1 ? '🎉' : '→'}
          </span>
        </button>

        <p className="completion-time">
          ⏱️ Usually takes under 30 seconds
        </p>
      </div>

      {/* Progress Dots */}
      <div className="onboarding-progress">
        <div className="progress-dots">
          <div className="dot completed" aria-label="Welcome step, completed"></div>
          <div className="dot completed" aria-label="Permissions step, completed"></div>
          <div className="dot active" aria-label="Setup step, currently active"></div>
        </div>
        <p className="progress-text">Step 3 of 3</p>
      </div>

      <style jsx>{`
        /* QuickSetupWizard Styles - 2025 Touch-Optimized Design */
        .setup-wizard {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--popup-bg, #ffffff);
          color: var(--text-primary, #1f2937);
          overflow-y: auto;
        }

        /* Header */
        .setup-header {
          padding: 20px;
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
          margin-bottom: 12px;
        }

        .back-button:hover {
          background: var(--primary-50, #eff6ff);
        }

        .step-info {
          text-align: center;
        }

        .step-title {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin: 0 0 8px 0;
          font-size: 24px;
          font-weight: 700;
          color: var(--text-primary, #1f2937);
        }

        .step-emoji {
          font-size: 28px;
        }

        .step-description {
          margin: 0;
          font-size: 16px;
          color: var(--text-secondary, #6b7280);
        }

        /* Progress Bar */
        .progress-container {
          padding: 16px 20px;
          text-align: center;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: var(--bg-secondary, #f3f4f6);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #10b981);
          border-radius: 4px;
          transition: width 400ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        .progress-text {
          font-size: 12px;
          color: var(--text-secondary, #6b7280);
          font-weight: 500;
        }

        /* Content */
        .wizard-content {
          flex: 1;
          padding: 20px;
        }

        .step-content {
          max-width: 400px;
          margin: 0 auto;
        }

        .setting-group {
          margin-bottom: 32px;
        }

        .setting-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary, #1f2937);
        }

        .label-text {
          flex: 1;
        }

        .label-emoji {
          font-size: 20px;
        }

        /* Theme Options */
        .theme-options {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }

        .theme-option {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: white;
          border: 2px solid var(--border-color, #e5e7eb);
          border-radius: 12px;
          cursor: pointer;
          transition: all 200ms ease-out;
          text-align: left;
          min-height: 64px;
        }

        .theme-option:hover {
          border-color: var(--primary-300, #93c5fd);
          transform: translateY(-1px);
        }

        .theme-option.selected {
          border-color: var(--primary-500, #3b82f6);
          background: var(--primary-50, #eff6ff);
        }

        .theme-emoji {
          font-size: 24px;
        }

        .theme-label {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary, #1f2937);
        }

        .theme-desc {
          font-size: 14px;
          color: var(--text-secondary, #6b7280);
          margin-left: auto;
        }

        /* Analysis Options */
        .analysis-options {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }

        .analysis-option {
          padding: 20px;
          background: white;
          border: 2px solid var(--border-color, #e5e7eb);
          border-radius: 12px;
          cursor: pointer;
          transition: all 200ms ease-out;
          text-align: left;
        }

        .analysis-option:hover {
          border-color: var(--primary-300, #93c5fd);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
        }

        .analysis-option.selected {
          border-color: var(--primary-500, #3b82f6);
          background: var(--primary-50, #eff6ff);
        }

        .option-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .option-emoji {
          font-size: 24px;
        }

        .option-text {
          flex: 1;
        }

        .option-label {
          display: block;
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary, #1f2937);
          margin-bottom: 4px;
        }

        .option-desc {
          display: block;
          font-size: 14px;
          color: var(--text-secondary, #6b7280);
        }

        .option-features {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .option-features li {
          font-size: 13px;
          color: var(--text-secondary, #6b7280);
          padding: 2px 0;
          position: relative;
          padding-left: 16px;
        }

        .option-features li::before {
          content: '✓';
          position: absolute;
          left: 0;
          color: var(--primary-500, #3b82f6);
          font-weight: 600;
        }

        /* Toggle Controls */
        .privacy-toggle,
        .notification-toggle {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .toggle-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          background: white;
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 12px;
          min-height: 72px;
        }

        .toggle-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .toggle-emoji {
          font-size: 20px;
        }

        .toggle-text {
          flex: 1;
        }

        .toggle-label {
          display: block;
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary, #1f2937);
          margin-bottom: 4px;
        }

        .toggle-desc {
          display: block;
          font-size: 14px;
          color: var(--text-secondary, #6b7280);
        }

        .toggle-switch {
          position: relative;
          width: 48px;
          height: 28px;
          background: var(--bg-secondary, #d1d5db);
          border: none;
          border-radius: 14px;
          cursor: pointer;
          transition: all 200ms ease-out;
          padding: 0;
        }

        .toggle-switch.on {
          background: var(--primary-500, #3b82f6);
        }

        .toggle-handle {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 24px;
          height: 24px;
          background: white;
          border-radius: 50%;
          transition: all 200ms ease-out;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .toggle-switch.on .toggle-handle {
          transform: translateX(20px);
        }

        /* Actions */
        .wizard-actions {
          padding: 24px 20px;
          text-align: center;
          border-top: 1px solid var(--border-color, #e5e7eb);
          background: var(--bg-secondary, #f9fafb);
        }

        .next-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 16px 24px;
          background: var(--primary-500, #3b82f6);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 200ms ease-out;
          margin-bottom: 12px;
          min-height: 52px;
        }

        .next-button:hover:not(:disabled) {
          background: var(--primary-600, #2563eb);
          transform: translateY(-1px);
        }

        .next-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .button-emoji {
          font-size: 18px;
          transition: transform 200ms ease-out;
        }

        .next-button:hover:not(:disabled) .button-emoji {
          transform: translateX(4px);
        }

        .completion-time {
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

        /* Mobile Responsive */
        @media (max-width: 480px) {
          .setup-header,
          .wizard-content,
          .wizard-actions {
            padding-left: 16px;
            padding-right: 16px;
          }

          .step-title {
            font-size: 20px;
          }

          .theme-option,
          .analysis-option,
          .toggle-item {
            padding: 12px;
          }

          .analysis-options {
            gap: 12px;
          }

          .option-header {
            margin-bottom: 8px;
          }
        }

        /* Reduced Motion */
        @media (prefers-reduced-motion: reduce) {
          .theme-option,
          .analysis-option,
          .next-button,
          .toggle-switch,
          .toggle-handle,
          .progress-fill {
            transition: none;
            transform: none;
          }

          .theme-option:hover,
          .analysis-option:hover,
          .next-button:hover {
            transform: none;
          }
        }

        /* High Contrast Mode */
        @media (prefers-contrast: high) {
          .theme-option,
          .analysis-option,
          .toggle-item {
            border-width: 3px;
          }

          .next-button {
            border: 2px solid #ffffff;
          }
        }
      `}</style>
    </div>
  );
};

export default QuickSetupWizard;
