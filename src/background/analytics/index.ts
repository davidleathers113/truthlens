// Analytics System Main Entry Point
// Orchestrates all analytics services with privacy compliance

import { AnalyticsService } from './analyticsService';
import { PerformanceMonitor } from './performanceMonitor';
import { BusinessMetricsTracker } from './businessMetrics';
import { ABTestingFramework } from './abTestingFramework';
import { ConsentManager } from './consentManager';
import { DashboardService } from './dashboardService';

export class AnalyticsManager {
  private analyticsService: AnalyticsService;
  private performanceMonitor: PerformanceMonitor;
  private businessMetrics: BusinessMetricsTracker;
  private abTesting: ABTestingFramework;
  private consentManager: ConsentManager;
  private dashboardService: DashboardService;
  private initialized: boolean = false;

  constructor() {
    this.consentManager = new ConsentManager();
    this.analyticsService = new AnalyticsService();
    this.performanceMonitor = new PerformanceMonitor(this.analyticsService);
    this.businessMetrics = new BusinessMetricsTracker(this.analyticsService);
    this.abTesting = new ABTestingFramework(this.analyticsService, this.consentManager);
    this.dashboardService = new DashboardService(
      this.analyticsService,
      this.performanceMonitor,
      this.businessMetrics,
      this.abTesting
    );
  }

