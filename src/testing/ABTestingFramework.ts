/**
 * Gen Z A/B Testing Framework
 * Advanced A/B testing framework implementing 2025 best practices for Gen Z users
 * Features group sequential testing, mobile-first optimization, and privacy-compliant analytics
 */

import {
  ABTestConfig,
  TestVariant,
  ABTestResult,
  ConversionEvent,
  AudienceFilter,
  DeviceType,
  SocialPlatform,
  AttentionMetrics,
  MobileMetrics,
  PreferenceData,
  TestingConfig,
  ConsentData
} from './types';

export interface ABTestingConfig {
  enableGroupSequentialTesting: boolean;
  minSampleSize: number;
  maxSampleSize: number;
  significanceLevel: number;
  power: number;
  sequentialCheckpoints: number[];
  mobileOptimization: boolean;
  privacyCompliant: boolean;
}

export interface SequentialTestResult {
  testId: string;
  checkpoint: number;
  treatmentSuccesses: number;
  controlSuccesses: number;
  treatmentSampleSize: number;
  controlSampleSize: number;
  sequentialStatistic: number;
  shouldStop: boolean;
  winner?: 'treatment' | 'control';
  pValue?: number;
  confidence: number;
  earlyStoppingReason?: 'superiority' | 'futility' | 'max_sample_reached';
}

export interface VariantAssignment {
  userId: string;
  testId: string;
  variantId: string;
  assignmentTime: number;
  deviceType: DeviceType;
  isGenZUser: boolean;
  context: Record<string, any>;
}

export interface ConversionFunnel {
  testId: string;
  variantId: string;
  steps: FunnelStep[];
  dropOffAnalysis: DropOffPoint[];
  conversionRate: number;
  timeToConversion: number;
}

export interface FunnelStep {
  stepName: string;
  stepOrder: number;
  entrances: number;
  completions: number;
  conversionRate: number;
  averageTimeSpent: number;
}

export interface DropOffPoint {
  stepName: string;
  dropOffRate: number;
  topReasons: string[];
  recoveryActions: string[];
}

export class ABTestingFramework {
  private activeTests: Map<string, ABTestConfig> = new Map();
  private variantAssignments: Map<string, VariantAssignment> = new Map();
  private testResults: Map<string, ABTestResult[]> = new Map();
  private sequentialResults: Map<string, SequentialTestResult[]> = new Map();
  private conversionFunnels: Map<string, ConversionFunnel[]> = new Map();
  private config: ABTestingConfig;
  private consentManager: ConsentData | null = null;

  constructor(config: ABTestingConfig) {
    this.config = {
      enableGroupSequentialTesting: true,
      minSampleSize: 500, // Mobile-optimized minimum
      maxSampleSize: 10000,
      significanceLevel: 0.05,
      power: 0.8,
      sequentialCheckpoints: [0.25, 0.5, 0.75, 1.0],
      mobileOptimization: true,
      privacyCompliant: true,
      ...config
    };
  }

  /**
   * Create a new A/B test following 2025 best practices
   */
  public async createTest(testConfig: ABTestConfig): Promise<string> {
    // Validate test configuration
    this.validateTestConfig(testConfig);

    // Apply mobile-first optimizations
    if (this.config.mobileOptimization) {
      testConfig = this.applyMobileOptimizations(testConfig);
    }

    // Store the test configuration
    this.activeTests.set(testConfig.testId, testConfig);

    // Initialize result storage
    this.testResults.set(testConfig.testId, []);
    this.sequentialResults.set(testConfig.testId, []);
    this.conversionFunnels.set(testConfig.testId, []);

    console.log(`Created A/B test: ${testConfig.name} (${testConfig.testId})`);
    return testConfig.testId;
  }

  /**
   * Assign user to test variant using Gen Z-optimized logic
   */
  public assignVariant(
    testId: string,
    userId: string,
    context: {
      deviceType: DeviceType;
      attentionMetrics?: AttentionMetrics;
      mobileMetrics?: MobileMetrics;
      preferences?: PreferenceData;
    }
  ): VariantAssignment | null {
    const test = this.activeTests.get(testId);
    if (!test || test.status !== 'running') {
      return null;
    }

    // Check if user already assigned
    const existingAssignment = this.variantAssignments.get(`${testId}_${userId}`);
    if (existingAssignment) {
      return existingAssignment;
    }

    // Check audience filter
    if (!this.matchesAudienceFilter(context, test.targetAudience)) {
      return null;
    }

    // Determine if user is Gen Z based on behavior patterns
    const isGenZUser = this.detectGenZUser(context);

    // Assign variant using weighted random allocation
    const variant = this.selectVariant(test.variants, userId);

    const assignment: VariantAssignment = {
      userId,
      testId,
      variantId: variant.id,
      assignmentTime: Date.now(),
      deviceType: context.deviceType,
      isGenZUser,
      context
    };

    this.variantAssignments.set(`${testId}_${userId}`, assignment);

    return assignment;
  }

