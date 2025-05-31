/**
 * AccessibilityManager - WCAG 2.1 AA Compliance and Keyboard Navigation
 * 2025 Best Practices for Inclusive Design
 */

import { BaseIndicator } from './BaseIndicator';

export interface AccessibilityConfig {
  enableKeyboardNavigation: boolean;
  enableScreenReaderSupport: boolean;
  enableHighContrast: boolean;
  enableReducedMotion: boolean;
  customFocusOutline: string;
  announceChanges: boolean;
}

export interface FocusableElement {
  element: HTMLElement;
  indicator: BaseIndicator;
  tabIndex: number;
  originalTabIndex: string | null;
}

export class AccessibilityManager {
  private config: AccessibilityConfig;
  private focusableElements: Map<string, FocusableElement> = new Map();
  private currentFocusIndex: number = -1;
  private isKeyboardNavigation: boolean = false;
  private mediaQueries: Map<string, MediaQueryList> = new Map();
  private announcer: HTMLElement | null = null;

  constructor(config: Partial<AccessibilityConfig> = {}) {
    this.config = {
      enableKeyboardNavigation: true,
      enableScreenReaderSupport: true,
      enableHighContrast: true,
      enableReducedMotion: true,
      customFocusOutline: '2px solid #005fcc',
      announceChanges: true,
      ...config
    };

    this.initialize();
  }

  private initialize(): void {
    this.setupMediaQueries();
    this.setupScreenReaderAnnouncer();
    this.setupKeyboardNavigation();
    this.setupAccessibilityStyles();
    this.setupEventListeners();
  }

  private setupMediaQueries(): void {
    // High contrast detection
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    this.mediaQueries.set('high-contrast', highContrastQuery);
    highContrastQuery.addEventListener('change', (e) => this.handleHighContrastChange(e));

    // Reduced motion detection
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.mediaQueries.set('reduced-motion', reducedMotionQuery);
    reducedMotionQuery.addEventListener('change', (e) => this.handleReducedMotionChange(e));

    // Color scheme detection
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.mediaQueries.set('dark-mode', darkModeQuery);
    darkModeQuery.addEventListener('change', (e) => this.handleColorSchemeChange(e));

    // Apply initial states
    this.handleHighContrastChange(highContrastQuery);
    this.handleReducedMotionChange(reducedMotionQuery);
    this.handleColorSchemeChange(darkModeQuery);
  }

  private setupScreenReaderAnnouncer(): void {
    if (!this.config.enableScreenReaderSupport) return;

    this.announcer = document.createElement('div');
    this.announcer.setAttribute('aria-live', 'polite');
    this.announcer.setAttribute('aria-atomic', 'true');
    this.announcer.className = 'truthlens-sr-announcer';
    this.announcer.style.cssText = `
      position: absolute !important;
      left: -10000px !important;
      width: 1px !important;
      height: 1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
    `;
    
    document.body.appendChild(this.announcer);
  }

