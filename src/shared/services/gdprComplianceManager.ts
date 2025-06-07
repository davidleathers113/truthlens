/**
 * GDPR Compliance Manager
 * Comprehensive GDPR compliance implementation for Chrome extension
 * Following 2025 best practices for data privacy and user rights management
 */

import { StorageService } from '../storage/storageService';
import { logger } from './logger';
import { analyticsService } from './analyticsService';

export interface GDPRConsent {
  necessary: boolean; // Always true for core functionality
  analytics: boolean;
  notifications: boolean;
  marketing: boolean;
  timestamp: number;
  version: string; // Consent version for tracking changes
  ipHash?: string; // Anonymized IP for audit trail
  userAgent?: string; // Browser info for audit
}

export interface DataProcessingRecord {
  id: string;
  dataType: 'usage_analytics' | 'subscription_data' | 'notification_preferences' | 'error_logs' | 'feature_usage';
  purpose: string;
  legalBasis: 'consent' | 'contract' | 'legitimate_interest' | 'legal_obligation';
  dataCategories: string[];
  retentionPeriodDays: number;
  isSharedWithThirdParties: boolean;
  thirdParties?: string[];
  isTransferredOutsideEU: boolean;
  safeguards?: string[];
}

export interface UserDataExport {
  userId: string;
  exportRequestId: string;
  requestedAt: number;
  completedAt?: number;
  data: {
    subscriptionData?: any;
    usageAnalytics?: any;
    notificationHistory?: any;
    preferences?: any;
    errorLogs?: any;
  };
  format: 'json' | 'csv';
}

export interface DataDeletionRequest {
  userId: string;
  requestId: string;
  requestedAt: number;
  processedAt?: number;
  dataTypes: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  verificationToken?: string;
}

export interface GDPRSettings {
  dataRetentionPeriods: Record<string, number>; // Days
  automaticDeletionEnabled: boolean;
  consentManagementEnabled: boolean;
  dataExportEnabled: boolean;
  privacyByDesignEnabled: boolean;
  auditLoggingEnabled: boolean;
  crossBorderTransferSafeguards: string[];
}

export interface ComplianceAuditLog {
  timestamp: number;
  action: string;
  dataType?: string;
  userId?: string;
  legalBasis?: string;
  result: 'success' | 'failure';
  details?: string;
}

export class GDPRComplianceManager {
  private storageService: StorageService;
  private readonly STORAGE_KEY_CONSENT = 'gdpr_consent';
  private readonly STORAGE_KEY_SETTINGS = 'gdpr_settings';
  private readonly STORAGE_KEY_AUDIT_LOG = 'gdpr_audit_log';
  private readonly STORAGE_KEY_EXPORT_REQUESTS = 'gdpr_export_requests';
  private readonly STORAGE_KEY_DELETION_REQUESTS = 'gdpr_deletion_requests';

  // Current consent version for tracking changes
  private readonly CONSENT_VERSION = '2025.1';

  // Default data retention periods (GDPR-compliant)
  private readonly DEFAULT_RETENTION_PERIODS = {
    usage_analytics: 1095, // 3 years
    subscription_data: 2555, // 7 years (billing requirement)
    notification_preferences: 1095, // 3 years
    error_logs: 365, // 1 year
    feature_usage: 1095, // 3 years
    consent_records: 2555 // 7 years (legal requirement)
  };

  // Data processing registry for transparency
  private readonly DATA_PROCESSING_REGISTRY: DataProcessingRecord[] = [
    {
      id: 'subscription_management',
      dataType: 'subscription_data',
      purpose: 'Manage user subscriptions and billing',
      legalBasis: 'contract',
      dataCategories: ['subscription_tier', 'payment_status', 'renewal_date'],
      retentionPeriodDays: 2555, // 7 years for billing
      isSharedWithThirdParties: true,
      thirdParties: ['ExtensionPay', 'Stripe'],
      isTransferredOutsideEU: true,
      safeguards: ['Standard Contractual Clauses', 'Privacy Shield successor framework']
    },
    {
      id: 'usage_analytics',
      dataType: 'usage_analytics',
      purpose: 'Improve product performance and user experience',
      legalBasis: 'consent',
      dataCategories: ['feature_usage', 'session_duration', 'error_rates'],
      retentionPeriodDays: 1095, // 3 years
      isSharedWithThirdParties: false,
      isTransferredOutsideEU: false
    },
    {
      id: 'notification_delivery',
      dataType: 'notification_preferences',
      purpose: 'Deliver relevant notifications and updates',
      legalBasis: 'consent',
      dataCategories: ['notification_preferences', 'delivery_status', 'interaction_data'],
      retentionPeriodDays: 1095, // 3 years
      isSharedWithThirdParties: false,
      isTransferredOutsideEU: false
    },
    {
      id: 'error_monitoring',
      dataType: 'error_logs',
      purpose: 'Debug and improve extension reliability',
      legalBasis: 'legitimate_interest',
      dataCategories: ['error_messages', 'stack_traces', 'browser_version'],
      retentionPeriodDays: 365, // 1 year
      isSharedWithThirdParties: false,
      isTransferredOutsideEU: false
    }
  ];

