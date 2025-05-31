/**
 * Enhanced Indicator Manager - 2025 Gen Z Optimized Integration
 * Combines all components for comprehensive visual indicator system
 */

import { CredibilityScore, ContentAnalysis } from '@shared/types';
import { BaseIndicator, IndicatorConfig, IndicatorPosition } from './BaseIndicator';
import { ProgressiveDisclosureManager, DisclosureConfig } from './ProgressiveDisclosureManager';
import { PositionManager, PositionConstraints } from './PositionManager';
import { AccessibilityManager, AccessibilityConfig } from './AccessibilityManager';
import { MobileGestureManager, GestureConfig } from './MobileGestureManager';
import { IndicatorStyles } from './IndicatorStyles';

export interface EnhancedIndicatorConfig {
  indicator: Partial<IndicatorConfig>;
  disclosure: Partial<DisclosureConfig>;
  accessibility: Partial<AccessibilityConfig>;
  gesture: Partial<GestureConfig>;
  positioning: Partial<PositionConstraints>;
  theme: 'light' | 'dark' | 'auto';
  enableAnalytics: boolean;
  debugMode: boolean;
}

export interface IndicatorInstance {
  id: string;
  indicator: BaseIndicator;
  disclosureManager: ProgressiveDisclosureManager;
  contentAnalysis: ContentAnalysis;
  targetElement: Element;
  isVisible: boolean;
  createdAt: number;
}

export class EnhancedIndicatorManager {
  private config: EnhancedIndicatorConfig;
  private indicators: Map<string, IndicatorInstance> = new Map();
  private positionManager: PositionManager;
  private accessibilityManager: AccessibilityManager;
  private gestureManager: MobileGestureManager;
  private styles: IndicatorStyles;
  private isInitialized: boolean = false;
  private analyticsQueue: any[] = [];

  constructor(config: Partial<EnhancedIndicatorConfig> = {}) {
    this.config = {
      indicator: {
        size: 'standard',
        theme: 'auto',
        showScore: true,
        showEmoji: true,
        animationDuration: 150
      },
      disclosure: {
        maxLevel: 3,
        autoAdvance: false,
        autoHideDuration: 8000,
        animationDuration: 150,
        mobileOptimized: true
      },
      accessibility: {
        enableKeyboardNavigation: true,
        enableScreenReaderSupport: true,
        enableHighContrast: true,
        enableReducedMotion: true,
        customFocusOutline: '2px solid #005fcc',
        announceChanges: true
      },
      gesture: {
        enableSwipeGestures: true,
        enablePinchGestures: false,
        enableHapticFeedback: true,
        swipeThreshold: 30,
        velocityThreshold: 0.5,
        maxGestureDuration: 1000,
        enableLongPress: true,
        longPressDuration: 500
      },
      positioning: {
        margin: 12,
        preferredPlacement: 'top-right',
        allowFlip: true,
        avoidCollisions: true
      },
      theme: 'auto',
      enableAnalytics: true,
      debugMode: false,
      ...config
    };

    this.initialize();
  }

  private initialize(): void {
    try {
      // Initialize styles first
      this.styles = IndicatorStyles.getInstance();
      this.styles.injectStyles();

      // Initialize core managers
      this.positionManager = new PositionManager();
      this.accessibilityManager = new AccessibilityManager(this.config.accessibility);
      this.gestureManager = new MobileGestureManager(this.config.gesture);

      // Set up global event listeners
      this.setupGlobalEventListeners();

      // Apply theme
      this.styles.updateTheme(this.config.theme);

      // Calibrate for current device
      this.gestureManager.calibrateForDevice();

      this.isInitialized = true;

      if (this.config.debugMode) {
        console.log('EnhancedIndicatorManager: Initialized successfully', {
          config: this.config,
          support: this.gestureManager.getGestureSupport()
        });
      }

      // Dispatch initialization event
      this.dispatchEvent('truthlens:manager-initialized', {
        version: '2025.1.0',
        features: this.getEnabledFeatures()
      });

    } catch (error) {
      console.error('EnhancedIndicatorManager: Initialization failed', error);
      throw error;
    }
  }

