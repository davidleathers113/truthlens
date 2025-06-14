/**
 * WelcomeScreen Component - 2025 Gen Z Optimized Onboarding
 *
 * Features:
 * - Under 5-second value proposition animation
 * - Minimal text with visual-first design
 * - Micro-interactions with 200-500ms timing
 * - Mobile-first responsive design
 * - Accessibility compliant with WCAG 2.1 AA
 */

import React, { useState, useEffect } from 'react';
import { PopupView } from '../Layout/PopupRouter';

interface WelcomeScreenProps {
  onNavigate: (view: PopupView | 'onboarding-permissions') => void;
  onComplete: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onNavigate, onComplete }) => {
  const [animationPhase, setAnimationPhase] = useState<'intro' | 'value' | 'ready'>('intro');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Progressive animation phases (under 5 seconds total)
    setIsVisible(true);

    const timer1 = setTimeout(() => setAnimationPhase('value'), 1500);
    const timer2 = setTimeout(() => setAnimationPhase('ready'), 3500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const handleGetStarted = () => {
    onNavigate('onboarding-permissions');
  };

  const handleSkip = () => {
    onComplete();
    onNavigate('main');
  };

  return (
    <div className={`welcome-screen ${isVisible ? 'visible' : ''}`}>
      {/* Hero Animation Container */}
      <div className="welcome-hero">
        <div className={`logo-animation phase-${animationPhase}`}>
          <div className="truthlens-icon">
            <div className="icon-shield">🛡️</div>
            <div className="icon-magnify">🔍</div>
          </div>

          <h1 className="hero-title">
            <span className="brand-name">TruthLens</span>
          </h1>
        </div>

        {/* Value Proposition with Progressive Disclosure */}
        <div className={`value-props phase-${animationPhase}`}>
          <div className="value-item" data-delay="0">
            <span className="value-emoji">⚡</span>
            <span className="value-text">Instant fact-checking</span>
          </div>
          <div className="value-item" data-delay="300">
            <span className="value-emoji">🧠</span>
            <span className="value-text">AI-powered analysis</span>
          </div>
          <div className="value-item" data-delay="600">
            <span className="value-emoji">🔒</span>
            <span className="value-text">Privacy-first design</span>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className={`welcome-actions phase-${animationPhase}`}>
        <button
          className="cta-primary"
          onClick={handleGetStarted}
          aria-label="Start using TruthLens with guided setup"
        >
          <span className="cta-text">Get Started</span>
          <span className="cta-icon">🚀</span>
        </button>

        <button
          className="cta-secondary"
          onClick={handleSkip}
          aria-label="Skip onboarding and go to main interface"
        >
          <span className="skip-text">Skip & Explore</span>
        </button>
      </div>

      {/* Progress Indicator */}
      <div className="onboarding-progress">
        <div className="progress-dots">
          <div className="dot active" aria-label="Welcome step, currently active"></div>
          <div className="dot" aria-label="Permissions step"></div>
          <div className="dot" aria-label="Setup step"></div>
        </div>
        <p className="progress-text">Step 1 of 3</p>
      </div>

      <style>{`
        /* WelcomeScreen Styles - 2025 Gen Z Design */
        .welcome-screen {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
          padding: 24px 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          opacity: 0;
          transform: translateY(20px);
          transition: all 400ms cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
          position: relative;
        }

        .welcome-screen.visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* Hero Animation */
        .welcome-hero {
          text-align: center;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }

        .logo-animation {
          margin-bottom: 32px;
          transform: scale(0.8);
          transition: transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .logo-animation.phase-value,
        .logo-animation.phase-ready {
          transform: scale(1);
        }

        .truthlens-icon {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 80px;
          height: 80px;
          margin-bottom: 16px;
        }

        .icon-shield {
          font-size: 48px;
          animation: pulse 2s ease-in-out infinite;
        }

        .icon-magnify {
          position: absolute;
          font-size: 24px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: scan 3s ease-in-out infinite;
        }

        .hero-title {
          margin: 0;
          font-size: 32px;
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        .brand-name {
          background: linear-gradient(45deg, #ffffff, #f0f9ff);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        /* Value Propositions */
        .value-props {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 24px;
          opacity: 0;
          transform: translateY(20px);
          transition: all 400ms ease-out;
        }

        .value-props.phase-value,
        .value-props.phase-ready {
          opacity: 1;
          transform: translateY(0);
        }

        .value-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          backdrop-filter: blur(10px);
          opacity: 0;
          transform: translateX(-20px);
          transition: all 300ms ease-out;
        }

        .value-props.phase-value .value-item:nth-child(1) {
          animation: slideInLeft 400ms ease-out 0ms forwards;
        }

        .value-props.phase-value .value-item:nth-child(2) {
          animation: slideInLeft 400ms ease-out 300ms forwards;
        }

        .value-props.phase-value .value-item:nth-child(3) {
          animation: slideInLeft 400ms ease-out 600ms forwards;
        }

        .value-emoji {
          font-size: 20px;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
        }

        .value-text {
          font-size: 16px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.95);
        }

        /* CTA Actions */
        .welcome-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
          opacity: 0;
          transform: translateY(20px);
          transition: all 400ms ease-out 1s;
        }

        .welcome-actions.phase-ready {
          opacity: 1;
          transform: translateY(0);
        }

        .cta-primary {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 16px 24px;
          background: rgba(255, 255, 255, 0.9);
          color: #1f2937;
          border: none;
          border-radius: 16px;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          transition: all 200ms ease-out;
          backdrop-filter: blur(10px);
          min-height: 48px;
        }

        .cta-primary:hover {
          background: rgba(255, 255, 255, 1);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }

        .cta-primary:active {
          transform: translateY(0);
          transition: transform 100ms ease-out;
        }

        .cta-icon {
          font-size: 20px;
          transition: transform 200ms ease-out;
        }

        .cta-primary:hover .cta-icon {
          transform: translateX(4px);
        }

        .cta-secondary {
          padding: 12px 20px;
          background: transparent;
          color: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 200ms ease-out;
          min-height: 44px;
        }

        .cta-secondary:hover {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 1);
          border-color: rgba(255, 255, 255, 0.5);
        }

        /* Progress Indicator */
        .onboarding-progress {
          text-align: center;
        }

        .progress-dots {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          transition: all 200ms ease-out;
        }

        .dot.active {
          background: rgba(255, 255, 255, 0.9);
          transform: scale(1.2);
        }

        .progress-text {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
          margin: 0;
        }

        /* Animations */
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        @keyframes scan {
          0%, 100% { transform: translate(-50%, -50%) rotate(0deg); }
          25% { transform: translate(-50%, -50%) rotate(90deg); }
          50% { transform: translate(-50%, -50%) rotate(180deg); }
          75% { transform: translate(-50%, -50%) rotate(270deg); }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        /* Mobile Responsive */
        @media (max-width: 480px) {
          .welcome-screen {
            padding: 20px 16px;
          }

          .hero-title {
            font-size: 28px;
          }

          .truthlens-icon {
            width: 64px;
            height: 64px;
          }

          .icon-shield {
            font-size: 40px;
          }

          .icon-magnify {
            font-size: 20px;
          }

          .value-text {
            font-size: 14px;
          }

          .cta-primary {
            font-size: 16px;
            padding: 14px 20px;
          }
        }

        /* Reduced Motion */
        @media (prefers-reduced-motion: reduce) {
          .welcome-screen,
          .logo-animation,
          .value-props,
          .welcome-actions,
          .value-item,
          .cta-primary,
          .cta-secondary,
          .dot {
            transition: none;
            animation: none;
          }

          .icon-shield,
          .icon-magnify {
            animation: none;
          }

          .value-props.phase-value .value-item {
            opacity: 1;
            transform: translateX(0);
          }
        }

        /* High Contrast Mode */
        @media (prefers-contrast: high) {
          .welcome-screen {
            background: #000000;
            color: #ffffff;
          }

          .cta-primary {
            background: #ffffff;
            color: #000000;
            border: 2px solid #ffffff;
          }

          .cta-secondary {
            border: 2px solid #ffffff;
            color: #ffffff;
          }

          .value-item {
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.5);
          }
        }

        /* Dark Theme Support */
        @media (prefers-color-scheme: dark) {
          .welcome-screen {
            background: linear-gradient(135deg, #1e3a8a 0%, #581c87 100%);
          }
        }
      `}</style>
    </div>
  );
};

export default WelcomeScreen;
