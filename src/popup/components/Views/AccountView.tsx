import React, { useState, useEffect, useCallback } from 'react';
import { PopupView } from '../Layout/PopupRouter';
import { useSubscription, useStats, usePreferences } from '../../hooks/useStorage';
import './../../styles/AccountView.css';

interface AccountViewProps {
  onNavigate: (view: PopupView) => void;
}

interface UserProfile {
  email: string;
  displayName: string;
  avatarUrl?: string;
  joinDate: number;
  lastActiveDate: number;
}

interface AccountAction {
  id: string;
  label: string;
  icon: string;
  type: 'primary' | 'secondary' | 'danger';
  action: () => void;
  disabled?: boolean;
}

export const AccountView: React.FC<AccountViewProps> = ({ onNavigate }) => {
  const [subscription, setSubscription] = useSubscription();
  const [stats] = useStats();
  const [preferences] = usePreferences();
  const [isAnimated, setIsAnimated] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    email: 'user@truthlens.app',
    displayName: 'Truth Seeker',
    joinDate: Date.now() - (30 * 24 * 60 * 60 * 1000), // 30 days ago
    lastActiveDate: Date.now(),
  });

  // Animation entrance
  useEffect(() => {
    const timer = setTimeout(() => setIsAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Calculate account stats
  const accountAge = Math.floor((Date.now() - userProfile.joinDate) / (24 * 60 * 60 * 1000));
  const subscriptionStatus = subscription.tier === 'free' ? 'Free Tier' : 'Premium Member';
  const nextBillingDate = subscription.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString() : null;
  const trialDaysLeft = subscription.trialEndDate ? Math.ceil((subscription.trialEndDate - Date.now()) / (24 * 60 * 60 * 1000)) : null;

  // Handle subscription management
  const handleUpgrade = useCallback(() => {
    onNavigate('premium');
  }, [onNavigate]);

  const handleCancelSubscription = useCallback(async () => {
    setShowConfirmDialog('cancel-subscription');
  }, []);

  const handleSignOut = useCallback(async () => {
    setShowConfirmDialog('sign-out');
  }, []);

  const handleConfirmAction = useCallback(async (action: string) => {
    switch (action) {
      case 'cancel-subscription':
        // Implement subscription cancellation
        try {
          await setSubscription({ ...subscription, tier: 'free', expiresAt: null });
          setShowConfirmDialog(null);
        } catch (error) {
          console.error('Failed to cancel subscription:', error);
        }
        break;
      case 'sign-out':
        // Implement sign out logic
        setShowConfirmDialog(null);
        onNavigate('main');
        break;
    }
  }, [subscription, setSubscription, onNavigate]);

  // Account actions configuration
  const accountActions: AccountAction[] = [
    {
      id: 'edit-profile',
      label: 'Edit Profile',
      icon: '✏️',
      type: 'primary',
      action: () => setIsEditing(!isEditing),
    },
    {
      id: 'privacy-settings',
      label: 'Privacy & Security',
      icon: '🔒',
      type: 'primary',
      action: () => onNavigate('settings'),
    },
    {
      id: 'export-data',
      label: 'Export Data',
      icon: '📁',
      type: 'secondary',
      action: () => {
        // Export user data
        const data = { userProfile, subscription, stats, preferences };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'truthlens-account-data.json';
        a.click();
        URL.revokeObjectURL(url);
      },
    },
    {
      id: 'sign-out',
      label: 'Sign Out',
      icon: '🚪',
      type: 'danger',
      action: handleSignOut,
    },
  ];

  return (
    <div className={`account-view ${isAnimated ? 'animated' : ''}`}>
      {/* Header */}
      <header className="account-header">
        <button
          className="back-button"
          onClick={() => onNavigate('main')}
          aria-label="Go back to main view"
        >
          <span className="back-icon">←</span>
          <span className="back-text">Back</span>
        </button>
        <h2 className="header-title">Account</h2>
        <div className="header-actions">
          <button
            className="settings-button"
            onClick={() => onNavigate('settings')}
            aria-label="Open settings"
          >
            ⚙️
          </button>
        </div>
      </header>

      <main className="account-content">
        {/* Profile Section */}
        <section className="profile-section">
          <div className="profile-card">
            <div className="avatar-container">
              <div className="avatar">
                {userProfile.avatarUrl ? (
                  <img src={userProfile.avatarUrl} alt="Profile" />
                ) : (
                  <span className="avatar-emoji">👤</span>
                )}
              </div>
              <div className="status-indicator online" aria-label="Online" />
            </div>

            <div className="profile-info">
              {isEditing ? (
                <div className="profile-edit">
                  <input
                    type="text"
                    value={userProfile.displayName}
                    onChange={(e) => setUserProfile({ ...userProfile, displayName: e.target.value })}
                    className="profile-input"
                    placeholder="Display Name"
                  />
                  <input
                    type="email"
                    value={userProfile.email}
                    onChange={(e) => setUserProfile({ ...userProfile, email: e.target.value })}
                    className="profile-input"
                    placeholder="Email Address"
                  />
                  <div className="edit-actions">
                    <button className="save-button" onClick={() => setIsEditing(false)}>Save</button>
                    <button className="cancel-button" onClick={() => setIsEditing(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="profile-display">
                  <h3 className="profile-name">{userProfile.displayName}</h3>
                  <p className="profile-email">{userProfile.email}</p>
                  <div className="profile-meta">
                    <span className="account-age">Member for {accountAge} days</span>
                    <span className="checks-count">{stats.checksPerformed} truth checks</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Subscription Section */}
        <section className="subscription-section">
          <div className="subscription-card">
            <div className="subscription-header">
              <div className="subscription-icon">
                {subscription.tier === 'free' ? '🆓' : '⭐'}
              </div>
              <div className="subscription-info">
                <h4 className="subscription-title">{subscriptionStatus}</h4>
                <p className="subscription-subtitle">
                  {subscription.tier === 'free'
                    ? 'Unlock premium features to enhance your truth-checking experience'
                    : nextBillingDate
                      ? `Renews on ${nextBillingDate}`
                      : 'Active subscription'
                  }
                </p>
              </div>
            </div>

            {subscription.isTrialActive && trialDaysLeft && (
              <div className="trial-banner">
                <span className="trial-icon">⏰</span>
                <span className="trial-text">
                  {trialDaysLeft} days left in your free trial
                </span>
              </div>
            )}

            <div className="subscription-features">
              <h5>Your Features:</h5>
              <div className="features-grid">
                {subscription.features.map((feature, index) => (
                  <div key={feature} className="feature-item" style={{
                    '--animation-delay': `${index * 100}ms`
                  } as React.CSSProperties}>
                    <span className="feature-icon">✓</span>
                    <span className="feature-text">{feature.replace('-', ' ')}</span>
                  </div>
                ))}
              </div>
            </div>

            {subscription.tier === 'free' ? (
              <button className="upgrade-button" onClick={handleUpgrade}>
                <span className="button-text">Upgrade to Premium</span>
                <span className="button-arrow">→</span>
              </button>
            ) : (
              <div className="subscription-management">
                <button className="manage-button" onClick={() => onNavigate('premium')}>
                  Manage Subscription
                </button>
                <button className="cancel-button secondary" onClick={handleCancelSubscription}>
                  Cancel Subscription
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Account Actions */}
        <section className="actions-section">
          <h4 className="actions-title">Account Management</h4>
          <div className="actions-grid">
            {accountActions.map((action, index) => (
              <button
                key={action.id}
                className={`action-button ${action.type}`}
                onClick={action.action}
                disabled={action.disabled}
                style={{
                  '--animation-delay': `${index * 75}ms`
                } as React.CSSProperties}
                aria-label={action.label}
              >
                <span className="action-icon">{action.icon}</span>
                <span className="action-label">{action.label}</span>
                <span className="action-arrow">›</span>
              </button>
            ))}
          </div>
        </section>

        {/* Usage Statistics Preview */}
        <section className="stats-preview">
          <h4 className="stats-title">Quick Stats</h4>
          <div className="stats-row">
            <div className="stat-item">
              <span className="stat-value">{stats.checksPerformed}</span>
              <span className="stat-label">Truth Checks</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.sitesAnalyzed}</span>
              <span className="stat-label">Sites Analyzed</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{Math.round(stats.averageCredibilityScore * 100)}%</span>
              <span className="stat-label">Avg. Score</span>
            </div>
          </div>
          <button
            className="view-stats-button"
            onClick={() => onNavigate('statistics')}
          >
            View Full Statistics →
          </button>
        </section>
      </main>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="confirm-overlay">
          <div className="confirm-dialog">
            <h3 className="confirm-title">
              {showConfirmDialog === 'cancel-subscription' ? 'Cancel Subscription?' : 'Sign Out?'}
            </h3>
            <p className="confirm-message">
              {showConfirmDialog === 'cancel-subscription'
                ? 'Your premium features will remain active until the end of your billing period.'
                : 'You will need to sign in again to access your account.'}
            </p>
            <div className="confirm-actions">
              <button
                className="confirm-button primary"
                onClick={() => handleConfirmAction(showConfirmDialog)}
              >
                {showConfirmDialog === 'cancel-subscription' ? 'Cancel Subscription' : 'Sign Out'}
              </button>
              <button
                className="confirm-button secondary"
                onClick={() => setShowConfirmDialog(null)}
              >
                Keep Active
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
