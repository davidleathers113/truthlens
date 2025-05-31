/**
 * BaseIndicator - Core Visual Indicator Component
 * 2025 Gen Z Optimized Design with Traffic Light Emoji System
 */

import { CredibilityScore } from '@shared/types';

export interface IndicatorConfig {
  size: 'compact' | 'standard' | 'large';
  theme: 'light' | 'dark' | 'auto';
  showScore: boolean;
  showEmoji: boolean;
  animationDuration: number; // milliseconds, must be <200ms
}

export interface IndicatorPosition {
  x: number;
  y: number;
  placement: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  constraints: {
    maxWidth: number;
    maxHeight: number;
    margin: number;
  };
}

export class BaseIndicator {
  private element: HTMLElement;
  private config: IndicatorConfig;
  private credibility: CredibilityScore;
  private isVisible: boolean = false;
  private isMinimized: boolean = false;

  constructor(credibility: CredibilityScore, config: Partial<IndicatorConfig> = {}) {
    this.credibility = credibility;
    this.config = {
      size: 'standard',
      theme: 'auto',
      showScore: true,
      showEmoji: true,
      animationDuration: 150, // 2025 Gen Z standard: <200ms
      ...config
    };
    
    this.element = this.createElement();
    this.attachEventListeners();
  }

  private createElement(): HTMLElement {
    const indicator = document.createElement('div');
    indicator.className = this.getBaseClassNames();
    indicator.setAttribute('role', 'button');
    indicator.setAttribute('tabindex', '0');
    indicator.setAttribute('aria-label', this.getAriaLabel());
    indicator.setAttribute('aria-describedby', `truthlens-desc-${this.getIndicatorId()}`);
    
    // Touch target compliance: minimum 44x44px
    const sizeClass = this.getSizeClass();
    const emojiEl = this.createEmojiElement();
    const scoreEl = this.createScoreElement();
    const contentEl = this.createContentElement(emojiEl, scoreEl);
    
    indicator.appendChild(contentEl);
    
    // Add hidden description for screen readers
    const description = this.createScreenReaderDescription();
    indicator.appendChild(description);
    
    // Set CSS custom properties for theming
    this.applyStyling(indicator);
    
    return indicator;
  }

  private getBaseClassNames(): string {
    const classes = [
      'truthlens-indicator',
      'truthlens-2025',
      `truthlens-${this.config.size}`,
      `truthlens-${this.config.theme}`,
      `truthlens-level-${this.credibility.level}`
    ];
    
    if (this.isMinimized) classes.push('truthlens-minimized');
    return classes.join(' ');
  }

  private getSizeClass(): { width: string; height: string; fontSize: string } {
    const sizes = {
      compact: { width: '44px', height: '44px', fontSize: '20px' },
      standard: { width: '56px', height: '56px', fontSize: '24px' },
      large: { width: '72px', height: '72px', fontSize: '32px' }
    };
    return sizes[this.config.size];
  }

  private createEmojiElement(): HTMLElement {
    const emoji = document.createElement('span');
    emoji.className = 'truthlens-emoji';
    emoji.textContent = this.getTrafficLightEmoji();
    emoji.setAttribute('aria-hidden', 'true'); // Decorative, label provides context
    return emoji;
  }

  private createScoreElement(): HTMLElement {
    const score = document.createElement('span');
    score.className = 'truthlens-score';
    score.textContent = `${this.credibility.score}`;
    score.setAttribute('aria-hidden', 'true'); // Included in main label
    return score;
  }

  private createContentElement(emojiEl: HTMLElement, scoreEl: HTMLElement): HTMLElement {
    const content = document.createElement('div');
    content.className = 'truthlens-content';
    
    if (this.config.showEmoji) {
      content.appendChild(emojiEl);
    }
    
    if (this.config.showScore) {
      content.appendChild(scoreEl);
    }
    
    return content;
  }

  private createScreenReaderDescription(): HTMLElement {
    const description = document.createElement('div');
    description.id = `truthlens-desc-${this.getIndicatorId()}`;
    description.className = 'truthlens-sr-only';
    description.textContent = this.getDetailedDescription();
    return description;
  }

  private getTrafficLightEmoji(): string {
    // 2025 Gen Z Traffic Light System
    const emojis = {
      high: '🟢',     // Green circle
      medium: '🟡',   // Yellow circle  
      low: '🔴',      // Red circle
      unknown: '⚪'   // White circle
    };
    return emojis[this.credibility.level as keyof typeof emojis] || '⚪';
  }

  private getAriaLabel(): string {
    const levelText = this.getLevelText();
    const score = this.credibility.score;
    const confidence = Math.round(this.credibility.confidence * 100);
    
    return `Credibility indicator: ${levelText}, score ${score} out of 100, confidence ${confidence}%. Press Enter or Space to view details.`;
  }

  private getDetailedDescription(): string {
    const reasoning = this.credibility.reasoning || 'No additional details available';
    const source = this.credibility.source;
    return `Detailed analysis: ${reasoning}. Source: ${source}. Last updated: ${new Date(this.credibility.timestamp).toLocaleString()}.`;
  }

  private getLevelText(): string {
    const texts = {
      high: 'Highly Reliable',
      medium: 'Mixed Reliability',
      low: 'Low Reliability',
      unknown: 'Unknown Source'
    };
    return texts[this.credibility.level as keyof typeof texts] || 'Unknown';
  }

  private getIndicatorId(): string {
    return `${this.credibility.level}-${this.credibility.score}-${Date.now()}`;
  }

