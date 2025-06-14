# TruthLens Development Tools

This directory contains development and build tools for the TruthLens Chrome extension.

## CSP Compliance Audit Tool

Ensures your extension code complies with Chrome's Manifest V3 Content Security Policy requirements.

### Usage

```bash
# Run audit on dist folder
npm run csp-audit

# Watch mode (re-runs on file changes)
npm run csp-audit:watch

# Generate JSON report
npm run csp-audit:json report.json

# Run on custom directory
node scripts/csp-audit.js custom-dist
```

### What It Checks

The tool scans for 16 different CSP violation patterns:

- **Critical Violations**: `eval()`, `new Function()`, string-based `setTimeout`/`setInterval`
- **XSS Vulnerabilities**: `innerHTML`, `outerHTML`, `document.write`, `insertAdjacentHTML`
- **Security Risks**: Dynamic script creation, `javascript:` URLs, inline event handlers
- **Policy Violations**: `unsafe-eval` directives, base64 decode for execution

### Configuration

The tool is integrated into the webpack build process:

- **Production**: Fails build on errors (can bypass with `npm run build:nocsp`)
- **Development**: Shows warnings only, doesn't block builds

### Example Output

```
🔍 Starting CSP Compliance Audit...

Found 5 JavaScript files to scan

❌ Errors (1):

eval
dist/content.js:234:12
Context:
  232:   function processUserInput(input) {
  233:     const sanitized = sanitize(input);
> 234:     return eval(sanitized); // CSP violation!
  235:   }
Issue: Direct eval() usage is forbidden in MV3
Fix: Use JSON.parse() for data or refactor logic to avoid dynamic code execution

✅ All other files passed CSP compliance audit!
```

## Lexicon Update Pipeline

Manages discovery, review, and integration of new slang terms, emojis, and internet language.

### Usage

```bash
# Discover new terms from all sources
npm run lexicon:discover

# Review pending terms (interactive)
npm run lexicon:review

# Integrate approved terms into utilities
npm run lexicon:integrate

# View statistics
npm run lexicon:stats

# Submit a term manually
npm run lexicon:submit "bussin" "Really good, usually describing food"

# Run complete pipeline
npm run lexicon:pipeline
```

### How It Works

1. **Discovery Phase**
   - Monitors Urban Dictionary, Reddit, emoji usage
   - Tracks trending hashtags and phrases
   - Accepts manual submissions

2. **Review Phase**
   - Human review interface for quality control
   - Automated checks for NSFW content
   - Confidence scoring and categorization

3. **Integration Phase**
   - Version control with semantic versioning
   - Exports to format used by utilities
   - Maintains backwards compatibility

### Term Structure

```json
{
  "id": "a1b2c3d4",
  "term": "no cap",
  "type": "slang",
  "definition": "No lie, for real",
  "examples": ["That movie was amazing, no cap"],
  "sentiment": 0.3,
  "confidence": 0.85,
  "sources": ["Urban Dictionary"],
  "status": "approved"
}
```

### Data Storage

Lexicon data is stored in `lexicon-data/`:
- `current-version.json` - Active lexicon
- `versions/` - Version history
- `queue/` - Review queue
- `exports/` - Generated files

### Integration with Utilities

The lexicon automatically exports to:
- `emoji-sentiments-generated.json` - For emojiProcessor
- `clickbait-phrases-generated.json` - For clickbaitAnalyzer
- `slang-abbreviations-generated.json` - For engagementParser

## Other Build Tools

### Bundle Size Check
```bash
npm run bundle:check
```
Verifies bundle stays within Chrome extension size limits.

### Memory Test
```bash
npm run memory:test
```
Tests for memory leaks in long-running scenarios.

### Release Notes Generator
```bash
npm run release:notes
```
Generates release notes from git commits.

### Pipeline Health Check
```bash
npm run pipeline:health
```
Verifies CI/CD pipeline configuration.

## Development Workflow

1. **Before Committing**: CSP audit runs automatically on build
2. **Weekly**: Run lexicon pipeline to stay current
3. **Before Release**: Run all verification tools

## Contributing

When adding new tools:
1. Create TypeScript source in `scripts/`
2. Add JavaScript wrapper for npm scripts
3. Update package.json with new commands
4. Add tests in `tests/unit/`
5. Document usage in this README

## Troubleshooting

### CSP Audit False Positives
If the audit flags legitimate code:
1. Check if it's in an allowed context (e.g., with DOMPurify)
2. Consider refactoring to avoid the pattern
3. Report issues with specific examples

### Lexicon Pipeline Issues
- **Rate Limiting**: Sources have built-in delays
- **API Keys**: Some sources require configuration
- **Storage**: Ensure `lexicon-data/` is writable

For more details, see the [Phase 4 Implementation Report](../docs/phase4-implementation-report.md).
