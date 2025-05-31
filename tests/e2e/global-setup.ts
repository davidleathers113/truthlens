// Global setup for Playwright E2E tests
// Builds extension and prepares test environment

import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import { execSync } from 'child_process';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up TruthLens E2E test environment...');

  // Build the extension for testing
  console.log('📦 Building extension...');
  try {
    execSync('npm run build', { 
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '../..'),
    });
    console.log('✅ Extension build completed');
  } catch (error) {
    console.error('❌ Extension build failed:', error);
    throw error;
  }

  // Verify extension files exist
  const extensionPath = path.resolve(__dirname, '../../dist');
  const manifestPath = path.join(extensionPath, 'manifest.json');
  
  try {
    require('fs').accessSync(manifestPath);
    console.log('✅ Extension manifest found');
  } catch (error) {
    console.error('❌ Extension manifest not found at:', manifestPath);
    throw new Error('Extension build artifacts not found');
  }

  // Launch browser context with extension for validation
  console.log('🔍 Validating extension loading...');
  const browser = await chromium.launch({
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--disable-web-security',
    ],
  });

  const context = await browser.newContext();
  
  // Wait for extension to load
  let extensionId: string | null = null;
  try {
    const [background] = context.serviceWorkers();
    if (background) {
      extensionId = background.url().split('/')[2];
    } else {
      const serviceWorker = await context.waitForEvent('serviceworker', { timeout: 10000 });
      extensionId = serviceWorker.url().split('/')[2];
    }
    
    console.log('✅ Extension loaded with ID:', extensionId);
  } catch (error) {
    console.error('❌ Failed to load extension:', error);
    throw error;
  }

  // Test basic extension functionality
  try {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup/index.html`);
    await page.waitForSelector('body', { timeout: 5000 });
    console.log('✅ Extension popup validated');
  } catch (error) {
    console.error('❌ Extension popup validation failed:', error);
    // Don't throw here - popup might not be implemented yet
  }

  await browser.close();
  console.log('🎉 E2E test environment setup completed');
}

export default globalSetup;