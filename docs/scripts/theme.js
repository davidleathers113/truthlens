/**
 * TruthLens Documentation Theme Toggle - 2025 Best Practices Implementation
 *
 * Features:
 * - Respects prefers-color-scheme system preference
 * - Uses modern CSS color-scheme and light-dark() function
 * - Preference cascade: localStorage > system > default
 * - Smooth transitions with reduced motion support
 * - Accessible keyboard navigation
 * - Performance optimized
 */

class ThemeManager {
  constructor() {
    this.themeToggleBtn = document.querySelector('.theme-toggle');
    this.currentTheme = null;
    this.systemPreference = null;

    // Theme preference cascade constants
    this.THEMES = {
      LIGHT: 'light',
      DARK: 'dark',
      SYSTEM: 'system'
    };

    this.STORAGE_KEY = 'truthlens-theme-preference';

    this.init();
  }

  init() {
    this.detectSystemPreference();
    this.loadSavedPreference();
    this.applyTheme();
    this.bindEvents();
    this.setupMediaQueryListener();
    this.setupAccessibility();
    this.updateToggleButton();
  }

  detectSystemPreference() {
    // Use window.matchMedia for system preference detection
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.systemPreference = darkModeQuery.matches ? this.THEMES.DARK : this.THEMES.LIGHT;

    // Also detect if user prefers reduced motion
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  loadSavedPreference() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved && Object.values(this.THEMES).includes(saved)) {
        this.currentTheme = saved;
      } else {
        // Default to system preference if no saved preference
        this.currentTheme = this.THEMES.SYSTEM;
      }
    } catch (error) {
      // Fallback if localStorage is not available
      console.warn('localStorage not available, using system preference');
      this.currentTheme = this.THEMES.SYSTEM;
    }
  }

  savePreference(theme) {
    try {
      localStorage.setItem(this.STORAGE_KEY, theme);
    } catch (error) {
      console.warn('Could not save theme preference to localStorage');
    }
  }

  getEffectiveTheme() {
    // Preference cascade: saved preference > system preference > light fallback
    if (this.currentTheme === this.THEMES.SYSTEM) {
      return this.systemPreference || this.THEMES.LIGHT;
    }
    return this.currentTheme || this.systemPreference || this.THEMES.LIGHT;
  }

  applyTheme() {
    const effectiveTheme = this.getEffectiveTheme();
    const html = document.documentElement;

    // Remove all theme classes
    html.classList.remove('theme-light', 'theme-dark');
    html.removeAttribute('data-theme');

    // Apply new theme
    html.classList.add(`theme-${effectiveTheme}`);
    html.setAttribute('data-theme', effectiveTheme);

    // Set color-scheme for browser UI elements
    html.style.colorScheme = effectiveTheme;

    // Update meta theme-color for mobile browsers
    this.updateMetaThemeColor(effectiveTheme);

    // Announce theme change to screen readers
    this.announceThemeChange(effectiveTheme);

    // Apply transitions if not reduced motion
    if (!this.prefersReducedMotion) {
      this.applyThemeTransition();
    }

    // Analytics tracking
    this.trackThemeChange(effectiveTheme);
  }

  updateMetaThemeColor(theme) {
    let themeColorContent = '#3b82f6'; // Default blue

    if (theme === this.THEMES.DARK) {
      themeColorContent = '#1f2937'; // Dark gray
    }

    // Update existing theme-color meta tag or create one
    let themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeColorMeta) {
      themeColorMeta = document.createElement('meta');
      themeColorMeta.name = 'theme-color';
      document.head.appendChild(themeColorMeta);
    }
    themeColorMeta.content = themeColorContent;
  }

  applyThemeTransition() {
    // Add smooth transition class temporarily
    document.body.classList.add('theme-transitioning');

    // Remove transition class after transition completes
    setTimeout(() => {
      document.body.classList.remove('theme-transitioning');
    }, 300);
  }

  announceThemeChange(theme) {
    // Create or update live region for screen reader announcement
    let announcer = document.getElementById('theme-announcer');
    if (!announcer) {
      announcer = document.createElement('div');
      announcer.id = 'theme-announcer';
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      announcer.style.position = 'absolute';
      announcer.style.left = '-10000px';
      announcer.style.width = '1px';
      announcer.style.height = '1px';
      announcer.style.overflow = 'hidden';
      document.body.appendChild(announcer);
    }

    const themeNames = {
      [this.THEMES.LIGHT]: 'light',
      [this.THEMES.DARK]: 'dark'
    };

    announcer.textContent = `Theme changed to ${themeNames[theme]} mode`;
  }

  bindEvents() {
    if (this.themeToggleBtn) {
      this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());

      // Keyboard support
      this.themeToggleBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.toggleTheme();
        }
      });
    }

    // Global keyboard shortcut: Ctrl/Cmd + Shift + T
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        this.toggleTheme();
      }
    });
  }

  setupMediaQueryListener() {
    // Listen for system preference changes
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // Modern browser support
    if (darkModeQuery.addEventListener) {
      darkModeQuery.addEventListener('change', (e) => {
        this.systemPreference = e.matches ? this.THEMES.DARK : this.THEMES.LIGHT;

        // Only re-apply if currently following system preference
        if (this.currentTheme === this.THEMES.SYSTEM) {
          this.applyTheme();
          this.updateToggleButton();
        }
      });
    } else {
      // Fallback for older browsers
      darkModeQuery.addListener((e) => {
        this.systemPreference = e.matches ? this.THEMES.DARK : this.THEMES.LIGHT;

        if (this.currentTheme === this.THEMES.SYSTEM) {
          this.applyTheme();
          this.updateToggleButton();
        }
      });
    }

    // Listen for reduced motion preference changes
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotionQuery.addEventListener) {
      reducedMotionQuery.addEventListener('change', (e) => {
        this.prefersReducedMotion = e.matches;
      });
    }
  }

  setupAccessibility() {
    if (this.themeToggleBtn) {
      // Set ARIA attributes
      this.themeToggleBtn.setAttribute('aria-label', 'Toggle dark mode');
      this.themeToggleBtn.setAttribute('role', 'switch');
      this.updateAriaState();
    }
  }

  updateAriaState() {
    if (this.themeToggleBtn) {
      const effectiveTheme = this.getEffectiveTheme();
      const isDark = effectiveTheme === this.THEMES.DARK;

      this.themeToggleBtn.setAttribute('aria-checked', isDark.toString());
      this.themeToggleBtn.setAttribute('aria-label',
        `Toggle dark mode. Currently ${isDark ? 'dark' : 'light'} mode.`
      );
    }
  }

  toggleTheme() {
    // Cycle through: light -> dark -> system (if different from current effective)
    const effectiveTheme = this.getEffectiveTheme();

    if (this.currentTheme === this.THEMES.LIGHT) {
      this.currentTheme = this.THEMES.DARK;
    } else if (this.currentTheme === this.THEMES.DARK) {
      // Only offer system option if it would be different from current
      if (this.systemPreference !== this.THEMES.DARK) {
        this.currentTheme = this.THEMES.SYSTEM;
      } else {
        this.currentTheme = this.THEMES.LIGHT;
      }
    } else {
      // Currently system, switch to opposite of current effective theme
      this.currentTheme = effectiveTheme === this.THEMES.DARK ? this.THEMES.LIGHT : this.THEMES.DARK;
    }

    this.savePreference(this.currentTheme);
    this.applyTheme();
    this.updateToggleButton();

    // Haptic feedback on supported devices
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }

  updateToggleButton() {
    if (!this.themeToggleBtn) return;

    const effectiveTheme = this.getEffectiveTheme();
    const isSystem = this.currentTheme === this.THEMES.SYSTEM;

    // Update button icon and text
    const icons = {
      [this.THEMES.LIGHT]: '🌙',
      [this.THEMES.DARK]: '☀️'
    };

    let buttonText = icons[effectiveTheme === this.THEMES.DARK ? this.THEMES.LIGHT : this.THEMES.DARK];

    // Add system indicator if following system preference
    if (isSystem) {
      buttonText += ' ⚙️';
    }

    this.themeToggleBtn.textContent = buttonText;

    // Update tooltip
    const tooltips = {
      [this.THEMES.LIGHT]: 'Switch to dark mode',
      [this.THEMES.DARK]: 'Switch to light mode'
    };

    let tooltip = tooltips[effectiveTheme === this.THEMES.DARK ? this.THEMES.LIGHT : this.THEMES.DARK];
    if (isSystem) {
      tooltip += ' (currently following system preference)';
    }

    this.themeToggleBtn.title = tooltip;

    // Update ARIA state
    this.updateAriaState();
  }

  trackThemeChange(theme) {
    // Analytics tracking (placeholder for actual implementation)
    if (typeof gtag !== 'undefined') {
      gtag('event', 'theme_changed', {
        theme: theme,
        is_system_preference: this.currentTheme === this.THEMES.SYSTEM
      });
    }

    // Console logging for development
    console.log(`🎨 Theme changed to: ${theme}`, {
      userPreference: this.currentTheme,
      systemPreference: this.systemPreference,
      effectiveTheme: this.getEffectiveTheme()
    });
  }

  // Public API methods
  setTheme(theme) {
    if (Object.values(this.THEMES).includes(theme)) {
      this.currentTheme = theme;
      this.savePreference(theme);
      this.applyTheme();
      this.updateToggleButton();
    }
  }

  getCurrentTheme() {
    return {
      preference: this.currentTheme,
      effective: this.getEffectiveTheme(),
      system: this.systemPreference
    };
  }
}

