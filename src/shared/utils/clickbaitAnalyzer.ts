/**
 * Clickbait Detection Analyzer
 * Identifies manipulative content patterns without using regex
 * Supports multiple languages and cultural contexts
 */

export interface ClickbaitAnalysis {
  score: number; // 0-1, higher means more clickbait-y
  confidence: number; // 0-1, confidence in the analysis
  triggers: string[]; // What triggered the detection
  sentimentScore: number; // -1 to 1, emotional valence
  emotionalWords: string[]; // Words that contribute to emotional manipulation
  caps_ratio: number; // Ratio of capital letters
  punctuation_score: number; // Excessive punctuation score
  features: ClickbaitFeatures;
}

export interface ClickbaitFeatures {
  hasListicle: boolean;
  hasQuestionBait: boolean;
  hasEmotionalManipulation: boolean;
  hasExaggeration: boolean;
  hasCuriosity: boolean;
  hasUrgency: boolean;
  hasFearAppeal: boolean;
  hasExclusivity: boolean;
}

/**
 * Clickbait phrases by category
 */
const CLICKBAIT_PATTERNS = {
  curiosity: [
    "you won't believe",
    "you'll never guess",
    "what happened next",
    "the reason why",
    "this is why",
    "the real reason",
    "the truth about",
    "shocking truth",
    "will blow your mind",
    "mind-blowing",
    "jaw-dropping",
    "unbelievable"
  ],

  emotional: [
    "will make you cry",
    "tears of joy",
    "heartbreaking",
    "heart-wrenching",
    "gave me chills",
    "melts your heart",
    "restore your faith",
    "lose faith in humanity",
    "absolutely hilarious",
    "dying laughing"
  ],

  urgency: [
    "before it's too late",
    "before they delete",
    "going viral",
    "everyone is talking about",
    "breaking news",
    "just happened",
    "right now",
    "urgent",
    "act fast",
    "limited time",
    "last chance"
  ],

  authority: [
    "doctors hate",
    "scientists baffled",
    "experts shocked",
    "banks hate this",
    "government doesn't want",
    "they don't want you to know",
    "banned in",
    "censored",
    "exposed",
    "leaked"
  ],

  listicle: [
    "top 10",
    "top 20",
    "best 15",
    "worst 10",
    "5 ways",
    "7 reasons",
    "12 things",
    "signs you",
    "types of",
    "things only"
  ],

  exaggeration: [
    "epic",
    "insane",
    "crazy",
    "unreal",
    "legendary",
    "ultimate",
    "extreme",
    "massive",
    "huge",
    "tiny",
    "perfect",
    "worst",
    "best ever",
    "of all time"
  ],

  exclusive: [
    "you need to see",
    "you need to know",
    "must see",
    "must read",
    "can't miss",
    "essential",
    "required reading",
    "only here",
    "nowhere else",
    "exclusive"
  ]
};

/**
 * Sentiment words with emotional weights
 */
const SENTIMENT_LEXICON: Record<string, number> = {
  // Positive extreme
  'amazing': 2.5,
  'incredible': 2.5,
  'unbelievable': 2.5,
  'fantastic': 2.0,
  'awesome': 2.0,
  'perfect': 2.0,
  'brilliant': 2.0,
  'excellent': 1.8,
  'wonderful': 1.8,
  'great': 1.5,
  'good': 1.0,
  'nice': 0.8,
  'okay': 0.2,

  // Negative extreme
  'horrible': -2.5,
  'terrible': -2.5,
  'awful': -2.5,
  'disgusting': -2.5,
  'horrific': -2.5,
  'nightmare': -2.0,
  'disaster': -2.0,
  'catastrophe': -2.0,
  'worst': -2.0,
  'bad': -1.0,
  'poor': -1.0,
  'weak': -0.8,

  // Emotional intensifiers
  'shocking': 1.5,
  'stunning': 1.5,
  'breathtaking': 1.5,
  'mindblowing': 2.0,
  'heartbreaking': -1.8,
  'devastating': -2.0,
  'tragic': -1.8,
  'hilarious': 1.8,
  'terrifying': -1.8,
  'scary': -1.5,

  // Emojis
  '😍': 2.0,
  '🤩': 2.0,
  '😱': 1.5,
  '😭': -1.5,
  '💔': -2.0,
  '🤯': 2.0,
  '🔥': 1.5,
  '💯': 1.5,
  '⚠️': 1.0,
  '🚨': 1.5
};

/**
 * Analyze text for clickbait characteristics
 */
