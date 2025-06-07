/**
 * Performance Monitoring Types - 2025 Best Practices
 * Includes Web Vitals, Extension-specific metrics, and monitoring configurations
 */

// Core Performance Metrics based on 2025 standards
export interface PerformanceMetrics {
  // Extension-specific metrics (PRD requirements)
  responseTime: number[]; // <1 second requirement
  pageLoadImpact: number[]; // <500ms requirement
  memoryUsage: number[]; // <50MB requirement
  cpuUtilization: number[];

  // Web Vitals (2025 standards)
  lcp: number[]; // Largest Contentful Paint <2.5s
  inp: number[]; // Interaction to Next Paint <200ms (replaced FID in 2024)
  cls: number[]; // Cumulative Layout Shift <0.1

  // Service Worker metrics (Manifest V3)
  serviceWorkerStartTime: number[];
  serviceWorkerLifetime: number[];

  // IndexedDB performance
  dbQueryTime: number[];
  dbMemoryUsage: number[];
}

export type MetricType = keyof PerformanceMetrics;

// Performance thresholds based on PRD and 2025 Web Vitals
export interface PerformanceThresholds {
  responseTime: { warning: 800; critical: 1000 }; // PRD: <1s
  pageLoadImpact: { warning: 400; critical: 500 }; // PRD: <500ms
  memoryUsage: { warning: 40000000; critical: 50000000 }; // PRD: <50MB
  cpuUtilization: { warning: 60; critical: 80 }; // Percentage

  // 2025 Web Vitals standards
  lcp: { warning: 2000; critical: 2500 }; // 2.5s threshold
  inp: { warning: 150; critical: 200 }; // 200ms threshold
  cls: { warning: 0.08; critical: 0.1 }; // 0.1 threshold

  serviceWorkerStartTime: { warning: 100; critical: 200 };
  serviceWorkerLifetime: { warning: 30000; critical: 60000 };
  dbQueryTime: { warning: 50; critical: 100 };
  dbMemoryUsage: { warning: 10000000; critical: 20000000 };
}

// Alert system configuration
export interface AlertConfig {
  enabled: boolean;
  consoleWarnings: boolean;
  notificationThreshold: 'warning' | 'critical';
  maxAlertsPerHour: number;
  slackWebhook?: string;
  emailRecipients?: string[];
}

// Performance measurement entry
export interface PerformanceMeasurement {
  id: string;
  type: MetricType;
  value: number;
  timestamp: number;
  context: {
    url?: string;
    userAgent: string;
    viewport: { width: number; height: number };
    deviceMemory?: number;
    connection?: string;
  };
  metadata?: Record<string, unknown>;
}

// Memory analysis results
export interface MemoryAnalysis {
  totalMemoryUsage: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  leakDetected: boolean;
  leakSources: MemoryLeakSource[];
  recommendations: string[];
}

export interface MemoryLeakSource {
  type: 'indexeddb' | 'event-listener' | 'timer' | 'dom-reference' | 'closure';
  severity: 'low' | 'medium' | 'high';
  description: string;
  location?: string;
  size: number;
}

// Performance optimization recommendations
export interface OptimizationRecommendation {
  type: 'memory' | 'cpu' | 'network' | 'storage';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  codeExample?: string;
  estimatedImpact: string;
  implementationComplexity: 'low' | 'medium' | 'high';
}

// Dashboard configuration
export interface DashboardConfig {
  enabled: boolean;
  refreshInterval: number; // milliseconds
  maxDataPoints: number;
  autoExport: boolean;
  exportFormat: 'csv' | 'json' | 'pdf';
  themeMode: 'light' | 'dark' | 'auto';
}

// Web Vitals measurement (using web-vitals library approach)
export interface WebVitalsEntry {
  name: 'LCP' | 'INP' | 'CLS';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  entries: PerformanceEntry[];
  id: string;
  navigationType: 'navigate' | 'reload' | 'back-forward' | 'back-forward-cache';
}

// Service Worker performance context (Manifest V3)
export interface ServiceWorkerMetrics {
  startTime: number;
  readyTime: number;
  activationTime: number;
  messageLatency: number[];
  apiCallDuration: number[];
  memoryPressure: boolean;
  isAlive: boolean;
  extensionApiCalls: number;
}

// Real-time monitoring configuration
export interface MonitoringConfig {
  sampling: {
    responseTime: number; // Sample every N operations
    memory: number; // Sample every N seconds
    webVitals: boolean; // Always sample
  };
  storage: {
    maxEntries: number;
    retentionDays: number;
    compressionEnabled: boolean;
  };
  alerts: AlertConfig;
  dashboard: DashboardConfig;
  debugMode: boolean;
}

// Performance report for export
export interface PerformanceReport {
  generatedAt: number;
  timeRange: {
    start: number;
    end: number;
  };
  summary: {
    totalMeasurements: number;
    averageResponseTime: number;
    averageMemoryUsage: number;
    webVitalsScore: number;
    alertsTriggered: number;
  };
  metrics: PerformanceMetrics;
  analysis: MemoryAnalysis;
  recommendations: OptimizationRecommendation[];
  rawData: PerformanceMeasurement[];
}

// Browser compatibility and feature detection
export interface BrowserCapabilities {
  performanceObserver: boolean;
  webVitalsAPI: boolean;
  memoryAPI: boolean;
  serviceWorker: boolean;
  indexedDB: boolean;
  broadcastChannel: boolean;
  manifestV3: boolean;
}

// Extension context for performance monitoring
export interface ExtensionContext {
  version: string;
  context: 'background' | 'content' | 'popup' | 'options';
  tabId?: number;
  frameId?: number;
  url?: string;
}

// Stub classes for missing performance components (2025 TypeScript best practices)
export declare class PerformanceMonitor {
  constructor(context: ExtensionContext, config?: unknown);
}

export declare class PerformanceDashboard {
  constructor(config?: unknown);
}

export declare class ServiceWorkerIntegration {
  constructor(config?: unknown);
}

export declare class ContentScriptIntegration {
  constructor(config?: unknown);
}