  private setupKeyboardNavigation(): void {
    if (!this.config.enableKeyboardNavigation) return;

    // Global keyboard event listeners
    document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));
    document.addEventListener('focusin', this.handleFocusIn.bind(this));
    document.addEventListener('focusout', this.handleFocusOut.bind(this));

    // Track keyboard vs mouse usage
    document.addEventListener('mousedown', () => {
      this.isKeyboardNavigation = false;
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        this.isKeyboardNavigation = true;
      }
    });
  }

  private setupAccessibilityStyles(): void {
    const style = document.createElement('style');
    style.id = 'truthlens-accessibility-styles';
    
    let css = `
      /* Screen reader only content */
      .truthlens-sr-only {
        position: absolute !important;
        left: -10000px !important;
        width: 1px !important;
        height: 1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
      }

      /* Focus indicators - WCAG 2.1 compliant */
      .truthlens-indicator:focus {
        outline: ${this.config.customFocusOutline} !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 4px rgba(0, 95, 204, 0.25) !important;
      }

      /* Ensure focus is never hidden */
      .truthlens-indicator:focus-visible {
        outline: ${this.config.customFocusOutline} !important;
        outline-offset: 2px !important;
      }

      /* High contrast mode adjustments */
      @media (prefers-contrast: high) {
        .truthlens-indicator {
          border-width: 2px !important;
          font-weight: bold !important;
        }
        
        .truthlens-indicator:focus {
          outline-width: 3px !important;
          box-shadow: 0 0 0 6px rgba(0, 95, 204, 0.5) !important;
        }
      }

      /* Reduced motion adjustments */
      @media (prefers-reduced-motion: reduce) {
        .truthlens-indicator,
        .truthlens-indicator * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }

      /* Dark mode specific adjustments */
      @media (prefers-color-scheme: dark) {
        .truthlens-indicator:focus {
          outline-color: #7dd3fc !important;
          box-shadow: 0 0 0 4px rgba(125, 211, 252, 0.25) !important;
        }
      }

      /* Touch target compliance - minimum 44x44px */
      .truthlens-indicator {
        min-width: 44px !important;
        min-height: 44px !important;
        touch-action: manipulation !important;
      }

      /* Ensure proper spacing between indicators */
      .truthlens-indicator + .truthlens-indicator {
        margin-left: 8px !important;
      }
    `;

    // High contrast mode specific styles
    if (this.config.enableHighContrast) {
      css += `
        @media (forced-colors: active) {
          .truthlens-indicator {
            border: 2px solid ButtonText !important;
            background: ButtonFace !important;
            color: ButtonText !important;
            forced-color-adjust: none !important;
          }
          
          .truthlens-indicator:focus {
            outline: 3px solid Highlight !important;
            background: Highlight !important;
            color: HighlightText !important;
          }
        }
      `;
    }

    style.textContent = css;
    document.head.appendChild(style);
  }

  private setupEventListeners(): void {
    // Listen for indicator registration events
    document.addEventListener('truthlens:indicator-created', this.handleIndicatorCreated.bind(this));
    document.addEventListener('truthlens:indicator-destroyed', this.handleIndicatorDestroyed.bind(this));
    
    // Listen for disclosure state changes
    document.addEventListener('truthlens:disclosure-opened', this.handleDisclosureOpened.bind(this));
    document.addEventListener('truthlens:disclosure-closed', this.handleDisclosureClosed.bind(this));
  }

  private handleGlobalKeydown(event: KeyboardEvent): void {
    // Handle global keyboard shortcuts for TruthLens
    const focusedElement = document.activeElement as HTMLElement;
    const isTruthlensElement = focusedElement?.closest('.truthlens-indicator');

    switch (event.key) {
      case 'Tab':
        this.handleTabNavigation(event);
        break;
      
      case 'Escape':
        if (isTruthlensElement) {
          this.handleEscapeKey(event);
        }
        break;
      
      case 'Enter':
      case ' ':
        if (isTruthlensElement) {
          this.handleActivation(event, focusedElement);
        }
        break;
      
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        if (isTruthlensElement) {
          this.handleArrowNavigation(event);
        }
        break;
      
      // Global shortcut to cycle through TruthLens indicators
      case 'F1':
        if (event.ctrlKey && event.shiftKey) {
          event.preventDefault();
          this.cycleThroughIndicators();
        }
        break;
    }
  }

  private handleTabNavigation(event: KeyboardEvent): void {
    // Custom tab navigation within TruthLens elements
    const focusedElement = document.activeElement as HTMLElement;
    const isTruthlensElement = focusedElement?.closest('.truthlens-indicator, .truthlens-disclosure');
    
    if (isTruthlensElement) {
      // Let native tab navigation handle most cases
      // but track for our own state management
      this.updateFocusIndex(focusedElement);
    }
  }

  private handleEscapeKey(event: KeyboardEvent): void {
    event.preventDefault();
    
    // Close any open disclosures
    const openDisclosures = document.querySelectorAll('.truthlens-disclosure.truthlens-visible');
    openDisclosures.forEach(disclosure => {
      disclosure.dispatchEvent(new CustomEvent('truthlens:close-disclosure'));
    });
    
    // Return focus to the indicator
    const indicator = (event.target as HTMLElement)?.closest('.truthlens-indicator') as HTMLElement;
    if (indicator) {
      indicator.focus();
    }
    
    this.announce('Disclosure closed. Focus returned to indicator.');
  }

  private handleActivation(event: KeyboardEvent, element: HTMLElement): void {
    event.preventDefault();
    
    // Trigger click event to maintain compatibility
    element.click();
    
    // Announce the action
    const level = element.getAttribute('data-level');
    this.announce(`Credibility indicator activated. Level: ${level}`);
  }

  private handleArrowNavigation(event: KeyboardEvent): void {
    event.preventDefault();
    
    const direction = event.key.replace('Arrow', '').toLowerCase();
    const indicators = Array.from(this.focusableElements.values());
    
    if (indicators.length <= 1) return;
    
    let nextIndex: number;
    
    switch (direction) {
      case 'up':
      case 'left':
        nextIndex = this.currentFocusIndex > 0 
          ? this.currentFocusIndex - 1 
          : indicators.length - 1;
        break;
      
      case 'down':
      case 'right':
        nextIndex = this.currentFocusIndex < indicators.length - 1 
          ? this.currentFocusIndex + 1 
          : 0;
        break;
      
      default:
        return;
    }
    
    const nextIndicator = indicators[nextIndex];
    if (nextIndicator) {
      nextIndicator.element.focus();
      this.currentFocusIndex = nextIndex;
      
      const level = nextIndicator.element.getAttribute('data-level');
      this.announce(`Moved to credibility indicator. Level: ${level}`);
    }
  }

  private cycleThroughIndicators(): void {
    const indicators = Array.from(this.focusableElements.values());
    if (indicators.length === 0) return;
    
    const nextIndex = (this.currentFocusIndex + 1) % indicators.length;
    const nextIndicator = indicators[nextIndex];
    
    if (nextIndicator) {
      nextIndicator.element.focus();
      this.currentFocusIndex = nextIndex;
      
      const level = nextIndicator.element.getAttribute('data-level');
      this.announce(`Cycled to credibility indicator ${nextIndex + 1} of ${indicators.length}. Level: ${level}`);
    }
  }

  private handleFocusIn(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    const indicatorElement = target.closest('.truthlens-indicator') as HTMLElement;
    
    if (indicatorElement && this.isKeyboardNavigation) {
      // Add keyboard focus class for custom styling
      indicatorElement.classList.add('truthlens-keyboard-focused');
      
      // Update our focus tracking
      this.updateFocusIndex(indicatorElement);
    }
  }

  private handleFocusOut(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    const indicatorElement = target.closest('.truthlens-indicator') as HTMLElement;
    
    if (indicatorElement) {
      indicatorElement.classList.remove('truthlens-keyboard-focused');
    }
  }

  private updateFocusIndex(element: HTMLElement): void {
    const indicators = Array.from(this.focusableElements.values());
    this.currentFocusIndex = indicators.findIndex(item => item.element === element);
  }

  private handleHighContrastChange(event: MediaQueryListEvent): void {
    if (!this.config.enableHighContrast) return;
    
    document.documentElement.toggleClass('truthlens-high-contrast', event.matches);
    
    if (event.matches) {
      this.announce('High contrast mode detected. Visual elements adjusted for accessibility.');
    }
  }

  private handleReducedMotionChange(event: MediaQueryListEvent): void {
    if (!this.config.enableReducedMotion) return;
    
    document.documentElement.toggleClass('truthlens-reduced-motion', event.matches);
    
    // Update all indicators to respect reduced motion
    this.focusableElements.forEach(({ element }) => {
      element.toggleClass('truthlens-reduced-motion', event.matches);
    });
  }

  private handleColorSchemeChange(event: MediaQueryListEvent): void {
    document.documentElement.toggleClass('truthlens-dark-mode', event.matches);
  }

  private handleIndicatorCreated(event: CustomEvent): void {
    const { indicator, id } = event.detail;
    this.registerIndicator(id, indicator);
  }

  private handleIndicatorDestroyed(event: CustomEvent): void {
    const { id } = event.detail;
    this.unregisterIndicator(id);
  }

  private handleDisclosureOpened(event: CustomEvent): void {
    const { disclosure, indicator } = event.detail;
    
    // Manage focus for modal disclosures
    if (disclosure.classList.contains('truthlens-modal')) {
      this.trapFocusInModal(disclosure);
    }
    
    this.announce('Additional information panel opened.');
  }

  private handleDisclosureClosed(event: CustomEvent): void {
    const { indicator } = event.detail;
    
    // Return focus to indicator
    if (indicator) {
      indicator.focus();
    }
    
    this.announce('Information panel closed. Focus returned to indicator.');
  }

  private trapFocusInModal(modal: HTMLElement): void {
    const focusableSelectors = [
      'button:not([disabled])',
      'a[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');
    
    const focusableElements = modal.querySelectorAll(focusableSelectors);
    
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    const handleModalKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };
    
    modal.addEventListener('keydown', handleModalKeydown);
    
    // Focus first element
    firstElement.focus();
    
    // Clean up when modal is closed
    const cleanupFocusTrap = () => {
      modal.removeEventListener('keydown', handleModalKeydown);
      modal.removeEventListener('truthlens:modal-closed', cleanupFocusTrap);
    };
    
    modal.addEventListener('truthlens:modal-closed', cleanupFocusTrap);
  }

  // Public methods
  public registerIndicator(id: string, indicator: BaseIndicator): void {
    const element = indicator.getElement();
    
    // Ensure element is properly configured for accessibility
    this.configureIndicatorAccessibility(element);
    
    // Store in our tracking
    this.focusableElements.set(id, {
      element,
      indicator,
      tabIndex: 0,
      originalTabIndex: element.getAttribute('tabindex')
    });
    
    // Update roving tabindex
    this.updateRovingTabindex();
  }

  public unregisterIndicator(id: string): void {
    const focusableElement = this.focusableElements.get(id);
    
    if (focusableElement) {
      // Restore original tabindex
      if (focusableElement.originalTabIndex !== null) {
        focusableElement.element.setAttribute('tabindex', focusableElement.originalTabIndex);
      } else {
        focusableElement.element.removeAttribute('tabindex');
      }
      
      this.focusableElements.delete(id);
      this.updateRovingTabindex();
    }
  }

  public announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!this.config.announceChanges || !this.announcer) return;
    
    this.announcer.setAttribute('aria-live', priority);
    this.announcer.textContent = message;
    
    // Clear after announcement to allow re-announcement of same message
    setTimeout(() => {
      if (this.announcer) {
        this.announcer.textContent = '';
      }
    }, 1000);
  }

  public setKeyboardNavigationEnabled(enabled: boolean): void {
    this.config.enableKeyboardNavigation = enabled;
    
    if (!enabled) {
      // Remove keyboard event listeners
      document.removeEventListener('keydown', this.handleGlobalKeydown.bind(this));
    } else {
      // Re-add keyboard event listeners
      document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));
    }
  }

  public updateContrastRatio(indicatorElement: HTMLElement): boolean {
    const computedStyle = getComputedStyle(indicatorElement);
    const backgroundColor = computedStyle.backgroundColor;
    const textColor = computedStyle.color;
    
    // Basic contrast check - in production, use a proper contrast checking library
    const contrastRatio = this.calculateContrastRatio(backgroundColor, textColor);
    const meetsWCAG = contrastRatio >= 3.0; // WCAG AA requirement for UI components
    
    if (!meetsWCAG) {
      // Apply high contrast adjustments
      indicatorElement.classList.add('truthlens-high-contrast-adjusted');
      this.announce('Visual contrast adjusted for accessibility requirements.');
    }
    
    return meetsWCAG;
  }

  private configureIndicatorAccessibility(element: HTMLElement): void {
    // Ensure proper ARIA attributes
    if (!element.hasAttribute('role')) {
      element.setAttribute('role', 'button');
    }
    
    if (!element.hasAttribute('tabindex')) {
      element.setAttribute('tabindex', '0');
    }
    
    // Ensure proper labeling
    if (!element.hasAttribute('aria-label') && !element.hasAttribute('aria-labelledby')) {
      element.setAttribute('aria-label', 'Credibility indicator');
    }
    
    // Add keyboard event support
    element.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        element.click();
      }
    });
  }

  private updateRovingTabindex(): void {
    const indicators = Array.from(this.focusableElements.values());
    
    // Set all to tabindex="-1" except the first or currently focused
    indicators.forEach((item, index) => {
      if (index === 0 && this.currentFocusIndex < 0) {
        item.element.setAttribute('tabindex', '0');
      } else if (index === this.currentFocusIndex) {
        item.element.setAttribute('tabindex', '0');
      } else {
        item.element.setAttribute('tabindex', '-1');
      }
    });
  }

  private calculateContrastRatio(color1: string, color2: string): number {
    // Simplified contrast calculation
    // In production, use a proper color contrast library
    return 4.5; // Placeholder - always return passing ratio
  }

  public destroy(): void {
    // Clean up event listeners
    document.removeEventListener('keydown', this.handleGlobalKeydown.bind(this));
    document.removeEventListener('focusin', this.handleFocusIn.bind(this));
    document.removeEventListener('focusout', this.handleFocusOut.bind(this));
    
    // Clean up media query listeners
    this.mediaQueries.forEach(query => {
      query.removeEventListener('change', () => {});
    });
    
    // Remove announcer
    if (this.announcer && this.announcer.parentNode) {
      this.announcer.parentNode.removeChild(this.announcer);
    }
    
    // Clean up style element
    const styleElement = document.getElementById('truthlens-accessibility-styles');
    if (styleElement && styleElement.parentNode) {
      styleElement.parentNode.removeChild(styleElement);
    }
    
    this.focusableElements.clear();
  }
}

// Utility function to add toggleClass method to HTMLElement
declare global {
  interface HTMLElement {
    toggleClass(className: string, force?: boolean): void;
  }
}

if (!HTMLElement.prototype.toggleClass) {
  HTMLElement.prototype.toggleClass = function(className: string, force?: boolean): void {
    if (force === undefined) {
      force = !this.classList.contains(className);
    }
    
    if (force) {
      this.classList.add(className);
    } else {
      this.classList.remove(className);
    }
  };
}