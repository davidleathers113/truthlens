// Test helper utilities for TruthLens
// Provides common test setup and utility functions

import { jest } from '@jest/globals';

/**
 * Mock Chrome storage with proper Jest mock typing
 */
export const mockChromeStorage = () => {
  const mockStorage = {
    get: jest.fn().mockImplementation((keys?: any, callback?: any) => {
      if (typeof keys === 'function') {
        keys({});
        return;
      }
      if (callback) {
        callback({});
        return;
      }
      return Promise.resolve({});
    }),
    set: jest.fn().mockImplementation((_items: any, callback?: any) => {
      if (callback) callback();
      return Promise.resolve();
    }),
    remove: jest.fn().mockImplementation((_keys: any, callback?: any) => {
      if (callback) callback();
      return Promise.resolve();
    }),
    clear: jest.fn().mockImplementation((callback?: any) => {
      if (callback) callback();
      return Promise.resolve();
    }),
  };

  Object.assign(chrome.storage.sync, mockStorage);
  Object.assign(chrome.storage.local, mockStorage);

  return mockStorage;
};

/**
 * Mock Chrome runtime messaging
 */
export const mockChromeRuntime = () => {
  const mockRuntime = {
    sendMessage: jest.fn().mockImplementation((_message: any, callback?: any) => {
      if (callback) callback({});
      return Promise.resolve({});
    }),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      hasListener: jest.fn().mockReturnValue(false),
    },
  };

  Object.assign(chrome.runtime, mockRuntime);

  return mockRuntime;
};

/**
 * Create DOM element for testing
 */
export const createTestElement = (tag: string, attributes: Record<string, string> = {}): HTMLElement => {
  const element = document.createElement(tag);
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  return element;
};

/**
 * Wait for DOM mutations to complete
 */
export const waitForDOM = (timeout: number = 100): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, timeout));
};

/**
 * Mock intersection observer for indicator testing
 */
export const mockIntersectionObserver = () => {
  const mockObserver = {
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  };

  // @ts-expect-error - Mocking IntersectionObserver for tests
  global.IntersectionObserver = jest.fn().mockImplementation(() => mockObserver);

  return mockObserver;
};

/**
 * Setup complete test environment
 */
export const setupTestEnvironment = () => {
  const chromeStorage = mockChromeStorage();
  const chromeRuntime = mockChromeRuntime();
  const intersectionObserver = mockIntersectionObserver();

  return {
    chromeStorage,
    chromeRuntime,
    intersectionObserver,
    cleanup: () => {
      jest.clearAllMocks();
      document.body.innerHTML = '';
      document.head.innerHTML = '';
    },
  };
};

/**
 * Create a performance measurement wrapper
 */
export const measurePerformance = async <T>(
  name: string,
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> => {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  const duration = end - start;

  console.log(`Performance: ${name} took ${duration.toFixed(2)}ms`);

  return { result, duration };
};
