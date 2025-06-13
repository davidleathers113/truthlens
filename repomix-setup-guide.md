# Repomix Setup Guide for AI Agents

This guide provides step-by-step instructions for AI agents to properly configure Repomix for any software project. Repomix packages your codebase into a single, AI-friendly file for efficient analysis.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Configuration Strategy](#configuration-strategy)
4. [Creating the Configuration File](#creating-the-configuration-file)
5. [Setting Up Ignore Patterns](#setting-up-ignore-patterns)
6. [Testing and Validation](#testing-and-validation)
7. [Optimization Tips](#optimization-tips)
8. [Common Patterns by Project Type](#common-patterns-by-project-type)

## Prerequisites

Before setting up Repomix, verify:

1. **Check if Repomix is installed:**
   ```bash
   which repomix
   ```

2. **If not installed, install globally:**
   ```bash
   npm install -g repomix
   # or
   yarn global add repomix
   ```

3. **For one-time use without installation:**
   ```bash
   npx repomix
   ```

## Initial Setup

### Step 1: Analyze the Project Structure

Before creating configuration files, understand the project:

```bash
# List top-level directories
ls -la

# Check for existing configuration
ls -la repomix.config.json .repomixignore

# Examine project type indicators
ls -la package.json go.mod Cargo.toml requirements.txt pom.xml
```

### Step 2: Identify Project Type

Determine the project type to apply appropriate patterns:
- **Web/Node.js**: Look for `package.json`, `node_modules/`
- **Python**: Look for `requirements.txt`, `setup.py`, `pyproject.toml`
- **Go**: Look for `go.mod`, `go.sum`
- **Rust**: Look for `Cargo.toml`, `Cargo.lock`
- **Java/Kotlin**: Look for `pom.xml`, `build.gradle`

## Configuration Strategy

### Core Principles

1. **Focus on Application Code**: Include only files essential to understanding the application's functionality
2. **Exclude Generated Content**: Build outputs, dependencies, compiled files
3. **Remove Development Artifacts**: Task tracking, AI assistant files, internal documentation
4. **Minimize Token Usage**: Binary files, large data files, repetitive content
5. **Protect Sensitive Information**: API keys, credentials, private configuration

### What to Include

- Source code files (`.js`, `.ts`, `.py`, `.go`, etc.)
- Configuration files essential to the application
- Test files (helps understand expected behavior)
- Core documentation (`README.md`, API docs)
- Build configuration files
- Public assets required for functionality

### What to Exclude

- Build outputs (`dist/`, `build/`, `target/`)
- Dependencies (`node_modules/`, `vendor/`, `.venv/`)
- IDE/Editor files (`.idea/`, `.vscode/`)
- Version control (`.git/`, `.svn/`)
- Temporary files (`*.tmp`, `*.cache`, `*.log`)
- Binary files (images, videos, compiled libraries)
- Development planning documents
- CI/CD artifacts
- Test outputs and reports

## Creating the Configuration File

### Step 1: Create repomix.config.json

Create a comprehensive configuration file based on the project type:

```json
{
  "$schema": "https://repomix.com/schemas/latest/schema.json",
  "version": "2.0",
  "input": {
    "maxFileSize": 5000000,
    "encoding": "utf-8",
    "respectGitignore": true,
    "followSymlinks": false,
    "include": [
      // Add project-specific patterns here
      "src/**/*.{ts,tsx,js,jsx,json}",
      "tests/**/*.{test,spec}.{ts,js}",
      "config/**/*.{json,yml,yaml}",
      "*.{json,md,yml,yaml}",
      "!*.min.js",
      "!*.bundle.js"
    ],
    "ignore": {
      "useGitignore": true,
      "useDefaultPatterns": true,
      "customPatterns": [
        // Will be populated based on project type
      ]
    }
  },
  "processing": {
    "contentFilters": {
      "removeTestData": false,
      "removeMockData": false,
      "removeGeneratedCode": ["*.generated.*", "*.d.ts"],
      "normalizeWhitespace": true
    },
    "codeProcessing": {
      "removeComments": false,
      "removeEmptyLines": false,
      "trimTrailingWhitespace": true,
      "normalizeLineEndings": "lf",
      "preserveStringLiterals": true
    },
    "contextEnhancement": {
      "extractImports": true,
      "extractExports": true,
      "extractDependencies": true,
      "extractTodos": true,
      "includeGitInfo": true,
      "includeFileStats": true
    }
  },
  "output": {
    "filePath": "repomix-output.md",
    "style": "markdown",
    "format": "structured",
    "compress": true,
    "splitThreshold": 2000000,
    "headerText": "# Project Name\n\nBrief description of the project and its purpose.\n",
    "fileSummary": true,
    "directoryStructure": true,
    "showLineNumbers": true,
    "includeEmptyFiles": false,
    "groupByType": true,
    "sortBy": "priority",
    "tableOfContents": true,
    "includeMetrics": true
  },
  "security": {
    "enableChecks": true,
    "excludeSuspiciousFiles": true,
    "hideSensitiveData": true,
    "scanForSecrets": true,
    "secretPatterns": [
      "api[_-]?key",
      "secret[_-]?key",
      "password",
      "token",
      "credential",
      "private[_-]?key"
    ]
  },
  "tokens": {
    "enableCounting": true,
    "provider": "tiktoken",
    "model": "gpt-4o",
    "includeBreakdown": true,
    "warningThreshold": 100000,
    "errorThreshold": 200000
  }
}
```

### Step 2: Customize Based on Project Analysis

1. **Update the header text** with project-specific information
2. **Adjust include patterns** based on file extensions used
3. **Add custom ignore patterns** for project-specific artifacts
4. **Set appropriate file size limits** based on project size

## Setting Up Ignore Patterns

### Step 1: Create .repomixignore

Create a `.repomixignore` file with comprehensive patterns:

```gitignore
# Dependencies and Package Managers
node_modules/
vendor/
.venv/
venv/
pip-cache/
.bundle/
bower_components/
jspm_packages/

# Build Outputs
dist/
build/
out/
target/
*.egg-info/
__pycache__/
*.pyc
*.pyo
*.class
*.o
*.so
*.dll
*.exe

# IDE and Editor Files
.idea/
.vscode/
*.swp
*.swo
*~
.project
.classpath
.settings/

# Testing and Coverage
coverage/
.coverage
*.lcov
.nyc_output/
test-results/
jest-results/
pytest_cache/
.pytest_cache/

# Logs and Temporary Files
*.log
logs/
*.tmp
*.temp
*.cache
.DS_Store
Thumbs.db

# Documentation Build
docs/_build/
docs/_site/
site/
.docusaurus/

# Environment and Secrets
.env
.env.*
*.pem
*.key
*.cert
secrets/
credentials/

# Project-Specific Exclusions
# Add patterns specific to your project below
```

### Step 2: Add Project-Specific Patterns

Based on your project analysis, add patterns for:

1. **Development artifacts** (task management, planning docs)
2. **Generated files** (minified code, source maps)
3. **Large binary assets** (images, videos, databases)
4. **CI/CD specific files** (deployment scripts, pipeline configs)

## Testing and Validation

### Step 1: Run Repomix

Test your configuration:

```bash
# Run with quiet output
repomix --quiet

# Check output file size
ls -lh repomix-output.md
```

### Step 2: Validate Output

Check that the output:
1. **Contains core application code**
2. **Excludes unnecessary files**
3. **Is within reasonable size limits** (typically under 2MB)
4. **Doesn't contain sensitive information**

### Step 3: Iterate if Needed

If the output is too large or includes unnecessary files:

1. Review the file list in the output
2. Add more specific ignore patterns
3. Adjust include patterns to be more selective
4. Re-run and validate

## Optimization Tips

### 1. Token Optimization

- Enable compression for large codebases
- Remove comments if they're not essential
- Exclude test data and fixtures
- Use `splitThreshold` for very large projects

### 2. Performance Optimization

- Enable parallel processing for faster execution
- Use caching for repeated runs
- Limit Git history analysis depth

### 3. Security Best Practices

- Always enable security checks
- Review secret patterns for project-specific keys
- Test that sensitive data is properly redacted
- Add project-specific credential patterns

## Common Patterns by Project Type

### Web Applications (React, Vue, Angular)

```json
"include": [
  "src/**/*.{js,jsx,ts,tsx,vue,css,scss}",
  "public/index.html",
  "package.json",
  "webpack.*.js",
  "vite.config.js"
],
"customPatterns": [
  "**/*.min.js",
  "**/*.bundle.js",
  "**/dist/**",
  "**/node_modules/**"
]
```

### Python Projects

```json
"include": [
  "**/*.py",
  "requirements*.txt",
  "setup.py",
  "pyproject.toml",
  "!**/__pycache__/**"
],
"customPatterns": [
  "**/*.pyc",
  "**/*.pyo",
  "**/.venv/**",
  "**/venv/**",
  "**/*.egg-info/**"
]
```

### Go Projects

```json
"include": [
  "**/*.go",
  "go.mod",
  "go.sum",
  "!vendor/**"
],
"customPatterns": [
  "**/vendor/**",
  "**/*.exe",
  "**/*.test",
  "**/bin/**"
]
```

### Chrome Extensions

```json
"include": [
  "src/**/*.{js,ts,tsx,css}",
  "public/manifest.json",
  "background.js",
  "content.js",
  "popup/**/*"
],
"customPatterns": [
  "**/*.crx",
  "**/*.pem",
  "**/dist/**",
  "store-assets/**"
]
```

## Final Checklist

Before considering the setup complete:

- [ ] Configuration file created and customized
- [ ] Ignore patterns comprehensive and project-specific
- [ ] Test run completed successfully
- [ ] Output file size is reasonable (< 2MB recommended)
- [ ] Sensitive information is excluded
- [ ] Core application code is included
- [ ] Non-essential files are excluded
- [ ] Output is optimized for AI analysis

## Troubleshooting

### Output Too Large

1. Add more aggressive ignore patterns
2. Enable compression
3. Reduce `maxFileSize` limit
4. Use more specific include patterns

### Missing Important Files

1. Check if files match ignore patterns
2. Verify include patterns are correct
3. Check file size limits
4. Ensure paths are relative to project root

### Security Warnings

1. Review flagged files for sensitive content
2. Add additional secret patterns
3. Exclude files with credentials
4. Enable `hideSensitiveData` option

## Conclusion

A well-configured Repomix setup will:
- Reduce AI token usage by 40-60%
- Focus analysis on actual application code
- Protect sensitive information
- Provide clear project structure understanding

Remember to periodically review and update your configuration as the project evolves.
