/**
 * Advanced Bias Detection Types
 * Following 2025 responsible AI standards for bias detection and analysis
 */

export interface BiasAlertResult {
  alertLevel: 'info' | 'warning' | 'critical';
  message: string;
  driftScore?: number;
  subpopulationIssues?: string[];
  recommendedActions?: string[];
  timestamp: number;
}

export interface ExplainableAIReport {
  decisionPath: Array<{
    step: number;
    description: string;
    input: string;
    output: string;
    confidence: number;
    reasoning: string;
  }>;
  featureImportance: Array<{
    feature: string;
    weight: number;
    impact: 'positive' | 'negative' | 'neutral';
    explanation: string;
  }>;
  confidenceFactors: Array<{
    factor: string;
    contribution: number;
    description: string;
  }>;
  biasFactors: Array<{
    biasType: 'demographic' | 'content' | 'source' | 'temporal' | 'geographic';
    detected: boolean;
    severity: 'low' | 'medium' | 'high' | 'critical';
    explanation: string;
    mitigationApplied?: string;
  }>;
  overallExplanation: string;
  technicalDetails: {
    modelVersion: string;
    dataQualityScore: number;
    processingTime: number;
  };
}

export interface SubpopulationAnalysis {
  populationGroups: Array<{
    groupId: string;
    criteria: Record<string, any>;
    sampleSize: number;
    averageScore: number;
    confidence: number;
    representativeness: number;
  }>;
  disparityMetrics: Array<{
    metricName: string;
    value: number;
    threshold: number;
    groups: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }>;
  overallFairness: number;
  recommendations: string[];
  detectedIssues: Array<{
    issueType: string;
    affectedGroups: string[];
    magnitude: number;
    description: string;
    recommendedAction: string;
  }>;
}

export interface PoliticalBiasVisualization {
  spectrumPosition: {
    x: number; // -10 to +10 political spectrum
    y: number; // 0-100 confidence
    label: string;
    color: string;
  };
  comparisonSources: Array<{
    name: string;
    position: number;
    reliability: number;
  }>;
  biasFactorChart: {
    language: number;
    framing: number;
    sourceSelection: number;
    topicEmphasis: number;
    factualAccuracy: number;
  };
  confidenceIndicator: {
    level: number;
    factors: string[];
  };
}

export interface BiasEducationData {
  detectedBiasTypes: string[];
  explanations: Record<string, {
    definition: string;
    examples: string[];
    howToIdentify: string[];
    whyItMatters: string;
  }>;
  mediaLiteracyTips: string[];
  balancedSourceSuggestions: Array<{
    name: string;
    url: string;
    reason: string;
    reliability: number;
  }>;
  interactiveElements: {
    quizQuestions?: Array<{
      question: string;
      options: string[];
      correctAnswer: number;
      explanation: string;
    }>;
    comparisonExercises?: Array<{
      scenario: string;
      sources: Array<{
        title: string;
        excerpt: string;
        bias: string;
      }>;
    }>;
  };
}

export interface BiasRiskAssessment {
  overallRisk: 'minimal' | 'low' | 'moderate' | 'high' | 'severe';
  riskFactors: Array<{
    factor: string;
    severity: number;
    description: string;
    mitigation: string;
  }>;
  manipulationIndicators: {
    emotional: number;
    logical: number;
    social: number;
  };
  credibilityImpact: {
    score: number;
    reasoning: string;
  };
  recommendedActions: string[];
}

export interface BiasDetectionConfig {
  enablePoliticalAnalysis: boolean;
  enableEmotionalAnalysis: boolean;
  enableSourceAnalysis: boolean;
  sensitivityLevel: 'low' | 'medium' | 'high';
  educationalFocus: boolean;
  visualizationPreferences: {
    showSpectrum: boolean;
    showComparisons: boolean;
    showConfidence: boolean;
    showEducationalContent: boolean;
  };
  privacySettings: {
    storeAnalysisHistory: boolean;
    anonymizeData: boolean;
    shareForResearch: boolean;
  };
}

export interface BiasDetectionMetrics {
  totalAnalyses: number;
  accuracyScore: number;
  userSatisfaction: number;
  educationalEffectiveness: number;
  biasTypesDetected: Record<string, number>;
  performanceMetrics: {
    averageProcessingTime: number;
    successRate: number;
    errorRate: number;
  };
}

// Advanced Bias Detection Result Interface
export interface AdvancedBiasDetectionResult {
  politicalAnalysis: PoliticalBiasAnalysis;
  emotionalAnalysis: EmotionalAnalysis;
  sourceBiasProfile: SourceBiasProfile | null;
  visualizationData: BiasVisualizationData;
  educationalContent: BiasEducationContent[];
  recommendations: {
    alternativeSources: SourceBiasProfile[];
    balancingPerspectives: string[];
    mediaLiteracyGuidance: string[];
  };
  riskAssessment: {
    manipulationRisk: 'low' | 'medium' | 'high';
    misinformationRisk: 'low' | 'medium' | 'high';
    polarizationRisk: 'low' | 'medium' | 'high';
  };
  premiumFeatureAccess: boolean;
  processingTime: number;
}

export interface PoliticalBiasAnalysis {
  leaningScore: number; // -10 (far left) to +10 (far right), 0 = center
  confidence: number; // 0-1 confidence level
  category: 'far-left' | 'left' | 'center-left' | 'center' | 'center-right' | 'right' | 'far-right';
  indicators: BiasIndicator[];
  explanation: string;
  timestamp: number;
}

export interface EmotionalAnalysis {
  emotionalIntensity: number; // 0-100, higher = more emotionally charged
  emotionalType: 'neutral' | 'fear' | 'anger' | 'hope' | 'excitement' | 'sadness';
  chargedLanguage: string[]; // List of emotionally charged words/phrases
  framingTechniques: FramingTechnique[];
  confidence: number;
}

export interface FramingTechnique {
  type: 'loaded-terms' | 'selective-emphasis' | 'false-dichotomy' | 'emotional-appeal' | 'strawman' | 'bandwagon';
  evidence: string[];
  severity: 'low' | 'medium' | 'high';
  explanation: string;
}

export interface BiasIndicator {
  type: 'language' | 'framing' | 'source-attribution' | 'topic-selection' | 'fact-presentation';
  description: string;
  evidence: string[];
  weight: number; // 0-1, contribution to overall bias score
  direction: 'left' | 'right' | 'neutral';
}

export interface SourceBiasProfile {
  domain: string;
  historicalLean: number; // -10 to +10
  reliabilityScore: number; // 0-100
  factualReporting: 'very-high' | 'high' | 'mostly-factual' | 'mixed' | 'low' | 'very-low';
  biasConsistency: number; // 0-1, how consistent the bias is
  mediaType: 'mainstream' | 'alternative' | 'blog' | 'social' | 'academic' | 'government';
  lastUpdated: number;
}

export interface BiasVisualizationData {
  politicalSpectrum: {
    position: number; // -10 to +10
    confidence: number;
    comparison: {
      similarSources: SourceBiasProfile[];
      averagePosition: number;
    };
  };
  biasFactors: {
    language: number;
    framing: number;
    sourceAttribution: number;
    topicSelection: number;
    factPresentation: number;
  };
  historicalTrend?: {
    sourceHistory: Array<{ date: number; lean: number }>;
    trendDirection: 'stable' | 'moving-left' | 'moving-right';
  };
}

export interface BiasEducationContent {
  biasType: string;
  explanation: string;
  whyItMatters: string;
  howToIdentify: string[];
  mediaLiteracyTips: string[];
  balancedSources: string[];
}
