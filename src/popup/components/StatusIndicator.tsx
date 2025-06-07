import React, { useState, useCallback } from 'react';
import { useExtension } from '../contexts/ExtensionContext';
import '../styles/StatusIndicator.css';

interface StatusIndicatorProps {
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ className }) => {
  const { state, actions } = useExtension();
  const [isToggling, setIsToggling] = useState(false);

  // Optimistic update with visual feedback
  const handleToggle = useCallback(async () => {
    if (state.loading || isToggling) return;

    setIsToggling(true);

    try {
      await actions.toggleExtension();
    } catch (error) {
      console.error('Toggle failed:', error);
    } finally {
      // Add slight delay for better UX feedback
      setTimeout(() => setIsToggling(false), 300);
    }
  }, [state.loading, isToggling, actions]);

  // Enhanced status for better user feedback
  const getStatusConfig = () => {
    if (state.loading) {
      return {
        status: 'loading',
        text: 'Initializing...',
        dotClass: 'loading',
        ariaLabel: 'Extension is loading'
      };
    }
    if (isToggling) {
      return {
        status: 'toggling',
        text: state.isEnabled ? 'Disabling...' : 'Enabling...',
        dotClass: 'toggling',
        ariaLabel: `Extension is ${state.isEnabled ? 'being disabled' : 'being enabled'}`
      };
    }
    return {
      status: state.isEnabled ? 'active' : 'inactive',
      text: state.isEnabled ? 'Active' : 'Disabled',
      dotClass: state.isEnabled ? 'active' : 'inactive',
      ariaLabel: `Extension is ${state.isEnabled ? 'enabled' : 'disabled'}`
    };
  };

  const statusConfig = getStatusConfig();
  const isInteractionDisabled = state.loading || isToggling;

  return (
    <div className={`status-indicator ${className || ''}`}>
      <div className="status-display">
        <div
          className={`status-dot ${statusConfig.dotClass}`}
          aria-label={statusConfig.ariaLabel}
        >
          <div className="status-dot-inner" />
          <div className="status-pulse" />
        </div>
        <div className="status-content">
          <span className="status-text">
            TruthLens is <strong>{statusConfig.text}</strong>
          </span>
          {state.error && (
            <span className="status-error" role="alert">
              {state.error}
            </span>
          )}
        </div>
      </div>

      <button
        className={`toggle-switch ${state.isEnabled ? 'on' : 'off'} ${isToggling ? 'toggling' : ''}`}
        onClick={handleToggle}
        disabled={isInteractionDisabled}
        aria-label={`${state.isEnabled ? 'Disable' : 'Enable'} TruthLens`}
        role="switch"
        aria-checked={state.isEnabled}
        aria-describedby="toggle-description"
      >
        <div className="toggle-track">
          <div className="toggle-thumb">
            <div className="toggle-thumb-inner" />
          </div>
          <div className="toggle-glow" />
        </div>
        <span className="toggle-label" aria-hidden="true">
          {isToggling ? '...' : (state.isEnabled ? 'ON' : 'OFF')}
        </span>
      </button>

      {/* Hidden description for screen readers */}
      <div id="toggle-description" className="sr-only">
        Toggle to {state.isEnabled ? 'disable' : 'enable'} content credibility analysis
      </div>
    </div>
  );
};
