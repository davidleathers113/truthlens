/**
 * TruthLens Documentation Main Scripts - 2025 Best Practices Implementation
 *
 * Features:
 * - Progressive enhancement approach
 * - Smooth scrolling with intersection observer
 * - Accessible navigation and interactions
 * - Performance optimized with debouncing
 * - Mobile-first responsive interactions
 * - Analytics tracking integration
 */

class DocumentationApp {
  constructor() {
    this.isInitialized = false;
    this.scrollObserver = null;
    this.headerHeight = 0;
    this.activeSection = null;

    // Performance optimization flags
    this.resizeTimer = null;
    this.scrollTimer = null;

    this.init();
  }

  init() {
    if (this.isInitialized) return;

    this.setupAccessibility();
    this.initSmoothScrolling();
    this.initIntersectionObserver();
    this.initMobileNavigation();
    this.initProgressiveEnhancement();
    this.bindGlobalEvents();
    this.calculateHeaderHeight();

    this.isInitialized = true;
    console.log('📚 TruthLens Documentation initialized');
  }

  setupAccessibility() {
    // Add skip links if they don't exist
    this.ensureSkipLinks();

    // Enhance focus management
    this.setupFocusManagement();

    // Add ARIA landmarks
    this.enhanceSemantics();

    // Setup keyboard navigation
    this.setupKeyboardNavigation();
  }

  ensureSkipLinks() {
    if (!document.querySelector('.skip-link')) {
      const skipLink = document.createElement('a');
      skipLink.href = '#main-content';
      skipLink.className = 'skip-link';
      skipLink.textContent = 'Skip to main content';
      document.body.insertBefore(skipLink, document.body.firstChild);
    }
  }

