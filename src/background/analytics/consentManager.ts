// GDPR-Compliant Consent Management
// Handles user consent for analytics with full transparency

import { ConsentData } from '@shared/types';
import { StorageService } from '@shared/storage/storageService';

export class ConsentManager {
  private storage: StorageService;
  private currentConsent: ConsentData | null = null;
  private readonly CONSENT_VERSION = '1.0.0';

  constructor() {
    this.storage = new StorageService();
    this.initialize();
  }

  async initialize(): Promise<void> {
    this.currentConsent = await this.getStoredConsent();
  }

  /**
   * Show consent modal and handle user response
   */
  async requestConsent(): Promise<ConsentData> {
    // Check if consent is already given and current
    const existingConsent = await this.getStoredConsent();
    if (existingConsent && this.isConsentCurrent(existingConsent)) {
      return existingConsent;
    }

    // Request new consent through popup/options page
    return new Promise((resolve) => {
      chrome.tabs.create({
        url: chrome.runtime.getURL('src/options/index.html?consent=true'),
        active: true
      }, () => {
        // Listen for consent response
        const listener = (message: any) => {
          if (message.type === 'CONSENT_RESPONSE') {
            chrome.runtime.onMessage.removeListener(listener);
            resolve(message.consent);
          }
        };
        chrome.runtime.onMessage.addListener(listener);
      });
    });
  }

  /**
   * Store user consent with full audit trail
   */
  async storeConsent(consentData: Partial<ConsentData>): Promise<ConsentData> {
    const consent: ConsentData = {
      analyticsConsent: consentData.analyticsConsent || false,
      performanceConsent: consentData.performanceConsent || false,
      abTestingConsent: consentData.abTestingConsent || false,
      aiProcessingConsent: consentData.aiProcessingConsent || false,
      consentTimestamp: Date.now(),
      consentVersion: this.CONSENT_VERSION,
      ipAddress: undefined, // Not collected for privacy
      userAgent: navigator.userAgent.substring(0, 100) // Truncated for privacy
    };

    await chrome.storage.sync.set({ consent });
    this.currentConsent = consent;

    // Create audit trail entry
    await this.createAuditEntry('consent_given', consent);

    return consent;
  }

  /**
   * Withdraw consent (user can revoke at any time)
   */
  async withdrawConsent(): Promise<void> {
    if (this.currentConsent) {
      const withdrawalData: ConsentData = {
        ...this.currentConsent,
        analyticsConsent: false,
        performanceConsent: false,
        abTestingConsent: false,
        consentTimestamp: Date.now()
      };

      await chrome.storage.sync.set({ consent: withdrawalData });
      this.currentConsent = withdrawalData;

      // Create audit trail entry
      await this.createAuditEntry('consent_withdrawn', withdrawalData);

      // Clear all analytics data
      await this.clearAnalyticsData();
    }
  }

  /**
   * Update specific consent preferences
   */
  async updateConsent(updates: Partial<ConsentData>): Promise<ConsentData> {
    if (!this.currentConsent) {
      throw new Error('No existing consent found');
    }

    const updatedConsent: ConsentData = {
      ...this.currentConsent,
      ...updates,
      consentTimestamp: Date.now(),
      consentVersion: this.CONSENT_VERSION
    };

    await chrome.storage.sync.set({ consent: updatedConsent });
    this.currentConsent = updatedConsent;

    // Create audit trail entry
    await this.createAuditEntry('consent_updated', updatedConsent);

    return updatedConsent;
  }

  /**
   * Get current consent status
   */
  async getConsent(): Promise<ConsentData | null> {
    if (!this.currentConsent) {
      this.currentConsent = await this.getStoredConsent();
    }
    return this.currentConsent;
  }

  /**
   * Check if user has given consent for specific feature
   */
  async hasConsent(feature: 'analytics' | 'performance' | 'abTesting'): Promise<boolean> {
    const consent = await this.getConsent();
    if (!consent) return false;

    switch (feature) {
      case 'analytics':
        return consent.analyticsConsent;
      case 'performance':
        return consent.performanceConsent;
      case 'abTesting':
        return consent.abTestingConsent;
      default:
        return false;
    }
  }

  /**
   * Get consent summary for transparency
   */
  async getConsentSummary(): Promise<any> {
    const consent = await this.getConsent();
    if (!consent) {
      return {
        hasGivenConsent: false,
        consentDate: null,
        permissions: {
          analytics: false,
          performance: false,
          abTesting: false
        }
      };
    }

    return {
      hasGivenConsent: true,
      consentDate: new Date(consent.consentTimestamp).toISOString(),
      consentVersion: consent.consentVersion,
      permissions: {
        analytics: consent.analyticsConsent,
        performance: consent.performanceConsent,
        abTesting: consent.abTestingConsent
      },
      dataRetention: await this.getDataRetentionInfo(),
      userRights: this.getUserRights()
    };
  }

