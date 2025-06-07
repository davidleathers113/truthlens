/**
 * Result Types - 2025 TypeScript Discriminated Union Pattern
 * Type-safe error handling with exhaustive pattern matching
 */

// Core Result type using discriminated unions
export type Result<T, E = Error> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: E };

// Async Result for promise-based operations
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

// Loading states with discriminated unions
export type LoadingState<T, E = Error> =
  | { status: 'idle'; data?: never; error?: never }
  | { status: 'loading'; data?: never; error?: never }
  | { status: 'success'; data: T; error?: never }
  | { status: 'error'; data?: never; error: E };

// Operation result with metadata
export type OperationResult<T, E = Error> = Result<T, E> & {
  metadata: {
    duration: number;
    timestamp: number;
    operation: string;
    context: string;
  };
};

// Recovery result with discriminated outcomes
export type RecoveryOutcome =
  | { outcome: 'recovered'; method: string; duration: number }
  | { outcome: 'failed'; reason: string; retriesLeft: number }
  | { outcome: 'skipped'; reason: string };

// Network operation results
export type NetworkResult<T> =
  | { status: 'success'; data: T; statusCode: number }
  | { status: 'network_error'; error: string; retryable: boolean }
  | { status: 'timeout'; duration: number; retryable: true }
  | { status: 'rate_limited'; retryAfter: number; retryable: true }
  | { status: 'unauthorized'; error: string; retryable: false }
  | { status: 'forbidden'; error: string; retryable: false }
  | { status: 'not_found'; error: string; retryable: false }
  | { status: 'server_error'; error: string; retryable: boolean };

// AI processing results with specific error types
export type AIResult<T> =
  | { status: 'success'; data: T; model: string; tokensUsed: number }
  | { status: 'quota_exceeded'; retryAfter: number; model: string }
  | { status: 'model_unavailable'; availableModels: string[] }
  | { status: 'processing_error'; error: string; retryable: boolean }
  | { status: 'content_filtered'; reason: string; retryable: false };

// Storage operation results
export type StorageResult<T> =
  | { status: 'success'; data: T; size: number }
  | { status: 'quota_exceeded'; available: number; required: number }
  | { status: 'permission_denied'; reason: string }
  | { status: 'corruption_detected'; backupAvailable: boolean }
  | { status: 'network_sync_failed'; localData: T; syncable: boolean };

// Validation results with detailed error information
export type ValidationResult<T> =
  | { valid: true; data: T; warnings?: string[] }
  | { valid: false; errors: ValidationError[]; data?: never };

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  value?: unknown;
}

// Permission results for Chrome extension APIs
export type PermissionResult =
  | { status: 'granted'; permissions: string[] }
  | { status: 'denied'; permissions: string[]; optional: boolean }
  | { status: 'prompt_required'; permissions: string[] }
  | { status: 'api_unavailable'; reason: string };

// Utility functions for working with Result types

export const Ok = <T>(data: T): Result<T, never> => ({ success: true, data });

export const Err = <E>(error: E): Result<never, E> => ({ success: false, error });

export const isOk = <T, E>(result: Result<T, E>): result is { success: true; data: T } =>
  result.success;

export const isErr = <T, E>(result: Result<T, E>): result is { success: false; error: E } =>
  !result.success;

// Safe data extraction with defaults
export const unwrap = <T, E>(result: Result<T, E>, defaultValue: T): T =>
  isOk(result) ? result.data : defaultValue;

export const unwrapOr = <T, E>(result: Result<T, E>, fallback: (error: E) => T): T =>
  isOk(result) ? result.data : fallback(result.error);

// Transform operations
export const map = <T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => U
): Result<U, E> =>
  isOk(result) ? Ok(fn(result.data)) : result;

export const mapErr = <T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> =>
  isErr(result) ? Err(fn(result.error)) : result;

export const flatMap = <T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => Result<U, E>
): Result<U, E> =>
  isOk(result) ? fn(result.data) : result;

