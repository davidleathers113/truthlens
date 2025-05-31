// Chrome Built-in AI Service
// Integrates with Gemini Nano for local AI processing

import { CredibilityScore, ContentAnalysis } from '@shared/types';

export class AIService {
  private languageModel: AILanguageModelSession | null = null;
  private summarizer: AISummarizerSession | null = null;
  private isInitialized = false;

  async initialize(): Promise<boolean> {
    try {
      // Check if Chrome AI APIs are available
      if (!window.ai?.languageModel) {
        console.warn('Chrome Built-in AI APIs not available');
        return false;
      }

      // Check availability
      const availability = await window.ai.languageModel.availability();
      console.log('AI availability:', availability);

      if (availability === 'no') {
        return false;
      }

      // Create language model session
      this.languageModel = await window.ai.languageModel.create({
        systemPrompt: this.getSystemPrompt(),
        temperature: 0.7,
        topK: 40,
      });

      // Initialize summarizer
      if (window.ai?.summarizer) {
        const summarizerAvailability = await window.ai.summarizer.availability();
        if (summarizerAvailability !== 'no') {
          this.summarizer = await window.ai.summarizer.create({
            type: 'key-points',
            format: 'plain-text',
            length: 'medium',
          });
        }
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize AI service:', error);
      return false;
    }
  }

  private getSystemPrompt(): string {
    return `You are TruthLens, an AI assistant that helps verify content credibility.
Your role is to analyze text content and provide credibility assessments based on:
1. Source reliability indicators
2. Content consistency
3. Factual accuracy signals
4. Bias detection

Always provide responses in JSON format with:
- score (0-100): credibility score
- level (high/medium/low): credibility level
- reasoning: brief explanation
- biasIndicators: array of detected bias markers

Be concise, accurate, and focus on verifiable signals.`;
  }

  async analyzeContent(content: ContentAnalysis): Promise<CredibilityScore> {
    if (!this.isInitialized || !this.languageModel) {
      await this.initialize();
      if (!this.languageModel) {
        return this.getFallbackAnalysis(content);
      }
    }

    try {
      const prompt = this.buildAnalysisPrompt(content);
      const response = await this.languageModel.prompt(prompt);
      return this.parseAIResponse(response);
    } catch (error) {
      console.error('AI analysis failed:', error);
      return this.getFallbackAnalysis(content);
    }
  }

  private buildAnalysisPrompt(content: ContentAnalysis): string {
    return `Analyze this content for credibility:

Title: ${content.title || 'N/A'}
URL: ${content.url}
Domain: ${new URL(content.url).hostname}
Type: ${content.type}
Platform: ${content.platform || 'web'}
Content excerpt: ${content.content?.substring(0, 500) || 'N/A'}

Provide credibility assessment in JSON format.`;
  }

  private parseAIResponse(response: string): CredibilityScore {
    try {
      const parsed = JSON.parse(response);
      return {
        score: Math.max(0, Math.min(100, parsed.score || 50)),
        level: this.validateLevel(parsed.level),
        confidence: parsed.confidence || 0.7,
        reasoning: parsed.reasoning || 'AI analysis completed',
        source: 'ai',
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return this.getFallbackAnalysis();
    }
  }

  private validateLevel(level: string): 'high' | 'medium' | 'low' | 'unknown' {
    const validLevels = ['high', 'medium', 'low', 'unknown'];
    return validLevels.includes(level) ? level as any : 'unknown';
  }

  private getFallbackAnalysis(content?: ContentAnalysis): CredibilityScore {
    // Basic heuristic analysis when AI is unavailable
    let score = 50;
    let level: 'high' | 'medium' | 'low' | 'unknown' = 'unknown';

    if (content?.url) {
      const domain = new URL(content.url).hostname;
      
      // Simple domain-based heuristics
      const trustedDomains = ['reuters.com', 'apnews.com', 'bbc.com', 'npr.org'];
      const untrustedPatterns = ['fake', 'hoax', 'conspiracy'];
      
      if (trustedDomains.some(trusted => domain.includes(trusted))) {
        score = 85;
        level = 'high';
      } else if (untrustedPatterns.some(pattern => domain.includes(pattern))) {
        score = 20;
        level = 'low';
      }
    }

    return {
      score,
      level,
      confidence: 0.5,
      reasoning: 'Basic domain analysis (AI unavailable)',
      source: 'fallback',
      timestamp: Date.now(),
    };
  }

  async summarizeContent(text: string): Promise<string | null> {
    if (!this.summarizer) {
      return null;
    }

    try {
      return await this.summarizer.summarize(text);
    } catch (error) {
      console.error('Summarization failed:', error);
      return null;
    }
  }

  destroy(): void {
    this.languageModel?.destroy();
    this.summarizer?.destroy();
    this.languageModel = null;
    this.summarizer = null;
    this.isInitialized = false;
  }
}
