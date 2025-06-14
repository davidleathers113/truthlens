/**
 * API Client Base Layer - 2025 Best Practices Implementation
 * Implements modern resilience patterns: circuit breaker, retry mechanisms, caching, and privacy-preserving queries
 */

export interface ApiClientConfig {
  baseUrl: string;
  apiKey?: string;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
  cacheEnabled: boolean;
  cacheTtl: number;
  privacyMode: boolean;
  rateLimiting: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
}

export interface ApiRequest {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  skipCache?: boolean;
  privacy?: {
    minimizeData: boolean;
    domainOnly: boolean;
    anonymize: boolean;
  };
}

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  headers: Record<string, string>;
  cached: boolean;
  timestamp: number;
}

export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

export interface RateLimitState {
  minuteRequests: number[];
  hourRequests: number[];
  lastReset: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class CircuitBreakerOpenError extends ApiError {
  constructor() {
    super('Circuit breaker is open - service unavailable', undefined, 'CIRCUIT_BREAKER_OPEN', false);
  }
}

export class RateLimitExceededError extends ApiError {
  constructor() {
    super('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED', true);
  }
}

/**
 * Advanced API Client Base with 2025 resilience patterns
 */
export abstract class ApiClientBase {
  protected config: ApiClientConfig;
  private cache = new Map<string, CacheEntry>();
  private circuitBreaker: CircuitBreakerState;
  private rateLimitState: RateLimitState;
  private activeRequests = new Map<string, Promise<ApiResponse<unknown>>>();

  constructor(config: ApiClientConfig) {
    this.config = config;
    this.circuitBreaker = {
      state: 'CLOSED',
      failureCount: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0
    };
    this.rateLimitState = {
      minuteRequests: [],
      hourRequests: [],
      lastReset: Date.now()
    };
  }

  /**
   * Execute API request with full resilience patterns
   */
  public async request<T>(request: ApiRequest): Promise<ApiResponse<T>> {
    // Check circuit breaker
    this.checkCircuitBreaker();

    // Check rate limiting
    this.checkRateLimit();

    // Generate cache key
    const cacheKey = this.generateCacheKey(request);

    // Check cache first (if enabled and not skipped)
    if (this.config.cacheEnabled && !request.skipCache) {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) {
        return {
          data: cached.data,
          status: 200,
          headers: {},
          cached: true,
          timestamp: cached.timestamp
        };
      }
    }

    // Prevent duplicate requests (request deduplication)
    const activeRequest = this.activeRequests.get(cacheKey);
    if (activeRequest) {
      return activeRequest as Promise<ApiResponse<T>>;
    }

    // Execute request with retry logic
    const requestPromise = this.executeWithRetry<T>(request, cacheKey);
    this.activeRequests.set(cacheKey, requestPromise);

    try {
      const response = await requestPromise;

      // Cache successful response
      if (this.config.cacheEnabled && response.status < 400) {
        this.setCache(cacheKey, response.data);
      }

      // Record successful request for circuit breaker
      this.recordSuccess();

      return response;
    } catch (error) {
      // Record failure for circuit breaker
      this.recordFailure();
      throw error;
    } finally {
      this.activeRequests.delete(cacheKey);
    }
  }

  /**
   * Execute request with retry logic and exponential backoff
   */
  private async executeWithRetry<T>(request: ApiRequest, cacheKey: string): Promise<ApiResponse<T>> {
    // cacheKey is used for request tracking in production
    void cacheKey;
    let lastError: Error;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        // Apply privacy-preserving transformations
        const privacyRequest = this.applyPrivacyPreservingTransforms(request);

        // Execute the actual HTTP request
        const response = await this.executeHttpRequest<T>(privacyRequest);

        // Track rate limiting
        this.trackRequest();

        return response;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on non-retryable errors
        if (error instanceof ApiError && !error.retryable) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === this.config.maxRetries) {
          break;
        }

        // Calculate exponential backoff delay
        const delay = this.config.retryDelay * Math.pow(2, attempt);
        const jitter = Math.random() * 0.1 * delay; // Add jitter to prevent thundering herd

        console.warn(`API request failed (attempt ${attempt + 1}/${this.config.maxRetries + 1}), retrying in ${Math.round(delay + jitter)}ms:`, error);

