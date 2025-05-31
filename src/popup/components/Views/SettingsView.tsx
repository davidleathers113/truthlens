import React from 'react';
import { PopupView } from '../Layout/PopupRouter';

interface SettingsViewProps {
  onNavigate: (view: PopupView) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onNavigate }) => {
  return (
    <div className="settings-view">
      <header className="view-header">
        <button
          className="back-button"
          onClick={() => onNavigate('main')}
          aria-label="Go back to main view"
        >
          ← Back
        </button>
        <h2>Settings</h2>
      </header>

      <main className="settings-content">
        <div className="settings-section">
          <h3>General</h3>
          <div className="setting-item">
            <label>Extension Status</label>
            <p>Toggle extension on/off</p>
          </div>
        </div>

        <div className="settings-section">
          <h3>Analysis</h3>
          <div className="setting-item">
            <label>Fact-checking Level</label>
            <p>Basic, Standard, or Thorough</p>
          </div>
        </div>

        <div className="settings-section">
          <h3>Notifications</h3>
          <div className="setting-item">
            <label>Low Credibility Alerts</label>
            <p>Get notified about suspicious content</p>
          </div>
        </div>

        <div className="settings-section">
          <h3>Privacy</h3>
          <div className="setting-item">
            <label>Local Processing Only</label>
            <p>Process data locally when possible</p>
          </div>
        </div>
      </main>
    </div>
  );
};
