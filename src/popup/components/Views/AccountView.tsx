import React from 'react';
import { PopupView } from '../Layout/PopupRouter';

interface AccountViewProps {
  onNavigate: (view: PopupView) => void;
}

export const AccountView: React.FC<AccountViewProps> = ({ onNavigate }) => {
  return (
    <div className="account-view">
      <header className="view-header">
        <button
          className="back-button"
          onClick={() => onNavigate('main')}
          aria-label="Go back to main view"
        >
          ← Back
        </button>
        <h2>Account</h2>
      </header>

      <main className="account-content">
        <div className="account-info">
          <div className="avatar">👤</div>
          <h3>Free User</h3>
          <p>user@example.com</p>
        </div>

        <div className="subscription-status">
          <h4>Subscription</h4>
          <p>Free Tier - Upgrade to Premium for advanced features</p>
          <button
            className="upgrade-btn"
            onClick={() => onNavigate('premium')}
          >
            Upgrade Now
          </button>
        </div>

        <div className="account-actions">
          <button className="action-btn">Change Email</button>
          <button className="action-btn">Change Password</button>
          <button className="action-btn">Privacy Settings</button>
          <button className="action-btn secondary">Sign Out</button>
        </div>
      </main>
    </div>
  );
};
