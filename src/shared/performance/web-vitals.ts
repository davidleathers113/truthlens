/**
 * Web Vitals Monitor - 2025 Core Web Vitals Implementation
 * Using PerformanceObserver with INP (replaced FID), LCP, and CLS
 */

import { WebVitalsEntry } from './types';

// 2025 TypeScript best practice: Extend PerformanceEventTiming for INP measurement
interface ExtendedPerformanceEventTiming extends PerformanceEventTiming {
  interactionId?: number;
  durationThreshold?: number;
}

type WebVitalCallback = (vital: WebVitalsEntry) => void;

interface WebVitalConfig {
  reportAllChanges: boolean;
  buffered: boolean;
  threshold: number;
}

export class WebVitalsMonitor {
  private callbacks: Set<WebVitalCallback> = new Set();
  private observers: Map<string, PerformanceObserver> = new Map();
  private measurements: Map<string, WebVitalsEntry> = new Map();
  private config: WebVitalConfig;
  private isBrowserSupported: boolean;

  constructor(config: Partial<WebVitalConfig> = {}) {
    this.config = {
      reportAllChanges: false,
      buffered: true,
      threshold: 0,
      ...config
    };

    this.isBrowserSupported = this.checkSupport();

    if (this.isBrowserSupported) {
      this.initializeObservers();
    } else {
      console.warn('[WebVitalsMonitor] PerformanceObserver not supported');
    }
  }

  private checkSupport(): boolean {
    return (
      'PerformanceObserver' in window &&
      'performance' in window &&
      'now' in performance
    );
  }

  private initializeObservers(): void {
    // Initialize LCP (Largest Contentful Paint) observer
    this.initializeLCP();

    // Initialize INP (Interaction to Next Paint) observer - replaced FID in 2024
    this.initializeINP();

    // Initialize CLS (Cumulative Layout Shift) observer
    this.initializeCLS();
  }

