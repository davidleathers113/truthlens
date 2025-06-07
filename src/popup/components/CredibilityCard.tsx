import React from 'react';
import { CredibilityScore } from '@shared/types';

interface CredibilityCardProps {
  url: string;
  credibility: CredibilityScore | null;
}

export const CredibilityCard: React.FC<CredibilityCardProps> = ({ url, credibility }) => {
  void url; // Suppress unused warning - reserved for future use

  if (!credibility) {
    return (
      <section
        className="credibility-card"
        aria-label="Credibility Analysis"
        role="region"
      >
        <h2 className="credibility-title">Analysis Results</h2>
        <div className="no-data-container" aria-live="polite">
          <p className="no-data-message">
            No credibility data available for this page
          </p>
          <span className="sr-only">
            Click the scan button to analyze the current page for credibility
          </span>
        </div>
      </section>
    );
  }

  const getScoreDescription = (score: number): string => {
    if (score >= 80) return 'High credibility';
    if (score >= 60) return 'Moderate credibility';
    if (score >= 40) return 'Low credibility';
    return 'Very low credibility';
  };

  const getConfidenceDescription = (confidence: number): string => {
    const percentage = Math.round(confidence * 100);
    if (percentage >= 90) return 'Very confident';
    if (percentage >= 70) return 'Confident';
    if (percentage >= 50) return 'Somewhat confident';
    return 'Low confidence';
  };

  const scorePercentage = Math.round(credibility.confidence * 100);

  return (
    <section
      className="credibility-card"
      aria-label="Credibility Analysis Results"
      role="region"
    >
      <h2 className="credibility-title">Analysis Results</h2>

      <div className="credibility-content">
        <div
          className="score-container"
          role="group"
          aria-labelledby="score-heading"
        >
          <h3 id="score-heading" className="score-heading sr-only">
            Credibility Score
          </h3>
          <div className="score" aria-describedby="score-description">
            <span className="score-value" aria-label={`Score: ${credibility.score} out of 100`}>
              {credibility.score}
            </span>
            <span className="score-unit" aria-hidden="true">/100</span>
          </div>
          <div id="score-description" className="score-description">
            {getScoreDescription(credibility.score)}
          </div>
        </div>

        <div
          className="level-container"
          role="group"
          aria-labelledby="level-heading"
        >
          <h3 id="level-heading" className="level-heading sr-only">
            Credibility Level
          </h3>
          <div className="level" aria-label={`Level: ${credibility.level}`}>
            <span className="level-label">Level:</span>
            <span className="level-value">{credibility.level}</span>
          </div>
        </div>

        <div
          className="confidence-container"
          role="group"
          aria-labelledby="confidence-heading"
        >
          <h3 id="confidence-heading" className="confidence-heading sr-only">
            Analysis Confidence
          </h3>
          <div className="confidence" aria-describedby="confidence-description">
            <span className="confidence-label">Confidence:</span>
            <span
              className="confidence-value"
              aria-label={`${scorePercentage}% confidence - ${getConfidenceDescription(credibility.confidence)}`}
            >
              {scorePercentage}%
            </span>
          </div>
          <div id="confidence-description" className="confidence-description sr-only">
            {getConfidenceDescription(credibility.confidence)}
          </div>
        </div>
      </div>

      {/* Screen reader summary */}
      <div className="sr-only" aria-live="polite">
        Analysis complete: {getScoreDescription(credibility.score)} with {scorePercentage}% confidence.
        Overall level is {credibility.level}.
      </div>
    </section>
  );
};