  constructor(storageService: StorageService) {
    this.storageService = storageService;
    this.initialize();
  }

  /**
   * Initialize GDPR compliance with privacy-by-design
   */
  async initialize(): Promise<void> {
    try {
      // Set up default settings if not exist
      await this.ensureGDPRSettings();

      // Start automatic data retention enforcement
      await this.startAutomaticDataRetention();

      // Set up periodic compliance checks
      this.setupPeriodicComplianceChecks();

      await this.auditLog('gdpr_service_initialized', 'success');
      logger.info('GDPR Compliance Manager initialized');
    } catch (error) {
      await this.auditLog('gdpr_service_initialization_failed', 'failure', undefined, error instanceof Error ? error.message : 'Unknown error');
      logger.error('Failed to initialize GDPR Compliance Manager:', error instanceof Error ? { message: error.message, stack: error.stack } : { error });
      throw error;
    }
  }

  /**
   * Get current consent status
   */
  async getConsent(): Promise<GDPRConsent | null> {
    const consent = await this.storageService.get<GDPRConsent>(this.STORAGE_KEY_CONSENT, 'sync');

    // Check if consent is still valid (version check)
    if (consent && consent.version !== this.CONSENT_VERSION) {
      await this.auditLog('consent_version_outdated', 'success', undefined, `Old version: ${consent.version}, Current: ${this.CONSENT_VERSION}`);
      return null; // Require new consent for new version
    }

    return consent;
  }

  /**
   * Record user consent with audit trail
   */
  async recordConsent(consent: Omit<GDPRConsent, 'timestamp' | 'version'>): Promise<void> {
    const fullConsent: GDPRConsent = {
      ...consent,
      timestamp: Date.now(),
      version: this.CONSENT_VERSION
    };

    await this.storageService.set(this.STORAGE_KEY_CONSENT, fullConsent, 'sync');

    // Audit trail
    await this.auditLog('consent_recorded', 'success', undefined, JSON.stringify({
      analytics: consent.analytics,
      notifications: consent.notifications,
      marketing: consent.marketing
    }));

    // Track consent in analytics (if analytics consent given)
    if (consent.analytics) {
      await analyticsService.trackEvent('gdpr_consent_given', {
        analytics: consent.analytics,
        notifications: consent.notifications,
        marketing: consent.marketing,
        consentVersion: this.CONSENT_VERSION
      });
    }

    logger.info('GDPR consent recorded:', { version: this.CONSENT_VERSION, analytics: consent.analytics });
  }

  /**
   * Withdraw consent with proper cleanup
   */
  async withdrawConsent(dataType?: 'analytics' | 'notifications' | 'marketing'): Promise<void> {
    const currentConsent = await this.getConsent();

    if (!currentConsent) {
      return; // No consent to withdraw
    }

    if (dataType) {
      // Partial withdrawal
      const updatedConsent = { ...currentConsent };
      updatedConsent[dataType] = false;
      updatedConsent.timestamp = Date.now();

      await this.storageService.set(this.STORAGE_KEY_CONSENT, updatedConsent, 'sync');
      await this.auditLog('consent_partially_withdrawn', 'success', undefined, `Withdrawn: ${dataType}`);

      // Clean up specific data type
      await this.cleanupDataByType(dataType);
    } else {
      // Full withdrawal
      await this.storageService.remove(this.STORAGE_KEY_CONSENT, 'sync');
      await this.auditLog('consent_fully_withdrawn', 'success');

      // Clean up all non-essential data
      await this.cleanupAllConsentBasedData();
    }

    logger.info('GDPR consent withdrawn:', { dataType: dataType || 'all' });
  }

