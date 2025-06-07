// Chrome Storage Service
// Handles all storage operations with type safety

import { UserSettings, CredibilityScore, UserSubscription, ConsentData, AnalyticsEvent } from '@shared/types';
import { PrivacyMetrics } from '../services/securityService';

export class StorageService {
  private defaultSettings: UserSettings = {
    enabled: true,
    showVisualIndicators: true,
    indicatorPosition: 'top-right',
    factCheckingLevel: 'standard',
    autoAnalyze: true,
    trustedDomains: [],
    blockedDomains: [],
    theme: 'auto',
    notifications: {
      enabled: true,
      lowCredibilityAlert: true,
      factCheckComplete: false,
    },
    privacy: {
      analyticsEnabled: false,
      localProcessingOnly: true,
      cacheDuration: 24, // hours
    },
  };

  async getSettings(): Promise<UserSettings> {
    const result = await chrome.storage.sync.get('settings');
    return result.settings || this.defaultSettings;
  }

  async updateSettings(settings: Partial<UserSettings>): Promise<void> {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    await chrome.storage.sync.set({ settings: updated });
  }

  async getCachedCredibility(url: string): Promise<CredibilityScore | null> {
    const key = `cache_${this.hashUrl(url)}`;
    const result = await chrome.storage.local.get(key);

    if (result[key]) {
      const cached = result[key];
      const settings = await this.getSettings();
      const maxAge = settings.privacy.cacheDuration * 60 * 60 * 1000; // Convert hours to ms

      if (Date.now() - cached.timestamp < maxAge) {
        return cached;
      } else {
        // Clean up expired cache
        await chrome.storage.local.remove(key);
      }
    }

    return null;
  }

  async cacheCredibility(url: string, credibility: CredibilityScore): Promise<void> {
    const key = `cache_${this.hashUrl(url)}`;
    await chrome.storage.local.set({ [key]: credibility });
  }

  async getSubscription(): Promise<UserSubscription> {
    const result = await chrome.storage.sync.get('subscription');
    return result.subscription || {
      tier: 'free',
      status: 'free_tier',
      features: ['basic_credibility', 'visual_indicators', 'limited_checks'],
      lastValidated: Date.now(),
      validationInterval: 30 * 24 * 60 * 60 * 1000, // 30 days
      gracePeriodDuration: 30 * 24 * 60 * 60 * 1000, // 30 days
    };
  }

  async clearCache(): Promise<void> {
    const items = await chrome.storage.local.get();
    const cacheKeys = Object.keys(items).filter(key => key.startsWith('cache_'));
    await chrome.storage.local.remove(cacheKeys);
  }

