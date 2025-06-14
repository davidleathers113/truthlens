/**
 * Structured Logger Service - 2025 Pino-inspired Implementation
 * High-performance JSON logging for Chrome Manifest V3 Extensions
 */

import { LogConfig, LogEntry, ExtensionContextType } from '../types/error';
import { storageService } from '../storage/storageService';

interface PerformanceWithMemory extends Performance {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

class Logger {
  private config: LogConfig;
  private sessionId: string;
  private context: ExtensionContextType;
  private logQueue: LogEntry[] = [];
  private flushTimer: number | null = null;
  private readonly maxQueueSize = 100;
  private readonly flushInterval = 5000; // 5 seconds

  constructor(context: ExtensionContextType, config?: Partial<LogConfig>) {
    this.context = context;
    this.sessionId = this.generateSessionId();

    // Default configuration (Pino-inspired, 2025 optimized)
    this.config = {
      level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
      enabled: true,
      structured: true,
      includeStack: process.env.NODE_ENV === 'development',
      maxLogSize: 10000, // 10KB max per log entry
      retentionDays: 7,
      compression: true,
      sampling: {
        debug: 0.1,   // Sample 10% of debug logs in production
        info: 1.0,    // Log all info messages
        performance: true
      },
      privacy: {
        redactPII: true,
        redactURLs: true,
        allowedFields: ['level', 'timestamp', 'message', 'context', 'sessionId'],
        blockedFields: ['password', 'token', 'apiKey', 'credit', 'ssn', 'phone']
      },
      destinations: {
        console: true,
        storage: true,
        remote: false, // Disabled by default for privacy
        export: true
      },
      ...config
    };

    this.initializeLogger();
  }

  private initializeLogger(): void {
    if (!this.config.enabled) return;

    // Set up periodic log flushing
    this.setupPeriodicFlush();

    // Clean up old logs on initialization
    this.cleanupOldLogs();

    // Log logger initialization
    this.info('Logger initialized', {
      context: this.context,
      config: this.sanitizeConfig()
    });
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  private sanitizeConfig(): Partial<LogConfig> {
    // Remove sensitive information from config when logging
    const { ...sanitized } = this.config;
    return sanitized;
  }

  private shouldLog(level: string): boolean {
    if (!this.config.enabled) return false;

    const levels = ['debug', 'info', 'warn', 'error', 'fatal'];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const requestedLevelIndex = levels.indexOf(level);

    return requestedLevelIndex >= currentLevelIndex;
  }

  private shouldSample(level: string): boolean {
    if (level === 'debug') {
      return Math.random() <= this.config.sampling.debug;
    }
    if (level === 'info') {
      return Math.random() <= this.config.sampling.info;
    }
    return true; // Always log warn, error, fatal
  }

  private sanitizeData(data: unknown): unknown {
    if (!data || typeof data !== 'object') return data;

    const sanitized = { ...data } as Record<string, any>;

    // Remove blocked fields
    this.config.privacy.blockedFields.forEach(field => {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    });

    // Redact URLs if configured
    if (this.config.privacy.redactURLs) {
      if (sanitized.url && typeof sanitized.url === 'string') {
        sanitized.url = this.redactSensitiveUrlParams(sanitized.url);
      }
    }

    // Limit data size
    const jsonString = JSON.stringify(sanitized);
    if (jsonString.length > this.config.maxLogSize) {
      return {
        ...sanitized,
        _truncated: true,
        _originalSize: jsonString.length
      };
    }

    return sanitized;
  }

  private redactSensitiveUrlParams(url: string): string {
    try {
      const urlObj = new URL(url);
      const sensitiveParams = ['token', 'key', 'password', 'secret', 'auth'];

      sensitiveParams.forEach(param => {
        if (urlObj.searchParams.has(param)) {
          urlObj.searchParams.set(param, '[REDACTED]');
        }
      });

      return urlObj.toString();
    } catch {
      return '[INVALID_URL]';
    }
  }

  private async createLogEntry(
    level: string,
    message: string,
    data?: Record<string, unknown>,
    error?: Error,
    performance?: { duration?: number; memory?: number; startTime?: number; endTime?: number }
  ): Promise<LogEntry> {
    const entry: LogEntry = {
      level,
      timestamp: Date.now(),
      message,
      context: this.context,
      sessionId: this.sessionId,
      metadata: {
        extensionVersion: chrome.runtime.getManifest().version,
        browserVersion: navigator.userAgent,
        platform: navigator.platform,
        url: this.context === 'content' ? window.location.href : undefined,
        userId: await this.getAnonymousUserId()
      }
    };

    if (data) {
      entry.data = this.sanitizeData(data) as Record<string, unknown>;
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: this.config.includeStack ? error.stack : undefined,
        cause: error.cause
      };
    }

    if (performance && this.config.sampling.performance) {
      entry.performance = performance;
    }

    return entry;
  }

