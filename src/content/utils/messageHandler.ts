import { ExtensionMessage } from '@shared/types';

/**
 * Message handler for Chrome extension communication
 * Handles messaging between content script and background script
 */
export class MessageHandler {
  private messageListener: ((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => boolean | void) | null = null;
  private isListening = false;

  constructor(private handleMessage: (message: any) => void) {
    this.messageListener = this.handleIncomingMessage.bind(this);
  }

  /**
   * Start listening for messages
   */
  start(): void {
    if (this.isListening) {
      console.warn('MessageHandler is already listening');
      return;
    }

    try {
      chrome.runtime.onMessage.addListener(this.messageListener!);
      this.isListening = true;
      console.debug('MessageHandler started listening');
    } catch (error) {
      console.error('Failed to start MessageHandler:', error);
    }
  }

  /**
   * Stop listening for messages
   */
  stop(): void {
    if (!this.isListening) {
      return;
    }

    try {
      if (this.messageListener) {
        chrome.runtime.onMessage.removeListener(this.messageListener);
      }
      this.isListening = false;
      console.debug('MessageHandler stopped listening');
    } catch (error) {
      console.error('Failed to stop MessageHandler:', error);
    }
  }

  /**
   * Send message to background script
   */
  async sendMessage(message: ExtensionMessage): Promise<any> {
    try {
      const response = await chrome.runtime.sendMessage({
        ...message,
        timestamp: Date.now(),
      });
      return response;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Handle incoming messages
   */
  private handleIncomingMessage(
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): boolean | void {
    try {
      // Validate message format
      if (!message || typeof message !== 'object') {
        console.warn('Invalid message format received:', message);
        return;
      }

      // Add sender information for debugging
      const enrichedMessage = {
        ...message,
        sender: {
          tab: sender.tab?.id,
          frameId: sender.frameId,
          url: sender.url,
        },
      };

      // Call the handler
      this.handleMessage(enrichedMessage);

      // For synchronous responses, return true
      // For async responses, the handler should call sendResponse
      return false;
    } catch (error: unknown) {
      console.error('Error handling message:', error);
      sendResponse({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
      return true;
    }
  }

  /**
   * Get listening status
   */
  isActive(): boolean {
    return this.isListening;
  }
}
