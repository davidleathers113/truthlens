/**
 * CSP Violation Reporting Service - 2025 Chrome Extension Security
 * Handles Content Security Policy violation reporting and monitoring
 */

import { logger } from '../../shared/services/logger';
import { storageService } from '../../shared/storage/storageService';
import { securityService } from '../../shared/services/securityService';

export interface CSPViolationReport {
  'document-uri': string;
  'violated-directive': string;
  'effective-directive': string;
  'original-policy': string;
  'blocked-uri': string;
  'status-code': number;
  'source-file': string;
  'line-number': number;
  'column-number': number;
  timestamp: number;
  userAgent: string;
  extensionVersion: string;
}

export interface CSPViolationMetrics {
  totalViolations: number;
  violationsByDirective: Record<string, number>;
  violationsBySource: Record<string, number>;
  lastViolation: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

class CSPReportingService {
  private static instance: CSPReportingService;
  private reportingEndpoint = 'https://api.truthlens.app/csp-report';
  private violationQueue: CSPViolationReport[] = [];
  private maxQueueSize = 100;

  private constructor() {
    this.initializeReporting();
  }

  public static getInstance(): CSPReportingService {
    if (!CSPReportingService.instance) {
      CSPReportingService.instance = new CSPReportingService();
    }
    return CSPReportingService.instance;
  }

