/**
 * Privacy Compliance Manager - 2025 GDPR/AI Act Compliance
 * React component for managing user consent and privacy rights
 */

import React, { useState, useEffect } from 'react';
import { storageService } from '../storage/storageService';
import { securityService } from '../services/securityService';
import { ConsentData } from '../types';

interface PrivacyComplianceManagerProps {
  onConsentUpdate?: (consent: ConsentData) => void;
  compactMode?: boolean;
}

interface PrivacySettings {
  analyticsConsent: boolean;
  performanceConsent: boolean;
  abTestingConsent: boolean;
  aiProcessingConsent: boolean;
}

const PrivacyComplianceManager: React.FC<PrivacyComplianceManagerProps> = ({ 
  onConsentUpdate, 
  compactMode = false 
}) => {
  const [consentData, setConsentData] = useState<ConsentData | null>(null);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    analyticsConsent: false,
    performanceConsent: false,
    abTestingConsent: false,
    aiProcessingConsent: false
  });
  const [showDataExport, setShowDataExport] = useState(false);
  const [showDataDeletion, setShowDataDeletion] = useState(false);
  const [exportData, setExportData] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadConsentData();
  }, []);

  const loadConsentData = async () => {
    try {
      const consent = await storageService.getConsentData();
      setConsentData(consent);
      
      if (consent) {
        setPrivacySettings({
          analyticsConsent: consent.analyticsConsent,
          performanceConsent: consent.performanceConsent,
          abTestingConsent: consent.abTestingConsent,
          aiProcessingConsent: consent.aiProcessingConsent || false
        });
      }
    } catch (error) {
      console.error('Failed to load consent data:', error);
    }
  };

  const updateConsent = async (updates: Partial<PrivacySettings>) => {
    try {
      setLoading(true);
      
      const newSettings = { ...privacySettings, ...updates };
      setPrivacySettings(newSettings);
      
      const newConsentData: ConsentData = {
        analyticsConsent: newSettings.analyticsConsent,
        performanceConsent: newSettings.performanceConsent,
        abTestingConsent: newSettings.abTestingConsent,
        aiProcessingConsent: newSettings.aiProcessingConsent,
        consentTimestamp: Date.now(),
        consentVersion: '2025.1',
        userAgent: navigator.userAgent
      };
      
      await storageService.storeConsentData(newConsentData);
      setConsentData(newConsentData);
      
      // Update privacy metrics
      await storageService.updatePrivacyMetrics({ userConsents: 1 });
      
      onConsentUpdate?.(newConsentData);
      
    } catch (error) {
      console.error('Failed to update consent:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportUserData = async () => {
    try {
      setLoading(true);
      
      const userData = await storageService.exportUserData();
      const exportString = JSON.stringify(userData, null, 2);
      setExportData(exportString);
      setShowDataExport(true);
      
      // Update privacy metrics
      await storageService.updatePrivacyMetrics({ dataExports: 1 });
      
    } catch (error) {
      console.error('Failed to export user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteAllData = async () => {
    try {
      setLoading(true);
      
      await storageService.deleteAllUserData();
      
      // Reset local state
      setConsentData(null);
      setPrivacySettings({
        analyticsConsent: false,
        performanceConsent: false,
        abTestingConsent: false,
        aiProcessingConsent: false
      });
      
      setShowDataDeletion(false);
      
      // Note: We can't update privacy metrics after deletion
      
    } catch (error) {
      console.error('Failed to delete user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadExportData = () => {
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `truthlens-data-export-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (compactMode) {
    return (
      <div className="privacy-compliance-compact">
        <div className="consent-summary">
          <span className="consent-status">
            Privacy: {privacySettings.analyticsConsent ? '✓' : '✗'} Analytics, 
            {privacySettings.aiProcessingConsent ? '✓' : '✗'} AI Processing
          </span>
          <button 
            onClick={() => setShowDataExport(!showDataExport)}
            className="privacy-settings-btn"
          >
            Privacy Settings
          </button>
        </div>
        
        {showDataExport && (
          <div className="privacy-dropdown">
            <PrivacyComplianceManager compactMode={false} onConsentUpdate={onConsentUpdate} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="privacy-compliance-manager">
      <div className="privacy-header">
        <h3>Privacy & Data Management</h3>
        <p className="compliance-note">
          GDPR & EU AI Act 2025 Compliant • Your data, your choice
        </p>
      </div>

      <div className="consent-section">
        <h4>Data Processing Consent</h4>
        <p className="section-description">
          Control how TruthLens processes your data. All processing is done locally when possible.
        </p>
        
        <div className="consent-option">
          <label className="consent-label">
            <input
              type="checkbox"
              checked={privacySettings.analyticsConsent}
              onChange={(e) => updateConsent({ analyticsConsent: e.target.checked })}
              disabled={loading}
            />
            <div className="consent-details">
              <strong>Analytics & Usage Data</strong>
              <p>Help improve TruthLens by sharing anonymous usage statistics. 
                 No personal data or browsing history is collected.</p>
            </div>
          </label>
        </div>

        <div className="consent-option">
          <label className="consent-label">
            <input
              type="checkbox"
              checked={privacySettings.performanceConsent}
              onChange={(e) => updateConsent({ performanceConsent: e.target.checked })}
              disabled={loading}
            />
            <div className="consent-details">
              <strong>Performance Monitoring</strong>
              <p>Allow collection of performance metrics to optimize extension speed and reliability.</p>
            </div>
          </label>
        </div>

        <div className="consent-option">
          <label className="consent-label">
            <input
              type="checkbox"
              checked={privacySettings.aiProcessingConsent}
              onChange={(e) => updateConsent({ aiProcessingConsent: e.target.checked })}
              disabled={loading}
            />
            <div className="consent-details">
              <strong>AI Processing Enhancement</strong>
              <p>Allow anonymized content analysis data to improve AI accuracy. 
                 Required for advanced credibility features. EU AI Act compliant.</p>
            </div>
          </label>
        </div>

        <div className="consent-option">
          <label className="consent-label">
            <input
              type="checkbox"
              checked={privacySettings.abTestingConsent}
              onChange={(e) => updateConsent({ abTestingConsent: e.target.checked })}
              disabled={loading}
            />
            <div className="consent-details">
              <strong>Feature Testing</strong>
              <p>Participate in A/B testing for new features and improvements.</p>
            </div>
          </label>
        </div>
      </div>

      <div className="data-rights-section">
        <h4>Your Data Rights</h4>
        <p className="section-description">
          Exercise your privacy rights under GDPR and applicable data protection laws.
        </p>
        
        <div className="data-rights-actions">
          <button 
            onClick={exportUserData}
            disabled={loading}
            className="data-export-btn"
          >
            📥 Export My Data
          </button>
          
          <button 
            onClick={() => setShowDataDeletion(true)}
            disabled={loading}
            className="data-delete-btn"
          >
            🗑️ Delete All Data
          </button>
        </div>
      </div>

      {showDataExport && (
        <div className="data-export-modal">
          <div className="modal-content">
            <h4>Data Export</h4>
            <p>Your complete data export is ready for download:</p>
            
            <div className="export-summary">
              <p>Includes: Settings, subscription, consent history, and anonymized usage metrics</p>
              <p>Export format: JSON</p>
              <p>Generated: {new Date().toLocaleString()}</p>
            </div>
            
            <div className="modal-actions">
              <button onClick={downloadExportData} className="download-btn">
                Download Data
              </button>
              <button onClick={() => setShowDataExport(false)} className="cancel-btn">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showDataDeletion && (
        <div className="data-deletion-modal">
          <div className="modal-content">
            <h4>⚠️ Delete All Data</h4>
            <p><strong>This action cannot be undone.</strong></p>
            
            <div className="deletion-warning">
              <p>This will permanently delete:</p>
              <ul>
                <li>All settings and preferences</li>
                <li>Cached credibility scores</li>
                <li>Usage history and analytics</li>
                <li>Subscription information</li>
                <li>All stored data</li>
              </ul>
              
              <p>You will need to reconfigure TruthLens after deletion.</p>
            </div>
            
            <div className="modal-actions">
              <button onClick={deleteAllData} className="delete-confirm-btn" disabled={loading}>
                {loading ? 'Deleting...' : 'Delete Everything'}
              </button>
              <button onClick={() => setShowDataDeletion(false)} className="cancel-btn">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {consentData && (
        <div className="consent-info">
          <h4>Consent Information</h4>
          <div className="consent-details-grid">
            <div className="consent-detail">
              <label>Last Updated:</label>
              <span>{new Date(consentData.consentTimestamp).toLocaleString()}</span>
            </div>
            <div className="consent-detail">
              <label>Consent Version:</label>
              <span>{consentData.consentVersion}</span>
            </div>
            <div className="consent-detail">
              <label>Data Controller:</label>
              <span>TruthLens Team</span>
            </div>
            <div className="consent-detail">
              <label>Legal Basis:</label>
              <span>Consent (GDPR Art. 6(1)(a))</span>
            </div>
          </div>
        </div>
      )}

      <div className="compliance-footer">
        <p className="compliance-text">
          <strong>Privacy by Design:</strong> TruthLens processes data locally whenever possible. 
          Remote processing only occurs with your explicit consent and is subject to EU AI Act bias assessments.
        </p>
        <p className="compliance-text">
          <strong>Contact:</strong> For privacy questions or to exercise your rights, 
          contact our Data Protection Officer at privacy@truthlens.app
        </p>
      </div>
    </div>
  );
};

export default PrivacyComplianceManager;