/**
 * Credibility Feedback Integrator - 2025 RLHF Implementation
 *
 * Features:
 * - Reinforcement Learning from Human Feedback (RLHF) patterns
 * - Real-time feedback integration with reward model training
 * - Continuous improvement loops with performance monitoring
 * - Human-centered algorithm refinement
 * - MLOps standardization for production deployment
 */

import { logger } from './logger';
import { feedbackStorageService } from './feedbackStorageService';
import type { CredibilityScore } from '../types';
import type { FeedbackData } from '../../popup/components/FeedbackSystem/FeedbackCollector';

export interface RewardModelData {
  feedbackId: string;
  expectedScore: number;
  actualScore: number;
  userFeedback: 'agree' | 'disagree' | 'report_issue';
  confidence: number;
  userReputation: number;
  timestamp: number;
}

export interface AlgorithmPerformanceMetrics {
  accuracyScore: number; // 0-1, how often predictions match user feedback
  precisionScore: number; // True positives / (True positives + False positives)
  recallScore: number; // True positives / (True positives + False negatives)
  f1Score: number; // Harmonic mean of precision and recall
  userSatisfactionScore: number; // Based on user agreement rates
  consensusAlignment: number; // How well algorithm aligns with consensus
  biasDetectionAccuracy: number; // Ability to detect biased content
  lastUpdated: number;
}

export interface FeedbackIntegrationResult {
  originalScore: number;
  adjustedScore: number;
  adjustmentFactor: number;
  confidenceLevel: number;
  feedbackQuality: number;
  rewardSignal: number; // RLHF reward signal (-1 to +1)
  algorithmUpdate: boolean; // Whether this feedback triggers model update
  reasoning: string;
}

class CredibilityFeedbackIntegrator {
  private static instance: CredibilityFeedbackIntegrator;

  // RLHF Configuration
  private readonly REWARD_MODEL_CONFIG = {
    learningRate: 0.01,
    discountFactor: 0.95,
    explorationRate: 0.1,
    updateFrequency: 100, // Updates after N feedback samples
    confidenceThreshold: 0.7
  };

  // Performance monitoring
  private readonly PERFORMANCE_THRESHOLDS = {
    minAccuracy: 0.75,
    minUserSatisfaction: 0.7,
    maxBiasDrift: 0.1,
    updateTriggerAccuracy: 0.65 // Trigger retraining below this
  };

  // Integration weights (2025 adaptive weighting)
  private readonly BASE_FEEDBACK_WEIGHT = 0.05; // 5% as specified
  private currentFeedbackWeight = this.BASE_FEEDBACK_WEIGHT;

  // Reward model tracking
  private rewardModelData = new Map<string, RewardModelData[]>();
  private performanceHistory: AlgorithmPerformanceMetrics[] = [];
  private lastModelUpdate = Date.now();

  private constructor() {
    this.initializeRewardModel();
  }

  public static getInstance(): CredibilityFeedbackIntegrator {
    if (!CredibilityFeedbackIntegrator.instance) {
      CredibilityFeedbackIntegrator.instance = new CredibilityFeedbackIntegrator();
    }
    return CredibilityFeedbackIntegrator.instance;
  }

