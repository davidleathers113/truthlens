/**
 * Desktop Browser Testing Infrastructure for Mobile-Optimized Websites
 * Tests desktop browser interactions with mobile-optimized content for Gen Z users
 * Implements 2025 best practices for desktop interaction analysis and efficiency metrics
 */

import {
  MobileMetrics,
  DeviceInfo,
  TouchPattern,
  GestureEvent,
  OrientationChange,
  NetworkCondition,
  BatteryMetrics,
  DeviceType,
  AttentionMetrics,
  ScrollMetrics,
  InteractionMetrics
} from './types';

export interface DesktopTestingConfig {
  enableMouseInteractionAnalysis: boolean;
  enableResponsiveHarness: boolean;
  enableClickPatternRecognition: boolean;
  enableViewportAdaptationTesting: boolean;
  enableEfficiencyMetrics: boolean;
  enableRealTimeDataStreaming: boolean;
  mouseTrackingPrecision: number; // milliseconds between mouse position samples
  clickEfficiencyThreshold: number; // maximum time for efficient clicks
  scrollEfficiencyThreshold: number; // optimal scroll speed for reading
  hoverIntentionThreshold: number; // minimum hover time to indicate intention
  desktopSimulationAccuracy: number; // 0-1 accuracy of mobile simulation
}

export interface DesktopInteractionPattern {
  sessionId: string;
  userId?: string;
  timestamp: number;
  interactionType: 'mouse_movement' | 'click' | 'scroll' | 'hover' | 'keyboard' | 'drag' | 'resize';
  coordinates: { x: number; y: number };
  efficiency: number; // 0-1 score for interaction efficiency
  isGenZTypical: boolean; // matches Gen Z desktop behavior patterns
  context: string; // what element/area was interacted with
  duration: number; // interaction duration in ms
}

export interface ResponsiveTestingResult {
  viewport: { width: number; height: number };
  mobileOptimizedDetected: boolean;
  adaptationQuality: number; // 0-1 how well content adapts
  interactionIssues: string[];
  performanceMetrics: {
    renderTime: number;
    interactivityDelay: number;
    layoutShifts: number;
  };
  accessibilityScore: number; // 0-1 accessibility compliance
}

export interface ClickPatternAnalysis {
  totalClicks: number;
  averageClickTime: number;
  accuracyRate: number; // percentage of successful clicks
  doubleClickRate: number;
  rightClickUsage: number;
  clickDistribution: { x: number; y: number; frequency: number }[];
  efficiency: number; // overall click efficiency score
  genZCharacteristics: string[]; // detected Gen Z clicking patterns
}

export interface ViewportAdaptationMetrics {
  originalViewport: { width: number; height: number };
  testViewports: { width: number; height: number }[];
  adaptationResults: ResponsiveTestingResult[];
  averageAdaptationScore: number;
  criticalIssues: string[];
  recommendedViewports: { width: number; height: number }[];
}

export class DesktopTestingInfrastructure {
  private config: DesktopTestingConfig;
  private sessionId: string;
  private isActive: boolean = false;

  // Interaction tracking
  private interactionPatterns: DesktopInteractionPattern[] = [];
  private mousePositions: { x: number; y: number; timestamp: number }[] = [];
  private clickPatterns: ClickPatternAnalysis | null = null;
  private responsiveResults: ResponsiveTestingResult[] = [];

  // Event listeners
  private eventListeners: Array<{ element: Element | Document | Window; event: string; listener: EventListener }> = [];
  private mouseTrackingTimer: NodeJS.Timeout | null = null;
  private performanceObserver: PerformanceObserver | null = null;

  // Streaming and analytics
  private dataStreamCallbacks: Function[] = [];
  private efficiencyMetrics: Map<string, number> = new Map();

