/**
 * Integration Service for Chrome Extension Testing Framework
 * Implements 2025 best practices for background-content-popup coordination
 * Manages cross-context communication and data synchronization
 */

import {
  TestingConfig,
  TestingEvent,
  TestingError,
  AttentionMetrics,
  MobileMetrics,
  PreferenceData,
  ABTestResult,
  AnalyticsDashboardData,
  ConsentData,
  TestingModule
} from './types';

export interface IntegrationConfig {
  enableBackgroundIntegration: boolean;
  enableContentScriptIntegration: boolean;
  enablePopupIntegration: boolean;
  enableStorageSync: boolean;
  enableRealTimeSync: boolean;
  enableCrossTabSync: boolean;
  maxRetryAttempts: number;
  syncInterval: number; // milliseconds
  messageTimeout: number; // milliseconds
  enableErrorRecovery: boolean;
  compressionEnabled: boolean;
}

export interface MessagePayload {
  id: string;
  type: 'request' | 'response' | 'event' | 'sync';
  action: string;
  data: any;
  timestamp: number;
  source: 'background' | 'content' | 'popup' | 'options';
  target?: 'background' | 'content' | 'popup' | 'options' | 'all';
  sessionId?: string;
  retry?: number;
  error?: string;
}

export interface SyncState {
  lastSyncTimestamp: number;
  pendingOperations: MessagePayload[];
  conflictResolution: 'latest_wins' | 'merge' | 'manual';
  syncStatus: 'synced' | 'syncing' | 'conflict' | 'error';
}

export interface CrossContextData {
  attentionMetrics: AttentionMetrics | null;
  mobileMetrics: MobileMetrics | null;
  preferences: PreferenceData | null;
  abTestResults: ABTestResult[];
  dashboardData: AnalyticsDashboardData | null;
  consent: ConsentData | null;
  config: TestingConfig | null;
}

export interface IntegrationHooks {
  onDataReceived?: (data: any, source: string) => void;
  onError?: (error: TestingError) => void;
  onSyncComplete?: (state: SyncState) => void;
  onConnectionLost?: (target: string) => void;
  onConnectionRestored?: (target: string) => void;
}

export class IntegrationService {
  private config: IntegrationConfig;
  private isInitialized: boolean = false;

  // Chrome extension messaging
  private messageHandlers: Map<string, ((data: any, source?: string) => void)[]> = new Map();
  private pendingRequests: Map<string, { resolve: (value: any) => void; reject: (reason?: any) => void; timer: NodeJS.Timeout }> = new Map();
  private connectionStatus: Map<string, boolean> = new Map();

  // Data synchronization
  private syncState: SyncState;
  private crossContextData: CrossContextData;
  private syncTimer: NodeJS.Timeout | null = null;

  // Event management
  private eventQueue: TestingEvent[] = [];
  private hooks: IntegrationHooks = {};
  private errorLog: TestingError[] = [];

  constructor(config: Partial<IntegrationConfig> = {}, hooks: IntegrationHooks = {}) {
    this.config = {
      enableBackgroundIntegration: true,
      enableContentScriptIntegration: true,
      enablePopupIntegration: true,
      enableStorageSync: true,
      enableRealTimeSync: true,
      enableCrossTabSync: false, // Disabled by default for performance
      maxRetryAttempts: 3,
      syncInterval: 5000, // 5 seconds
      messageTimeout: 10000, // 10 seconds
      enableErrorRecovery: true,
      compressionEnabled: true,
      ...config
    };

    this.hooks = hooks;

    this.syncState = {
      lastSyncTimestamp: Date.now(),
      pendingOperations: [],
      conflictResolution: 'latest_wins',
      syncStatus: 'synced'
    };

    this.crossContextData = {
      attentionMetrics: null,
      mobileMetrics: null,
      preferences: null,
      abTestResults: [],
      dashboardData: null,
      consent: null,
      config: null
    };
  }

