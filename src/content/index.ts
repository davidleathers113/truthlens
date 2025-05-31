// TruthLens Content Script
// Runs on web pages to analyze content and display credibility indicators

import { ContentExtractor } from './extractors/contentExtractor';
import { IndicatorManager } from './indicators/indicatorManager';
// Import enhanced manager for modern features
import { EnhancedIndicatorManager } from './indicators/enhanced-indicator-manager';
import { PlatformAnalyzer } from './analyzers/platformAnalyzer';
import { MessageHandler } from './utils/messageHandler';
import { ContentAnalysis } from '@shared/types';

class TruthLensContent {
  private extractor: ContentExtractor;
  private indicatorManager: IndicatorManager;
  private platformAnalyzer: PlatformAnalyzer;
  private messageHandler: MessageHandler;
  private observer: MutationObserver | null = null;
  private isEnabled = true;

  constructor() {
    this.extractor = new ContentExtractor();
    this.indicatorManager = new IndicatorManager();
    this.platformAnalyzer = new PlatformAnalyzer();
    this.messageHandler = new MessageHandler(this.handleMessage.bind(this));
  }

  async initialize(): Promise<void> {
    console.log('TruthLens content script initializing...');

    // Check if extension is enabled
    const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    this.isEnabled = response?.enabled ?? true;

    if (this.isEnabled) {
      await this.analyzeCurrentPage();
      this.setupContentObserver();
    }

    // Listen for messages from background script
    this.messageHandler.start();
  }

  private async analyzeCurrentPage(): Promise<void> {
    try {
      // Extract content from the page
      const content = await this.extractor.extractPageContent();
      
      // Check if it's a supported social media platform
      const platformData = this.platformAnalyzer.analyzePlatform();
      
      if (platformData) {
        content.platform = platformData.platform;
        content.type = 'social-post';
        
        // Extract platform-specific content
        const socialContent = await this.platformAnalyzer.extractContent();
        if (socialContent.length > 0) {
          // Analyze each piece of content
          for (const item of socialContent) {
            await this.analyzeContent(item);
          }
        }
      } else {
        // Regular web page analysis
        await this.analyzeContent(content);
      }
    } catch (error) {
      console.error('Page analysis failed:', error);
    }
  }

  private async analyzeContent(content: ContentAnalysis): Promise<void> {
    // Send content to background script for analysis
    const response = await chrome.runtime.sendMessage({
      type: 'ANALYZE_CONTENT',
      payload: content,
    });

    if (response?.credibility) {
      // Display credibility indicator
      this.indicatorManager.showIndicator(content, response.credibility);
    }
  }

  private setupContentObserver(): void {
    // Watch for dynamic content changes
    this.observer = new MutationObserver((mutations) => {
      // Debounce to avoid excessive processing
      this.handleContentChanges(mutations);
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false,
    });
  }

  private handleContentChanges = (() => {
    let timeout: NodeJS.Timeout;
    return (mutations: MutationRecord[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        // Check if significant content was added
        const hasSignificantChanges = mutations.some((mutation) => {
          return mutation.addedNodes.length > 0 && 
                 Array.from(mutation.addedNodes).some((node) => {
                   return node.nodeType === Node.ELEMENT_NODE &&
                          (node as Element).querySelector('article, .post, .tweet, [role="article"]');
                 });
        });

        if (hasSignificantChanges) {
          this.analyzeCurrentPage();
        }
      }, 1000); // 1 second debounce
    };
  })();

  private handleMessage(message: any): void {
    switch (message.type) {
      case 'TOGGLE_EXTENSION':
        this.isEnabled = message.payload.enabled;
        if (this.isEnabled) {
          this.analyzeCurrentPage();
        } else {
          this.indicatorManager.hideAllIndicators();
        }
        break;
      
      case 'CREDIBILITY_UPDATE':
        // Handle credibility updates from background
        if (message.payload) {
          this.indicatorManager.updateIndicator(message.payload);
        }
        break;
        
      case 'CLEAR_INDICATORS':
        this.indicatorManager.hideAllIndicators();
        break;
    }
  }

  cleanup(): void {
    this.observer?.disconnect();
    this.messageHandler.stop();
    this.indicatorManager.cleanup();
  }
}

// Initialize content script
const truthLens = new TruthLensContent();
truthLens.initialize();

// Cleanup on page unload
window.addEventListener('unload', () => {
  truthLens.cleanup();
});
