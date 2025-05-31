/**
 * Error Handling Integration - Chrome Extension Context Integration
 * Manifest V3 compliant integration across service worker, content scripts, popup, and options
 */

import { ExtensionContextType, TruthLensError, ErrorHandlerConfig } from '../types/error';
import { initializeErrorHandler, errorHandler } from './errorHandler';
import { initializeLogger, logger } from './logger';
import { initializeOfflineHandler, offlineHandler } from './offlineHandler';
import { errorMessageService } from './errorMessages';

interface IntegrationConfig {
  enableGlobalErrorBoundary: boolean;
  enableUnhandledRejectionHandler: boolean;
  enableChromeErrorHandler: boolean;
  enablePerformanceMonitoring: boolean;
  enableUserFeedback: boolean;
  debugMode: boolean;
}

class ErrorIntegration {
  private context: ExtensionContextType;
  private config: IntegrationConfig;
  private initialized: boolean = false;
  private errorBoundaryContainer: HTMLElement | null = null;

  constructor(context: ExtensionContextType, config?: Partial<IntegrationConfig>) {
    this.context = context;
    this.config = {
      enableGlobalErrorBoundary: true,
      enableUnhandledRejectionHandler: true,
      enableChromeErrorHandler: context === 'background',
      enablePerformanceMonitoring: true,
      enableUserFeedback: context !== 'background',
      debugMode: process.env.NODE_ENV === 'development',
      ...config
    };
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('[ErrorIntegration] Already initialized');
      return;
    }

