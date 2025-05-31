// Global teardown for Playwright E2E tests
// Cleans up test environment and artifacts

import { FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up E2E test environment...');

  // Clean up any temporary test files
  const tempDir = path.resolve(__dirname, '../temp');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log('✅ Temporary files cleaned up');
  }

  // Log test results summary if available
  const resultsPath = path.resolve(__dirname, '../../test-results/e2e-results.json');
  if (fs.existsSync(resultsPath)) {
    try {
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
      const { stats } = results;
      
      console.log('📊 E2E Test Results Summary:');
      console.log(`   Tests: ${stats.total}`);
      console.log(`   Passed: ${stats.passed}`);
      console.log(`   Failed: ${stats.failed}`);
      console.log(`   Skipped: ${stats.skipped}`);
      console.log(`   Duration: ${stats.duration}ms`);
      
      if (stats.failed > 0) {
        console.log('❌ Some E2E tests failed - check detailed results');
      } else {
        console.log('✅ All E2E tests passed');
      }
    } catch (error) {
      console.log('⚠️  Could not parse test results');
    }
  }

  console.log('🏁 E2E test environment teardown completed');
}

export default globalTeardown;