#!/usr/bin/env node

/**
 * CSP Compliance Audit Tool
 * Scans bundled JavaScript files for Content Security Policy violations
 * Designed to catch potential MV3 compliance issues before they reach production
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';

interface ViolationPattern {
  name: string;
  pattern: RegExp;
  severity: 'error' | 'warning' | 'info';
  description: string;
  recommendation: string;
  allowedContexts?: RegExp[]; // Patterns where this violation is acceptable
}

interface Violation {
  file: string;
  line: number;
  column: number;
  code: string;
  pattern: ViolationPattern;
  context: string; // Surrounding code for context
}

interface AuditReport {
  totalFiles: number;
  scannedFiles: number;
  violations: Violation[];
  errors: number;
  warnings: number;
  infos: number;
  passedFiles: string[];
  timestamp: string;
}

interface CSPAuditorOptions {
  exitOnError?: boolean; // If true, process.exit(1) on errors. Default: true for CLI, false for tests
}

class CSPAuditor {
  private readonly options: CSPAuditorOptions;
  private readonly forbiddenPatterns: ViolationPattern[] = [
    // Critical CSP violations
    {
      name: 'eval',
      pattern: /\beval\s*\(/g,
      severity: 'error',
      description: 'Direct eval() usage is forbidden in MV3',
      recommendation: 'Use JSON.parse() for data or refactor logic to avoid dynamic code execution'
    },
    {
      name: 'new Function',
      pattern: /new\s+Function\s*\(/g,
      severity: 'error',
      description: 'new Function() creates dynamic code and is forbidden',
      recommendation: 'Refactor to use predefined functions or use a mapping object'
    },
    {
      name: 'setTimeout with string',
      pattern: /setTimeout\s*\(\s*["'`]/g,
      severity: 'error',
      description: 'setTimeout with string argument evaluates code',
      recommendation: 'Pass a function reference instead: setTimeout(() => { ... }, delay)'
    },
    {
      name: 'setInterval with string',
      pattern: /setInterval\s*\(\s*["'`]/g,
      severity: 'error',
      description: 'setInterval with string argument evaluates code',
      recommendation: 'Pass a function reference instead: setInterval(() => { ... }, delay)'
    },

    // DOM-based XSS risks
    {
      name: 'innerHTML assignment',
      pattern: /\.innerHTML\s*=(?!=\s*["'`]\s*["'`])/g,
      severity: 'warning',
      description: 'innerHTML can introduce XSS vulnerabilities',
      recommendation: 'Use textContent for text or DOMPurify.sanitize() for HTML',
      allowedContexts: [/DOMPurify\.sanitize/]
    },
    {
      name: 'outerHTML assignment',
      pattern: /\.outerHTML\s*=/g,
      severity: 'warning',
      description: 'outerHTML can introduce XSS vulnerabilities',
      recommendation: 'Use DOM methods like createElement() and appendChild()'
    },
    {
      name: 'document.write',
      pattern: /document\s*\.\s*write\s*\(/g,
      severity: 'error',
      description: 'document.write() is forbidden in extensions',
      recommendation: 'Use DOM manipulation methods instead'
    },
    {
      name: 'insertAdjacentHTML',
      pattern: /\.insertAdjacentHTML\s*\(/g,
      severity: 'warning',
      description: 'insertAdjacentHTML can introduce XSS if not sanitized',
      recommendation: 'Ensure content is sanitized with DOMPurify before insertion',
      allowedContexts: [/DOMPurify\.sanitize/]
    },

    // Remote code execution risks
    {
      name: 'fetch to execute code',
      pattern: /fetch\s*\([^)]+\)\s*\.then\s*\([^)]+\)\s*\.then\s*\(\s*eval\s*\)/g,
      severity: 'error',
      description: 'Fetching and evaluating remote code is forbidden',
      recommendation: 'Fetch data only, not executable code'
    },
    {
      name: 'script injection',
      pattern: /createElement\s*\(\s*["'`]script["'`]\s*\)/g,
      severity: 'warning',
      description: 'Dynamic script creation may violate CSP',
      recommendation: 'Bundle all required scripts or use message passing'
    },

    // Unsafe jQuery patterns
    {
      name: 'jQuery html()',
      pattern: /\$\s*\([^)]+\)\s*\.html\s*\(/g,
      severity: 'warning',
      description: 'jQuery .html() can introduce XSS vulnerabilities',
      recommendation: 'Use .text() for text content or sanitize HTML first'
    },
    {
      name: 'jQuery append with HTML',
      pattern: /\$\s*\([^)]+\)\s*\.append\s*\(\s*["'`]<[^>]+>/g,
      severity: 'warning',
      description: 'Appending raw HTML strings can introduce XSS',
      recommendation: 'Use jQuery element creation or sanitize content'
    },

    // Inline event handlers
    {
      name: 'onclick in string',
      pattern: /["'`].*\bonclick\s*=\s*["'`]/g,
      severity: 'warning',
      description: 'Inline event handlers violate CSP',
      recommendation: 'Use addEventListener() instead'
    },
    {
      name: 'javascript: protocol',
      pattern: /["'`]javascript:/gi,
      severity: 'error',
      description: 'javascript: URLs are forbidden',
      recommendation: 'Use proper event handlers or data URLs'
    },

    // Other security concerns
    {
      name: 'base64 decode for execution',
      pattern: /atob\s*\([^)]+\).*\b(eval|Function)\b/g,
      severity: 'error',
      description: 'Decoding base64 for code execution is forbidden',
      recommendation: 'Only decode data, not executable code'
    },
    {
      name: 'unsafe-eval directive',
      pattern: /['"]unsafe-eval['"]/g,
      severity: 'error',
      description: 'Requesting unsafe-eval in CSP is forbidden in MV3',
      recommendation: 'Remove unsafe-eval and refactor code to avoid eval()'
    }
  ];

  constructor(private readonly distPath: string = 'dist', options: CSPAuditorOptions = {}) {
    this.options = {
      exitOnError: true, // Default to true for backward compatibility
      ...options
    };

    if (!fs.existsSync(distPath)) {
      throw new Error(`Distribution directory '${distPath}' does not exist. Run build first.`);
    }
  }

  /**
   * Main audit function
   */
  async audit(): Promise<AuditReport> {
    console.log(chalk.blue.bold('\n🔍 Starting CSP Compliance Audit...\n'));

    const report: AuditReport = {
      totalFiles: 0,
      scannedFiles: 0,
      violations: [],
      errors: 0,
      warnings: 0,
      infos: 0,
      passedFiles: [],
      timestamp: new Date().toISOString()
    };

    try {
      // Find all JavaScript files in dist
      const files = await glob(`${this.distPath}/**/*.js`, {
        ignore: ['**/node_modules/**', '**/vendor/**']
      });

      report.totalFiles = files.length;
      console.log(chalk.gray(`Found ${files.length} JavaScript files to scan\n`));

      // Scan each file
      for (const file of files) {
        const violations = await this.scanFile(file);
        if (violations.length === 0) {
          report.passedFiles.push(file);
        } else {
          report.violations.push(...violations);
          violations.forEach(v => {
            switch (v.pattern.severity) {
              case 'error': report.errors++; break;
              case 'warning': report.warnings++; break;
              case 'info': report.infos++; break;
            }
          });
        }
        report.scannedFiles++;
      }

      this.printReport(report);
      return report;

    } catch (error) {
      console.error(chalk.red('Audit failed:'), error);
      throw error;
    }
  }

  /**
   * Scan a single file for violations
   */
  private async scanFile(filePath: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    for (const pattern of this.forbiddenPatterns) {
      let match: RegExpExecArray | null;
      const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);

      while ((match = regex.exec(content)) !== null) {
        const position = this.getLineAndColumn(content, match.index);
        const contextLines = this.getContext(lines, position.line - 1);

        // Check if this violation is in an allowed context
        if (pattern.allowedContexts) {
          const surroundingCode = this.getSurroundingCode(content, match.index, 200);
          const isAllowed = pattern.allowedContexts.some(ctx => ctx.test(surroundingCode));
          if (isAllowed) continue;
        }

        violations.push({
          file: path.relative(process.cwd(), filePath),
          line: position.line,
          column: position.column,
          code: match[0],
          pattern,
          context: contextLines
        });
      }
    }

    return violations;
  }

  /**
   * Get line and column number from string index
   */
  private getLineAndColumn(content: string, index: number): { line: number; column: number } {
    const lines = content.substring(0, index).split('\n');
    return {
      line: lines.length,
      column: lines[lines.length - 1].length + 1
    };
  }

  /**
   * Get surrounding lines for context
   */
  private getContext(lines: string[], lineIndex: number, contextSize: number = 2): string {
    const start = Math.max(0, lineIndex - contextSize);
    const end = Math.min(lines.length - 1, lineIndex + contextSize);

    return lines
      .slice(start, end + 1)
      .map((line, i) => {
        const actualLine = start + i + 1;
        const prefix = actualLine === lineIndex + 1 ? '>' : ' ';
        return `${prefix} ${actualLine.toString().padStart(4)}: ${line}`;
      })
      .join('\n');
  }

  /**
   * Get surrounding code for context checking
   */
  private getSurroundingCode(content: string, index: number, radius: number): string {
    const start = Math.max(0, index - radius);
    const end = Math.min(content.length, index + radius);
    return content.substring(start, end);
  }

  /**
   * Print formatted report
   */
  private printReport(report: AuditReport): void {
    console.log(chalk.blue.bold('\n📊 Audit Report\n'));
    console.log(chalk.gray(`Scanned: ${report.scannedFiles}/${report.totalFiles} files`));
    console.log(chalk.gray(`Timestamp: ${new Date(report.timestamp).toLocaleString()}\n`));

    if (report.violations.length === 0) {
      console.log(chalk.green.bold('✅ All files passed CSP compliance audit!\n'));
      return;
    }

    // Group violations by severity
    const errors = report.violations.filter(v => v.pattern.severity === 'error');
    const warnings = report.violations.filter(v => v.pattern.severity === 'warning');
    const infos = report.violations.filter(v => v.pattern.severity === 'info');

    // Print errors
    if (errors.length > 0) {
      console.log(chalk.red.bold(`\n❌ Errors (${errors.length}):`));
      errors.forEach(v => this.printViolation(v));
    }

    // Print warnings
    if (warnings.length > 0) {
      console.log(chalk.yellow.bold(`\n⚠️  Warnings (${warnings.length}):`));
      warnings.forEach(v => this.printViolation(v));
    }

    // Print infos
    if (infos.length > 0) {
      console.log(chalk.blue.bold(`\nℹ️  Info (${infos.length}):`));
      infos.forEach(v => this.printViolation(v));
    }

    // Summary
    console.log(chalk.bold('\n📈 Summary:'));
    console.log(`  ${chalk.red(`Errors: ${report.errors}`)}`);
    console.log(`  ${chalk.yellow(`Warnings: ${report.warnings}`)}`);
    console.log(`  ${chalk.blue(`Info: ${report.infos}`)}`);
    console.log(`  ${chalk.green(`Passed: ${report.passedFiles.length} files`)}\n`);

    // Exit code
    if (report.errors > 0) {
      console.log(chalk.red.bold('❌ Build failed due to CSP violations\n'));
      if (this.options.exitOnError) {
        process.exit(1);
      }
    } else if (report.warnings > 0) {
      console.log(chalk.yellow.bold('⚠️  Build completed with warnings\n'));
    }
  }

  /**
   * Print a single violation
   */
  private printViolation(violation: Violation): void {
    const severityColor = {
      error: chalk.red,
      warning: chalk.yellow,
      info: chalk.blue
    }[violation.pattern.severity];

    console.log(`\n${severityColor.bold(violation.pattern.name)}`);
    console.log(chalk.gray(`${violation.file}:${violation.line}:${violation.column}`));
    console.log(chalk.gray('Context:'));
    console.log(violation.context);
    console.log(chalk.cyan(`Issue: ${violation.pattern.description}`));
    console.log(chalk.green(`Fix: ${violation.pattern.recommendation}`));
  }

  /**
   * Generate JSON report for CI/CD integration
   */
  async generateJsonReport(outputPath: string = 'csp-audit-report.json'): Promise<void> {
    const report = await this.audit();
    await fs.promises.writeFile(
      outputPath,
      JSON.stringify(report, null, 2),
      'utf-8'
    );
  }

  /**
   * Watch mode for development
   */
  async watch(): Promise<void> {
    console.log(chalk.blue.bold('👁️  Watching for changes...\n'));

    // Initial audit
    await this.audit();

    // Watch for changes
    const chokidar = await import('chokidar');
    const watcher = chokidar.watch(`${this.distPath}/**/*.js`, {
      ignored: ['**/node_modules/**', '**/vendor/**'],
      persistent: true
    });

    watcher.on('change', async (filePath) => {
      console.clear();
      console.log(chalk.gray(`File changed: ${filePath}`));
      await this.audit();
    });
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const distPath = args[1] || 'dist';

  const auditor = new CSPAuditor(distPath);

  try {
    switch (command) {
      case 'watch':
        await auditor.watch();
        break;
      case 'json':
        await auditor.generateJsonReport(args[2]);
        console.log(chalk.green('✅ JSON report generated'));
        break;
      case 'help':
        printHelp();
        break;
      default:
        await auditor.audit();
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error);
    process.exit(1);
  }
}

function printHelp() {
  console.log(chalk.blue.bold('\nCSP Compliance Audit Tool\n'));
  console.log('Usage: npm run csp-audit [command] [options]\n');
  console.log('Commands:');
  console.log('  (default)    Run audit once and exit');
  console.log('  watch        Watch for changes and re-run audit');
  console.log('  json [file]  Generate JSON report');
  console.log('  help         Show this help message\n');
  console.log('Options:');
  console.log('  [dist-path]  Path to distribution directory (default: dist)\n');
  console.log('Examples:');
  console.log('  npm run csp-audit');
  console.log('  npm run csp-audit watch');
  console.log('  npm run csp-audit json report.json');
  console.log('  npm run csp-audit dist-chrome\n');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { CSPAuditor, AuditReport, Violation };
