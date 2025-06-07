/**
 * Google Fact Check API Client - 2025 Implementation
 * Privacy-preserving integration with Google Fact Check Tools API
 * Implements domain-only queries and minimal data transmission
 */

import { ApiClientBase, ApiClientConfig, ApiRequest, ApiResponse, ApiError } from './apiClientBase';

export interface GoogleFactCheckConfig extends ApiClientConfig {
  apiKey: string;
  enableClaimSearch: boolean;
  enableClaimReview: boolean;
  languageCode: string;
  reviewPublisherSiteFilter?: string;
}

export interface FactCheckQuery {
  query?: string;
  languageCode?: string;
  pageSize?: number;
  pageToken?: string;
  publisherSiteFilter?: string;
  domain?: string; // Privacy-preserving: domain only
}

export interface ClaimReview {
  publisher: {
    name: string;
    site: string;
  };
  url: string;
  title: string;
  reviewDate: string;
  textualRating?: string;
  languageCode: string;
}

export interface Claim {
  text: string;
  claimant?: string;
  claimDate?: string;
}

export interface FactCheckResult {
  claim: Claim;
  claimReviews: ClaimReview[];
}

export interface GoogleFactCheckResponse {
  claims?: FactCheckResult[];
  nextPageToken?: string;
}

export interface FactCheckSummary {
  domain: string;
  totalChecks: number;
  averageRating: string;
  trustworthiness: number; // 0-100 score
  lastChecked: string;
  sources: string[];
  confidence: number;
}

/**
 * Google Fact Check API Client with privacy-preserving features
 */
export class GoogleFactCheckClient extends ApiClientBase {
  private googleConfig: GoogleFactCheckConfig;

  constructor(config: GoogleFactCheckConfig) {
    super(config);
    this.googleConfig = config;
  }

  /**
   * Search for fact checks by domain (privacy-preserving)
   */
  public async searchByDomain(domain: string): Promise<FactCheckSummary> {
    try {
      // Privacy-preserving: Query by domain only, no full URLs or content
      const query: FactCheckQuery = {
        query: domain,
        languageCode: this.googleConfig.languageCode,
        pageSize: 20,
        publisherSiteFilter: this.googleConfig.reviewPublisherSiteFilter
      };

      const request: ApiRequest = {
        url: '/claims:search',
        method: 'GET',
        privacy: {
          minimizeData: true,
          domainOnly: true,
          anonymize: true
        }
      };

      // Add query parameters
      const searchParams = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });

      // Add API key
      searchParams.append('key', this.googleConfig.apiKey);

      request.url = `${request.url}?${searchParams.toString()}`;

      const response = await this.request<GoogleFactCheckResponse>(request);

