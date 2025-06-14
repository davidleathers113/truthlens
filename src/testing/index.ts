/**
 * Gen Z Testing Framework - Main Controller
 * Orchestrates all testing modules and implements 2025 best practices
 * Serves as the single entry point for the entire testing framework
 */

import { AttentionSpanModule } from './AttentionSpanModule';
import { DesktopTestingInfrastructure } from './DesktopTestingInfrastructure';
import { PreferenceCollectionSystem } from './PreferenceCollectionSystem';
import { ABTestingFramework } from './ABTestingFramework';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { IntegrationService } from './IntegrationService';
import { ConfigurationManager } from './ConfigurationManager';
import { SentimentAnalyzer } from './SentimentAnalyzer';

import {
  TestingModule,
  TestingError,
  AttentionMetrics,
  PreferenceData,
  ABTestResult,
  AnalyticsDashboardData,
  TestingConfig,
} from './types';

export interface GenZTestingFrameworkConfig {
  enabledModules: TestingModule[];
  environment: 'development' | 'staging' | 'production';
  userId?: string;
  sessionId?: string;
  autoStart: boolean;
  realTimeAnalytics: boolean;
  privacyFirst: boolean;
  genZOptimizations: boolean;
  performanceOptimizations: boolean;
  debugMode: boolean;
}

export interface FrameworkStatus {
  isInitialized: boolean;
  isRunning: boolean;
  activeModules: TestingModule[];
  errors: TestingError[];
  performance: {
    memoryUsage: number;
    cpuUsage: number;
    networkUsage: number;
  };
  moduleStatus: Record<TestingModule, 'active' | 'inactive' | 'error'>;
}

export interface TestingResults {
  sessionId: string;
  userId?: string;
  startTime: number;
  endTime?: number;
  attentionMetrics?: AttentionMetrics;
  desktopMetrics?: any;
  preferences?: PreferenceData;
  abTestResults?: ABTestResult[];
  dashboardData?: AnalyticsDashboardData;
  summary: TestingSummary;
}

export interface TestingSummary {
  totalInteractions: number;
  genZBehaviorScore: number;
  attentionRetentionRate: number;
  engagementQuality: number;
  preferenceAccuracy: number;
  recommendations: string[];
  nextSteps: string[];
}

export class GenZTestingFramework {
  private config: GenZTestingFrameworkConfig;
  private isInitialized: boolean = false;
  private isRunning: boolean = false;
  private sessionId: string;

  // Core modules
  private attentionModule?: AttentionSpanModule;
  private desktopModule?: DesktopTestingInfrastructure;
  private preferencesModule?: PreferenceCollectionSystem;
  private abTestingModule?: ABTestingFramework;
  private analyticsModule?: AnalyticsDashboard;
  private integrationService?: IntegrationService;
  private configManager?: ConfigurationManager;
  private sentimentAnalyzer?: SentimentAnalyzer;

  // State management
  private errors: TestingError[] = [];
  private results: Partial<TestingResults> = {};
  private hooks: Map<string, ((data: any) => void)[]> = new Map();
  private performance: Map<string, number> = new Map();

  constructor(config: Partial<GenZTestingFrameworkConfig> = {}) {
    this.config = {
      enabledModules: ['attention', 'preferences', 'ab_testing', 'analytics'],
      environment: 'development',
      autoStart: false,
      realTimeAnalytics: true,
      privacyFirst: true,
      genZOptimizations: true,
      performanceOptimizations: true,
      debugMode: false,
      ...config
    };

    this.sessionId = this.generateSessionId();
    this.results.sessionId = this.sessionId;
    this.results.userId = this.config.userId;
    this.results.startTime = Date.now();
  }

