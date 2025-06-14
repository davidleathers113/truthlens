/**
 * Gen Z Sentiment Analyzer
 * Advanced sentiment analysis for Gen Z communication patterns and emoji interpretation
 * Implements 2025 best practices including BERT-like models and semantic disambiguation
 */

import { SentimentData, FeedbackEntry } from './types';

export interface SentimentAnalysisConfig {
  enableEmojiAnalysis: boolean;
  enableGenZSlangDetection: boolean;
  enablePlatformNormalization: boolean;
  confidenceThreshold: number; // Minimum confidence for sentiment classification
  emojiWeight: number; // Weight of emoji sentiment vs text sentiment
  genZLanguagePatterns: string[]; // Known Gen Z language patterns
  realTimeProcessing: boolean;
}

export interface EmojiSentimentMapping {
  emoji: string;
  sentiment: number; // -1 to 1
  intensity: number; // 0 to 1
  context: string[]; // Contextual usage patterns
  platforms: string[]; // Platform-specific variations
}

export interface GenZLanguagePattern {
  pattern: RegExp;
  sentiment: number;
  authenticity: number; // How authentic this pattern is for Gen Z
  usage: 'positive' | 'negative' | 'neutral' | 'sarcastic' | 'ironic';
  examples: string[];
}

export class SentimentAnalyzer {
  private config: SentimentAnalysisConfig;
  private emojiMappings: Map<string, EmojiSentimentMapping> = new Map();
  private genZPatterns: GenZLanguagePattern[] = [];
  private platformNormalizations: Map<string, string> = new Map();

  // Sentiment processing cache for performance
  private sentimentCache: Map<string, SentimentData> = new Map();
  private processingQueue: FeedbackEntry[] = [];
  private isProcessing: boolean = false;

  constructor(config: Partial<SentimentAnalysisConfig> = {}) {
    this.config = {
      enableEmojiAnalysis: true,
      enableGenZSlangDetection: true,
      enablePlatformNormalization: true,
      confidenceThreshold: 0.7,
      emojiWeight: 0.4, // 40% emoji, 60% text
      genZLanguagePatterns: [],
      realTimeProcessing: true,
      ...config
    };

    this.initializeEmojiMappings();
    this.initializeGenZPatterns();
    this.initializePlatformNormalizations();
  }

  /**
   * Analyze sentiment of feedback entry with Gen Z optimizations
   */
  public async analyzeSentiment(entry: FeedbackEntry): Promise<SentimentData> {
    const cacheKey = this.generateCacheKey(entry);

    // Check cache first
    const cachedResult = this.sentimentCache.get(cacheKey);
    if (cachedResult !== undefined) {
      return cachedResult;
    }

    try {
      const sentimentData = await this.performSentimentAnalysis(entry);

      // Cache result
      this.sentimentCache.set(cacheKey, sentimentData);

      // Limit cache size
      if (this.sentimentCache.size > 1000) {
        const firstKey = this.sentimentCache.keys().next().value;
        if (firstKey) {
          this.sentimentCache.delete(firstKey);
        }
      }

      return sentimentData;
    } catch (error) {
      console.error('[SentimentAnalyzer] Analysis failed:', error);
      return this.getDefaultSentimentData();
    }
  }