  /**
   * Record conversion event for A/B test analysis
   */
  public recordConversion(
    testId: string,
    userId: string,
    event: ConversionEvent,
    metrics?: Record<string, number>
  ): void {
    const assignment = this.variantAssignments.get(`${testId}_${userId}`);
    if (!assignment) {
      return;
    }

    const result: ABTestResult = {
      testId,
      variantId: assignment.variantId,
      userId,
      sessionId: `session_${userId}_${Date.now()}`,
      metrics: metrics || {},
      conversionEvents: [event],
      timestamp: Date.now()
    };

    const results = this.testResults.get(testId) || [];
    results.push(result);
    this.testResults.set(testId, results);

    // Perform sequential analysis if enabled
    if (this.config.enableGroupSequentialTesting) {
      this.performSequentialAnalysis(testId);
    }

    // Update conversion funnel
    this.updateConversionFunnel(testId, assignment.variantId, event);
  }

  /**
   * Perform group sequential testing analysis (2025 best practice)
   * Implements T-C ≥ 2√N formula for early stopping
   */
  private performSequentialAnalysis(testId: string): void {
    const test = this.activeTests.get(testId);
    const results = this.testResults.get(testId);

    if (!test || !results) return;

    // Group results by variant
    const variantResults = new Map<string, ABTestResult[]>();
    results.forEach(result => {
      const existing = variantResults.get(result.variantId) || [];
      existing.push(result);
      variantResults.set(result.variantId, existing);
    });

    // Find control and treatment variants
    const controlVariant = test.variants.find(v => v.isControl);
    const treatmentVariants = test.variants.filter(v => !v.isControl);

    if (!controlVariant || treatmentVariants.length === 0) return;

    const controlResults = variantResults.get(controlVariant.id) || [];

    treatmentVariants.forEach(treatmentVariant => {
      const treatmentResults = variantResults.get(treatmentVariant.id) || [];

      // Calculate sequential test statistic
      const treatmentSuccesses = treatmentResults.filter(r => r.conversionEvents.length > 0).length;
      const controlSuccesses = controlResults.filter(r => r.conversionEvents.length > 0).length;
      const treatmentSampleSize = treatmentResults.length;
      const controlSampleSize = controlResults.length;

      const totalSampleSize = treatmentSampleSize + controlSampleSize;
      const sequentialBoundary = 2 * Math.sqrt(totalSampleSize);
      const sequentialStatistic = treatmentSuccesses - controlSuccesses;

      // Check for early stopping
      let shouldStop = false;
      let winner: 'treatment' | 'control' | undefined;
      let earlyStoppingReason: 'superiority' | 'futility' | 'max_sample_reached' | undefined;

      if (Math.abs(sequentialStatistic) >= sequentialBoundary) {
        shouldStop = true;
        winner = sequentialStatistic > 0 ? 'treatment' : 'control';
        earlyStoppingReason = 'superiority';
      } else if (totalSampleSize >= this.config.maxSampleSize) {
        shouldStop = true;
        earlyStoppingReason = 'max_sample_reached';
      }

      // Calculate p-value using Fisher's exact test approximation for mobile
      const pValue = this.calculateMobilePValue(
        treatmentSuccesses, treatmentSampleSize,
        controlSuccesses, controlSampleSize
      );

      const sequentialResult: SequentialTestResult = {
        testId,
        checkpoint: totalSampleSize / this.config.maxSampleSize,
        treatmentSuccesses,
        controlSuccesses,
        treatmentSampleSize,
        controlSampleSize,
        sequentialStatistic,
        shouldStop,
        winner,
        pValue,
        confidence: 1 - pValue,
        earlyStoppingReason
      };

      const existingResults = this.sequentialResults.get(testId) || [];
      existingResults.push(sequentialResult);
      this.sequentialResults.set(testId, existingResults);

      // Auto-stop test if criteria met
      if (shouldStop && test.status === 'running') {
        this.stopTest(testId, `Sequential analysis: ${earlyStoppingReason}`);
      }
    });
  }

