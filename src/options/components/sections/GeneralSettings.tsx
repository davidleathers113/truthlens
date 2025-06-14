import React, { useState, useEffect } from 'react';
import { UserSettings } from '@shared/types';
import { storageService } from '@shared/storage/storageService';

interface GeneralSettingsProps {
  // Empty interface for future props - allows extensibility
  [key: string]: never;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = () => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const currentSettings = await storageService.getSettings();
      setSettings(currentSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    if (!settings) return;

    try {
      setSaving(true);
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);

      await storageService.updateSettings({ [key]: value });
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save setting:', error);
      // Revert on error
      await loadSettings();
    } finally {
      setSaving(false);
    }
  };

  const updatePrivacySetting = async <K extends keyof UserSettings['privacy']>(
    key: K,
    value: UserSettings['privacy'][K]
  ) => {
    if (!settings) return;

    const newPrivacySettings = { ...settings.privacy, [key]: value };
    await updateSetting('privacy', newPrivacySettings);
  };

  if (loading) {
    return (
      <div className="settings-section" role="main" aria-labelledby="general-heading">
        <div className="loading-container">
          <div className="loading-spinner" aria-label="Loading settings"></div>
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="settings-section" role="main" aria-labelledby="general-heading">
        <div className="error-container">
          <p>Failed to load settings. Please refresh the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-section" role="main" aria-labelledby="general-heading">
      <header className="section-header">
        <h1 id="general-heading" className="section-title">
          <span className="section-icon" role="img" aria-hidden="true">⚙️</span>
          General Settings
        </h1>
        <p className="section-description">
          Configure basic extension settings and preferences for TruthLens behavior.
        </p>
      </header>

      <div className="section-content">
        <form className="settings-form" onSubmit={(e) => e.preventDefault()}>

          {/* Extension Enable/Disable */}
          <div className="setting-group">
            <div className="setting-item">
              <div className="setting-header">
                <label htmlFor="extension-enabled" className="setting-label">
                  Extension Enabled
                </label>
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    id="extension-enabled"
                    checked={settings.enabled}
                    onChange={(e) => updateSetting('enabled', e.target.checked)}
                    disabled={saving}
                  />
                  <span className="toggle-slider"></span>
                </div>
              </div>
              <p className="setting-description">
                Enable or disable TruthLens extension functionality entirely.
              </p>
            </div>
          </div>

          {/* Auto-Analysis */}
          <div className="setting-group">
            <div className="setting-item">
              <div className="setting-header">
                <label htmlFor="auto-analyze" className="setting-label">
                  Automatic Analysis
                </label>
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    id="auto-analyze"
                    checked={settings.autoAnalyze}
                    onChange={(e) => updateSetting('autoAnalyze', e.target.checked)}
                    disabled={saving || !settings.enabled}
                  />
                  <span className="toggle-slider"></span>
                </div>
              </div>
              <p className="setting-description">
                Automatically analyze content when you visit a page. Disable to analyze only on demand.
              </p>
            </div>
          </div>

          {/* Visual Indicators */}
          <div className="setting-group">
            <div className="setting-item">
              <div className="setting-header">
                <label htmlFor="visual-indicators" className="setting-label">
                  Show Visual Indicators
                </label>
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    id="visual-indicators"
                    checked={settings.showVisualIndicators}
                    onChange={(e) => updateSetting('showVisualIndicators', e.target.checked)}
                    disabled={saving || !settings.enabled}
                  />
                  <span className="toggle-slider"></span>
                </div>
              </div>
              <p className="setting-description">
                Display credibility indicators on web pages.
              </p>
            </div>
          </div>

          {/* Indicator Position */}
          <div className="setting-group">
            <div className="setting-item">
              <label htmlFor="indicator-position" className="setting-label">
                Indicator Position
              </label>
              <select
                id="indicator-position"
                value={settings.indicatorPosition}
                onChange={(e) => updateSetting('indicatorPosition', e.target.value as UserSettings['indicatorPosition'])}
                disabled={saving || !settings.enabled || !settings.showVisualIndicators}
                className="setting-select"
              >
                <option value="top-right">Top Right</option>
                <option value="top-left">Top Left</option>
                <option value="bottom-right">Bottom Right</option>
                <option value="bottom-left">Bottom Left</option>
              </select>
              <p className="setting-description">
                Choose where credibility indicators appear on web pages.
              </p>
            </div>
          </div>

          {/* Fact-Checking Level */}
          <div className="setting-group">
            <div className="setting-item">
              <label htmlFor="fact-checking-level" className="setting-label">
                Fact-Checking Level
              </label>
              <select
                id="fact-checking-level"
                value={settings.factCheckingLevel}
                onChange={(e) => updateSetting('factCheckingLevel', e.target.value as UserSettings['factCheckingLevel'])}
                disabled={saving || !settings.enabled}
                className="setting-select"
              >
                <option value="basic">Basic - Quick analysis</option>
                <option value="standard">Standard - Balanced analysis</option>
                <option value="thorough">Thorough - Comprehensive analysis</option>
              </select>
              <p className="setting-description">
                Set the depth of fact-checking analysis. Higher levels may take longer but provide more detailed results.
              </p>
            </div>
          </div>

          {/* Cache Duration */}
          <div className="setting-group">
            <div className="setting-item">
              <label htmlFor="cache-duration" className="setting-label">
                Cache Duration: {settings.privacy.cacheDuration} hours
              </label>
              <div className="range-container">
                <input
                  type="range"
                  id="cache-duration"
                  min="1"
                  max="72"
                  step="1"
                  value={settings.privacy.cacheDuration}
                  onChange={(e) => updatePrivacySetting('cacheDuration', parseInt(e.target.value))}
                  disabled={saving || !settings.enabled}
                  className="setting-range"
                />
                <div className="range-labels">
                  <span>1h</span>
                  <span>72h</span>
                </div>
              </div>
              <p className="setting-description">
                How long to cache credibility results before checking again. Longer durations reduce processing but may show outdated information.
              </p>
            </div>
          </div>

          {/* Theme Selection */}
          <div className="setting-group">
            <div className="setting-item">
              <label htmlFor="theme-select" className="setting-label">
                Theme
              </label>
              <select
                id="theme-select"
                value={settings.theme}
                onChange={(e) => updateSetting('theme', e.target.value as UserSettings['theme'])}
                disabled={saving}
                className="setting-select"
              >
                <option value="auto">Auto (Follow system)</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
              <p className="setting-description">
                Choose the visual theme for the extension interface.
              </p>
            </div>
          </div>

          {/* Save Status */}
          {saving && (
            <div className="save-status saving">
              <span className="status-icon">⏳</span>
              Saving changes...
            </div>
          )}

          {lastSaved && !saving && (
            <div className="save-status saved">
              <span className="status-icon">✅</span>
              Last saved: {lastSaved.toLocaleTimeString()}
            </div>
          )}

        </form>
      </div>
    </div>
  );
};
