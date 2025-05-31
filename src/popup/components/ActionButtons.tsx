import React from 'react';

interface ActionButtonsProps {
  enabled: boolean;
  onToggle: () => void;
  onReport: () => void;
  onSettings: () => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({ enabled, onToggle, onReport, onSettings }) => {
  return (
    <div className="action-buttons">
      <button onClick={onToggle} className={`toggle-btn ${enabled ? 'enabled' : 'disabled'}`}>
        {enabled ? 'Disable' : 'Enable'} TruthLens
      </button>
      <button onClick={onReport} className="report-btn">
        Report Issue
      </button>
      <button onClick={onSettings} className="settings-btn">
        Settings
      </button>
    </div>
  );
};
