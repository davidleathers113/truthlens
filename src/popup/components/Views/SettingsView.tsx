import React, { useState, useMemo, useCallback } from 'react';
import { PopupView } from '../Layout/PopupRouter';
import { useExtension } from '../../contexts/ExtensionContext';
import { UserSettings, NotificationSettings, PrivacySettings } from '@shared/types';
import '../../styles/SettingsView.css';

interface SettingsViewProps {
  onNavigate: (view: PopupView) => void;
}

interface ToggleSwitchProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  id,
  label,
  description,
  checked,
  onChange,
  disabled = false,
}) => {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (!disabled) {
        onChange(!checked);
      }
    }
  };

  return (
    <div className="setting-item">
      <div className="setting-info">
        <label htmlFor={id} className="setting-label">
          {label}
        </label>
        {description && <p className="setting-description">{description}</p>}
      </div>
      <button
        id={id}
        className={`toggle-switch ${checked ? 'on' : 'off'} ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && onChange(!checked)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        role="switch"
        aria-checked={checked}
        aria-label={`${checked ? 'Disable' : 'Enable'} ${label}`}
      >
        <div className="toggle-track">
          <div className="toggle-thumb" />
        </div>
        <span className="sr-only">{checked ? 'ON' : 'OFF'}</span>
      </button>
    </div>
  );
};

interface SelectProps {
  id: string;
  label: string;
  description?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

const Select: React.FC<SelectProps> = ({
  id,
  label,
  description,
  value,
  options,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="setting-item">
      <div className="setting-info">
        <label htmlFor={id} className="setting-label">
          {label}
        </label>
        {description && <p className="setting-description">{description}</p>}
      </div>
      <select
        id={id}
        className="setting-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-describedby={description ? `${id}-desc` : undefined}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export const SettingsView: React.FC<SettingsViewProps> = ({ onNavigate }) => {
  const { state, actions } = useExtension();
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [saveIndicator, setSaveIndicator] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const handleSettingChange = useCallback(async (updates: Partial<UserSettings>) => {
    if (!state.settings || isUpdating) return;

    setIsUpdating(true);
    try {
      const newSettings = { ...state.settings, ...updates };

      // Send update to background script
      await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        payload: newSettings,
      });

      // Update local state
      actions.loadSettings();

      // Show save indicator
      setSaveIndicator(true);
      setLastSaved(new Date());
      setTimeout(() => setSaveIndicator(false), 2000);
    } catch (error) {
      console.error('Failed to update settings:', error);
      // Could add error toast notification here
    } finally {
      setIsUpdating(false);
    }
  }, [state.settings, isUpdating, actions]);

  const handleNotificationChange = (updates: Partial<NotificationSettings>) => {
    if (!state.settings) return;
    handleSettingChange({
      notifications: { ...state.settings.notifications, ...updates },
    });
  };

  const handlePrivacyChange = useCallback((updates: Partial<PrivacySettings>) => {
    if (!state.settings) return;
    handleSettingChange({
      privacy: { ...state.settings.privacy, ...updates },
    });
  }, [state.settings, handleSettingChange]);

  // Filter sections based on search term
  const filteredSections = useMemo(() => {
    if (!searchTerm.trim()) {
      return ['general', 'analysis', 'notifications', 'privacy'];
    }

    const searchLower = searchTerm.toLowerCase();
    const sections: string[] = [];

    // Define searchable content for each section
    const sectionContent = {
      general: ['extension', 'status', 'visual', 'indicators', 'position', 'theme', 'light', 'dark'],
      analysis: ['fact', 'checking', 'level', 'basic', 'standard', 'thorough', 'auto', 'analyze'],
      notifications: ['alerts', 'notify', 'credibility', 'suspicious', 'complete', 'finished'],
      privacy: ['analytics', 'usage', 'data', 'local', 'processing', 'cache', 'duration']
    };

    Object.entries(sectionContent).forEach(([section, keywords]) => {
      if (keywords.some(keyword => keyword.includes(searchLower)) ||
          section.includes(searchLower)) {
        sections.push(section);
      }
    });

    return sections;
  }, [searchTerm]);

  if (!state.settings) {
    return (
      <div className="settings-view">
        <header className="view-header">
          <button
            className="back-button"
            onClick={() => onNavigate('main')}
            aria-label="Go back to main view"
          >
            ← Back
          </button>
          <h2>Settings</h2>
        </header>
        <div className="loading-state">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="settings-view">
      <header className="view-header">
        <button
          className="back-button"
          onClick={() => onNavigate('main')}
          aria-label="Go back to main view"
        >
          ← Back
        </button>
        <h2>Settings</h2>
      </header>

      {/* Search Bar */}
      <div className="settings-search">
        <input
          type="text"
          className="search-input"
          placeholder="Search settings..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Search settings"
        />
      </div>

      <main className={`settings-content ${isUpdating ? 'settings-updating' : ''}`}>
        {/* General Settings */}
        <section
          className={`settings-section ${!filteredSections.includes('general') ? 'hidden' : ''}`}
          aria-labelledby="general-heading"
        >
          <h3 id="general-heading">General</h3>

          <ToggleSwitch
            id="extension-enabled"
            label="Extension Status"
            description="Enable or disable TruthLens analysis"
            checked={state.settings.enabled}
            onChange={(checked) => handleSettingChange({ enabled: checked })}
            disabled={isUpdating}
          />

          <ToggleSwitch
            id="visual-indicators"
            label="Visual Indicators"
            description="Show credibility indicators on web pages"
            checked={state.settings.showVisualIndicators}
            onChange={(checked) => handleSettingChange({ showVisualIndicators: checked })}
            disabled={isUpdating || !state.settings.enabled}
          />

          <Select
            id="indicator-position"
            label="Indicator Position"
            description="Where to display credibility indicators"
            value={state.settings.indicatorPosition}
            options={[
              { value: 'top-right', label: 'Top Right' },
              { value: 'top-left', label: 'Top Left' },
              { value: 'bottom-right', label: 'Bottom Right' },
              { value: 'bottom-left', label: 'Bottom Left' },
            ]}
            onChange={(value) => handleSettingChange({
              indicatorPosition: value as UserSettings['indicatorPosition']
            })}
            disabled={isUpdating || !state.settings.showVisualIndicators}
          />

          <Select
            id="theme"
            label="Theme"
            description="Choose your preferred color scheme"
            value={state.settings.theme}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'auto', label: 'Auto (System)' },
            ]}
            onChange={(value) => handleSettingChange({
              theme: value as UserSettings['theme']
            })}
            disabled={isUpdating}
          />
        </section>

        {/* Analysis Settings */}
        <section
          className={`settings-section ${!filteredSections.includes('analysis') ? 'hidden' : ''}`}
          aria-labelledby="analysis-heading"
        >
          <h3 id="analysis-heading">Analysis</h3>

          <Select
            id="fact-checking-level"
            label="Fact-checking Level"
            description="Depth of content analysis"
            value={state.settings.factCheckingLevel}
            options={[
              { value: 'basic', label: 'Basic - Quick checks' },
              { value: 'standard', label: 'Standard - Balanced approach' },
              { value: 'thorough', label: 'Thorough - Deep analysis' },
            ]}
            onChange={(value) => handleSettingChange({
              factCheckingLevel: value as UserSettings['factCheckingLevel']
            })}
            disabled={isUpdating || !state.settings.enabled}
          />

          <ToggleSwitch
            id="auto-analyze"
            label="Auto-analyze Pages"
            description="Automatically analyze pages when loading"
            checked={state.settings.autoAnalyze}
            onChange={(checked) => handleSettingChange({ autoAnalyze: checked })}
            disabled={isUpdating || !state.settings.enabled}
          />
        </section>

        {/* Notification Settings */}
        <section
          className={`settings-section ${!filteredSections.includes('notifications') ? 'hidden' : ''}`}
          aria-labelledby="notifications-heading"
        >
          <h3 id="notifications-heading">Notifications</h3>

          <ToggleSwitch
            id="notifications-enabled"
            label="Enable Notifications"
            description="Receive alerts and updates"
            checked={state.settings.notifications.enabled}
            onChange={(checked) => handleNotificationChange({ enabled: checked })}
            disabled={isUpdating}
          />

          <ToggleSwitch
            id="low-credibility-alerts"
            label="Low Credibility Alerts"
            description="Get notified about suspicious content"
            checked={state.settings.notifications.lowCredibilityAlert}
            onChange={(checked) => handleNotificationChange({ lowCredibilityAlert: checked })}
            disabled={isUpdating || !state.settings.notifications.enabled}
          />

          <ToggleSwitch
            id="fact-check-complete"
            label="Analysis Complete"
            description="Notify when fact-checking is finished"
            checked={state.settings.notifications.factCheckComplete}
            onChange={(checked) => handleNotificationChange({ factCheckComplete: checked })}
            disabled={isUpdating || !state.settings.notifications.enabled}
          />
        </section>

        {/* Privacy Settings */}
        <section
          className={`settings-section ${!filteredSections.includes('privacy') ? 'hidden' : ''}`}
          aria-labelledby="privacy-heading"
        >
          <h3 id="privacy-heading">Privacy</h3>

          <ToggleSwitch
            id="analytics-enabled"
            label="Usage Analytics"
            description="Help improve TruthLens by sharing anonymous usage data"
            checked={state.settings.privacy.analyticsEnabled}
            onChange={(checked) => handlePrivacyChange({ analyticsEnabled: checked })}
            disabled={isUpdating}
          />

          <ToggleSwitch
            id="local-processing"
            label="Local Processing Only"
            description="Process data locally when possible for enhanced privacy"
            checked={state.settings.privacy.localProcessingOnly}
            onChange={(checked) => handlePrivacyChange({ localProcessingOnly: checked })}
            disabled={isUpdating}
          />

          <Select
            id="cache-duration"
            label="Cache Duration"
            description="How long to keep analysis results cached"
            value={state.settings.privacy.cacheDuration.toString()}
            options={[
              { value: '1', label: '1 hour' },
              { value: '6', label: '6 hours' },
              { value: '24', label: '24 hours' },
              { value: '168', label: '1 week' },
            ]}
            onChange={(value) => handlePrivacyChange({ cacheDuration: parseInt(value) })}
            disabled={isUpdating}
          />
        </section>

        {/* Footer */}
        <footer className="settings-footer">
          <button
            className="reset-button"
            onClick={() => {
              if (confirm('Reset all settings to defaults? This cannot be undone.')) {
                chrome.runtime.sendMessage({ type: 'RESET_SETTINGS' });
                actions.loadSettings();
              }
            }}
            disabled={isUpdating}
          >
            Reset to Defaults
          </button>

          <div className={`save-indicator ${saveIndicator ? 'show' : ''}`}>
            Settings saved
            {lastSaved && (
              <span className="save-time">
                {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </footer>
      </main>
    </div>
  );
};
