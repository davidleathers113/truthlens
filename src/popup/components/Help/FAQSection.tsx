/**
 * FAQ Section Component - 2025 Implementation
 *
 * Features:
 * - Searchable FAQ with instant results
 * - Collapsible categories with emoji icons
 * - Gen Z focused design (<8 second comprehension)
 * - Progressive disclosure of information
 * - Accessibility compliant with keyboard navigation
 * - Mobile-first responsive design
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { FAQCategory, FAQItem, HelpAnalytics } from '@shared/types/help';
import { logger } from '@shared/services';
import './FAQSection.css';

export interface FAQSectionProps {
  categories: FAQCategory[];
  onAnalytics?: (event: HelpAnalytics) => void;
  onItemView?: (itemId: string) => void;
  onItemRate?: (itemId: string, rating: number) => void;
  className?: string;
  maxResults?: number;
  showSearch?: boolean;
  showCategories?: boolean;
  showRatings?: boolean;
}

export const FAQSection: React.FC<FAQSectionProps> = ({
  categories,
  onAnalytics,
  onItemView,
  onItemRate,
  className = '',
  maxResults = 50,
  showSearch = true,
  showCategories = true,
  showRatings = true
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Flatten all FAQ items for search
  const allItems = useMemo(() => {
    return categories.flatMap(category =>
      category.items.map(item => ({ ...item, categoryId: category.id, categoryName: category.name }))
    );
  }, [categories]);

  // Search functionality with fuzzy matching
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    const results = allItems
      .filter(item => {
        const searchableText = [
          item.question,
          item.answer,
          item.categoryName,
          ...(item.tags || []),
          ...(item.searchTerms || [])
        ].join(' ').toLowerCase();

        return searchableText.includes(query);
      })
      .sort((a, b) => {
        // Score based on match relevance
        const aScore = getRelevanceScore(a, query);
        const bScore = getRelevanceScore(b, query);
        return bScore - aScore;
      })
      .slice(0, maxResults);

    return results;
  }, [searchQuery, allItems, maxResults]);

  // Calculate relevance score for search results
  const getRelevanceScore = useCallback((item: any, query: string): number => {
    let score = 0;
    const queryWords = query.split(' ');

    queryWords.forEach(word => {
      if (item.question.toLowerCase().includes(word)) score += 10;
      if (item.answer.toLowerCase().includes(word)) score += 5;
      if (item.tags?.some((tag: string) => tag.toLowerCase().includes(word))) score += 8;
      if (item.searchTerms?.some((term: string) => term.toLowerCase().includes(word))) score += 6;
      if (item.categoryName.toLowerCase().includes(word)) score += 3;
    });

    // Boost score for exact matches
    if (item.question.toLowerCase().includes(query)) score += 20;
    if (item.answer.toLowerCase().includes(query)) score += 10;

    return score;
  }, []);

  // Handle search input changes with debouncing
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setIsSearchMode(value.trim().length > 0);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (value.trim()) {
        onAnalytics?.({
          event: 'help_search',
          properties: {
            itemId: 'faq',
            searchQuery: value,
            resultCount: searchResults.length,
            context: 'faq_section'
          },
          timestamp: Date.now(),
          sessionId: 'session_' + Date.now()
        });

        logger.info('FAQ search performed', {
          query: value,
          resultsCount: searchResults.length
        });
      }
    }, 300);
  }, [onAnalytics, searchResults.length]);

  // Toggle category expansion
  const toggleCategory = useCallback((categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  }, [expandedCategories]);

  // Toggle FAQ item expansion
  const toggleItem = useCallback((itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);

      // Track item view
      onItemView?.(itemId);
      onAnalytics?.({
        event: 'faq_viewed',
        properties: {
          itemId,
          category: allItems.find(item => item.id === itemId)?.categoryName || 'unknown',
          context: isSearchMode ? 'search_result' : 'category_browse'
        },
        timestamp: Date.now(),
        sessionId: 'session_' + Date.now()
      });
    }
    setExpandedItems(newExpanded);
  }, [expandedItems, onItemView, onAnalytics, allItems, isSearchMode]);

  // Handle item rating
  const handleItemRating = useCallback((itemId: string, rating: number) => {
    onItemRate?.(itemId, rating);

    onAnalytics?.({
      event: 'faq_viewed',
      properties: {
        itemId,
        category: allItems.find(item => item.id === itemId)?.categoryName || 'unknown',
        timeSpent: 0, // Would track actual time
        completed: true,
        context: 'rating_provided'
      },
      timestamp: Date.now(),
      sessionId: 'session_' + Date.now()
    });

    logger.info('FAQ item rated', { itemId, rating });
  }, [onItemRate, onAnalytics, allItems]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setIsSearchMode(false);
    setSelectedCategory(null);
    searchInputRef.current?.focus();
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'f') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }

      if (event.key === 'Escape' && isSearchMode) {
        clearSearch();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSearchMode, clearSearch]);

  // Render FAQ item
  const renderFAQItem = useCallback((item: FAQItem, categoryName?: string) => {
    const isExpanded = expandedItems.has(item.id);

    return (
      <div key={item.id} className="faq-section__item">
        <button
          className={`faq-section__question ${isExpanded ? 'faq-section__question--expanded' : ''}`}
          onClick={() => toggleItem(item.id)}
          aria-expanded={isExpanded}
          aria-controls={`faq-answer-${item.id}`}
          type="button"
        >
          <div className="faq-section__question-content">
            {item.emoji && (
              <span className="faq-section__question-emoji" aria-hidden="true">
                {item.emoji}
              </span>
            )}
            <span className="faq-section__question-text">{item.question}</span>
            {categoryName && isSearchMode && (
              <span className="faq-section__question-category">
                in {categoryName}
              </span>
            )}
          </div>
          <span className={`faq-section__question-icon ${isExpanded ? 'faq-section__question-icon--expanded' : ''}`}>
            ▼
          </span>
        </button>

        {isExpanded && (
          <div
            id={`faq-answer-${item.id}`}
            className="faq-section__answer"
            role="region"
            aria-labelledby={`faq-question-${item.id}`}
          >
            <div className="faq-section__answer-content">
              {item.answer}
            </div>

            {/* Tags */}
            {item.tags && item.tags.length > 0 && (
              <div className="faq-section__tags">
                {item.tags.map(tag => (
                  <span key={tag} className="faq-section__tag">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Rating */}
            {showRatings && (
              <div className="faq-section__rating">
                <span className="faq-section__rating-label">Was this helpful?</span>
                <div className="faq-section__rating-buttons">
                  {[1, 2, 3, 4, 5].map(rating => (
                    <button
                      key={rating}
                      className="faq-section__rating-btn"
                      onClick={() => handleItemRating(item.id, rating)}
                      aria-label={`Rate ${rating} stars`}
                      type="button"
                    >
                      ⭐
                    </button>
                  ))}
                </div>
                <span className="faq-section__rating-score">
                  {item.helpfulness.toFixed(1)}/5
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }, [expandedItems, toggleItem, isSearchMode, showRatings, handleItemRating]);

  // Sort categories by priority
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => b.priority - a.priority);
  }, [categories]);

  return (
    <div className={`faq-section ${className}`}>
      {/* Search */}
      {showSearch && (
        <div className="faq-section__search">
          <div className="faq-section__search-input-container">
            <input
              ref={searchInputRef}
              type="text"
              className="faq-section__search-input"
              placeholder="🔍 Ask a question or search for help..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              aria-label="Search FAQ"
            />
            {searchQuery && (
              <button
                className="faq-section__search-clear"
                onClick={clearSearch}
                aria-label="Clear search"
                type="button"
              >
                ✕
              </button>
            )}
          </div>

          {isSearchMode && (
            <div className="faq-section__search-results-info">
              {searchResults.length > 0 ? (
                <span>
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                </span>
              ) : (
                <span>No results found for "{searchQuery}"</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="faq-section__content">
        {isSearchMode ? (
          /* Search Results */
          <div className="faq-section__search-results">
            {searchResults.length > 0 ? (
              searchResults.map(item => renderFAQItem(item, item.categoryName))
            ) : (
              <div className="faq-section__no-results">
                <div className="faq-section__no-results-icon">🤔</div>
                <h3>No answers found</h3>
                <p>Try different keywords or browse categories below</p>
                <button
                  className="faq-section__browse-btn"
                  onClick={clearSearch}
                  type="button"
                >
                  Browse Categories
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Categories */
          showCategories && (
            <div className="faq-section__categories">
              {sortedCategories.map(category => {
                const isExpanded = expandedCategories.has(category.id);

                return (
                  <div key={category.id} className="faq-section__category">
                    <button
                      className={`faq-section__category-header ${isExpanded ? 'faq-section__category-header--expanded' : ''}`}
                      onClick={() => toggleCategory(category.id)}
                      aria-expanded={isExpanded}
                      aria-controls={`faq-category-${category.id}`}
                      type="button"
                    >
                      <div className="faq-section__category-info">
                        <span className="faq-section__category-emoji" aria-hidden="true">
                          {category.emoji}
                        </span>
                        <div className="faq-section__category-text">
                          <h3 className="faq-section__category-name">{category.name}</h3>
                          <p className="faq-section__category-description">{category.description}</p>
                        </div>
                      </div>
                      <div className="faq-section__category-meta">
                        <span className="faq-section__category-count">
                          {category.items.length} item{category.items.length !== 1 ? 's' : ''}
                        </span>
                        <span className={`faq-section__category-icon ${isExpanded ? 'faq-section__category-icon--expanded' : ''}`}>
                          ▼
                        </span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div
                        id={`faq-category-${category.id}`}
                        className="faq-section__category-content"
                        role="region"
                        aria-labelledby={`faq-category-header-${category.id}`}
                      >
                        {category.items.map(item => renderFAQItem(item))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Quick tip */}
      <div className="faq-section__tip">
        💡 Tip: Use Ctrl+F to quickly search or click any question to expand the answer
      </div>
    </div>
  );
};

export default FAQSection;
