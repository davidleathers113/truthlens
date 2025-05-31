/**
 * Async Error Handler Utilities - 2025 Best Practices
 * Modern async/await error handling with retry mechanisms and structured logging
 */

import { Result, AsyncResult, Ok, Err } from '../types/result';
import { logger } from '../services/logger';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryWhen?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

export interface TimeoutConfig {
  timeoutMs: number;
  timeoutMessage?: string;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  monitoringPeriodMs: number;
}

class AsyncErrorHandler {
  private circuitBreakers = new Map<string, {
    failures: number;
    lastFailure: number;
    state: 'closed' | 'open' | 'half-open';
  }>();

  /**
   * Safe async wrapper with comprehensive error handling
   */
  public async safe<T>(
    operation: () => Promise<T>,
    context?: string
  ): AsyncResult<T> {
    try {
      const result = await operation();
      return Ok(result);
    } catch (error) {
      const errorContext = context || 'unknown-operation';

      // Log the error with context
      logger.error('Async operation failed', {
        context: errorContext,
        operation: operation.name || 'anonymous'
      }, error as Error);

      return Err(error as Error);
    }
  }

  /**
   * Async operation with timeout
   */
  public async withTimeout<T>(
    operation: () => Promise<T>,
    config: TimeoutConfig
  ): AsyncResult<T> {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(config.timeoutMessage || `Operation timed out after ${config.timeoutMs}ms`));
        }, config.timeoutMs);
      });

      const result = await Promise.race([operation(), timeoutPromise]);
      return Ok(result);
    } catch (error) {
      logger.warn('Operation timed out', {
        timeoutMs: config.timeoutMs,
        operation: operation.name
      });

      return Err(error as Error);
    }
  }

  /**
   * Retry with exponential backoff and jitter
   */
  public async withRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig,
    context?: string
  ): AsyncResult<T> {
    const operationName = context || operation.name || 'anonymous';
    let lastError: Error;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const result = await operation();

        if (attempt > 0) {
          logger.info('Operation succeeded after retry', {
            operation: operationName,
            attempt,
            totalAttempts: attempt + 1
          });
        }

        return Ok(result);
      } catch (error) {
        lastError = error as Error;

        if (attempt === config.maxRetries) {
          logger.error('Operation failed after all retries', {
            operation: operationName,
            totalAttempts: attempt + 1,
            maxRetries: config.maxRetries
          }, lastError);
          break;
        }

        // Check if we should retry this error
        if (config.retryWhen && !config.retryWhen(error)) {
          logger.warn('Operation failed with non-retryable error', {
            operation: operationName,
            attempt: attempt + 1
          }, lastError);
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const baseDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt);
        const jitter = baseDelay * 0.1 * Math.random(); // 10% jitter
        const delay = Math.min(baseDelay + jitter, config.maxDelay);

        logger.warn('Operation failed, retrying', {
          operation: operationName,
          attempt: attempt + 1,
          maxRetries: config.maxRetries,
          delayMs: Math.round(delay),
          error: lastError.message
        });

        // Call retry callback if provided
        config.onRetry?.(attempt + 1, error);

        await this.sleep(delay);
      }
    }

    return Err(lastError!);
  }

  /**
   * Circuit breaker pattern implementation
   */
  public async withCircuitBreaker<T>(
    operationId: string,
    operation: () => Promise<T>,
    config: CircuitBreakerConfig
  ): AsyncResult<T> {
    const breaker = this.getOrCreateCircuitBreaker(operationId, config);

    // Check if circuit is open
    if (breaker.state === 'open') {
      const timeSinceLastFailure = Date.now() - breaker.lastFailure;

      if (timeSinceLastFailure < config.resetTimeoutMs) {
        logger.warn('Circuit breaker is open', {
          operationId,
          state: breaker.state,
          failures: breaker.failures,
          timeSinceLastFailure
        });
        return Err(new Error(`Circuit breaker is open for operation: ${operationId}`));
      } else {
        // Try to reset the circuit breaker
        breaker.state = 'half-open';
        logger.info('Circuit breaker transitioning to half-open', { operationId });
      }
    }

    try {
      const result = await operation();

      // Success - reset circuit breaker
      if (breaker.state === 'half-open') {
        breaker.state = 'closed';
        breaker.failures = 0;
        logger.info('Circuit breaker reset to closed', { operationId });
      }

      return Ok(result);
    } catch (error) {
      // Failure - update circuit breaker
      breaker.failures++;
      breaker.lastFailure = Date.now();

      if (breaker.failures >= config.failureThreshold) {
        breaker.state = 'open';
        logger.warn('Circuit breaker opened due to failures', {
          operationId,
          failures: breaker.failures,
          threshold: config.failureThreshold
        });
      }

      logger.error('Circuit breaker operation failed', {
        operationId,
        failures: breaker.failures,
        state: breaker.state
      }, error as Error);

      return Err(error as Error);
    }
  }

  /**
   * Parallel execution with error handling
   */
  public async parallel<T>(
    operations: Array<() => Promise<T>>,
    options: {
      concurrency?: number;
      failFast?: boolean;
      retryConfig?: RetryConfig;
    } = {}
  ): Promise<Result<T[], Error[]>> {
    const { concurrency = operations.length, failFast = false, retryConfig } = options;

    try {
      const results: T[] = [];
      const errors: Error[] = [];

      // Execute operations in batches based on concurrency limit
      for (let i = 0; i < operations.length; i += concurrency) {
        const batch = operations.slice(i, i + concurrency);

        const batchPromises = batch.map(async (operation, index) => {
          try {
            let result: T;

            if (retryConfig) {
              const retryResult = await this.withRetry(operation, retryConfig, `parallel-${i + index}`);
              if (retryResult.success) {
                result = retryResult.data;
              } else {
                throw retryResult.error;
              }
            } else {
              result = await operation();
            }

            return { success: true, data: result, index: i + index };
          } catch (error) {
            return { success: false, error: error as Error, index: i + index };
          }
        });

        const batchResults = await Promise.all(batchPromises);

        for (const result of batchResults) {
          if (result.success) {
            results[result.index] = result.data as T;
          } else {
            errors.push(result.error!);

            if (failFast) {
              logger.error('Parallel execution failed fast', {
                totalOperations: operations.length,
                completedOperations: results.length,
                errors: errors.length
              });
              return Err(errors);
            }
          }
        }
      }

      if (errors.length > 0 && !failFast) {
        logger.warn('Parallel execution completed with errors', {
          totalOperations: operations.length,
          successfulOperations: results.length,
          failedOperations: errors.length
        });
      }

      return Ok(results);
    } catch (error) {
      logger.error('Parallel execution framework error', {}, error as Error);
      return Err([error as Error]);
    }
  }

  /**
   * Queue operations for sequential execution with error handling
   */
  public async sequential<T>(
    operations: Array<() => Promise<T>>,
    options: {
      stopOnError?: boolean;
      retryConfig?: RetryConfig;
    } = {}
  ): Promise<Result<T[], Error[]>> {
    const { stopOnError = false, retryConfig } = options;
    const results: T[] = [];
    const errors: Error[] = [];

    for (let i = 0; i < operations.length; i++) {
      try {
        let result: T;

        if (retryConfig) {
          const retryResult = await this.withRetry(operations[i], retryConfig, `sequential-${i}`);
          if (retryResult.success) {
            result = retryResult.data;
          } else {
            throw retryResult.error;
          }
        } else {
          result = await operations[i]();
        }

        results.push(result);
      } catch (error) {
        errors.push(error as Error);

        if (stopOnError) {
          logger.error('Sequential execution stopped on error', {
            totalOperations: operations.length,
            completedOperations: results.length,
            operationIndex: i
          }, error as Error);
          break;
        }
      }
    }

    if (errors.length > 0) {
      logger.warn('Sequential execution completed with errors', {
        totalOperations: operations.length,
        successfulOperations: results.length,
        failedOperations: errors.length
      });
    }

    return errors.length === 0 ? Ok(results) : Err(errors);
  }

  /**
   * Debounced async operation
   */
  public debounced<T>(
    operation: () => Promise<T>,
    delayMs: number,
    key: string
  ): () => Promise<T> {
    const debounceMap = new Map<string, { timer: number; resolve: Function; reject: Function }>();

    return () => {
      return new Promise<T>((resolve, reject) => {
        // Clear existing timer if any
        const existing = debounceMap.get(key);
        if (existing) {
          clearTimeout(existing.timer);
        }

        // Set new timer
        const timer = window.setTimeout(async () => {
          try {
            const result = await operation();
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            debounceMap.delete(key);
          }
        }, delayMs);

        debounceMap.set(key, { timer, resolve, reject });
      });
    };
  }

  /**
   * Memoized async operation with TTL
   */
  public memoized<T>(
    operation: (...args: any[]) => Promise<T>,
    ttlMs: number,
    keyGenerator?: (...args: any[]) => string
  ): (...args: any[]) => Promise<T> {
    const cache = new Map<string, { data: T; timestamp: number }>();

    return async (...args: any[]): Promise<T> => {
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
      const cached = cache.get(key);

      if (cached && Date.now() - cached.timestamp < ttlMs) {
        return cached.data;
      }

      try {
        const result = await operation(...args);
        cache.set(key, { data: result, timestamp: Date.now() });
        return result;
      } catch (error) {
        // Remove invalid cache entry
        cache.delete(key);
        throw error;
      }
    };
  }

  private getOrCreateCircuitBreaker(operationId: string, _config: CircuitBreakerConfig) {
    if (!this.circuitBreakers.has(operationId)) {
      this.circuitBreakers.set(operationId, {
        failures: 0,
        lastFailure: 0,
        state: 'closed'
      });
    }
    return this.circuitBreakers.get(operationId)!;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up circuit breakers (call periodically)
   */
  public cleanupCircuitBreakers(): void {
    const now = Date.now();
    const cleanupThreshold = 5 * 60 * 1000; // 5 minutes

    for (const [operationId, breaker] of this.circuitBreakers.entries()) {
      if (now - breaker.lastFailure > cleanupThreshold && breaker.state === 'closed') {
        this.circuitBreakers.delete(operationId);
      }
    }
  }

  /**
   * Get circuit breaker status for monitoring
   */
  public getCircuitBreakerStatus(): Record<string, any> {
    const status: Record<string, any> = {};

    for (const [operationId, breaker] of this.circuitBreakers.entries()) {
      status[operationId] = {
        state: breaker.state,
        failures: breaker.failures,
        lastFailure: breaker.lastFailure,
        timeSinceLastFailure: Date.now() - breaker.lastFailure
      };
    }

    return status;
  }
}

