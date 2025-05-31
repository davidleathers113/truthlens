import React from 'react';
import { PopupView } from '../Layout/PopupRouter';

interface PremiumViewProps {
  onNavigate: (view: PopupView) => void;
}

export const PremiumView: React.FC<PremiumViewProps> = ({ onNavigate }) => {
  return (
    <div className="premium-view">
      <header className="view-header">
        <button
          className="back-button"
          onClick={() => onNavigate('main')}
          aria-label="Go back to main view"
        >
          ← Back
        </button>
        <h2>Upgrade to Premium</h2>
      </header>

      <main className="premium-content">
        <div className="premium-hero">
          <h3>🚀 Unlock Advanced Features</h3>
          <p>Get deeper insights and premium analysis tools</p>
        </div>

        <div className="features-comparison">
          <div className="feature-column">
            <h4>Free</h4>
            <ul>
              <li>✅ Basic credibility checking</li>
              <li>✅ Visual indicators</li>
              <li>✅ 10 checks per day</li>
              <li>❌ Advanced analysis</li>
              <li>❌ Detailed reports</li>
              <li>❌ Priority support</li>
            </ul>
          </div>

          <div className="feature-column premium">
            <h4>Premium</h4>
            <ul>
              <li>✅ Everything in Free</li>
              <li>✅ Advanced AI analysis</li>
              <li>✅ Unlimited checks</li>
              <li>✅ Detailed reports</li>
              <li>✅ Source verification</li>
              <li>✅ Priority support</li>
            </ul>
          </div>
        </div>

        <div className="pricing">
          <div className="price-card">
            <h4>Monthly</h4>
            <span className="price">$9.99/month</span>
            <button className="subscribe-btn">Subscribe</button>
          </div>

          <div className="price-card popular">
            <div className="popular-badge">Most Popular</div>
            <h4>Annual</h4>
            <span className="price">$79.99/year</span>
            <span className="savings">Save 33%</span>
            <button className="subscribe-btn">Subscribe</button>
          </div>
        </div>

        <div className="guarantee">
          <p>💰 30-day money-back guarantee</p>
        </div>
      </main>
    </div>
  );
};
