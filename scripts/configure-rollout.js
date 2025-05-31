#!/usr/bin/env node

/**
 * Chrome Web Store Rollout Configuration - 2025 API
 * Configures partial rollout deployment percentages
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Chrome Web Store API configuration
const WEBSTORE_API = {
  baseUrl: 'https://www.googleapis.com/chromewebstore/v1.1',
  uploadUrl: 'https://www.googleapis.com/upload/chromewebstore/v1.1',
  scope: 'https://www.googleapis.com/auth/chromewebstore'
};

class ChromeWebStoreAPI {
  constructor() {
    this.clientId = process.env.CHROME_CLIENT_ID;
    this.clientSecret = process.env.CHROME_CLIENT_SECRET;
    this.refreshToken = process.env.CHROME_REFRESH_TOKEN;
    this.appId = process.env.CHROME_APP_ID;
    
    if (!this.clientId || !this.clientSecret || !this.refreshToken || !this.appId) {
      throw new Error('Missing required Chrome Web Store API credentials');
    }
  }

  async getAccessToken() {
    return new Promise((resolve, reject) => {
      const postData = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
        grant_type: 'refresh_token'
      }).toString();

      const options = {
        hostname: 'oauth2.googleapis.com',
        port: 443,
        path: '/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.access_token) {
              resolve(response.access_token);
            } else {
              reject(new Error(`Failed to get access token: ${data}`));
            }
          } catch (error) {
            reject(new Error(`Invalid JSON response: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  async configureRollout(percentage) {
    const accessToken = await this.getAccessToken();
    
    const rolloutData = {
      deployPercentage: percentage,
      rolloutInfo: {
        percentage: percentage,
        startTime: new Date().toISOString(),
        description: `Gradual rollout at ${percentage}% to monitor performance and user feedback`
      }
    };

    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(rolloutData);
      
      const options = {
        hostname: 'www.googleapis.com',
        port: 443,
        path: `/chromewebstore/v1.1/items/${this.appId}/deployPercentage`,
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(response);
            } else {
              reject(new Error(`API request failed: ${res.statusCode} ${data}`));
            }
          } catch (error) {
            reject(new Error(`Invalid JSON response: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  async getCurrentRollout() {
    const accessToken = await this.getAccessToken();
    
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'www.googleapis.com',
        port: 443,
        path: `/chromewebstore/v1.1/items/${this.appId}`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            resolve(response);
          } catch (error) {
            reject(new Error(`Invalid JSON response: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }

  async publishToPercentage(percentage) {
    const accessToken = await this.getAccessToken();
    
    const publishData = {
      target: 'default',
      deployPercentage: percentage
    };

    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(publishData);
      
      const options = {
        hostname: 'www.googleapis.com',
        port: 443,
        path: `/chromewebstore/v1.1/items/${this.appId}/publish`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            resolve(response);
          } catch (error) {
            reject(new Error(`Invalid JSON response: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }
}

// Rollout strategy configuration
const ROLLOUT_STRATEGIES = {
  conservative: [10, 25, 50, 75, 100],
  standard: [20, 50, 100],
  aggressive: [50, 100],
  canary: [5, 15, 35, 65, 100]
};

async function configureRollout() {
  const args = process.argv.slice(2);
  const options = parseArguments(args);
  
  console.log('🚀 Configuring Chrome Web Store Rollout\n');
  
  try {
    const webstore = new ChromeWebStoreAPI();
    
    // Get current status
    console.log('📊 Checking current rollout status...');
    const currentStatus = await webstore.getCurrentRollout();
    console.log(`Current deployment percentage: ${currentStatus.deployPercentage || 'Not set'}%`);
    
    if (options.percentage) {
      // Set specific percentage
      console.log(`🎯 Setting rollout to ${options.percentage}%...`);
      await webstore.configureRollout(options.percentage);
      
      if (options.publish) {
        console.log('📢 Publishing with partial rollout...');
        await webstore.publishToPercentage(options.percentage);
      }
      
      console.log(`✅ Rollout configured to ${options.percentage}%`);
      
    } else if (options.strategy) {
      // Execute rollout strategy
      await executeRolloutStrategy(webstore, options.strategy, options);
      
    } else if (options.status) {
      // Show current status
      console.log('📋 Current Rollout Status:');
      console.log(JSON.stringify(currentStatus, null, 2));
      
    } else {
      console.log('❌ No action specified. Use --percentage, --strategy, or --status');
      showUsage();
      process.exit(1);
    }
    
    // Save rollout history
    await saveRolloutHistory(options.percentage || 0);
    
  } catch (error) {
    console.error('❌ Rollout configuration failed:', error.message);
    process.exit(1);
  }
}

async function executeRolloutStrategy(webstore, strategyName, options) {
  const strategy = ROLLOUT_STRATEGIES[strategyName];
  if (!strategy) {
    throw new Error(`Unknown rollout strategy: ${strategyName}`);
  }
  
  console.log(`🎯 Executing ${strategyName} rollout strategy: ${strategy.join('% → ')}%`);
  
  for (let i = 0; i < strategy.length; i++) {
    const percentage = strategy[i];
    
    console.log(`\n📈 Rolling out to ${percentage}%...`);
    await webstore.configureRollout(percentage);
    
    if (options.publish) {
      await webstore.publishToPercentage(percentage);
    }
    
    // Wait between rollout stages (except for the last one)
    if (i < strategy.length - 1) {
      const waitTime = options.interval || 3600; // Default 1 hour
      console.log(`⏳ Waiting ${waitTime / 60} minutes before next rollout stage...`);
      
      if (!options.skipWait) {
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
      }
    }
  }
  
  console.log('🎉 Rollout strategy completed successfully!');
}

function parseArguments(args) {
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--percentage':
        const percentage = parseInt(args[++i]);
        if (isNaN(percentage) || percentage < 0 || percentage > 100) {
          throw new Error('Percentage must be a number between 0 and 100');
        }
        options.percentage = percentage;
        break;
        
      case '--strategy':
        options.strategy = args[++i];
        break;
        
      case '--publish':
        options.publish = true;
        break;
        
      case '--status':
        options.status = true;
        break;
        
      case '--interval':
        options.interval = parseInt(args[++i]);
        break;
        
      case '--skip-wait':
        options.skipWait = true;
        break;
        
      case '--help':
        showUsage();
        process.exit(0);
        break;
        
      default:
        console.error(`Unknown option: ${arg}`);
        showUsage();
        process.exit(1);
    }
  }
  
  return options;
}

function showUsage() {
  console.log(`
🚀 Chrome Web Store Rollout Configuration

Usage:
  node configure-rollout.js [options]

Options:
  --percentage <0-100>     Set specific rollout percentage
  --strategy <name>        Use predefined rollout strategy
  --publish               Publish after configuring rollout
  --status                Show current rollout status
  --interval <seconds>    Wait time between rollout stages (default: 3600)
  --skip-wait             Skip waiting in strategy mode
  --help                  Show this help message

Strategies:
  conservative: ${ROLLOUT_STRATEGIES.conservative.join('% → ')}%
  standard:     ${ROLLOUT_STRATEGIES.standard.join('% → ')}%
  aggressive:   ${ROLLOUT_STRATEGIES.aggressive.join('% → ')}%
  canary:       ${ROLLOUT_STRATEGIES.canary.join('% → ')}%

Examples:
  node configure-rollout.js --percentage 10 --publish
  node configure-rollout.js --strategy conservative --publish
  node configure-rollout.js --status

Environment Variables:
  CHROME_CLIENT_ID      - Chrome Web Store API client ID
  CHROME_CLIENT_SECRET  - Chrome Web Store API client secret  
  CHROME_REFRESH_TOKEN  - Chrome Web Store API refresh token
  CHROME_APP_ID         - Chrome Web Store application ID
`);
}

async function saveRolloutHistory(percentage) {
  const historyPath = path.join(__dirname, '..', 'rollout-history.json');
  let history = [];
  
  try {
    if (fs.existsSync(historyPath)) {
      history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    }
  } catch (error) {
    console.log('📝 Creating new rollout history file');
  }
  
  const entry = {
    timestamp: new Date().toISOString(),
    percentage: percentage,
    commit: process.env.GITHUB_SHA || 'local',
    buildNumber: process.env.GITHUB_RUN_NUMBER || '0',
    actor: process.env.GITHUB_ACTOR || 'local'
  };
  
  history.push(entry);
  
  // Keep only last 50 entries
  if (history.length > 50) {
    history = history.slice(-50);
  }
  
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
  console.log('📊 Rollout history updated');
}

if (require.main === module) {
  configureRollout().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = { ChromeWebStoreAPI, configureRollout };