  /**
   * Initialize integration service with Chrome extension APIs
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Setup Chrome extension messaging
      this.setupChromeMessaging();

      // Setup storage synchronization
      if (this.config.enableStorageSync) {
        await this.setupStorageSync();
      }

      // Setup real-time synchronization
      if (this.config.enableRealTimeSync) {
        this.startRealTimeSync();
      }

      // Setup error recovery
      if (this.config.enableErrorRecovery) {
        this.setupErrorRecovery();
      }

      // Test connections to all contexts
      await this.testConnections();

      this.isInitialized = true;

      console.debug('[IntegrationService] Initialized successfully', {
        config: this.config,
        connectionStatus: Object.fromEntries(this.connectionStatus)
      });
    } catch (error) {
      console.error('[IntegrationService] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Setup Chrome extension messaging following 2025 best practices
   */
  private setupChromeMessaging(): void {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      // Listen for messages from other contexts
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        this.handleIncomingMessage(message, sender, sendResponse);
        return true; // Keep message channel open for async responses
      });

      // Handle connection events
      chrome.runtime.onConnect.addListener((port) => {
        this.handleConnection(port);
      });

      // Handle disconnection events
      chrome.runtime.onStartup?.addListener(() => {
        this.handleReconnection();
      });
    } else {
      console.warn('[IntegrationService] Chrome extension APIs not available');
    }
  }

  /**
   * Send message to specific context with retry logic
   */
  public async sendMessage(
    target: 'background' | 'content' | 'popup' | 'options',
    action: string,
    data: any,
    options: { timeout?: number; retry?: boolean } = {}
  ): Promise<any> {
    const messageId = this.generateMessageId();
    const { timeout = this.config.messageTimeout, retry = true } = options;

    const payload: MessagePayload = {
      id: messageId,
      type: 'request',
      action,
      data: this.config.compressionEnabled ? this.compressData(data) : data,
      timestamp: Date.now(),
      source: this.getCurrentContext(),
      target,
      retry: 0
    };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(messageId);
        if (retry && payload.retry! < this.config.maxRetryAttempts) {
          payload.retry!++;
          this.sendMessageWithRetry(payload, resolve, reject);
        } else {
          reject(new Error(`Message timeout: ${action} to ${target}`));
        }
      }, timeout);

      this.pendingRequests.set(messageId, { resolve, reject, timer });

      try {
        this.dispatchMessage(payload);
      } catch (error) {
        clearTimeout(timer);
        this.pendingRequests.delete(messageId);
        reject(error);
      }
    });
  }

  /**
   * Broadcast message to all contexts
   */
  public async broadcastMessage(action: string, data: any): Promise<void> {
    const contexts: Array<'background' | 'content' | 'popup' | 'options'> =
      ['background', 'content', 'popup', 'options'];

    const promises = contexts.map(context =>
      this.sendMessage(context, action, data).catch(() => {
        // Ignore individual context failures in broadcast
      })
    );

    await Promise.allSettled(promises);
  }

  /**
   * Register message handler for specific action
   */
  public registerMessageHandler(action: string, handler: (data: any, source?: string) => void): void {
    if (!this.messageHandlers.has(action)) {
      this.messageHandlers.set(action, []);
    }
    this.messageHandlers.get(action)!.push(handler);
  }

  /**
   * Sync data across all contexts
   */
  public async syncData(module: TestingModule, data: any): Promise<void> {
    try {
      this.syncState.syncStatus = 'syncing';

      // Update local data
      this.updateCrossContextData(module, data);

      // Save to storage
      if (this.config.enableStorageSync) {
        await this.saveToStorage(module, data);
      }

      // Broadcast to other contexts
      await this.broadcastMessage('data_sync', {
        module,
        data,
        timestamp: Date.now()
      });

      this.syncState.lastSyncTimestamp = Date.now();
      this.syncState.syncStatus = 'synced';

      if (this.hooks.onSyncComplete) {
        this.hooks.onSyncComplete(this.syncState);
      }
    } catch (error) {
      this.syncState.syncStatus = 'error';
      this.logError('sync_failed', error as Error, { module });
      throw error;
    }
  }

  /**
   * Get synchronized data from all contexts
   */
  public async getSyncedData(): Promise<CrossContextData> {
    if (this.config.enableStorageSync) {
      const storageData = await this.loadFromStorage();
      this.mergeCrossContextData(storageData);
    }

    return { ...this.crossContextData };
  }

  /**
   * Integrate with TruthLens Visual Indicator System (Task 9)
   */
  public async integrateWithVisualIndicators(testConfig: any): Promise<void> {
    try {
      await this.sendMessage('content', 'visual_indicator_test', {
        config: testConfig,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logError('visual_indicator_integration_failed', error as Error, { testConfig });
    }
  }

  /**
   * Integrate with Popup Interface (Task 10)
   */
  public async integrateWithPopup(feedbackData: any): Promise<void> {
    try {
      await this.sendMessage('popup', 'feedback_collection', {
        data: feedbackData,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logError('popup_integration_failed', error as Error, { feedbackData });
    }
  }

  /**
   * Integrate with Storage Service (Task 5)
   */
  public async integrateWithStorage(operation: 'save' | 'load' | 'delete', key: string, data?: any): Promise<any> {
    try {
      return await this.sendMessage('background', 'storage_operation', {
        operation,
        key,
        data,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logError('storage_integration_failed', error as Error, { operation, key });
      throw error;
    }
  }

  /**
   * Integrate with Content Script (Task 3)
   */
  public async integrateWithContentScript(testData: any): Promise<void> {
    try {
      await this.sendMessage('content', 'in_page_testing', {
        data: testData,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logError('content_script_integration_failed', error as Error, { testData });
    }
  }

  /**
   * Handle incoming messages from other contexts
   */
  private handleIncomingMessage(
    message: MessagePayload,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): void {
    try {
      const { id, type, action, data, source } = message;

      // Decompress data if needed
      const processedData = this.config.compressionEnabled ? this.decompressData(data) : data;

      if (type === 'request') {
        // Handle request messages
        const handlers = this.messageHandlers.get(action) || [];

        if (handlers.length === 0) {
          sendResponse({ error: `No handler for action: ${action}` });
          return;
        }

        // Execute all handlers and send combined response
        Promise.all(handlers.map(handler => handler(processedData, source)))
          .then(results => {
            sendResponse({
              id,
              type: 'response',
              data: results.length === 1 ? results[0] : results,
              timestamp: Date.now()
            });
          })
          .catch(error => {
            sendResponse({
              id,
              type: 'response',
              error: error.message,
              timestamp: Date.now()
            });
          });
      } else if (type === 'response') {
        // Handle response messages
        const pendingRequest = this.pendingRequests.get(id);
        if (pendingRequest) {
          clearTimeout(pendingRequest.timer);
          this.pendingRequests.delete(id);

          if (message.error) {
            pendingRequest.reject(new Error(message.error));
          } else {
            pendingRequest.resolve(processedData);
          }
        }
      } else if (type === 'event') {
        // Handle event messages
        this.processEvent({
          type: action,
          timestamp: message.timestamp,
          data: processedData,
          userId: undefined,
          sessionId: message.sessionId || ''
        });
      }

      // Trigger data received hook
      if (this.hooks.onDataReceived) {
        this.hooks.onDataReceived(processedData, source);
      }
    } catch (error) {
      console.error('[IntegrationService] Message handling error:', error);
      sendResponse({ error: 'Message processing failed' });
    }
  }

  /**
   * Setup storage synchronization
   */
  private async setupStorageSync(): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      // Listen for storage changes
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'sync' || areaName === 'local') {
          this.handleStorageChange(changes);
        }
      });

      // Load initial data from storage
      const storedData = await this.loadFromStorage();
      this.mergeCrossContextData(storedData);
    }
  }

  /**
   * Start real-time synchronization
   */
  private startRealTimeSync(): void {
    this.syncTimer = setInterval(async () => {
      try {
        await this.performRealTimeSync();
      } catch (error) {
        console.error('[IntegrationService] Real-time sync error:', error);
      }
    }, this.config.syncInterval);
  }

  /**
   * Test connections to all contexts
   */
  private async testConnections(): Promise<void> {
    const contexts = ['background', 'content', 'popup', 'options'] as const;

    for (const context of contexts) {
      try {
        await this.sendMessage(context, 'ping', {}, { timeout: 5000, retry: false });
        this.connectionStatus.set(context, true);
      } catch (error) {
        this.connectionStatus.set(context, false);
        console.warn(`[IntegrationService] Connection failed to ${context}:`, error);
      }
    }
  }

  /**
   * Get current Chrome extension context
   */
  private getCurrentContext(): 'background' | 'content' | 'popup' | 'options' {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      // Service worker context
      if (chrome.runtime.getURL('').includes('chrome-extension://')) {
        if (location.pathname.includes('popup')) return 'popup';
        if (location.pathname.includes('options')) return 'options';
        return 'background';
      }
    }

    // Content script context
    return 'content';
  }

  /**
   * Dispatch message using appropriate Chrome API
   */
  private dispatchMessage(payload: MessagePayload): void {
    if (payload.target === 'content') {
      // Send to content scripts
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, payload);
        }
      });
    } else {
      // Send to extension contexts
      chrome.runtime.sendMessage(payload);
    }
  }

  // Helper methods
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private compressData(data: any): any {
    // Simple compression - in production, use proper compression library
    return JSON.stringify(data);
  }

  private decompressData(data: any): any {
    try {
      return typeof data === 'string' ? JSON.parse(data) : data;
    } catch {
      return data;
    }
  }

  private updateCrossContextData(module: TestingModule, data: any): void {
    switch (module) {
      case 'attention':
        this.crossContextData.attentionMetrics = data;
        break;
      case 'mobile':
        this.crossContextData.mobileMetrics = data;
        break;
      case 'preferences':
        this.crossContextData.preferences = data;
        break;
      case 'ab_testing':
        this.crossContextData.abTestResults = data;
        break;
      case 'analytics':
        this.crossContextData.dashboardData = data;
        break;
    }
  }

  private async saveToStorage(module: TestingModule, data: any): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const key = `testing_${module}`;
      await chrome.storage.local.set({ [key]: data });
    }
  }

  private async loadFromStorage(): Promise<Partial<CrossContextData>> {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.local.get();
      return {
        attentionMetrics: result.testing_attention || null,
        mobileMetrics: result.testing_mobile || null,
        preferences: result.testing_preferences || null,
        abTestResults: result.testing_ab_testing || [],
        dashboardData: result.testing_analytics || null,
        consent: result.testing_consent || null,
        config: result.testing_config || null
      };
    }
    return {};
  }

  private mergeCrossContextData(data: Partial<CrossContextData>): void {
    Object.assign(this.crossContextData, data);
  }

  private handleStorageChange(changes: { [key: string]: chrome.storage.StorageChange }): void {
    Object.keys(changes).forEach(key => {
      if (key.startsWith('testing_')) {
        const module = key.replace('testing_', '') as TestingModule;
        this.updateCrossContextData(module, changes[key].newValue);
      }
    });
  }

  private async performRealTimeSync(): Promise<void> {
    const currentData = await this.getSyncedData();
    await this.broadcastMessage('sync_update', currentData);
  }

  private sendMessageWithRetry(payload: MessagePayload, resolve: (value: any) => void, reject: (reason?: any) => void): void {
    setTimeout(() => {
      try {
        this.dispatchMessage(payload);
      } catch (error) {
        reject(error);
      }
    }, 1000 * (payload.retry! + 1)); // Exponential backoff
  }

  private handleConnection(port: chrome.runtime.Port): void {
    console.debug('[IntegrationService] New connection:', port.name);
  }

  private handleReconnection(): void {
    console.debug('[IntegrationService] Handling reconnection');
    this.testConnections();
  }

  private setupErrorRecovery(): void {
    // Setup error recovery mechanisms
    window.addEventListener('error', (event) => {
      this.logError('integration_error', new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno
      });
    });
  }

  private processEvent(event: TestingEvent): void {
    this.eventQueue.push(event);

    // Keep only recent events
    if (this.eventQueue.length > 1000) {
      this.eventQueue = this.eventQueue.slice(-1000);
    }
  }

  private logError(type: string, error: Error, context?: any): void {
    const testingError: TestingError = {
      timestamp: Date.now(),
      module: 'integration' as TestingModule,
      error: error.message,
      severity: 'medium',
      context
    };

    this.errorLog.push(testingError);

    if (this.hooks.onError) {
      this.hooks.onError(testingError);
    }

    console.error(`[IntegrationService] ${type}:`, error);
  }

  /**
   * Get integration status and statistics
   */
  public getStatus(): {
    isInitialized: boolean;
    connectionStatus: Record<string, boolean>;
    syncState: SyncState;
    pendingRequests: number;
    eventQueueSize: number;
    errorCount: number;
  } {
    return {
      isInitialized: this.isInitialized,
      connectionStatus: Object.fromEntries(this.connectionStatus),
      syncState: { ...this.syncState },
      pendingRequests: this.pendingRequests.size,
      eventQueueSize: this.eventQueue.length,
      errorCount: this.errorLog.length
    };
  }

  /**
   * Stop integration service and cleanup
   */
  public stop(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    // Clear pending requests
    this.pendingRequests.forEach(({ timer, reject }) => {
      clearTimeout(timer);
      reject(new Error('Integration service stopped'));
    });
    this.pendingRequests.clear();

    this.messageHandlers.clear();
    this.eventQueue = [];
    this.isInitialized = false;

    console.debug('[IntegrationService] Stopped successfully');
  }
}
