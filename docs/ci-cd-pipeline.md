# CI/CD Pipeline Documentation

## Overview

The TruthLens CI/CD pipeline implements 2025 best practices for Chrome extension development, including automated testing, security scanning, performance monitoring, and Chrome Web Store deployment with partial rollout capabilities.

## Pipeline Architecture

### 🔒 Security & Quality (security-scan)

**Purpose**: Comprehensive security scanning and code quality analysis
**Triggers**: All pushes and pull requests

**Components**:
- **ESLint Security Scan**: Uses `eslint-plugin-security` v3.0.1 with SARIF output
- **npm audit**: Dependency vulnerability scanning  
- **CodeQL Analysis**: SAST scanning with security-extended queries
- **TruffleHog**: Secret scanning with v3.63.2 using `--only-verified` flag

**2025 Features**:
- Pinned commit hashes for all actions for supply chain security
- SARIF format upload to GitHub Security tab
- Active credential verification to eliminate false positives

### 🧪 Build & Test (build-test)

**Purpose**: Multi-environment testing and build verification
**Triggers**: After security scan passes

**Matrix Strategy**: Node.js 18 and 20 for compatibility

**Components**:
- **Chrome Setup**: Uses `browser-actions/setup-chrome` for cross-platform testing
- **TypeScript Checking**: Full type validation
- **Linting**: Code style and quality checks
- **Unit Tests**: Jest with coverage reporting to Codecov
- **Integration Tests**: Chrome API mocking with `jest-webextension-mock`
- **E2E Tests**: Playwright with Chromium for extension testing

**Artifacts**: Build artifacts stored for 7 days

### ⚡ Performance Testing (performance-test)

**Purpose**: Performance monitoring and optimization
**Dependencies**: Requires build-test success

**Components**:
- **Bundle Analysis**: Webpack bundle analyzer with size limits
- **Performance Benchmarks**: Custom performance test suite
- **Memory Testing**: Extension memory usage validation with Puppeteer
- **Size Monitoring**: Bundle size regression detection

**Thresholds**:
- Background script: 2MB limit
- Content scripts: 1MB limit  
- Popup: 500KB limit
- Total extension: 5MB limit

### 📦 Extension Packaging (package)

**Purpose**: Production-ready extension packaging
**Triggers**: Main branch pushes and version tags

**Components**:
- **Version Management**: Semantic versioning with automatic manifest updates
- **Build Optimization**: Production webpack build
- **Release Notes**: Auto-generated from conventional commits
- **ZIP Creation**: Chrome Web Store compatible package
- **Manifest V3**: Full compliance with Chrome's latest requirements

**Artifacts**: Extension packages retained for 90 days

### 🚀 Chrome Web Store Deployment (deploy)

**Purpose**: Automated Chrome Web Store publishing
**Triggers**: Version tags only
**Environment**: Production environment with approvals

**Components**:
- **PlasmoHQ BPP**: Browser Platform Publisher v3 for automation
- **Partial Rollout**: Configurable rollout percentages
- **API Integration**: Chrome Web Store API with OAuth authentication
- **Notification System**: Multi-channel deployment notifications

**2025 Features**:
- Staged rollout with `deployPercentage` API
- Automatic rollback capabilities
- Real-time deployment monitoring

### 📊 Pipeline Monitoring (monitor)

**Purpose**: Pipeline health monitoring and alerting
**Runs**: Always, regardless of other job status

**Components**:
- **Metrics Collection**: Build time, success rates, failure analysis
- **Health Scoring**: 0-100 pipeline health score
- **Alert System**: Critical issue notifications
- **Performance Tracking**: Build optimization recommendations

## Configuration

### Required Secrets

