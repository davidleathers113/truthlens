/**
 * Gen Z Attention Span Testing Module
 * Implements 2025 best practices for attention tracking using IntersectionObserver API
 * Focuses on 8-second attention windows, deep engagement patterns, and task-switching behavior
 */

import {
  AttentionMetrics,
  TaskSwitchEvent,
  ScrollMetrics,
  InteractionMetrics,
  VisibilityMetrics,
  ElementVisibility,
  AttentionPoint,
  ViewportChange,
  ClickEvent,
  HoverEvent,
  FormInteraction,
  MediaInteraction,
  ScrollPattern,
  AbandonmentReason,
  DeviceType
} from './types';

export interface AttentionSpanConfig {
  initialAttentionThreshold: number; // Default: 8000ms (8 seconds)
  deepEngagementThreshold: number; // Default: 30000ms (30 seconds)
  taskSwitchingInterval: number; // Default: 240000ms (4 minutes)
  scrollSpeedThreshold: number; // Pixels per second to distinguish reading vs skimming
  visibilityThresholds: number[]; // IntersectionObserver thresholds
  enableHeatmapping: boolean;
  enableTaskSwitchingDetection: boolean;
  enableScrollAnalysis: boolean;
  samplingRate: number; // 0-1, percentage of users to track
}

export class AttentionSpanModule {
  private config: AttentionSpanConfig;
  private sessionId: string;
  private userId?: string;
  private startTime: number;
  private isActive: boolean = false;

  // Intersection Observer for visibility tracking
  private intersectionObserver?: IntersectionObserver;
  private observedElements: Map<Element, ElementVisibility> = new Map();

  // Event listeners and tracking
  private eventListeners: Array<{ element: Element | Document | Window; event: string; listener: EventListener }> = [];
  private attentionMetrics: AttentionMetrics;
  private taskSwitchingTimer?: number;
  private lastInteractionTime: number = 0;
  private isPageVisible: boolean = true;

  // Scroll tracking
  private scrollData: ScrollPattern[] = [];
  private lastScrollPosition: number = 0;
  private lastScrollTime: number = 0;

  // Interaction tracking
  private interactions: {
    clicks: ClickEvent[];
    hovers: HoverEvent[];
    forms: FormInteraction[];
    media: MediaInteraction[];
  } = {
    clicks: [],
    hovers: [],
    forms: [],
    media: []
  };

  // Attention heatmap data
  private attentionPoints: AttentionPoint[] = [];

  constructor(config: Partial<AttentionSpanConfig> = {}, userId?: string) {
    this.config = {
      initialAttentionThreshold: 8000, // 8 seconds based on 2025 research
      deepEngagementThreshold: 30000, // 30 seconds for deep engagement
      taskSwitchingInterval: 240000, // 4 minutes average for Gen Z
      scrollSpeedThreshold: 200, // pixels per second
      visibilityThresholds: [0.0, 0.25, 0.5, 0.75, 1.0], // Granular visibility tracking
      enableHeatmapping: true,
      enableTaskSwitchingDetection: true,
      enableScrollAnalysis: true,
      samplingRate: 1.0,
      ...config
    };

    this.sessionId = this.generateSessionId();
    this.userId = userId;
    this.startTime = Date.now();

    // Initialize attention metrics
    this.attentionMetrics = {
      sessionId: this.sessionId,
      userId: this.userId,
      startTime: this.startTime,
      totalEngagementTime: 0,
      initialAttentionWindow: 0,
      deepEngagementThreshold: 0,
      taskSwitchingEvents: [],
      scrollMetrics: {
        totalScrollDepth: 0,
        maxScrollDepth: 0,
        scrollSpeed: 0,
        scrollPatterns: [],
        readingTime: 0
      },
      interactionMetrics: {
        clicks: [],
        hovers: [],
        keyboardEvents: [],
        touchEvents: [],
        formInteractions: [],
        mediaInteractions: []
      },
      visibilityMetrics: {
        elementVisibilities: [],
        attentionHeatmap: [],
        viewportChanges: []
      }
    };
  }

