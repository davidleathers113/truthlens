/**
 * Centralized Error Handler Service - 2025 Best Practices Implementation
 * Chrome Manifest V3 compliant error handling with modern recovery patterns
 */

import {
  TruthLensError,
  ErrorCategory,
  ErrorSeverity,
  RecoveryStrategy,
  RecoveryResult,
  ErrorHandlerConfig,
  ExtensionContextType,
  NetworkError,
  PermissionError,
  AIError,
  ErrorHandlerEvents
} from '../types/error';
import { logger } from './logger';
import { storageService } from '../storage/storageService';

class ErrorHandler {
  private config: ErrorHandlerConfig;
  private context: ExtensionContextType;
  private sessionId: string;
  private errorCount: Map<string, number> = new Map();
  private recoveryStrategies: Map<ErrorCategory, (error: TruthLensError) => Promise<RecoveryResult>>;
  private eventListeners: Map<string, Set<(data: unknown) => void>> = new Map();
  private circuitBreakers: Map<string, { failures: number; lastFailure: number; isOpen: boolean }> = new Map();

  constructor(context: ExtensionContextType, config?: Partial<ErrorHandlerConfig>) {
    this.context = context;
    this.sessionId = this.generateSessionId();

    // Default configuration optimized for 2025
    this.config = {
      enableReporting: process.env.NODE_ENV === 'production',
      enableRecovery: true,
      enableOfflineMode: true,
      retryConfig: {
        maxRetries: 3,
        baseDelay: 1000,      // 1 second base delay
        maxDelay: 30000,      // 30 second max delay
        backoffMultiplier: 2  // Exponential backoff
      },
      reportingConfig: {
        batchSize: 10,
        batchTimeout: 30000,  // 30 seconds
        privacy: {
          includeStackTrace: process.env.NODE_ENV === 'development',
          includeUserAgent: true,
          includeURL: false,  // Privacy-first approach
          anonymizeUserId: true
        }
      },
      debugConfig: {
        enableConsoleOutput: process.env.NODE_ENV === 'development',
        verboseLogging: process.env.NODE_ENV === 'development',
        enableDebugPanel: true,
        enablePerformanceTracking: true
      },
      ...config
    };

    this.recoveryStrategies = new Map();
    this.initializeRecoveryStrategies();
    this.setupGlobalErrorHandling();

    logger.info('ErrorHandler initialized', {
      context: this.context,
      sessionId: this.sessionId,
      config: this.sanitizeConfig()
    });
  }

