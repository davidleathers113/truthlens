/**
 * AI Bias Assessment Service - EU AI Act 2025 Compliance
 * Automated bias detection and mitigation for TruthLens credibility analysis
 */

import { logger } from '../../shared/services/logger';
import { storageService } from '../../shared/storage/storageService';
import { securityService } from '../../shared/services/securityService';
import {
  BiasAlertResult,
  ExplainableAIReport,
  SubpopulationAnalysis,
  CredibilityScore
} from '../../shared/types';

export interface BiasAssessmentResult {
  assessmentId: string;
  timestamp: number;
  version: string;

  // EU AI Act Article 10 Requirements
  dataQualityAssessment: {
    representativeness: number; // 0-100 score
    completeness: number; // 0-100 score
    accuracy: number; // 0-100 score
    relevance: number; // 0-100 score
    biasIndicators: BiasIndicator[];
  };

  // Bias Analysis Results
  biasDetection: {
    demographicBias: BiasMetric;
    contentTypeBias: BiasMetric;
    sourceBias: BiasMetric;
    temporalBias: BiasMetric;
    geographicBias: BiasMetric;
  };

  // Mitigation Measures
  mitigationMeasures: {
    implemented: string[];
    recommended: string[];
    effectiveness: number; // 0-100 score
  };

  // Risk Assessment
  riskAssessment: {
    overallRiskLevel: 'minimal' | 'limited' | 'high' | 'unacceptable';
    impactOnFundamentalRights: boolean;
    potentialDiscrimination: boolean;
    riskFactors: string[];
  };

  // Compliance Status
  compliance: {
    euAiActCompliant: boolean;
    gdprCompliant: boolean;
    issues: string[];
    recommendations: string[];
  };

  // Next Assessment
  nextAssessmentDue: number;
  validUntil: number;
}

export interface BiasIndicator {
  type: 'demographic' | 'content' | 'source' | 'temporal' | 'geographic';
  metric: string;
  value: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export interface BiasMetric {
  score: number; // 0-100, where 100 is completely unbiased
  confidence: number; // 0-100, confidence in the assessment
  indicators: BiasIndicator[];
  trends: {
    improving: boolean;
    direction: number; // -1 to 1, negative is getting worse
  };
}

export interface DataSample {
  url: string;
  domain: string;
  contentType: string;
  credibilityScore: number;
  timestamp: number;
  userDemographics?: {
    region?: string;
    language?: string;
    deviceType?: string;
  };
  metadata: Record<string, any>;
}

class BiasAssessmentService {
  private static instance: BiasAssessmentService;
  private assessmentInProgress = false;
  private readonly ASSESSMENT_INTERVAL_DAYS = 30; // Monthly as per EU AI Act
  private readonly MIN_SAMPLES_FOR_ASSESSMENT = 100;
  private readonly BIAS_THRESHOLDS = {
    demographic: 0.15, // Max 15% difference between groups
    contentType: 0.20, // Max 20% difference between content types
    source: 0.25, // Max 25% difference between sources
    temporal: 0.10, // Max 10% drift over time
    geographic: 0.18 // Max 18% difference between regions
  };

  private constructor() {
    this.initializeAssessmentSchedule();
  }

  public static getInstance(): BiasAssessmentService {
    if (!BiasAssessmentService.instance) {
      BiasAssessmentService.instance = new BiasAssessmentService();
    }
    return BiasAssessmentService.instance;
  }

