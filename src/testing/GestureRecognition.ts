/**
 * Gen Z Gesture Recognition Module
 * Advanced gesture detection and efficiency tracking using 2025 best practices
 * Focuses on Gen Z typical interaction patterns and gesture efficiency measurement
 */

import {
  GestureEvent,
  DeviceType
} from './types';

export interface GestureConfig {
  minSwipeDistance: number; // Minimum distance for swipe recognition
  maxSwipeTime: number; // Maximum time for swipe gesture
  pinchThreshold: number; // Minimum distance change for pinch
  rotationThreshold: number; // Minimum rotation angle in degrees
  tapTimeout: number; // Maximum time for tap gesture
  doubleTapTimeout: number; // Time window for double tap
  pressAndHoldTimeout: number; // Time for press and hold recognition
  genZOptimization: boolean; // Enable Gen Z specific optimizations
}

export interface GestureRecognitionResult {
  gesture: GestureEvent;
  confidence: number;
  efficiency: number;
  isGenZTypical: boolean;
  processingTime: number;
}

export class GestureRecognition {
  private config: GestureConfig;
  private activePointers: Map<number, PointerEvent> = new Map();
  private touchStartTime: number = 0;
  private lastTapTime: number = 0;
  private lastTapPosition: { x: number; y: number } = { x: 0, y: 0 };
  private deviceType: DeviceType;

  // Gen Z gesture pattern recognition
  private genZPatterns: Map<string, number> = new Map([
    ['rapid_swipe', 0], // Fast swiping patterns
    ['pinch_zoom_efficiency', 0], // Efficient pinch zoom
    ['three_finger_navigation', 0], // Three finger gestures
    ['edge_swipes', 0], // Edge-based navigation
    ['continuous_scroll', 0], // Sustained scrolling patterns
  ]);

  constructor(config: Partial<GestureConfig> = {}, deviceType: DeviceType = 'mobile') {
    this.config = {
      minSwipeDistance: 50, // 50px minimum for swipe
      maxSwipeTime: 1000, // 1 second max for swipe
      pinchThreshold: 10, // 10px minimum pinch distance
      rotationThreshold: 15, // 15 degrees minimum rotation
      tapTimeout: 200, // 200ms max for tap
      doubleTapTimeout: 300, // 300ms window for double tap
      pressAndHoldTimeout: 500, // 500ms for press and hold
      genZOptimization: true,
      ...config
    };

    this.deviceType = deviceType;
  }

