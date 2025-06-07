/**
 * User Consent Manager - 2025 Privacy-Compliant Implementation
 * Manages user consent for external API usage with GDPR compliance
 */

export interface ConsentData {
  externalApiEnabled: boolean;
  consentTimestamp: number;
  consentVersion: string;
  dataRetentionDays: number;
  allowDomainSharing: boolean;
  allowCaching: boolean;
  ipAddress?: string; // Hashed for privacy
  userAgent?: string; // Anonymized
}

export interface ConsentRequest {
  purpose: string;
  dataTypes: string[];
  retentionPeriod: number;
  thirdParties: string[];
  userRights: string[];
}

export interface ConsentResponse {
  granted: boolean;
  timestamp: number;
  version: string;
  scope: string[];
  expiresAt: number;
}

/**
 * Privacy-compliant consent manager for external fact-checking APIs
 */
export class ConsentManager {
  private static readonly CURRENT_VERSION = '1.0';
  private static readonly DEFAULT_RETENTION_DAYS = 7;
  private static readonly CONSENT_EXPIRY_DAYS = 365; // 1 year

  /**
   * Request user consent for external API usage
   */
  public static async requestConsent(request: ConsentRequest): Promise<ConsentResponse> {
    try {
      // Check if consent is already granted and valid
      const existing = await this.getStoredConsent();
      if (existing && this.isConsentValid(existing)) {
        return {
          granted: true,
          timestamp: existing.consentTimestamp,
          version: existing.consentVersion,
          scope: ['external-apis', 'domain-sharing', 'caching'],
          expiresAt: existing.consentTimestamp + (this.CONSENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
        };
      }

      // Present consent request to user (would be UI in real implementation)
      const userResponse = await this.presentConsentRequest(request);

      if (userResponse.granted) {
        await this.storeConsent({
          externalApiEnabled: true,
          consentTimestamp: Date.now(),
          consentVersion: this.CURRENT_VERSION,
          dataRetentionDays: request.retentionPeriod || this.DEFAULT_RETENTION_DAYS,
          allowDomainSharing: true,
          allowCaching: true
        });
      }

      return userResponse;
    } catch (error) {
      console.error('Error requesting consent:', error);
      return {
        granted: false,
        timestamp: Date.now(),
        version: this.CURRENT_VERSION,
        scope: [],
        expiresAt: 0
      };
    }
  }

  /**
   * Check if user has granted consent for external API usage
   */
  public static async hasValidConsent(): Promise<boolean> {
    try {
      const consent = await this.getStoredConsent();
      return consent ? this.isConsentValid(consent) : false;
    } catch (error) {
      console.error('Error checking consent:', error);
      return false;
    }
  }

  /**
   * Revoke user consent and clean up data
   */
  public static async revokeConsent(): Promise<void> {
    try {
      // Remove consent data
      await chrome.storage.local.remove(['factcheck_consent']);

      // Clean up cached external API data
      await this.cleanupExternalData();

      console.info('User consent revoked and data cleaned up');
    } catch (error) {
      console.error('Error revoking consent:', error);
    }
  }

  /**
   * Update consent preferences
   */
  public static async updateConsent(updates: Partial<ConsentData>): Promise<void> {
    try {
      const existing = await this.getStoredConsent();
      if (!existing) {
        throw new Error('No existing consent to update');
      }

      const updated: ConsentData = {
        ...existing,
        ...updates,
        consentTimestamp: Date.now() // Update timestamp when preferences change
      };

      await this.storeConsent(updated);
      console.info('Consent preferences updated');
    } catch (error) {
      console.error('Error updating consent:', error);
    }
  }

  /**
   * Get current consent status and details
   */
  public static async getConsentStatus(): Promise<{
    hasConsent: boolean;
    consentData?: ConsentData;
    isExpired: boolean;
    expiresAt?: number;
    dataRetentionDays: number;
  }> {
    try {
      const consent = await this.getStoredConsent();

      if (!consent) {
        return {
          hasConsent: false,
          isExpired: false,
          dataRetentionDays: this.DEFAULT_RETENTION_DAYS
        };
      }

      const isValid = this.isConsentValid(consent);
      const expiresAt = consent.consentTimestamp + (this.CONSENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

      return {
        hasConsent: isValid,
        consentData: consent,
        isExpired: !isValid,
        expiresAt,
        dataRetentionDays: consent.dataRetentionDays
      };
    } catch (error) {
      console.error('Error getting consent status:', error);
      return {
        hasConsent: false,
        isExpired: false,
        dataRetentionDays: this.DEFAULT_RETENTION_DAYS
      };
    }
  }

  /**
   * Export user data for GDPR compliance
   */
  public static async exportUserData(): Promise<{
    consent: ConsentData | null;
    cachedData: any[];
    exportTimestamp: number;
  }> {
    try {
      const consent = await this.getStoredConsent();
      const cachedData = await this.getExternalApiCache();

      return {
        consent,
        cachedData,
        exportTimestamp: Date.now()
      };
    } catch (error) {
      console.error('Error exporting user data:', error);
      return {
        consent: null,
        cachedData: [],
        exportTimestamp: Date.now()
      };
    }
  }

  /**
   * Delete all user data for GDPR compliance
   */
  public static async deleteAllUserData(): Promise<void> {
    try {
      // Remove consent
      await chrome.storage.local.remove(['factcheck_consent']);

      // Remove all external API cache data
      await this.cleanupExternalData();

      // Remove any other related data
      const storage = await chrome.storage.local.get();
      const keysToRemove = Object.keys(storage).filter(key =>
        key.startsWith('external_') ||
        key.startsWith('factcheck_') ||
        key.startsWith('api_')
      );

      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
      }

      console.info('All user data deleted for GDPR compliance');
    } catch (error) {
      console.error('Error deleting user data:', error);
    }
  }

  /**
   * Present consent request to user (mock implementation)
   */
  private static async presentConsentRequest(request: ConsentRequest): Promise<ConsentResponse> {
    // In real implementation, this would show a UI dialog
    // For now, return a mock positive response for testing
    console.info('Consent request presented to user:', request);

    // Mock user consent - in real implementation this would be user interaction
    const granted = true; // This would come from actual user input

    return {
      granted,
      timestamp: Date.now(),
      version: this.CURRENT_VERSION,
      scope: granted ? ['external-apis', 'domain-sharing', 'caching'] : [],
      expiresAt: granted ? Date.now() + (this.CONSENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000) : 0
    };
  }

  /**
   * Store consent data
   */
  private static async storeConsent(consent: ConsentData): Promise<void> {
    await chrome.storage.local.set({ factcheck_consent: consent });
  }

  /**
   * Get stored consent data
   */
  private static async getStoredConsent(): Promise<ConsentData | null> {
    const result = await chrome.storage.local.get(['factcheck_consent']);
    return result.factcheck_consent || null;
  }

  /**
   * Check if consent is valid and not expired
   */
  private static isConsentValid(consent: ConsentData): boolean {
    if (!consent.externalApiEnabled) {
      return false;
    }

    // Check version compatibility
    if (consent.consentVersion !== this.CURRENT_VERSION) {
      return false;
    }

    // Check if consent has expired
    const expiryTime = consent.consentTimestamp + (this.CONSENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    if (Date.now() > expiryTime) {
      return false;
    }

    return true;
  }

  /**
   * Clean up external API data
   */
  private static async cleanupExternalData(): Promise<void> {
    const storage = await chrome.storage.local.get();
    const keysToRemove = Object.keys(storage).filter(key =>
      key.startsWith('external_factcheck:')
    );

    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
    }
  }

  /**
   * Get external API cache data for export
   */
  private static async getExternalApiCache(): Promise<any[]> {
    const storage = await chrome.storage.local.get();
    const cacheData: any[] = [];

    Object.entries(storage).forEach(([key, value]) => {
      if (key.startsWith('external_factcheck:')) {
        cacheData.push({
          key,
          data: value,
          type: 'external_api_cache'
        });
      }
    });

    return cacheData;
  }

  /**
   * Schedule automatic data cleanup based on retention period
   */
  public static async scheduleDataCleanup(): Promise<void> {
    const consent = await this.getStoredConsent();
    if (!consent) return;

    // Clean up data older than retention period
    const cutoffTime = Date.now() - (consent.dataRetentionDays * 24 * 60 * 60 * 1000);
    const storage = await chrome.storage.local.get();
    const keysToRemove: string[] = [];

    Object.entries(storage).forEach(([key, value]: [string, any]) => {
      if (key.startsWith('external_factcheck:') && value.timestamp && value.timestamp < cutoffTime) {
        keysToRemove.push(key);
      }
    });

    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
      console.info(`Cleaned up ${keysToRemove.length} expired cache entries`);
    }
  }
}

/**
 * Default consent request for fact-checking APIs
 */
export const DEFAULT_CONSENT_REQUEST: ConsentRequest = {
  purpose: 'Enhanced fact-checking using external APIs',
  dataTypes: ['domain names', 'website URLs (domain only)', 'fact-check results'],
  retentionPeriod: 7, // days
  thirdParties: ['Google Fact Check Tools API'],
  userRights: [
    'Right to withdraw consent',
    'Right to data export',
    'Right to data deletion',
    'Right to modify retention period'
  ]
};
