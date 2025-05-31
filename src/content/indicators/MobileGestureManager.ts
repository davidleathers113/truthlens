/**
 * MobileGestureManager - Touch and Gesture Handling
 * 2025 Mobile-First with Haptic Feedback and Modern Gesture Support
 */

import { BaseIndicator } from './BaseIndicator';

export interface GestureConfig {
  enableSwipeGestures: boolean;
  enablePinchGestures: boolean;
  enableHapticFeedback: boolean;
  swipeThreshold: number;
  velocityThreshold: number;
  maxGestureDuration: number;
  enableLongPress: boolean;
  longPressDuration: number;
}

export interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
  identifier: number;
}

export interface GestureEvent {
  type: 'swipe' | 'pinch' | 'tap' | 'long-press' | 'double-tap';
  direction?: 'up' | 'down' | 'left' | 'right';
  velocity?: number;
  distance?: number;
  scale?: number;
  target: HTMLElement;
  originalEvent: TouchEvent;
}

export class MobileGestureManager {
  private config: GestureConfig;
  private indicators: Map<string, BaseIndicator> = new Map();
  private activeTouches: Map<number, TouchPoint> = new Map();
  private _gestureStartTime: number = 0;
  private initialDistance: number = 0;
  private lastTapTime: number = 0;
  private lastTapTarget: HTMLElement | null = null;
  private longPressTimer: number | null = null;

  constructor(config: Partial<GestureConfig> = {}) {
    this.config = {
      enableSwipeGestures: true,
      enablePinchGestures: true,
      enableHapticFeedback: true,
      swipeThreshold: 30, // minimum distance in pixels
      velocityThreshold: 0.5, // pixels per millisecond
      maxGestureDuration: 1000, // maximum gesture duration in ms
      enableLongPress: true,
      longPressDuration: 500, // long press duration in ms
      ...config
    };

    this.initialize();
  }

  private initialize(): void {
    if (!this.isMobileDevice()) {
      console.log('MobileGestureManager: Non-mobile device detected, limited functionality enabled');
    }

    this.setupEventListeners();
    this.setupHapticSupport();
  }