  private applyStyling(element: HTMLElement): void {
    const size = this.getSizeClass();
    const color = this.getThemeColor();
    
    element.style.setProperty('--indicator-width', size.width);
    element.style.setProperty('--indicator-height', size.height);
    element.style.setProperty('--emoji-size', size.fontSize);
    element.style.setProperty('--indicator-color', color.primary);
    element.style.setProperty('--indicator-bg', color.background);
    element.style.setProperty('--indicator-border', color.border);
    element.style.setProperty('--animation-duration', `${this.config.animationDuration}ms`);
  }

  private getThemeColor(): { primary: string; background: string; border: string } {
    const isDark = this.config.theme === 'dark' || 
      (this.config.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    const baseColors = {
      high: { light: '#059669', dark: '#10b981' },
      medium: { light: '#d97706', dark: '#f59e0b' },
      low: { light: '#dc2626', dark: '#ef4444' },
      unknown: { light: '#4b5563', dark: '#6b7280' }
    };
    
    const level = this.credibility.level as keyof typeof baseColors;
    const primary = isDark ? baseColors[level].dark : baseColors[level].light;
    
    return {
      primary,
      background: isDark ? '#1f2937' : '#ffffff',
      border: isDark ? '#374151' : '#e5e7eb'
    };
  }

  private attachEventListeners(): void {
    // Click/touch interaction
    this.element.addEventListener('click', this.handleInteraction.bind(this));
    
    // Keyboard accessibility
    this.element.addEventListener('keydown', this.handleKeydown.bind(this));
    
    // Touch gestures (basic tap)
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
    
    // Hover effects for non-touch devices
    if (!this.isTouchDevice()) {
      this.element.addEventListener('mouseenter', this.handleMouseEnter.bind(this));
      this.element.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    }
  }

  private handleInteraction(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    // Haptic feedback for supported devices
    this.triggerHapticFeedback('light');
    
    // Dispatch custom event for progressive disclosure
    this.element.dispatchEvent(new CustomEvent('truthlens:indicator-tap', {
      detail: { 
        credibility: this.credibility,
        level: this.isMinimized ? 2 : 1,
        element: this.element
      },
      bubbles: true
    }));
  }

  private handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handleInteraction(event);
    }
  }

  private handleTouchStart(event: TouchEvent): void {
    this.element.classList.add('truthlens-touched');
    this.triggerHapticFeedback('light');
  }

  private handleTouchEnd(event: TouchEvent): void {
    this.element.classList.remove('truthlens-touched');
  }

  private handleMouseEnter(event: MouseEvent): void {
    if (!this.isTouchDevice()) {
      this.element.classList.add('truthlens-hovered');
    }
  }

  private handleMouseLeave(event: MouseEvent): void {
    this.element.classList.remove('truthlens-hovered');
  }

  private triggerHapticFeedback(intensity: 'light' | 'medium' | 'heavy'): void {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [50]
      };
      navigator.vibrate(patterns[intensity]);
    }
  }

  private isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  // Public methods
  public show(position: IndicatorPosition): void {
    if (this.isVisible) return;
    
    this.element.style.position = 'fixed';
    this.element.style.left = `${position.x}px`;
    this.element.style.top = `${position.y}px`;
    this.element.style.zIndex = '2147483647'; // Max z-index for top layer
    
    document.body.appendChild(this.element);
    
    // Trigger entrance animation
    requestAnimationFrame(() => {
      this.element.classList.add('truthlens-visible');
      this.isVisible = true;
    });
  }

  public hide(): void {
    if (!this.isVisible) return;
    
    this.element.classList.remove('truthlens-visible');
    this.element.classList.add('truthlens-hiding');
    
    setTimeout(() => {
      if (this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
      this.isVisible = false;
      this.element.classList.remove('truthlens-hiding');
    }, this.config.animationDuration);
  }

  public minimize(): void {
    if (this.isMinimized) return;
    
    this.isMinimized = true;
    this.element.classList.add('truthlens-minimized');
    
    // Update ARIA label for minimized state
    this.element.setAttribute('aria-label', 
      `Minimized credibility indicator: ${this.getTrafficLightEmoji()}. Press Enter to expand.`
    );
  }

  public expand(): void {
    if (!this.isMinimized) return;
    
    this.isMinimized = false;
    this.element.classList.remove('truthlens-minimized');
    
    // Restore full ARIA label
    this.element.setAttribute('aria-label', this.getAriaLabel());
  }

  public updateCredibility(newCredibility: CredibilityScore): void {
    this.credibility = newCredibility;
    
    // Update visual elements
    const emojiEl = this.element.querySelector('.truthlens-emoji');
    const scoreEl = this.element.querySelector('.truthlens-score');
    const descEl = this.element.querySelector(`#truthlens-desc-${this.getIndicatorId()}`);
    
    if (emojiEl) emojiEl.textContent = this.getTrafficLightEmoji();
    if (scoreEl) scoreEl.textContent = `${newCredibility.score}`;
    if (descEl) descEl.textContent = this.getDetailedDescription();
    
    // Update styling and classes
    this.element.className = this.getBaseClassNames();
    this.element.setAttribute('aria-label', this.getAriaLabel());
    this.applyStyling(this.element);
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  public getBoundingRect(): DOMRect {
    return this.element.getBoundingClientRect();
  }

  public destroy(): void {
    this.hide();
    // Remove event listeners would be handled by element removal
  }
}