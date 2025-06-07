import React, { useState, useEffect, useCallback } from 'react';
import { usePreferences } from '../../hooks/useStorage';
import { useExtension } from '../../contexts/ExtensionContext';
import './PremiumPromo.css';

interface PremiumPromoProps {
  onUpgrade: () => void;
}

interface PromoVariant {
  id: string;
  headline: string;
  subheadline: string;
  emoji: string;
  urgencyText: string;
  ctaText: string;
  features: Array<{
    icon: string;
    title: string;
    description: string;
    isLocked?: boolean;
    progress?: number;
  }>;
  gamificationLevel?: string;
  achievementUnlock?: string;
}

// Future interfaces for enhanced features
// interface LiveActivity {
//   id: string;
//   message: string;
//   timestamp: number;
//   type: 'upgrade' | 'analysis' | 'achievement';
// }

// interface UsageProgress {
//   current: number;
//   limit: number;
//   percentage: number;
//   nextTierBenefit: string;
// }

// A/B test variants optimized for Gen Z psychology with 2025 gamification
const promoVariants: PromoVariant[] = [
  {
    id: 'power-user',
    headline: 'Level Up Your Truth Game! 🚀',
    subheadline: 'Join 50K+ users who never fall for fake news',
    emoji: '🔥',
    urgencyText: '33% OFF ends soon!',
    ctaText: 'Upgrade Now',
    gamificationLevel: 'Truth Seeker Pro',
    achievementUnlock: 'Unlock Fact-Checker Badge',
    features: [
      { icon: '⚡', title: 'Unlimited Checks', description: 'No daily limits', isLocked: true, progress: 0 },
      { icon: '🤖', title: 'AI Superpowers', description: 'Advanced analysis', isLocked: true, progress: 25 },
      { icon: '📊', title: 'Deep Reports', description: 'Source verification', isLocked: true, progress: 50 },
    ],
  },
  {
    id: 'social-proof',
    headline: 'Trusted by Smart People 🧠',
    subheadline: 'Be part of the fact-checking revolution',
    emoji: '✨',
    urgencyText: 'Limited time: 40% off',
    ctaText: 'Join Premium',
    gamificationLevel: 'Truth Guardian',
    achievementUnlock: 'Unlock Elite Status',
    features: [
      { icon: '🎯', title: 'Zero Fake News', description: 'Perfect accuracy', isLocked: true, progress: 33 },
      { icon: '⏱️', title: 'Instant Results', description: '< 2 seconds', isLocked: true, progress: 66 },
      { icon: '🔒', title: 'Privacy First', description: 'Local processing', isLocked: true, progress: 100 },
    ],
  },
];