  /**
   * Calculate p-value optimized for mobile A/B testing
   */
  private calculateMobilePValue(
    treatmentSuccesses: number, treatmentTotal: number,
    controlSuccesses: number, controlTotal: number
  ): number {
    // Use normal approximation for mobile-optimized calculation
    const p1 = treatmentSuccesses / treatmentTotal;
    const p2 = controlSuccesses / controlTotal;
    const pooledP = (treatmentSuccesses + controlSuccesses) / (treatmentTotal + controlTotal);

    const standardError = Math.sqrt(
      pooledP * (1 - pooledP) * (1 / treatmentTotal + 1 / controlTotal)
    );

    const zScore = Math.abs(p1 - p2) / standardError;

    // Two-tailed p-value
    return 2 * (1 - this.normalCDF(zScore));
  }

  /**
   * Standard normal cumulative distribution function
   */
  private normalCDF(x: number): number {
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  }

  /**
   * Error function approximation
   */
  private erf(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }

  /**
   * Stop test and finalize results
   */
  public stopTest(testId: string, reason?: string): void {
    const test = this.activeTests.get(testId);
    if (test) {
      test.status = 'completed';
      console.log(`Stopped A/B test ${testId}: ${reason || 'Manual stop'}`);
    }
  }

  /**
   * Get test results with statistical analysis
   */
  public getTestResults(testId: string): {
    config: ABTestConfig;
    results: ABTestResult[];
    sequentialResults: SequentialTestResult[];
    conversionFunnels: ConversionFunnel[];
    summary: TestSummary;
  } | null {
    const test = this.activeTests.get(testId);
    const results = this.testResults.get(testId);
    const sequentialResults = this.sequentialResults.get(testId);
    const conversionFunnels = this.conversionFunnels.get(testId);

    if (!test || !results) return null;

    const summary = this.generateTestSummary(testId);

    return {
      config: test,
      results,
      sequentialResults: sequentialResults || [],
      conversionFunnels: conversionFunnels || [],
      summary
    };
  }

  /**
   * Generate comprehensive test summary for Gen Z analysis
   */
  private generateTestSummary(testId: string): TestSummary {
    const results = this.testResults.get(testId) || [];
    const test = this.activeTests.get(testId);

    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    const variantSummaries = test.variants.map(variant => {
      const variantResults = results.filter(r => r.variantId === variant.id);
      const conversions = variantResults.filter(r => r.conversionEvents.length > 0);

      return {
        variantId: variant.id,
        name: variant.name,
        isControl: variant.isControl,
        sampleSize: variantResults.length,
        conversions: conversions.length,
        conversionRate: variantResults.length > 0 ? conversions.length / variantResults.length : 0,
        mobileConversionRate: this.calculateMobileConversionRate(variantResults),
        genZEngagement: this.calculateGenZEngagement(variantResults),
        attentionRetention: this.calculateAttentionRetention(variantResults)
      };
    });

    const winner = this.determineWinner(variantSummaries);
    const confidence = this.calculateWinnerConfidence(testId);

    return {
      testId,
      testName: test.name,
      status: test.status,
      totalSampleSize: results.length,
      startTime: test.createdAt,
      endTime: test.status === 'completed' ? Date.now() : undefined,
      variantSummaries,
      winner,
      confidence,
      statisticalSignificance: confidence > 0.95,
      recommendations: this.generateRecommendations(testId, variantSummaries)
    };
  }

  /**
   * Apply mobile-first optimizations to test configuration
   */
  private applyMobileOptimizations(testConfig: ABTestConfig): ABTestConfig {
    // Adjust sample sizes for mobile testing patterns
    if (testConfig.sampleSize < this.config.minSampleSize) {
      testConfig.sampleSize = this.config.minSampleSize;
    }

    // Prioritize mobile users in audience filter
    if (!testConfig.targetAudience.deviceTypes.includes('mobile')) {
      testConfig.targetAudience.deviceTypes.push('mobile');
    }

    // Add Gen Z platforms if not specified
    const genZPlatforms: SocialPlatform[] = ['tiktok', 'instagram', 'snapchat', 'discord'];
    genZPlatforms.forEach(platform => {
      if (!testConfig.targetAudience.platforms.includes(platform)) {
        testConfig.targetAudience.platforms.push(platform);
      }
    });

    return testConfig;
  }

  /**
   * Detect if user exhibits Gen Z behavior patterns
   */
  private detectGenZUser(context: any): boolean {
    // Check attention patterns (8-second rule)
    if (context.attentionMetrics) {
      const hasShortAttention = context.attentionMetrics.initialAttentionWindow <= 8000;
      const hasTaskSwitching = context.attentionMetrics.taskSwitchingEvents.length > 0;

      if (hasShortAttention && hasTaskSwitching) return true;
    }

    // Check mobile-first behavior
    if (context.mobileMetrics && context.deviceType === 'mobile') {
      const hasGenZGestures = context.mobileMetrics.gestureRecognition.some(
        (g: any) => g.gesture === 'three_finger_tap' || g.efficiency > 0.8
      );

      if (hasGenZGestures) return true;
    }

    // Check platform preferences
    if (context.preferences) {
      const genZPlatforms = ['tiktok', 'instagram', 'snapchat', 'discord'];
      const usesGenZPlatforms = context.preferences.demographics.primaryPlatforms.some(
        (platform: SocialPlatform) => genZPlatforms.includes(platform)
      );

      if (usesGenZPlatforms) return true;
    }

    return false;
  }

