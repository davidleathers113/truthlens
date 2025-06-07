import React from 'react';

interface HeaderProps {
  // Empty interface for future props - allows extensibility
  [key: string]: never;
}

export const Header: React.FC<HeaderProps> = () => {
  return (
    <header className="options-header" role="banner">
      <div className="header-content">
        {/* Logo and Branding */}
        <div className="header-brand">
          <div className="brand-icon">
            <span className="icon" role="img" aria-label="TruthLens">🔍</span>
          </div>
          <div className="brand-text">
            <h1 className="brand-title">TruthLens</h1>
            <span className="brand-subtitle">Settings</span>
          </div>
        </div>

        {/* Header Actions */}
        <div className="header-actions">
          {/* Version Badge */}
          <div className="version-badge" title="Extension Version">
            <span className="version-text">v1.0.0</span>
          </div>

          {/* External Links */}
          <div className="header-links">
            <button
              className="header-link"
              onClick={() => {
                chrome.tabs.create({
                  url: 'https://truthlens.app/support',
                  active: false
                });
              }}
              aria-label="Open support documentation"
              title="Help & Support"
            >
              <span className="link-icon">❓</span>
              <span className="link-text">Help</span>
            </button>

            <button
              className="header-link"
              onClick={() => {
                chrome.tabs.create({
                  url: 'https://github.com/truthlens/extension',
                  active: false
                });
              }}
              aria-label="View source code on GitHub"
              title="View on GitHub"
            >
              <span className="link-icon">🐙</span>
              <span className="link-text">GitHub</span>
            </button>
          </div>

          {/* Extension Status Indicator */}
          <div className="status-indicator">
            <div className="status-dot active" aria-label="Extension is active"></div>
            <span className="status-text">Active</span>
          </div>
        </div>
      </div>
    </header>
  );
};
