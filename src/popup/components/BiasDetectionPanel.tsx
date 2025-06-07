import React, { useState, useEffect } from 'react';
import { AdvancedBiasDetectionResult, ContentAnalysis } from '@shared/types';
import { BiasVisualization } from './BiasVisualization';
import { useSubscriptionManager } from '../hooks/useSubscriptionManager';
import { biasDetectionService } from '@shared/services';
import './BiasDetectionPanel.css';

interface BiasDetectionPanelProps {
  contentAnalysis?: ContentAnalysis;
  onUpgradeClick?: () => void;
}

export const BiasDetectionPanel: React.FC<BiasDetectionPanelProps> = ({
  contentAnalysis,
  onUpgradeClick
}) => {
  const { subscription, isLoading: subscriptionLoading } = useSubscriptionManager();
  const [biasResult, setBiasResult] = useState<AdvancedBiasDetectionResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPremium = subscription?.tier === 'premium';

  useEffect(() => {
    if (contentAnalysis && !isAnalyzing) {
      performBiasAnalysis();
    }
  }, [contentAnalysis, isPremium]);

  const performBiasAnalysis = async () => {
    if (!contentAnalysis) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await biasDetectionService.analyzeContentBias(
        contentAnalysis,
        isPremium
      );
      setBiasResult(result);
    } catch (err) {
      console.error('Bias analysis failed:', err);
      setError('Failed to analyze content bias. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleManualAnalysis = () => {
    if (contentAnalysis) {
      performBiasAnalysis();
    }
  };

  if (subscriptionLoading || isAnalyzing) {
    return (
      <div className="bias-detection-panel bias-detection-panel--loading">
        <div className="bias-detection-panel__spinner">
          <div className="spinner"></div>
          <span>
            {subscriptionLoading ? 'Checking subscription...' : 'Analyzing content bias...'}
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bias-detection-panel bias-detection-panel--error">
        <div className="bias-detection-panel__error">
          <div className="bias-detection-panel__error-icon">⚠️</div>
          <div className="bias-detection-panel__error-content">
            <h4>Analysis Error</h4>
            <p>{error}</p>
            <button
              className="bias-detection-panel__retry-btn"
              onClick={handleManualAnalysis}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!contentAnalysis) {
    return (
      <div className="bias-detection-panel bias-detection-panel--no-content">
        <div className="bias-detection-panel__placeholder">
          <div className="bias-detection-panel__placeholder-icon">🔍</div>
          <h4>No Content Selected</h4>
          <p>Navigate to a webpage to analyze its bias patterns</p>
        </div>
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="bias-detection-panel bias-detection-panel--premium-required">
        <div className="bias-detection-panel__premium-prompt">
          <div className="bias-detection-panel__premium-icon">⭐</div>
          <h3>Advanced Bias Detection</h3>
          <div className="bias-detection-panel__features">
            <ul>
              <li>Political spectrum analysis</li>
              <li>Emotional bias detection</li>
              <li>Source bias correlation</li>
              <li>Media literacy education</li>
              <li>Balanced source recommendations</li>
            </ul>
          </div>
          <button
            className="bias-detection-panel__upgrade-btn"
            onClick={onUpgradeClick}
          >
            Upgrade to Premium
          </button>
          <div className="bias-detection-panel__trial-info">
            <small>7-day free trial • Cancel anytime</small>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bias-detection-panel">
      <div className="bias-detection-panel__header">
        <div className="bias-detection-panel__title">
          <h3>🎯 Bias Analysis</h3>
          <div className="bias-detection-panel__badge">Premium</div>
        </div>

        {contentAnalysis && (
          <div className="bias-detection-panel__content-info">
            <div className="bias-detection-panel__url">
              {new URL(contentAnalysis.url).hostname}
            </div>
            <button
              className="bias-detection-panel__refresh-btn"
              onClick={handleManualAnalysis}
              disabled={isAnalyzing}
              title="Refresh Analysis"
            >
              🔄
            </button>
          </div>
        )}
      </div>

      {biasResult && (
        <BiasVisualization
          biasResult={biasResult}
          isPremium={isPremium}
          onUpgrade={onUpgradeClick}
        />
      )}

      <div className="bias-detection-panel__educational-note">
        <div className="bias-detection-panel__note-icon">💡</div>
        <div className="bias-detection-panel__note-content">
          <strong>Educational Purpose:</strong> This analysis helps identify potential bias patterns
          to improve media literacy. Always consider multiple sources and perspectives.
        </div>
      </div>
    </div>
  );
};

export default BiasDetectionPanel;