// CSS for theme transitions (injected dynamically)
const themeCSS = `
/* Smooth theme transitions */
body.theme-transitioning,
body.theme-transitioning *,
body.theme-transitioning *:before,
body.theme-transitioning *:after {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease !important;
  transition-delay: 0s !important;
}

/* Enhanced focus styles for theme toggle */
.theme-toggle:focus {
  outline: 2px solid var(--color-primary, #3b82f6);
  outline-offset: 2px;
}

/* System preference indicator */
.theme-toggle[aria-checked="true"] {
  background: var(--color-primary, #3b82f6);
  color: white;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .theme-toggle {
    border: 2px solid currentColor;
  }

  .theme-toggle:focus {
    outline-width: 3px;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  body.theme-transitioning,
  body.theme-transitioning *,
  body.theme-transitioning *:before,
  body.theme-transitioning *:after {
    transition: none !important;
  }
}

/* Screen reader only content */
.sr-only {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}
`;

// Inject theme styles
function injectThemeStyles() {
  const styleElement = document.createElement('style');
  styleElement.textContent = themeCSS;
  document.head.appendChild(styleElement);
}

// Initialize theme manager when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    injectThemeStyles();
    window.themeManager = new ThemeManager();
  });
} else {
  injectThemeStyles();
  window.themeManager = new ThemeManager();
}

// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThemeManager;
}
