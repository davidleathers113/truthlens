# Regex Replacement Implementation Proposal

## Executive Summary

After analyzing the comprehensive regex replacement report against the current implementation, I've identified significant gaps that need to be addressed to transform TruthLens into a robust, globally-capable fact-checking extension. While the initial implementation successfully created modular utilities and integrated several libraries, critical features for internationalization, security, and performance optimization remain unimplemented.

## Current State Analysis

### What's Been Implemented
1. **Basic Social Text Parsing** - Using twitter-text (with Latin-only limitation)
2. **URL Pattern Matching** - Using url-pattern and url-parse
3. **Simple Date Parsing** - Using date-fns
4. **Text Sanitization** - Using validator
5. **Engagement Number Parsing** - Using humanize-plus (English K/M/B only)

### Critical Gaps Identified

#### 1. Internationalization Failures
- **Hashtag/Mention Extraction**: Current twitter-text implementation cannot handle Arabic (#اليوم_الوطني), Hindi (#हिन्दी_दिवस), Thai (#ไทย), or other non-Latin scripts
- **Number Parsing**: No support for locale-specific abbreviations (Chinese 万/亿, German Mio/Mrd, Russian тыс/млн)
- **Date Parsing**: Missing relative time parsing ("3h ago", "yesterday")

#### 2. Missing Core Features
- **Clickbait Detection**: No implementation for identifying manipulative content
- **HTML Processing**: No DOMPurify for security or Readability for article extraction
- **Emoji Analysis**: No handling of emojis with sentiment mapping
- **Domain Parsing**: Missing robust domain extraction with IDN/.onion support

#### 3. Performance & Reliability
- **No Offscreen Documents**: Heavy processing blocks UI
- **No Dynamic Content Detection**: Missing MutationObserver for social media feeds
- **No Selector Monitoring**: Cannot detect when sites change their structure
- **No CSP Compliance Checking**: Risk of Manifest V3 violations

## Phased Implementation Plan

### Phase 1: Critical Internationalization & Core Features (2-3 weeks)

#### 1.1 Replace Twitter-Text with Custom Unicode Regex
```typescript
// File: src/shared/utils/socialTextParser.ts (ENHANCED)
function extractEntities(text: string) {
  // Handles ALL scripts including Arabic, Thai, Hindi
  const hashtagRegex = /#([\p{L}\p{N}\p{M}_]+)/gu;
  const mentionRegex = /@([\p{L}\p{N}_](?:[\p{L}\p{N}_\.]*[\p{L}\p{N}_])?)/gu;

  const hashtags = [];
  const mentions = [];

  let match;
  while ((match = hashtagRegex.exec(text)) !== null) {
    hashtags.push(match[1]);
  }

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }

  return { hashtags, mentions };
}
```

#### 1.2 Enhance Number Parsing with Locale Support
```typescript
// File: src/shared/utils/engagementParser.ts (ENHANCED)
const localeSpecificSuffixes = {
  'zh': { '万': 1e4, '亿': 1e8, '千': 1e3, '百万': 1e6 },
  'ja': { '万': 1e4, '億': 1e8, '千': 1e3 },
  'de': { 'mio': 1e6, 'mrd': 1e9, 'tsd': 1e3 },
  'ru': { 'тыс': 1e3, 'млн': 1e6, 'млрд': 1e9 },
  'es': { 'mil': 1e3, 'mln': 1e6 },
  'fr': { 'mille': 1e3, 'mio': 1e6, 'mrd': 1e9 }
};
```

#### 1.3 Implement Clickbait Detection
```typescript
// File: src/shared/utils/clickbaitAnalyzer.ts (NEW)
const clickbaitAnalyzer = {
  phrases: [
    'you won\'t believe', 'shocking', 'this one trick', 'must see',
    'what happened next', 'doctors hate', 'will blow your mind'
  ],

  sentimentWords: {
    'amazing': 3, 'terrible': -3, 'shocking': 1.5, '🤯': 1.5, '🔥': 1.0
  },

  analyze(text: string) {
    // Comprehensive analysis including phrases, punctuation, sentiment
    // Returns clickbaitScore, sentimentScore, emotionalWords
  }
};
```

#### 1.4 Add HTML Sanitization
```typescript
// File: src/shared/utils/htmlProcessor.ts (NEW)
import DOMPurify from 'dompurify';

export function sanitizeHTML(dirtyHTML: string): string {
  return DOMPurify.sanitize(dirtyHTML, {
    ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href', 'title'],
    FORBID_TAGS: ['script', 'style']
  });
}
```

### Phase 2: MV3 Optimizations & Monitoring (2-3 weeks)

#### 2.1 Implement Offscreen Documents for Heavy Processing
```typescript
// File: src/background/offscreen/articleParser.ts (NEW)
// Moves Readability parsing off main thread
async function parseArticleOffThread(htmlContent: string, documentUrl: string) {
  if (!(await chrome.offscreen.hasDocument())) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['DOM_PARSING'],
      justification: 'Parse article content without blocking UI'
    });
  }

  return chrome.runtime.sendMessage({
    target: 'offscreen',
    action: 'parse-article',
    data: { htmlContent, documentUrl }
  });
}
```

#### 2.2 Add Dynamic Content Detection
```typescript
// File: src/content/observers/dynamicContentObserver.ts (NEW)
const observer = new MutationObserver((mutations) => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      if (node.matches?.('.post, .tweet, [data-testid="tweet"]')) {
        processSocialContent(node);
      }
    });
  });
});
```

#### 2.3 Implement Selector Drift Detection
```typescript
// File: src/content/monitors/selectorDriftDetector.ts (NEW)
class SelectorDriftDetector {
  detectContent(platform: string, doc = document) {
    // Try primary selector, fallback if needed
    // Validate content quality
    // Report telemetry if confidence is low
  }
}
```

### Phase 3: Advanced Features (1-2 weeks)

#### 3.1 Emoji Processing with Sentiment
```typescript
// File: src/shared/utils/emojiProcessor.ts (NEW)
import emojiRegex from 'emoji-regex';

const emojiSentimentMap = {
  '😊': { score: 0.7, desc: 'smiling' },
  '😭': { score: -1.2, desc: 'crying' },
  '👨‍👩‍👧‍👦': { score: 1.2, desc: 'family' }, // ZWJ sequence
  '🏳️‍🌈': { score: 0.8, desc: 'pride' }
};
```

#### 3.2 Domain Extraction with IDN Support
```typescript
// File: src/shared/utils/domainExtractor.ts (NEW)
import { getDomain, parse } from 'tldts';

export function extractDomain(urlString: string) {
  // Handles IDN domains, .onion addresses, and edge cases
  const result = parse(urlString);
  // Special handling for Tor, internationalized domains
}
```

### Phase 4: Process Implementation (2-3 weeks)

#### 4.1 CSP Compliance Audit
```typescript
// File: scripts/csp-audit.js (NEW)
// Scans bundled code for eval(), new Function(), and other violations
class CSPAuditor {
  forbiddenPatterns = [
    { name: 'eval', pattern: /\beval\s*\(/g, severity: 'error' },
    { name: 'new Function', pattern: /new\s+Function\s*\(/g, severity: 'error' }
  ];

  async auditBundle() {
    // Scan dist/**/*.js for violations
    // Report any CSP compliance issues
  }
}
```

#### 4.2 Lexicon Update Pipeline
```typescript
// File: scripts/lexicon-updater.js (NEW)
// Backend process for discovering new slang/emojis
class LexiconUpdater {
  async discoverNewTerms() {
    // Monitor Urban Dictionary, trending hashtags
    // Flag for human review
    // Bundle approved terms in next release
  }
}
```

## Implementation Priority Matrix

| Feature | Impact | Complexity | Bundle Size | Priority |
|---------|--------|------------|-------------|----------|
| Unicode regex for hashtags | High | Low | 0KB | P0 |
| Locale number parsing | High | Medium | ~1KB | P0 |
| Clickbait detection | High | Medium | ~2KB | P0 |
| HTML sanitization | High | Low | ~20KB | P0 |
| Offscreen Documents | High | Medium | ~3KB | P1 |
| Dynamic content detection | High | Low | 0KB | P1 |
| Selector drift monitoring | Medium | Medium | ~1KB | P1 |
| Emoji processing | Medium | Low | ~3KB | P2 |
| Domain extraction | Medium | Low | ~15KB | P2 |
| CSP audit process | High | Low | 0KB | P2 |

## Bundle Size Analysis

### Current State
- Total utilities added: ~50KB
- Libraries: twitter-text, url-pattern, url-parse, date-fns, validator, humanize-plus

### Proposed Changes
- Remove twitter-text: -30KB
- Add custom regex utilities: +5KB
- Add DOMPurify: +20KB
- Add Readability: +34KB
- Add emoji-regex: +3KB
- Add tldts: +15KB
- **Net Change**: +47KB

### Final Bundle Estimate
- Total: ~97KB (well within MV3 budget)

## Success Metrics

1. **Internationalization**
   - Support for 10+ languages in hashtag/mention extraction
   - Accurate number parsing for 6+ locales
   - 95%+ accuracy on multilingual content

2. **Performance**
   - No UI blocking during article parsing
   - Dynamic content detection within 100ms
   - Selector drift detected within 24 hours

3. **Security**
   - Zero CSP violations in production
   - All user content sanitized before processing
   - No XSS vulnerabilities

4. **Maintainability**
   - Automated lexicon updates monthly
   - Selector telemetry dashboard
   - 90% reduction in regex-related bugs

## Risk Mitigation

1. **Bundle Size**: Implement tree-shaking, monitor with size-limit
2. **Breaking Changes**: Extensive testing on real-world content
3. **Performance**: Benchmark critical paths, use Chrome DevTools
4. **Compatibility**: Test across Chrome versions 110+

## Timeline

- **Week 1-2**: Phase 1 core implementations
- **Week 3**: Phase 1 testing and refinement
- **Week 4-5**: Phase 2 MV3 optimizations
- **Week 6**: Phase 2 monitoring setup
- **Week 7**: Phase 3 advanced features
- **Week 8-9**: Phase 4 processes
- **Week 10**: Integration testing and documentation

## Conclusion

This implementation plan addresses all critical gaps identified in the regex replacement analysis. By following this phased approach, TruthLens will evolve from a basic implementation to a sophisticated, globally-capable fact-checking extension that can reliably analyze content in any language while maintaining excellent performance and security standards.

The total implementation effort is estimated at 10 weeks, with the most critical internationalization fixes deliverable within 3 weeks. The modular approach allows for incremental deployment and testing, reducing risk while maximizing value delivery.
