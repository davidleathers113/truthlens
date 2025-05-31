// Jest setup file for TruthLens Chrome extension testing
// Configures Chrome API mocks and testing environment

import 'jest-webextension-mock';
import '@testing-library/jest-dom';

// Global Chrome AI API mock for Chrome Built-in AI testing
const mockAILanguageModel = {
  availability: jest.fn().mockResolvedValue('readily'),
  create: jest.fn().mockResolvedValue({
    prompt: jest.fn().mockResolvedValue('{"score":75,"level":"medium","confidence":0.8,"reasoning":"Test analysis"}'),
    destroy: jest.fn(),
  }),
};

const mockAISummarizer = {
  availability: jest.fn().mockResolvedValue('readily'),
  create: jest.fn().mockResolvedValue({
    summarize: jest.fn().mockResolvedValue('Test summary content'),
    destroy: jest.fn(),
  }),
};

// Mock Chrome Built-in AI APIs with complete interface
(global.window as any) = {
  ...global.window,
  ai: {
    languageModel: mockAILanguageModel,
    summarizer: mockAISummarizer,
    assistant: {
      availability: jest.fn().mockResolvedValue('no'),
      create: jest.fn(),
    },
    writer: {
      availability: jest.fn().mockResolvedValue('no'),
      create: jest.fn(),
    },
    rewriter: {
      availability: jest.fn().mockResolvedValue('no'),
      create: jest.fn(),
    },
    translator: {
      availability: jest.fn().mockResolvedValue('no'),
      create: jest.fn(),
    },
    languageDetector: {
      availability: jest.fn().mockResolvedValue('no'),
      create: jest.fn(),
    },
  },
};

// Mock performance APIs for performance testing
global.performance = {
  ...global.performance,
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn().mockReturnValue([]),
  getEntriesByName: jest.fn().mockReturnValue([]),
  now: jest.fn().mockReturnValue(123.456),
};

// Mock DOM APIs for content script testing
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 0));
global.cancelAnimationFrame = jest.fn();

// Mock ResizeObserver for indicator testing
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Performance testing utilities
(global as any).testUtils = {
  measureExecutionTime: async (fn: () => Promise<any>) => {
    const start = performance.now();
    await fn();
    const end = performance.now();
    return end - start;
  },
  
  measureMemoryUsage: () => {
    // Mock memory measurement for testing
    return {
      used: Math.random() * 50 * 1024 * 1024, // Random MB usage
      total: 100 * 1024 * 1024, // 100MB total
    };
  },
};

// Clean up after each test
afterEach(() => {
  // Reset Chrome API mocks
  jest.clearAllMocks();
  
  // Clean up DOM
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  
  // Reset console to avoid noise
  jest.clearAllMocks();
});