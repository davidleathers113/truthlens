/**
 * Offline Detection and Recovery Service - 2025 Implementation
 * Modern network state management for Chrome Manifest V3 Extensions
 */

import { logger } from './logger';
import { errorHandler } from './errorHandler';
import { storageService } from '../storage/storageService';
import { ExtensionContextType } from '../types/error';

interface OfflineConfig {
  enableOfflineMode: boolean;
  enableNetworkPolling: boolean;
  pollingInterval: number;           // Network status check interval (ms)
  enableServiceWorkerSync: boolean;  // Use Background Sync API
  cacheRetentionDays: number;        // How long to keep offline cache
  enableQueuedOperations: boolean;   // Queue operations when offline
  maxQueueSize: number;              // Maximum queued operations
}

interface QueuedOperation {
  id: string;
  timestamp: number;
  operation: string;
  data: any;
  retryCount: number;
  maxRetries: number;
  priority: 'low' | 'medium' | 'high';
}

interface NetworkStats {
  isOnline: boolean;
  connectionType?: string;
  downlink?: number;               // Effective bandwidth estimate
  rtt?: number;                   // Round-trip time estimate
  saveData?: boolean;             // Data saver mode
  lastOnlineTime?: number;
  lastOfflineTime?: number;
  offlineDuration?: number;
  reconnectCount: number;
}

class OfflineHandler {
  private config: OfflineConfig;
  private context: ExtensionContextType;
  private isOnline: boolean;
  private networkStats: NetworkStats;
  private eventListeners: Map<string, Set<Function>> = new Map();
  private pollingTimer: number | null = null;
  private operationQueue: QueuedOperation[] = [];
  private retryTimer: number | null = null;

  constructor(context: ExtensionContextType, config?: Partial<OfflineConfig>) {
    this.context = context;

    // Default configuration optimized for 2025
    this.config = {
      enableOfflineMode: true,
      enableNetworkPolling: true,
      pollingInterval: 30000,        // Check every 30 seconds
      enableServiceWorkerSync: context === 'background',
      cacheRetentionDays: 7,
      enableQueuedOperations: true,
      maxQueueSize: 100,
      ...config
    };

    // Initialize network status
    this.isOnline = navigator.onLine;
    this.networkStats = {
      isOnline: this.isOnline,
      reconnectCount: 0
    };

    this.initializeOfflineHandling();

    logger.info('OfflineHandler initialized', {
      context: this.context,
      isOnline: this.isOnline,
      config: this.config
    });
  }

  private initializeOfflineHandling(): void {
    // Set up network status listeners
    this.setupNetworkListeners();

    // Initialize network connection detection
    this.detectNetworkCapabilities();

    // Set up periodic network polling if enabled
    if (this.config.enableNetworkPolling) {
      this.startNetworkPolling();
    }

    // Load queued operations from storage
    this.loadQueueFromStorage();

    // Set up service worker sync if enabled (background context only)
    if (this.config.enableServiceWorkerSync && this.context === 'background') {
      this.setupServiceWorkerSync();
    }
  }

