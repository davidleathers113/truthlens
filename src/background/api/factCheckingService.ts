import { ContentAnalysis, CredibilityScore } from '@shared/types';

/**
 * Fact-checking service for external API integration
 * Handles communication with external fact-checking APIs
 */
export class FactCheckingService {
  private static readonly CACHE_DURATION = 3600000; // 1 hour

  /**
   * Check content credibility using external APIs
   */
  static async checkCredibility(content: ContentAnalysis): Promise<CredibilityScore> {
    try {
      // First check cache
      const cached = await this.getCachedResult(content.url);
      if (cached) {
        console.debug('Using cached credibility result for:', content.url);
        return cached;
      }

      // Try multiple fact-checking approaches
      const results = await Promise.allSettled([
        this.checkWithPrimaryAPI(content),
        this.checkWithSecondaryAPI(content),
        this.performLocalAnalysis(content),
      ]);

      // Combine results
      const credibilityScore = this.combineResults(results, content);

      // Cache the result
      await this.cacheResult(content.url, credibilityScore);

      return credibilityScore;

    } catch (error) {
      console.error('Credibility check failed:', error);
      return this.createFallbackScore(content);
    }
  }

  /**
   * Check with primary fact-checking API
   */
  private static async checkWithPrimaryAPI(_content: ContentAnalysis): Promise<CredibilityScore> {
    // This would integrate with a real fact-checking API
    // For now, return a mock response

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          score: 75,
          level: 'medium',
          confidence: 0.8,
          reasoning: 'Primary API analysis - mock response',
          source: 'api',
          timestamp: Date.now(),
        });
      }, 1000);
    });
  }

  /**
   * Check with secondary fact-checking API
   */
  private static async checkWithSecondaryAPI(_content: ContentAnalysis): Promise<CredibilityScore> {
    // This would integrate with a secondary fact-checking API
    // For now, return a mock response

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          score: 70,
          level: 'medium',
          confidence: 0.7,
          reasoning: 'Secondary API analysis - mock response',
          source: 'api',
          timestamp: Date.now(),
        });
      }, 1200);
    });
  }

  /**
   * Perform local AI analysis
   */
  private static async performLocalAnalysis(content: ContentAnalysis): Promise<CredibilityScore> {
    // This would use local AI (Chrome Built-in AI) for analysis
    // For now, return a mock response based on content characteristics

    let score = 50; // baseline
    const factors: string[] = [];

    // Analyze URL credibility
    if (content.url) {
      const domain = new URL(content.url).hostname;
      const trustedDomains = [
        'reuters.com', 'bbc.com', 'ap.org', 'npr.org',
        'nytimes.com', 'washingtonpost.com', 'theguardian.com'
      ];

      if (trustedDomains.some(trusted => domain.includes(trusted))) {
        score += 20;
        factors.push('Trusted news domain');
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
      ];

      if (clickbaitPatterns.some(pattern => pattern.test(content.title!))) {
        score -= 15;
        factors.push('Potential clickbait title');
      }
    }

    const level: 'high' | 'medium' | 'low' | 'unknown' =
      score >= 70 ? 'high' :
      score >= 50 ? 'medium' :
      score >= 30 ? 'low' : 'unknown';

    return {
      score: Math.max(0, Math.min(100, score)),
      level,
      confidence: 0.6,
      reasoning: factors.length > 0 ? factors.join('; ') : 'Local analysis completed',
      source: 'ai',
      timestamp: Date.now(),
    };
  }

  /**
   * Combine multiple analysis results
   */
  private static combineResults(
    results: PromiseSettledResult<CredibilityScore>[],
    _content: ContentAnalysis
  ): CredibilityScore {
    const successful = results
      .filter((result): result is PromiseFulfilledResult<CredibilityScore> =>
        result.status === 'fulfilled'
      )
      .map(result => result.value);

    if (successful.length === 0) {
      return this.createFallbackScore(_content);
    }

    // Weight the scores by confidence
    let totalWeight = 0;
    let weightedScore = 0;
    const reasoningParts: string[] = [];

    for (const score of successful) {
      const weight = score.confidence;
      totalWeight += weight;
      weightedScore += score.score * weight;
      reasoningParts.push(`${score.source}: ${score.reasoning}`);
    }

    const finalScore = Math.round(weightedScore / totalWeight);
    const avgConfidence = totalWeight / successful.length;

    const level: 'high' | 'medium' | 'low' | 'unknown' =
      finalScore >= 70 ? 'high' :
      finalScore >= 50 ? 'medium' :
      finalScore >= 30 ? 'low' : 'unknown';

    return {
      score: finalScore,
      level,
      confidence: avgConfidence,
      reasoning: `Combined analysis: ${reasoningParts.join('; ')}`,
      source: 'ai',
      timestamp: Date.now(),
    };
  }

  /**
   * Create fallback score when all checks fail
   */
  private static createFallbackScore(_content: ContentAnalysis): CredibilityScore {
    return {
      score: 50,
      level: 'unknown',
      confidence: 0.1,
      reasoning: 'Unable to verify credibility - analysis failed',
      source: 'fallback',
      timestamp: Date.now(),
    };
  }

  /**
   * Get cached credibility result
   */
  private static async getCachedResult(url: string): Promise<CredibilityScore | null> {
    try {
      const cacheKey = `credibility:${url}`;
      const result = await chrome.storage.local.get([cacheKey]);
      const cached = result[cacheKey];

      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached;
      }

      return null;
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }

  /**
   * Cache credibility result
   */
  private static async cacheResult(url: string, score: CredibilityScore): Promise<void> {
    try {
      const cacheKey = `credibility:${url}`;
      await chrome.storage.local.set({
        [cacheKey]: score,
      });
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }
}
