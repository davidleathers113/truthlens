// TypeScript definitions for @mozilla/readability
// Based on Mozilla Readability 0.6.0 API documentation (2025)

declare module '@mozilla/readability' {
  export interface ReadabilityOptions {
    /** Whether to enable logging (default: false) */
    debug?: boolean;
    
    /** Maximum number of elements to parse (default: 0 = no limit) */
    maxElemsToParse?: number;
    
    /** Number of top candidates to consider (default: 5) */
    nbTopCandidates?: number;
    
    /** Minimum characters for an article to return a result (default: 500) */
    charThreshold?: number;
    
    /** Classes to preserve when keepClasses is false */
    classesToPreserve?: string[];
    
    /** Skip JSON-LD parsing for metadata extraction (default: false) */
    disableJSONLD?: boolean;
    
    /** Custom serializer function (default: el => el.innerHTML) */
    serializer?: (element: Element) => string | Element;
    
    /** Regex for allowed video URLs */
    allowedVideoRegex?: RegExp;
    
    /** Modifier for link density threshold (default: 0) */
    linkDensityModifier?: number;
  }

  export interface ReadabilityResult {
    /** Title of the article */
    title: string;
    
    /** HTML content of the article */
    content: string;
    
    /** Plain text content of the article */
    textContent: string;
    
    /** Length of the article in characters */
    length: number;
    
    /** Excerpt/summary of the article */
    excerpt: string;
    
    /** Article byline (author information) */
    byline: string;
    
    /** Direction of the content (ltr/rtl) */
    dir: string;
    
    /** Site name */
    siteName: string;
    
    /** Publication date */
    publishedTime: string;
    
    /** Language of the content */
    lang: string;
  }

  export class Readability {
    /**
     * Create a new Readability instance
     * @param document - DOM document to parse (should be cloned to avoid modifications)
     * @param options - Configuration options
     */
    constructor(document: Document, options?: ReadabilityOptions);
    
    /**
     * Parse the document and extract readable content
     * @returns Parsed article data or null if parsing fails
     */
    parse(): ReadabilityResult | null;
  }

  /** 
   * Check if a document is probably suitable for readability processing
   * @param document - DOM document to check
   * @returns True if document appears to have readable content
   */
  export function isProbablyReaderable(document: Document): boolean;
}