  private setupNetworkListeners(): void {
    if (typeof window !== 'undefined') {
      // Online/offline event listeners
      window.addEventListener('online', () => {
        this.handleOnline();
      });

      window.addEventListener('offline', () => {
        this.handleOffline();
      });

      // Network Information API (if available)
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        connection.addEventListener('change', () => {
          this.updateNetworkStats();
        });
      }
    }
  }

  private async detectNetworkCapabilities(): Promise<void> {
    try {
      // Use Network Information API if available
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        this.networkStats.connectionType = connection.effectiveType;
        this.networkStats.downlink = connection.downlink;
        this.networkStats.rtt = connection.rtt;
        this.networkStats.saveData = connection.saveData;
      }

      // Test actual connectivity with a lightweight request
      await this.testConnectivity();

    } catch (error) {
      logger.warn('Failed to detect network capabilities', {}, error as Error);
    }
  }

  private async testConnectivity(): Promise<boolean> {
    try {
      // Use Chrome extension's chrome.runtime.getManifest() as connectivity test
      // This is lightweight and always available
      // 2025 TypeScript best practice: Remove unused variables entirely rather than suppress
      // const manifest = chrome.runtime.getManifest(); // Removed - not used for actual connectivity test

      // Try a network request to a reliable endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache'
      });

      clearTimeout(timeoutId);

      const isConnected = response.ok;
      this.updateOnlineStatus(isConnected);

      return isConnected;
    } catch (error) {
      this.updateOnlineStatus(false);
      return false;
    }
  }

  private updateNetworkStats(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.networkStats = {
        ...this.networkStats,
        connectionType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      };

      logger.debug('Network stats updated', { networkStats: this.networkStats });
    }
  }

  private updateOnlineStatus(isOnline: boolean): void {
    const wasOnline = this.isOnline;
    this.isOnline = isOnline;
    this.networkStats.isOnline = isOnline;

    if (isOnline && !wasOnline) {
      this.handleOnline();
    } else if (!isOnline && wasOnline) {
      this.handleOffline();
    }
  }

  private handleOnline(): void {
    const now = Date.now();
    const wasOffline = !this.networkStats.isOnline;

    if (wasOffline) {
      this.networkStats.lastOnlineTime = now;
      this.networkStats.reconnectCount++;

      if (this.networkStats.lastOfflineTime) {
        this.networkStats.offlineDuration = now - this.networkStats.lastOfflineTime;
      }

      logger.info('Network connection restored', {
        offlineDuration: this.networkStats.offlineDuration,
        reconnectCount: this.networkStats.reconnectCount
      });

      // Emit online event
      this.emit('online', {
        timestamp: now,
        offlineDuration: this.networkStats.offlineDuration,
        reconnectCount: this.networkStats.reconnectCount
      });

      // Process queued operations
      this.processQueuedOperations();
    }

    this.networkStats.isOnline = true;
  }

  private handleOffline(): void {
    const now = Date.now();
    this.networkStats.lastOfflineTime = now;
    this.networkStats.isOnline = false;

    logger.warn('Network connection lost', {
      lastOnlineTime: this.networkStats.lastOnlineTime,
      context: this.context
    });

    // Create offline error
    const offlineError = errorHandler.createError(
      'network',
      'Network connection lost',
      {
        severity: 'medium',
        code: 'OFFLINE',
        technicalMessage: 'Navigator reports offline status',
        metadata: { networkStats: this.networkStats },
        affectedFeatures: ['api-calls', 'content-analysis', 'settings-sync']
      }
    );

    // Handle the offline error
    errorHandler.handleError(offlineError);

    // Emit offline event
    this.emit('offline', {
      timestamp: now,
      context: this.context,
      lastOnlineTime: this.networkStats.lastOnlineTime
    });
  }

  private startNetworkPolling(): void {
    this.pollingTimer = window.setInterval(async () => {
      try {
        await this.testConnectivity();
      } catch (_error) {
        logger.debug('Network polling failed', { error: (_error as Error).message });
      }
    }, this.config.pollingInterval);
  }

  private setupServiceWorkerSync(): void {
    // Background Sync API setup (Manifest V3)
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then(registration => {
        // Register for background sync when network is restored
        // 2025 TypeScript best practice: Proper type casting for Background Sync API
        return (registration as any).sync.register('network-sync');
      }).catch(_error => {
        logger.warn('Failed to register background sync', {}, _error as Error);
      });
    }
  }

  // Queued Operations Management

  public queueOperation(operation: QueuedOperation): void {
    if (!this.config.enableQueuedOperations) {
      logger.debug('Queued operations disabled, skipping', { operation: operation.operation });
      return;
    }

    // Check queue size limit
    if (this.operationQueue.length >= this.config.maxQueueSize) {
      // Remove oldest low-priority operations
      this.operationQueue = this.operationQueue
        .filter(op => op.priority !== 'low')
        .slice(0, this.config.maxQueueSize - 1);
    }

    this.operationQueue.push(operation);
    this.operationQueue.sort((a, b) => {
      // Sort by priority (high > medium > low) then by timestamp
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      return a.timestamp - b.timestamp;
    });

    // Save to storage
    this.saveQueueToStorage();

    logger.debug('Operation queued', {
      operationId: operation.id,
      operation: operation.operation,
      priority: operation.priority,
      queueSize: this.operationQueue.length
    });
  }

  private async processQueuedOperations(): Promise<void> {
    if (!this.isOnline || this.operationQueue.length === 0) {
      return;
    }

    logger.info('Processing queued operations', { queueSize: this.operationQueue.length });

    const operationsToProcess = [...this.operationQueue];
    const successfulOperations: string[] = [];
    const failedOperations: QueuedOperation[] = [];

    for (const operation of operationsToProcess) {
      try {
        const success = await this.executeQueuedOperation(operation);

        if (success) {
          successfulOperations.push(operation.id);
        } else {
          operation.retryCount++;
          if (operation.retryCount < operation.maxRetries) {
            failedOperations.push(operation);
          } else {
            logger.warn('Operation max retries exceeded', {
              operationId: operation.id,
              operation: operation.operation,
              retryCount: operation.retryCount
            });
          }
        }
      } catch (error) {
        logger.error('Failed to execute queued operation', {
          operationId: operation.id,
          operation: operation.operation
        }, error as Error);

        operation.retryCount++;
        if (operation.retryCount < operation.maxRetries) {
          failedOperations.push(operation);
        }
      }
    }

    // Update queue with failed operations that can still be retried
    this.operationQueue = failedOperations;
    this.saveQueueToStorage();

    logger.info('Queued operations processed', {
      successful: successfulOperations.length,
      failed: failedOperations.length,
      remaining: this.operationQueue.length
    });

    // Schedule retry for failed operations
    if (failedOperations.length > 0 && !this.retryTimer) {
      this.scheduleRetry();
    }
  }

  private async executeQueuedOperation(operation: QueuedOperation): Promise<boolean> {
    // This would be implemented based on the specific operation types
    // For now, return a mock implementation
    logger.debug('Executing queued operation', {
      operationId: operation.id,
      operation: operation.operation
    });

    // Simulate operation execution
    await new Promise(resolve => setTimeout(resolve, 100));

    // Return success based on network status
    return this.isOnline;
  }

  private scheduleRetry(): void {
    if (this.retryTimer) return;

    // Exponential backoff for retries
    const delay = Math.min(5000 * Math.pow(2, this.networkStats.reconnectCount), 60000);

    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = null;
      if (this.isOnline && this.operationQueue.length > 0) {
        this.processQueuedOperations();
      }
    }, delay);
  }

  private async saveQueueToStorage(): Promise<void> {
    try {
      await storageService.setMultiple({
        operationQueue: this.operationQueue,
        networkStats: this.networkStats
      });
    } catch (_error) {
      logger.error('Failed to save operation queue', {}, _error as Error);
    }
  }

  private async loadQueueFromStorage(): Promise<void> {
    try {
      const stored = await storageService.getMultiple(['operationQueue', 'networkStats']);

      if (stored.operationQueue) {
        this.operationQueue = stored.operationQueue;
        logger.info('Loaded queued operations from storage', {
          queueSize: this.operationQueue.length
        });
      }

      if (stored.networkStats) {
        this.networkStats = { ...this.networkStats, ...stored.networkStats };
      }
    } catch (_error) {
      logger.error('Failed to load operation queue from storage', {}, _error as Error);
    }
  }

  // Event System

  public on(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  public off(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          logger.error(`Event listener error for ${event}`, {}, error as Error);
        }
      });
    }
  }

  // Public API Methods

  public getNetworkStatus(): NetworkStats {
    return { ...this.networkStats };
  }

  public isNetworkOnline(): boolean {
    return this.isOnline;
  }

  public getQueuedOperationCount(): number {
    return this.operationQueue.length;
  }

  public clearQueue(): void {
    this.operationQueue = [];
    this.saveQueueToStorage();
    logger.info('Operation queue cleared');
  }

  public updateConfig(newConfig: Partial<OfflineConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    // Restart polling if interval changed
    if (oldConfig.pollingInterval !== this.config.pollingInterval) {
      if (this.pollingTimer) {
        clearInterval(this.pollingTimer);
        this.pollingTimer = null;
      }

      if (this.config.enableNetworkPolling) {
        this.startNetworkPolling();
      }
    }

    logger.info('OfflineHandler configuration updated', { newConfig });
  }

  public cleanup(): void {
    // Clear timers
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }

    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }

    // Clear event listeners
    this.eventListeners.clear();

    // Save final state
    this.saveQueueToStorage();

    logger.info('OfflineHandler cleanup completed');
  }
}

// Factory function for creating context-specific offline handlers
export function createOfflineHandler(context: ExtensionContextType, config?: Partial<OfflineConfig>): OfflineHandler {
  return new OfflineHandler(context, config);
}

// Export default offline handler instance
export let offlineHandler: OfflineHandler;

// Initialize offline handler based on extension context
export function initializeOfflineHandler(context: ExtensionContextType, config?: Partial<OfflineConfig>): OfflineHandler {
  offlineHandler = new OfflineHandler(context, config);
  return offlineHandler;
}

export default OfflineHandler;
