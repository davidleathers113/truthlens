/**
 * Alert Manager - Automated Performance Alert System
 * 2025 Best Practices with rate limiting and smart notifications
 */

import { AlertConfig, MetricType } from './types';

interface AlertEvent {
  id: string;
  type: MetricType;
  level: 'warning' | 'critical';
  value: number;
  timestamp: number;
  context?: Record<string, any>;
}

interface AlertRate {
  count: number;
  lastReset: number;
}

export class AlertManager {
  private config: AlertConfig;
  private alertHistory: AlertEvent[] = [];
  private alertRates: Map<string, AlertRate> = new Map();
  private readonly RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

  constructor(config: AlertConfig) {
    this.config = config;
  }

  public triggerAlert(
    type: MetricType,
    level: 'warning' | 'critical',
    value: number,
    context?: Record<string, any>
  ): void {
    if (!this.config.enabled) return;

    const alertKey = `${type}-${level}`;

    // Check rate limiting
    if (!this.shouldTriggerAlert(alertKey)) {
      return;
    }

    const alertEvent: AlertEvent = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      level,
      value,
      timestamp: Date.now(),
      context
    };

    this.alertHistory.push(alertEvent);
    this.updateAlertRate(alertKey);

    // Limit alert history size
    if (this.alertHistory.length > 1000) {
      this.alertHistory = this.alertHistory.slice(-500);
    }

