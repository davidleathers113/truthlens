import React, { useState, useEffect } from 'react';
import { UserSettings } from '@shared/types';
import { storageService } from '@shared/storage/storageService';

interface AppearanceSettingsProps {
  // Empty interface for future props - allows extensibility
  [key: string]: never;
}

interface AppearanceState {
  currentTheme: 'light' | 'dark' | 'auto';
  systemTheme: 'light' | 'dark';
  indicatorSize: 'small' | 'medium' | 'large';
  indicatorOpacity: number;
  customColors: {
    primary: string;
    success: string;
    warning: string;
    error: string;
  };
  highContrast: boolean;
  reducedMotion: boolean;
  compactMode: boolean;
}

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = () => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [appearanceState, setAppearanceState] = useState<AppearanceState>({
    currentTheme: 'auto',
    systemTheme: 'light',
    indicatorSize: 'medium',
    indicatorOpacity: 0.9,
    customColors: {
      primary: '#2563eb',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444'
    },
    highContrast: false,
    reducedMotion: false,
    compactMode: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<'light' | 'dark'>('light');

  const detectSystemTheme = (): 'light' | 'dark' => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  };

  useEffect(() => {
    loadSettings();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      setAppearanceState(prev => ({ ...prev, systemTheme: detectSystemTheme() }));
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
      return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    } else {
      return undefined;
    }
  }, []);

  const loadSettings = async () => {
    try {
      const currentSettings = await storageService.getSettings();
      setSettings(currentSettings);

      setAppearanceState(prev => ({
        ...prev,
        currentTheme: currentSettings.theme,
        systemTheme: detectSystemTheme()
      }));
    } catch (error) {
      console.error('Failed to load appearance settings:', error);
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
    } catch (error) {
      console.error('Failed to save appearance setting:', error);
      await loadSettings();
    } finally {
      setSaving(false);
    }
  };

  const getEffectiveTheme = (): 'light' | 'dark' => {
    if (appearanceState.currentTheme === 'auto') {
      return appearanceState.systemTheme;
    }
    return appearanceState.currentTheme;
  };

  const handleThemePreview = (theme: 'light' | 'dark') => {
    setPreviewMode(theme);
    document.documentElement.setAttribute('data-preview-theme', theme);
  };

  const resetCustomColors = () => {
    setAppearanceState(prev => ({
      ...prev,
      customColors: {
        primary: '#2563eb',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444'
      }
    }));
  };

  if (loading) {
    return (
      <div className="settings-section" role="main" aria-labelledby="appearance-heading">
        <div className="loading-container">
          <div className="loading-spinner" aria-label="Loading appearance settings"></div>
          <p>Loading appearance settings...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="settings-section" role="main" aria-labelledby="appearance-heading">
        <div className="error-container">
          <p>Failed to load appearance settings. Please refresh the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-section" role="main" aria-labelledby="appearance-heading">
      <header className="section-header">
        <h1 id="appearance-heading" className="section-title">
          <span className="section-icon" role="img" aria-hidden="true">🎨</span>
          Appearance Settings
        </h1>
        <p className="section-description">
          Customize the visual appearance, themes, and display preferences for TruthLens.
        </p>
      </header>

      <div className="section-content">
        <form className="settings-form" onSubmit={(e) => e.preventDefault()}>

          <div className="setting-group">
            <h2 className="setting-group-title">Theme & Visual Style</h2>

            <div className="theme-preview-container">
              <div className="theme-previews">
                <button
                  type="button"
                  className={`theme-preview ${previewMode === 'light' ? 'active' : ''}`}
                  onClick={() => handleThemePreview('light')}
                  aria-label="Preview light theme"
                >
                  <div className="preview-header light-theme">
                    <div className="preview-controls">
                      <span className="preview-dot"></span>
                      <span className="preview-dot"></span>
                      <span className="preview-dot"></span>
                    </div>
                  </div>
                  <div className="preview-content light-theme">
                    <div className="preview-text"></div>
                    <div className="preview-indicator">🔍</div>
                  </div>
                  <span className="theme-label">Light Theme</span>
                </button>

                <button
                  type="button"
                  className={`theme-preview ${previewMode === 'dark' ? 'active' : ''}`}
                  onClick={() => handleThemePreview('dark')}
                  aria-label="Preview dark theme"
                >
                  <div className="preview-header dark-theme">
                    <div className="preview-controls">
                      <span className="preview-dot"></span>
                      <span className="preview-dot"></span>
                      <span className="preview-dot"></span>
                    </div>
                  </div>
                  <div className="preview-content dark-theme">
                    <div className="preview-text"></div>
                    <div className="preview-indicator">🔍</div>
                  </div>
                  <span className="theme-label">Dark Theme</span>
                </button>
              </div>

              <div className="current-theme-info">
                <p className="theme-status">
                  <span className="status-label">Current theme:</span>
                  <span className="status-value">
                    {appearanceState.currentTheme === 'auto'
                      ? `Auto (${getEffectiveTheme()})`
                      : appearanceState.currentTheme}
                  </span>
                </p>
                {appearanceState.currentTheme === 'auto' && (
                  <p className="system-theme-note">
                    🔄 Automatically follows your system preference
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="setting-group">
            <h2 className="setting-group-title">Credibility Indicators</h2>

            <div className="setting-item">
              <label htmlFor="indicator-size" className="setting-label">
                Indicator Size
              </label>
              <select
                id="indicator-size"
                value={appearanceState.indicatorSize}
                onChange={(e) => setAppearanceState(prev => ({
                  ...prev,
                  indicatorSize: e.target.value as 'small' | 'medium' | 'large'
                }))}
                className="setting-select"
                disabled={saving}
              >
                <option value="small">Small (Compact)</option>
                <option value="medium">Medium (Default)</option>
                <option value="large">Large (Accessible)</option>
              </select>
              <p className="setting-description">
                Choose the size of credibility indicators on web pages.
              </p>
            </div>

            <div className="setting-item">
              <label htmlFor="indicator-opacity" className="setting-label">
                Indicator Opacity: {Math.round(appearanceState.indicatorOpacity * 100)}%
              </label>
              <div className="range-container">
                <input
                  type="range"
                  id="indicator-opacity"
                  min="0.3"
                  max="1"
                  step="0.1"
                  value={appearanceState.indicatorOpacity}
                  onChange={(e) => setAppearanceState(prev => ({
                    ...prev,
                    indicatorOpacity: parseFloat(e.target.value)
                  }))}
                  className="setting-range"
                  disabled={saving}
                />
                <div className="range-labels">
                  <span>30%</span>
                  <span>100%</span>
                </div>
              </div>
              <p className="setting-description">
                Adjust how transparent or opaque the indicators appear.
              </p>
            </div>

            <div className="indicator-preview">
              <div className="preview-label">Preview:</div>
              <div
                className={`indicator-sample size-${appearanceState.indicatorSize}`}
                style={{ opacity: appearanceState.indicatorOpacity }}
              >
                🔍 Credibility Indicator
              </div>
            </div>
          </div>

          <div className="setting-group">
            <h2 className="setting-group-title">Accessibility & Comfort</h2>

            <div className="setting-item">
              <div className="setting-header">
                <label htmlFor="high-contrast" className="setting-label">
                  High Contrast Mode
                </label>
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    id="high-contrast"
                    checked={appearanceState.highContrast}
                    onChange={(e) => setAppearanceState(prev => ({
                      ...prev,
                      highContrast: e.target.checked
                    }))}
                    disabled={saving}
                  />
                  <span className="toggle-slider"></span>
                </div>
              </div>
              <p className="setting-description">
                Enhance contrast for better visibility and accessibility compliance.
              </p>
            </div>

            <div className="setting-item">
              <div className="setting-header">
                <label htmlFor="reduced-motion" className="setting-label">
                  Reduce Motion
                </label>
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    id="reduced-motion"
                    checked={appearanceState.reducedMotion}
                    onChange={(e) => setAppearanceState(prev => ({
                      ...prev,
                      reducedMotion: e.target.checked
                    }))}
                    disabled={saving}
                  />
                  <span className="toggle-slider"></span>
                </div>
              </div>
              <p className="setting-description">
                Minimize animations and transitions for users sensitive to motion.
              </p>
            </div>

            <div className="setting-item">
              <div className="setting-header">
                <label htmlFor="compact-mode" className="setting-label">
                  Compact Interface
                </label>
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    id="compact-mode"
                    checked={appearanceState.compactMode}
                    onChange={(e) => setAppearanceState(prev => ({
                      ...prev,
                      compactMode: e.target.checked
                    }))}
                    disabled={saving}
                  />
                  <span className="toggle-slider"></span>
                </div>
              </div>
              <p className="setting-description">
                Use smaller spacing and condensed layouts for mobile or small screens.
              </p>
            </div>
          </div>

          <div className="setting-group">
            <h2 className="setting-group-title">Color Customization</h2>

            <div className="color-palette">
              <div className="color-item">
                <label htmlFor="primary-color" className="color-label">
                  Primary Color
                </label>
                <div className="color-input-container">
                  <input
                    type="color"
                    id="primary-color"
                    value={appearanceState.customColors.primary}
                    onChange={(e) => setAppearanceState(prev => ({
                      ...prev,
                      customColors: { ...prev.customColors, primary: e.target.value }
                    }))}
                    className="color-input"
                    disabled={saving}
                  />
                  <span className="color-value">{appearanceState.customColors.primary}</span>
                </div>
              </div>

              <div className="color-item">
                <label htmlFor="success-color" className="color-label">
                  Success Color
                </label>
                <div className="color-input-container">
                  <input
                    type="color"
                    id="success-color"
                    value={appearanceState.customColors.success}
                    onChange={(e) => setAppearanceState(prev => ({
                      ...prev,
                      customColors: { ...prev.customColors, success: e.target.value }
                    }))}
                    className="color-input"
                    disabled={saving}
                  />
                  <span className="color-value">{appearanceState.customColors.success}</span>
                </div>
              </div>

              <div className="color-item">
                <label htmlFor="warning-color" className="color-label">
                  Warning Color
                </label>
                <div className="color-input-container">
                  <input
                    type="color"
                    id="warning-color"
                    value={appearanceState.customColors.warning}
                    onChange={(e) => setAppearanceState(prev => ({
                      ...prev,
                      customColors: { ...prev.customColors, warning: e.target.value }
                    }))}
                    className="color-input"
                    disabled={saving}
                  />
                  <span className="color-value">{appearanceState.customColors.warning}</span>
                </div>
              </div>

              <div className="color-item">
                <label htmlFor="error-color" className="color-label">
                  Error Color
                </label>
                <div className="color-input-container">
                  <input
                    type="color"
                    id="error-color"
                    value={appearanceState.customColors.error}
                    onChange={(e) => setAppearanceState(prev => ({
                      ...prev,
                      customColors: { ...prev.customColors, error: e.target.value }
                    }))}
                    className="color-input"
                    disabled={saving}
                  />
                  <span className="color-value">{appearanceState.customColors.error}</span>
                </div>
              </div>
            </div>

            <div className="color-actions">
              <button
                type="button"
                onClick={resetCustomColors}
                className="btn btn-secondary"
                disabled={saving}
              >
                Reset to Defaults
              </button>

              <button
                type="button"
                onClick={() => updateSetting('theme', appearanceState.currentTheme)}
                className="btn btn-primary"
                disabled={saving}
                style={{ marginLeft: 'var(--space-3)' }}
              >
                Save Changes
              </button>
            </div>

            <p className="color-note">
              💡 Custom colors will be applied to credibility indicators and interface elements.
            </p>
          </div>

          {saving && (
            <div className="save-status saving">
              <span className="status-icon">⏳</span>
              Saving appearance changes...
            </div>
          )}

        </form>
      </div>
    </div>
  );
};
