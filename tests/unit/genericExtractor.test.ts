import { GenericExtractor } from '@content/extractors/genericExtractor';
import { ContentAnalysis } from '@shared/types';

// Mock the Readability library
jest.mock('@mozilla/readability', () => ({
  Readability: jest.fn().mockImplementation(() => ({
    parse: jest.fn().mockReturnValue({
      title: 'Test Article',
      content: '<p>This is test content for the article.</p>',
      textContent: 'This is test content for the article.',
      length: 100,
      excerpt: 'This is test content...',
      byline: 'Test Author',
      dir: 'ltr',
      siteName: 'Test Site',
      publishedTime: '2025-01-01',
      lang: 'en',
    }),
  })),
  isProbablyReaderable: jest.fn().mockReturnValue(true),
}));

// Mock DOM methods
Object.defineProperty(window, 'location', {
  value: {
    href: 'https://example.com/test-article',
    hostname: 'example.com',
  },
  writable: true,
});

Object.defineProperty(global, 'document', {
  value: {
    title: 'Test Document',
    cloneNode: jest.fn().mockReturnValue({
      querySelectorAll: jest.fn().mockReturnValue([]),
      querySelector: jest.fn().mockReturnValue(null),
      body: {
        textContent: 'Test content for analysis',
      },
    }),
    querySelectorAll: jest.fn().mockReturnValue([]),
    querySelector: jest.fn().mockReturnValue(null),
    createElement: jest.fn().mockReturnValue({
      innerHTML: '',
      textContent: '',
      innerText: '',
    }),
  },
  writable: true,
});

Object.defineProperty(global, 'performance', {
  value: {
    now: jest.fn().mockReturnValue(1000),
  },
  writable: true,
});

