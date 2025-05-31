/**
 * Performance Dashboard - Real-time Performance Visualization
 * 2025 Best Practices with interactive charts and export functionality
 */

import { DashboardConfig, MetricType, PerformanceMeasurement } from './types';

interface ChartDataPoint {
  timestamp: number;
  value: number;
  label?: string;
}

interface ChartConfig {
  type: 'line' | 'bar' | 'gauge';
  title: string;
  unit: string;
  thresholds: { warning: number; critical: number };
  color: string;
}

export class PerformanceDashboard {
  private container: HTMLElement | null = null;
  private config: DashboardConfig;
  private charts: Map<MetricType, HTMLElement> = new Map();
  private updateInterval: number | null = null;
  private _isVisible = false;

  // Getter and setter for isVisible to maintain compatibility
  get isVisible(): boolean {
    return this._isVisible;
  }

  set isVisible(value: boolean) {
    this._isVisible = value;
  }
  private dataHistory: Map<MetricType, ChartDataPoint[]> = new Map();

  constructor(config: DashboardConfig) {
    this.config = config;
    this.initializeDataHistory();
  }

  private initializeDataHistory(): void {
    const metricTypes: MetricType[] = [
      'responseTime', 'pageLoadImpact', 'memoryUsage', 'cpuUtilization',
      'lcp', 'inp', 'cls', 'serviceWorkerStartTime', 'dbQueryTime'
    ];

    metricTypes.forEach(type => {
      this.dataHistory.set(type, []);
    });
  }

  public initialize(containerId: string = 'truthlens-performance-dashboard'): void {
    this.createContainer(containerId);
    this.createDashboardLayout();
    this.setupEventListeners();

    if (this.config.enabled) {
      this.show();
    }
  }

  private createContainer(containerId: string): void {
    // Remove existing container if present
    const existing = document.getElementById(containerId);
    if (existing) {
      existing.remove();
    }

    this.container = document.createElement('div');
    this.container.id = containerId;
    this.container.className = 'truthlens-performance-dashboard';
    this.container.innerHTML = `
      <div class="dashboard-header">
        <h3>TruthLens Performance Monitor</h3>
        <div class="dashboard-controls">
          <button class="btn-export" title="Export Data">📊</button>
          <button class="btn-clear" title="Clear Data">🗑️</button>
          <button class="btn-settings" title="Settings">⚙️</button>
          <button class="btn-minimize" title="Minimize">➖</button>
          <button class="btn-close" title="Close">✕</button>
        </div>
      </div>
      <div class="dashboard-content">
        <div class="metrics-grid">
          <div class="metric-row">
            <div class="metric-chart" data-metric="responseTime"></div>
            <div class="metric-chart" data-metric="memoryUsage"></div>
          </div>
          <div class="metric-row">
            <div class="metric-chart" data-metric="lcp"></div>
            <div class="metric-chart" data-metric="inp"></div>
          </div>
          <div class="metric-row">
            <div class="metric-chart" data-metric="cls"></div>
            <div class="metric-chart" data-metric="pageLoadImpact"></div>
          </div>
        </div>
        <div class="dashboard-footer">
          <div class="status-indicators">
            <span class="status-indicator" data-status="good">🟢 Good</span>
            <span class="status-indicator" data-status="warning">🟡 Warning</span>
            <span class="status-indicator" data-status="critical">🔴 Critical</span>
          </div>
          <div class="update-time">Last updated: <span id="last-update">--</span></div>
        </div>
      </div>
    `;

    this.injectStyles();
    document.body.appendChild(this.container);
  }

