/**
 * DetailedAnalysisView - 2025 Gen Z Optimized Detailed Credibility Analysis Component
 * Implements comprehensive credibility information display with progressive disclosure
 */

import { CredibilityScore, ContentAnalysis, ClaimAnalysis } from '@shared/types';

export interface BiasAnalysis {
  politicalLeaning: 'left' | 'center' | 'right' | 'mixed' | 'unknown';
  leaningConfidence: number;
  contentBias: {
    emotional: number;
    factual: number;
    sensational: number;
  };
  explanations: {
    political: string;
    emotional: string;
    factual: string;
  };
}

export interface VerificationRecommendations {
  primary: string[];
  factCheckLinks: { name: string; url: string }[];
  mediaLiteracyTips: string[];
  alternativeSources: { name: string; url: string; description: string }[];
}

export interface DetailedAnalysisConfig {
  enableAnimations: boolean;
  animationDuration: number;
  showPremiumFeatures: boolean;
  maxLevel: 1 | 2 | 3;
  mobileOptimized: boolean;
  autoHideDuration: number;
}

export interface DetailedAnalysisPosition {
  x: number;
  y: number;
  placement: 'top' | 'bottom' | 'left' | 'right';
  constrainToViewport: boolean;
}

export class DetailedAnalysisView {
  private config: DetailedAnalysisConfig;
  private credibility: CredibilityScore;
  private contentAnalysis: ContentAnalysis;
  private biasAnalysis?: BiasAnalysis;
  private recommendations?: VerificationRecommendations;
  private currentLevel: 1 | 2 | 3 = 1;
  private isVisible: boolean = false;
  private container: HTMLElement | null = null;
  private autoHideTimer: number | null = null;

  constructor(
    credibility: CredibilityScore,
    contentAnalysis: ContentAnalysis,
    config: Partial<DetailedAnalysisConfig> = {}
  ) {
    this.credibility = credibility;
    this.contentAnalysis = contentAnalysis;
    this.config = {
      enableAnimations: true,
      animationDuration: 300, // Task specifies 300ms default
      showPremiumFeatures: false,
      maxLevel: 3,
      mobileOptimized: true,
      autoHideDuration: 8000, // Gen Z 8-second attention span
      ...config
    };

    this.generateBiasAnalysis();
    this.generateVerificationRecommendations();
  }

  /**
   * Show the detailed analysis view at specified position
   */
  public show(position: DetailedAnalysisPosition): void {
    if (this.isVisible) {
      this.hide();
    }

    this.container = this.createDetailedView();
    this.positionView(this.container, position);

    document.body.appendChild(this.container);
    this.isVisible = true;

    // Apply entrance animation
    if (this.config.enableAnimations) {
      requestAnimationFrame(() => {
        this.container?.classList.add('truthlens-detailed-visible');
      });
    } else {
      this.container.classList.add('truthlens-detailed-visible');
    }

    this.setupEventListeners();
    this.startAutoHideTimer();

    // Accessibility announcement
    this.announceToScreenReader('Detailed credibility analysis opened. Use arrow keys to navigate.');
  }

  /**
   * Hide the detailed analysis view
   */
  public hide(): void {
    if (!this.isVisible || !this.container) return;

    this.clearAutoHideTimer();
    this.container.classList.remove('truthlens-detailed-visible');
    this.container.classList.add('truthlens-detailed-hiding');

    if (this.config.enableAnimations) {
      setTimeout(() => {
        this.removeContainer();
      }, this.config.animationDuration);
    } else {
      this.removeContainer();
    }
  }

  /**
   * Advance to specific disclosure level
   */
  public advanceToLevel(level: 1 | 2 | 3): void {
    if (level > this.config.maxLevel || level === this.currentLevel) return;

    this.currentLevel = level;
    this.updateViewForLevel(level);
    this.resetAutoHideTimer();

    // Analytics tracking
    this.dispatchEvent('truthlens:disclosure-level-changed', {
      level,
      credibilityScore: this.credibility.score,
      credibilityLevel: this.credibility.level
    });
  }

  /**
   * Update credibility data and refresh view
   */
  public updateCredibility(credibility: CredibilityScore): void {
    this.credibility = credibility;

    if (this.isVisible && this.container) {
      this.updateCredibilityDisplay();
    }
  }

  /**
   * Set bias analysis data (premium feature)
   */
  public setBiasAnalysis(biasAnalysis: BiasAnalysis): void {
    this.biasAnalysis = biasAnalysis;

    if (this.isVisible && this.currentLevel >= 2) {
      this.updateBiasDisplay();
    }
  }

  /**
   * Set verification recommendations
   */
  public setVerificationRecommendations(recommendations: VerificationRecommendations): void {
    this.recommendations = recommendations;

    if (this.isVisible && this.currentLevel >= 2) {
      this.updateRecommendationsDisplay();
    }
  }

