// Unit tests for IndicatorManager
// Tests visual indicator display, DOM manipulation, and animations

import { IndicatorManager } from '@content/indicators/indicatorManager';
import { CredibilityScore, ContentAnalysis } from '@shared/types';

describe('IndicatorManager', () => {
  let indicatorManager: IndicatorManager;

  beforeEach(() => {
    // Clean DOM
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    
    // Create test DOM structure
    document.body.innerHTML = `
      <main>
        <article data-testid="test-article">
          <h1>Test Article</h1>
          <p>Test content</p>
        </article>
      </main>
    `;

    indicatorManager = new IndicatorManager();
    jest.clearAllMocks();
  });

  afterEach(() => {
    indicatorManager.cleanup();
  });

  describe('initialization', () => {
    it('should inject styles on creation', () => {
      const styleElements = document.querySelectorAll('style');
      expect(styleElements.length).toBeGreaterThan(0);
      
      const styleContent = styleElements[styleElements.length - 1].textContent;
      expect(styleContent).toContain('.truthlens-indicator');
    });

    it('should not inject styles multiple times', () => {
      const initialStyleCount = document.querySelectorAll('style').length;
      
      // Create another instance
      new IndicatorManager();
      
      const finalStyleCount = document.querySelectorAll('style').length;
      expect(finalStyleCount).toBe(initialStyleCount);
    });
  });

  describe('indicator display', () => {
    const mockContent: ContentAnalysis = {
      title: 'Test Article',
      url: 'https://example.com/test',
      content: 'Test content',
      type: 'article',
      platform: 'web',
    };

    const mockCredibility: CredibilityScore = {
      score: 75,
      level: 'medium',
      confidence: 0.8,
      reasoning: 'Test analysis result',
      source: 'ai',
      timestamp: Date.now(),
    };

    it('should create and display indicator', () => {
      indicatorManager.showIndicator(mockContent, mockCredibility);

      const indicator = document.querySelector('.truthlens-indicator');
      expect(indicator).toBeTruthy();
      expect(indicator?.getAttribute('data-level')).toBe('medium');
    });

    it('should show correct emoji and score', () => {
      indicatorManager.showIndicator(mockContent, mockCredibility);

      const emoji = document.querySelector('.truthlens-emoji');
      const score = document.querySelector('.truthlens-score');
      
      expect(emoji?.textContent).toBe('⚠️'); // medium level emoji
      expect(score?.textContent).toBe('75/100');
    });

    it('should display tooltip with details', () => {
      indicatorManager.showIndicator(mockContent, mockCredibility);

      const tooltip = document.querySelector('.truthlens-tooltip');
      const level = tooltip?.querySelector('.truthlens-level');
      const reasoning = tooltip?.querySelector('.truthlens-reasoning');
      const confidence = tooltip?.querySelector('.truthlens-confidence');
      
      expect(level?.textContent).toBe('Mixed Reliability');
      expect(reasoning?.textContent).toBe('Test analysis result');
      expect(confidence?.textContent).toBe('Confidence: 80%');
    });

    it('should handle different credibility levels', () => {
      const testCases = [
        { level: 'high', emoji: '✅', color: '#10b981', text: 'Highly Reliable' },
        { level: 'medium', emoji: '⚠️', color: '#f59e0b', text: 'Mixed Reliability' },
        { level: 'low', emoji: '❌', color: '#ef4444', text: 'Low Reliability' },
        { level: 'unknown', emoji: '❓', color: '#6b7280', text: 'Unknown Source' },
      ];

      testCases.forEach(({ level, emoji, color, text }) => {
        const testCredibility = { ...mockCredibility, level: level as any };
        indicatorManager.showIndicator(mockContent, testCredibility);

        const indicator = document.querySelector('.truthlens-indicator');
        const emojiEl = indicator?.querySelector('.truthlens-emoji');
        const levelEl = indicator?.querySelector('.truthlens-level');
        
        expect(emojiEl?.textContent).toBe(emoji);
        expect(levelEl?.textContent).toBe(text);
        expect(indicator?.style.getPropertyValue('--indicator-color')).toBe(color);
        
        indicatorManager.cleanup();
      });
    });
  });

  describe('indicator positioning', () => {
    it('should position indicator relative to target element', () => {
      const mockContent: ContentAnalysis = {
        title: 'Test',
        url: 'https://example.com',
        content: 'Test',
        type: 'article',
      };

      const mockCredibility: CredibilityScore = {
        score: 80,
        level: 'high',
        confidence: 0.9,
        reasoning: 'Test',
        source: 'ai',
        timestamp: Date.now(),
      };

      indicatorManager.showIndicator(mockContent, mockCredibility);

      const indicator = document.querySelector('.truthlens-indicator') as HTMLElement;
      expect(indicator.style.position).toBe('absolute');
      expect(indicator.style.zIndex).toBe('9999');
    });
  });

  describe('platform-specific targeting', () => {
    it('should find Twitter-specific elements', () => {
      document.body.innerHTML = '<div data-testid="tweet">Twitter content</div>';
      
      const mockContent: ContentAnalysis = {
        title: 'Tweet',
        url: 'https://twitter.com/test',
        content: 'Test tweet',
        type: 'social-post',
        platform: 'twitter',
      };

      const target = (indicatorManager as any).findTargetElement(mockContent);
      expect(target?.getAttribute('data-testid')).toBe('tweet');
    });

    it('should fallback to main content areas', () => {
      const mockContent: ContentAnalysis = {
        title: 'Article',
        url: 'https://example.com',
        content: 'Test content',
        type: 'article',
      };

      const target = (indicatorManager as any).findTargetElement(mockContent);
      expect(target?.tagName.toLowerCase()).toBe('main');
    });
  });

  describe('indicator interactions', () => {
    it('should toggle expanded state on click', () => {
      const mockContent: ContentAnalysis = {
        title: 'Test',
        url: 'https://example.com',
        content: 'Test',
        type: 'article',
      };

      const mockCredibility: CredibilityScore = {
        score: 80,
        level: 'high',
        confidence: 0.9,
        reasoning: 'Test',
        source: 'ai',
        timestamp: Date.now(),
      };

      indicatorManager.showIndicator(mockContent, mockCredibility);

      const indicator = document.querySelector('.truthlens-indicator') as HTMLElement;
      expect(indicator.classList.contains('truthlens-expanded')).toBe(false);

      // Simulate click
      indicator.click();
      expect(indicator.classList.contains('truthlens-expanded')).toBe(true);

      // Click again to toggle
      indicator.click();
      expect(indicator.classList.contains('truthlens-expanded')).toBe(false);
    });
  });

  describe('indicator updates', () => {
    it('should update existing indicator', () => {
      const mockContent: ContentAnalysis = {
        title: 'Test',
        url: 'https://example.com/test',
        content: 'Test',
        type: 'article',
      };

      const initialCredibility: CredibilityScore = {
        score: 50,
        level: 'medium',
        confidence: 0.7,
        reasoning: 'Initial',
        source: 'ai',
        timestamp: Date.now(),
      };

      const updatedCredibility: CredibilityScore = {
        score: 90,
        level: 'high',
        confidence: 0.9,
        reasoning: 'Updated',
        source: 'ai',
        timestamp: Date.now(),
      };

      indicatorManager.showIndicator(mockContent, initialCredibility);
      indicatorManager.updateIndicator({
        url: mockContent.url,
        credibility: updatedCredibility,
      });

      const indicator = document.querySelector('.truthlens-indicator');
      const score = indicator?.querySelector('.truthlens-score');
      const emoji = indicator?.querySelector('.truthlens-emoji');
      
      expect(score?.textContent).toBe('90/100');
      expect(emoji?.textContent).toBe('✅');
      expect(indicator?.getAttribute('data-level')).toBe('high');
    });
  });

  describe('cleanup and memory management', () => {
    it('should remove all indicators on cleanup', () => {
      const mockContent: ContentAnalysis = {
        title: 'Test',
        url: 'https://example.com/test',
        content: 'Test',
        type: 'article',
      };

      const mockCredibility: CredibilityScore = {
        score: 80,
        level: 'high',
        confidence: 0.9,
        reasoning: 'Test',
        source: 'ai',
        timestamp: Date.now(),
      };

      indicatorManager.showIndicator(mockContent, mockCredibility);
      expect(document.querySelectorAll('.truthlens-indicator').length).toBe(1);

      indicatorManager.cleanup();
      expect(document.querySelectorAll('.truthlens-indicator').length).toBe(0);
    });

    it('should clear internal state on cleanup', () => {
      const mockContent: ContentAnalysis = {
        title: 'Test',
        url: 'https://example.com/test',
        content: 'Test',
        type: 'article',
      };

      const mockCredibility: CredibilityScore = {
        score: 80,
        level: 'high',
        confidence: 0.9,
        reasoning: 'Test',
        source: 'ai',
        timestamp: Date.now(),
      };

      indicatorManager.showIndicator(mockContent, mockCredibility);
      expect((indicatorManager as any).indicators.size).toBe(1);

      indicatorManager.cleanup();
      expect((indicatorManager as any).indicators.size).toBe(0);
    });
  });

  describe('performance', () => {
    it('should create indicators quickly', async () => {
      const mockContent: ContentAnalysis = {
        title: 'Performance Test',
        url: 'https://example.com/perf',
        content: 'Test',
        type: 'article',
      };

      const mockCredibility: CredibilityScore = {
        score: 80,
        level: 'high',
        confidence: 0.9,
        reasoning: 'Performance test',
        source: 'ai',
        timestamp: Date.now(),
      };

      const startTime = performance.now();
      indicatorManager.showIndicator(mockContent, mockCredibility);
      const endTime = performance.now();

      // Should create indicator within 50ms
      expect(endTime - startTime).toBeLessThan(50);
    });

    it('should handle multiple indicators efficiently', () => {
      const startTime = performance.now();

      for (let i = 0; i < 10; i++) {
        const mockContent: ContentAnalysis = {
          title: `Test ${i}`,
          url: `https://example.com/test${i}`,
          content: 'Test',
          type: 'article',
        };

        const mockCredibility: CredibilityScore = {
          score: 80,
          level: 'high',
          confidence: 0.9,
          reasoning: 'Test',
          source: 'ai',
          timestamp: Date.now(),
        };

        indicatorManager.showIndicator(mockContent, mockCredibility);
      }

      const endTime = performance.now();

      // Should handle 10 indicators within 200ms
      expect(endTime - startTime).toBeLessThan(200);
      expect(document.querySelectorAll('.truthlens-indicator').length).toBe(10);
    });
  });
});