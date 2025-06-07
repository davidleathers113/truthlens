/**
 * Gen Z Testing Framework - Type Definitions
 * Comprehensive TypeScript types for Gen Z user testing framework
 * Following 2025 best practices for attention tracking and engagement measurement
 */

// Core attention tracking types
export interface AttentionMetrics {
  sessionId: string;
  userId?: string;
  startTime: number;
  endTime?: number;
  totalEngagementTime: number;
  initialAttentionWindow: number; // Time to first meaningful interaction (target: <8s)
  deepEngagementThreshold: number; // Time spent beyond initial attention
  taskSwitchingEvents: TaskSwitchEvent[];
  scrollMetrics: ScrollMetrics;
  interactionMetrics: InteractionMetrics;
  visibilityMetrics: VisibilityMetrics;
  abandonmentReason?: AbandonmentReason;
}

export interface TaskSwitchEvent {
  timestamp: number;
  type: 'tab_switch' | 'window_focus_lost' | 'device_change' | 'scroll_away';
  duration: number; // Duration away from content
  returnEngagement?: number; // Engagement level upon return (0-1)
}

export interface ScrollMetrics {
  totalScrollDepth: number; // Percentage of page scrolled
  maxScrollDepth: number;
  scrollSpeed: number; // Average pixels per second
  scrollPatterns: ScrollPattern[];
  readingTime: number; // Estimated time actually reading vs scrolling
}

export interface ScrollPattern {
  timestamp: number;
  direction: 'up' | 'down';
  speed: number;
  duration: number;
  depth: number; // Scroll position as percentage
}

export interface InteractionMetrics {
  clicks: ClickEvent[];
  hovers: HoverEvent[];
  keyboardEvents: KeyboardEvent[];
  touchEvents: TouchEvent[]; // Mobile-specific
  formInteractions: FormInteraction[];
  mediaInteractions: MediaInteraction[];
}

export interface ClickEvent {
  timestamp: number;
  element: string; // CSS selector or description
  coordinates: { x: number; y: number };
  isIntentional: boolean; // Detected intent vs accidental
}

export interface HoverEvent {
  timestamp: number;
  element: string;
  duration: number;
  coordinates: { x: number; y: number };
}

export interface FormInteraction {
  timestamp: number;
  fieldType: string;
  timeToComplete: number;
  abandonedField: boolean;
}

export interface MediaInteraction {
  timestamp: number;
  mediaType: 'video' | 'audio' | 'image';
  action: 'play' | 'pause' | 'seek' | 'volume_change' | 'fullscreen';
  engagementDuration: number;
}

export interface VisibilityMetrics {
  elementVisibilities: ElementVisibility[];
  attentionHeatmap: AttentionPoint[];
  viewportChanges: ViewportChange[];
}

export interface ElementVisibility {
  element: string;
  firstVisibleTime: number;
  totalVisibleTime: number;
  visibilityPercentage: number; // How much of element was visible (0-1)
  maxVisibilityDuration: number; // Longest continuous visibility
  attentionScore: number; // Calculated attention score (0-1)
}

export interface AttentionPoint {
  x: number;
  y: number;
  intensity: number; // Attention intensity (0-1)
  duration: number; // Time spent at this point
  confidence: number; // AI model confidence (0-1)
}

export interface ViewportChange {
  timestamp: number;
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
  deviceType: DeviceType;
}

// Mobile-first testing types
export interface MobileMetrics {
  deviceInfo: DeviceInfo;
  touchPatterns: TouchPattern[];
  gestureRecognition: GestureEvent[];
  orientationChanges: OrientationChange[];
  networkConditions: NetworkCondition[];
  batteryImpact: BatteryMetrics;
}

export interface DeviceInfo {
  userAgent: string;
  screenSize: { width: number; height: number };
  pixelRatio: number;
  touchCapabilities: boolean;
  orientationSupport: boolean;
  deviceType: DeviceType;
}

export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'unknown';

