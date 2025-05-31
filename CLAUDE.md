# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands
- Build: `npm run build`
- Development: `npm run dev` (watch mode with hot reload)
- Test all: `npm test`
- Test with coverage: `npm test:coverage`
- Test single: `npm test -- -t "test name"`
- E2E tests: `npm run test:e2e`
- Lint: `npm run lint`
- Type check: `npm run type-check`
- Format: `npm run format`
- Package extension: `npm run package` (creates ZIP for Chrome Web Store)

## Architecture Overview

TruthLens is a Chrome Manifest V3 extension with a multi-context architecture:

### Core Structure
- **Background Script** (`src/background/`): Service worker handling AI processing, API calls, and cross-tab messaging
- **Content Scripts** (`src/content/`): Inject into web pages to analyze content and display credibility indicators
- **Popup Interface** (`src/popup/`): React-based extension popup for user interaction
- **Options Page** (`src/options/`): React-based settings and configuration interface
- **Shared Code** (`src/shared/`): Common types, utilities, storage service, and constants

### Key Architectural Patterns
- **Chrome Built-in AI Integration**: Uses Gemini Nano for local privacy-first content analysis
- **Platform-Specific Analyzers**: Content extractors in `src/content/analyzers/` handle different social media platforms
- **Type-Safe Storage**: Chrome storage API wrapped in `src/shared/storage/storageService.ts`
- **Path Aliases**: All imports use `@background`, `@content`, `@popup`, `@options`, `@shared`, `@assets` aliases

### Build System
- **Webpack 5** with separate dev/prod configs
- **Multiple Entry Points**: background, content, popup, options scripts built separately
- **Asset Handling**: Icons, SCSS compilation, TypeScript transpilation
- **Hot Reload**: Development mode with watch for rapid iteration

### Testing Strategy
- **Jest + jsdom** for unit/integration tests with 80% coverage thresholds
- **Playwright** for E2E extension testing
- **Path mapping** in tests mirrors webpack aliases
- Test files in `/tests/unit/`, `/tests/integration/`, `/tests/e2e/`

### Chrome Extension Specifics
- **Manifest V3** compliance with service worker background script
- **Cross-context messaging** between background, content, and popup
- **Permission handling** for tabs, storage, and AI APIs
- **Content Security Policy** restrictions for secure code execution