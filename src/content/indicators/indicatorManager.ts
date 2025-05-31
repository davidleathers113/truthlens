// Visual Indicator Manager
// Handles the display of credibility indicators on web pages

import { CredibilityScore, ContentAnalysis } from '@shared/types';

export class IndicatorManager {
  private indicators: Map<string, HTMLElement> = new Map();
  private styleInjected = false;

  constructor() {
    this.injectStyles();
  }

  showIndicator(content: ContentAnalysis, credibility: CredibilityScore): void {
    const indicator = this.createIndicator(credibility);
    const targetElement = this.findTargetElement(content);

    if (targetElement) {
      this.positionIndicator(indicator, targetElement);
      this.indicators.set(content.url, indicator);
      document.body.appendChild(indicator);
      
      // Animate in
      requestAnimationFrame(() => {
        indicator.classList.add('truthlens-visible');
      });

      // Auto-hide after 8 seconds
      setTimeout(() => {
        indicator.classList.add('truthlens-minimized');
      }, 8000);
    }
  }

  updateIndicator(update: { url: string; credibility: CredibilityScore }): void {
    const indicator = this.indicators.get(update.url);
    if (indicator) {
      this.updateIndicatorContent(indicator, update.credibility);
    }
  }

  hideAllIndicators(): void {
    this.indicators.forEach((indicator) => {
      indicator.remove();
    });
    this.indicators.clear();
  }

  cleanup(): void {
    this.hideAllIndicators();
  }

  private createIndicator(credibility: CredibilityScore): HTMLElement {
    const indicator = document.createElement('div');
    indicator.className = 'truthlens-indicator';
    indicator.setAttribute('data-level', credibility.level);

    const emoji = this.getEmoji(credibility.level);
    const color = this.getColor(credibility.level);

    indicator.innerHTML = `
      <div class="truthlens-content">
        <span class="truthlens-emoji">${emoji}</span>
        <span class="truthlens-score">${credibility.score}/100</span>
      </div>
      <div class="truthlens-tooltip">
        <div class="truthlens-level">${this.getLevelText(credibility.level)}</div>
        <div class="truthlens-reasoning">${credibility.reasoning || 'Analysis complete'}</div>
        <div class="truthlens-confidence">Confidence: ${Math.round(credibility.confidence * 100)}%</div>
      </div>
    `;

    indicator.style.setProperty('--indicator-color', color);
    
    // Add click handler for more details
    indicator.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      indicator.classList.toggle('truthlens-expanded');
    });

    return indicator;
  }

  private updateIndicatorContent(indicator: HTMLElement, credibility: CredibilityScore): void {
    indicator.setAttribute('data-level', credibility.level);
    
    const emoji = this.getEmoji(credibility.level);
    const color = this.getColor(credibility.level);
    const score = indicator.querySelector('.truthlens-score');
    const emojiEl = indicator.querySelector('.truthlens-emoji');
    
    if (score) score.textContent = `${credibility.score}/100`;
    if (emojiEl) emojiEl.textContent = emoji;
    
    indicator.style.setProperty('--indicator-color', color);
  }

  private findTargetElement(content: ContentAnalysis): Element | null {
    // Find the appropriate element to attach the indicator to
    if (content.type === 'social-post') {
      // Platform-specific selectors
      const selectors = {
        twitter: '[data-testid="tweet"]',
        facebook: '[data-pagelet*="FeedUnit"]',
        instagram: 'article',
        youtube: '#above-the-fold',
        tiktok: '[data-e2e="video-card"]',
      };
      
      if (content.platform && selectors[content.platform]) {
        return document.querySelector(selectors[content.platform]);
      }
    }
    
    // Default to main content areas
    return document.querySelector('main, article, [role="main"]');
  }

  private positionIndicator(indicator: HTMLElement, target: Element): void {
    const rect = target.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    // Position in top-right corner of target element
    indicator.style.position = 'absolute';
    indicator.style.top = `${rect.top + scrollTop + 10}px`;
    indicator.style.right = `${document.documentElement.clientWidth - rect.right + scrollLeft + 10}px`;
    indicator.style.zIndex = '9999';
  }

  private getEmoji(level: string): string {
    const emojis = {
      high: '✅',
      medium: '⚠️',
      low: '❌',
      unknown: '❓',
    };
    return emojis[level as keyof typeof emojis] || '❓';
  }

  private getColor(level: string): string {
    const colors = {
      high: '#10b981', // green
      medium: '#f59e0b', // yellow
      low: '#ef4444', // red
      unknown: '#6b7280', // gray
    };
    return colors[level as keyof typeof colors] || '#6b7280';
  }

  private getLevelText(level: string): string {
    const texts = {
      high: 'Highly Reliable',
      medium: 'Mixed Reliability',
      low: 'Low Reliability',
      unknown: 'Unknown Source',
    };
    return texts[level as keyof typeof texts] || 'Unknown';
  }

  private injectStyles(): void {
    if (this.styleInjected) return;
    
    const style = document.createElement('style');
    style.textContent = `
      .truthlens-indicator {
        position: absolute;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        padding: 8px 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.3s ease;
        opacity: 0;
        transform: translateY(-10px) scale(0.9);
        border: 2px solid var(--indicator-color);
      }
      
      .truthlens-indicator.truthlens-visible {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      
      .truthlens-indicator.truthlens-minimized {
        padding: 6px 8px;
      }
      
      .truthlens-indicator.truthlens-minimized .truthlens-score {
        display: none;
      }
      
      .truthlens-content {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .truthlens-emoji {
        font-size: 18px;
      }
      
      .truthlens-score {
        font-weight: 600;
        color: var(--indicator-color);
      }
      
      .truthlens-tooltip {
        display: none;
        position: absolute;
        top: 100%;
        right: 0;
        margin-top: 8px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        padding: 12px;
        min-width: 250px;
        z-index: 10000;
      }
      
      .truthlens-indicator.truthlens-expanded .truthlens-tooltip {
        display: block;
      }
      
      .truthlens-level {
        font-weight: 600;
        color: var(--indicator-color);
        margin-bottom: 4px;
      }
      
      .truthlens-reasoning {
        color: #4b5563;
        font-size: 13px;
        margin-bottom: 4px;
      }
      
      .truthlens-confidence {
        color: #6b7280;
        font-size: 12px;
      }
    `;
    
    document.head.appendChild(style);
    this.styleInjected = true;
  }
}