  private async getAnonymousUserId(): Promise<string | undefined> {
    try {
      const stored = await storageService.get('anonymousUserId');
      if (stored) {
        return stored;
      }

      // Generate anonymous ID if not exists
      const anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      await storageService.set('anonymousUserId', anonymousId);
      return anonymousId;
    } catch {
      return undefined;
    }
  }

  private async writeLog(entry: LogEntry): Promise<void> {
    try {
      // Console output
      if (this.config.destinations.console) {
        this.writeToConsole(entry);
      }

      // Queue for storage (batched writing)
      if (this.config.destinations.storage) {
        this.queueForStorage(entry);
      }

      // Remote reporting (if enabled)
      if (this.config.destinations.remote && entry.level !== 'debug') {
        await this.sendToRemote(entry);
      }
    } catch (error) {
      // Fallback to basic console logging if our logger fails
      console.error('[Logger] Failed to write log:', error);
      console.log('[Logger] Original log entry:', entry);
    }
  }

  private writeToConsole(entry: LogEntry): void {
    const formatted = this.config.structured
      ? JSON.stringify(entry, null, 2)
      : `[${entry.level.toUpperCase()}] ${entry.message}`;

    switch (entry.level) {
      case 'debug':
        console.debug(formatted, entry.data);
        break;
      case 'info':
        console.info(formatted, entry.data);
        break;
      case 'warn':
        console.warn(formatted, entry.data);
        break;
      case 'error':
      case 'fatal':
        console.error(formatted, entry.data, entry.error);
        break;
      default:
        console.log(formatted, entry.data);
    }
  }

  private queueForStorage(entry: LogEntry): void {
    this.logQueue.push(entry);

    // Flush queue if it gets too large
    if (this.logQueue.length >= this.maxQueueSize) {
      this.flushToStorage();
    }
  }

  private setupPeriodicFlush(): void {
    this.flushTimer = window.setInterval(() => {
      this.flushToStorage();
    }, this.flushInterval);
  }

  private async flushToStorage(): Promise<void> {
    if (this.logQueue.length === 0) return;

    try {
      const logsToFlush = [...this.logQueue];
      this.logQueue = []; // Clear queue immediately

      const existingLogs = await storageService.get('logs');
      const allLogs = [...(existingLogs || []), ...logsToFlush];

      // Limit total stored logs
      const maxStoredLogs = 1000;
      const logsToStore = allLogs.slice(-maxStoredLogs);

      await storageService.set('logs', logsToStore);
    } catch (_error) {
      console.error('[Logger] Failed to flush logs to storage:', _error);
      // Put logs back in queue for retry
      this.logQueue.unshift(...this.logQueue);
    }
  }

  private async sendToRemote(_entry: LogEntry): Promise<void> {
    // Implementation would depend on chosen remote logging service
    // This is a placeholder for services like Sentry, LogRocket, etc.
    console.debug('[Logger] Remote logging not implemented');
  }

  private async cleanupOldLogs(): Promise<void> {
    try {
      const existingLogs = await storageService.get('logs');
      if (!existingLogs) return;

      const cutoffTime = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);
      const filteredLogs = existingLogs.filter((log: LogEntry) => log.timestamp > cutoffTime);

      if (filteredLogs.length !== existingLogs.length) {
        await storageService.set('logs', filteredLogs);
        this.info('Cleaned up old logs', {
          removed: existingLogs.length - filteredLogs.length,
          remaining: filteredLogs.length
        });
      }
    } catch (_error) {
      console.error('[Logger] Failed to cleanup old logs:', _error);
    }
  }

  // Public API Methods

  public debug(message: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog('debug') || !this.shouldSample('debug')) return;

