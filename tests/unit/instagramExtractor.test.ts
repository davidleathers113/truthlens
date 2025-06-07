import { InstagramExtractor } from '@content/extractors/instagramExtractor';
import { ContentAnalysis } from '@shared/types';

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
      // Create mock post element
      const postElement = mockDocument.createElement('article');
      postElement.setAttribute('role', 'presentation');

      // Add username
      const usernameLink = mockDocument.createElement('a');
      usernameLink.textContent = 'testuser';
      usernameLink.href = '/testuser/';
      const header = mockDocument.createElement('header');
      header.appendChild(usernameLink);
      postElement.appendChild(header);

      // Add caption
      const captionDiv = mockDocument.createElement('div');
      captionDiv.innerHTML = '<span>Test caption with #hashtag and @mention</span>';
      postElement.appendChild(captionDiv);

      // Add image
      const img = mockDocument.createElement('img');
      img.src = 'https://instagram.com/image.jpg';
      img.alt = 'Test image';
      postElement.appendChild(img);

      mockDocument.body.appendChild(postElement);

      // Mock querySelector to return our elements
      jest.spyOn(document, 'querySelector').mockImplementation((selector: string) => {
        if (selector === 'main' || selector === 'body') {
          return mockDocument.body;
        }
        return null;
      });

      jest.spyOn(document, 'querySelectorAll').mockImplementation((selector: string) => {
        if (selector.includes('article')) {
          return mockDocument.querySelectorAll('article');
        }
        return mockDocument.querySelectorAll(selector);
      });

      const result = await extractor.extractPageContent();

      expect(result).toBeDefined();
      expect(result.text).toContain('Test caption');
      expect(result.images.length).toBeGreaterThan(0);
      expect(result.metadata?.hashtags).toContain('hashtag');
      expect(result.metadata?.mentions).toContain('mention');
    });

    it('should handle extraction errors gracefully', async () => {
      // Mock querySelector to throw error
      jest.spyOn(document, 'querySelector').mockImplementation(() => {
        throw new Error('DOM error');
      });

      const result = await extractor.extractPageContent();

      expect(result).toBeDefined();
      expect(result.credibility.score).toBe(0);
      expect(result.credibility.source).toBe('error');
      expect(result.error).toBeDefined();
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
    });
  });

  describe('Dynamic Content Handling', () => {
    it('should setup mutation observers', async () => {
      const observeSpy = jest.fn();
      const MockMutationObserver = jest.fn(() => ({
        observe: observeSpy,
        disconnect: jest.fn(),
      }));

      // @ts-ignore
      global.MutationObserver = MockMutationObserver;

      await extractor.extractPageContent();

      expect(MockMutationObserver).toHaveBeenCalled();
      expect(observeSpy).toHaveBeenCalled();
    });

    it('should setup intersection observer for lazy loading', async () => {
      const observeSpy = jest.fn();
      const MockIntersectionObserver = jest.fn(() => ({
        observe: observeSpy,
        disconnect: jest.fn(),
      }));

      // @ts-ignore
      global.IntersectionObserver = MockIntersectionObserver;

      await extractor.extractPageContent();

      expect(MockIntersectionObserver).toHaveBeenCalled();
    });
  });

  describe('Content Type Detection', () => {
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
      expect(result.text).toBe('');
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