  private injectStyles(): void {
    const styleId = 'truthlens-dashboard-styles';
    if (document.getElementById(styleId)) return;

    const styles = document.createElement('style');
    styles.id = styleId;
    styles.textContent = `
      .truthlens-performance-dashboard {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 600px;
        max-height: 80vh;
        background: ${this.config.themeMode === 'dark' ? '#1f2937' : '#ffffff'};
        border: 1px solid ${this.config.themeMode === 'dark' ? '#374151' : '#e5e7eb'};
        border-radius: 12px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 12px;
        color: ${this.config.themeMode === 'dark' ? '#f9fafb' : '#111827'};
        z-index: 2147483647;
        display: none;
        flex-direction: column;
        backdrop-filter: blur(10px);
      }

      .truthlens-performance-dashboard.visible {
        display: flex;
      }

      .truthlens-performance-dashboard.minimized .dashboard-content {
        display: none;
      }

      .dashboard-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid ${this.config.themeMode === 'dark' ? '#374151' : '#e5e7eb'};
        cursor: move;
      }

      .dashboard-header h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
      }

      .dashboard-controls {
        display: flex;
        gap: 8px;
      }

      .dashboard-controls button {
        width: 24px;
        height: 24px;
        border: none;
        background: transparent;
        cursor: pointer;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        transition: background-color 150ms ease;
      }

      .dashboard-controls button:hover {
        background: ${this.config.themeMode === 'dark' ? '#374151' : '#f3f4f6'};
      }

      .dashboard-content {
        padding: 16px 20px;
        overflow-y: auto;
        max-height: 60vh;
      }

      .metrics-grid {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .metric-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }

      .metric-chart {
        background: ${this.config.themeMode === 'dark' ? '#111827' : '#f9fafb'};
        border: 1px solid ${this.config.themeMode === 'dark' ? '#374151' : '#e5e7eb'};
        border-radius: 8px;
        padding: 12px;
        min-height: 120px;
        position: relative;
      }

      .metric-title {
        font-weight: 600;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
        color: ${this.config.themeMode === 'dark' ? '#9ca3af' : '#6b7280'};
      }

      .metric-value {
        font-size: 20px;
        font-weight: 700;
        margin-bottom: 4px;
      }

      .metric-value.good { color: #10b981; }
      .metric-value.warning { color: #f59e0b; }
      .metric-value.critical { color: #ef4444; }

      .metric-unit {
        font-size: 10px;
        color: ${this.config.themeMode === 'dark' ? '#9ca3af' : '#6b7280'};
      }

      .metric-chart-area {
        height: 60px;
        margin-top: 8px;
        border-radius: 4px;
        position: relative;
        overflow: hidden;
      }

      .chart-line {
        stroke-width: 2;
        fill: none;
        vector-effect: non-scaling-stroke;
      }

      .chart-area {
        fill-opacity: 0.1;
      }

      .dashboard-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 16px;
        border-top: 1px solid ${this.config.themeMode === 'dark' ? '#374151' : '#e5e7eb'};
        margin-top: 16px;
      }

      .status-indicators {
        display: flex;
        gap: 12px;
        font-size: 10px;
      }

      .update-time {
        font-size: 10px;
        color: ${this.config.themeMode === 'dark' ? '#9ca3af' : '#6b7280'};
      }

      @media (max-width: 768px) {
        .truthlens-performance-dashboard {
          width: calc(100vw - 40px);
          max-width: 400px;
        }

        .metric-row {
          grid-template-columns: 1fr;
        }
      }
    `;

    document.head.appendChild(styles);
  }

  private createDashboardLayout(): void {
    if (!this.container) return;

    const chartConfigs: Record<MetricType, ChartConfig> = {
      responseTime: {
        type: 'line',
        title: 'Response Time',
        unit: 'ms',
        thresholds: { warning: 800, critical: 1000 },
        color: '#3b82f6'
      },
      memoryUsage: {
        type: 'line',
        title: 'Memory Usage',
        unit: 'MB',
        thresholds: { warning: 40, critical: 50 },
        color: '#8b5cf6'
      },
      lcp: {
        type: 'gauge',
        title: 'Largest Contentful Paint',
        unit: 'ms',
        thresholds: { warning: 2000, critical: 2500 },
        color: '#10b981'
      },
      inp: {
        type: 'gauge',
        title: 'Interaction to Next Paint',
        unit: 'ms',
        thresholds: { warning: 150, critical: 200 },
        color: '#f59e0b'
      },
      cls: {
        type: 'gauge',
        title: 'Cumulative Layout Shift',
        unit: '',
        thresholds: { warning: 0.08, critical: 0.1 },
        color: '#ef4444'
      },
      pageLoadImpact: {
        type: 'line',
        title: 'Page Load Impact',
        unit: 'ms',
        thresholds: { warning: 400, critical: 500 },
        color: '#06b6d4'
      },
      cpuUtilization: {
        type: 'line',
        title: 'CPU Utilization',
        unit: '%',
        thresholds: { warning: 60, critical: 80 },
        color: '#84cc16'
      },
      serviceWorkerStartTime: {
        type: 'line',
        title: 'Service Worker Start',
        unit: 'ms',
        thresholds: { warning: 100, critical: 200 },
        color: '#f97316'
      },
      dbQueryTime: {
        type: 'line',
        title: 'Database Query Time',
        unit: 'ms',
        thresholds: { warning: 50, critical: 100 },
        color: '#ec4899'
      },
      serviceWorkerLifetime: {
        type: 'line',
        title: 'Service Worker Lifetime',
        unit: 'ms',
        thresholds: { warning: 30000, critical: 60000 },
        color: '#6366f1'
      },
      dbMemoryUsage: {
        type: 'line',
        title: 'Database Memory',
        unit: 'MB',
        thresholds: { warning: 10, critical: 20 },
        color: '#14b8a6'
      }
    };

    // Create charts for displayed metrics
    const chartElements = this.container.querySelectorAll('.metric-chart');
    chartElements.forEach(element => {
      const metricType = element.getAttribute('data-metric') as MetricType;
      const config = chartConfigs[metricType];

      if (config) {
        this.createChart(element as HTMLElement, metricType, config);
        this.charts.set(metricType, element as HTMLElement);
      }
    });
  }