// Async operations
export const asyncMap = async <T, U, E>(
  result: AsyncResult<T, E>,
  fn: (data: T) => Promise<U>
): Promise<Result<U, E>> => {
  const resolvedResult = await result;
  if (isOk(resolvedResult)) {
    try {
      const data = await fn(resolvedResult.data);
      return Ok(data);
    } catch (error) {
      return Err(error as E);
    }
  }
  return resolvedResult;
};

// Combine multiple results
export const combine = <T extends readonly Result<any, any>[]>(
  results: T
): Result<{ [K in keyof T]: T[K] extends Result<infer U, any> ? U : never }, any> => {
  const data: any[] = [];

  for (const result of results) {
    if (isErr(result)) {
      return result;
    }
    data.push(result.data);
  }

  return Ok(data as any);
};

// Pattern matching helper
export const match = <T, E, R>(
  result: Result<T, E>,
  patterns: {
    success: (data: T) => R;
    error: (error: E) => R;
  }
): R =>
  isOk(result) ? patterns.success(result.data) : patterns.error(result.error);

// Loading state helpers
export const idle = <T, E>(): LoadingState<T, E> => ({ status: 'idle' });
export const loading = <T, E>(): LoadingState<T, E> => ({ status: 'loading' });
export const success = <T, E>(data: T): LoadingState<T, E> => ({ status: 'success', data });
export const error = <T, E>(error: E): LoadingState<T, E> => ({ status: 'error', error });

// Safe async wrapper
export const safeAsync = async <T>(
  operation: () => Promise<T>
): AsyncResult<T> => {
  try {
    const data = await operation();
    return Ok(data);
  } catch (error) {
    return Err(error as Error);
  }
};

// Retry with exponential backoff
export const withRetry = async <T, E>(
  operation: () => AsyncResult<T, E>,
  options: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    retryWhen: (error: E) => boolean;
  }
): AsyncResult<T, E> => {
  let lastError: E;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    const result = await operation();

    if (isOk(result)) {
      return result;
    }

    lastError = result.error;

    if (attempt === options.maxRetries || !options.retryWhen(result.error)) {
      return result;
    }

    const delay = Math.min(
      options.baseDelay * Math.pow(2, attempt),
      options.maxDelay
    );

    await new Promise(resolve => setTimeout(resolve, delay));
  }

  return Err(lastError!);
};

// Type guards for specific result types
export const isNetworkSuccess = <T>(
  result: NetworkResult<T>
): result is { status: 'success'; data: T; statusCode: number } =>
  result.status === 'success';

export const isRetryableNetworkError = <T>(
  result: NetworkResult<T>
): result is Extract<NetworkResult<T>, { retryable: true }> =>
  result.status !== 'success' && 'retryable' in result && result.retryable;

export const isAISuccess = <T>(
  result: AIResult<T>
): result is { status: 'success'; data: T; model: string; tokensUsed: number } =>
  result.status === 'success';

export const isStorageSuccess = <T>(
  result: StorageResult<T>
): result is { status: 'success'; data: T; size: number } =>
  result.status === 'success';

// Exhaustiveness checking helper
export const assertNever = (value: never): never => {
  throw new Error(`Unexpected value: ${value}`);
};

// Example usage pattern matcher for network results
export const handleNetworkResult = <T, R>(
  result: NetworkResult<T>,
  handlers: {
    success: (data: T, statusCode: number) => R;
    networkError: (error: string, retryable: boolean) => R;
    timeout: (duration: number) => R;
    rateLimited: (retryAfter: number) => R;
    unauthorized: (error: string) => R;
    forbidden: (error: string) => R;
    notFound: (error: string) => R;
    serverError: (error: string, retryable: boolean) => R;
  }
): R => {
  switch (result.status) {
    case 'success':
      return handlers.success(result.data, result.statusCode);
    case 'network_error':
      return handlers.networkError(result.error, result.retryable);
    case 'timeout':
      return handlers.timeout(result.duration);
    case 'rate_limited':
      return handlers.rateLimited(result.retryAfter);
    case 'unauthorized':
      return handlers.unauthorized(result.error);
    case 'forbidden':
      return handlers.forbidden(result.error);
    case 'not_found':
      return handlers.notFound(result.error);
    case 'server_error':
      return handlers.serverError(result.error, result.retryable);
    default:
      return assertNever(result);
  }
};