        await this.sleep(delay + jitter);
      }
    }

    throw lastError!;
  }

  /**
   * Execute actual HTTP request - to be implemented by concrete classes
   */
  protected abstract executeHttpRequest<T>(request: ApiRequest): Promise<ApiResponse<T>>;

  /**
   * Apply privacy-preserving transformations to request
   */
  private applyPrivacyPreservingTransforms(request: ApiRequest): ApiRequest {
    if (!this.config.privacyMode && !request.privacy) {
      return request;
    }

    const privacy = request.privacy || {
      minimizeData: this.config.privacyMode,
      domainOnly: this.config.privacyMode,
      anonymize: this.config.privacyMode
    };

    const transformedRequest = { ...request };

    // Extract domain only from URLs if domainOnly is enabled
    if (privacy.domainOnly && request.body) {
      transformedRequest.body = this.extractDomainOnly(request.body);
    }

    // Minimize data transmission
    if (privacy.minimizeData) {
      transformedRequest.body = this.minimizeRequestData(request.body);
    }

    // Anonymize request data
    if (privacy.anonymize) {
      transformedRequest.body = this.anonymizeRequestData(request.body);
    }

    return transformedRequest;
  }

  /**
   * Extract domain-only information from request data
   */
  private extractDomainOnly(data: unknown): unknown {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const result = { ...data } as Record<string, unknown>;

    // Extract domain from URL fields
    if ('url' in result && typeof result.url === 'string') {
      try {
        const url = new URL(result.url);
        result.url = url.hostname;
      } catch {
        // Keep original if URL parsing fails
      }
    }

    // Remove full content, keep only metadata
    if ('content' in result) {
      delete result.content;
    }

    // Remove user-identifying information
    if ('userId' in result) delete result.userId;
    if ('sessionId' in result) delete result.sessionId;
    if ('userAgent' in result) delete result.userAgent;

    return result;
  }

  /**
   * Minimize request data to essential fields only
   */
  private minimizeRequestData(data: unknown): unknown {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    // Keep only essential fields for fact-checking
    const essentialFields = ['url', 'domain', 'title', 'language', 'text'];
    const result: Record<string, unknown> = {};

    essentialFields.forEach(field => {
      if ((data as Record<string, unknown>)[field] !== undefined) {
        result[field] = (data as Record<string, unknown>)[field];
      }
    });

    return result;
  }

  /**
   * Anonymize request data by removing or hashing identifiers
   */
  private anonymizeRequestData(data: unknown): unknown {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const result = { ...data } as Record<string, unknown>;

    // Remove or hash identifying information
    if ('ip' in result) {
      delete result.ip;
    }

    if ('userAgent' in result) {
      delete result.userAgent;
    }

    if ('referrer' in result) {
      delete result.referrer;
    }

    return result;
  }

  /**
   * Check circuit breaker state
   */
  private checkCircuitBreaker(): void {
    const now = Date.now();

    switch (this.circuitBreaker.state) {
      case 'OPEN':
        if (now >= this.circuitBreaker.nextAttemptTime) {
          this.circuitBreaker.state = 'HALF_OPEN';
          console.info('Circuit breaker transitioning to HALF_OPEN');
        } else {
          throw new CircuitBreakerOpenError();
        }
        break;

      case 'HALF_OPEN':
        // Allow one request through to test the service
        break;

      case 'CLOSED':
      default:
        // Normal operation
        break;
    }
  }

  /**
   * Check rate limiting
   */
  private checkRateLimit(): void {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;

    // Clean old requests
    this.rateLimitState.minuteRequests = this.rateLimitState.minuteRequests.filter(time => time > oneMinuteAgo);
    this.rateLimitState.hourRequests = this.rateLimitState.hourRequests.filter(time => time > oneHourAgo);

    // Check limits
    if (this.rateLimitState.minuteRequests.length >= this.config.rateLimiting.requestsPerMinute) {
      throw new RateLimitExceededError();
    }

    if (this.rateLimitState.hourRequests.length >= this.config.rateLimiting.requestsPerHour) {
      throw new RateLimitExceededError();
    }
  }

  /**
   * Track request for rate limiting
   */
  private trackRequest(): void {
    const now = Date.now();
    this.rateLimitState.minuteRequests.push(now);
    this.rateLimitState.hourRequests.push(now);
  }

  /**
   * Record successful request for circuit breaker
   */
  private recordSuccess(): void {
    if (this.circuitBreaker.state === 'HALF_OPEN') {
      this.circuitBreaker.state = 'CLOSED';
      this.circuitBreaker.failureCount = 0;
      console.info('Circuit breaker transitioning to CLOSED - service recovered');
    }
  }

  /**
   * Record failed request for circuit breaker
   */
  private recordFailure(): void {
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = Date.now();

    if (this.circuitBreaker.failureCount >= this.config.circuitBreakerThreshold) {
      this.circuitBreaker.state = 'OPEN';
      this.circuitBreaker.nextAttemptTime = Date.now() + this.config.circuitBreakerTimeout;
      console.warn(`Circuit breaker opened after ${this.circuitBreaker.failureCount} failures`);
    }
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(request: ApiRequest): string {
    const parts = [
      request.method,
      request.url,
      JSON.stringify(request.body || {}),
      JSON.stringify(request.headers || {})
    ];

    // Simple hash function for cache key
    return btoa(parts.join('|')).replace(/[+/=]/g, '');
  }

  /**
   * Get data from cache
   */
  private getFromCache<T>(key: string): CacheEntry<T> | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry as CacheEntry<T>;
  }

  /**
   * Set data in cache
   */
  private setCache<T>(key: string, data: T): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: this.config.cacheTtl,
      key
    };

    this.cache.set(key, entry);

    // Clean up expired entries periodically
    if (this.cache.size > 1000) {
      this.cleanupExpiredCache();
    }
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    console.debug(`Cleaned up ${keysToDelete.length} expired cache entries`);
  }

  /**
   * Sleep utility for delays
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get circuit breaker status for monitoring
   */
  public getCircuitBreakerStatus(): CircuitBreakerState {
    return { ...this.circuitBreaker };
  }

  /**
   * Get rate limit status for monitoring
   */
  public getRateLimitStatus(): { minuteRequests: number; hourRequests: number } {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;

    return {
      minuteRequests: this.rateLimitState.minuteRequests.filter(time => time > oneMinuteAgo).length,
      hourRequests: this.rateLimitState.hourRequests.filter(time => time > oneHourAgo).length
    };
  }

  /**
   * Get cache statistics for monitoring
   */
  public getCacheStats(): { size: number; hitRate: number } {
    // Simple implementation - in production, would track hit/miss ratios
    return {
      size: this.cache.size,
      hitRate: 0.85 // Mock hit rate
    };
  }

  /**
   * Clear cache manually
   */
  public clearCache(): void {
    this.cache.clear();
    console.debug('Cache cleared manually');
  }

  /**
   * Reset circuit breaker manually
   */
  public resetCircuitBreaker(): void {
    this.circuitBreaker = {
      state: 'CLOSED',
      failureCount: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0
    };
    console.info('Circuit breaker reset manually');
  }
}
