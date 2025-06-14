/**
 * HTML Processing and Sanitization Utilities
 * Uses DOMPurify for security and Readability for content extraction
 * Ensures safe HTML handling in Chrome Extension context
 */

// @ts-expect-error - DOMPurify types are built-in but not recognized in Node env
import DOMPurify from 'dompurify';
import { Readability } from '@mozilla/readability';

export interface SanitizeOptions {
  allowedTags?: string[];
  allowedAttributes?: string[];
  forbidTags?: string[];
  forbidAttributes?: string[];
  allowImages?: boolean;
  allowLinks?: boolean;
  allowScripts?: boolean;
  stripComments?: boolean;
  stripDataAttributes?: boolean;
}

export interface ExtractedArticle {
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
}

export interface ProcessedHTML {
  sanitized: string;
  original: string;
  removedElements: number;
  suspiciousPatterns: string[];
  hasScripts: boolean;
  hasIframes: boolean;
  hasExternalResources: boolean;
}

/**
 * Default sanitization config for social media content
 */
const DEFAULT_SOCIAL_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: [
    'p', 'br', 'b', 'i', 'em', 'strong', 'a', 'span', 'div',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'ul', 'ol', 'li'
  ],
  ALLOWED_ATTR: ['href', 'title', 'class', 'id', 'target', 'rel'],
  FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input', 'object', 'embed'],
  FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'style'],
  ALLOW_DATA_ATTR: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_DOM: false
};

/**
 * Strict sanitization config for untrusted content
 */
const STRICT_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'em', 'strong', 'span'],
  ALLOWED_ATTR: [],
  FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input', 'img', 'video', 'audio', 'object', 'embed', 'a'],
  FORBID_ATTR: ['style', 'class', 'id'],
  STRIP_TAGS: ['script', 'style'],
  ALLOW_DATA_ATTR: false
};

/**
 * Initialize DOMPurify with custom hooks
 */
function initializeDOMPurify() {
  // Add hook to track removed elements
  let removedCount = 0;
  const suspiciousPatterns: string[] = [];

  DOMPurify.addHook('beforeSanitizeElements', (node) => {
    // Track suspicious patterns
    if (node.nodeType === 1) { // Element node
      const element = node as Element;

      // Check for suspicious attributes
      const attrs = element.attributes;
      for (let i = 0; i < attrs.length; i++) {
        const attr = attrs[i];
        if (attr.name.startsWith('on') || attr.value.includes('javascript:')) {
          suspiciousPatterns.push(`Suspicious attribute: ${attr.name}`);
        }
      }

      // Check for suspicious tags
      const tagName = element.tagName.toLowerCase();
      if (['script', 'iframe', 'object', 'embed', 'form'].includes(tagName)) {
        suspiciousPatterns.push(`Suspicious tag: ${tagName}`);
      }
    }

    return node;
  });

  DOMPurify.addHook('afterSanitizeElements', (node, data) => {
    if (data.removed && data.removed.length > 0) {
      removedCount += data.removed.length;
    }
  });

  return { removedCount, suspiciousPatterns };
}

/**
 * Sanitize HTML content with specified options
 */