  /**
   * Initialize the complete testing framework
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const startTime = performance.now();

      // Initialize configuration manager first
      this.configManager = new ConfigurationManager({
        environment: this.config.environment,
        enablePrivacyAuditing: this.config.privacyFirst,
        enableSafeguards: this.config.environment === 'production'
      });

      await this.configManager.initialize();

      // Get validated testing configuration
      const testingConfig = this.configManager.getTestingConfig();

      // Initialize integration service
      this.integrationService = new IntegrationService({
        enableBackgroundIntegration: testingConfig.integrationSettings.backgroundScriptIntegration,
        enableContentScriptIntegration: testingConfig.integrationSettings.contentScriptIntegration,
        enablePopupIntegration: testingConfig.integrationSettings.popupIntegration,
        enableRealTimeSync: this.config.realTimeAnalytics,
        enableErrorRecovery: this.config.environment === 'production'
      }, {
        onError: (error) => this.handleError(error),
        onDataReceived: (data, source) => this.handleDataReceived(data, source)
      });

      await this.integrationService.initialize();

      // Initialize sentiment analyzer
      this.sentimentAnalyzer = new SentimentAnalyzer({
        enableGenZSlangDetection: this.config.genZOptimizations,
        enableEmojiAnalysis: true,
        realTimeProcessing: this.config.realTimeAnalytics
      });

      // Initialize modules based on configuration
      await this.initializeModules(testingConfig);

      // Setup performance monitoring
      if (this.config.performanceOptimizations) {
        this.setupPerformanceMonitoring();
      }

      // Setup error handling
      this.setupErrorHandling();

      // Auto-start if configured
      if (this.config.autoStart) {
        await this.start();
      }

      const initTime = performance.now() - startTime;
      this.performance.set('initialization_time', initTime);

      this.isInitialized = true;

      console.debug('[GenZTestingFramework] Initialized successfully', {
        sessionId: this.sessionId,
        enabledModules: this.config.enabledModules,
        initTime: `${initTime.toFixed(2)}ms`
      });

      this.triggerHook('framework_initialized', { sessionId: this.sessionId });
    } catch (error) {
      this.handleError({
        timestamp: Date.now(),
        module: 'framework' as TestingModule,
        error: (error as Error).message,
        severity: 'critical'
      });
      throw error;
    }
  }

  /**
   * Start the testing framework
   */
  public async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Framework not initialized. Call initialize() first.');
    }

    if (this.isRunning) {
      console.warn('[GenZTestingFramework] Already running');
      return;
    }

    try {
      // Check consent and safeguards
      if (this.config.userId && this.configManager) {
        const safeguardCheck = await this.configManager.checkSafeguards(this.config.userId);
        if (!safeguardCheck.canStartTesting) {
          throw new Error(`Cannot start testing: ${safeguardCheck.reason}`);
        }

        // Start session tracking
        this.sessionId = this.configManager.startTestingSession(this.config.userId);
        this.results.sessionId = this.sessionId;
      }

      // Start all enabled modules
      const startPromises: Promise<void>[] = [];

      if (this.attentionModule && this.config.enabledModules.includes('attention')) {
        startPromises.push(this.attentionModule.initialize());
      }

      if (this.desktopModule && this.config.enabledModules.includes('mobile')) {
        startPromises.push(this.desktopModule.initialize());
      }

      if (this.preferencesModule && this.config.enabledModules.includes('preferences')) {
        startPromises.push(this.preferencesModule.initialize());
      }

      // Analytics dashboard is always initialized if enabled
      if (this.analyticsModule && this.config.enabledModules.includes('analytics')) {
        // Analytics module doesn't need explicit start
      }

      await Promise.all(startPromises);

      this.isRunning = true;
      this.results.startTime = Date.now();

      console.debug('[GenZTestingFramework] Started successfully', {
        sessionId: this.sessionId,
        activeModules: this.getActiveModules()
      });

      this.triggerHook('framework_started', { sessionId: this.sessionId });
    } catch (error) {
      this.handleError({
        timestamp: Date.now(),
        module: 'framework' as TestingModule,
        error: (error as Error).message,
        severity: 'high'
      });
      throw error;
    }
  }

  /**
   * Stop the testing framework and collect results
   */
  public async stop(): Promise<TestingResults> {
    if (!this.isRunning) {
      console.warn('[GenZTestingFramework] Not running');
      return this.getFinalResults();
    }

    try {
      this.results.endTime = Date.now();

      // Collect results from all modules
      await this.collectResults();

      // Stop all modules
      if (this.attentionModule?.isTracking()) {
        this.results.attentionMetrics = this.attentionModule.stop();
      }

      if (this.desktopModule) {
        this.results.desktopMetrics = this.desktopModule.getDesktopMetrics();
        this.desktopModule.stop();
      }

      if (this.preferencesModule) {
        this.preferencesModule.stop();
      }

      // Generate final summary
      this.results.summary = this.generateTestingSummary();

      // End session tracking
      if (this.config.userId && this.configManager) {
        this.configManager.endTestingSession(this.sessionId, this.config.userId);
      }

      // Sync final results
      if (this.integrationService) {
        await this.integrationService.syncData('analytics', this.results);
      }

      this.isRunning = false;

      console.debug('[GenZTestingFramework] Stopped successfully', {
        sessionId: this.sessionId,
        duration: this.results.endTime - this.results.startTime!
      });

      this.triggerHook('framework_stopped', this.results);

      return this.getFinalResults();
    } catch (error) {
      this.handleError({
        timestamp: Date.now(),
        module: 'framework' as TestingModule,
        error: (error as Error).message,
        severity: 'high'
      });
      throw error;
    }
  }

  /**
   * Get current framework status
   */
  public getStatus(): FrameworkStatus {
    return {
      isInitialized: this.isInitialized,
      isRunning: this.isRunning,
      activeModules: this.getActiveModules(),
      errors: [...this.errors],
      performance: {
        memoryUsage: this.performance.get('memory_usage') || 0,
        cpuUsage: this.performance.get('cpu_usage') || 0,
        networkUsage: this.performance.get('network_usage') || 0
      },
      moduleStatus: this.getModuleStatus()
    };
  }

  /**
   * Register hook for framework events
   */
  public onEvent(event: string, callback: (data: any) => void): void {
    if (!this.hooks.has(event)) {
      this.hooks.set(event, []);
    }
    this.hooks.get(event)!.push(callback);
  }

  /**
   * Get real-time metrics for live monitoring
   */
  public getRealTimeMetrics(): {
    currentSession: string;
    uptime: number;
    activeUsers: number;
    currentAttentionScore?: number;
    recentInteractions: number;
    errorRate: number;
  } {
    const uptime = this.results.startTime ? Date.now() - this.results.startTime : 0;
    const recentInteractions = this.attentionModule?.getMetrics()?.interactionMetrics?.clicks?.length || 0;
    const errorRate = this.errors.length / Math.max(1, uptime / 60000); // Errors per minute

    return {
      currentSession: this.sessionId,
      uptime,
      activeUsers: 1, // Single user in this context
      currentAttentionScore: this.attentionModule?.getMetrics()?.initialAttentionWindow,
      recentInteractions,
      errorRate
    };
  }

  /**
   * Update framework configuration
   */
  public async updateConfiguration(newConfig: Partial<GenZTestingFrameworkConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };

    // Update module configurations if needed
    if (this.configManager && newConfig.environment) {
      await this.configManager.updateTestingConfig({ environment: newConfig.environment });
    }

    this.triggerHook('configuration_updated', newConfig);
  }

  // Private implementation methods

  private async initializeModules(testingConfig: TestingConfig): Promise<void> {
    const modulePromises: Promise<void>[] = [];

    // Initialize attention span module
    if (this.config.enabledModules.includes('attention')) {
      this.attentionModule = new AttentionSpanModule({
        initialAttentionThreshold: this.config.genZOptimizations ? 8000 : 12000,
        enableHeatmapping: this.config.realTimeAnalytics,
        samplingRate: testingConfig.samplingRate
      }, this.config.userId);
    }

    // Initialize desktop testing infrastructure
    if (this.config.enabledModules.includes('mobile')) {
      this.desktopModule = new DesktopTestingInfrastructure({
        enableRealTimeDataStreaming: this.config.realTimeAnalytics,
        enableEfficiencyMetrics: this.config.genZOptimizations
      });
    }

    // Initialize preference collection system
    if (this.config.enabledModules.includes('preferences')) {
      this.preferencesModule = new PreferenceCollectionSystem({
        enableRealTimeUpdates: this.config.realTimeAnalytics,
        enableCollaborativeDesign: this.config.genZOptimizations,
        privacyFirst: this.config.privacyFirst
      });
    }

    // Initialize A/B testing framework
    if (this.config.enabledModules.includes('ab_testing')) {
      this.abTestingModule = new ABTestingFramework({
        enableGroupSequentialTesting: true,
        minSampleSize: 500,
        maxSampleSize: 10000,
        significanceLevel: 0.05,
        power: 0.8,
        sequentialCheckpoints: [0.25, 0.5, 0.75, 1.0],
        mobileOptimization: this.config.genZOptimizations,
        privacyCompliant: this.config.privacyFirst
      });
    }

    // Initialize analytics dashboard
    if (this.config.enabledModules.includes('analytics')) {
      this.analyticsModule = new AnalyticsDashboard({
        refreshInterval: 5000,
        enableRealTime: this.config.realTimeAnalytics,
        enableAI: this.config.genZOptimizations,
        mobileOptimized: this.config.genZOptimizations,
        enableConversationalAnalytics: true,
        enableImmersiveVisualization: true,
        privacyMode: this.config.privacyFirst,
        maxDataPoints: 10000
      });
    }

    await Promise.all(modulePromises);
  }

  private setupPerformanceMonitoring(): void {
    // Monitor memory usage
    setInterval(() => {
      if ('memory' in performance) {
        const memInfo = (performance as any).memory;
        this.performance.set('memory_usage', memInfo.usedJSHeapSize / memInfo.totalJSHeapSize);
      }
    }, 5000);

    // Monitor frame rate as CPU usage proxy
    let frameCount = 0;
    const startTime = Date.now();

    const countFrames = () => {
      frameCount++;
      const elapsed = Date.now() - startTime;
      if (elapsed >= 1000) {
        this.performance.set('cpu_usage', Math.min(1, (60 - frameCount) / 60));
        frameCount = 0;
      }
      requestAnimationFrame(countFrames);
    };

    requestAnimationFrame(countFrames);
  }

  private setupErrorHandling(): void {
    window.addEventListener('error', (event) => {
      this.handleError({
        timestamp: Date.now(),
        module: 'framework' as TestingModule,
        error: event.message,
        severity: 'medium',
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        timestamp: Date.now(),
        module: 'framework' as TestingModule,
        error: event.reason?.message || 'Unhandled promise rejection',
        severity: 'medium'
      });
    });
  }

  private async collectResults(): Promise<void> {
    try {
      // Collect attention metrics
      if (this.attentionModule?.isTracking()) {
        this.results.attentionMetrics = this.attentionModule.getMetrics();
      }

      // Collect desktop metrics
      if (this.desktopModule) {
        this.results.desktopMetrics = this.desktopModule.getDesktopMetrics();
      }

      // Collect preferences
      if (this.preferencesModule && this.config.userId) {
        this.results.preferences = this.preferencesModule.getUserPreferences(this.config.userId) || undefined;
      }

      // Collect A/B test results
      if (this.abTestingModule) {
        // Would collect test results here
      }

      // Collect analytics data
      if (this.analyticsModule) {
        // Would collect dashboard data here
      }
    } catch (error) {
      this.handleError({
        timestamp: Date.now(),
        module: 'framework' as TestingModule,
        error: `Result collection failed: ${(error as Error).message}`,
        severity: 'medium'
      });
    }
  }

  private generateTestingSummary(): TestingSummary {
    const attentionMetrics = this.results.attentionMetrics;
    const desktopMetrics = this.results.desktopMetrics;

    let totalInteractions = 0;
    let genZBehaviorScore = 0;
    let attentionRetentionRate = 0;
    let engagementQuality = 0;

    if (attentionMetrics) {
      totalInteractions = (attentionMetrics.interactionMetrics?.clicks?.length || 0) +
                         (attentionMetrics.scrollMetrics?.scrollPatterns?.length || 0);
      attentionRetentionRate = attentionMetrics.initialAttentionWindow > 8000 ? 1 :
                              attentionMetrics.initialAttentionWindow / 8000;
      engagementQuality = attentionMetrics.totalEngagementTime > 30000 ? 1 :
                         attentionMetrics.totalEngagementTime / 30000;
    }

    if (desktopMetrics) {
      genZBehaviorScore = desktopMetrics.genZBehaviorScore || 0;
    }

    const recommendations = this.generateRecommendations();
    const nextSteps = this.generateNextSteps();

    return {
      totalInteractions,
      genZBehaviorScore,
      attentionRetentionRate,
      engagementQuality,
      preferenceAccuracy: 0.8, // Placeholder
      recommendations,
      nextSteps
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.results.attentionMetrics?.initialAttentionWindow &&
        this.results.attentionMetrics.initialAttentionWindow < 5000) {
      recommendations.push('Consider simplifying initial content presentation');
    }

    if (this.results.desktopMetrics?.genZBehaviorScore &&
        this.results.desktopMetrics.genZBehaviorScore < 0.5) {
      recommendations.push('UI may not align with Gen Z interaction patterns');
    }

    if (this.errors.length > 5) {
      recommendations.push('Review error handling and user experience flows');
    }

    return recommendations;
  }

  private generateNextSteps(): string[] {
    const nextSteps: string[] = [];

    if (this.config.enabledModules.length < 4) {
      nextSteps.push('Consider enabling additional testing modules');
    }

    if (!this.results.preferences) {
      nextSteps.push('Collect user preference data for personalization');
    }

    nextSteps.push('Analyze results with larger user sample');

    return nextSteps;
  }

  private handleError(error: TestingError): void {
    this.errors.push(error);

    // Keep only recent errors
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-100);
    }

    if (this.config.debugMode) {
      console.error('[GenZTestingFramework] Error:', error);
    }

    this.triggerHook('error', error);
  }

  private handleDataReceived(data: any, source: string): void {
    this.triggerHook('data_received', { data, source });
  }

  private getActiveModules(): TestingModule[] {
    const active: TestingModule[] = [];

    if (this.attentionModule?.isTracking()) active.push('attention');
    if (this.desktopModule) active.push('mobile');
    if (this.preferencesModule) active.push('preferences');
    if (this.abTestingModule) active.push('ab_testing');
    if (this.analyticsModule) active.push('analytics');

    return active;
  }

  private getModuleStatus(): Record<TestingModule, 'active' | 'inactive' | 'error'> {
    return {
      attention: this.attentionModule?.isTracking() ? 'active' : 'inactive',
      mobile: this.desktopModule ? 'active' : 'inactive',
      preferences: this.preferencesModule ? 'active' : 'inactive',
      ab_testing: this.abTestingModule ? 'active' : 'inactive',
      analytics: this.analyticsModule ? 'active' : 'inactive',
      heatmaps: 'inactive'
    };
  }

  private triggerHook(event: string, data?: any): void {
    const callbacks = this.hooks.get(event) || [];
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[GenZTestingFramework] Hook error for ${event}:`, error);
      }
    });
  }

  private getFinalResults(): TestingResults {
    return {
      sessionId: this.sessionId,
      userId: this.config.userId,
      startTime: this.results.startTime!,
      endTime: this.results.endTime,
      attentionMetrics: this.results.attentionMetrics,
      desktopMetrics: this.results.desktopMetrics,
      preferences: this.results.preferences,
      abTestResults: this.results.abTestResults,
      dashboardData: this.results.dashboardData,
      summary: this.results.summary!
    };
  }

  private generateSessionId(): string {
    return `framework_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up framework resources
   */
  public destroy(): void {
    if (this.isRunning) {
      this.stop();
    }

    if (this.analyticsModule) {
      this.analyticsModule.destroy();
    }

    if (this.integrationService) {
      this.integrationService.stop();
    }

    if (this.configManager) {
      this.configManager.stop();
    }

    this.hooks.clear();
    this.errors = [];
    this.performance.clear();

    console.debug('[GenZTestingFramework] Destroyed successfully');
  }
}

// Export all module classes for individual use
export {
  AttentionSpanModule,
  DesktopTestingInfrastructure,
  PreferenceCollectionSystem,
  ABTestingFramework,
  AnalyticsDashboard,
  IntegrationService,
  ConfigurationManager,
  SentimentAnalyzer
};

// Export types
export * from './types';

// Default export
export default GenZTestingFramework;
