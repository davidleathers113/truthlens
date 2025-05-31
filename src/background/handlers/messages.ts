import { ExtensionMessage } from '@shared/types';

/**
 * Message handler for background script
 * Handles communication between different parts of the extension
 */
export class MessageHandler {
  /**
   * Initialize message handling
   */
  static initialize(): void {
    chrome.runtime.onMessage.addListener(this.handleMessage);
    console.log('Message handler initialized');
  }

  /**
   * Handle incoming messages
   */
  private static handleMessage(
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): boolean {
    console.debug('Received message:', message.type, sender.tab?.id);

    try {
      switch (message.type) {
        case 'ANALYZE_PAGE':
          this.handleAnalyzePage(message, sender, sendResponse);
          break;
          
        case 'ANALYZE_CONTENT':
          this.handleAnalyzeContent(message, sender, sendResponse);
          break;
          
        case 'GET_CREDIBILITY':
          this.handleGetCredibility(message, sender, sendResponse);
          break;
          
        case 'UPDATE_SETTINGS':
          this.handleUpdateSettings(message, sender, sendResponse);
          break;
          
        case 'CLEAR_CACHE':
          this.handleClearCache(message, sender, sendResponse);
          break;
          
        default:
          console.warn('Unknown message type:', message.type);
          sendResponse({ error: 'Unknown message type' });
          return false;
      }
      
      return true; // Keep message channel open for async response
    } catch (error: unknown) {
      console.error('Error handling message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      sendResponse({ error: errorMessage });
      return false;
    }
  }

  /**
   * Handle page analysis request
   */
  private static async handleAnalyzePage(
    _message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      // This would integrate with AI service
      console.log('Analyzing page:', sender.tab?.url);
      
      sendResponse({
        success: true,
        message: 'Page analysis started',
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      sendResponse({ error: errorMessage });
    }
  }

  /**
   * Handle content analysis request
   */
  private static async handleAnalyzeContent(
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      const content = message.payload;
      console.log('Analyzing content:', content?.title);
      
      // This would integrate with AI service for credibility analysis
      const mockCredibility = {
        score: 75,
        level: 'medium' as const,
        confidence: 0.8,
        reasoning: 'Mock analysis for development',
        source: 'ai' as const,
        timestamp: Date.now(),
      };

      sendResponse({
        success: true,
        credibility: mockCredibility,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      sendResponse({ error: errorMessage });
    }
  }

  /**
   * Handle get credibility request
   */
  private static async handleGetCredibility(
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      const url = message.payload?.url || sender.tab?.url;
      console.log('Getting credibility for:', url);
      
      sendResponse({
        success: true,
        credibility: null, // Would fetch from cache or API
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      sendResponse({ error: errorMessage });
    }
  }

  /**
   * Handle settings update
   */
  private static async handleUpdateSettings(
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      const settings = message.payload;
      await chrome.storage.sync.set({ settings });
      
      // Notify all tabs about settings update
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'SETTINGS_UPDATED',
            payload: settings,
          }).catch(() => {
            // Tab might not have content script, ignore error
          });
        }
      }
      
      sendResponse({ success: true });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      sendResponse({ error: errorMessage });
    }
  }

  /**
   * Handle cache clear request
   */
  private static async handleClearCache(
    _message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      await chrome.storage.local.clear();
      console.log('Cache cleared');
      
      sendResponse({ success: true });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      sendResponse({ error: errorMessage });
    }
  }
}

/**
 * Exported setup function for background script
 */
export const setupMessageHandlers = MessageHandler.initialize;