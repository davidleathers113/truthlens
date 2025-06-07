import React, { useState, useEffect } from 'react';
import { UserSettings, ConsentData } from '@shared/types';
import { storageService } from '@shared/storage/storageService';

interface PrivacySettingsProps {}

export const PrivacySettings: React.FC<PrivacySettingsProps> = () => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [consentData, setConsentData] = useState<ConsentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCacheConfirm, setShowCacheConfirm] = useState(false);
  const [storageStats, setStorageStats] = useState<any>(null);

  useEffect(() => {
    loadData();
    loadStorageStats();
  }, []);

  const loadData = async () => {
    try {
      const [currentSettings, consent] = await Promise.all([
        storageService.getSettings(),
        storageService.getConsentData()
      ]);
      setSettings(currentSettings);
      setConsentData(consent);
    } catch (error) {
      console.error('Failed to load privacy data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStorageStats = async () => {
    try {
      const stats = await storageService.getStorageStats();
      setStorageStats(stats);
    } catch (error) {
      console.error('Failed to load storage stats:', error);
    }
  };

  const updatePrivacySetting = async <K extends keyof UserSettings['privacy']>(
    key: K,
    value: UserSettings['privacy'][K]
  ) => {
    if (!settings) return;

    try {
      setSaving(true);
      const newPrivacySettings = { ...settings.privacy, [key]: value };
      const newSettings = { ...settings, privacy: newPrivacySettings };
      setSettings(newSettings);

      await storageService.updateSettings({ privacy: newPrivacySettings });
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save privacy setting:', error);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const updateConsentSetting = async <K extends keyof ConsentData>(
    key: K,
    value: ConsentData[K]
  ) => {
    try {
      setSaving(true);
      const newConsentData = {
        ...consentData,
        [key]: value,
        consentTimestamp: Date.now(),
        consentVersion: '2025.1'
      } as ConsentData;

      setConsentData(newConsentData);
      await storageService.storeConsentData(newConsentData);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save consent setting:', error);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleClearCache = async () => {
    try {
      setSaving(true);
      await storageService.clearCache();
      setShowCacheConfirm(false);
      setLastSaved(new Date());
      await loadStorageStats();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAllData = async () => {
    try {
      setSaving(true);
      await storageService.deleteAllUserData();
      setShowDeleteConfirm(false);
      // Reload page to show default state
      window.location.reload();
    } catch (error) {
      console.error('Failed to delete data:', error);
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      setSaving(true);
      const exportData = await storageService.exportUserData();

      // Create downloadable file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `truthlens-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to export data:', error);
    } finally {
      setSaving(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="settings-section" role="main" aria-labelledby="privacy-heading">
        <div className="loading-container">
          <div className="loading-spinner" aria-label="Loading privacy settings"></div>
          <p>Loading privacy settings...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="settings-section" role="main" aria-labelledby="privacy-heading">
        <div className="error-container">
          <p>Failed to load privacy settings. Please refresh the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-section" role="main" aria-labelledby="privacy-heading">
      <header className="section-header">
        <h1 id="privacy-heading" className="section-title">
          <span className="section-icon" role="img" aria-hidden="true">🔒</span>
          Privacy Settings
        </h1>
        <p className="section-description">
          Control data collection, usage analytics, and privacy preferences for TruthLens.
        </p>
      </header>

      <div className="section-content">
        <form className="settings-form" onSubmit={(e) => e.preventDefault()}>

          {/* Data Collection */}
          <div className="setting-group">
            <div className="setting-item">
              <div className="setting-header">
                <label htmlFor="analytics-enabled" className="setting-label">
                  Analytics & Usage Data
                </label>
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    id="analytics-enabled"
                    checked={settings.privacy.analyticsEnabled}
                    onChange={(e) => updatePrivacySetting('analyticsEnabled', e.target.checked)}
                    disabled={saving}
                  />
                  <span className="toggle-slider"></span>
                </div>
              </div>
              <p className="setting-description">
                Allow TruthLens to collect anonymized usage analytics to improve the extension.
                No personal information or browsing history is collected.
              </p>
            </div>
          </div>

          {/* Local Processing Only */}
          <div className="setting-group">
            <div className="setting-item">
              <div className="setting-header">
                <label htmlFor="local-processing" className="setting-label">
                  Local Processing Only
                </label>
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    id="local-processing"
                    checked={settings.privacy.localProcessingOnly}
                    onChange={(e) => updatePrivacySetting('localProcessingOnly', e.target.checked)}
                    disabled={saving}
                  />
                  <span className="toggle-slider"></span>
                </div>
              </div>
              <p className="setting-description">
                Process all content locally using Chrome's built-in AI. When disabled, external APIs may be used for enhanced analysis.
              </p>
            </div>
          </div>

          {/* AI Processing Consent */}
          {consentData && (
            <div className="setting-group">
              <div className="setting-item">
                <div className="setting-header">
                  <label htmlFor="ai-processing-consent" className="setting-label">
                    AI Processing Consent
                  </label>
                  <div className="toggle-switch">
                    <input
                      type="checkbox"
                      id="ai-processing-consent"
                      checked={consentData.aiProcessingConsent}
                      onChange={(e) => updateConsentSetting('aiProcessingConsent', e.target.checked)}
                      disabled={saving}
                    />
                    <span className="toggle-slider"></span>
                  </div>
                </div>
                <p className="setting-description">
                  Consent to AI processing of page content for credibility analysis. Required for extension functionality.
                </p>
              </div>
            </div>
          )}

          {/* Performance Monitoring Consent */}
          {consentData && (
            <div className="setting-group">
              <div className="setting-item">
                <div className="setting-header">
                  <label htmlFor="performance-consent" className="setting-label">
                    Performance Monitoring
                  </label>
                  <div className="toggle-switch">
                    <input
                      type="checkbox"
                      id="performance-consent"
                      checked={consentData.performanceConsent}
                      onChange={(e) => updateConsentSetting('performanceConsent', e.target.checked)}
                      disabled={saving}
                    />
                    <span className="toggle-slider"></span>
                  </div>
                </div>
                <p className="setting-description">
                  Allow monitoring of extension performance metrics to identify and fix issues.
                </p>
              </div>
            </div>
          )}

          {/* A/B Testing Consent */}
          {consentData && (
            <div className="setting-group">
              <div className="setting-item">
                <div className="setting-header">
                  <label htmlFor="ab-testing-consent" className="setting-label">
                    A/B Testing Participation
                  </label>
                  <div className="toggle-switch">
                    <input
                      type="checkbox"
                      id="ab-testing-consent"
                      checked={consentData.abTestingConsent}
                      onChange={(e) => updateConsentSetting('abTestingConsent', e.target.checked)}
                      disabled={saving}
                    />
                    <span className="toggle-slider"></span>
                  </div>
                </div>
                <p className="setting-description">
                  Participate in A/B tests to help improve the user experience. You may see different interface variants.
                </p>
              </div>
            </div>
          )}

          {/* Storage Information */}
          {storageStats && (
            <div className="setting-group">
              <div className="setting-item">
                <h3 className="setting-label">Storage Usage</h3>
                <div className="storage-info">
                  <div className="storage-stat">
                    <span className="stat-label">Local Storage:</span>
                    <span className="stat-value">
                      {formatBytes(storageStats.local.bytesInUse)} / {formatBytes(storageStats.local.quota)}
                    </span>
                  </div>
                  <div className="storage-stat">
                    <span className="stat-label">Sync Storage:</span>
                    <span className="stat-value">
                      {formatBytes(storageStats.sync.bytesInUse)} / {formatBytes(storageStats.sync.quota)}
                    </span>
                  </div>
                  {storageStats.session && (
                    <div className="storage-stat">
                      <span className="stat-label">Session Storage:</span>
                      <span className="stat-value">{formatBytes(storageStats.session.bytesInUse)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Data Management Actions */}
          <div className="setting-group">
            <div className="setting-item">
              <h3 className="setting-label">Data Management</h3>
              <div className="action-buttons">

                {/* Clear Cache */}
                <button
                  type="button"
                  onClick={() => setShowCacheConfirm(true)}
                  disabled={saving}
                  className="action-button secondary"
                >
                  <span className="button-icon">🗑️</span>
                  Clear Cache
                </button>

                {/* Export Data */}
                <button
                  type="button"
                  onClick={handleExportData}
                  disabled={saving}
                  className="action-button secondary"
                >
                  <span className="button-icon">📁</span>
                  Export My Data
                </button>

                {/* Delete All Data */}
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={saving}
                  className="action-button danger"
                >
                  <span className="button-icon">⚠️</span>
                  Delete All Data
                </button>
              </div>

              <p className="setting-description">
                Manage your stored data and exercise your privacy rights under GDPR.
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

        {/* Clear Cache Confirmation Modal */}
        {showCacheConfirm && (
          <div className="modal-overlay" onClick={() => setShowCacheConfirm(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-title">Clear Cache</h3>
              <p className="modal-description">
                This will clear all cached credibility results. The extension will need to re-analyze
                content you've previously visited. This action cannot be undone.
              </p>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowCacheConfirm(false)}
                  className="modal-button secondary"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleClearCache}
                  className="modal-button primary"
                  disabled={saving}
                >
                  Clear Cache
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete All Data Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-title">Delete All Data</h3>
              <p className="modal-description">
                <strong>Warning:</strong> This will permanently delete all your TruthLens data including
                settings, preferences, cache, and analytics. This action cannot be undone and you will
                need to reconfigure the extension.
              </p>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="modal-button secondary"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAllData}
                  className="modal-button danger"
                  disabled={saving}
                >
                  Delete All Data
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
