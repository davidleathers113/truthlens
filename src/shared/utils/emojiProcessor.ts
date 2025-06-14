/**
 * Emoji Processing with Sentiment Analysis
 * Detects emojis in text and provides sentiment scores
 * Handles complex emoji sequences including ZWJ combinations
 */

import emojiRegex from 'emoji-regex';

export interface EmojiSentiment {
  score: number;      // -2 to +2, where negative is sad/angry, positive is happy
  desc: string;       // Human-readable description
  category?: string;  // Emoji category
}

export interface ProcessedEmoji {
  emoji: string;
  sentiment: EmojiSentiment;
  position: number;
  length: number;
}

export interface EmojiAnalysisResult {
  emojis: ProcessedEmoji[];
  overallSentiment: number;
  dominantEmotions: string[];
  emojiDensity: number;  // Ratio of emoji characters to total text length
  hasEmojis: boolean;
}

/**
 * Comprehensive emoji sentiment mappings
 * Scores range from -2 (very negative) to +2 (very positive)
 */
const EMOJI_SENTIMENT_MAP: Record<string, EmojiSentiment> = {
  // Positive emotions
  '😊': { score: 0.7, desc: 'smiling', category: 'happy' },
  '😄': { score: 0.9, desc: 'grinning', category: 'happy' },
  '😃': { score: 0.8, desc: 'happy', category: 'happy' },
  '🙂': { score: 0.5, desc: 'slightly smiling', category: 'happy' },
  '😁': { score: 0.9, desc: 'beaming', category: 'happy' },
  '😆': { score: 1.0, desc: 'laughing', category: 'happy' },
  '😂': { score: 1.2, desc: 'joy', category: 'happy' },
  '🤣': { score: 1.3, desc: 'rolling on floor', category: 'happy' },
  '😍': { score: 1.5, desc: 'heart eyes', category: 'love' },
  '🥰': { score: 1.4, desc: 'smiling with hearts', category: 'love' },
  '😘': { score: 1.2, desc: 'blowing kiss', category: 'love' },
  '❤️': { score: 1.5, desc: 'red heart', category: 'love' },
  '💕': { score: 1.4, desc: 'two hearts', category: 'love' },
  '💖': { score: 1.5, desc: 'sparkling heart', category: 'love' },
  '✨': { score: 0.8, desc: 'sparkles', category: 'positive' },
  '🎉': { score: 1.2, desc: 'party', category: 'celebration' },
  '🎊': { score: 1.1, desc: 'confetti', category: 'celebration' },
  '👍': { score: 0.8, desc: 'thumbs up', category: 'approval' },
  '👏': { score: 0.9, desc: 'clapping', category: 'approval' },
  '🙏': { score: 0.6, desc: 'praying/thanks', category: 'gratitude' },

  // Negative emotions
  '😢': { score: -0.8, desc: 'crying', category: 'sad' },
  '😭': { score: -1.2, desc: 'loudly crying', category: 'sad' },
  '😔': { score: -0.7, desc: 'pensive', category: 'sad' },
  '😞': { score: -0.8, desc: 'disappointed', category: 'sad' },
  '😣': { score: -0.9, desc: 'persevering', category: 'frustrated' },
  '😖': { score: -0.8, desc: 'confounded', category: 'frustrated' },
  '😫': { score: -1.0, desc: 'tired', category: 'frustrated' },
  '😩': { score: -0.9, desc: 'weary', category: 'frustrated' },
  '😤': { score: -0.7, desc: 'huffing', category: 'angry' },
  '😠': { score: -1.0, desc: 'angry', category: 'angry' },
  '😡': { score: -1.3, desc: 'pouting', category: 'angry' },
  '🤬': { score: -1.5, desc: 'cursing', category: 'angry' },
  '😨': { score: -0.9, desc: 'fearful', category: 'fear' },
  '😰': { score: -1.0, desc: 'anxious', category: 'fear' },
  '😱': { score: -1.2, desc: 'screaming', category: 'fear' },
  '💔': { score: -1.4, desc: 'broken heart', category: 'sad' },
  '👎': { score: -0.8, desc: 'thumbs down', category: 'disapproval' },

  // Neutral/ambiguous
  '😐': { score: 0, desc: 'neutral', category: 'neutral' },
  '😑': { score: -0.1, desc: 'expressionless', category: 'neutral' },
  '🤔': { score: 0.1, desc: 'thinking', category: 'neutral' },
  '🤷': { score: 0, desc: 'shrugging', category: 'neutral' },
  '😏': { score: 0.3, desc: 'smirking', category: 'neutral' },
  '😒': { score: -0.3, desc: 'unamused', category: 'neutral' },

  // Surprise/shock
  '😲': { score: 0.2, desc: 'astonished', category: 'surprise' },
  '😮': { score: 0.1, desc: 'open mouth', category: 'surprise' },
  '🤯': { score: 0.3, desc: 'mind blown', category: 'surprise' },

  // Complex sequences (ZWJ)
  '👨‍👩‍👧‍👦': { score: 1.2, desc: 'family', category: 'love' },
  '👨‍👩‍👧': { score: 1.1, desc: 'family', category: 'love' },
  '👨‍👩‍👦': { score: 1.1, desc: 'family', category: 'love' },
  '🏳️‍🌈': { score: 0.8, desc: 'pride flag', category: 'identity' },
  '🏳️‍⚧️': { score: 0.8, desc: 'trans flag', category: 'identity' },

  // Activities and objects with sentiment
  '🍾': { score: 1.0, desc: 'champagne', category: 'celebration' },
  '🥳': { score: 1.1, desc: 'partying', category: 'celebration' },
  '🎂': { score: 0.9, desc: 'birthday cake', category: 'celebration' },
  '🎁': { score: 0.8, desc: 'gift', category: 'positive' },
  '💩': { score: -0.5, desc: 'poop', category: 'negative' },
  '🔥': { score: 0.7, desc: 'fire/hot', category: 'intense' },
  '💯': { score: 0.9, desc: 'hundred/perfect', category: 'approval' },

  // Hand gestures
  '🤝': { score: 0.7, desc: 'handshake', category: 'agreement' },
  '✊': { score: 0.5, desc: 'fist', category: 'solidarity' },
  '✌️': { score: 0.6, desc: 'peace', category: 'positive' },
  '🖕': { score: -1.8, desc: 'middle finger', category: 'offensive' },

  // Animals with common sentiment associations
  '🐶': { score: 0.6, desc: 'dog', category: 'cute' },
  '🐱': { score: 0.6, desc: 'cat', category: 'cute' },
  '🦄': { score: 0.8, desc: 'unicorn', category: 'magical' },
  '🐍': { score: -0.3, desc: 'snake', category: 'negative' },

  // Weather/nature
  '☀️': { score: 0.6, desc: 'sun', category: 'positive' },
  '🌈': { score: 0.8, desc: 'rainbow', category: 'positive' },
  '⛈️': { score: -0.4, desc: 'storm', category: 'negative' },
  '🌹': { score: 0.9, desc: 'rose', category: 'romantic' },
};