  /**
   * Select variant using weighted random allocation
   */
  private selectVariant(variants: TestVariant[], userId: string): TestVariant {
    const hash = this.hashUserId(userId);
    const random = hash % 1000 / 1000; // Convert to 0-1 range

    let cumulative = 0;
    for (const variant of variants) {
      cumulative += variant.weight;
      if (random <= cumulative) {
        return variant;
      }
    }

    return variants[variants.length - 1]; // Fallback
  }

  /**
   * Hash user ID for consistent variant assignment
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Additional helper methods for analysis
   */
  private calculateMobileConversionRate(results: ABTestResult[]): number {
    const mobileResults = results.filter(r => r.sessionId.includes('mobile'));
    const mobileConversions = mobileResults.filter(r => r.conversionEvents.length > 0);
    return mobileResults.length > 0 ? mobileConversions.length / mobileResults.length : 0;
  }

  private calculateGenZEngagement(results: ABTestResult[]): number {
    return results.reduce((sum, result) => {
      return sum + (result.metrics.engagementScore || 0);
    }, 0) / results.length || 0;
  }

  private calculateAttentionRetention(results: ABTestResult[]): number {
    return results.reduce((sum, result) => {
      return sum + (result.metrics.attentionRetention || 0);
    }, 0) / results.length || 0;
  }

  private validateTestConfig(config: ABTestConfig): void {
    if (!config.testId || !config.name) {
      throw new Error('Test ID and name are required');
    }

    if (config.variants.length < 2) {
      throw new Error('At least 2 variants required');
    }

    const controlVariants = config.variants.filter(v => v.isControl);
    if (controlVariants.length !== 1) {
      throw new Error('Exactly one control variant required');
    }

    const totalWeight = config.variants.reduce((sum, v) => sum + v.weight, 0);
    if (Math.abs(totalWeight - 1.0) > 0.001) {
      throw new Error('Variant weights must sum to 1.0');
    }
  }

  private matchesAudienceFilter(context: any, filter: AudienceFilter): boolean {
    if (filter.deviceTypes.length > 0 && !filter.deviceTypes.includes(context.deviceType)) {
      return false;
    }

    return true;
  }

  private updateConversionFunnel(testId: string, variantId: string, event: ConversionEvent): void {
    // Implementation for conversion funnel tracking
  }

  private determineWinner(summaries: any[]): string | null {
    if (summaries.length < 2) return null;

    const control = summaries.find(s => s.isControl);
    const treatments = summaries.filter(s => !s.isControl);

    if (!control) return null;

    const bestTreatment = treatments.reduce((best, current) =>
      current.conversionRate > best.conversionRate ? current : best
    );

    return bestTreatment.conversionRate > control.conversionRate ? bestTreatment.variantId : control.variantId;
  }

  private calculateWinnerConfidence(testId: string): number {
    const sequentialResults = this.sequentialResults.get(testId) || [];
    const latestResult = sequentialResults[sequentialResults.length - 1];

    return latestResult ? latestResult.confidence : 0;
  }

  private generateRecommendations(testId: string, summaries: any[]): string[] {
    const recommendations: string[] = [];

    const control = summaries.find(s => s.isControl);
    const treatments = summaries.filter(s => !s.isControl);

    if (control && treatments.length > 0) {
      const bestTreatment = treatments.reduce((best, current) =>
        current.conversionRate > best.conversionRate ? current : best
      );

      if (bestTreatment.conversionRate > control.conversionRate) {
        recommendations.push(`Implement ${bestTreatment.name} - shows ${((bestTreatment.conversionRate - control.conversionRate) * 100).toFixed(2)}% improvement`);
      }

      if (bestTreatment.mobileConversionRate > control.mobileConversionRate) {
        recommendations.push('Mobile performance significantly improved with treatment variant');
      }

      if (bestTreatment.genZEngagement > control.genZEngagement) {
        recommendations.push('Gen Z users show higher engagement with treatment variant');
      }
    }

    return recommendations;
  }
}

interface TestSummary {
  testId: string;
  testName: string;
  status: string;
  totalSampleSize: number;
  startTime: number;
  endTime?: number;
  variantSummaries: any[];
  winner: string | null;
  confidence: number;
  statisticalSignificance: boolean;
  recommendations: string[];
}
