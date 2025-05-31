#!/usr/bin/env node

/**
 * Bundle Size Monitor - 2025 Best Practices
 * Monitors extension bundle size and alerts on regression
 */

const fs = require('fs');
const path = require('path');

// Bundle size limits in bytes
const SIZE_LIMITS = {
  background: 2 * 1024 * 1024,     // 2MB for background script
  content: 1 * 1024 * 1024,        // 1MB for content scripts  
  popup: 500 * 1024,               // 500KB for popup
  options: 500 * 1024,             // 500KB for options page
  total: 5 * 1024 * 1024           // 5MB total extension size
};

// Performance budgets
const PERFORMANCE_BUDGETS = {
  'background.js': { size: SIZE_LIMITS.background, gzip: SIZE_LIMITS.background * 0.3 },
  'content.js': { size: SIZE_LIMITS.content, gzip: SIZE_LIMITS.content * 0.3 },
  'popup.js': { size: SIZE_LIMITS.popup, gzip: SIZE_LIMITS.popup * 0.3 },
  'options.js': { size: SIZE_LIMITS.options, gzip: SIZE_LIMITS.options * 0.3 }
};

function formatBytes(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Byte';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

function analyzeBundleSize() {
  const distPath = path.join(__dirname, '..', 'dist');
  const analysis = {
    files: {},
    totalSize: 0,
    violations: [],
    recommendations: []
  };

  console.log('📊 Bundle Size Analysis\n');

  // Analyze individual files
  Object.keys(PERFORMANCE_BUDGETS).forEach(filename => {
    const filePath = path.join(distPath, filename);
    const size = getFileSize(filePath);
    const budget = PERFORMANCE_BUDGETS[filename];
    
    analysis.files[filename] = {
      size,
      budget: budget.size,
      percentage: (size / budget.size) * 100,
      status: size <= budget.size ? 'PASS' : 'FAIL'
    };
    
    analysis.totalSize += size;
    
    const status = size <= budget.size ? '✅' : '❌';
    const percentage = ((size / budget.size) * 100).toFixed(1);
    
    console.log(`${status} ${filename.padEnd(15)} ${formatBytes(size).padEnd(10)} (${percentage}% of budget)`);
    
    if (size > budget.size) {
      analysis.violations.push({
        file: filename,
        actual: size,
        budget: budget.size,
        overage: size - budget.size
      });
    }
    
    // Generate recommendations for large files
    if (size > budget.size * 0.8) {
      if (filename.includes('background')) {
        analysis.recommendations.push(`Consider code splitting for ${filename} - current size is ${percentage}% of budget`);
      } else if (filename.includes('content')) {
        analysis.recommendations.push(`Optimize ${filename} by lazy loading features or reducing dependencies`);
      } else {
        analysis.recommendations.push(`${filename} is approaching size limit - consider optimization`);
      }
    }
  });

  // Check total extension size
  console.log('\n' + '='.repeat(50));
  const totalStatus = analysis.totalSize <= SIZE_LIMITS.total ? '✅' : '❌';
  const totalPercentage = ((analysis.totalSize / SIZE_LIMITS.total) * 100).toFixed(1);
  console.log(`${totalStatus} Total Extension Size: ${formatBytes(analysis.totalSize)} (${totalPercentage}% of limit)`);

  if (analysis.totalSize > SIZE_LIMITS.total) {
    analysis.violations.push({
      file: 'total',
      actual: analysis.totalSize,
      budget: SIZE_LIMITS.total,
      overage: analysis.totalSize - SIZE_LIMITS.total
    });
  }

  // Output results
  if (analysis.violations.length > 0) {
    console.log('\n❌ Bundle Size Violations:');
    analysis.violations.forEach(violation => {
      console.log(`  • ${violation.file}: ${formatBytes(violation.overage)} over budget`);
    });
  }

  if (analysis.recommendations.length > 0) {
    console.log('\n💡 Optimization Recommendations:');
    analysis.recommendations.forEach(rec => {
      console.log(`  • ${rec}`);
    });
  }

  // Save analysis results
  const reportPath = path.join(__dirname, '..', 'bundle-analysis.json');
  fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2));
  console.log(`\n📄 Detailed analysis saved to ${reportPath}`);

  // Exit with error if violations exist
  if (analysis.violations.length > 0) {
    console.log('\n🚨 Bundle size check failed!');
    process.exit(1);
  } else {
    console.log('\n✅ Bundle size check passed!');
    process.exit(0);
  }
}

// Historical comparison
function compareWithPrevious() {
  const historyPath = path.join(__dirname, '..', 'bundle-history.json');
  let history = [];
  
  try {
    if (fs.existsSync(historyPath)) {
      history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    }
  } catch (error) {
    console.log('📝 No previous bundle history found, creating new baseline');
  }

  const current = {
    timestamp: new Date().toISOString(),
    commit: process.env.GITHUB_SHA || 'local',
    totalSize: 0,
    files: {}
  };

  Object.keys(PERFORMANCE_BUDGETS).forEach(filename => {
    const filePath = path.join(__dirname, '..', 'dist', filename);
    const size = getFileSize(filePath);
    current.files[filename] = size;
    current.totalSize += size;
  });

  history.push(current);
  
  // Keep only last 30 entries
  if (history.length > 30) {
    history = history.slice(-30);
  }

  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));

  // Compare with previous build
  if (history.length > 1) {
    const previous = history[history.length - 2];
    const sizeDiff = current.totalSize - previous.totalSize;
    const percentChange = ((sizeDiff / previous.totalSize) * 100).toFixed(1);
    
    console.log('\n📈 Size Comparison with Previous Build:');
    if (sizeDiff > 0) {
      console.log(`📈 Size increased by ${formatBytes(sizeDiff)} (${percentChange}%)`);
    } else if (sizeDiff < 0) {
      console.log(`📉 Size decreased by ${formatBytes(Math.abs(sizeDiff))} (${Math.abs(percentChange)}%)`);
    } else {
      console.log(`➡️  No change in bundle size`);
    }
  }
}

if (require.main === module) {
  compareWithPrevious();
  analyzeBundleSize();
}

module.exports = { analyzeBundleSize, compareWithPrevious };