```yaml
# Chrome Web Store API
CHROME_CLIENT_ID: OAuth client ID (Desktop App type)
CHROME_CLIENT_SECRET: OAuth client secret
CHROME_REFRESH_TOKEN: OAuth refresh token
CHROME_APP_ID: Extension ID from Chrome Web Store

# Notifications (Optional)
SLACK_WEBHOOK_URL: Slack integration
DISCORD_WEBHOOK_URL: Discord integration  
TEAMS_WEBHOOK_URL: Microsoft Teams integration
DEPLOYMENT_WEBHOOK: General notification webhook
```

### Environment Variables

```yaml
NODE_VERSION: '20'              # Node.js version
CHROME_VERSION: 'stable'        # Chrome version for testing
```

## Scripts Reference

### Security & Quality
```bash
npm run security:scan          # ESLint security scan with SARIF output
npm run lint                   # Standard ESLint check
npm run type-check            # TypeScript validation
```

### Performance & Size
```bash
npm run bundle:check          # Bundle size analysis
npm run memory:test           # Extension memory testing
npm run size:check           # Size-limit validation
```

### Version & Release
```bash
npm run version:update <ver>  # Update version across files
npm run release:notes         # Generate release notes
npm run package              # Build and package extension
```

### Deployment
```bash
npm run deploy:configure     # Configure Chrome Web Store rollout
node scripts/notify-deployment.js  # Send deployment notifications
```

### Monitoring
```bash
npm run pipeline:health      # Check pipeline health
```

## Rollout Strategies

### Conservative (Default)
- 10% → 25% → 50% → 75% → 100%
- Recommended for major releases

### Standard  
- 20% → 50% → 100%
- Good for feature releases

### Aggressive
- 50% → 100%
- For urgent fixes

### Canary
- 5% → 15% → 35% → 65% → 100%
- For experimental features

## Troubleshooting

### Common Issues

1. **Security Scan Failures**
   - Check ESLint security plugin configuration
   - Verify no hardcoded secrets in code
   - Review CodeQL security alerts

2. **Build Failures**
   - Check TypeScript compilation errors
   - Verify dependency compatibility
   - Review test failures

3. **Performance Failures**
   - Bundle size exceeded limits
   - Memory usage above thresholds
   - E2E test timeouts

4. **Deployment Failures**
   - Chrome Web Store API authentication issues
   - Manifest V3 compliance problems
   - Rollout configuration errors

### Health Check Thresholds

- **Excellent (90-100)**: All systems optimal
- **Good (75-89)**: Minor issues detected
- **Warning (50-74)**: Attention needed
- **Critical (0-49)**: Immediate action required

### Metrics Tracking

The pipeline tracks:
- Build success/failure rates
- Average build times
- Security vulnerability counts
- Performance regression trends
- Deployment success rates

## Best Practices

### Security
- All actions use pinned commit hashes
- Secrets stored in GitHub encrypted secrets
- SARIF format for security tool integration
- Verified secret scanning only

### Performance
- Bundle size monitoring with historical tracking
- Memory usage validation
- Performance regression prevention
- Optimization recommendations

### Deployment
- Gradual rollout strategies
- Automated rollback capabilities  
- Multi-channel notifications
- Deployment health monitoring

### Monitoring
- Comprehensive pipeline health scoring
- Automated alerting for critical issues
- Performance trend analysis
- Regular pipeline optimization

## File Structure

```
.github/workflows/
├── ci-cd.yml                 # Main pipeline workflow

scripts/
├── bundle-size-check.js      # Bundle analysis
├── memory-test.js            # Memory testing
├── update-version.js         # Version management
├── configure-rollout.js      # Rollout configuration
├── generate-release-notes.js # Release notes
├── pipeline-health-check.js  # Health monitoring
└── notify-deployment.js      # Notifications

.eslintrc.security.js         # Security-focused ESLint config
.size-limit.json             # Size monitoring config
```

## Support

For pipeline issues:
1. Check GitHub Actions logs
2. Review security scan results
3. Validate environment variables
4. Contact DevOps team

---

*This documentation reflects 2025 best practices for Chrome extension CI/CD pipelines with Manifest V3 compliance and security-first design.*