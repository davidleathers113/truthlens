/**
 * ProgressiveDisclosureManager - Level 1/2/3 Interaction System
 * 2025 Gen Z Optimized for 8-Second Attention Span
 */

import { CredibilityScore, ContentAnalysis, ClaimAnalysis } from '@shared/types';
import { BaseIndicator } from './BaseIndicator';

export interface DisclosureLevel {
  level: 1 | 2 | 3;
  title: string;
  content: string | HTMLElement;
  interactionType: 'tap' | 'hover' | 'expand' | 'modal';
  displayDuration?: number; // Auto-hide duration in ms
}

export interface DisclosureConfig {
  maxLevel: 1 | 2 | 3;
  autoAdvance: boolean;
  autoHideDuration: number;
  animationDuration: number;
  mobileOptimized: boolean;
}

export class ProgressiveDisclosureManager {
  private currentLevel: number = 1;
  private config: DisclosureConfig;
  private credibility: CredibilityScore;
  private contentAnalysis: ContentAnalysis;
  private baseIndicator: BaseIndicator;
  private disclosureElement: HTMLElement | null = null;
  private isExpanded: boolean = false;
  private autoHideTimer: number | null = null;

  constructor(
    credibility: CredibilityScore,
    contentAnalysis: ContentAnalysis,
    baseIndicator: BaseIndicator,
    config: Partial<DisclosureConfig> = {}
  ) {
    this.credibility = credibility;
    this.contentAnalysis = contentAnalysis;
    this.baseIndicator = baseIndicator;
    this.config = {
      maxLevel: 3,
      autoAdvance: false,
      autoHideDuration: 8000, // 8 second attention span
      animationDuration: 150, // <200ms for Gen Z
      mobileOptimized: true,
      ...config
    };

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for indicator interactions
    this.baseIndicator.getElement().addEventListener('truthlens:indicator-tap', 
      this.handleIndicatorTap.bind(this) as EventListener);
    
    // Global click handler to close expanded disclosure
    document.addEventListener('click', this.handleGlobalClick.bind(this));
    
    // Keyboard navigation
    document.addEventListener('keydown', this.handleKeyboardNavigation.bind(this));
    
    // Swipe gestures for mobile
    if (this.config.mobileOptimized && this.isMobileDevice()) {
      this.setupSwipeGestures();
    }

    // Auto-minimize after attention span timeout
    this.startAutoHideTimer();
  }

  private handleIndicatorTap(event: CustomEvent): void {
    const { level } = event.detail;
    
    if (level === 1 && this.currentLevel === 1) {
      this.advanceToLevel(2);
    } else if (level === 2 && this.currentLevel === 2) {
      this.advanceToLevel(3);
    } else if (this.isExpanded) {
      this.collapse();
    } else {
      this.advanceToLevel(level);
    }
    
    this.resetAutoHideTimer();
  }

  public advanceToLevel(targetLevel: number): void {
    if (targetLevel > this.config.maxLevel) return;
    
    this.currentLevel = targetLevel;
    
    switch (targetLevel) {
      case 1:
        this.showLevel1();
        break;
      case 2:
        this.showLevel2();
        break;
      case 3:
        this.showLevel3();
        break;
    }
    
    // Analytics event
    this.dispatchAnalyticsEvent('disclosure_level_advance', {
      level: targetLevel,
      credibilityScore: this.credibility.score,
      credibilityLevel: this.credibility.level
    });
  }

  private showLevel1(): void {
    // Level 1: Quick-glance indicator (emoji + color + score)
    // This is handled by BaseIndicator, just ensure it's visible and expanded
    this.baseIndicator.expand();
    this.isExpanded = false;
    this.removeDisclosureElement();
  }

  private showLevel2(): void {
    // Level 2: Tap/hover for summary details
    const level2Content = this.createLevel2Content();
    this.showDisclosure(level2Content, 'tooltip');
    this.isExpanded = true;
  }

  private showLevel3(): void {
    // Level 3: Further tap/expand for in-depth information  
    const level3Content = this.createLevel3Content();
    this.showDisclosure(level3Content, 'modal');
    this.isExpanded = true;
  }

