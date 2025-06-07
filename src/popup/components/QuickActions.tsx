import React, { useState, useCallback, useEffect, useRef } from 'react';
import { PopupView } from './Layout/PopupRouter';
import { useExtension } from '../contexts/ExtensionContext';
import '../styles/QuickActions.css';

interface QuickActionsProps {
  onNavigate: (view: PopupView) => void;
}

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: string;
  action: () => Promise<void> | void;
  disabled?: boolean;
  badge?: string;
  isPrimary?: boolean;
  keyboardShortcut?: string;
  tooltip?: string;
  category?: 'primary' | 'secondary' | 'utility';
  hapticFeedback?: boolean;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ onNavigate }) => {
  const { state, actions } = useExtension();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalyzed, setLastAnalyzed] = useState<Date | null>(null);
  const [visibleActions, setVisibleActions] = useState<QuickAction[]>([]);
  const [actionStates, setActionStates] = useState<Record<string, {
    loading: boolean;
    success?: boolean;
    error?: string;
    lastUsed?: Date;
  }>>({});
  const [showExpanded, setShowExpanded] = useState(false);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const successTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // Enhanced haptic feedback simulation for better UX
  const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!hapticEnabled) return;

    // Simulate haptic feedback with visual and audio cues
    try {
      // Try to use Vibration API if available (mobile)
      if ('vibrate' in navigator) {
        const patterns = {
          light: [10],
          medium: [20],
          heavy: [30, 10, 30]
        };
        navigator.vibrate(patterns[type]);
      }
    } catch (error) {
      // Fallback to visual feedback only
      console.debug('Haptic feedback not available');
    }
  }, [hapticEnabled]);

  // Enhanced action state management with better feedback
  const updateActionState = useCallback((actionId: string, newState: Partial<typeof actionStates[string]>) => {
    setActionStates(prev => ({
      ...prev,
      [actionId]: { ...prev[actionId], ...newState }
    }));

    // Auto-clear success/error states after appropriate delays
    if (newState.success) {
      if (successTimers.current[actionId]) {
        clearTimeout(successTimers.current[actionId]);
      }
      successTimers.current[actionId] = setTimeout(() => {
        setActionStates(prev => ({
          ...prev,
          [actionId]: { ...prev[actionId], success: false }
        }));
      }, 2500);
    }

    if (newState.error) {
      if (successTimers.current[actionId]) {
        clearTimeout(successTimers.current[actionId]);
      }
      successTimers.current[actionId] = setTimeout(() => {
        setActionStates(prev => ({
          ...prev,
          [actionId]: { ...prev[actionId], error: undefined }
        }));
      }, 4000);
    }
  }, []);

  // Enhanced universal action handler with better error handling
  const executeAction = useCallback(async (action: QuickAction) => {
    if (action.disabled || actionStates[action.id]?.loading) return;

    // Trigger haptic feedback
    if (action.hapticFeedback !== false) {
      triggerHapticFeedback(action.isPrimary ? 'medium' : 'light');
    }

    updateActionState(action.id, {
      loading: true,
      success: false,
      error: undefined,
      lastUsed: new Date()
    });

    try {
      await Promise.resolve(action.action());
      updateActionState(action.id, { loading: false, success: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Action failed';
      updateActionState(action.id, { loading: false, error: errorMessage });
      triggerHapticFeedback('heavy'); // Error feedback
    }
  }, [actionStates, triggerHapticFeedback, updateActionState]);

  // Handle page analysis with optimistic updates and micro-interactions
  const handleAnalyze = useCallback(async () => {
    if (isAnalyzing || !state.currentTab?.url || !state.isEnabled) return;

    setIsAnalyzing(true);

    try {
      await actions.requestCredibilityCheck();
      setLastAnalyzed(new Date());
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      // Delayed feedback for better UX micro-interaction
      setTimeout(() => {
        setIsAnalyzing(false);
      }, 800);
    }
  }, [isAnalyzing, state.currentTab?.url, state.isEnabled, actions]);

  // Handle sharing with native web share API and fallbacks
  const handleShare = useCallback(async () => {
    if (!state.credibility || !state.currentTab?.url) return;


    const shareData = {
      title: 'TruthLens Analysis',
      text: `Credibility score: ${state.credibility.score}% - ${state.currentTab.title}`,
      url: state.currentTab.url,
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback to clipboard with better UX feedback
        const shareText = `${shareData.text}\n${shareData.url}`;
        await navigator.clipboard.writeText(shareText);
        // Could integrate with a toast notification system here
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Sharing failed:', error);
      } else if (!(error instanceof Error)) {
        console.error('Unknown sharing error:', error);
      }
    }
  }, [state.credibility, state.currentTab]);

  // Enhanced clear data with confirmation and feedback
  const handleClearData = useCallback(async () => {
    const confirmed = confirm('Clear all TruthLens data? This cannot be undone.');
    if (!confirmed) return;

    try {
      await chrome.storage.local.clear();
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      console.error('Failed to clear data:', error);
    }
  }, []);


  // Define all available quick actions with 2025 UX patterns and categorization
  const quickActions: QuickAction[] = [
    {
      id: 'analyze',
      label: isAnalyzing ? 'Analyzing...' : '🔍 Scan Page',
      description: isAnalyzing ? 'AI analyzing content...' : 'Check page credibility with AI',
      icon: actionStates['analyze']?.loading ? '⏳' :
            actionStates['analyze']?.success ? '✅' :
            actionStates['analyze']?.error ? '❌' : '🔍',
      action: handleAnalyze,
      disabled: isAnalyzing || !state.currentTab?.url || !state.isEnabled,
      isPrimary: true,
      category: 'primary',
      keyboardShortcut: 'Ctrl+S',
      tooltip: 'Analyze current page for credibility',
      hapticFeedback: true,
    },
    {
      id: 'statistics',
      label: 'Statistics',
      description: 'View your analysis insights',
      icon: '📊',
      action: () => onNavigate('statistics'),
      badge: state.stats?.checksPerformed ?
        state.stats.checksPerformed > 99 ? '99+' : state.stats.checksPerformed.toString()
        : undefined,
      category: 'secondary',
      keyboardShortcut: 'Ctrl+T',
      tooltip: 'View your usage statistics and trends',
    },
    {
      id: 'settings',
      label: 'Settings',
      description: 'Customize your experience',
      icon: '⚙️',
      action: () => onNavigate('settings'),
      category: 'secondary',
      keyboardShortcut: 'Ctrl+,',
      tooltip: 'Configure extension settings',
    },
    {
      id: 'share',
      label: 'Share',
      description: 'Share analysis with friends',
      icon: actionStates['share']?.loading ? '⏳' :
            actionStates['share']?.success ? '✅' : '📤',
      action: handleShare,
      disabled: !state.credibility,
      category: 'secondary',
      tooltip: 'Share current analysis results',
      hapticFeedback: true,
    },
    {
      id: 'refresh',
      label: 'Refresh',
      description: 'Re-analyze current page',
      icon: actionStates['refresh']?.loading ? '⏳' : '🔄',
      action: async () => {
        if (!state.currentTab?.id) throw new Error('No active tab');
        await chrome.tabs.reload(state.currentTab.id);
        await new Promise(resolve => setTimeout(resolve, 1000));
        await handleAnalyze();
      },
      disabled: !state.currentTab?.url,
      category: 'utility',
      tooltip: 'Refresh page and re-analyze',
    },
    {
      id: 'history',
      label: 'History',
      description: 'View analysis history',
      icon: '📚',
      action: async () => {
        const history = await chrome.storage.local.get(['analysisHistory']);
        // Could show a history modal or navigate to history view
        console.log('Analysis history:', history);
      },
      category: 'utility',
      tooltip: 'View recent analysis history',
    },
    {
      id: 'export',
      label: 'Export',
      description: 'Export your data',
      icon: actionStates['export']?.loading ? '⏳' :
            actionStates['export']?.success ? '✅' : '💾',
      action: async () => {
        const data = await chrome.storage.local.get();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `truthlens-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      },
      category: 'utility',
      tooltip: 'Export all extension data',
    },
    {
      id: 'clear',
      label: 'Clear Data',
      description: 'Reset all stored data',
      icon: actionStates['clear']?.loading ? '⏳' : '🗑️',
      action: handleClearData,
      category: 'utility',
      keyboardShortcut: 'Ctrl+Shift+Delete',
      tooltip: 'Clear all extension data (irreversible)',
      hapticFeedback: true,
    },
  ];

  // Animated reveal of actions with staggered timing
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisibleActions(quickActions);
    }, 200);

    return () => clearTimeout(timer);
  }, [state.isEnabled, state.credibility, isAnalyzing, state.stats]);

  // Enhanced keyboard shortcut handling
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const action = quickActions.find(action => {
        if (!action.keyboardShortcut) return false;

        const shortcut = action.keyboardShortcut.toLowerCase();
        const ctrl = event.ctrlKey || event.metaKey;
        const shift = event.shiftKey;
        const key = event.key.toLowerCase();

        if (shortcut.includes('ctrl+shift+')) {
          const targetKey = shortcut.split('ctrl+shift+')[1];
          return ctrl && shift && key === targetKey;
        } else if (shortcut.includes('ctrl+')) {
          const targetKey = shortcut.split('ctrl+')[1];
          return ctrl && !shift && key === targetKey;
        }
        return false;
      });

      if (action && !action.disabled) {
        event.preventDefault();
        action.action();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [quickActions]);

  // Get time since last analysis for enhanced UX feedback
  const getAnalysisStatus = () => {
    if (isAnalyzing) return 'Analyzing...';
    if (!lastAnalyzed) return 'Click to analyze';

    const timeDiff = Date.now() - lastAnalyzed.getTime();
    const minutes = Math.floor(timeDiff / 60000);

    if (minutes < 1) return 'Just analyzed';
    if (minutes < 5) return `${minutes}m ago`;
    if (minutes < 60) return `${minutes}m ago`;
    return 'Analysis expired';
  };

  // Gesture handling for enhanced mobile UX
  const handleTouchStart = useCallback((e: React.TouchEvent, action: QuickAction) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };

    // Long press for secondary actions
    longPressTimer.current = setTimeout(() => {
      if (action.category === 'utility') {
        triggerHapticFeedback('heavy');
        setShowExpanded(true);
      }
    }, 500);
  }, [triggerHapticFeedback]);

  const handleTouchEnd = useCallback((e: React.TouchEvent, action: QuickAction) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (!touchStartPos.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartPos.current.x;
    const deltaY = touch.clientY - touchStartPos.current.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // If it's a tap (minimal movement), execute action
    if (distance < 10) {
      executeAction(action);
    }

    touchStartPos.current = null;
  }, [executeAction]);

  // Categorize actions for better organization
  const primaryActions = visibleActions.filter(action => action.category === 'primary');
  const secondaryActions = visibleActions.filter(action => action.category === 'secondary');
  const utilityActions = visibleActions.filter(action => action.category === 'utility');

  return (
    <section className="quick-actions" aria-label="Quick Actions">
      <div className="quick-actions-header">
        <div className="header-content">
          <h3 className="quick-actions-title">
            <span className="title-icon">⚡</span>
            Quick Actions
          </h3>
          {(lastAnalyzed || isAnalyzing) && (
            <span className={`analysis-status ${isAnalyzing ? 'analyzing' : ''}`} aria-live="polite">
              {getAnalysisStatus()}
            </span>
          )}
        </div>

        {utilityActions.length > 0 && (
          <button
            className={`expand-toggle ${showExpanded ? 'expanded' : ''}`}
            onClick={() => setShowExpanded(!showExpanded)}
            aria-label={showExpanded ? 'Hide advanced actions' : 'Show advanced actions'}
          >
            <span className="toggle-icon">{showExpanded ? '▼' : '▶'}</span>
            <span className="toggle-text">More</span>
          </button>
        )}
      </div>

      {/* Primary Actions - Hero Actions */}
      {primaryActions.length > 0 && (
        <div className="primary-actions-section">
          {primaryActions.map((actionItem, index) => (
            <button
              key={actionItem.id}
              className={`action-button primary ${
                actionItem.disabled ? 'disabled' : ''
              } ${actionStates[actionItem.id]?.loading ? 'loading' : ''} ${
                actionStates[actionItem.id]?.success ? 'success' : ''
              } ${actionStates[actionItem.id]?.error ? 'error' : ''}`}
              onClick={() => executeAction(actionItem)}
              onTouchStart={(e) => handleTouchStart(e, actionItem)}
              onTouchEnd={(e) => handleTouchEnd(e, actionItem)}
              disabled={actionItem.disabled}
              title={actionItem.tooltip ? `${actionItem.tooltip} ${actionItem.keyboardShortcut ? `(${actionItem.keyboardShortcut})` : ''}` : undefined}
              aria-label={`${actionItem.label}: ${actionItem.description}`}
              style={{
                '--animation-delay': `${index * 100}ms`,
              } as React.CSSProperties}
            >
              <div className="action-icon-container">
                <span className="action-icon" aria-hidden="true">
                  {actionItem.icon}
                </span>
                {actionItem.badge && (
                  <span className="action-badge" aria-label={`${actionItem.badge} items`}>
                    {actionItem.badge}
                  </span>
                )}
                <div className="action-ripple" />
              </div>

              <div className="action-content">
                <span className="action-label">{actionItem.label}</span>
                <span className="action-description">{actionItem.description}</span>
              </div>

              {actionStates[actionItem.id]?.loading && (
                <div className="loading-spinner" aria-hidden="true">
                  <div className="spinner" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Secondary Actions - Quick Access Grid */}
      {secondaryActions.length > 0 && (
        <div className="secondary-actions-section">
          <div className="actions-grid secondary">
            {secondaryActions.map((actionItem, index) => (
              <button
                key={actionItem.id}
                className={`action-button secondary ${
                  actionItem.disabled ? 'disabled' : ''
                } ${actionStates[actionItem.id]?.loading ? 'loading' : ''} ${
                  actionStates[actionItem.id]?.success ? 'success' : ''
                } ${actionStates[actionItem.id]?.error ? 'error' : ''}`}
                onClick={() => executeAction(actionItem)}
                onTouchStart={(e) => handleTouchStart(e, actionItem)}
                onTouchEnd={(e) => handleTouchEnd(e, actionItem)}
                disabled={actionItem.disabled}
                title={actionItem.tooltip ? `${actionItem.tooltip} ${actionItem.keyboardShortcut ? `(${actionItem.keyboardShortcut})` : ''}` : undefined}
                aria-label={`${actionItem.label}: ${actionItem.description}`}
                style={{
                  '--animation-delay': `${(index + primaryActions.length) * 80}ms`,
                } as React.CSSProperties}
              >
                <div className="action-icon-container">
                  <span className="action-icon" aria-hidden="true">
                    {actionItem.icon}
                  </span>
                  {actionItem.badge && (
                    <span className="action-badge" aria-label={`${actionItem.badge} items`}>
                      {actionItem.badge}
                    </span>
                  )}
                  <div className="action-ripple" />
                </div>

                <div className="action-content">
                  <span className="action-label">{actionItem.label}</span>
                  <span className="action-description">{actionItem.description}</span>
                </div>

                {actionStates[actionItem.id]?.loading && (
                  <div className="loading-spinner" aria-hidden="true">
                    <div className="spinner" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Utility Actions - Expandable Section */}
      {utilityActions.length > 0 && (
        <div className={`utility-actions-section ${showExpanded ? 'expanded' : 'collapsed'}`}>
          <div className="actions-grid utility">
            {utilityActions.map((actionItem, index) => (
              <button
                key={actionItem.id}
                className={`action-button utility ${
                  actionItem.disabled ? 'disabled' : ''
                } ${actionStates[actionItem.id]?.loading ? 'loading' : ''} ${
                  actionStates[actionItem.id]?.success ? 'success' : ''
                } ${actionStates[actionItem.id]?.error ? 'error' : ''}`}
                onClick={() => executeAction(actionItem)}
                onTouchStart={(e) => handleTouchStart(e, actionItem)}
                onTouchEnd={(e) => handleTouchEnd(e, actionItem)}
                disabled={actionItem.disabled}
                title={actionItem.tooltip ? `${actionItem.tooltip} ${actionItem.keyboardShortcut ? `(${actionItem.keyboardShortcut})` : ''}` : undefined}
                aria-label={`${actionItem.label}: ${actionItem.description}`}
                style={{
                  '--animation-delay': `${(index + primaryActions.length + secondaryActions.length) * 60}ms`,
                } as React.CSSProperties}
              >
                <div className="action-icon-container">
                  <span className="action-icon" aria-hidden="true">
                    {actionItem.icon}
                  </span>
                  <div className="action-ripple" />
                </div>

                <div className="action-content">
                  <span className="action-label">{actionItem.label}</span>
                  <span className="action-description">{actionItem.description}</span>
                </div>

                {actionStates[actionItem.id]?.loading && (
                  <div className="loading-spinner" aria-hidden="true">
                    <div className="spinner" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced status notifications */}
      {Object.entries(actionStates).map(([actionId, state]) => (
        state.error && (
          <div key={`error-${actionId}`} className="action-notification error" role="alert">
            <span className="notification-icon">⚠️</span>
            <span className="notification-message">{state.error}</span>
            <button
              className="notification-dismiss"
              onClick={() => updateActionState(actionId, { error: undefined })}
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )
      ))}

      {/* Extension disabled notice */}
      {!state.isEnabled && (
        <div className="quick-actions-notice" role="alert">
          <span className="notice-icon" aria-hidden="true">⚠️</span>
          <span className="notice-text">
            Enable TruthLens to use quick actions
          </span>
        </div>
      )}

      {/* Haptic settings toggle */}
      <div className="actions-footer">
        <button
          className={`haptic-toggle ${hapticEnabled ? 'enabled' : 'disabled'}`}
          onClick={() => setHapticEnabled(!hapticEnabled)}
          title="Toggle haptic feedback"
          aria-label={`Haptic feedback ${hapticEnabled ? 'enabled' : 'disabled'}`}
        >
          <span className="haptic-icon">{hapticEnabled ? '📳' : '🔇'}</span>
        </button>
      </div>
    </section>
  );
};