  /**
   * Initialize attention tracking with modern 2025 APIs
   */
  public async initialize(): Promise<void> {
    if (this.isActive || Math.random() > this.config.samplingRate) {
      return;
    }

    try {
      this.isActive = true;
      this.setupIntersectionObserver();
      this.setupEventListeners();
      this.startTaskSwitchingDetection();
      this.trackInitialViewport();

      // Mark initial attention window start
      this.lastInteractionTime = Date.now();

      console.debug('[AttentionSpanModule] Initialized successfully', {
        sessionId: this.sessionId,
        config: this.config
      });
    } catch (error) {
      console.error('[AttentionSpanModule] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Setup IntersectionObserver for element visibility tracking (2025 best practice)
   */
  private setupIntersectionObserver(): void {
    if (typeof IntersectionObserver === 'undefined') {
      console.warn('[AttentionSpanModule] IntersectionObserver not supported');
      return;
    }

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        const timestamp = Date.now();

        entries.forEach((entry) => {
          const element = entry.target;
          const visibility = this.observedElements.get(element);

          if (!visibility) {
            // First time seeing this element
            const newVisibility: ElementVisibility = {
              element: this.getElementSelector(element),
              firstVisibleTime: timestamp,
              totalVisibleTime: 0,
              visibilityPercentage: entry.intersectionRatio,
              maxVisibilityDuration: 0,
              attentionScore: 0
            };

            this.observedElements.set(element, newVisibility);
          } else {
            // Update existing visibility data
            const isCurrentlyVisible = entry.isIntersecting;
            const wasVisible = visibility.visibilityPercentage > 0;

            if (isCurrentlyVisible && !wasVisible) {
              // Element became visible
              visibility.firstVisibleTime = timestamp;
            } else if (!isCurrentlyVisible && wasVisible) {
              // Element became invisible
              const visibleDuration = timestamp - visibility.firstVisibleTime;
              visibility.totalVisibleTime += visibleDuration;
              visibility.maxVisibilityDuration = Math.max(
                visibility.maxVisibilityDuration,
                visibleDuration
              );
            }

            visibility.visibilityPercentage = entry.intersectionRatio;

            // Calculate attention score based on visibility time and percentage
            visibility.attentionScore = this.calculateAttentionScore(
              visibility.totalVisibleTime,
              visibility.visibilityPercentage,
              visibility.maxVisibilityDuration
            );
          }

          // Track attention heatmap if enabled
          if (this.config.enableHeatmapping && entry.isIntersecting) {
            this.trackAttentionPoint(entry, timestamp);
          }
        });
      },
      {
        threshold: this.config.visibilityThresholds,
        rootMargin: '0px'
      }
    );

    // Observe key elements (will be expanded based on content type)
    this.observeKeyElements();
  }

  /**
   * Setup comprehensive event listeners for interaction tracking
   */
  private setupEventListeners(): void {
    // Page visibility for task switching detection
    this.addEventListenerTracked(document, 'visibilitychange', () => {
      this.handleVisibilityChange();
    });

    // Window focus/blur for task switching
    this.addEventListenerTracked(window, 'focus', () => {
      this.handleWindowFocus();
    });

    this.addEventListenerTracked(window, 'blur', () => {
      this.handleWindowBlur();
    });

    // Scroll tracking for reading patterns
    if (this.config.enableScrollAnalysis) {
      this.addEventListenerTracked(window, 'scroll',
        this.throttle(() => this.handleScroll(), 100)
      );
    }

    // Click tracking
    this.addEventListenerTracked(document, 'click', (event) => {
      this.handleClick(event as MouseEvent);
    });

    // Hover tracking for attention indicators
    this.addEventListenerTracked(document, 'mouseover', (event) => {
      this.handleMouseOver(event as MouseEvent);
    });

    this.addEventListenerTracked(document, 'mouseout', (event) => {
      this.handleMouseOut(event as MouseEvent);
    });

    // Form interaction tracking
    this.addEventListenerTracked(document, 'focusin', (event) => {
      this.handleFormFocus(event as FocusEvent);
    });

    this.addEventListenerTracked(document, 'focusout', (event) => {
      this.handleFormBlur(event as FocusEvent);
    });

    // Media interaction tracking
    this.addEventListenerTracked(document, 'play', (event) => {
      this.handleMediaEvent(event as Event, 'play');
    }, true);

    this.addEventListenerTracked(document, 'pause', (event) => {
      this.handleMediaEvent(event as Event, 'pause');
    }, true);

    // Keyboard interactions
    this.addEventListenerTracked(document, 'keydown', (event) => {
      this.handleKeyboardEvent(event as KeyboardEvent);
    });

    // Touch events for mobile tracking
    if ('ontouchstart' in window) {
      this.addEventListenerTracked(document, 'touchstart', (event) => {
        this.handleTouchEvent(event as TouchEvent, 'start');
      });

      this.addEventListenerTracked(document, 'touchend', (event) => {
        this.handleTouchEvent(event as TouchEvent, 'end');
      });
    }

    // Viewport changes
    this.addEventListenerTracked(window, 'resize',
      this.throttle(() => this.handleViewportChange(), 250)
    );

    this.addEventListenerTracked(window, 'orientationchange', () => {
      setTimeout(() => this.handleViewportChange(), 100); // Delay for orientation to complete
    });
  }

  /**
   * Start task switching detection based on Gen Z patterns (every 4 minutes average)
   */
  private startTaskSwitchingDetection(): void {
    if (!this.config.enableTaskSwitchingDetection) return;

    // Check for task switching every minute
    this.taskSwitchingTimer = window.setInterval(() => {
      const timeSinceLastInteraction = Date.now() - this.lastInteractionTime;

      // If no interaction for more than 4 minutes, consider it task switching
      if (timeSinceLastInteraction > this.config.taskSwitchingInterval) {
        this.recordTaskSwitchEvent('task_switching', timeSinceLastInteraction);
      }
    }, 60000); // Check every minute
  }

  /**
   * Track initial viewport for device type detection
   */
  private trackInitialViewport(): void {
    const viewport = this.getCurrentViewport();
    this.attentionMetrics.visibilityMetrics.viewportChanges.push(viewport);
  }

  /**
   * Handle visibility change (tab switching, window minimizing)
   */
  private handleVisibilityChange(): void {
    const now = Date.now();

    if (document.hidden) {
      this.isPageVisible = false;
      const timeAwayStart = now;
      this.recordTaskSwitchEvent('tab_switch', 0); // Duration will be calculated on return
    } else {
      this.isPageVisible = true;
      const returnTime = now;

      // Update the last task switch event with return data
      const lastEvent = this.attentionMetrics.taskSwitchingEvents[
        this.attentionMetrics.taskSwitchingEvents.length - 1
      ];

      if (lastEvent && lastEvent.type === 'tab_switch' && lastEvent.duration === 0) {
        lastEvent.duration = returnTime - lastEvent.timestamp;
        lastEvent.returnEngagement = this.calculateReturnEngagement();
      }

      this.lastInteractionTime = returnTime;
    }
  }

  /**
   * Handle window focus events
   */
  private handleWindowFocus(): void {
    if (!this.isPageVisible) {
      this.isPageVisible = true;
      this.lastInteractionTime = Date.now();
    }
  }

  /**
   * Handle window blur events
   */
  private handleWindowBlur(): void {
    this.isPageVisible = false;
    this.recordTaskSwitchEvent('window_focus_lost', 0);
  }

  /**
   * Handle scroll events for reading pattern analysis
   */
  private handleScroll(): void {
    const now = Date.now();
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const maxScrollY = document.documentElement.scrollHeight - window.innerHeight;
    const scrollDepth = Math.min(100, (scrollY / maxScrollY) * 100);

    // Calculate scroll speed
    const timeDiff = now - this.lastScrollTime;
    const scrollDiff = Math.abs(scrollY - this.lastScrollPosition);
    const scrollSpeed = timeDiff > 0 ? (scrollDiff / timeDiff) * 1000 : 0; // pixels per second

    // Determine scroll direction
    const direction = scrollY > this.lastScrollPosition ? 'down' : 'up';

    // Record scroll pattern
    const scrollPattern: ScrollPattern = {
      timestamp: now,
      direction,
      speed: scrollSpeed,
      duration: timeDiff,
      depth: scrollDepth
    };

    this.scrollData.push(scrollPattern);

    // Update metrics
    this.attentionMetrics.scrollMetrics.totalScrollDepth = scrollDepth;
    this.attentionMetrics.scrollMetrics.maxScrollDepth = Math.max(
      this.attentionMetrics.scrollMetrics.maxScrollDepth,
      scrollDepth
    );

    // Calculate average scroll speed
    const totalSpeed = this.scrollData.reduce((sum, pattern) => sum + pattern.speed, 0);
    this.attentionMetrics.scrollMetrics.scrollSpeed = totalSpeed / this.scrollData.length;

    // Estimate reading time vs skimming
    if (scrollSpeed < this.config.scrollSpeedThreshold) {
      this.attentionMetrics.scrollMetrics.readingTime += timeDiff;
    }

    this.attentionMetrics.scrollMetrics.scrollPatterns = this.scrollData.slice(-50); // Keep last 50 patterns

    // Update tracking variables
    this.lastScrollPosition = scrollY;
    this.lastScrollTime = now;
    this.lastInteractionTime = now;
  }

  /**
   * Handle click events with intent detection
   */
  private handleClick(event: MouseEvent): void {
    const now = Date.now();
    const target = event.target as Element;

    // Detect if click was intentional (basic heuristic)
    const isIntentional = this.detectClickIntent(event);

    const clickEvent: ClickEvent = {
      timestamp: now,
      element: this.getElementSelector(target),
      coordinates: { x: event.clientX, y: event.clientY },
      isIntentional
    };

    this.interactions.clicks.push(clickEvent);
    this.attentionMetrics.interactionMetrics.clicks.push(clickEvent);
    this.lastInteractionTime = now;

    // Check if this is within initial attention window
    if (this.attentionMetrics.initialAttentionWindow === 0 &&
        (now - this.startTime) <= this.config.initialAttentionThreshold) {
      this.attentionMetrics.initialAttentionWindow = now - this.startTime;
    }
  }

  /**
   * Handle mouse over events for hover tracking
   */
  private handleMouseOver(event: MouseEvent): void {
    const target = event.target as Element;
    const now = Date.now();

    // Store hover start time
    (target as any)._hoverStartTime = now;
    this.lastInteractionTime = now;
  }

  /**
   * Handle mouse out events to complete hover tracking
   */
  private handleMouseOut(event: MouseEvent): void {
    const target = event.target as Element;
    const now = Date.now();
    const hoverStartTime = (target as any)._hoverStartTime;

    if (hoverStartTime) {
      const duration = now - hoverStartTime;

      // Only track meaningful hovers (>100ms)
      if (duration > 100) {
        const hoverEvent: HoverEvent = {
          timestamp: hoverStartTime,
          element: this.getElementSelector(target),
          duration,
          coordinates: { x: event.clientX, y: event.clientY }
        };

        this.interactions.hovers.push(hoverEvent);
        this.attentionMetrics.interactionMetrics.hovers.push(hoverEvent);
      }

      delete (target as any)._hoverStartTime;
    }
  }

  /**
   * Handle form focus events
   */
  private handleFormFocus(event: FocusEvent): void {
    const target = event.target as HTMLElement;

    if (target.matches('input, textarea, select')) {
      const now = Date.now();
      (target as any)._formFocusTime = now;
      this.lastInteractionTime = now;
    }
  }

  /**
   * Handle form blur events
   */
  private handleFormBlur(event: FocusEvent): void {
    const target = event.target as HTMLElement;

    if (target.matches('input, textarea, select')) {
      const now = Date.now();
      const focusTime = (target as any)._formFocusTime;

      if (focusTime) {
        const timeToComplete = now - focusTime;
        const value = (target as HTMLInputElement).value;

        const formInteraction: FormInteraction = {
          timestamp: focusTime,
          fieldType: target.type || target.tagName.toLowerCase(),
          timeToComplete,
          abandonedField: !value || value.trim().length === 0
        };

        this.interactions.forms.push(formInteraction);
        this.attentionMetrics.interactionMetrics.formInteractions.push(formInteraction);

        delete (target as any)._formFocusTime;
      }
    }
  }

  /**
   * Handle media events (video, audio)
   */
  private handleMediaEvent(event: Event, action: 'play' | 'pause'): void {
    const target = event.target as HTMLMediaElement;
    const now = Date.now();

    const mediaInteraction: MediaInteraction = {
      timestamp: now,
      mediaType: target.tagName.toLowerCase() as 'video' | 'audio',
      action,
      engagementDuration: action === 'pause' ? target.currentTime : 0
    };

    this.interactions.media.push(mediaInteraction);
    this.attentionMetrics.interactionMetrics.mediaInteractions.push(mediaInteraction);
    this.lastInteractionTime = now;
  }

  /**
   * Handle keyboard events
   */
  private handleKeyboardEvent(event: KeyboardEvent): void {
    this.lastInteractionTime = Date.now();

    // Track keyboard interactions in metrics
    this.attentionMetrics.interactionMetrics.keyboardEvents.push({
      timestamp: Date.now(),
      key: event.key,
      code: event.code,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      shiftKey: event.shiftKey
    } as any);
  }

  /**
   * Handle touch events for mobile tracking
   */
  private handleTouchEvent(event: TouchEvent, phase: 'start' | 'end'): void {
    this.lastInteractionTime = Date.now();

    // Basic touch event tracking (enhanced in MobileTestingModule)
    this.attentionMetrics.interactionMetrics.touchEvents.push({
      timestamp: Date.now(),
      type: phase,
      touches: event.touches.length,
      changedTouches: event.changedTouches.length
    } as any);
  }

  /**
   * Handle viewport changes
   */
  private handleViewportChange(): void {
    const viewport = this.getCurrentViewport();
    this.attentionMetrics.visibilityMetrics.viewportChanges.push(viewport);
  }

  /**
   * Get current viewport information
   */
  private getCurrentViewport(): ViewportChange {
    return {
      timestamp: Date.now(),
      width: window.innerWidth,
      height: window.innerHeight,
      orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape',
      deviceType: this.detectDeviceType()
    };
  }

  /**
   * Detect device type based on viewport and capabilities
   */
  private detectDeviceType(): DeviceType {
    const width = window.innerWidth;
    const hasTouchCapability = 'ontouchstart' in window;

    if (width < 768) {
      return 'mobile';
    } else if (width < 1024 && hasTouchCapability) {
      return 'tablet';
    } else {
      return 'desktop';
    }
  }

  /**
   * Observe key elements for visibility tracking
   */
  private observeKeyElements(): void {
    if (!this.intersectionObserver) return;

    // Observe common content elements
    const selectors = [
      'h1, h2, h3', // Headlines
      'p', // Paragraphs
      'img', // Images
      'video', // Videos
      'button', // Buttons
      '.credibility-indicator', // TruthLens specific
      '.content-main', // Main content areas
      'article', // Article content
      'section' // Sections
    ];

    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(element => {
        this.intersectionObserver!.observe(element);
      });
    });
  }

  /**
   * Track attention point for heatmapping
   */
  private trackAttentionPoint(entry: IntersectionObserverEntry, timestamp: number): void {
    const rect = entry.boundingClientRect;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const attentionPoint: AttentionPoint = {
      x: centerX,
      y: centerY,
      intensity: entry.intersectionRatio,
      duration: 100, // Will be updated on subsequent observations
      confidence: 0.8 // Base confidence for intersection-based tracking
    };

    this.attentionPoints.push(attentionPoint);

    // Keep only recent attention points (last 1000)
    if (this.attentionPoints.length > 1000) {
      this.attentionPoints = this.attentionPoints.slice(-1000);
    }

    this.attentionMetrics.visibilityMetrics.attentionHeatmap = this.attentionPoints;
  }

  /**
   * Calculate attention score for an element
   */
  private calculateAttentionScore(
    totalVisibleTime: number,
    visibilityPercentage: number,
    maxVisibilityDuration: number
  ): number {
    // Weighted score based on visibility time, percentage, and sustained attention
    const timeScore = Math.min(1, totalVisibleTime / 5000); // 5 seconds = max time score
    const percentageScore = visibilityPercentage;
    const sustainedScore = Math.min(1, maxVisibilityDuration / 3000); // 3 seconds = max sustained score

    return (timeScore * 0.4 + percentageScore * 0.3 + sustainedScore * 0.3);
  }

  /**
   * Calculate return engagement level after task switching
   */
  private calculateReturnEngagement(): number {
    // Simple heuristic based on time to first interaction after return
    const timeToFirstInteraction = Date.now() - this.lastInteractionTime;

    if (timeToFirstInteraction < 2000) { // <2s = high engagement
      return 0.9;
    } else if (timeToFirstInteraction < 5000) { // <5s = medium engagement
      return 0.6;
    } else if (timeToFirstInteraction < 10000) { // <10s = low engagement
      return 0.3;
    } else { // >10s = very low engagement
      return 0.1;
    }
  }

  /**
   * Record a task switching event
   */
  private recordTaskSwitchEvent(type: TaskSwitchEvent['type'], duration: number): void {
    const taskSwitchEvent: TaskSwitchEvent = {
      timestamp: Date.now(),
      type,
      duration,
      returnEngagement: type === 'tab_switch' && duration > 0 ? this.calculateReturnEngagement() : undefined
    };

    this.attentionMetrics.taskSwitchingEvents.push(taskSwitchEvent);
  }

  /**
   * Detect if a click was intentional vs accidental
   */
  private detectClickIntent(event: MouseEvent): boolean {
    // Basic heuristics for intent detection
    const target = event.target as Element;

    // Clicks on interactive elements are likely intentional
    if (target.matches('a, button, input, select, textarea, [role="button"]')) {
      return true;
    }

    // Clicks with modifier keys are likely intentional
    if (event.ctrlKey || event.metaKey || event.shiftKey) {
      return true;
    }

    // Check if click followed a meaningful hover
    const hoverStartTime = (target as any)._hoverStartTime;
    if (hoverStartTime && (Date.now() - hoverStartTime) > 200) {
      return true;
    }

    // Otherwise, consider it potentially accidental
    return false;
  }

  /**
   * Get CSS selector for an element
   */
  private getElementSelector(element: Element): string {
    // Simple selector generation (can be enhanced)
    if (element.id) {
      return `#${element.id}`;
    }

    if (element.className) {
      const classes = element.className.split(' ').filter(c => c).slice(0, 2);
      if (classes.length > 0) {
        return `${element.tagName.toLowerCase()}.${classes.join('.')}`;
      }
    }

    return element.tagName.toLowerCase();
  }

  /**
   * Add event listener and track for cleanup
   */
  private addEventListenerTracked(
    element: Element | Document | Window,
    event: string,
    listener: EventListener,
    useCapture?: boolean
  ): void {
    element.addEventListener(event, listener, useCapture);
    this.eventListeners.push({ element, event, listener });
  }

  /**
   * Throttle function to limit event frequency
   */
  private throttle<T extends (...args: any[]) => any>(func: T, limit: number): T {
    let lastFunc: number;
    let lastRan: number;

    return ((...args: any[]) => {
      if (!lastRan) {
        func(...args);
        lastRan = Date.now();
      } else {
        clearTimeout(lastFunc);
        lastFunc = window.setTimeout(() => {
          if ((Date.now() - lastRan) >= limit) {
            func(...args);
            lastRan = Date.now();
          }
        }, limit - (Date.now() - lastRan));
      }
    }) as T;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `attention_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current attention metrics
   */
  public getMetrics(): AttentionMetrics {
    const now = Date.now();

    // Update total engagement time
    this.attentionMetrics.totalEngagementTime = now - this.startTime;
    this.attentionMetrics.endTime = now;

    // Calculate deep engagement threshold crossing
    if (this.attentionMetrics.totalEngagementTime > this.config.deepEngagementThreshold) {
      this.attentionMetrics.deepEngagementThreshold = this.config.deepEngagementThreshold;
    }

    // Update visibility metrics from observed elements
    this.attentionMetrics.visibilityMetrics.elementVisibilities = Array.from(
      this.observedElements.values()
    );

    return { ...this.attentionMetrics };
  }

  /**
   * Determine abandonment reason based on collected data
   */
  public getAbandonmentReason(): AbandonmentReason {
    const metrics = this.getMetrics();
    const engagementTime = metrics.totalEngagementTime;

    // Check for different abandonment patterns
    if (engagementTime < this.config.initialAttentionThreshold) {
      return 'attention_lost';
    }

    if (metrics.taskSwitchingEvents.length > 0) {
      const lastEvent = metrics.taskSwitchingEvents[metrics.taskSwitchingEvents.length - 1];
      if (lastEvent.duration > 60000) { // Away for more than 1 minute
        return 'task_switching';
      }
    }

    const avgScrollSpeed = metrics.scrollMetrics.scrollSpeed;
    if (avgScrollSpeed > this.config.scrollSpeedThreshold * 2) {
      return 'content_too_long';
    }

    const hasInteractions = metrics.interactionMetrics.clicks.length > 0 ||
                          metrics.interactionMetrics.formInteractions.length > 0;

    if (!hasInteractions && engagementTime > 30000) {
      return 'interface_confusing';
    }

    // Default to unknown if no clear pattern
    return 'unknown';
  }

  /**
   * Stop tracking and cleanup
   */
  public stop(): AttentionMetrics {
    this.isActive = false;

    // Clear task switching timer
    if (this.taskSwitchingTimer) {
      clearInterval(this.taskSwitchingTimer);
    }

    // Remove all event listeners
    this.eventListeners.forEach(({ element, event, listener }) => {
      element.removeEventListener(event, listener);
    });
    this.eventListeners = [];

    // Disconnect intersection observer
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }

    // Set abandonment reason
    this.attentionMetrics.abandonmentReason = this.getAbandonmentReason();

    // Return final metrics
    return this.getMetrics();
  }

  /**
   * Check if module is currently active
   */
  public isTracking(): boolean {
    return this.isActive;
  }

  /**
   * Get session ID
   */
  public getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<AttentionSpanConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}