  private hashUrl(url: string): string {
    // Simple hash function for URL keys
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // Security and Privacy Extension Methods (2025 Compliance)

  /**
   * Store security events for audit trail
   */
  async storeSecurityEvent(event: string, metadata: any): Promise<void> {
    const securityEvent = {
      event,
      metadata,
      timestamp: Date.now(),
      id: crypto.randomUUID()
    };

    const key = `security_event_${securityEvent.id}`;
    await chrome.storage.local.set({ [key]: securityEvent });
  }

  /**
   * Clean up old security events
   */
  async cleanupSecurityEvents(cutoffTimestamp: number): Promise<void> {
    const items = await chrome.storage.local.get();
    const oldEventKeys = Object.keys(items).filter(key => {
      if (key.startsWith('security_event_')) {
        const event = items[key];
        return event.timestamp < cutoffTimestamp;
      }
      return false;
    });

    if (oldEventKeys.length > 0) {
      await chrome.storage.local.remove(oldEventKeys);
    }
  }

  /**
   * Store privacy metrics for GDPR compliance
   */
  async storePrivacyMetrics(metrics: PrivacyMetrics): Promise<void> {
    await chrome.storage.local.set({ privacy_metrics: metrics });
  }

  /**
   * Get privacy metrics
   */
  async getPrivacyMetrics(): Promise<PrivacyMetrics | null> {
    const result = await chrome.storage.local.get('privacy_metrics');
    return result.privacy_metrics || null;
  }

  /**
   * Update privacy metrics atomically
   */
  async updatePrivacyMetrics(updates: Partial<PrivacyMetrics>): Promise<void> {
    const current = await this.getPrivacyMetrics();
    if (current) {
      const updated = { ...current, ...updates, timestamp: Date.now() };
      await this.storePrivacyMetrics(updated);
    }
  }

  /**
   * Store user consent data
   */
  async storeConsentData(consent: ConsentData): Promise<void> {
    await chrome.storage.sync.set({ consent_data: consent });
  }

  /**
   * Get user consent data
   */
  async getConsentData(): Promise<ConsentData | null> {
    const result = await chrome.storage.sync.get('consent_data');
    return result.consent_data || null;
  }

  /**
   * Store compliance report
   */
  async storeComplianceReport(report: any): Promise<void> {
    const key = `compliance_report_${report.timestamp}`;
    await chrome.storage.local.set({ [key]: report });

    // Keep only last 30 reports
    await this.cleanupComplianceReports();
  }

  /**
   * Clean up old compliance reports
   */
  private async cleanupComplianceReports(): Promise<void> {
    const items = await chrome.storage.local.get();
    const reportKeys = Object.keys(items)
      .filter(key => key.startsWith('compliance_report_'))
      .map(key => ({
        key,
        timestamp: parseInt(key.replace('compliance_report_', ''))
      }))
      .sort((a, b) => b.timestamp - a.timestamp);

    if (reportKeys.length > 30) {
      const oldKeys = reportKeys.slice(30).map(r => r.key);
      await chrome.storage.local.remove(oldKeys);
    }
  }

  /**
   * Get latest compliance report
   */
  async getLatestComplianceReport(): Promise<any | null> {
    const items = await chrome.storage.local.get();
    const reportKeys = Object.keys(items)
      .filter(key => key.startsWith('compliance_report_'))
      .sort((a, b) => {
        const timestampA = parseInt(a.replace('compliance_report_', ''));
        const timestampB = parseInt(b.replace('compliance_report_', ''));
        return timestampB - timestampA;
      });

    if (reportKeys.length > 0) {
      return items[reportKeys[0]];
    }

    return null;
  }

  /**
   * Store AI processing metrics for AI Act compliance
   */
  async storeAIProcessingMetrics(metrics: {
    totalProcessingEvents: number;
    biasChecksPerformed: number;
    localProcessingEvents: number;
    remoteProcessingEvents: number;
    timestamp: number;
  }): Promise<void> {
    await chrome.storage.local.set({ ai_processing_metrics: metrics });
  }

  /**
   * Get AI processing metrics
   */
  async getAIProcessingMetrics(): Promise<{
    totalProcessingEvents: number;
    biasChecksPerformed: number;
    localProcessingEvents: number;
    remoteProcessingEvents: number;
    timestamp: number;
  }> {
    const result = await chrome.storage.local.get('ai_processing_metrics');
    return result.ai_processing_metrics || {
      totalProcessingEvents: 0,
      biasChecksPerformed: 0,
      localProcessingEvents: 0,
      remoteProcessingEvents: 0,
      timestamp: Date.now()
    };
  }

  /**
   * Update AI processing metrics
   */
  async updateAIProcessingMetrics(updates: {
    totalProcessingEvents?: number;
    biasChecksPerformed?: number;
    localProcessingEvents?: number;
    remoteProcessingEvents?: number;
  }): Promise<void> {
    const current = await this.getAIProcessingMetrics();
    const updated = {
      totalProcessingEvents: current.totalProcessingEvents + (updates.totalProcessingEvents || 0),
      biasChecksPerformed: current.biasChecksPerformed + (updates.biasChecksPerformed || 0),
      localProcessingEvents: current.localProcessingEvents + (updates.localProcessingEvents || 0),
      remoteProcessingEvents: current.remoteProcessingEvents + (updates.remoteProcessingEvents || 0),
      timestamp: Date.now()
    };

    await this.storeAIProcessingMetrics(updated);
  }

  /**
   * Store bias assessment results
   */
  async storeBiasAssessment(assessment: {
    timestamp: number;
    results: any;
    model: string;
    dataPoints: number;
  }): Promise<void> {
    await chrome.storage.local.set({ last_bias_assessment: assessment });
  }

  /**
   * Get last bias assessment
   */
  async getLastBiasAssessment(): Promise<{
    timestamp: number;
    results: any;
    model: string;
    dataPoints: number;
  } | null> {
    const result = await chrome.storage.local.get('last_bias_assessment');
    return result.last_bias_assessment || null;
  }

  /**
   * Clean up expired data based on retention period
   */
  async cleanupExpiredData(retentionPeriodMs: number): Promise<void> {
    const cutoff = Date.now() - retentionPeriodMs;

    // Clean up expired cache entries
    const items = await chrome.storage.local.get();
    const expiredKeys: string[] = [];

    Object.keys(items).forEach(key => {
      const item = items[key];
      if (item && item.timestamp && item.timestamp < cutoff) {
        // Only clean up items that have timestamps and are expired
        if (key.startsWith('cache_') || key.startsWith('security_event_')) {
          expiredKeys.push(key);
        }
      }
    });

    if (expiredKeys.length > 0) {
      await chrome.storage.local.remove(expiredKeys);
    }
  }

  /**
   * Clean up expired secure sessions
   */
  async cleanupExpiredSessions(sessionTimeoutMs: number): Promise<void> {
    const cutoff = Date.now() - sessionTimeoutMs;
    const items = await chrome.storage.session?.get() || {};

    const expiredSessionKeys = Object.keys(items).filter(key => {
      const session = items[key];
      return session && session.timestamp && session.timestamp < cutoff;
    });

    if (expiredSessionKeys.length > 0 && chrome.storage.session) {
      await chrome.storage.session.remove(expiredSessionKeys);
    }
  }

  /**
   * Export user data for GDPR compliance
   */
  async exportUserData(): Promise<{
    settings: UserSettings;
    subscription: UserSubscription;
    consent: ConsentData | null;
    privacyMetrics: PrivacyMetrics | null;
    aiMetrics: any;
    exportTimestamp: number;
  }> {
    const [settings, subscription, consent, privacyMetrics, aiMetrics] = await Promise.all([
      this.getSettings(),
      this.getSubscription(),
      this.getConsentData(),
      this.getPrivacyMetrics(),
      this.getAIProcessingMetrics()
    ]);

    return {
      settings,
      subscription,
      consent,
      privacyMetrics,
      aiMetrics,
      exportTimestamp: Date.now()
    };
  }

  /**
   * Delete all user data for GDPR "right to be forgotten"
   */
  async deleteAllUserData(): Promise<void> {
    // Clear all storage areas
    await Promise.all([
      chrome.storage.local.clear(),
      chrome.storage.sync.clear(),
      chrome.storage.session?.clear() || Promise.resolve()
    ]);

    // Log the deletion event
    const deletionEvent = {
      event: 'user_data_deleted',
      timestamp: Date.now(),
      metadata: { completeWipe: true }
    };

    // Store deletion event temporarily for audit
    await chrome.storage.local.set({
      data_deletion_event: deletionEvent
    });
  }

  /**
   * Store analytics events with privacy compliance
   */
  async storeAnalyticsEvent(event: AnalyticsEvent): Promise<void> {
    const consent = await this.getConsentData();

    // Only store if user has consented to analytics
    if (consent?.analyticsConsent) {
      const key = `analytics_${Date.now()}_${crypto.randomUUID()}`;
      await chrome.storage.local.set({ [key]: event });

      // Clean up old analytics events periodically
      await this.cleanupOldAnalyticsEvents();
    }
  }

  /**
   * Clean up old analytics events
   */
  private async cleanupOldAnalyticsEvents(): Promise<void> {
    const items = await chrome.storage.local.get();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    const cutoff = Date.now() - maxAge;

    const oldAnalyticsKeys = Object.keys(items).filter(key => {
      if (key.startsWith('analytics_')) {
        const timestamp = parseInt(key.split('_')[1]);
        return timestamp < cutoff;
      }
      return false;
    });

    if (oldAnalyticsKeys.length > 0) {
      await chrome.storage.local.remove(oldAnalyticsKeys);
    }
  }

  /**
   * Get storage usage statistics for monitoring
   */
  async getStorageStats(): Promise<{
    local: { bytesInUse: number; quota: number };
    sync: { bytesInUse: number; quota: number };
    session?: { bytesInUse: number };
  }> {
    const [localStats, syncStats, sessionStats] = await Promise.all([
      chrome.storage.local.getBytesInUse(),
      chrome.storage.sync.getBytesInUse(),
      chrome.storage.session?.getBytesInUse?.() || Promise.resolve(0)
    ]);

    return {
      local: {
        bytesInUse: localStats,
        quota: chrome.storage.local.QUOTA_BYTES || 5242880 // 5MB default
      },
      sync: {
        bytesInUse: syncStats,
        quota: chrome.storage.sync.QUOTA_BYTES || 102400 // 100KB default
      },
      session: {
        bytesInUse: sessionStats
      }
    };
  }

  // Generic Storage Methods (2025 TypeScript Best Practices)

  /**
   * Generic get method with type safety
   */
  async get<T = any>(key: string, area: 'local' | 'sync' | 'session' = 'local'): Promise<T | null> {
    try {
      const storage = area === 'sync' ? chrome.storage.sync :
                    area === 'session' ? chrome.storage.session :
                    chrome.storage.local;

      if (!storage) {
        throw new Error(`Storage area '${area}' not available`);
      }

      const result = await storage.get(key);
      return result[key] || null;
    } catch (error) {
      console.error(`Failed to get ${key} from ${area} storage:`, error);
      return null;
    }
  }

  /**
   * Generic set method with type safety
   */
  async set<T = any>(key: string, value: T, area: 'local' | 'sync' | 'session' = 'local'): Promise<void> {
    try {
      const storage = area === 'sync' ? chrome.storage.sync :
                    area === 'session' ? chrome.storage.session :
                    chrome.storage.local;

      if (!storage) {
        throw new Error(`Storage area '${area}' not available`);
      }

      await storage.set({ [key]: value });
    } catch (error) {
      console.error(`Failed to set ${key} in ${area} storage:`, error);
      throw error;
    }
  }

  /**
   * Get multiple keys at once
   */
  async getMultiple<T = Record<string, any>>(keys: string[], area: 'local' | 'sync' | 'session' = 'local'): Promise<T> {
    try {
      const storage = area === 'sync' ? chrome.storage.sync :
                    area === 'session' ? chrome.storage.session :
                    chrome.storage.local;

      if (!storage) {
        throw new Error(`Storage area '${area}' not available`);
      }

      const result = await storage.get(keys);
      return result as T;
    } catch (error) {
      console.error(`Failed to get multiple keys from ${area} storage:`, error);
      return {} as T;
    }
  }

  /**
   * Set multiple key-value pairs at once
   */
  async setMultiple(items: Record<string, any>, area: 'local' | 'sync' | 'session' = 'local'): Promise<void> {
    try {
      const storage = area === 'sync' ? chrome.storage.sync :
                    area === 'session' ? chrome.storage.session :
                    chrome.storage.local;

      if (!storage) {
        throw new Error(`Storage area '${area}' not available`);
      }

      await storage.set(items);
    } catch (error) {
      console.error(`Failed to set multiple items in ${area} storage:`, error);
      throw error;
    }
  }

  /**
   * Remove a key from storage
   */
  async remove(key: string | string[], area: 'local' | 'sync' | 'session' = 'local'): Promise<void> {
    try {
      const storage = area === 'sync' ? chrome.storage.sync :
                    area === 'session' ? chrome.storage.session :
                    chrome.storage.local;

      if (!storage) {
        throw new Error(`Storage area '${area}' not available`);
      }

      await storage.remove(key);
    } catch (error) {
      console.error(`Failed to remove ${key} from ${area} storage:`, error);
      throw error;
    }
  }

  /**
   * Get recent credibility analyses for bias assessment
   */
  async getRecentCredibilityAnalyses(limit: number = 100): Promise<CredibilityScore[]> {
    try {
      const items = await chrome.storage.local.get();
      const credibilityKeys = Object.keys(items)
        .filter(key => key.startsWith('cache_'))
        .map(key => ({ key, data: items[key] as CredibilityScore }))
        .filter(item => item.data && typeof item.data.timestamp === 'number')
        .sort((a, b) => b.data.timestamp - a.data.timestamp)
        .slice(0, limit);

      return credibilityKeys.map(item => item.data);
    } catch (error) {
      console.error('Failed to get recent credibility analyses:', error);
      return [];
    }
  }

  // Additional Security and Compliance Methods for 2025

  /**
   * Store vulnerability assessment results
   */
  async storeVulnerabilityAssessment(assessment: any): Promise<void> {
    try {
      const key = `vulnerability_assessment_${assessment.timestamp || Date.now()}`;
      await chrome.storage.local.set({ [key]: assessment });

      // Keep only the latest 10 assessments
      await this.cleanupVulnerabilityAssessments();
    } catch (error) {
      console.error('Failed to store vulnerability assessment:', error);
      throw error;
    }
  }

  /**
   * Clean up old vulnerability assessments
   */
  private async cleanupVulnerabilityAssessments(): Promise<void> {
    try {
      const items = await chrome.storage.local.get();
      const assessmentKeys = Object.keys(items)
        .filter(key => key.startsWith('vulnerability_assessment_'))
        .map(key => ({
          key,
          timestamp: parseInt(key.replace('vulnerability_assessment_', ''))
        }))
        .sort((a, b) => b.timestamp - a.timestamp);

      if (assessmentKeys.length > 10) {
        const oldKeys = assessmentKeys.slice(10).map(a => a.key);
        await chrome.storage.local.remove(oldKeys);
      }
    } catch (error) {
      console.error('Failed to cleanup vulnerability assessments:', error);
    }
  }

  /**
   * Store cross-jurisdictional compliance report
   */
  async storeCrossJurisdictionalComplianceReport(report: any): Promise<void> {
    try {
      const key = `cross_jurisdictional_compliance_${report.timestamp || Date.now()}`;
      await chrome.storage.local.set({ [key]: report });

      // Keep only the latest 20 reports
      await this.cleanupCrossJurisdictionalReports();
    } catch (error) {
      console.error('Failed to store cross-jurisdictional compliance report:', error);
      throw error;
    }
  }

  /**
   * Clean up old cross-jurisdictional compliance reports
   */
  private async cleanupCrossJurisdictionalReports(): Promise<void> {
    try {
      const items = await chrome.storage.local.get();
      const reportKeys = Object.keys(items)
        .filter(key => key.startsWith('cross_jurisdictional_compliance_'))
        .map(key => ({
          key,
          timestamp: parseInt(key.replace('cross_jurisdictional_compliance_', ''))
        }))
        .sort((a, b) => b.timestamp - a.timestamp);

      if (reportKeys.length > 20) {
        const oldKeys = reportKeys.slice(20).map(r => r.key);
        await chrome.storage.local.remove(oldKeys);
      }
    } catch (error) {
      console.error('Failed to cleanup cross-jurisdictional reports:', error);
    }
  }

  /**
   * Store CCPA compliance report
   */
  async storeCCPAComplianceReport(report: any): Promise<void> {
    try {
      const key = `ccpa_compliance_${report.timestamp || Date.now()}`;
      await chrome.storage.local.set({ [key]: report });

      // Keep only the latest 20 reports
      await this.cleanupCCPAReports();
    } catch (error) {
      console.error('Failed to store CCPA compliance report:', error);
      throw error;
    }
  }

  /**
   * Get latest CCPA compliance report
   */
  async getLatestCCPAComplianceReport(): Promise<any | null> {
    try {
      const items = await chrome.storage.local.get();
      const reportKeys = Object.keys(items)
        .filter(key => key.startsWith('ccpa_compliance_'))
        .sort((a, b) => {
          const timestampA = parseInt(a.replace('ccpa_compliance_', ''));
          const timestampB = parseInt(b.replace('ccpa_compliance_', ''));
          return timestampB - timestampA;
        });

      if (reportKeys.length > 0) {
        return items[reportKeys[0]];
      }

      return null;
    } catch (error) {
      console.error('Failed to get latest CCPA compliance report:', error);
      return null;
    }
  }

  /**
   * Clean up old CCPA compliance reports
   */
  private async cleanupCCPAReports(): Promise<void> {
    try {
      const items = await chrome.storage.local.get();
      const reportKeys = Object.keys(items)
        .filter(key => key.startsWith('ccpa_compliance_'))
        .map(key => ({
          key,
          timestamp: parseInt(key.replace('ccpa_compliance_', ''))
        }))
        .sort((a, b) => b.timestamp - a.timestamp);

      if (reportKeys.length > 20) {
        const oldKeys = reportKeys.slice(20).map(r => r.key);
        await chrome.storage.local.remove(oldKeys);
      }
    } catch (error) {
      console.error('Failed to cleanup CCPA reports:', error);
    }
  }

  /**
   * Get last breach response test
   */
  async getLastBreachResponseTest(): Promise<{ timestamp: number } | null> {
    try {
      const result = await chrome.storage.local.get('last_breach_response_test');
      return result.last_breach_response_test || null;
    } catch (error) {
      console.error('Failed to get last breach response test:', error);
      return null;
    }
  }

  /**
   * Store breach response test result
   */
  async storeBreachResponseTest(test: { timestamp: number; results: any }): Promise<void> {
    try {
      await chrome.storage.local.set({ last_breach_response_test: test });
    } catch (error) {
      console.error('Failed to store breach response test:', error);
      throw error;
    }
  }

  /**
   * Store jurisdiction identification data
   */
  async storeJurisdictionData(data: {
    detectedJurisdictions: string[];
    userLocation?: string;
    timestamp: number
  }): Promise<void> {
    try {
      await chrome.storage.local.set({ jurisdiction_data: data });
    } catch (error) {
      console.error('Failed to store jurisdiction data:', error);
      throw error;
    }
  }

  /**
   * Get jurisdiction data
   */
  async getJurisdictionData(): Promise<{
    detectedJurisdictions: string[];
    userLocation?: string;
    timestamp: number;
  } | null> {
    try {
      const result = await chrome.storage.local.get('jurisdiction_data');
      return result.jurisdiction_data || null;
    } catch (error) {
      console.error('Failed to get jurisdiction data:', error);
      return null;
    }
  }

  /**
   * Store GDPR assessment result
   */
  async storeGDPRAssessment(assessment: any): Promise<void> {
    try {
      await chrome.storage.local.set({ latest_gdpr_assessment: assessment });
    } catch (error) {
      console.error('Failed to store GDPR assessment:', error);
      throw error;
    }
  }

  /**
   * Get latest GDPR assessment
   */
  async getLatestGDPRAssessment(): Promise<any | null> {
    try {
      const result = await chrome.storage.local.get('latest_gdpr_assessment');
      return result.latest_gdpr_assessment || null;
    } catch (error) {
      console.error('Failed to get latest GDPR assessment:', error);
      return null;
    }
  }

  /**
   * Store UK GDPR assessment result
   */
  async storeUKGDPRAssessment(assessment: any): Promise<void> {
    try {
      await chrome.storage.local.set({ latest_uk_gdpr_assessment: assessment });
    } catch (error) {
      console.error('Failed to store UK GDPR assessment:', error);
      throw error;
    }
  }

  /**
   * Store PIPEDA assessment result
   */
  async storePIPEDAAssessment(assessment: any): Promise<void> {
    try {
      await chrome.storage.local.set({ latest_pipeda_assessment: assessment });
    } catch (error) {
      console.error('Failed to store PIPEDA assessment:', error);
      throw error;
    }
  }

  /**
   * Store LGPD assessment result
   */
  async storeLGPDAssessment(assessment: any): Promise<void> {
    try {
      await chrome.storage.local.set({ latest_lgpd_assessment: assessment });
    } catch (error) {
      console.error('Failed to store LGPD assessment:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();
export default StorageService;
