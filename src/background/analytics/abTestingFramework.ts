// A/B Testing Framework with Privacy Compliance
// Enables controlled experiments while respecting user privacy

import { ABTestExperiment, ABTestVariant, ABTestAssignment } from '@shared/types';
import { AnalyticsService } from './analyticsService';
import { ConsentManager } from './consentManager';

export class ABTestingFramework {
  private analytics: AnalyticsService;
  private consent: ConsentManager;
  private activeExperiments: Map<string, ABTestExperiment> = new Map();
  private userAssignments: Map<string, ABTestAssignment[]> = new Map();
  private experimentResults: Map<string, any> = new Map();

  constructor(analytics: AnalyticsService, consent: ConsentManager) {
    this.analytics = analytics;
    this.consent = consent;
    this.initialize();
  }

  async initialize(): Promise<void> {
    await this.loadActiveExperiments();
    await this.loadUserAssignments();
    this.setupExperimentCleanup();
  }

  /**
   * Create a new A/B test experiment
   */
  async createExperiment(experiment: Omit<ABTestExperiment, 'id'>): Promise<ABTestExperiment> {
    // Check consent for A/B testing
    const hasConsent = await this.consent.hasConsent('abTesting');
    if (!hasConsent) {
      throw new Error('A/B testing requires user consent');
    }

    const experimentId = this.generateExperimentId();
    const fullExperiment: ABTestExperiment = {
      ...experiment,
      id: experimentId,
      status: 'active'
    };

    this.activeExperiments.set(experimentId, fullExperiment);
    await this.storeExperiment(fullExperiment);

    await this.analytics.trackEvent('experiment_created', {
      experimentId,
      name: experiment.name,
      variantCount: experiment.variants.length,
      targetMetric: experiment.targetMetric
    });

    return fullExperiment;
  }

  /**
   * Assign user to experiment variant with privacy protection
   */
  async assignUserToExperiment(userId: string, experimentId: string): Promise<ABTestAssignment | null> {
    const experiment = this.activeExperiments.get(experimentId);
    if (!experiment || experiment.status !== 'active') {
      return null;
    }

    // Check if user already assigned
    const existingAssignment = this.getUserAssignment(userId, experimentId);
    if (existingAssignment) {
      return existingAssignment;
    }

    // Check consent
    const hasConsent = await this.consent.hasConsent('abTesting');
    if (!hasConsent) {
      return null;
    }

    // Deterministic assignment based on user ID and experiment ID
    const variant = this.assignVariant(userId, experiment);
    
    const assignment: ABTestAssignment = {
      experimentId,
      variantId: variant.id,
      userId: this.anonymizeUserId(userId), // Store anonymized ID only
      assignedAt: Date.now()
    };

    // Store assignment
    if (!this.userAssignments.has(userId)) {
      this.userAssignments.set(userId, []);
    }
    this.userAssignments.get(userId)!.push(assignment);
    
    await this.storeUserAssignment(assignment);

    await this.analytics.trackEvent('experiment_assignment', {
      experimentId,
      variantId: variant.id,
      variantName: variant.name
    });

    return assignment;
  }

  /**
   * Get user's variant for an experiment
   */
  async getUserVariant(userId: string, experimentId: string): Promise<ABTestVariant | null> {
    const assignment = await this.assignUserToExperiment(userId, experimentId);
    if (!assignment) return null;

    const experiment = this.activeExperiments.get(experimentId);
    if (!experiment) return null;

    return experiment.variants.find(v => v.id === assignment.variantId) || null;
  }

  /**
   * Track experiment event (conversion, interaction, etc.)
   */
  async trackExperimentEvent(
    userId: string, 
    experimentId: string, 
    eventType: string, 
    value?: number,
    properties?: Record<string, any>
  ): Promise<void> {
    const assignment = this.getUserAssignment(userId, experimentId);
    if (!assignment) return;

    await this.analytics.trackEvent('experiment_event', {
      experimentId,
      variantId: assignment.variantId,
      eventType,
      value,
      ...properties
    });

    // Update experiment results
    await this.updateExperimentResults(experimentId, assignment.variantId, eventType, value);
  }

  /**
   * Calculate experiment results with statistical significance
   */
  async calculateExperimentResults(experimentId: string): Promise<any> {
    const experiment = this.activeExperiments.get(experimentId);
    if (!experiment) return null;

    const results = this.experimentResults.get(experimentId) || {};
    const variantResults = experiment.variants.map(variant => {
      const variantData = results[variant.id] || { events: 0, conversions: 0, totalValue: 0 };
      return {
        variantId: variant.id,
        name: variant.name,
        participants: variantData.participants || 0,
        events: variantData.events || 0,
        conversions: variantData.conversions || 0,
        conversionRate: variantData.participants > 0 ? variantData.conversions / variantData.participants : 0,
        averageValue: variantData.events > 0 ? variantData.totalValue / variantData.events : 0
      };
    });

    // Calculate statistical significance
    const significance = this.calculateStatisticalSignificance(variantResults);
    
    return {
      experimentId,
      name: experiment.name,
      status: experiment.status,
      startDate: experiment.startDate,
      endDate: experiment.endDate,
      targetMetric: experiment.targetMetric,
      variants: variantResults,
      statisticalSignificance: significance.pValue,
      winner: significance.winner,
      recommendation: this.generateRecommendation(variantResults, significance),
      confidenceInterval: significance.confidenceInterval
    };
  }

