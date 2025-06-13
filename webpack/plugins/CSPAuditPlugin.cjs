/**
 * Webpack Plugin for CSP Compliance Audit
 * Runs CSP audit after build completion to ensure MV3 compliance
 */

const { execSync } = require('child_process');
const path = require('path');
const chalk = require('chalk');

class CSPAuditPlugin {
  constructor(options = {}) {
    this.options = {
      enabled: options.enabled !== false,
      failOnError: options.failOnError !== false,
      reportPath: options.reportPath || 'csp-audit-report.json',
      distPath: options.distPath || 'dist',
      ...options
    };
  }

  apply(compiler) {
    if (!this.options.enabled) {
      return;
    }

    compiler.hooks.afterEmit.tapAsync('CSPAuditPlugin', (compilation, callback) => {
      console.log(chalk.blue.bold('\n🔍 Running CSP Compliance Audit...\n'));

      try {
        // Run the CSP audit
        const result = execSync(
          `npx tsx ${path.join(__dirname, '../../scripts/csp-audit.ts')} json ${this.options.reportPath}`,
          {
            cwd: path.join(__dirname, '../..'),
            encoding: 'utf-8',
            stdio: 'pipe'
          }
        );

        // Parse the report
        const fs = require('fs');
        const reportPath = path.join(compiler.outputPath, '..', this.options.reportPath);

        if (fs.existsSync(reportPath)) {
          const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

          // Log summary
          if (report.violations.length === 0) {
            console.log(chalk.green.bold('✅ CSP Audit Passed - No violations found!\n'));
          } else {
            console.log(chalk.yellow(`⚠️  CSP Audit found ${report.violations.length} violations:`));
            console.log(chalk.red(`   Errors: ${report.errors}`));
            console.log(chalk.yellow(`   Warnings: ${report.warnings}`));
            console.log(chalk.blue(`   Info: ${report.infos}\n`));

            // Add violations as webpack warnings
            report.violations.forEach(violation => {
              const message = `CSP ${violation.pattern.severity.toUpperCase()}: ${violation.pattern.name} in ${violation.file}:${violation.line}:${violation.column}`;

              if (violation.pattern.severity === 'error') {
                compilation.errors.push(new Error(message));
              } else {
                compilation.warnings.push(new Error(message));
              }
            });

            // Fail build if configured and errors exist
            if (this.options.failOnError && report.errors > 0) {
              const error = new Error(`Build failed: ${report.errors} CSP violations found`);

              // In production mode, throw error
              if (compiler.options.mode === 'production') {
                callback(error);
                return;
              } else {
                // In development, just warn
                console.log(chalk.yellow('⚠️  CSP violations detected in development mode'));
              }
            }
          }
        }

        callback();
      } catch (error) {
        console.error(chalk.red('CSP Audit failed:'), error.message);

        // Only fail the build in production
        if (compiler.options.mode === 'production' && this.options.failOnError) {
          callback(error);
        } else {
          // In development, continue with warning
          compilation.warnings.push(new Error(`CSP Audit failed: ${error.message}`));
          callback();
        }
      }
    });

    // Also run on watch mode file changes
    compiler.hooks.watchRun.tapAsync('CSPAuditPlugin', (compiler, callback) => {
      if (this.options.watchMode) {
        console.log(chalk.gray('CSP Audit will run after compilation...'));
      }
      callback();
    });
  }
}

module.exports = CSPAuditPlugin;
