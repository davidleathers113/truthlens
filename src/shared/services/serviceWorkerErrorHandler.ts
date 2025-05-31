/**
 * Service Worker Error Handler - 2025 Manifest V3 Compliant
 * Addresses Chrome 139+ requirements for service worker lifecycle management
 */

import { errorHandler } from './errorHandler';
import { logger } from './logger';
import { TruthLensError } from '../types/error';

class ServiceWorkerErrorHandler {
  private static instance: ServiceWorkerErrorHandler;
  private isInitialized = false;

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): ServiceWorkerErrorHandler {
    if (!ServiceWorkerErrorHandler.instance) {
      ServiceWorkerErrorHandler.instance = new ServiceWorkerErrorHandler();
    }
    return ServiceWorkerErrorHandler.instance;
  }

  /**
   * Initialize service worker error handling - MUST be called at top level
   * This addresses 2025 Chrome requirements for event listener registration
   */
  public initializeAtTopLevel(): void {
    if (this.isInitialized) return;

    // Register event listeners at top level (Manifest V3 requirement)
    this.registerInstallHandler();
    this.registerActivateHandler();
    this.registerMessageHandler();
    this.registerAlarmHandler();
    this.registerStartupHandler();
    this.registerSuspendHandler();

    this.isInitialized = true;
    
    // Use chrome.alarms instead of setTimeout for persistence
    chrome.alarms.create('error-handler-heartbeat', { periodInMinutes: 1 });
  }

  private registerInstallHandler(): void {
    // Service worker install handler - top level registration
    self.addEventListener('install', (event) => {
      logger.info('Service worker installing');
      
      event.waitUntil(
        this.handleInstallation().catch(error => {
          const installError = errorHandler.createError(
            'runtime',
            'Service worker installation failed',
            {
              severity: 'critical',
              code: 'SW_INSTALL_FAILED',
              technicalMessage: error.message,
              affectedFeatures: ['background-processing', 'extension-lifecycle'],
              cause: error
            }
          );
          return errorHandler.handleError(installError);
        })
      );
    });
  }

  private registerActivateHandler(): void {
    // Service worker activate handler - top level registration
    self.addEventListener('activate', (event) => {
      logger.info('Service worker activating');
      
      event.waitUntil(
        this.handleActivation().catch(error => {
          const activateError = errorHandler.createError(
            'runtime',
            'Service worker activation failed',
            {
              severity: 'critical',
              code: 'SW_ACTIVATE_FAILED',
              technicalMessage: error.message,
              affectedFeatures: ['background-processing'],
              cause: error
            }
          );
          return errorHandler.handleError(activateError);
        })
      );
    });
  }

  private registerMessageHandler(): void {
    // Message handler for cross-context communication
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse)
        .catch(error => {
          const messageError = errorHandler.createError(
            'runtime',
            'Message handling failed',
            {
              severity: 'medium',
              code: 'MESSAGE_HANDLER_ERROR',
              technicalMessage: error.message,
              metadata: { message, sender },
              affectedFeatures: ['inter-context-communication'],
              cause: error
            }
          );
          
          errorHandler.handleError(messageError);
          sendResponse({ error: 'Message handling failed', errorId: messageError.id });
        });
      
      // Return true for async response (Manifest V3 requirement)
      return true;
    });
  }

  private registerAlarmHandler(): void {
    // Use chrome.alarms instead of setTimeout/setInterval (Manifest V3 best practice)
    chrome.alarms.onAlarm.addListener((alarm) => {
      try {
        switch (alarm.name) {
          case 'error-handler-heartbeat':
            this.performHeartbeat();
            break;
          case 'error-cleanup':
            this.performCleanup();
            break;
          default:
            logger.debug('Unknown alarm triggered', { alarmName: alarm.name });
        }
      } catch (error) {
        const alarmError = errorHandler.createError(
          'runtime',
          'Alarm handler failed',
          {
            severity: 'medium',
            code: 'ALARM_HANDLER_ERROR',
            technicalMessage: (error as Error).message,
            metadata: { alarmName: alarm.name },
            affectedFeatures: ['scheduled-tasks'],
            cause: error as Error
          }
        );
        errorHandler.handleError(alarmError);
      }
    });
  }

  private registerStartupHandler(): void {
    // Handle extension startup
    chrome.runtime.onStartup.addListener(() => {
      try {
        logger.info('Extension startup detected');
        this.handleStartup();
      } catch (error) {
        const startupError = errorHandler.createError(
          'runtime',
          'Extension startup failed',
          {
            severity: 'high',
            code: 'STARTUP_ERROR',
            technicalMessage: (error as Error).message,
            affectedFeatures: ['extension-initialization'],
            cause: error as Error
          }
        );
        errorHandler.handleError(startupError);
      }
    });
  }

  private registerSuspendHandler(): void {
    // Handle service worker suspension (Manifest V3 specific)
    chrome.runtime.onSuspend.addListener(() => {
      try {
        logger.info('Service worker suspending - performing cleanup');
        this.handleSuspension();
      } catch (error) {
        // Log to console as fallback since service worker is suspending
        console.error('[ServiceWorkerErrorHandler] Suspension handler failed:', error);
      }
    });
  }

  private async handleInstallation(): Promise<void> {
    // Perform installation tasks
    logger.info('Service worker installation completed');
    
    // Set up error cleanup alarm
    chrome.alarms.create('error-cleanup', { periodInMinutes: 60 });
  }

  private async handleActivation(): Promise<void> {
    // Perform activation tasks
    logger.info('Service worker activation completed');
    
    // Clean up old caches if needed
    await this.cleanupOldData();
  }

  private async handleMessage(
    message: any, 
    sender: chrome.runtime.MessageSender, 
    sendResponse: Function
  ): Promise<void> {
    try {
      switch (message.type) {
        case 'ERROR_REPORT':
          await this.handleErrorReport(message);
          sendResponse({ success: true });
          break;
          
        case 'HEALTH_CHECK':
          sendResponse({ status: 'healthy', timestamp: Date.now() });
          break;
          
        case 'GET_ERROR_STATS':
          const stats = errorHandler.getErrorStats();
          sendResponse({ stats });
          break;
          
        default:
          logger.debug('Unknown message type', { type: message.type });
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      throw new Error(`Message handling failed: ${(error as Error).message}`);
    }
  }

  private async handleErrorReport(message: any): Promise<void> {
    const error: TruthLensError = message.error;
    
    // Process cross-context error report
    logger.info('Processing cross-context error report', { 
      errorId: error.id,
      fromContext: message.fromContext 
    });
    
    await errorHandler.handleError(error);
  }

  private performHeartbeat(): void {
    // Keep service worker responsive and log health status
    logger.debug('Service worker heartbeat', {
      timestamp: Date.now(),
      memory: this.getMemoryUsage()
    });
  }

  private async performCleanup(): Promise<void> {
    try {
      // Cleanup old error logs and data
      logger.info('Performing scheduled error cleanup');
      
      // Clean up old storage data
      await this.cleanupOldData();
      
      // Force garbage collection if available
      if ((globalThis as any).gc) {
        (globalThis as any).gc();
      }
      
    } catch (error) {
      logger.error('Cleanup failed', {}, error as Error);
    }
  }

  private async cleanupOldData(): Promise<void> {
    // Implementation for cleaning up old error data
    // This would integrate with the storage service
    logger.debug('Old data cleanup completed');
  }

  private handleStartup(): void {
    // Reinitialize error handling after extension startup
    logger.info('Reinitializing error handling after startup');
  }

  private handleSuspension(): void {
    // Final cleanup before service worker suspension
    logger.info('Service worker suspension cleanup completed');
  }

  private getMemoryUsage(): number | undefined {
    // Get memory usage if available
    return 'memory' in performance ? (performance as any).memory?.usedJSHeapSize : undefined;
  }

  // Public API for cross-context error reporting
  public static reportError(error: TruthLensError, fromContext: string): void {
    chrome.runtime.sendMessage({
      type: 'ERROR_REPORT',
      error,
      fromContext
    }).catch(sendError => {
      // Fallback logging if message sending fails
      console.error('[ServiceWorkerErrorHandler] Failed to send error report:', sendError);
    });
  }

  public static async getHealthStatus(): Promise<{ status: string; timestamp: number }> {
    try {
      return await chrome.runtime.sendMessage({ type: 'HEALTH_CHECK' });
    } catch (error) {
      return { status: 'unreachable', timestamp: Date.now() };
    }
  }
}

// Initialize at top level (Manifest V3 requirement)
// This must be called immediately when the service worker script loads
if (typeof importScripts === 'function') {
  // We're in a service worker context
  ServiceWorkerErrorHandler.getInstance().initializeAtTopLevel();
}

export default ServiceWorkerErrorHandler;