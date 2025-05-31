/**
 * IndicatorStyles - Enhanced CSS with Mobile-First Responsive Design
 * 2025 Gen Z Optimized Styles with Modern CSS Features
 */

export class IndicatorStyles {
  private static instance: IndicatorStyles;
  private styleElement: HTMLStyleElement | null = null;
  private isInjected: boolean = false;

  private constructor() {}

  public static getInstance(): IndicatorStyles {
    if (!IndicatorStyles.instance) {
      IndicatorStyles.instance = new IndicatorStyles();
    }
    return IndicatorStyles.instance;
  }

  public injectStyles(): void {
    if (this.isInjected) return;

    this.styleElement = document.createElement('style');
    this.styleElement.id = 'truthlens-indicator-styles-2025';
    this.styleElement.textContent = this.generateCSS();
    
    document.head.appendChild(this.styleElement);
    this.isInjected = true;
  }

  private generateCSS(): string {
    return `
      /* TruthLens 2025 Indicator Styles - Mobile-First Design */
      
      /* CSS Custom Properties for Theming */
      :root {
        --truthlens-primary-green: #10b981;
        --truthlens-primary-yellow: #f59e0b;
        --truthlens-primary-red: #ef4444;
        --truthlens-neutral: #6b7280;
        
        --truthlens-bg-light: #ffffff;
        --truthlens-bg-dark: #1f2937;
        --truthlens-border-light: #e5e7eb;
        --truthlens-border-dark: #374151;
        
        --truthlens-text-light: #111827;
        --truthlens-text-dark: #f9fafb;
        --truthlens-text-muted-light: #6b7280;
        --truthlens-text-muted-dark: #9ca3af;
        
        --truthlens-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        --truthlens-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        
        --truthlens-focus-ring: 0 0 0 3px rgba(59, 130, 246, 0.4);
        --truthlens-animation-duration: 150ms;
        --truthlens-border-radius: 12px;
        
        /* Touch target sizes */
        --truthlens-touch-min: 44px;
        --truthlens-indicator-size-compact: 44px;
        --truthlens-indicator-size-standard: 56px;
        --truthlens-indicator-size-large: 72px;
      }

      /* Dark mode custom properties */
      @media (prefers-color-scheme: dark) {
        :root {
          --truthlens-primary-green: #059669;
          --truthlens-primary-yellow: #d97706;
          --truthlens-primary-red: #dc2626;
        }
      }

      /* Base Indicator Styles */
      .truthlens-indicator {
        /* Positioning and layout */
        position: fixed;
        z-index: 2147483647;
        display: flex;
        align-items: center;
        justify-content: center;
        
        /* Sizing - mobile-first */
        width: var(--indicator-width, var(--truthlens-indicator-size-standard));
        height: var(--indicator-height, var(--truthlens-indicator-size-standard));
        min-width: var(--truthlens-touch-min);
        min-height: var(--truthlens-touch-min);
        
        /* Appearance */
        background: var(--indicator-bg, var(--truthlens-bg-light));
        border: 2px solid var(--indicator-border, var(--truthlens-border-light));
        border-radius: var(--truthlens-border-radius);
        box-shadow: var(--truthlens-shadow);
        
        /* Typography */
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'SF Pro Display', sans-serif;
        font-weight: 600;
        font-size: 14px;
        color: var(--indicator-color, var(--truthlens-text-light));
        
        /* Interaction */
        cursor: pointer;
        user-select: none;
        touch-action: manipulation;
        
        /* Animation */
        transition: all var(--animation-duration, var(--truthlens-animation-duration)) cubic-bezier(0.4, 0, 0.2, 1);
        transform: translateZ(0); /* Hardware acceleration */
        will-change: transform, opacity;
        
        /* Initial state */
        opacity: 0;
        transform: translateY(-10px) scale(0.95);
        
        /* Accessibility */
        outline: none;
      }

      /* Indicator visibility states */
      .truthlens-indicator.truthlens-visible {
        opacity: 1;
        transform: translateY(0) scale(1);
      }

      .truthlens-indicator.truthlens-hiding {
        opacity: 0;
        transform: translateY(-10px) scale(0.95);
        pointer-events: none;
      }

      /* Size variations */
      .truthlens-indicator.truthlens-compact {
        width: var(--truthlens-indicator-size-compact);
        height: var(--truthlens-indicator-size-compact);
        font-size: 12px;
      }

      .truthlens-indicator.truthlens-large {
        width: var(--truthlens-indicator-size-large);
        height: var(--truthlens-indicator-size-large);
        font-size: 16px;
      }

      /* Level-specific styling */
      .truthlens-indicator.truthlens-level-high {
        --indicator-color: var(--truthlens-primary-green);
        --indicator-border: var(--truthlens-primary-green);
      }

      .truthlens-indicator.truthlens-level-medium {
        --indicator-color: var(--truthlens-primary-yellow);
        --indicator-border: var(--truthlens-primary-yellow);
      }

      .truthlens-indicator.truthlens-level-low {
        --indicator-color: var(--truthlens-primary-red);
        --indicator-border: var(--truthlens-primary-red);
      }

      .truthlens-indicator.truthlens-level-unknown {
        --indicator-color: var(--truthlens-neutral);
        --indicator-border: var(--truthlens-neutral);
      }

      /* Content layout */
      .truthlens-content {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        width: 100%;
        height: 100%;
      }

      /* Emoji styling */
      .truthlens-emoji {
        font-size: var(--emoji-size, 24px);
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        
        /* Emoji rendering optimization */
        font-family: "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif;
        text-rendering: optimizeSpeed;
      }

      /* Score display */
      .truthlens-score {
        font-size: 10px;
        font-weight: 700;
        line-height: 1;
        color: var(--indicator-color);
        min-width: 0; /* Allow shrinking */
      }

      /* Minimized state */
      .truthlens-indicator.truthlens-minimized {
        width: var(--truthlens-indicator-size-compact);
        height: var(--truthlens-indicator-size-compact);
        padding: 0;
      }

      .truthlens-indicator.truthlens-minimized .truthlens-score {
        display: none;
      }

      .truthlens-indicator.truthlens-minimized .truthlens-emoji {
        font-size: 20px;
      }

      /* Interaction states */
      .truthlens-indicator:hover:not(.truthlens-touch-active) {
        transform: translateY(-2px) scale(1.05);
        box-shadow: var(--truthlens-shadow-lg);
        border-width: 3px;
      }

      .truthlens-indicator:active,
      .truthlens-indicator.truthlens-touch-active {
        transform: translateY(0) scale(0.98);
        transition-duration: 50ms;
      }

      .truthlens-indicator.truthlens-touched {
        background: var(--indicator-color);
        color: white;
        transform: scale(0.96);
      }

      .truthlens-indicator.truthlens-hovered {
        border-width: 3px;
        box-shadow: var(--truthlens-shadow-lg);
      }

      /* Focus states - WCAG 2.1 compliant */
      .truthlens-indicator:focus,
      .truthlens-indicator:focus-visible {
        outline: 2px solid #005fcc;
        outline-offset: 2px;
        box-shadow: var(--truthlens-focus-ring), var(--truthlens-shadow);
      }

      .truthlens-indicator.truthlens-keyboard-focused {
        outline: 3px solid #005fcc;
        outline-offset: 3px;
        box-shadow: var(--truthlens-focus-ring), var(--truthlens-shadow-lg);
      }

      /* Progressive Disclosure - Level 2 Tooltip */
      .truthlens-disclosure.truthlens-tooltip {
        position: fixed;
        z-index: 2147483646;
        opacity: 0;
        transform: translateY(10px) scale(0.95);
        pointer-events: none;
        transition: all var(--truthlens-animation-duration) cubic-bezier(0.4, 0, 0.2, 1);
      }

      .truthlens-disclosure.truthlens-tooltip.truthlens-visible {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: auto;
      }

      .truthlens-level2 {
        background: var(--truthlens-bg-light);
        border: 1px solid var(--truthlens-border-light);
        border-radius: var(--truthlens-border-radius);
        box-shadow: var(--truthlens-shadow-lg);
        padding: 16px;
        min-width: 280px;
        max-width: 320px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .truthlens-l2-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }

      .truthlens-l2-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        font-size: 14px;
        color: var(--truthlens-text-light);
      }

      .truthlens-l2-emoji {
        font-size: 18px;
      }

      .truthlens-l2-score {
        font-weight: 700;
        font-size: 16px;
        color: var(--indicator-color);
      }

      .truthlens-l2-summary {
        font-size: 13px;
        line-height: 1.4;
        color: var(--truthlens-text-muted-light);
        margin-bottom: 12px;
      }

      .truthlens-l2-confidence {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        margin-bottom: 12px;
      }

      .truthlens-confidence-label {
        color: var(--truthlens-text-muted-light);
        white-space: nowrap;
      }

      .truthlens-confidence-bar {
        flex: 1;
        height: 4px;
        background: var(--truthlens-border-light);
        border-radius: 2px;
        overflow: hidden;
      }

      .truthlens-confidence-fill {
        height: 100%;
        background: var(--indicator-color);
        transition: width 300ms ease;
      }

      .truthlens-confidence-value {
        color: var(--indicator-color);
        font-weight: 600;
        white-space: nowrap;
      }

      .truthlens-l2-expand {
        width: 100%;
        padding: 8px 12px;
        background: var(--indicator-color);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 150ms ease;
        min-height: var(--truthlens-touch-min);
      }

      .truthlens-l2-expand:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
      }

      .truthlens-l2-expand:active {
        transform: translateY(0);
      }

      /* Progressive Disclosure - Level 3 Modal */
      .truthlens-disclosure.truthlens-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 2147483645;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        opacity: 0;
        transition: all var(--truthlens-animation-duration) ease;
      }

      .truthlens-disclosure.truthlens-modal.truthlens-visible {
        opacity: 1;
      }

      .truthlens-level3 {
        background: var(--truthlens-bg-light);
        border-radius: var(--truthlens-border-radius);
        box-shadow: var(--truthlens-shadow-lg);
        width: 100%;
        max-width: 480px;
        max-height: 90vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        transform: scale(0.95) translateY(20px);
        transition: transform var(--truthlens-animation-duration) ease;
      }

      .truthlens-disclosure.truthlens-modal.truthlens-visible .truthlens-level3 {
        transform: scale(1) translateY(0);
      }

      .truthlens-l3-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px;
        border-bottom: 1px solid var(--truthlens-border-light);
      }

      .truthlens-l3-title {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 18px;
        font-weight: 700;
        color: var(--truthlens-text-light);
        margin: 0;
      }

      .truthlens-l3-emoji {
        font-size: 24px;
      }

      .truthlens-l3-close {
        width: 32px;
        height: 32px;
        border: none;
        background: var(--truthlens-border-light);
        border-radius: 50%;
        color: var(--truthlens-text-muted-light);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        transition: all 150ms ease;
      }

      .truthlens-l3-close:hover {
        background: var(--truthlens-border-dark);
        color: var(--truthlens-text-light);
      }

      .truthlens-l3-details {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
      }

      .truthlens-l3-section {
        margin-bottom: 24px;
      }

      .truthlens-l3-section:last-child {
        margin-bottom: 0;
      }

      .truthlens-l3-section-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--truthlens-text-light);
        margin: 0 0 12px 0;
      }

      /* Score section */
      .truthlens-score-display {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .truthlens-score-circle {
        width: 60px;
        height: 60px;
        border: 3px solid var(--indicator-color);
        border-radius: 50%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .truthlens-score-number {
        font-size: 18px;
        font-weight: 700;
        color: var(--indicator-color);
        line-height: 1;
      }

      .truthlens-score-max {
        font-size: 10px;
        color: var(--truthlens-text-muted-light);
        line-height: 1;
      }

      .truthlens-score-breakdown {
        flex: 1;
      }

      .truthlens-score-level {
        font-size: 16px;
        font-weight: 600;
        color: var(--indicator-color);
        margin-bottom: 4px;
      }

      .truthlens-score-confidence {
        font-size: 12px;
        color: var(--truthlens-text-muted-light);
      }

      /* Claims section */
      .truthlens-claims-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .truthlens-claim {
        padding: 12px;
        background: rgba(0, 0, 0, 0.02);
        border-radius: 8px;
        border-left: 3px solid var(--indicator-color);
      }

      .truthlens-claim-header {
        margin-bottom: 8px;
      }

      .truthlens-claim-verdict {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        padding: 2px 6px;
        border-radius: 4px;
        background: var(--indicator-color);
        color: white;
      }

      .truthlens-claim-text {
        font-size: 13px;
        color: var(--truthlens-text-light);
        margin-bottom: 6px;
        line-height: 1.4;
      }

      .truthlens-claim-explanation {
        font-size: 12px;
        color: var(--truthlens-text-muted-light);
        line-height: 1.3;
      }

      /* Footer actions */
      .truthlens-l3-footer {
        display: flex;
        gap: 8px;
        padding: 20px;
        border-top: 1px solid var(--truthlens-border-light);
      }

      .truthlens-l3-action {
        flex: 1;
        padding: 12px 16px;
        border: 1px solid var(--truthlens-border-light);
        background: white;
        color: var(--truthlens-text-light);
        border-radius: 8px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 150ms ease;
        min-height: var(--truthlens-touch-min);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
      }

      .truthlens-l3-action:hover {
        background: var(--indicator-color);
        color: white;
        border-color: var(--indicator-color);
      }

      /* Dark mode styles */
      @media (prefers-color-scheme: dark) {
        .truthlens-indicator {
          --indicator-bg: var(--truthlens-bg-dark);
          --indicator-border: var(--truthlens-border-dark);
          color: var(--truthlens-text-dark);
        }

        .truthlens-level2,
        .truthlens-level3 {
          background: var(--truthlens-bg-dark);
          border-color: var(--truthlens-border-dark);
          color: var(--truthlens-text-dark);
        }

        .truthlens-l2-title,
        .truthlens-l3-title,
        .truthlens-l3-section-title,
        .truthlens-claim-text {
          color: var(--truthlens-text-dark);
        }

        .truthlens-l2-summary,
        .truthlens-confidence-label,
        .truthlens-score-confidence,
        .truthlens-claim-explanation {
          color: var(--truthlens-text-muted-dark);
        }

        .truthlens-l3-close {
          background: var(--truthlens-border-dark);
          color: var(--truthlens-text-muted-dark);
        }

        .truthlens-l3-close:hover {
          background: var(--truthlens-border-light);
          color: var(--truthlens-text-dark);
        }

        .truthlens-l3-action {
          background: var(--truthlens-bg-dark);
          color: var(--truthlens-text-dark);
          border-color: var(--truthlens-border-dark);
        }

        .truthlens-claim {
          background: rgba(255, 255, 255, 0.05);
        }
      }

      /* High contrast mode */
      @media (prefers-contrast: high) {
        .truthlens-indicator {
          border-width: 3px;
          font-weight: 700;
        }

        .truthlens-indicator:focus {
          outline-width: 4px;
          outline-offset: 3px;
        }

        .truthlens-level2,
        .truthlens-level3 {
          border-width: 2px;
        }
      }

      /* Reduced motion */
      @media (prefers-reduced-motion: reduce) {
        .truthlens-indicator,
        .truthlens-indicator *,
        .truthlens-disclosure,
        .truthlens-disclosure * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }
      }

      /* Mobile-specific optimizations */
      @media (max-width: 768px) {
        .truthlens-level2 {
          min-width: 260px;
          max-width: calc(100vw - 40px);
        }

        .truthlens-level3 {
          max-width: calc(100vw - 20px);
          margin: 10px;
        }

        .truthlens-l3-header,
        .truthlens-l3-details,
        .truthlens-l3-footer {
          padding: 16px;
        }

        .truthlens-l3-footer {
          flex-direction: column;
        }

        .truthlens-score-display {
          flex-direction: column;
          text-align: center;
          gap: 12px;
        }

        /* Ensure proper touch targets on mobile */
        .truthlens-indicator {
          min-width: 48px;
          min-height: 48px;
        }

        .truthlens-l2-expand,
        .truthlens-l3-action {
          min-height: 48px;
          font-size: 14px;
        }
      }

      /* Large screens */
      @media (min-width: 1200px) {
        .truthlens-level3 {
          max-width: 600px;
        }

        .truthlens-score-display {
          gap: 24px;
        }

        .truthlens-score-circle {
          width: 80px;
          height: 80px;
        }

        .truthlens-score-number {
          font-size: 24px;
        }
      }

      /* Print styles */
      @media print {
        .truthlens-indicator,
        .truthlens-disclosure {
          display: none !important;
        }
      }

      /* Accessibility utilities */
      .truthlens-sr-only {
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

      /* Animation utilities for gesture feedback */
      .truthlens-indicator.truthlens-gesture-enabled {
        transform-origin: center;
      }

      .truthlens-indicator.truthlens-swipe-feedback {
        animation: truthlens-swipe-hint 300ms ease-out;
      }

      @keyframes truthlens-swipe-hint {
        0% { transform: translateX(0); }
        50% { transform: translateX(5px); }
        100% { transform: translateX(0); }
      }

      /* Loading states */
      .truthlens-indicator.truthlens-loading {
        opacity: 0.7;
        pointer-events: none;
      }

      .truthlens-indicator.truthlens-loading .truthlens-emoji {
        animation: truthlens-pulse 1s ease-in-out infinite;
      }

      @keyframes truthlens-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      /* Error states */
      .truthlens-indicator.truthlens-error {
        --indicator-color: #dc2626;
        --indicator-border: #dc2626;
        animation: truthlens-shake 300ms ease-in-out;
      }

      @keyframes truthlens-shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-2px); }
        75% { transform: translateX(2px); }
      }
    `;
  }

