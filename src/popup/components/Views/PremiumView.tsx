import React, { useState, useEffect } from 'react';
import { PopupView } from '../Layout/PopupRouter';
import { extensionPayService, PaymentResult } from '@shared/services/extensionPayService';
import { useSubscription } from '../../hooks/useStorage';
import { logger } from '@shared/services/logger';

interface PremiumViewProps {
  onNavigate: (view: PopupView) => void;
}

export const PremiumView: React.FC<PremiumViewProps> = ({ onNavigate }) => {
  const [subscription] = useSubscription();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string>('');
  const [plans, setPlans] = useState(extensionPayService.getAvailablePlans());
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    // Initialize ExtensionPay service
    extensionPayService.initialize().catch(error => {
      logger.error('Failed to initialize ExtensionPay:', error);
      setPaymentStatus('Payment system unavailable. Please try again later.');
    });

    // Listen for payment success events
    const handlePaymentSuccess = (event: CustomEvent) => {
      setShowConfirmation(true);
      setPaymentStatus('Payment successful! Welcome to Premium!');
      setTimeout(() => {
        onNavigate('main');
      }, 3000);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('truthlens:payment:success', handlePaymentSuccess as EventListener);
      return () => {
        window.removeEventListener('truthlens:payment:success', handlePaymentSuccess as EventListener);
      };
    }
  }, [onNavigate]);

  const handleSubscribe = async (planNickname: string) => {
    setIsLoading(true);
    setPaymentStatus('Opening payment page...');

    try {
      const result: PaymentResult = await extensionPayService.openPaymentPage(planNickname);

      if (result.success) {
        setPaymentStatus('Redirecting to payment...');
      } else if (result.userCancelled) {
        setPaymentStatus('Payment cancelled. You can try again anytime.');
      } else {
        setPaymentStatus(`Payment failed: ${result.error}`);
      }
    } catch (error) {
      logger.error('Payment error:', error);
      setPaymentStatus('Payment system error. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      await extensionPayService.openManagementPage();
    } catch (error) {
      logger.error('Failed to open management page:', error);
      setPaymentStatus('Could not open subscription management. Please try again.');
    }
  };

  const calculateSavings = extensionPayService.calculateAnnualSavings();
  const monthlyPlan = plans.find(p => p.interval === 'month');
  const yearlyPlan = plans.find(p => p.interval === 'year');

  // Show confirmation screen after successful payment
  if (showConfirmation) {
    return (
      <div className="premium-view confirmation">
        <div className="confirmation-content">
          <div className="success-icon">🎉</div>
          <h2>Welcome to Premium!</h2>
          <p>Your subscription is now active. Enjoy unlimited fact-checking and premium features!</p>
          <button
            className="continue-btn"
            onClick={() => onNavigate('main')}
          >
            Continue to App
          </button>
        </div>
      </div>
    );
  }

  // Show existing subscriber management
  if (subscription.tier !== 'free') {
    return (
      <div className="premium-view subscriber">
        <header className="view-header">
          <button
            className="back-button"
            onClick={() => onNavigate('main')}
            aria-label="Go back to main view"
          >
            ← Back
          </button>
          <h2>Premium Subscription</h2>
        </header>

        <main className="premium-content">
          <div className="subscription-status">
            <div className="status-icon">✅</div>
            <h3>You're a Premium subscriber!</h3>
            <p>Enjoying unlimited fact-checking and advanced features.</p>
          </div>

          <div className="subscription-actions">
            <button
              className="manage-btn"
              onClick={handleManageSubscription}
            >
              Manage Subscription
            </button>
            <button
              className="continue-btn"
              onClick={() => onNavigate('main')}
            >
              Back to App
            </button>
          </div>
        </main>
      </div>
    );
  }

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
              <li>✅ 50 checks per day</li>
              <li>✅ Top 5,000 domains</li>
              <li>❌ Advanced AI analysis</li>
              <li>❌ Bias detection</li>
              <li>❌ Detailed reports</li>
              <li>❌ All domains</li>
              <li>❌ Priority support</li>
            </ul>
          </div>

          <div className="feature-column premium">
            <h4>Premium</h4>
            <ul>
              <li>✅ Everything in Free</li>
              <li>✅ Advanced AI analysis</li>
              <li>✅ Bias detection & scoring</li>
              <li>✅ Unlimited checks</li>
              <li>✅ All domains supported</li>
              <li>✅ Detailed reports</li>
              <li>✅ Historical tracking</li>
              <li>✅ Export data</li>
              <li>✅ Priority support</li>
            </ul>
          </div>
        </div>

        <div className="pricing">
          {monthlyPlan && (
            <div className="price-card">
              <h4>{monthlyPlan.displayName}</h4>
              <span className="price">{extensionPayService.formatPrice(monthlyPlan.amount, monthlyPlan.interval)}</span>
              <p className="plan-description">{monthlyPlan.description}</p>
              <button
                className="subscribe-btn"
                onClick={() => handleSubscribe(monthlyPlan.nickname)}
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Subscribe Monthly'}
              </button>
            </div>
          )}

          {yearlyPlan && (
            <div className="price-card popular">
              <div className="popular-badge">Most Popular</div>
              <h4>{yearlyPlan.displayName}</h4>
              <span className="price">{extensionPayService.formatPrice(yearlyPlan.amount, yearlyPlan.interval)}</span>
              {calculateSavings.percentage > 0 && (
                <span className="savings">Save {calculateSavings.percentage}% (${calculateSavings.amount}/year)</span>
              )}
              <p className="plan-description">{yearlyPlan.description}</p>
              <button
                className="subscribe-btn"
                onClick={() => handleSubscribe(yearlyPlan.nickname)}
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Subscribe Annually'}
              </button>
            </div>
          )}
        </div>

        {paymentStatus && (
          <div className={`payment-status ${paymentStatus.includes('successful') ? 'success' : paymentStatus.includes('failed') || paymentStatus.includes('error') ? 'error' : 'info'}`}>
            {paymentStatus}
          </div>
        )}

        <div className="guarantee">
          <p>💰 30-day money-back guarantee</p>
          <p className="security-note">🔒 Secure payments powered by Stripe</p>
        </div>

        <div className="trust-indicators">
          <div className="trust-item">
            <span className="trust-icon">👥</span>
            <span>Join 50,000+ users</span>
          </div>
          <div className="trust-item">
            <span className="trust-icon">⭐</span>
            <span>4.8/5 rating</span>
          </div>
          <div className="trust-item">
            <span className="trust-icon">🛡️</span>
            <span>Privacy-first</span>
          </div>
        </div>
      </main>
    </div>
  );
};