  private createLevel2Content(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'truthlens-level2 truthlens-tooltip-content';
    container.setAttribute('role', 'tooltip');
    container.setAttribute('aria-live', 'polite');
    
    // Quick summary optimized for Gen Z attention span
    const header = document.createElement('div');
    header.className = 'truthlens-l2-header';
    header.innerHTML = `
      <div class="truthlens-l2-title">
        <span class="truthlens-l2-emoji">${this.getTrafficLightEmoji()}</span>
        <span class="truthlens-l2-level-text">${this.getLevelText()}</span>
      </div>
      <div class="truthlens-l2-score">${this.credibility.score}/100</div>
    `;
    
    const summary = document.createElement('div');
    summary.className = 'truthlens-l2-summary';
    summary.textContent = this.getLevel2Summary();
    
    const confidence = document.createElement('div');
    confidence.className = 'truthlens-l2-confidence';
    confidence.innerHTML = `
      <span class="truthlens-confidence-label">Confidence:</span>
      <span class="truthlens-confidence-bar">
        <span class="truthlens-confidence-fill" style="width: ${this.credibility.confidence * 100}%"></span>
      </span>
      <span class="truthlens-confidence-value">${Math.round(this.credibility.confidence * 100)}%</span>
    `;
    
    // Quick action to advance to level 3
    const expandAction = document.createElement('button');
    expandAction.className = 'truthlens-l2-expand';
    expandAction.innerHTML = '👆 Tap for details';
    expandAction.setAttribute('aria-label', 'Expand for detailed analysis');
    expandAction.addEventListener('click', () => this.advanceToLevel(3));
    
    container.appendChild(header);
    container.appendChild(summary);
    container.appendChild(confidence);
    if (this.config.maxLevel >= 3) {
      container.appendChild(expandAction);
    }
    
    return container;
  }

  private createLevel3Content(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'truthlens-level3 truthlens-modal-content';
    container.setAttribute('role', 'dialog');
    container.setAttribute('aria-modal', 'true');
    container.setAttribute('aria-labelledby', 'truthlens-l3-title');
    
    // Modal header with close button
    const header = document.createElement('div');
    header.className = 'truthlens-l3-header';
    header.innerHTML = `
      <h3 id="truthlens-l3-title" class="truthlens-l3-title">
        <span class="truthlens-l3-emoji">${this.getTrafficLightEmoji()}</span>
        Detailed Analysis
      </h3>
      <button class="truthlens-l3-close" aria-label="Close detailed analysis">✕</button>
    `;
    
    // Detailed credibility information
    const details = document.createElement('div');
    details.className = 'truthlens-l3-details';
    
    const scoreSection = this.createScoreSection();
    const reasoningSection = this.createReasoningSection();
    const claimsSection = this.createClaimsSection();
    const sourceSection = this.createSourceSection();
    
    details.appendChild(scoreSection);
    details.appendChild(reasoningSection);
    if (this.contentAnalysis.relatedClaims?.length) {
      details.appendChild(claimsSection);
    }
    details.appendChild(sourceSection);
    
    // Footer with actions
    const footer = document.createElement('div');
    footer.className = 'truthlens-l3-footer';
    footer.innerHTML = `
      <button class="truthlens-l3-action truthlens-report">🚩 Report Issue</button>
      <button class="truthlens-l3-action truthlens-share">📤 Share Analysis</button>
      <button class="truthlens-l3-action truthlens-learn">📚 Learn More</button>
    `;
    
    container.appendChild(header);
    container.appendChild(details);
    container.appendChild(footer);
    
    // Attach event listeners
    this.attachLevel3Listeners(container);
    
    return container;
  }

