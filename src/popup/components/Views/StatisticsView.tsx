import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PopupView } from '../Layout/PopupRouter';
import { useExtension } from '../../contexts/ExtensionContext';
import '../../styles/StatisticsView.css';

interface StatisticsViewProps {
  onNavigate: (view: PopupView) => void;
}

type TimeFilter = 'today' | 'week' | 'month' | 'all';

interface StatData {
  checksPerformed: number;
  sitesAnalyzed: number;
  averageCredibility: number;
  flaggedSites: number;
  timeSeriesData: Array<{
    date: string;
    checks: number;
    credibility: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    value: number;
    color: string;
  }>;
}

const StatCard: React.FC<{
  title: string;
  value: number | string;
  subtitle?: string;
  trend?: number;
  icon: string;
  color: string;
  delay: number;
}> = ({ title, value, subtitle, trend, icon, color, delay }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`stat-card ${isVisible ? 'visible' : ''}`}
      style={{ '--card-color': color } as React.CSSProperties}
    >
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <h3 className="stat-title">{title}</h3>
        <div className="stat-value-container">
          <span className="stat-value">{value}</span>
          {trend !== undefined && (
            <span className={`stat-trend ${trend >= 0 ? 'positive' : 'negative'}`}>
              {trend >= 0 ? '↗' : '↘'} {Math.abs(trend)}%
            </span>
          )}
        </div>
        {subtitle && <span className="stat-subtitle">{subtitle}</span>}
      </div>
      <div className="stat-background" />
    </div>
  );
};

const MiniChart: React.FC<{
  data: Array<{ value: number }>;
  type: 'line' | 'bar';
  color: string;
}> = ({ data, type, color }) => {
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="mini-chart">
      {data.map((point, index) => {
        const height = (point.value / maxValue) * 100;
        return (
          <div
            key={index}
            className={`chart-${type}`}
            style={{
              height: `${height}%`,
              backgroundColor: color,
              animationDelay: `${index * 50}ms`
            }}
          />
        );
      })}
    </div>
  );
};

const ProgressRing: React.FC<{
  progress: number;
  size: number;
  strokeWidth: number;
  color: string;
  label: string;
}> = ({ progress, size, strokeWidth, color, label }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="progress-ring-container">
      <svg width={size} height={size} className="progress-ring">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="progress-circle"
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dy="0.3em"
          className="progress-text"
        >
          {progress}%
        </text>
      </svg>
      <span className="progress-label">{label}</span>
    </div>
  );
};

