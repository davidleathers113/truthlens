// Jest setup file for TruthLens Chrome extension testing
// Configures Chrome API mocks and testing environment

import { jest } from '@jest/globals';
import 'jest-webextension-mock';
import '@testing-library/jest-dom';

// Additional Chrome API mocks that might be missing from jest-webextension-mock
if (!global.chrome.alarms) {
  global.chrome.alarms = {
    create: jest.fn(),
    get: jest.fn(),
    getAll: jest.fn(),
    clear: jest.fn(),
    clearAll: jest.fn(),
    onAlarm: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      hasListener: jest.fn(),
    },
  } as any;
}

// Mock chrome.runtime.getManifest if not already mocked
if (!global.chrome.runtime.getManifest) {
  global.chrome.runtime.getManifest = jest.fn(() => ({
    version: '1.0.0',
    manifest_version: 3 as const,
    name: 'TruthLens',
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'none';"
    }
  })) as any;
}

// Mock navigator.userAgent if not present
if (!global.navigator.userAgent) {
  Object.defineProperty(global.navigator, 'userAgent', {
    value: 'Mozilla/5.0 (Chrome Extension Test) Chrome/120.0.0.0',
    configurable: true,
  });
}

// Mock chrome.storage.local if not already mocked
if (!global.chrome.storage || !global.chrome.storage.local) {
  if (!global.chrome.storage) {
    global.chrome.storage = {} as any;
  }
  global.chrome.storage.local = {
    get: jest.fn().mockImplementation((_keys) => Promise.resolve({})),
    set: jest.fn().mockImplementation((_items) => Promise.resolve()),
    remove: jest.fn().mockImplementation((_keys) => Promise.resolve()),
    clear: jest.fn().mockImplementation(() => Promise.resolve()),
    getBytesInUse: jest.fn().mockImplementation((_keys) => Promise.resolve(0)),
  } as any;
}

// Global Chrome AI API mock for Chrome Built-in AI testing
const mockAILanguageModel = {
  availability: jest.fn<() => Promise<string>>().mockResolvedValue('readily'),
  create: jest.fn<() => Promise<any>>().mockResolvedValue({
    prompt: jest.fn<() => Promise<string>>().mockResolvedValue('{"score":75,"level":"medium","confidence":0.8,"reasoning":"Test analysis"}'),
    destroy: jest.fn<() => void>(),
  }),
};

const mockAISummarizer = {
  availability: jest.fn<() => Promise<string>>().mockResolvedValue('readily'),
  create: jest.fn<() => Promise<any>>().mockResolvedValue({
    summarize: jest.fn<() => Promise<string>>().mockResolvedValue('Test summary content'),
    destroy: jest.fn<() => void>(),
  }),
};

// Mock Chrome Built-in AI APIs with complete interface
const mockChromeAI = {
  languageModel: mockAILanguageModel,
  summarizer: mockAISummarizer,
  assistant: {
    availability: jest.fn<() => Promise<string>>().mockResolvedValue('no'),
    create: jest.fn<() => Promise<any>>(),
  },
  writer: {
    availability: jest.fn<() => Promise<string>>().mockResolvedValue('no'),
    create: jest.fn<() => Promise<any>>(),
  },
  rewriter: {
    availability: jest.fn<() => Promise<string>>().mockResolvedValue('no'),
    create: jest.fn<() => Promise<any>>(),
  },
  translator: {
    availability: jest.fn<() => Promise<string>>().mockResolvedValue('no'),
    create: jest.fn<() => Promise<any>>(),
  },
  languageDetector: {
    availability: jest.fn<() => Promise<string>>().mockResolvedValue('no'),
    create: jest.fn<() => Promise<any>>(),
  },
} as any;

(global.window as any) = {
  ...global.window,
  ai: mockChromeAI,
};

// Mock performance APIs for performance testing
Object.defineProperty(global.performance, 'mark', {
  value: jest.fn(),
  writable: true
});
Object.defineProperty(global.performance, 'measure', {
  value: jest.fn(),
  writable: true
});
Object.defineProperty(global.performance, 'getEntriesByType', {
  value: jest.fn(() => []),
  writable: true
});
Object.defineProperty(global.performance, 'getEntriesByName', {
  value: jest.fn(() => []),
  writable: true
});
Object.defineProperty(global.performance, 'now', {
  value: jest.fn(() => 123.456),
  writable: true
});

// Mock DOM APIs for content script testing
global.requestAnimationFrame = jest.fn((cb: any) => setTimeout(cb, 0)) as any;
global.cancelAnimationFrame = jest.fn() as any;

// Fix JSDOM document.addEventListener issue
if (typeof document !== 'undefined') {
  if (!document.addEventListener) {
    document.addEventListener = jest.fn();
    document.removeEventListener = jest.fn();
  }

  // Also ensure window.document is properly set
  if (typeof window !== 'undefined' && window.document !== document) {
    Object.defineProperty(window, 'document', {
      value: document,
      writable: true,
      configurable: true
    });
  }
}

// Mock ResizeObserver for indicator testing
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
})) as any;

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
