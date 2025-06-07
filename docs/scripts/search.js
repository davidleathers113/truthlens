/**
 * TruthLens Documentation Search - 2025 Best Practices Implementation
 *
 * Features:
 * - Instant fuzzy search with debouncing
 * - ARIA live regions for accessibility
 * - Keyboard navigation support
 * - Mobile-optimized interface
 * - Performance optimized with caching
 */

class DocumentationSearch {
  constructor() {
    this.searchModal = document.getElementById('search-modal');
    this.searchInput = document.querySelector('.search-input');
    this.searchResults = document.getElementById('search-results');
    this.searchBtn = document.querySelector('.search-btn');
    this.searchClose = document.querySelector('.search-close');
    this.searchOverlay = document.querySelector('.search-overlay');

    // Search data structure optimized for performance
    this.searchData = this.buildSearchIndex();
    this.debounceTimer = null;
    this.currentQuery = '';
    this.selectedIndex = -1;

    this.init();
  }

  buildSearchIndex() {
    // Pre-built search index for instant results
    return [
      {
        id: 'installation',
        title: '📥 Installation Guide',
        content: 'How to install TruthLens Chrome extension from the Web Store. Step-by-step installation process.',
        url: '#installation',
        category: 'Getting Started',
        keywords: ['install', 'setup', 'chrome', 'extension', 'download', 'add'],
        weight: 10
      },
      {
        id: 'quick-start',
        title: '🚀 Quick Start Guide',
        content: 'Get up and running with TruthLens in 3 simple steps. Fast setup and configuration.',
        url: '#quick-start',
        category: 'Getting Started',
        keywords: ['quick', 'start', 'begin', 'setup', 'configure', 'first', 'steps'],
        weight: 10
      },
      {
        id: 'features',
        title: '✨ Features Overview',
        content: 'Complete overview of all TruthLens features including credibility scoring and bias detection.',
        url: '#features',
        category: 'Features',
        keywords: ['features', 'capabilities', 'what', 'can', 'do', 'overview'],
        weight: 9
      },
      {
        id: 'credibility-scores',
        title: '🎯 Credibility Scores',
        content: 'Understanding how our scoring system works. Learn about accuracy ratings and reliability metrics.',
        url: '#credibility-scores',
        category: 'Features',
        keywords: ['credibility', 'score', 'rating', 'accuracy', 'reliability', 'metrics'],
        weight: 9
      },
      {
        id: 'bias-detection',
        title: '⚖️ Bias Detection',
        content: 'Learn about bias analysis and media perspective detection. Understanding political and ideological bias.',
        url: '#bias-detection',
        category: 'Features',
        keywords: ['bias', 'detection', 'analysis', 'perspective', 'political', 'ideological'],
        weight: 9
      },
      {
        id: 'troubleshooting',
        title: '🔧 Troubleshooting',
        content: 'Common issues and solutions. Fix problems with extension not working, scores not showing.',
        url: '#troubleshooting',
        category: 'Help',
        keywords: ['troubleshoot', 'problems', 'issues', 'fix', 'not', 'working', 'broken', 'error'],
        weight: 8
      },
      {
        id: 'privacy',
        title: '🔒 Privacy & Security',
        content: 'How we protect your data and privacy. Information about data collection and security measures.',
        url: '#privacy',
        category: 'About',
        keywords: ['privacy', 'security', 'data', 'protection', 'collection', 'safe'],
        weight: 7
      },
      {
        id: 'settings',
        title: '⚙️ Settings Configuration',
        content: 'Customize your credibility checking preferences. Configure sensitivity and notification settings.',
        url: '#settings',
        category: 'Configuration',
        keywords: ['settings', 'configure', 'preferences', 'customize', 'options'],
        weight: 8
      },
      {
        id: 'accuracy',
        title: '📊 Accuracy Information',
        content: '95% accuracy rate achieved through AI-powered analysis. How we validate our results.',
        url: '#accuracy',
        category: 'About',
        keywords: ['accuracy', 'rate', 'validation', 'ai', 'analysis', 'results'],
        weight: 7
      },
      {
        id: 'social-media',
        title: '📱 Social Media Support',
        content: 'TruthLens works on Twitter, Facebook, Instagram and other social platforms.',
        url: '#features',
        category: 'Features',
        keywords: ['social', 'media', 'twitter', 'facebook', 'instagram', 'platforms'],
        weight: 8
      }
    ];
  }

