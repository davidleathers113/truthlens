/**
 * Shared Services - Main Export Index
 * Centralized exports for all TruthLens services
 */

// Core services
export * from '../storage/storageService';

// Security and Privacy Services (2025 Implementation)
export * from './securityService';
export * from './securityTesting';
export * from './complianceDocumentation';

// Error handling system (2025 implementation)
export * from './errorHandler';
export * from './logger';
export * from './errorMessages';
export * from './offlineHandler';
export * from './errorIntegration';

// Re-export performance monitoring system
export * from '../performance';

// Utility function to initialize all error handling services
export async function initializeErrorHandlingSystem(
  context: import('../types/error').ExtensionContextType,
  config?: {
    errorHandler?: Partial<import('../types/error').ErrorHandlerConfig>;
    logger?: Partial<import('../types/error').LogConfig>;
    offline?: Partial<import('./offlineHandler').default>;
    integration?: Partial<{enableGlobalErrorBoundary: boolean; enableUnhandledRejectionHandler: boolean; enableChromeErrorHandler: boolean; enablePerformanceMonitoring: boolean; enableUserFeedback: boolean; debugMode: boolean;}>;
  }
) {
  const { createErrorIntegration } = await import('./errorIntegration');

  const integration = createErrorIntegration(context, config?.integration);
  await integration.initialize();

  return integration;
}

// Quick setup function for different contexts
export const setupErrorHandling = {
  serviceWorker: () => initializeErrorHandlingSystem('background', {
    errorHandler: {
      enableReporting: true,
      enableOfflineMode: true,
      enableRecovery: true
    },
    logger: {
      level: 'info',
      destinations: { storage: true, console: false, remote: false, export: false }
    }
  }),

  contentScript: () => initializeErrorHandlingSystem('content', {
    errorHandler: {
      enableReporting: false, // Privacy-first for content scripts
      enableOfflineMode: true,
      enableRecovery: true
    },
    logger: {
      level: 'warn',
      destinations: { storage: true, console: false, remote: false, export: false }
    }
  }),

  popup: () => initializeErrorHandlingSystem('popup', {
    errorHandler: {
      enableReporting: false,
      enableRecovery: true
    },
    logger: {
      level: 'info',
      destinations: { storage: true, console: true, remote: false, export: false }
    }
  }),

  options: () => initializeErrorHandlingSystem('options', {
    errorHandler: {
      enableReporting: true,
      enableRecovery: true,
      debugConfig: {
        enableDebugPanel: true,
        enableConsoleOutput: true,
        verboseLogging: true,
        enablePerformanceTracking: true
      }
    },
    logger: {
      level: 'debug',
      destinations: { storage: true, console: true, remote: false, export: true }
    }
  })
};