  /**
   * Recognize gesture from pointer events (2025 unified API approach)
   */
  public recognizeFromPointerEvents(events: PointerEvent[]): GestureRecognitionResult[] {
    const startTime = performance.now();
    const results: GestureRecognitionResult[] = [];

    for (const event of events) {
      const result = this.processPointerEvent(event);
      if (result) {
        result.processingTime = performance.now() - startTime;
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Recognize gesture from touch events (for complex multi-touch)
   */
  public recognizeFromTouchEvents(event: TouchEvent): GestureRecognitionResult | null {
    const startTime = performance.now();

    switch (event.type) {
      case 'touchstart':
        return this.handleTouchStart(event, startTime);
      case 'touchmove':
        return this.handleTouchMove(event, startTime);
      case 'touchend':
        return this.handleTouchEnd(event, startTime);
      default:
        return null;
    }
  }

  /**
   * Process individual pointer event
   */
  private processPointerEvent(event: PointerEvent): GestureRecognitionResult | null {
    const startTime = performance.now();

    switch (event.type) {
      case 'pointerdown':
        this.activePointers.set(event.pointerId, event);
        this.touchStartTime = event.timeStamp;
        break;

      case 'pointermove':
        if (this.activePointers.has(event.pointerId)) {
          return this.detectPointerGesture(event, startTime);
        }
        break;

      case 'pointerup':
        const result = this.finalizePointerGesture(event, startTime);
        this.activePointers.delete(event.pointerId);
        return result;

      case 'pointercancel':
        this.activePointers.delete(event.pointerId);
        break;
    }

    return null;
  }

  /**
   * Detect gesture during pointer movement
   */
  private detectPointerGesture(event: PointerEvent, startTime: number): GestureRecognitionResult | null {
    const startEvent = this.activePointers.get(event.pointerId);
    if (!startEvent) return null;

    const deltaX = event.clientX - startEvent.clientX;
    const deltaY = event.clientY - startEvent.clientY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const duration = event.timeStamp - startEvent.timeStamp;

    // Check for swipe gesture
    if (distance >= this.config.minSwipeDistance && duration <= this.config.maxSwipeTime) {
      const direction = this.getSwipeDirection(deltaX, deltaY);
      const velocity = distance / duration;

      const gesture: GestureEvent = {
        timestamp: event.timeStamp,
        gesture: `swipe_${direction}` as any,
        efficiency: this.calculateSwipeEfficiency(velocity, distance, duration),
        confidence: this.calculateGestureConfidence('swipe', distance, duration)
      };

      return {
        gesture,
        confidence: gesture.confidence,
        efficiency: gesture.efficiency,
        isGenZTypical: this.isGenZTypicalGesture(gesture),
        processingTime: performance.now() - startTime
      };
    }

    return null;
  }

  /**
   * Finalize gesture recognition on pointer up
   */
  private finalizePointerGesture(event: PointerEvent, startTime: number): GestureRecognitionResult | null {
    const startEvent = this.activePointers.get(event.pointerId);
    if (!startEvent) return null;

    const deltaX = event.clientX - startEvent.clientX;
    const deltaY = event.clientY - startEvent.clientY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const duration = event.timeStamp - startEvent.timeStamp;

    // Check for tap gesture
    if (distance < 10 && duration <= this.config.tapTimeout) {
      return this.recognizeTapGesture(event, startTime);
    }

    // Check for press and hold
    if (distance < 10 && duration >= this.config.pressAndHoldTimeout) {
      const gesture: GestureEvent = {
        timestamp: event.timeStamp,
        gesture: 'three_finger_tap', // Placeholder - would detect actual gesture
        efficiency: 0.8, // Press and hold is generally efficient
        confidence: 0.9
      };

      return {
        gesture,
        confidence: gesture.confidence,
        efficiency: gesture.efficiency,
        isGenZTypical: this.isGenZTypicalGesture(gesture),
        processingTime: performance.now() - startTime
      };
    }

    return null;
  }

  /**
   * Recognize tap and double tap gestures
   */
  private recognizeTapGesture(event: PointerEvent, startTime: number): GestureRecognitionResult | null {
    const now = event.timeStamp;
    const currentPosition = { x: event.clientX, y: event.clientY };

    // Check for double tap
    if (now - this.lastTapTime <= this.config.doubleTapTimeout) {
      const tapDistance = Math.sqrt(
        Math.pow(currentPosition.x - this.lastTapPosition.x, 2) +
        Math.pow(currentPosition.y - this.lastTapPosition.y, 2)
      );

      if (tapDistance < 50) { // Within 50px of previous tap
        const gesture: GestureEvent = {
          timestamp: now,
          gesture: 'three_finger_tap', // Would be double_tap in real implementation
          efficiency: 0.95, // Double tap is very efficient
          confidence: 0.95
        };

        this.updateGenZPattern('rapid_interaction', 1);

        return {
          gesture,
          confidence: gesture.confidence,
          efficiency: gesture.efficiency,
          isGenZTypical: true, // Double taps are typical for Gen Z
          processingTime: performance.now() - startTime
        };
      }
    }

    // Single tap
    this.lastTapTime = now;
    this.lastTapPosition = currentPosition;

    const gesture: GestureEvent = {
      timestamp: now,
      gesture: 'three_finger_tap', // Would be single_tap in real implementation
      efficiency: 0.9,
      confidence: 0.9
    };

    return {
      gesture,
      confidence: gesture.confidence,
      efficiency: gesture.efficiency,
      isGenZTypical: this.isGenZTypicalGesture(gesture),
      processingTime: performance.now() - startTime
    };
  }

  /**
   * Handle touch start for multi-touch gestures
   */
  private handleTouchStart(event: TouchEvent, startTime: number): GestureRecognitionResult | null {
    if (event.touches.length >= 2) {
      // Multi-touch gesture started
      this.touchStartTime = event.timeStamp;
      return null; // Wait for movement to determine gesture
    }

    return null;
  }

  /**
   * Handle touch move for gesture recognition
   */
  private handleTouchMove(event: TouchEvent, startTime: number): GestureRecognitionResult | null {
    if (event.touches.length === 2) {
      return this.detectPinchZoom(event, startTime);
    } else if (event.touches.length === 3) {
      return this.detectThreeFingerGesture(event, startTime);
    }

    return null;
  }

  /**
   * Handle touch end for final gesture recognition
   */
  private handleTouchEnd(event: TouchEvent, startTime: number): GestureRecognitionResult | null {
    const duration = event.timeStamp - this.touchStartTime;

    // Check for quick multi-touch patterns (Gen Z typical)
    if (event.changedTouches.length >= 2 && duration < 500) {
      const gesture: GestureEvent = {
        timestamp: event.timeStamp,
        gesture: 'three_finger_tap',
        efficiency: 0.85,
        confidence: 0.8
      };

      this.updateGenZPattern('multi_touch_efficiency', 1);

      return {
        gesture,
        confidence: gesture.confidence,
        efficiency: gesture.efficiency,
        isGenZTypical: true,
        processingTime: performance.now() - startTime
      };
    }

    return null;
  }

  /**
   * Detect pinch zoom gesture
   */
  private detectPinchZoom(event: TouchEvent, startTime: number): GestureRecognitionResult | null {
    if (event.touches.length !== 2) return null;

    const touch1 = event.touches[0];
    const touch2 = event.touches[1];

    const distance = Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );

    // Store initial distance for comparison (would need previous distance in real implementation)
    const gesture: GestureEvent = {
      timestamp: event.timeStamp,
      gesture: 'pinch_zoom_in', // Would determine in/out based on distance change
      efficiency: this.calculatePinchEfficiency(distance, event.timeStamp - this.touchStartTime),
      confidence: 0.9
    };

    this.updateGenZPattern('pinch_zoom_efficiency', gesture.efficiency);

    return {
      gesture,
      confidence: gesture.confidence,
      efficiency: gesture.efficiency,
      isGenZTypical: this.isGenZTypicalGesture(gesture),
      processingTime: performance.now() - startTime
    };
  }

  /**
   * Detect three finger gestures (common in Gen Z navigation)
   */
  private detectThreeFingerGesture(event: TouchEvent, startTime: number): GestureRecognitionResult | null {
    if (event.touches.length !== 3) return null;

    // Calculate center point and movement
    const centerX = Array.from(event.touches).reduce((sum, touch) => sum + touch.clientX, 0) / 3;
    const centerY = Array.from(event.touches).reduce((sum, touch) => sum + touch.clientY, 0) / 3;

    const gesture: GestureEvent = {
      timestamp: event.timeStamp,
      gesture: 'three_finger_tap', // Would determine specific gesture type
      efficiency: 0.9, // Three finger gestures are typically efficient for Gen Z
      confidence: 0.85
    };

    this.updateGenZPattern('three_finger_navigation', 1);

    return {
      gesture,
      confidence: gesture.confidence,
      efficiency: gesture.efficiency,
      isGenZTypical: true, // Three finger gestures are very typical for Gen Z
      processingTime: performance.now() - startTime
    };
  }

  /**
   * Calculate swipe efficiency based on velocity and path
   */
  private calculateSwipeEfficiency(velocity: number, distance: number, duration: number): number {
    // Higher velocity and shorter duration = more efficient
    const velocityScore = Math.min(1, velocity / 2); // Normalize to 0-1
    const durationScore = Math.max(0, 1 - (duration / this.config.maxSwipeTime));

    return (velocityScore * 0.6 + durationScore * 0.4);
  }

  /**
   * Calculate pinch gesture efficiency
   */
  private calculatePinchEfficiency(distance: number, duration: number): number {
    // Smooth, controlled pinch gestures are more efficient
    const durationScore = Math.max(0, 1 - (duration / 2000)); // 2 second max for efficient pinch
    const distanceScore = Math.min(1, distance / 200); // Normalize distance

    return (durationScore * 0.7 + distanceScore * 0.3);
  }

  /**
   * Calculate gesture confidence based on various factors
   */
  private calculateGestureConfidence(gestureType: string, distance: number, duration: number): number {
    let confidence = 0.5; // Base confidence

    switch (gestureType) {
      case 'swipe':
        if (distance >= this.config.minSwipeDistance && duration <= this.config.maxSwipeTime) {
          confidence = 0.9;
        }
        break;
      case 'pinch':
        if (distance >= this.config.pinchThreshold) {
          confidence = 0.85;
        }
        break;
      case 'tap':
        if (duration <= this.config.tapTimeout) {
          confidence = 0.95;
        }
        break;
    }

    return confidence;
  }

  /**
   * Determine swipe direction
   */
  private getSwipeDirection(deltaX: number, deltaY: number): 'left' | 'right' | 'up' | 'down' {
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX > absY) {
      return deltaX > 0 ? 'right' : 'left';
    } else {
      return deltaY > 0 ? 'down' : 'up';
    }
  }

  /**
   * Check if gesture is typical for Gen Z users
   */
  private isGenZTypicalGesture(gesture: GestureEvent): boolean {
    if (!this.config.genZOptimization) return false;

    // Gen Z typical patterns
    const genZGestures = [
      'swipe_up', 'swipe_down', // Vertical scrolling preference
      'pinch_zoom_in', 'pinch_zoom_out', // Zoom interactions
      'three_finger_tap', // Multi-finger navigation
      'rotate' // Rotation gestures
    ];

    const isTypicalGesture = genZGestures.includes(gesture.gesture);
    const isEfficient = gesture.efficiency > 0.7;
    const isConfident = gesture.confidence > 0.8;

    return isTypicalGesture && isEfficient && isConfident;
  }

  /**
   * Update Gen Z pattern tracking
   */
  private updateGenZPattern(pattern: string, value: number): void {
    const current = this.genZPatterns.get(pattern) || 0;
    this.genZPatterns.set(pattern, current + value);
  }

  /**
   * Get Gen Z pattern analysis
   */
  public getGenZPatternAnalysis(): Record<string, number> {
    const analysis: Record<string, number> = {};

    this.genZPatterns.forEach((value, pattern) => {
      analysis[pattern] = value;
    });

    // Calculate efficiency scores
    analysis.overall_efficiency = this.calculateOverallEfficiency();
    analysis.mobile_optimization_score = this.calculateMobileOptimizationScore();

    return analysis;
  }

  /**
   * Calculate overall gesture efficiency
   */
  private calculateOverallEfficiency(): number {
    const rapidSwipes = this.genZPatterns.get('rapid_swipe') || 0;
    const pinchEfficiency = this.genZPatterns.get('pinch_zoom_efficiency') || 0;
    const threeFingerUse = this.genZPatterns.get('three_finger_navigation') || 0;

    const total = rapidSwipes + pinchEfficiency + threeFingerUse;
    return total > 0 ? total / 3 : 0.5;
  }

  /**
   * Calculate mobile optimization score for Gen Z
   */
  private calculateMobileOptimizationScore(): number {
    let score = 0.5; // Base score

    // Bonus for efficient multi-touch usage
    const multiTouchEfficiency = this.genZPatterns.get('multi_touch_efficiency') || 0;
    if (multiTouchEfficiency > 0) score += 0.2;

    // Bonus for three finger navigation (advanced Gen Z pattern)
    const threeFingerUse = this.genZPatterns.get('three_finger_navigation') || 0;
    if (threeFingerUse > 0) score += 0.3;

    return Math.min(1, score);
  }

  /**
   * Reset recognition state
   */
  public reset(): void {
    this.activePointers.clear();
    this.touchStartTime = 0;
    this.lastTapTime = 0;
    this.lastTapPosition = { x: 0, y: 0 };
    this.genZPatterns.clear();
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<GestureConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  public getConfig(): GestureConfig {
    return { ...this.config };
  }
}
