# Fact-Checking API Integration: 2025 Best Practices Implementation

## Overview

This document details the implementation of modern 2025 best practices for external API integration in the TruthLens fact-checking system. The implementation emphasizes **API resilience**, **privacy compliance**, and **performance optimization** through proven patterns and techniques.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Circuit Breaker Pattern](#circuit-breaker-pattern)
3. [Retry Logic with Exponential Backoff](#retry-logic-with-exponential-backoff)
4. [Rate Limiting and Quota Management](#rate-limiting-and-quota-management)
5. [Advanced Caching Strategies](#advanced-caching-strategies)
6. [Privacy-Preserving Design](#privacy-preserving-design)
7. [GDPR Compliance](#gdpr-compliance)
8. [Performance Optimization](#performance-optimization)
9. [Error Handling and Monitoring](#error-handling-and-monitoring)
10. [Usage Examples](#usage-examples)
11. [Troubleshooting Guide](#troubleshooting-guide)

---

## Architecture Overview

### System Components

The fact-checking API integration consists of four main components:

```typescript
// Core Architecture
src/background/api/
├── apiClientBase.ts          // Abstract base with resilience patterns
├── googleFactCheckClient.ts  // Google Fact Check API implementation
├── enhancedFactCheckingService.ts // Service integration layer
└── consentManager.ts         // GDPR-compliant consent management
```

### Design Principles

1. **Resilience First**: Circuit breakers and retry mechanisms ensure graceful degradation
2. **Privacy by Design**: Minimal data transmission with user consent controls
3. **Performance Optimized**: Advanced caching and request deduplication
4. **Type Safety**: Full TypeScript integration with comprehensive interfaces
5. **Monitoring Ready**: Built-in metrics and observability

---

## Circuit Breaker Pattern

### Implementation

The circuit breaker prevents cascading failures by monitoring API health and temporarily blocking requests when services are unhealthy.

```typescript
interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}
```

### State Transitions

- **CLOSED**: Normal operation, requests pass through
- **OPEN**: Service unhealthy, requests fail fast
- **HALF_OPEN**: Testing recovery, single request allowed

### Configuration

```typescript
const config: ApiClientConfig = {
  circuitBreakerThreshold: 5,      // Failures to trigger OPEN
  circuitBreakerTimeout: 30000,    // Recovery attempt interval (30s)
  // ... other config
};
```

### Benefits

- **Fast Failure**: Immediate response when service is down
- **Resource Conservation**: Prevents wasted requests to failing services
- **Automatic Recovery**: Self-healing when service recovers

---

## Retry Logic with Exponential Backoff

### Implementation

Intelligent retry mechanism with exponential backoff and jitter prevents thundering herd problems.

```typescript
private async executeWithRetry<T>(request: ApiRequest): Promise<ApiResponse<T>> {
  for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
    try {
      return await this.executeHttpRequest<T>(request);
    } catch (error) {
      if (!error.retryable || attempt === this.config.maxRetries) {
        throw error;
      }

      // Exponential backoff with jitter
      const delay = this.config.retryDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 0.1 * delay;

      await this.sleep(delay + jitter);
    }
  }
}
```

### Key Features

- **Exponential Backoff**: `delay = baseDelay * 2^attempt`
- **Jitter**: Random component prevents synchronized retries
- **Selective Retry**: Only retryable errors trigger retry attempts
- **Configurable Limits**: Maximum retry attempts and base delay

---

## Rate Limiting and Quota Management

### Dual-Tier Rate Limiting

```typescript
interface RateLimitState {
  minuteRequests: number[];  // Sliding window for per-minute tracking
  hourRequests: number[];    // Sliding window for per-hour tracking
  lastReset: number;
}
```

### Implementation

```typescript
private checkRateLimit(): void {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  const oneHourAgo = now - 3600000;

  // Clean expired entries
  this.rateLimitState.minuteRequests =
    this.rateLimitState.minuteRequests.filter(time => time > oneMinuteAgo);
  this.rateLimitState.hourRequests =
    this.rateLimitState.hourRequests.filter(time => time > oneHourAgo);

  // Check limits
  if (this.rateLimitState.minuteRequests.length >= this.config.rateLimiting.requestsPerMinute) {
    throw new RateLimitExceededError();
  }
}
```

### Quota Tracking

- **Real-time Monitoring**: Track usage against API quotas
- **Proactive Throttling**: Slow down before hitting limits
- **Usage Statistics**: Monitor consumption patterns

---

## Advanced Caching Strategies

### Multi-Layer Caching

```typescript
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}
```

### Cache Implementation

```typescript
private getFromCache<T>(key: string): CacheEntry<T> | null {
  const entry = this.cache.get(key);
  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > entry.ttl) {
    this.cache.delete(key);
    return null;
  }

  return entry as CacheEntry<T>;
}
```

### Features

- **TTL Management**: Time-based expiration with automatic cleanup
- **Request Deduplication**: Prevent duplicate simultaneous requests
- **Storage Integration**: Chrome storage for persistence across sessions
- **Cache Statistics**: Hit rates and performance metrics

---

## Privacy-Preserving Design

### Data Minimization

The system implements strict data minimization principles:

```typescript
// Privacy-preserving query (domain only)
const query: FactCheckQuery = {
  query: domain,  // Only domain name, never full URL
  languageCode: this.config.languageCode,
  pageSize: 20
};
```

### Privacy Transformations

```typescript
private extractDomainOnly(data: any): any {
  const result = { ...data };

  // Extract domain from URL fields
  if (result.url && typeof result.url === 'string') {
    try {
      const url = new URL(result.url);
      result.url = url.hostname;  // Domain only
    } catch {
      // Keep original if parsing fails
    }
  }

  // Remove sensitive data
  delete result.content;     // No content transmission
  delete result.userId;      // No user identification
  delete result.sessionId;   // No session tracking

  return result;
}
```

### Privacy Features

- **Domain-Only Queries**: Never transmit full URLs or page content
- **User Identification Removal**: Strip all personally identifiable information
- **Minimal Data Transmission**: Only essential data for fact-checking
- **Transparent Data Usage**: Clear disclosure of what data is shared

---

## GDPR Compliance

### Consent Management

```typescript
export interface ConsentData {
  externalApiEnabled: boolean;
  consentTimestamp: number;
  consentVersion: string;
  dataRetentionDays: number;
  allowDomainSharing: boolean;
  allowCaching: boolean;
}
```

### User Rights Implementation

```typescript
// Right to Data Export
public static async exportUserData(): Promise<{
  consent: ConsentData | null;
  cachedData: any[];
  exportTimestamp: number;
}> {
  // Implementation provides complete data export
}

// Right to Data Deletion
public static async deleteAllUserData(): Promise<void> {
  // Complete data removal including consent and cache
}

// Right to Consent Withdrawal
public static async revokeConsent(): Promise<void> {
  // Immediate consent withdrawal with data cleanup
}
```

### Compliance Features

- **Explicit Consent**: Clear opt-in process for API usage
- **Data Retention Controls**: User-configurable retention periods
- **Automatic Cleanup**: Scheduled data removal based on retention settings
- **User Rights**: Export, deletion, and consent withdrawal capabilities
- **Audit Trail**: Comprehensive logging for compliance verification

---

## Performance Optimization

### Batch Processing

```typescript
public async batchSearchDomains(domains: string[]): Promise<Map<string, FactCheckSummary>> {
  const batchSize = 5;
  for (let i = 0; i < domains.length; i += batchSize) {
    const batch = domains.slice(i, i + batchSize);

    const batchPromises = batch.map(async domain => {
      try {
        return await this.searchByDomain(domain);
      } catch (error) {
        return this.createFallbackSummary(domain);
      }
    });

    const batchResults = await Promise.allSettled(batchPromises);

    // Respect rate limits between batches
    if (i + batchSize < domains.length) {
      await this.sleep(1000);
    }
  }
}
```

### Performance Monitoring

```typescript
interface PerformanceMetrics {
  localAnalysisMs: number;
  externalApiMs?: number;
  cacheHit: boolean;
  requestSize: number;
  responseSize: number;
}
```

### Optimization Techniques

- **Request Batching**: Combine multiple queries where possible
- **Intelligent Prefetching**: Cache frequently accessed domains
- **Response Compression**: Minimize data transfer
- **Connection Pooling**: Reuse HTTP connections efficiently

---

## Error Handling and Monitoring

### Error Classification

```typescript
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
```

### Error Types

- **CircuitBreakerOpenError**: Service temporarily unavailable
- **RateLimitExceededError**: API quota exceeded
- **TimeoutError**: Request timeout exceeded
- **NetworkError**: Connectivity issues

### Monitoring Integration

```typescript
public getUsageStats(): {
  requestsToday: number;
  quotaRemaining: number;
  circuitBreakerStatus: string;
  cacheHitRate: number;
} {
  // Real-time statistics for monitoring
}
```

---

## Usage Examples

### Basic Implementation

```typescript
// Initialize the enhanced fact-checking service
import { EnhancedFactCheckingService } from '@background/api/enhancedFactCheckingService';

// Configure with API key
EnhancedFactCheckingService.initialize({
  googleApiKey: 'your-api-key',
  enableExternalApis: true,
  requireConsent: true
});

// Check content credibility
const content: ContentAnalysis = {
  url: 'https://example.com/article',
  title: 'News Article Title',
  content: 'Article content...'
};

const result = await EnhancedFactCheckingService.checkCredibility(content);
```

### Consent Management

```typescript
import { ConsentManager, DEFAULT_CONSENT_REQUEST } from '@background/api/consentManager';

// Request user consent
const consentResponse = await ConsentManager.requestConsent(DEFAULT_CONSENT_REQUEST);

if (consentResponse.granted) {
  // Proceed with external API usage
  console.log('User granted consent for external fact-checking APIs');
} else {
  // Use local analysis only
  console.log('External APIs disabled - using local analysis only');
}
```

### Monitoring and Statistics

```typescript
// Get service status
const status = EnhancedFactCheckingService.getServiceStatus();
console.log('External APIs enabled:', status.externalApisEnabled);
console.log('Google API status:', status.googleApiStatus);

// Get usage statistics
const stats = EnhancedFactCheckingService.getApiUsageStats();
console.log('Requests today:', stats.googleApi.requestsToday);
console.log('Circuit breaker status:', stats.googleApi.circuitBreakerStatus);
```

---

## Troubleshooting Guide

### Common Issues

#### Circuit Breaker Stuck Open

**Symptoms**: All API requests fail immediately
**Cause**: Multiple consecutive API failures
**Solution**:
```typescript
// Reset circuit breaker manually
const client = new GoogleFactCheckClient(config);
client.resetCircuitBreaker();
```

#### Rate Limit Exceeded

**Symptoms**: 429 errors from API
**Cause**: Too many requests in time window
**Solution**: Implement request queuing or reduce request frequency

#### Cache Issues

**Symptoms**: Stale data or excessive memory usage
**Solution**:
```typescript
// Clear cache manually
EnhancedFactCheckingService.clearExternalCache();
```

#### Consent Not Working

**Symptoms**: External APIs not called despite consent
**Cause**: Consent validation failure
**Solution**: Check consent version and expiration

### Performance Tuning

1. **Optimize Cache TTL**: Balance freshness vs. performance
2. **Adjust Batch Sizes**: Tune for your API rate limits
3. **Configure Timeouts**: Balance responsiveness vs. reliability
4. **Monitor Usage Patterns**: Adjust based on actual traffic

### Debugging

```typescript
// Enable debug logging
console.debug('API request details:', {
  cacheHit: result.performance.cacheHit,
  localAnalysisMs: result.performance.localAnalysisMs,
  externalApiMs: result.performance.externalApiMs
});
```

---

## Best Practices Summary

### Development Guidelines

1. **Always Check Consent**: Verify user consent before external API calls
2. **Handle Errors Gracefully**: Implement comprehensive fallback mechanisms
3. **Monitor Performance**: Track metrics and optimize based on data
4. **Respect Privacy**: Minimize data transmission and implement privacy controls
5. **Test Resilience**: Simulate failures to verify circuit breaker behavior

### Maintenance

1. **Regular Updates**: Keep API client libraries and configurations current
2. **Monitor Quotas**: Track API usage and adjust limits proactively
3. **Review Consent**: Periodically audit consent management and compliance
4. **Performance Analysis**: Regular reviews of cache hit rates and response times
5. **Security Audits**: Regular reviews of data handling and privacy measures

---

## Conclusion

This implementation demonstrates cutting-edge 2025 best practices for external API integration, emphasizing resilience, privacy, and performance. The architecture provides a robust foundation for fact-checking services while maintaining user privacy and regulatory compliance.

The patterns documented here can be extended to other external service integrations within the TruthLens system, providing a consistent approach to API communication across the entire application.

For questions or contributions to this documentation, please refer to the project's contribution guidelines and maintainer contacts.

---

**Document Version**: 1.0
**Last Updated**: 2025-01-06
**Maintainers**: TruthLens Development Team
**Review Cycle**: Quarterly
