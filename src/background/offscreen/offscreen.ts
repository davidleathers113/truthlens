/**
 * Offscreen Document Worker
 * Handles CPU-intensive operations away from the main extension thread
 * Prevents UI blocking during heavy processing like article parsing
 */

import { Readability } from '@mozilla/readability';
import DOMPurify from 'dompurify';

interface OffscreenMessage {
  target: 'offscreen';
  action: string;
  data: any;
  id: string;
}

interface ParseArticleData {
  htmlContent: string;
  documentUrl: string;
  options?: {
    stripStyles?: boolean;
    extractMetadata?: boolean;
    maxContentLength?: number;
  };
}

interface AnalyzeContentData {
  content: string;
  analysisType: 'sentiment' | 'clickbait' | 'complexity';
}

/**
 * Parse article content using Readability
 * This is CPU-intensive and benefits from running off the main thread
 */
async function parseArticle(data: ParseArticleData) {
  try {
    // Create a DOM from the HTML content
    const doc = new DOMParser().parseFromString(data.htmlContent, 'text/html');

    // Set base URL for relative links
    const base = doc.createElement('base');
    base.href = data.documentUrl;
    doc.head.appendChild(base);

    // Configure Readability
    const reader = new Readability(doc, {
      debug: false,
      maxElemsToParse: 0,
      nbTopCandidates: 5,
      charThreshold: 500,
      classesToPreserve: ['caption', 'credit', 'byline', 'author']
    });

    // Parse the article
    const article = reader.parse();

    if (!article) {
      throw new Error('Failed to extract article content');
    }

    // Sanitize the content
    const sanitizedContent = DOMPurify.sanitize(article.content, {
      ALLOWED_TAGS: [
        'p', 'br', 'b', 'i', 'em', 'strong', 'a', 'span', 'div',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'ul', 'ol', 'li',
        'img', 'figure', 'figcaption'
      ],
      ALLOWED_ATTR: ['href', 'title', 'alt', 'src', 'srcset'],
      FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input'],
      ALLOW_DATA_ATTR: false
    });

    // Extract additional metadata if requested
    let metadata = {};
    if (data.options?.extractMetadata) {
      metadata = extractMetadata(doc);
    }

    // Trim content if max length specified
    let finalContent = sanitizedContent;
    if (data.options?.maxContentLength) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = sanitizedContent;
      const textContent = tempDiv.textContent || '';
      if (textContent.length > data.options.maxContentLength) {
        finalContent = truncateHTML(sanitizedContent, data.options.maxContentLength);
      }
    }

    return {
      success: true,
      article: {
        title: article.title || '',
        content: finalContent,
        textContent: article.textContent || '',
        length: article.length || 0,
        excerpt: article.excerpt || '',
        byline: article.byline,
        dir: article.dir,
        siteName: article.siteName,
        lang: article.lang,
        publishedTime: article.publishedTime,
        ...metadata
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error'
    };
  }
}

/**
 * Extract additional metadata from the document
 */
function extractMetadata(doc: Document) {
  const metadata: Record<string, any> = {};

  // Open Graph tags
  const ogTags = doc.querySelectorAll('meta[property^="og:"]');
  ogTags.forEach(tag => {
    const property = tag.getAttribute('property')?.replace('og:', '');
    const content = tag.getAttribute('content');
    if (property && content) {
      metadata[`og_${property}`] = content;
    }
  });

  // Twitter Card tags
  const twitterTags = doc.querySelectorAll('meta[name^="twitter:"]');
  twitterTags.forEach(tag => {
    const name = tag.getAttribute('name')?.replace('twitter:', '');
    const content = tag.getAttribute('content');
    if (name && content) {
      metadata[`twitter_${name}`] = content;
    }
  });

  // Schema.org JSON-LD
  const jsonLdScripts = doc.querySelectorAll('script[type="application/ld+json"]');
  if (jsonLdScripts.length > 0) {
    try {
      const jsonLdData = JSON.parse(jsonLdScripts[0].textContent || '{}');
      metadata.schema = jsonLdData;
    } catch {
      // Ignore JSON parsing errors
    }
  }

  // Author meta tags
  const authorMeta = doc.querySelector('meta[name="author"]');
  if (authorMeta) {
    metadata.author = authorMeta.getAttribute('content');
  }

  // Published date
  const dateMeta = doc.querySelector('meta[name="article:published_time"], meta[property="article:published_time"], time[datetime]');
  if (dateMeta) {
    metadata.publishedDate = dateMeta.getAttribute('content') || dateMeta.getAttribute('datetime');
  }

  return metadata;
}

/**
 * Truncate HTML content while preserving structure
 */
function truncateHTML(html: string, maxLength: number): string {
  const div = document.createElement('div');
  div.innerHTML = html;

  let currentLength = 0;
  const truncateNode = (node: Node): boolean => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (currentLength + text.length > maxLength) {
        const remainingLength = maxLength - currentLength;
        node.textContent = text.substring(0, remainingLength) + '...';
        return true; // Stop processing
      }
      currentLength += text.length;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const children = Array.from(node.childNodes);
      for (const child of children) {
        if (truncateNode(child)) {
          // Remove all following siblings
          while (child.nextSibling) {
            child.nextSibling.remove();
          }
          return true;
        }
      }
    }
    return false;
  };

  truncateNode(div);
  return div.innerHTML;
}