  public updateTheme(theme: 'light' | 'dark' | 'auto'): void {
    if (!this.styleElement) return;

    const root = document.documentElement;
    
    if (theme === 'auto') {
      root.classList.remove('truthlens-force-light', 'truthlens-force-dark');
    } else if (theme === 'dark') {
      root.classList.remove('truthlens-force-light');
      root.classList.add('truthlens-force-dark');
    } else {
      root.classList.remove('truthlens-force-dark');
      root.classList.add('truthlens-force-light');
    }
  }

  public updateColorScheme(colors: {
    primary?: string;
    background?: string;
    border?: string;
    text?: string;
  }): void {
    if (!this.styleElement) return;

    const root = document.documentElement;
    
    if (colors.primary) {
      root.style.setProperty('--truthlens-primary-custom', colors.primary);
    }
    if (colors.background) {
      root.style.setProperty('--truthlens-bg-custom', colors.background);
    }
    if (colors.border) {
      root.style.setProperty('--truthlens-border-custom', colors.border);
    }
    if (colors.text) {
      root.style.setProperty('--truthlens-text-custom', colors.text);
    }
  }

  public removeStyles(): void {
    if (this.styleElement && this.styleElement.parentNode) {
      this.styleElement.parentNode.removeChild(this.styleElement);
      this.styleElement = null;
      this.isInjected = false;
    }
  }

  public isStylesInjected(): boolean {
    return this.isInjected;
  }
}