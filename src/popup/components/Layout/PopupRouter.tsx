import React, { useState, useEffect } from 'react';
import { MainView } from '../Views/MainView';
import { SettingsView } from '../Views/SettingsView';
import { StatisticsView } from '../Views/StatisticsView';
import { AccountView } from '../Views/AccountView';
import { PremiumView } from '../Views/PremiumView';
import { HelpView } from '../Views/HelpView';
import { WelcomeScreen } from '../Onboarding/WelcomeScreen';
import { PermissionFlow } from '../Onboarding/PermissionFlow';
import { QuickSetupWizard } from '../Onboarding/QuickSetupWizard';
import { storageService } from '@shared/storage/storageService';

// Navigation types
export type PopupView = 'main' | 'settings' | 'statistics' | 'account' | 'premium' | 'help' | 'onboarding-welcome' | 'onboarding-permissions' | 'onboarding-setup';

interface PopupRouterProps {
  initialView?: PopupView;
}

export const PopupRouter: React.FC<PopupRouterProps> = ({ initialView = 'main' }) => {
  const [currentView, setCurrentView] = useState<PopupView>(initialView);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);

  useEffect(() => {
    // Check if user needs onboarding on startup
    const checkOnboardingStatus = async () => {
      try {
        const onboardingCompleted = await storageService.get('onboarding_completed');

        if (!onboardingCompleted && initialView === 'main') {
          setCurrentView('onboarding-welcome');
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      } finally {
        setIsCheckingOnboarding(false);
      }
    };

    checkOnboardingStatus();
  }, [initialView]);

  const handleOnboardingComplete = async () => {
    try {
      await storageService.set('onboarding_completed', true);
      setCurrentView('main');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setCurrentView('main'); // Fallback to main view
    }
  };

  if (isCheckingOnboarding) {
    return (
      <div className="popup-router loading">
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Loading TruthLens...</p>
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'main':
        return <MainView onNavigate={setCurrentView} />;
      case 'settings':
        return <SettingsView onNavigate={setCurrentView} />;
      case 'statistics':
        return <StatisticsView onNavigate={setCurrentView} />;
      case 'account':
        return <AccountView onNavigate={setCurrentView} />;
      case 'premium':
        return <PremiumView onNavigate={setCurrentView} />;
      case 'help':
        return <HelpView onNavigate={setCurrentView} />;
      case 'onboarding-welcome':
        return (
          <WelcomeScreen
            onNavigate={setCurrentView}
            onComplete={handleOnboardingComplete}
          />
        );
      case 'onboarding-permissions':
        return (
          <PermissionFlow
            onNavigate={setCurrentView}
            onComplete={handleOnboardingComplete}
            onBack={() => setCurrentView('onboarding-welcome')}
          />
        );
      case 'onboarding-setup':
        return (
          <QuickSetupWizard
            onNavigate={setCurrentView}
            onComplete={handleOnboardingComplete}
            onBack={() => setCurrentView('onboarding-permissions')}
          />
        );
      default:
        return <MainView onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="popup-router">
      {renderView()}
    </div>
  );
};
