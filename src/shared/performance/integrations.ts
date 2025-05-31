/**
 * Performance Integrations - Service Worker and Content Script Hooks
 * 2025 Best Practices with Manifest V3 optimization and intelligent monitoring
 */

import { PerformanceMonitor } from './monitor';
import { ExtensionContext, ServiceWorkerMetrics } from './types';

export class ServiceWorkerIntegration {
  private monitor: PerformanceMonitor;
  private messageQueue: Array<{ id: string; timestamp: number }> = [];
  private apiCallMetrics: Map<string, number> = new Map();
  private isActive = false;

  constructor(monitor: PerformanceMonitor) {
    this.monitor = monitor;
    this.setupServiceWorkerHooks();
  }

  private setupServiceWorkerHooks(): void {
    // Monitor service worker lifecycle
    this.monitorServiceWorkerLifecycle();
    
    // Hook into extension API calls
    this.hookExtensionAPIs();
    
    // Monitor message passing performance
    this.setupMessagePerformanceTracking();
    
    // Monitor AI processing performance
    this.setupAIProcessingHooks();
  }

  private monitorServiceWorkerLifecycle(): void {
    const startTime = performance.now();
    
    // Record service worker start time
    this.monitor.recordServiceWorkerMetrics({
      startTime,
      readyTime: 0,
      activationTime: 0,
      messageLatency: [],
      apiCallDuration: [],
      memoryPressure: false,
      isAlive: true,
      extensionApiCalls: 0
    });

    // Monitor service worker ready state
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        const readyTime = performance.now() - startTime;
        this.monitor.recordServiceWorkerMetrics({
          readyTime,
          isAlive: true
        });
      });
    }

    // Monitor for service worker termination/restart
    this.setupTerminationDetection();
  }

  private setupTerminationDetection(): void {
    // Monitor for service worker restarts by tracking message continuity
    setInterval(() => {
      if (!this.isActive) return;

      const now = Date.now();
      // Remove old messages (older than 30 seconds)
      this.messageQueue = this.messageQueue.filter(msg => now - msg.timestamp < 30000);
      
      // If no recent messages and we should be active, potential restart detected
      if (this.messageQueue.length === 0 && this.isActive) {
        console.warn('[ServiceWorkerIntegration] Potential service worker restart detected');
        this.monitor.recordServiceWorkerMetrics({
          startTime: performance.now(),
          isAlive: false // Indicates restart
        });
      }
    }, 10000); // Check every 10 seconds
  }

  private hookExtensionAPIs(): void {
    // Hook into common extension APIs to monitor performance
    this.hookChromeAPI('runtime', ['sendMessage', 'getBackgroundPage']);
    this.hookChromeAPI('tabs', ['query', 'create', 'update']);
    this.hookChromeAPI('storage', ['get', 'set', 'remove']);
    this.hookChromeAPI('scripting', ['executeScript', 'insertCSS']);
  }

  private hookChromeAPI(namespace: string, methods: string[]): void {
    const api = (chrome as any)[namespace];
    if (!api) return;

    methods.forEach(methodName => {
      const originalMethod = api[methodName];
      if (typeof originalMethod === 'function') {
        api[methodName] = (...args: any[]) => {
          const measurementId = `chrome.${namespace}.${methodName}`;
          this.monitor.startMeasurement(measurementId);
          
          try {
            const result = originalMethod.apply(api, args);
            
            // Handle promise-based APIs
            if (result && typeof result.then === 'function') {
              return result.finally(() => {
                this.monitor.endMeasurement(measurementId);
                this.trackAPICall(namespace, methodName);
              });
            } else {
              // Synchronous API
              this.monitor.endMeasurement(measurementId);
              this.trackAPICall(namespace, methodName);
              return result;
            }
          } catch (error) {
            this.monitor.endMeasurement(measurementId);
            throw error;
          }
        };
      }
    });
  }

  private trackAPICall(namespace: string, method: string): void {
    const key = `${namespace}.${method}`;
    this.apiCallMetrics.set(key, (this.apiCallMetrics.get(key) || 0) + 1);
  }

  private setupMessagePerformanceTracking(): void {
    // Hook into runtime.onMessage for latency tracking
    if (chrome?.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const startTime = performance.now();
        
        this.messageQueue.push({
          id: messageId,
          timestamp: Date.now()
        });

        // Wrap sendResponse to measure response time
        const originalSendResponse = sendResponse;
        const wrappedSendResponse = (response: any) => {
          const latency = performance.now() - startTime;
          this.monitor.recordServiceWorkerMetrics({
            messageLatency: [latency]
          });
          
          return originalSendResponse(response);
        };

        // Replace sendResponse with wrapped version
        Object.defineProperty(wrappedSendResponse, 'length', {
          value: originalSendResponse.length
        });

        return originalSendResponse; // Return original to maintain API compatibility
      });
    }
  }

  private setupAIProcessingHooks(): void {
    // Monitor Chrome Built-in AI API performance
    if ('ai' in window || 'ai' in globalThis) {
      this.hookAIAPIs();
    }

    // Monitor custom AI processing
    window.addEventListener('truthlens:ai-processing-start', (event) => {
      const { requestId } = (event as CustomEvent).detail;
      this.monitor.startMeasurement(`ai-processing-${requestId}`);
    });

    window.addEventListener('truthlens:ai-processing-end', (event) => {
      const { requestId } = (event as CustomEvent).detail;
      this.monitor.endMeasurement(`ai-processing-${requestId}`);
    });
  }

  private hookAIAPIs(): void {
    // Hook into Chrome's Built-in AI APIs when available
    const aiApi = (window as any).ai || (globalThis as any).ai;
    if (!aiApi) return;

    // Monitor language model operations
    if (aiApi.languageModel) {
      const originalCreate = aiApi.languageModel.create;
      aiApi.languageModel.create = async (...args: any[]) => {
        const measurementId = 'ai-model-create';
        this.monitor.startMeasurement(measurementId);
        
        try {
          const result = await originalCreate.apply(aiApi.languageModel, args);
          this.monitor.endMeasurement(measurementId);
          return result;
        } catch (error) {
          this.monitor.endMeasurement(measurementId);
          throw error;
        }
      };
    }
  }

  public getMetrics(): {
    messageQueueSize: number;
    apiCallCounts: Record<string, number>;
    isActive: boolean;
  } {
    return {
      messageQueueSize: this.messageQueue.length,
      apiCallCounts: Object.fromEntries(this.apiCallMetrics),
      isActive: this.isActive
    };
  }

  public setActive(active: boolean): void {
    this.isActive = active;
  }

  public cleanup(): void {
    this.messageQueue = [];
    this.apiCallMetrics.clear();
    this.isActive = false;
  }
}