  setupFocusManagement() {
    // Enhance focus visibility
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        document.body.classList.add('using-keyboard');
      }
    });

    document.addEventListener('mousedown', () => {
      document.body.classList.remove('using-keyboard');
    });

    // Focus management for dynamic content
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[href^="#"]');
      if (target) {
        this.handleAnchorClick(e, target);
      }
    });
  }

  enhanceSemantics() {
    // Add ARIA landmarks to improve navigation
    const main = document.querySelector('main');
    if (main && !main.getAttribute('role')) {
      main.setAttribute('role', 'main');
    }

    const nav = document.querySelector('nav');
    if (nav && !nav.getAttribute('role')) {
      nav.setAttribute('role', 'navigation');
    }

    // Enhance section headings
    const sections = document.querySelectorAll('section[id]');
    sections.forEach(section => {
      const heading = section.querySelector('h1, h2, h3, h4, h5, h6');
      if (heading && !section.getAttribute('aria-labelledby')) {
        if (!heading.id) {
          heading.id = `${section.id}-heading`;
        }
        section.setAttribute('aria-labelledby', heading.id);
      }
    });
  }

  setupKeyboardNavigation() {
    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Escape key handling
      if (e.key === 'Escape') {
        this.handleEscapeKey();
      }

      // Alt + T for table of contents (if exists)
      if (e.altKey && e.key === 't') {
        e.preventDefault();
        this.focusTableOfContents();
      }

      // Alt + M for main content
      if (e.altKey && e.key === 'm') {
        e.preventDefault();
        this.focusMainContent();
      }
    });
  }

  initSmoothScrolling() {
    // Enhanced smooth scrolling with offset calculation
    document.addEventListener('click', (e) => {
      const target = e.target.closest('a[href^="#"]');
      if (target && target.getAttribute('href').length > 1) {
        this.handleAnchorClick(e, target);
      }
    });
  }

  handleAnchorClick(e, target) {
    e.preventDefault();

    const href = target.getAttribute('href');
    const targetElement = document.querySelector(href);

    if (targetElement) {
      // Calculate offset including header height
      const offsetTop = targetElement.offsetTop - this.headerHeight - 20; // 20px extra padding

      // Smooth scroll with fallback
      if ('scrollBehavior' in document.documentElement.style) {
        window.scrollTo({
          top: Math.max(0, offsetTop),
          behavior: 'smooth'
        });
      } else {
        // Fallback for older browsers
        this.smoothScrollTo(Math.max(0, offsetTop));
      }

      // Focus management for accessibility
      setTimeout(() => {
        targetElement.focus({ preventScroll: true });
        if (!targetElement.hasAttribute('tabindex')) {
          targetElement.setAttribute('tabindex', '-1');
        }
      }, 500);

      // Update URL
      history.pushState(null, null, href);

      // Analytics tracking
      this.trackNavigation(href, target.textContent);
    }
  }

  smoothScrollTo(targetPosition) {
    // Custom smooth scroll implementation for older browsers
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    const duration = Math.min(Math.abs(distance) / 2, 800); // Max 800ms
    let start = null;

    const animation = (currentTime) => {
      if (start === null) start = currentTime;
      const timeElapsed = currentTime - start;
      const run = this.easeInOutQuad(timeElapsed, startPosition, distance, duration);
      window.scrollTo(0, run);

      if (timeElapsed < duration) {
        requestAnimationFrame(animation);
      }
    };

    requestAnimationFrame(animation);
  }

  easeInOutQuad(t, b, c, d) {
    t /= d / 2;
    if (t < 1) return c / 2 * t * t + b;
    t--;
    return -c / 2 * (t * (t - 2) - 1) + b;
  }

  initIntersectionObserver() {
    // Track which section is currently in view
    if ('IntersectionObserver' in window) {
      const options = {
        rootMargin: `-${this.headerHeight + 50}px 0px -50% 0px`,
        threshold: [0, 0.25, 0.5, 0.75, 1]
      };

      this.scrollObserver = new IntersectionObserver((entries) => {
        this.handleIntersectionChanges(entries);
      }, options);

      // Observe all sections
      const sections = document.querySelectorAll('section[id]');
      sections.forEach(section => {
        this.scrollObserver.observe(section);
      });
    }
  }

  handleIntersectionChanges(entries) {
    const visibleSections = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

    if (visibleSections.length > 0) {
      const newActiveSection = visibleSections[0].target.id;

      if (newActiveSection !== this.activeSection) {
        this.activeSection = newActiveSection;
        this.updateNavigationHighlight(newActiveSection);
        this.updateReadingProgress(visibleSections[0]);
      }
    }
  }

  updateNavigationHighlight(sectionId) {
    // Update active navigation item
    const navLinks = document.querySelectorAll('.nav-link, .footer-links a');

    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === `#${sectionId}`) {
        link.classList.add('nav-link--active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('nav-link--active');
        link.removeAttribute('aria-current');
      }
    });
  }

  updateReadingProgress(entry) {
    // Calculate reading progress for analytics
    const progress = Math.round(entry.intersectionRatio * 100);

    // Throttle progress tracking
    clearTimeout(this.scrollTimer);
    this.scrollTimer = setTimeout(() => {
      this.trackReadingProgress(entry.target.id, progress);
    }, 1000);
  }

  initMobileNavigation() {
    // Enhanced mobile navigation behavior
    const nav = document.querySelector('.main-nav');
    const header = document.querySelector('.site-header');

    if (nav && header) {
      this.setupMobileMenu(nav, header);
    }

    // Touch gesture support for navigation
    this.setupTouchGestures();
  }

  setupMobileMenu(nav, header) {
    // Create mobile menu toggle if it doesn't exist
    let menuToggle = header.querySelector('.menu-toggle');

    if (!menuToggle && window.innerWidth <= 768) {
      menuToggle = document.createElement('button');
      menuToggle.className = 'menu-toggle';
      menuToggle.innerHTML = '☰';
      menuToggle.setAttribute('aria-label', 'Toggle navigation menu');
      menuToggle.setAttribute('aria-expanded', 'false');

      const headerActions = header.querySelector('.header-actions');
      if (headerActions) {
        headerActions.insertBefore(menuToggle, headerActions.firstChild);
      }

      // Toggle functionality
      menuToggle.addEventListener('click', () => {
        const isExpanded = nav.classList.toggle('nav--open');
        menuToggle.setAttribute('aria-expanded', isExpanded.toString());
        menuToggle.innerHTML = isExpanded ? '✕' : '☰';

        // Prevent body scroll when menu is open
        document.body.style.overflow = isExpanded ? 'hidden' : '';
      });

      // Close menu when clicking outside
      document.addEventListener('click', (e) => {
        if (!header.contains(e.target) && nav.classList.contains('nav--open')) {
          nav.classList.remove('nav--open');
          menuToggle.setAttribute('aria-expanded', 'false');
          menuToggle.innerHTML = '☰';
          document.body.style.overflow = '';
        }
      });
    }
  }

  setupTouchGestures() {
    // Add swipe gestures for mobile navigation
    let touchStartX = 0;
    let touchStartY = 0;

    document.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      if (!touchStartX || !touchStartY) return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;

      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;

      // Minimum swipe distance
      if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 100) {
        if (deltaX > 0) {
          // Swipe right - go to previous section
          this.navigateToAdjacentSection('previous');
        } else {
          // Swipe left - go to next section
          this.navigateToAdjacentSection('next');
        }
      }

      touchStartX = 0;
      touchStartY = 0;
    }, { passive: true });
  }

  navigateToAdjacentSection(direction) {
    const sections = Array.from(document.querySelectorAll('section[id]'));
    const currentIndex = sections.findIndex(section => section.id === this.activeSection);

    let targetIndex;
    if (direction === 'next') {
      targetIndex = Math.min(currentIndex + 1, sections.length - 1);
    } else {
      targetIndex = Math.max(currentIndex - 1, 0);
    }

    if (targetIndex !== currentIndex && sections[targetIndex]) {
      const targetSection = sections[targetIndex];
      const href = `#${targetSection.id}`;

      // Create a temporary anchor element to trigger navigation
      const tempAnchor = document.createElement('a');
      tempAnchor.href = href;
      this.handleAnchorClick(new Event('click'), tempAnchor);
    }
  }

  initProgressiveEnhancement() {
    // Enhance elements progressively
    this.enhanceButtons();
    this.enhanceCards();
    this.enhanceForms();
    this.setupLazyLoading();
  }

  enhanceButtons() {
    // Add ripple effect to buttons
    const buttons = document.querySelectorAll('.btn, .help-btn, button');

    buttons.forEach(button => {
      button.addEventListener('click', (e) => {
        this.createRippleEffect(e, button);
      });
    });
  }

  createRippleEffect(e, element) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ripple = document.createElement('span');
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple');

    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 600);
  }

  enhanceCards() {
    // Add hover and focus enhancements to cards
    const cards = document.querySelectorAll('.doc-card, .help-card, .quick-start-step');

    cards.forEach(card => {
      // Keyboard accessibility
      if (!card.hasAttribute('tabindex') && !card.href) {
        card.setAttribute('tabindex', '0');
      }

      // Enhanced focus and hover states
      card.addEventListener('mouseenter', () => {
        this.animateCard(card, 'enter');
      });

      card.addEventListener('mouseleave', () => {
        this.animateCard(card, 'leave');
      });
    });
  }

  animateCard(card, action) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    if (action === 'enter') {
      card.style.transform = 'translateY(-2px) scale(1.02)';
    } else {
      card.style.transform = '';
    }
  }

  enhanceForms() {
    // Enhance form interactions
    const inputs = document.querySelectorAll('input, textarea, select');

    inputs.forEach(input => {
      // Add floating labels effect
      this.setupFloatingLabel(input);

      // Add validation feedback
      input.addEventListener('blur', () => {
        this.validateInput(input);
      });
    });
  }

  setupFloatingLabel(input) {
    const label = document.querySelector(`label[for="${input.id}"]`);
    if (!label) return;

    const container = input.parentElement;
    container.classList.add('input-container');

    const updateLabelState = () => {
      if (input.value || input === document.activeElement) {
        label.classList.add('label--floating');
      } else {
        label.classList.remove('label--floating');
      }
    };

    input.addEventListener('focus', updateLabelState);
    input.addEventListener('blur', updateLabelState);
    input.addEventListener('input', updateLabelState);

    // Initial state
    updateLabelState();
  }

  validateInput(input) {
    if (input.checkValidity()) {
      input.classList.remove('input--error');
      input.classList.add('input--valid');
    } else {
      input.classList.remove('input--valid');
      input.classList.add('input--error');
    }
  }

  setupLazyLoading() {
    // Implement lazy loading for images and media
    if ('IntersectionObserver' in window) {
      const mediaObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.loadMedia(entry.target);
            mediaObserver.unobserve(entry.target);
          }
        });
      }, { rootMargin: '50px' });

      // Observe all images with data-src
      const lazyImages = document.querySelectorAll('img[data-src], video[data-src]');
      lazyImages.forEach(img => mediaObserver.observe(img));
    }
  }

  loadMedia(element) {
    if (element.dataset.src) {
      element.src = element.dataset.src;
      element.removeAttribute('data-src');

      if (element.tagName === 'IMG') {
        element.addEventListener('load', () => {
          element.classList.add('loaded');
        });
      }
    }
  }

  bindGlobalEvents() {
    // Debounced resize handler
    window.addEventListener('resize', () => {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => {
        this.handleResize();
      }, 250);
    });

    // Page visibility for analytics
    document.addEventListener('visibilitychange', () => {
      this.handleVisibilityChange();
    });

    // Performance monitoring
    if ('PerformanceObserver' in window) {
      this.setupPerformanceMonitoring();
    }
  }

  handleResize() {
    this.calculateHeaderHeight();

    // Update intersection observer margins
    if (this.scrollObserver) {
      this.scrollObserver.disconnect();
      this.initIntersectionObserver();
    }

    // Update mobile navigation
    this.updateMobileNavigation();
  }

  updateMobileNavigation() {
    const nav = document.querySelector('.main-nav');
    const menuToggle = document.querySelector('.menu-toggle');

    if (window.innerWidth > 768) {
      // Desktop view - remove mobile menu styles
      if (nav) {
        nav.classList.remove('nav--open');
      }
      if (menuToggle) {
        menuToggle.style.display = 'none';
        menuToggle.setAttribute('aria-expanded', 'false');
      }
      document.body.style.overflow = '';
    } else {
      // Mobile view - show menu toggle
      if (menuToggle) {
        menuToggle.style.display = 'block';
      }
    }
  }

  calculateHeaderHeight() {
    const header = document.querySelector('.site-header');
    this.headerHeight = header ? header.offsetHeight : 0;
  }

  handleVisibilityChange() {
    if (document.hidden) {
      this.trackEvent('page_hidden');
    } else {
      this.trackEvent('page_visible');
    }
  }

  setupPerformanceMonitoring() {
    // Monitor Core Web Vitals
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'measure') {
          this.trackPerformance(entry.name, entry.duration);
        }
      });
    });

    observer.observe({ entryTypes: ['measure'] });
  }

  // Utility methods for other scripts
  handleEscapeKey() {
    // Close any open modals or overlays
    const openModals = document.querySelectorAll('[aria-modal="true"]:not([hidden])');
    openModals.forEach(modal => {
      const closeBtn = modal.querySelector('[data-close]');
      if (closeBtn) {
        closeBtn.click();
      }
    });

    // Close mobile menu
    const nav = document.querySelector('.nav--open');
    if (nav) {
      const menuToggle = document.querySelector('.menu-toggle');
      if (menuToggle) {
        menuToggle.click();
      }
    }
  }

  focusTableOfContents() {
    const toc = document.querySelector('.table-of-contents, .nav-list');
    if (toc) {
      const firstLink = toc.querySelector('a');
      if (firstLink) {
        firstLink.focus();
      }
    }
  }

  focusMainContent() {
    const main = document.querySelector('#main-content, main');
    if (main) {
      main.focus();
      if (!main.hasAttribute('tabindex')) {
        main.setAttribute('tabindex', '-1');
      }
    }
  }

  // Analytics tracking methods
  trackNavigation(href, linkText) {
    this.trackEvent('navigation_click', {
      href: href,
      link_text: linkText,
      section: this.activeSection
    });
  }

  trackReadingProgress(sectionId, progress) {
    this.trackEvent('reading_progress', {
      section: sectionId,
      progress: progress
    });
  }

  trackPerformance(metric, value) {
    this.trackEvent('performance_metric', {
      metric: metric,
      value: Math.round(value)
    });
  }

  trackEvent(eventName, properties = {}) {
    // Analytics tracking (placeholder for actual implementation)
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, properties);
    }

    // Console logging for development
    console.log(`📊 Event: ${eventName}`, properties);
  }
}