  /**
   * Generate consent modal content with clear explanations
   */
  getConsentModalContent(): any {
    return {
      title: 'Privacy & Analytics Consent',
      introduction: 'We respect your privacy. Please choose what data you\'re comfortable sharing to help us improve TruthLens.',
      sections: [
        {
          id: 'analytics',
          title: 'Usage Analytics',
          description: 'Help us understand how you use TruthLens to improve features and user experience.',
          details: [
            'Page visits and feature usage (anonymized)',
            'Error reports to fix bugs faster',
            'Aggregated usage patterns (no personal data)',
            'All data is processed locally first'
          ],
          required: false,
          defaultValue: false
        },
        {
          id: 'performance',
          title: 'Performance Monitoring',
          description: 'Monitor extension performance to ensure fast, reliable operation.',
          details: [
            'Response times and memory usage',
            'Extension performance metrics',
            'System compatibility data',
            'No personal browsing data collected'
          ],
          required: false,
          defaultValue: false
        },
        {
          id: 'abTesting',
          title: 'Feature Testing',
          description: 'Participate in tests of new features to help us build better tools.',
          details: [
            'Random assignment to feature variants',
            'Effectiveness measurements',
            'User interaction patterns',
            'Can be disabled at any time'
          ],
          required: false,
          defaultValue: false
        }
      ],
      footer: {
        privacyPolicy: 'Read our full Privacy Policy',
        dataRights: 'Learn about your data rights',
        contact: 'Contact us about privacy concerns'
      }
    };
  }

  /**
   * Check if consent is current (not expired)
   */
  private isConsentCurrent(consent: ConsentData): boolean {
    const consentAge = Date.now() - consent.consentTimestamp;
    const oneYear = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds

    return consentAge < oneYear && consent.consentVersion === this.CONSENT_VERSION;
  }

  /**
   * Get stored consent from storage
   */
  private async getStoredConsent(): Promise<ConsentData | null> {
    const result = await chrome.storage.sync.get('consent');
    return result.consent || null;
  }

  /**
   * Create audit trail entry for compliance
   */
  private async createAuditEntry(action: string, data: ConsentData): Promise<void> {
    const auditEntry = {
      action,
      timestamp: Date.now(),
      consentVersion: data.consentVersion,
      permissions: {
        analytics: data.analyticsConsent,
        performance: data.performanceConsent,
        abTesting: data.abTestingConsent
      }
    };

    // Store audit entries for compliance
    const auditKey = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await chrome.storage.sync.set({ [auditKey]: auditEntry });

    // Clean old audit entries (keep 2 years)
    await this.cleanOldAuditEntries();
  }

  /**
   * Clean old audit entries to prevent storage bloat
   */
  private async cleanOldAuditEntries(): Promise<void> {
    const items = await chrome.storage.sync.get();
    const twoYearsAgo = Date.now() - (2 * 365 * 24 * 60 * 60 * 1000);

    const keysToRemove = Object.keys(items).filter(key => {
      if (key.startsWith('audit_')) {
        const timestamp = parseInt(key.split('_')[1]);
        return timestamp < twoYearsAgo;
      }
      return false;
    });

    if (keysToRemove.length > 0) {
      await chrome.storage.sync.remove(keysToRemove);
    }
  }

  /**
   * Clear all analytics data when consent is withdrawn
   */
  private async clearAnalyticsData(): Promise<void> {
    const items = await chrome.storage.local.get();
    const analyticsKeys = Object.keys(items).filter(key =>
      key.startsWith('analytics_') || key.startsWith('performance_') || key.startsWith('business_')
    );

    if (analyticsKeys.length > 0) {
      await chrome.storage.local.remove(analyticsKeys);
    }
  }

  /**
   * Get data retention information
   */
  private async getDataRetentionInfo(): Promise<any> {
    const settings = await this.storage.getSettings();

    return {
      retentionPeriod: `${settings.privacy.cacheDuration} hours`,
      localProcessingOnly: settings.privacy.localProcessingOnly,
      automaticDeletion: true,
      dataLocation: 'Local device storage only'
    };
  }

  /**
   * Get user rights information
   */
  private getUserRights(): any {
    return {
      access: 'View all data we collect about you',
      rectification: 'Correct any inaccurate data',
      erasure: 'Delete all your data permanently',
      portability: 'Export your data in a readable format',
      objection: 'Object to specific data processing',
      withdrawal: 'Withdraw consent at any time'
    };
  }

  /**
   * Export user data for transparency/portability
   */
  async exportUserData(): Promise<any> {
    const consent = await this.getConsent();
    const settings = await this.storage.getSettings();
    const subscription = await this.storage.getSubscription();

    // Get all analytics data
    const analyticsData = await chrome.storage.local.get();
    const userAnalytics = Object.fromEntries(
      Object.entries(analyticsData).filter(([key]) =>
        key.startsWith('analytics_') || key.startsWith('performance_') || key.startsWith('business_')
      )
    );

    return {
      exportDate: new Date().toISOString(),
      consent,
      settings: {
        privacy: settings.privacy,
        theme: settings.theme,
        notifications: settings.notifications
      },
      subscription,
      analyticsData: userAnalytics,
      note: 'This export contains all data TruthLens has collected about you.'
    };
  }
}