// Export singleton instance
export const asyncErrorHandler = new AsyncErrorHandler();

// Convenience functions for common patterns
export const safe = asyncErrorHandler.safe.bind(asyncErrorHandler);
export const withTimeout = asyncErrorHandler.withTimeout.bind(asyncErrorHandler);
export const withRetryPattern = asyncErrorHandler.withRetry.bind(asyncErrorHandler);
export const withCircuitBreaker = asyncErrorHandler.withCircuitBreaker.bind(asyncErrorHandler);
export const parallel = asyncErrorHandler.parallel.bind(asyncErrorHandler);
export const sequential = asyncErrorHandler.sequential.bind(asyncErrorHandler);

// Default retry configurations for common scenarios
export const retryConfigs = {
  network: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryWhen: (error: any) => {
      // Retry on network errors, timeouts, and 5xx status codes
      return error.name === 'NetworkError' ||
             error.name === 'TimeoutError' ||
             (error.status && error.status >= 500);
    }
  },
  ai: {
    maxRetries: 2,
    baseDelay: 2000,
    maxDelay: 8000,
    backoffMultiplier: 2,
    retryWhen: (error: any) => {
      // Retry on temporary AI service issues
      return error.message?.includes('temporarily unavailable') ||
             error.message?.includes('rate limit') ||
             error.status === 503;
    }
  },
  storage: {
    maxRetries: 3,
    baseDelay: 500,
    maxDelay: 5000,
    backoffMultiplier: 2,
    retryWhen: (error: any) => {
      // Retry on storage quota issues and temporary failures
      return error.name === 'QuotaExceededError' ||
             error.name === 'DataError' ||
             error.message?.includes('storage');
    }
  }
} as const;

export default AsyncErrorHandler;