// CSS for enhanced interactions (injected dynamically)
const mainCSS = `
/* Enhanced focus styles for keyboard users */
body.using-keyboard *:focus {
  outline: 2px solid var(--color-primary, #3b82f6);
  outline-offset: 2px;
}

body:not(.using-keyboard) *:focus {
  outline: none;
}

/* Navigation active state */
.nav-link--active {
  color: var(--color-primary, #3b82f6) !important;
  background: var(--bg-tertiary, #f3f4f6) !important;
}

/* Mobile navigation */
.nav--open {
  display: block !important;
  position: fixed;
  top: var(--header-height, 4rem);
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-primary, #ffffff);
  z-index: 999;
  overflow-y: auto;
  padding: var(--space-6, 1.5rem);
}

.menu-toggle {
  display: none;
  background: var(--bg-tertiary, #f3f4f6);
  border: 1px solid var(--color-gray-200, #e5e7eb);
  border-radius: var(--radius-md, 0.5rem);
  padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
  font-size: var(--font-size-lg, 1.125rem);
  cursor: pointer;
  transition: all 0.15s ease;
}

.menu-toggle:hover {
  background: var(--color-gray-300, #d1d5db);
}

/* Card animations */
.doc-card,
.help-card,
.quick-start-step {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Ripple effect */
.ripple {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  pointer-events: none;
  animation: ripple-animation 0.6s ease-out;
}

@keyframes ripple-animation {
  to {
    transform: scale(2);
    opacity: 0;
  }
}

/* Input enhancements */
.input-container {
  position: relative;
}

.input-container label {
  transition: all 0.2s ease;
}

.label--floating {
  transform: translateY(-1.5rem) scale(0.875);
  color: var(--color-primary, #3b82f6);
}

.input--valid {
  border-color: var(--color-secondary, #10b981);
}

.input--error {
  border-color: #ef4444;
}

/* Lazy loading */
img[data-src],
video[data-src] {
  opacity: 0;
  transition: opacity 0.3s ease;
}

img.loaded,
video.loaded {
  opacity: 1;
}

/* Dark theme support */
@media (prefers-color-scheme: dark) {
  .nav--open {
    background: var(--bg-primary, #111827);
  }

  .menu-toggle {
    background: var(--bg-tertiary, #374151);
    border-color: var(--color-gray-600, #4b5563);
    color: var(--text-primary, #f9fafb);
  }

  .menu-toggle:hover {
    background: var(--color-gray-600, #4b5563);
  }
}

[data-theme="dark"] .nav--open {
  background: var(--bg-primary, #111827);
}

[data-theme="dark"] .menu-toggle {
  background: var(--bg-tertiary, #374151);
  border-color: var(--color-gray-600, #4b5563);
  color: var(--text-primary, #f9fafb);
}

[data-theme="dark"] .menu-toggle:hover {
  background: var(--color-gray-600, #4b5563);
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .doc-card,
  .help-card,
  .quick-start-step,
  .input-container label,
  img[data-src],
  video[data-src] {
    transition: none !important;
  }

  .ripple {
    animation: none !important;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .nav-link--active {
    border: 2px solid currentColor !important;
  }

  .menu-toggle {
    border-width: 2px;
  }
}
`;

// Inject main styles
function injectMainStyles() {
  const styleElement = document.createElement('style');
  styleElement.textContent = mainCSS;
  document.head.appendChild(styleElement);
}

// Initialize documentation app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    injectMainStyles();
    window.documentationApp = new DocumentationApp();
  });
} else {
  injectMainStyles();
  window.documentationApp = new DocumentationApp();
}

// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DocumentationApp;
}
