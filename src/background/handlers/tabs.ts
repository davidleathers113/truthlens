/**
 * Tab handler for background script
 * Manages tab-related events and state
 */
export class TabHandler {
  private static activeAnalyses = new Map<number, boolean>();

  /**
   * Initialize tab handling
   */
  static initialize(): void {
    chrome.tabs.onUpdated.addListener(this.handleTabUpdated);
    chrome.tabs.onRemoved.addListener(this.handleTabRemoved);
    chrome.tabs.onActivated.addListener(this.handleTabActivated);
    console.log('Tab handler initialized');
  }

  /**
   * Handle tab updates
   */
  private static handleTabUpdated(
    tabId: number,
    changeInfo: chrome.tabs.TabChangeInfo,
    tab: chrome.tabs.Tab
  ): void {
    // Only process when page is completely loaded
    if (changeInfo.status === 'complete' && tab.url) {
      console.debug('Tab updated:', tabId, tab.url);
      this.processTab(tabId, tab);
    }
  }

  /**
   * Handle tab removal
   */
  private static handleTabRemoved(tabId: number): void {
    console.debug('Tab removed:', tabId);
    this.activeAnalyses.delete(tabId);
  }

  /**
   * Handle tab activation
   */
  private static handleTabActivated(activeInfo: chrome.tabs.TabActiveInfo): void {
    console.debug('Tab activated:', activeInfo.tabId);
    // Could update extension badge or UI based on active tab
  }

  /**
   * Process a tab for content analysis
   */
  private static async processTab(tabId: number, tab: chrome.tabs.Tab): Promise<void> {
    try {
      if (!tab.url || !this.shouldAnalyzeUrl(tab.url)) {
        return;
      }

      // Check if already analyzing this tab
      if (this.activeAnalyses.get(tabId)) {
        return;
      }

      // Check if user has auto-analyze enabled
      const result = await chrome.storage.sync.get(['settings']);
      const settings = result.settings;
      
      if (!settings?.enabled || !settings?.autoAnalyze) {
        return;
      }

      this.activeAnalyses.set(tabId, true);

      // Inject content script if not already present
      await this.ensureContentScript(tabId);

      // Send analysis request to content script
      await chrome.tabs.sendMessage(tabId, {
        type: 'ANALYZE_PAGE',
        payload: { url: tab.url },
      });

    } catch (error) {
      console.error('Error processing tab:', error);
      this.activeAnalyses.delete(tabId);
    }
  }

  /**
   * Check if URL should be analyzed
   */
  private static shouldAnalyzeUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      
      // Skip chrome:// and extension pages
      if (parsedUrl.protocol === 'chrome:' || parsedUrl.protocol === 'chrome-extension:') {
        return false;
      }

      // Skip local files
      if (parsedUrl.protocol === 'file:') {
        return false;
      }

      // Only analyze http and https
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
      
    } catch (error) {
      console.warn('Invalid URL:', url);
      return false;
    }
  }

  /**
   * Ensure content script is injected
   */
  private static async ensureContentScript(tabId: number): Promise<void> {
    try {
      // Try to ping the content script
      await chrome.tabs.sendMessage(tabId, { type: 'PING' });
    } catch (error) {
      // Content script not present, inject it
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content.js'],
        });
        console.debug('Content script injected into tab:', tabId);
      } catch (injectionError) {
        console.error('Failed to inject content script:', injectionError);
      }
    }
  }

  /**
   * Get active analysis status for a tab
   */
  static isAnalyzing(tabId: number): boolean {
    return this.activeAnalyses.get(tabId) || false;
  }

  /**
   * Mark tab analysis as complete
   */
  static markAnalysisComplete(tabId: number): void {
    this.activeAnalyses.delete(tabId);
  }
}

/**
 * Exported setup function for background script
 */
export const setupTabHandlers = TabHandler.initialize;