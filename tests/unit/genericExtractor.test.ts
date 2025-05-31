import { GenericExtractor, ExtractedMetadata, LinkAnalysis, MediaContent, PaywallDetection } from '@content/extractors/genericExtractor';
import { SourceDetails } from '@shared/types';

// Extended type for testing that includes the additional details from GenericExtractor
interface ExtendedSourceDetails extends SourceDetails {
  extractionTime?: string;
  contentLength?: number;
  hasReadabilityResult?: boolean;
  metadata?: ExtractedMetadata;
  linkAnalysis?: LinkAnalysis | null;
  mediaContent?: MediaContent | null;
  paywallDetection?: PaywallDetection | null;
}

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

// Create proper DOM mocks with complete interfaces
interface MockElement {
  getAttribute: jest.Mock;
  hasAttribute: jest.Mock;
  textContent: string;
  innerHTML?: string;
  tagName: string;
  parentElement?: MockElement | null;
  querySelector: jest.Mock;
  querySelectorAll: jest.Mock;
}

interface MockDocument {
  title: string;
  cloneNode: jest.Mock;
  querySelectorAll: jest.Mock;
  querySelector: jest.Mock;
  createElement: jest.Mock;
  body: MockElement;
}

const createMockElement = (overrides: Partial<MockElement> = {}): MockElement => ({
  getAttribute: jest.fn().mockReturnValue(null),
  hasAttribute: jest.fn().mockReturnValue(false),
  textContent: '',
  tagName: 'DIV',
  parentElement: null,
  querySelector: jest.fn().mockReturnValue(null),
  querySelectorAll: jest.fn().mockReturnValue([]),
  ...overrides,
});

const createMockDocument = (overrides: Partial<MockDocument> = {}): MockDocument => {
  const mockBody = createMockElement({
    textContent: 'Test content for analysis',
    querySelectorAll: jest.fn().mockReturnValue([]),
  });

  return {
    title: 'Test Document',
    cloneNode: jest.fn().mockReturnValue({
      querySelectorAll: jest.fn().mockReturnValue([]),
      querySelector: jest.fn().mockReturnValue(null),
      body: mockBody,
    }),
    querySelectorAll: jest.fn().mockReturnValue([]),
    querySelector: jest.fn().mockReturnValue(null),
    createElement: jest.fn().mockReturnValue(createMockElement({
      innerHTML: '',
      textContent: '',
    })),
    body: mockBody,
    ...overrides,
  };
};

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'https://example.com/test-article',
    hostname: 'example.com',
  },
  writable: true,
});

// Mock performance
Object.defineProperty(global, 'performance', {
  value: {
    now: jest.fn().mockReturnValue(1000),
  },
  writable: true,
});

