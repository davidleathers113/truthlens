# CLAUDE.md
# Chrome extension guidance for Claude Code — concise & actionable.

## 🛠 Quick commands
- **Build** …… `npm run build`   • production bundle
- **Dev** ……… `npm run dev`     • watch + hot reload
- **Lint** ……… `npm run lint`    • ESLint Flat Config + security checks
- **Type** ……… `npm run type-check` • TypeScript validation
- **Test** ……… `npm test` (unit) | `npm test:e2e` (Playwright) | `npm test -- -t "name"` (single)
- **Package** … `npm run package` • Chrome Web Store ZIP
- **Format** … `npm run format`  • Prettier code formatting

## 🎨 Code style (MUST‑FOLLOW)
1. **Formatting** Prettier ⋅ 2‑space indent ⋅ 100 col wrap
2. **Imports** External → Internal ⋅ Use path aliases (`@shared`, `@popup`, etc.)
3. **Types** No implicit any ⋅ favor `interface` > `type` aliases
4. **Naming** camelCase vars/fns ⋅ PascalCase components/classes
5. **Errors** Wrap async/await in try/catch ⋅ surface with Result<>
6. **Comments** Explain *why*, not *what* ⋅ omit obvious boilerplate
7. **Modules** Always use ES module syntax instead of CommonJS

## 🔄 Workflow
> **lint → typecheck → test → commit**
- Chrome extension = multi-context (background/content/popup/options)
- Always test cross-context messaging when modifying APIs
- Run `npm run lint && npm run type-check && npm test` before commits

## 🎯 4-Phase Implementation Approach (MUST‑FOLLOW)
For every implementation task, follow these phases:

### Phase 1: RECON (Reconnaissance)
- **Investigate** current state and identify all problems
- **Map** existing code, dependencies, and conflicts
- **Document** specific issues and edge cases
- **Understand** the full scope before making changes

### Phase 2: RESEARCH
- **Explore** multiple solution approaches
- **Evaluate** best practices and standards
- **Consider** trade-offs and implications
- **Choose** the optimal solution based on evidence

### Phase 3: IMPLEMENTATION
- **Execute** the chosen solution systematically
- **Apply** changes incrementally with verification
- **Handle** edge cases and error conditions
- **Clean up** any temporary files or artifacts

### Phase 4: REVIEW
- **Verify** all functionality works correctly
- **Test** comprehensively (unit, integration, e2e)
- **Validate** performance and security
- **Document** changes and update relevant docs

## 💡 Claude 4 development guidance
- **Be explicit**: Request "comprehensive" or "fully-featured" implementations
- **Parallel tools**: Use multiple tool calls simultaneously for efficiency
- **General solutions**: Implement correct algorithms for all inputs, not just test cases
- **Cleanup**: Remove temporary files/scripts created during development
- **Frontend focus**: Request "interactive features, hover states, transitions" explicitly

## 🌳 Git conventions
- Branch `feat/<desc>` | `fix/<issue>` | `chore/<topic>`
- Commits Conventional format (`feat: add bias detection panel`)

## 🏗 Architecture notes
- **Manifest V3** service worker (background) + React UI (popup/options)
- **Chrome Built-in AI** Gemini Nano for local content analysis
- **Platform extractors** `src/content/extractors/` for social media sites
- **Storage service** `src/shared/storage/` wraps Chrome APIs with types
- **Webpack 5** separate bundles per context with hot reload
- **Coverage req** 80% threshold on branches/functions/lines/statements

## ⚙️ Environment
- Node 18+ • Chrome 138+ for AI APIs • 22GB for Gemini Nano
- Required env vars: `MBFC_API_KEY`, `GOOGLE_FACT_CHECK_API_KEY`

## 🔧 ESLint Flat Config Notes
- **Modern config**: Uses `eslint.config.js` (ESLint v8.21+ Flat Config format)
- **Security focused**: Includes security plugin with Chrome extension specific rules
- **Type safety**: TypeScript ESLint with proper function signatures (no unsafe `Function` type)
- **Context aware**: Different rules for background/content scripts vs tests
- **Prettier integrated**: Automatic formatting with `eslint-config-prettier`
- **Legacy removed**: Deprecated `.eslintrc.*` files have been migrated and removed