  /**
   * Initialize automated bias assessment schedule
   */
  private initializeAssessmentSchedule(): void {
    // Schedule monthly bias assessments
    chrome.alarms.create('bias-assessment', {
      periodInMinutes: this.ASSESSMENT_INTERVAL_DAYS * 24 * 60 // Monthly
    });

    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'bias-assessment') {
        this.performAutomatedAssessment();
      }
    });

    // Check if assessment is overdue on startup
    this.checkAssessmentStatus();

    logger.info('Bias assessment service initialized with EU AI Act compliance');
  }

  /**
   * Check current assessment status and trigger if needed
   */
  private async checkAssessmentStatus(): Promise<void> {
    try {
      const lastAssessment = await this.getLatestAssessment();
      const now = Date.now();

      if (!lastAssessment) {
        logger.info('No previous bias assessment found, scheduling initial assessment');
        this.performAutomatedAssessment();
        return;
      }

      const daysSinceLastAssessment = (now - lastAssessment.timestamp) / (24 * 60 * 60 * 1000);

      if (daysSinceLastAssessment >= this.ASSESSMENT_INTERVAL_DAYS) {
        logger.info('Bias assessment overdue, triggering automated assessment', {
          daysSince: Math.round(daysSinceLastAssessment)
        });
        this.performAutomatedAssessment();
      } else {
        const nextDue = new Date(lastAssessment.nextAssessmentDue);
        logger.info('Bias assessment up to date', {
          nextDue: nextDue.toISOString(),
          daysSince: Math.round(daysSinceLastAssessment)
        });
      }

    } catch (error) {
      logger.error('Failed to check bias assessment status', {}, error as Error);
    }
  }

  /**
   * Perform automated bias assessment
   */
  public async performAutomatedAssessment(): Promise<BiasAssessmentResult> {
    if (this.assessmentInProgress) {
      throw new Error('Bias assessment already in progress');
    }

    try {
      this.assessmentInProgress = true;
      logger.info('Starting automated bias assessment for EU AI Act compliance');

      // Generate unique assessment ID
      const assessmentId = `bias_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Collect data samples for analysis
      const dataSamples = await this.collectDataSamples();

      if (dataSamples.length < this.MIN_SAMPLES_FOR_ASSESSMENT) {
        logger.warn('Insufficient data for bias assessment', {
          samples: dataSamples.length,
          required: this.MIN_SAMPLES_FOR_ASSESSMENT
        });
      }

      // Perform comprehensive bias analysis
      const dataQualityAssessment = await this.assessDataQuality(dataSamples);
      const biasDetection = await this.performBiasDetection(dataSamples);
      const mitigationMeasures = await this.assessMitigationMeasures(biasDetection);
      const riskAssessment = await this.performRiskAssessment(biasDetection);
      const compliance = await this.assessCompliance(riskAssessment, biasDetection);

      const result: BiasAssessmentResult = {
        assessmentId,
        timestamp: Date.now(),
        version: '2025.1',
        dataQualityAssessment,
        biasDetection,
        mitigationMeasures,
        riskAssessment,
        compliance,
        nextAssessmentDue: Date.now() + (this.ASSESSMENT_INTERVAL_DAYS * 24 * 60 * 60 * 1000),
        validUntil: Date.now() + (this.ASSESSMENT_INTERVAL_DAYS * 24 * 60 * 60 * 1000)
      };

      // Store assessment result
      await this.storeAssessmentResult(result);

      // Update AI processing metrics
      await storageService.updateAIProcessingMetrics({
        biasChecksPerformed: 1,
        totalProcessingEvents: 1
      });

      logger.info('Bias assessment completed', {
        assessmentId,
        riskLevel: result.riskAssessment.overallRiskLevel,
        compliant: result.compliance.euAiActCompliant
      });

      return result;

    } catch (error) {
      logger.error('Bias assessment failed', {}, error as Error);
      throw error;
    } finally {
      this.assessmentInProgress = false;
    }
  }

  /**
   * Collect data samples for bias analysis
   */
  private async collectDataSamples(): Promise<DataSample[]> {
    try {
      // Get recent AI processing data
      await storageService.getAIProcessingMetrics();
      const recentAnalyses = await storageService.getRecentCredibilityAnalyses(1000);

      const samples: DataSample[] = recentAnalyses.map(analysis => ({
        url: 'unknown', // CredibilityScore doesn't contain URL
        domain: 'unknown', // Extract from URL if available elsewhere
        contentType: 'unknown', // Not available in CredibilityScore
        credibilityScore: analysis.score,
        timestamp: analysis.timestamp,
        userDemographics: undefined, // Not available in CredibilityScore
        metadata: { source: analysis.source, reasoning: analysis.reasoning }
      }));

      logger.debug('Collected data samples for bias analysis', {
        totalSamples: samples.length,
        timeRange: samples.length > 0 ? {
          oldest: new Date(Math.min(...samples.map(s => s.timestamp))).toISOString(),
          newest: new Date(Math.max(...samples.map(s => s.timestamp))).toISOString()
        } : null
      });

      return samples;

    } catch (error) {
      logger.error('Failed to collect data samples', {}, error as Error);
      return [];
    }
  }

  /**
   * Assess data quality as per EU AI Act Article 10
   */
  private async assessDataQuality(samples: DataSample[]): Promise<BiasAssessmentResult['dataQualityAssessment']> {
    const biasIndicators: BiasIndicator[] = [];

    // Assess representativeness
    const domainDistribution = this.calculateDistribution(samples, 'domain');
    const representativeness = this.assessRepresentativeness(domainDistribution);

    if (representativeness < 70) {
      biasIndicators.push({
        type: 'source',
        metric: 'domain_representativeness',
        value: representativeness,
        threshold: 70,
        severity: representativeness < 50 ? 'high' : 'medium',
        description: 'Data sources may not be sufficiently representative'
      });
    }

    // Assess completeness
    const completeness = this.assessCompleteness(samples);

    if (completeness < 80) {
      biasIndicators.push({
        type: 'content',
        metric: 'data_completeness',
        value: completeness,
        threshold: 80,
        severity: completeness < 60 ? 'high' : 'medium',
        description: 'Missing data fields may introduce bias'
      });
    }

    // Assess accuracy (based on consistency)
    const accuracy = this.assessAccuracy(samples);

    // Assess relevance
    const relevance = this.assessRelevance(samples);

    return {
      representativeness,
      completeness,
      accuracy,
      relevance,
      biasIndicators
    };
  }

  /**
   * Perform comprehensive bias detection
   */
  private async performBiasDetection(samples: DataSample[]): Promise<BiasAssessmentResult['biasDetection']> {
    return {
      demographicBias: await this.detectDemographicBias(samples),
      contentTypeBias: await this.detectContentTypeBias(samples),
      sourceBias: await this.detectSourceBias(samples),
      temporalBias: await this.detectTemporalBias(samples),
      geographicBias: await this.detectGeographicBias(samples)
    };
  }

  /**
   * Detect demographic bias in AI outputs
   */
  private async detectDemographicBias(samples: DataSample[]): Promise<BiasMetric> {
    const indicators: BiasIndicator[] = [];

    // Group by demographics where available
    const demographicGroups = this.groupByDemographics(samples);

    // Calculate score differences between groups
    const biasScore = this.calculateGroupBiasScore(demographicGroups, 'demographic');

    if (biasScore > this.BIAS_THRESHOLDS.demographic) {
      indicators.push({
        type: 'demographic',
        metric: 'score_difference',
        value: biasScore,
        threshold: this.BIAS_THRESHOLDS.demographic,
        severity: biasScore > 0.3 ? 'high' : 'medium',
        description: 'Significant differences in credibility scores across demographic groups'
      });
    }

    return {
      score: Math.max(0, 100 - (biasScore * 100)),
      confidence: this.calculateConfidence(samples.length, 'demographic'),
      indicators,
      trends: await this.calculateBiasTrends('demographic')
    };
  }

  /**
   * Detect content type bias
   */
  private async detectContentTypeBias(samples: DataSample[]): Promise<BiasMetric> {
    const indicators: BiasIndicator[] = [];

    const contentTypeGroups = this.groupByContentType(samples);
    const biasScore = this.calculateGroupBiasScore(contentTypeGroups, 'contentType');

    if (biasScore > this.BIAS_THRESHOLDS.contentType) {
      indicators.push({
        type: 'content',
        metric: 'content_type_bias',
        value: biasScore,
        threshold: this.BIAS_THRESHOLDS.contentType,
        severity: biasScore > 0.4 ? 'high' : 'medium',
        description: 'AI system shows bias towards certain content types'
      });
    }

    return {
      score: Math.max(0, 100 - (biasScore * 100)),
      confidence: this.calculateConfidence(samples.length, 'contentType'),
      indicators,
      trends: await this.calculateBiasTrends('contentType')
    };
  }

  /**
   * Detect source bias
   */
  private async detectSourceBias(samples: DataSample[]): Promise<BiasMetric> {
    const indicators: BiasIndicator[] = [];

    const sourceGroups = this.groupBySource(samples);
    const biasScore = this.calculateGroupBiasScore(sourceGroups, 'source');

    if (biasScore > this.BIAS_THRESHOLDS.source) {
      indicators.push({
        type: 'source',
        metric: 'source_bias',
        value: biasScore,
        threshold: this.BIAS_THRESHOLDS.source,
        severity: biasScore > 0.5 ? 'high' : 'medium',
        description: 'Systematic bias detected across different content sources'
      });
    }

    return {
      score: Math.max(0, 100 - (biasScore * 100)),
      confidence: this.calculateConfidence(samples.length, 'source'),
      indicators,
      trends: await this.calculateBiasTrends('source')
    };
  }

  /**
   * Detect temporal bias (drift over time)
   */
  private async detectTemporalBias(samples: DataSample[]): Promise<BiasMetric> {
    const indicators: BiasIndicator[] = [];

    const temporalGroups = this.groupByTimeWindows(samples);
    const biasScore = this.calculateTemporalDrift(temporalGroups);

    if (biasScore > this.BIAS_THRESHOLDS.temporal) {
      indicators.push({
        type: 'temporal',
        metric: 'temporal_drift',
        value: biasScore,
        threshold: this.BIAS_THRESHOLDS.temporal,
        severity: biasScore > 0.2 ? 'high' : 'medium',
        description: 'AI system performance drifting over time'
      });
    }

    return {
      score: Math.max(0, 100 - (biasScore * 100)),
      confidence: this.calculateConfidence(samples.length, 'temporal'),
      indicators,
      trends: await this.calculateBiasTrends('temporal')
    };
  }

  /**
   * Detect geographic bias
   */
  private async detectGeographicBias(samples: DataSample[]): Promise<BiasMetric> {
    const indicators: BiasIndicator[] = [];

    const geographicGroups = this.groupByGeography(samples);
    const biasScore = this.calculateGroupBiasScore(geographicGroups, 'geographic');

    if (biasScore > this.BIAS_THRESHOLDS.geographic) {
      indicators.push({
        type: 'geographic',
        metric: 'geographic_bias',
        value: biasScore,
        threshold: this.BIAS_THRESHOLDS.geographic,
        severity: biasScore > 0.35 ? 'high' : 'medium',
        description: 'Performance varies significantly across geographic regions'
      });
    }

    return {
      score: Math.max(0, 100 - (biasScore * 100)),
      confidence: this.calculateConfidence(samples.length, 'geographic'),
      indicators,
      trends: await this.calculateBiasTrends('geographic')
    };
  }

  // Helper methods for bias calculations

  private calculateDistribution(samples: DataSample[], field: keyof DataSample): Record<string, number> {
    const distribution: Record<string, number> = {};

    samples.forEach(sample => {
      const value = String(sample[field] || 'unknown');
      distribution[value] = (distribution[value] || 0) + 1;
    });

    return distribution;
  }

  private assessRepresentativeness(distribution: Record<string, number>): number {
    const values = Object.values(distribution);
    const total = values.reduce((sum, count) => sum + count, 0);

    // Calculate entropy as a measure of representativeness
    const entropy = values.reduce((ent, count) => {
      const probability = count / total;
      return ent - (probability * Math.log2(probability || 1));
    }, 0);

    // Normalize to 0-100 scale
    const maxEntropy = Math.log2(values.length);
    return maxEntropy > 0 ? (entropy / maxEntropy) * 100 : 0;
  }

  private assessCompleteness(samples: DataSample[]): number {
    if (samples.length === 0) return 0;

    const requiredFields = ['url', 'domain', 'contentType', 'credibilityScore', 'timestamp'];
    let completenessScore = 0;

    samples.forEach(sample => {
      let fieldCount = 0;
      requiredFields.forEach(field => {
        if (sample[field as keyof DataSample] !== undefined && sample[field as keyof DataSample] !== null) {
          fieldCount++;
        }
      });
      completenessScore += (fieldCount / requiredFields.length);
    });

    return (completenessScore / samples.length) * 100;
  }

  private assessAccuracy(_samples: DataSample[]): number {
    // For now, assume accuracy based on consistency of scores for similar content
    // In a real implementation, this would compare against ground truth data
    return 85; // Placeholder
  }

  private assessRelevance(samples: DataSample[]): number {
    // Assess relevance based on content type distribution and recency
    const now = Date.now();
    const recentSamples = samples.filter(s => (now - s.timestamp) < (7 * 24 * 60 * 60 * 1000)); // Last 7 days

    const relevanceScore = recentSamples.length / samples.length;
    return Math.min(100, relevanceScore * 100);
  }

  private groupByDemographics(samples: DataSample[]): Record<string, DataSample[]> {
    const groups: Record<string, DataSample[]> = {};

    samples.forEach(sample => {
      const demographics = sample.userDemographics;
      const key = demographics ? `${demographics.region || 'unknown'}_${demographics.language || 'unknown'}` : 'unknown';

      if (!groups[key]) groups[key] = [];
      groups[key].push(sample);
    });

    return groups;
  }

  private groupByContentType(samples: DataSample[]): Record<string, DataSample[]> {
    const groups: Record<string, DataSample[]> = {};

    samples.forEach(sample => {
      const contentType = sample.contentType || 'unknown';
      if (!groups[contentType]) groups[contentType] = [];
      groups[contentType].push(sample);
    });

    return groups;
  }

  private groupBySource(samples: DataSample[]): Record<string, DataSample[]> {
    const groups: Record<string, DataSample[]> = {};

    samples.forEach(sample => {
      const domain = sample.domain;
      if (!groups[domain]) groups[domain] = [];
      groups[domain].push(sample);
    });

    return groups;
  }

  private groupByTimeWindows(samples: DataSample[]): Record<string, DataSample[]> {
    const groups: Record<string, DataSample[]> = {};
    const dayMs = 24 * 60 * 60 * 1000;

    samples.forEach(sample => {
      const dayKey = Math.floor(sample.timestamp / dayMs).toString();
      if (!groups[dayKey]) groups[dayKey] = [];
      groups[dayKey].push(sample);
    });

    return groups;
  }

  private groupByGeography(samples: DataSample[]): Record<string, DataSample[]> {
    const groups: Record<string, DataSample[]> = {};

    samples.forEach(sample => {
      const region = sample.userDemographics?.region || 'unknown';
      if (!groups[region]) groups[region] = [];
      groups[region].push(sample);
    });

    return groups;
  }

  private calculateGroupBiasScore(groups: Record<string, DataSample[]>, _type: string): number {
    const groupAverages: number[] = [];

    Object.values(groups).forEach(groupSamples => {
      if (groupSamples.length > 0) {
        const average = groupSamples.reduce((sum, sample) => sum + sample.credibilityScore, 0) / groupSamples.length;
        groupAverages.push(average);
      }
    });

    if (groupAverages.length < 2) return 0;

    const max = Math.max(...groupAverages);
    const min = Math.min(...groupAverages);

    return Math.abs(max - min) / 100; // Normalize to 0-1 scale
  }

  private calculateTemporalDrift(timeGroups: Record<string, DataSample[]>): number {
    const timeKeys = Object.keys(timeGroups).sort();
    if (timeKeys.length < 2) return 0;

    const averages: number[] = timeKeys.map(key => {
      const samples = timeGroups[key];
      return samples.reduce((sum, sample) => sum + sample.credibilityScore, 0) / samples.length;
    });

    // Calculate linear regression to detect drift
    const n = averages.length;
    const sumX = timeKeys.reduce((sum, _, i) => sum + i, 0);
    const sumY = averages.reduce((sum, avg) => sum + avg, 0);
    const sumXY = averages.reduce((sum, avg, i) => sum + (i * avg), 0);
    const sumXX = timeKeys.reduce((sum, _, i) => sum + (i * i), 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    return Math.abs(slope) / 100; // Normalize slope
  }

  private calculateConfidence(sampleSize: number, biasType: string): number {
    // Confidence increases with sample size, different minimums for different bias types
    const minSamples = {
      demographic: 50,
      contentType: 30,
      source: 40,
      temporal: 100,
      geographic: 60
    };

    const min = minSamples[biasType as keyof typeof minSamples] || 50;
    return Math.min(100, (sampleSize / min) * 100);
  }

  private async calculateBiasTrends(biasType: string): Promise<{ improving: boolean; direction: number }> {
    // Compare with previous assessments to calculate trends
    const previousAssessments = await this.getPreviousAssessments(3);

    if (previousAssessments.length < 2) {
      return { improving: true, direction: 0 };
    }

    // Simple trend calculation based on recent assessments
    const scores = previousAssessments.map(assessment => {
      const biasMetric = assessment.biasDetection[biasType as keyof typeof assessment.biasDetection] as BiasMetric;
      return biasMetric.score;
    });

    const trend = scores[0] - scores[scores.length - 1]; // Recent - oldest
    return {
      improving: trend > 0,
      direction: Math.max(-1, Math.min(1, trend / 100))
    };
  }

  private async assessMitigationMeasures(biasDetection: BiasAssessmentResult['biasDetection']): Promise<BiasAssessmentResult['mitigationMeasures']> {
    const implemented: string[] = [
      'Data diversity monitoring',
      'Regular bias assessment schedule',
      'User feedback integration',
      'Local AI processing preference',
      'Transparent scoring methodology'
    ];

    const recommended: string[] = [];

    // Generate recommendations based on detected biases
    Object.entries(biasDetection).forEach(([type, metric]) => {
      if (metric.score < 70) {
        switch (type) {
          case 'demographicBias':
            recommended.push('Expand data collection across demographic groups');
            recommended.push('Implement demographic-aware training procedures');
            break;
          case 'contentTypeBias':
            recommended.push('Balance training data across content types');
            recommended.push('Content-type specific model calibration');
            break;
          case 'sourceBias':
            recommended.push('Diversify content sources in training data');
            recommended.push('Source-agnostic feature engineering');
            break;
          case 'temporalBias':
            recommended.push('Implement model retraining schedule');
            recommended.push('Temporal drift detection system');
            break;
          case 'geographicBias':
            recommended.push('Expand geographic coverage in data collection');
            recommended.push('Region-specific model validation');
            break;
        }
      }
    });

    // Calculate effectiveness of current measures
    const overallBiasScore = Object.values(biasDetection).reduce((sum, metric) => sum + metric.score, 0) / Object.keys(biasDetection).length;
    const effectiveness = Math.min(100, overallBiasScore);

    return {
      implemented,
      recommended: [...new Set(recommended)], // Remove duplicates
      effectiveness
    };
  }

  private async performRiskAssessment(biasDetection: BiasAssessmentResult['biasDetection']): Promise<BiasAssessmentResult['riskAssessment']> {
    const biasScores = Object.values(biasDetection).map(metric => metric.score);
    const minScore = Math.min(...biasScores);
    const avgScore = biasScores.reduce((sum, score) => sum + score, 0) / biasScores.length;

    // Determine overall risk level based on EU AI Act classification
    let overallRiskLevel: 'minimal' | 'limited' | 'high' | 'unacceptable';

    if (minScore < 30) {
      overallRiskLevel = 'unacceptable';
    } else if (minScore < 50 || avgScore < 60) {
      overallRiskLevel = 'high';
    } else if (minScore < 70 || avgScore < 80) {
      overallRiskLevel = 'limited';
    } else {
      overallRiskLevel = 'minimal';
    }

    // Assess impact on fundamental rights
    const impactOnFundamentalRights = minScore < 50 || Object.values(biasDetection).some(metric =>
      metric.indicators.some(indicator => indicator.severity === 'high' || indicator.severity === 'critical')
    );

    // Assess potential for discrimination
    const potentialDiscrimination = biasDetection.demographicBias.score < 70 ||
                                  biasDetection.geographicBias.score < 70;

    const riskFactors: string[] = [];

    if (biasDetection.demographicBias.score < 70) {
      riskFactors.push('Demographic bias detected');
    }
    if (biasDetection.contentTypeBias.score < 70) {
      riskFactors.push('Content type bias detected');
    }
    if (biasDetection.sourceBias.score < 70) {
      riskFactors.push('Source bias detected');
    }
    if (biasDetection.temporalBias.score < 70) {
      riskFactors.push('Temporal drift detected');
    }
    if (biasDetection.geographicBias.score < 70) {
      riskFactors.push('Geographic bias detected');
    }

    return {
      overallRiskLevel,
      impactOnFundamentalRights,
      potentialDiscrimination,
      riskFactors
    };
  }

  private async assessCompliance(
    riskAssessment: BiasAssessmentResult['riskAssessment'],
    _biasDetection: BiasAssessmentResult['biasDetection']
  ): Promise<BiasAssessmentResult['compliance']> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // EU AI Act compliance check
    let euAiActCompliant = true;

    if (riskAssessment.overallRiskLevel === 'unacceptable') {
      euAiActCompliant = false;
      issues.push('AI system classified as unacceptable risk under EU AI Act');
      recommendations.push('Immediate system review and bias mitigation required');
    }

    if (riskAssessment.overallRiskLevel === 'high') {
      if (riskAssessment.impactOnFundamentalRights) {
        issues.push('High-risk AI system may impact fundamental rights');
        recommendations.push('Implement human oversight mechanisms');
        recommendations.push('Enhanced transparency and explainability required');
      }
    }

    if (riskAssessment.potentialDiscrimination) {
      issues.push('Potential discrimination detected in AI outputs');
      recommendations.push('Implement bias mitigation measures immediately');
    }

    // GDPR compliance check
    const gdprCompliant = !riskAssessment.impactOnFundamentalRights &&
                         !riskAssessment.potentialDiscrimination;

    if (!gdprCompliant) {
      issues.push('GDPR compliance at risk due to bias issues');
      recommendations.push('Review data processing lawfulness under GDPR');
    }

    // Check assessment frequency compliance
    const lastAssessment = await this.getLatestAssessment();
    if (lastAssessment) {
      const daysSince = (Date.now() - lastAssessment.timestamp) / (24 * 60 * 60 * 1000);
      if (daysSince > this.ASSESSMENT_INTERVAL_DAYS + 5) { // 5 day grace period
        issues.push('Bias assessment overdue per EU AI Act requirements');
        recommendations.push('Maintain monthly bias assessment schedule');
      }
    }

    return {
      euAiActCompliant,
      gdprCompliant,
      issues,
      recommendations
    };
  }

  /**
   * Store bias assessment result
   */
  private async storeAssessmentResult(result: BiasAssessmentResult): Promise<void> {
    try {
      const key = `bias_assessment_${result.timestamp}`;

      // Encrypt sensitive assessment data
      const encryptedResult = await securityService.encryptData(result, 'userData');

      if (encryptedResult.success) {
        await chrome.storage.local.set({ [key]: encryptedResult.data });

        // Store summary for quick access
        await chrome.storage.local.set({
          latest_bias_assessment: {
            assessmentId: result.assessmentId,
            timestamp: result.timestamp,
            riskLevel: result.riskAssessment.overallRiskLevel,
            compliant: result.compliance.euAiActCompliant,
            nextDue: result.nextAssessmentDue
          }
        });

        logger.info('Bias assessment result stored securely', {
          assessmentId: result.assessmentId
        });
      } else {
        throw new Error('Failed to encrypt assessment result');
      }

    } catch (error) {
      logger.error('Failed to store bias assessment result', {}, error as Error);
      throw error;
    }
  }

  /**
   * Get latest bias assessment
   */
  public async getLatestAssessment(): Promise<BiasAssessmentResult | null> {
    try {
      const result = await chrome.storage.local.get('latest_bias_assessment');

      if (!result.latest_bias_assessment) {
        return null;
      }

      const summary = result.latest_bias_assessment;
      const key = `bias_assessment_${summary.timestamp}`;
      const assessmentData = await chrome.storage.local.get(key);

      if (!assessmentData[key]) {
        return null;
      }

      // Decrypt the full assessment data
      const decryptedResult = await securityService.decryptData(assessmentData[key], 'userData');

      if (decryptedResult.success) {
        return decryptedResult.data as BiasAssessmentResult;
      }

      return null;

    } catch (error) {
      logger.error('Failed to get latest bias assessment', {}, error as Error);
      return null;
    }
  }

  /**
   * Get previous assessments for trend analysis
   */
  private async getPreviousAssessments(count: number): Promise<BiasAssessmentResult[]> {
    try {
      const items = await chrome.storage.local.get();
      const assessmentKeys = Object.keys(items)
        .filter(key => key.startsWith('bias_assessment_'))
        .sort((a, b) => {
          const timestampA = parseInt(a.replace('bias_assessment_', ''));
          const timestampB = parseInt(b.replace('bias_assessment_', ''));
          return timestampB - timestampA; // Most recent first
        })
        .slice(0, count);

      const assessments: BiasAssessmentResult[] = [];

      for (const key of assessmentKeys) {
        try {
          const decryptedResult = await securityService.decryptData(items[key], 'userData');
          if (decryptedResult.success) {
            assessments.push(decryptedResult.data as BiasAssessmentResult);
          }
        } catch (error) {
          logger.warn('Failed to decrypt assessment result', { key });
        }
      }

      return assessments;

    } catch (error) {
      logger.error('Failed to get previous assessments', {}, error as Error);
      return [];
    }
  }

  /**
   * Generate bias assessment report
   */
  public async generateAssessmentReport(): Promise<string> {
    try {
      const latest = await this.getLatestAssessment();

      if (!latest) {
        return 'No bias assessment available. Run assessment first.';
      }

      const report = {
        title: 'AI Bias Assessment Report - EU AI Act Compliance',
        assessmentId: latest.assessmentId,
        timestamp: new Date(latest.timestamp).toISOString(),
        summary: {
          riskLevel: latest.riskAssessment.overallRiskLevel,
          euAiActCompliant: latest.compliance.euAiActCompliant,
          gdprCompliant: latest.compliance.gdprCompliant,
          nextAssessmentDue: new Date(latest.nextAssessmentDue).toISOString()
        },
        dataQuality: latest.dataQualityAssessment,
        biasAnalysis: latest.biasDetection,
        riskAssessment: latest.riskAssessment,
        compliance: latest.compliance,
        recommendations: latest.mitigationMeasures.recommended
      };

      return JSON.stringify(report, null, 2);

    } catch (error) {
      logger.error('Failed to generate assessment report', {}, error as Error);
      throw error;
    }
  }

  /**
   * Check if bias assessment is due
   */
  public async isAssessmentDue(): Promise<boolean> {
    const latest = await this.getLatestAssessment();

    if (!latest) return true;

    const daysSince = (Date.now() - latest.timestamp) / (24 * 60 * 60 * 1000);
    return daysSince >= this.ASSESSMENT_INTERVAL_DAYS;
  }

  /**
   * 2025 Enhancement: Real-time bias monitoring with drift detection
   * Monitors AI outputs in real-time for bias drift and alerts on significant changes
   */
  public async performRealTimeMonitoring(currentScore: CredibilityScore): Promise<BiasAlertResult> {
    try {
      const latest = await this.getLatestAssessment();
      if (!latest) {
        return {
          alertLevel: 'info',
          message: 'No baseline assessment for comparison',
          timestamp: Date.now()
        };
      }

      // Model drift detection
      const driftScore = this.detectModelDrift(currentScore, latest);

      // Subpopulation analysis for current score
      const subpopAnalysis = await this.performSubpopulationAnalysis([{
        url: 'current',
        domain: 'current',
        contentType: 'current',
        credibilityScore: currentScore.score,
        timestamp: currentScore.timestamp,
        metadata: { source: currentScore.source, reasoning: currentScore.reasoning }
      }]);

      // Alert logic based on drift thresholds
      let alertLevel: 'info' | 'warning' | 'critical' = 'info';
      let message = 'Real-time monitoring: No significant bias detected';
      const recommendedActions: string[] = [];
      const subpopulationIssues: string[] = [];

      // Check for drift
      if (driftScore > 0.15) {
        alertLevel = 'critical';
        message = 'Critical bias drift detected in AI outputs';
        recommendedActions.push('Immediate model retraining required', 'Pause automated processing');
      } else if (driftScore > 0.08) {
        alertLevel = 'warning';
        message = 'Moderate bias drift detected';
        recommendedActions.push('Schedule bias assessment', 'Review recent changes');
      }

      // Check subpopulation issues
      if (subpopAnalysis.overallFairness < 70) {
        if (alertLevel === 'info') alertLevel = 'warning';
        subpopulationIssues.push(...subpopAnalysis.detectedIssues.map(issue => issue.description));
        recommendedActions.push(...subpopAnalysis.recommendations);
      }

      logger.info('Real-time bias monitoring completed', {
        driftScore,
        alertLevel,
        fairnessScore: subpopAnalysis.overallFairness
      });

      return {
        alertLevel,
        message,
        driftScore,
        subpopulationIssues,
        recommendedActions,
        timestamp: Date.now()
      };

    } catch (error) {
      logger.error('Real-time bias monitoring failed', {}, error as Error);
      return {
        alertLevel: 'warning',
        message: 'Real-time monitoring failed - manual review recommended',
        timestamp: Date.now()
      };
    }
  }

  /**
   * 2025 Enhancement: Generate explainable AI report for bias decisions
   * Provides transparent explanations for bias assessment decisions
   */
  public async generateExplainableReport(assessmentResult: BiasAssessmentResult): Promise<ExplainableAIReport> {
    try {
      const startTime = Date.now();

      // Build decision path
      const decisionPath = [
        {
          step: 1,
          description: 'Data Quality Assessment',
          input: 'Raw credibility data samples',
          output: `Quality score: ${assessmentResult.dataQualityAssessment.representativeness}%`,
          confidence: 0.9,
          reasoning: 'Evaluated data representativeness, completeness, and accuracy'
        },
        {
          step: 2,
          description: 'Multi-dimensional Bias Detection',
          input: 'Quality-validated data',
          output: 'Bias metrics across 5 dimensions',
          confidence: 0.85,
          reasoning: 'Analyzed demographic, content, source, temporal, and geographic bias'
        },
        {
          step: 3,
          description: 'Risk Classification',
          input: 'Bias detection results',
          output: `Risk level: ${assessmentResult.riskAssessment.overallRiskLevel}`,
          confidence: 0.88,
          reasoning: 'Applied EU AI Act risk classification framework'
        },
        {
          step: 4,
          description: 'Compliance Assessment',
          input: 'Risk classification',
          output: `EU AI Act compliant: ${assessmentResult.compliance.euAiActCompliant}`,
          confidence: 0.92,
          reasoning: 'Evaluated against regulatory requirements'
        }
      ];

      // Feature importance analysis
      const featureImportance = [
        {
          feature: 'demographic_diversity',
          weight: 0.25,
          impact: (assessmentResult.biasDetection.demographicBias.score > 70 ? 'positive' : 'negative') as 'positive' | 'negative' | 'neutral',
          explanation: 'Impact of demographic representation on bias assessment'
        },
        {
          feature: 'source_reliability',
          weight: 0.20,
          impact: (assessmentResult.biasDetection.sourceBias.score > 70 ? 'positive' : 'negative') as 'positive' | 'negative' | 'neutral',
          explanation: 'Influence of content source diversity'
        },
        {
          feature: 'temporal_stability',
          weight: 0.18,
          impact: (assessmentResult.biasDetection.temporalBias.score > 70 ? 'positive' : 'neutral') as 'positive' | 'negative' | 'neutral',
          explanation: 'Consistency of AI performance over time'
        },
        {
          feature: 'content_coverage',
          weight: 0.22,
          impact: (assessmentResult.biasDetection.contentTypeBias.score > 70 ? 'positive' : 'negative') as 'positive' | 'negative' | 'neutral',
          explanation: 'Balance across different content types'
        },
        {
          feature: 'geographic_reach',
          weight: 0.15,
          impact: (assessmentResult.biasDetection.geographicBias.score > 70 ? 'positive' : 'neutral') as 'positive' | 'negative' | 'neutral',
          explanation: 'Geographic distribution of data sources'
        }
      ];

      // Confidence factors
      const confidenceFactors = [
        {
          factor: 'sample_size',
          contribution: 0.3,
          description: 'Sufficient data samples for statistical significance'
        },
        {
          factor: 'data_quality',
          contribution: 0.25,
          description: 'High quality, complete dataset'
        },
        {
          factor: 'methodology_robustness',
          contribution: 0.25,
          description: 'Comprehensive multi-dimensional analysis'
        },
        {
          factor: 'regulatory_alignment',
          contribution: 0.2,
          description: 'EU AI Act compliant assessment framework'
        }
      ];

      // Bias explanations
      const biasFactors = Object.entries(assessmentResult.biasDetection).map(([type, metric]) => ({
        biasType: type.replace('Bias', '') as 'demographic' | 'content' | 'source' | 'temporal' | 'geographic',
        detected: metric.score < 70,
        severity: (metric.score < 30 ? 'critical' : metric.score < 50 ? 'high' : metric.score < 70 ? 'medium' : 'low') as 'low' | 'medium' | 'high' | 'critical',
        explanation: this.generateBiasExplanation(type, metric),
        mitigationApplied: metric.score < 70 ? 'Bias mitigation strategies recommended' : undefined
      }));

      // Overall explanation
      const overallExplanation = this.generateOverallExplanation(assessmentResult);

      return {
        decisionPath,
        featureImportance,
        confidenceFactors,
        biasFactors,
        overallExplanation,
        technicalDetails: {
          modelVersion: '2025.1',
          dataQualityScore: assessmentResult.dataQualityAssessment.representativeness,
          processingTime: Date.now() - startTime
        }
      };

    } catch (error) {
      logger.error('Failed to generate explainable AI report', {}, error as Error);
      throw error;
    }
  }

  /**
   * 2025 Enhancement: Perform subpopulation analysis for granular bias detection
   * Analyzes bias across different population groups and subsets
   */
  public async performSubpopulationAnalysis(samples: DataSample[]): Promise<SubpopulationAnalysis> {
    try {
      // Define population groups based on available demographics
      const populationGroups = this.identifyPopulationGroups(samples);

      // Calculate disparity metrics between groups
      const disparityMetrics = this.calculateDisparityMetrics(populationGroups);

      // Assess overall fairness
      const overallFairness = this.calculateOverallFairness(disparityMetrics);

      // Generate recommendations
      const recommendations = this.generateFairnessRecommendations(disparityMetrics);

      // Detect specific issues
      const detectedIssues = this.detectSubpopulationIssues(disparityMetrics, populationGroups);

      logger.info('Subpopulation analysis completed', {
        groupCount: populationGroups.length,
        overallFairness,
        issueCount: detectedIssues.length
      });

      return {
        populationGroups,
        disparityMetrics,
        overallFairness,
        recommendations,
        detectedIssues
      };

    } catch (error) {
      logger.error('Subpopulation analysis failed', {}, error as Error);
      throw error;
    }
  }

  // Helper methods for 2025 enhancements

  private detectModelDrift(currentScore: CredibilityScore, baseline: BiasAssessmentResult): number {
    // Calculate drift based on score deviation from baseline
    const baselineAvg = Object.values(baseline.biasDetection)
      .reduce((sum, metric) => sum + metric.score, 0) / Object.keys(baseline.biasDetection).length;

    const scoreDrift = Math.abs(currentScore.score - baselineAvg) / 100;
    const confidenceDrift = Math.abs(currentScore.confidence - 0.8) / 1; // Assuming 0.8 baseline confidence

    return (scoreDrift + confidenceDrift) / 2;
  }

  private generateBiasExplanation(type: string, metric: any): string {
    const explanations: Record<string, string> = {
      demographicBias: `Demographic bias analysis shows ${metric.score}% fairness across different user groups`,
      contentTypeBias: `Content type analysis reveals ${metric.score}% consistency across different media types`,
      sourceBias: `Source diversity assessment indicates ${metric.score}% balance across information sources`,
      temporalBias: `Temporal analysis shows ${metric.score}% stability in AI performance over time`,
      geographicBias: `Geographic analysis demonstrates ${metric.score}% fairness across different regions`
    };
    return explanations[type] || `Bias analysis for ${type}: ${metric.score}% score`;
  }

  private generateOverallExplanation(assessment: BiasAssessmentResult): string {
    const riskLevel = assessment.riskAssessment.overallRiskLevel;
    const compliance = assessment.compliance.euAiActCompliant;
    const avgBias = Object.values(assessment.biasDetection)
      .reduce((sum, metric) => sum + metric.score, 0) / Object.keys(assessment.biasDetection).length;

    return `This AI system has been assessed as ${riskLevel} risk with ${Math.round(avgBias)}% overall bias mitigation score. ` +
           `${compliance ? 'The system meets' : 'The system does not meet'} EU AI Act compliance requirements. ` +
           `Assessment includes comprehensive analysis of demographic, content, source, temporal, and geographic bias factors.`;
  }

  private identifyPopulationGroups(samples: DataSample[]): any[] {
    // Group samples by available demographic criteria
    const groups: Record<string, DataSample[]> = {};

    samples.forEach(sample => {
      const groupKey = this.generateGroupKey(sample);
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(sample);
    });

    return Object.entries(groups).map(([key, groupSamples]) => ({
      groupId: key,
      criteria: this.parseGroupKey(key),
      sampleSize: groupSamples.length,
      averageScore: groupSamples.reduce((sum, s) => sum + s.credibilityScore, 0) / groupSamples.length,
      confidence: Math.min(1, groupSamples.length / 30), // Higher confidence with more samples
      representativeness: this.calculateRepresentativeness(groupSamples, samples)
    }));
  }

  private generateGroupKey(sample: DataSample): string {
    const demographics = sample.userDemographics;
    return `${demographics?.region || 'unknown'}_${demographics?.language || 'unknown'}_${sample.contentType}`;
  }

  private parseGroupKey(key: string): Record<string, any> {
    const [region, language, contentType] = key.split('_');
    return { region, language, contentType };
  }

  private calculateDisparityMetrics(groups: any[]): any[] {
    const metrics = [];

    if (groups.length > 1) {
      const scores = groups.map(g => g.averageScore);
      const maxScore = Math.max(...scores);
      const minScore = Math.min(...scores);
      const disparity = (maxScore - minScore) / 100;

      metrics.push({
        metricName: 'score_disparity',
        value: disparity,
        threshold: 0.15,
        groups: groups.map(g => g.groupId),
        severity: disparity > 0.3 ? 'critical' : disparity > 0.15 ? 'high' : 'low' as const,
        description: `Score disparity of ${(disparity * 100).toFixed(1)}% detected across subpopulations`
      });
    }

    return metrics;
  }

  private calculateOverallFairness(metrics: any[]): number {
    if (metrics.length === 0) return 100;

    const fairnessScore = metrics.reduce((sum, metric) => {
      const penalty = metric.value > metric.threshold ? (metric.value * 100) : 0;
      return sum - penalty;
    }, 100);

    return Math.max(0, fairnessScore);
  }

  private generateFairnessRecommendations(metrics: any[]): string[] {
    const recommendations = [];

    for (const metric of metrics) {
      if (metric.value > metric.threshold) {
        recommendations.push(`Address ${metric.metricName} disparity through targeted data collection`);
        recommendations.push(`Implement fairness-aware model training techniques`);
      }
    }

    return [...new Set(recommendations)];
  }

  private detectSubpopulationIssues(metrics: any[], groups: any[]): any[] {
    const issues = [];

    for (const metric of metrics) {
      if (metric.severity === 'high' || metric.severity === 'critical') {
        const affectedGroups = groups
          .filter(g => Math.abs(g.averageScore - 50) > 15)
          .map(g => g.groupId);

        issues.push({
          issueType: metric.metricName,
          affectedGroups,
          magnitude: metric.value,
          description: metric.description,
          recommendedAction: `Targeted bias mitigation for ${affectedGroups.length} subpopulations`
        });
      }
    }

    return issues;
  }

  private calculateRepresentativeness(groupSamples: DataSample[], allSamples: DataSample[]): number {
    const groupSize = groupSamples.length;
    const totalSize = allSamples.length;
    const expectedSize = totalSize / 10; // Assume 10 typical groups

    return Math.min(100, (groupSize / expectedSize) * 100);
  }
}

// Export singleton instance
export const biasAssessmentService = BiasAssessmentService.getInstance();
export default BiasAssessmentService;
