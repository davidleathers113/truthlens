// Chrome Built-in AI API Types (Gemini Nano)
// Based on Chrome 138+ specifications

declare global {
  interface Window {
    ai?: ChromeAI;
  }
  
  interface ChromeAI {
    assistant: AIAssistant;
    languageModel: AILanguageModel;
    summarizer: AISummarizer;
    writer: AIWriter;
    rewriter: AIRewriter;
    translator: AITranslator;
    languageDetector: AILanguageDetector;
  }
  
  interface AILanguageModel {
    availability(): Promise<AIAvailability>;
    create(options?: AILanguageModelOptions): Promise<AILanguageModelSession>;
  }
  
  interface AILanguageModelOptions {
    systemPrompt?: string;
    temperature?: number;
    topK?: number;
  }
  
  interface AILanguageModelSession {
    prompt(input: string): Promise<string>;
    promptStreaming(input: string): AsyncIterable<string>;
    destroy(): void;
  }
  
  interface AISummarizer {
    availability(): Promise<AIAvailability>;
    create(options?: AISummarizerOptions): Promise<AISummarizerSession>;
  }
  
  interface AISummarizerOptions {
    type?: 'key-points' | 'tl;dr' | 'teaser' | 'headline';
    format?: 'plain-text' | 'markdown';
    length?: 'short' | 'medium' | 'long';
  }
  
  interface AISummarizerSession {
    summarize(text: string): Promise<string>;
    summarizeStreaming(text: string): AsyncIterable<string>;
    destroy(): void;
  }
  
  type AIAvailability = 'no' | 'readily' | 'after-download';
}

export {};
