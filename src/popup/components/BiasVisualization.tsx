import React, { useState, useEffect } from 'react';
import {
  PoliticalBiasVisualization,
  BiasEducationData,
  AdvancedBiasDetectionResult
} from '@shared/types/bias';
import './BiasVisualization.css';

interface BiasVisualizationProps {
  biasResult: AdvancedBiasDetectionResult;
  isPremium: boolean;
  onUpgrade?: () => void;
}

export const BiasVisualization: React.FC<BiasVisualizationProps> = ({
  biasResult,
  isPremium,
  onUpgrade
}) => {
  const [activeTab, setActiveTab] = useState<'spectrum' | 'factors' | 'education'>('spectrum');
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  if (!isPremium) {
    return (
      <div className="bias-visualization bias-visualization--locked">
        <div className="bias-visualization__premium-prompt">
          <div className="bias-visualization__lock-icon">🔒</div>
          <h3>Advanced Bias Analysis</h3>
          <p>Get detailed political bias detection, emotional analysis, and media literacy guidance.</p>
          <button
            className="bias-visualization__upgrade-btn"
            onClick={onUpgrade}
          >
            Upgrade to Premium
          </button>
        </div>
      </div>
    );
  }

  const renderPoliticalSpectrum = () => {
    const { politicalAnalysis, visualizationData } = biasResult;
    const position = politicalAnalysis.leaningScore;
    const confidence = politicalAnalysis.confidence;

    // Calculate position on spectrum (0-100 scale)
    const spectrumPosition = ((position + 10) / 20) * 100;

    const getColorForPosition = (pos: number) => {
      if (pos < -6) return '#2563eb'; // Far left - blue
      if (pos < -3) return '#3b82f6'; // Left - light blue
      if (pos < -1) return '#93c5fd'; // Center-left - very light blue
      if (pos > 6) return '#dc2626';  // Far right - red
      if (pos > 3) return '#ef4444';  // Right - light red
      if (pos > 1) return '#fca5a5';  // Center-right - very light red
      return '#6b7280'; // Center - gray
    };

    return (
      <div className="bias-spectrum">
        <div className="bias-spectrum__header">
          <h4>Political Spectrum Analysis</h4>
          <div className="bias-spectrum__confidence">
            Confidence: {Math.round(confidence * 100)}%
          </div>
        </div>

        <div className="bias-spectrum__scale">
          <div className="bias-spectrum__labels">
            <span>Far Left</span>
            <span>Left</span>
            <span>Center</span>
            <span>Right</span>
            <span>Far Right</span>
          </div>

          <div className="bias-spectrum__track">
            <div className="bias-spectrum__gradient"></div>
            <div
              className="bias-spectrum__indicator"
              style={{
                left: `${spectrumPosition}%`,
                backgroundColor: getColorForPosition(position),
                opacity: confidence
              }}
              onMouseEnter={() => setShowTooltip('spectrum')}
              onMouseLeave={() => setShowTooltip(null)}
            >
              <div className="bias-spectrum__marker"></div>
              {showTooltip === 'spectrum' && (
                <div className="bias-spectrum__tooltip">
                  <strong>{politicalAnalysis.category}</strong><br/>
                  Score: {position.toFixed(1)}<br/>
                  Confidence: {Math.round(confidence * 100)}%
                </div>
              )}
            </div>
          </div>

          <div className="bias-spectrum__scale-numbers">
            <span>-10</span>
            <span>-5</span>
            <span>0</span>
            <span>5</span>
            <span>10</span>
          </div>
        </div>

        <div className="bias-spectrum__explanation">
          <p>{politicalAnalysis.explanation}</p>
        </div>

        {visualizationData.politicalSpectrum.comparison.similarSources.length > 0 && (
          <div className="bias-spectrum__comparison">
            <h5>Similar Sources</h5>
            <div className="bias-spectrum__similar-sources">
              {visualizationData.politicalSpectrum.comparison.similarSources.map((source, index) => (
                <div key={index} className="bias-spectrum__source">
                  <span className="bias-spectrum__source-name">{source.domain}</span>
                  <div className="bias-spectrum__source-position">
                    <div
                      className="bias-spectrum__source-indicator"
                      style={{
                        left: `${((source.historicalLean + 10) / 20) * 100}%`,
                        backgroundColor: getColorForPosition(source.historicalLean)
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderBiasFactors = () => {
    const { visualizationData } = biasResult;
    const factors = visualizationData.biasFactors;

    const factorLabels = {
      language: 'Language Choice',
      framing: 'Story Framing',
      sourceAttribution: 'Source Attribution',
      topicSelection: 'Topic Selection',
      factPresentation: 'Fact Presentation'
    };

    return (
      <div className="bias-factors">
        <div className="bias-factors__header">
          <h4>Bias Factor Analysis</h4>
          <p>How different elements contribute to the overall bias assessment</p>
        </div>

        <div className="bias-factors__chart">
          {Object.entries(factors).map(([key, value]) => (
            <div key={key} className="bias-factors__factor">
              <div className="bias-factors__label">
                {factorLabels[key as keyof typeof factorLabels]}
              </div>
              <div className="bias-factors__bar-container">
                <div
                  className="bias-factors__bar"
                  style={{ width: `${value}%` }}
                ></div>
                <span className="bias-factors__value">{Math.round(value)}%</span>
              </div>
            </div>
          ))}
        </div>

        <div className="bias-factors__indicators">
          <h5>Key Indicators Detected</h5>
          <div className="bias-factors__indicator-list">
            {biasResult.politicalAnalysis.indicators.map((indicator, index) => (
              <div key={index} className="bias-factors__indicator">
                <div className="bias-factors__indicator-type">
                  {indicator.type.replace('-', ' ').toUpperCase()}
                </div>
                <div className="bias-factors__indicator-description">
                  {indicator.description}
                </div>
                <div className="bias-factors__indicator-evidence">
                  {indicator.evidence.map((evidence, evidenceIndex) => (
                    <span key={evidenceIndex} className="bias-factors__evidence-item">
                      "{evidence}"
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderEducationalContent = () => {
    const { educationalContent, recommendations } = biasResult;

    return (
      <div className="bias-education">
        <div className="bias-education__header">
          <h4>Media Literacy Guidance</h4>
          <p>Learn to identify and understand bias in media content</p>
        </div>

        {educationalContent.map((content, index) => (
          <div key={index} className="bias-education__section">
            <h5>{content.biasType}</h5>

            <div className="bias-education__explanation">
              <h6>What it means:</h6>
              <p>{content.explanation}</p>
            </div>

            <div className="bias-education__importance">
              <h6>Why it matters:</h6>
              <p>{content.whyItMatters}</p>
            </div>

            <div className="bias-education__identification">
              <h6>How to identify it:</h6>
              <ul>
                {content.howToIdentify.map((tip, tipIndex) => (
                  <li key={tipIndex}>{tip}</li>
                ))}
              </ul>
            </div>

            <div className="bias-education__tips">
              <h6>Media literacy tips:</h6>
              <ul>
                {content.mediaLiteracyTips.map((tip, tipIndex) => (
                  <li key={tipIndex}>{tip}</li>
                ))}
              </ul>
            </div>

            {content.balancedSources.length > 0 && (
              <div className="bias-education__sources">
                <h6>Balanced sources to consider:</h6>
                <div className="bias-education__source-list">
                  {content.balancedSources.map((source, sourceIndex) => (
                    <span key={sourceIndex} className="bias-education__source">
                      {source}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        <div className="bias-education__recommendations">
          <h5>Recommendations for Balanced Information</h5>

          <div className="bias-education__recommendation-section">
            <h6>Balancing Perspectives:</h6>
            <ul>
              {recommendations.balancingPerspectives.map((perspective, index) => (
                <li key={index}>{perspective}</li>
              ))}
            </ul>
          </div>

          <div className="bias-education__recommendation-section">
            <h6>Media Literacy Guidance:</h6>
            <ul>
              {recommendations.mediaLiteracyGuidance.map((guidance, index) => (
                <li key={index}>{guidance}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bias-visualization">
      <div className="bias-visualization__header">
        <h3>Advanced Bias Analysis</h3>
        <div className="bias-visualization__tabs">
          <button
            className={`bias-visualization__tab ${activeTab === 'spectrum' ? 'active' : ''}`}
            onClick={() => setActiveTab('spectrum')}
          >
            Political Spectrum
          </button>
          <button
            className={`bias-visualization__tab ${activeTab === 'factors' ? 'active' : ''}`}
            onClick={() => setActiveTab('factors')}
          >
            Bias Factors
          </button>
          <button
            className={`bias-visualization__tab ${activeTab === 'education' ? 'active' : ''}`}
            onClick={() => setActiveTab('education')}
          >
            Education
          </button>
        </div>
      </div>

      <div className="bias-visualization__content">
        {activeTab === 'spectrum' && renderPoliticalSpectrum()}
        {activeTab === 'factors' && renderBiasFactors()}
        {activeTab === 'education' && renderEducationalContent()}
      </div>

      <div className="bias-visualization__footer">
        <div className="bias-visualization__processing-info">
          Analysis completed in {biasResult.processingTime}ms
        </div>
        <div className="bias-visualization__disclaimer">
          This analysis is for educational purposes to help identify potential bias patterns.
          Always consider multiple sources and perspectives when evaluating information.
        </div>
      </div>
    </div>
  );
};

export default BiasVisualization;
