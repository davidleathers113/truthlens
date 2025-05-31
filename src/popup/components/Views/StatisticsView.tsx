import React from 'react';
import { PopupView } from '../Layout/PopupRouter';

interface StatisticsViewProps {
  onNavigate: (view: PopupView) => void;
}

export const StatisticsView: React.FC<StatisticsViewProps> = ({ onNavigate }) => {
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
      </header>

      <main className="statistics-content">
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Checks Performed</h3>
            <span className="stat-number">42</span>
          </div>

          <div className="stat-card">
            <h3>Sites Analyzed</h3>
            <span className="stat-number">28</span>
          </div>

          <div className="stat-card">
            <h3>Avg. Credibility</h3>
            <span className="stat-number">78</span>
          </div>

          <div className="stat-card">
            <h3>Flagged Sites</h3>
            <span className="stat-number">3</span>
          </div>
        </div>

        <div className="time-filter">
          <button className="filter-btn active">Today</button>
          <button className="filter-btn">Week</button>
          <button className="filter-btn">Month</button>
        </div>

        <div className="chart-placeholder">
          <p>📊 Credibility trends chart will go here</p>
        </div>
      </main>
    </div>
  );
};
