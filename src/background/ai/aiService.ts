// Chrome Built-in AI Service
// Integrates with Gemini Nano for local AI processing

import { CredibilityScore, ContentAnalysis, BiasAlertResult } from '@shared/types';
import { biasAssessmentService } from './biasAssessmentService';
import { domainReputationService } from '../services/domainReputationService';

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
      console.debug('AI availability:', availability);

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
        return await this.getFallbackAnalysis(content);
      }
    }

    try {
      const prompt = this.buildAnalysisPrompt(content);
      const response = await this.languageModel.prompt(prompt);
      const credibilityScore = await this.parseAIResponse(response);

      // 2025 Enhancement: Real-time bias monitoring
      await this.performBiasMonitoring(credibilityScore);

      return credibilityScore;
    } catch (error) {
      console.error('AI analysis failed:', error);
      return await this.getFallbackAnalysis(content);
    }
  }

  /**
   * 2025 Enhancement: Perform real-time bias monitoring on AI outputs
   */
  private async performBiasMonitoring(score: CredibilityScore): Promise<void> {
    try {
      const biasAlert = await biasAssessmentService.performRealTimeMonitoring(score);

      if (biasAlert.alertLevel === 'warning' || biasAlert.alertLevel === 'critical') {
        console.warn('Bias alert detected:', {
          level: biasAlert.alertLevel,
          message: biasAlert.message,
          driftScore: biasAlert.driftScore,
          recommendedActions: biasAlert.recommendedActions
        });

        // Store bias alert for reporting
        await this.storeBiasAlert(biasAlert);
      }
    } catch (error) {
      console.error('Bias monitoring failed:', error);
    }
  }

  /**
   * Store bias alert for compliance reporting
   */
  private async storeBiasAlert(alert: BiasAlertResult): Promise<void> {
    try {
      const alertKey = `bias_alert_${alert.timestamp}`;
      await chrome.storage.local.set({ [alertKey]: alert });

      // Update alert summary
      const summary = await chrome.storage.local.get('bias_alert_summary');
      const currentSummary = summary.bias_alert_summary || { totalAlerts: 0, lastAlert: 0 };

      await chrome.storage.local.set({
        bias_alert_summary: {
          totalAlerts: currentSummary.totalAlerts + 1,
          lastAlert: alert.timestamp,
          lastAlertLevel: alert.alertLevel
        }
      });
    } catch (error) {
      console.error('Failed to store bias alert:', error);
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

  private async parseAIResponse(response: string): Promise<CredibilityScore> {
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
      return await this.getFallbackAnalysis();
    }
  }

  private validateLevel(level: string): 'high' | 'medium' | 'low' | 'unknown' {
    const validLevels = ['high', 'medium', 'low', 'unknown'];
    return validLevels.includes(level) ? level as any : 'unknown';
  }

  private async getFallbackAnalysis(content?: ContentAnalysis): Promise<CredibilityScore> {
    // Advanced domain reputation analysis when AI is unavailable
    let score = 50;
    let level: 'high' | 'medium' | 'low' | 'unknown' = 'unknown';
    let reasoning = 'Basic domain analysis (AI unavailable)';
    let confidence = 0.5;

    if (content?.url) {
      try {
        // Use domain reputation service for accurate scoring
        const domainReputation = await domainReputationService.getDomainReputation(content.url);

        score = domainReputation.score;
        confidence = domainReputation.confidence;

        // Map score to level using 2025 standards
        if (score >= 80) {
          level = 'high';
        } else if (score >= 60) {
          level = 'medium';
        } else if (score >= 40) {
          level = 'low';
        } else {
          level = 'unknown';
        }

        // Enhanced reasoning with domain context
        reasoning = `Domain reputation analysis: ${domainReputation.domain} (${domainReputation.category})`;

        if (domainReputation.biasOrientation) {
          reasoning += ` with ${domainReputation.biasOrientation} bias orientation`;
        }

        reasoning += `. Source: ${domainReputation.source}`;

      } catch (error) {
        console.error('Domain reputation lookup failed:', error);

        // Fallback to basic pattern analysis
        const domain = new URL(content.url).hostname;
        const trustedPatterns = ['reuters.com', 'apnews.com', 'bbc.com', 'npr.org'];
        const untrustedPatterns = ['fake', 'hoax', 'conspiracy'];

        if (trustedPatterns.some(trusted => domain.includes(trusted))) {
          score = 85;
          level = 'high';
          reasoning = 'Trusted domain pattern match (fallback)';
        } else if (untrustedPatterns.some(pattern => domain.includes(pattern))) {
          score = 20;
          level = 'low';
          reasoning = 'Untrusted domain pattern detected (fallback)';
        }
      }
    }

    return {
      score,
      level,
      confidence,
      reasoning,
      source: 'domain-reputation',
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
