/**
 * Community Consensus Panel - 2025 Premium Feature
 *
 * Features:
 * - Real-time consensus data visualization
 * - Interactive elements with tooltips and filters
 * - Premium feature gating with upgrade prompts
 * - Dynamic thresholds and contextual insights
 * - Accessibility compliance and mobile responsiveness
 */

import React, { useState, useEffect, useRef } from 'react';
import { CredibilityScore } from '@shared/types';
import { feedbackService, type CommunityConsensus } from '@shared/services';
import { useSubscriptionManager } from '../../hooks/useSubscriptionManager';
import '../styles/CommunityConsensus.css';

export interface CommunityConsensusPanelProps {
  credibilityScore: CredibilityScore;
  url: string;
  onUpgradeClick?: () => void;
  className?: string;
}

interface TrendingReport {
  id: string;
  type: 'misinformation' | 'bias' | 'factual_error' | 'manipulation';
  title: string;
  confidence: number;
  reportCount: number;
  lastReported: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export const CommunityConsensusPanel: React.FC<CommunityConsensusPanelProps> = ({
  credibilityScore,
  url,
  onUpgradeClick,
  className = ''
}) => {
  // State management
  const { subscription, isLoading: subscriptionLoading } = useSubscriptionManager();
  const [consensus, setConsensus] = useState<CommunityConsensus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'overview' | 'trends' | 'details'>('overview');
  const [trendingReports, setTrendingReports] = useState<TrendingReport[]>([]);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  // Refs for real-time updates
  const updateInterval = useRef<NodeJS.Timeout | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const isPremium = subscription?.tier === 'premium';

  // Real-time data fetching
  useEffect(() => {
    if (isPremium && url) {
      fetchConsensusData();

      // Set up real-time updates every 30 seconds
      updateInterval.current = setInterval(() => {
        fetchConsensusData();
      }, 30000);

      return () => {
        if (updateInterval.current) {
          clearInterval(updateInterval.current);
        }
      };
    }
  }, [isPremium, url]);

  const fetchConsensusData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [consensusData, trendingData] = await Promise.all([
        feedbackService.getCommunityConsensus(url),
        fetchTrendingReports(url)
      ]);

      setConsensus(consensusData);
      setTrendingReports(trendingData);
      setLastUpdate(Date.now());

    } catch (err) {
      console.error('Failed to fetch consensus data:', err);
      setError('Failed to load community data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTrendingReports = async (url: string): Promise<TrendingReport[]> => {
    // Mock trending reports - in production, this would come from the backend
    return [
      {
        id: 'trend_1',
        type: 'bias',
        title: 'Political bias detected in source framing',
        confidence: 0.85,
        reportCount: 12,
        lastReported: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
        severity: 'medium'
      },
      {
        id: 'trend_2',
        type: 'factual_error',
        title: 'Statistical claims lack proper citation',
        confidence: 0.72,
        reportCount: 8,
        lastReported: Date.now() - 5 * 60 * 60 * 1000, // 5 hours ago
        severity: 'high'
      }
    ];
  };

  const getConsensusStrengthLabel = (strength: number): string => {
    if (strength >= 0.8) return 'Very Strong';
    if (strength >= 0.6) return 'Strong';
    if (strength >= 0.4) return 'Moderate';
    if (strength >= 0.2) return 'Weak';
    return 'Very Weak';
  };

  const getTrendIcon = (direction: CommunityConsensus['trendDirection']): string => {
    switch (direction) {
      case 'positive': return '📈';
      case 'negative': return '📉';
      default: return '➡️';
    }
  };

  const getSeverityColor = (severity: TrendingReport['severity']): string => {
    switch (severity) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#d97706';
      case 'low': return '#65a30d';
      default: return '#6b7280';
    }
  };

  const formatTimeAgo = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  // Component renders

