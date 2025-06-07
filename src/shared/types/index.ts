// TruthLens Core Types

// Performance monitoring types (2025 implementation)
export * from '../performance/types';

// Error handling and logging types (2025 implementation)
export * from './error';

export interface CredibilityScore {
  score: number; // 0-100
  level: 'high' | 'medium' | 'low' | 'unknown';
  confidence: number; // 0-1
  reasoning?: string;
  source: 'ai' | 'api' | 'fallback' | 'domain-reputation';
  timestamp: number;
}

export interface SourceAnalysis {
  domain: string;
  credibility: CredibilityScore;
  bias?: BiasAnalysis;
  factualReporting?: FactualReportingLevel;
  details?: SourceDetails;
}

export interface BiasAnalysis {
  level: 'least' | 'left-center' | 'left' | 'center' | 'right-center' | 'right' | 'extreme';
  confidence: number;
  indicators: string[];
}

export type FactualReportingLevel = 'very-high' | 'high' | 'mostly-factual' | 'mixed' | 'low' | 'very-low';

export interface SourceDetails {
  ownership?: string;
  country?: string;
  mediaType?: string;
  founded?: number;
  notes?: string;
}

export interface ContentAnalysis {
  url: string;
  title?: string;
  content?: string;
  type: 'article' | 'social-post' | 'video' | 'other';
  platform?: SocialPlatform;
  analysis: SourceAnalysis;
  relatedClaims?: ClaimAnalysis[];
}

export type SocialPlatform = 'twitter' | 'facebook' | 'instagram' | 'tiktok' | 'youtube' | 'reddit' | 'linkedin';

export interface ClaimAnalysis {
  claim: string;
  verdict: 'true' | 'mostly-true' | 'half-true' | 'mostly-false' | 'false' | 'unverifiable';
  explanation?: string;
  sources?: string[];
}

// User Settings Types
export interface UserSettings {
  enabled: boolean;
  showVisualIndicators: boolean;
  indicatorPosition: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  factCheckingLevel: 'basic' | 'standard' | 'thorough';
  autoAnalyze: boolean;
  trustedDomains: string[];
  blockedDomains: string[];
  theme: 'light' | 'dark' | 'auto';
  notifications: NotificationSettings;
  privacy: PrivacySettings;
}

export interface NotificationSettings {
  enabled: boolean;
  lowCredibilityAlert: boolean;
  factCheckComplete: boolean;
}

export interface PrivacySettings {
  analyticsEnabled: boolean;
  localProcessingOnly: boolean;
  cacheDuration: number; // hours
}

// Message Types for Extension Communication
export interface ExtensionMessage {
  type: MessageType;
  payload?: any;
  tabId?: number;
  timestamp?: number;
}

export type MessageType =
  | 'ANALYZE_PAGE'
  | 'ANALYZE_CONTENT'
  | 'GET_CREDIBILITY'
  | 'UPDATE_SETTINGS'
  | 'CREDIBILITY_UPDATE'
  | 'ERROR'
  | 'CLEAR_CACHE';

// Analytics Types
export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp: number;
  sessionId?: string;
  userId?: string;
}

export interface PerformanceMetrics {
  responseTime: number;
  memoryUsage: number;
  cpuUsage?: number;
  networkLatency?: number;
  cacheHitRate: number;
  errorRate: number;
  timestamp: number;
}

export interface BusinessMetrics {
  dailyActiveUsers: number;
  monthlyActiveUsers: number;
  retentionRate: number;
  conversionRate: number;
  avgSessionDuration: number;
  featureUsageRate: Record<string, number>;
  timestamp: number;
}

export interface UserEngagementMetrics {
  sessionCount: number;
  sessionDuration: number;
  pagesAnalyzed: number;
  credibilityChecksPerformed: number;
  settingsChanged: number;
  notificationsInteracted: number;
  timestamp: number;
}

export interface ABTestExperiment {
  id: string;
  name: string;
  variants: ABTestVariant[];
  allocation: Record<string, number>;
  startDate: number;
  endDate?: number;
  status: 'active' | 'paused' | 'completed';
  targetMetric: string;
  statisticalSignificance?: number;
}

