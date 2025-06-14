/**
 * Domain Extraction with IDN Support
 * Handles internationalized domains, Tor addresses, and edge cases
 * Uses tldts for robust domain parsing
 */

import { parse, getDomain, getSubdomain, getPublicSuffix } from 'tldts';

export interface DomainInfo {
  fullDomain: string | null;
  domain: string | null;
  subdomain: string | null;
  publicSuffix: string | null;
  isIP: boolean;
  isPrivate: boolean;
  isIDN: boolean;
  isTor: boolean;
  isLocalhost: boolean;
  protocol: string | null;
  port: string | null;
  hostname: string | null;
}

export interface DomainValidation {
  isValid: boolean;
  isSuspicious: boolean;
  suspiciousReasons: string[];
  trustScore: number; // 0-1, where 1 is most trustworthy
}

/**
 * Known suspicious TLDs often used in phishing
 */
const SUSPICIOUS_TLDS = new Set([
  'tk', 'ml', 'ga', 'cf', 'cc', 'pw', 'nu', 'vu', 'to', 'click',
  'download', 'loan', 'racing', 'review', 'country', 'stream', 'gq'
]);

/**
 * Trusted TLDs for higher trust scores
 */
const TRUSTED_TLDS = new Set([
  'com', 'org', 'net', 'edu', 'gov', 'mil', 'int',
  'uk', 'de', 'fr', 'jp', 'au', 'ca', 'ch', 'nl', 'se', 'no'
]);

/**
 * Common phishing patterns
 */
const PHISHING_PATTERNS = [
  /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/, // IP addresses
  /[а-яА-Я].*\.(?:com|org|net)/, // Cyrillic in Latin TLDs
  /-{2,}/, // Multiple consecutive hyphens
  /(?:secure|account|update|verify|confirm|bank|paypal|amazon|microsoft|apple|google)-/i,
  /\d{4,}/, // Long numbers in domain
];

/**
 * Extract comprehensive domain information from URL
 */
export function extractDomain(urlString: string): DomainInfo {
  if (!urlString || typeof urlString !== 'string') {
    return createEmptyDomainInfo();
  }

  try {
    // Normalize URL
    let normalizedUrl = urlString.trim();

    // Add protocol if missing, but check if it looks like a valid domain first
    if (!normalizedUrl.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:/)) {
      // Check if it looks like a domain
      if (!normalizedUrl.includes('.') || normalizedUrl.includes(' ')) {
        return createEmptyDomainInfo();
      }
      normalizedUrl = 'https://' + normalizedUrl;
    }

    // Parse URL components
    const url = new URL(normalizedUrl);
    const hostname = url.hostname.toLowerCase();

    // Check for special cases
    const isIP = isIPAddress(hostname);
    const isLocalhost = isLocalhostDomain(hostname);
    const isTor = hostname.endsWith('.onion');
    const isIDN = isInternationalizedDomain(hostname);

    // Parse with tldts
    const parsed = parse(hostname, {
      allowIcannDomains: true,
      allowPrivateDomains: true,
      detectIp: true,
      mixedInputs: true,
      validateHostname: true
    });

    // For private domains like github.io, the full domain includes the subdomain
    const domain = getDomain(hostname, { allowPrivateDomains: true });
    const subdomain = getSubdomain(hostname, { allowPrivateDomains: true });
    const publicSuffix = getPublicSuffix(hostname, { allowPrivateDomains: true });

    return {
      fullDomain: hostname,
      domain: domain,
      subdomain: subdomain,
      publicSuffix: publicSuffix,
      isIP,
      isPrivate: parsed.isPrivate || false,
      isIDN,
      isTor,
      isLocalhost,
      protocol: url.protocol.replace(':', ''),
      port: url.port || null,
      hostname: parsed.hostname || hostname
    };
  } catch (error) {
    console.warn('Failed to parse domain:', urlString, error);
    return createEmptyDomainInfo();
  }
}

/**
 * Extract domain from email address
 */
export function extractDomainFromEmail(email: string): DomainInfo {
  if (!email || !email.includes('@')) {
    return createEmptyDomainInfo();
  }

  const parts = email.split('@');
  if (parts.length !== 2) {
    return createEmptyDomainInfo();
  }

  return extractDomain('https://' + parts[1]);
}

/**
 * Validate domain and check for suspicious patterns
 */