export interface TouchPattern {
  timestamp: number;
  type: 'tap' | 'double_tap' | 'swipe' | 'pinch' | 'drag';
  startPoint: { x: number; y: number };
  endPoint?: { x: number; y: number };
  duration: number;
  pressure?: number;
  velocity?: number;
  isGenZTypical: boolean; // Matches Gen Z interaction patterns
}

export interface GestureEvent {
  timestamp: number;
  gesture: 'swipe_left' | 'swipe_right' | 'swipe_up' | 'swipe_down' |
           'pinch_zoom_in' | 'pinch_zoom_out' | 'rotate' | 'three_finger_tap';
  efficiency: number; // How efficient the gesture was (0-1)
  confidence: number; // Recognition confidence (0-1)
}

export interface OrientationChange {
  timestamp: number;
  from: 'portrait' | 'landscape';
  to: 'portrait' | 'landscape';
  adaptationTime: number; // Time to adapt to new orientation
}

export interface NetworkCondition {
  timestamp: number;
  type: '4g' | '5g' | 'wifi' | 'slow' | 'offline';
  speed: number; // Mbps
  latency: number; // ms
}

export interface BatteryMetrics {
  initialLevel: number;
  finalLevel: number;
  drainRate: number; // Percentage per minute
  impactScore: number; // Impact on battery (0-1)
}

// Preference collection types
export interface PreferenceData {
  userId: string;
  demographics: Demographics;
  preferences: UserPreferences;
  feedbackHistory: FeedbackEntry[];
  sentimentAnalysis: SentimentData;
}

export interface Demographics {
  ageRange: '13-17' | '18-22' | '23-27' | 'other';
  location?: string;
  devicePreference: 'mobile' | 'desktop' | 'both';
  primaryPlatforms: SocialPlatform[];
}

export type SocialPlatform = 'tiktok' | 'instagram' | 'snapchat' | 'youtube' |
                            'discord' | 'twitch' | 'reddit' | 'other';

export interface UserPreferences {
  contentLength: 'short' | 'medium' | 'long' | 'mixed';
  visualStyle: 'minimal' | 'colorful' | 'dark' | 'animated';
  interactionStyle: 'touch' | 'click' | 'keyboard' | 'voice';
  feedbackMethod: 'emoji' | 'text' | 'voice' | 'video';
  notificationPreference: 'immediate' | 'batched' | 'minimal' | 'off';
}

export interface FeedbackEntry {
  timestamp: number;
  type: 'emoji' | 'text' | 'rating' | 'video';
  content: string | number;
  context: string; // What was being tested
  sentiment: number; // -1 to 1
}

export interface SentimentData {
  overallSentiment: number; // -1 to 1
  topicSentiments: Record<string, number>;
  languagePatterns: string[]; // Detected Gen Z language patterns
  authenticity: number; // How authentic the feedback seems (0-1)
}

// A/B Testing types
export interface ABTestConfig {
  testId: string;
  name: string;
  description: string;
  variants: TestVariant[];
  targetAudience: AudienceFilter;
  duration: number; // Test duration in milliseconds
  sampleSize: number;
  successMetrics: string[];
  createdAt: number;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
}

export interface TestVariant {
  id: string;
  name: string;
  description: string;
  weight: number; // 0-1, allocation percentage
  config: Record<string, any>; // Variant-specific configuration
  isControl: boolean;
}

export interface AudienceFilter {
  ageRanges: string[];
  deviceTypes: DeviceType[];
  platforms: SocialPlatform[];
  engagementLevel: 'low' | 'medium' | 'high' | 'any';
  previousBehavior?: string[];
}

export interface ABTestResult {
  testId: string;
  variantId: string;
  userId: string;
  sessionId: string;
  metrics: Record<string, number>;
  conversionEvents: ConversionEvent[];
  timestamp: number;
}

export interface ConversionEvent {
  type: string;
  timestamp: number;
  value?: number;
  metadata?: Record<string, any>;
}

