import React, { useState } from 'react';
import { MainView } from '../Views/MainView';
import { SettingsView } from '../Views/SettingsView';
import { StatisticsView } from '../Views/StatisticsView';
import { AccountView } from '../Views/AccountView';
import { PremiumView } from '../Views/PremiumView';

// Navigation types
export type PopupView = 'main' | 'settings' | 'statistics' | 'account' | 'premium';

interface PopupRouterProps {
  initialView?: PopupView;
}

export const PopupRouter: React.FC<PopupRouterProps> = ({ initialView = 'main' }) => {
  const [currentView, setCurrentView] = useState<PopupView>(initialView);

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
