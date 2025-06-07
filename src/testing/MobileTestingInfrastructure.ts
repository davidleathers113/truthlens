/**
 * Mobile-First Testing Infrastructure for Gen Z Users
 * Implements 2025 best practices using Pointer Events and Touch Events APIs
 * Focuses on mobile interaction patterns, multi-device usage, and Gen Z behaviors
 */

import {
  MobileMetrics,
  DeviceInfo,
  TouchPattern,
  GestureEvent,
  OrientationChange,
  NetworkCondition,
  BatteryMetrics,
  DeviceType
} from './types';
import { GestureRecognition, GestureRecognitionResult } from './GestureRecognition';

export interface MobileTestingConfig {
  enablePointerEvents: boolean; // Use Pointer Events API (2025 recommended)
  enableTouchEvents: boolean; // Use Touch Events for complex gestures
  enableGestureRecognition: boolean;
  enableOrientationTracking: boolean;
  enableNetworkMonitoring: boolean;
  enableBatteryTracking: boolean;
  genZOptimizations: boolean;
  samplingRate: number; // 0-1, percentage of sessions to track
  maxTouchPoints: number; // Maximum concurrent touch points to track
  gestureTimeout: number; // Timeout for gesture recognition
}

export class MobileTestingInfrastructure {
  private config: MobileTestingConfig;
  private sessionId: string;
  private isActive: boolean = false;
  private deviceInfo: DeviceInfo;

  // Event tracking
  private eventListeners: Array<{
    element: Element | Document | Window;
    event: string;
    listener: EventListener;
    options?: AddEventListenerOptions;
  }> = [];

  // Mobile metrics
  private mobileMetrics: MobileMetrics;
  private gestureRecognition: GestureRecognition;

  // Touch tracking
  private activeTouches: Map<number, TouchPattern> = new Map();
  private activePointers: Map<number, PointerEvent> = new Map();

  // Device and network monitoring
  private orientationStartTime: number = 0;
  private networkConnection?: any; // NetworkInformation API
  private batteryManager?: any; // Battery API

  // Gen Z specific tracking
  private genZPatterns: {
    rapidScrolling: number;
    multiDeviceUsage: number;
    portraitPreference: number;
    gestureEfficiency: number;
    attentionSpanMobile: number;
  } = {
    rapidScrolling: 0,
    multiDeviceUsage: 0,
    portraitPreference: 0,
    gestureEfficiency: 0,
    attentionSpanMobile: 0
  };

  constructor(config: Partial<MobileTestingConfig> = {}) {
    this.config = {
      enablePointerEvents: true, // 2025 best practice
      enableTouchEvents: true, // For complex multi-touch
      enableGestureRecognition: true,
      enableOrientationTracking: true,
      enableNetworkMonitoring: true,
      enableBatteryTracking: true,
      genZOptimizations: true,
      samplingRate: 1.0,
      maxTouchPoints: 10,
      gestureTimeout: 1000,
      ...config
    };

    this.sessionId = this.generateSessionId();
    this.deviceInfo = this.detectDeviceInfo();
    this.gestureRecognition = new GestureRecognition({
      genZOptimization: this.config.genZOptimizations
    }, this.deviceInfo.deviceType);

    // Initialize mobile metrics
    this.mobileMetrics = {
      deviceInfo: this.deviceInfo,
      touchPatterns: [],
      gestureRecognition: [],
      orientationChanges: [],
      networkConditions: [],
      batteryImpact: {
        initialLevel: 1.0,
        finalLevel: 1.0,
        drainRate: 0,
        impactScore: 0
      }
    };
  }

