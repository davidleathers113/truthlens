#!/usr/bin/env node

/**
 * Memory Usage Test - 2025 Extension Performance Standards
 * Tests Chrome extension memory consumption and performance
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Memory thresholds in MB
const MEMORY_THRESHOLDS = {
  background: 50,    // 50MB for background script
  content: 30,       // 30MB per content script
  popup: 20,         // 20MB for popup
  options: 25        // 25MB for options page
};

async function testExtensionMemory() {
  console.log('🧠 Starting Extension Memory Test\n');
  
  const extensionPath = path.join(__dirname, '..', 'dist');
  
  // Launch browser with extension
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding'
    ]
  });

  const memoryResults = {
    timestamp: new Date().toISOString(),
    baseline: null,
    tests: {},
    violations: [],
    recommendations: []
  };

  try {
    // Get baseline memory usage
    const baselinePage = await browser.newPage();
    await baselinePage.goto('about:blank');
    await baselinePage.waitForTimeout(2000);
    
    const baselineMetrics = await baselinePage.metrics();
    memoryResults.baseline = {
      jsHeapUsedSize: Math.round(baselineMetrics.JSHeapUsedSize / 1024 / 1024),
      jsHeapTotalSize: Math.round(baselineMetrics.JSHeapTotalSize / 1024 / 1024)
    };
    
    console.log(`📊 Baseline Memory: ${memoryResults.baseline.jsHeapUsedSize}MB used, ${memoryResults.baseline.jsHeapTotalSize}MB total`);
    await baselinePage.close();

    // Test background script memory
    await testBackgroundMemory(browser, memoryResults);
    
    // Test content script memory
    await testContentScriptMemory(browser, memoryResults);
    
    // Test popup memory
    await testPopupMemory(browser, memoryResults);
    
    // Test options page memory
    await testOptionsMemory(browser, memoryResults);
    
    // Memory stress test
    await memoryStressTest(browser, memoryResults);

  } catch (error) {
    console.error('❌ Memory test failed:', error);
    memoryResults.error = error.message;
  } finally {
    await browser.close();
  }

  // Analyze results
  analyzeMemoryResults(memoryResults);
  
  // Save results
  const reportPath = path.join(__dirname, '..', 'memory-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(memoryResults, null, 2));
  console.log(`\n📄 Memory test report saved to ${reportPath}`);

  // Exit with appropriate code
  if (memoryResults.violations.length > 0) {
    console.log('\n🚨 Memory test failed!');
    process.exit(1);
  } else {
    console.log('\n✅ Memory test passed!');
    process.exit(0);
  }
}

async function testBackgroundMemory(browser, results) {
  console.log('\n🔧 Testing Background Script Memory...');
  
  // Background scripts run in the browser context
  const targets = await browser.targets();
  const extensionTarget = targets.find(target => 
    target.type() === 'background_page' || 
    target.type() === 'service_worker'
  );
  
  if (!extensionTarget) {
    console.log('⚠️  Could not find background script target');
    return;
  }

  try {
    const backgroundPage = await extensionTarget.page();
    await backgroundPage.waitForTimeout(3000); // Let background script initialize
    
    // Trigger analytics and AI service initialization
    await backgroundPage.evaluate(() => {
      // Simulate extension activity
      if (window.chrome && window.chrome.runtime) {
        chrome.runtime.sendMessage({ type: 'INIT_ANALYTICS' });
        chrome.runtime.sendMessage({ type: 'START_AI_SERVICE' });
      }
    });
    
    await backgroundPage.waitForTimeout(2000);
    
    const metrics = await backgroundPage.metrics();
    const memoryUsage = Math.round(metrics.JSHeapUsedSize / 1024 / 1024);
    
    results.tests.background = {
      memoryUsage,
      threshold: MEMORY_THRESHOLDS.background,
      status: memoryUsage <= MEMORY_THRESHOLDS.background ? 'PASS' : 'FAIL'
    };
    
    const status = memoryUsage <= MEMORY_THRESHOLDS.background ? '✅' : '❌';
    console.log(`${status} Background Script: ${memoryUsage}MB (limit: ${MEMORY_THRESHOLDS.background}MB)`);
    
    if (memoryUsage > MEMORY_THRESHOLDS.background) {
      results.violations.push({
        component: 'background',
        actual: memoryUsage,
        threshold: MEMORY_THRESHOLDS.background,
        overage: memoryUsage - MEMORY_THRESHOLDS.background
      });
    }
    
  } catch (error) {
    console.log('⚠️  Background script memory test failed:', error.message);
    results.tests.background = { error: error.message };
  }
}

async function testContentScriptMemory(browser, results) {
  console.log('\n📄 Testing Content Script Memory...');
  
  const page = await browser.newPage();
  
  try {
    // Navigate to a test page that will load content scripts
    await page.goto('https://example.com');
    await page.waitForTimeout(3000); // Let content scripts load
    
    // Simulate content analysis
    await page.evaluate(() => {
      // Trigger content script activity
      document.body.setAttribute('data-truthlens-test', 'true');
      
      // Simulate content analysis
      const testContent = Array(1000).fill('This is test content for analysis. ').join('');
      const testDiv = document.createElement('div');
      testDiv.textContent = testContent;
      document.body.appendChild(testDiv);
    });
    
    await page.waitForTimeout(2000);
    
    const metrics = await page.metrics();
    const memoryUsage = Math.round(metrics.JSHeapUsedSize / 1024 / 1024);
    
    results.tests.content = {
      memoryUsage,
      threshold: MEMORY_THRESHOLDS.content,
      status: memoryUsage <= MEMORY_THRESHOLDS.content ? 'PASS' : 'FAIL'
    };
    
    const status = memoryUsage <= MEMORY_THRESHOLDS.content ? '✅' : '❌';
    console.log(`${status} Content Script: ${memoryUsage}MB (limit: ${MEMORY_THRESHOLDS.content}MB)`);
    
    if (memoryUsage > MEMORY_THRESHOLDS.content) {
      results.violations.push({
        component: 'content',
        actual: memoryUsage,
        threshold: MEMORY_THRESHOLDS.content,
        overage: memoryUsage - MEMORY_THRESHOLDS.content
      });
    }
    
  } catch (error) {
    console.log('⚠️  Content script memory test failed:', error.message);
    results.tests.content = { error: error.message };
  } finally {
    await page.close();
  }
}

async function testPopupMemory(browser, results) {
  console.log('\n🪟 Testing Popup Memory...');
  
  const page = await browser.newPage();
  
  try {
    // Navigate to the popup page (simulated)
    const popupPath = path.join(__dirname, '..', 'dist', 'popup', 'index.html');
    await page.goto(`file://${popupPath}`);
    await page.waitForTimeout(2000);
    
    // Simulate popup interactions
    await page.evaluate(() => {
      // Trigger React rendering and state changes
      if (window.React && window.ReactDOM) {
        // Simulate heavy component rendering
        for (let i = 0; i < 100; i++) {
          const div = document.createElement('div');
          div.innerHTML = `<span>Test component ${i}</span>`;
          document.body.appendChild(div);
        }
      }
    });
    
    await page.waitForTimeout(1000);
    
    const metrics = await page.metrics();
    const memoryUsage = Math.round(metrics.JSHeapUsedSize / 1024 / 1024);
    
    results.tests.popup = {
      memoryUsage,
      threshold: MEMORY_THRESHOLDS.popup,
      status: memoryUsage <= MEMORY_THRESHOLDS.popup ? 'PASS' : 'FAIL'
    };
    
    const status = memoryUsage <= MEMORY_THRESHOLDS.popup ? '✅' : '❌';
    console.log(`${status} Popup: ${memoryUsage}MB (limit: ${MEMORY_THRESHOLDS.popup}MB)`);
    
    if (memoryUsage > MEMORY_THRESHOLDS.popup) {
      results.violations.push({
        component: 'popup',
        actual: memoryUsage,
        threshold: MEMORY_THRESHOLDS.popup,
        overage: memoryUsage - MEMORY_THRESHOLDS.popup
      });
    }
    
  } catch (error) {
    console.log('⚠️  Popup memory test failed:', error.message);
    results.tests.popup = { error: error.message };
  } finally {
    await page.close();
  }
}

async function testOptionsMemory(browser, results) {
  console.log('\n⚙️  Testing Options Page Memory...');
  
  const page = await browser.newPage();
  
  try {
    // Navigate to the options page (simulated)
    const optionsPath = path.join(__dirname, '..', 'dist', 'options', 'index.html');
    await page.goto(`file://${optionsPath}`);
    await page.waitForTimeout(2000);
    
    const metrics = await page.metrics();
    const memoryUsage = Math.round(metrics.JSHeapUsedSize / 1024 / 1024);
    
    results.tests.options = {
      memoryUsage,
      threshold: MEMORY_THRESHOLDS.options,
      status: memoryUsage <= MEMORY_THRESHOLDS.options ? 'PASS' : 'FAIL'
    };
    
    const status = memoryUsage <= MEMORY_THRESHOLDS.options ? '✅' : '❌';
    console.log(`${status} Options Page: ${memoryUsage}MB (limit: ${MEMORY_THRESHOLDS.options}MB)`);
    
    if (memoryUsage > MEMORY_THRESHOLDS.options) {
      results.violations.push({
        component: 'options',
        actual: memoryUsage,
        threshold: MEMORY_THRESHOLDS.options,
        overage: memoryUsage - MEMORY_THRESHOLDS.options
      });
    }
    
  } catch (error) {
    console.log('⚠️  Options page memory test failed:', error.message);
    results.tests.options = { error: error.message };
  } finally {
    await page.close();
  }
}

async function memoryStressTest(browser, results) {
  console.log('\n🔥 Running Memory Stress Test...');
  
  const page = await browser.newPage();
  
  try {
    await page.goto('https://example.com');
    
    // Simulate heavy usage scenarios
    for (let i = 0; i < 5; i++) {
      console.log(`  Stress iteration ${i + 1}/5...`);
      
      await page.evaluate((iteration) => {
        // Create large DOM structures
        for (let j = 0; j < 200; j++) {
          const div = document.createElement('div');
          div.innerHTML = `
            <div class="stress-test-${iteration}-${j}">
              <p>Heavy content block ${j}</p>
              <span>${Array(100).fill('test').join(' ')}</span>
            </div>
          `;
          document.body.appendChild(div);
        }
        
        // Trigger garbage collection
        if (window.gc) {
          window.gc();
        }
      }, i);
      
      await page.waitForTimeout(1000);
    }
    
    const finalMetrics = await page.metrics();
    const finalMemory = Math.round(finalMetrics.JSHeapUsedSize / 1024 / 1024);
    
    results.tests.stressTest = {
      finalMemoryUsage: finalMemory,
      description: 'Memory usage after stress test'
    };
    
    console.log(`📊 Stress Test Final Memory: ${finalMemory}MB`);
    
  } catch (error) {
    console.log('⚠️  Memory stress test failed:', error.message);
    results.tests.stressTest = { error: error.message };
  } finally {
    await page.close();
  }
}

function analyzeMemoryResults(results) {
  console.log('\n📊 Memory Analysis Summary:');
  console.log('='.repeat(40));
  
  let totalTests = 0;
  let passedTests = 0;
  
  Object.entries(results.tests).forEach(([component, test]) => {
    if (test.status) {
      totalTests++;
      if (test.status === 'PASS') passedTests++;
    }
  });
  
  console.log(`Tests Passed: ${passedTests}/${totalTests}`);
  
  if (results.violations.length > 0) {
    console.log('\n❌ Memory Violations:');
    results.violations.forEach(violation => {
      console.log(`  • ${violation.component}: ${violation.overage}MB over limit`);
      
      // Generate recommendations
      if (violation.component === 'background') {
        results.recommendations.push('Optimize background script: Consider lazy loading AI services and reducing memory footprint');
      } else if (violation.component === 'content') {
        results.recommendations.push('Optimize content scripts: Implement efficient DOM observation and reduce memory leaks');
      } else if (violation.component === 'popup') {
        results.recommendations.push('Optimize popup: Reduce React bundle size and implement virtual scrolling');
      }
    });
  }
  
  if (results.recommendations.length > 0) {
    console.log('\n💡 Optimization Recommendations:');
    results.recommendations.forEach(rec => {
      console.log(`  • ${rec}`);
    });
  }
}

if (require.main === module) {
  testExtensionMemory().catch(error => {
    console.error('Memory test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { testExtensionMemory };