export interface ABTestVariant {
  id: string;
  name: string;
  description: string;
  configuration: Record<string, any>;
  trafficAllocation: number;
}

export interface ABTestAssignment {
  experimentId: string;
  variantId: string;
  userId: string;
  assignedAt: number;
}

export interface ConsentData {
  analyticsConsent: boolean;
  performanceConsent: boolean;
  abTestingConsent: boolean;
  aiProcessingConsent: boolean;
  consentTimestamp: number;
  consentVersion: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AnalyticsConfig {
  enabled: boolean;
  consentRequired: boolean;
  localProcessingOnly: boolean;
  aggregationInterval: number; // minutes
  retentionPeriod: number; // days
  privacyLevel: 'minimal' | 'standard' | 'detailed';
  endpoints: {
    events: string;
    performance: string;
    business: string;
  };
}

export interface DashboardData {
  overview: {
    totalUsers: number;
    activeUsers: number;
    conversionRate: number;
    retentionRate: number;
  };
  performance: {
    avgResponseTime: number;
    errorRate: number;
    memoryUsage: number;
    cacheEfficiency: number;
  };
  business: {
    dauMauRatio: number;
    premiumConversionRate: number;
    genZEngagement: number;
    churnRate: number;
  };
  experiments: ABTestExperiment[];
  timestamp: number;
}

// Subscription Types
export type SubscriptionTier = 'free' | 'premium' | 'enterprise';

export type SubscriptionStatus = 'active' | 'grace_period' | 'expired' | 'free_tier' | 'cancelled';

export interface UserSubscription {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  expiresAt?: number;
  features: string[];
  lastValidated?: number;
  validationInterval?: number; // ms, default 30 days
  gracePeriodStart?: number;
  gracePeriodDuration?: number; // ms, default 30 days
  paymentMethod?: string;
  subscriptionId?: string;
}

export interface SubscriptionValidationResult {
  isValid: boolean;
  status: SubscriptionStatus;
  expiresAt?: number;
  gracePeriodEnd?: number;
  error?: string;
  lastChecked: number;
}

export interface UsageTracker {
  dailyChecks: number;
  lastReset: number; // timestamp of last UTC midnight reset
  totalChecks: number;
  weeklyChecks: number;
  monthlyChecks: number;
}

// 2025 Bias Assessment Enhancement Types
export interface BiasAlertResult {
  alertLevel: 'info' | 'warning' | 'critical';
  message: string;
  driftScore?: number;
  subpopulationIssues?: string[];
  recommendedActions?: string[];
  timestamp: number;
}

export interface ExplainableAIReport {
  decisionPath: DecisionNode[];
  featureImportance: FeatureWeight[];
  confidenceFactors: ConfidenceFactor[];
  biasFactors: BiasExplanation[];
  overallExplanation: string;
  technicalDetails: {
    modelVersion: string;
    dataQualityScore: number;
    processingTime: number;
  };
}

export interface DecisionNode {
  step: number;
  description: string;
  input: string;
  output: string;
  confidence: number;
  reasoning: string;
}

export interface FeatureWeight {
  feature: string;
  weight: number;
  impact: 'positive' | 'negative' | 'neutral';
  explanation: string;
}

export interface ConfidenceFactor {
  factor: string;
  contribution: number;
  description: string;
}

export interface BiasExplanation {
  biasType: 'demographic' | 'content' | 'source' | 'temporal' | 'geographic';
  detected: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  explanation: string;
  mitigationApplied?: string;
}

export interface SubpopulationAnalysis {
  populationGroups: PopulationGroup[];
  disparityMetrics: DisparityMetric[];
  overallFairness: number;
  recommendations: string[];
  detectedIssues: SubpopulationIssue[];
}

export interface PopulationGroup {
  groupId: string;
  criteria: Record<string, any>;
  sampleSize: number;
  averageScore: number;
  confidence: number;
  representativeness: number;
}

export interface DisparityMetric {
  metricName: string;
  value: number;
  threshold: number;
  groups: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export interface SubpopulationIssue {
  issueType: string;
  affectedGroups: string[];
  magnitude: number;
  description: string;
  recommendedAction: string;
}
