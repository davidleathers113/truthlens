/**
 * Feature Discovery Tour Component - 2025 Implementation
 *
 * Features:
 * - Progressive disclosure for Gen Z users
 * - Interactive step-by-step guidance
 * - Multi-modal content (text, emoji, media)
 * - Accessibility compliant navigation
 * - Mobile-first responsive design
 * - Real-time progress tracking
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FeatureTour, TourProgress, HelpAnalytics } from '@shared/types/help';
import { logger } from '@shared/services';
import './FeatureDiscoveryTour.css';

export interface FeatureDiscoveryTourProps {
  tour: FeatureTour;
  isActive: boolean;
  onComplete?: (tourId: string, progress: TourProgress) => void;
  onSkip?: (tourId: string, step: number, reason: string) => void;
  onStepChange?: (tourId: string, step: number) => void;
  onAnalytics?: (event: HelpAnalytics) => void;
  className?: string;
}

export const FeatureDiscoveryTour: React.FC<FeatureDiscoveryTourProps> = ({
  tour,
  isActive,
  onComplete,
  onSkip,
  onStepChange,
  onAnalytics,
  className = ''
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState<TourProgress>({
    tourId: tour.id,
    status: 'not_started',
    currentStep: 0,
    completedSteps: [],
    startedAt: Date.now(),
    timeSpent: 0
  });
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [overlayPosition, setOverlayPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const overlayRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(0);
  const stepStartTimeRef = useRef<number>(0);

  const currentStepData = tour.steps[currentStep];

  // Initialize tour
  useEffect(() => {
    if (isActive && !isVisible) {
      startTour();
    } else if (!isActive && isVisible) {
      endTour('manual_skip');
    }
  }, [isActive]);

  // Update target element when step changes
  useEffect(() => {
    if (currentStepData?.target) {
      const element = document.querySelector(currentStepData.target) as HTMLElement;
      setTargetElement(element);

      if (element) {
        updateOverlayPosition(element);
        highlightElement(element);
      }
    } else {
      setTargetElement(null);
      clearHighlights();
    }
  }, [currentStep, currentStepData]);

  // Auto-advance step if duration is set
  useEffect(() => {
    if (currentStepData?.duration && isVisible) {
      const timer = setTimeout(() => {
        nextStep('auto_advance');
      }, currentStepData.duration);

      return () => clearTimeout(timer);
    }

    return undefined;
  }, [currentStep, currentStepData, isVisible]);

  // Window resize handler
  useEffect(() => {
    if (!targetElement || !isVisible) return;

    const handleResize = () => {
      updateOverlayPosition(targetElement);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
    };
  }, [targetElement, isVisible]);

  // Start tour
  const startTour = useCallback(() => {
    startTimeRef.current = Date.now();
    stepStartTimeRef.current = Date.now();
    setIsVisible(true);

    const newProgress: TourProgress = {
      ...progress,
      status: 'in_progress',
      startedAt: Date.now()
    };
    setProgress(newProgress);

    // Analytics
    onAnalytics?.({
      event: 'tour_started',
      properties: {
        itemId: tour.id,
        category: tour.category,
        targetAudience: tour.targetAudience,
        estimatedTime: tour.estimatedTime
      },
      timestamp: Date.now(),
      sessionId: 'session_' + Date.now()
    });

    logger.info('Feature tour started', { tourId: tour.id, totalSteps: tour.steps.length });
  }, [tour, progress, onAnalytics]);

  // End tour
  const endTour = useCallback((reason: 'completed' | 'manual_skip' | 'abandoned') => {
    const timeSpent = Date.now() - startTimeRef.current;
    setIsVisible(false);
    clearHighlights();

    const finalProgress: TourProgress = {
      ...progress,
      status: reason === 'completed' ? 'completed' : reason === 'manual_skip' ? 'skipped' : 'abandoned',
      timeSpent,
      completedAt: reason === 'completed' ? Date.now() : undefined,
      abandonedAt: reason !== 'completed' ? Date.now() : undefined,
      abandonReason: reason !== 'completed' ? reason : undefined
    };
    setProgress(finalProgress);

    // Analytics
    onAnalytics?.({
      event: 'tour_completed',
      properties: {
        itemId: tour.id,
        category: tour.category,
        timeSpent,
        completed: reason === 'completed',
        stepsCompleted: finalProgress.completedSteps.length,
        totalSteps: tour.steps.length,
        context: reason
      },
      timestamp: Date.now(),
      sessionId: 'session_' + Date.now()
    });

    if (reason === 'completed') {
      onComplete?.(tour.id, finalProgress);
    } else {
      onSkip?.(tour.id, currentStep, reason);
    }

    logger.info('Feature tour ended', {
      tourId: tour.id,
      reason,
      stepsCompleted: finalProgress.completedSteps.length,
      timeSpent
    });
  }, [tour, progress, currentStep, onComplete, onSkip, onAnalytics]);

  // Navigate to next step
  const nextStep = useCallback((trigger: 'manual' | 'auto_advance' | 'action_completed' = 'manual') => {
    const stepTimeSpent = Date.now() - stepStartTimeRef.current;

    // Mark current step as completed
    const newCompletedSteps = [...progress.completedSteps, currentStepData.id];

    if (currentStep < tour.steps.length - 1) {
      const nextStepIndex = currentStep + 1;
      setCurrentStep(nextStepIndex);
      stepStartTimeRef.current = Date.now();

      const newProgress = {
        ...progress,
        currentStep: nextStepIndex,
        completedSteps: newCompletedSteps,
        timeSpent: Date.now() - startTimeRef.current
      };
      setProgress(newProgress);

      onStepChange?.(tour.id, nextStepIndex);

      logger.info('Tour step completed', {
        tourId: tour.id,
        stepId: currentStepData.id,
        stepTimeSpent,
        trigger
      });
    } else {
      // Tour completed
      endTour('completed');
    }
  }, [currentStep, tour.steps.length, progress, currentStepData, onStepChange, endTour]);

  // Navigate to previous step
  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      const prevStepIndex = currentStep - 1;
      setCurrentStep(prevStepIndex);
      stepStartTimeRef.current = Date.now();

      // Remove current step from completed steps if going back
      const newCompletedSteps = progress.completedSteps.filter(id => id !== currentStepData.id);

      const newProgress = {
        ...progress,
        currentStep: prevStepIndex,
        completedSteps: newCompletedSteps
      };
      setProgress(newProgress);

      onStepChange?.(tour.id, prevStepIndex);
    }
  }, [currentStep, progress, currentStepData, onStepChange]);

  // Update overlay position to highlight target element
  const updateOverlayPosition = useCallback((element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const padding = 8;

    setOverlayPosition({
      x: rect.left - padding,
      y: rect.top - padding,
      width: rect.width + (padding * 2),
      height: rect.height + (padding * 2)
    });
  }, []);

  // Highlight target element
  const highlightElement = useCallback((element: HTMLElement) => {
    // Add highlight class to target element
    element.classList.add('tour-highlight');
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center'
    });
  }, []);

  // Clear all highlights
  const clearHighlights = useCallback(() => {
    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.classList.remove('tour-highlight');
    });
  }, []);

  // Handle step action
  const handleStepAction = useCallback(() => {
    if (!currentStepData.action) return;

    const action = currentStepData.action;

    switch (action.type) {
      case 'click':
        if (action.target) {
          const element = document.querySelector(action.target) as HTMLElement;
          element?.click();
        }
        break;

      case 'input':
        if (action.target && action.value) {
          const element = document.querySelector(action.target) as HTMLInputElement;
          if (element) {
            element.value = action.value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
        break;

      case 'navigate':
        if (action.value) {
          window.location.href = action.value;
        }
        break;

      case 'wait':
        setTimeout(() => {
          if (action.required) {
            nextStep('action_completed');
          }
        }, action.value || 1000);
        return;

      default:
        break;
    }

    if (action.required) {
      nextStep('action_completed');
    }
  }, [currentStepData, nextStep]);

  // Validate step completion
  const validateStep = useCallback(() => {
    if (!currentStepData.validation) return true;

    const validation = currentStepData.validation;

    switch (validation.type) {
      case 'element_exists':
        return validation.target ? !!document.querySelector(validation.target) : true;

      case 'custom':
        return validation.validator ? validation.validator() : true;

      default:
        return true;
    }
  }, [currentStepData]);

  // Keyboard navigation
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          endTour('manual_skip');
          break;
        case 'ArrowRight':
        case 'Space':
          event.preventDefault();
          if (validateStep()) {
            nextStep('manual');
          }
          break;
        case 'ArrowLeft':
          event.preventDefault();
          previousStep();
          break;
        case 'Enter':
          event.preventDefault();
          handleStepAction();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, nextStep, previousStep, handleStepAction, validateStep, endTour]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`feature-discovery-tour ${className}`}>
      {/* Overlay backdrop */}
      <div className="feature-discovery-tour__backdrop" />

      {/* Highlight overlay for target element */}
      {targetElement && (
        <div
          className="feature-discovery-tour__highlight"
          style={{
            left: overlayPosition.x,
            top: overlayPosition.y,
            width: overlayPosition.width,
            height: overlayPosition.height
          }}
        />
      )}

      {/* Tour step content */}
      <div
        ref={overlayRef}
        className={`feature-discovery-tour__content feature-discovery-tour__content--${currentStepData.position || 'center'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`tour-step-title-${currentStep}`}
        aria-describedby={`tour-step-content-${currentStep}`}
      >
        {/* Header */}
        <div className="feature-discovery-tour__header">
          <div className="feature-discovery-tour__title-section">
            {tour.emoji && (
              <span className="feature-discovery-tour__tour-emoji" aria-hidden="true">
                {tour.emoji}
              </span>
            )}
            <div className="feature-discovery-tour__titles">
              <h2 className="feature-discovery-tour__tour-name">{tour.name}</h2>
              <h3 id={`tour-step-title-${currentStep}`} className="feature-discovery-tour__step-title">
                {currentStepData.emoji && (
                  <span className="feature-discovery-tour__step-emoji" aria-hidden="true">
                    {currentStepData.emoji}
                  </span>
                )}
                {currentStepData.title}
              </h3>
            </div>
          </div>

          <button
            className="feature-discovery-tour__close-btn"
            onClick={() => endTour('manual_skip')}
            aria-label="Close tour"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Progress indicator */}
        <div className="feature-discovery-tour__progress">
          <div className="feature-discovery-tour__progress-bar">
            <div
              className="feature-discovery-tour__progress-fill"
              style={{ width: `${((currentStep + 1) / tour.steps.length) * 100}%` }}
            />
          </div>
          <span className="feature-discovery-tour__progress-text">
            {currentStep + 1} of {tour.steps.length}
          </span>
        </div>

        {/* Step content */}
        <div className="feature-discovery-tour__body">
          <p id={`tour-step-content-${currentStep}`} className="feature-discovery-tour__step-content">
            {currentStepData.content}
          </p>

          {/* Media content */}
          {currentStepData.media && (
            <div className="feature-discovery-tour__media">
              {currentStepData.media.type === 'image' && (
                <img
                  src={currentStepData.media.url}
                  alt={currentStepData.media.alt}
                  className="feature-discovery-tour__media-image"
                />
              )}
              {currentStepData.media.type === 'gif' && (
                <img
                  src={currentStepData.media.url}
                  alt={currentStepData.media.alt}
                  className="feature-discovery-tour__media-gif"
                />
              )}
              {currentStepData.media.type === 'video' && (
                <video
                  src={currentStepData.media.url}
                  className="feature-discovery-tour__media-video"
                  controls
                  muted
                  autoPlay
                >
                  {currentStepData.media.alt}
                </video>
              )}
            </div>
          )}

          {/* Action help text */}
          {currentStepData.action?.helpText && (
            <div className="feature-discovery-tour__help-text">
              💡 {currentStepData.action.helpText}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="feature-discovery-tour__navigation">
          <div className="feature-discovery-tour__nav-left">
            {currentStep > 0 && (
              <button
                className="feature-discovery-tour__nav-btn feature-discovery-tour__nav-btn--secondary"
                onClick={previousStep}
                type="button"
              >
                ← Previous
              </button>
            )}

            {currentStepData.skippable && (
              <button
                className="feature-discovery-tour__skip-btn"
                onClick={() => endTour('manual_skip')}
                type="button"
              >
                Skip Tour
              </button>
            )}
          </div>

          <div className="feature-discovery-tour__nav-right">
            {currentStepData.action ? (
              <button
                className="feature-discovery-tour__action-btn"
                onClick={handleStepAction}
                type="button"
              >
                {currentStepData.action.type === 'click' ? '👆 Click it!' :
                 currentStepData.action.type === 'input' ? '✏️ Try it!' :
                 currentStepData.action.type === 'navigate' ? '🚀 Go there!' :
                 '✨ Do it!'}
              </button>
            ) : (
              <button
                className="feature-discovery-tour__nav-btn feature-discovery-tour__nav-btn--primary"
                onClick={() => nextStep('manual')}
                disabled={!validateStep()}
                type="button"
              >
                {currentStep === tour.steps.length - 1 ? 'Complete 🎉' : 'Next →'}
              </button>
            )}
          </div>
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="feature-discovery-tour__shortcuts">
          <span>💡 Use arrow keys to navigate, Enter for actions, Esc to close</span>
        </div>
      </div>
    </div>
  );
};

export default FeatureDiscoveryTour;