/**
 * Process emojis in text and analyze sentiment
 */
export function analyzeEmojis(text: string): EmojiAnalysisResult {
  if (!text || typeof text !== 'string') {
    return {
      emojis: [],
      overallSentiment: 0,
      dominantEmotions: [],
      emojiDensity: 0,
      hasEmojis: false
    };
  }

  const regex = emojiRegex();
  const emojis: ProcessedEmoji[] = [];
  const categoryCount: Record<string, number> = {};
  let totalSentiment = 0;
  let match: RegExpExecArray | null;

  // Find all emojis in the text
  while ((match = regex.exec(text)) !== null) {
    const emoji = match[0];
    const sentiment = EMOJI_SENTIMENT_MAP[emoji] || {
      score: 0,
      desc: 'unknown emoji',
      category: 'unknown'
    };

    emojis.push({
      emoji,
      sentiment,
      position: match.index,
      length: emoji.length
    });

    totalSentiment += sentiment.score;

    // Track category counts
    if (sentiment.category) {
      categoryCount[sentiment.category] = (categoryCount[sentiment.category] || 0) + 1;
    }
  }

  // Calculate overall sentiment
  const overallSentiment = emojis.length > 0
    ? totalSentiment / emojis.length
    : 0;

  // Find dominant emotions (categories that appear most)
  const dominantEmotions = Object.entries(categoryCount)
    .sort(([, a], [, b]) => b - a)
    .filter(([, count]) => count >= Math.max(2, emojis.length * 0.3))
    .map(([category]) => category);

  // Calculate emoji density
  const totalEmojiLength = emojis.reduce((sum, e) => sum + e.length, 0);
  const emojiDensity = text.length > 0 ? totalEmojiLength / text.length : 0;

  return {
    emojis,
    overallSentiment,
    dominantEmotions,
    emojiDensity,
    hasEmojis: emojis.length > 0
  };
}

