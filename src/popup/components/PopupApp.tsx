import React, { useState, useEffect } from 'react';
import { CredibilityScore, UserSettings } from '@shared/types';
import { Header } from './Header';
import { CredibilityCard } from './CredibilityCard';
import { ActionButtons } from './ActionButtons';
import { Footer } from './Footer';

export const PopupApp: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<chrome.tabs.Tab | null>(null);
  const [credibility, setCredibility] = useState<CredibilityScore | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCurrentTabInfo();
    loadSettings();
  }, []);

  const loadCurrentTabInfo = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      setCurrentTab(tab);

      if (tab.url) {
        // Request credibility analysis
        const response = await chrome.runtime.sendMessage({
          type: 'GET_CREDIBILITY',
          payload: { url: tab.url }
        });

        if (response?.credibility) {
          setCredibility(response.credibility);
        }
      }
    } catch (error) {
      console.error('Failed to load tab info:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      if (response) {
        setSettings(response);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleToggle = async () => {
    if (!settings) return;

    const newSettings = { ...settings, enabled: !settings.enabled };
    setSettings(newSettings);

    await chrome.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      payload: newSettings
    });

    // Notify content script
    if (currentTab?.id) {
      chrome.tabs.sendMessage(currentTab.id, {
        type: 'TOGGLE_EXTENSION',
        payload: { enabled: newSettings.enabled }
      });
    }
  };

  return (
    <div className="popup-container">
      <Header />
      
      <main className="popup-content">
        {loading ? (
          <div className="loading">Analyzing...</div>
        ) : (
          <>
            <CredibilityCard 
              url={currentTab?.url || ''}
              credibility={credibility}
            />
            
            <ActionButtons
              enabled={settings?.enabled || false}
              onToggle={handleToggle}
              onReport={() => window.open('https://truthlens.app/report')}
              onSettings={() => chrome.runtime.openOptionsPage()}
            />
          </>
        )}
      </main>
      
      <Footer />
    </div>
  );
};