  init() {
    this.bindEvents();
    this.setupKeyboardShortcuts();
    this.setupAccessibility();
  }

  bindEvents() {
    // Open search modal
    this.searchBtn?.addEventListener('click', () => this.openSearch());

    // Close search modal
    this.searchClose?.addEventListener('click', () => this.closeSearch());
    this.searchOverlay?.addEventListener('click', () => this.closeSearch());

    // Search input events
    this.searchInput?.addEventListener('input', (e) => this.handleSearch(e.target.value));
    this.searchInput?.addEventListener('keydown', (e) => this.handleKeyNavigation(e));

    // Modal focus management
    this.searchModal?.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeSearch();
      }
    });
  }

  setupKeyboardShortcuts() {
    // Global keyboard shortcut: Ctrl/Cmd + K
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.openSearch();
      }
    });
  }

  setupAccessibility() {
    // Add ARIA live region for search results
    if (this.searchResults) {
      this.searchResults.setAttribute('aria-live', 'polite');
      this.searchResults.setAttribute('aria-label', 'Search results');
    }

    // Add search role to input container
    const searchContainer = this.searchInput?.closest('.search-container');
    if (searchContainer) {
      searchContainer.setAttribute('role', 'search');
    }
  }

  openSearch() {
    if (!this.searchModal) return;

    this.searchModal.hidden = false;
    this.searchModal.classList.add('search-modal--open');

    // Focus the search input with slight delay for animation
    setTimeout(() => {
      this.searchInput?.focus();
    }, 100);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Analytics tracking
    this.trackEvent('search_opened', { trigger: 'button' });
  }

  closeSearch() {
    if (!this.searchModal) return;

    this.searchModal.hidden = true;
    this.searchModal.classList.remove('search-modal--open');

    // Clear search state
    this.clearSearch();

    // Restore body scroll
    document.body.style.overflow = '';

    // Return focus to search button
    this.searchBtn?.focus();

    // Analytics tracking
    this.trackEvent('search_closed');
  }

  clearSearch() {
    if (this.searchInput) {
      this.searchInput.value = '';
    }
    this.currentQuery = '';
    this.selectedIndex = -1;
    this.showEmptyState();
  }

  handleSearch(query) {
    // Debounce search for performance
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.performSearch(query.trim());
    }, 150);
  }

  performSearch(query) {
    this.currentQuery = query;

    if (!query) {
      this.showEmptyState();
      return;
    }

    if (query.length < 2) {
      this.showMinLengthMessage();
      return;
    }

    // Perform fuzzy search
    const results = this.fuzzySearch(query);
    this.displayResults(results, query);

    // Analytics tracking
    this.trackEvent('search_performed', {
      query: query,
      results_count: results.length
    });
  }

  fuzzySearch(query) {
    const queryLower = query.toLowerCase();
    const words = queryLower.split(/\s+/).filter(w => w.length > 0);

    const scored = this.searchData.map(item => {
      let score = 0;
      const titleLower = item.title.toLowerCase();
      const contentLower = item.content.toLowerCase();
      const keywordsLower = item.keywords.join(' ').toLowerCase();

      // Exact title match (highest priority)
      if (titleLower.includes(queryLower)) {
        score += 100 * item.weight;
      }

      // Exact content match
      if (contentLower.includes(queryLower)) {
        score += 50 * item.weight;
      }

      // Keyword matches
      words.forEach(word => {
        if (keywordsLower.includes(word)) {
          score += 30 * item.weight;
        }
        if (titleLower.includes(word)) {
          score += 20 * item.weight;
        }
        if (contentLower.includes(word)) {
          score += 10 * item.weight;
        }
      });

      // Partial matches (fuzzy)
      words.forEach(word => {
        if (word.length > 2) {
          const titleWords = titleLower.split(/\s+/);
          const contentWords = contentLower.split(/\s+/);

          titleWords.forEach(titleWord => {
            if (titleWord.includes(word) || word.includes(titleWord)) {
              score += 15;
            }
          });

          contentWords.forEach(contentWord => {
            if (contentWord.includes(word) || word.includes(contentWord)) {
              score += 5;
            }
          });
        }
      });

      return { ...item, score };
    });

    return scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Limit to top 10 results
  }

  displayResults(results, query) {
    if (!this.searchResults) return;

    if (results.length === 0) {
      this.showNoResults(query);
      return;
    }

    const resultsHTML = results.map((result, index) => {
      const highlightedTitle = this.highlightText(result.title, query);
      const highlightedContent = this.highlightText(result.content, query);

      return `
        <div class="search-result" data-index="${index}" data-url="${result.url}">
          <div class="search-result__category">${result.category}</div>
          <h3 class="search-result__title">${highlightedTitle}</h3>
          <p class="search-result__content">${highlightedContent}</p>
          <div class="search-result__meta">
            <span class="search-result__relevance">Relevance: ${Math.round(result.score / 10)}%</span>
          </div>
        </div>
      `;
    }).join('');

    this.searchResults.innerHTML = `
      <div class="search-results-header">
        <p class="search-results-count">Found ${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"</p>
      </div>
      <div class="search-results-list" role="listbox" aria-label="Search results">
        ${resultsHTML}
      </div>
    `;

    // Add click handlers to results
    this.bindResultClickHandlers();
  }

  highlightText(text, query) {
    if (!query) return text;

    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 1);
    let highlighted = text;

    words.forEach(word => {
      const regex = new RegExp(`(${this.escapeRegex(word)})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    });

    return highlighted;
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  bindResultClickHandlers() {
    const results = this.searchResults.querySelectorAll('.search-result');
    results.forEach((result, index) => {
      result.addEventListener('click', () => this.selectResult(index));
      result.setAttribute('role', 'option');
      result.setAttribute('tabindex', '0');

      // Keyboard support for individual results
      result.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.selectResult(index);
        }
      });
    });
  }

  handleKeyNavigation(e) {
    const results = this.searchResults.querySelectorAll('.search-result');

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, results.length - 1);
        this.updateSelection(results);
        break;

      case 'ArrowUp':
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
        this.updateSelection(results);
        break;

      case 'Enter':
        e.preventDefault();
        if (this.selectedIndex >= 0 && results[this.selectedIndex]) {
          this.selectResult(this.selectedIndex);
        }
        break;

      case 'Escape':
        this.closeSearch();
        break;
    }
  }

  updateSelection(results) {
    // Remove previous selection
    results.forEach(result => {
      result.classList.remove('search-result--selected');
      result.setAttribute('aria-selected', 'false');
    });

    // Add current selection
    if (this.selectedIndex >= 0 && results[this.selectedIndex]) {
      const selected = results[this.selectedIndex];
      selected.classList.add('search-result--selected');
      selected.setAttribute('aria-selected', 'true');
      selected.scrollIntoView({ block: 'nearest' });
    }
  }

  selectResult(index) {
    const results = this.searchResults.querySelectorAll('.search-result');
    const result = results[index];

    if (result) {
      const url = result.dataset.url;
      const title = result.querySelector('.search-result__title').textContent;

      // Analytics tracking
      this.trackEvent('search_result_clicked', {
        query: this.currentQuery,
        result_index: index,
        result_title: title,
        result_url: url
      });

      // Navigate to result
      if (url.startsWith('#')) {
        // Internal anchor link
        this.closeSearch();
        setTimeout(() => {
          const target = document.querySelector(url);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
            target.focus();
          }
        }, 300);
      } else {
        // External link
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    }
  }

  showEmptyState() {
    if (!this.searchResults) return;

    this.searchResults.innerHTML = `
      <div class="search-empty">
        <div class="search-empty-icon">🤔</div>
        <p>Start typing to search documentation...</p>
        <div class="search-shortcuts">
          <p><kbd>↑</kbd><kbd>↓</kbd> to navigate</p>
          <p><kbd>Enter</kbd> to select</p>
          <p><kbd>Esc</kbd> to close</p>
        </div>
      </div>
    `;
  }

  showMinLengthMessage() {
    if (!this.searchResults) return;

    this.searchResults.innerHTML = `
      <div class="search-empty">
        <div class="search-empty-icon">✏️</div>
        <p>Please enter at least 2 characters to search</p>
      </div>
    `;
  }

  showNoResults(query) {
    if (!this.searchResults) return;

    this.searchResults.innerHTML = `
      <div class="search-empty">
        <div class="search-empty-icon">😕</div>
        <p>No results found for "${query}"</p>
        <div class="search-suggestions">
          <p>Try searching for:</p>
          <ul>
            <li><button onclick="document.querySelector('.search-input').value='installation'; document.querySelector('.search-input').dispatchEvent(new Event('input'))">installation</button></li>
            <li><button onclick="document.querySelector('.search-input').value='features'; document.querySelector('.search-input').dispatchEvent(new Event('input'))">features</button></li>
            <li><button onclick="document.querySelector('.search-input').value='troubleshooting'; document.querySelector('.search-input').dispatchEvent(new Event('input'))">troubleshooting</button></li>
          </ul>
        </div>
      </div>
    `;
  }

  trackEvent(eventName, properties = {}) {
    // Analytics tracking (placeholder for actual implementation)
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, properties);
    }

    // Console logging for development
    console.log(`🔍 Search Event: ${eventName}`, properties);
  }
}

// CSS for search results (injected dynamically)
const searchCSS = `
.search-result {
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  background: #ffffff;
}

.search-result:hover,
.search-result--selected {
  border-color: #3b82f6;
  background: #eff6ff;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px -2px rgba(59, 130, 246, 0.2);
}

.search-result__category {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.search-result__title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.4;
}

.search-result__content {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #6b7280;
  line-height: 1.5;
}

.search-result__meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-result__relevance {
  font-size: 12px;
  color: #9ca3af;
  font-weight: 500;
}

.search-results-header {
  padding: 0 16px 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 16px;
}

.search-results-count {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

.search-results-list {
  max-height: 400px;
  overflow-y: auto;
  padding: 0 16px;
}

.search-empty {
  text-align: center;
  padding: 32px 16px;
}

.search-shortcuts {
  margin-top: 16px;
  font-size: 12px;
  color: #9ca3af;
}

.search-shortcuts kbd {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 11px;
  margin: 0 2px;
}

.search-suggestions ul {
  list-style: none;
  padding: 0;
  margin: 8px 0 0 0;
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.search-suggestions button {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.search-suggestions button:hover {
  background: #e5e7eb;
  border-color: #9ca3af;
}

mark {
  background: #fef3c7;
  color: #92400e;
  padding: 1px 2px;
  border-radius: 2px;
  font-weight: 600;
}

/* Dark theme support */
@media (prefers-color-scheme: dark) {
  .search-result {
    background: #374151;
    border-color: #4b5563;
  }

  .search-result:hover,
  .search-result--selected {
    background: #1e40af;
    border-color: #60a5fa;
  }

  .search-result__title {
    color: #f9fafb;
  }

  .search-result__content {
    color: #d1d5db;
  }

  .search-shortcuts kbd {
    background: #4b5563;
    border-color: #6b7280;
    color: #d1d5db;
  }

  .search-suggestions button {
    background: #4b5563;
    border-color: #6b7280;
    color: #d1d5db;
  }

  mark {
    background: #fbbf24;
    color: #92400e;
  }
}

[data-theme="dark"] .search-result {
  background: #374151;
  border-color: #4b5563;
}

[data-theme="dark"] .search-result:hover,
[data-theme="dark"] .search-result--selected {
  background: #1e40af;
  border-color: #60a5fa;
}

[data-theme="dark"] .search-result__title {
  color: #f9fafb;
}

[data-theme="dark"] .search-result__content {
  color: #d1d5db;
}

[data-theme="dark"] .search-shortcuts kbd {
  background: #4b5563;
  border-color: #6b7280;
  color: #d1d5db;
}

[data-theme="dark"] .search-suggestions button {
  background: #4b5563;
  border-color: #6b7280;
  color: #d1d5db;
}
`;

// Inject search styles
function injectSearchStyles() {
  const styleElement = document.createElement('style');
  styleElement.textContent = searchCSS;
  document.head.appendChild(styleElement);
}

// Initialize search when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    injectSearchStyles();
    new DocumentationSearch();
  });
} else {
  injectSearchStyles();
  new DocumentationSearch();
}