export const PremiumPromo: React.FC<PremiumPromoProps> = ({ onUpgrade }) => {
  const [preferences, setPreferences] = usePreferences();
  const { state } = useExtension();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isAnimated, setIsAnimated] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<PromoVariant>(promoVariants[0]);
  const [showSocialProof, setShowSocialProof] = useState(false);

  // Promo management
  const promoId = 'premium-main-2025-v2';
  const isPromoDismissed = preferences.dismissedPromotions?.includes(promoId) || false;

  // Personalization based on user behavior
  useEffect(() => {
    const variant = state.stats?.checksPerformed && state.stats.checksPerformed > 10
      ? promoVariants[0] // Power user variant for active users
      : promoVariants[1]; // Social proof variant for new users

    setSelectedVariant(variant);
  }, [state.stats]);

  // Progressive reveal animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimated(true);
      // Show social proof after initial animation
      setTimeout(() => setShowSocialProof(true), 800);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = useCallback(async () => {
    setIsDismissed(true);
    try {
      const updatedPreferences = {
        ...preferences,
        dismissedPromotions: [...(preferences.dismissedPromotions || []), promoId],
      };
      await setPreferences(updatedPreferences);
    } catch (error) {
      console.error('Failed to save dismissed promotion:', error);
    }
  }, [preferences, setPreferences]);

  const handleUpgradeClick = useCallback(() => {
    // Track conversion attempt for analytics
    try {
      chrome.runtime.sendMessage({
        type: 'TRACK_CONVERSION_ATTEMPT',
        payload: { variant: selectedVariant.id, source: 'main-popup' }
      });
    } catch (error) {
      console.error('Failed to track conversion:', error);
    }
    onUpgrade();
  }, [selectedVariant.id, onUpgrade]);

  // Don't show if dismissed
  if (isPromoDismissed || isDismissed) {
    return null;
  }

  return (
    <div className={`premium-promo ${isAnimated ? 'animated' : ''}`}>
      {/* Dismiss button */}
      <button
        className="promo-dismiss"
        onClick={handleDismiss}
        aria-label="Dismiss promotion"
      >
        ✕
      </button>

      {/* Gradient background effect */}
      <div className="promo-gradient" />

      <div className="promo-content">
        {/* Header with emoji and headline */}
        <div className="promo-header">
          <div className="promo-emoji-container">
            <span className="promo-emoji" role="img" aria-label="Promotion">
              {selectedVariant.emoji}
            </span>
            <div className="promo-pulse" />
          </div>
          <h3 className="promo-headline">{selectedVariant.headline}</h3>
          <p className="promo-subheadline">{selectedVariant.subheadline}</p>
        </div>

        {/* Social proof indicator */}
        {showSocialProof && (
          <div className="social-proof">
            <div className="proof-avatars">
              <div className="avatar">👩‍💼</div>
              <div className="avatar">👨‍🎓</div>
              <div className="avatar">👩‍🔬</div>
              <span className="proof-text">+50,247 smart users</span>
            </div>
          </div>
        )}

        {/* Feature grid */}
        <div className="promo-features">
          {selectedVariant.features.map((feature, index) => (
            <div
              key={feature.title}
              className="feature-card"
              style={{
                '--animation-delay': `${index * 150}ms`,
              } as React.CSSProperties}
            >
              <div className="feature-icon-container">
                <span className="feature-icon" role="img" aria-hidden="true">
                  {feature.icon}
                </span>
              </div>
              <div className="feature-content">
                <h4 className="feature-title">{feature.title}</h4>
                <p className="feature-description">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Urgency banner */}
        <div className="urgency-banner">
          <span className="urgency-icon">⏰</span>
          <span className="urgency-text">{selectedVariant.urgencyText}</span>
          <div className="urgency-pulse" />
        </div>

        {/* Call-to-action buttons */}
        <div className="promo-actions">
          <button
            className="upgrade-button primary"
            onClick={handleUpgradeClick}
            aria-label="Upgrade to premium features"
          >
            <span className="cta-text">{selectedVariant.ctaText}</span>
            <span className="cta-arrow">→</span>
            <div className="button-shine" />
          </button>

          <button
            className="learn-more-button secondary"
            onClick={() => {
              chrome.tabs.create({
                url: 'https://truthlens.app/premium?utm_source=extension&utm_medium=popup&utm_campaign=main-promo',
                active: true
              });
            }}
            aria-label="Learn more about premium features"
          >
            Learn More
          </button>
        </div>

        {/* Trust indicators */}
        <div className="trust-indicators">
          <div className="trust-item">
            <span className="trust-icon">🔒</span>
            <span className="trust-text">Secure Payment</span>
          </div>
          <div className="trust-item">
            <span className="trust-icon">↩️</span>
            <span className="trust-text">30-Day Refund</span>
          </div>
          <div className="trust-item">
            <span className="trust-icon">❌</span>
            <span className="trust-text">Cancel Anytime</span>
          </div>
        </div>

        {/* Pricing preview */}
        <div className="pricing-preview">
          <span className="price-old">$9.99</span>
          <span className="price-new">$6.99/month</span>
          <span className="price-save">Save 30%</span>
        </div>
      </div>

      {/* Floating action indicator */}
      <div className="floating-indicator">
        <span className="indicator-text">👆 Tap to unlock</span>
      </div>
    </div>
  );
};
