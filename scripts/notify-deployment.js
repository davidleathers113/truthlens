#!/usr/bin/env node

/**
 * Deployment Notification Script - 2025 Integration Best Practices
 * Sends notifications to various channels about deployment status
 */

const https = require('https');

// Notification channels configuration
const NOTIFICATION_CHANNELS = {
  slack: {
    name: 'Slack',
    enabled: !!process.env.SLACK_WEBHOOK_URL,
    url: process.env.SLACK_WEBHOOK_URL
  },
  discord: {
    name: 'Discord',
    enabled: !!process.env.DISCORD_WEBHOOK_URL,
    url: process.env.DISCORD_WEBHOOK_URL
  },
  teams: {
    name: 'Microsoft Teams',
    enabled: !!process.env.TEAMS_WEBHOOK_URL,
    url: process.env.TEAMS_WEBHOOK_URL
  },
  email: {
    name: 'Email',
    enabled: !!process.env.EMAIL_WEBHOOK_URL,
    url: process.env.EMAIL_WEBHOOK_URL
  }
};

// Status configurations
const STATUS_CONFIG = {
  success: {
    emoji: '✅',
    color: '#28a745',
    message: 'Deployment completed successfully'
  },
  failure: {
    emoji: '❌',
    color: '#dc3545',
    message: 'Deployment failed'
  },
  cancelled: {
    emoji: '⚠️',
    color: '#ffc107',
    message: 'Deployment was cancelled'
  },
  in_progress: {
    emoji: '🔄',
    color: '#007bff',
    message: 'Deployment in progress'
  }
};

class DeploymentNotifier {
  constructor(options = {}) {
    this.status = options.status || 'unknown';
    this.version = options.version || 'unknown';
    this.buildUrl = options.buildUrl || '';
    this.environment = options.environment || 'production';
    this.actor = options.actor || process.env.GITHUB_ACTOR || 'Unknown';
    this.timestamp = new Date().toISOString();
    this.rolloutPercentage = options.rolloutPercentage || 100;
  }

  async sendNotifications() {
    console.log(`📢 Sending deployment notifications for version ${this.version}...`);
    
    const results = [];
    
    for (const [channel, config] of Object.entries(NOTIFICATION_CHANNELS)) {
      if (config.enabled) {
        try {
          console.log(`📤 Sending notification to ${config.name}...`);
          await this.sendToChannel(channel, config);
          results.push({ channel, status: 'success' });
          console.log(`✅ ${config.name} notification sent successfully`);
        } catch (error) {
          console.error(`❌ Failed to send ${config.name} notification:`, error.message);
          results.push({ channel, status: 'failed', error: error.message });
        }
      } else {
        console.log(`⏭️  Skipping ${config.name} (not configured)`);
      }
    }
    
    return results;
  }

  async sendToChannel(channel, config) {
    switch (channel) {
      case 'slack':
        return this.sendSlackNotification(config.url);
      case 'discord':
        return this.sendDiscordNotification(config.url);
      case 'teams':
        return this.sendTeamsNotification(config.url);
      case 'email':
        return this.sendEmailNotification(config.url);
      default:
        throw new Error(`Unknown notification channel: ${channel}`);
    }
  }

  async sendSlackNotification(webhookUrl) {
    const statusConfig = STATUS_CONFIG[this.status] || STATUS_CONFIG.failure;
    
    const payload = {
      text: `${statusConfig.emoji} TruthLens Extension Deployment`,
      attachments: [{
        color: statusConfig.color,
        title: `Deployment ${this.status.toUpperCase()}`,
        fields: [
          {
            title: 'Version',
            value: this.version,
            short: true
          },
          {
            title: 'Environment',
            value: this.environment,
            short: true
          },
          {
            title: 'Deployed by',
            value: this.actor,
            short: true
          },
          {
            title: 'Rollout',
            value: `${this.rolloutPercentage}%`,
            short: true
          },
          {
            title: 'Timestamp',
            value: new Date(this.timestamp).toLocaleString(),
            short: false
          }
        ],
        actions: this.buildUrl ? [{
          type: 'button',
          text: 'View Build',
          url: this.buildUrl
        }] : []
      }]
    };

    if (this.status === 'success') {
      payload.attachments[0].fields.push({
        title: 'Chrome Web Store',
        value: '<https://chrome.google.com/webstore/detail/truthlens|View Extension>',
        short: false
      });
    }

    return this.sendWebhook(webhookUrl, payload);
  }

  async sendDiscordNotification(webhookUrl) {
    const statusConfig = STATUS_CONFIG[this.status] || STATUS_CONFIG.failure;
    
    const payload = {
      embeds: [{
        title: `${statusConfig.emoji} TruthLens Extension Deployment`,
        description: statusConfig.message,
        color: parseInt(statusConfig.color.replace('#', ''), 16),
        fields: [
          {
            name: 'Version',
            value: this.version,
            inline: true
          },
          {
            name: 'Environment',
            value: this.environment,
            inline: true
          },
          {
            name: 'Deployed by',
            value: this.actor,
            inline: true
          },
          {
            name: 'Rollout Percentage',
            value: `${this.rolloutPercentage}%`,
            inline: true
          }
        ],
        timestamp: this.timestamp,
        footer: {
          text: 'TruthLens CI/CD'
        }
      }]
    };

    if (this.buildUrl) {
      payload.embeds[0].url = this.buildUrl;
    }

    return this.sendWebhook(webhookUrl, payload);
  }