/**
 * Perform content analysis
 */
async function analyzeContent(data: AnalyzeContentData) {
  try {
    switch (data.analysisType) {
      case 'sentiment':
        return { success: true, result: analyzeSentiment(data.content) };
      case 'clickbait':
        return { success: true, result: analyzeClickbait(data.content) };
      case 'complexity':
        return { success: true, result: analyzeComplexity(data.content) };
      default:
        throw new Error(`Unknown analysis type: ${data.analysisType}`);
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Analysis failed'
    };
  }
}

/**
 * Basic sentiment analysis
 */
function analyzeSentiment(text: string) {
  // This is a simplified version - in production, you'd use a proper NLP library
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic'];
  const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'poor', 'worst'];

  const words = text.toLowerCase().split(/\s+/);
  let positiveCount = 0;
  let negativeCount = 0;

  words.forEach(word => {
    if (positiveWords.includes(word)) positiveCount++;
    if (negativeWords.includes(word)) negativeCount++;
  });

  const totalSentimentWords = positiveCount + negativeCount;
  if (totalSentimentWords === 0) {
    return { sentiment: 'neutral', score: 0 };
  }

  const score = (positiveCount - negativeCount) / totalSentimentWords;
  let sentiment = 'neutral';
  if (score > 0.3) sentiment = 'positive';
  else if (score < -0.3) sentiment = 'negative';

  return { sentiment, score, positiveCount, negativeCount };
}

/**
 * Analyze clickbait characteristics
 */
function analyzeClickbait(text: string) {
  const clickbaitPhrases = [
    'you won\'t believe',
    'shocking',
    'this one trick',
    'doctors hate',
    'what happened next',
    'will blow your mind',
    'number \\d+ will',
    'can\'t stop',
    'jaw-dropping'
  ];

  const lowerText = text.toLowerCase();
  let clickbaitScore = 0;
  const foundPhrases: string[] = [];

  clickbaitPhrases.forEach(phrase => {
    const regex = new RegExp(phrase, 'i');
    if (regex.test(lowerText)) {
      clickbaitScore += 0.2;
      foundPhrases.push(phrase);
    }
  });

  // Check for excessive caps
  const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
  if (capsRatio > 0.3) {
    clickbaitScore += 0.3;
  }

  // Check for excessive punctuation
  const exclamationCount = (text.match(/!/g) || []).length;
  const questionCount = (text.match(/\?/g) || []).length;
  if (exclamationCount > 2 || questionCount > 2) {
    clickbaitScore += 0.2;
  }

  return {
    isClickbait: clickbaitScore > 0.5,
    score: Math.min(clickbaitScore, 1),
    foundPhrases,
    capsRatio,
    exclamationCount,
    questionCount
  };
}

/**
 * Analyze text complexity
 */
function analyzeComplexity(text: string) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);

  // Average sentence length
  const avgSentenceLength = words.length / sentences.length;

  // Count syllables (approximation)
  const countSyllables = (word: string) => {
    word = word.toLowerCase();
    let count = 0;
    let previousWasVowel = false;

    for (let i = 0; i < word.length; i++) {
      const isVowel = /[aeiou]/.test(word[i]);
      if (isVowel && !previousWasVowel) {
        count++;
      }
      previousWasVowel = isVowel;
    }

    // Adjust for silent e
    if (word.endsWith('e')) count--;

    // Ensure at least one syllable
    return Math.max(1, count);
  };

  const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
  const avgSyllablesPerWord = totalSyllables / words.length;

  // Flesch Reading Ease score
  const fleschScore = 206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;

  // Determine reading level
  let readingLevel = 'College';
  if (fleschScore >= 90) readingLevel = 'Elementary';
  else if (fleschScore >= 80) readingLevel = 'Middle School';
  else if (fleschScore >= 60) readingLevel = 'High School';

  return {
    avgSentenceLength,
    avgSyllablesPerWord,
    fleschScore: Math.max(0, Math.min(100, fleschScore)),
    readingLevel,
    wordCount: words.length,
    sentenceCount: sentences.length
  };
}

/**
 * Message handler for the offscreen document
 */
chrome.runtime.onMessage.addListener((message: OffscreenMessage, _sender, sendResponse) => {
  if (message.target !== 'offscreen') {
    return false;
  }

  // Process message asynchronously
  (async () => {
    try {
      let result;

      switch (message.action) {
        case 'parse-article':
          result = await parseArticle(message.data);
          break;
        case 'analyze-content':
          result = await analyzeContent(message.data);
          break;
        default:
          result = { success: false, error: `Unknown action: ${message.action}` };
      }

      sendResponse({ id: message.id, ...result });
    } catch (error) {
      sendResponse({
        id: message.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })();

  // Return true to indicate async response
  return true;
});

// Log that offscreen document is ready
console.debug('Offscreen document initialized and ready');