  private setupEventListeners(): void {
    // Use passive listeners for better performance
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    document.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: true });

    // Handle device orientation changes
    window.addEventListener('orientationchange', this.handleOrientationChange.bind(this));

    // Handle visual viewport changes (mobile keyboard, etc.)
    if ('visualViewport' in window) {
      window.visualViewport!.addEventListener('resize', this.handleViewportResize.bind(this));
    }
  }

  private setupHapticSupport(): void {
    if (!this.config.enableHapticFeedback) return;

    // Feature detection for haptic feedback
    if ('vibrate' in navigator) {
      console.log('MobileGestureManager: Haptic feedback supported');
    } else {
      console.log('MobileGestureManager: Haptic feedback not supported');
      this.config.enableHapticFeedback = false;
    }
  }

  private handleTouchStart(event: TouchEvent): void {
    const target = event.target as HTMLElement;
    const indicator = this.findIndicatorElement(target);

    if (!indicator) return;

    // Prevent default for indicator elements to avoid scrolling
    event.preventDefault();

    const touch = event.touches[0];
    const touchPoint: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
      identifier: touch.identifier
    };

    this.activeTouches.set(touch.identifier, touchPoint);
    this._gestureStartTime = touchPoint.timestamp;
    void this._gestureStartTime; // Suppress unused warning

    // Handle multi-touch
    if (event.touches.length === 1) {
      this.handleSingleTouchStart(touchPoint, indicator);
    } else if (event.touches.length === 2 && this.config.enablePinchGestures) {
      this.handlePinchStart(event, indicator);
    }

    // Visual feedback
    indicator.classList.add('truthlens-touch-active');
    this.triggerHapticFeedback('light');
  }

  private handleTouchMove(event: TouchEvent): void {
    const target = event.target as HTMLElement;
    const indicator = this.findIndicatorElement(target);

    if (!indicator) return;

    event.preventDefault(); // Prevent scrolling when interacting with indicators

    // Update touch positions
    for (const touch of Array.from(event.touches)) {
      const existingTouch = this.activeTouches.get(touch.identifier);
      if (existingTouch) {
        this.activeTouches.set(touch.identifier, {
          ...existingTouch,
          x: touch.clientX,
          y: touch.clientY,
          timestamp: Date.now()
        });
      }
    }

    // Handle pinch gestures
    if (event.touches.length === 2 && this.config.enablePinchGestures) {
      this.handlePinchMove(event, indicator);
    }

    // Cancel long press if touch moves too much
    if (this.longPressTimer && this.getTouchMovementDistance() > 10) {
      this.cancelLongPress();
    }
  }

  private handleTouchEnd(event: TouchEvent): void {
    const target = event.target as HTMLElement;
    const indicator = this.findIndicatorElement(target);

    if (!indicator) return;

    const touch = event.changedTouches[0];
    const startTouch = this.activeTouches.get(touch.identifier);

    if (!startTouch) return;

    const endTime = Date.now();
    const duration = endTime - startTouch.timestamp;
    const deltaX = touch.clientX - startTouch.x;
    const deltaY = touch.clientY - startTouch.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = distance / duration; // pixels per ms

    // Clean up touch tracking
    this.activeTouches.delete(touch.identifier);
    indicator.classList.remove('truthlens-touch-active');

    // Determine gesture type
    if (duration > this.config.maxGestureDuration) {
      // Gesture too long, ignore
      return;
    }

    if (distance < 10 && duration < 200) {
      this.handleTap(indicator, touch, endTime);
    } else if (this.config.enableSwipeGestures &&
               distance > this.config.swipeThreshold &&
               velocity > this.config.velocityThreshold) {
      this.handleSwipe(indicator, deltaX, deltaY, velocity, event);
    }

    this.cancelLongPress();
  }

  private handleTouchCancel(event: TouchEvent): void {
    // Clean up all active touches
    for (const touch of Array.from(event.changedTouches)) {
      this.activeTouches.delete(touch.identifier);
    }

    // Remove visual feedback
    const target = event.target as HTMLElement;
    const indicator = this.findIndicatorElement(target);
    if (indicator) {
      indicator.classList.remove('truthlens-touch-active');
    }

    this.cancelLongPress();
  }

  private handleSingleTouchStart(touchPoint: TouchPoint, indicator: HTMLElement): void {
    // Set up long press detection
    if (this.config.enableLongPress) {
      this.longPressTimer = window.setTimeout(() => {
        this.handleLongPress(indicator, touchPoint);
      }, this.config.longPressDuration);
    }
  }

  private handleTap(indicator: HTMLElement, touch: Touch, timestamp: number): void {
    const isDoubleTap = this.isDoubleTap(indicator, timestamp);

    if (isDoubleTap) {
      this.handleDoubleTap(indicator, touch);
    } else {
      this.handleSingleTap(indicator, touch);
    }

    this.lastTapTime = timestamp;
    this.lastTapTarget = indicator;
  }

  private handleSingleTap(indicator: HTMLElement, touch: Touch): void {
    this.triggerHapticFeedback('light');

    // Dispatch custom tap event
    const gestureEvent: GestureEvent = {
      type: 'tap',
      target: indicator,
      originalEvent: touch as any // TouchEvent
    };

    this.dispatchGestureEvent(indicator, 'truthlens:gesture-tap', gestureEvent);

    // Default tap behavior - trigger indicator interaction
    indicator.click();
  }

  private handleDoubleTap(indicator: HTMLElement, touch: Touch): void {
    this.triggerHapticFeedback('medium');

    const gestureEvent: GestureEvent = {
      type: 'double-tap',
      target: indicator,
      originalEvent: touch as any
    };

    this.dispatchGestureEvent(indicator, 'truthlens:gesture-double-tap', gestureEvent);

    // Double tap could trigger level 3 disclosure directly
    indicator.dispatchEvent(new CustomEvent('truthlens:advanced-interaction', {
      detail: { action: 'double-tap', level: 3 }
    }));
  }

  private handleLongPress(indicator: HTMLElement, touchPoint: TouchPoint): void {
    this.triggerHapticFeedback('heavy');

    const gestureEvent: GestureEvent = {
      type: 'long-press',
      target: indicator,
      originalEvent: new TouchEvent('touchstart') // Placeholder
    };

    this.dispatchGestureEvent(indicator, 'truthlens:gesture-long-press', gestureEvent);

    // Long press could show context menu or quick actions
    indicator.dispatchEvent(new CustomEvent('truthlens:context-menu', {
      detail: { x: touchPoint.x, y: touchPoint.y }
    }));
  }

  private handleSwipe(
    indicator: HTMLElement,
    deltaX: number,
    deltaY: number,
    velocity: number,
    originalEvent: TouchEvent
  ): void {
    const direction = this.getSwipeDirection(deltaX, deltaY);
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    this.triggerHapticFeedback('medium');

    const gestureEvent: GestureEvent = {
      type: 'swipe',
      direction,
      velocity,
      distance,
      target: indicator,
      originalEvent
    };

    this.dispatchGestureEvent(indicator, 'truthlens:gesture-swipe', gestureEvent);

    // Handle swipe actions based on direction
    switch (direction) {
      case 'up':
        // Swipe up to expand/advance disclosure level
        indicator.dispatchEvent(new CustomEvent('truthlens:expand-disclosure'));
        break;
      case 'down':
        // Swipe down to minimize/collapse
        indicator.dispatchEvent(new CustomEvent('truthlens:collapse-disclosure'));
        break;
      case 'left':
        // Swipe left to dismiss/hide
        indicator.dispatchEvent(new CustomEvent('truthlens:dismiss-indicator'));
        break;
      case 'right':
        // Swipe right to pin/favorite
        indicator.dispatchEvent(new CustomEvent('truthlens:pin-indicator'));
        break;
    }
  }

  private handlePinchStart(event: TouchEvent, _indicator: HTMLElement): void {
    if (event.touches.length !== 2) return;

    const touch1 = event.touches[0];
    const touch2 = event.touches[1];

    this.initialDistance = this.getDistance(
      { x: touch1.clientX, y: touch1.clientY },
      { x: touch2.clientX, y: touch2.clientY }
    );
  }

  private handlePinchMove(event: TouchEvent, indicator: HTMLElement): void {
    if (event.touches.length !== 2) return;

    const touch1 = event.touches[0];
    const touch2 = event.touches[1];

    const currentDistance = this.getDistance(
      { x: touch1.clientX, y: touch1.clientY },
      { x: touch2.clientX, y: touch2.clientY }
    );

    const scale = currentDistance / this.initialDistance;

    // Visual feedback for pinch
    indicator.style.transform = `scale(${Math.max(0.8, Math.min(1.5, scale))})`;

    // Dispatch pinch event
    const gestureEvent: GestureEvent = {
      type: 'pinch',
      scale,
      target: indicator,
      originalEvent: event
    };

    this.dispatchGestureEvent(indicator, 'truthlens:gesture-pinch', gestureEvent);
  }

  private getSwipeDirection(deltaX: number, deltaY: number): 'up' | 'down' | 'left' | 'right' {
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return deltaX > 0 ? 'right' : 'left';
    } else {
      return deltaY > 0 ? 'down' : 'up';
    }
  }

  private getDistance(point1: { x: number; y: number }, point2: { x: number; y: number }): number {
    const deltaX = point2.x - point1.x;
    const deltaY = point2.y - point1.y;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  }

  private getTouchMovementDistance(): number {
    if (this.activeTouches.size === 0) return 0;

    const touches = Array.from(this.activeTouches.values());
    let maxDistance = 0;

    for (const _touch of touches) {
      // Calculate distance from initial position (simplified)
      maxDistance = Math.max(maxDistance, 10); // Placeholder calculation
    }

    return maxDistance;
  }

  private isDoubleTap(indicator: HTMLElement, timestamp: number): boolean {
    const timeDiff = timestamp - this.lastTapTime;
    const isSameTarget = this.lastTapTarget === indicator;
    const isWithinTimeWindow = timeDiff < 300; // 300ms window for double tap

    return isSameTarget && isWithinTimeWindow;
  }

  private cancelLongPress(): void {
    if (this.longPressTimer) {
      window.clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private findIndicatorElement(target: HTMLElement): HTMLElement | null {
    return target.closest('.truthlens-indicator') as HTMLElement;
  }

  private triggerHapticFeedback(intensity: 'light' | 'medium' | 'heavy'): void {
    if (!this.config.enableHapticFeedback || !('vibrate' in navigator)) return;

    const patterns = {
      light: [10],
      medium: [20],
      heavy: [50, 50, 50]
    };

    navigator.vibrate(patterns[intensity]);
  }

  private dispatchGestureEvent(
    target: HTMLElement,
    eventName: string,
    gestureEvent: GestureEvent
  ): void {
    const customEvent = new CustomEvent(eventName, {
      detail: gestureEvent,
      bubbles: true,
      cancelable: true
    });

    target.dispatchEvent(customEvent);
  }

  private handleOrientationChange(): void {
    // Recalculate positions and gestures after orientation change
    setTimeout(() => {
      // Give time for orientation change to complete
      this.resetGestureState();
    }, 100);
  }

  private handleViewportResize(): void {
    // Handle virtual keyboard appearance/disappearance
    this.resetGestureState();
  }

  private resetGestureState(): void {
    this.activeTouches.clear();
    this.cancelLongPress();

    // Remove active states from all indicators
    document.querySelectorAll('.truthlens-indicator.truthlens-touch-active')
      .forEach(el => el.classList.remove('truthlens-touch-active'));
  }

  private isMobileDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  // Public methods
  public registerIndicator(id: string, indicator: BaseIndicator): void {
    this.indicators.set(id, indicator);

    // Add touch-action CSS for better gesture handling
    const element = indicator.getElement();
    element.style.touchAction = 'manipulation';

    // Add gesture-specific classes
    element.classList.add('truthlens-gesture-enabled');
  }

  public unregisterIndicator(id: string): void {
    this.indicators.delete(id);
  }

  public setGestureConfig(newConfig: Partial<GestureConfig>): void {
    this.config = { ...this.config, ...newConfig };

    if (!this.config.enableHapticFeedback) {
      // Disable haptic feedback if config changed
    }
  }

  public enableHapticFeedback(enabled: boolean): void {
    this.config.enableHapticFeedback = enabled && 'vibrate' in navigator;
  }

  public calibrateForDevice(): void {
    // Adjust gesture thresholds based on device characteristics
    const screenWidth = window.screen.width;
    const _devicePixelRatio = window.devicePixelRatio || 1;
    void _devicePixelRatio; // Suppress unused warning - reserved for future use

    // Adjust thresholds for high-DPI displays
    this.config.swipeThreshold = Math.max(30, screenWidth * 0.05);

    // Adjust for device type (phone vs tablet)
    if (screenWidth > 768) {
      // Tablet adjustments
      this.config.swipeThreshold *= 1.5;
      this.config.longPressDuration = 400; // Faster for tablets
    }
  }

  public getGestureSupport(): {
    touch: boolean;
    haptic: boolean;
    orientation: boolean;
    visualViewport: boolean;
  } {
    return {
      touch: 'ontouchstart' in window,
      haptic: 'vibrate' in navigator,
      orientation: 'orientation' in window,
      visualViewport: 'visualViewport' in window
    };
  }

  public destroy(): void {
    // Remove event listeners
    document.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    document.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    document.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    document.removeEventListener('touchcancel', this.handleTouchCancel.bind(this));

    window.removeEventListener('orientationchange', this.handleOrientationChange.bind(this));

    if ('visualViewport' in window) {
      window.visualViewport!.removeEventListener('resize', this.handleViewportResize.bind(this));
    }

    // Clean up state
    this.resetGestureState();
    this.indicators.clear();
  }
}