  private createChart(container: HTMLElement, metricType: MetricType, config: ChartConfig): void {
    container.innerHTML = `
      <div class="metric-title">${config.title}</div>
      <div class="metric-value" data-metric="${metricType}">--</div>
      <div class="metric-unit">${config.unit}</div>
      <div class="metric-chart-area">
        <svg width="100%" height="100%" viewBox="0 0 200 60">
          <defs>
            <linearGradient id="gradient-${metricType}" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:${config.color};stop-opacity:0.3" />
              <stop offset="100%" style="stop-color:${config.color};stop-opacity:0" />
            </linearGradient>
          </defs>
          <path class="chart-area" fill="url(#gradient-${metricType})"></path>
          <path class="chart-line" stroke="${config.color}"></path>
        </svg>
      </div>
    `;
  }

  private setupEventListeners(): void {
    if (!this.container) return;

    // Control buttons
    const exportBtn = this.container.querySelector('.btn-export');
    const clearBtn = this.container.querySelector('.btn-clear');
    const settingsBtn = this.container.querySelector('.btn-settings');
    const minimizeBtn = this.container.querySelector('.btn-minimize');
    const closeBtn = this.container.querySelector('.btn-close');

    exportBtn?.addEventListener('click', () => this.exportData());
    clearBtn?.addEventListener('click', () => this.clearData());
    settingsBtn?.addEventListener('click', () => this.showSettings());
    minimizeBtn?.addEventListener('click', () => this.toggleMinimize());
    closeBtn?.addEventListener('click', () => this.hide());

    // Make dashboard draggable
    this.makeDraggable();

    // Listen for performance measurements
    window.addEventListener('truthlens:performance-measurement', (event) => {
      const measurement = (event as CustomEvent).detail as PerformanceMeasurement;
      this.updateChart(measurement);
    });
  }

