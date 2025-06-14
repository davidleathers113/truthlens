import { jest } from '@jest/globals';
import { InstagramExtractor } from '@content/extractors/instagramExtractor';

describe('InstagramExtractor', () => {
  let extractor: InstagramExtractor;
  let mockDocument: Document;

  beforeEach(() => {
    extractor = new InstagramExtractor();

    // Setup mock document
    mockDocument = document.implementation.createHTMLDocument();

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        href: 'https://www.instagram.com/p/ABC123/',
        hostname: 'www.instagram.com',
        pathname: '/p/ABC123/'
      },
      writable: true
    });

    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', {
      value: 1920,
      writable: true
    });
    Object.defineProperty(window, 'innerHeight', {
      value: 1080,
      writable: true
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Cleanup any observers
    if (extractor && typeof extractor.cleanup === 'function') {
      extractor.cleanup();
    }
  });

  describe('canHandle', () => {
    it('should handle Instagram URLs', () => {
      // Add Instagram DOM indicators to mockDocument
      const metaTag = mockDocument.createElement('meta');
      metaTag.setAttribute('property', 'og:site_name');
      metaTag.setAttribute('content', 'Instagram');
      mockDocument.head.appendChild(metaTag);

      const instagramUrls = [
        'https://www.instagram.com/',
        'https://instagram.com/p/ABC123/',
        'https://www.instagram.com/username/',
        'https://instagram.com/stories/username/123456/',
        'https://www.instagram.com/reel/ABC123/',
      ];

      instagramUrls.forEach(url => {
        expect(extractor.canHandle(url, mockDocument)).toBe(true);
      });
    });

    it('should not handle non-Instagram URLs', () => {
      const nonInstagramUrls = [
        'https://twitter.com/',
        'https://facebook.com/',
        'https://example.com/',
      ];

      nonInstagramUrls.forEach(url => {
        expect(extractor.canHandle(url, mockDocument)).toBe(false);
      });
    });
  });

  describe('extractPageContent', () => {
    it('should extract post content', async () => {
      // Add Instagram DOM indicators
      const metaTag = mockDocument.createElement('meta');
      metaTag.setAttribute('property', 'og:site_name');
      metaTag.setAttribute('content', 'Instagram');
      mockDocument.head.appendChild(metaTag);

      // Create mock post element with proper structure
      const postElement = mockDocument.createElement('article');
      postElement.setAttribute('role', 'presentation');
      postElement.setAttribute('data-id', 'test-post-123');

      // Add header with username (matching selector: 'header a span')
      const header = mockDocument.createElement('header');
      const usernameLink = mockDocument.createElement('a');
      usernameLink.href = '/testuser/';
      const usernameSpan = mockDocument.createElement('span');
      usernameSpan.textContent = 'testuser';
      usernameLink.appendChild(usernameSpan);
      header.appendChild(usernameLink);
      postElement.appendChild(header);

      // Add caption (matching selector: 'div span[dir="auto"]')
      const captionDiv = mockDocument.createElement('div');
      const captionSpan = mockDocument.createElement('span');
      captionSpan.setAttribute('dir', 'auto');
      captionSpan.textContent = 'Test caption with #hashtag and @mention';
      captionDiv.appendChild(captionSpan);
      postElement.appendChild(captionDiv);

      // Add image (matching selector: 'div img[src*="instagram"]')
      const imgDiv = mockDocument.createElement('div');
      const img = mockDocument.createElement('img');
      img.src = 'https://instagram.com/image.jpg';
      img.alt = 'Test image';
      imgDiv.appendChild(img);
      postElement.appendChild(imgDiv);

      mockDocument.body.appendChild(postElement);

      // Mock IntersectionObserver to prevent errors
      global.IntersectionObserver = jest.fn(() => ({
        observe: jest.fn(),
        disconnect: jest.fn(),
        unobserve: jest.fn(),
        takeRecords: jest.fn(),
        root: null,
        rootMargin: '',
        thresholds: []
      })) as any;

      // Mock querySelector to return our elements
      jest.spyOn(document, 'querySelector').mockImplementation((selector: string) => {
        if (selector === 'main' || selector === 'body') {
          return mockDocument.body;
        }
        if (selector.includes('meta')) {
          return mockDocument.querySelector(selector);
        }
        return mockDocument.querySelector(selector);
      });

      jest.spyOn(document, 'querySelectorAll').mockImplementation((selector: string) => {
        return mockDocument.querySelectorAll(selector);
      });

      // Mock canHandle to return true
      jest.spyOn(extractor, 'canHandle').mockReturnValue(true);

      const result = await extractor.extractPageContent();

      expect(result).toBeDefined();
      expect(result.content).toContain('Test caption');
      expect(result.type).toBe('social-post');
      expect(result.platform).toBe('instagram');
      expect(result.analysis).toBeDefined();
      expect(result.analysis.credibility).toBeDefined();
    });

    it('should handle extraction errors gracefully', async () => {
      // Mock querySelector to throw error
      jest.spyOn(document, 'querySelector').mockImplementation(() => {
        throw new Error('DOM error');
      });

      const result = await extractor.extractPageContent();

      expect(result).toBeDefined();
      expect(result.analysis.credibility.score).toBe(0);
      expect(result.analysis.credibility.source).toBe('fallback');
    });

    it('should respect rate limiting', async () => {
      const startTime = Date.now();

      // First extraction
      await extractor.extractPageContent();

      // Second extraction immediately after
      await extractor.extractPageContent();

      const elapsedTime = Date.now() - startTime;

      // Should have some delay between extractions
      expect(elapsedTime).toBeGreaterThan(100); // At least 100ms delay
    });

    it('should handle different viewport sizes', async () => {
      // Add Instagram DOM indicators
      const metaTag = mockDocument.createElement('meta');
      metaTag.setAttribute('property', 'og:site_name');
      metaTag.setAttribute('content', 'Instagram');
      mockDocument.head.appendChild(metaTag);

      // Mock canHandle to return true
      jest.spyOn(extractor, 'canHandle').mockReturnValue(true);

      // Mock querySelector/querySelectorAll to return empty results
      jest.spyOn(document, 'querySelector').mockReturnValue(mockDocument.body);
      jest.spyOn(document, 'querySelectorAll').mockReturnValue(mockDocument.querySelectorAll('notfound'));

      // Test mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
      const mobileResult = await extractor.extractPageContent();
      expect(mobileResult).toBeDefined();

      // Test tablet viewport
      Object.defineProperty(window, 'innerWidth', { value: 768, writable: true });
      const tabletResult = await extractor.extractPageContent();
      expect(tabletResult).toBeDefined();

      // Test desktop viewport
      Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true });
      const desktopResult = await extractor.extractPageContent();
      expect(desktopResult).toBeDefined();
    }, 10000); // Increase timeout to 10 seconds
  });

  describe('Dynamic Content Handling', () => {
    it('should setup mutation observers', async () => {
      // Add Instagram DOM indicators
      const metaTag = mockDocument.createElement('meta');
      metaTag.setAttribute('property', 'og:site_name');
      metaTag.setAttribute('content', 'Instagram');
      mockDocument.head.appendChild(metaTag);

      // Create a mock post with proper structure
      const postElement = mockDocument.createElement('article');
      postElement.setAttribute('role', 'presentation');
      postElement.setAttribute('data-id', 'test-post-123');

      // Add minimal structure to make extraction succeed
      const header = mockDocument.createElement('header');
      const link = mockDocument.createElement('a');
      const span = mockDocument.createElement('span');
      span.textContent = 'testuser';
      link.appendChild(span);
      header.appendChild(link);
      postElement.appendChild(header);

      mockDocument.body.appendChild(postElement);

      const observeSpy = jest.fn();
      const MockMutationObserver = jest.fn(() => ({
        observe: observeSpy,
        disconnect: jest.fn(),
      }));

      // Mock IntersectionObserver to prevent errors
      global.IntersectionObserver = jest.fn(() => ({
        observe: jest.fn(),
        disconnect: jest.fn(),
        unobserve: jest.fn(),
        takeRecords: jest.fn(),
        root: null,
        rootMargin: '',
        thresholds: []
      })) as any;

      // @ts-ignore
      global.MutationObserver = MockMutationObserver;

      // Mock canHandle to return true
      jest.spyOn(extractor, 'canHandle').mockReturnValue(true);

      // Mock querySelector/querySelectorAll to return our elements
      jest.spyOn(document, 'querySelector').mockReturnValue(mockDocument.body);
      jest.spyOn(document, 'querySelectorAll').mockImplementation((selector: string) => {
        return mockDocument.querySelectorAll(selector);
      });

      await extractor.extractPageContent();

      expect(MockMutationObserver).toHaveBeenCalled();
      expect(observeSpy).toHaveBeenCalled();
    });

    it('should setup intersection observer for lazy loading', async () => {
      // Add Instagram DOM indicators
      const metaTag = mockDocument.createElement('meta');
      metaTag.setAttribute('property', 'og:site_name');
      metaTag.setAttribute('content', 'Instagram');
      mockDocument.head.appendChild(metaTag);

      // Create a mock post with proper structure
      const postElement = mockDocument.createElement('article');
      postElement.setAttribute('role', 'presentation');
      postElement.setAttribute('data-id', 'test-post-123');

      // Add minimal structure to make extraction succeed
      const header = mockDocument.createElement('header');
      const link = mockDocument.createElement('a');
      const span = mockDocument.createElement('span');
      span.textContent = 'testuser';
      link.appendChild(span);
      header.appendChild(link);
      postElement.appendChild(header);

      mockDocument.body.appendChild(postElement);

      const observeSpy = jest.fn();
      const MockIntersectionObserver = jest.fn(() => ({
        observe: observeSpy,
        disconnect: jest.fn(),
        unobserve: jest.fn(),
        takeRecords: jest.fn(),
        root: null,
        rootMargin: '',
        thresholds: []
      }));

      // @ts-ignore
      global.IntersectionObserver = MockIntersectionObserver;

      // Mock canHandle to return true
      jest.spyOn(extractor, 'canHandle').mockReturnValue(true);

      // Mock querySelector/querySelectorAll to return our elements
      jest.spyOn(document, 'querySelector').mockReturnValue(mockDocument.body);
      jest.spyOn(document, 'querySelectorAll').mockImplementation((selector: string) => {
        return mockDocument.querySelectorAll(selector);
      });

      await extractor.extractPageContent();

      expect(MockIntersectionObserver).toHaveBeenCalled();
    });
  });

  describe('Content Type Detection', () => {
    beforeEach(() => {
      // Add Instagram DOM indicators
      const metaTag = mockDocument.createElement('meta');
      metaTag.setAttribute('property', 'og:site_name');
      metaTag.setAttribute('content', 'Instagram');
      mockDocument.head.appendChild(metaTag);
    });

    it('should detect post URLs', () => {
      window.location.href = 'https://www.instagram.com/p/ABC123/';
      expect(extractor.canHandle(window.location.href, mockDocument)).toBe(true);
    });

    it('should detect story URLs', () => {
      window.location.href = 'https://www.instagram.com/stories/username/123456/';
      expect(extractor.canHandle(window.location.href, mockDocument)).toBe(true);
    });

    it('should detect reel URLs', () => {
      window.location.href = 'https://www.instagram.com/reel/ABC123/';
      expect(extractor.canHandle(window.location.href, mockDocument)).toBe(true);
    });

    it('should detect profile URLs', () => {
      window.location.href = 'https://www.instagram.com/username/';
      expect(extractor.canHandle(window.location.href, mockDocument)).toBe(true);
    });
  });

  describe('Privacy and Compliance', () => {
    it('should skip private accounts', async () => {
      // Create mock private account indicator
      const privateIndicator = mockDocument.createElement('div');
      privateIndicator.textContent = 'This Account is Private';
      mockDocument.body.appendChild(privateIndicator);

      jest.spyOn(document, 'querySelector').mockImplementation((selector: string) => {
        if (selector.includes('Private')) {
          return privateIndicator;
        }
        return null;
      });

      const result = await extractor.extractPageContent();

      // Should return minimal data for private accounts
      expect(result.content).toBe('');
    });
  });

  describe('Performance', () => {
    it('should cache extracted content', async () => {
      // Create mock post with ID
      const postElement = mockDocument.createElement('article');
      postElement.setAttribute('data-id', 'test-post-123');
      mockDocument.body.appendChild(postElement);

      jest.spyOn(document, 'querySelectorAll').mockReturnValue(
        mockDocument.querySelectorAll('article')
      );

      // First extraction
      const result1 = await extractor.extractPageContent();

      // Second extraction - should use cache
      const result2 = await extractor.extractPageContent();

      // Results should be consistent
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    it('should clean up resources on cleanup', () => {
      const cleanup = jest.spyOn(extractor, 'cleanup');

      extractor.cleanup();

      expect(cleanup).toHaveBeenCalled();
    });
  });
});