describe('GenericExtractor', () => {
  let extractor: GenericExtractor;

  beforeEach(() => {
    extractor = new GenericExtractor({
      maxProcessingTime: 500,
      enablePaywallDetection: true,
      enableLinkAnalysis: true,
      enableMediaDetection: true,
      minContentLength: 100,
      preserveFormatting: false,
      enablePerformanceLogging: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canHandle', () => {
    it('should return true for standard web pages', () => {
      const url = 'https://example.com/article';
      const doc = document;
      
      const result = extractor.canHandle(url, doc);
      
      expect(result).toBe(true);
    });

    it('should return false for social media platforms', () => {
      const socialUrls = [
        'https://twitter.com/user/status/123',
        'https://x.com/user/status/123',
        'https://facebook.com/posts/123',
        'https://instagram.com/p/123',
        'https://tiktok.com/video/123',
        'https://youtube.com/watch?v=123',
        'https://reddit.com/r/test/comments/123',
        'https://linkedin.com/posts/123',
      ];

      socialUrls.forEach(url => {
        const result = extractor.canHandle(url, document);
        expect(result).toBe(false);
      });
    });

    it('should handle URL parsing errors gracefully', () => {
      const invalidUrl = 'not-a-valid-url';
      
      expect(() => {
        extractor.canHandle(invalidUrl, document);
      }).toThrow();
    });
  });

  describe('extractPageContent', () => {
    it('should extract content successfully', async () => {
      const result = await extractor.extractPageContent();
      
      expect(result).toBeDefined();
      expect(result.url).toBe('https://example.com/test-article');
      expect(result.title).toBe('Test Article');
      expect(result.type).toBe('article');
      expect(result.analysis).toBeDefined();
      expect(result.analysis.credibility).toBeDefined();
      expect(result.analysis.credibility.score).toBeGreaterThanOrEqual(0);
      expect(result.analysis.credibility.score).toBeLessThanOrEqual(100);
    });

    it('should handle readability parsing errors', async () => {
      const { Readability } = require('@mozilla/readability');
      Readability.mockImplementation(() => ({
        parse: jest.fn().mockReturnValue(null),
      }));

      const result = await extractor.extractPageContent();
      
      expect(result).toBeDefined();
      expect(result.analysis.credibility.source).toBe('ai');
    });

    it('should respect performance constraints', async () => {
      const slowExtractor = new GenericExtractor({
        maxProcessingTime: 100, // Very short timeout
        enablePerformanceLogging: true,
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Mock slow performance
      const originalNow = performance.now;
      let callCount = 0;
      performance.now = jest.fn(() => {
        callCount++;
        return callCount === 1 ? 0 : 200; // 200ms processing time
      });

      await slowExtractor.extractPageContent();
      
      // Restore original
      performance.now = originalNow;
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Content extraction exceeded time limit')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('content cleaning', () => {
    it('should normalize whitespace and characters', async () => {
      const extractor = new GenericExtractor();
      const dirtyContent = '  Multiple   spaces\n\nand  \t tabs\r\n  ';
      
      // Access private method for testing
      const cleanMethod = (extractor as any).cleanNormalizeContent.bind(extractor);
      const cleaned = await cleanMethod(dirtyContent);
      
      expect(cleaned).toBe('Multiple spaces and tabs');
    });
  });

  describe('metadata extraction', () => {
    it('should extract title from multiple sources', () => {
      // Mock document with meta tags
      const mockDoc = {
        ...document,
        querySelector: jest.fn((selector) => {
          if (selector === 'meta[property="og:title"]') {
            return { getAttribute: () => 'OG Title' };
          }
          if (selector === 'title') {
            return { textContent: 'HTML Title' };
          }
          if (selector === 'h1') {
            return { textContent: 'H1 Title' };
          }
          return null;
        }),
        querySelectorAll: jest.fn().mockReturnValue([]),
      };

      const extractor = new GenericExtractor();
      const extractTitleMethod = (extractor as any).extractTitle.bind(extractor);
      const title = extractTitleMethod(mockDoc);
      
      expect(title).toBe('OG Title');
    });
  });

  describe('link analysis', () => {
    it('should analyze links and citations', async () => {
      const mockContentArea = {
        querySelectorAll: jest.fn((selector) => {
          if (selector === 'a[href]') {
            return [
              {
                getAttribute: () => 'https://reuters.com/article',
                textContent: 'Reuters source',
              },
              {
                getAttribute: () => 'https://example.com/internal',
                textContent: 'Internal link',
              },
            ];
          }
          if (selector === 'p') {
            return [{}, {}]; // 2 paragraphs
          }
          return [];
        }),
      };

      const extractor = new GenericExtractor();
      const analyzeLinkMethod = (extractor as any).analyzeLinksCitations.bind(extractor);
      
      // Mock createElementFromHtml
      const createElementMethod = (extractor as any).createElementFromHtml.bind(extractor);
      (extractor as any).createElementFromHtml = jest.fn().mockReturnValue(mockContentArea);
      
      const analysis = await analyzeLinkMethod(document, { content: '<p>test</p>' });
      
      expect(analysis.totalLinks).toBe(2);
      expect(analysis.externalLinks).toBe(1);
      expect(analysis.internalLinks).toBe(1);
      expect(analysis.credibleDomains).toContain('reuters.com');
      expect(analysis.linkDensity).toBe(1); // 2 links / 2 paragraphs
    });
  });

  describe('paywall detection', () => {
    it('should detect paywall indicators', async () => {
      const mockDoc = {
        ...document,
        querySelectorAll: jest.fn((selector) => {
          if (selector.includes('paywall')) {
            return [{}]; // Mock paywall element found
          }
          return [];
        }),
        body: {
          textContent: 'This article is for subscribers only. Please subscribe to continue reading.',
        },
      };

      const extractor = new GenericExtractor();
      const detectPaywallMethod = (extractor as any).detectPaywall.bind(extractor);
      const detection = await detectPaywallMethod(mockDoc);
      
      expect(detection.hasPaywall).toBe(true);
      expect(detection.confidence).toBeGreaterThan(0);
      expect(detection.indicators.length).toBeGreaterThan(0);
    });
  });

  describe('media detection', () => {
    it('should detect images and videos', async () => {
      const mockContentArea = {
        querySelectorAll: jest.fn((selector) => {
          if (selector === 'img') {
            return [
              {
                getAttribute: (attr: string) => {
                  if (attr === 'src') return 'https://example.com/image.jpg';
                  if (attr === 'alt') return 'Test image';
                  return null;
                },
                hasAttribute: () => false,
              },
            ];
          }
          if (selector.includes('video')) {
            return [
              {
                tagName: 'VIDEO',
                getAttribute: (attr: string) => {
                  if (attr === 'src') return 'https://example.com/video.mp4';
                  return null;
                },
              },
            ];
          }
          return [];
        }),
      };

      const extractor = new GenericExtractor();
      const detectMediaMethod = (extractor as any).detectMediaContent.bind(extractor);
      
      // Mock createElementFromHtml
      (extractor as any).createElementFromHtml = jest.fn().mockReturnValue(mockContentArea);
      
      const mediaContent = await detectMediaMethod(document, { content: '<p>test</p>' });
      
      expect(mediaContent.images).toHaveLength(1);
      expect(mediaContent.images[0].src).toBe('https://example.com/image.jpg');
      expect(mediaContent.images[0].alt).toBe('Test image');
      expect(mediaContent.videos).toHaveLength(1);
      expect(mediaContent.videos[0].src).toBe('https://example.com/video.mp4');
    });
  });

  describe('error handling', () => {
    it('should handle extraction errors gracefully', async () => {
      const faultyExtractor = new GenericExtractor();
      
      // Mock document.cloneNode to throw an error
      const originalCloneNode = document.cloneNode;
      document.cloneNode = jest.fn().mockImplementation(() => {
        throw new Error('DOM cloning failed');
      });

      const result = await faultyExtractor.extractPageContent();
      
      expect(result).toBeDefined();
      expect(result.analysis.credibility.score).toBe(0);
      expect(result.analysis.credibility.reasoning).toContain('Content extraction failed');
      
      // Restore original
      document.cloneNode = originalCloneNode;
    });
  });
});