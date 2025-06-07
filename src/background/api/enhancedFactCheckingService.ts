/**
 * Enhanced Fact-Checking Service - 2025 Implementation
 * Integrates external APIs with privacy-preserving design and user consent management
 * Incorporates external fact-check results into credibility scoring (20% weight)
 */

import { ContentAnalysis, CredibilityScore } from '@shared/types';
import { GoogleFactCheckClient, createGoogleFactCheckClient, FactCheckSummary } from './googleFactCheckClient';

export interface ConsentSettings {
  externalApiEnabled: boolean;
  consentTimestamp: number;
  consentVersion: string;
  dataRetentionDays: number;
  allowDomainSharing: boolean;
  allowCaching: boolean;
}

export interface FactCheckConfig {
  googleApiKey?: string;
  enableExternalApis: boolean;
  fallbackToLocalOnly: boolean;
  externalApiWeight: number; // Weight for external API results (default 20%)
  cacheEnabled: boolean;
  cacheDuration: number;
  requireConsent: boolean;
}

export interface EnhancedCredibilityResult {
  score: CredibilityScore;
  externalApiResults?: {
    google?: FactCheckSummary;
    sources: string[];
    confidence: number;
    lastChecked: string;
  };
  consent: {
    required: boolean;
    granted: boolean;
    canUseExternalApis: boolean;
  };
  performance: {
    localAnalysisMs: number;
    externalApiMs?: number;
    cacheHit: boolean;
  };
}

/**
 * Enhanced fact-checking service with external API integration
 */
export class EnhancedFactCheckingService {
  private static readonly CACHE_DURATION = 86400000; // 24 hours
  private static readonly CONSENT_VERSION = '1.0';
  private static readonly EXTERNAL_API_WEIGHT = 0.2; // 20% weight as per requirements

  private static googleClient?: GoogleFactCheckClient;
  private static config: FactCheckConfig = {
    enableExternalApis: false,
    fallbackToLocalOnly: true,
    externalApiWeight: 0.2,
    cacheEnabled: true,
    cacheDuration: 86400000,
    requireConsent: true
  };

  /**
   * Initialize the enhanced fact-checking service
   */
  public static initialize(config: Partial<FactCheckConfig>): void {
    this.config = { ...this.config, ...config };

    // Initialize Google Fact Check client if API key provided
    if (config.googleApiKey && config.enableExternalApis) {
      this.googleClient = createGoogleFactCheckClient(config.googleApiKey);
      console.info('Enhanced fact-checking service initialized with external APIs');
    } else {
      console.info('Enhanced fact-checking service initialized in local-only mode');
    }
  }

  /**
   * Enhanced credibility check with external API integration
   */
  public static async checkCredibility(content: ContentAnalysis): Promise<EnhancedCredibilityResult> {
    const startTime = Date.now();

    try {
      // Check user consent
      const consent = await this.checkUserConsent();

      // Perform local analysis (always)
      const localStartTime = Date.now();
      const localScore = await this.performLocalAnalysis(content);
      const localAnalysisMs = Date.now() - localStartTime;

      // Check cache first for external results
      let externalApiResults: any = undefined;
      let externalApiMs: number | undefined = undefined;
      let cacheHit = false;

      if (consent.canUseExternalApis && this.config.enableExternalApis) {
        const cacheKey = this.generateCacheKey(content.url);
        const cached = await this.getCachedExternalResult(cacheKey);

        if (cached) {
          externalApiResults = cached;
          cacheHit = true;
        } else {
          // Perform external API check
          const externalStartTime = Date.now();
          externalApiResults = await this.performExternalApiCheck(content);
          externalApiMs = Date.now() - externalStartTime;

          // Cache the external results
          if (externalApiResults && this.config.cacheEnabled) {
            await this.cacheExternalResult(cacheKey, externalApiResults);
          }
        }
      }

      // Combine local and external results
      const finalScore = this.combineResults(localScore, externalApiResults);

      return {
        score: finalScore,
        externalApiResults,
        consent,
        performance: {
          localAnalysisMs,
          externalApiMs,
          cacheHit
        }
      };

    } catch (error) {
      console.error('Enhanced credibility check failed:', error);

      // Fallback to local analysis only
      const fallbackScore = await this.performLocalAnalysis(content);

      return {
        score: fallbackScore,
        consent: {
          required: this.config.requireConsent,
          granted: false,
          canUseExternalApis: false
        },
        performance: {
          localAnalysisMs: Date.now() - startTime,
          cacheHit: false
        }
      };
    }
  }

