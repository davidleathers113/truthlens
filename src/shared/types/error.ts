/**
 * Error Handling Types - 2025 Best Practices Implementation
 * TypeScript-first error classification and handling for Chrome Manifest V3 Extensions
 */

// Core Error Classification (Based on 2025 patterns)
export type ErrorCategory = 
  | 'network'          // API failures, connectivity issues
  | 'permission'       // Chrome extension permissions, API access
  | 'data'            // Storage, parsing, validation errors
  | 'runtime'         // JavaScript runtime errors, unexpected states
  | 'ai'              // Chrome Built-in AI API errors
  | 'security'        // CSP violations, security-related errors
  | 'user'            // User input validation, interaction errors
  | 'system';         // Browser compatibility, extension lifecycle

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export type RecoveryStrategy = 
  | 'retry'           // Automatic retry with backoff
  | 'fallback'        // Use alternative approach
  | 'offline'         // Switch to offline mode
  | 'user-action'     // Require user intervention
  | 'graceful-degrade'// Reduce functionality
  | 'restart'         // Restart component/extension
  | 'none';           // No recovery possible

// Extension Context Types (Manifest V3 specific)
export type ExtensionContextType = 'background' | 'content' | 'popup' | 'options';

// Structured Error Interface (2025 JSON-first approach)
export interface TruthLensError {
  id: string;                          // Unique error identifier
  timestamp: number;                   // Unix timestamp
  category: ErrorCategory;             // Error classification
  severity: ErrorSeverity;             // Impact level
  message: string;                     // Human-readable message
  technicalMessage?: string;           // Developer-focused details
  code?: string;                       // Error code for lookup
  context: {
    extension: ExtensionContextType;   // Where error occurred
    url?: string;                      // Current page URL (if applicable)
    userAgent: string;                 // Browser info
    extensionVersion: string;          // Extension version
    userId?: string;                   // Anonymous user ID
    sessionId: string;                 // Session identifier
  };
  stack?: string;                      // Stack trace (development only)
  source: {
    file?: string;                     // Source file
    line?: number;                     // Line number
    column?: number;                   // Column number
    function?: string;                 // Function name
  };
  metadata?: Record<string, any>;      // Additional context data
  recovery: {
    strategy: RecoveryStrategy;        // Recommended recovery
    attempted: boolean;                // Was recovery attempted
    successful?: boolean;              // Recovery outcome
    retryCount?: number;               // Number of retries
    fallbackUsed?: string;            // Fallback method used
  };
  userImpact: {
    affectedFeatures: string[];        // What stopped working
    workaround?: string;               // User workaround available
    dataLoss: boolean;                 // Did user lose data
    estimatedDowntime?: number;        // Expected resolution time (ms)
  };
  reportingConsent: boolean;           // User consented to error reporting
}

// Error Message Template (Gen Z UX 2025)
export interface ErrorMessageTemplate {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  primary: {
    title: string;                     // Main error heading
    message: string;                   // Clear, jargon-free explanation
    icon: string;                      // Icon identifier
    color: string;                     // Color theme
  };
  secondary?: {
    details: string;                   // Technical details (progressive disclosure)
    cause: string;                     // Why it happened
    prevention: string;                // How to avoid in future
  };
  actions: {
    primary?: {
      label: string;                   // Main action button
      action: string;                  // Action identifier
      accessibilityLabel: string;     // Screen reader text
    };
    secondary?: {
      label: string;                   // Secondary action
      action: string;
      accessibilityLabel: string;
    };
    tertiary?: {
      label: string;                   // Learn more / details
      action: string;
      accessibilityLabel: string;
    };
  };
  accessibility: {
    ariaLabel: string;                 // ARIA label for error region
    focusTarget: string;               // Where to focus after error
    announceText: string;              // Screen reader announcement
  };
  analytics: {
    eventName: string;                 // Analytics tracking
    properties: Record<string, any>;   // Event properties
  };
}

// Logging Configuration (Pino-inspired, 2025 standards)
export interface LogConfig {
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  enabled: boolean;
  structured: boolean;                 // Use JSON format
  includeStack: boolean;               // Include stack traces
  maxLogSize: number;                  // Max log entry size (bytes)
  retentionDays: number;               // How long to keep logs
  compression: boolean;                // Compress old logs
  sampling: {
    debug: number;                     // Sample rate for debug logs (0-1)
    info: number;                      // Sample rate for info logs
    performance: boolean;              // Include performance metrics
  };
  privacy: {
    redactPII: boolean;               // Remove personally identifiable info
    redactURLs: boolean;              // Remove sensitive URL parameters
    allowedFields: string[];          // Fields safe to log
    blockedFields: string[];          // Fields to never log
  };
  destinations: {
    console: boolean;                 // Log to browser console
    storage: boolean;                 // Store in extension storage
    remote: boolean;                  // Send to remote service
    export: boolean;                  // Allow log export
  };
}