export function sanitizeHTML(
  dirtyHTML: string,
  options: SanitizeOptions = {}
): ProcessedHTML {
  if (!dirtyHTML || typeof dirtyHTML !== 'string') {
    return {
      sanitized: '',
      original: dirtyHTML || '',
      removedElements: 0,
      suspiciousPatterns: [],
      hasScripts: false,
      hasIframes: false,
      hasExternalResources: false
    };
  }

  // Initialize tracking
  const tracking = initializeDOMPurify();

  // Build DOMPurify config from options
  const config: DOMPurify.Config = { ...DEFAULT_SOCIAL_CONFIG };

  if (options.allowedTags) {
    config.ALLOWED_TAGS = options.allowedTags;
  }

  if (options.allowedAttributes) {
    config.ALLOWED_ATTR = options.allowedAttributes;
  }

  if (options.forbidTags) {
    config.FORBID_TAGS = options.forbidTags;
  }

  if (options.forbidAttributes) {
    config.FORBID_ATTR = options.forbidAttributes;
  }

  // Handle specific options
  if (!options.allowImages) {
    config.FORBID_TAGS = [...(config.FORBID_TAGS || []), 'img'];
  }

  if (!options.allowLinks) {
    config.FORBID_TAGS = [...(config.FORBID_TAGS || []), 'a'];
  }

  if (options.stripComments) {
    config.ALLOWED_TAGS = config.ALLOWED_TAGS?.filter(tag => tag !== '#comment');
  }

  if (options.stripDataAttributes) {
    config.ALLOW_DATA_ATTR = false;
  }

  // Detect suspicious content before sanitization
  const hasScripts = dirtyHTML.includes('<script') || dirtyHTML.includes('javascript:');
  const hasIframes = dirtyHTML.includes('<iframe');
  const hasExternalResources = /src\s*=\s*["']https?:\/\//.test(dirtyHTML) ||
                              /href\s*=\s*["']https?:\/\//.test(dirtyHTML);

  // Sanitize
  const sanitized = DOMPurify.sanitize(dirtyHTML, config);

  return {
    sanitized,
    original: dirtyHTML,
    removedElements: tracking.removedCount,
    suspiciousPatterns: tracking.suspiciousPatterns,
    hasScripts,
    hasIframes,
    hasExternalResources
  };
}

/**
 * Strict sanitization for untrusted user input
 */
export function sanitizeStrictly(dirtyHTML: string): string {
  return DOMPurify.sanitize(dirtyHTML, STRICT_CONFIG);
}

/**
 * Extract readable article content from HTML
 * Uses Mozilla Readability for content extraction
 */
export function extractArticleContent(
  htmlContent: string,
  documentUrl: string
): ExtractedArticle | null {
  try {
    // Create a DOM from the HTML
    const doc = new DOMParser().parseFromString(htmlContent, 'text/html');

    // Set the base URL for relative links
    const base = doc.createElement('base');
    base.href = documentUrl;
    doc.head.appendChild(base);

    // Use Readability to parse
    const reader = new Readability(doc, {
      debug: false,
      maxElemsToParse: 0, // Default, no limit
      nbTopCandidates: 5,
      charThreshold: 500,
      classesToPreserve: ['caption', 'credit']
    });

    const article = reader.parse();

    if (!article) {
      return null;
    }

    // Sanitize the extracted content
    const sanitizedContent = sanitizeHTML(article.content, {
      allowImages: true,
      allowLinks: true,
      stripDataAttributes: true
    });

    return {
      title: article.title || '',
      content: sanitizedContent.sanitized,
      textContent: article.textContent || '',
      length: article.length || 0,
      excerpt: article.excerpt || '',
      byline: article.byline,
      dir: article.dir,
      siteName: article.siteName,
      lang: article.lang,
      publishedTime: article.publishedTime
    };
  } catch (error) {
    console.error('Failed to extract article content:', error);
    return null;
  }
}

/**
 * Clean HTML for display in extension UI
 */
export function cleanForDisplay(html: string): string {
  const cleaned = sanitizeHTML(html, {
    allowImages: false,
    allowLinks: true,
    stripComments: true,
    stripDataAttributes: true
  });

  // Additional cleaning for display
  return cleaned.sanitized
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '<br>') // Remove double line breaks
    .trim();
}

/**
 * Convert HTML to plain text
 */
export function htmlToText(html: string): string {
  // First sanitize
  const cleaned = sanitizeStrictly(html);

  // Create a temporary element to extract text
  const temp = document.createElement('div');
  temp.innerHTML = cleaned;

  // Get text content
  const text = temp.textContent || temp.innerText || '';

  // Clean up whitespace
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Check if HTML contains potentially dangerous content
 */
export function analyzeHTMLSafety(html: string): {
  isSafe: boolean;
  risks: string[];
  score: number; // 0-1, higher is more dangerous
} {
  const risks: string[] = [];
  let score = 0;

  // Check for script tags
  if (/<script[\s>]/i.test(html)) {
    risks.push('Contains script tags');
    score += 0.3;
  }

  // Check for event handlers
  if (/on\w+\s*=/i.test(html)) {
    risks.push('Contains inline event handlers');
    score += 0.2;
  }

  // Check for javascript: URLs
  if (/javascript:/i.test(html)) {
    risks.push('Contains javascript: URLs');
    score += 0.3;
  }

  // Check for iframes
  if (/<iframe[\s>]/i.test(html)) {
    risks.push('Contains iframes');
    score += 0.2;
  }

  // Check for forms
  if (/<form[\s>]/i.test(html)) {
    risks.push('Contains forms');
    score += 0.1;
  }

  // Check for external resources
  if (/src\s*=\s*["']https?:\/\//i.test(html)) {
    risks.push('Loads external resources');
    score += 0.1;
  }

  // Check for data: URLs (can be used for XSS)
  if (/src\s*=\s*["']data:/i.test(html)) {
    risks.push('Contains data: URLs');
    score += 0.2;
  }

  // Check for suspicious styles
  if (/style\s*=\s*["'][^"']*expression\s*\(/i.test(html)) {
    risks.push('Contains CSS expressions');
    score += 0.2;
  }

  score = Math.min(1, score);
  const isSafe = score < 0.3;

  return { isSafe, risks, score };
}

/**
 * Prepare HTML for fact-checking analysis
 * Extracts and cleans content while preserving structure
 */
export function prepareForFactCheck(html: string, url: string): {
  content: string;
  metadata: {
    hasImages: boolean;
    hasVideos: boolean;
    hasLinks: boolean;
    wordCount: number;
    paragraphCount: number;
  };
} {
  // Extract article content if possible
  const article = extractArticleContent(html, url);

  let content: string;
  if (article) {
    content = article.textContent;
  } else {
    // Fallback to basic text extraction
    content = htmlToText(html);
  }

  // Count elements for metadata
  const temp = document.createElement('div');
  temp.innerHTML = sanitizeHTML(html).sanitized;

  const metadata = {
    hasImages: temp.querySelectorAll('img').length > 0,
    hasVideos: temp.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]').length > 0,
    hasLinks: temp.querySelectorAll('a[href]').length > 0,
    wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
    paragraphCount: temp.querySelectorAll('p').length
  };

  return { content, metadata };
}