    this.createLogEntry('debug', message, data).then(entry => {
      this.writeLog(entry);
    });
  }

  public info(message: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog('info') || !this.shouldSample('info')) return;

    this.createLogEntry('info', message, data).then(entry => {
      this.writeLog(entry);
    });
  }

  public warn(message: string, data?: Record<string, unknown>, error?: Error): void {
    if (!this.shouldLog('warn')) return;

    this.createLogEntry('warn', message, data, error).then(entry => {
      this.writeLog(entry);
    });
  }

  public error(message: string, data?: Record<string, unknown>, error?: Error): void {
    if (!this.shouldLog('error')) return;

    this.createLogEntry('error', message, data, error).then(entry => {
      this.writeLog(entry);
    });
  }

  public fatal(message: string, data?: Record<string, unknown>, error?: Error): void {
    if (!this.shouldLog('fatal')) return;

    this.createLogEntry('fatal', message, data, error).then(entry => {
      this.writeLog(entry);
    });
  }

  // Performance logging helpers
  public time(label: string): { end: () => void } {
    const startTime = performance.now();
    const startMemory = 'memory' in performance ? (performance as PerformanceWithMemory).memory?.usedJSHeapSize : undefined;

    return {
      end: () => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        const endMemory = 'memory' in performance ? (performance as PerformanceWithMemory).memory?.usedJSHeapSize : undefined;

        this.info(`Performance: ${label}`, {
          performance: {
            duration,
            startTime,
            endTime,
            memory: endMemory ? endMemory - (startMemory || 0) : undefined
          }
        });
      }
    };
  }

  // Async operation logging
  public async measure<T>(label: string, operation: () => Promise<T>): Promise<T> {
    const timer = this.time(label);
    try {
      const result = await operation();
      timer.end();
      return result;
    } catch (error) {
      timer.end();
      this.error(`Failed operation: ${label}`, { label }, error as Error);
      throw error;
    }
  }

  // Log export functionality
  public async exportLogs(): Promise<string> {
    try {
      const existingLogs = await storageService.get('logs');
      const logs = existingLogs || [];

      const exportData = {
        exportedAt: new Date().toISOString(),
        extension: chrome.runtime.getManifest().name,
        version: chrome.runtime.getManifest().version,
        context: this.context,
        sessionId: this.sessionId,
        logCount: logs.length,
        logs
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      this.error('Failed to export logs', {}, error as Error);
      throw error;
    }
  }

  // Configuration updates
  public updateConfig(newConfig: Partial<LogConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.info('Logger configuration updated', { newConfig });
  }

  // Cleanup
  public cleanup(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Flush any remaining logs
    this.flushToStorage();

    this.info('Logger cleanup completed');
  }

  // Getter for current configuration
  public getConfig(): LogConfig {
    return { ...this.config };
  }

  // Get log statistics
  public async getLogStats(): Promise<{
    totalLogs: number;
    logsByLevel: Record<string, number>;
    oldestLog?: number;
    newestLog?: number;
    sessionLogs: number;
  }> {
    try {
      const existingLogs = await storageService.get('logs');
      const logs = existingLogs || [];

      const logsByLevel: Record<string, number> = {};
      let sessionLogs = 0;

      logs.forEach((log: LogEntry) => {
        logsByLevel[log.level] = (logsByLevel[log.level] || 0) + 1;
        if (log.sessionId === this.sessionId) {
          sessionLogs++;
        }
      });

      return {
        totalLogs: logs.length,
        logsByLevel,
        oldestLog: logs.length > 0 ? Math.min(...logs.map((l: LogEntry) => l.timestamp)) : undefined,
        newestLog: logs.length > 0 ? Math.max(...logs.map((l: LogEntry) => l.timestamp)) : undefined,
        sessionLogs
      };
    } catch (error) {
      this.error('Failed to get log statistics', {}, error as Error);
      return {
        totalLogs: 0,
        logsByLevel: {},
        sessionLogs: 0
      };
    }
  }
}

// Factory function for creating context-specific loggers
export function createLogger(context: ExtensionContextType, config?: Partial<LogConfig>): Logger {
  return new Logger(context, config);
}

// Export default logger instance (will be initialized by extension contexts)
export let logger: Logger;

// Initialize logger based on extension context
export function initializeLogger(context: ExtensionContextType, config?: Partial<LogConfig>): Logger {
  logger = new Logger(context, config);
  return logger;
}

export default Logger;