// Log Entry (Structured JSON format)
export interface LogEntry {
  level: string;
  timestamp: number;
  message: string;
  context: ExtensionContextType;
  sessionId: string;
  data?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    cause?: any;
  };
  performance?: {
    duration?: number;                 // Operation duration (ms)
    memory?: number;                   // Memory usage (bytes)
    startTime?: number;                // Performance.now() start
    endTime?: number;                  // Performance.now() end
  };
  metadata: {
    extensionVersion: string;
    browserVersion: string;
    platform: string;
    url?: string;
    userId?: string;
  };
}

// Network Error Handling (Manifest V3 specific)
export interface NetworkError extends TruthLensError {
  category: 'network';
  network: {
    endpoint: string;                  // API endpoint
    method: string;                    // HTTP method
    statusCode?: number;               // HTTP status code
    responseTime?: number;             // Request duration
    retryAfter?: number;               // Retry-After header value
    isOnline: boolean;                 // Navigator.onLine status
    connectionType?: string;           // Network connection type
  };
}

// Permission Error (Chrome Extension specific)
export interface PermissionError extends TruthLensError {
  category: 'permission';
  permission: {
    requested: string[];               // Permissions requested
    granted: string[];                 // Permissions granted
    denied: string[];                  // Permissions denied
    optional: boolean;                 // Was it optional permission
    userInitiated: boolean;            // User triggered the request
  };
}

// AI Processing Error (Chrome Built-in AI specific)
export interface AIError extends TruthLensError {
  category: 'ai';
  ai: {
    model: string;                     // AI model used
    prompt?: string;                   // Input prompt (redacted)
    tokensUsed?: number;               // Tokens consumed
    apiEndpoint: string;               // AI API endpoint
    availabilityStatus: string;        // AI availability status
    quotaExceeded: boolean;            // Hit usage limits
  };
}

// Recovery Result
export interface RecoveryResult {
  successful: boolean;
  strategy: RecoveryStrategy;
  duration: number;                    // Recovery time (ms)
  fallbackUsed?: string;
  userActionRequired: boolean;
  message?: string;                    // Recovery status message
  metadata?: Record<string, any>;
}

// Error Handler Configuration
export interface ErrorHandlerConfig {
  enableReporting: boolean;
  enableRecovery: boolean;
  enableOfflineMode: boolean;
  retryConfig: {
    maxRetries: number;
    baseDelay: number;                 // Base delay for exponential backoff (ms)
    maxDelay: number;                  // Maximum delay between retries (ms)
    backoffMultiplier: number;         // Exponential backoff multiplier
  };
  reportingConfig: {
    endpoint?: string;                 // Remote reporting endpoint
    apiKey?: string;                   // API key for reporting service
    batchSize: number;                 // Number of errors to batch
    batchTimeout: number;              // Max time to wait for batch (ms)
    privacy: {
      includeStackTrace: boolean;
      includeUserAgent: boolean;
      includeURL: boolean;
      anonymizeUserId: boolean;
    };
  };
  debugConfig: {
    enableConsoleOutput: boolean;
    verboseLogging: boolean;
    enableDebugPanel: boolean;
    enablePerformanceTracking: boolean;
  };
}

// Global Error Handler Events
export interface ErrorHandlerEvents {
  'error:captured': TruthLensError;
  'error:recovered': { error: TruthLensError; result: RecoveryResult };
  'error:reported': { error: TruthLensError; reportId: string };
  'offline:detected': { timestamp: number; context: ExtensionContextType };
  'offline:recovered': { timestamp: number; duration: number };
  'recovery:started': { errorId: string; strategy: RecoveryStrategy };
  'recovery:completed': { errorId: string; result: RecoveryResult };
}

// Export utility types
export type ErrorHandler = (error: TruthLensError) => Promise<RecoveryResult>;
export type ErrorReporter = (error: TruthLensError) => Promise<void>;
export type ErrorRecoverer = (error: TruthLensError) => Promise<RecoveryResult>;