  constructor(config: Partial<DesktopTestingConfig> = {}) {
    this.config = {
      enableMouseInteractionAnalysis: true,
      enableResponsiveHarness: true,
      enableClickPatternRecognition: true,
      enableViewportAdaptationTesting: true,
      enableEfficiencyMetrics: true,
      enableRealTimeDataStreaming: true,
      mouseTrackingPrecision: 50, // 20 FPS tracking
      clickEfficiencyThreshold: 300, // 300ms for efficient clicks
      scrollEfficiencyThreshold: 200, // 200px/s optimal scroll speed
      hoverIntentionThreshold: 200, // 200ms minimum hover
      desktopSimulationAccuracy: 0.9, // 90% accuracy target
      ...config
    };

    this.sessionId = this.generateSessionId();
  }

  /**
   * Initialize desktop testing infrastructure
   */
  public async initialize(): Promise<void> {
    if (this.isActive) return;

    try {
      this.isActive = true;

      // Setup mouse interaction analysis
      if (this.config.enableMouseInteractionAnalysis) {
        this.setupMouseTracking();
      }

      // Setup click pattern recognition
      if (this.config.enableClickPatternRecognition) {
        this.setupClickPatternAnalysis();
      }

      // Setup responsive testing harness
      if (this.config.enableResponsiveHarness) {
        this.setupResponsiveHarness();
      }

      // Setup viewport adaptation testing
      if (this.config.enableViewportAdaptationTesting) {
        this.setupViewportAdaptationTesting();
      }

      // Setup performance monitoring
      this.setupPerformanceMonitoring();

      // Start real-time data streaming
      if (this.config.enableRealTimeDataStreaming) {
        this.startRealTimeDataStreaming();
      }

      console.debug('[DesktopTestingInfrastructure] Initialized successfully', {
        sessionId: this.sessionId,
        config: this.config
      });
    } catch (error) {
      console.error('[DesktopTestingInfrastructure] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Setup mouse interaction tracking for Gen Z behavior analysis
   */
  private setupMouseTracking(): void {
    // High-precision mouse movement tracking
    this.addEventListenerTracked(document, 'mousemove', (event: MouseEvent) => {
      this.trackMouseMovement(event);
    });

    // Mouse click tracking with efficiency metrics
    this.addEventListenerTracked(document, 'mousedown', (event: MouseEvent) => {
      this.trackMouseInteraction('click', event, true);
    });

    this.addEventListenerTracked(document, 'mouseup', (event: MouseEvent) => {
      this.trackMouseInteraction('click', event, false);
    });

    // Hover pattern tracking
    this.addEventListenerTracked(document, 'mouseenter', (event: MouseEvent) => {
      this.trackMouseInteraction('hover', event, true);
    }, true);

    this.addEventListenerTracked(document, 'mouseleave', (event: MouseEvent) => {
      this.trackMouseInteraction('hover', event, false);
    }, true);

    // Drag interaction tracking
    this.addEventListenerTracked(document, 'dragstart', (event: DragEvent) => {
      this.trackDragInteraction(event, 'start');
    });

    this.addEventListenerTracked(document, 'dragend', (event: DragEvent) => {
      this.trackDragInteraction(event, 'end');
    });

    // Start continuous mouse position sampling
    this.mouseTrackingTimer = setInterval(() => {
      this.sampleMousePosition();
    }, this.config.mouseTrackingPrecision);
  }

  /**
   * Setup click pattern analysis for efficiency metrics
   */
  private setupClickPatternAnalysis(): void {
    let clickData: Array<{
      timestamp: number;
      coordinates: { x: number; y: number };
      target: string;
      successful: boolean;
      duration: number;
    }> = [];

    this.addEventListenerTracked(document, 'click', (event: MouseEvent) => {
      const target = event.target as Element;
      const isSuccessful = this.isClickSuccessful(event, target);
      const clickDuration = this.calculateClickDuration(event);

      clickData.push({
        timestamp: Date.now(),
        coordinates: { x: event.clientX, y: event.clientY },
        target: this.getElementSelector(target),
        successful: isSuccessful,
        duration: clickDuration
      });

      // Update click pattern analysis
      this.updateClickPatternAnalysis(clickData);

      // Keep only recent clicks (last 100)
      if (clickData.length > 100) {
        clickData = clickData.slice(-100);
      }
    });

    // Double-click tracking
    this.addEventListenerTracked(document, 'dblclick', (event: MouseEvent) => {
      this.trackDoubleClick(event);
    });

    // Right-click tracking
    this.addEventListenerTracked(document, 'contextmenu', (event: MouseEvent) => {
      this.trackRightClick(event);
    });
  }

  /**
   * Setup responsive testing harness
   */
  private setupResponsiveHarness(): void {
    // Detect if current page is mobile-optimized
    const isMobileOptimized = this.detectMobileOptimization();

    if (isMobileOptimized) {
      // Test various desktop viewport sizes
      this.testResponsiveAdaptation();
    }

    // Monitor viewport changes
    this.addEventListenerTracked(window, 'resize', () => {
      this.handleViewportChange();
    });

    // Monitor orientation simulation (for testing mobile-optimized sites)
    this.addEventListenerTracked(window, 'orientationchange', () => {
      this.handleOrientationSimulation();
    });
  }

  /**
   * Setup viewport adaptation testing
   */
  private setupViewportAdaptationTesting(): void {
    const commonDesktopViewports = [
      { width: 1920, height: 1080 }, // Full HD
      { width: 1366, height: 768 },  // Laptop
      { width: 1440, height: 900 },  // MacBook
      { width: 1536, height: 864 },  // Surface
      { width: 2560, height: 1440 }, // 2K
    ];

    // Test adaptation for each viewport
    commonDesktopViewports.forEach(viewport => {
      this.testViewportAdaptation(viewport);
    });
  }

  /**
   * Setup performance monitoring for mobile-optimized content
   */
  private setupPerformanceMonitoring(): void {
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          this.processPerformanceEntry(entry);
        });
      });

