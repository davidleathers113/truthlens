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
      <div className="credibility-card">
        <p>No credibility data available</p>
      </div>
    );
  }

  return (
    <div className="credibility-card">
      <div className="score">Score: {credibility.score}</div>
      <div className="level">Level: {credibility.level}</div>
      <div className="confidence">Confidence: {Math.round(credibility.confidence * 100)}%</div>
    </div>
  );
};
