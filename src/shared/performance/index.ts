/**
 * Performance Monitoring System - Main Export
 * 2025 Best Practices Implementation for TruthLens Chrome Extension
 */

// Core exports
export { PerformanceMonitor } from './monitor';
export { PerformanceStorage } from './storage';
export { AlertManager } from './alerts';
export { MemoryAnalyzer } from './memory-analyzer';
export { WebVitalsMonitor } from './web-vitals';
export { PerformanceDashboard } from './dashboard';

// Integration exports
export { 
  ServiceWorkerIntegration,
  ContentScriptIntegration,
  createPerformanceIntegration,
  PerformanceOptimizer
} from './integrations';

// Type exports
export type {
  PerformanceMetrics,
  PerformanceMeasurement,
  MetricType,
  PerformanceThresholds,
  MonitoringConfig,
  MemoryAnalysis,
  MemoryLeakSource,
  OptimizationRecommendation,
  AlertConfig,
  DashboardConfig,
  WebVitalsEntry,
  ServiceWorkerMetrics,
  BrowserCapabilities,
  ExtensionContext,
  PerformanceReport
} from './types';

// Factory function for easy initialization
export function createPerformanceMonitoringSystem(context: ExtensionContext) {
  return new PerformanceMonitoringSystem(context);
}

/**
 * Main Performance Monitoring System
 * Orchestrates all performance monitoring components
 */
export class PerformanceMonitoringSystem {
  private monitor: PerformanceMonitor;
  private dashboard: PerformanceDashboard | null = null;
  private integration: ServiceWorkerIntegration | ContentScriptIntegration | null = null;
  private isInitialized = false;

  constructor(private context: ExtensionContext) {
    // Initialize with sensible defaults for 2025
    this.monitor = new PerformanceMonitor(context, {
      sampling: {
        responseTime: 1, // Sample every operation
        memory: 5000,   // Sample every 5 seconds
        webVitals: true // Always monitor Web Vitals
      },
      storage: {
        maxEntries: 10000,
        retentionDays: 30,
        compressionEnabled: true
      },
      alerts: {
        enabled: true,
        consoleWarnings: true,
        notificationThreshold: 'warning',
        maxAlertsPerHour: 10
      },
      dashboard: {
        enabled: context.context !== 'background', // Enable for content/popup/options
        refreshInterval: 1000,
        maxDataPoints: 100,
        autoExport: false,
        exportFormat: 'json',
        themeMode: 'auto'
      },
      debugMode: process.env.NODE_ENV === 'development'
    });
  }

  /**
   * Initialize the performance monitoring system
   * Call this after DOM is ready for content scripts
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('[PerformanceMonitoringSystem] Already initialized');
      return;
    }

    try {
      // Initialize dashboard if enabled
      if (this.monitor['config'].dashboard.enabled) {
        await this.initializeDashboard();
      }

      // Initialize context-specific integration
      await this.initializeIntegration();

      // Start performance optimizations
      this.startOptimizations();

      this.isInitialized = true;

      console.log(`[PerformanceMonitoringSystem] Initialized for ${this.context.context} context`);

    } catch (error) {
      console.error('[PerformanceMonitoringSystem] Initialization failed:', error);
      throw error;
    }
  }

  private async initializeDashboard(): Promise<void> {
    const { PerformanceDashboard } = await import('./dashboard');
    
    this.dashboard = new PerformanceDashboard(this.monitor['config'].dashboard);
    
    // Only initialize DOM elements in browser contexts
    if (typeof document !== 'undefined') {
      this.dashboard.initialize();
    }
  }

  private async initializeIntegration(): Promise<void> {
    const { createPerformanceIntegration } = await import('./integrations');
    
    this.integration = createPerformanceIntegration(this.monitor, this.context);
    
    if (this.integration instanceof (await import('./integrations')).ServiceWorkerIntegration) {
      (this.integration as any).setActive(true);
    }
  }

  private startOptimizations(): void {
    const { PerformanceOptimizer } = require('./integrations');
    
    // Start memory cleanup
    PerformanceOptimizer.startMemoryCleanup();
    
    // Preload critical resources for content scripts
    if (this.context.context === 'content') {
      PerformanceOptimizer.preloadCriticalResources([
        chrome.runtime.getURL('icons/icon16.png'),
        chrome.runtime.getURL('icons/icon48.png')
      ]);
    }
  }

  /**
   * Start a performance measurement
   * @param id Unique identifier for the measurement
   * @param type Type of metric being measured
   */
  public startMeasurement(id: string, type: MetricType = 'responseTime'): void {
    this.monitor.startMeasurement(id, type);
  }

  /**
   * End a performance measurement
   * @param id Unique identifier for the measurement
   * @param type Type of metric being measured
   * @returns Duration in milliseconds
   */
  public endMeasurement(id: string, type: MetricType = 'responseTime'): number {
    return this.monitor.endMeasurement(id, type);
  }

  /**
   * Record a direct measurement
   * @param type Type of metric
   * @param value Value to record
   * @param metadata Optional metadata
   */
  public recordMeasurement(
    type: MetricType,
    value: number,
    metadata?: Record<string, any>
  ): void {
    this.monitor.recordMeasurement(type, value, { metadata });
  }