  /**
   * End experiment and determine winner
   */
  async endExperiment(experimentId: string): Promise<any> {
    const experiment = this.activeExperiments.get(experimentId);
    if (!experiment) return null;

    experiment.status = 'completed';
    experiment.endDate = Date.now();

    const results = await this.calculateExperimentResults(experimentId);
    
    await this.analytics.trackEvent('experiment_completed', {
      experimentId,
      duration: (experiment.endDate - experiment.startDate) / 1000 / 60 / 60 / 24, // days
      winner: results.winner,
      significance: results.statisticalSignificance
    });

    await this.storeExperiment(experiment);
    return results;
  }

  /**
   * Get all active experiments for a user
   */
  async getActiveExperimentsForUser(userId: string): Promise<ABTestVariant[]> {
    const hasConsent = await this.consent.hasConsent('abTesting');
    if (!hasConsent) return [];

    const variants: ABTestVariant[] = [];
    
    for (const experiment of this.activeExperiments.values()) {
      if (experiment.status === 'active') {
        const variant = await this.getUserVariant(userId, experiment.id);
        if (variant) {
          variants.push(variant);
        }
      }
    }

    return variants;
  }

  /**
   * Create predefined experiments for TruthLens optimization
   */
  async createDefaultExperiments(): Promise<void> {
    const experiments = [
      {
        name: 'Onboarding Flow Optimization',
        variants: [
          {
            id: 'onboarding_control',
            name: 'Current Onboarding',
            description: 'Existing onboarding flow',
            configuration: { flowType: 'current' },
            trafficAllocation: 0.5
          },
          {
            id: 'onboarding_streamlined',
            name: 'Streamlined Onboarding',
            description: 'Simplified 2-step onboarding',
            configuration: { flowType: 'streamlined' },
            trafficAllocation: 0.5
          }
        ],
        allocation: { 'onboarding_control': 0.5, 'onboarding_streamlined': 0.5 },
        startDate: Date.now(),
        targetMetric: 'conversion_rate',
        status: 'active' as const
      },
      {
        name: 'Credibility Indicator Position',
        variants: [
          {
            id: 'indicator_top_right',
            name: 'Top Right Position',
            description: 'Indicators in top-right corner',
            configuration: { position: 'top-right' },
            trafficAllocation: 0.33
          },
          {
            id: 'indicator_top_left',
            name: 'Top Left Position',
            description: 'Indicators in top-left corner',
            configuration: { position: 'top-left' },
            trafficAllocation: 0.33
          },
          {
            id: 'indicator_inline',
            name: 'Inline Position',
            description: 'Indicators inline with content',
            configuration: { position: 'inline' },
            trafficAllocation: 0.34
          }
        ],
        allocation: { 
          'indicator_top_right': 0.33, 
          'indicator_top_left': 0.33, 
          'indicator_inline': 0.34 
        },
        startDate: Date.now(),
        targetMetric: 'engagement_rate',
        status: 'active' as const
      },
      {
        name: 'Premium Feature Messaging',
        variants: [
          {
            id: 'premium_benefits',
            name: 'Benefits-Focused',
            description: 'Emphasize premium benefits',
            configuration: { messageType: 'benefits' },
            trafficAllocation: 0.5
          },
          {
            id: 'premium_urgency',
            name: 'Urgency-Focused',
            description: 'Emphasize limited-time offers',
            configuration: { messageType: 'urgency' },
            trafficAllocation: 0.5
          }
        ],
        allocation: { 'premium_benefits': 0.5, 'premium_urgency': 0.5 },
        startDate: Date.now(),
        targetMetric: 'premium_conversion',
        status: 'active' as const
      }
    ];

    for (const experiment of experiments) {
      try {
        await this.createExperiment(experiment);
      } catch (error) {
        console.error('Failed to create default experiment:', experiment.name, error);
      }
    }
  }

  /**
   * Helper methods
   */
  private assignVariant(userId: string, experiment: ABTestExperiment): ABTestVariant {
    // Deterministic assignment using hash
    const hash = this.hashUserExperiment(userId, experiment.id);
    const normalizedHash = hash / Number.MAX_SAFE_INTEGER;
    
    let cumulativeWeight = 0;
    for (const variant of experiment.variants) {
      cumulativeWeight += variant.trafficAllocation;
      if (normalizedHash <= cumulativeWeight) {
        return variant;
      }
    }
    
    return experiment.variants[0]; // Fallback
  }