  /**
   * Initialize CSP violation reporting
   */
  private initializeReporting(): void {
    // Set up periodic violation report sending
    chrome.alarms.create('csp-report-sender', {
      periodInMinutes: 5 // Send reports every 5 minutes
    });

    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'csp-report-sender') {
        this.sendQueuedReports();
      }
    });

    // Listen for CSP violations in extension pages
    if (typeof document !== 'undefined') {
      document.addEventListener('securitypolicyviolation', (event) => {
        this.handleCSPViolation(event);
      });
    }

    logger.info('CSP reporting service initialized');
  }

  /**
   * Handle CSP violation events
   */
  private async handleCSPViolation(event: SecurityPolicyViolationEvent): Promise<void> {
    try {
      const violationReport: CSPViolationReport = {
        'document-uri': event.documentURI,
        'violated-directive': event.violatedDirective,
        'effective-directive': event.effectiveDirective,
        'original-policy': event.originalPolicy,
        'blocked-uri': event.blockedURI,
        'status-code': event.statusCode,
        'source-file': event.sourceFile || '',
        'line-number': event.lineNumber || 0,
        'column-number': event.columnNumber || 0,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        extensionVersion: chrome.runtime.getManifest().version
      };

      await this.processViolation(violationReport);

    } catch (error) {
      logger.error('Failed to handle CSP violation', {}, error as Error);
    }
  }

  /**
   * Process and analyze CSP violation
   */
  private async processViolation(violation: CSPViolationReport): Promise<void> {
    // Store violation locally
    await this.storeViolation(violation);

    // Analyze risk level
    const riskLevel = this.assessViolationRisk(violation);

    // Add to queue for remote reporting
    this.queueViolation(violation);

    // Update metrics
    await this.updateViolationMetrics(violation, riskLevel);

    // Log violation
    logger.warn('CSP violation detected', {
      directive: violation['violated-directive'],
      blockedUri: violation['blocked-uri'],
      sourceFile: violation['source-file'],
      riskLevel
    });

    // Create security event for critical violations
    if (riskLevel === 'critical' || riskLevel === 'high') {
      await securityService.encryptData({
        type: 'csp_violation',
        severity: riskLevel,
        violation,
        timestamp: Date.now()
      }, 'userData');
    }
  }

  /**
   * Assess risk level of CSP violation
   */
  private assessViolationRisk(violation: CSPViolationReport): 'low' | 'medium' | 'high' | 'critical' {
    const directive = violation['violated-directive'];
    const blockedUri = violation['blocked-uri'];

    // Critical violations
    if (directive.includes('script-src') && blockedUri.includes('eval')) {
      return 'critical';
    }
    if (directive.includes('script-src') && blockedUri.startsWith('http:')) {
      return 'critical';
    }

    // High risk violations
    if (directive.includes('script-src')) {
      return 'high';
    }
    if (directive.includes('object-src')) {
      return 'high';
    }

    // Medium risk violations
    if (directive.includes('connect-src') && !blockedUri.startsWith('https:')) {
      return 'medium';
    }
    if (directive.includes('frame-src')) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Store violation in local storage
   */
  private async storeViolation(violation: CSPViolationReport): Promise<void> {
    try {
      const key = `csp_violation_${violation.timestamp}`;
      await chrome.storage.local.set({ [key]: violation });

      // Cleanup old violations (keep last 100)
      await this.cleanupOldViolations();

    } catch (error) {
      logger.error('Failed to store CSP violation', {}, error as Error);
    }
  }

  /**
   * Queue violation for remote reporting
   */
  private queueViolation(violation: CSPViolationReport): void {
    this.violationQueue.push(violation);

    // Limit queue size
    if (this.violationQueue.length > this.maxQueueSize) {
      this.violationQueue = this.violationQueue.slice(-this.maxQueueSize);
    }
  }

  /**
   * Send queued violations to reporting endpoint
   */
  private async sendQueuedReports(): Promise<void> {
    if (this.violationQueue.length === 0) return;

    try {
      const reports = [...this.violationQueue];
      this.violationQueue = [];

      // Check user consent for telemetry
      const consentData = await storageService.getConsentData();
      if (!consentData?.analyticsConsent) {
        logger.debug('Skipping CSP report sending - no analytics consent');
        return;
      }

      const reportData = {
        violations: reports,
        metadata: {
          extensionVersion: chrome.runtime.getManifest().version,
          timestamp: Date.now(),
          userAgent: navigator.userAgent
        }
      };

      const response = await fetch(this.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Extension-Version': chrome.runtime.getManifest().version
        },
        body: JSON.stringify(reportData)
      });

      if (response.ok) {
        logger.info('CSP violations reported successfully', {
          count: reports.length
        });
      } else {
        logger.warn('Failed to send CSP reports', {
          status: response.status,
          count: reports.length
        });
        // Re-queue failed reports (up to max size)
        this.violationQueue.unshift(...reports.slice(0, this.maxQueueSize - this.violationQueue.length));
      }

    } catch (error) {
      logger.error('Error sending CSP reports', {}, error as Error);
    }
  }

  /**
   * Update violation metrics
   */
  private async updateViolationMetrics(violation: CSPViolationReport, riskLevel: string): Promise<void> {
    try {
      const currentMetrics = await this.getViolationMetrics();

      const updatedMetrics: CSPViolationMetrics = {
        totalViolations: currentMetrics.totalViolations + 1,
        violationsByDirective: {
          ...currentMetrics.violationsByDirective,
          [violation['violated-directive']]: (currentMetrics.violationsByDirective[violation['violated-directive']] || 0) + 1
        },
        violationsBySource: {
          ...currentMetrics.violationsBySource,
          [violation['source-file'] || 'unknown']: (currentMetrics.violationsBySource[violation['source-file'] || 'unknown'] || 0) + 1
        },
        lastViolation: violation.timestamp,
        riskLevel: this.calculateOverallRiskLevel(currentMetrics, riskLevel as any)
      };

      await chrome.storage.local.set({ csp_violation_metrics: updatedMetrics });

    } catch (error) {
      logger.error('Failed to update violation metrics', {}, error as Error);
    }
  }

  /**
   * Calculate overall risk level based on violations
   */
  private calculateOverallRiskLevel(
    currentMetrics: CSPViolationMetrics,
    newViolationRisk: 'low' | 'medium' | 'high' | 'critical'
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (newViolationRisk === 'critical' || currentMetrics.riskLevel === 'critical') {
      return 'critical';
    }
    if (newViolationRisk === 'high' || currentMetrics.riskLevel === 'high') {
      return 'high';
    }
    if (newViolationRisk === 'medium' || currentMetrics.riskLevel === 'medium') {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Get current violation metrics
   */
  public async getViolationMetrics(): Promise<CSPViolationMetrics> {
    try {
      const result = await chrome.storage.local.get('csp_violation_metrics');
      return result.csp_violation_metrics || {
        totalViolations: 0,
        violationsByDirective: {},
        violationsBySource: {},
        lastViolation: 0,
        riskLevel: 'low'
      };
    } catch (error) {
      logger.error('Failed to get violation metrics', {}, error as Error);
      return {
        totalViolations: 0,
        violationsByDirective: {},
        violationsBySource: {},
        lastViolation: 0,
        riskLevel: 'low'
      };
    }
  }

  /**
   * Get recent violations
   */
  public async getRecentViolations(limit = 50): Promise<CSPViolationReport[]> {
    try {
      const items = await chrome.storage.local.get();
      const violationKeys = Object.keys(items)
        .filter(key => key.startsWith('csp_violation_'))
        .sort((a, b) => {
          const timestampA = parseInt(a.replace('csp_violation_', ''));
          const timestampB = parseInt(b.replace('csp_violation_', ''));
          return timestampB - timestampA;
        })
        .slice(0, limit);

      return violationKeys.map(key => items[key]);

    } catch (error) {
      logger.error('Failed to get recent violations', {}, error as Error);
      return [];
    }
  }

  /**
   * Cleanup old violation records
   */
  private async cleanupOldViolations(): Promise<void> {
    try {
      const items = await chrome.storage.local.get();
      const violationKeys = Object.keys(items)
        .filter(key => key.startsWith('csp_violation_'))
        .sort((a, b) => {
          const timestampA = parseInt(a.replace('csp_violation_', ''));
          const timestampB = parseInt(b.replace('csp_violation_', ''));
          return timestampB - timestampA;
        });

      // Keep only the 100 most recent violations
      const keysToDelete = violationKeys.slice(100);

      if (keysToDelete.length > 0) {
        await chrome.storage.local.remove(keysToDelete);
        logger.debug('Cleaned up old CSP violations', { deleted: keysToDelete.length });
      }

    } catch (error) {
      logger.error('Failed to cleanup old violations', {}, error as Error);
    }
  }

  /**
   * Generate CSP compliance report
   */
  public async generateComplianceReport(): Promise<{
    summary: CSPViolationMetrics;
    recentViolations: CSPViolationReport[];
    recommendations: string[];
  }> {
    const metrics = await this.getViolationMetrics();
    const recentViolations = await this.getRecentViolations(10);

    const recommendations = this.generateRecommendations(metrics, recentViolations);

    return {
      summary: metrics,
      recentViolations,
      recommendations
    };
  }

  /**
   * Generate security recommendations based on violations
   */
  private generateRecommendations(
    metrics: CSPViolationMetrics,
    _violations: CSPViolationReport[]
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.totalViolations === 0) {
      recommendations.push('CSP compliance is excellent - no violations detected');
      return recommendations;
    }

    // Check for script-src violations
    if (metrics.violationsByDirective['script-src'] > 0) {
      recommendations.push('Review script loading patterns - avoid inline scripts and eval()');
      recommendations.push('Ensure all scripts are loaded from bundled extension files');
    }

    // Check for connect-src violations
    if (metrics.violationsByDirective['connect-src'] > 0) {
      recommendations.push('Review external API connections - ensure HTTPS-only connections');
    }

    // Check for high violation frequency
    if (metrics.totalViolations > 50) {
      recommendations.push('High violation count detected - conduct thorough code review');
    }

    // Check for critical risk level
    if (metrics.riskLevel === 'critical') {
      recommendations.push('CRITICAL: Immediate security review required');
      recommendations.push('Consider disabling extension until security issues are resolved');
    }

    return recommendations;
  }

  /**
   * Test CSP configuration
   */
  public async testCSPConfiguration(): Promise<{
    passed: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Check current manifest CSP
      const manifest = chrome.runtime.getManifest();
      const csp = manifest.content_security_policy;

      if (!csp) {
        issues.push('No CSP defined in manifest');
        recommendations.push('Add content_security_policy to manifest.json');
        return { passed: false, issues, recommendations };
      }

      const extensionPagesCSP = typeof csp === 'string' ? csp : csp.extension_pages;

      if (!extensionPagesCSP) {
        issues.push('No extension_pages CSP defined');
        recommendations.push('Define extension_pages CSP policy');
      }

      // Check for required directives
      if (extensionPagesCSP && !extensionPagesCSP.includes('script-src')) {
        issues.push('Missing script-src directive');
        recommendations.push('Add script-src directive to CSP');
      }

      if (extensionPagesCSP && !extensionPagesCSP.includes('object-src')) {
        issues.push('Missing object-src directive');
        recommendations.push('Add object-src directive to CSP');
      }

      // Check for secure values
      if (extensionPagesCSP && extensionPagesCSP.includes("'unsafe-inline'")) {
        issues.push('Unsafe inline scripts allowed');
        recommendations.push('Remove unsafe-inline from script-src');
      }

      if (extensionPagesCSP && extensionPagesCSP.includes("'unsafe-eval'")) {
        issues.push('Unsafe eval allowed');
        recommendations.push('Remove unsafe-eval from script-src if not needed for WASM');
      }

      const passed = issues.length === 0;

      if (passed) {
        recommendations.push('CSP configuration follows 2025 security best practices');
      }

      return { passed, issues, recommendations };

    } catch (error) {
      logger.error('Failed to test CSP configuration', {}, error as Error);
      return {
        passed: false,
        issues: ['Failed to analyze CSP configuration'],
        recommendations: ['Manual CSP review required']
      };
    }
  }
}

// Export singleton instance
export const cspReportingService = CSPReportingService.getInstance();
export default CSPReportingService;
