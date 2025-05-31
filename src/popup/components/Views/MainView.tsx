import React from 'react';
import { PopupView } from '../Layout/PopupRouter';
import { Header } from '../Header';
import { CredibilityCard } from '../CredibilityCard';
import { StatusIndicator } from '../StatusIndicator';
import { QuickActions } from '../QuickActions';
import { PremiumPromo } from '../Premium/PremiumPromo';
import { Footer } from '../Footer';
import { useExtension } from '../../contexts/ExtensionContext';
import { useSubscription } from '../../hooks/useStorage';

interface MainViewProps {
  onNavigate: (view: PopupView) => void;
}

export const MainView: React.FC<MainViewProps> = ({ onNavigate }) => {
  const { state } = useExtension();
  const [subscription] = useSubscription();

  if (state.loading) {
    return (
      <div className="main-view loading">
        <Header />
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Analyzing current page...</p>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="main-view error">
        <Header />
        <div className="error-container">
          <p className="error-message">{state.error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="main-view">
      <Header />

      <main className="main-content">
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

      <Footer onNavigate={onNavigate} />
    </div>
  );
};