  private hashUserExperiment(userId: string, experimentId: string): number {
    const input = userId + experimentId;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private getUserAssignment(userId: string, experimentId: string): ABTestAssignment | null {
    const assignments = this.userAssignments.get(userId) || [];
    return assignments.find(a => a.experimentId === experimentId) || null;
  }

  private async updateExperimentResults(
    experimentId: string, 
    variantId: string, 
    eventType: string, 
    value?: number
  ): Promise<void> {
    if (!this.experimentResults.has(experimentId)) {
      this.experimentResults.set(experimentId, {});
    }

    const results = this.experimentResults.get(experimentId)!;
    if (!results[variantId]) {
      results[variantId] = { 
        participants: 0, 
        events: 0, 
        conversions: 0, 
        totalValue: 0 
      };
    }

    const variantResults = results[variantId];
    variantResults.events++;
    
    if (eventType === 'conversion') {
      variantResults.conversions++;
    }
    
    if (value !== undefined) {
      variantResults.totalValue += value;
    }

    // Store updated results
    const key = `experiment_results_${experimentId}`;
    await chrome.storage.local.set({ [key]: results });
  }

  private calculateStatisticalSignificance(variants: any[]): any {
    if (variants.length < 2) {
      return { pValue: 1, winner: null, confidenceInterval: null };
    }

    // Simplified statistical test (in production, use proper statistical library)
    const control = variants[0];
    const test = variants[1];
    
    if (control.participants === 0 || test.participants === 0) {
      return { pValue: 1, winner: null, confidenceInterval: null };
    }

    // Approximate z-test for conversion rates
    const p1 = control.conversionRate;
    const p2 = test.conversionRate;
    const n1 = control.participants;
    const n2 = test.participants;
    
    const pooledP = (control.conversions + test.conversions) / (n1 + n2);
    const se = Math.sqrt(pooledP * (1 - pooledP) * (1/n1 + 1/n2));
    
    const zScore = se > 0 ? (p2 - p1) / se : 0;
    const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore))); // Two-tailed test
    
    return {
      pValue,
      winner: pValue < 0.05 ? (p2 > p1 ? test.variantId : control.variantId) : null,
      confidenceInterval: {
        lower: (p2 - p1) - 1.96 * se,
        upper: (p2 - p1) + 1.96 * se
      }
    };
  }

  private normalCDF(x: number): number {
    // Approximate normal CDF (for statistical significance calculation)
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  }

  private erf(x: number): number {
    // Approximation of error function
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }

  private generateRecommendation(variants: any[], significance: any): string {
    if (significance.pValue >= 0.05) {
      return 'No statistically significant difference found. Consider running the experiment longer or increasing sample size.';
    }

    if (significance.winner) {
      const winner = variants.find(v => v.variantId === significance.winner);
      return `Variant "${winner.name}" shows statistically significant improvement. Recommend implementing this variant.`;
    }

    return 'Experiment completed but no clear winner identified.';
  }

  private generateExperimentId(): string {
    return `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private anonymizeUserId(userId: string): string {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private async loadActiveExperiments(): Promise<void> {
    const items = await chrome.storage.local.get();
    
    Object.entries(items).forEach(([key, value]) => {
      if (key.startsWith('experiment_')) {
        const experiment = value as ABTestExperiment;
        if (experiment.status === 'active') {
          this.activeExperiments.set(experiment.id, experiment);
        }
      }
    });
  }

  private async loadUserAssignments(): Promise<void> {
    const items = await chrome.storage.local.get();
    
    Object.entries(items).forEach(([key, value]) => {
      if (key.startsWith('assignment_')) {
        const assignment = value as ABTestAssignment;
        if (!this.userAssignments.has(assignment.userId)) {
          this.userAssignments.set(assignment.userId, []);
        }
        this.userAssignments.get(assignment.userId)!.push(assignment);
      }
    });
  }

  private async storeExperiment(experiment: ABTestExperiment): Promise<void> {
    const key = `experiment_${experiment.id}`;
    await chrome.storage.local.set({ [key]: experiment });
  }

  private async storeUserAssignment(assignment: ABTestAssignment): Promise<void> {
    const key = `assignment_${assignment.userId}_${assignment.experimentId}`;
    await chrome.storage.local.set({ [key]: assignment });
  }

  private setupExperimentCleanup(): void {
    // Clean up completed experiments older than 90 days
    setInterval(async () => {
      const cutoffTime = Date.now() - (90 * 24 * 60 * 60 * 1000);
      const items = await chrome.storage.local.get();
      
      const keysToRemove = Object.keys(items).filter(key => {
        if (key.startsWith('experiment_')) {
          const experiment = items[key] as ABTestExperiment;
          return experiment.status === 'completed' && 
                 experiment.endDate && 
                 experiment.endDate < cutoffTime;
        }
        return false;
      });

      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
      }
    }, 24 * 60 * 60 * 1000); // Daily cleanup
  }
}