describe('GenericExtractor', () => {
  let extractor: GenericExtractor;
  let mockDocument: MockDocument;

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

    mockDocument = createMockDocument();

    // Mock global document
    Object.defineProperty(global, 'document', {
      value: mockDocument,
      writable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canHandle', () => {
    it('should return true for standard web pages', () => {
      const url = 'https://example.com/article';

      const result = extractor.canHandle(url, mockDocument as unknown as Document);

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
        const result = extractor.canHandle(url, mockDocument as unknown as Document);
        expect(result).toBe(false);
      });
    });

    it('should handle URL parsing errors gracefully', () => {
      const invalidUrl = 'not-a-valid-url';

      expect(() => {
        extractor.canHandle(invalidUrl, mockDocument as unknown as Document);
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
      const mockPerformance = {
        now: jest.fn()
          .mockReturnValueOnce(0)    // Start time
          .mockReturnValueOnce(200)  // End time = 200ms processing
      };

      Object.defineProperty(global, 'performance', {
        value: mockPerformance,
        writable: true,
      });

      await slowExtractor.extractPageContent();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Content extraction exceeded time limit')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('integration tests for content extraction features', () => {
    it('should extract metadata from various sources', async () => {
      // Setup mock document with metadata
      const mockDocWithMeta = createMockDocument({
        querySelector: jest.fn((selector: string) => {
          if (selector === 'meta[property="og:title"]') {
            return createMockElement({
              getAttribute: jest.fn().mockReturnValue('OG Title')
            });
          }
          if (selector === 'title') {
            return createMockElement({ textContent: 'HTML Title' });
          }
          if (selector === 'h1') {
            return createMockElement({ textContent: 'H1 Title' });
          }
          return null;
        }),
        querySelectorAll: jest.fn().mockReturnValue([]),
      });

      Object.defineProperty(global, 'document', {
        value: mockDocWithMeta,
        writable: true,
      });

      const result = await extractor.extractPageContent();

      expect(result.title).toBe('Test Article'); // From Readability result
      expect((result.analysis.details as ExtendedSourceDetails)?.metadata).toBeDefined();
    });

    it('should handle link analysis in content', async () => {
      // Setup mock with links - content will be processed by readability algorithm

      // Mock the readability result to include this content
      const { Readability } = require('@mozilla/readability');
      Readability.mockImplementation(() => ({
        parse: jest.fn().mockReturnValue({
          title: 'Test Article',
          content: '<p><a href="https://reuters.com/article">Reuters source</a></p>',
          textContent: 'Reuters source',
          length: 100,
        }),
      }));

      const result = await extractor.extractPageContent();

      expect((result.analysis.details as ExtendedSourceDetails)?.linkAnalysis).toBeDefined();
      expect((result.analysis.details as ExtendedSourceDetails)?.linkAnalysis?.totalLinks).toBeGreaterThanOrEqual(0);
    });

    it('should detect paywall content', async () => {
      const mockDocWithPaywall = createMockDocument({
        querySelectorAll: jest.fn((selector: string) => {
          if (selector.includes('paywall')) return [createMockElement()];
          return [];
        }),
        body: createMockElement({
          textContent: 'This article is for subscribers only. Please subscribe to continue reading.',
        }),
      });

      Object.defineProperty(global, 'document', {
        value: mockDocWithPaywall,
        writable: true,
      });

      const result = await extractor.extractPageContent();

      expect((result.analysis.details as ExtendedSourceDetails)?.paywallDetection).toBeDefined();
      expect((result.analysis.details as ExtendedSourceDetails)?.paywallDetection?.hasPaywall).toBe(true);
    });

    it('should detect media content', async () => {

      // Mock readability to return content with media
      const { Readability } = require('@mozilla/readability');
      Readability.mockImplementation(() => ({
        parse: jest.fn().mockReturnValue({
          title: 'Test Article',
          content: '<p>Content with <img src="https://example.com/image.jpg" alt="Test image"></p>',
          textContent: 'Content with media',
          length: 100,
        }),
      }));

      const result = await extractor.extractPageContent();

      expect((result.analysis.details as ExtendedSourceDetails)?.mediaContent).toBeDefined();
      expect((result.analysis.details as ExtendedSourceDetails)?.mediaContent?.images).toBeDefined();
      expect((result.analysis.details as ExtendedSourceDetails)?.mediaContent?.videos).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle extraction errors gracefully', async () => {
      const faultyExtractor = new GenericExtractor();

      // Mock document.cloneNode to throw an error
      const mockDocWithError = createMockDocument({
        cloneNode: jest.fn().mockImplementation(() => {
          throw new Error('DOM cloning failed');
        }),
      });

      Object.defineProperty(global, 'document', {
        value: mockDocWithError,
        writable: true,
      });

      const result = await faultyExtractor.extractPageContent();

      expect(result).toBeDefined();
      expect(result.analysis.credibility.score).toBe(0);
      expect(result.analysis.credibility.reasoning).toContain('Content extraction failed');
    });

    it('should handle readability check failures', async () => {
      const { isProbablyReaderable } = require('@mozilla/readability');
      isProbablyReaderable.mockImplementation(() => {
        throw new Error('Readability check failed');
      });

      const result = await extractor.extractPageContent();

      expect(result).toBeDefined();
      expect(result.analysis.credibility.source).toBe('ai');
    });
  });

  describe('configuration options', () => {
    it('should disable features when configured', async () => {
      const minimalExtractor = new GenericExtractor({
        enablePaywallDetection: false,
        enableLinkAnalysis: false,
        enableMediaDetection: false,
      });

      const result = await minimalExtractor.extractPageContent();

      expect(result).toBeDefined();
      expect((result.analysis.details as ExtendedSourceDetails)?.linkAnalysis).toBeNull();
      expect((result.analysis.details as ExtendedSourceDetails)?.mediaContent).toBeNull();
      expect((result.analysis.details as ExtendedSourceDetails)?.paywallDetection).toBeNull();
    });

    it('should handle minimum content length threshold', async () => {
      const strictExtractor = new GenericExtractor({
        minContentLength: 1000, // High threshold
      });

      // Mock short content
      const { Readability } = require('@mozilla/readability');
      Readability.mockImplementation(() => ({
        parse: jest.fn().mockReturnValue({
          title: 'Short Article',
          content: '<p>Short content</p>',
          textContent: 'Short content',
          length: 50, // Below threshold
        }),
      }));

      const result = await strictExtractor.extractPageContent();

      expect(result).toBeDefined();
      expect(result.analysis.credibility.score).toBeLessThan(60); // Lower score for short content
    });
  });
});
