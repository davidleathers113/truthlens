/**
 * Popup Components Index
 * Central export point for all popup components
 */

// Main application components
export { PopupApp } from './PopupApp';
export { Header } from './Header';
export { Footer } from './Footer';

// Action components
export { ActionButtons } from './ActionButtons';
export { QuickActions } from './QuickActions';
export { StatusIndicator } from './StatusIndicator';

// Content components
export { CredibilityCard } from './CredibilityCard';

// Layout components
export { PopupRouter } from './Layout/PopupRouter';
export { ResponsiveContainer } from './Layout/ResponsiveContainer';

// View components
export { AccountView } from './Views/AccountView';
export { MainView } from './Views/MainView';
export { PremiumView } from './Views/PremiumView';
export { SettingsView } from './Views/SettingsView';
export { StatisticsView } from './Views/StatisticsView';

// Premium/Subscription components
export { PremiumPromo } from './Premium/PremiumPromo';
export {
  PremiumFeatureIndicator,
  PremiumFeatureList,
  type PremiumFeature
} from './PremiumFeatureIndicator';
export { SubscriptionStatusBadge } from './SubscriptionStatusBadge';
export { SubscriptionSummary } from './SubscriptionSummary';
export { UsageCounter } from './UsageCounter';

// Upgrade prompt components
export {
  UpgradePrompt,
  UpgradePromptManager
} from './UpgradePrompt';
export {
  SmartUpgradePrompts,
  FeatureGatedUpgradePrompt,
  UpgradePromptAnalytics,
  useManualUpgradePrompts
} from './SmartUpgradePrompts';

// Analytics components
export { FeedbackAnalyticsDashboard } from './Analytics/FeedbackAnalyticsDashboard';

// Community consensus components
export { CommunityConsensusPanel } from './CommunityConsensus/CommunityConsensusPanel';