export function validateDomain(urlString: string): DomainValidation {
  const domainInfo = extractDomain(urlString);
  const suspiciousReasons: string[] = [];
  let trustScore = 0.5; // Start neutral

  if (!domainInfo.domain && !domainInfo.isIP) {
    return {
      isValid: false,
      isSuspicious: true,
      suspiciousReasons: ['Invalid domain'],
      trustScore: 0
    };
  }

  // Check if IP address
  if (domainInfo.isIP) {
    suspiciousReasons.push('Direct IP address');
    trustScore -= 0.3;
  }

  // Check for localhost
  if (domainInfo.isLocalhost) {
    suspiciousReasons.push('Localhost domain');
    trustScore = 0.1;
  }

  // Check for Tor
  if (domainInfo.isTor) {
    suspiciousReasons.push('Tor hidden service');
    trustScore -= 0.2;
  }

  // Check TLD - for private domains, use the top-level part
  let tld = domainInfo.publicSuffix?.split('.').pop();
  if (domainInfo.isPrivate && domainInfo.publicSuffix) {
    // For private domains like github.io, check the base TLD (io)
    const parts = domainInfo.publicSuffix.split('.');
    tld = parts[parts.length - 1];
  }

  if (tld && SUSPICIOUS_TLDS.has(tld)) {
    suspiciousReasons.push('Suspicious TLD');
    trustScore -= 0.2;
  } else if (tld && TRUSTED_TLDS.has(tld)) {
    trustScore += 0.2;
  }

  // Check for phishing patterns
  const domain = domainInfo.fullDomain || '';
  let phishingMatches = 0;
  PHISHING_PATTERNS.forEach(pattern => {
    if (pattern.test(domain)) {
      phishingMatches++;
      suspiciousReasons.push('Matches phishing pattern');
      trustScore -= 0.1;
    }
  });

  // Additional penalty for multiple phishing indicators
  if (phishingMatches > 1) {
    trustScore -= 0.1 * (phishingMatches - 1);
  }

  // Check for homograph attacks (mixing scripts) - check before phishing patterns
  if (domainInfo.isIDN || containsMixedScripts(domain)) {
    suspiciousReasons.push('Mixed scripts (possible homograph attack)');
    trustScore -= 0.3;
  }

  // Check subdomain depth
  const subdomainParts = domainInfo.subdomain?.split('.') || [];
  if (subdomainParts.length > 3) {
    suspiciousReasons.push('Excessive subdomain depth');
    trustScore -= 0.1;
  }

  // Check for suspicious keywords in subdomain
  const suspiciousKeywords = ['secure', 'account', 'verify', 'update', 'confirm'];
  if (domainInfo.subdomain &&
      suspiciousKeywords.some(keyword => domainInfo.subdomain!.includes(keyword))) {
    suspiciousReasons.push('Suspicious subdomain keywords');
    trustScore -= 0.2;
  }

  // Normalize trust score
  trustScore = Math.max(0, Math.min(1, trustScore));

  return {
    isValid: true,
    isSuspicious: suspiciousReasons.length > 0,
    suspiciousReasons,
    trustScore
  };
}

/**
 * Compare two domains for similarity (phishing detection)
 */
export function compareDomains(domain1: string, domain2: string): {
  areSimilar: boolean;
  similarity: number;
  suspiciousVariation: boolean;
} {
  const info1 = extractDomain(domain1);
  const info2 = extractDomain(domain2);

  if (!info1.domain || !info2.domain) {
    return { areSimilar: false, similarity: 0, suspiciousVariation: false };
  }

  // Exact match
  if (info1.domain === info2.domain) {
    return { areSimilar: true, similarity: 1, suspiciousVariation: false };
  }

  // Calculate similarity
  const similarity = calculateStringSimilarity(info1.domain, info2.domain);

  // Check for suspicious variations
  const suspiciousVariation = checkSuspiciousVariation(info1.domain, info2.domain);

  return {
    areSimilar: similarity > 0.8,
    similarity,
    suspiciousVariation
  };
}

/**
 * Extract all domains from text
 */
export function extractDomainsFromText(text: string): DomainInfo[] {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // URL pattern that captures most URLs
  const urlPattern = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}(?::[0-9]+)?(?:\/[^\s]*)?)/gi;

  const domains: DomainInfo[] = [];
  const seen = new Set<string>();

  let match;
  while ((match = urlPattern.exec(text)) !== null) {
    const url = match[0];
    const domainInfo = extractDomain(url);

    if (domainInfo.domain && !seen.has(domainInfo.domain)) {
      seen.add(domainInfo.domain);
      domains.push(domainInfo);
    }
  }

  // Also check for email domains
  const emailPattern = /[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  while ((match = emailPattern.exec(text)) !== null) {
    const domainInfo = extractDomainFromEmail(match[0]);

    if (domainInfo.domain && !seen.has(domainInfo.domain)) {
      seen.add(domainInfo.domain);
      domains.push(domainInfo);
    }
  }

  return domains;
}

/**
 * Convert IDN to ASCII (Punycode)
 */
export function toASCII(domain: string): string {
  try {
    const url = new URL('https://' + domain);
    return url.hostname;
  } catch {
    return domain;
  }
}

/**
 * Convert ASCII (Punycode) to Unicode
 */