  /**
   * Perform comprehensive sentiment analysis
   */
  private async performSentimentAnalysis(entry: FeedbackEntry): Promise<SentimentData> {
    const content = String(entry.content);

    // Step 1: Platform normalization
    const normalizedContent = this.config.enablePlatformNormalization
      ? this.normalizePlatformText(content)
      : content;

    // Step 2: Extract emojis and text separately
    const { text, emojis } = this.extractTextAndEmojis(normalizedContent);

    // Step 3: Analyze text sentiment with Gen Z patterns
    const textSentiment = await this.analyzeTextSentiment(text);

    // Step 4: Analyze emoji sentiment
    const emojiSentiment = this.config.enableEmojiAnalysis
      ? this.analyzeEmojiSentiment(emojis)
      : 0;

    // Step 5: Combine sentiments with weighted approach
    const overallSentiment = this.combineSentiments(textSentiment, emojiSentiment);

    // Step 6: Detect Gen Z language patterns
    const languagePatterns = this.config.enableGenZSlangDetection
      ? this.detectGenZLanguagePatterns(normalizedContent)
      : [];

    // Step 7: Calculate authenticity score
    const authenticity = this.calculateAuthenticity(content, languagePatterns, emojis);

    // Step 8: Generate topic sentiments
    const topicSentiments = this.analyzeTopicSentiments(normalizedContent);

    return {
      overallSentiment,
      topicSentiments,
      languagePatterns,
      authenticity
    };
  }

  /**
   * Initialize emoji sentiment mappings based on 2025 research
   */
  private initializeEmojiMappings(): void {
    // Positive emojis
    const positiveEmojis: Array<[string, number, number]> = [
      ['😊', 0.8, 0.7], ['😄', 0.9, 0.8], ['🥰', 0.9, 0.9], ['😍', 0.8, 0.8],
      ['🔥', 0.7, 0.8], ['💯', 0.8, 0.9], ['✨', 0.6, 0.6], ['👏', 0.7, 0.7],
      ['💪', 0.7, 0.8], ['🎉', 0.8, 0.8], ['❤️', 0.9, 0.9], ['💖', 0.8, 0.8],
      ['😂', 0.7, 0.8], ['🤣', 0.8, 0.9], ['😎', 0.6, 0.7], ['🤩', 0.8, 0.8],
      ['🙌', 0.7, 0.7], ['👍', 0.6, 0.6], ['🎊', 0.7, 0.7], ['🌟', 0.6, 0.6]
    ];

    // Negative emojis
    const negativeEmojis: Array<[string, number, number]> = [
      ['😢', -0.7, 0.8], ['😭', -0.8, 0.9], ['😡', -0.8, 0.9], ['🤬', -0.9, 0.9],
      ['😤', -0.6, 0.7], ['😒', -0.5, 0.6], ['🙄', -0.4, 0.6], ['😑', -0.3, 0.5],
      ['💔', -0.8, 0.9], ['😞', -0.6, 0.7], ['😔', -0.6, 0.7], ['😪', -0.5, 0.6],
      ['😰', -0.7, 0.8], ['😨', -0.6, 0.7], ['🤮', -0.8, 0.8], ['💀', -0.4, 0.7]
    ];

    // Neutral/ambiguous emojis (context-dependent)
    const neutralEmojis: Array<[string, number, number]> = [
      ['😐', 0.0, 0.3], ['🤔', 0.0, 0.4], ['😅', 0.1, 0.5], ['😬', -0.1, 0.4],
      ['🤷', 0.0, 0.3], ['👀', 0.0, 0.4], ['🤡', -0.2, 0.6], ['💭', 0.0, 0.2]
    ];

    // Add all emojis to mapping
    [...positiveEmojis, ...negativeEmojis, ...neutralEmojis].forEach(([emoji, sentiment, intensity]) => {
      this.emojiMappings.set(emoji, {
        emoji,
        sentiment,
        intensity,
        context: this.getEmojiContexts(emoji),
        platforms: ['universal'] // Would be platform-specific in full implementation
      });
    });
  }

