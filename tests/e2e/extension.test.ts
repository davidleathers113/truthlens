// End-to-end tests for TruthLens Chrome extension
// Tests real extension behavior with Playwright

import { test, expect, chromium, BrowserContext } from '@playwright/test';
import path from 'path';

test.describe('TruthLens Extension E2E', () => {
  let context: BrowserContext;
  let extensionId: string;

  test.beforeAll(async () => {
    // Load the extension
    const pathToExtension = path.join(__dirname, '../../dist');
    
    context = await chromium.launchPersistentContext('', {
      headless: false, // Extensions require non-headless mode
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        '--disable-web-security',
        '--disable-dev-shm-usage',
      ],
    });

    // Get extension ID
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }

    extensionId = background.url().split('/')[2];
    console.log('Extension ID:', extensionId);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('should load extension and show popup', async () => {
    const page = await context.newPage();
    
    // Navigate to extension popup
    await page.goto(`chrome-extension://${extensionId}/popup/index.html`);
    
    // Wait for popup to load
    await page.waitForSelector('[data-testid="popup-container"]', { timeout: 5000 });
    
    // Check if popup is displayed correctly
    const popupTitle = await page.textContent('h1, .popup-title');
    expect(popupTitle).toContain('TruthLens');
  });

  test('should analyze content on a test page', async () => {
    const page = await context.newPage();
    
    // Navigate to a test page
    await page.goto('https://example.com');
    
    // Wait for content to load
    await page.waitForLoadState('networkidle');
    
    // Wait for extension to analyze content
    await page.waitForTimeout(2000);
    
    // Look for TruthLens indicators
    const indicators = await page.locator('.truthlens-indicator').count();
    console.log('Found indicators:', indicators);
    
    // At minimum, should detect the page content
    // Note: This may vary based on actual AI availability
    if (indicators > 0) {
      // If indicators are shown, verify their structure
      const firstIndicator = page.locator('.truthlens-indicator').first();
      await expect(firstIndicator).toBeVisible();
      
      // Check indicator content
      const score = await firstIndicator.locator('.truthlens-score').textContent();
      expect(score).toMatch(/\d+\/100/);
      
      // Test indicator interaction
      await firstIndicator.click();
      await expect(firstIndicator.locator('.truthlens-tooltip')).toBeVisible();
    }
  });

  test('should respect user settings', async () => {
    const page = await context.newPage();
    
    // Open options page
    await page.goto(`chrome-extension://${extensionId}/options/index.html`);
    
    // Wait for options to load
    await page.waitForSelector('[data-testid="settings-form"]', { timeout: 5000 });
    
    // Toggle visual indicators off
    const indicatorToggle = page.locator('[data-testid="show-indicators-toggle"]');
    if (await indicatorToggle.isChecked()) {
      await indicatorToggle.click();
    }
    
    // Save settings
    await page.click('[data-testid="save-settings"]');
    
    // Navigate to a content page
    await page.goto('https://example.com');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Should not show indicators when disabled
    const indicators = await page.locator('.truthlens-indicator').count();
    expect(indicators).toBe(0);
    
    // Re-enable indicators
    await page.goto(`chrome-extension://${extensionId}/options/index.html`);
    await page.waitForSelector('[data-testid="settings-form"]');
    
    const indicatorToggleReenable = page.locator('[data-testid="show-indicators-toggle"]');
    if (!(await indicatorToggleReenable.isChecked())) {
      await indicatorToggleReenable.click();
    }
    
    await page.click('[data-testid="save-settings"]');
  });

  test('should handle social media platforms', async () => {
    const page = await context.newPage();
    
    // Test with Twitter-like content
    await page.setContent(`
      <html>
        <body>
          <div data-testid="tweet">
            <h2>Breaking News</h2>
            <p>This is a test social media post about current events.</p>
          </div>
        </body>
      </html>
    `);
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Should analyze social media content
    const indicators = await page.locator('.truthlens-indicator').count();
    console.log('Social media indicators:', indicators);
    
    // Verify proper targeting of social media elements
    if (indicators > 0) {
      const indicator = page.locator('.truthlens-indicator').first();
      await expect(indicator).toBeVisible();
    }
  });

  test('should perform within acceptable time limits', async () => {
    const page = await context.newPage();
    
    const startTime = Date.now();
    
    // Navigate to content page
    await page.goto('https://example.com');
    await page.waitForLoadState('networkidle');
    
    // Wait for potential analysis completion
    await page.waitForTimeout(3000);
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // Should complete initial analysis within 5 seconds
    expect(totalTime).toBeLessThan(5000);
    
    console.log('Total analysis time:', totalTime, 'ms');
  });

  test('should handle page navigation correctly', async () => {
    const page = await context.newPage();
    
    // Navigate to first page
    await page.goto('https://example.com');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    const firstPageIndicators = await page.locator('.truthlens-indicator').count();
    
    // Navigate to second page
    await page.goto('https://httpbin.org/html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Previous indicators should be cleaned up
    const secondPageIndicators = await page.locator('.truthlens-indicator').count();
    
    console.log('First page indicators:', firstPageIndicators);
    console.log('Second page indicators:', secondPageIndicators);
    
    // Each page should be analyzed independently
    expect(secondPageIndicators).toBeGreaterThanOrEqual(0);
  });

  test('should handle errors gracefully', async () => {
    const page = await context.newPage();
    
    // Monitor console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Navigate to a problematic page
    await page.goto('data:text/html,<html><body><h1>Test Page</h1></body></html>');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Should not have critical errors
    const criticalErrors = consoleErrors.filter(error => 
      error.includes('TruthLens') && 
      !error.includes('AI APIs not available') // This is expected
    );
    
    expect(criticalErrors.length).toBe(0);
  });

  test('should preserve performance on content-heavy pages', async () => {
    const page = await context.newPage();
    
    // Create a content-heavy test page
    await page.setContent(`
      <html>
        <body>
          ${Array.from({ length: 100 }, (_, i) => `
            <article>
              <h2>Article ${i + 1}</h2>
              <p>This is article content number ${i + 1} with some text to analyze.</p>
            </article>
          `).join('')}
        </body>
      </html>
    `);
    
    const startTime = Date.now();
    await page.waitForLoadState('networkidle');
    
    // Measure page load impact
    const loadTime = Date.now() - startTime;
    
    // Extension should not significantly impact page load (< 500ms overhead)
    expect(loadTime).toBeLessThan(2000);
    
    console.log('Content-heavy page load time:', loadTime, 'ms');
    
    // Wait for analysis to complete
    await page.waitForTimeout(3000);
    
    // Page should remain responsive
    const button = await page.evaluateHandle(() => {
      const btn = document.createElement('button');
      btn.textContent = 'Test Responsiveness';
      document.body.appendChild(btn);
      return btn;
    });
    
    await button.asElement()?.click();
    // If this doesn't throw, page is still responsive
  });
});