  private setupGlobalEventListeners(): void {
    // Handle page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

    // Handle page unload
    window.addEventListener('beforeunload', this.handlePageUnload.bind(this));

    // Handle global escape key for closing all disclosures
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && e.ctrlKey) {
        this.hideAllIndicators();
      }
    });

    // Handle theme changes
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkModeQuery.addEventListener('change', this.handleThemeChange.bind(this));

    // Handle reduced motion changes
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionQuery.addEventListener('change', this.handleReducedMotionChange.bind(this));
  }

  public showIndicator(
    content: ContentAnalysis, 
    credibility: CredibilityScore,
    targetElement?: Element
  ): string {
    if (!this.isInitialized) {
      throw new Error('EnhancedIndicatorManager: Manager not initialized');
    }

    const indicatorId = this.generateIndicatorId(content);

    // Check if indicator already exists
    if (this.indicators.has(indicatorId)) {
      this.updateIndicator(indicatorId, credibility);
      return indicatorId;
    }

    try {
      // Find target element if not provided
      const target = targetElement || this.findTargetElement(content);
      if (!target) {
        if (this.config.debugMode) {
          console.warn('EnhancedIndicatorManager: No target element found for content', content);
        }
        return '';
      }

      // Create base indicator
      const indicator = new BaseIndicator(credibility, this.config.indicator);

      // Create progressive disclosure manager
      const disclosureManager = new ProgressiveDisclosureManager(
        credibility,
        content,
        indicator,
        this.config.disclosure
      );

      // Calculate optimal position
      const position = this.positionManager.calculateOptimalPosition(target, {
        ...this.config.positioning,
        viewport: new DOMRect(0, 0, window.innerWidth, window.innerHeight),
        target: target.getBoundingClientRect()
      });

      // Register with managers
      this.positionManager.registerIndicator(indicatorId, indicator);
      this.accessibilityManager.registerIndicator(indicatorId, indicator);
      this.gestureManager.registerIndicator(indicatorId, indicator);

      // Create indicator instance
      const instance: IndicatorInstance = {
        id: indicatorId,
        indicator,
        disclosureManager,
        contentAnalysis: content,
        targetElement: target,
        isVisible: false,
        createdAt: Date.now()
      };

      // Store instance
      this.indicators.set(indicatorId, instance);

      // Show indicator with optimal position
      indicator.show(position.position);
      instance.isVisible = true;

      // Set up instance-specific event listeners
      this.setupIndicatorEventListeners(instance);

      // Analytics
      this.trackEvent('indicator_shown', {
        indicatorId,
        credibilityLevel: credibility.level,
        credibilityScore: credibility.score,
        contentType: content.type,
        platform: content.platform,
        positioning: position.placement,
        collisions: position.collisions.length,
        adjustments: position.adjustments
      });

      // Accessibility announcement
      this.accessibilityManager.announce(
        `New credibility indicator displayed. Level: ${credibility.level}, Score: ${credibility.score} out of 100.`
      );

      if (this.config.debugMode) {
        console.log('EnhancedIndicatorManager: Indicator shown', {
          id: indicatorId,
          position: position,
          credibility
        });
      }

      return indicatorId;

    } catch (error) {
      console.error('EnhancedIndicatorManager: Failed to show indicator', error);
      this.trackEvent('indicator_error', {
        error: error.message,
        content: content.url
      });
      return '';
    }
  }

  public updateIndicator(indicatorId: string, credibility: CredibilityScore): void {
    const instance = this.indicators.get(indicatorId);
    if (!instance) {
      if (this.config.debugMode) {
        console.warn('EnhancedIndicatorManager: Indicator not found for update', indicatorId);
      }
      return;
    }

    try {
      // Update base indicator
      instance.indicator.updateCredibility(credibility);

      // Update content analysis in instance
      instance.contentAnalysis.analysis.credibility = credibility;

      // Analytics
      this.trackEvent('indicator_updated', {
        indicatorId,
        newLevel: credibility.level,
        newScore: credibility.score
      });

      // Accessibility announcement
      this.accessibilityManager.announce(
        `Credibility indicator updated. New level: ${credibility.level}, Score: ${credibility.score} out of 100.`
      );

    } catch (error) {
      console.error('EnhancedIndicatorManager: Failed to update indicator', error);
    }
  }

  public hideIndicator(indicatorId: string): void {
    const instance = this.indicators.get(indicatorId);
    if (!instance) return;

    try {
      // Hide disclosure if open
      instance.disclosureManager.forceCollapse();

      // Hide indicator
      instance.indicator.hide();
      instance.isVisible = false;

      // Unregister from managers
      this.positionManager.unregisterIndicator(indicatorId);
      this.accessibilityManager.unregisterIndicator(indicatorId);
      this.gestureManager.unregisterIndicator(indicatorId);

      // Cleanup
      setTimeout(() => {
        instance.indicator.destroy();
        instance.disclosureManager.destroy();
        this.indicators.delete(indicatorId);
      }, this.config.indicator.animationDuration || 150);

      // Analytics
      this.trackEvent('indicator_hidden', {
        indicatorId,
        visibilityDuration: Date.now() - instance.createdAt
      });

    } catch (error) {
      console.error('EnhancedIndicatorManager: Failed to hide indicator', error);
    }
  }

  public hideAllIndicators(): void {
    const indicatorIds = Array.from(this.indicators.keys());
    
    for (const id of indicatorIds) {
      this.hideIndicator(id);
    }

    this.accessibilityManager.announce('All credibility indicators hidden.');
  }

  public getIndicator(indicatorId: string): IndicatorInstance | undefined {
    return this.indicators.get(indicatorId);
  }

  public getAllIndicators(): IndicatorInstance[] {
    return Array.from(this.indicators.values());
  }

  public getVisibleIndicators(): IndicatorInstance[] {
    return Array.from(this.indicators.values()).filter(instance => instance.isVisible);
  }

  private setupIndicatorEventListeners(instance: IndicatorInstance): void {
    const { indicator, disclosureManager } = instance;
    const element = indicator.getElement();

    // Handle reposition events
    element.addEventListener('truthlens:reposition-needed', () => {
      this.repositionIndicator(instance);
    });

    // Handle gesture events
    element.addEventListener('truthlens:gesture-swipe', (e: CustomEvent) => {
      this.handleSwipeGesture(instance, e.detail);
    });

    element.addEventListener('truthlens:gesture-long-press', (e: CustomEvent) => {
      this.handleLongPressGesture(instance, e.detail);
    });

    element.addEventListener('truthlens:gesture-double-tap', (e: CustomEvent) => {
      this.handleDoubleTapGesture(instance, e.detail);
    });

    // Handle disclosure events
    element.addEventListener('truthlens:expand-disclosure', () => {
      disclosureManager.advanceToLevel(
        disclosureManager.getCurrentLevel() + 1
      );
    });

    element.addEventListener('truthlens:collapse-disclosure', () => {
      disclosureManager.forceCollapse();
    });

    element.addEventListener('truthlens:dismiss-indicator', () => {
      this.hideIndicator(instance.id);
    });
  }

  private repositionIndicator(instance: IndicatorInstance): void {
    try {
      const position = this.positionManager.calculateOptimalPosition(
        instance.targetElement,
        this.config.positioning
      );

      // Update indicator position
      const element = instance.indicator.getElement();
      element.style.left = `${position.position.x}px`;
      element.style.top = `${position.position.y}px`;

      this.trackEvent('indicator_repositioned', {
        indicatorId: instance.id,
        newPlacement: position.placement,
        collisions: position.collisions.length
      });

    } catch (error) {
      console.error('EnhancedIndicatorManager: Failed to reposition indicator', error);
    }
  }

  private handleSwipeGesture(instance: IndicatorInstance, gestureEvent: any): void {
    const { direction } = gestureEvent;

    this.trackEvent('gesture_swipe', {
      indicatorId: instance.id,
      direction,
      velocity: gestureEvent.velocity
    });

    // Provide haptic feedback based on action result
    if (direction === 'up' || direction === 'down') {
      // Disclosure actions - medium feedback
      this.gestureManager['triggerHapticFeedback']('medium');
    } else {
      // Dismiss/pin actions - light feedback
      this.gestureManager['triggerHapticFeedback']('light');
    }
  }

  private handleLongPressGesture(instance: IndicatorInstance, gestureEvent: any): void {
    this.trackEvent('gesture_long_press', {
      indicatorId: instance.id
    });

    // Show context menu or quick actions
    // This could be implemented as a quick action panel
    this.accessibilityManager.announce('Long press detected. Quick actions available.');
  }

  private handleDoubleTapGesture(instance: IndicatorInstance, gestureEvent: any): void {
    this.trackEvent('gesture_double_tap', {
      indicatorId: instance.id
    });

    // Double tap to jump to level 3 disclosure
    instance.disclosureManager.advanceToLevel(3);
  }

  private findTargetElement(content: ContentAnalysis): Element | null {
    // Platform-specific selectors
    const platformSelectors: Record<string, string[]> = {
      twitter: [
        '[data-testid="tweet"]',
        'article[role="article"]',
        '[data-testid="tweetText"]'
      ],
      facebook: [
        '[data-pagelet*="FeedUnit"]',
        '[role="article"]',
        '[data-testid="story-subtitle"]'
      ],
      instagram: [
        'article',
        '[role="article"]',
        '._aam8'
      ],
      youtube: [
        '#above-the-fold',
        '#primary-inner',
        '#meta'
      ],
      tiktok: [
        '[data-e2e="video-card"]',
        '[data-e2e="video-detail"]'
      ],
      reddit: [
        '[data-testid="post-content"]',
        '.Post',
        '[data-click-id="body"]'
      ],
      linkedin: [
        '.feed-shared-update-v2',
        '[data-id*="update"]'
      ]
    };

    // Try platform-specific selectors first
    if (content.platform && platformSelectors[content.platform]) {
      for (const selector of platformSelectors[content.platform]) {
        const element = document.querySelector(selector);
        if (element) return element;
      }
    }

    // Generic fallbacks
    const genericSelectors = [
      'main',
      'article',
      '[role="main"]',
      '[role="article"]',
      '.content',
      '#content',
      'body'
    ];

    for (const selector of genericSelectors) {
      const element = document.querySelector(selector);
      if (element) return element;
    }

    return document.body;
  }

  private generateIndicatorId(content: ContentAnalysis): string {
    // Create a unique ID based on content URL and timestamp
    const hash = this.simpleHash(content.url + content.title + Date.now());
    return `truthlens-indicator-${hash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private handleVisibilityChange(): void {
    if (document.hidden) {
      // Page is hidden, pause animations and reduce activity
      this.indicators.forEach(instance => {
        instance.disclosureManager.forceCollapse();
      });
    }
  }

  private handlePageUnload(): void {
    // Cleanup before page unload
    this.destroy();
  }

  private handleThemeChange(e: MediaQueryListEvent): void {
    if (this.config.theme === 'auto') {
      this.styles.updateTheme('auto');
    }
  }

  private handleReducedMotionChange(e: MediaQueryListEvent): void {
    // Update animation settings based on reduced motion preference
    const newDuration = e.matches ? 1 : 150;
    
    this.config.indicator.animationDuration = newDuration;
    this.config.disclosure.animationDuration = newDuration;
  }

  private trackEvent(event: string, properties?: Record<string, any>): void {
    if (!this.config.enableAnalytics) return;

    const analyticsEvent = {
      event,
      properties: {
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        ...properties
      }
    };

    this.analyticsQueue.push(analyticsEvent);

    // Dispatch analytics event
    this.dispatchEvent('truthlens:analytics', analyticsEvent);
  }

  private dispatchEvent(eventName: string, detail: any): void {
    const event = new CustomEvent(eventName, {
      detail,
      bubbles: true,
      cancelable: false
    });
    
    document.dispatchEvent(event);
  }

  private getEnabledFeatures(): string[] {
    const features = [];
    
    if (this.config.accessibility.enableKeyboardNavigation) features.push('keyboard-navigation');
    if (this.config.accessibility.enableScreenReaderSupport) features.push('screen-reader');
    if (this.config.gesture.enableSwipeGestures) features.push('swipe-gestures');
    if (this.config.gesture.enableHapticFeedback) features.push('haptic-feedback');
    if (this.config.positioning.avoidCollisions) features.push('collision-detection');
    if (this.config.disclosure.mobileOptimized) features.push('mobile-optimized');
    
    return features;
  }

  // Public configuration methods
  public updateConfig(newConfig: Partial<EnhancedIndicatorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Apply configuration changes
    if (newConfig.theme) {
      this.styles.updateTheme(newConfig.theme);
    }
    
    if (newConfig.gesture) {
      this.gestureManager.setGestureConfig(newConfig.gesture);
    }
  }

  public setTheme(theme: 'light' | 'dark' | 'auto'): void {
    this.config.theme = theme;
    this.styles.updateTheme(theme);
  }

  public setAccessibilityEnabled(enabled: boolean): void {
    this.accessibilityManager.setKeyboardNavigationEnabled(enabled);
  }

  public getAnalyticsData(): any[] {
    return [...this.analyticsQueue];
  }

  public clearAnalyticsData(): void {
    this.analyticsQueue = [];
  }

  public getManagerStats(): {
    totalIndicators: number;
    visibleIndicators: number;
    oldestIndicator: number | null;
    averageDisplayTime: number;
  } {
    const indicators = Array.from(this.indicators.values());
    const visible = indicators.filter(i => i.isVisible);
    const now = Date.now();
    
    return {
      totalIndicators: indicators.length,
      visibleIndicators: visible.length,
      oldestIndicator: indicators.length > 0 ? Math.min(...indicators.map(i => i.createdAt)) : null,
      averageDisplayTime: indicators.length > 0 
        ? indicators.reduce((sum, i) => sum + (now - i.createdAt), 0) / indicators.length 
        : 0
    };
  }

  public destroy(): void {
    try {
      // Hide all indicators
      this.hideAllIndicators();

      // Wait for animations to complete
      setTimeout(() => {
        // Destroy managers
        this.positionManager?.destroy();
        this.accessibilityManager?.destroy();
        this.gestureManager?.destroy();

        // Remove styles
        this.styles?.removeStyles();

        // Clear data
        this.indicators.clear();
        this.analyticsQueue = [];

        this.isInitialized = false;

        if (this.config.debugMode) {
          console.log('EnhancedIndicatorManager: Destroyed successfully');
        }
      }, Math.max(this.config.indicator.animationDuration || 150, 100));

    } catch (error) {
      console.error('EnhancedIndicatorManager: Error during destruction', error);
    }
  }
}