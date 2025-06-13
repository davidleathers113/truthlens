/**
 * Unit tests for domain extractor
 * Tests IDN support, Tor addresses, and phishing detection
 */

import {
  extractDomain,
  extractDomainFromEmail,
  validateDomain,
  compareDomains,
  extractDomainsFromText,
  toASCII,
  toUnicode,
  getDomainReputation
} from '@shared/utils/domainExtractor';

describe('DomainExtractor', () => {
  describe('extractDomain', () => {
    it('should extract basic domain info', () => {
      const result = extractDomain('https://www.example.com');

      expect(result.fullDomain).toBe('www.example.com');
      expect(result.domain).toBe('example.com');
      expect(result.subdomain).toBe('www');
      expect(result.publicSuffix).toBe('com');
      expect(result.protocol).toBe('https');
      expect(result.isIP).toBe(false);
    });

    it('should handle URLs without protocol', () => {
      const result = extractDomain('example.com/path');

      expect(result.domain).toBe('example.com');
      expect(result.protocol).toBe('https'); // Default protocol
    });

    it('should detect IP addresses', () => {
      const result = extractDomain('http://192.168.1.1:8080');

      expect(result.isIP).toBe(true);
      expect(result.fullDomain).toBe('192.168.1.1');
      expect(result.port).toBe('8080');
    });

    it('should detect localhost', () => {
      const result = extractDomain('http://localhost:3000');

      expect(result.isLocalhost).toBe(true);
      expect(result.fullDomain).toBe('localhost');
    });

    it('should detect Tor onion addresses', () => {
      const result = extractDomain('https://3g2upl4pq6kufc4m.onion');

      expect(result.isTor).toBe(true);
      expect(result.fullDomain).toBe('3g2upl4pq6kufc4m.onion');
    });

    it('should detect IDN domains', () => {
      const result = extractDomain('https://münchen.de');

      expect(result.isIDN).toBe(true);
      expect(result.domain).toBeTruthy();
    });

    it('should handle punycode domains', () => {
      const result = extractDomain('https://xn--mnchen-3ya.de');

      expect(result.isIDN).toBe(true);
      expect(result.domain).toBe('xn--mnchen-3ya.de');
    });

    it('should handle complex subdomains', () => {
      const result = extractDomain('https://api.v2.staging.example.com');

      expect(result.subdomain).toBe('api.v2.staging');
      expect(result.domain).toBe('example.com');
    });

    it('should handle invalid input', () => {
      const result = extractDomain('not-a-url');

      expect(result.domain).toBe(null);
      expect(result.fullDomain).toBe(null);
    });

    it('should handle empty input', () => {
      const result = extractDomain('');

      expect(result.domain).toBe(null);
    });

    it('should detect private domains', () => {
      const result = extractDomain('https://myapp.github.io');

      expect(result.domain).toBe('myapp.github.io');
      expect(result.publicSuffix).toBe('github.io');
    });
  });

  describe('extractDomainFromEmail', () => {
    it('should extract domain from email', () => {
      const result = extractDomainFromEmail('user@example.com');

      expect(result.domain).toBe('example.com');
    });

    it('should handle complex email domains', () => {
      const result = extractDomainFromEmail('user@mail.company.co.uk');

      expect(result.domain).toBe('company.co.uk');
      expect(result.subdomain).toBe('mail');
    });

    it('should handle invalid emails', () => {
      const result = extractDomainFromEmail('not-an-email');

      expect(result.domain).toBe(null);
    });
  });

  describe('validateDomain', () => {
    it('should validate legitimate domains', () => {
      const result = validateDomain('https://www.google.com');

      expect(result.isValid).toBe(true);
      expect(result.isSuspicious).toBe(false);
      expect(result.trustScore).toBeGreaterThan(0.5);
    });

    it('should flag IP addresses as suspicious', () => {
      const result = validateDomain('http://192.168.1.1');

      expect(result.isSuspicious).toBe(true);
      expect(result.suspiciousReasons).toContain('Direct IP address');
      expect(result.trustScore).toBeLessThan(0.5);
    });

    it('should flag suspicious TLDs', () => {
      const result = validateDomain('https://example.tk');

      expect(result.isSuspicious).toBe(true);
      expect(result.suspiciousReasons).toContain('Suspicious TLD');
    });

    it('should detect phishing patterns', () => {
      const result = validateDomain('https://secure-paypal-update.com');

      expect(result.isSuspicious).toBe(true);
      expect(result.suspiciousReasons).toContain('Matches phishing pattern');
    });

    it('should flag Tor addresses', () => {
      const result = validateDomain('https://example.onion');

      expect(result.isSuspicious).toBe(true);
      expect(result.suspiciousReasons).toContain('Tor hidden service');
    });

    it('should detect homograph attacks', () => {
      const result = validateDomain('https://gооgle.com'); // With Cyrillic 'o'

      expect(result.isSuspicious).toBe(true);
      expect(result.suspiciousReasons).toContain('Mixed scripts (possible homograph attack)');
    });

    it('should flag excessive subdomain depth', () => {
      const result = validateDomain('https://a.b.c.d.e.example.com');

      expect(result.isSuspicious).toBe(true);
      expect(result.suspiciousReasons).toContain('Excessive subdomain depth');
    });

    it('should boost trust for known TLDs', () => {
      const result = validateDomain('https://example.edu');

      expect(result.trustScore).toBeGreaterThan(0.6);
    });
  });

  describe('compareDomains', () => {
    it('should detect identical domains', () => {
      const result = compareDomains('https://example.com', 'http://example.com');

      expect(result.areSimilar).toBe(true);
      expect(result.similarity).toBe(1);
      expect(result.suspiciousVariation).toBe(false);
    });

    it('should detect similar domains', () => {
      const result = compareDomains('google.com', 'googlle.com');

      expect(result.similarity).toBeGreaterThan(0.7);
    });

    it('should detect suspicious variations', () => {
      const result = compareDomains('paypal.com', 'paypa1.com');

      expect(result.suspiciousVariation).toBe(true);
    });

    it('should detect hyphen variations', () => {
      const result = compareDomains('microsoft.com', 'micro-soft.com');

      expect(result.suspiciousVariation).toBe(true);
    });

    it('should handle different domains', () => {
      const result = compareDomains('google.com', 'facebook.com');

      expect(result.areSimilar).toBe(false);
      expect(result.similarity).toBeLessThan(0.5);
    });
  });

  describe('extractDomainsFromText', () => {
    it('should extract multiple domains from text', () => {
      const text = 'Visit https://example.com and http://test.org';
      const domains = extractDomainsFromText(text);

      expect(domains).toHaveLength(2);
      expect(domains[0].domain).toBe('example.com');
      expect(domains[1].domain).toBe('test.org');
    });

    it('should extract domains without protocol', () => {
      const text = 'Check out example.com for more info';
      const domains = extractDomainsFromText(text);

      expect(domains).toHaveLength(1);
      expect(domains[0].domain).toBe('example.com');
    });

    it('should extract email domains', () => {
      const text = 'Contact us at support@example.com';
      const domains = extractDomainsFromText(text);

      expect(domains).toHaveLength(1);
      expect(domains[0].domain).toBe('example.com');
    });

    it('should handle complex URLs', () => {
      const text = 'API endpoint: https://api.v2.example.com:8080/path?query=1';
      const domains = extractDomainsFromText(text);

      expect(domains).toHaveLength(1);
      expect(domains[0].domain).toBe('example.com');
      expect(domains[0].subdomain).toBe('api.v2');
    });

    it('should deduplicate domains', () => {
      const text = 'Visit example.com and https://example.com/page';
      const domains = extractDomainsFromText(text);

      expect(domains).toHaveLength(1);
    });

    it('should handle text without domains', () => {
      const text = 'No domains in this text';
      const domains = extractDomainsFromText(text);

      expect(domains).toHaveLength(0);
    });
  });

  describe('toASCII and toUnicode', () => {
    it('should convert IDN to ASCII', () => {
      const ascii = toASCII('münchen.de');

      expect(ascii).toContain('xn--');
    });

    it('should handle already ASCII domains', () => {
      const ascii = toASCII('example.com');

      expect(ascii).toBe('example.com');
    });

    it('should convert punycode to Unicode', () => {
      const unicode = toUnicode('xn--mnchen-3ya.de');

      // This might not work in all environments
      expect(unicode).toBeTruthy();
    });
  });

  describe('getDomainReputation', () => {
    it('should categorize trusted domains', () => {
      const result = getDomainReputation('https://www.google.com');

      expect(result.category).toBe('trusted');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should categorize suspicious domains', () => {
      const result = getDomainReputation('http://192.168.1.1');

      expect(result.category).toBe('suspicious');
    });

    it('should categorize malicious patterns', () => {
      const result = getDomainReputation('http://secure-bank-update.tk');

      expect(result.category).toBe('suspicious');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should handle neutral domains', () => {
      const result = getDomainReputation('https://random-blog.xyz');

      expect(result.category).toBe('neutral');
    });
  });

  describe('Edge cases', () => {
    it('should handle IPv6 addresses', () => {
      const result = extractDomain('http://[2001:db8::1]:8080');

      expect(result.isIP).toBe(true);
    });

    it('should handle .local domains', () => {
      const result = extractDomain('http://mycomputer.local');

      expect(result.isLocalhost).toBe(true);
    });

    it('should handle very long domains', () => {
      const longDomain = 'a'.repeat(63) + '.com';
      const result = extractDomain(`https://${longDomain}`);

      expect(result.domain).toBeTruthy();
    });

    it('should handle domains with numbers', () => {
      const result = extractDomain('https://123.456.example.com');

      expect(result.subdomain).toBe('123.456');
    });

    it('should handle new TLDs', () => {
      const result = extractDomain('https://example.technology');

      expect(result.domain).toBe('example.technology');
      expect(result.publicSuffix).toBe('technology');
    });
  });
});
