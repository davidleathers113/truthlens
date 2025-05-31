/**
 * PositionManager - Smart Positioning with Collision Detection
 * 2025 Optimized for Multi-Extension Environments and Responsive Design
 */

import { BaseIndicator, IndicatorPosition } from './BaseIndicator';

export interface CollisionZone {
  element: HTMLElement;
  rect: DOMRect;
  priority: number;
  type: 'extension' | 'native' | 'sticky';
}

export interface PositionConstraints {
  viewport: DOMRect;
  target: DOMRect;
  margin: number;
  preferredPlacement: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  allowFlip: boolean;
  avoidCollisions: boolean;
}

export interface PositionResult {
  position: IndicatorPosition;
  placement: string;
  collisions: CollisionZone[];
  adjustments: string[];
}

export class PositionManager {
  private indicators: Map<string, BaseIndicator> = new Map();
  private collisionZones: Set<CollisionZone> = new Set();
  private resizeObserver: ResizeObserver;
  private mutationObserver: MutationObserver;
  private isInitialized: boolean = false;

  constructor() {
    this.initializeObservers();
    this.scanExistingElements();
  }

  private initializeObservers(): void {
    // Monitor viewport changes
    this.resizeObserver = new ResizeObserver(() => {
      this.handleViewportChange();
    });
    this.resizeObserver.observe(document.body);

    // Monitor DOM changes for new collision sources
    this.mutationObserver = new MutationObserver((mutations) => {
      this.handleDOMChanges(mutations);
    });
    
    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });

    this.isInitialized = true;
  }

  private scanExistingElements(): void {
    // Scan for existing extension indicators and other fixed elements
    const fixedElements = document.querySelectorAll(
      '[style*="position: fixed"], [style*="position: absolute"]'
    );
    
    fixedElements.forEach((element) => {
      this.addCollisionZone(element as HTMLElement);
    });

    // Scan for common extension patterns
    this.scanCommonExtensionPatterns();
  }

  private scanCommonExtensionPatterns(): void {
    const extensionPatterns = [
      // Common extension selectors
      '[id*="extension"]',
      '[class*="extension"]',
      '[id*="chrome"]',
      '[class*="chrome"]',
      '[data-extension]',
      // Ad blockers
      '[id*="adblock"]',
      '[class*="adblock"]',
      // Password managers
      '[id*="password"]',
      '[class*="password"]',
      '[id*="lastpass"]',
      '[id*="bitwarden"]',
      '[id*="1password"]',
      // Other common tools
      '[id*="grammarly"]',
      '[id*="honey"]',
      '[id*="pocket"]'
    ];

    extensionPatterns.forEach(pattern => {
      const elements = document.querySelectorAll(pattern);
      elements.forEach(element => {
        if (this.isLikelyExtensionElement(element as HTMLElement)) {
          this.addCollisionZone(element as HTMLElement, 'extension');
        }
      });
    });
  }

  private isLikelyExtensionElement(element: HTMLElement): boolean {
    const style = getComputedStyle(element);
    
    // Check if element is positioned and visible
    if (style.position !== 'fixed' && style.position !== 'absolute') {
      return false;
    }
    
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }
    
    // Check z-index (extensions often use high values)
    const zIndex = parseInt(style.zIndex);
    if (zIndex > 1000) {
      return true;
    }
    
    // Check for common extension characteristics
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return false;
    }
    
    // Small elements in corners are likely indicators
    const isSmall = rect.width < 200 && rect.height < 200;
    const isInCorner = 
      (rect.left < 50 || rect.right > window.innerWidth - 50) &&
      (rect.top < 50 || rect.bottom > window.innerHeight - 50);
    
    return isSmall && isInCorner;
  }

  private addCollisionZone(
    element: HTMLElement, 
    type: CollisionZone['type'] = 'native',
    priority: number = 1
  ): void {
    const rect = element.getBoundingClientRect();
    
    // Ignore elements that are not visible or positioned
    if (rect.width === 0 || rect.height === 0) return;
    
    const collisionZone: CollisionZone = {
      element,
      rect,
      priority,
      type
    };
    
    this.collisionZones.add(collisionZone);
  }

  public calculateOptimalPosition(
    target: Element,
    constraints: Partial<PositionConstraints> = {}
  ): PositionResult {
    const fullConstraints: PositionConstraints = {
      viewport: this.getViewportRect(),
      target: target.getBoundingClientRect(),
      margin: 12,
      preferredPlacement: 'top-right',
      allowFlip: true,
      avoidCollisions: true,
      ...constraints
    };

    const placements = this.getPossiblePlacements(fullConstraints);
    let bestResult: PositionResult | null = null;
    let bestScore = -1;

    for (const placement of placements) {
      const position = this.calculatePositionForPlacement(placement, fullConstraints);
      const collisions = this.detectCollisions(position, fullConstraints);
      const score = this.scorePlacement(position, collisions, placement, fullConstraints);
      
      const result: PositionResult = {
        position,
        placement,
        collisions,
        adjustments: []
      };

      if (score > bestScore) {
        bestScore = score;
        bestResult = result;
      }

      // Perfect score, no need to check further
      if (score === 100) break;
    }

    if (!bestResult) {
      // Fallback to default positioning
      bestResult = this.createFallbackPosition(fullConstraints);
    }

    // Apply final adjustments if needed
    if (bestResult.collisions.length > 0 && fullConstraints.avoidCollisions) {
      bestResult = this.applyCollisionAvoidance(bestResult, fullConstraints);
    }

    return bestResult;
  }

  private getPossiblePlacements(constraints: PositionConstraints): string[] {
    const primary = constraints.preferredPlacement;
    const placements = [primary];
    
    if (constraints.allowFlip) {
      // Add alternative placements based on preference
      switch (primary) {
        case 'top-right':
          placements.push('top-left', 'bottom-right', 'bottom-left');
          break;
        case 'top-left':
          placements.push('top-right', 'bottom-left', 'bottom-right');
          break;
        case 'bottom-right':
          placements.push('bottom-left', 'top-right', 'top-left');
          break;
        case 'bottom-left':
          placements.push('bottom-right', 'top-left', 'top-right');
          break;
      }
    }
    
    return placements;
  }

  private calculatePositionForPlacement(
    placement: string,
    constraints: PositionConstraints
  ): IndicatorPosition {
    const { target, margin } = constraints;
    const indicatorSize = this.getIndicatorSize();
    
    let x: number, y: number;
    
    switch (placement) {
      case 'top-right':
        x = target.right - indicatorSize.width - margin;
        y = target.top + margin;
        break;
      case 'top-left':
        x = target.left + margin;
        y = target.top + margin;
        break;
      case 'bottom-right':
        x = target.right - indicatorSize.width - margin;
        y = target.bottom - indicatorSize.height - margin;
        break;
      case 'bottom-left':
        x = target.left + margin;
        y = target.bottom - indicatorSize.height - margin;
        break;
      default:
        x = target.right + margin;
        y = target.top + margin;
    }
    
    return {
      x: Math.max(margin, Math.min(x, constraints.viewport.width - indicatorSize.width - margin)),
      y: Math.max(margin, Math.min(y, constraints.viewport.height - indicatorSize.height - margin)),
      placement: placement as IndicatorPosition['placement'],
      constraints: {
        maxWidth: indicatorSize.width,
        maxHeight: indicatorSize.height,
        margin
      }
    };
  }

  private getIndicatorSize(): { width: number; height: number } {
    // Standard indicator size for collision calculations
    return { width: 56, height: 56 };
  }

  private detectCollisions(
    position: IndicatorPosition,
    constraints: PositionConstraints
  ): CollisionZone[] {
    const indicatorRect = {
      left: position.x,
      top: position.y,
      right: position.x + position.constraints.maxWidth,
      bottom: position.y + position.constraints.maxHeight
    };

    const collisions: CollisionZone[] = [];
    
    // Update collision zones with current positions
    this.updateCollisionZones();
    
    for (const zone of this.collisionZones) {
      if (this.isRectCollision(indicatorRect, zone.rect)) {
        collisions.push(zone);
      }
    }
    
    return collisions;
  }

  private isRectCollision(rect1: any, rect2: DOMRect): boolean {
    return !(
      rect1.right < rect2.left ||
      rect1.left > rect2.right ||
      rect1.bottom < rect2.top ||
      rect1.top > rect2.bottom
    );
  }

  private scorePlacement(
    position: IndicatorPosition,
    collisions: CollisionZone[],
    placement: string,
    constraints: PositionConstraints
  ): number {
    let score = 100;
    
    // Penalize collisions
    for (const collision of collisions) {
      score -= collision.priority * 20;
    }
    
    // Prefer original placement
    if (placement === constraints.preferredPlacement) {
      score += 10;
    }
    
    // Penalize edge proximity
    const edgeDistance = Math.min(
      position.x,
      position.y,
      constraints.viewport.width - position.x - position.constraints.maxWidth,
      constraints.viewport.height - position.y - position.constraints.maxHeight
    );
    
    if (edgeDistance < constraints.margin) {
      score -= (constraints.margin - edgeDistance) * 2;
    }
    
    // Bonus for being within target bounds
    const targetRect = constraints.target;
    if (
      position.x >= targetRect.left &&
      position.x + position.constraints.maxWidth <= targetRect.right &&
      position.y >= targetRect.top &&
      position.y + position.constraints.maxHeight <= targetRect.bottom
    ) {
      score += 15;
    }
    
    return Math.max(0, score);
  }

  private createFallbackPosition(constraints: PositionConstraints): PositionResult {
    const fallbackX = constraints.viewport.width - 80;
    const fallbackY = 20;
    
    return {
      position: {
        x: fallbackX,
        y: fallbackY,
        placement: 'top-right',
        constraints: {
          maxWidth: 56,
          maxHeight: 56,
          margin: constraints.margin
        }
      },
      placement: 'fallback',
      collisions: [],
      adjustments: ['fallback-positioning']
    };
  }

  private applyCollisionAvoidance(
    result: PositionResult,
    constraints: PositionConstraints
  ): PositionResult {
    let { position } = result;
    const adjustments = [...result.adjustments];
    
    // Simple collision avoidance: move away from collisions
    for (const collision of result.collisions) {
      const collisionCenter = {
        x: collision.rect.left + collision.rect.width / 2,
        y: collision.rect.top + collision.rect.height / 2
      };
      
      const indicatorCenter = {
        x: position.x + position.constraints.maxWidth / 2,
        y: position.y + position.constraints.maxHeight / 2
      };
      
      // Move away from collision center
      const deltaX = indicatorCenter.x - collisionCenter.x;
      const deltaY = indicatorCenter.y - collisionCenter.y;
      
      const magnitude = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      if (magnitude > 0) {
        const moveDistance = 20; // Minimum separation distance
        const normalizedX = deltaX / magnitude;
        const normalizedY = deltaY / magnitude;
        
        position.x += normalizedX * moveDistance;
        position.y += normalizedY * moveDistance;
        
        adjustments.push('collision-avoidance');
      }
    }
    
    // Ensure position stays within viewport
    position.x = Math.max(
      constraints.margin,
      Math.min(position.x, constraints.viewport.width - position.constraints.maxWidth - constraints.margin)
    );
    position.y = Math.max(
      constraints.margin,
      Math.min(position.y, constraints.viewport.height - position.constraints.maxHeight - constraints.margin)
    );
    
    // Re-check collisions after adjustment
    const newCollisions = this.detectCollisions(position, constraints);
    
    return {
      position,
      placement: result.placement,
      collisions: newCollisions,
      adjustments
    };
  }

  private updateCollisionZones(): void {
    // Remove stale zones and update existing ones
    const zonesToRemove: CollisionZone[] = [];
    
    for (const zone of this.collisionZones) {
      if (!document.contains(zone.element)) {
        zonesToRemove.push(zone);
      } else {
        // Update rect
        zone.rect = zone.element.getBoundingClientRect();
      }
    }
    
    // Remove stale zones
    zonesToRemove.forEach(zone => this.collisionZones.delete(zone));
  }

  private handleViewportChange(): void {
    // Reposition all managed indicators
    for (const [id, indicator] of this.indicators) {
      this.repositionIndicator(id, indicator);
    }
  }

  private handleDOMChanges(mutations: MutationRecord[]): void {
    // Scan for new potential collision elements
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            if (this.isLikelyExtensionElement(element)) {
              this.addCollisionZone(element, 'extension');
            }
          }
        });
      }
    });
  }

  private repositionIndicator(id: string, indicator: BaseIndicator): void {
    // This would require the indicator to provide its target element
    // For now, we'll trigger a reposition event
    indicator.getElement().dispatchEvent(new CustomEvent('truthlens:reposition-needed'));
  }

  private getViewportRect(): DOMRect {
    return new DOMRect(0, 0, window.innerWidth, window.innerHeight);
  }

  // Public methods
  public registerIndicator(id: string, indicator: BaseIndicator): void {
    this.indicators.set(id, indicator);
  }

  public unregisterIndicator(id: string): void {
    this.indicators.delete(id);
  }

  public addCustomCollisionZone(element: HTMLElement, priority: number = 1): void {
    this.addCollisionZone(element, 'extension', priority);
  }

  public removeCollisionZone(element: HTMLElement): void {
    for (const zone of this.collisionZones) {
      if (zone.element === element) {
        this.collisionZones.delete(zone);
        break;
      }
    }
  }

  public getCollisionZones(): CollisionZone[] {
    this.updateCollisionZones();
    return Array.from(this.collisionZones);
  }

  public findBestPositionForElement(target: Element): IndicatorPosition {
    const result = this.calculateOptimalPosition(target);
    return result.position;
  }

  public destroy(): void {
    this.resizeObserver?.disconnect();
    this.mutationObserver?.disconnect();
    this.indicators.clear();
    this.collisionZones.clear();
  }
}