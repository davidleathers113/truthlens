// Unit tests for AIService
// Tests Chrome Built-in AI integration and fallback logic

import { AIService } from '@background/ai/aiService';
import { ContentAnalysis } from '@shared/types';

describe('AIService', () => {
  let aiService: AIService;

  beforeEach(() => {
    aiService = new AIService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    aiService.destroy();
  });

  describe('initialization', () => {
    it('should initialize successfully when Chrome AI is available', async () => {
      const result = await aiService.initialize();
      expect(result).toBe(true);
      expect(window.ai.languageModel.availability).toHaveBeenCalled();
      expect(window.ai.languageModel.create).toHaveBeenCalledWith({
        systemPrompt: expect.stringContaining('TruthLens'),
        temperature: 0.7,
        topK: 40,
      });
    });

    it('should handle Chrome AI unavailability gracefully', async () => {
      // Mock AI as unavailable
      const mockAI = window.ai as any;
      mockAI.languageModel.availability.mockResolvedValue('no');

      const result = await aiService.initialize();
      expect(result).toBe(false);
    });

    it('should handle missing Chrome AI APIs', async () => {
      // Remove AI APIs
      delete (window as any).ai;

      const result = await aiService.initialize();
      expect(result).toBe(false);
    });
  });

  describe('content analysis', () => {
    const mockContent: ContentAnalysis = {
      title: 'Test Article',
      url: 'https://example.com/test',
      content: 'This is test content for analysis',
      type: 'article',
      platform: 'web',
    };

    it('should analyze content with AI when available', async () => {
      await aiService.initialize();
      
      const result = await aiService.analyzeContent(mockContent);
      
      expect(result).toMatchObject({
        score: expect.any(Number),
        level: expect.stringMatching(/^(high|medium|low|unknown)$/),
        confidence: expect.any(Number),
        reasoning: expect.any(String),
        source: 'ai',
        timestamp: expect.any(Number),
      });
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should use fallback analysis when AI fails', async () => {
      // Mock AI failure
      const mockAI = window.ai as any;
      mockAI.languageModel.create.mockResolvedValue({
        prompt: jest.fn().mockRejectedValue(new Error('AI failed')),
        destroy: jest.fn(),
      });

      await aiService.initialize();
      const result = await aiService.analyzeContent(mockContent);
      
      expect(result.source).toBe('fallback');
      expect(result.reasoning).toContain('AI unavailable');
    });

    it('should handle trusted domains in fallback', async () => {
      const trustedContent: ContentAnalysis = {
        ...mockContent,
        url: 'https://reuters.com/article',
      };

      // Force fallback by making AI unavailable
      delete (window as any).ai;

      const result = await aiService.analyzeContent(trustedContent);
      
      expect(result.score).toBeGreaterThan(80);
      expect(result.level).toBe('high');
    });

    it('should handle untrusted domains in fallback', async () => {
      const untrustedContent: ContentAnalysis = {
        ...mockContent,
        url: 'https://fake-news.com/hoax',
      };

      // Force fallback
      delete (window as any).ai;

      const result = await aiService.analyzeContent(untrustedContent);
      
      expect(result.score).toBeLessThan(30);
      expect(result.level).toBe('low');
    });
  });

  describe('content summarization', () => {
    it('should summarize content when summarizer is available', async () => {
      await aiService.initialize();
      
      const summary = await aiService.summarizeContent('Long text content to summarize');
      
      expect(summary).toBe('Test summary content');
      expect(window.ai.summarizer.create).toHaveBeenCalled();
    });

    it('should return null when summarizer unavailable', async () => {
      // Mock summarizer as unavailable
      const mockAI = window.ai as any;
      mockAI.summarizer.availability.mockResolvedValue('no');

      await aiService.initialize();
      const summary = await aiService.summarizeContent('Test content');
      
      expect(summary).toBeNull();
    });
  });

  describe('performance', () => {
    it('should complete analysis within performance target', async () => {
      await aiService.initialize();

      const startTime = performance.now();
      await aiService.analyzeContent({
        title: 'Performance Test',
        url: 'https://test.com',
        content: 'Test content',
        type: 'article',
      });
      const endTime = performance.now();

      // Should complete within 1 second (1000ms)
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('memory management', () => {
    it('should properly clean up resources', () => {
      const mockLanguageModel = {
        prompt: jest.fn(),
        destroy: jest.fn(),
      };
      const mockSummarizer = {
        summarize: jest.fn(),
        destroy: jest.fn(),
      };

      // Manually set models to test cleanup
      (aiService as any).languageModel = mockLanguageModel;
      (aiService as any).summarizer = mockSummarizer;

      aiService.destroy();

      expect(mockLanguageModel.destroy).toHaveBeenCalled();
      expect(mockSummarizer.destroy).toHaveBeenCalled();
    });
  });
});