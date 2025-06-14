// Mock setup that needs to run before any modules are imported
import { jest } from '@jest/globals';

// Mock logger before any modules are imported
jest.mock('../src/shared/services/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    performance: jest.fn(),
    security: jest.fn(),
  },
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    performance: jest.fn(),
    security: jest.fn(),
  })),
  initializeLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    performance: jest.fn(),
    security: jest.fn(),
  })),
  default: jest.fn(),
}));

// Mock storageService before modules are imported
jest.mock('../src/shared/storage/storageService', () => ({
  storageService: {
    get: jest.fn(() => Promise.resolve(null)),
    set: jest.fn(() => Promise.resolve()),
    remove: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    getConsentData: jest.fn(() => Promise.resolve({ analyticsConsent: false })),
    setConsentData: jest.fn(() => Promise.resolve()),
    getUserId: jest.fn(() => Promise.resolve('test-user-id')),
    getOptions: jest.fn(() => Promise.resolve({})),
    setOptions: jest.fn(() => Promise.resolve()),
  },
}));

// Mock securityService before modules are imported
jest.mock('../src/shared/services/securityService', () => ({
  securityService: {
    encryptData: jest.fn(() => Promise.resolve('encrypted-data')),
    decryptData: jest.fn(() => Promise.resolve({})),
    validatePermissions: jest.fn(() => Promise.resolve(true)),
    reportSecurityEvent: jest.fn(() => Promise.resolve()),
  },
}));
