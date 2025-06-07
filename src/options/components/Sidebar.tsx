import React from 'react';
import { SettingsSection } from './OptionsApp';

interface SidebarProps {
  currentSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

interface NavigationItem {
  id: SettingsSection;
  label: string;
  icon: string;
  description: string;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'general',
    label: 'General',
    icon: '⚙️',
    description: 'Basic extension settings and preferences'
  },
  {
    id: 'privacy',
    label: 'Privacy',
    icon: '🔒',
    description: 'Data collection and privacy controls'
  },
  {
    id: 'appearance',
    label: 'Appearance',
    icon: '🎨',
    description: 'Visual customization and themes'
  },
  {
    id: 'advanced',
    label: 'Advanced',
    icon: '⚡',
    description: 'Developer options and advanced features'
  }
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onSectionChange,
  collapsed,
  onToggleCollapsed
}) => {
  const handleNavigationClick = (item: NavigationItem) => {
    onSectionChange(item.id);
  };

  const isActiveSection = (itemId: SettingsSection): boolean => {
    return currentSection === itemId;
  };

  return (
    <aside
      className={`sidebar ${collapsed ? 'collapsed' : ''}`}
      role="navigation"
      aria-label="Settings navigation"
    >
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <button
          className="sidebar-toggle"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
        >
          <span className="toggle-icon">
            {collapsed ? '▶️' : '◀️'}
          </span>
          {!collapsed && <span className="toggle-text">Collapse</span>}
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="sidebar-nav" role="menu">
        <ul className="nav-list" role="none">
          {navigationItems.map((item, index) => (
            <li
              key={item.id}
              className="nav-item"
              role="none"
              style={{
                '--animation-delay': `${index * 50}ms`
              } as React.CSSProperties}
            >
              <button
                className={`nav-link ${isActiveSection(item.id) ? 'active' : ''}`}
                onClick={() => handleNavigationClick(item)}
                role="menuitem"
                aria-current={isActiveSection(item.id) ? 'page' : undefined}
                title={collapsed ? `${item.label}: ${item.description}` : undefined}
              >
                <div className="nav-icon">
                  <span role="img" aria-hidden="true">{item.icon}</span>
                </div>

                {!collapsed && (
                  <div className="nav-content">
                    <span className="nav-label">{item.label}</span>
                    <span className="nav-description">{item.description}</span>
                  </div>
                )}

                {/* Active indicator */}
                {isActiveSection(item.id) && (
                  <div className="nav-indicator" aria-hidden="true"></div>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Sidebar Footer */}
      {!collapsed && (
        <div className="sidebar-footer">
          <div className="footer-content">
            <p className="footer-text">
              Need help? Check our{' '}
              <button
                className="footer-link"
                onClick={() => {
                  chrome.tabs.create({
                    url: 'https://truthlens.app/docs',
                    active: false
                  });
                }}
              >
                documentation
              </button>
            </p>
          </div>
        </div>
      )}
    </aside>
  );
};