  /**
   * Check user consent for external API usage
   */
  private static async checkUserConsent(): Promise<ConsentSettings & { canUseExternalApis: boolean }> {
    try {
      const consentKey = 'factcheck_consent';
      const result = await chrome.storage.local.get([consentKey]);
      const stored = result[consentKey] as ConsentSettings | undefined;

      // Default consent settings
      const defaultConsent: ConsentSettings = {
        externalApiEnabled: false,
        consentTimestamp: 0,
        consentVersion: '',
        dataRetentionDays: 7,
        allowDomainSharing: false,
        allowCaching: true
      };

      const consent = stored || defaultConsent;

      // Check if consent is valid and up-to-date
      const isConsentValid = consent.externalApiEnabled &&
                           consent.consentVersion === this.CONSENT_VERSION &&
                           Date.now() - consent.consentTimestamp < (consent.dataRetentionDays * 24 * 60 * 60 * 1000);

      const canUseExternalApis = !this.config.requireConsent ||
                               (this.config.requireConsent && isConsentValid);

      return {
        ...consent,
        canUseExternalApis
      };
    } catch (error) {
      console.error('Error checking user consent:', error);
      return {
        externalApiEnabled: false,
        consentTimestamp: 0,
        consentVersion: '',
        dataRetentionDays: 7,
        allowDomainSharing: false,
        allowCaching: true,
        canUseExternalApis: false
      };
    }
  }

  /**
   * Perform local AI analysis (existing logic)
   */
  private static async performLocalAnalysis(content: ContentAnalysis): Promise<CredibilityScore> {
    let score = 50; // baseline
    const factors: string[] = [];

    // Analyze URL credibility
    if (content.url) {
      const domain = new URL(content.url).hostname;
      const trustedDomains = [
        'reuters.com', 'bbc.com', 'ap.org', 'npr.org',
        'nytimes.com', 'washingtonpost.com', 'theguardian.com',
        'wsj.com', 'cnn.com', 'abcnews.go.com'
      ];

      if (trustedDomains.some(trusted => domain.includes(trusted))) {
        score += 20;
        factors.push('Trusted news domain');
      }

      // Check for suspicious domains
      const suspiciousDomains = [
        'fake-news.com', 'conspiracy.org', 'clickbait.net'
      ];

      if (suspiciousDomains.some(suspicious => domain.includes(suspicious))) {
        score -= 25;
        factors.push('Suspicious domain detected');
      }
    }

    // Analyze content length
    if (content.content && content.content.length > 500) {
      score += 10;
      factors.push('Substantial content length');
    }

    // Analyze title characteristics
    if (content.title) {
      // Check for clickbait indicators
      const clickbaitPatterns = [
        /you won't believe/i,
        /shocking/i,
        /this one trick/i,
        /doctors hate/i,
        /will blow your mind/i,
        /what happens next/i
      ];

      if (clickbaitPatterns.some(pattern => pattern.test(content.title!))) {
        score -= 15;
        factors.push('Potential clickbait title');
      }

      // Check for excessive punctuation
      if (/[!]{2,}/.test(content.title) || /[?]{2,}/.test(content.title)) {
        score -= 5;
        factors.push('Excessive punctuation in title');
      }
    }

    // Analyze content patterns
    if (content.content) {
      // Check for factual language patterns
      const factualPatterns = [
        /according to/i,
        /studies show/i,
        /research indicates/i,
        /experts say/i,
        /data shows/i
      ];

      if (factualPatterns.some(pattern => pattern.test(content.content!))) {
        score += 5;
        factors.push('Contains factual language patterns');
      }

      // Check for emotional manipulation
      const emotionalPatterns = [
        /outrageous/i,
        /scandal/i,
        /explosive/i,
        /devastating/i,
        /must see/i
      ];

      if (emotionalPatterns.some(pattern => pattern.test(content.content!))) {
        score -= 10;
        factors.push('Contains emotional manipulation language');
      }
    }

    const level: 'high' | 'medium' | 'low' | 'unknown' =
      score >= 70 ? 'high' :
      score >= 50 ? 'medium' :
      score >= 30 ? 'low' : 'unknown';

    return {
      score: Math.max(0, Math.min(100, score)),
      level,
      confidence: 0.7,
      reasoning: factors.length > 0 ? factors.join('; ') : 'Local AI analysis completed',
      source: 'ai',
      timestamp: Date.now(),
    };
  }