/**
 * Extract emojis from text
 */
export function extractEmojis(text: string): string[] {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const regex = emojiRegex();
  const emojis: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    emojis.push(match[0]);
  }

  return emojis;
}

/**
 * Remove emojis from text
 */
export function removeEmojis(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const regex = emojiRegex();
  return text.replace(regex, '').trim();
}

/**
 * Replace emojis with their descriptions
 */
export function replaceEmojisWithDescriptions(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const regex = emojiRegex();
  return text.replace(regex, (match) => {
    const sentiment = EMOJI_SENTIMENT_MAP[match];
    return sentiment ? `:${sentiment.desc}:` : ':emoji:';
  });
}

/**
 * Get sentiment score for a single emoji
 */
export function getEmojiSentiment(emoji: string): EmojiSentiment {
  return EMOJI_SENTIMENT_MAP[emoji] || {
    score: 0,
    desc: 'unknown',
    category: 'unknown'
  };
}

/**
 * Check if text contains specific sentiment categories
 */
export function containsSentimentCategory(
  text: string,
  categories: string[]
): boolean {
  const analysis = analyzeEmojis(text);
  return analysis.emojis.some(e =>
    categories.includes(e.sentiment.category || '')
  );
}

/**
 * Get emoji statistics for content moderation
 */
export function getEmojiStats(text: string): {
  totalEmojis: number;
  uniqueEmojis: number;
  negativeCount: number;
  positiveCount: number;
  neutralCount: number;
  offensiveCount: number;
} {
  const analysis = analyzeEmojis(text);
  const uniqueEmojis = new Set(analysis.emojis.map(e => e.emoji));

  const stats = {
    totalEmojis: analysis.emojis.length,
    uniqueEmojis: uniqueEmojis.size,
    negativeCount: 0,
    positiveCount: 0,
    neutralCount: 0,
    offensiveCount: 0
  };

  analysis.emojis.forEach(({ sentiment }) => {
    if (sentiment.score < -0.3) {
      stats.negativeCount++;
    } else if (sentiment.score > 0.3) {
      stats.positiveCount++;
    } else {
      stats.neutralCount++;
    }

    if (sentiment.score <= -1.5 || sentiment.category === 'offensive') {
      stats.offensiveCount++;
    }
  });

  return stats;
}

/**
 * Analyze emoji patterns for spam detection
 */
export function detectEmojiSpamPatterns(text: string): {
  isLikelySpam: boolean;
  spamIndicators: string[];
  repetitionScore: number;
} {
  const emojis = extractEmojis(text);
  const spamIndicators: string[] = [];

  // Check for excessive emoji use
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const emojiRatio = emojis.length / Math.max(words.length, 1);
  if (emojiRatio > 1.0) { // More than 1 emoji per word
    spamIndicators.push('Excessive emoji ratio');
  }

  // Check for repeated emojis
  const emojiCounts: Record<string, number> = {};
  emojis.forEach(emoji => {
    emojiCounts[emoji] = (emojiCounts[emoji] || 0) + 1;
  });

  const maxRepetition = Math.max(...Object.values(emojiCounts), 0);
  if (maxRepetition > 5) {
    spamIndicators.push(`Emoji repeated ${maxRepetition} times`);
  }

  // Check for money/scam related emojis
  const scamEmojis = ['💰', '💵', '💴', '💶', '💷', '🤑', '💸', '💳'];
  const hasScamEmojis = emojis.some(e => scamEmojis.includes(e));
  if (hasScamEmojis && emojis.length > 3) {
    spamIndicators.push('Money-related emojis detected');
  }

  const repetitionScore = emojis.length > 0 ? maxRepetition / emojis.length : 0;
  const isLikelySpam = spamIndicators.length >= 2 || (emojis.length > 5 && repetitionScore > 0.5);

  return {
    isLikelySpam,
    spamIndicators,
    repetitionScore
  };
}
