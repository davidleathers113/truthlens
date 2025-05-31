// Performance testing utilities for TruthLens
// Measures execution time, memory usage, and performance benchmarks

export class PerformanceBenchmark {
  private measurements: Map<string, number[]> = new Map();
  private memoryBaseline: number | null = null;

  /**
   * Measure execution time of an async function
   */
  async measureTime<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    const duration = end - start;

    if (!this.measurements.has(name)) {
      this.measurements.set(name, []);
    }
    this.measurements.get(name)!.push(duration);

    return result;
  }

  /**
   * Measure memory usage (mock implementation for testing)
   */
  measureMemory(): { used: number; total: number } {
    // In real implementation, this would use performance.measureUserAgentSpecificMemory()
    // or Chrome DevTools Memory API
    return {
      used: Math.random() * 50 * 1024 * 1024, // Random MB usage for testing
      total: 100 * 1024 * 1024, // 100MB total
    };
  }

  /**
   * Set memory baseline for comparison
   */
  setMemoryBaseline(): void {
    const memory = this.measureMemory();
    this.memoryBaseline = memory.used;
  }

  /**
   * Get memory usage increase since baseline
   */
  getMemoryIncrease(): number {
    if (this.memoryBaseline === null) {
      throw new Error('Memory baseline not set. Call setMemoryBaseline() first.');
    }
    const current = this.measureMemory();
    return current.used - this.memoryBaseline;
  }

  /**
   * Get performance statistics for a measurement
   */
  getStats(name: string): {
    count: number;
    average: number;
    min: number;
    max: number;
    p95: number;
  } | null {
    const measurements = this.measurements.get(name);
    if (!measurements || measurements.length === 0) {
      return null;
    }

    const sorted = [...measurements].sort((a, b) => a - b);
    const count = measurements.length;
    const sum = measurements.reduce((a, b) => a + b, 0);
    const average = sum / count;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const p95Index = Math.floor(count * 0.95);
    const p95 = sorted[p95Index];

    return { count, average, min, max, p95 };
  }

  /**
   * Assert performance targets are met
   */
  assertTarget(name: string, maxTime: number): void {
    const stats = this.getStats(name);
    if (!stats) {
      throw new Error(`No measurements found for "${name}"`);
    }

    if (stats.average > maxTime) {
      throw new Error(
        `Performance target exceeded for "${name}": ` +
        `average ${stats.average.toFixed(2)}ms > ${maxTime}ms target`
      );
    }

    if (stats.p95 > maxTime * 1.5) {
      throw new Error(
        `Performance P95 target exceeded for "${name}": ` +
        `P95 ${stats.p95.toFixed(2)}ms > ${(maxTime * 1.5).toFixed(2)}ms target`
      );
    }
  }

  /**
   * Clear all measurements
   */
  clear(): void {
    this.measurements.clear();
    this.memoryBaseline = null;
  }

  /**
   * Get all measurements summary
   */
  getSummary(): Record<string, ReturnType<typeof this.getStats>> {
    const summary: Record<string, ReturnType<typeof this.getStats>> = {};
    for (const [name] of this.measurements) {
      summary[name] = this.getStats(name);
    }
    return summary;
  }
}

/**
 * Chrome extension specific performance targets
 */
export const PERFORMANCE_TARGETS = {
  // Content analysis should complete within 1 second
  CONTENT_ANALYSIS: 1000,
  
  // Storage operations should be fast
  STORAGE_READ: 50,
  STORAGE_WRITE: 100,
  
  // Indicator display should be immediate
  INDICATOR_DISPLAY: 50,
  
  // Background script initialization
  BACKGROUND_INIT: 500,
  
  // Content script injection
  CONTENT_INJECT: 200,
  
  // Memory usage limits (in MB)
  MEMORY_BACKGROUND_SCRIPT: 10,
  MEMORY_CONTENT_SCRIPT: 5,
  MEMORY_POPUP: 5,
} as const;

/**
 * Benchmark a function multiple times and assert performance
 */
export async function benchmarkFunction<T>(
  name: string,
  fn: () => Promise<T>,
  iterations: number = 10,
  targetMs: number = 1000
): Promise<void> {
  const benchmark = new PerformanceBenchmark();
  
  // Warm up
  await fn();
  
  // Run benchmarks
  for (let i = 0; i < iterations; i++) {
    await benchmark.measureTime(name, fn);
  }
  
  // Assert performance target
  benchmark.assertTarget(name, targetMs);
  
  // Log results
  const stats = benchmark.getStats(name);
  console.log(`Benchmark "${name}":`, stats);
}

/**
 * Test Chrome extension memory impact
 */
export function measureExtensionMemoryImpact(): {
  beforeExtension: number;
  afterExtension: number;
  impact: number;
} {
  // Mock implementation for testing
  // In real usage, this would measure actual memory before/after extension load
  const beforeExtension = 100 * 1024 * 1024; // 100MB
  const afterExtension = 115 * 1024 * 1024; // 115MB
  const impact = afterExtension - beforeExtension;
  
  return {
    beforeExtension,
    afterExtension,
    impact,
  };
}

/**
 * Simulate page load impact measurement
 */
export async function measurePageLoadImpact(
  withExtension: () => Promise<number>,
  withoutExtension: () => Promise<number>
): Promise<{
  withExtension: number;
  withoutExtension: number;
  impact: number;
  impactPercentage: number;
}> {
  const loadTimeWithout = await withoutExtension();
  const loadTimeWith = await withExtension();
  const impact = loadTimeWith - loadTimeWithout;
  const impactPercentage = (impact / loadTimeWithout) * 100;
  
  return {
    withExtension: loadTimeWith,
    withoutExtension: loadTimeWithout,
    impact,
    impactPercentage,
  };
}

/**
 * Performance test helper
 */
export const performanceTest = {
  /**
   * Test that a function completes within time limit
   */
  async withinTime<T>(fn: () => Promise<T>, maxMs: number): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    const duration = end - start;
    
    if (duration > maxMs) {
      throw new Error(`Operation took ${duration.toFixed(2)}ms, expected < ${maxMs}ms`);
    }
    
    return result;
  },

  /**
   * Test memory usage stays within limits
   */
  withMemoryLimit<T>(fn: () => T, maxMB: number): T {
    const benchmark = new PerformanceBenchmark();
    benchmark.setMemoryBaseline();
    
    const result = fn();
    
    const memoryIncrease = benchmark.getMemoryIncrease();
    const maxBytes = maxMB * 1024 * 1024;
    
    if (memoryIncrease > maxBytes) {
      throw new Error(
        `Memory usage increased by ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB, ` +
        `expected < ${maxMB}MB`
      );
    }
    
    return result;
  },

  /**
   * Measure and log performance metrics
   */
  async profile<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const benchmark = new PerformanceBenchmark();
    benchmark.setMemoryBaseline();
    
    const result = await benchmark.measureTime(name, fn);
    const stats = benchmark.getStats(name);
    const memoryIncrease = benchmark.getMemoryIncrease();
    
    console.log(`Performance Profile "${name}":`, {
      executionTime: stats?.average,
      memoryIncrease: memoryIncrease / 1024 / 1024, // MB
    });
    
    return result;
  },
};