      this.performanceObserver.observe({ entryTypes: ['measure', 'navigation', 'paint'] });
    }

    // Monitor layout shifts (important for mobile-optimized content)
    if ('LayoutShift' in window) {
      this.performanceObserver?.observe({ entryTypes: ['layout-shift'] });
    }
  }

  /**
   * Track mouse movement with efficiency analysis
   */
  private trackMouseMovement(event: MouseEvent): void {
    const now = Date.now();
    const position = { x: event.clientX, y: event.clientY, timestamp: now };

    this.mousePositions.push(position);

    // Keep only recent positions (last 1000)
    if (this.mousePositions.length > 1000) {
      this.mousePositions = this.mousePositions.slice(-1000);
    }

    // Calculate movement efficiency
    const efficiency = this.calculateMovementEfficiency();
    this.efficiencyMetrics.set('mouse_movement', efficiency);
  }

  /**
   * Track mouse interactions with Gen Z pattern detection
   */
  private trackMouseInteraction(
    type: 'click' | 'hover',
    event: MouseEvent,
    isStart: boolean
  ): void {
    const now = Date.now();
    const coordinates = { x: event.clientX, y: event.clientY };
    const target = event.target as Element;
    const context = this.getElementContext(target);

    // Calculate efficiency based on interaction type
    let efficiency = 0;
    let isGenZTypical = false;

    if (type === 'click') {
      efficiency = this.calculateClickEfficiency(event);
      isGenZTypical = this.detectGenZClickPattern(event);
    } else if (type === 'hover') {
      efficiency = this.calculateHoverEfficiency(event);
      isGenZTypical = this.detectGenZHoverPattern(event);
    }

    const pattern: DesktopInteractionPattern = {
      sessionId: this.sessionId,
      timestamp: now,
      interactionType: type,
      coordinates,
      efficiency,
      isGenZTypical,
      context,
      duration: 0 // Will be calculated for hover end events
    };

    this.interactionPatterns.push(pattern);

    // Stream data in real-time if enabled
    if (this.config.enableRealTimeDataStreaming) {
      this.streamInteractionData(pattern);
    }
  }

  /**
   * Track drag interactions
   */
  private trackDragInteraction(event: DragEvent, phase: 'start' | 'end'): void {
    const coordinates = { x: event.clientX, y: event.clientY };
    const target = event.target as Element;

    const pattern: DesktopInteractionPattern = {
      sessionId: this.sessionId,
      timestamp: Date.now(),
      interactionType: 'drag',
      coordinates,
      efficiency: this.calculateDragEfficiency(event),
      isGenZTypical: this.detectGenZDragPattern(event),
      context: this.getElementContext(target),
      duration: 0
    };

    this.interactionPatterns.push(pattern);
  }

  /**
   * Detect if page is mobile-optimized
   */
  private detectMobileOptimization(): boolean {
    // Check viewport meta tag
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta) {
      const content = viewportMeta.getAttribute('content') || '';
      if (content.includes('width=device-width') || content.includes('initial-scale=1')) {
        return true;
      }
    }

    // Check for responsive CSS
    const stylesheets = Array.from(document.styleSheets);
    for (const stylesheet of stylesheets) {
      try {
        const rules = Array.from(stylesheet.cssRules || []);
        const hasMediaQueries = rules.some(rule =>
          rule instanceof CSSMediaRule &&
          rule.conditionText.includes('max-width')
        );
        if (hasMediaQueries) return true;
      } catch (e) {
        // Stylesheet may be from different origin
      }
    }

    // Check for mobile-specific classes or elements
    const mobileElements = document.querySelectorAll(
      '[class*="mobile"], [class*="responsive"], [class*="adaptive"]'
    );

    return mobileElements.length > 0;
  }

  /**
   * Test responsive adaptation across viewports
   */
  private testResponsiveAdaptation(): void {
    const originalViewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    const testViewports = [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1024, height: 768 },
      { width: 768, height: 1024 }
    ];

    testViewports.forEach(viewport => {
      setTimeout(() => {
        const result = this.analyzeViewportAdaptation(viewport);
        this.responsiveResults.push(result);
      }, 100);
    });
  }

  /**
   * Analyze how content adapts to viewport
   */
  private analyzeViewportAdaptation(viewport: { width: number; height: number }): ResponsiveTestingResult {
    const issues: string[] = [];
    let adaptationQuality = 1.0;

    // Check for horizontal scrolling (bad on desktop)
    if (document.body.scrollWidth > viewport.width) {
      issues.push('Horizontal scrolling detected');
      adaptationQuality -= 0.2;
    }

    // Check for text readability
    const textElements = document.querySelectorAll('p, span, div');
    let smallTextCount = 0;
    textElements.forEach(element => {
      const computedStyle = getComputedStyle(element);
      const fontSize = parseInt(computedStyle.fontSize);
      if (fontSize < 14) smallTextCount++;
    });

    if (smallTextCount > textElements.length * 0.3) {
      issues.push('Text too small for desktop viewing');
      adaptationQuality -= 0.2;
    }

    // Check for touch-only interactions
    const touchOnlyElements = document.querySelectorAll('[ontouchstart], [data-touch]');
    if (touchOnlyElements.length > 0) {
      issues.push('Touch-only interactions detected');
      adaptationQuality -= 0.1;
    }

    // Calculate performance metrics
    const performanceMetrics = this.calculatePerformanceMetrics();

    return {
      viewport,
      mobileOptimizedDetected: true,
      adaptationQuality: Math.max(0, adaptationQuality),
      interactionIssues: issues,
      performanceMetrics,
      accessibilityScore: this.calculateAccessibilityScore()
    };
  }

  /**
   * Calculate movement efficiency for mouse patterns
   */
  private calculateMovementEfficiency(): number {
    if (this.mousePositions.length < 2) return 1.0;

    const recent = this.mousePositions.slice(-10); // Last 10 positions
    let totalDistance = 0;
    let directDistance = 0;

    for (let i = 1; i < recent.length; i++) {
      const prev = recent[i - 1];
      const curr = recent[i];
      totalDistance += Math.sqrt(
        Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
      );
    }

    if (recent.length > 1) {
      const start = recent[0];
      const end = recent[recent.length - 1];
      directDistance = Math.sqrt(
        Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
      );
    }

    return totalDistance > 0 ? Math.min(1.0, directDistance / totalDistance) : 1.0;
  }

  /**
   * Calculate click efficiency
   */
  private calculateClickEfficiency(event: MouseEvent): number {
    const target = event.target as Element;
    const isInteractiveElement = this.isInteractiveElement(target);
    const clickTime = this.getClickTime(event);

    let efficiency = 1.0;

    // Reduce efficiency for non-interactive elements
    if (!isInteractiveElement) efficiency -= 0.3;

    // Reduce efficiency for slow clicks
    if (clickTime > this.config.clickEfficiencyThreshold) {
      efficiency -= 0.2;
    }

    // Boost efficiency for precise clicks
    const targetRect = target.getBoundingClientRect();
    const targetCenter = {
      x: targetRect.left + targetRect.width / 2,
      y: targetRect.top + targetRect.height / 2
    };

    const distance = Math.sqrt(
      Math.pow(event.clientX - targetCenter.x, 2) +
      Math.pow(event.clientY - targetCenter.y, 2)
    );

    const targetRadius = Math.min(targetRect.width, targetRect.height) / 2;
    if (distance <= targetRadius * 0.5) efficiency += 0.1;

    return Math.max(0, Math.min(1, efficiency));
  }

  /**
   * Detect Gen Z click patterns
   */
  private detectGenZClickPattern(event: MouseEvent): boolean {
    // Quick clicks (Gen Z tends to click faster)
    const clickTime = this.getClickTime(event);
    if (clickTime < 100) return true;

    // Multiple rapid clicks in succession
    const recentClicks = this.interactionPatterns
      .filter(p => p.interactionType === 'click' &&
                  Date.now() - p.timestamp < 1000)
      .length;

    if (recentClicks >= 3) return true;

    // Clicking on non-traditional interactive elements
    const target = event.target as Element;
    const hasGenZClasses = target.className.toLowerCase().includes('clickable') ||
                          target.closest('[data-clickable]') !== null;

    return hasGenZClasses;
  }

  /**
   * Start real-time data streaming
   */
  private startRealTimeDataStreaming(): void {
    setInterval(() => {
      const streamData = {
        timestamp: Date.now(),
        mouseEfficiency: this.efficiencyMetrics.get('mouse_movement') || 0,
        recentInteractions: this.interactionPatterns.slice(-10),
        responsiveResults: this.responsiveResults.slice(-5),
        performanceMetrics: this.calculatePerformanceMetrics()
      };

      this.dataStreamCallbacks.forEach(callback => {
        try {
          callback(streamData);
        } catch (error) {
          console.error('[DesktopTestingInfrastructure] Streaming callback error:', error);
        }
      });
    }, 1000); // Stream every second
  }

  /**
   * Get desktop interaction metrics
   */
  public getDesktopMetrics(): {
    interactionPatterns: DesktopInteractionPattern[];
    clickPatternAnalysis: ClickPatternAnalysis | null;
    responsiveResults: ResponsiveTestingResult[];
    efficiencyMetrics: Record<string, number>;
    genZBehaviorScore: number;
  } {
    return {
      interactionPatterns: [...this.interactionPatterns],
      clickPatternAnalysis: this.clickPatterns,
      responsiveResults: [...this.responsiveResults],
      efficiencyMetrics: Object.fromEntries(this.efficiencyMetrics),
      genZBehaviorScore: this.calculateGenZBehaviorScore()
    };
  }

  /**
   * Subscribe to real-time data stream
   */
  public subscribeToDataStream(callback: Function): void {
    this.dataStreamCallbacks.push(callback);
  }

  /**
   * Calculate overall Gen Z behavior score
   */
  private calculateGenZBehaviorScore(): number {
    const genZPatterns = this.interactionPatterns.filter(p => p.isGenZTypical);
    const totalPatterns = this.interactionPatterns.length;

    if (totalPatterns === 0) return 0;

    const genZRatio = genZPatterns.length / totalPatterns;
    const averageEfficiency = Array.from(this.efficiencyMetrics.values())
      .reduce((sum, val) => sum + val, 0) / this.efficiencyMetrics.size || 0;

    return (genZRatio * 0.6) + (averageEfficiency * 0.4);
  }

  // Helper methods
  private generateSessionId(): string {
    return `desktop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addEventListenerTracked(
    element: Element | Document | Window,
    event: string,
    listener: EventListener,
    useCapture?: boolean
  ): void {
    element.addEventListener(event, listener, useCapture);
    this.eventListeners.push({ element, event, listener });
  }

  private getElementSelector(element: Element): string {
    if (element.id) return `#${element.id}`;
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c).slice(0, 2);
      if (classes.length > 0) {
        return `${element.tagName.toLowerCase()}.${classes.join('.')}`;
      }
    }
    return element.tagName.toLowerCase();
  }

  private getElementContext(element: Element): string {
    return this.getElementSelector(element);
  }

  private isInteractiveElement(element: Element): boolean {
    const interactiveTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
    return interactiveTags.includes(element.tagName) ||
           element.hasAttribute('onclick') ||
           element.getAttribute('role') === 'button';
  }

  private getClickTime(event: MouseEvent): number {
    // Simplified - would need to track mousedown/mouseup timing
    return 100; // Placeholder
  }

  private calculateHoverEfficiency(event: MouseEvent): number {
    // Placeholder implementation
    return 0.8;
  }

  private detectGenZHoverPattern(event: MouseEvent): boolean {
    // Placeholder implementation
    return false;
  }

  private calculateDragEfficiency(event: DragEvent): number {
    // Placeholder implementation
    return 0.7;
  }

  private detectGenZDragPattern(event: DragEvent): boolean {
    // Placeholder implementation
    return false;
  }

  private sampleMousePosition(): void {
    // Placeholder - would track current mouse position
  }

  private isClickSuccessful(event: MouseEvent, target: Element): boolean {
    return this.isInteractiveElement(target);
  }

  private calculateClickDuration(event: MouseEvent): number {
    return 100; // Placeholder
  }

  private updateClickPatternAnalysis(clickData: any[]): void {
    // Update click pattern analysis
  }

  private trackDoubleClick(event: MouseEvent): void {
    // Track double-click patterns
  }

  private trackRightClick(event: MouseEvent): void {
    // Track right-click usage
  }

  private handleViewportChange(): void {
    // Handle viewport changes
  }

  private handleOrientationSimulation(): void {
    // Handle orientation changes in simulation
  }

  private testViewportAdaptation(viewport: { width: number; height: number }): void {
    // Test specific viewport adaptation
  }

  private processPerformanceEntry(entry: PerformanceEntry): void {
    // Process performance entries
  }

  private streamInteractionData(pattern: DesktopInteractionPattern): void {
    this.dataStreamCallbacks.forEach(callback => {
      try {
        callback({ type: 'interaction', data: pattern });
      } catch (error) {
        console.error('[DesktopTestingInfrastructure] Stream error:', error);
      }
    });
  }

  private calculatePerformanceMetrics(): { renderTime: number; interactivityDelay: number; layoutShifts: number } {
    return {
      renderTime: 100,
      interactivityDelay: 50,
      layoutShifts: 0.1
    };
  }

  private calculateAccessibilityScore(): number {
    return 0.8; // Placeholder
  }

  /**
   * Stop testing and cleanup
   */
  public stop(): void {
    this.isActive = false;

    if (this.mouseTrackingTimer) {
      clearInterval(this.mouseTrackingTimer);
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }

    this.eventListeners.forEach(({ element, event, listener }) => {
      element.removeEventListener(event, listener);
    });

    this.eventListeners = [];
    this.dataStreamCallbacks = [];
  }
}