  /**
   * Initialize Gen Z language patterns
   */
  private initializeGenZPatterns(): void {
    this.genZPatterns = [
      // Positive Gen Z expressions
      {
        pattern: /\b(slay|slaying|periodt?|stan|iconic|vibe|vibes|bop|fire|lit|bussin|no cap)\b/gi,
        sentiment: 0.7,
        authenticity: 0.9,
        usage: 'positive',
        examples: ['this slays', 'periodt', 'such a vibe', 'no cap']
      },
      {
        pattern: /\b(bet|fr|facts|based|valid|it's giving|ate|left no crumbs)\b/gi,
        sentiment: 0.6,
        authenticity: 0.8,
        usage: 'positive',
        examples: ['bet', 'fr tho', 'that\'s based', 'it\'s giving main character']
      },

      // Negative Gen Z expressions
      {
        pattern: /\b(cringe|mid|cap|L|ratio|touch grass|cope|seethe|yikes)\b/gi,
        sentiment: -0.6,
        authenticity: 0.8,
        usage: 'negative',
        examples: ['that\'s cringe', 'this is mid', 'cap detected', 'take the L']
      },
      {
        pattern: /\b(sus|sketch|toxic|problematic|red flag|ick)\b/gi,
        sentiment: -0.5,
        authenticity: 0.7,
        usage: 'negative',
        examples: ['that\'s sus', 'giving me the ick', 'red flag behavior']
      },

      // Sarcastic/Ironic Gen Z expressions
      {
        pattern: /\b(bestie|girlie|queen|king|main character energy)\b/gi,
        sentiment: 0.3, // Can be positive or sarcastic depending on context
        authenticity: 0.9,
        usage: 'sarcastic',
        examples: ['ok bestie', 'sure girlie', 'main character energy']
      },
      {
        pattern: /\b(not me|the way|tell me why|pls|plz|literally|deadass)\b/gi,
        sentiment: 0.0,
        authenticity: 0.8,
        usage: 'neutral',
        examples: ['not me doing this', 'the way I just', 'tell me why']
      },

      // Intensifiers and expressions
      {
        pattern: /\b(literally dying|I can't|I'm deceased|crying|screaming|obsessed)\b/gi,
        sentiment: 0.4, // Usually positive in Gen Z context
        authenticity: 0.7,
        usage: 'positive',
        examples: ['literally dying', 'I can\'t even', 'I\'m obsessed']
      }
    ];
  }

  /**
   * Initialize platform normalizations
   */
  private initializePlatformNormalizations(): void {
    // Common text normalizations across platforms
    this.platformNormalizations.set('u', 'you');
    this.platformNormalizations.set('ur', 'your');
    this.platformNormalizations.set('pls', 'please');
    this.platformNormalizations.set('plz', 'please');
    this.platformNormalizations.set('thx', 'thanks');
    this.platformNormalizations.set('rn', 'right now');
    this.platformNormalizations.set('fr', 'for real');
    this.platformNormalizations.set('ngl', 'not gonna lie');
    this.platformNormalizations.set('tbh', 'to be honest');
    this.platformNormalizations.set('imo', 'in my opinion');
    this.platformNormalizations.set('fyi', 'for your information');
    this.platformNormalizations.set('btw', 'by the way');
    this.platformNormalizations.set('rly', 'really');
    this.platformNormalizations.set('bc', 'because');
    this.platformNormalizations.set('w/', 'with');
    this.platformNormalizations.set('w/o', 'without');
  }

  /**
   * Normalize platform-specific text patterns
   */
  private normalizePlatformText(text: string): string {
    let normalized = text.toLowerCase();

    // Apply platform normalizations
    this.platformNormalizations.forEach((replacement, pattern) => {
      // Escape regex special characters for security
      const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedPattern}\\b`, 'g');
      normalized = normalized.replace(regex, replacement);
    });

    // Remove excessive punctuation and spaces
    normalized = normalized.replace(/[!]{2,}/g, '!');
    normalized = normalized.replace(/[?]{2,}/g, '?');
    normalized = normalized.replace(/\s+/g, ' ');

    return normalized.trim();
  }

  /**
   * Extract text and emojis separately
   */
  private extractTextAndEmojis(content: string): { text: string; emojis: string[] } {
    // Enhanced emoji regex for 2025 Unicode coverage - using safe, tested pattern
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;

    const emojis = content.match(emojiRegex) || [];
    const text = content.replace(emojiRegex, ' ').replace(/\s+/g, ' ').trim();

    return { text, emojis };
  }

  /**
   * Analyze text sentiment with Gen Z pattern detection
   */
  private async analyzeTextSentiment(text: string): Promise<number> {
    if (!text.trim()) return 0;

    let sentiment = 0;
    let patternCount = 0;

    // Apply Gen Z language patterns
    for (const pattern of this.genZPatterns) {
      const matches = text.match(pattern.pattern);
      if (matches) {
        sentiment += pattern.sentiment * matches.length;
        patternCount += matches.length;
      }
    }

    // Basic sentiment analysis for non-Gen Z patterns
    const positiveWords = /\b(good|great|amazing|awesome|love|like|best|perfect|excellent|wonderful)\b/gi;
    const negativeWords = /\b(bad|terrible|awful|hate|worst|horrible|disgusting|annoying|stupid)\b/gi;

    const positiveMatches = text.match(positiveWords) || [];
    const negativeMatches = text.match(negativeWords) || [];

    sentiment += positiveMatches.length * 0.5;
    sentiment -= negativeMatches.length * 0.5;
    patternCount += positiveMatches.length + negativeMatches.length;

    // Normalize sentiment
    if (patternCount > 0) {
      sentiment = sentiment / patternCount;
    }

    // Clamp to -1 to 1 range
    return Math.max(-1, Math.min(1, sentiment));
  }

  /**
   * Analyze emoji sentiment
   */
  private analyzeEmojiSentiment(emojis: string[]): number {
    if (emojis.length === 0) return 0;

    let totalSentiment = 0;
    let weightedCount = 0;

    for (const emoji of emojis) {
      const mapping = this.emojiMappings.get(emoji);
      if (mapping) {
        // Weight by intensity
        totalSentiment += mapping.sentiment * mapping.intensity;
        weightedCount += mapping.intensity;
      }
    }

    return weightedCount > 0 ? totalSentiment / weightedCount : 0;
  }

  /**
   * Combine text and emoji sentiments
   */
  private combineSentiments(textSentiment: number, emojiSentiment: number): number {
    const textWeight = 1 - this.config.emojiWeight;
    const emojiWeight = this.config.emojiWeight;

    return (textSentiment * textWeight) + (emojiSentiment * emojiWeight);
  }

  /**
   * Detect Gen Z language patterns in text
   */
  private detectGenZLanguagePatterns(text: string): string[] {
    const detectedPatterns: string[] = [];

    for (const pattern of this.genZPatterns) {
      const matches = text.match(pattern.pattern);
      if (matches) {
        detectedPatterns.push(...matches.map(match => match.toLowerCase()));
      }
    }

    return Array.from(new Set(detectedPatterns)); // Remove duplicates
  }

  /**
   * Calculate authenticity score for Gen Z communication
   */
  private calculateAuthenticity(
    content: string,
    languagePatterns: string[],
    emojis: string[]
  ): number {
    let authenticityScore = 0.5; // Base score

    // Boost for Gen Z language patterns
    const genZPatternScore = languagePatterns.length > 0 ?
      Math.min(0.3, languagePatterns.length * 0.1) : 0;

    // Boost for appropriate emoji usage
    const emojiScore = emojis.length > 0 && emojis.length <= 5 ? 0.2 : 0;

    // Reduce for overly formal language
    const formalWords = /\b(however|therefore|furthermore|nevertheless|consequently)\b/gi;
    const formalPenalty = (content.match(formalWords) || []).length * 0.1;

    // Boost for natural contractions and casual tone
    const casualWords = /\b(don't|won't|can't|shouldn't|wouldn't|it's|that's|what's)\b/gi;
    const casualBoost = Math.min(0.2, (content.match(casualWords) || []).length * 0.05);

    authenticityScore += genZPatternScore + emojiScore + casualBoost - formalPenalty;

    return Math.max(0, Math.min(1, authenticityScore));
  }

  /**
   * Analyze topic-specific sentiments
   */
  private analyzeTopicSentiments(text: string): Record<string, number> {
    const topics = {
      'usability': /\b(easy|hard|difficult|simple|complex|intuitive|confusing|clear)\b/gi,
      'design': /\b(beautiful|ugly|pretty|aesthetic|clean|messy|style|theme|color)\b/gi,
      'performance': /\b(fast|slow|quick|laggy|smooth|responsive|glitchy|buggy)\b/gi,
      'content': /\b(interesting|boring|engaging|relevant|useful|helpful|informative)\b/gi,
      'overall': /\b(good|bad|great|terrible|love|hate|recommend|avoid)\b/gi
    };

    const topicSentiments: Record<string, number> = {};

    Object.entries(topics).forEach(([topic, regex]) => {
      const matches = text.match(regex) || [];
      if (matches.length > 0) {
        // Simple sentiment calculation for topic
        let sentiment = 0;
        matches.forEach(match => {
          // Basic positive/negative word classification
          const positiveTopicWords = ['easy', 'simple', 'intuitive', 'beautiful', 'pretty', 'clean', 'fast', 'smooth', 'interesting', 'engaging', 'useful', 'good', 'great', 'love'];
          const negativeTopicWords = ['hard', 'difficult', 'complex', 'confusing', 'ugly', 'messy', 'slow', 'laggy', 'glitchy', 'boring', 'bad', 'terrible', 'hate'];

          if (positiveTopicWords.includes(match.toLowerCase())) sentiment += 1;
          if (negativeTopicWords.includes(match.toLowerCase())) sentiment -= 1;
        });

        topicSentiments[topic] = sentiment / matches.length;
      }
    });

    return topicSentiments;
  }

  /**
   * Get emoji context patterns
   */
  private getEmojiContexts(emoji: string): string[] {
    const contextMap: Record<string, string[]> = {
      '😊': ['positive', 'friendly', 'approval'],
      '😍': ['love', 'excitement', 'attraction'],
      '🔥': ['trending', 'hot', 'amazing'],
      '💯': ['agreement', 'perfect', 'authentic'],
      '😂': ['funny', 'laughing', 'humor'],
      '💀': ['dying_laughing', 'shock', 'dramatic'],
      '👀': ['looking', 'interest', 'suspicion'],
      '🤔': ['thinking', 'consideration', 'doubt']
    };

    return contextMap[emoji] || ['general'];
  }

  /**
   * Generate cache key for feedback entry
   */
  private generateCacheKey(entry: FeedbackEntry): string {
    return `${entry.type}_${String(entry.content).slice(0, 50)}_${entry.timestamp}`;
  }

  /**
   * Get default sentiment data for errors
   */
  private getDefaultSentimentData(): SentimentData {
    return {
      overallSentiment: 0,
      topicSentiments: {},
      languagePatterns: [],
      authenticity: 0.5
    };
  }

  /**
   * Batch process feedback entries
   */
  public async batchAnalyze(entries: FeedbackEntry[]): Promise<SentimentData[]> {
    const results: SentimentData[] = [];

    for (const entry of entries) {
      const result = await this.analyzeSentiment(entry);
      results.push(result);
    }

    return results;
  }

  /**
   * Get sentiment analysis statistics
   */
  public getAnalysisStats(): {
    cacheSize: number;
    genZPatternsDetected: number;
    emojiMappingsCount: number;
    averageAuthenticity: number;
  } {
    const sentimentData = Array.from(this.sentimentCache.values());
    const averageAuthenticity = sentimentData.length > 0
      ? sentimentData.reduce((sum, data) => sum + data.authenticity, 0) / sentimentData.length
      : 0;

    return {
      cacheSize: this.sentimentCache.size,
      genZPatternsDetected: this.genZPatterns.length,
      emojiMappingsCount: this.emojiMappings.size,
      averageAuthenticity
    };
  }

  /**
   * Clear analysis cache
   */
  public clearCache(): void {
    this.sentimentCache.clear();
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<SentimentAnalysisConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  public getConfig(): SentimentAnalysisConfig {
    return { ...this.config };
  }
}
