// TruthLens Service Worker (Background Script)
// Main entry point for extension background processes

import { initializeExtension } from './handlers/initialization';
import { setupMessageHandlers } from './handlers/messages';
import { setupTabHandlers } from './handlers/tabs';
import { setupContextMenus } from './handlers/contextMenus';
import { AIService } from './ai/aiService';
import { FactCheckingService } from './api/factCheckingService';
import { StorageService } from '@shared/storage/storageService';
import { analytics } from './analytics';

// Initialize services
const storage = new StorageService();
const aiService = new AIService();
const factCheckingService = new FactCheckingService();

// Export services for use in handlers
export { storage, aiService, factCheckingService, analytics };

// Initialize extension on install/update
chrome.runtime.onInstalled.addListener(async (details) => {
  console.debug('TruthLens extension installed/updated', details);

  try {
    // Initialize core extension
    await initializeExtension(details);

    // Initialize analytics system
    await analytics.initialize();

    // Track installation/update
    if (details.reason === 'install') {
      await analytics.trackEvent('extension_installed', {
        version: chrome.runtime.getManifest().version,
        installDate: Date.now()
      });

      // Start new user session
      await analytics.startSession();
    } else if (details.reason === 'update') {
      await analytics.trackEvent('extension_updated', {
        version: chrome.runtime.getManifest().version,
        previousVersion: details.previousVersion,
        updateDate: Date.now()
      });
    }

  } catch (error) {
    console.error('Failed to initialize extension:', error);
    await analytics.trackEvent('initialization_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      reason: details.reason
    });
  }
});

// Set up message handlers for communication with content scripts and popup
setupMessageHandlers();

// Set up tab event handlers
setupTabHandlers();

// Set up context menus
setupContextMenus();

// Handle extension icon clicks (if not using popup)
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    try {
      // Toggle extension on current tab
      const settings = await storage.getSettings();
      const newEnabled = !settings.enabled;
      await storage.updateSettings({ ...settings, enabled: newEnabled });

      // Track toggle action
      await analytics.trackEvent('extension_toggled', {
        enabled: newEnabled,
        tabUrl: tab.url ? new URL(tab.url).hostname : 'unknown'
      });

      // Notify content script
      chrome.tabs.sendMessage(tab.id, {
        type: 'TOGGLE_EXTENSION',
        payload: { enabled: newEnabled }
      });

    } catch (error) {
      console.error('Failed to toggle extension:', error);
      await analytics.trackEvent('toggle_error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

// Keep service worker alive (Manifest V3 consideration)
chrome.alarms.create('keepAlive', { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'keepAlive') {
    // Perform any necessary background tasks
    console.debug('Service worker keep-alive ping');

    // Track service worker activity for performance monitoring
    await analytics.trackEvent('service_worker_ping', {
      timestamp: Date.now(),
      memoryUsage: (performance as any).memory?.usedJSHeapSize || 0
    });
  }
});

// Set up error tracking
self.addEventListener('error', async (event) => {
  await analytics.trackEvent('service_worker_error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    timestamp: Date.now()
  });
});

// Set up unhandled promise rejection tracking
self.addEventListener('unhandledrejection', async (event) => {
  await analytics.trackEvent('unhandled_promise_rejection', {
    reason: event.reason?.toString() || 'Unknown reason',
    timestamp: Date.now()
  });
});

// Initialize analytics system on startup
analytics.initialize().catch(error => {
  console.error('Failed to initialize analytics system:', error);
});

console.debug('TruthLens service worker initialized');