  /**
   * Perform external API checks
   */
  private static async performExternalApiCheck(content: ContentAnalysis): Promise<any> {
    if (!content.url || !this.googleClient) {
      return null;
    }

    try {
      const domain = new URL(content.url).hostname;
      const googleResult = await this.googleClient.searchByDomain(domain);

      return {
        google: googleResult,
        sources: googleResult.sources,
        confidence: googleResult.confidence,
        lastChecked: googleResult.lastChecked
      };
    } catch (error) {
      console.warn('External API check failed:', error);
      return null;
    }
  }

  /**
   * Combine local and external results with proper weighting
   */
  private static combineResults(
    localScore: CredibilityScore,
    externalResults?: any
  ): CredibilityScore {
    if (!externalResults || !externalResults.google) {
      return localScore;
    }

    const localWeight = 1 - this.EXTERNAL_API_WEIGHT;
    const externalWeight = this.EXTERNAL_API_WEIGHT;

    // Combine scores
    const combinedScore = Math.round(
      (localScore.score * localWeight) +
      (externalResults.google.trustworthiness * externalWeight)
    );

    // Combine confidence
    const combinedConfidence = Math.min(
      (localScore.confidence * localWeight) +
      (externalResults.confidence * externalWeight),
      1.0
    );

    // Determine final level
    const level: 'high' | 'medium' | 'low' | 'unknown' =
      combinedScore >= 70 ? 'high' :
      combinedScore >= 50 ? 'medium' :
      combinedScore >= 30 ? 'low' : 'unknown';

    // Combine reasoning
    const externalReasoning = externalResults.google.totalChecks > 0
      ? `External fact-checks: ${externalResults.google.totalChecks} checks, ${externalResults.google.averageRating} rating`
      : 'No external fact-checks found';

    const combinedReasoning = `${localScore.reasoning}; ${externalReasoning}`;

    return {
      score: combinedScore,
      level,
      confidence: combinedConfidence,
      reasoning: combinedReasoning,
      source: 'combined',
      timestamp: Date.now(),
    };
  }

  /**
   * Set user consent for external API usage
   */
  public static async setUserConsent(enabled: boolean): Promise<void> {
    const consent: ConsentSettings = {
      externalApiEnabled: enabled,
      consentTimestamp: Date.now(),
      consentVersion: this.CONSENT_VERSION,
      dataRetentionDays: 7,
      allowDomainSharing: enabled,
      allowCaching: true
    };

    try {
      await chrome.storage.local.set({ factcheck_consent: consent });
      console.info(`User consent for external APIs: ${enabled ? 'granted' : 'revoked'}`);
    } catch (error) {
      console.error('Error saving user consent:', error);
    }
  }

  /**
   * Generate cache key for external results
   */
  private static generateCacheKey(url: string): string {
    try {
      const domain = new URL(url).hostname;
      return `external_factcheck:${domain}`;
    } catch {
      return `external_factcheck:${url}`;
    }
  }

  /**
   * Get cached external API result
   */
  private static async getCachedExternalResult(cacheKey: string): Promise<any | null> {
    try {
      const result = await chrome.storage.local.get([cacheKey]);
      const cached = result[cacheKey];

      if (cached && Date.now() - cached.timestamp < this.config.cacheDuration) {
        return cached.data;
      }

      return null;
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }

  /**
   * Cache external API result
   */
  private static async cacheExternalResult(cacheKey: string, data: any): Promise<void> {
    try {
      const cacheEntry = {
        data,
        timestamp: Date.now()
      };

      await chrome.storage.local.set({ [cacheKey]: cacheEntry });
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }

  /**
   * Get service status and statistics
   */
  public static getServiceStatus(): {
    externalApisEnabled: boolean;
    googleApiStatus: string;
    cacheEnabled: boolean;
    consentRequired: boolean;
  } {
    return {
      externalApisEnabled: this.config.enableExternalApis,
      googleApiStatus: this.googleClient ? 'available' : 'not_configured',
      cacheEnabled: this.config.cacheEnabled,
      consentRequired: this.config.requireConsent
    };
  }

  /**
   * Clear all cached external results
   */
  public static async clearExternalCache(): Promise<void> {
    try {
      const storage = await chrome.storage.local.get();
      const keysToRemove = Object.keys(storage).filter(key =>
        key.startsWith('external_factcheck:')
      );

      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
        console.info(`Cleared ${keysToRemove.length} external cache entries`);
      }
    } catch (error) {
      console.error('Error clearing external cache:', error);
    }
  }

  /**
   * Get usage statistics from external APIs
   */
  public static getApiUsageStats(): any {
    if (!this.googleClient) {
      return { googleApi: 'not_configured' };
    }

    return {
      googleApi: this.googleClient.getUsageStats()
    };
  }
}

// Export for backward compatibility with existing code
export { EnhancedFactCheckingService as FactCheckingService };
