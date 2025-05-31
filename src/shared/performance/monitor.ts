/**
 * Performance Monitor - Core Performance Monitoring System
 * 2025 Best Practices with Web Vitals, PerformanceObserver, and Manifest V3
 */

import {
  PerformanceMetrics,
  PerformanceMeasurement,
  MetricType,
  PerformanceThresholds,
  MonitoringConfig,
  OptimizationRecommendation,
  ServiceWorkerMetrics,
  BrowserCapabilities,
  ExtensionContext,
  WebVitalsEntry
} from './types';
import { PerformanceStorage } from './storage';
import { AlertManager } from './alerts';
import { MemoryAnalyzer } from './memory-analyzer';
import { WebVitalsMonitor } from './web-vitals';

export class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private storage: PerformanceStorage;
  private alertManager: AlertManager;
  private memoryAnalyzer: MemoryAnalyzer;
  private webVitalsMonitor: WebVitalsMonitor;
  private config: MonitoringConfig;
  private observers: Map<string, PerformanceObserver> = new Map();
  private activeMeasurements: Map<string, number> = new Map();
  private capabilities: BrowserCapabilities;
  private context: ExtensionContext;
  private isEnabled = true;

  // 2025 Performance Thresholds (PRD + Web Vitals standards)
  private readonly THRESHOLDS: PerformanceThresholds = {
    responseTime: { warning: 800, critical: 1000 },
    pageLoadImpact: { warning: 400, critical: 500 },
    memoryUsage: { warning: 40000000, critical: 50000000 }, // 40MB warning, 50MB critical
    cpuUtilization: { warning: 60, critical: 80 },
    lcp: { warning: 2000, critical: 2500 }, // 2025 Web Vitals
    inp: { warning: 150, critical: 200 }, // INP replaced FID in 2024
    cls: { warning: 0.08, critical: 0.1 },
    serviceWorkerStartTime: { warning: 100, critical: 200 },
    serviceWorkerLifetime: { warning: 30000, critical: 60000 },
    dbQueryTime: { warning: 50, critical: 100 },
    dbMemoryUsage: { warning: 10000000, critical: 20000000 }
  };

  constructor(context: ExtensionContext, config: Partial<MonitoringConfig> = {}) {
    this.context = context;
    this.capabilities = this.detectBrowserCapabilities();

    this.config = {
      sampling: {
        responseTime: 1, // Sample every operation
        memory: 5000, // Sample every 5 seconds
        webVitals: true
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
        enabled: true,
        refreshInterval: 1000,
        maxDataPoints: 100,
        autoExport: false,
        exportFormat: 'json',
        themeMode: 'auto'
      },
      debugMode: false,
      ...config
    };

    // Initialize properties following 2025 TypeScript best practices
    this.metrics = this.initializeMetrics();
    this.storage = new PerformanceStorage(this.config.storage);
    this.alertManager = new AlertManager(this.config.alerts);
    this.memoryAnalyzer = new MemoryAnalyzer();
    this.webVitalsMonitor = new WebVitalsMonitor();

    // Setup async initialization
    this.initializeAsync();

    if (this.config.debugMode) {
      console.log('[PerformanceMonitor] Initialized with capabilities:', this.capabilities);
    }
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      responseTime: [],
      pageLoadImpact: [],
      memoryUsage: [],
      cpuUtilization: [],
      lcp: [],
      inp: [],
      cls: [],
      serviceWorkerStartTime: [],
      serviceWorkerLifetime: [],
      dbQueryTime: [],
      dbMemoryUsage: []
    };
  }

  private async initializeAsync(): Promise<void> {
    if (this.capabilities.webVitalsAPI) {
      this.webVitalsMonitor.onVital((vital: WebVitalsEntry) => {
        this.recordWebVital(vital);
      });
    }

    await this.storage.initialize();
    this.setupPerformanceObservers();
    this.startMemoryMonitoring();
  }

  private detectBrowserCapabilities(): BrowserCapabilities {
    return {
      performanceObserver: 'PerformanceObserver' in window,
      webVitalsAPI: 'web-vitals' in window || 'PerformanceObserver' in window,
      memoryAPI: 'memory' in performance,
      serviceWorker: 'serviceWorker' in navigator,
      indexedDB: 'indexedDB' in window,
      broadcastChannel: 'BroadcastChannel' in window,
      manifestV3: chrome?.runtime?.getManifest?.()?.manifest_version === 3
    };
  }

  private setupPerformanceObservers(): void {
    if (!this.capabilities.performanceObserver) {
      console.warn('[PerformanceMonitor] PerformanceObserver not supported');
      return;
    }

    // Long Task Observer (INP measurement)
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMeasurement('inp', entry.duration, {
            metadata: { type: 'long-task', startTime: entry.startTime }
          });
        }
      });
      longTaskObserver.observe({ type: 'longtask', buffered: true });
      this.observers.set('longtask', longTaskObserver);
    } catch (error) {
      console.warn('[PerformanceMonitor] Long task observer not supported:', error);
    }

    // Largest Contentful Paint Observer
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // 2025 TypeScript best practice: Use type guards for PerformanceEntry casting
          const lcpEntry = entry as PerformanceEntry & {
            element?: Element;
            size?: number;
            url?: string;
          };
          this.recordMeasurement('lcp', entry.startTime, {
            metadata: {
              element: lcpEntry.element?.tagName,
              size: lcpEntry.size,
              url: lcpEntry.url
            }
          });
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      this.observers.set('lcp', lcpObserver);
    } catch (error) {
      console.warn('[PerformanceMonitor] LCP observer not supported:', error);
    }

    // Layout Shift Observer (CLS)
    try {
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // 2025 TypeScript best practice: Use type guards for Layout Shift entries
          const clsEntry = entry as PerformanceEntry & {
            hadRecentInput?: boolean;
            value?: number;
            sources?: any[];
          };
          if (!clsEntry.hadRecentInput) {
            this.recordMeasurement('cls', clsEntry.value || 0, {
              metadata: {
                sources: clsEntry.sources?.length || 0,
                hadRecentInput: clsEntry.hadRecentInput
              }
            });
          }
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
      this.observers.set('cls', clsObserver);
    } catch (error) {
      console.warn('[PerformanceMonitor] CLS observer not supported:', error);
    }

    // Resource Observer for page load impact
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resource = entry as PerformanceResourceTiming;
          if (resource.name.includes('chrome-extension://')) {
            const duration = resource.responseEnd - resource.requestStart;
            this.recordMeasurement('pageLoadImpact', duration, {
              metadata: {
                resourceType: resource.initiatorType,
                size: resource.transferSize || 0,
                cached: resource.transferSize === 0
              }
            });
          }
        }
      });
      resourceObserver.observe({ type: 'resource', buffered: false });
      this.observers.set('resource', resourceObserver);
    } catch (error) {
      console.warn('[PerformanceMonitor] Resource observer not supported:', error);
    }
  }

  private startMemoryMonitoring(): void {
    if (!this.capabilities.memoryAPI) {
      console.warn('[PerformanceMonitor] Memory API not supported');
      return;
    }

    const monitorMemory = () => {
      if (!this.isEnabled) return;

      try {
        const memoryInfo = (performance as any).memory;
        if (memoryInfo) {
          this.recordMeasurement('memoryUsage', memoryInfo.usedJSHeapSize);

          // Check for memory leaks
          if (this.metrics.memoryUsage.length > 10) {
            const recentMemory = this.metrics.memoryUsage.slice(-10);
            const averageIncrease = this.calculateMemoryTrend(recentMemory);

            if (averageIncrease > 1000000) { // 1MB increase trend
              this.triggerMemoryLeakAnalysis();
            }
          }
        }
      } catch (error) {
        console.error('[PerformanceMonitor] Memory monitoring error:', error);
      }

      setTimeout(monitorMemory, this.config.sampling.memory);
    };

    monitorMemory();
  }

  private calculateMemoryTrend(memoryData: number[]): number {
    if (memoryData.length < 2) return 0;

    let totalIncrease = 0;
    for (let i = 1; i < memoryData.length; i++) {
      totalIncrease += Math.max(0, memoryData[i] - memoryData[i - 1]);
    }

    return totalIncrease / (memoryData.length - 1);
  }

  private async triggerMemoryLeakAnalysis(): Promise<void> {
    try {
      const analysis = await this.memoryAnalyzer.analyzeMemoryLeaks();

      if (analysis.leakDetected) {
        this.alertManager.triggerAlert('memoryUsage', 'critical', analysis.totalMemoryUsage, {
          leakSources: analysis.leakSources,
          recommendations: analysis.recommendations
        });
      }
    } catch (error) {
      console.error('[PerformanceMonitor] Memory leak analysis failed:', error);
    }
  }

  // Public API methods

  public startMeasurement(id: string, type: MetricType = 'responseTime'): void {
    if (!this.isEnabled) return;

    const startTime = performance.now();
    this.activeMeasurements.set(id, startTime);

    // Use Performance API mark for detailed analysis
    try {
      performance.mark(`truthlens-${id}-start`);
    } catch (error) {
      // Fallback for environments without mark support
    }

    if (this.config.debugMode) {
      console.log(`[PerformanceMonitor] Started measurement: ${id} (${type})`);
    }
  }

  public endMeasurement(id: string, type: MetricType = 'responseTime'): number {
    if (!this.isEnabled) return 0;

    const startTime = this.activeMeasurements.get(id);
    if (!startTime) {
      console.warn(`[PerformanceMonitor] No start time found for measurement: ${id}`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    try {
      performance.mark(`truthlens-${id}-end`);
      performance.measure(`truthlens-${id}`, `truthlens-${id}-start`, `truthlens-${id}-end`);
    } catch (error) {
      // Fallback for environments without measure support
    }

    this.recordMeasurement(type, duration, { metadata: { measurementId: id } });
    this.activeMeasurements.delete(id);

    if (this.config.debugMode) {
      console.log(`[PerformanceMonitor] Completed measurement: ${id} = ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  public recordMeasurement(
    type: MetricType,
    value: number,
    options: { metadata?: Record<string, any> } = {}
  ): void {
    if (!this.isEnabled) return;

    // Apply sampling
    if (type === 'responseTime' && Math.random() > (1 / this.config.sampling.responseTime)) {
      return;
    }

    const measurement: PerformanceMeasurement = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      value,
      timestamp: Date.now(),
      context: {
        url: window.location?.href,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth || 0,
          height: window.innerHeight || 0
        },
        deviceMemory: (navigator as any).deviceMemory,
        connection: (navigator as any).connection?.effectiveType
      },
      metadata: options.metadata
    };

    // Store in memory
    this.metrics[type].push(value);

    // Limit array size for memory efficiency
    if (this.metrics[type].length > this.config.dashboard.maxDataPoints) {
      this.metrics[type].shift();
    }

    // Store to persistent storage
    this.storage.storeMeasurement(measurement);

    // Check thresholds and trigger alerts
    this.checkThresholds(type, value, measurement);

    // Dispatch event for real-time dashboard
    this.dispatchPerformanceEvent(measurement);
  }

  private recordWebVital(vital: WebVitalsEntry): void {
    const metricType = vital.name.toLowerCase() as MetricType;
    this.recordMeasurement(metricType, vital.value, {
      metadata: {
        rating: vital.rating,
        delta: vital.delta,
        navigationType: vital.navigationType,
        entries: vital.entries.length
      }
    });
  }

  private checkThresholds(type: MetricType, value: number, measurement: PerformanceMeasurement): void {
    const threshold = this.THRESHOLDS[type];
    if (!threshold) return;

    let alertLevel: 'warning' | 'critical' | null = null;

    if (value > threshold.critical) {
      alertLevel = 'critical';
    } else if (value > threshold.warning) {
      alertLevel = 'warning';
    }

    if (alertLevel && alertLevel === this.config.alerts.notificationThreshold || alertLevel === 'critical') {
      this.alertManager.triggerAlert(type, alertLevel, value, {
        measurement,
        threshold,
        context: this.context
      });
    }
  }

  private dispatchPerformanceEvent(measurement: PerformanceMeasurement): void {
    try {
      const event = new CustomEvent('truthlens:performance-measurement', {
        detail: measurement
      });
      window.dispatchEvent(event);
    } catch (error) {
      // Ignore errors in environments without custom events
    }
  }

  // Service Worker specific monitoring (Manifest V3)
  public recordServiceWorkerMetrics(metrics: Partial<ServiceWorkerMetrics>): void {
    if (metrics.startTime !== undefined) {
      this.recordMeasurement('serviceWorkerStartTime', metrics.startTime);
    }

    if (metrics.messageLatency) {
      metrics.messageLatency.forEach(latency => {
        this.recordMeasurement('responseTime', latency, {
          metadata: { context: 'service-worker-message' }
        });
      });
    }

    if (metrics.apiCallDuration) {
      metrics.apiCallDuration.forEach(duration => {
        this.recordMeasurement('responseTime', duration, {
          metadata: { context: 'extension-api-call' }
        });
      });
    }
  }

  // Database performance monitoring
  public recordDatabaseOperation(operation: string, duration: number, size?: number): void {
    this.recordMeasurement('dbQueryTime', duration, {
      metadata: { operation, size }
    });

    if (size !== undefined) {
      this.recordMeasurement('dbMemoryUsage', size, {
        metadata: { operation }
      });
    }
  }

  // Analytics and reporting
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public getAverageMetric(type: MetricType): number {
    const values = this.metrics[type];
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }

  public getP95Metric(type: MetricType): number {
    const values = [...this.metrics[type]].sort((a, b) => a - b);
    const index = Math.ceil(values.length * 0.95) - 1;
    return values[index] || 0;
  }

  public async generateOptimizationRecommendations(): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Memory optimization recommendations
    const avgMemory = this.getAverageMetric('memoryUsage');
    if (avgMemory > this.THRESHOLDS.memoryUsage.warning) {
      recommendations.push({
        type: 'memory',
        priority: avgMemory > this.THRESHOLDS.memoryUsage.critical ? 'critical' : 'high',
        title: 'Optimize Memory Usage',
        description: `Current memory usage (${(avgMemory / 1000000).toFixed(1)}MB) exceeds recommendations. Consider implementing lazy loading and proper cleanup.`,
        codeExample: `
// Implement proper cleanup
class ComponentManager {
  private cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.timers.forEach(timer => clearTimeout(timer));
  }
}`,
        estimatedImpact: '15-30% memory reduction',
        implementationComplexity: 'medium'
      });
    }

    // Response time optimization
    const avgResponseTime = this.getAverageMetric('responseTime');
    if (avgResponseTime > this.THRESHOLDS.responseTime.warning) {
      recommendations.push({
        type: 'cpu',
        priority: 'high',
        title: 'Optimize Response Time',
        description: `Response time (${avgResponseTime.toFixed(0)}ms) can be improved through caching and async processing.`,
        codeExample: `
// Implement response caching
const responseCache = new Map();
async function getCachedResponse(key) {
  if (responseCache.has(key)) return responseCache.get(key);
  const result = await processRequest(key);
  responseCache.set(key, result);
  return result;
}`,
        estimatedImpact: '40-60% response time improvement',
        implementationComplexity: 'low'
      });
    }

    return recommendations;
  }

  public async exportReport(): Promise<string> {
    const report = {
      generatedAt: Date.now(),
      context: this.context,
      metrics: this.metrics,
      averages: Object.keys(this.metrics).reduce((acc, key) => {
        acc[key] = this.getAverageMetric(key as MetricType);
        return acc;
      }, {} as Record<string, number>),
      p95: Object.keys(this.metrics).reduce((acc, key) => {
        acc[key] = this.getP95Metric(key as MetricType);
        return acc;
      }, {} as Record<string, number>),
      recommendations: await this.generateOptimizationRecommendations(),
      capabilities: this.capabilities
    };

    return JSON.stringify(report, null, 2);
  }

  // Control methods
  public enable(): void {
    this.isEnabled = true;
    if (this.config.debugMode) {
      console.log('[PerformanceMonitor] Enabled');
    }
  }

  public disable(): void {
    this.isEnabled = false;
    if (this.config.debugMode) {
      console.log('[PerformanceMonitor] Disabled');
    }
  }

  public updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Apply configuration changes
    this.alertManager.updateConfig(this.config.alerts);

    if (this.config.debugMode) {
      console.log('[PerformanceMonitor] Configuration updated:', newConfig);
    }
  }

  public cleanup(): void {
    this.isEnabled = false;

    // Disconnect all observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();

    // Clear active measurements
    this.activeMeasurements.clear();

    // Cleanup components
    this.alertManager?.cleanup();
    this.storage?.cleanup();
    this.webVitalsMonitor?.cleanup();

    if (this.config.debugMode) {
      console.log('[PerformanceMonitor] Cleaned up');
    }
  }
}