  private initializeLCP(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry;

        if (lastEntry) {
          this.reportWebVital('LCP', lastEntry.startTime, {
            entries: [lastEntry],
            navigationType: this.getNavigationType()
          });
        }
      });

      observer.observe({
        type: 'largest-contentful-paint',
        buffered: this.config.buffered
      });

      this.observers.set('lcp', observer);

      // LCP can change until user input or page hidden
      this.setupLCPFinalization();

    } catch (error) {
      console.warn('[WebVitalsMonitor] LCP observer initialization failed:', error);
    }
  }

  private setupLCPFinalization(): void {
    const finalizeLCP = () => {
      const lcpEntry = this.measurements.get('LCP');
      if (lcpEntry) {
        this.reportFinalVital(lcpEntry);
      }
    };

    // Finalize LCP on first user interaction
    ['keydown', 'click', 'touchstart'].forEach(event => {
      document.addEventListener(event, finalizeLCP, { once: true, passive: true });
    });

    // Finalize LCP when page becomes hidden
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        finalizeLCP();
      }
    }, { once: true });
  }

  private initializeINP(): void {
    // INP (Interaction to Next Paint) replaced FID in March 2024
    try {
      let longestInteraction = 0;
      const interactions: ExtendedPerformanceEventTiming[] = [];

      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries() as ExtendedPerformanceEventTiming[];

        entries.forEach(entry => {
          // Only consider actual interactions (not just any event)
          if (entry.interactionId) {
            interactions.push(entry);

            // Group interactions by interactionId and calculate max duration
            const interactionGroups = this.groupInteractionsByID(interactions);
            const maxDuration = Math.max(...Object.values(interactionGroups));

            if (maxDuration > longestInteraction) {
              longestInteraction = maxDuration;

              this.reportWebVital('INP', maxDuration, {
                entries: interactions.filter(e =>
                  this.getInteractionDuration(e, interactionGroups[e.interactionId || 0]) === maxDuration
                ),
                navigationType: this.getNavigationType()
              });
            }
          }
        });
      });

      observer.observe({
        type: 'event',
        buffered: this.config.buffered
        // Note: durationThreshold removed as it's not part of PerformanceObserverInit in 2025
      });

      this.observers.set('inp', observer);

      // Finalize INP when page becomes hidden
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && longestInteraction > 0) {
          const inpEntry = this.measurements.get('INP');
          if (inpEntry) {
            this.reportFinalVital(inpEntry);
          }
        }
      }, { once: true });

    } catch (error) {
      console.warn('[WebVitalsMonitor] INP observer initialization failed:', error);
    }
  }

  private groupInteractionsByID(interactions: ExtendedPerformanceEventTiming[]): Record<number, number> {
    const groups: Record<number, ExtendedPerformanceEventTiming[]> = {};

    interactions.forEach(interaction => {
      const id = interaction.interactionId || 0;
      if (!groups[id]) groups[id] = [];
      groups[id].push(interaction);
    });

    // Calculate max duration for each interaction group
    const durations: Record<number, number> = {};
    Object.entries(groups).forEach(([id, entries]) => {
      durations[parseInt(id)] = Math.max(...entries.map(e => this.getInteractionDuration(e, 0)));
    });

    return durations;
  }

  private getInteractionDuration(entry: PerformanceEventTiming, _groupDuration: number): number {
    void _groupDuration; // 2025 TypeScript best practice: Suppress unused parameter warning
    // For INP, we need the full interaction duration including processing time
    return entry.processingEnd - entry.startTime;
  }

  private initializeCLS(): void {
    try {
      let clsValue = 0;
      const clsEntries: PerformanceEntry[] = [];

      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();

        entries.forEach(entry => {
          const layoutShiftEntry = entry as any; // LayoutShift interface

          // Only count layout shifts not caused by user input
          if (!layoutShiftEntry.hadRecentInput) {
            clsValue += layoutShiftEntry.value;
            clsEntries.push(entry);

            this.reportWebVital('CLS', clsValue, {
              entries: clsEntries.slice(), // Copy array
              navigationType: this.getNavigationType()
            });
          }
        });
      });

      observer.observe({
        type: 'layout-shift',
        buffered: this.config.buffered
      });

      this.observers.set('cls', observer);

      // Finalize CLS when page becomes hidden
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          const clsEntry = this.measurements.get('CLS');
          if (clsEntry) {
            this.reportFinalVital(clsEntry);
          }
        }
      }, { once: true });

    } catch (error) {
      console.warn('[WebVitalsMonitor] CLS observer initialization failed:', error);
    }
  }

  private reportWebVital(
    name: 'LCP' | 'INP' | 'CLS',
    value: number,
    options: {
      entries: PerformanceEntry[];
      navigationType: string;
    }
  ): void {
    const vital: WebVitalsEntry = {
      name,
      value,
      rating: this.getRating(name, value),
      delta: this.calculateDelta(name, value),
      entries: options.entries,
      id: this.generateVitalId(name),
      navigationType: options.navigationType as any
    };

    // Store measurement
    this.measurements.set(name, vital);

    // Report to callbacks if above threshold or reportAllChanges is true
    if (this.config.reportAllChanges || value > this.config.threshold) {
      this.callbacks.forEach(callback => {
        try {
          callback(vital);
        } catch (error) {
          console.error('[WebVitalsMonitor] Callback error:', error);
        }
      });
    }
  }

  private getRating(name: 'LCP' | 'INP' | 'CLS', value: number): 'good' | 'needs-improvement' | 'poor' {
    // 2025 Web Vitals thresholds
    const thresholds = {
      LCP: { good: 2500, poor: 4000 },  // ms
      INP: { good: 200, poor: 500 },    // ms
      CLS: { good: 0.1, poor: 0.25 }    // unitless
    };

    const threshold = thresholds[name];

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  private calculateDelta(name: string, value: number): number {
    const previous = this.measurements.get(name);
    return previous ? value - previous.value : value;
  }

  private generateVitalId(name: string): string {
    return `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getNavigationType(): string {
    // 2025 TypeScript best practice: Use proper type guards for performance API
    if ('navigation' in performance && (performance as any).navigation) {
      const nav = (performance as any).navigation;
      return nav.type || 'navigate';
    }

    // Fallback for older browsers
    if (performance.getEntriesByType) {
      const navEntries = performance.getEntriesByType('navigation');
      if (navEntries.length > 0) {
        return (navEntries[0] as any).type || 'navigate';
      }
    }

    return 'navigate';
  }

  private reportFinalVital(vital: WebVitalsEntry): void {
    // Mark as final measurement
    const finalVital = {
      ...vital,
      isFinal: true
    };

    this.callbacks.forEach(callback => {
      try {
        callback(finalVital as any);
      } catch (error) {
        console.error('[WebVitalsMonitor] Final callback error:', error);
      }
    });
  }

  // Public API methods

  public onVital(callback: WebVitalCallback): () => void {
    this.callbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  public getCurrentVitals(): Record<string, WebVitalsEntry> {
    return Object.fromEntries(this.measurements);
  }

  public getVitalScore(): number {
    const vitals = this.getCurrentVitals();
    // 2025 TypeScript best practice: Explicit type annotation for reduce operations
    const scores: number[] = Object.values(vitals).map(vital => {
      switch (vital.rating) {
        case 'good': return 100;
        case 'needs-improvement': return 60;
        case 'poor': return 20;
        default: return 0;
      }
    });

    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  }

  public isSupported(): boolean {
    return this.isBrowserSupported;
  }

  public updateConfig(newConfig: Partial<WebVitalConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public cleanup(): void {
    // Disconnect all observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();

    // Clear callbacks and measurements
    this.callbacks.clear();
    this.measurements.clear();
  }
}