    try {
      // Initialize core services
      await this.initializeCoreServices();

      // Set up context-specific integrations
      await this.setupContextIntegration();

      // Set up global error handling
      if (this.config.enableGlobalErrorBoundary) {
        this.setupGlobalErrorBoundary();
      }

      // Set up Chrome extension specific error handling
      if (this.config.enableChromeErrorHandler) {
        this.setupChromeErrorHandling();
      }

      // Set up performance monitoring integration
      if (this.config.enablePerformanceMonitoring) {
        this.setupPerformanceIntegration();
      }

      this.initialized = true;

      logger.info('ErrorIntegration initialized successfully', {
        context: this.context,
        config: this.config
      });

    } catch (error) {
      console.error('[ErrorIntegration] Initialization failed:', error);
      throw error;
    }
  }

  private async initializeCoreServices(): Promise<void> {
    // Initialize logger first
    initializeLogger(this.context, {
      level: this.config.debugMode ? 'debug' : 'info',
      destinations: {
        console: this.config.debugMode,
        storage: true,
        remote: false,
        export: true
      }
    });

    // Initialize error handler
    initializeErrorHandler(this.context, {
      enableReporting: !this.config.debugMode,
      enableRecovery: true,
      enableOfflineMode: true,
      debugConfig: {
        enableConsoleOutput: this.config.debugMode,
        verboseLogging: this.config.debugMode,
        enableDebugPanel: this.config.debugMode,
        enablePerformanceTracking: this.config.enablePerformanceMonitoring
      }
    });

    // Initialize offline handler
    initializeOfflineHandler(this.context, {
      enableOfflineMode: true,
      enableNetworkPolling: this.context === 'content',
      enableServiceWorkerSync: this.context === 'background'
    });
  }

  private async setupContextIntegration(): Promise<void> {
    switch (this.context) {
      case 'background':
        await this.setupServiceWorkerIntegration();
        break;
      case 'content':
        await this.setupContentScriptIntegration();
        break;
      case 'popup':
        await this.setupPopupIntegration();
        break;
      case 'options':
        await this.setupOptionsIntegration();
        break;
    }
  }

  private async setupServiceWorkerIntegration(): Promise<void> {
    // Service Worker specific error handling (Manifest V3)
    
    // Handle service worker installation errors
    self.addEventListener('install', (event) => {
      logger.info('Service worker installing');
      
      event.waitUntil(
        Promise.resolve().catch(error => {
          const swError = errorHandler.createError(
            'runtime',
            'Service worker installation failed',
            {
              severity: 'critical',
              code: 'SW_INSTALL_FAILED',
              technicalMessage: error.message,
              affectedFeatures: ['background-processing', 'extension-lifecycle']
            }
          );
          return errorHandler.handleError(swError);
        })
      );
    });

    // Handle service worker activation errors
    self.addEventListener('activate', (event) => {
      logger.info('Service worker activating');
      
      event.waitUntil(
        Promise.resolve().catch(error => {
          const swError = errorHandler.createError(
            'runtime',
            'Service worker activation failed',
            {
              severity: 'critical',
              code: 'SW_ACTIVATE_FAILED',
              technicalMessage: error.message,
              affectedFeatures: ['background-processing']
            }
          );
          return errorHandler.handleError(swError);
        })
      );
    });

    // Handle Chrome extension API errors
    if (chrome.runtime) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        try {
          this.handleExtensionMessage(message, sender, sendResponse);
        } catch (error) {
          const msgError = errorHandler.createError(
            'runtime',
            'Message handling failed',
            {
              severity: 'medium',
              code: 'MESSAGE_HANDLER_ERROR',
              technicalMessage: (error as Error).message,
              metadata: { message, sender },
              affectedFeatures: ['inter-context-communication']
            }
          );
          errorHandler.handleError(msgError);
          sendResponse({ error: 'Message handling failed' });
        }
      });
    }

    // Handle Chrome alarms (Manifest V3 timer replacement)
    if (chrome.alarms) {
      chrome.alarms.onAlarm.addListener((alarm) => {
        logger.debug('Alarm triggered', { alarm: alarm.name });
      });
    }
  }

  private async setupContentScriptIntegration(): Promise<void> {
    // Content script specific error handling
    
    // DOM modification error handling
    const originalAppendChild = Node.prototype.appendChild;
    Node.prototype.appendChild = function(child) {
      try {
        return originalAppendChild.call(this, child);
      } catch (error) {
        const domError = errorHandler.createError(
          'runtime',
          'DOM manipulation failed',
          {
            severity: 'low',
            code: 'DOM_APPEND_FAILED',
            technicalMessage: (error as Error).message,
            metadata: { 
              parentNode: this.nodeName,
              childNode: (child as Element).nodeName 
            },
            affectedFeatures: ['visual-indicators']
          }
        );
        errorHandler.handleError(domError);
        throw error;
      }
    };

    // Mutation observer error handling
    if (typeof MutationObserver !== 'undefined') {
      const originalObserve = MutationObserver.prototype.observe;
      MutationObserver.prototype.observe = function(target, options) {
        try {
          return originalObserve.call(this, target, options);
        } catch (error) {
          const observerError = errorHandler.createError(
            'runtime',
            'MutationObserver setup failed',
            {
              severity: 'medium',
              code: 'MUTATION_OBSERVER_FAILED',
              technicalMessage: (error as Error).message,
              affectedFeatures: ['page-monitoring']
            }
          );
          errorHandler.handleError(observerError);
          throw error;
        }
      };
    }

    // CSP violation handling
    document.addEventListener('securitypolicyviolation', (event) => {
      const cspError = errorHandler.createError(
        'security',
        'Content Security Policy violation',
        {
          severity: 'high',
          code: 'CSP_VIOLATION',
          technicalMessage: event.violatedDirective,
          metadata: {
            blockedURI: event.blockedURI,
            documentURI: event.documentURI,
            effectiveDirective: event.effectiveDirective
          },
          affectedFeatures: ['content-analysis']
        }
      );
      errorHandler.handleError(cspError);
    });
  }

  private async setupPopupIntegration(): Promise<void> {
    // Popup specific error handling
    
    // Handle popup close errors
    window.addEventListener('beforeunload', () => {
      logger.debug('Popup closing');
      this.cleanup();
    });

    // Set up error display container
    this.setupErrorDisplayContainer();

    // Handle form submission errors
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      if (form && form.classList.contains('truthlens-form')) {
        this.handleFormSubmission(form, event);
      }
    });
  }

  private async setupOptionsIntegration(): Promise<void> {
    // Options page specific error handling
    
    // Set up error display container
    this.setupErrorDisplayContainer();

    // Set up debug console if enabled
    if (this.config.debugMode) {
      await this.setupDebugConsole();
    }

    // Handle settings save errors
    document.addEventListener('change', (event) => {
      const input = event.target as HTMLInputElement;
      if (input && input.classList.contains('truthlens-setting')) {
        this.handleSettingChange(input);
      }
    });
  }

  private setupGlobalErrorBoundary(): void {
    // Global error boundary for unhandled errors
    window.addEventListener('error', (event) => {
      const error = errorHandler.createError(
        'runtime',
        event.message,
        {
          severity: 'high',
          code: 'UNHANDLED_ERROR',
          technicalMessage: event.error?.stack,
          metadata: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
          },
          affectedFeatures: ['unknown'],
          cause: event.error
        }
      );

      errorHandler.handleError(error).then(result => {
        if (!result.successful && this.config.enableUserFeedback) {
          this.displayErrorToUser(error);
        }
      });
    });

    // Global promise rejection handler
    if (this.config.enableUnhandledRejectionHandler) {
      window.addEventListener('unhandledrejection', (event) => {
        const error = errorHandler.createError(
          'runtime',
          'Unhandled promise rejection',
          {
            severity: 'medium',
            code: 'UNHANDLED_REJECTION',
            technicalMessage: event.reason?.toString(),
            metadata: { reason: event.reason },
            affectedFeatures: ['unknown']
          }
        );

        errorHandler.handleError(error).then(result => {
          if (!result.successful && this.config.enableUserFeedback) {
            this.displayErrorToUser(error);
          }
        });
      });
    }
  }

  private setupChromeErrorHandling(): void {
    // Chrome extension API error handling
    
    // Runtime errors
    if (chrome.runtime && chrome.runtime.onStartup) {
      chrome.runtime.onStartup.addListener(() => {
        logger.info('Chrome runtime startup');
      });
    }

    // Installation errors
    if (chrome.runtime && chrome.runtime.onInstalled) {
      chrome.runtime.onInstalled.addListener((details) => {
        logger.info('Extension installed/updated', { details });
      });
    }

    // Suspension detection (Manifest V3)
    if (chrome.runtime && chrome.runtime.onSuspend) {
      chrome.runtime.onSuspend.addListener(() => {
        logger.info('Service worker suspending');
        this.cleanup();
      });
    }
  }

  private setupPerformanceIntegration(): void {
    // Performance monitoring integration with error handling
    
    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach(entry => {
            if (entry.duration > 50) { // Tasks longer than 50ms
              logger.warn('Long task detected', {
                duration: entry.duration,
                startTime: entry.startTime,
                name: entry.name
              });
            }
          });
        });

        observer.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        logger.debug('Long task monitoring not available');
      }
    }

    // Monitor memory usage (if available)
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
          const memoryError = errorHandler.createError(
            'runtime',
            'High memory usage detected',
            {
              severity: 'medium',
              code: 'HIGH_MEMORY_USAGE',
              technicalMessage: `Memory usage: ${memory.usedJSHeapSize / 1024 / 1024}MB`,
              metadata: memory,
              affectedFeatures: ['performance']
            }
          );
          errorHandler.handleError(memoryError);
        }
      }, 30000); // Check every 30 seconds
    }
  }

  private setupErrorDisplayContainer(): void {
    // Create error display container for user-facing contexts
    this.errorBoundaryContainer = document.createElement('div');
    this.errorBoundaryContainer.id = 'truthlens-error-boundary';
    this.errorBoundaryContainer.className = 'truthlens-error-container';
    
    // Inject styles
    this.injectErrorStyles();
    
    // Append to body when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        document.body.appendChild(this.errorBoundaryContainer!);
      });
    } else {
      document.body.appendChild(this.errorBoundaryContainer);
    }
  }

  private injectErrorStyles(): void {
    const styleId = 'truthlens-error-styles';
    if (document.getElementById(styleId)) return;

    const styles = document.createElement('style');
    styles.id = styleId;
    styles.textContent = `
      .truthlens-error-container {
        position: fixed;
        top: 20px;
        right: 20px;
        max-width: 400px;
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .truthlens-error {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
        margin-bottom: 12px;
        padding: 16px;
        animation: slideIn 0.3s ease-out;
      }

      .truthlens-error.error-critical {
        border-left: 4px solid #ef4444;
      }

      .truthlens-error.error-high {
        border-left: 4px solid #ef4444;
      }

      .truthlens-error.error-medium {
        border-left: 4px solid #f59e0b;
      }

      .truthlens-error.error-low {
        border-left: 4px solid #3b82f6;
      }

      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      .error-primary {
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }

      .error-icon {
        font-size: 20px;
        margin-top: 2px;
      }

      .error-content {
        flex: 1;
      }

      .error-title {
        font-size: 14px;
        font-weight: 600;
        margin: 0 0 4px 0;
        color: #111827;
      }

      .error-message {
        font-size: 13px;
        margin: 0 0 12px 0;
        color: #6b7280;
        line-height: 1.4;
      }

      .error-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .error-action {
        padding: 6px 12px;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        background: white;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .error-action:hover {
        background: #f9fafb;
      }

      .error-action.primary {
        background: #3b82f6;
        color: white;
        border-color: #3b82f6;
      }

      .error-action.primary:hover {
        background: #2563eb;
      }

      .error-close {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 20px;
        height: 20px;
        border: none;
        background: none;
        font-size: 16px;
        cursor: pointer;
        color: #9ca3af;
      }

      .error-close:hover {
        color: #6b7280;
      }
    `;

    document.head.appendChild(styles);
  }

  private displayErrorToUser(error: TruthLensError): void {
    if (!this.errorBoundaryContainer) return;

    const template = errorMessageService.getTemplateForError(error);
    if (!template) return;

    const errorElement = document.createElement('div');
    errorElement.className = `truthlens-error error-${error.severity}`;
    errorElement.setAttribute('role', 'alert');
    errorElement.setAttribute('aria-label', template.accessibility.ariaLabel);

    const { html } = errorMessageService.formatErrorMessage(template, error, false);
    errorElement.innerHTML = html;

    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'error-close';
    closeButton.innerHTML = '×';
    closeButton.setAttribute('aria-label', 'Close error message');
    closeButton.addEventListener('click', () => {
      errorElement.remove();
    });
    errorElement.appendChild(closeButton);

    // Set up action handlers
    this.setupErrorActionHandlers(errorElement, error);

    // Auto-remove after delay (except for critical errors)
    if (error.severity !== 'critical') {
      setTimeout(() => {
        if (errorElement.parentNode) {
          errorElement.remove();
        }
      }, 10000);
    }

    this.errorBoundaryContainer.appendChild(errorElement);

    // Announce to screen readers
    if (template.accessibility.announceText) {
      this.announceToScreenReader(template.accessibility.announceText);
    }
  }

  private setupErrorActionHandlers(errorElement: HTMLElement, error: TruthLensError): void {
    const actionButtons = errorElement.querySelectorAll('.error-action');
    
    actionButtons.forEach(button => {
      const action = button.getAttribute('data-action');
      if (!action) return;

      button.addEventListener('click', () => {
        this.handleErrorAction(action, error, errorElement);
      });
    });
  }

  private handleErrorAction(action: string, error: TruthLensError, errorElement: HTMLElement): void {
    switch (action) {
      case 'retry':
        // Implement retry logic
        logger.info('User initiated retry', { errorId: error.id });
        errorElement.remove();
        break;
        
      case 'dismiss':
        errorElement.remove();
        break;
        
      case 'show-details':
        // Toggle details visibility
        const template = errorMessageService.getTemplateForError(error);
        if (template) {
          const { html } = errorMessageService.formatErrorMessage(template, error, true);
          errorElement.innerHTML = html;
          this.setupErrorActionHandlers(errorElement, error);
        }
        break;
        
      case 'report':
        // Send error report
        logger.info('User initiated error report', { errorId: error.id });
        break;
        
      default:
        logger.debug('Unknown error action', { action, errorId: error.id });
    }
  }

  private announceToScreenReader(text: string): void {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';
    
    document.body.appendChild(announcement);
    announcement.textContent = text;
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  private async setupDebugConsole(): Promise<void> {
    // Debug console implementation would go here
    // This would create a developer-friendly error monitoring interface
    logger.debug('Debug console setup completed');
  }

  private handleExtensionMessage(message: any, sender: chrome.runtime.MessageSender, sendResponse: Function): void {
    // Handle inter-context error communication
    if (message.type === 'ERROR_REPORT') {
      const error: TruthLensError = message.error;
      errorHandler.handleError(error);
      sendResponse({ success: true });
    }
  }

  private handleFormSubmission(form: HTMLFormElement, event: Event): void {
    // Form submission error handling
    try {
      const formData = new FormData(form);
      // Process form data...
    } catch (error) {
      event.preventDefault();
      
      const formError = errorHandler.createError(
        'user',
        'Form submission failed',
        {
          severity: 'low',
          code: 'FORM_SUBMIT_ERROR',
          technicalMessage: (error as Error).message,
          affectedFeatures: ['settings-save']
        }
      );
      
      errorHandler.handleError(formError);
    }
  }

  private handleSettingChange(input: HTMLInputElement): void {
    // Settings change error handling
    try {
      // Validate and save setting...
      logger.debug('Setting changed', { 
        setting: input.name,
        value: input.value 
      });
    } catch (error) {
      const settingError = errorHandler.createError(
        'data',
        'Setting update failed',
        {
          severity: 'low',
          code: 'SETTING_UPDATE_ERROR',
          technicalMessage: (error as Error).message,
          metadata: { setting: input.name, value: input.value },
          affectedFeatures: ['user-preferences']
        }
      );
      
      errorHandler.handleError(settingError);
    }
  }

  // Public API

  public isInitialized(): boolean {
    return this.initialized;
  }

  public updateConfig(newConfig: Partial<IntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('ErrorIntegration configuration updated', { newConfig });
  }

  public cleanup(): void {
    // Cleanup error boundary
    if (this.errorBoundaryContainer) {
      this.errorBoundaryContainer.remove();
      this.errorBoundaryContainer = null;
    }

    // Cleanup services
    if (errorHandler) {
      errorHandler.cleanup();
    }
    
    if (logger) {
      logger.cleanup();
    }
    
    if (offlineHandler) {
      offlineHandler.cleanup();
    }

    this.initialized = false;
    
    console.log('[ErrorIntegration] Cleanup completed');
  }
}

// Factory function for creating context-specific integrations
export function createErrorIntegration(context: ExtensionContextType, config?: Partial<IntegrationConfig>): ErrorIntegration {
  return new ErrorIntegration(context, config);
}

// Export for global use
export default ErrorIntegration;