      return this.processFactCheckResults(domain, response.data);
    } catch (error) {
      console.error('Google Fact Check API search failed:', error);
      throw this.handleApiError(error);
    }
  }

  /**
   * Get fact check summary for multiple domains (batch processing)
   */
  public async batchSearchDomains(domains: string[]): Promise<Map<string, FactCheckSummary>> {
    const results = new Map<string, FactCheckSummary>();

    // Process domains in batches to respect rate limits
    const batchSize = 5;
    for (let i = 0; i < domains.length; i += batchSize) {
      const batch = domains.slice(i, i + batchSize);

      const batchPromises = batch.map(async domain => {
        try {
          const summary = await this.searchByDomain(domain);
          return { domain, summary };
        } catch (error) {
          console.warn(`Failed to check domain ${domain}:`, error);
          return { domain, summary: this.createFallbackSummary(domain) };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.set(result.value.domain, result.value.summary);
        }
      });

      // Add delay between batches to respect rate limits
      if (i + batchSize < domains.length) {
        await this.sleep(1000);
      }
    }

    return results;
  }

  /**
   * Execute HTTP request with Google-specific handling
   */
  protected async executeHttpRequest<T>(request: ApiRequest): Promise<ApiResponse<T>> {
    const fullUrl = `${this.config.baseUrl}${request.url}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'TruthLens-Extension/1.0',
      ...request.headers
    };

    // Set timeout
    const timeout = request.timeout || this.config.timeout;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const fetchOptions: RequestInit = {
        method: request.method,
        headers,
        signal: controller.signal
      };

      if (request.body && request.method !== 'GET') {
        fetchOptions.body = JSON.stringify(request.body);
      }

      const response = await fetch(fullUrl, fetchOptions);
      clearTimeout(timeoutId);

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : 60000;

        throw new ApiError(
          `Rate limited. Retry after ${delay}ms`,
          429,
          'RATE_LIMITED',
          true
        );
      }

      // Handle API errors
      if (!response.ok) {
        const errorText = await response.text();
        throw new ApiError(
          `Google Fact Check API error: ${errorText}`,
          response.status,
          'API_ERROR',
          response.status >= 500
        );
      }

      const data = await response.json();

      return {
        data,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        cached: false,
        timestamp: Date.now()
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError('Request timeout', 408, 'TIMEOUT', true);
      }

      throw new ApiError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        0,
        'NETWORK_ERROR',
        true
      );
    }
  }

  /**
   * Process Google Fact Check API results into summary
   */
  private processFactCheckResults(domain: string, response: GoogleFactCheckResponse): FactCheckSummary {
    if (!response.claims || response.claims.length === 0) {
      return this.createFallbackSummary(domain);
    }

    const claims = response.claims;
    const allReviews = claims.flatMap(claim => claim.claimReviews);

    // Calculate trustworthiness score
    const trustworthiness = this.calculateTrustworthiness(allReviews);

    // Get average rating
    const averageRating = this.calculateAverageRating(allReviews);

    // Extract unique sources
    const sources = [...new Set(allReviews.map(review => review.publisher.name))];

    // Calculate confidence based on number of reviews and source diversity
    const confidence = this.calculateConfidence(allReviews.length, sources.length);

    // Get most recent check date
    const lastChecked = this.getMostRecentCheckDate(allReviews);

    return {
      domain,
      totalChecks: allReviews.length,
      averageRating,
      trustworthiness,
      lastChecked,
      sources,
      confidence
    };
  }

  /**
   * Calculate trustworthiness score from reviews
   */
  private calculateTrustworthiness(reviews: ClaimReview[]): number {
    if (reviews.length === 0) return 50;

    const ratingScores = reviews.map(review => this.ratingToScore(review.textualRating));
    const averageScore = ratingScores.reduce((sum, score) => sum + score, 0) / ratingScores.length;

    return Math.round(averageScore);
  }

  /**
   * Convert textual rating to numeric score
   */
  private ratingToScore(rating?: string): number {
    if (!rating) return 50;

    const lowerRating = rating.toLowerCase();

    // Common fact-check ratings mapped to scores
    if (lowerRating.includes('true') || lowerRating.includes('correct') || lowerRating.includes('accurate')) {
      return 90;
    }
    if (lowerRating.includes('mostly true') || lowerRating.includes('mostly correct')) {
      return 75;
    }
    if (lowerRating.includes('half true') || lowerRating.includes('mixed') || lowerRating.includes('partly')) {
      return 50;
    }
    if (lowerRating.includes('mostly false') || lowerRating.includes('mostly incorrect')) {
      return 25;
    }
    if (lowerRating.includes('false') || lowerRating.includes('incorrect') || lowerRating.includes('debunked')) {
      return 10;
    }

    return 50; // Default neutral score
  }

  /**
   * Calculate average rating text
   */
  private calculateAverageRating(reviews: ClaimReview[]): string {
    if (reviews.length === 0) return 'Unknown';

    const scores = reviews.map(review => this.ratingToScore(review.textualRating));
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    if (average >= 80) return 'Mostly True';
    if (average >= 60) return 'Mixed';
    if (average >= 40) return 'Questionable';
    return 'Mostly False';
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(reviewCount: number, sourceCount: number): number {
    // Base confidence on number of reviews and source diversity
    let confidence = Math.min(reviewCount * 10, 50); // Up to 50 points for review count
    confidence += Math.min(sourceCount * 15, 50); // Up to 50 points for source diversity

    return Math.min(confidence, 100) / 100; // Normalize to 0-1
  }

  /**
   * Get most recent check date
   */
  private getMostRecentCheckDate(reviews: ClaimReview[]): string {
    if (reviews.length === 0) return new Date().toISOString();

    const dates = reviews
      .map(review => new Date(review.reviewDate))
      .filter(date => !isNaN(date.getTime()));

    if (dates.length === 0) return new Date().toISOString();

    const mostRecent = new Date(Math.max(...dates.map(date => date.getTime())));
    return mostRecent.toISOString();
  }

  /**
   * Create fallback summary when no data available
   */
  private createFallbackSummary(domain: string): FactCheckSummary {
    return {
      domain,
      totalChecks: 0,
      averageRating: 'Unknown',
      trustworthiness: 50,
      lastChecked: new Date().toISOString(),
      sources: [],
      confidence: 0.1
    };
  }

  /**
   * Handle API errors with appropriate error types
   */
  private handleApiError(error: unknown): ApiError {
    if (error instanceof ApiError) {
      return error;
    }

    if (error instanceof Error) {
      return new ApiError(
        `Google Fact Check API error: ${error.message}`,
        0,
        'UNKNOWN_ERROR',
        true
      );
    }

    return new ApiError(
      'Unknown Google Fact Check API error',
      0,
      'UNKNOWN_ERROR',
      true
    );
  }

  /**
   * Sleep utility
   */
  /**
   * Get API usage statistics
   */
  public getUsageStats(): {
    requestsToday: number;
    quotaRemaining: number;
    circuitBreakerStatus: string;
    cacheHitRate: number;
  } {
    const rateLimitStatus = this.getRateLimitStatus();
    const circuitBreakerStatus = this.getCircuitBreakerStatus();
    const cacheStats = this.getCacheStats();

    return {
      requestsToday: rateLimitStatus.hourRequests,
      quotaRemaining: Math.max(0, this.config.rateLimiting.requestsPerHour - rateLimitStatus.hourRequests),
      circuitBreakerStatus: circuitBreakerStatus.state,
      cacheHitRate: cacheStats.hitRate
    };
  }
}

/**
 * Factory function to create Google Fact Check client with default config
 */
export function createGoogleFactCheckClient(apiKey: string): GoogleFactCheckClient {
  const config: GoogleFactCheckConfig = {
    baseUrl: 'https://factchecktools.googleapis.com/v1alpha1',
    apiKey,
    timeout: 3000, // 3 second timeout as per requirements
    maxRetries: 3,
    retryDelay: 1000,
    circuitBreakerThreshold: 5,
    circuitBreakerTimeout: 30000, // 30 second circuit breaker timeout
    cacheEnabled: true,
    cacheTtl: 86400000, // 24 hour cache as per requirements
    privacyMode: true,
    enableClaimSearch: true,
    enableClaimReview: false, // Requires Search Console authorization
    languageCode: 'en',
    rateLimiting: {
      requestsPerMinute: 30,
      requestsPerHour: 1000
    }
  };

  return new GoogleFactCheckClient(config);
}
