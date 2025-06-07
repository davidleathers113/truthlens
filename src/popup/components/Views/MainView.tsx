import React from 'react';
import { PopupView } from '../Layout/PopupRouter';
import { Header } from '../Header';
import { CredibilityCard } from '../CredibilityCard';
import { StatusIndicator } from '../StatusIndicator';
import { QuickActions } from '../QuickActions';
import { PremiumPromo } from '../Premium/PremiumPromo';
import { Footer } from '../Footer';
import { SmartUpgradePrompts } from '../SmartUpgradePrompts';
import { LifecycleNotifications } from '../LifecycleNotifications';
import { useExtension } from '../../contexts/ExtensionContext';
import { useSubscription } from '../../hooks/useStorage';
import { HelpButton } from '@shared/components';

interface MainViewProps {
  onNavigate: (view: PopupView) => void;
}

export const MainView: React.FC<MainViewProps> = ({ onNavigate }) => {
  const { state } = useExtension();
  const [subscription] = useSubscription();

  if (state.loading) {
    return (
      <div className="main-view loading" role="main" aria-live="polite" aria-label="Loading analysis">
        <Header />
        <div className="loading-container">
          <div
            className="loading-spinner"
            role="status"
            aria-label="Analyzing current page"
            aria-hidden="false"
          />
          <p id="loading-message" aria-live="polite">
            Analyzing current page...
          </p>
          <span className="sr-only">
            Please wait while TruthLens analyzes the current page for credibility information.
          </span>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="main-view error" role="main" aria-labelledby="error-heading">
        <Header />
        <div className="error-container" role="alert">
          <h2 id="error-heading" className="error-heading sr-only">
            Analysis Error
          </h2>
          <p className="error-message" aria-describedby="error-description">
            {state.error}
          </p>
          <div id="error-description" className="sr-only">
            An error occurred while analyzing the current page. You can try again by clicking the retry button.
          </div>
          <button
            onClick={() => window.location.reload()}
            className="retry-button"
            aria-label="Retry page analysis"
            type="button"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="main-view">
      <Header />

      <main className="main-content">
        <LifecycleNotifications onNavigate={onNavigate} />

        <StatusIndicator />

        <CredibilityCard
          url={state.currentTab?.url || ''}
          credibility={state.credibility}
        />

        <QuickActions onNavigate={onNavigate} />

        {subscription.tier === 'free' && (
          <PremiumPromo onUpgrade={() => onNavigate('premium')} />
        )}
      </main>

      <Footer />

      {/* Context-aware help button - 2025 implementation */}
      <HelpButton
        position="fixed"
        variant="primary"
        size="medium"
        showLabel={false}
        context={{
          currentPage: 'main',
          userType: subscription.tier === 'free' ? 'new' : 'intermediate',
          deviceType: window.innerWidth < 768 ? 'mobile' : 'desktop',
          sessionTime: Date.now(),
          helpInteractions: 0,
          preferredHelpType: 'interactive'
        }}
        onContextUpdate={(updates) => {
          console.log('Help context updated:', updates);
        }}
        className="main-view__help-button"
        ariaLabel="Get help and support for TruthLens features"
      />

      {/* Smart upgrade prompts overlay */}
      <SmartUpgradePrompts
        onUpgrade={() => onNavigate('premium')}
        onPromptDisplayed={(promptId) => console.log('Prompt displayed:', promptId)}
        onPromptDismissed={(promptId) => console.log('Prompt dismissed:', promptId)}
        onPromptConverted={(promptId) => console.log('Prompt converted:', promptId)}
      />
    </div>
  );
};