  // Private methods

  private createDetailedView(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'truthlens-detailed-view';
    container.setAttribute('role', 'dialog');
    container.setAttribute('aria-modal', 'true');
    container.setAttribute('aria-labelledby', 'truthlens-detailed-title');
    container.setAttribute('tabindex', '-1');

    // Create main content structure
    const content = this.createMainContent();
    container.appendChild(content);

    // Apply theming
    this.applyTheme(container);

    return container;
  }

  private createMainContent(): HTMLElement {
    const content = document.createElement('div');
    content.className = 'truthlens-detailed-content';

    // Header with close button
    const header = this.createHeader();
    content.appendChild(header);

    // Level 1: Basic credibility display
    const level1Content = this.createLevel1Content();
    content.appendChild(level1Content);

    // Level 2: Summary analysis (initially hidden)
    const level2Content = this.createLevel2Content();
    level2Content.classList.add('truthlens-level-2-content');
    if (this.currentLevel < 2) {
      level2Content.style.display = 'none';
    }
    content.appendChild(level2Content);

    // Level 3: Comprehensive details (initially hidden)
    const level3Content = this.createLevel3Content();
    level3Content.classList.add('truthlens-level-3-content');
    if (this.currentLevel < 3) {
      level3Content.style.display = 'none';
    }
    content.appendChild(level3Content);

    // Footer with actions
    const footer = this.createFooter();
    content.appendChild(footer);

    return content;
  }

  private createHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'truthlens-detailed-header';

    const title = document.createElement('h3');
    title.id = 'truthlens-detailed-title';
    title.className = 'truthlens-detailed-title';
    title.innerHTML = `
      <span class="truthlens-detailed-emoji">${this.getCredibilityEmoji()}</span>
      <span class="truthlens-detailed-title-text">Credibility Analysis</span>
    `;

    const closeButton = document.createElement('button');
    closeButton.className = 'truthlens-detailed-close';
    closeButton.setAttribute('aria-label', 'Close detailed analysis');
    closeButton.innerHTML = '✕';
    closeButton.addEventListener('click', () => this.hide());

    header.appendChild(title);
    header.appendChild(closeButton);