    // Trigger appropriate notification methods
    this.processAlert(alertEvent);
  }

  private shouldTriggerAlert(alertKey: string): boolean {
    const now = Date.now();
    const rate = this.alertRates.get(alertKey);

    if (!rate) return true;

    // Reset rate if window has passed
    if (now - rate.lastReset > this.RATE_LIMIT_WINDOW) {
      this.alertRates.set(alertKey, { count: 0, lastReset: now });
      return true;
    }

    // Check if we've exceeded max alerts per hour
    return rate.count < this.config.maxAlertsPerHour;
  }

  private updateAlertRate(alertKey: string): void {
    const now = Date.now();
    const rate = this.alertRates.get(alertKey) || { count: 0, lastReset: now };

    if (now - rate.lastReset > this.RATE_LIMIT_WINDOW) {
      this.alertRates.set(alertKey, { count: 1, lastReset: now });
    } else {
      rate.count++;
      this.alertRates.set(alertKey, rate);
    }
  }

  private processAlert(alert: AlertEvent): void {
    // Console warnings
    if (this.config.consoleWarnings) {
      this.logToConsole(alert);
    }

    // Browser notifications (if permissions granted)
    this.showBrowserNotification(alert);

    // External integrations
    if (this.config.slackWebhook) {
      this.sendSlackAlert(alert);
    }

    if (this.config.emailRecipients?.length) {
      this.sendEmailAlert(alert);
    }

    // Dispatch custom event for dashboard integration
    this.dispatchAlertEvent(alert);
  }

  private logToConsole(alert: AlertEvent): void {
    const message = `[TruthLens Performance Alert] ${alert.level.toUpperCase()}: ${alert.type} = ${alert.value.toFixed(2)}`;
    const details = {
      timestamp: new Date(alert.timestamp).toISOString(),
      context: alert.context
    };

    if (alert.level === 'critical') {
      console.error(message, details);
    } else {
      console.warn(message, details);
    }
  }

  private async showBrowserNotification(alert: AlertEvent): Promise<void> {
    if (!('Notification' in window)) return;

    try {
      let permission = Notification.permission;

      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }

      if (permission === 'granted') {
        const title = `TruthLens Performance ${alert.level.toUpperCase()}`;
        const body = `${alert.type}: ${alert.value.toFixed(2)} ${this.getMetricUnit(alert.type)}`;

        const notification = new Notification(title, {
          body,
          icon: '/icons/icon48.png',
          badge: '/icons/icon16.png',
          tag: `truthlens-performance-${alert.type}`,
          requireInteraction: alert.level === 'critical'
        });

        // Auto-dismiss after 5 seconds for warnings
        if (alert.level === 'warning') {
          setTimeout(() => notification.close(), 5000);
        }
      }
    } catch (error) {
      console.error('[AlertManager] Browser notification failed:', error);
    }
  }

  private getMetricUnit(type: MetricType): string {
    const units = {
      responseTime: 'ms',
      pageLoadImpact: 'ms',
      memoryUsage: 'MB',
      cpuUtilization: '%',
      lcp: 'ms',
      inp: 'ms',
      cls: '',
      serviceWorkerStartTime: 'ms',
      serviceWorkerLifetime: 'ms',
      dbQueryTime: 'ms',
      dbMemoryUsage: 'MB'
    };

    return units[type] || '';
  }

  private async sendSlackAlert(alert: AlertEvent): Promise<void> {
    if (!this.config.slackWebhook) return;

    try {
      const color = alert.level === 'critical' ? '#ff0000' : '#ffaa00';
      const emoji = alert.level === 'critical' ? '🚨' : '⚠️';

      const payload = {
        text: `${emoji} TruthLens Performance Alert`,
        attachments: [{
          color,
          title: `${alert.level.toUpperCase()}: ${alert.type}`,
          fields: [
            {
              title: 'Value',
              value: `${alert.value.toFixed(2)} ${this.getMetricUnit(alert.type)}`,
              short: true
            },
            {
              title: 'Timestamp',
              value: new Date(alert.timestamp).toISOString(),
              short: true
            },
            {
              title: 'Context',
              value: alert.context ? JSON.stringify(alert.context, null, 2) : 'N/A',
              short: false
            }
          ]
        }]
      };

      await fetch(this.config.slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

    } catch (error) {
      console.error('[AlertManager] Slack notification failed:', error);
    }
  }

  private async sendEmailAlert(alert: AlertEvent): Promise<void> {
    // Note: In a real implementation, this would use a backend service
    // For browser extensions, this could integrate with a cloud function
    console.log('[AlertManager] Email alert would be sent to:', this.config.emailRecipients);

    // This could be implemented as a message to the background script
    // which then calls a cloud function or API endpoint
    try {
      if (chrome?.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'SEND_EMAIL_ALERT',
          payload: {
            alert,
            recipients: this.config.emailRecipients
          }
        });
      }
    } catch (error) {
      console.error('[AlertManager] Email alert service call failed:', error);
    }
  }

  private dispatchAlertEvent(alert: AlertEvent): void {
    try {
      const event = new CustomEvent('truthlens:performance-alert', {
        detail: alert
      });
      window.dispatchEvent(event);
    } catch (error) {
      // Ignore errors in environments without custom events
    }
  }

  // Public API methods

  public getAlertHistory(limit: number = 50): AlertEvent[] {
    return this.alertHistory.slice(-limit);
  }

  public getAlertStats(timeWindow: number = 24 * 60 * 60 * 1000): {
    total: number;
    warnings: number;
    critical: number;
    byType: Record<string, number>;
  } {
    const now = Date.now();
    const recentAlerts = this.alertHistory.filter(
      alert => now - alert.timestamp <= timeWindow
    );

    const stats = {
      total: recentAlerts.length,
      warnings: recentAlerts.filter(a => a.level === 'warning').length,
      critical: recentAlerts.filter(a => a.level === 'critical').length,
      byType: {} as Record<string, number>
    };

    recentAlerts.forEach(alert => {
      stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;
    });

    return stats;
  }

  public clearAlertHistory(): void {
    this.alertHistory = [];
    this.alertRates.clear();
  }

  public updateConfig(newConfig: AlertConfig): void {
    this.config = { ...this.config, ...newConfig };
  }

  public testAlert(type: MetricType = 'responseTime'): void {
    this.triggerAlert(type, 'warning', 999, {
      test: true,
      timestamp: Date.now()
    });
  }

  public cleanup(): void {
    this.alertHistory = [];
    this.alertRates.clear();
  }
}
