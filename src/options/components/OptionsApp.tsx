import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { GeneralSettings } from './sections/GeneralSettings';
import { PrivacySettings } from './sections/PrivacySettings';
import { AppearanceSettings } from './sections/AppearanceSettings';
import { AdvancedSettings } from './sections/AdvancedSettings';

export type SettingsSection = 'general' | 'privacy' | 'appearance' | 'advanced';

interface OptionsAppProps {}

export const OptionsApp: React.FC<OptionsAppProps> = () => {
  const [currentSection, setCurrentSection] = useState<SettingsSection>('general');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Responsive sidebar handling
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Simulate loading state
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const renderCurrentSection = () => {
    switch (currentSection) {
      case 'general':
        return <GeneralSettings />;
      case 'privacy':
        return <PrivacySettings />;
      case 'appearance':
        return <AppearanceSettings />;
      case 'advanced':
        return <AdvancedSettings />;
      default:
        return <GeneralSettings />;
    }
  };

  if (isLoading) {
    return (
      <div className="options-loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`options-app ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Header />

      <div className="options-layout">
        <Sidebar
          currentSection={currentSection}
          onSectionChange={setCurrentSection}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        <main className="options-main" role="main">
          <div className="options-content">
            {renderCurrentSection()}
          </div>
        </main>
      </div>
    </div>
  );
};
