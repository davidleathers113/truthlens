/**
 * Help System Types - 2025 Implementation
 *
 * Types for contextual help, tooltips, and feature discovery tours
 * Following Gen Z UX patterns and 2025 best practices
 */

// Tooltip Configuration
export interface TooltipConfig {
  id: string;
  trigger: 'hover' | 'click' | 'focus' | 'auto';
  position: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  theme: 'light' | 'dark' | 'auto';
  priority: 'low' | 'medium' | 'high';
  maxWidth?: number;
  delay?: number; // ms
  duration?: number; // ms for auto-dismiss
  arrow?: boolean;
  animation?: 'fade' | 'slide' | 'bounce' | 'none';
}

export interface TooltipContent {
  title?: string;
  text: string;
  emoji?: string; // Gen Z enhancement
  action?: TooltipAction;
  learnMore?: {
    text: string;
    url: string;
  };
  dismissible?: boolean;
  showOnce?: boolean; // Only show first time
}

export interface TooltipAction {
  label: string;
  onClick: () => void;
  style?: 'primary' | 'secondary' | 'text';
}

export interface Tooltip extends TooltipConfig, TooltipContent {
  target: string; // CSS selector or element ID
  conditions?: TooltipCondition[];
  tracking?: {
    viewed: boolean;
    viewedAt?: number;
    dismissed: boolean;
    dismissedAt?: number;
    actionTaken: boolean;
  };
}

export interface TooltipCondition {
  type: 'first_visit' | 'feature_enabled' | 'user_type' | 'time_based' | 'usage_count';
  value?: any;
  operator?: 'equals' | 'greater_than' | 'less_than' | 'contains';
}

// Feature Discovery Tours
export interface FeatureTour {
  id: string;
  name: string;
  description: string;
  emoji: string; // Gen Z visual identifier
  category: 'onboarding' | 'feature_discovery' | 'advanced' | 'troubleshooting';
  targetAudience: 'new_user' | 'existing_user' | 'premium_user' | 'all';
  estimatedTime: number; // seconds
  steps: TourStep[];
  prerequisites?: string[]; // Required tour IDs
  isRequired: boolean;
  priority: number; // 1-10, higher = more important
}

export interface TourStep {
  id: string;
  title: string;
  content: string;
  emoji?: string;
  target?: string; // CSS selector or element ID
  action?: TourStepAction;
  position?: 'center' | 'overlay' | 'beside';
  media?: TourMedia;
  duration?: number; // auto-advance after X seconds
  skippable: boolean;
  validation?: TourStepValidation;
}

export interface TourStepAction {
  type: 'highlight' | 'click' | 'input' | 'wait' | 'navigate';
  target?: string;
  value?: any;
  required: boolean;
  helpText?: string;
}

export interface TourMedia {
  type: 'image' | 'gif' | 'video' | 'interactive';
  url: string;
  alt: string;
  thumbnail?: string;
}

export interface TourStepValidation {
  type: 'element_exists' | 'value_changed' | 'action_completed' | 'custom';
  target?: string;
  validator?: () => boolean;
  errorMessage?: string;
}

// Tour Progress Tracking
export interface TourProgress {
  tourId: string;
  userId?: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped' | 'abandoned';
  currentStep: number;
  completedSteps: string[];
  startedAt: number;
  completedAt?: number;
  timeSpent: number; // milliseconds
  abandonedAt?: number;
  abandonReason?: 'manual_skip' | 'timeout' | 'error' | 'other';
}

// FAQ System
export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  emoji?: string; // Visual category identifier
  helpfulness: number; // User ratings 1-5
  lastUpdated: number;
  relatedItems?: string[]; // Related FAQ IDs
  searchTerms?: string[]; // Additional search keywords
}

export interface FAQCategory {
  id: string;
  name: string;
  description: string;
  emoji: string;
  items: FAQItem[];
  priority: number;
}

// Quick Start Guide
export interface QuickStartGuide {
  id: string;
  title: string;
  description: string;
  emoji: string;
  estimatedTime: number; // seconds
  steps: QuickStartStep[];
  targetAudience: 'new_user' | 'returning_user' | 'advanced_user';
  category: 'getting_started' | 'features' | 'troubleshooting' | 'advanced';
}

export interface QuickStartStep {
  id: string;
  title: string;
  content: string;
  media?: {
    type: 'screenshot' | 'gif' | 'video';
    url: string;
    alt: string;
  };
  action?: {
    label: string;
    type: 'button' | 'link' | 'demo';
    target?: string;
  };
  completable: boolean;
  estimatedTime: number; // seconds
}

// Help Context
export interface HelpContext {
  currentPage: string;
  userType: 'new' | 'existing' | 'premium' | 'enterprise';
  lastActive: number;
  completedTours: string[];
  viewedTooltips: string[];
  preferences: HelpPreferences;
  engagement: HelpEngagement;
}

export interface HelpPreferences {
  showTooltips: boolean;
  enableTours: boolean;
  autoplayMedia: boolean;
  preferredPosition: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  dismissedCategories: string[];
  language: string;
  reducedMotion: boolean;
}

export interface HelpEngagement {
  totalTooltipsViewed: number;
  totalToursCompleted: number;
  totalFAQsViewed: number;
  helpfulnessRating: number; // Average 1-5
  lastHelpInteraction: number;
  preferredHelpType: 'tooltip' | 'tour' | 'faq' | 'guide' | 'video';
}

// Help Analytics
export interface HelpAnalytics {
  event: 'tooltip_viewed' | 'tooltip_dismissed' | 'tour_started' | 'tour_completed' |
         'tour_abandoned' | 'faq_viewed' | 'guide_accessed' | 'help_search';
  properties: {
    itemId: string;
    category?: string;
    timeSpent?: number;
    completed?: boolean;
    userType?: string;
    context?: string;
    searchQuery?: string;
    resultCount?: number;
  };
  timestamp: number;
  sessionId: string;
}

// Search and Discovery
export interface HelpSearchResult {
  type: 'tooltip' | 'tour' | 'faq' | 'guide' | 'video';
  id: string;
  title: string;
  content: string;
  category: string;
  relevanceScore: number; // 0-1
  emoji?: string;
  estimatedTime?: number;
  matchedTerms: string[];
}

export interface HelpSearchQuery {
  query: string;
  filters?: {
    type?: string[];
    category?: string[];
    difficulty?: string[];
    estimatedTime?: { min?: number; max?: number };
  };
  limit?: number;
  offset?: number;
}

// Gen Z Specific Enhancements
export interface GenZHelpFeatures {
  emojiCategories: Record<string, string>; // category -> emoji mapping
  quickActions: GenZQuickAction[];
  trendingHelp: string[]; // Popular help item IDs
  personalizedSuggestions: string[]; // Suggested help item IDs based on behavior
}

export interface GenZQuickAction {
  id: string;
  label: string;
  emoji: string;
  action: () => void;
  category: string;
  popular: boolean; // Trending among Gen Z users
}

// Accessibility Features
export interface AccessibilityHelpFeatures {
  screenReaderSupport: boolean;
  highContrastMode: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  keyboardNavigation: boolean;
  voiceCommands?: boolean;
  translations: Record<string, string>; // language code -> translation
}

// Complete Help System State
export interface HelpSystemState {
  tooltips: Tooltip[];
  tours: FeatureTour[];
  faqs: FAQCategory[];
  guides: QuickStartGuide[];
  context: HelpContext;
  searchIndex: HelpSearchResult[];
  genZFeatures: GenZHelpFeatures;
  accessibility: AccessibilityHelpFeatures;
  isLoading: boolean;
  error?: string;
}