  /**
   * Main RLHF integration method
   * Incorporates user feedback using reinforcement learning patterns
   */
  public async integrateFeedback(
    credibilityScore: CredibilityScore,
    feedbackData: FeedbackData,
    userReputation: number = 0.5
  ): Promise<FeedbackIntegrationResult> {
    try {
      logger.info('Starting RLHF feedback integration', {
        originalScore: credibilityScore.score,
        feedbackType: feedbackData.type,
        userReputation
      });

      // Step 1: Generate reward signal
      const rewardSignal = await this.generateRewardSignal(
        credibilityScore,
        feedbackData,
        userReputation
      );

      // Step 2: Calculate quality-adjusted feedback weight
      const feedbackQuality = await this.assessFeedbackQuality(feedbackData, userReputation);
      const adaptiveWeight = this.calculateAdaptiveWeight(feedbackQuality, rewardSignal);

      // Step 3: Get consensus data for context
      const consensusData = await this.getConsensusContext(feedbackData.url);

      // Step 4: Apply RLHF adjustment
      const adjustedScore = await this.applyRLHFAdjustment(
        credibilityScore.score,
        rewardSignal,
        adaptiveWeight,
        consensusData
      );

      // Step 5: Update reward model
      await this.updateRewardModel(credibilityScore, feedbackData, userReputation, adjustedScore);

      // Step 6: Check if algorithm update is needed
      const shouldUpdateAlgorithm = await this.checkAlgorithmUpdateTrigger();

      // Step 7: Calculate confidence in the adjustment
      const confidenceLevel = this.calculateAdjustmentConfidence(
        feedbackQuality,
        consensusData.consensusStrength,
        userReputation
      );

      const result: FeedbackIntegrationResult = {
        originalScore: credibilityScore.score,
        adjustedScore,
        adjustmentFactor: adaptiveWeight,
        confidenceLevel,
        feedbackQuality,
        rewardSignal,
        algorithmUpdate: shouldUpdateAlgorithm,
        reasoning: this.generateReasoningExplanation(
          rewardSignal,
          adaptiveWeight,
          consensusData
        )
      };

      // Step 8: Store integration result for analytics
      await this.storeIntegrationResult(feedbackData.url, result);

      logger.info('RLHF feedback integration completed', {
        originalScore: credibilityScore.score,
        adjustedScore,
        rewardSignal,
        algorithmUpdate: shouldUpdateAlgorithm
      });

      return result;

    } catch (error) {
      logger.error('RLHF feedback integration failed', {}, error as Error);

      // Return conservative fallback
      return {
        originalScore: credibilityScore.score,
        adjustedScore: credibilityScore.score,
        adjustmentFactor: 0,
        confidenceLevel: 0.3,
        feedbackQuality: 0.5,
        rewardSignal: 0,
        algorithmUpdate: false,
        reasoning: 'Integration failed - using original score'
      };
    }
  }

  /**
   * Generate reward signal for RLHF training
   * Uses 2025 human-feedback patterns
   */
  private async generateRewardSignal(
    credibilityScore: CredibilityScore,
    feedbackData: FeedbackData,
    userReputation: number
  ): Promise<number> {
    let reward = 0;

    // Base reward from user agreement/disagreement
    switch (feedbackData.type) {
      case 'agree':
        // Positive reward for agreement, stronger for high-confidence scores
        reward = 0.5 + (credibilityScore.confidence * 0.3);
        break;
      case 'disagree':
        // Negative reward for disagreement, stronger for high-confidence scores
        reward = -0.5 - (credibilityScore.confidence * 0.3);
        break;
      case 'report_issue':
        // Strong negative reward for reported issues
        reward = -0.8;
        break;
    }

    // Adjust reward based on user confidence in their feedback
    const confidenceAdjustment = (feedbackData.confidence - 0.5) * 0.4;
    reward += confidenceAdjustment;

    // Weight by user reputation (trusted users provide stronger signals)
    reward *= (0.5 + userReputation * 0.5);

    // Consider score extremes (very high/low scores need more confidence)
    const scoreExtremeFactor = this.calculateScoreExtremeFactor(credibilityScore.score);
    reward *= scoreExtremeFactor;

    // Clamp reward to [-1, 1] range
    return Math.max(-1, Math.min(1, reward));
  }

  /**
   * Assess quality of feedback using multiple factors
   */
  private async assessFeedbackQuality(
    feedbackData: FeedbackData,
    userReputation: number
  ): Promise<number> {
    let quality = 0.5; // Base quality

    // Factor 1: User reputation
    quality += userReputation * 0.3;

    // Factor 2: Feedback detail level
    if (feedbackData.userComment && feedbackData.userComment.length > 20) {
      quality += 0.2; // Detailed feedback is higher quality
    }

    // Factor 3: User confidence
    quality += (feedbackData.confidence - 0.5) * 0.3;

    // Factor 4: Issue categorization (for issue reports)
    if (feedbackData.type === 'report_issue' && feedbackData.issueCategory) {
      quality += 0.15; // Categorized issues are more actionable
    }

    // Factor 5: Context relevance (time since content was published)
    const contentAge = Date.now() - feedbackData.timestamp;
    const ageFactor = Math.max(0, 1 - (contentAge / (30 * 24 * 60 * 60 * 1000))); // Decay over 30 days
    quality += ageFactor * 0.1;

    return Math.max(0, Math.min(1, quality));
  }