export const StatisticsView: React.FC<StatisticsViewProps> = ({ onNavigate }) => {
  const { state } = useExtension();
  const [activeFilter, setActiveFilter] = useState<TimeFilter>('today');
  const [isLoading, setIsLoading] = useState(true);

  // Simulate data loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [activeFilter]);

  // Mock data generation based on real stats from context
  const statsData = useMemo((): StatData => {
    const baseStats = state.stats;
    const multiplier = activeFilter === 'today' ? 1 : activeFilter === 'week' ? 7 : 30;

    // Generate mock time series data
    const timeSeriesData = Array.from({ length: activeFilter === 'today' ? 24 : activeFilter === 'week' ? 7 : 30 }, (_, i) => ({
      date: new Date(Date.now() - (i * (activeFilter === 'today' ? 3600000 : 86400000))).toISOString(),
      checks: Math.floor(Math.random() * 10 + 5),
      credibility: Math.floor(Math.random() * 30 + 70),
    })).reverse();

    // Generate category breakdown
    const categoryBreakdown = [
      { category: 'News', value: 45, color: '#4f46e5' },
      { category: 'Social Media', value: 30, color: '#10b981' },
      { category: 'Research', value: 15, color: '#f59e0b' },
      { category: 'Other', value: 10, color: '#ef4444' },
    ];

    return {
      checksPerformed: baseStats.checksPerformed * multiplier,
      sitesAnalyzed: Math.floor(baseStats.checksPerformed * 0.7 * multiplier),
      averageCredibility: 78,
      flaggedSites: Math.floor(baseStats.checksPerformed * 0.1 * multiplier),
      timeSeriesData,
      categoryBreakdown,
    };
  }, [state.stats, activeFilter]);

  const handleFilterChange = useCallback((filter: TimeFilter) => {
    setActiveFilter(filter);
    setIsLoading(true);
  }, []);

  const getFilterLabel = (filter: TimeFilter) => {
    switch (filter) {
      case 'today': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'all': return 'All Time';
    }
  };

  if (isLoading) {
    return (
      <div className="statistics-view loading">
        <header className="view-header">
          <button
            className="back-button"
            onClick={() => onNavigate('main')}
            aria-label="Go back to main view"
          >
            ← Back
          </button>
          <h2>Statistics</h2>
        </header>
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Loading your statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="statistics-view">
      <header className="view-header">
        <button
          className="back-button"
          onClick={() => onNavigate('main')}
          aria-label="Go back to main view"
        >
          ← Back
        </button>
        <h2>Statistics</h2>
        <div className="export-button" title="Export Data">
          📊
        </div>
      </header>

      <main className="statistics-content">
        {/* Time Filter */}
        <div className="time-filter">
          {(['today', 'week', 'month', 'all'] as TimeFilter[]).map((filter) => (
            <button
              key={filter}
              className={`filter-btn ${activeFilter === filter ? 'active' : ''}`}
              onClick={() => handleFilterChange(filter)}
              aria-label={`Show statistics for ${getFilterLabel(filter)}`}
            >
              {getFilterLabel(filter)}
            </button>
          ))}
        </div>

        {/* Main Stats Grid */}
        <div className="stats-grid">
          <StatCard
            title="Checks Performed"
            value={statsData.checksPerformed.toLocaleString()}
            trend={12}
            icon="🔍"
            color="#4f46e5"
            delay={100}
          />
          <StatCard
            title="Sites Analyzed"
            value={statsData.sitesAnalyzed.toLocaleString()}
            trend={8}
            icon="🌐"
            color="#10b981"
            delay={200}
          />
          <StatCard
            title="Avg. Credibility"
            value={`${statsData.averageCredibility}%`}
            trend={-2}
            icon="⭐"
            color="#f59e0b"
            delay={300}
          />
          <StatCard
            title="Flagged Sites"
            value={statsData.flaggedSites.toLocaleString()}
            subtitle="Potential misinformation"
            icon="⚠️"
            color="#ef4444"
            delay={400}
          />
        </div>

        {/* Detailed Analytics */}
        <div className="analytics-section">
          <div className="chart-container">
            <h3>Activity Trend</h3>
            <div className="trend-chart">
              <MiniChart
                data={statsData.timeSeriesData.map(d => ({ value: d.checks }))}
                type="bar"
                color="#4f46e5"
              />
            </div>
          </div>

          <div className="breakdown-container">
            <h3>Content Categories</h3>
            <div className="category-breakdown">
              {statsData.categoryBreakdown.map((category, index) => (
                <div key={category.category} className="category-item">
                  <div className="category-info">
                    <span className="category-name">{category.category}</span>
                    <span className="category-percentage">{category.value}%</span>
                  </div>
                  <div className="category-bar">
                    <div
                      className="category-fill"
                      style={{
                        width: `${category.value}%`,
                        backgroundColor: category.color,
                        animationDelay: `${index * 100}ms`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Credibility Score Overview */}
        <div className="credibility-overview">
          <h3>Credibility Score Distribution</h3>
          <div className="score-rings">
            <ProgressRing
              progress={85}
              size={80}
              strokeWidth={8}
              color="#10b981"
              label="High"
            />
            <ProgressRing
              progress={60}
              size={80}
              strokeWidth={8}
              color="#f59e0b"
              label="Medium"
            />
            <ProgressRing
              progress={25}
              size={80}
              strokeWidth={8}
              color="#ef4444"
              label="Low"
            />
          </div>
        </div>

        {/* Insights Section */}
        <div className="insights-section">
          <h3>💡 Insights</h3>
          <div className="insight-cards">
            <div className="insight-card">
              <div className="insight-icon">📈</div>
              <div className="insight-content">
                <h4>Trending Up</h4>
                <p>Your fact-checking activity has increased by 12% this week!</p>
              </div>
            </div>
            <div className="insight-card">
              <div className="insight-icon">🎯</div>
              <div className="insight-content">
                <h4>Accuracy Boost</h4>
                <p>News sources you check have 78% average credibility - great job!</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