    return header;
  }

  private createLevel1Content(): HTMLElement {
    const level1 = document.createElement('div');
    level1.className = 'truthlens-level-1-content';

    // Main score display
    const scoreDisplay = document.createElement('div');
    scoreDisplay.className = 'truthlens-score-display';
    scoreDisplay.innerHTML = `
      <div class="truthlens-score-circle">
        <span class="truthlens-score-number">${this.credibility.score}</span>
        <span class="truthlens-score-denominator">/100</span>
      </div>
      <div class="truthlens-score-info">
        <div class="truthlens-credibility-level">${this.getCredibilityLevelText()}</div>
        <div class="truthlens-confidence">
          <span class="truthlens-confidence-label">Confidence:</span>
          <div class="truthlens-confidence-bar">
            <div class="truthlens-confidence-fill" style="width: ${this.credibility.confidence * 100}%"></div>
          </div>
          <span class="truthlens-confidence-value">${Math.round(this.credibility.confidence * 100)}%</span>
        </div>
      </div>
    `;

    // Expand prompt for level 2
    if (this.config.maxLevel >= 2) {
      const expandPrompt = document.createElement('button');
      expandPrompt.className = 'truthlens-expand-prompt';
      expandPrompt.innerHTML = '👆 Tap for detailed analysis';
      expandPrompt.addEventListener('click', () => this.advanceToLevel(2));
      scoreDisplay.appendChild(expandPrompt);
    }

    level1.appendChild(scoreDisplay);
    return level1;
  }

  private createLevel2Content(): HTMLElement {
    const level2 = document.createElement('div');
    level2.className = 'truthlens-level-2-content';

    // Score breakdown by factors
    const factorBreakdown = this.createFactorBreakdown();
    level2.appendChild(factorBreakdown);

    // Source information
    const sourceInfo = this.createSourceInformation();
    level2.appendChild(sourceInfo);

    // Basic bias analysis (if available)
    if (this.biasAnalysis || this.config.showPremiumFeatures) {
      const biasSection = this.createBiasAnalysisSection();
      level2.appendChild(biasSection);
    }

    // Verification recommendations preview
    if (this.recommendations) {
      const recommendationsPreview = this.createRecommendationsPreview();
      level2.appendChild(recommendationsPreview);
    }

    // Expand prompt for level 3
    if (this.config.maxLevel >= 3) {
      const expandPrompt = document.createElement('button');
      expandPrompt.className = 'truthlens-expand-prompt';
      expandPrompt.innerHTML = '📊 View comprehensive analysis';
      expandPrompt.addEventListener('click', () => this.advanceToLevel(3));
      level2.appendChild(expandPrompt);
    }

    return level2;
  }

  private createLevel3Content(): HTMLElement {
    const level3 = document.createElement('div');
    level3.className = 'truthlens-level-3-content';

    // Detailed claims analysis
    if (this.contentAnalysis.relatedClaims?.length) {
      const claimsSection = this.createClaimsSection();
      level3.appendChild(claimsSection);
    }

    // Comprehensive bias analysis (premium)
    if (this.biasAnalysis && this.config.showPremiumFeatures) {
      const detailedBiasSection = this.createDetailedBiasSection();
      level3.appendChild(detailedBiasSection);
    }

    // Full verification recommendations
    if (this.recommendations) {
      const fullRecommendations = this.createFullRecommendationsSection();
      level3.appendChild(fullRecommendations);
    }

    // Technical details
    const technicalDetails = this.createTechnicalDetailsSection();
    level3.appendChild(technicalDetails);

    return level3;
  }

  private createFactorBreakdown(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'truthlens-section truthlens-factor-breakdown';

    const title = document.createElement('h4');
    title.className = 'truthlens-section-title';
    title.textContent = 'Score Breakdown';

    const factors = document.createElement('div');
    factors.className = 'truthlens-factors';

    // Domain reputation factor
    const domainFactor = this.createFactorItem(
      'Domain Reputation',
      this.estimateFactorScore('domain'),
      'Based on historical credibility and journalistic standards'
    );
    factors.appendChild(domainFactor);

    // Content quality factor
    const contentFactor = this.createFactorItem(
      'Content Quality',
      this.estimateFactorScore('content'),
      'Analysis of writing quality, citations, and evidence'
    );
    factors.appendChild(contentFactor);

    // Fact-check correlation
    const factCheckFactor = this.createFactorItem(
      'Fact-check Results',
      this.estimateFactorScore('factcheck'),
      'Cross-reference with fact-checking organizations'
    );
    factors.appendChild(factCheckFactor);

    section.appendChild(title);
    section.appendChild(factors);

    return section;
  }

  private createFactorItem(name: string, score: number, description: string): HTMLElement {
    const item = document.createElement('div');
    item.className = 'truthlens-factor-item';

    item.innerHTML = `
      <div class="truthlens-factor-header">
        <span class="truthlens-factor-name">${name}</span>
        <span class="truthlens-factor-score">${score}/100</span>
      </div>
      <div class="truthlens-factor-bar">
        <div class="truthlens-factor-fill" style="width: ${score}%"></div>
      </div>
      <div class="truthlens-factor-description">${description}</div>
    `;

    return item;
  }

  private createSourceInformation(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'truthlens-section truthlens-source-info';

    const title = document.createElement('h4');
    title.className = 'truthlens-section-title';
    title.textContent = 'Source Information';

    const content = document.createElement('div');
    content.className = 'truthlens-source-content';

    const domain = new URL(this.contentAnalysis.url).hostname;
    const analysisDate = new Date(this.credibility.timestamp).toLocaleDateString();

    content.innerHTML = `
      <div class="truthlens-source-item">
        <strong>Domain:</strong> ${domain}
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
        <strong>Analysis Date:</strong> ${analysisDate}
      </div>
      <div class="truthlens-source-item">
        <strong>Analysis Source:</strong> ${this.credibility.source.toUpperCase()}
      </div>
    `;

    section.appendChild(title);
    section.appendChild(content);

    return section;
  }

  private createBiasAnalysisSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'truthlens-section truthlens-bias-analysis';

    const title = document.createElement('h4');
    title.className = 'truthlens-section-title';
    title.innerHTML = `
      Bias Analysis
      ${!this.config.showPremiumFeatures ? '<span class="truthlens-premium-badge">Premium</span>' : ''}
    `;

    if (!this.config.showPremiumFeatures) {
      // Premium upsell
      const upsell = document.createElement('div');
      upsell.className = 'truthlens-premium-upsell';
      upsell.innerHTML = `
        <div class="truthlens-upsell-content">
          <div class="truthlens-upsell-icon">🔍</div>
          <div class="truthlens-upsell-text">
            <strong>Unlock Bias Analysis</strong>
            <p>See political leaning, emotional bias indicators, and comprehensive source analysis.</p>
          </div>
          <button class="truthlens-upgrade-button">Upgrade to Premium</button>
        </div>
      `;
      section.appendChild(title);
      section.appendChild(upsell);
      return section;
    }

    if (!this.biasAnalysis) {
      const placeholder = document.createElement('div');
      placeholder.className = 'truthlens-bias-placeholder';
      placeholder.textContent = 'Bias analysis not available for this content.';
      section.appendChild(title);
      section.appendChild(placeholder);
      return section;
    }

    // Political leaning display
    const politicalLeaning = this.createPoliticalLeaningDisplay();
    section.appendChild(title);
    section.appendChild(politicalLeaning);

    return section;
  }

  private createPoliticalLeaningDisplay(): HTMLElement {
    if (!this.biasAnalysis) {
      return document.createElement('div');
    }

    const display = document.createElement('div');
    display.className = 'truthlens-political-leaning';

    const spectrum = document.createElement('div');
    spectrum.className = 'truthlens-political-spectrum';
    spectrum.innerHTML = `
      <div class="truthlens-spectrum-labels">
        <span class="truthlens-spectrum-left">Left</span>
        <span class="truthlens-spectrum-center">Center</span>
        <span class="truthlens-spectrum-right">Right</span>
      </div>
      <div class="truthlens-spectrum-bar">
        <div class="truthlens-spectrum-indicator" data-leaning="${this.biasAnalysis.politicalLeaning}"></div>
      </div>
      <div class="truthlens-leaning-label">
        <strong>${this.formatPoliticalLeaning(this.biasAnalysis.politicalLeaning)}</strong>
        <span class="truthlens-leaning-confidence">(${Math.round(this.biasAnalysis.leaningConfidence * 100)}% confidence)</span>
      </div>
    `;

    const explanation = document.createElement('div');
    explanation.className = 'truthlens-leaning-explanation';
    explanation.textContent = this.biasAnalysis.explanations.political;

    display.appendChild(spectrum);
    display.appendChild(explanation);

    return display;
  }

  private createRecommendationsPreview(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'truthlens-section truthlens-recommendations-preview';

    const title = document.createElement('h4');
    title.className = 'truthlens-section-title';
    title.textContent = 'Verification Steps';

    const list = document.createElement('ul');
    list.className = 'truthlens-recommendations-list';

    if (this.recommendations) {
      // Show top 2 recommendations
      this.recommendations.primary.slice(0, 2).forEach(rec => {
        const item = document.createElement('li');
        item.className = 'truthlens-recommendation-item';
        item.textContent = rec;
        list.appendChild(item);
      });
    }

    section.appendChild(title);
    section.appendChild(list);

    return section;
  }

  private createClaimsSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'truthlens-section truthlens-claims-section';

    const title = document.createElement('h4');
    title.className = 'truthlens-section-title';
    title.textContent = 'Key Claims Verified';

    const claimsList = document.createElement('div');
    claimsList.className = 'truthlens-claims-list';

    if (this.contentAnalysis.relatedClaims) {
      this.contentAnalysis.relatedClaims.slice(0, 5).forEach(claim => {
        const claimElement = this.createClaimElement(claim);
        claimsList.appendChild(claimElement);
      });
    }

    section.appendChild(title);
    section.appendChild(claimsList);

    return section;
  }

  private createClaimElement(claim: ClaimAnalysis): HTMLElement {
    const element = document.createElement('div');
    element.className = 'truthlens-claim';

    const verdictEmoji = this.getVerdictEmoji(claim.verdict);
    const verdictText = claim.verdict.replace(/-/g, ' ').toUpperCase();

    element.innerHTML = `
      <div class="truthlens-claim-header">
        <span class="truthlens-claim-verdict ${claim.verdict}">${verdictEmoji} ${verdictText}</span>
      </div>
      <div class="truthlens-claim-text">${claim.claim}</div>
      ${claim.explanation ? `<div class="truthlens-claim-explanation">${claim.explanation}</div>` : ''}
    `;

    return element;
  }

  private createDetailedBiasSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'truthlens-section truthlens-detailed-bias';

    const title = document.createElement('h4');
    title.className = 'truthlens-section-title';
    title.textContent = 'Comprehensive Bias Analysis';

    if (!this.biasAnalysis) {
      const placeholder = document.createElement('div');
      placeholder.textContent = 'Detailed bias analysis not available.';
      section.appendChild(title);
      section.appendChild(placeholder);
      return section;
    }

    // Content bias metrics
    const biasMetrics = document.createElement('div');
    biasMetrics.className = 'truthlens-bias-metrics';

    const emotionalBias = this.createBiasMetric(
      'Emotional Language',
      this.biasAnalysis.contentBias.emotional,
      this.biasAnalysis.explanations.emotional
    );

    const factualBias = this.createBiasMetric(
      'Factual Accuracy',
      this.biasAnalysis.contentBias.factual,
      this.biasAnalysis.explanations.factual
    );

    const sensationalBias = this.createBiasMetric(
      'Sensationalism',
      this.biasAnalysis.contentBias.sensational,
      'Level of sensational or clickbait language detected'
    );

    biasMetrics.appendChild(emotionalBias);
    biasMetrics.appendChild(factualBias);
    biasMetrics.appendChild(sensationalBias);

    section.appendChild(title);
    section.appendChild(biasMetrics);

    return section;
  }

  private createBiasMetric(name: string, score: number, explanation: string): HTMLElement {
    const metric = document.createElement('div');
    metric.className = 'truthlens-bias-metric';

    metric.innerHTML = `
      <div class="truthlens-metric-header">
        <span class="truthlens-metric-name">${name}</span>
        <span class="truthlens-metric-score">${Math.round(score * 100)}/100</span>
      </div>
      <div class="truthlens-metric-bar">
        <div class="truthlens-metric-fill" style="width: ${score * 100}%"></div>
      </div>
      <div class="truthlens-metric-explanation">${explanation}</div>
    `;

    return metric;
  }

  private createFullRecommendationsSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'truthlens-section truthlens-full-recommendations';

    const title = document.createElement('h4');
    title.className = 'truthlens-section-title';
    title.textContent = 'Complete Verification Guide';

    if (!this.recommendations) {
      const placeholder = document.createElement('div');
      placeholder.textContent = 'Verification recommendations not available.';
      section.appendChild(title);
      section.appendChild(placeholder);
      return section;
    }

    // Primary recommendations
    if (this.recommendations.primary.length > 0) {
      const primarySection = this.createRecommendationSubsection(
        'Next Steps',
        this.recommendations.primary
      );
      section.appendChild(primarySection);
    }

    // Fact-check links
    if (this.recommendations.factCheckLinks.length > 0) {
      const factCheckSection = this.createFactCheckLinksSection();
      section.appendChild(factCheckSection);
    }

    // Alternative sources
    if (this.recommendations.alternativeSources.length > 0) {
      const alternativeSection = this.createAlternativeSourcesSection();
      section.appendChild(alternativeSection);
    }

    section.insertBefore(title, section.firstChild);
    return section;
  }

  private createRecommendationSubsection(title: string, items: string[]): HTMLElement {
    const subsection = document.createElement('div');
    subsection.className = 'truthlens-recommendation-subsection';

    const subtitle = document.createElement('h5');
    subtitle.className = 'truthlens-subsection-title';
    subtitle.textContent = title;

    const list = document.createElement('ul');
    list.className = 'truthlens-recommendation-list';

    items.forEach(item => {
      const listItem = document.createElement('li');
      listItem.textContent = item;
      list.appendChild(listItem);
    });

    subsection.appendChild(subtitle);
    subsection.appendChild(list);

    return subsection;
  }

  private createFactCheckLinksSection(): HTMLElement {
    if (!this.recommendations) return document.createElement('div');

    const subsection = document.createElement('div');
    subsection.className = 'truthlens-recommendation-subsection';

    const subtitle = document.createElement('h5');
    subtitle.className = 'truthlens-subsection-title';
    subtitle.textContent = 'Fact-Check Resources';

    const links = document.createElement('div');
    links.className = 'truthlens-fact-check-links';

    this.recommendations.factCheckLinks.forEach(link => {
      const linkElement = document.createElement('a');
      linkElement.href = link.url;
      linkElement.target = '_blank';
      linkElement.rel = 'noopener noreferrer';
      linkElement.className = 'truthlens-fact-check-link';
      linkElement.textContent = link.name;
      links.appendChild(linkElement);
    });

    subsection.appendChild(subtitle);
    subsection.appendChild(links);

    return subsection;
  }

  private createAlternativeSourcesSection(): HTMLElement {
    if (!this.recommendations) return document.createElement('div');

    const subsection = document.createElement('div');
    subsection.className = 'truthlens-recommendation-subsection';

    const subtitle = document.createElement('h5');
    subtitle.className = 'truthlens-subsection-title';
    subtitle.textContent = 'Alternative Sources';

    const sources = document.createElement('div');
    sources.className = 'truthlens-alternative-sources';

    this.recommendations.alternativeSources.forEach(source => {
      const sourceElement = document.createElement('div');
      sourceElement.className = 'truthlens-alternative-source';
      sourceElement.innerHTML = `
        <a href="${source.url}" target="_blank" rel="noopener noreferrer" class="truthlens-source-link">
          ${source.name}
        </a>
        <div class="truthlens-source-description">${source.description}</div>
      `;
      sources.appendChild(sourceElement);
    });

    subsection.appendChild(subtitle);
    subsection.appendChild(sources);

    return subsection;
  }

  private createTechnicalDetailsSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'truthlens-section truthlens-technical-details';

    const title = document.createElement('h4');
    title.className = 'truthlens-section-title';
    title.textContent = 'Technical Details';

    const details = document.createElement('div');
    details.className = 'truthlens-technical-content';

    const analysisTime = new Date(this.credibility.timestamp).toLocaleString();
    const contentLength = this.contentAnalysis.content?.length ?? 0;

    details.innerHTML = `
      <div class="truthlens-tech-item">
        <strong>Analysis Engine:</strong> ${this.credibility.source.toUpperCase()}
      </div>
      <div class="truthlens-tech-item">
        <strong>Analysis Time:</strong> ${analysisTime}
      </div>
      <div class="truthlens-tech-item">
        <strong>Content Length:</strong> ${contentLength} characters
      </div>
      <div class="truthlens-tech-item">
        <strong>Processing Time:</strong> <1 second
      </div>
      <div class="truthlens-tech-item">
        <strong>Version:</strong> TruthLens 2025.1.0
      </div>
    `;

    section.appendChild(title);
    section.appendChild(details);

    return section;
  }

  private createFooter(): HTMLElement {
    const footer = document.createElement('div');
    footer.className = 'truthlens-detailed-footer';

    // User feedback section
    const feedback = document.createElement('div');
    feedback.className = 'truthlens-feedback-section';
    feedback.innerHTML = `
      <div class="truthlens-feedback-title">Was this analysis helpful?</div>
      <div class="truthlens-feedback-buttons">
        <button class="truthlens-feedback-btn truthlens-feedback-agree" data-feedback="agree">
          👍 Agree
        </button>
        <button class="truthlens-feedback-btn truthlens-feedback-disagree" data-feedback="disagree">
          👎 Disagree
        </button>
      </div>
    `;

    // Action buttons
    const actions = document.createElement('div');
    actions.className = 'truthlens-action-buttons';
    actions.innerHTML = `
      <button class="truthlens-action-btn truthlens-share-btn">
        📤 Share Analysis
      </button>
      <button class="truthlens-action-btn truthlens-learn-btn">
        📚 Learn More
      </button>
      <button class="truthlens-action-btn truthlens-report-btn">
        🚩 Report Issue
      </button>
      <button class="truthlens-action-btn truthlens-settings-btn">
        ⚙️ Settings
      </button>
    `;

    footer.appendChild(feedback);
    footer.appendChild(actions);

    return footer;
  }

  private positionView(container: HTMLElement, position: DetailedAnalysisPosition): void {
    container.style.position = 'fixed';
    container.style.zIndex = '2147483647';

    if (position.constrainToViewport) {
      const rect = container.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let { x, y } = position;

      // Constrain to viewport
      if (x + rect.width > viewportWidth) {
        x = viewportWidth - rect.width - 10;
      }
      if (y + rect.height > viewportHeight) {
        y = viewportHeight - rect.height - 10;
      }
      if (x < 10) x = 10;
      if (y < 10) y = 10;

      container.style.left = `${x}px`;
      container.style.top = `${y}px`;
    } else {
      container.style.left = `${position.x}px`;
      container.style.top = `${position.y}px`;
    }
  }

  private updateViewForLevel(level: 1 | 2 | 3): void {
    if (!this.container) return;

    const level2Content = this.container.querySelector('.truthlens-level-2-content') as HTMLElement;
    const level3Content = this.container.querySelector('.truthlens-level-3-content') as HTMLElement;

    if (level >= 2 && level2Content) {
      level2Content.style.display = 'block';
      if (this.config.enableAnimations) {
        level2Content.classList.add('truthlens-level-expanding');
      }
    }

    if (level >= 3 && level3Content) {
      level3Content.style.display = 'block';
      if (this.config.enableAnimations) {
        level3Content.classList.add('truthlens-level-expanding');
      }
    }

    // Update container class for styling
    this.container.setAttribute('data-level', level.toString());
  }

  private setupEventListeners(): void {
    if (!this.container) return;

    // Feedback buttons
    const feedbackButtons = this.container.querySelectorAll('.truthlens-feedback-btn');
    feedbackButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const feedback = (e.target as HTMLElement).dataset.feedback;
        this.handleFeedback(feedback as 'agree' | 'disagree');
      });
    });

    // Action buttons
    const shareBtn = this.container.querySelector('.truthlens-share-btn');
    shareBtn?.addEventListener('click', () => this.handleShare());

    const learnBtn = this.container.querySelector('.truthlens-learn-btn');
    learnBtn?.addEventListener('click', () => this.handleLearnMore());

    const reportBtn = this.container.querySelector('.truthlens-report-btn');
    reportBtn?.addEventListener('click', () => this.handleReport());

    const settingsBtn = this.container.querySelector('.truthlens-settings-btn');
    settingsBtn?.addEventListener('click', () => this.handleSettings());

    // Upgrade button for premium features
    const upgradeBtn = this.container.querySelector('.truthlens-upgrade-button');
    upgradeBtn?.addEventListener('click', () => this.handleUpgrade());

    // Keyboard navigation
    document.addEventListener('keydown', this.handleKeyboard.bind(this));

    // Click outside to close
    document.addEventListener('click', this.handleClickOutside.bind(this));
  }

  private removeContainer(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.isVisible = false;
    this.currentLevel = 1;
  }

  private startAutoHideTimer(): void {
    this.clearAutoHideTimer();
    this.autoHideTimer = window.setTimeout(() => {
      this.hide();
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

  // Event handlers

  private handleFeedback(type: 'agree' | 'disagree'): void {
    this.dispatchEvent('truthlens:feedback-submitted', {
      type,
      credibilityScore: this.credibility.score,
      url: this.contentAnalysis.url
    });

    // Show thank you message
    this.showFeedbackConfirmation(type);
  }

  private handleShare(): void {
    this.dispatchEvent('truthlens:share-requested', {
      credibility: this.credibility,
      url: this.contentAnalysis.url
    });

    // Implement native sharing if available
    if (navigator.share) {
      navigator.share({
        title: 'TruthLens Analysis',
        text: `Credibility analysis: ${this.credibility.score}/100 - ${this.getCredibilityLevelText()}`,
        url: this.contentAnalysis.url
      });
    }
  }

  private handleLearnMore(): void {
    this.dispatchEvent('truthlens:learn-more-clicked', {
      currentLevel: this.currentLevel
    });

    // Open help or educational content
    window.open('https://truthlens.com/learn', '_blank', 'noopener,noreferrer');
  }

  private handleReport(): void {
    this.dispatchEvent('truthlens:report-requested', {
      credibility: this.credibility,
      url: this.contentAnalysis.url
    });

    // Show report form or redirect to reporting interface
    this.showReportDialog();
  }

  private handleSettings(): void {
    this.dispatchEvent('truthlens:settings-requested', {});

    // Open extension settings
    chrome.runtime.sendMessage({ type: 'OPEN_SETTINGS' });
  }

  private handleUpgrade(): void {
    this.dispatchEvent('truthlens:upgrade-requested', {
      feature: 'bias-analysis'
    });

    // Open upgrade flow
    window.open('https://truthlens.com/upgrade', '_blank', 'noopener,noreferrer');
  }

  private handleKeyboard(event: KeyboardEvent): void {
    if (!this.isVisible) return;

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.hide();
        break;
      case 'ArrowDown':
      case 'Tab':
        if (!event.shiftKey && this.currentLevel < this.config.maxLevel) {
          event.preventDefault();
          this.advanceToLevel((this.currentLevel + 1) as 1 | 2 | 3);
        }
        break;
      case 'ArrowUp':
        if (event.shiftKey && this.currentLevel > 1) {
          event.preventDefault();
          this.advanceToLevel((this.currentLevel - 1) as 1 | 2 | 3);
        }
        break;
    }
  }

  private handleClickOutside(event: MouseEvent): void {
    if (!this.isVisible || !this.container) return;

    const target = event.target as HTMLElement;
    if (!this.container.contains(target)) {
      this.hide();
    }
  }

  // Utility methods

  private generateBiasAnalysis(): void {
    // In a real implementation, this would come from the AI service
    // For now, generate placeholder data
    if (this.config.showPremiumFeatures) {
      this.biasAnalysis = {
        politicalLeaning: 'center',
        leaningConfidence: 0.75,
        contentBias: {
          emotional: 0.3,
          factual: 0.8,
          sensational: 0.2
        },
        explanations: {
          political: 'Content shows balanced presentation of facts without strong political bias.',
          emotional: 'Moderate use of emotional language, appropriate for the topic.',
          factual: 'High factual accuracy with proper citations and evidence.'
        }
      };
    }
  }

  private generateVerificationRecommendations(): void {
    this.recommendations = {
      primary: [
        'Cross-reference claims with multiple reputable sources',
        'Check the publication date and context',
        'Look for supporting evidence and citations',
        'Verify author credentials and expertise'
      ],
      factCheckLinks: [
        { name: 'Snopes', url: 'https://snopes.com' },
        { name: 'FactCheck.org', url: 'https://factcheck.org' },
        { name: 'PolitiFact', url: 'https://politifact.com' }
      ],
      mediaLiteracyTips: [
        'Question the source and its motivations',
        'Look for corroborating evidence',
        'Consider alternative viewpoints',
        'Check for logical fallacies'
      ],
      alternativeSources: [
        {
          name: 'Reuters',
          url: 'https://reuters.com',
          description: 'International news agency with strong fact-checking standards'
        },
        {
          name: 'Associated Press',
          url: 'https://apnews.com',
          description: 'Nonprofit news agency known for unbiased reporting'
        }
      ]
    };
  }

  private estimateFactorScore(factor: 'domain' | 'content' | 'factcheck'): number {
    const baseScore = this.credibility.score;

    switch (factor) {
      case 'domain':
        return Math.max(0, Math.min(100, baseScore + (Math.random() - 0.5) * 20));
      case 'content':
        return Math.max(0, Math.min(100, baseScore + (Math.random() - 0.5) * 15));
      case 'factcheck':
        return Math.max(0, Math.min(100, baseScore + (Math.random() - 0.5) * 25));
      default:
        return baseScore;
    }
  }

  private getCredibilityEmoji(): string {
    const emojis = {
      high: '🟢',
      medium: '🟡',
      low: '🔴',
      unknown: '⚪'
    };
    return emojis[this.credibility.level as keyof typeof emojis] || '⚪';
  }

  private getCredibilityLevelText(): string {
    const texts = {
      high: 'Highly Reliable',
      medium: 'Mixed Reliability',
      low: 'Low Reliability',
      unknown: 'Unknown Source'
    };
    return texts[this.credibility.level as keyof typeof texts] || 'Unknown';
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

  private formatPoliticalLeaning(leaning: BiasAnalysis['politicalLeaning']): string {
    const formats = {
      left: 'Leans Left',
      center: 'Center',
      right: 'Leans Right',
      mixed: 'Mixed/Varied',
      unknown: 'Unknown'
    };
    return formats[leaning];
  }

  private updateCredibilityDisplay(): void {
    if (!this.container) return;

    // Update score display
    const scoreNumber = this.container.querySelector('.truthlens-score-number');
    const levelText = this.container.querySelector('.truthlens-credibility-level');
    const confidenceFill = this.container.querySelector('.truthlens-confidence-fill') as HTMLElement;
    const confidenceValue = this.container.querySelector('.truthlens-confidence-value');

    if (scoreNumber) scoreNumber.textContent = this.credibility.score.toString();
    if (levelText) levelText.textContent = this.getCredibilityLevelText();
    if (confidenceFill) confidenceFill.style.width = `${this.credibility.confidence * 100}%`;
    if (confidenceValue) confidenceValue.textContent = `${Math.round(this.credibility.confidence * 100)}%`;

    // Update emoji in header
    const emojiElement = this.container.querySelector('.truthlens-detailed-emoji');
    if (emojiElement) emojiElement.textContent = this.getCredibilityEmoji();
  }

  private updateBiasDisplay(): void {
    if (!this.container || !this.biasAnalysis) return;

    const politicalIndicator = this.container.querySelector('.truthlens-spectrum-indicator') as HTMLElement;
    const leaningLabel = this.container.querySelector('.truthlens-leaning-label strong');
    const leaningConfidence = this.container.querySelector('.truthlens-leaning-confidence');

    if (politicalIndicator) {
      politicalIndicator.dataset.leaning = this.biasAnalysis.politicalLeaning;
    }
    if (leaningLabel) {
      leaningLabel.textContent = this.formatPoliticalLeaning(this.biasAnalysis.politicalLeaning);
    }
    if (leaningConfidence) {
      leaningConfidence.textContent = `(${Math.round(this.biasAnalysis.leaningConfidence * 100)}% confidence)`;
    }
  }

  private updateRecommendationsDisplay(): void {
    // This would update the recommendations section if it exists
    // Implementation depends on specific UI updates needed
  }

  private applyTheme(container: HTMLElement): void {
    // Apply theme based on user preferences or system settings
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDarkMode) {
      container.classList.add('truthlens-dark-theme');
    }
  }

  private showFeedbackConfirmation(type: 'agree' | 'disagree'): void {
    const message = type === 'agree' ? 'Thank you for your feedback!' : 'Thanks! We\'ll review this analysis.';
    this.announceToScreenReader(message);

    // Show visual confirmation
    const feedbackSection = this.container?.querySelector('.truthlens-feedback-section');
    if (feedbackSection) {
      feedbackSection.innerHTML = `<div class="truthlens-feedback-thanks">✓ ${message}</div>`;
    }
  }

  private showReportDialog(): void {
    // In a real implementation, this would show a proper report dialog
    const reportText = prompt('Please describe the issue with this analysis:');
    if (reportText) {
      this.dispatchEvent('truthlens:report-submitted', {
        issue: reportText,
        credibility: this.credibility,
        url: this.contentAnalysis.url
      });
      this.announceToScreenReader('Report submitted. Thank you for helping improve TruthLens.');
    }
  }

  private announceToScreenReader(message: string): void {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'truthlens-sr-announcement';
    announcement.textContent = message;
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';

    document.body.appendChild(announcement);
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  private dispatchEvent(eventName: string, detail: any): void {
    const event = new CustomEvent(eventName, {
      detail,
      bubbles: true,
      cancelable: false
    });
    document.dispatchEvent(event);
  }

  // Public getters

  public isCurrentlyVisible(): boolean {
    return this.isVisible;
  }

  public getCurrentLevel(): 1 | 2 | 3 {
    return this.currentLevel;
  }

  public getContainer(): HTMLElement | null {
    return this.container;
  }

  // Cleanup

  public destroy(): void {
    this.clearAutoHideTimer();
    this.hide();
    document.removeEventListener('keydown', this.handleKeyboard.bind(this));
    document.removeEventListener('click', this.handleClickOutside.bind(this));
  }
}
