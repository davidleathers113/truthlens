/**
 * Article Parser Service
 * Manages offscreen document for heavy article processing
 * Prevents blocking the main extension thread during content extraction
 */

interface ArticleParseOptions {
  stripStyles?: boolean;
  extractMetadata?: boolean;
  maxContentLength?: number;
}

interface ParsedArticle {
  title: string;
  content: string;
  textContent: string;
  length: number;
  excerpt: string;
  byline: string | null;
  dir: string | null;
  siteName: string | null;
  lang: string | null;
  publishedTime: string | null;
  [key: string]: any; // Additional metadata
}

interface OffscreenResponse {
  id: string;
  success: boolean;
  article?: ParsedArticle;
  result?: any;
  error?: string;
}

export class ArticleParser {
  private static instance: ArticleParser;
  private pendingRequests: Map<string, { resolve: Function; reject: Function }> = new Map();
  private offscreenCreated = false;

  private constructor() {}

  static getInstance(): ArticleParser {
    if (!ArticleParser.instance) {
      ArticleParser.instance = new ArticleParser();
    }
    return ArticleParser.instance;
  }

  /**
   * Ensure offscreen document is created
   */
  private async ensureOffscreenDocument(): Promise<void> {
    if (this.offscreenCreated) {
      // Check if document still exists
      try {
        const hasDocument = await chrome.offscreen.hasDocument();
        if (hasDocument) {
          return;
        }
      } catch (error) {
        console.warn('Failed to check offscreen document status:', error);
      }
    }

    try {
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: [chrome.offscreen.Reason.DOM_PARSER],
        justification: 'Parse article content and perform heavy text analysis without blocking the UI'
      });
      this.offscreenCreated = true;

      // Set up message listener for responses
      chrome.runtime.onMessage.addListener(this.handleOffscreenMessage.bind(this));
    } catch (error) {
      // Document might already exist
      if (error instanceof Error && error.message.includes('already exists')) {
        this.offscreenCreated = true;
      } else {
        throw error;
      }
    }
  }

  /**
   * Handle messages from offscreen document
   */
  private handleOffscreenMessage(message: OffscreenResponse): void {
    if (!message.id || !this.pendingRequests.has(message.id)) {
      return;
    }

    const { resolve, reject } = this.pendingRequests.get(message.id)!;
    this.pendingRequests.delete(message.id);

    if (message.success) {
      resolve(message.article || message.result);
    } else {
      reject(new Error(message.error || 'Unknown error'));
    }
  }

  /**
   * Send message to offscreen document and wait for response
   */
  private async sendToOffscreen(action: string, data: any): Promise<any> {
    await this.ensureOffscreenDocument();

    const id = `${action}-${Date.now()}-${Math.random()}`;

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      // Set timeout
      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Offscreen operation timed out'));
        }
      }, 30000); // 30 second timeout

      // Send message
      chrome.runtime.sendMessage({
        target: 'offscreen',
        action,
        data,
        id
      }).catch(error => {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        reject(error);
      });

      // Clear timeout on success
      const originalResolve = resolve;
      resolve = (value: any) => {
        clearTimeout(timeout);
        originalResolve(value);
      };
    });
  }

  /**
   * Parse article content using offscreen document
   */
  async parseArticle(
    htmlContent: string,
    documentUrl: string,
    options?: ArticleParseOptions
  ): Promise<ParsedArticle> {
    if (!htmlContent || !documentUrl) {
      throw new Error('HTML content and document URL are required');
    }

    try {
      const result = await this.sendToOffscreen('parse-article', {
        htmlContent,
        documentUrl,
        options
      });

      return result;
    } catch (error) {
      console.error('Failed to parse article:', error);
      throw error;
    }
  }

  /**
   * Analyze content sentiment
   */
  async analyzeSentiment(content: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral';
    score: number;
    positiveCount: number;
    negativeCount: number;
  }> {
    if (!content || content.trim().length === 0) {
      throw new Error('Content is required for sentiment analysis');
    }

    try {
      const result = await this.sendToOffscreen('analyze-content', {
        content,
        analysisType: 'sentiment'
      });

      return result;
    } catch (error) {
      console.error('Failed to analyze sentiment:', error);
      throw error;
    }
  }

  /**
   * Analyze clickbait characteristics
   */
  async analyzeClickbait(content: string): Promise<{
    isClickbait: boolean;
    score: number;
    foundPhrases: string[];
    capsRatio: number;
    exclamationCount: number;
    questionCount: number;
  }> {
    if (!content || content.trim().length === 0) {
      throw new Error('Content is required for clickbait analysis');
    }

    try {
      const result = await this.sendToOffscreen('analyze-content', {
        content,
        analysisType: 'clickbait'
      });

      return result;
    } catch (error) {
      console.error('Failed to analyze clickbait:', error);
      throw error;
    }
  }

  /**
   * Analyze text complexity
   */
  async analyzeComplexity(content: string): Promise<{
    avgSentenceLength: number;
    avgSyllablesPerWord: number;
    fleschScore: number;
    readingLevel: string;
    wordCount: number;
    sentenceCount: number;
  }> {
    if (!content || content.trim().length === 0) {
      throw new Error('Content is required for complexity analysis');
    }

    try {
      const result = await this.sendToOffscreen('analyze-content', {
        content,
        analysisType: 'complexity'
      });

      return result;
    } catch (error) {
      console.error('Failed to analyze complexity:', error);
      throw error;
    }
  }

  /**
   * Close offscreen document when no longer needed
   */
  async close(): Promise<void> {
    try {
      if (this.offscreenCreated) {
        await chrome.offscreen.closeDocument();
        this.offscreenCreated = false;
      }
    } catch (error) {
      console.warn('Failed to close offscreen document:', error);
    }
  }
}

// Export singleton instance
export const articleParser = ArticleParser.getInstance();
