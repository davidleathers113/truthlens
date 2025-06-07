/**
 * FeedbackCollector Component - 2025 UX Best Practices Implementation
 *
 * Features:
 * - Progressive disclosure for complex feedback forms
 * - Mobile-first responsive design
 * - Accessibility compliance (WCAG 2.1)
 * - AI-contextual feedback prompts
 * - Anti-spam validation integration
 */

import React, { useState, useRef, useEffect } from 'react';
import { CredibilityScore } from '@shared/types';
import '../styles/FeedbackSystem.css';

export interface FeedbackData {
  type: 'agree' | 'disagree' | 'report_issue';
  credibilityScore?: CredibilityScore;
  url: string;
  timestamp: number;
  userComment?: string;
  issueCategory?: 'factual_error' | 'bias_detection' | 'source_reliability' | 'technical_issue' | 'other';
  screenshot?: Blob;
  confidence: number; // User's confidence in their feedback (0-1)
  context?: string; // Additional context about the content
}

interface FeedbackCollectorProps {
  credibilityScore: CredibilityScore;
  url: string;
  onFeedbackSubmit: (feedback: FeedbackData) => Promise<void>;
  isSubmitting?: boolean;
  className?: string;
}

export const FeedbackCollector: React.FC<FeedbackCollectorProps> = ({
  credibilityScore,
  url,
  onFeedbackSubmit,
  isSubmitting = false,
  className = ''
}) => {
  // State management
  const [feedbackState, setFeedbackState] = useState<'initial' | 'expanded' | 'issue_report'>('initial');
  const [userComment, setUserComment] = useState('');
  const [issueCategory, setIssueCategory] = useState<FeedbackData['issueCategory']>('factual_error');
  const [confidence, setConfidence] = useState(0.7);
  const [screenshot, setScreenshot] = useState<Blob | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // Refs for accessibility
  const expandedFormRef = useRef<HTMLDivElement>(null);
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null);

  // 2025 Pattern: AI-contextual feedback prompts based on credibility score
  const getContextualPrompt = () => {
    if (credibilityScore.level === 'low') {
      return "Help us understand what made this content questionable. Your feedback improves our analysis.";
    } else if (credibilityScore.level === 'high') {
      return "Did our credibility assessment match your expectations? Your input helps us stay accurate.";
    } else {
      return "Share your perspective on this content's credibility. Every voice helps improve our system.";
    }
  };

  // 2025 Pattern: Progressive disclosure - expand form only when needed
  const handleExpandFeedback = () => {
    setFeedbackState('expanded');
    setHasUserInteracted(true);
    // Focus management for accessibility
    setTimeout(() => {
      commentTextareaRef.current?.focus();
    }, 100);
  };

  const handleIssueReport = () => {
    setFeedbackState('issue_report');
    setHasUserInteracted(true);
  };

  // Quick feedback submission (thumbs up/down)
  const handleQuickFeedback = async (type: 'agree' | 'disagree') => {
    const feedback: FeedbackData = {
      type,
      credibilityScore,
      url,
      timestamp: Date.now(),
      confidence: type === 'agree' ? 0.8 : 0.7 // Higher confidence for agreement
    };

    try {
      await onFeedbackSubmit(feedback);
      setHasUserInteracted(true);
    } catch (error) {
      console.error('Quick feedback submission failed:', error);
    }
  };

  // Detailed feedback submission
  const handleDetailedFeedback = async () => {
    if (!userComment.trim()) return;

    const feedback: FeedbackData = {
      type: feedbackState === 'issue_report' ? 'report_issue' : 'disagree',
      credibilityScore,
      url,
      timestamp: Date.now(),
      userComment: userComment.trim(),
      issueCategory: feedbackState === 'issue_report' ? issueCategory : undefined,
      screenshot: screenshot || undefined,
      confidence,
      context: `User expanded feedback form. Credibility level: ${credibilityScore.level}`
    };

    try {
      await onFeedbackSubmit(feedback);
      setFeedbackState('initial');
      setUserComment('');
      setScreenshot(null);
      setHasUserInteracted(true);
    } catch (error) {
      console.error('Detailed feedback submission failed:', error);
    }
  };

  // 2025 Pattern: Browser API screenshot capture
  const captureScreenshot = async () => {
    setIsCapturing(true);
    try {
      // Modern browser screenshot API
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      video.addEventListener('loadedmetadata', () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) {
            setScreenshot(blob);
          }
        }, 'image/png');

        // Stop the stream
        stream.getTracks().forEach(track => track.stop());
      });
    } catch (error) {
      console.error('Screenshot capture failed:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  // Auto-resize textarea (2025 UX pattern)
  useEffect(() => {
    if (commentTextareaRef.current) {
      const textarea = commentTextareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [userComment]);

  return (
    <div className={`feedback-collector ${className}`} role="region" aria-label="Content feedback">
      {/* Initial State - Quick Feedback Buttons */}
      {feedbackState === 'initial' && (
        <div className="feedback-collector__initial">
          <div className="feedback-collector__prompt">
            <p className="feedback-collector__context-prompt">
              {getContextualPrompt()}
            </p>
          </div>

          <div className="feedback-collector__quick-actions" role="group" aria-label="Quick feedback options">
            <button
              className="feedback-collector__quick-btn feedback-collector__quick-btn--agree"
              onClick={() => handleQuickFeedback('agree')}
              disabled={isSubmitting}
              aria-label="I agree with this credibility assessment"
            >
              <span className="feedback-collector__icon" aria-hidden="true">👍</span>
              <span className="feedback-collector__label">Accurate</span>
            </button>

            <button
              className="feedback-collector__quick-btn feedback-collector__quick-btn--disagree"
              onClick={() => handleQuickFeedback('disagree')}
              disabled={isSubmitting}
              aria-label="I disagree with this credibility assessment"
            >
              <span className="feedback-collector__icon" aria-hidden="true">👎</span>
              <span className="feedback-collector__label">Inaccurate</span>
            </button>
          </div>

          {/* Progressive Disclosure - Expand Options */}
          <div className="feedback-collector__expand-options">
            <button
              className="feedback-collector__expand-btn"
              onClick={handleExpandFeedback}
              disabled={isSubmitting}
              aria-label="Provide detailed feedback"
            >
              <span className="feedback-collector__icon" aria-hidden="true">💬</span>
              Add Details
            </button>

            <button
              className="feedback-collector__expand-btn feedback-collector__expand-btn--report"
              onClick={handleIssueReport}
              disabled={isSubmitting}
              aria-label="Report an issue with this assessment"
            >
              <span className="feedback-collector__icon" aria-hidden="true">⚠️</span>
              Report Issue
            </button>
          </div>
        </div>
      )}

      {/* Expanded Detailed Feedback Form */}
      {(feedbackState === 'expanded' || feedbackState === 'issue_report') && (
        <div
          className="feedback-collector__expanded"
          ref={expandedFormRef}
          role="form"
          aria-label={feedbackState === 'issue_report' ? 'Issue report form' : 'Detailed feedback form'}
        >
          <div className="feedback-collector__form-header">
            <h3 className="feedback-collector__form-title">
              {feedbackState === 'issue_report' ? 'Report Issue' : 'Detailed Feedback'}
            </h3>
            <button
              className="feedback-collector__close-btn"
              onClick={() => setFeedbackState('initial')}
              aria-label="Close feedback form"
              disabled={isSubmitting}
            >
              ✕
            </button>
          </div>

          {/* Issue Category Selection (for issue reports) */}
          {feedbackState === 'issue_report' && (
            <div className="feedback-collector__field">
              <label htmlFor="issue-category" className="feedback-collector__label">
                Issue Type
              </label>
              <select
                id="issue-category"
                className="feedback-collector__select"
                value={issueCategory}
                onChange={(e) => setIssueCategory(e.target.value as FeedbackData['issueCategory'])}
                disabled={isSubmitting}
              >
                <option value="factual_error">Factual Error in Assessment</option>
                <option value="bias_detection">Bias Detection Issue</option>
                <option value="source_reliability">Source Reliability Problem</option>
                <option value="technical_issue">Technical Issue</option>
                <option value="other">Other</option>
              </select>
            </div>
          )}

          {/* Comment Field */}
          <div className="feedback-collector__field">
            <label htmlFor="feedback-comment" className="feedback-collector__label">
              {feedbackState === 'issue_report' ? 'Describe the issue' : 'Your feedback'}
              <span className="feedback-collector__label-hint">
                {feedbackState === 'issue_report'
                  ? 'Help us understand what went wrong'
                  : 'What made you agree or disagree with our assessment?'
                }
              </span>
            </label>
            <textarea
              id="feedback-comment"
              ref={commentTextareaRef}
              className="feedback-collector__textarea"
              value={userComment}
              onChange={(e) => setUserComment(e.target.value)}
              placeholder={
                feedbackState === 'issue_report'
                  ? "Please describe the specific issue you encountered..."
                  : "Share your thoughts on the credibility assessment..."
              }
              disabled={isSubmitting}
              rows={3}
              maxLength={1000}
              aria-describedby="char-count"
            />
            <div className="feedback-collector__char-count" id="char-count">
              {userComment.length}/1000 characters
            </div>
          </div>

          {/* Confidence Slider */}
          <div className="feedback-collector__field">
            <label htmlFor="confidence-slider" className="feedback-collector__label">
              Confidence Level: {Math.round(confidence * 100)}%
              <span className="feedback-collector__label-hint">
                How confident are you in your assessment?
              </span>
            </label>
            <input
              id="confidence-slider"
              type="range"
              className="feedback-collector__slider"
              min="0"
              max="1"
              step="0.1"
              value={confidence}
              onChange={(e) => setConfidence(parseFloat(e.target.value))}
              disabled={isSubmitting}
              aria-label="Confidence level slider"
            />
          </div>

          {/* Screenshot Capture (for issue reports) */}
          {feedbackState === 'issue_report' && (
            <div className="feedback-collector__field">
              <div className="feedback-collector__screenshot-section">
                <button
                  className="feedback-collector__screenshot-btn"
                  onClick={captureScreenshot}
                  disabled={isSubmitting || isCapturing}
                  aria-label="Capture screenshot to attach to report"
                >
                  <span className="feedback-collector__icon" aria-hidden="true">📷</span>
                  {isCapturing ? 'Capturing...' : 'Add Screenshot'}
                </button>

                {screenshot && (
                  <div className="feedback-collector__screenshot-preview">
                    <span className="feedback-collector__screenshot-info">Screenshot attached</span>
                    <button
                      className="feedback-collector__screenshot-remove"
                      onClick={() => setScreenshot(null)}
                      disabled={isSubmitting}
                      aria-label="Remove screenshot"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="feedback-collector__actions">
            <button
              className="feedback-collector__submit-btn"
              onClick={handleDetailedFeedback}
              disabled={isSubmitting || !userComment.trim()}
              aria-label="Submit feedback"
            >
              {isSubmitting ? (
                <>
                  <span className="feedback-collector__spinner" aria-hidden="true"></span>
                  Submitting...
                </>
              ) : (
                `Submit ${feedbackState === 'issue_report' ? 'Report' : 'Feedback'}`
              )}
            </button>

            <button
              className="feedback-collector__cancel-btn"
              onClick={() => setFeedbackState('initial')}
              disabled={isSubmitting}
              aria-label="Cancel and go back"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Success State */}
      {hasUserInteracted && feedbackState === 'initial' && (
        <div className="feedback-collector__success" role="status" aria-live="polite">
          <span className="feedback-collector__success-icon" aria-hidden="true">✅</span>
          <span className="feedback-collector__success-message">
            Thank you for your feedback! Your input helps improve our credibility assessments.
          </span>
        </div>
      )}
    </div>
  );
};

export default FeedbackCollector;