// Analytics and dashboard types
export interface AnalyticsDashboardData {
  overview: OverviewMetrics;
  cohortAnalysis: CohortData[];
  trendAnalysis: TrendData[];
  recommendations: Recommendation[];
  realTimeMetrics: RealTimeMetrics;
}

export interface OverviewMetrics {
  totalSessions: number;
  averageEngagementTime: number;
  attentionRetentionRate: number; // Percentage maintaining 8s+ attention
  taskSwitchingFrequency: number;
  mobileVsDesktopRatio: number;
  conversionRate: number;
}

export interface CohortData {
  cohortId: string;
  name: string;
  demographics: Demographics;
  metrics: OverviewMetrics;
  behaviorPatterns: string[];
  preferences: UserPreferences;
}

export interface TrendData {
  metric: string;
  timeframe: 'hour' | 'day' | 'week' | 'month';
  dataPoints: { timestamp: number; value: number }[];
  trend: 'increasing' | 'decreasing' | 'stable';
  confidence: number;
}

export interface Recommendation {
  id: string;
  type: 'ui_change' | 'content_optimization' | 'interaction_improvement' |
        'attention_enhancement' | 'mobile_optimization';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  expectedImpact: number; // Expected improvement (0-1)
  confidence: number; // Confidence in recommendation (0-1)
  implementation: string; // How to implement
  basedOn: string[]; // Which metrics/patterns this is based on
}

export interface RealTimeMetrics {
  activeSessions: number;
  currentAttentionScore: number;
  liveEngagementRate: number;
  activeABTests: ABTestConfig[];
  recentFeedback: FeedbackEntry[];
}

// Configuration and consent types
export interface TestingConfig {
  environment: 'development' | 'staging' | 'production';
  enabledModules: TestingModule[];
  samplingRate: number; // 0-1, percentage of users to test
  privacySettings: PrivacySettings;
  integrationSettings: IntegrationSettings;
}

export type TestingModule = 'attention' | 'mobile' | 'preferences' |
                           'ab_testing' | 'analytics' | 'heatmaps';

export interface PrivacySettings {
  requireExplicitConsent: boolean;
  dataRetentionDays: number;
  anonymizeData: boolean;
  allowDataExport: boolean;
  respectDoNotTrack: boolean;
  minimizeDataCollection: boolean;
}

export interface IntegrationSettings {
  analyticsService?: string;
  storageService: string;
  contentScriptIntegration: boolean;
  popupIntegration: boolean;
  backgroundScriptIntegration: boolean;
}

export interface ConsentData {
  userId: string;
  timestamp: number;
  consentGiven: boolean;
  consentVersion: string;
  modules: TestingModule[];
  dataRetentionAgreed: boolean;
  canWithdraw: boolean;
}

// Error and event types
export interface TestingError {
  timestamp: number;
  module: TestingModule;
  error: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
}

export interface TestingEvent {
  type: string;
  timestamp: number;
  data: Record<string, any>;
  userId?: string;
  sessionId: string;
}

// Abandonment tracking
export type AbandonmentReason =
  | 'attention_lost'           // Lost interest after <8 seconds
  | 'task_switching'          // Switched to another task/tab
  | 'content_too_long'        // Content exceeded attention span
  | 'loading_too_slow'        // Page/content loaded too slowly
  | 'interface_confusing'     // UI/UX was confusing
  | 'mobile_unfriendly'       // Poor mobile experience
  | 'low_relevance'           // Content not relevant to user
  | 'technical_error'         // Technical issues encountered
  | 'external_interruption'   // Phone call, notification, etc.
  | 'natural_completion'      // User completed their intended task
  | 'unknown';

// Export utility types
export interface GenZTestingFramework {
  attentionModule: any; // Will be defined when implementing the class
  mobileModule: any;
  preferencesModule: any;
  abTestingModule: any;
  analyticsModule: any;
  configurationModule: any;
}
