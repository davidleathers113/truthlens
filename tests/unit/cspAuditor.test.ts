/**
 * Unit tests for CSP Compliance Audit Tool
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CSPAuditor } from '../../scripts/csp-audit';

describe('CSP Auditor', () => {
  let tempDir: string;
  let auditor: CSPAuditor;

  beforeEach(() => {
    // Create temp directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'csp-test-'));
  });

  afterEach(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Pattern Detection', () => {
    it('should detect eval() usage', async () => {
      const testFile = path.join(tempDir, 'test.js');
      fs.writeFileSync(testFile, `
        const result = eval('2 + 2');
        console.log(result);
      `);

      auditor = new CSPAuditor(tempDir, { exitOnError: false });
      const report = await auditor.audit();

      expect(report.violations).toHaveLength(1);
      expect(report.violations[0].pattern.name).toBe('eval');
      expect(report.violations[0].pattern.severity).toBe('error');
    });

    it('should detect new Function() usage', async () => {
      const testFile = path.join(tempDir, 'test.js');
      fs.writeFileSync(testFile, `
        const fn = new Function('x', 'return x * 2');
      `);

      auditor = new CSPAuditor(tempDir, { exitOnError: false });
      const report = await auditor.audit();

      expect(report.violations).toHaveLength(1);
      expect(report.violations[0].pattern.name).toBe('new Function');
    });

    it('should detect setTimeout with string', async () => {
      const testFile = path.join(tempDir, 'test.js');
      fs.writeFileSync(testFile, `
        setTimeout("alert('Hello')", 1000);
      `);

      auditor = new CSPAuditor(tempDir, { exitOnError: false });
      const report = await auditor.audit();

      expect(report.violations).toHaveLength(1);
      expect(report.violations[0].pattern.name).toBe('setTimeout with string');
    });

    it('should not flag setTimeout with function', async () => {
      const testFile = path.join(tempDir, 'test.js');
      fs.writeFileSync(testFile, `
        setTimeout(() => {
          console.log('Hello');
        }, 1000);
      `);

      auditor = new CSPAuditor(tempDir, { exitOnError: false });
      const report = await auditor.audit();

      expect(report.violations).toHaveLength(0);
    });

    it('should detect innerHTML assignments', async () => {
      const testFile = path.join(tempDir, 'test.js');
      fs.writeFileSync(testFile, `
        element.innerHTML = userInput;
      `);

      auditor = new CSPAuditor(tempDir, { exitOnError: false });
      const report = await auditor.audit();

      expect(report.violations).toHaveLength(1);
      expect(report.violations[0].pattern.name).toBe('innerHTML assignment');
      expect(report.violations[0].pattern.severity).toBe('warning');
    });

    it('should allow innerHTML with DOMPurify', async () => {
      const testFile = path.join(tempDir, 'test.js');
      fs.writeFileSync(testFile, `
        element.innerHTML = DOMPurify.sanitize(userInput);
      `);

      auditor = new CSPAuditor(tempDir, { exitOnError: false });
      const report = await auditor.audit();

      expect(report.violations).toHaveLength(0);
    });

    it('should detect document.write', async () => {
      const testFile = path.join(tempDir, 'test.js');
      fs.writeFileSync(testFile, `
        document.write('<h1>Hello</h1>');
      `);

      auditor = new CSPAuditor(tempDir, { exitOnError: false });
      const report = await auditor.audit();

      expect(report.violations).toHaveLength(1);
      expect(report.violations[0].pattern.name).toBe('document.write');
      expect(report.violations[0].pattern.severity).toBe('error');
    });

    it('should detect javascript: protocol', async () => {
      const testFile = path.join(tempDir, 'test.js');
      fs.writeFileSync(testFile, `
        const link = "javascript:alert('XSS')";
      `);

      auditor = new CSPAuditor(tempDir, { exitOnError: false });
      const report = await auditor.audit();

      expect(report.violations).toHaveLength(1);
      expect(report.violations[0].pattern.name).toBe('javascript: protocol');
    });

    it('should detect inline event handlers', async () => {
      const testFile = path.join(tempDir, 'test.js');
      fs.writeFileSync(testFile, `
        const html = '<div onclick="doSomething()">Click me</div>';
      `);

      auditor = new CSPAuditor(tempDir, { exitOnError: false });
      const report = await auditor.audit();

      expect(report.violations).toHaveLength(1);
      expect(report.violations[0].pattern.name).toBe('onclick in string');
    });

    it('should detect unsafe-eval directive', async () => {
      const testFile = path.join(tempDir, 'test.js');
      fs.writeFileSync(testFile, `
        const policy = "script-src 'self' 'unsafe-eval'";
      `);

      auditor = new CSPAuditor(tempDir, { exitOnError: false });
      const report = await auditor.audit();

      expect(report.violations).toHaveLength(1);
      expect(report.violations[0].pattern.name).toBe('unsafe-eval directive');
    });
  });

  describe('Multiple Violations', () => {
    it('should detect multiple violations in one file', async () => {
      const testFile = path.join(tempDir, 'test.js');
      fs.writeFileSync(testFile, `
        // Multiple violations
        eval('console.log("test")');
        element.innerHTML = input;
        setTimeout("doSomething()", 1000);
      `);

      auditor = new CSPAuditor(tempDir, { exitOnError: false });
      const report = await auditor.audit();

      expect(report.violations).toHaveLength(3);
      expect(report.errors).toBe(2); // eval and setTimeout
      expect(report.warnings).toBe(1); // innerHTML
    });
  });

  describe('Clean Files', () => {
    it('should pass clean files', async () => {
      const testFile = path.join(tempDir, 'clean.js');
      fs.writeFileSync(testFile, `
        // Clean code
        const result = JSON.parse(data);
        element.textContent = userInput;
        setTimeout(() => doSomething(), 1000);

        // Using proper DOM methods
        const div = document.createElement('div');
        div.textContent = 'Hello';
        parent.appendChild(div);
      `);

      auditor = new CSPAuditor(tempDir, { exitOnError: false });
      const report = await auditor.audit();

      expect(report.violations).toHaveLength(0);
      expect(report.passedFiles[0]).toMatch(/clean\.js$/);
    });
  });

  describe('Report Generation', () => {
    it('should generate accurate report counts', async () => {
      // Create multiple files
      fs.writeFileSync(path.join(tempDir, 'file1.js'), 'eval("test")');
      fs.writeFileSync(path.join(tempDir, 'file2.js'), 'element.innerHTML = x');
      fs.writeFileSync(path.join(tempDir, 'file3.js'), 'console.log("clean")');

      auditor = new CSPAuditor(tempDir, { exitOnError: false });
      const report = await auditor.audit();

      expect(report.totalFiles).toBe(3);
      expect(report.scannedFiles).toBe(3);
      expect(report.passedFiles).toHaveLength(1);
      expect(report.violations).toHaveLength(2);
      expect(report.errors).toBe(1);
      expect(report.warnings).toBe(1);
    });

    it('should include context in violations', async () => {
      const testFile = path.join(tempDir, 'test.js');
      fs.writeFileSync(testFile, `
        // Line 1
        // Line 2
        eval('dangerous'); // Line 3
        // Line 4
        // Line 5
      `);

      auditor = new CSPAuditor(tempDir, { exitOnError: false });
      const report = await auditor.audit();

      const violation = report.violations[0];
      expect(violation.line).toBe(4); // Line 4 because of the newline at the start
      expect(violation.context).toContain('>    4:');
      expect(violation.context).toContain('eval');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty files', async () => {
      const testFile = path.join(tempDir, 'empty.js');
      fs.writeFileSync(testFile, '');

      auditor = new CSPAuditor(tempDir, { exitOnError: false });
      const report = await auditor.audit();

      expect(report.violations).toHaveLength(0);
      expect(report.passedFiles[0]).toMatch(/empty\.js$/);
    });

    it('should handle minified code', async () => {
      const testFile = path.join(tempDir, 'minified.js');
      fs.writeFileSync(testFile, 'function a(){eval("x")}var b=new Function("return 1");');

      auditor = new CSPAuditor(tempDir, { exitOnError: false });
      const report = await auditor.audit();

      expect(report.violations).toHaveLength(2);
    });

    it('should ignore vendor and node_modules', async () => {
      fs.mkdirSync(path.join(tempDir, 'vendor'));
      fs.mkdirSync(path.join(tempDir, 'node_modules'));

      fs.writeFileSync(path.join(tempDir, 'vendor', 'lib.js'), 'eval("vendor")');
      fs.writeFileSync(path.join(tempDir, 'node_modules', 'lib.js'), 'eval("modules")');
      fs.writeFileSync(path.join(tempDir, 'app.js'), 'console.log("app")');

      auditor = new CSPAuditor(tempDir, { exitOnError: false });
      const report = await auditor.audit();

      expect(report.totalFiles).toBe(1);
      expect(report.violations).toHaveLength(0);
    });
  });

  describe('False Positives', () => {
    it('should flag eval even in comments (limitation of regex-based approach)', async () => {
      const testFile = path.join(tempDir, 'test.js');
      fs.writeFileSync(testFile, `
        // Don't use eval() in production
        /* eval is dangerous */
        const evaluate = 'eval';
      `);

      auditor = new CSPAuditor(tempDir, { exitOnError: false });
      const report = await auditor.audit();

      // Note: This is a known limitation - regex-based approach will match eval( in comments
      // A proper AST-based parser would be needed to avoid this
      expect(report.violations).toHaveLength(1);
      expect(report.violations[0].pattern.name).toBe('eval');
    });

    it('should not flag innerHTML in property names', async () => {
      const testFile = path.join(tempDir, 'test.js');
      fs.writeFileSync(testFile, `
        const config = {
          innerHTML: true,
          dangerouslySetInnerHTML: '<div>Test</div>'
        };
      `);

      auditor = new CSPAuditor(tempDir, { exitOnError: false });
      const report = await auditor.audit();

      expect(report.violations).toHaveLength(0);
    });
  });

  describe('JSON Report', () => {
    it('should generate valid JSON report', async () => {
      const testFile = path.join(tempDir, 'test.js');
      fs.writeFileSync(testFile, 'eval("test")');

      auditor = new CSPAuditor(tempDir, { exitOnError: false });
      const jsonPath = path.join(tempDir, 'report.json');
      await auditor.generateJsonReport(jsonPath);

      expect(fs.existsSync(jsonPath)).toBe(true);

      const report = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      expect(report.violations).toHaveLength(1);
      expect(report.timestamp).toBeDefined();
    });
  });
});
