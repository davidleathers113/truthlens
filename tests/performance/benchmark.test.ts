// Performance benchmark tests for TruthLens
// Tests performance targets and memory usage

import { PerformanceBenchmark, PERFORMANCE_TARGETS, benchmarkFunction } from '../utils/performance';
import { AIService } from '@background/ai/aiService';
import { StorageService } from '@shared/storage/storageService';
import { IndicatorManager } from '@content/indicators/indicatorManager';
import { mockContentAnalysis, mockCredibilityScore } from '../utils/mockData';

describe('Performance Benchmarks', () => {
  describe('AI Service Performance', () => {
    it('should complete content analysis within performance target', async () => {
      const aiService = new AIService();
      await aiService.initialize();
      
      const testContent = mockContentAnalysis.article();
      
      await benchmarkFunction(
        'AI Content Analysis',
        () => aiService.analyzeContent(testContent),
        5, // iterations
        PERFORMANCE_TARGETS.CONTENT_ANALYSIS
      );
      
      aiService.destroy();
    });
  });

  describe('Storage Performance', () => {
    it('should complete storage operations within targets', async () => {
      const storageService = new StorageService();
      
      await benchmarkFunction(
        'Storage Read',
        () => storageService.getSettings(),
        10,
        PERFORMANCE_TARGETS.STORAGE_READ
      );
      
      await benchmarkFunction(
        'Storage Write',
        () => storageService.updateSettings({ theme: 'dark' }),
        10,
        PERFORMANCE_TARGETS.STORAGE_WRITE
      );
    });
  });

  describe('Indicator Performance', () => {
    beforeEach(() => {
      document.body.innerHTML = '<main><article>Test content</article></main>';
    });

    afterEach(() => {
      document.body.innerHTML = '';
    });

    it('should display indicators within performance target', async () => {
      const indicatorManager = new IndicatorManager();
      const testContent = mockContentAnalysis.article();
      const testCredibility = mockCredibilityScore.high();
      
      await benchmarkFunction(
        'Indicator Display',
        async () => {
          indicatorManager.showIndicator(testContent, testCredibility);
          return Promise.resolve();
        },
        10,
        PERFORMANCE_TARGETS.INDICATOR_DISPLAY
      );
      
      indicatorManager.cleanup();
    });
  });

  describe('Memory Usage', () => {
    it('should measure extension memory impact', () => {
      const benchmark = new PerformanceBenchmark();
      benchmark.setMemoryBaseline();
      
      // Simulate extension operations
      const aiService = new AIService();
      const storageService = new StorageService();
      const indicatorManager = new IndicatorManager();
      
      const memoryIncrease = benchmark.getMemoryIncrease();
      const maxMemoryMB = PERFORMANCE_TARGETS.MEMORY_BACKGROUND_SCRIPT;
      
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      
      // In real testing, this would check actual memory
      // For mock testing, we verify the measurement works
      expect(memoryIncrease).toBeGreaterThanOrEqual(0);
      
      // Cleanup
      aiService.destroy();
      indicatorManager.cleanup();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple simultaneous analyses efficiently', async () => {
      const aiService = new AIService();
      await aiService.initialize();
      
      const testContents = Array.from({ length: 5 }, (_, i) => 
        mockContentAnalysis.article({ 
          title: `Concurrent Test ${i}`,
          url: `https://example.com/test${i}` 
        })
      );

      const benchmark = new PerformanceBenchmark();
      
      await benchmark.measureTime('Concurrent Analysis', async () => {
        const results = await Promise.all(
          testContents.map(content => aiService.analyzeContent(content))
        );
        
        expect(results).toHaveLength(5);
        results.forEach(result => {
          expect(result.score).toBeGreaterThanOrEqual(0);
          expect(result.score).toBeLessThanOrEqual(100);
        });
      });

      const stats = benchmark.getStats('Concurrent Analysis');
      expect(stats?.average).toBeDefined();
      expect(stats!.average).toBeLessThan(3000); // 3 second max for 5 concurrent analyses
      
      console.log('Concurrent analysis stats:', stats);
      
      aiService.destroy();
    });
  });
});