  private createScoreSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'truthlens-l3-section truthlens-score-section';
    section.innerHTML = `
      <h4 class="truthlens-l3-section-title">Credibility Score</h4>
      <div class="truthlens-score-display">
        <div class="truthlens-score-circle">
          <span class="truthlens-score-number">${this.credibility.score}</span>
          <span class="truthlens-score-max">/100</span>
        </div>
        <div class="truthlens-score-breakdown">
          <div class="truthlens-score-level">${this.getLevelText()}</div>
          <div class="truthlens-score-confidence">
            Confidence: ${Math.round(this.credibility.confidence * 100)}%
          </div>
        </div>
      </div>
    `;
    return section;
  }

  private createReasoningSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'truthlens-l3-section truthlens-reasoning-section';
    
    const reasoning = this.credibility.reasoning || 'No detailed reasoning available.';
    section.innerHTML = `
      <h4 class="truthlens-l3-section-title">Analysis Details</h4>
      <div class="truthlens-reasoning-content">${reasoning}</div>
    `;
    return section;
  }

  private createClaimsSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'truthlens-l3-section truthlens-claims-section';
    
    const claimsHtml = this.contentAnalysis.relatedClaims!
      .slice(0, 3) // Limit to top 3 for attention span
      .map(claim => this.renderClaim(claim))
      .join('');
    
    section.innerHTML = `
      <h4 class="truthlens-l3-section-title">Key Claims Verified</h4>
      <div class="truthlens-claims-list">${claimsHtml}</div>
    `;
    return section;
  }

  private renderClaim(claim: ClaimAnalysis): string {
    const verdictEmoji = this.getVerdictEmoji(claim.verdict);
    const verdictText = claim.verdict.replace(/-/g, ' ').toUpperCase();
    
    return `
      <div class="truthlens-claim">
        <div class="truthlens-claim-header">
          <span class="truthlens-claim-verdict ${claim.verdict}">${verdictEmoji} ${verdictText}</span>
        </div>
        <div class="truthlens-claim-text">${claim.claim}</div>
        ${claim.explanation ? `<div class="truthlens-claim-explanation">${claim.explanation}</div>` : ''}
      </div>
    `;
  }

  private createSourceSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'truthlens-l3-section truthlens-source-section';
    
    const timestamp = new Date(this.credibility.timestamp).toLocaleString();
    section.innerHTML = `
      <h4 class="truthlens-l3-section-title">Source Information</h4>
      <div class="truthlens-source-details">
        <div class="truthlens-source-item">
          <strong>Analysis Source:</strong> ${this.credibility.source.toUpperCase()}
        </div>
        <div class="truthlens-source-item">
          <strong>Content Type:</strong> ${this.contentAnalysis.type.replace('-', ' ')}
        </div>
        ${this.contentAnalysis.platform ? `
          <div class="truthlens-source-item">
            <strong>Platform:</strong> ${this.contentAnalysis.platform}
          </div>
        ` : ''}
        <div class="truthlens-source-item">
          <strong>Last Updated:</strong> ${timestamp}
        </div>
      </div>
    `;
    return section;
  }

  private attachLevel3Listeners(container: HTMLElement): void {
    // Close button
    const closeBtn = container.querySelector('.truthlens-l3-close');
    closeBtn?.addEventListener('click', () => this.collapse());
    
    // Action buttons
    const reportBtn = container.querySelector('.truthlens-report');
    reportBtn?.addEventListener('click', () => this.handleReportAction());
    
    const shareBtn = container.querySelector('.truthlens-share');
    shareBtn?.addEventListener('click', () => this.handleShareAction());
    
    const learnBtn = container.querySelector('.truthlens-learn');
    learnBtn?.addEventListener('click', () => this.handleLearnAction());
  }

  private showDisclosure(content: HTMLElement, type: 'tooltip' | 'modal'): void {
    this.removeDisclosureElement();
    
    const overlay = document.createElement('div');
    overlay.className = `truthlens-disclosure truthlens-${type}`;
    
    if (type === 'modal') {
      overlay.classList.add('truthlens-modal-overlay');
      // Focus trap for modal
      this.setupFocusTrap(content);
    }
    
    overlay.appendChild(content);
    document.body.appendChild(overlay);
    this.disclosureElement = overlay;
    
    // Position tooltip relative to indicator
    if (type === 'tooltip') {
      this.positionTooltip(overlay);
    }
    
    // Animate in
    requestAnimationFrame(() => {
      overlay.classList.add('truthlens-visible');
    });
    
    // Auto-hide for tooltips
    if (type === 'tooltip') {
      this.startAutoHideTimer();
    }
  }

  private positionTooltip(tooltip: HTMLElement): void {
    const indicatorRect = this.baseIndicator.getBoundingRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let left = indicatorRect.left;
    let top = indicatorRect.bottom + 8;
    
    // Collision detection with viewport
    if (left + tooltipRect.width > viewportWidth) {
      left = viewportWidth - tooltipRect.width - 8;
    }
    
    if (top + tooltipRect.height > viewportHeight) {
      top = indicatorRect.top - tooltipRect.height - 8;
    }
    
    tooltip.style.position = 'fixed';
    tooltip.style.left = `${Math.max(8, left)}px`;
    tooltip.style.top = `${Math.max(8, top)}px`;
    tooltip.style.zIndex = '2147483646';
  }

  private setupFocusTrap(modal: HTMLElement): void {
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    modal.addEventListener('keydown', (e) => {
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
    });
    
    // Focus first element
    firstElement.focus();
  }

  private collapse(): void {
    if (!this.isExpanded || !this.disclosureElement) return;
    
    this.disclosureElement.classList.remove('truthlens-visible');
    this.disclosureElement.classList.add('truthlens-hiding');
    
    setTimeout(() => {
      this.removeDisclosureElement();
      this.isExpanded = false;
      this.currentLevel = 1;
      this.baseIndicator.minimize();
    }, this.config.animationDuration);
    
    this.dispatchAnalyticsEvent('disclosure_collapsed');
  }

  private removeDisclosureElement(): void {
    if (this.disclosureElement) {
      this.disclosureElement.remove();
      this.disclosureElement = null;
    }
  }

  private handleGlobalClick(event: MouseEvent): void {
    if (!this.isExpanded || !this.disclosureElement) return;
    
    const target = event.target as HTMLElement;
    const isInsideDisclosure = this.disclosureElement.contains(target);
    const isIndicator = this.baseIndicator.getElement().contains(target);
    
    if (!isInsideDisclosure && !isIndicator) {
      this.collapse();
    }
  }

  private handleKeyboardNavigation(event: KeyboardEvent): void {
    if (!this.isExpanded) return;
    
    if (event.key === 'Escape') {
      event.preventDefault();
      this.collapse();
    }
  }

  private setupSwipeGestures(): void {
    let startY: number;
    let startTime: number;
    
    this.baseIndicator.getElement().addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
      startTime = Date.now();
    }, { passive: true });
    
    this.baseIndicator.getElement().addEventListener('touchend', (e) => {
      const endY = e.changedTouches[0].clientY;
      const endTime = Date.now();
      const deltaY = startY - endY;
      const deltaTime = endTime - startTime;
      
      // Swipe up gesture to expand
      if (deltaY > 30 && deltaTime < 300) {
        if (this.currentLevel < this.config.maxLevel) {
          this.advanceToLevel(this.currentLevel + 1);
        }
      }
      
      // Swipe down gesture to collapse
      if (deltaY < -30 && deltaTime < 300) {
        if (this.isExpanded) {
          this.collapse();
        }
      }
    }, { passive: true });
  }

  private startAutoHideTimer(): void {
    this.clearAutoHideTimer();
    this.autoHideTimer = window.setTimeout(() => {
      if (this.currentLevel === 1) {
        this.baseIndicator.minimize();
      } else {
        this.collapse();
      }
    }, this.config.autoHideDuration);
  }

  private resetAutoHideTimer(): void {
    this.clearAutoHideTimer();
    this.startAutoHideTimer();
  }

  private clearAutoHideTimer(): void {
    if (this.autoHideTimer) {
      window.clearTimeout(this.autoHideTimer);
      this.autoHideTimer = null;
    }
  }

  private handleReportAction(): void {
    this.dispatchAnalyticsEvent('report_issue_clicked');
    // TODO: Implement report functionality
  }

  private handleShareAction(): void {
    this.dispatchAnalyticsEvent('share_analysis_clicked');
    // TODO: Implement share functionality
  }

  private handleLearnAction(): void {
    this.dispatchAnalyticsEvent('learn_more_clicked');
    // TODO: Implement learn more functionality
  }

  private getTrafficLightEmoji(): string {
    const emojis = {
      high: '🟢',
      medium: '🟡', 
      low: '🔴',
      unknown: '⚪'
    };
    return emojis[this.credibility.level as keyof typeof emojis] || '⚪';
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

  private getLevel2Summary(): string {
    const reasoning = this.credibility.reasoning;
    if (reasoning && reasoning.length > 100) {
      return reasoning.substring(0, 97) + '...';
    }
    return reasoning || 'Analysis completed. Tap for more details.';
  }

  private getVerdictEmoji(verdict: ClaimAnalysis['verdict']): string {
    const emojis = {
      'true': '✅',
      'mostly-true': '🟢',
      'half-true': '🟡',
      'mostly-false': '🟠',
      'false': '❌',
      'unverifiable': '❓'
    };
    return emojis[verdict] || '❓';
  }

  private isMobileDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  private dispatchAnalyticsEvent(event: string, properties?: Record<string, any>): void {
    window.dispatchEvent(new CustomEvent('truthlens:analytics', {
      detail: { event, properties }
    }));
  }

  // Public methods
  public getCurrentLevel(): number {
    return this.currentLevel;
  }

  public isCurrentlyExpanded(): boolean {
    return this.isExpanded;
  }

  public forceCollapse(): void {
    this.collapse();
  }

  public destroy(): void {
    this.clearAutoHideTimer();
    this.removeDisclosureElement();
    // Event listeners will be cleaned up when elements are removed
  }
}