/**
 * Quick Start Guide Component - 2025 Implementation
 *
 * Features:
 * - Interactive step-by-step guidance for new users
 * - Gen Z focused design with emoji and visual elements
 * - Progressive completion tracking
 * - Mobile-first responsive design
 * - Accessibility compliant navigation
 * - Real-time demonstrations and examples
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { QuickStartGuide, QuickStartStep, HelpAnalytics } from '@shared/types/help';
import { logger } from '@shared/services';
import './QuickStartGuide.css';

export interface QuickStartGuideProps {
  guide: QuickStartGuide;
  onComplete?: (guideId: string, timeSpent: number) => void;
  onStepComplete?: (guideId: string, stepId: string, timeSpent: number) => void;
  onAnalytics?: (event: HelpAnalytics) => void;
  className?: string;
  autoStart?: boolean;
}

interface StepProgress {
  stepId: string;
  completed: boolean;
  timeSpent: number;
  startTime: number;
}

export const QuickStartGuide: React.FC<QuickStartGuideProps> = ({
  guide,
  onComplete,
  onStepComplete,
  onAnalytics,
  className = '',
  autoStart = false
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isStarted, setIsStarted] = useState(autoStart);
  const [isCompleted, setIsCompleted] = useState(false);
  const [stepProgress, setStepProgress] = useState<Map<string, StepProgress>>(new Map());
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);

  const startTimeRef = useRef<number>(0);
  const stepStartTimeRef = useRef<number>(0);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  const currentStepData = guide.steps[currentStep];
  const completedSteps = Array.from(stepProgress.values()).filter(p => p.completed).length;
  const progressPercentage = (completedSteps / guide.steps.length) * 100;

  // Initialize step progress tracking
  useEffect(() => {
    const initialProgress = new Map<string, StepProgress>();
    guide.steps.forEach(step => {
      initialProgress.set(step.id, {
        stepId: step.id,
        completed: false,
        timeSpent: 0,
        startTime: 0
      });
    });
    setStepProgress(initialProgress);
  }, [guide.steps]);

  // Start guide
  const startGuide = useCallback(() => {
    setIsStarted(true);
    setCurrentStep(0);
    startTimeRef.current = Date.now();
    stepStartTimeRef.current = Date.now();

    // Start progress tracking
    progressInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      setTotalTimeSpent(elapsed);
    }, 1000);

    // Analytics
    onAnalytics?.({
      event: 'guide_accessed',
      properties: {
        itemId: guide.id,
        category: guide.category,
        targetAudience: guide.targetAudience,
        estimatedTime: guide.estimatedTime
      },
      timestamp: Date.now(),
      sessionId: 'session_' + Date.now()
    });

    logger.info('Quick start guide started', {
      guideId: guide.id,
      totalSteps: guide.steps.length
    });
  }, [guide, onAnalytics]);

  // Complete current step
  const completeStep = useCallback((stepId: string) => {
    const stepTimeSpent = Date.now() - stepStartTimeRef.current;

    setStepProgress(prev => {
      const newProgress = new Map(prev);
      const stepData = newProgress.get(stepId);
      if (stepData) {
        stepData.completed = true;
        stepData.timeSpent = stepTimeSpent;
      }
      return newProgress;
    });

    onStepComplete?.(guide.id, stepId, stepTimeSpent);

    logger.info('Quick start step completed', {
      guideId: guide.id,
      stepId,
      timeSpent: stepTimeSpent
    });
  }, [guide.id, onStepComplete]);

  // Navigate to next step
  const nextStep = useCallback(() => {
    if (currentStepData) {
      completeStep(currentStepData.id);
    }

    if (currentStep < guide.steps.length - 1) {
      setCurrentStep(currentStep + 1);
      stepStartTimeRef.current = Date.now();
    } else {
      finishGuide();
    }
  }, [currentStep, guide.steps.length, currentStepData, completeStep]);

  // Navigate to previous step
  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      stepStartTimeRef.current = Date.now();

      // Mark current step as incomplete
      setStepProgress(prev => {
        const newProgress = new Map(prev);
        const stepData = newProgress.get(currentStepData.id);
        if (stepData) {
          stepData.completed = false;
          stepData.timeSpent = 0;
        }
        return newProgress;
      });
    }
  }, [currentStep, currentStepData]);

  // Jump to specific step
  const goToStep = useCallback((stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < guide.steps.length) {
      setCurrentStep(stepIndex);
      stepStartTimeRef.current = Date.now();
    }
  }, [guide.steps.length]);

  // Finish guide
  const finishGuide = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }

    const finalTime = Date.now() - startTimeRef.current;
    setTotalTimeSpent(finalTime);
    setIsCompleted(true);

    onComplete?.(guide.id, finalTime);

    // Analytics
    onAnalytics?.({
      event: 'guide_accessed',
      properties: {
        itemId: guide.id,
        category: guide.category,
        timeSpent: finalTime,
        completed: true,
        stepsCompleted: completedSteps,
        totalSteps: guide.steps.length
      },
      timestamp: Date.now(),
      sessionId: 'session_' + Date.now()
    });

    logger.info('Quick start guide completed', {
      guideId: guide.id,
      timeSpent: finalTime,
      stepsCompleted: completedSteps
    });
  }, [guide, totalTimeSpent, completedSteps, onComplete, onAnalytics]);

  // Handle step action
  const handleStepAction = useCallback(() => {
    const action = currentStepData.action;
    if (!action) return;

    switch (action.type) {
      case 'button':
        // Simulate button click or navigate
        if (action.target) {
          window.open(action.target, '_blank');
        }
        break;

      case 'link':
        if (action.target) {
          window.open(action.target, '_blank');
        }
        break;

      case 'demo':
        // Show interactive demo
        // This would trigger a specific demo based on the target
        break;

      default:
        break;
    }

    // Auto-advance after action if step is completable
    if (currentStepData.completable) {
      setTimeout(() => {
        completeStep(currentStepData.id);
        nextStep();
      }, 1000);
    }
  }, [currentStepData, completeStep, nextStep]);

  // Auto-start if specified
  useEffect(() => {
    if (autoStart && !isStarted) {
      startGuide();
    }
  }, [autoStart, isStarted, startGuide]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, []);

  // Format time display
  const formatTime = useCallback((ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!isStarted || isCompleted) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowRight':
        case 'Space':
          event.preventDefault();
          nextStep();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          previousStep();
          break;
        case 'Enter':
          event.preventDefault();
          handleStepAction();
          break;
        case 'Escape':
          setIsStarted(false);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isStarted, isCompleted, nextStep, previousStep, handleStepAction]);

  if (!isStarted) {
    return (
      <div className={`quick-start-guide quick-start-guide--intro ${className}`}>
        <div className="quick-start-guide__intro">
          <div className="quick-start-guide__intro-header">
            <div className="quick-start-guide__intro-emoji">{guide.emoji}</div>
            <h2 className="quick-start-guide__intro-title">{guide.title}</h2>
          </div>

          <p className="quick-start-guide__intro-description">{guide.description}</p>

          <div className="quick-start-guide__intro-meta">
            <div className="quick-start-guide__intro-stat">
              <span className="quick-start-guide__intro-stat-icon">⏱️</span>
              <span className="quick-start-guide__intro-stat-text">
                ~{Math.ceil(guide.estimatedTime / 60)} min
              </span>
            </div>
            <div className="quick-start-guide__intro-stat">
              <span className="quick-start-guide__intro-stat-icon">📋</span>
              <span className="quick-start-guide__intro-stat-text">
                {guide.steps.length} steps
              </span>
            </div>
            <div className="quick-start-guide__intro-stat">
              <span className="quick-start-guide__intro-stat-icon">🎯</span>
              <span className="quick-start-guide__intro-stat-text">
                {guide.category}
              </span>
            </div>
          </div>

          <button
            className="quick-start-guide__intro-btn"
            onClick={startGuide}
            type="button"
          >
            🚀 Let's Start!
          </button>
        </div>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className={`quick-start-guide quick-start-guide--completed ${className}`}>
        <div className="quick-start-guide__completion">
          <div className="quick-start-guide__completion-celebration">🎉</div>
          <h2 className="quick-start-guide__completion-title">Great job!</h2>
          <p className="quick-start-guide__completion-message">
            You've completed the {guide.title} in {formatTime(totalTimeSpent)}
          </p>

          <div className="quick-start-guide__completion-stats">
            <div className="quick-start-guide__completion-stat">
              <span className="quick-start-guide__completion-stat-value">{completedSteps}</span>
              <span className="quick-start-guide__completion-stat-label">steps completed</span>
            </div>
            <div className="quick-start-guide__completion-stat">
              <span className="quick-start-guide__completion-stat-value">{Math.round(progressPercentage)}%</span>
              <span className="quick-start-guide__completion-stat-label">progress</span>
            </div>
          </div>

          <button
            className="quick-start-guide__completion-btn"
            onClick={() => setIsStarted(false)}
            type="button"
          >
            ✨ Continue Exploring
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`quick-start-guide ${className}`}>
      {/* Header with progress */}
      <div className="quick-start-guide__header">
        <div className="quick-start-guide__header-info">
          <h2 className="quick-start-guide__title">
            {guide.emoji} {guide.title}
          </h2>
          <div className="quick-start-guide__step-info">
            Step {currentStep + 1} of {guide.steps.length}
          </div>
        </div>

        <div className="quick-start-guide__progress">
          <div className="quick-start-guide__progress-bar">
            <div
              className="quick-start-guide__progress-fill"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <span className="quick-start-guide__progress-text">
            {Math.round(progressPercentage)}%
          </span>
        </div>
      </div>

      {/* Step content */}
      <div className="quick-start-guide__content">
        <div className="quick-start-guide__step">
          <div className="quick-start-guide__step-header">
            <h3 className="quick-start-guide__step-title">
              {currentStepData.title}
            </h3>
            <div className="quick-start-guide__step-time">
              ~{Math.ceil(currentStepData.estimatedTime)} sec
            </div>
          </div>

          <div className="quick-start-guide__step-content">
            {currentStepData.content}
          </div>

          {/* Media content */}
          {currentStepData.media && (
            <div className="quick-start-guide__step-media">
              {currentStepData.media.type === 'screenshot' && (
                <img
                  src={currentStepData.media.url}
                  alt={currentStepData.media.alt}
                  className="quick-start-guide__step-image"
                />
              )}
              {currentStepData.media.type === 'gif' && (
                <img
                  src={currentStepData.media.url}
                  alt={currentStepData.media.alt}
                  className="quick-start-guide__step-gif"
                />
              )}
              {currentStepData.media.type === 'video' && (
                <video
                  src={currentStepData.media.url}
                  className="quick-start-guide__step-video"
                  controls
                  muted
                  autoPlay
                >
                  {currentStepData.media.alt}
                </video>
              )}
            </div>
          )}

          {/* Action button */}
          {currentStepData.action && (
            <div className="quick-start-guide__step-action">
              <button
                className="quick-start-guide__action-btn"
                onClick={handleStepAction}
                type="button"
              >
                {currentStepData.action.label}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="quick-start-guide__navigation">
        <div className="quick-start-guide__nav-left">
          {currentStep > 0 && (
            <button
              className="quick-start-guide__nav-btn quick-start-guide__nav-btn--secondary"
              onClick={previousStep}
              type="button"
            >
              ← Previous
            </button>
          )}
        </div>

        <div className="quick-start-guide__nav-center">
          {/* Step dots */}
          <div className="quick-start-guide__step-dots">
            {guide.steps.map((step, index) => {
              const isCompleted = stepProgress.get(step.id)?.completed || false;
              const isCurrent = index === currentStep;

              return (
                <button
                  key={step.id}
                  className={`quick-start-guide__step-dot ${
                    isCompleted ? 'quick-start-guide__step-dot--completed' : ''
                  } ${
                    isCurrent ? 'quick-start-guide__step-dot--current' : ''
                  }`}
                  onClick={() => goToStep(index)}
                  aria-label={`Go to step ${index + 1}: ${step.title}`}
                  type="button"
                >
                  {isCompleted ? '✓' : index + 1}
                </button>
              );
            })}
          </div>
        </div>

        <div className="quick-start-guide__nav-right">
          <button
            className="quick-start-guide__nav-btn quick-start-guide__nav-btn--primary"
            onClick={nextStep}
            type="button"
          >
            {currentStep === guide.steps.length - 1 ? 'Finish 🎉' : 'Next →'}
          </button>
        </div>
      </div>

      {/* Time tracker */}
      <div className="quick-start-guide__time-tracker">
        <span>⏱️ Time: {formatTime(totalTimeSpent)}</span>
        <span>•</span>
        <span>Use arrow keys to navigate</span>
      </div>
    </div>
  );
};

export default QuickStartGuide;
