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
  source: 'ai' | 'api' | 'fallback';
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

export interface UserSubscription {
  tier: SubscriptionTier;
  expiresAt?: number;
  features: string[];
}
