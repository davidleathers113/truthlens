/**
 * Context menu handler for background script
 * Manages right-click context menu options
 */
export class ContextMenuHandler {
  /**
   * Initialize context menus
   */
  static initialize(): void {
    this.createContextMenus();
    chrome.contextMenus.onClicked.addListener(this.handleContextMenuClick);
    console.debug('Context menu handler initialized');
  }

  /**
   * Create context menu items
   */
  private static createContextMenus(): void {
    try {
      // Main context menu item
      chrome.contextMenus.create({
        id: 'truthlens-analyze',
        title: 'Analyze with TruthLens',
        contexts: ['page', 'selection'],
      });

      // Analyze selected text
      chrome.contextMenus.create({
        id: 'truthlens-analyze-selection',
        title: 'Check credibility of selected text',
        contexts: ['selection'],
        parentId: 'truthlens-analyze',
      });

      // Analyze current page
      chrome.contextMenus.create({
        id: 'truthlens-analyze-page',
        title: 'Analyze current page',
        contexts: ['page'],
        parentId: 'truthlens-analyze',
      });

      // Separator
      chrome.contextMenus.create({
        id: 'truthlens-separator',
        type: 'separator',
        contexts: ['page'],
        parentId: 'truthlens-analyze',
      });

      // Settings
      chrome.contextMenus.create({
        id: 'truthlens-settings',
        title: 'Open settings',
        contexts: ['page'],
        parentId: 'truthlens-analyze',
      });

    } catch (error) {
      console.error('Failed to create context menus:', error);
    }
  }

  /**
   * Handle context menu clicks
   */
  private static async handleContextMenuClick(
    info: chrome.contextMenus.OnClickData,
    tab?: chrome.tabs.Tab
  ): Promise<void> {
    if (!tab?.id) {
      console.error('No tab available for context menu action');
      return;
    }

    try {
      switch (info.menuItemId) {
        case 'truthlens-analyze-selection':
          await this.analyzeSelection(tab.id, info.selectionText);
          break;

        case 'truthlens-analyze-page':
          await this.analyzePage(tab.id);
          break;

        case 'truthlens-settings':
          await this.openSettings();
          break;

        default:
          console.warn('Unknown context menu item:', info.menuItemId);
      }
    } catch (error) {
      console.error('Error handling context menu click:', error);
    }
  }

  /**
   * Analyze selected text
   */
  private static async analyzeSelection(tabId: number, selectionText?: string): Promise<void> {
    if (!selectionText) {
      console.warn('No text selected for analysis');
      return;
    }

    try {
      await chrome.tabs.sendMessage(tabId, {
        type: 'ANALYZE_CONTENT',
        payload: {
          content: selectionText,
          type: 'selection',
        },
      });

      console.debug('Selection analysis requested:', selectionText.substring(0, 50) + '...');
    } catch (error) {
      console.error('Failed to analyze selection:', error);
    }
  }

  /**
   * Analyze current page
   */
  private static async analyzePage(tabId: number): Promise<void> {
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: 'ANALYZE_PAGE',
        payload: {},
      });

      console.debug('Page analysis requested for tab:', tabId);
    } catch (error) {
      console.error('Failed to analyze page:', error);
    }
  }

  /**
   * Open extension settings
   */
  private static async openSettings(): Promise<void> {
    try {
      await chrome.runtime.openOptionsPage();
    } catch (error) {
      console.error('Failed to open settings:', error);
    }
  }
}

/**
 * Exported setup function for background script
 */
export const setupContextMenus = ContextMenuHandler.initialize;