  if (subscriptionLoading) {
    return (
      <div className={`consensus-panel consensus-panel--loading ${className}`}>
        <div className="consensus-panel__spinner">
          <div className="spinner"></div>
          <span>Loading consensus data...</span>
        </div>
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className={`consensus-panel consensus-panel--premium-required ${className}`}>
        <div className="consensus-panel__premium-prompt">
          <div className="consensus-panel__premium-icon">🏛️</div>
          <h3>Community Consensus</h3>
          <p className="consensus-panel__premium-description">
            See what the community thinks about this content's credibility.
            Access real-time consensus data, trending reports, and trust indicators.
          </p>

          <div className="consensus-panel__preview-features">
            <div className="consensus-panel__preview-item">
              <span className="consensus-panel__preview-icon">📊</span>
              <span>Agreement percentage & trends</span>
            </div>
            <div className="consensus-panel__preview-item">
              <span className="consensus-panel__preview-icon">🔍</span>
              <span>Trending misinformation reports</span>
            </div>
            <div className="consensus-panel__preview-item">
              <span className="consensus-panel__preview-icon">⭐</span>
              <span>Community trust indicators</span>
            </div>
          </div>

          <button
            className="consensus-panel__upgrade-btn"
            onClick={onUpgradeClick}
          >
            Upgrade to Premium
          </button>
          <div className="consensus-panel__trial-info">
            <small>7-day free trial • Cancel anytime</small>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading && !consensus) {
    return (
      <div className={`consensus-panel consensus-panel--loading ${className}`}>
        <div className="consensus-panel__spinner">
          <div className="spinner"></div>
          <span>Analyzing community consensus...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`consensus-panel consensus-panel--error ${className}`}>
        <div className="consensus-panel__error">
          <div className="consensus-panel__error-icon">⚠️</div>
          <div className="consensus-panel__error-content">
            <h4>Data Unavailable</h4>
            <p>{error}</p>
            <button
              className="consensus-panel__retry-btn"
              onClick={fetchConsensusData}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!consensus || consensus.totalFeedback === 0) {
    return (
      <div className={`consensus-panel consensus-panel--no-data ${className}`}>
        <div className="consensus-panel__placeholder">
          <div className="consensus-panel__placeholder-icon">🏛️</div>
          <h4>No Community Data Yet</h4>
          <p>Be the first to share feedback on this content's credibility.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`consensus-panel ${className}`}>
      {/* Header */}
      <div className="consensus-panel__header">
        <div className="consensus-panel__title">
          <h3>🏛️ Community Consensus</h3>
          <div className="consensus-panel__badge">Premium</div>
        </div>

        <div className="consensus-panel__last-update">
          <span className="consensus-panel__update-time">
            Updated {formatTimeAgo(lastUpdate)}
          </span>
          <div
            className="consensus-panel__live-indicator"
            title="Real-time updates enabled"
          >
            🔴 Live
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="consensus-panel__tabs" role="tablist">
        <button
          className={`consensus-panel__tab ${activeView === 'overview' ? 'consensus-panel__tab--active' : ''}`}
          onClick={() => setActiveView('overview')}
          role="tab"
          aria-selected={activeView === 'overview'}
        >
          Overview
        </button>
        <button
          className={`consensus-panel__tab ${activeView === 'trends' ? 'consensus-panel__tab--active' : ''}`}
          onClick={() => setActiveView('trends')}
          role="tab"
          aria-selected={activeView === 'trends'}
        >
          Trending Reports
        </button>
        <button
          className={`consensus-panel__tab ${activeView === 'details' ? 'consensus-panel__tab--active' : ''}`}
          onClick={() => setActiveView('details')}
          role="tab"
          aria-selected={activeView === 'details'}
        >
          Details
        </button>
      </div>

      {/* Content */}
      <div className="consensus-panel__content">

        {/* Overview Tab */}
        {activeView === 'overview' && (
          <div className="consensus-panel__overview" role="tabpanel">

            {/* Main Consensus Visualization */}
            <div className="consensus-panel__main-visual" ref={chartRef}>
              <div className="consensus-panel__agreement-chart">
                <div className="consensus-panel__chart-container">
                  <div
                    className="consensus-panel__agreement-bar"
                    style={{ width: `${consensus.agreementRate * 100}%` }}
                    aria-label={`${Math.round(consensus.agreementRate * 100)}% agreement`}
                  ></div>
                  <div
                    className="consensus-panel__disagreement-bar"
                    style={{ width: `${consensus.disagreementRate * 100}%` }}
                    aria-label={`${Math.round(consensus.disagreementRate * 100)}% disagreement`}
                  ></div>
                </div>

                <div className="consensus-panel__chart-labels">
                  <div className="consensus-panel__label consensus-panel__label--agree">
                    <span className="consensus-panel__label-icon">👍</span>
                    <span className="consensus-panel__label-text">
                      {Math.round(consensus.agreementRate * 100)}% Agree
                    </span>
                  </div>
                  <div className="consensus-panel__label consensus-panel__label--disagree">
                    <span className="consensus-panel__label-icon">👎</span>
                    <span className="consensus-panel__label-text">
                      {Math.round(consensus.disagreementRate * 100)}% Disagree
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="consensus-panel__metrics">
              <div className="consensus-panel__metric">
                <div className="consensus-panel__metric-value">
                  {consensus.totalFeedback}
                </div>
                <div className="consensus-panel__metric-label">
                  Community Voices
                </div>
              </div>

              <div className="consensus-panel__metric">
                <div className="consensus-panel__metric-value">
                  {getConsensusStrengthLabel(consensus.consensusStrength)}
                </div>
                <div className="consensus-panel__metric-label">
                  Consensus Strength
                </div>
              </div>

              <div className="consensus-panel__metric">
                <div className="consensus-panel__metric-value">
                  <span className="consensus-panel__trend-icon">
                    {getTrendIcon(consensus.trendDirection)}
                  </span>
                  {consensus.trendDirection}
                </div>
                <div className="consensus-panel__metric-label">
                  7-Day Trend
                </div>
              </div>
            </div>

            {/* Trust Indicator */}
            <div className="consensus-panel__trust-indicator">
              <div className="consensus-panel__trust-header">
                <span className="consensus-panel__trust-icon">⭐</span>
                <span className="consensus-panel__trust-title">Community Trust</span>
              </div>
              <div className="consensus-panel__trust-bar">
                <div
                  className="consensus-panel__trust-fill"
                  style={{ width: `${consensus.communityTrust * 100}%` }}
                ></div>
              </div>
              <div className="consensus-panel__trust-label">
                {Math.round(consensus.communityTrust * 100)}% trust score
              </div>
            </div>
          </div>
        )}

        {/* Trending Reports Tab */}
        {activeView === 'trends' && (
          <div className="consensus-panel__trends" role="tabpanel">
            {trendingReports.length > 0 ? (
              <div className="consensus-panel__reports-list">
                {trendingReports.map(report => (
                  <div key={report.id} className="consensus-panel__report-item">
                    <div className="consensus-panel__report-header">
                      <div className="consensus-panel__report-type">
                        <span
                          className="consensus-panel__severity-dot"
                          style={{ backgroundColor: getSeverityColor(report.severity) }}
                        ></span>
                        <span className="consensus-panel__report-category">
                          {report.type.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="consensus-panel__report-time">
                        {formatTimeAgo(report.lastReported)}
                      </div>
                    </div>

                    <div className="consensus-panel__report-content">
                      <h4 className="consensus-panel__report-title">
                        {report.title}
                      </h4>
                      <div className="consensus-panel__report-stats">
                        <span className="consensus-panel__report-count">
                          {report.reportCount} reports
                        </span>
                        <span className="consensus-panel__report-confidence">
                          {Math.round(report.confidence * 100)}% confidence
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="consensus-panel__no-trends">
                <div className="consensus-panel__no-trends-icon">📊</div>
                <h4>No Trending Reports</h4>
                <p>No significant issues reported for this content recently.</p>
              </div>
            )}
          </div>
        )}

        {/* Details Tab */}
        {activeView === 'details' && (
          <div className="consensus-panel__details" role="tabpanel">
            <div className="consensus-panel__detail-grid">

              <div className="consensus-panel__detail-item">
                <div className="consensus-panel__detail-label">Total Feedback</div>
                <div className="consensus-panel__detail-value">{consensus.totalFeedback}</div>
              </div>

              <div className="consensus-panel__detail-item">
                <div className="consensus-panel__detail-label">Issue Reports</div>
                <div className="consensus-panel__detail-value">{consensus.issueReports}</div>
              </div>

              <div className="consensus-panel__detail-item">
                <div className="consensus-panel__detail-label">Confidence Level</div>
                <div className="consensus-panel__detail-value">{consensus.confidenceLevel}</div>
              </div>

              <div className="consensus-panel__detail-item">
                <div className="consensus-panel__detail-label">Last Updated</div>
                <div className="consensus-panel__detail-value">
                  {formatTimeAgo(consensus.lastUpdated)}
                </div>
              </div>

              <div className="consensus-panel__detail-item">
                <div className="consensus-panel__detail-label">Consensus Strength</div>
                <div className="consensus-panel__detail-value">
                  {Math.round(consensus.consensusStrength * 100)}%
                </div>
              </div>

              <div className="consensus-panel__detail-item">
                <div className="consensus-panel__detail-label">Community Trust</div>
                <div className="consensus-panel__detail-value">
                  {Math.round(consensus.communityTrust * 100)}%
                </div>
              </div>
            </div>

            {/* Educational Note */}
            <div className="consensus-panel__educational-note">
              <div className="consensus-panel__note-icon">💡</div>
              <div className="consensus-panel__note-content">
                <strong>Understanding Consensus:</strong> Community consensus reflects
                the collective assessment of users who have reviewed this content.
                Higher consensus strength indicates greater agreement among reviewers.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityConsensusPanel;