  /**
   * Measure the performance of an async operation
   * @param id Measurement identifier
   * @param operation Async operation to measure
   * @param type Metric type
   * @returns Promise with operation result and duration
   */
  public async measureAsync<T>(
    id: string,
    operation: () => Promise<T>,
    type: MetricType = 'responseTime'
  ): Promise<{ result: T; duration: number }> {
    this.startMeasurement(id, type);
    
    try {
      const result = await operation();
      const duration = this.endMeasurement(id, type);
      return { result, duration };
    } catch (error) {
      this.endMeasurement(id, type);
      throw error;
    }
  }

  /**
   * Measure the performance of a sync operation
   * @param id Measurement identifier
   * @param operation Sync operation to measure
   * @param type Metric type
   * @returns Operation result and duration
   */
  public measureSync<T>(
    id: string,
    operation: () => T,
    type: MetricType = 'responseTime'
  ): { result: T; duration: number } {
    this.startMeasurement(id, type);
    
    try {
      const result = operation();
      const duration = this.endMeasurement(id, type);
      return { result, duration };
    } catch (error) {
      this.endMeasurement(id, type);
      throw error;
    }
  }

  /**
   * Get current performance metrics
   */
  public getMetrics(): PerformanceMetrics {
    return this.monitor.getMetrics();
  }

  /**
   * Get average value for a specific metric
   */
  public getAverageMetric(type: MetricType): number {
    return this.monitor.getAverageMetric(type);
  }

  /**
   * Get 95th percentile for a specific metric
   */
  public getP95Metric(type: MetricType): number {
    return this.monitor.getP95Metric(type);
  }

  /**
   * Generate optimization recommendations
   */
  public async getOptimizationRecommendations(): Promise<OptimizationRecommendation[]> {
    return this.monitor.generateOptimizationRecommendations();
  }

  /**
   * Export performance report
   */
  public async exportReport(): Promise<string> {
    return this.monitor.exportReport();
  }

  /**
   * Show the performance dashboard
   */
  public showDashboard(): void {
    if (this.dashboard) {
      this.dashboard.show();
    } else {
      console.warn('[PerformanceMonitoringSystem] Dashboard not available');
    }
  }

  /**
   * Hide the performance dashboard
   */
  public hideDashboard(): void {
    if (this.dashboard) {
      this.dashboard.hide();
    }
  }

  /**
   * Update monitoring configuration
   */
  public updateConfig(config: Partial<MonitoringConfig>): void {
    this.monitor.updateConfig(config);
  }

  /**
   * Enable performance monitoring
   */
  public enable(): void {
    this.monitor.enable();
  }

  /**
   * Disable performance monitoring
   */
  public disable(): void {
    this.monitor.disable();
  }

  /**
   * Check if the system is initialized
   */
  public isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get system status and health information
   */
  public getSystemStatus(): {
    initialized: boolean;
    context: ExtensionContext;
    dashboardAvailable: boolean;
    integrationActive: boolean;
    metrics: {
      totalMeasurements: number;
      averageResponseTime: number;
      averageMemoryUsage: number;
    };
  } {
    const metrics = this.getMetrics();
    
    return {
      initialized: this.isInitialized,
      context: this.context,
      dashboardAvailable: this.dashboard !== null,
      integrationActive: this.integration !== null,
      metrics: {
        totalMeasurements: Object.values(metrics).reduce((sum, arr) => sum + arr.length, 0),
        averageResponseTime: this.getAverageMetric('responseTime'),
        averageMemoryUsage: this.getAverageMetric('memoryUsage')
      }
    };
  }

  /**
   * Cleanup all resources
   */
  public cleanup(): void {
    this.monitor.cleanup();
    this.dashboard?.cleanup();
    this.integration?.cleanup();
    
    this.isInitialized = false;
    
    console.log('[PerformanceMonitoringSystem] Cleaned up');
  }
}

// Global instance for easy access (singleton pattern)
let globalInstance: PerformanceMonitoringSystem | null = null;

/**
 * Get or create the global performance monitoring instance
 * @param context Extension context (required for first call)
 */
export function getPerformanceMonitor(context?: ExtensionContext): PerformanceMonitoringSystem {
  if (!globalInstance) {
    if (!context) {
      throw new Error('Context required for first initialization');
    }
    globalInstance = new PerformanceMonitoringSystem(context);
  }
  return globalInstance;
}

/**
 * Reset the global instance (useful for testing)
 */
export function resetPerformanceMonitor(): void {
  if (globalInstance) {
    globalInstance.cleanup();
    globalInstance = null;
  }
}

// Convenience decorators for automatic performance measurement

/**
 * Decorator to automatically measure method performance
 * @param metricType Type of metric to record
 */
export function measurePerformance(metricType: MetricType = 'responseTime') {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const instance = getPerformanceMonitor();
      const measurementId = `${target.constructor.name}.${propertyKey}`;
      
      instance.startMeasurement(measurementId, metricType);
      
      try {
        const result = originalMethod.apply(this, args);
        
        if (result && typeof result.then === 'function') {
          return result.finally(() => {
            instance.endMeasurement(measurementId, metricType);
          });
        } else {
          instance.endMeasurement(measurementId, metricType);
          return result;
        }
      } catch (error) {
        instance.endMeasurement(measurementId, metricType);
        throw error;
      }
    };

    return descriptor;
  };
}

export default PerformanceMonitoringSystem;