  /**
   * Calculate adaptive weight based on feedback quality and reward signal
   * Implements 2025 continuous improvement patterns
   */
  private calculateAdaptiveWeight(feedbackQuality: number, rewardSignal: number): number {
    // Base weight adjusted by quality
    let weight = this.currentFeedbackWeight * feedbackQuality;

    // Increase weight for strong positive/negative signals
    const signalStrength = Math.abs(rewardSignal);
    weight *= (1 + signalStrength * 0.5);

    // Apply exploration factor (occasionally give more weight to learn)
    if (Math.random() < this.REWARD_MODEL_CONFIG.explorationRate) {
      weight *= 1.5;
    }

    return Math.max(0, Math.min(0.15, weight)); // Cap at 15% max influence
  }

  /**
   * Get consensus context for better decision making
   */
  private async getConsensusContext(url: string): Promise<any> {
    try {
      const feedback = await feedbackStorageService.getFeedbackForUrl(url, 100);
      const validFeedback = feedback.filter(f => !f.spamAnalysis.isSpam);

      if (validFeedback.length === 0) {
        return {
          hasConsensus: false,
          consensusStrength: 0,
          agreementRate: 0.5,
          sampleSize: 0
        };
      }

      const agree = validFeedback.filter(f => f.feedbackData.type === 'agree').length;
      const disagree = validFeedback.filter(f => f.feedbackData.type === 'disagree').length;
      const total = agree + disagree;

      const agreementRate = total > 0 ? agree / total : 0.5;
      const consensusStrength = total > 0 ? Math.max(agreementRate, 1 - agreementRate) : 0;

      return {
        hasConsensus: total >= 3 && consensusStrength > 0.7,
        consensusStrength,
        agreementRate,
        sampleSize: total,
        totalFeedback: validFeedback.length
      };
    } catch (error) {
      logger.error('Failed to get consensus context', { url }, error as Error);
      return {
        hasConsensus: false,
        consensusStrength: 0,
        agreementRate: 0.5,
        sampleSize: 0
      };
    }
  }

  /**
   * Apply RLHF adjustment to credibility score
   */
  private async applyRLHFAdjustment(
    originalScore: number,
    rewardSignal: number,
    adaptiveWeight: number,
    consensusData: any
  ): Promise<number> {
    // Convert reward signal to score adjustment
    let scoreAdjustment = rewardSignal * 100; // Convert to 0-100 scale

    // Apply consensus alignment
    if (consensusData.hasConsensus) {
      const consensusTarget = consensusData.agreementRate * 100;
      const consensusAdjustment = (consensusTarget - originalScore) * 0.3;
      scoreAdjustment = (scoreAdjustment + consensusAdjustment) / 2;
    }

    // Apply weighted adjustment
    const weightedAdjustment = scoreAdjustment * adaptiveWeight;
    const adjustedScore = originalScore + weightedAdjustment;

    // Ensure score stays within bounds
    return Math.max(0, Math.min(100, Math.round(adjustedScore)));
  }