export class ContentScriptIntegration {
  private monitor: PerformanceMonitor;
  private domObserver: MutationObserver | null = null;
  private indicatorCount = 0;
  private lastDOMModification = 0;

  constructor(monitor: PerformanceMonitor) {
    this.monitor = monitor;
    this.setupContentScriptHooks();
  }

  private setupContentScriptHooks(): void {
    // Monitor DOM manipulation performance
    this.setupDOMPerformanceTracking();
    
    // Monitor visual indicator impact
    this.setupIndicatorPerformanceTracking();
    
    // Monitor page load impact
    this.setupPageLoadImpactTracking();
    
    // Monitor scroll performance
    this.setupScrollPerformanceTracking();
  }

  private setupDOMPerformanceTracking(): void {
    // Monitor DOM mutations that might affect performance
    this.domObserver = new MutationObserver((mutations) => {
      const startTime = performance.now();
      let significantChanges = 0;

      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          const truthlensNodes = Array.from(mutation.addedNodes).filter(node => 
            node.nodeType === Node.ELEMENT_NODE &&
            (node as Element).className?.includes('truthlens')
          );
          
          if (truthlensNodes.length > 0) {
            significantChanges += truthlensNodes.length;
          }
        }
      });

      if (significantChanges > 0) {
        const processingTime = performance.now() - startTime;
        this.monitor.recordMeasurement('pageLoadImpact', processingTime, {
          metadata: { 
            type: 'dom-mutation',
            elementCount: significantChanges,
            source: 'truthlens'
          }
        });
      }