export function toUnicode(domain: string): string {
  try {
    // Node.js doesn't have built-in punycode anymore, but browser URL handles it
    if (typeof window !== 'undefined') {
      const a = document.createElement('a');
      a.href = 'https://' + domain;
      return a.hostname;
    }
    return domain;
  } catch {
    return domain;
  }
}

/**
 * Helper: Check if string is IP address
 */
function isIPAddress(str: string): boolean {
  // Remove brackets for IPv6
  const cleanStr = str.replace(/^\[|\]$/g, '');

  // IPv4
  const ipv4Pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (ipv4Pattern.test(cleanStr)) return true;

  // IPv6 (more comprehensive check)
  // Handles full form, compressed form, and IPv4-mapped IPv6
  const ipv6Pattern = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
  return ipv6Pattern.test(cleanStr);
}

/**
 * Helper: Check if domain is localhost
 */
function isLocalhostDomain(domain: string): boolean {
  return domain === 'localhost' ||
         domain === '127.0.0.1' ||
         domain === '::1' ||
         domain.endsWith('.local') ||
         domain.endsWith('.localhost');
}

/**
 * Helper: Check if domain contains non-ASCII characters
 */
function isInternationalizedDomain(domain: string): boolean {
  return /[^\x00-\x7F]/.test(domain) || domain.includes('xn--');
}

/**
 * Helper: Check for mixed scripts (homograph attack detection)
 */
function containsMixedScripts(text: string): boolean {
  const scripts = new Set<string>();

  // Simplified script detection
  for (const char of text) {
    const code = char.charCodeAt(0);

    // Skip common punctuation and numbers
    if ((code >= 0x0021 && code <= 0x0040) ||
        (code >= 0x005B && code <= 0x0060) ||
        (code >= 0x007B && code <= 0x007E) ||
        (code >= 0x0030 && code <= 0x0039) ||
        char === '.' || char === '-') {
      continue;
    }

    if (code >= 0x0041 && code <= 0x007A) scripts.add('latin'); // Basic Latin letters
    else if (code >= 0x0400 && code <= 0x04FF) scripts.add('cyrillic');
    else if (code >= 0x0370 && code <= 0x03FF) scripts.add('greek');
    else if (code >= 0x4E00 && code <= 0x9FFF) scripts.add('cjk');
    else if (code >= 0x0600 && code <= 0x06FF) scripts.add('arabic');
    else if (code >= 0x0900 && code <= 0x097F) scripts.add('devanagari');
    else if (code >= 0x0100 && code <= 0x017F) scripts.add('latin-extended');
  }

  // Mixed if contains more than one script
  return scripts.size > 1;
}

/**
 * Helper: Calculate string similarity (Levenshtein distance based)
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Helper: Calculate Levenshtein distance
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Helper: Check for suspicious domain variations
 */
function checkSuspiciousVariation(domain1: string, domain2: string): boolean {
  // Common substitutions used in phishing
  const substitutions = [
    ['o', '0'], ['i', '1'], ['l', '1'], ['e', '3'], ['a', '@'],
    ['s', '$'], ['i', 'l'], ['rn', 'm'], ['vv', 'w']
  ];

  const modified1 = domain1.toLowerCase();
  const modified2 = domain2.toLowerCase();

  // Check each substitution
  for (const [char1, char2] of substitutions) {
    const temp1 = modified1.replace(new RegExp(char1, 'g'), char2);
    const temp2 = modified2.replace(new RegExp(char1, 'g'), char2);

    if (temp1 === modified2 || temp2 === modified1) {
      return true;
    }
  }

  // Check for added/removed hyphens
  if (domain1.replace(/-/g, '') === domain2.replace(/-/g, '')) {
    return true;
  }

  return false;
}

/**
 * Helper: Create empty domain info
 */
function createEmptyDomainInfo(): DomainInfo {
  return {
    fullDomain: null,
    domain: null,
    subdomain: null,
    publicSuffix: null,
    isIP: false,
    isPrivate: false,
    isIDN: false,
    isTor: false,
    isLocalhost: false,
    protocol: null,
    port: null,
    hostname: null
  };
}

/**
 * Get domain reputation category
 */
export function getDomainReputation(domain: string): {
  category: 'trusted' | 'neutral' | 'suspicious' | 'malicious';
  confidence: number;
} {
  const validation = validateDomain(domain);

  if (validation.trustScore >= 0.7) {
    return { category: 'trusted', confidence: validation.trustScore };
  } else if (validation.trustScore >= 0.4) {
    return { category: 'neutral', confidence: validation.trustScore };
  } else if (validation.trustScore >= 0.1) {
    return { category: 'suspicious', confidence: 1 - validation.trustScore };
  } else {
    return { category: 'malicious', confidence: 1 - validation.trustScore };
  }
}