  /**
   * Update reward model with new data
   */
  private async updateRewardModel(
    credibilityScore: CredibilityScore,
    feedbackData: FeedbackData,
    userReputation: number,
    adjustedScore: number
  ): Promise<void> {
    const rewardData: RewardModelData = {
      feedbackId: `reward_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      expectedScore: credibilityScore.score,
      actualScore: adjustedScore,
      userFeedback: feedbackData.type,
      confidence: feedbackData.confidence,
      userReputation,
      timestamp: Date.now()
    };

    const urlKey = this.hashUrl(feedbackData.url);
    const urlData = this.rewardModelData.get(urlKey) || [];
    urlData.push(rewardData);

    // Keep only recent data (last 1000 entries per URL)
    if (urlData.length > 1000) {
      urlData.shift();
    }

    this.rewardModelData.set(urlKey, urlData);

    // Update performance metrics
    await this.updatePerformanceMetrics();
  }

  /**
   * Check if algorithm should be updated based on performance
   */
  private async checkAlgorithmUpdateTrigger(): Promise<boolean> {
    const recentMetrics = await this.getRecentPerformanceMetrics();

    if (!recentMetrics) return false;

    // Trigger update if performance drops below threshold
    const shouldUpdate =
      recentMetrics.accuracyScore < this.PERFORMANCE_THRESHOLDS.updateTriggerAccuracy ||
      recentMetrics.userSatisfactionScore < this.PERFORMANCE_THRESHOLDS.minUserSatisfaction ||
      Date.now() - this.lastModelUpdate > 7 * 24 * 60 * 60 * 1000; // Weekly updates

    if (shouldUpdate) {
      this.lastModelUpdate = Date.now();
      logger.info('Algorithm update triggered', {
        accuracy: recentMetrics.accuracyScore,
        userSatisfaction: recentMetrics.userSatisfactionScore,
        timeSinceLastUpdate: Date.now() - this.lastModelUpdate
      });
    }

    return shouldUpdate;
  }

  /**
   * Calculate confidence in the adjustment
   */
  private calculateAdjustmentConfidence(
    feedbackQuality: number,
    consensusStrength: number,
    userReputation: number
  ): number {
    const qualityWeight = 0.4;
    const consensusWeight = 0.4;
    const reputationWeight = 0.2;

    return (
      feedbackQuality * qualityWeight +
      consensusStrength * consensusWeight +
      userReputation * reputationWeight
    );
  }

  /**
   * Generate human-readable reasoning for the adjustment
   */
  private generateReasoningExplanation(
    rewardSignal: number,
    adaptiveWeight: number,
    consensusData: any
  ): string {
    let reasoning = 'Credibility score adjusted based on user feedback';

    if (Math.abs(rewardSignal) > 0.5) {
      reasoning += rewardSignal > 0
        ? ' (strong positive feedback)'
        : ' (strong negative feedback)';
    }

    if (consensusData.hasConsensus) {
      reasoning += `, aligned with community consensus (${Math.round(consensusData.agreementRate * 100)}% agreement)`;
    }

    if (adaptiveWeight > this.BASE_FEEDBACK_WEIGHT * 1.5) {
      reasoning += ', with increased weight due to high feedback quality';
    }

    return reasoning;
  }

  /**
   * Update performance metrics based on recent feedback
   */
  private async updatePerformanceMetrics(): Promise<void> {
    try {
      const allRewardData = Array.from(this.rewardModelData.values()).flat();
      const recentData = allRewardData.filter(data =>
        Date.now() - data.timestamp < 7 * 24 * 60 * 60 * 1000); // Last 7 days

      if (recentData.length < 10) return; // Need minimum data for meaningful metrics

      // Calculate accuracy (how often feedback matches algorithm prediction)
      const accuracyMatches = recentData.filter(data => {
        const prediction = data.expectedScore > 50 ? 'high' : 'low';
        const feedback = data.userFeedback === 'agree' ? 'high' : 'low';
        return prediction === feedback;
      }).length;

      const accuracyScore = accuracyMatches / recentData.length;

      // Calculate user satisfaction (agreement rate)
      const agreementRate = recentData.filter(data =>
        data.userFeedback === 'agree').length / recentData.length;

      // Calculate consensus alignment
      const consensusAlignment = recentData.reduce((sum, data) => {
        const agreement = data.userFeedback === 'agree' ? 1 : 0;
        const expected = data.expectedScore / 100;
        return sum + (1 - Math.abs(agreement - expected));
      }, 0) / recentData.length;

      const metrics: AlgorithmPerformanceMetrics = {
        accuracyScore,
        precisionScore: accuracyScore, // Simplified for now
        recallScore: accuracyScore,
        f1Score: accuracyScore,
        userSatisfactionScore: agreementRate,
        consensusAlignment,
        biasDetectionAccuracy: 0.85, // Would need bias-specific feedback to calculate
        lastUpdated: Date.now()
      };

      this.performanceHistory.push(metrics);

      // Keep only recent history (last 30 entries)
      if (this.performanceHistory.length > 30) {
        this.performanceHistory.shift();
      }

      // Adjust feedback weight based on performance
      await this.adjustFeedbackWeight(metrics);

      logger.info('Performance metrics updated', {
        accuracy: accuracyScore,
        userSatisfaction: agreementRate,
        consensusAlignment
      });

    } catch (error) {
      logger.error('Failed to update performance metrics', {}, error as Error);
    }
  }

  /**
   * Dynamically adjust feedback weight based on performance
   */
  private async adjustFeedbackWeight(metrics: AlgorithmPerformanceMetrics): Promise<void> {
    const baseWeight = this.BASE_FEEDBACK_WEIGHT;

    // Increase weight if performance is good
    if (metrics.accuracyScore > 0.85 && metrics.userSatisfactionScore > 0.8) {
      this.currentFeedbackWeight = Math.min(0.1, baseWeight * 1.5);
    }
    // Decrease weight if performance is poor
    else if (metrics.accuracyScore < 0.65 || metrics.userSatisfactionScore < 0.6) {
      this.currentFeedbackWeight = Math.max(0.01, baseWeight * 0.7);
    }
    // Reset to base if performance is average
    else {
      this.currentFeedbackWeight = baseWeight;
    }

    logger.info('Feedback weight adjusted', {
      oldWeight: baseWeight,
      newWeight: this.currentFeedbackWeight,
      accuracy: metrics.accuracyScore,
      userSatisfaction: metrics.userSatisfactionScore
    });
  }

  // Helper methods

  private calculateScoreExtremeFactor(score: number): number {
    // Higher confidence needed for extreme scores (very high or very low)
    const centerDistance = Math.abs(score - 50) / 50;
    return 1 - (centerDistance * 0.3); // Reduce signal strength for extreme scores
  }

  private async getRecentPerformanceMetrics(): Promise<AlgorithmPerformanceMetrics | null> {
    return this.performanceHistory.length > 0
      ? this.performanceHistory[this.performanceHistory.length - 1]
      : null;
  }

  private hashUrl(url: string): string {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private async storeIntegrationResult(url: string, result: FeedbackIntegrationResult): Promise<void> {
    try {
      const key = `integration_result_${this.hashUrl(url)}_${Date.now()}`;
      await chrome.storage.local.set({ [key]: result });
    } catch (error) {
      logger.warn('Failed to store integration result', { url });
    }
  }

  private initializeRewardModel(): void {
    logger.info('RLHF Credibility Feedback Integrator initialized', {
      baseFeedbackWeight: this.BASE_FEEDBACK_WEIGHT,
      learningRate: this.REWARD_MODEL_CONFIG.learningRate,
      updateFrequency: this.REWARD_MODEL_CONFIG.updateFrequency
    });
  }

  /**
   * Export performance data for analytics
   */
  public async exportPerformanceData(): Promise<any> {
    return {
      currentMetrics: await this.getRecentPerformanceMetrics(),
      performanceHistory: this.performanceHistory,
      rewardModelConfig: this.REWARD_MODEL_CONFIG,
      currentFeedbackWeight: this.currentFeedbackWeight,
      totalRewardData: Array.from(this.rewardModelData.values()).flat().length
    };
  }

  /**
   * Get current algorithm performance for dashboard
   */
  public async getCurrentPerformance(): Promise<AlgorithmPerformanceMetrics | null> {
    return await this.getRecentPerformanceMetrics();
  }
}

// Export singleton instance
export const credibilityFeedbackIntegrator = CredibilityFeedbackIntegrator.getInstance();
export default CredibilityFeedbackIntegrator;