      this.lastDOMModification = Date.now();
    });

    this.domObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });
  }

  private setupIndicatorPerformanceTracking(): void {
    // Monitor indicator creation performance
    window.addEventListener('truthlens:indicator-created', (event) => {
      const { duration, indicatorId } = (event as CustomEvent).detail;
      this.indicatorCount++;
      
      this.monitor.recordMeasurement('responseTime', duration, {
        metadata: {
          type: 'indicator-creation',
          indicatorId,
          totalIndicators: this.indicatorCount
        }
      });

      // Track memory impact of indicators
      this.trackIndicatorMemoryImpact();
    });

    window.addEventListener('truthlens:indicator-destroyed', () => {
      this.indicatorCount = Math.max(0, this.indicatorCount - 1);
    });
  }

  private trackIndicatorMemoryImpact(): void {
    // Estimate memory impact of indicators
    if ('memory' in performance) {
      const memoryInfo = (performance as any).memory;
      const estimatedIndicatorMemory = this.indicatorCount * 50000; // Estimate 50KB per indicator
      
      this.monitor.recordMeasurement('memoryUsage', memoryInfo.usedJSHeapSize, {
        metadata: {
          estimatedIndicatorMemory,
          indicatorCount: this.indicatorCount
        }
      });
    }
  }

  private setupPageLoadImpactTracking(): void {
    // Monitor the extension's impact on initial page load
    window.addEventListener('load', () => {
      // Measure time from navigation start to load complete
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        const loadTime = navigation.loadEventEnd - navigation.navigationStart;
        
        // Estimate extension impact (this is approximate)
        const extensionElements = document.querySelectorAll('[class*="truthlens"]').length;
        const estimatedImpact = extensionElements * 10; // Estimate 10ms per element
        
        this.monitor.recordMeasurement('pageLoadImpact', estimatedImpact, {
          metadata: {
            totalLoadTime: loadTime,
            extensionElements,
            type: 'initial-load'
          }
        });
      }
    });

    // Monitor resource loading impact
    this.monitorResourceLoadingImpact();
  }

  private monitorResourceLoadingImpact(): void {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach(entry => {
        const resource = entry as PerformanceResourceTiming;
        
        // Check if this is an extension resource
        if (resource.name.includes('chrome-extension://') || 
            resource.name.includes('truthlens')) {
          
          const loadTime = resource.responseEnd - resource.requestStart;
          this.monitor.recordMeasurement('pageLoadImpact', loadTime, {
            metadata: {
              resourceName: resource.name,
              resourceType: resource.initiatorType,
              size: resource.transferSize || 0,
              cached: resource.transferSize === 0
            }
          });
        }
      });
    });

    observer.observe({ entryTypes: ['resource'] });
  }

  private setupScrollPerformanceTracking(): void {
    let scrollStartTime = 0;
    let isScrolling = false;

    const onScrollStart = () => {
      if (!isScrolling) {
        scrollStartTime = performance.now();
        isScrolling = true;
      }
    };

    const onScrollEnd = () => {
      if (isScrolling) {
        const scrollDuration = performance.now() - scrollStartTime;
        
        // Only record if scroll took longer than 16ms (60fps threshold)
        if (scrollDuration > 16) {
          this.monitor.recordMeasurement('responseTime', scrollDuration, {
            metadata: {
              type: 'scroll-performance',
              indicatorsVisible: this.indicatorCount
            }
          });
        }
        
        isScrolling = false;
      }
    };

    let scrollTimeout: number;
    window.addEventListener('scroll', () => {
      onScrollStart();
      
      clearTimeout(scrollTimeout);
      scrollTimeout = window.setTimeout(onScrollEnd, 150);
    }, { passive: true });
  }

  // Public API methods

  public getIndicatorCount(): number {
    return this.indicatorCount;
  }

  public getLastDOMModification(): number {
    return this.lastDOMModification;
  }

  public measureCustomOperation(operationName: string, fn: () => void | Promise<void>): Promise<number> {
    const measurementId = `custom-${operationName}`;
    this.monitor.startMeasurement(measurementId);

    const result = fn();

    if (result && typeof result.then === 'function') {
      return result.then(() => {
        return this.monitor.endMeasurement(measurementId);
      });
    } else {
      return Promise.resolve(this.monitor.endMeasurement(measurementId));
    }
  }

  public cleanup(): void {
    if (this.domObserver) {
      this.domObserver.disconnect();
      this.domObserver = null;
    }
    
    this.indicatorCount = 0;
    this.lastDOMModification = 0;
  }
}

// Factory function to create appropriate integration based on context
export function createPerformanceIntegration(
  monitor: PerformanceMonitor,
  context: ExtensionContext
): ServiceWorkerIntegration | ContentScriptIntegration {
  switch (context.context) {
    case 'background':
      return new ServiceWorkerIntegration(monitor);
    case 'content':
      return new ContentScriptIntegration(monitor);
    default:
      throw new Error(`Unsupported context: ${context.context}`);
  }
}

// Utility functions for performance optimization

export class PerformanceOptimizer {
  private static lazyLoadThreshold = 100; // Load after 100ms
  private static memoryCleanupInterval = 60000; // Clean every minute

  public static lazy<T>(factory: () => T, delay = PerformanceOptimizer.lazyLoadThreshold): Promise<T> {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(factory());
      }, delay);
    });
  }

  public static debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: number;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => func(...args), delay);
    };
  }

  public static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  public static startMemoryCleanup(): void {
    setInterval(() => {
      // Force garbage collection if available
      if ((window as any).gc) {
        try {
          (window as any).gc();
        } catch (e) {
          // GC not available
        }
      }

      // Clear any expired cache entries
      PerformanceOptimizer.clearExpiredCaches();
    }, PerformanceOptimizer.memoryCleanupInterval);
  }

  private static clearExpiredCaches(): void {
    // Clear expired performance data from various caches
    try {
      // Clear old performance entries
      if (performance.clearMarks) {
        performance.clearMarks();
      }
      if (performance.clearMeasures) {
        performance.clearMeasures();
      }
    } catch (e) {
      // Methods not available
    }
  }

  public static preloadCriticalResources(resources: string[]): void {
    resources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource;
      link.as = this.getResourceType(resource);
      document.head.appendChild(link);
    });
  }

  private static getResourceType(url: string): string {
    if (url.endsWith('.css')) return 'style';
    if (url.endsWith('.js')) return 'script';
    if (url.match(/\.(png|jpg|jpeg|gif|webp)$/)) return 'image';
    return 'fetch';
  }
}