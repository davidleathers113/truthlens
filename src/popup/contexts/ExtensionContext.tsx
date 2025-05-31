import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { UserSettings, CredibilityScore } from '@shared/types';

// Extension state interface
interface ExtensionState {
  isEnabled: boolean;
  currentTab: chrome.tabs.Tab | null;
  credibility: CredibilityScore | null;
  settings: UserSettings | null;
  loading: boolean;
  error: string | null;
  stats: {
    checksPerformed: number;
    sitesAnalyzed: number;
    lastUpdateTime: number;
  };
}

// Action types for state management
type ExtensionAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CURRENT_TAB'; payload: chrome.tabs.Tab | null }
  | { type: 'SET_CREDIBILITY'; payload: CredibilityScore | null }
  | { type: 'SET_SETTINGS'; payload: UserSettings | null }
  | { type: 'TOGGLE_EXTENSION' }
  | { type: 'UPDATE_STATS'; payload: Partial<ExtensionState['stats']> };

// Initial state
const initialState: ExtensionState = {
  isEnabled: false,
  currentTab: null,
  credibility: null,
  settings: null,
  loading: true,
  error: null,
  stats: {
    checksPerformed: 0,
    sitesAnalyzed: 0,
    lastUpdateTime: Date.now(),
  },
};

// Reducer function
const extensionReducer = (state: ExtensionState, action: ExtensionAction): ExtensionState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_CURRENT_TAB':
      return { ...state, currentTab: action.payload };
    case 'SET_CREDIBILITY':
      return { ...state, credibility: action.payload };
    case 'SET_SETTINGS':
      return {
        ...state,
        settings: action.payload,
        isEnabled: action.payload?.enabled || false,
      };
    case 'TOGGLE_EXTENSION':
      return {
        ...state,
        isEnabled: !state.isEnabled,
        settings: state.settings ? { ...state.settings, enabled: !state.isEnabled } : null,
      };
    case 'UPDATE_STATS':
      return {
        ...state,
        stats: { ...state.stats, ...action.payload },
      };
    default:
      return state;
  }
};

// Context interface
interface ExtensionContextType {
  state: ExtensionState;
  dispatch: React.Dispatch<ExtensionAction>;
  actions: {
    loadCurrentTab: () => Promise<void>;
    loadSettings: () => Promise<void>;
    toggleExtension: () => Promise<void>;
    requestCredibilityCheck: () => Promise<void>;
    updateStats: (stats: Partial<ExtensionState['stats']>) => void;
  };
}

// Create context
const ExtensionContext = createContext<ExtensionContextType | undefined>(undefined);

// Provider component
interface ExtensionProviderProps {
  children: ReactNode;
}

export const ExtensionProvider: React.FC<ExtensionProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(extensionReducer, initialState);

  // Load current tab information
  const loadCurrentTab = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      dispatch({ type: 'SET_CURRENT_TAB', payload: tab });

      if (tab.url) {
        await requestCredibilityCheck();
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: `Failed to load tab info: ${error}` });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Load user settings
  const loadSettings = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      if (response) {
        dispatch({ type: 'SET_SETTINGS', payload: response });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: `Failed to load settings: ${error}` });
    }
  };

  // Toggle extension enabled/disabled
  const toggleExtension = async () => {
    if (!state.settings) return;

    dispatch({ type: 'TOGGLE_EXTENSION' });

    const newSettings = { ...state.settings, enabled: !state.isEnabled };

    try {
      await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        payload: newSettings,
      });

      // Notify content script
      if (state.currentTab?.id) {
        chrome.tabs.sendMessage(state.currentTab.id, {
          type: 'TOGGLE_EXTENSION',
          payload: { enabled: !state.isEnabled },
        });
      }
    } catch (error) {
      // Revert state on error
      dispatch({ type: 'TOGGLE_EXTENSION' });
      dispatch({ type: 'SET_ERROR', payload: `Failed to toggle extension: ${error}` });
    }
  };

  // Request credibility check for current tab
  const requestCredibilityCheck = async () => {
    if (!state.currentTab?.url) return;

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_CREDIBILITY',
        payload: { url: state.currentTab.url },
      });

      if (response?.credibility) {
        dispatch({ type: 'SET_CREDIBILITY', payload: response.credibility });
        // Update stats
        dispatch({
          type: 'UPDATE_STATS',
          payload: {
            checksPerformed: state.stats.checksPerformed + 1,
            lastUpdateTime: Date.now(),
          },
        });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: `Failed to get credibility: ${error}` });
    }
  };

  // Update statistics
  const updateStats = (stats: Partial<ExtensionState['stats']>) => {
    dispatch({ type: 'UPDATE_STATS', payload: stats });
  };

  // Initialize on mount
  useEffect(() => {
    const initialize = async () => {
      await Promise.all([loadCurrentTab(), loadSettings()]);
    };
    initialize();
  }, []);

  const actions = {
    loadCurrentTab,
    loadSettings,
    toggleExtension,
    requestCredibilityCheck,
    updateStats,
  };

  return (
    <ExtensionContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </ExtensionContext.Provider>
  );
};

// Custom hook to use the context
export const useExtension = () => {
  const context = useContext(ExtensionContext);
  if (context === undefined) {
    throw new Error('useExtension must be used within an ExtensionProvider');
  }
  return context;
};