  /**
   * Initialize the analytics system
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize all services
      await Promise.all([
        this.consentManager.initialize(),
        this.analyticsService.initialize(),
        this.businessMetrics.initialize()
      ]);

      // Initialize A/B testing framework
      await this.abTesting.initialize();

      // Create default experiments if consent is given
      const hasConsent = await this.consentManager.hasConsent('abTesting');
      if (hasConsent) {
        await this.abTesting.createDefaultExperiments();
      }

      this.initialized = true;

      // Track initialization
      await this.trackEvent('analytics_system_initialized', {
        timestamp: Date.now(),
        version: '1.0.0'
      });

    } catch (error) {
      console.error('Failed to initialize analytics system:', error);
      throw error;
    }
  }

  /**
   * Track analytics event with consent checking
   */
  async trackEvent(eventName: string, properties?: Record<string, any>): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    const hasConsent = await this.consentManager.hasConsent('analytics');
    if (hasConsent) {
      await this.analyticsService.trackEvent(eventName, properties);
    }
  }

  /**
   * Track user engagement with automatic metrics
   */
  async trackEngagement(type: 'page_view' | 'content_analyzed' | 'settings_changed' | 'notification_clicked'): Promise<void> {
    const hasConsent = await this.consentManager.hasConsent('analytics');
    if (!hasConsent) return;

    await this.analyticsService.trackEngagement({
      sessionCount: 1,
      sessionDuration: Date.now() - performance.timeOrigin,
      pagesAnalyzed: type === 'content_analyzed' ? 1 : 0,
      credibilityChecksPerformed: type === 'content_analyzed' ? 1 : 0,
      settingsChanged: type === 'settings_changed' ? 1 : 0,
      notificationsInteracted: type === 'notification_clicked' ? 1 : 0,
      timestamp: Date.now()
    });

    // Track Gen Z specific engagement
    await this.businessMetrics.trackGenZEngagement(type, 'used');
  }

  /**
   * Track business conversion events
   */
  async trackConversion(type: 'trial' | 'premium' | 'enterprise'): Promise<void> {
    const hasConsent = await this.consentManager.hasConsent('analytics');
    if (!hasConsent) return;

    const userId = this.generateAnonymousUserId();
    await this.businessMetrics.trackConversion(userId, type);
  }

  /**
   * Track user retention
   */
  async trackUserActivity(userId: string): Promise<void> {
    const hasConsent = await this.consentManager.hasConsent('analytics');
    if (!hasConsent) return;

    await this.businessMetrics.trackActiveUser(userId);

    // Track retention based on install date
    const installDate = await this.getInstallDate();
    await this.businessMetrics.trackRetention(userId, installDate);
  }

  /**
   * Get user's A/B test variant
   */
  async getExperimentVariant(experimentId: string): Promise<any> {
    const hasConsent = await this.consentManager.hasConsent('abTesting');
    if (!hasConsent) return null;

    const userId = this.generateAnonymousUserId();
    return await this.abTesting.getUserVariant(userId, experimentId);
  }

  /**
   * Track A/B test conversion
   */
  async trackExperimentConversion(experimentId: string, value?: number): Promise<void> {
    const hasConsent = await this.consentManager.hasConsent('abTesting');
    if (!hasConsent) return;

    const userId = this.generateAnonymousUserId();
    await this.abTesting.trackExperimentEvent(userId, experimentId, 'conversion', value);
  }

  /**
   * Request user consent for analytics
   */
  async requestConsent(): Promise<any> {
    return await this.consentManager.requestConsent();
  }

  /**
   * Update user consent preferences
   */
  async updateConsent(updates: any): Promise<any> {
    return await this.consentManager.updateConsent(updates);
  }

  /**
   * Get current consent status
   */
  async getConsentStatus(): Promise<any> {
    return await this.consentManager.getConsentSummary();
  }

  /**
   * Withdraw all consent and clear data
   */
  async withdrawConsent(): Promise<void> {
    await this.consentManager.withdrawConsent();
  }

  /**
   * Get dashboard data for business intelligence
   */
  async getDashboardData(forceRefresh: boolean = false): Promise<any> {
    return await this.dashboardService.getDashboardData(forceRefresh);
  }

  /**
   * Get real-time metrics
   */
  async getRealtimeMetrics(): Promise<any> {
    return await this.dashboardService.getRealtimeMetrics();
  }

  /**
   * Get business intelligence summary
   */
  async getBusinessIntelligence(): Promise<any> {
    return await this.dashboardService.getBusinessIntelligence();
  }

  /**
   * Get executive summary report
   */
  async getExecutiveSummary(): Promise<any> {
    return await this.dashboardService.generateExecutiveSummary();
  }

  /**
   * Export user data for transparency/GDPR compliance
   */
  async exportUserData(): Promise<any> {
    return await this.consentManager.exportUserData();
  }

  /**
   * Measure operation performance
   */
  async measureOperation<T>(operationName: string, operation: () => Promise<T>): Promise<{ result: T; metrics: any }> {
    const hasConsent = await this.consentManager.hasConsent('performance');
    if (!hasConsent) {
      const result = await operation();
      return { result, metrics: {} };
    }

    return await this.performanceMonitor.measureOperation(operationName, operation);
  }

  /**
   * Start session tracking
   */
  async startSession(): Promise<void> {
    const userId = this.generateAnonymousUserId();
    await this.trackUserActivity(userId);
    await this.trackEvent('session_start');
  }

  /**
   * End session tracking
   */
  async endSession(): Promise<void> {
    await this.businessMetrics.trackSessionEnd();
    await this.trackEvent('session_end');
  }

  /**
   * Handle extension events for automatic tracking
   */
  async handleExtensionEvent(eventType: string, data?: any): Promise<void> {
    switch (eventType) {
      case 'content_analyzed':
        await this.trackEngagement('content_analyzed');
        await this.trackEvent('content_analysis_completed', data);
        break;
      
      case 'settings_updated':
        await this.trackEngagement('settings_changed');
        await this.trackEvent('settings_updated', data);
        break;
      
      case 'notification_shown':
        await this.trackEvent('notification_displayed', data);
        break;
      
      case 'notification_clicked':
        await this.trackEngagement('notification_clicked');
        await this.trackEvent('notification_clicked', data);
        break;
      
      case 'premium_upgrade':
        await this.trackConversion('premium');
        await this.trackEvent('premium_conversion', data);
        break;
      
      case 'error_occurred':
        await this.trackEvent('error', data);
        break;
      
      default:
        await this.trackEvent(eventType, data);
    }
  }

  /**
   * Check if analytics is enabled
   */
  async isEnabled(): Promise<boolean> {
    if (!this.initialized) return false;
    return await this.consentManager.hasConsent('analytics');
  }

  /**
   * Get performance metrics
   */
  getCurrentPerformanceMetrics(): any {
    return this.performanceMonitor.getCurrentMetrics();
  }

  /**
   * Private helper methods
   */
  private generateAnonymousUserId(): string {
    // Generate consistent anonymous ID for this browser/extension
    const browserFingerprint = this.generateBrowserFingerprint();
    return `anon_${btoa(browserFingerprint).substr(0, 16)}`;
  }

  private generateBrowserFingerprint(): string {
    // Create a privacy-safe browser fingerprint
    const components = [
      navigator.userAgent.substr(0, 50), // Truncated for privacy
      screen.width,
      screen.height,
      new Date().getTimezoneOffset(),
      navigator.language
    ];
    
    return components.join('|');
  }

  private async getInstallDate(): Promise<number> {
    const result = await chrome.storage.sync.get('installDate');
    if (result.installDate) {
      return result.installDate;
    }
    
    // First time - store install date
    const installDate = Date.now();
    await chrome.storage.sync.set({ installDate });
    return installDate;
  }

  /**
   * Cleanup when service is destroyed
   */
  destroy(): void {
    this.performanceMonitor?.destroy();
    this.analyticsService?.destroy();
  }
}

// Export singleton instance
export const analytics = new AnalyticsManager();

// Export individual services for advanced usage
export {
  AnalyticsService,
  PerformanceMonitor,
  BusinessMetricsTracker,
  ABTestingFramework,
  ConsentManager,
  DashboardService
};