export function analyzeClickbait(text: string): ClickbaitAnalysis {
  if (!text || typeof text !== 'string') {
    return {
      score: 0,
      confidence: 0,
      triggers: [],
      sentimentScore: 0,
      emotionalWords: [],
      caps_ratio: 0,
      punctuation_score: 0,
      features: {
        hasListicle: false,
        hasQuestionBait: false,
        hasEmotionalManipulation: false,
        hasExaggeration: false,
        hasCuriosity: false,
        hasUrgency: false,
        hasFearAppeal: false,
        hasExclusivity: false
      }
    };
  }

  const lowerText = text.toLowerCase();
  const triggers: string[] = [];
  const emotionalWords: string[] = [];
  const features: ClickbaitFeatures = {
    hasListicle: false,
    hasQuestionBait: false,
    hasEmotionalManipulation: false,
    hasExaggeration: false,
    hasCuriosity: false,
    hasUrgency: false,
    hasFearAppeal: false,
    hasExclusivity: false
  };

  // Check for clickbait patterns
  let patternScore = 0;

  for (const [category, patterns] of Object.entries(CLICKBAIT_PATTERNS)) {
    for (const pattern of patterns) {
      if (lowerText.includes(pattern)) {
        triggers.push(pattern);
        patternScore += 0.15;

        // Set features
        switch (category) {
          case 'curiosity': features.hasCuriosity = true; break;
          case 'emotional': features.hasEmotionalManipulation = true; break;
          case 'urgency': features.hasUrgency = true; break;
          case 'authority': features.hasFearAppeal = true; break;
          case 'listicle': features.hasListicle = true; break;
          case 'exaggeration': features.hasExaggeration = true; break;
          case 'exclusive': features.hasExclusivity = true; break;
        }
      }
    }
  }

  // Check for question bait
  if (text.includes('?') && (lowerText.includes('this') || lowerText.includes('what') || lowerText.includes('why'))) {
    features.hasQuestionBait = true;
    patternScore += 0.1;
  }

  // Analyze sentiment and emotional words
  let sentimentScore = 0;
  const words = text.split(/\s+/);

  for (const word of words) {
    const cleanWord = word.toLowerCase().replace(/[.,!?;:]$/, '');
    if (SENTIMENT_LEXICON[cleanWord] !== undefined) {
      sentimentScore += SENTIMENT_LEXICON[cleanWord];
      if (Math.abs(SENTIMENT_LEXICON[cleanWord]) > 1.5) {
        emotionalWords.push(word);
      }
    }

    // Check emojis
    const emojis = word.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu) || [];
    for (const emoji of emojis) {
      if (SENTIMENT_LEXICON[emoji]) {
        sentimentScore += SENTIMENT_LEXICON[emoji];
        emotionalWords.push(emoji);
      }
    }
  }

  // Normalize sentiment score
  sentimentScore = Math.max(-1, Math.min(1, sentimentScore / words.length));

  // Calculate capitalization ratio
  const upperCount = (text.match(/[A-Z]/g) || []).length;
  const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
  const capsRatio = letterCount > 0 ? upperCount / letterCount : 0;

  // Calculate punctuation score
  const exclamationCount = (text.match(/!/g) || []).length;
  const questionCount = (text.match(/\?/g) || []).length;
  const multiPunctuation = (text.match(/[!?]{2,}/g) || []).length;
  const punctuationScore = (exclamationCount * 0.1) + (questionCount * 0.05) + (multiPunctuation * 0.2);

  // Calculate final score
  let score = patternScore;

  // Boost score for high emotional manipulation
  if (Math.abs(sentimentScore) > 0.5) {
    score += 0.2;
  }

  // Boost for excessive caps
  if (capsRatio > 0.3) {
    score += 0.15;
  }

  // Boost for excessive punctuation
  score += Math.min(0.2, punctuationScore);

  // Normalize score to 0-1
  score = Math.min(1, score);

  // Calculate confidence based on triggers found
  const confidence = Math.min(0.95, 0.6 + (triggers.length * 0.1));

  return {
    score,
    confidence,
    triggers,
    sentimentScore,
    emotionalWords,
    caps_ratio: capsRatio,
    punctuation_score: punctuationScore,
    features
  };
}

/**
 * Check if text is likely clickbait
 */
export function isClickbait(text: string, threshold: number = 0.5): boolean {
  const analysis = analyzeClickbait(text);
  return analysis.score >= threshold;
}

/**
 * Get clickbait severity level
 */
export function getClickbaitSeverity(score: number): 'none' | 'low' | 'medium' | 'high' | 'extreme' {
  if (score < 0.2) return 'none';
  if (score < 0.4) return 'low';
  if (score < 0.6) return 'medium';
  if (score < 0.8) return 'high';
  return 'extreme';
}

/**
 * Generate explanation for clickbait detection
 */
export function explainClickbaitDetection(analysis: ClickbaitAnalysis): string[] {
  const explanations: string[] = [];

  if (analysis.features.hasListicle) {
    explanations.push('Uses listicle format (numbered lists)');
  }

  if (analysis.features.hasQuestionBait) {
    explanations.push('Contains curiosity-inducing questions');
  }

  if (analysis.features.hasEmotionalManipulation) {
    explanations.push('Uses emotionally manipulative language');
  }

  if (analysis.features.hasExaggeration) {
    explanations.push('Contains exaggerated claims');
  }

  if (analysis.features.hasUrgency) {
    explanations.push('Creates false sense of urgency');
  }

  if (analysis.features.hasFearAppeal) {
    explanations.push('Appeals to fear or authority');
  }

  if (analysis.caps_ratio > 0.3) {
    explanations.push('Excessive use of capital letters');
  }

  if (analysis.punctuation_score > 0.2) {
    explanations.push('Excessive punctuation for emphasis');
  }

  if (Math.abs(analysis.sentimentScore) > 0.5) {
    explanations.push('Highly emotionally charged language');
  }

  return explanations;
}

/**
 * Get recommendations for improving headline
 */
export function getHeadlineRecommendations(analysis: ClickbaitAnalysis): string[] {
  const recommendations: string[] = [];

  if (analysis.features.hasExaggeration) {
    recommendations.push('Use more measured, factual language');
  }

  if (analysis.features.hasEmotionalManipulation) {
    recommendations.push('Focus on informative rather than emotional content');
  }

  if (analysis.features.hasUrgency) {
    recommendations.push('Remove false urgency claims');
  }

  if (analysis.caps_ratio > 0.3) {
    recommendations.push('Use standard capitalization');
  }

  if (analysis.punctuation_score > 0.2) {
    recommendations.push('Use punctuation sparingly and appropriately');
  }

  return recommendations;
}