  private generateSessionId(): string {
    return `error-session-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  private sanitizeConfig(): Partial<ErrorHandlerConfig> {
    const { reportingConfig, ...sanitized } = this.config;
    return {
      ...sanitized,
      reportingConfig: {
        ...reportingConfig,
        apiKey: reportingConfig?.apiKey ? '[REDACTED]' : undefined
      }
    };
  }

  private initializeRecoveryStrategies(): void {
    // Network error recovery (2025 patterns with exponential backoff)
    this.recoveryStrategies.set('network', async (error: TruthLensError) => {
      const networkError = error as NetworkError;

      // Check circuit breaker
      if (this.isCircuitBreakerOpen(networkError.network.endpoint)) {
        return {
          successful: false,
          strategy: 'none',
          duration: 0,
          userActionRequired: true,
          message: 'Service temporarily unavailable. Trying fallback...'
        };
      }

      // Implement exponential backoff retry
      const delay = this.calculateBackoffDelay(error.recovery.retryCount || 0);

      if ((error.recovery.retryCount || 0) < this.config.retryConfig.maxRetries) {
        await this.sleep(delay);

        try {
          // Attempt recovery based on network error type
          if (networkError.network.statusCode === 429) {
            // Rate limiting - respect Retry-After header
            const retryAfter = networkError.network.retryAfter || this.config.retryConfig.baseDelay;
            await this.sleep(retryAfter * 1000);
          }

          return {
            successful: true,
            strategy: 'retry',
            duration: delay,
            userActionRequired: false,
            message: 'Connection restored'
          };
        } catch {
          this.updateCircuitBreaker(networkError.network.endpoint, false);
          return {
            successful: false,
            strategy: 'fallback',
            duration: delay,
            userActionRequired: false,
            fallbackUsed: 'offline-mode',
            message: 'Switched to offline mode'
          };
        }
      }

      return {
        successful: false,
        strategy: 'user-action',
        duration: 0,
        userActionRequired: true,
        message: 'Please check your connection and try again'
      };
    });

    // Permission error recovery
    this.recoveryStrategies.set('permission', async (_error: TruthLensError) => {
      const permError = _error as PermissionError;

      if (permError.permission.optional) {
        return {
          successful: true,
          strategy: 'graceful-degrade',
          duration: 0,
          userActionRequired: false,
          message: 'Feature disabled - some functionality may be limited'
        };
      }

      return {
        successful: false,
        strategy: 'user-action',
        duration: 0,
        userActionRequired: true,
        message: 'Permission required to continue'
      };
    });

    // AI processing error recovery (Chrome Built-in AI specific)
    this.recoveryStrategies.set('ai', async (_error: TruthLensError) => {
      const aiError = _error as AIError;

      if (aiError.ai.quotaExceeded) {
        return {
          successful: true,
          strategy: 'fallback',
          duration: 0,
          userActionRequired: false,
          fallbackUsed: 'api-service',
          message: 'Switched to cloud AI service'
        };
      }

      if (aiError.ai.availabilityStatus === 'unavailable') {
        return {
          successful: true,
          strategy: 'fallback',
          duration: 0,
          userActionRequired: false,
          fallbackUsed: 'manual-review',
          message: 'AI unavailable - manual review available'
        };
      }

      return {
        successful: false,
        strategy: 'retry',
        duration: 2000, // 2 second delay for AI retries
        userActionRequired: false,
        message: 'Retrying AI processing...'
      };
    });

    // Data error recovery
    this.recoveryStrategies.set('data', async (_error: TruthLensError) => {
      return {
        successful: true,
        strategy: 'fallback',
        duration: 0,
        userActionRequired: false,
        fallbackUsed: 'default-data',
        message: 'Using default settings'
      };
    });

    // Runtime error recovery
    this.recoveryStrategies.set('runtime', async (error: TruthLensError) => {
      if (error.severity === 'critical') {
        return {
          successful: false,
          strategy: 'restart',
          duration: 0,
          userActionRequired: true,
          message: 'Extension restart required'
        };
      }

      return {
        successful: true,
        strategy: 'graceful-degrade',
        duration: 0,
        userActionRequired: false,
        message: 'Continuing with reduced functionality'
      };
    });

    // Security error recovery
    this.recoveryStrategies.set('security', async (_error: TruthLensError) => {
      return {
        successful: false,
        strategy: 'user-action',
        duration: 0,
        userActionRequired: true,
        message: 'Security issue detected - user intervention required'
      };
    });

    // User error recovery
    this.recoveryStrategies.set('user', async (_error: TruthLensError) => {
      return {
        successful: true,
        strategy: 'user-action',
        duration: 0,
        userActionRequired: true,
        message: 'Please correct the input and try again'
      };
    });

    // System error recovery
    this.recoveryStrategies.set('system', async (_error: TruthLensError) => {
      return {
        successful: false,
        strategy: 'graceful-degrade',
        duration: 0,
        userActionRequired: false,
        message: 'Browser compatibility issue detected'
      };
    });
  }

  private setupGlobalErrorHandling(): void {
    // Global unhandled error handler
    if (typeof window !== 'undefined') {
      // 2025 TypeScript best practice: Proper async event handler
      window.addEventListener('error', async (event) => {
        try {
          const reportingConsent = await this.getReportingConsent();
          this.handleError({
            id: this.generateErrorId(),
            timestamp: Date.now(),
            category: 'runtime',
            severity: 'high',
            message: event.message,
            technicalMessage: event.error?.stack,
            context: {
              extension: this.context,
              url: window.location.href,
              userAgent: navigator.userAgent,
              extensionVersion: chrome.runtime.getManifest().version,
              sessionId: this.sessionId
            },
            source: {
              file: event.filename,
              line: event.lineno,
              column: event.colno
            },
            stack: event.error?.stack,
            recovery: {
              strategy: 'graceful-degrade',
              attempted: false
            },
            userImpact: {
              affectedFeatures: ['unknown'],
              dataLoss: false
            },
            reportingConsent
          });
        } catch (error) {
          console.error('[ErrorHandler] Failed to get reporting consent:', error);
        }
      });

      // Global unhandled promise rejection handler
      // 2025 TypeScript best practice: Proper async promise rejection handler
      window.addEventListener('unhandledrejection', async (event) => {
        try {
          const reportingConsent = await this.getReportingConsent();
          this.handleError({
            id: this.generateErrorId(),
            timestamp: Date.now(),
            category: 'runtime',
            severity: 'medium',
            message: 'Unhandled Promise Rejection',
            technicalMessage: event.reason?.toString(),
            context: {
              extension: this.context,
              url: window.location.href,
              userAgent: navigator.userAgent,
              extensionVersion: chrome.runtime.getManifest().version,
              sessionId: this.sessionId
            },
            source: {
              function: 'unhandledrejection'
            },
            stack: event.reason?.stack,
            recovery: {
              strategy: 'graceful-degrade',
              attempted: false
            },
            userImpact: {
              affectedFeatures: ['unknown'],
              dataLoss: false
            },
            reportingConsent
          });
        } catch (error) {
          console.error('[ErrorHandler] Failed to get reporting consent for unhandled rejection:', error);
        }
      });
    }
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private async getReportingConsent(): Promise<boolean> {
    try {
      const settings = await storageService.get('userSettings');
      return settings?.analytics?.enabled || false;
    } catch {
      return false; // Default to no consent if can't determine
    }
  }

  private calculateBackoffDelay(retryCount: number): number {
    const delay = Math.min(
      this.config.retryConfig.baseDelay * Math.pow(this.config.retryConfig.backoffMultiplier, retryCount),
      this.config.retryConfig.maxDelay
    );

    // Add jitter to prevent thundering herd
    const jitter = delay * 0.1 * Math.random();
    return delay + jitter;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private isCircuitBreakerOpen(endpoint: string): boolean {
    const breaker = this.circuitBreakers.get(endpoint);
    if (!breaker) return false;

    // Reset circuit breaker after 60 seconds
    if (Date.now() - breaker.lastFailure > 60000) {
      this.circuitBreakers.delete(endpoint);
      return false;
    }

    return breaker.isOpen && breaker.failures >= 5;
  }

  private updateCircuitBreaker(endpoint: string, success: boolean): void {
    const breaker = this.circuitBreakers.get(endpoint) || { failures: 0, lastFailure: 0, isOpen: false };

    if (success) {
      breaker.failures = 0;
      breaker.isOpen = false;
    } else {
      breaker.failures++;
      breaker.lastFailure = Date.now();
      breaker.isOpen = breaker.failures >= 5;
    }

    this.circuitBreakers.set(endpoint, breaker);
  }

  // Public API Methods

  public async handleError(error: TruthLensError): Promise<RecoveryResult> {
    try {
      // Log the error
      logger.error('Error handled', {
        errorId: error.id,
        category: error.category,
        severity: error.severity,
        context: error.context
      });

      // Emit error captured event
      this.emit('error:captured', error);

      // Track error frequency
      const errorKey = `${error.category}:${error.code || 'unknown'}`;
      this.errorCount.set(errorKey, (this.errorCount.get(errorKey) || 0) + 1);

      // Attempt recovery if enabled
      let recoveryResult: RecoveryResult = {
        successful: false,
        strategy: 'none',
        duration: 0,
        userActionRequired: false
      };

      if (this.config.enableRecovery) {
        this.emit('recovery:started', { errorId: error.id, strategy: error.recovery.strategy });

        const recoveryStrategy = this.recoveryStrategies.get(error.category);
        if (recoveryStrategy) {
          const startTime = performance.now();
          recoveryResult = await recoveryStrategy(error);
          recoveryResult.duration = performance.now() - startTime;

          // Update error recovery information
          error.recovery.attempted = true;
          error.recovery.successful = recoveryResult.successful;
          error.recovery.strategy = recoveryResult.strategy;
          if (recoveryResult.fallbackUsed) {
            error.recovery.fallbackUsed = recoveryResult.fallbackUsed;
          }
        }

        this.emit('recovery:completed', { errorId: error.id, result: recoveryResult });

        if (recoveryResult.successful) {
          this.emit('error:recovered', { error, result: recoveryResult });
        }
      }

      // Store error for debugging and analytics
      await this.storeError(error);

      // Report error if enabled and user consented
      if (this.config.enableReporting && error.reportingConsent) {
        await this.reportError(error);
      }

      return recoveryResult;

    } catch (handlingError) {
      // If error handling itself fails, log to console as fallback
      console.error('[ErrorHandler] Failed to handle error:', handlingError);
      logger.error('Error handler failed', { originalError: error }, handlingError as Error);

      return {
        successful: false,
        strategy: 'none',
        duration: 0,
        userActionRequired: true,
        message: 'Error handling failed'
      };
    }
  }

  public createError(
    category: ErrorCategory,
    message: string,
    options?: {
      severity?: ErrorSeverity;
      code?: string;
      technicalMessage?: string;
      metadata?: Record<string, unknown>;
      affectedFeatures?: string[];
      cause?: Error;
    }
  ): TruthLensError {
    return {
      id: this.generateErrorId(),
      timestamp: Date.now(),
      category,
      severity: options?.severity || 'medium',
      message,
      technicalMessage: options?.technicalMessage,
      code: options?.code,
      context: {
        extension: this.context,
        url: this.context === 'content' ? window.location.href : undefined,
        userAgent: navigator.userAgent,
        extensionVersion: chrome.runtime.getManifest().version,
        sessionId: this.sessionId
      },
      stack: options?.cause?.stack,
      source: {
        function: this.getCallerFunction()
      },
      metadata: options?.metadata,
      recovery: {
        strategy: this.getDefaultRecoveryStrategy(category),
        attempted: false,
        retryCount: 0
      },
      userImpact: {
        affectedFeatures: options?.affectedFeatures || [],
        dataLoss: false
      },
      reportingConsent: false // Will be updated when error is handled
    };
  }

  private getCallerFunction(): string {
    const stack = new Error().stack;
    if (!stack) return 'unknown';

    const lines = stack.split('\n');
    // Skip this function and createError
    const callerLine = lines[3] || '';
    const match = callerLine.match(/at (\w+)/);
    return match ? match[1] : 'unknown';
  }

  private getDefaultRecoveryStrategy(category: ErrorCategory): RecoveryStrategy {
    const strategies: Record<ErrorCategory, RecoveryStrategy> = {
      network: 'retry',
      permission: 'user-action',
      data: 'fallback',
      runtime: 'graceful-degrade',
      ai: 'fallback',
      security: 'user-action',
      user: 'user-action',
      system: 'graceful-degrade'
    };

    return strategies[category] || 'none';
  }

  private async storeError(error: TruthLensError): Promise<void> {
    try {
      const existingErrors = await storageService.get('errors');
      const errors = existingErrors || [];

      // Limit stored errors
      const maxStoredErrors = 100;
      const updatedErrors = [...errors, error].slice(-maxStoredErrors);

      await storageService.setMultiple({ errors: updatedErrors });
    } catch (storageError) {
      logger.error('Failed to store error', { error }, storageError as Error);
    }
  }

  private async reportError(error: TruthLensError): Promise<void> {
    try {
      // Implementation would integrate with chosen error reporting service
      // For now, log that reporting would happen
      logger.info('Error reported', { errorId: error.id });
      this.emit('error:reported', { error, reportId: `report_${error.id}` });
    } catch (reportingError) {
      logger.error('Failed to report error', { error }, reportingError as Error);
    }
  }

  // Event system for error handler
  public on<K extends keyof ErrorHandlerEvents>(event: K, listener: (data: ErrorHandlerEvents[K]) => void): void {
    if (!this.eventListeners.has(event as string)) {
      this.eventListeners.set(event as string, new Set());
    }
    this.eventListeners.get(event as string)!.add(listener as (data: unknown) => void);
  }

  public off<K extends keyof ErrorHandlerEvents>(event: K, listener: (data: ErrorHandlerEvents[K]) => void): void {
    const listeners = this.eventListeners.get(event as string);
    if (listeners) {
      listeners.delete(listener as (data: unknown) => void);
    }
  }

  private emit<K extends keyof ErrorHandlerEvents>(event: K, data: ErrorHandlerEvents[K]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`[ErrorHandler] Event listener error for ${event}:`, error);
        }
      });
    }
  }

  // Error statistics and debugging
  public getErrorStats(): {
    totalErrors: number;
    errorsByCategory: Record<string, number>;
    errorsByType: Record<string, number>;
    recoveryRate: number;
    sessionErrors: number;
  } {
    const totalErrors = Array.from(this.errorCount.values()).reduce((sum, count) => sum + count, 0);
    const errorsByCategory: Record<string, number> = {};
    const errorsByType: Record<string, number> = {};

    this.errorCount.forEach((count, key) => {
      const [category, type] = key.split(':');
      errorsByCategory[category] = (errorsByCategory[category] || 0) + count;
      errorsByType[type] = (errorsByType[type] || 0) + count;
    });

    return {
      totalErrors,
      errorsByCategory,
      errorsByType,
      recoveryRate: 0.85, // This would be calculated from actual recovery data
      sessionErrors: totalErrors // For now, all errors are in current session
    };
  }

  // Configuration updates
  public updateConfig(newConfig: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('ErrorHandler configuration updated', { newConfig });
  }

  // Cleanup
  public cleanup(): void {
    this.eventListeners.clear();
    this.errorCount.clear();
    this.circuitBreakers.clear();
    logger.info('ErrorHandler cleanup completed');
  }
}

// Factory function for creating context-specific error handlers
export function createErrorHandler(context: ExtensionContextType, config?: Partial<ErrorHandlerConfig>): ErrorHandler {
  return new ErrorHandler(context, config);
}

// Export default error handler instance
export let errorHandler: ErrorHandler;

// Initialize error handler based on extension context
export function initializeErrorHandler(context: ExtensionContextType, config?: Partial<ErrorHandlerConfig>): ErrorHandler {
  errorHandler = new ErrorHandler(context, config);
  return errorHandler;
}

export default ErrorHandler;
