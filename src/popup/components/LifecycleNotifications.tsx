/**
 * Lifecycle Notifications Component
 * Displays subscription lifecycle notifications following 2025 UX best practices
 * Handles renewal reminders, cancellation confirmations, and win-back offers
 */

import React, { useState, useEffect } from 'react';
import {
  subscriptionLifecycleManager,
  LifecycleNotification
} from '@shared/services/subscriptionLifecycleManager';
import { PopupView } from './Layout/PopupRouter';
import { logger } from '@shared/services/logger';

interface LifecycleNotificationsProps {
  onNavigate: (view: PopupView) => void;
  className?: string;
}

export const LifecycleNotifications: React.FC<LifecycleNotificationsProps> = ({
  onNavigate,
  className = ''
}) => {
  const [notifications, setNotifications] = useState<LifecycleNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadNotifications();

    // Set up polling for new notifications (every 30 seconds)
    const interval = setInterval(loadNotifications, 30 * 1000);

    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const pendingNotifications = await subscriptionLifecycleManager.getPendingNotifications();
      setNotifications(pendingNotifications);
    } catch (error) {
      logger.error('Failed to load lifecycle notifications:', error instanceof Error ? { message: error.message, stack: error.stack } : { error });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationAction = async (notification: LifecycleNotification) => {
    try {
      // Mark as acknowledged
      await subscriptionLifecycleManager.acknowledgeNotification(notification.id);

      // Navigate to appropriate view
      if (notification.actionUrl === 'premium') {
        onNavigate('premium');
      } else if (notification.actionUrl === 'account') {
        onNavigate('account');
      } else if (notification.actionUrl === 'settings') {
        onNavigate('settings');
      }

      // Remove from display
      setNotifications(prev => prev.filter(n => n.id !== notification.id));

      logger.info(`Lifecycle notification action taken: ${notification.type}`);
    } catch (error) {
      logger.error('Failed to handle notification action:', error instanceof Error ? { message: error.message, stack: error.stack } : { error });
    }
  };

  const dismissNotification = async (notificationId: string, temporary = false) => {
    try {
      if (!temporary) {
        await subscriptionLifecycleManager.acknowledgeNotification(notificationId);
      } else {
        // Temporary dismiss - just hide from UI but don't mark as acknowledged
        setDismissedNotifications(prev => new Set([...prev, notificationId]));
      }

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      logger.error('Failed to dismiss notification:', error instanceof Error ? { message: error.message, stack: error.stack } : { error });
    }
  };

  const getNotificationIcon = (type: LifecycleNotification['type']): string => {
    const icons = {
      renewal_reminder: '🔔',
      renewal_success: '✅',
      renewal_failed: '⚠️',
      cancellation_confirmed: '👋',
      grace_period_warning: '⏰',
      expiration_notice: '😞',
      win_back_offer: '🎁'
    };
    return icons[type] || '📢';
  };

  const getUrgencyClass = (urgency: LifecycleNotification['urgency']): string => {
    return {
      low: 'notification-low',
      medium: 'notification-medium',
      high: 'notification-high'
    }[urgency];
  };

  // Filter out dismissed notifications
  const visibleNotifications = notifications.filter(n => !dismissedNotifications.has(n.id));

  if (isLoading) {
    return (
      <div className={`lifecycle-notifications loading ${className}`}>
        <div className="loading-spinner">Loading notifications...</div>
      </div>
    );
  }

  if (visibleNotifications.length === 0) {
    return null; // Don't render anything if no notifications
  }

  return (
    <div className={`lifecycle-notifications ${className}`}>
      {visibleNotifications.map(notification => (
        <div
          key={notification.id}
          className={`lifecycle-notification ${getUrgencyClass(notification.urgency)}`}
          role="alert"
          aria-live={notification.urgency === 'high' ? 'assertive' : 'polite'}
        >
          <div className="notification-header">
            <div className="notification-icon" role="img" aria-label={notification.type}>
              {getNotificationIcon(notification.type)}
            </div>
            <div className="notification-content">
              <h4 className="notification-title">{notification.title}</h4>
              <p className="notification-message">{notification.message}</p>
            </div>
            <button
              className="notification-dismiss"
              onClick={() => dismissNotification(notification.id, true)}
              aria-label="Dismiss notification"
              title="Dismiss"
            >
              ×
            </button>
          </div>

          {notification.actionText && (
            <div className="notification-actions">
              <button
                className="notification-action-primary"
                onClick={() => handleNotificationAction(notification)}
              >
                {notification.actionText}
              </button>
              {notification.urgency !== 'high' && (
                <button
                  className="notification-action-secondary"
                  onClick={() => dismissNotification(notification.id, false)}
                >
                  Not Now
                </button>
              )}
            </div>
          )}

          {/* Progress indicator for urgent notifications */}
          {notification.urgency === 'high' && notification.metadata?.expiresAt && (
            <div className="notification-progress">
              <ProgressIndicator expiresAt={notification.metadata.expiresAt} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

/**
 * Progress indicator for time-sensitive notifications
 */
interface ProgressIndicatorProps {
  expiresAt: number;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ expiresAt }) => {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [progressPercentage, setProgressPercentage] = useState<number>(100);

  useEffect(() => {
    const updateProgress = () => {
      const now = Date.now();
      const totalTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      const timeLeft = Math.max(0, expiresAt - now);

      if (timeLeft <= 0) {
        setTimeRemaining('Expired');
        setProgressPercentage(0);
        return;
      }

      // Calculate remaining time
      const hours = Math.floor(timeLeft / (60 * 60 * 1000));
      const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m remaining`);
      } else {
        setTimeRemaining(`${minutes}m remaining`);
      }

      // Calculate progress percentage (assuming 24-hour window)
      const percentage = Math.max(0, Math.min(100, (timeLeft / totalTime) * 100));
      setProgressPercentage(percentage);
    };

    updateProgress();
    const interval = setInterval(updateProgress, 60 * 1000); // Update every minute

    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <div className="progress-indicator">
      <div className="progress-text">{timeRemaining}</div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  );
};

/**
 * Hook for managing lifecycle notifications in other components
 */
export const useLifecycleNotifications = () => {
  const [notificationCount, setNotificationCount] = useState<number>(0);

  useEffect(() => {
    const checkNotifications = async () => {
      try {
        const notifications = await subscriptionLifecycleManager.getPendingNotifications();
        setNotificationCount(notifications.length);
      } catch (error) {
        logger.error('Failed to check notification count:', error instanceof Error ? { message: error.message, stack: error.stack } : { error });
      }
    };

    checkNotifications();
    const interval = setInterval(checkNotifications, 30 * 1000);

    return () => clearInterval(interval);
  }, []);

  const triggerManualCheck = async () => {
    try {
      await subscriptionLifecycleManager.triggerLifecycleCheck();
    } catch (error) {
      logger.error('Failed to trigger manual lifecycle check:', error instanceof Error ? { message: error.message, stack: error.stack } : { error });
    }
  };

  return {
    notificationCount,
    triggerManualCheck
  };
};