  /**
   * Initialize mobile testing infrastructure
   */
  public async initialize(): Promise<void> {
    if (this.isActive || Math.random() > this.config.samplingRate) {
      return;
    }

    try {
      this.isActive = true;

      // Setup event listeners based on device capabilities
      await this.setupEventListeners();

      // Initialize device monitoring
      await this.initializeDeviceMonitoring();

      // Setup touch action CSS for proper gesture handling
      this.setupTouchActionCSS();

      console.debug('[MobileTestingInfrastructure] Initialized successfully', {
        sessionId: this.sessionId,
        deviceInfo: this.deviceInfo,
        config: this.config
      });
    } catch (error) {
      console.error('[MobileTestingInfrastructure] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Setup event listeners for mobile interaction tracking
   */
  private async setupEventListeners(): Promise<void> {
    // Pointer Events (2025 unified approach)
    if (this.config.enablePointerEvents && 'PointerEvent' in window) {
      this.addEventListenerTracked(document, 'pointerdown', (event) => {
        this.handlePointerEvent(event as PointerEvent);
      });

      this.addEventListenerTracked(document, 'pointermove', (event) => {
        this.handlePointerEvent(event as PointerEvent);
      });

      this.addEventListenerTracked(document, 'pointerup', (event) => {
        this.handlePointerEvent(event as PointerEvent);
      });

      this.addEventListenerTracked(document, 'pointercancel', (event) => {
        this.handlePointerEvent(event as PointerEvent);
      });
    }

    // Touch Events (for complex multi-touch gestures)
    if (this.config.enableTouchEvents && 'ontouchstart' in window) {
      this.addEventListenerTracked(document, 'touchstart', (event) => {
        this.handleTouchEvent(event as TouchEvent);
      }, { passive: false });

      this.addEventListenerTracked(document, 'touchmove', (event) => {
        this.handleTouchEvent(event as TouchEvent);
      }, { passive: false });

      this.addEventListenerTracked(document, 'touchend', (event) => {
        this.handleTouchEvent(event as TouchEvent);
      }, { passive: false });

      this.addEventListenerTracked(document, 'touchcancel', (event) => {
        this.handleTouchEvent(event as TouchEvent);
      });
    }

    // Orientation change tracking
    if (this.config.enableOrientationTracking) {
      this.addEventListenerTracked(window, 'orientationchange', () => {
        this.handleOrientationChange();
      });

      // Also track resize events for orientation detection
      this.addEventListenerTracked(window, 'resize', () => {
        setTimeout(() => this.handleOrientationChange(), 100);
      });
    }

    // Device motion and orientation (for advanced gesture detection)
    if ('DeviceOrientationEvent' in window) {
      this.addEventListenerTracked(window, 'deviceorientation', (event) => {
        this.handleDeviceOrientation(event as DeviceOrientationEvent);
      });
    }

    if ('DeviceMotionEvent' in window) {
      this.addEventListenerTracked(window, 'devicemotion', (event) => {
        this.handleDeviceMotion(event as DeviceMotionEvent);
      });
    }
  }

  /**
   * Initialize device and network monitoring
   */
  private async initializeDeviceMonitoring(): Promise<void> {
    // Network monitoring
    if (this.config.enableNetworkMonitoring && 'connection' in navigator) {
      this.networkConnection = (navigator as any).connection;
      this.trackNetworkCondition();

      this.addEventListenerTracked(this.networkConnection, 'change', () => {
        this.trackNetworkCondition();
      });
    }

    // Battery monitoring
    if (this.config.enableBatteryTracking && 'getBattery' in navigator) {
      try {
        this.batteryManager = await (navigator as any).getBattery();
        this.initializeBatteryTracking();
      } catch (error) {
        console.debug('[MobileTestingInfrastructure] Battery API not available:', error);
      }
    }
  }

  /**
   * Setup touch-action CSS for proper gesture handling
   */
  private setupTouchActionCSS(): void {
    // Add global touch-action rules for better gesture handling
    const style = document.createElement('style');
    style.textContent = `
      /* Gen Z Testing Framework - Touch Action Optimization */
      .genZ-testing-area {
        touch-action: manipulation; /* Allows pan and zoom, disables double-tap */
      }

      .genZ-testing-no-pan {
        touch-action: none; /* Disables all default touch behaviors */
      }

      .genZ-testing-pan-x {
        touch-action: pan-x; /* Only horizontal panning */
      }

      .genZ-testing-pan-y {
        touch-action: pan-y; /* Only vertical panning */
      }
    `;

    document.head.appendChild(style);

    // Apply to body for global gesture handling
    document.body.classList.add('genZ-testing-area');
  }

  /**
   * Handle pointer events (unified approach)
   */
  private handlePointerEvent(event: PointerEvent): void {
    const now = Date.now();

    switch (event.type) {
      case 'pointerdown':
        this.activePointers.set(event.pointerId, event);
        this.trackPointerPattern(event, 'start', now);
        break;

      case 'pointermove':
        if (this.activePointers.has(event.pointerId)) {
          this.trackPointerPattern(event, 'move', now);
          this.detectGenZScrollPattern(event);
        }
        break;

      case 'pointerup':
        this.trackPointerPattern(event, 'end', now);
        this.finalizePointerGesture(event);
        this.activePointers.delete(event.pointerId);
        break;

      case 'pointercancel':
        this.activePointers.delete(event.pointerId);
        break;
    }

    // Gesture recognition
    if (this.config.enableGestureRecognition) {
      const results = this.gestureRecognition.recognizeFromPointerEvents([event]);
      results.forEach(result => this.recordGestureResult(result));
    }
  }

  /**
   * Handle touch events for complex multi-touch
   */
  private handleTouchEvent(event: TouchEvent): void {
    const now = Date.now();

    // Track multi-touch patterns (Gen Z specific)
    if (event.touches.length >= 2) {
      this.trackMultiTouchPattern(event, now);
    }

    // Process individual touches
    Array.from(event.changedTouches).forEach(touch => {
      this.trackTouchPattern(touch, event.type, now);
    });

    // Gesture recognition for complex touches
    if (this.config.enableGestureRecognition) {
      const result = this.gestureRecognition.recognizeFromTouchEvents(event);
      if (result) {
        this.recordGestureResult(result);
      }
    }

    // Track Gen Z specific patterns
    this.analyzeGenZTouchBehavior(event);
  }

  /**
   * Track pointer interaction patterns
   */
  private trackPointerPattern(event: PointerEvent, phase: 'start' | 'move' | 'end', timestamp: number): void {
    const pattern: TouchPattern = {
      timestamp,
      type: this.getPointerType(event),
      startPoint: { x: event.clientX, y: event.clientY },
      endPoint: phase === 'end' ? { x: event.clientX, y: event.clientY } : undefined,
      duration: phase === 'end' ? timestamp - (this.activePointers.get(event.pointerId)?.timeStamp || timestamp) : 0,
      pressure: event.pressure,
      velocity: this.calculateVelocity(event),
      isGenZTypical: false // Will be determined by analysis
    };

    this.mobileMetrics.touchPatterns.push(pattern);

    // Keep only recent patterns (last 100)
    if (this.mobileMetrics.touchPatterns.length > 100) {
      this.mobileMetrics.touchPatterns = this.mobileMetrics.touchPatterns.slice(-100);
    }
  }

  /**
   * Track touch interaction patterns
   */
  private trackTouchPattern(touch: Touch, eventType: string, timestamp: number): void {
    const touchId = touch.identifier;

    if (eventType === 'touchstart') {
      const pattern: TouchPattern = {
        timestamp,
        type: 'tap', // Will be refined based on movement
        startPoint: { x: touch.clientX, y: touch.clientY },
        duration: 0,
        pressure: (touch as any).force || 1.0, // Force if available
        velocity: 0,
        isGenZTypical: false
      };

      this.activeTouches.set(touchId, pattern);
    } else if (eventType === 'touchend') {
      const pattern = this.activeTouches.get(touchId);
      if (pattern) {
        pattern.endPoint = { x: touch.clientX, y: touch.clientY };
        pattern.duration = timestamp - pattern.timestamp;
        pattern.type = this.determineTouchType(pattern);
        pattern.isGenZTypical = this.isGenZTypicalTouch(pattern);

        this.mobileMetrics.touchPatterns.push(pattern);
        this.activeTouches.delete(touchId);
      }
    }
  }

  /**
   * Track multi-touch patterns for Gen Z analysis
   */
  private trackMultiTouchPattern(event: TouchEvent, timestamp: number): void {
    const touchCount = event.touches.length;

    // Gen Z users are more likely to use multi-touch efficiently
    if (touchCount >= 2) {
      this.genZPatterns.multiDeviceUsage += 0.1;

      // Track gesture efficiency for multi-touch
      if (touchCount === 2) {
        // Likely pinch/zoom
        this.genZPatterns.gestureEfficiency += 0.2;
      } else if (touchCount === 3) {
        // Three-finger gestures (very Gen Z)
        this.genZPatterns.gestureEfficiency += 0.3;
      }
    }
  }

  /**
   * Detect Gen Z specific scrolling patterns
   */
  private detectGenZScrollPattern(event: PointerEvent): void {
    const startEvent = this.activePointers.get(event.pointerId);
    if (!startEvent) return;

    const deltaY = event.clientY - startEvent.clientY;
    const deltaTime = event.timeStamp - startEvent.timeStamp;

    if (Math.abs(deltaY) > 50 && deltaTime > 0) {
      const scrollSpeed = Math.abs(deltaY) / deltaTime;

      // Gen Z users tend to scroll rapidly
      if (scrollSpeed > 2) { // 2 pixels per millisecond
        this.genZPatterns.rapidScrolling += 0.1;
      }
    }
  }

  /**
   * Analyze Gen Z specific touch behaviors
   */
  private analyzeGenZTouchBehavior(event: TouchEvent): void {
    // Quick successive touches (Gen Z rapid interaction style)
    if (event.touches.length === 1 && event.type === 'touchstart') {
      const touchCount = this.mobileMetrics.touchPatterns.filter(
        p => Date.now() - p.timestamp < 1000
      ).length;

      if (touchCount > 3) { // More than 3 touches in 1 second
        this.genZPatterns.attentionSpanMobile += 0.1;
      }
    }
  }

  /**
   * Handle orientation changes
   */
  private handleOrientationChange(): void {
    const now = Date.now();
    const newOrientation = this.getCurrentOrientation();

    // Track orientation change
    const orientationChange: OrientationChange = {
      timestamp: now,
      from: this.mobileMetrics.orientationChanges.length > 0
        ? this.mobileMetrics.orientationChanges[this.mobileMetrics.orientationChanges.length - 1].to
        : newOrientation,
      to: newOrientation,
      adaptationTime: 0 // Will be calculated when user interacts again
    };

    this.mobileMetrics.orientationChanges.push(orientationChange);
    this.orientationStartTime = now;

    // Track Gen Z portrait preference
    if (newOrientation === 'portrait') {
      this.genZPatterns.portraitPreference += 0.2;
    }
  }

  /**
   * Handle device orientation events
   */
  private handleDeviceOrientation(event: DeviceOrientationEvent): void {
    // Track device orientation for advanced gesture detection
    // This can help identify device-based gestures like tilting
  }

  /**
   * Handle device motion events
   */
  private handleDeviceMotion(event: DeviceMotionEvent): void {
    // Track device motion for gesture recognition
    // Useful for detecting shake gestures, device handling patterns
  }

  /**
   * Track network conditions
   */
  private trackNetworkCondition(): void {
    if (!this.networkConnection) return;

    const condition: NetworkCondition = {
      timestamp: Date.now(),
      type: this.getNetworkType(this.networkConnection.effectiveType),
      speed: this.networkConnection.downlink || 0,
      latency: this.networkConnection.rtt || 0
    };

    this.mobileMetrics.networkConditions.push(condition);

    // Keep only recent conditions (last 50)
    if (this.mobileMetrics.networkConditions.length > 50) {
      this.mobileMetrics.networkConditions = this.mobileMetrics.networkConditions.slice(-50);
    }
  }

  /**
   * Initialize battery tracking
   */
  private initializeBatteryTracking(): void {
    if (!this.batteryManager) return;

    this.mobileMetrics.batteryImpact.initialLevel = this.batteryManager.level;

    // Track battery level changes
    this.addEventListenerTracked(this.batteryManager, 'levelchange', () => {
      this.updateBatteryImpact();
    });
  }

  /**
   * Update battery impact metrics
   */
  private updateBatteryImpact(): void {
    if (!this.batteryManager) return;

    const currentLevel = this.batteryManager.level;
    const timeDiff = (Date.now() - this.mobileMetrics.deviceInfo.screenSize.width) / (1000 * 60); // Minutes

    this.mobileMetrics.batteryImpact.finalLevel = currentLevel;
    this.mobileMetrics.batteryImpact.drainRate =
      (this.mobileMetrics.batteryImpact.initialLevel - currentLevel) / timeDiff;

    // Calculate impact score (0-1, where 1 is high impact)
    this.mobileMetrics.batteryImpact.impactScore = Math.min(1, this.mobileMetrics.batteryImpact.drainRate * 10);
  }

  /**
   * Finalize pointer gesture recognition
   */
  private finalizePointerGesture(event: PointerEvent): void {
    // Calculate adaptation time for orientation changes
    if (this.orientationStartTime > 0) {
      const adaptationTime = event.timeStamp - this.orientationStartTime;
      const lastOrientationChange = this.mobileMetrics.orientationChanges[
        this.mobileMetrics.orientationChanges.length - 1
      ];

      if (lastOrientationChange) {
        lastOrientationChange.adaptationTime = adaptationTime;
      }

      this.orientationStartTime = 0;
    }
  }

  /**
   * Record gesture recognition results
   */
  private recordGestureResult(result: GestureRecognitionResult): void {
    this.mobileMetrics.gestureRecognition.push(result.gesture);

    // Update Gen Z pattern tracking
    if (result.isGenZTypical) {
      this.genZPatterns.gestureEfficiency += result.efficiency * 0.1;
    }
  }

  /**
   * Detect device information
   */
  private detectDeviceInfo(): DeviceInfo {
    const userAgent = navigator.userAgent;
    const screenSize = {
      width: window.screen.width,
      height: window.screen.height
    };

    return {
      userAgent,
      screenSize,
      pixelRatio: window.devicePixelRatio || 1,
      touchCapabilities: 'ontouchstart' in window,
      orientationSupport: 'orientation' in window,
      deviceType: this.detectDeviceType(screenSize.width)
    };
  }

  /**
   * Detect device type based on screen size and capabilities
   */
  private detectDeviceType(width: number): DeviceType {
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
   * Get current device orientation
   */
  private getCurrentOrientation(): 'portrait' | 'landscape' {
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
  }

  /**
   * Get pointer type from event
   */
  private getPointerType(event: PointerEvent): TouchPattern['type'] {
    switch (event.pointerType) {
      case 'touch': return 'tap';
      case 'pen': return 'drag';
      case 'mouse': return 'tap';
      default: return 'tap';
    }
  }

  /**
   * Calculate velocity from pointer event
   */
  private calculateVelocity(event: PointerEvent): number {
    const startEvent = this.activePointers.get(event.pointerId);
    if (!startEvent) return 0;

    const deltaX = event.clientX - startEvent.clientX;
    const deltaY = event.clientY - startEvent.clientY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const time = event.timeStamp - startEvent.timeStamp;

    return time > 0 ? distance / time : 0;
  }

  /**
   * Determine touch type based on pattern
   */
  private determineTouchType(pattern: TouchPattern): TouchPattern['type'] {
    if (!pattern.endPoint) return 'tap';

    const deltaX = pattern.endPoint.x - pattern.startPoint.x;
    const deltaY = pattern.endPoint.y - pattern.startPoint.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance < 10) {
      return 'tap';
    } else if (distance > 50) {
      return 'swipe';
    } else {
      return 'drag';
    }
  }

  /**
   * Check if touch pattern is typical for Gen Z
   */
  private isGenZTypicalTouch(pattern: TouchPattern): boolean {
    // Gen Z characteristics:
    // - Quick interactions (duration < 500ms for taps)
    // - Efficient swipes (high velocity)
    // - Use of pressure variations

    if (pattern.type === 'tap' && pattern.duration < 500) {
      return true;
    }

    if (pattern.type === 'swipe' && pattern.velocity > 1) {
      return true;
    }

    if (pattern.pressure && pattern.pressure > 0.5) {
      return true; // Pressure-sensitive interactions
    }

    return false;
  }

  /**
   * Get network type from connection effective type
   */
  private getNetworkType(effectiveType: string): NetworkCondition['type'] {
    switch (effectiveType) {
      case '4g': return '4g';
      case '3g': return 'slow';
      case '2g': return 'slow';
      case 'slow-2g': return 'slow';
      default: return 'wifi'; // Assume wifi for unknown/fast connections
    }
  }

  /**
   * Add event listener and track for cleanup
   */
  private addEventListenerTracked(
    element: Element | Document | Window | any,
    event: string,
    listener: EventListener,
    options?: AddEventListenerOptions
  ): void {
    element.addEventListener(event, listener, options);
    this.eventListeners.push({ element, event, listener, options });
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `mobile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current mobile metrics
   */
  public getMetrics(): MobileMetrics {
    // Update final battery level
    this.updateBatteryImpact();

    return { ...this.mobileMetrics };
  }

  /**
   * Get Gen Z pattern analysis
   */
  public getGenZPatternAnalysis(): typeof this.genZPatterns {
    return { ...this.genZPatterns };
  }

  /**
   * Check if this session shows Gen Z characteristics
   */
  public isGenZSession(): boolean {
    const analysis = this.getGenZPatternAnalysis();

    // Consider it a Gen Z session if multiple indicators are present
    const indicators = [
      analysis.rapidScrolling > 0.5,
      analysis.gestureEfficiency > 0.3,
      analysis.portraitPreference > 0.3,
      analysis.attentionSpanMobile > 0.2,
      this.deviceInfo.deviceType === 'mobile'
    ];

    return indicators.filter(Boolean).length >= 3;
  }

  /**
   * Stop mobile testing and cleanup
   */
  public stop(): MobileMetrics {
    this.isActive = false;

    // Remove all event listeners
    this.eventListeners.forEach(({ element, event, listener, options }) => {
      element.removeEventListener(event, listener, options);
    });
    this.eventListeners = [];

    // Clean up active tracking
    this.activeTouches.clear();
    this.activePointers.clear();

    // Reset gesture recognition
    this.gestureRecognition.reset();

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
  public updateConfig(newConfig: Partial<MobileTestingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  public getConfig(): MobileTestingConfig {
    return { ...this.config };
  }
}
