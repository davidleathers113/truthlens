/**
 * Unit tests for emoji processor
 * Tests emoji detection, sentiment analysis, and edge cases
 */

import {
  analyzeEmojis,
  extractEmojis,
  removeEmojis,
  replaceEmojisWithDescriptions,
  getEmojiSentiment,
  containsSentimentCategory,
  getEmojiStats,
  detectEmojiSpamPatterns
} from '@shared/utils/emojiProcessor';

describe('EmojiProcessor', () => {
  describe('analyzeEmojis', () => {
    it('should detect and analyze single emojis', () => {
      const result = analyzeEmojis('Hello 😊 world!');

      expect(result.hasEmojis).toBe(true);
      expect(result.emojis).toHaveLength(1);
      expect(result.emojis[0].emoji).toBe('😊');
      expect(result.emojis[0].sentiment.score).toBe(0.7);
      expect(result.emojis[0].position).toBe(6);
    });

    it('should handle multiple emojis', () => {
      const result = analyzeEmojis('Happy 😄 and sad 😢 together');

      expect(result.emojis).toHaveLength(2);
      expect(result.overallSentiment).toBeCloseTo(0.05); // (0.9 + -0.8) / 2
    });

    it('should handle ZWJ sequences', () => {
      const result = analyzeEmojis('Family: 👨‍👩‍👧‍👦');

      expect(result.emojis).toHaveLength(1);
      expect(result.emojis[0].emoji).toBe('👨‍👩‍👧‍👦');
      expect(result.emojis[0].sentiment.score).toBe(1.2);
    });

    it('should handle flag emojis', () => {
      const result = analyzeEmojis('Pride 🏳️‍🌈 flag');

      expect(result.emojis).toHaveLength(1);
      expect(result.emojis[0].sentiment.score).toBe(0.8);
    });

    it('should calculate emoji density', () => {
      const text = 'Hi 😊';
      const result = analyzeEmojis(text);

      expect(result.emojiDensity).toBeCloseTo(2 / text.length); // 2 chars for emoji
    });

    it('should identify dominant emotions', () => {
      const result = analyzeEmojis('😊😄😃😁😆😂🤣'); // All happy emojis

      expect(result.dominantEmotions).toContain('happy');
    });

    it('should handle text without emojis', () => {
      const result = analyzeEmojis('No emojis here');

      expect(result.hasEmojis).toBe(false);
      expect(result.emojis).toHaveLength(0);
      expect(result.overallSentiment).toBe(0);
    });

    it('should handle empty or invalid input', () => {
      expect(analyzeEmojis('').hasEmojis).toBe(false);
      expect(analyzeEmojis(null as any).hasEmojis).toBe(false);
      expect(analyzeEmojis(undefined as any).hasEmojis).toBe(false);
    });
  });

  describe('extractEmojis', () => {
    it('should extract all emojis from text', () => {
      const emojis = extractEmojis('😊 Hello 🌍 world 🚀!');

      expect(emojis).toEqual(['😊', '🌍', '🚀']);
    });

    it('should handle consecutive emojis', () => {
      const emojis = extractEmojis('😊😊😊');

      expect(emojis).toEqual(['😊', '😊', '😊']);
    });

    it('should extract complex emojis', () => {
      const emojis = extractEmojis('Family 👨‍👩‍👧‍👦 and flag 🏳️‍🌈');

      expect(emojis).toEqual(['👨‍👩‍👧‍👦', '🏳️‍🌈']);
    });
  });

  describe('removeEmojis', () => {
    it('should remove all emojis from text', () => {
      const result = removeEmojis('Hello 😊 world 🌍!');

      expect(result).toBe('Hello  world !');
    });

    it('should handle text with only emojis', () => {
      const result = removeEmojis('😊😊😊');

      expect(result).toBe('');
    });

    it('should preserve text without emojis', () => {
      const text = 'No emojis here';
      const result = removeEmojis(text);

      expect(result).toBe(text);
    });
  });

  describe('replaceEmojisWithDescriptions', () => {
    it('should replace known emojis with descriptions', () => {
      const result = replaceEmojisWithDescriptions('I am 😊 today');

      expect(result).toBe('I am :smiling: today');
    });

    it('should replace unknown emojis with generic label', () => {
      const result = replaceEmojisWithDescriptions('Rare emoji: 🦖');

      expect(result).toBe('Rare emoji: :emoji:');
    });

    it('should handle multiple emojis', () => {
      const result = replaceEmojisWithDescriptions('😊😢');

      expect(result).toBe(':smiling::crying:');
    });
  });

  describe('getEmojiSentiment', () => {
    it('should return sentiment for known emojis', () => {
      const sentiment = getEmojiSentiment('😊');

      expect(sentiment.score).toBe(0.7);
      expect(sentiment.desc).toBe('smiling');
      expect(sentiment.category).toBe('happy');
    });

    it('should return neutral sentiment for unknown emojis', () => {
      const sentiment = getEmojiSentiment('🦖');

      expect(sentiment.score).toBe(0);
      expect(sentiment.desc).toBe('unknown');
      expect(sentiment.category).toBe('unknown');
    });
  });

  describe('containsSentimentCategory', () => {
    it('should detect specific sentiment categories', () => {
      const text = 'I love you ❤️😍';

      expect(containsSentimentCategory(text, ['love'])).toBe(true);
      expect(containsSentimentCategory(text, ['angry'])).toBe(false);
    });

    it('should handle multiple categories', () => {
      const text = '😊😢';

      expect(containsSentimentCategory(text, ['happy', 'sad'])).toBe(true);
    });
  });

  describe('getEmojiStats', () => {
    it('should calculate emoji statistics', () => {
      const stats = getEmojiStats('😊😊😢😡🤬');

      expect(stats.totalEmojis).toBe(5);
      expect(stats.uniqueEmojis).toBe(4);
      expect(stats.positiveCount).toBe(2);
      expect(stats.negativeCount).toBe(3);
      expect(stats.offensiveCount).toBe(1); // 🤬
    });

    it('should handle neutral emojis', () => {
      const stats = getEmojiStats('🤔🤷');

      expect(stats.neutralCount).toBe(2);
    });
  });

  describe('detectEmojiSpamPatterns', () => {
    it('should detect excessive emoji usage', () => {
      const result = detectEmojiSpamPatterns('😊😊😊 word 😊😊😊');

      expect(result.isLikelySpam).toBe(true);
      expect(result.spamIndicators).toContain('Excessive emoji ratio');
    });

    it('should detect repeated emojis', () => {
      const result = detectEmojiSpamPatterns('😊😊😊😊😊😊');

      expect(result.isLikelySpam).toBe(true);
      expect(result.repetitionScore).toBeGreaterThan(0.5);
    });

    it('should detect money-related spam patterns', () => {
      const result = detectEmojiSpamPatterns('💰💰💰 Get rich quick! 💵💵💵');

      expect(result.spamIndicators).toContain('Money-related emojis detected');
    });

    it('should not flag normal emoji usage', () => {
      const result = detectEmojiSpamPatterns('Had a great day! 😊');

      expect(result.isLikelySpam).toBe(false);
      expect(result.spamIndicators).toHaveLength(0);
    });
  });

  describe('Unicode edge cases', () => {
    it('should handle skin tone modifiers', () => {
      const emojis = extractEmojis('👋🏻👋🏿');

      expect(emojis).toEqual(['👋🏻', '👋🏿']);
    });

    it('should handle regional indicators', () => {
      const emojis = extractEmojis('🇺🇸🇬🇧');

      expect(emojis).toEqual(['🇺🇸', '🇬🇧']);
    });

    it('should handle emoji variations', () => {
      const emojis = extractEmojis('❤️'); // With variation selector

      expect(emojis).toHaveLength(1);
    });
  });
});