  private makeDraggable(): void {
    if (!this.container) return;

    const header = this.container.querySelector('.dashboard-header') as HTMLElement;
    let isDragging = false;
    let currentX: number;
    let currentY: number;
    let initialX: number;
    let initialY: number;

    header.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).tagName === 'BUTTON') return;

      isDragging = true;
      const rect = this.container!.getBoundingClientRect();
      initialX = e.clientX - rect.left;
      initialY = e.clientY - rect.top;
      header.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;

      this.container!.style.left = `${currentX}px`;
      this.container!.style.top = `${currentY}px`;
      this.container!.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        header.style.cursor = 'move';
      }
    });
  }

  public updateChart(measurement: PerformanceMeasurement): void {
    const dataPoint: ChartDataPoint = {
      timestamp: measurement.timestamp,
      value: measurement.type === 'memoryUsage' ? measurement.value / 1000000 : measurement.value, // Convert bytes to MB
      label: new Date(measurement.timestamp).toLocaleTimeString()
    };

    // Add to history
    const history = this.dataHistory.get(measurement.type) || [];
    history.push(dataPoint);

    // Limit history size
    if (history.length > this.config.maxDataPoints) {
      history.shift();
    }
    this.dataHistory.set(measurement.type, history);

    // Update chart visual
    this.renderChart(measurement.type, history);
    this.updateMetricValue(measurement.type, dataPoint.value);
    this.updateLastUpdateTime();
  }

  private renderChart(metricType: MetricType, data: ChartDataPoint[]): void {
    const chartElement = this.charts.get(metricType);
    if (!chartElement || data.length === 0) return;

    const svg = chartElement.querySelector('svg');
    const linePath = svg?.querySelector('.chart-line') as SVGPathElement;
    const areaPath = svg?.querySelector('.chart-area') as SVGPathElement;

    if (!linePath || !areaPath) return;

    const maxValue = Math.max(...data.map(d => d.value));
    const minValue = Math.min(...data.map(d => d.value));
    const range = maxValue - minValue || 1;

    const width = 200;
    const height = 60;
    const padding = 5;

    let pathData = '';
    let areaData = '';

    data.forEach((point, index) => {
      const x = (index / (data.length - 1)) * (width - 2 * padding) + padding;
      const y = height - padding - ((point.value - minValue) / range) * (height - 2 * padding);

      if (index === 0) {
        pathData = `M ${x} ${y}`;
        areaData = `M ${x} ${height - padding} L ${x} ${y}`;
      } else {
        pathData += ` L ${x} ${y}`;
        areaData += ` L ${x} ${y}`;
      }
    });

    areaData += ` L ${width - padding} ${height - padding} Z`;

    linePath.setAttribute('d', pathData);
    areaPath.setAttribute('d', areaData);
  }

  private updateMetricValue(metricType: MetricType, value: number): void {
    const valueElement = this.container?.querySelector(`[data-metric="${metricType}"]`);
    if (!valueElement) return;

    const formattedValue = this.formatValue(metricType, value);
    valueElement.textContent = formattedValue;

    // Update status class
    const status = this.getValueStatus(metricType, value);
    valueElement.className = `metric-value ${status}`;
  }

  private formatValue(metricType: MetricType, value: number): string {
    switch (metricType) {
      case 'memoryUsage':
      case 'dbMemoryUsage':
        return `${value.toFixed(1)}`;
      case 'responseTime':
      case 'pageLoadImpact':
      case 'lcp':
      case 'inp':
      case 'serviceWorkerStartTime':
      case 'dbQueryTime':
        return `${Math.round(value)}`;
      case 'cls':
        return value.toFixed(3);
      case 'cpuUtilization':
        return `${Math.round(value)}`;
      default:
        return value.toFixed(1);
    }
  }

  private getValueStatus(metricType: MetricType, value: number): 'good' | 'warning' | 'critical' {
    const thresholds = {
      responseTime: { warning: 800, critical: 1000 },
      memoryUsage: { warning: 40, critical: 50 },
      pageLoadImpact: { warning: 400, critical: 500 },
      lcp: { warning: 2000, critical: 2500 },
      inp: { warning: 150, critical: 200 },
      cls: { warning: 0.08, critical: 0.1 },
      cpuUtilization: { warning: 60, critical: 80 },
      serviceWorkerStartTime: { warning: 100, critical: 200 },
      dbQueryTime: { warning: 50, critical: 100 },
      serviceWorkerLifetime: { warning: 30000, critical: 60000 },
      dbMemoryUsage: { warning: 10, critical: 20 }
    };

    const threshold = thresholds[metricType];
    if (!threshold) return 'good';

    if (value >= threshold.critical) return 'critical';
    if (value >= threshold.warning) return 'warning';
    return 'good';
  }

  private updateLastUpdateTime(): void {
    const timeElement = this.container?.querySelector('#last-update');
    if (timeElement) {
      timeElement.textContent = new Date().toLocaleTimeString();
    }
  }

  // Public API methods

  public show(): void {
    if (!this.container) return;

    this.container.classList.add('visible');
    this.isVisible = true;

    // Start update interval
    if (this.config.refreshInterval > 0) {
      this.updateInterval = window.setInterval(() => {
        this.refreshDashboard();
      }, this.config.refreshInterval);
    }
  }

  public hide(): void {
    if (!this.container) return;

    this.container.classList.remove('visible');
    this.isVisible = false;

    // Clear update interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  public toggleMinimize(): void {
    if (!this.container) return;

    this.container.classList.toggle('minimized');
  }

  private refreshDashboard(): void {
    // This would typically fetch fresh data
    // For now, we rely on event-driven updates
  }

  private exportData(): void {
    const data = Object.fromEntries(this.dataHistory);
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `truthlens-performance-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private clearData(): void {
    this.dataHistory.clear();
    this.initializeDataHistory();

    // Clear all chart visuals
    this.charts.forEach((element, _metricType) => {
      const valueElement = element.querySelector('.metric-value');
      if (valueElement) {
        valueElement.textContent = '--';
        valueElement.className = 'metric-value';
      }

      const svg = element.querySelector('svg');
      const linePath = svg?.querySelector('.chart-line') as SVGPathElement;
      const areaPath = svg?.querySelector('.chart-area') as SVGPathElement;

      if (linePath) linePath.setAttribute('d', '');
      if (areaPath) areaPath.setAttribute('d', '');
    });
  }

  private showSettings(): void {
    // This would open a settings modal
    console.log('[PerformanceDashboard] Settings panel would open here');
  }

  public updateConfig(newConfig: Partial<DashboardConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public cleanup(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    if (this.container) {
      this.container.remove();
    }

    this.charts.clear();
    this.dataHistory.clear();
  }
}