  async sendTeamsNotification(webhookUrl) {
    const statusConfig = STATUS_CONFIG[this.status] || STATUS_CONFIG.failure;
    
    const payload = {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      summary: `TruthLens Deployment ${this.status}`,
      themeColor: statusConfig.color.replace('#', ''),
      title: `${statusConfig.emoji} TruthLens Extension Deployment`,
      text: statusConfig.message,
      sections: [{
        facts: [
          {
            name: 'Version',
            value: this.version
          },
          {
            name: 'Environment',
            value: this.environment
          },
          {
            name: 'Deployed by',
            value: this.actor
          },
          {
            name: 'Rollout Percentage',
            value: `${this.rolloutPercentage}%`
          },
          {
            name: 'Timestamp',
            value: new Date(this.timestamp).toLocaleString()
          }
        ]
      }],
      potentialAction: this.buildUrl ? [{
        '@type': 'OpenUri',
        name: 'View Build',
        targets: [{
          os: 'default',
          uri: this.buildUrl
        }]
      }] : []
    };

    return this.sendWebhook(webhookUrl, payload);
  }

  async sendEmailNotification(webhookUrl) {
    const statusConfig = STATUS_CONFIG[this.status] || STATUS_CONFIG.failure;
    
    const payload = {
      to: process.env.NOTIFICATION_EMAIL || 'team@truthlens.ai',
      subject: `TruthLens Deployment ${this.status.toUpperCase()} - ${this.version}`,
      html: `
        <h2>${statusConfig.emoji} TruthLens Extension Deployment</h2>
        <p><strong>Status:</strong> ${statusConfig.message}</p>
        <ul>
          <li><strong>Version:</strong> ${this.version}</li>
          <li><strong>Environment:</strong> ${this.environment}</li>
          <li><strong>Deployed by:</strong> ${this.actor}</li>
          <li><strong>Rollout Percentage:</strong> ${this.rolloutPercentage}%</li>
          <li><strong>Timestamp:</strong> ${new Date(this.timestamp).toLocaleString()}</li>
        </ul>
        ${this.buildUrl ? `<p><a href="${this.buildUrl}">View Build Details</a></p>` : ''}
        ${this.status === 'success' ? '<p><a href="https://chrome.google.com/webstore/detail/truthlens">View on Chrome Web Store</a></p>' : ''}
      `
    };

    return this.sendWebhook(webhookUrl, payload);
  }

  async sendWebhook(url, payload) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(payload);
      const urlObj = new URL(url);
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'TruthLens-CI/1.0'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ status: 'success', response: data });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      req.write(postData);
      req.end();
    });
  }

  generateSummaryReport() {
    return {
      deployment: {
        version: this.version,
        status: this.status,
        environment: this.environment,
        actor: this.actor,
        timestamp: this.timestamp,
        rolloutPercentage: this.rolloutPercentage,
        buildUrl: this.buildUrl
      },
      notifications: {
        channels: Object.keys(NOTIFICATION_CHANNELS).filter(
          channel => NOTIFICATION_CHANNELS[channel].enabled
        ),
        totalChannels: Object.keys(NOTIFICATION_CHANNELS).length,
        enabledChannels: Object.values(NOTIFICATION_CHANNELS).filter(c => c.enabled).length
      }
    };
  }
}

function parseArguments(args) {
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--status':
        options.status = args[++i];
        break;
      case '--version':
        options.version = args[++i];
        break;
      case '--build-url':
        options.buildUrl = args[++i];
        break;
      case '--environment':
        options.environment = args[++i];
        break;
      case '--actor':
        options.actor = args[++i];
        break;
      case '--rollout':
        options.rolloutPercentage = parseInt(args[++i]);
        break;
      case '--help':
        showUsage();
        process.exit(0);
        break;
      default:
        if (arg.startsWith('--')) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
    }
  }
  
  return options;
}

function showUsage() {
  console.log(`
📢 Deployment Notification Script

Usage:
  node notify-deployment.js [options]

Options:
  --status <status>        Deployment status (success, failure, cancelled, in_progress)
  --version <version>      Version being deployed
  --build-url <url>        URL to build details
  --environment <env>      Deployment environment (default: production)
  --actor <name>          Who triggered the deployment
  --rollout <percentage>   Rollout percentage (default: 100)
  --help                  Show this help message

Environment Variables:
  SLACK_WEBHOOK_URL       - Slack webhook URL for notifications
  DISCORD_WEBHOOK_URL     - Discord webhook URL for notifications
  TEAMS_WEBHOOK_URL       - Microsoft Teams webhook URL for notifications
  EMAIL_WEBHOOK_URL       - Email service webhook URL for notifications
  NOTIFICATION_EMAIL      - Email address for notifications

Examples:
  node notify-deployment.js --status success --version 1.2.3 --rollout 50
  node notify-deployment.js --status failure --version 1.2.3 --build-url https://github.com/...
`);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('❌ No arguments provided');
    showUsage();
    process.exit(1);
  }
  
  const options = parseArguments(args);
  
  if (!options.status) {
    console.error('❌ Status is required');
    process.exit(1);
  }
  
  try {
    const notifier = new DeploymentNotifier(options);
    
    console.log('📋 Deployment Summary:');
    const summary = notifier.generateSummaryReport();
    console.log(JSON.stringify(summary, null, 2));
    
    const results = await notifier.sendNotifications();
    
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;
    
    console.log(`\n📊 Notification Results: ${successful} successful, ${failed} failed`);
    
    if (failed > 0) {
      console.log('⚠️  Some notifications failed to send');
      process.exit(1);
    } else {
      console.log('✅ All notifications sent successfully');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Notification script failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { DeploymentNotifier };