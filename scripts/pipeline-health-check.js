#!/usr/bin/env node

/**
 * Pipeline Health Check - 2025 DevOps Monitoring
 * Monitors CI/CD pipeline health and sends alerts
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Health check thresholds
const HEALTH_THRESHOLDS = {
  maxBuildTime: 15 * 60, // 15 minutes
  maxFailureRate: 0.1,   // 10% failure rate
  minSuccessRate: 0.9,   // 90% success rate
  maxRetryRate: 0.05,    // 5% retry rate
  criticalJobFailures: ['security-scan', 'build-test'] // Jobs that should never fail
};

// Pipeline metrics storage
class PipelineMetrics {
  constructor() {
    this.metricsPath = path.join(__dirname, '..', 'pipeline-metrics.json');
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.metricsPath)) {
        this.data = JSON.parse(fs.readFileSync(this.metricsPath, 'utf8'));
      } else {
        this.data = { builds: [], healthHistory: [] };
      }
    } catch (error) {
      console.log('📝 Creating new pipeline metrics file');
      this.data = { builds: [], healthHistory: [] };
    }
  }

  save() {
    fs.writeFileSync(this.metricsPath, JSON.stringify(this.data, null, 2));
  }

  addBuild(buildData) {
    this.data.builds.push({
      ...buildData,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 100 builds
    if (this.data.builds.length > 100) {
      this.data.builds = this.data.builds.slice(-100);
    }
    
    this.save();
  }

  getRecentBuilds(days = 7) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    return this.data.builds.filter(build => 
      new Date(build.timestamp) > cutoff
    );
  }

  addHealthCheck(healthData) {
    this.data.healthHistory.push({
      ...healthData,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 50 health checks
    if (this.data.healthHistory.length > 50) {
      this.data.healthHistory = this.data.healthHistory.slice(-50);
    }
    
    this.save();
  }
}

function calculatePipelineHealth() {
  const metrics = new PipelineMetrics();
  const recentBuilds = metrics.getRecentBuilds();
  
  if (recentBuilds.length === 0) {
    return {
      status: 'unknown',
      score: 0,
      message: 'No recent builds to analyze'
    };
  }

  console.log('🔍 Analyzing pipeline health...\n');
  console.log(`📊 Analyzing ${recentBuilds.length} builds from the last 7 days`);

  const analysis = {
    totalBuilds: recentBuilds.length,
    successfulBuilds: 0,
    failedBuilds: 0,
    retriedBuilds: 0,
    averageBuildTime: 0,
    criticalFailures: 0,
    issues: [],
    recommendations: []
  };

  // Analyze build results
  let totalBuildTime = 0;
  
  recentBuilds.forEach(build => {
    if (build.status === 'success') {
      analysis.successfulBuilds++;
    } else if (build.status === 'failure') {
      analysis.failedBuilds++;
      
      // Check for critical job failures
      if (build.failedJobs && build.failedJobs.some(job => 
        HEALTH_THRESHOLDS.criticalJobFailures.includes(job)
      )) {
        analysis.criticalFailures++;
      }
    }
    
    if (build.retried) {
      analysis.retriedBuilds++;
    }
    
    if (build.duration) {
      totalBuildTime += build.duration;
    }
  });

  analysis.averageBuildTime = totalBuildTime / recentBuilds.length;
  analysis.successRate = analysis.successfulBuilds / analysis.totalBuilds;
  analysis.failureRate = analysis.failedBuilds / analysis.totalBuilds;
  analysis.retryRate = analysis.retriedBuilds / analysis.totalBuilds;

  // Calculate health score (0-100)
  let healthScore = 100;
  
  // Penalize high failure rate
  if (analysis.failureRate > HEALTH_THRESHOLDS.maxFailureRate) {
    const penalty = (analysis.failureRate - HEALTH_THRESHOLDS.maxFailureRate) * 200;
    healthScore -= penalty;
    analysis.issues.push(`High failure rate: ${(analysis.failureRate * 100).toFixed(1)}%`);
  }
  
  // Penalize slow builds
  if (analysis.averageBuildTime > HEALTH_THRESHOLDS.maxBuildTime) {
    const penalty = ((analysis.averageBuildTime - HEALTH_THRESHOLDS.maxBuildTime) / 60) * 5;
    healthScore -= penalty;
    analysis.issues.push(`Slow builds: ${(analysis.averageBuildTime / 60).toFixed(1)} minutes average`);
  }
  
  // Penalize critical failures
  if (analysis.criticalFailures > 0) {
    healthScore -= analysis.criticalFailures * 25;
    analysis.issues.push(`Critical job failures: ${analysis.criticalFailures}`);
  }
  
  // Penalize high retry rate
  if (analysis.retryRate > HEALTH_THRESHOLDS.maxRetryRate) {
    const penalty = (analysis.retryRate - HEALTH_THRESHOLDS.maxRetryRate) * 100;
    healthScore -= penalty;
    analysis.issues.push(`High retry rate: ${(analysis.retryRate * 100).toFixed(1)}%`);
  }

  healthScore = Math.max(0, Math.min(100, healthScore));

  // Determine status
  let status;
  if (healthScore >= 90) {
    status = 'excellent';
  } else if (healthScore >= 75) {
    status = 'good';
  } else if (healthScore >= 50) {
    status = 'warning';
  } else {
    status = 'critical';
  }

  // Generate recommendations
  generateRecommendations(analysis);

  const health = {
    status,
    score: Math.round(healthScore),
    analysis,
    timestamp: new Date().toISOString()
  };

  // Save health check
  metrics.addHealthCheck(health);

  return health;
}

function generateRecommendations(analysis) {
  if (analysis.failureRate > HEALTH_THRESHOLDS.maxFailureRate) {
    analysis.recommendations.push('Review recent failures and fix recurring issues');
    analysis.recommendations.push('Consider adding more comprehensive pre-commit hooks');
  }
  
  if (analysis.averageBuildTime > HEALTH_THRESHOLDS.maxBuildTime) {
    analysis.recommendations.push('Optimize build performance with better caching strategies');
    analysis.recommendations.push('Consider parallelizing more jobs');
    analysis.recommendations.push('Review dependency installation times');
  }
  
  if (analysis.criticalFailures > 0) {
    analysis.recommendations.push('Immediately address critical job failures');
    analysis.recommendations.push('Review security scanning and build process');
  }
  
  if (analysis.retryRate > HEALTH_THRESHOLDS.maxRetryRate) {
    analysis.recommendations.push('Investigate flaky tests and unstable dependencies');
    analysis.recommendations.push('Improve test reliability and environment consistency');
  }
}

function displayHealthReport(health) {
  const statusEmoji = {
    excellent: '🟢',
    good: '🟡',
    warning: '🟠',
    critical: '🔴',
    unknown: '⚪'
  };

  console.log('\n' + '='.repeat(50));
  console.log('🏥 PIPELINE HEALTH REPORT');
  console.log('='.repeat(50));
  
  console.log(`\n${statusEmoji[health.status]} Overall Health: ${health.status.toUpperCase()} (${health.score}/100)`);
  
  if (health.analysis) {
    const { analysis } = health;
    
    console.log('\n📊 Build Statistics:');
    console.log(`  Total Builds: ${analysis.totalBuilds}`);
    console.log(`  Success Rate: ${(analysis.successRate * 100).toFixed(1)}%`);
    console.log(`  Failure Rate: ${(analysis.failureRate * 100).toFixed(1)}%`);
    console.log(`  Retry Rate: ${(analysis.retryRate * 100).toFixed(1)}%`);
    console.log(`  Average Build Time: ${(analysis.averageBuildTime / 60).toFixed(1)} minutes`);
    
    if (analysis.issues.length > 0) {
      console.log('\n⚠️  Issues Detected:');
      analysis.issues.forEach(issue => {
        console.log(`  • ${issue}`);
      });
    }
    
    if (analysis.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      analysis.recommendations.forEach(rec => {
        console.log(`  • ${rec}`);
      });
    }
  }
  
  console.log('\n' + '='.repeat(50));
}

async function sendAlert(health) {
  if (health.status === 'critical' || health.score < 50) {
    console.log('🚨 Critical pipeline health detected, sending alert...');
    
    const alertData = {
      type: 'pipeline_health',
      severity: health.status,
      score: health.score,
      issues: health.analysis?.issues || [],
      recommendations: health.analysis?.recommendations || [],
      timestamp: health.timestamp,
      buildUrl: process.env.GITHUB_SERVER_URL ? 
        `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : 
        'Unknown'
    };
    
    // Send to notification webhook if configured
    if (process.env.NOTIFICATION_WEBHOOK) {
      await sendWebhookNotification(alertData);
    }
    
    // Create GitHub issue if in GitHub Actions
    if (process.env.GITHUB_TOKEN) {
      await createGitHubIssue(alertData);
    }
  }
}

async function sendWebhookNotification(alertData) {
  const webhookUrl = new URL(process.env.NOTIFICATION_WEBHOOK);
  
  const payload = {
    text: `🚨 Pipeline Health Alert`,
    attachments: [{
      color: alertData.severity === 'critical' ? 'danger' : 'warning',
      title: `Pipeline Health Score: ${alertData.score}/100`,
      text: `Status: ${alertData.severity}\n\nIssues:\n${alertData.issues.map(i => `• ${i}`).join('\n')}`
    }]
  };

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    
    const options = {
      hostname: webhookUrl.hostname,
      port: webhookUrl.port || 443,
      path: webhookUrl.pathname + webhookUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log('✅ Alert notification sent successfully');
        resolve();
      } else {
        console.log(`⚠️  Alert notification failed: ${res.statusCode}`);
        reject(new Error(`HTTP ${res.statusCode}`));
      }
    });

    req.on('error', (error) => {
      console.log('⚠️  Alert notification failed:', error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function createGitHubIssue(alertData) {
  // Implementation for creating GitHub issue would go here
  console.log('📝 GitHub issue creation not implemented yet');
}

function getCurrentBuildData() {
  return {
    id: process.env.GITHUB_RUN_ID || 'local',
    number: process.env.GITHUB_RUN_NUMBER || '0',
    status: getJobStatus(),
    branch: process.env.GITHUB_REF_NAME || 'unknown',
    commit: process.env.GITHUB_SHA || 'unknown',
    actor: process.env.GITHUB_ACTOR || 'unknown',
    startTime: Date.now(),
    failedJobs: getFailedJobs()
  };
}

function getJobStatus() {
  const securityStatus = process.env.SECURITY_STATUS;
  const buildStatus = process.env.BUILD_STATUS;
  const performanceStatus = process.env.PERFORMANCE_STATUS;
  const packageStatus = process.env.PACKAGE_STATUS;
  
  const statuses = [securityStatus, buildStatus, performanceStatus, packageStatus]
    .filter(status => status);
  
  if (statuses.some(status => status === 'failure')) {
    return 'failure';
  } else if (statuses.some(status => status === 'cancelled')) {
    return 'cancelled';
  } else if (statuses.every(status => status === 'success')) {
    return 'success';
  } else {
    return 'unknown';
  }
}

function getFailedJobs() {
  const failedJobs = [];
  
  if (process.env.SECURITY_STATUS === 'failure') {
    failedJobs.push('security-scan');
  }
  if (process.env.BUILD_STATUS === 'failure') {
    failedJobs.push('build-test');
  }
  if (process.env.PERFORMANCE_STATUS === 'failure') {
    failedJobs.push('performance-test');
  }
  if (process.env.PACKAGE_STATUS === 'failure') {
    failedJobs.push('package');
  }
  
  return failedJobs;
}

async function runHealthCheck() {
  console.log('🏥 Starting Pipeline Health Check\n');
  
  try {
    // Record current build
    const currentBuild = getCurrentBuildData();
    const metrics = new PipelineMetrics();
    metrics.addBuild(currentBuild);
    
    // Calculate health
    const health = calculatePipelineHealth();
    
    // Display report
    displayHealthReport(health);
    
    // Send alerts if needed
    await sendAlert(health);
    
    // Exit with appropriate code
    if (health.status === 'critical') {
      console.log('\n🚨 Exiting with error due to critical pipeline health');
      process.exit(1);
    } else {
      console.log('\n✅ Pipeline health check completed');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runHealthCheck();
}

module.exports = { calculatePipelineHealth, PipelineMetrics };