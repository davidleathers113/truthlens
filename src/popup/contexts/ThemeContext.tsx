import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Theme types
export type Theme = 'light' | 'dark' | 'auto';
export type PopupSize = 'default' | 'compact' | 'expanded';

interface ThemeState {
  theme: Theme;
  effectiveTheme: 'light' | 'dark'; // Resolved theme (auto becomes light/dark)
  popupSize: PopupSize;
  dimensions: {
    width: number;
    height: number;
  };
}

interface ThemeContextType {
  themeState: ThemeState;
  setTheme: (theme: Theme) => void;
  setPopupSize: (size: PopupSize) => void;
  toggleTheme: () => void;
}

// Size configurations
const SIZE_CONFIGS = {
  default: { width: 320, height: 480 },
  compact: { width: 280, height: 400 },
  expanded: { width: 360, height: 600 },
};

// Create context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Provider component
interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeState, setThemeState] = useState<ThemeState>({
    theme: 'auto',
    effectiveTheme: 'light',
    popupSize: 'default',
    dimensions: SIZE_CONFIGS.default,
  });

  // Resolve auto theme based on system preference
  const resolveAutoTheme = (): 'light' | 'dark' => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  };

  // Update effective theme when theme or system preference changes
  useEffect(() => {
    const updateEffectiveTheme = () => {
      const effective = themeState.theme === 'auto' ? resolveAutoTheme() : themeState.theme;
      setThemeState(prev => ({ ...prev, effectiveTheme: effective }));
    };

    updateEffectiveTheme();

    // Listen for system theme changes
    if (themeState.theme === 'auto' && typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => updateEffectiveTheme();

      // Use modern API if available, fallback to legacy
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      } else {
        // Legacy support
        mediaQuery.addListener(handleChange);
        return () => mediaQuery.removeListener(handleChange);
      }
    }
  }, [themeState.theme]);

  // Load saved theme from storage
  useEffect(() => {
    const loadSavedTheme = async () => {
      try {
        const result = await chrome.storage.local.get(['theme', 'popupSize']);
        if (result.theme) {
          setThemeState(prev => ({ ...prev, theme: result.theme }));
        }
        if (result.popupSize) {
          setPopupSize(result.popupSize);
        }
      } catch (error) {
        console.warn('Failed to load saved theme:', error);
      }
    };
    loadSavedTheme();
  }, []);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeState.effectiveTheme);
    document.documentElement.setAttribute('data-popup-size', themeState.popupSize);
  }, [themeState.effectiveTheme, themeState.popupSize]);

  // Set theme
  const setTheme = async (theme: Theme) => {
    setThemeState(prev => ({ ...prev, theme }));
    try {
      await chrome.storage.local.set({ theme });
    } catch (error) {
      console.warn('Failed to save theme:', error);
    }
  };

  // Set popup size
  const setPopupSize = async (size: PopupSize) => {
    setThemeState(prev => ({
      ...prev,
      popupSize: size,
      dimensions: SIZE_CONFIGS[size],
    }));
    try {
      await chrome.storage.local.set({ popupSize: size });
    } catch (error) {
      console.warn('Failed to save popup size:', error);
    }
  };

  // Toggle between light and dark theme
  const toggleTheme = () => {
    const newTheme = themeState.effectiveTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ themeState, setTheme, setPopupSize, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