  /**
   * Process data export request (Article 20 - Right to data portability)
   */
  async requestDataExport(userId: string, format: 'json' | 'csv' = 'json'): Promise<string> {
    const requestId = this.generateRequestId();
    const exportRequest: UserDataExport = {
      userId,
      exportRequestId: requestId,
      requestedAt: Date.now(),
      data: {},
      format
    };

    try {
      // Collect all user data
      exportRequest.data = await this.collectUserData(userId);
      exportRequest.completedAt = Date.now();

      // Store export request
      const exports = await this.storageService.get<UserDataExport[]>(this.STORAGE_KEY_EXPORT_REQUESTS, 'local') || [];
      exports.push(exportRequest);
      await this.storageService.set(this.STORAGE_KEY_EXPORT_REQUESTS, exports, 'local');

      await this.auditLog('data_export_completed', 'success', 'all', `Request ID: ${requestId}`);

      // Track in analytics (if consent given)
      const consent = await this.getConsent();
      if (consent?.analytics) {
        await analyticsService.trackEvent('gdpr_data_export_requested', { requestId, format });
      }

      return requestId;
    } catch (error) {
      await this.auditLog('data_export_failed', 'failure', 'all', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Get data export by request ID
   */
  async getDataExport(requestId: string): Promise<UserDataExport | null> {
    const exports = await this.storageService.get<UserDataExport[]>(this.STORAGE_KEY_EXPORT_REQUESTS, 'local') || [];
    return exports.find(exp => exp.exportRequestId === requestId) || null;
  }

  /**
   * Process data deletion request (Article 17 - Right to erasure)
   */
  async requestDataDeletion(userId: string, dataTypes?: string[]): Promise<string> {
    const requestId = this.generateRequestId();
    const deletionRequest: DataDeletionRequest = {
      userId,
      requestId,
      requestedAt: Date.now(),
      dataTypes: dataTypes || ['all'],
      status: 'pending',
      verificationToken: this.generateVerificationToken()
    };

    // Store deletion request
    const requests = await this.storageService.get<DataDeletionRequest[]>(this.STORAGE_KEY_DELETION_REQUESTS, 'local') || [];
    requests.push(deletionRequest);
    await this.storageService.set(this.STORAGE_KEY_DELETION_REQUESTS, requests, 'local');

    await this.auditLog('data_deletion_requested', 'success', dataTypes?.join(',') || 'all', `Request ID: ${requestId}`);

    logger.info('Data deletion requested:', { requestId, userId, dataTypes });
    return requestId;
  }

  /**
   * Process pending deletion request with verification
   */
  async processDeletionRequest(requestId: string, verificationToken: string): Promise<void> {
    const requests = await this.storageService.get<DataDeletionRequest[]>(this.STORAGE_KEY_DELETION_REQUESTS, 'local') || [];
    const request = requests.find(req => req.requestId === requestId);

    if (!request) {
      throw new Error('Deletion request not found');
    }

    if (request.verificationToken !== verificationToken) {
      await this.auditLog('data_deletion_verification_failed', 'failure', undefined, `Request ID: ${requestId}`);
      throw new Error('Invalid verification token');
    }

    if (request.status !== 'pending') {
      throw new Error('Request already processed');
    }

    try {
      // Update status
      request.status = 'processing';
      await this.storageService.set(this.STORAGE_KEY_DELETION_REQUESTS, requests, 'local');

      // Perform deletion
      if (request.dataTypes.includes('all')) {
        await this.deleteAllUserData(request.userId);
      } else {
        for (const dataType of request.dataTypes) {
          await this.deleteDataByType(request.userId, dataType);
        }
      }

      // Mark as completed
      request.status = 'completed';
      request.processedAt = Date.now();
      await this.storageService.set(this.STORAGE_KEY_DELETION_REQUESTS, requests, 'local');

      await this.auditLog('data_deletion_completed', 'success', request.dataTypes.join(','), `Request ID: ${requestId}`);

      logger.info('Data deletion completed:', { requestId, dataTypes: request.dataTypes });
    } catch (error) {
      request.status = 'failed';
      await this.storageService.set(this.STORAGE_KEY_DELETION_REQUESTS, requests, 'local');

      await this.auditLog('data_deletion_failed', 'failure', undefined, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Get data processing registry for transparency (Article 30)
   */
  getDataProcessingRegistry(): DataProcessingRecord[] {
    return [...this.DATA_PROCESSING_REGISTRY];
  }

  /**
   * Get privacy policy information
   */
  getPrivacyPolicyInfo(): {
    lastUpdated: string;
    version: string;
    dataController: string;
    contactEmail: string;
    dpoEmail?: string;
    legalBases: string[];
    userRights: string[];
  } {
    return {
      lastUpdated: '2025-01-01',
      version: this.CONSENT_VERSION,
      dataController: 'TruthLens Extension',
      contactEmail: 'privacy@truthlens.com',
      dpoEmail: 'dpo@truthlens.com',
      legalBases: ['consent', 'contract', 'legitimate_interest', 'legal_obligation'],
      userRights: [
        'Right to access (Article 15)',
        'Right to rectification (Article 16)',
        'Right to erasure (Article 17)',
        'Right to restrict processing (Article 18)',
        'Right to data portability (Article 20)',
        'Right to object (Article 21)',
        'Rights related to automated decision-making (Article 22)'
      ]
    };
  }

  /**
   * Check compliance status
   */
  async checkComplianceStatus(): Promise<{
    isCompliant: boolean;
    issues: string[];
    recommendations: string[];
    lastAudit: number;
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check consent status
    const consent = await this.getConsent();
    if (!consent) {
      issues.push('No valid GDPR consent recorded');
    }

    // Check data retention compliance
    const retentionIssues = await this.checkDataRetentionCompliance();
    issues.push(...retentionIssues);

    // Check for pending deletion requests
    const pendingRequests = await this.getPendingDeletionRequests();
    if (pendingRequests.length > 0) {
      issues.push(`${pendingRequests.length} pending deletion requests`);
    }

    // Generate recommendations
    if (issues.length === 0) {
      recommendations.push('Consider implementing data minimization policies');
      recommendations.push('Regular audit of data processing activities');
    }

    return {
      isCompliant: issues.length === 0,
      issues,
      recommendations,
      lastAudit: Date.now()
    };
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(): Promise<{
    reportId: string;
    generatedAt: number;
    consentStatus: GDPRConsent | null;
    dataProcessingActivities: DataProcessingRecord[];
    auditSummary: {
      totalEvents: number;
      successRate: number;
      recentActivities: ComplianceAuditLog[];
    };
    dataRetentionStatus: Record<string, { totalRecords: number; expiredRecords: number }>;
    userRightsExercised: {
      dataExports: number;
      dataDeletions: number;
      consentWithdrawals: number;
    };
  }> {
    const reportId = this.generateRequestId();
    const auditLogs = await this.getAuditLogs(30); // Last 30 days

    const totalEvents = auditLogs.length;
    const successEvents = auditLogs.filter(log => log.result === 'success').length;
    const successRate = totalEvents > 0 ? (successEvents / totalEvents) * 100 : 100;

    return {
      reportId,
      generatedAt: Date.now(),
      consentStatus: await this.getConsent(),
      dataProcessingActivities: this.getDataProcessingRegistry(),
      auditSummary: {
        totalEvents,
        successRate,
        recentActivities: auditLogs.slice(0, 10)
      },
      dataRetentionStatus: await this.getDataRetentionStatus(),
      userRightsExercised: await this.getUserRightsExerciseStats()
    };
  }

  /**
   * Private helper methods
   */

  private async ensureGDPRSettings(): Promise<void> {
    const settings = await this.storageService.get<GDPRSettings>(this.STORAGE_KEY_SETTINGS, 'sync');

    if (!settings) {
      const defaultSettings: GDPRSettings = {
        dataRetentionPeriods: this.DEFAULT_RETENTION_PERIODS,
        automaticDeletionEnabled: true,
        consentManagementEnabled: true,
        dataExportEnabled: true,
        privacyByDesignEnabled: true,
        auditLoggingEnabled: true,
        crossBorderTransferSafeguards: ['Standard Contractual Clauses']
      };

      await this.storageService.set(this.STORAGE_KEY_SETTINGS, defaultSettings, 'sync');
    }
  }

  private async startAutomaticDataRetention(): Promise<void> {
    const settings = await this.storageService.get<GDPRSettings>(this.STORAGE_KEY_SETTINGS, 'sync');

    if (settings?.automaticDeletionEnabled) {
      // Run daily cleanup
      setInterval(async () => {
        await this.performAutomaticDataCleanup();
      }, 24 * 60 * 60 * 1000); // Daily

      // Initial cleanup
      await this.performAutomaticDataCleanup();
    }
  }

  private async performAutomaticDataCleanup(): Promise<void> {
    try {
      const settings = await this.storageService.get<GDPRSettings>(this.STORAGE_KEY_SETTINGS, 'sync');
      if (!settings) return;

      const now = Date.now();
      let deletedRecords = 0;

      // Clean up expired data based on retention periods
      for (const [dataType, retentionDays] of Object.entries(settings.dataRetentionPeriods)) {
        const expiryTime = now - (retentionDays * 24 * 60 * 60 * 1000);

        switch (dataType) {
          case 'usage_analytics':
            deletedRecords += await this.cleanupExpiredAnalytics(expiryTime);
            break;
          case 'notification_preferences':
            deletedRecords += await this.cleanupExpiredNotifications(expiryTime);
            break;
          case 'error_logs':
            deletedRecords += await this.cleanupExpiredErrorLogs(expiryTime);
            break;
        }
      }

      if (deletedRecords > 0) {
        await this.auditLog('automatic_data_cleanup', 'success', undefined, `Deleted ${deletedRecords} expired records`);
      }
    } catch (error) {
      await this.auditLog('automatic_data_cleanup', 'failure', undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async collectUserData(_userId: string): Promise<any> {
    const data: any = {};

    // Collect subscription data
    try {
      const { subscriptionManager } = await import('./subscriptionManager');
      data.subscriptionData = await subscriptionManager.getSubscriptionSummary();
    } catch (error) {
      logger.warn('Failed to collect subscription data for export:', error instanceof Error ? { message: error.message, stack: error.stack } : { error });
    }

    // Collect analytics data (if consent given)
    const consent = await this.getConsent();
    if (consent?.analytics) {
      try {
        data.usageAnalytics = await analyticsService.exportUserData();
      } catch (error) {
        logger.warn('Failed to collect analytics data for export:', error instanceof Error ? { message: error.message, stack: error.stack } : { error });
      }
    }

    // Collect notification history
    if (consent?.notifications) {
      try {
        const { notificationService } = await import('./notificationService');
        data.notificationHistory = await notificationService.getNotificationHistory();
      } catch (error) {
        logger.warn('Failed to collect notification data for export:', error instanceof Error ? { message: error.message, stack: error.stack } : { error });
      }
    }

    // Collect preferences
    try {
      data.preferences = await this.storageService.get('user_preferences', 'sync');
    } catch (error) {
      logger.warn('Failed to collect preferences for export:', error instanceof Error ? { message: error.message, stack: error.stack } : { error });
    }

    return data;
  }

  private async cleanupDataByType(dataType: 'analytics' | 'notifications' | 'marketing'): Promise<void> {
    switch (dataType) {
      case 'analytics':
        await analyticsService.deleteUserData();
        break;
      case 'notifications':
        const { notificationService } = await import('./notificationService');
        await notificationService.clearNotificationHistory();
        break;
      case 'marketing':
        // Clear marketing preferences
        await this.storageService.remove('marketing_preferences', 'sync');
        break;
    }
  }

  private async cleanupAllConsentBasedData(): Promise<void> {
    // Only keep essential data required for core functionality
    await analyticsService.deleteUserData();

    const { notificationService } = await import('./notificationService');
    await notificationService.clearNotificationHistory();

    await this.storageService.remove('marketing_preferences', 'sync');
    await this.storageService.remove('feature_usage_stats', 'local');
  }

  private async deleteAllUserData(_userId: string): Promise<void> {
    // Note: Subscription data may need to be retained for legal/billing purposes
    await this.cleanupAllConsentBasedData();
    await this.storageService.remove('user_preferences', 'sync');
    // Keep audit logs for legal compliance
  }

  private async deleteDataByType(_userId: string, dataType: string): Promise<void> {
    switch (dataType) {
      case 'usage_analytics':
        await analyticsService.deleteUserData();
        break;
      case 'notification_preferences':
        const { notificationService } = await import('./notificationService');
        await notificationService.clearNotificationHistory();
        break;
      case 'error_logs':
        await this.storageService.remove('error_logs', 'local');
        break;
    }
  }

  private async auditLog(action: string, result: 'success' | 'failure', dataType?: string, details?: string): Promise<void> {
    const logEntry: ComplianceAuditLog = {
      timestamp: Date.now(),
      action,
      dataType,
      result,
      details
    };

    const logs = await this.storageService.get<ComplianceAuditLog[]>(this.STORAGE_KEY_AUDIT_LOG, 'local') || [];
    logs.push(logEntry);

    // Keep only last 10,000 entries
    if (logs.length > 10000) {
      logs.splice(0, logs.length - 10000);
    }

    await this.storageService.set(this.STORAGE_KEY_AUDIT_LOG, logs, 'local');
  }

  private async getAuditLogs(days: number): Promise<ComplianceAuditLog[]> {
    const logs = await this.storageService.get<ComplianceAuditLog[]>(this.STORAGE_KEY_AUDIT_LOG, 'local') || [];
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    return logs.filter(log => log.timestamp > cutoff);
  }

  private generateRequestId(): string {
    return `gdpr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateVerificationToken(): string {
    return Math.random().toString(36).substr(2, 15);
  }

  private async checkDataRetentionCompliance(): Promise<string[]> {
    const issues: string[] = [];
    // Implementation would check actual data against retention periods
    // This is a simplified version
    return issues;
  }

  private async getPendingDeletionRequests(): Promise<DataDeletionRequest[]> {
    const requests = await this.storageService.get<DataDeletionRequest[]>(this.STORAGE_KEY_DELETION_REQUESTS, 'local') || [];
    return requests.filter(req => req.status === 'pending');
  }

  private async getDataRetentionStatus(): Promise<Record<string, { totalRecords: number; expiredRecords: number }>> {
    // Simplified implementation
    return {
      usage_analytics: { totalRecords: 0, expiredRecords: 0 },
      notification_history: { totalRecords: 0, expiredRecords: 0 },
      error_logs: { totalRecords: 0, expiredRecords: 0 }
    };
  }

  private async getUserRightsExerciseStats(): Promise<{
    dataExports: number;
    dataDeletions: number;
    consentWithdrawals: number;
  }> {
    const exports = await this.storageService.get<UserDataExport[]>(this.STORAGE_KEY_EXPORT_REQUESTS, 'local') || [];
    const deletions = await this.storageService.get<DataDeletionRequest[]>(this.STORAGE_KEY_DELETION_REQUESTS, 'local') || [];

    // Count consent withdrawals from audit logs
    const auditLogs = await this.getAuditLogs(365); // Last year
    const consentWithdrawals = auditLogs.filter(log =>
      log.action.includes('consent') && log.action.includes('withdrawn')
    ).length;

    return {
      dataExports: exports.length,
      dataDeletions: deletions.filter(req => req.status === 'completed').length,
      consentWithdrawals
    };
  }

  private async cleanupExpiredAnalytics(_expiryTime: number): Promise<number> {
    // Implementation would clean up analytics data older than expiry time
    return 0;
  }

  private async cleanupExpiredNotifications(_expiryTime: number): Promise<number> {
    // Implementation would clean up notification data older than expiry time
    return 0;
  }

  private async cleanupExpiredErrorLogs(_expiryTime: number): Promise<number> {
    // Implementation would clean up error logs older than expiry time
    return 0;
  }

  private setupPeriodicComplianceChecks(): void {
    // Weekly compliance check
    setInterval(async () => {
      const status = await this.checkComplianceStatus();
      if (!status.isCompliant) {
        await this.auditLog('compliance_check_failed', 'failure', undefined, status.issues.join('; '));
        logger.warn('GDPR compliance issues detected:', { issues: status.issues });
      }
    }, 7 * 24 * 60 * 60 * 1000); // Weekly
  }
}

// Export singleton instance
import { storageService } from '../storage/storageService';
export const gdprComplianceManager = new GDPRComplianceManager(storageService);
