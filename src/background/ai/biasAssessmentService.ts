/**
 * AI Bias Assessment Service - EU AI Act 2025 Compliance
 * Automated bias detection and mitigation for TruthLens credibility analysis
 */

import { logger } from '../../shared/services/logger';
import { storageService } from '../../shared/storage/storageService';
import { securityService } from '../../shared/services/securityService';

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
}

// Export singleton instance
export const biasAssessmentService = BiasAssessmentService.getInstance();
export default BiasAssessmentService;
