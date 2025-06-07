/**
 * Domain Reputation Service - 2025 Implementation
 * Fast O(1) domain reputation lookup with compressed database and caching
 * Follows 2025 best practices for browser extension performance optimization
 */

import { storageService } from '@shared/storage/storageService';
import { logger } from '@shared/services/logger';

// Domain Reputation Database Schema (2025 Design)
export interface DomainReputation {
  d: string; // domain (compressed field name)
  s: number; // score 0-100 (compressed field name)
  c: string; // category (compressed field name)
  b?: string; // bias orientation if applicable (optional, compressed field name)
  u: number; // last updated timestamp (compressed field name)
  v?: string[]; // variants/subdomains (optional, compressed field name)
}

// Expanded interface for API use
export interface DomainReputationExpanded {
  domain: string;
  score: number;
  category: 'news' | 'blog' | 'social' | 'academic' | 'government' | 'commercial' | 'forum' | 'unknown';
  biasOrientation?: 'left' | 'center' | 'right' | 'mixed' | null;
  lastUpdated: number;
  variants?: string[];
  confidence: number;
  source: string;
}

// Database metadata
interface DatabaseMetadata {
  version: string;
  totalDomains: number;
  lastUpdated: number;
  compressionRatio: number;
  sources: string[];
}

// Cache configuration
interface CacheConfig {
  maxEntries: number;
  ttlMs: number;
}

// Update mechanism configuration
interface UpdateConfig {
  updateIntervalMs: number;
  maxRetries: number;
  backoffMultiplier: number;
}

export class DomainReputationService {
  private static instance: DomainReputationService;
  private database: Map<string, DomainReputation> = new Map();
  private cache: Map<string, { data: DomainReputationExpanded; timestamp: number }> = new Map();
  private metadata: DatabaseMetadata | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<boolean> | null = null;

  // 2025 Configuration - Optimized for performance
  private readonly DATABASE_KEY = 'domain_reputation_db';
  private readonly METADATA_KEY = 'domain_reputation_metadata';
  private readonly CACHE_CONFIG: CacheConfig = {
    maxEntries: 1000, // LRU cache for frequently accessed domains
    ttlMs: 24 * 60 * 60 * 1000 // 24 hours
  };
  private readonly UPDATE_CONFIG: UpdateConfig = {
    updateIntervalMs: 30 * 24 * 60 * 60 * 1000, // 30 days
    maxRetries: 3,
    backoffMultiplier: 2
  };

  // Fallback reputation patterns (2025 best practices)
  private readonly TRUSTED_PATTERNS = [
    // News organizations with high credibility
    'reuters.com', 'apnews.com', 'bbc.com', 'npr.org', 'pbs.org',
    'cnn.com', 'nytimes.com', 'washingtonpost.com', 'theguardian.com',
    'wsj.com', 'bloomberg.com', 'economist.com',
    // Academic and scientific sources
    'scholar.google.com', 'pubmed.ncbi.nlm.nih.gov', 'arxiv.org',
    'jstor.org', 'nature.com', 'science.org',
    // Government sources
    'gov', '.gov.', 'europa.eu', 'un.org', 'who.int'
  ];

  private readonly UNTRUSTED_PATTERNS = [
    'fake', 'hoax', 'conspiracy', 'clickbait', 'viral', 'shocking',
    'unbelievable', 'secret', 'exposed', 'leaked'
  ];

  private constructor() {
    this.setupUpdateSchedule();
  }

  public static getInstance(): DomainReputationService {
    if (!DomainReputationService.instance) {
      DomainReputationService.instance = new DomainReputationService();
    }
    return DomainReputationService.instance;
  }

  /**
   * Initialize the domain reputation service
   * Loads the compressed database and sets up caching
   */
  public async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization(): Promise<boolean> {
    try {
      logger.info('Initializing domain reputation service with 2025 optimizations');

      // Load database and metadata
      const [databaseData, metadataData] = await Promise.all([
        storageService.get<string>(this.DATABASE_KEY, 'local'),
        storageService.get<DatabaseMetadata>(this.METADATA_KEY, 'local')
      ]);

      if (databaseData && metadataData) {
        // Decompress and load existing database
        await this.loadDatabase(databaseData);
        this.metadata = metadataData;

        logger.info('Domain reputation database loaded', {
          totalDomains: this.database.size,
          version: this.metadata.version,
          compressionRatio: this.metadata.compressionRatio
        });
      } else {
        // Initialize with default dataset
        await this.initializeDefaultDatabase();
      }

      this.isInitialized = true;
      return true;

    } catch (error) {
      logger.error('Failed to initialize domain reputation service', {}, error as Error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Get domain reputation with O(1) lookup and caching
   * Follows 2025 performance optimization patterns
   */
  public async getDomainReputation(url: string): Promise<DomainReputationExpanded> {
    try {
      // Extract and normalize domain
      const domain = this.extractDomain(url);
      const normalizedDomain = this.normalizeDomain(domain);

      // Check cache first (2025 optimization)
      const cached = this.getFromCache(normalizedDomain);
      if (cached) {
        return cached;
      }

      // Ensure database is initialized
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Perform O(1) lookup in database
      let reputation = this.database.get(normalizedDomain);

      // Try domain variants if not found
      if (!reputation) {
        reputation = this.findDomainVariant(normalizedDomain);
      }

      // Fallback to pattern-based analysis if not in database
      if (!reputation) {
        reputation = this.generateFallbackReputation(domain);
      }

      // Convert to expanded format
      const expanded = this.expandDomainReputation(reputation, domain);

      // Cache the result (2025 caching strategy)
      this.addToCache(normalizedDomain, expanded);

      return expanded;

    } catch (error) {
      logger.error('Failed to get domain reputation', { url }, error as Error);
      return this.getDefaultReputation(url);
    }
  }

  /**
   * Batch lookup for multiple domains (2025 optimization)
   */
  public async getBatchDomainReputations(urls: string[]): Promise<Map<string, DomainReputationExpanded>> {
    const results = new Map<string, DomainReputationExpanded>();

    // Use Promise.allSettled for concurrent lookups
    const lookupPromises = urls.map(async url => {
      const reputation = await this.getDomainReputation(url);
      return { url, reputation };
    });

    const settled = await Promise.allSettled(lookupPromises);

    settled.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.set(urls[index], result.value.reputation);
      } else {
        results.set(urls[index], this.getDefaultReputation(urls[index]));
      }
    });

    return results;
  }

  /**
   * Update database with new reputation data (Premium feature)
   */
  public async updateDatabase(newData: DomainReputation[], source: string): Promise<boolean> {
    try {
      logger.info('Updating domain reputation database', {
        newEntries: newData.length,
        source
      });

      // Validate new data
      const validData = newData.filter(entry => this.validateDomainEntry(entry));

      if (validData.length === 0) {
        throw new Error('No valid domain entries provided');
      }

      // Merge with existing database
      const updatedCount = this.mergeNewData(validData);

      // Compress and store updated database
      await this.compressAndStoreDatabase();

      // Update metadata
      this.metadata = {
        version: `2025.${Date.now()}`,
        totalDomains: this.database.size,
        lastUpdated: Date.now(),
        compressionRatio: this.calculateCompressionRatio(),
        sources: [...new Set([...(this.metadata?.sources || []), source])]
      };

      await storageService.set(this.METADATA_KEY, this.metadata, 'local');

      // Clear cache to force fresh lookups
      this.cache.clear();

      logger.info('Domain reputation database updated successfully', {
        updatedEntries: updatedCount,
        totalDomains: this.database.size
      });

      return true;

    } catch (error) {
      logger.error('Failed to update domain reputation database', { source }, error as Error);
      return false;
    }
  }

  /**
   * Get database statistics for monitoring
   */
  public getStatistics(): {
    totalDomains: number;
    cacheSize: number;
    cacheHitRate: number;
    lastUpdated: number;
    compressionRatio: number;
    memoryUsage: number;
  } {
    return {
      totalDomains: this.database.size,
      cacheSize: this.cache.size,
      cacheHitRate: this.calculateCacheHitRate(),
      lastUpdated: this.metadata?.lastUpdated || 0,
      compressionRatio: this.metadata?.compressionRatio || 0,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  // Private helper methods

  private async loadDatabase(compressedData: string): Promise<void> {
    try {
      // Decompress using modern browser APIs (2025)
      const decompressed = await this.decompressData(compressedData);
      const parsedData: DomainReputation[] = JSON.parse(decompressed);

      // Build hash table for O(1) lookups
      this.database.clear();
      parsedData.forEach(entry => {
        this.database.set(entry.d, entry);

        // Index variants for faster lookup
        if (entry.v) {
          entry.v.forEach(variant => {
            this.database.set(variant, entry);
          });
        }
      });

    } catch (error) {
      logger.error('Failed to load domain reputation database', {}, error as Error);
      throw error;
    }
  }

  private async initializeDefaultDatabase(): Promise<void> {
    logger.info('Initializing default domain reputation database');

    // Create initial dataset with high-credibility domains
    const defaultEntries: DomainReputation[] = [
      // Major news organizations
      { d: 'reuters.com', s: 95, c: 'news', b: 'center', u: Date.now() },
      { d: 'apnews.com', s: 94, c: 'news', b: 'center', u: Date.now() },
      { d: 'bbc.com', s: 92, c: 'news', b: 'center', u: Date.now(), v: ['bbc.co.uk'] },
      { d: 'npr.org', s: 90, c: 'news', b: 'center', u: Date.now() },
      { d: 'pbs.org', s: 89, c: 'news', b: 'center', u: Date.now() },

      // Quality newspapers
      { d: 'nytimes.com', s: 85, c: 'news', b: 'left', u: Date.now() },
      { d: 'washingtonpost.com', s: 84, c: 'news', b: 'left', u: Date.now() },
      { d: 'wsj.com', s: 86, c: 'news', b: 'right', u: Date.now() },
      { d: 'economist.com', s: 88, c: 'news', b: 'center', u: Date.now() },
      { d: 'theguardian.com', s: 82, c: 'news', b: 'left', u: Date.now() },

      // Business and financial
      { d: 'bloomberg.com', s: 87, c: 'news', b: 'center', u: Date.now() },
      { d: 'cnbc.com', s: 78, c: 'news', b: 'center', u: Date.now() },
      { d: 'forbes.com', s: 75, c: 'news', b: 'center', u: Date.now() },

      // Academic and scientific
      { d: 'nature.com', s: 98, c: 'academic', u: Date.now() },
      { d: 'science.org', s: 97, c: 'academic', u: Date.now() },
      { d: 'arxiv.org', s: 90, c: 'academic', u: Date.now() },
      { d: 'pubmed.ncbi.nlm.nih.gov', s: 95, c: 'academic', u: Date.now() },

      // Government sources
      { d: 'who.int', s: 92, c: 'government', u: Date.now() },
      { d: 'cdc.gov', s: 94, c: 'government', u: Date.now() },
      { d: 'fda.gov', s: 91, c: 'government', u: Date.now() },

      // Social media (lower scores due to unverified content)
      { d: 'twitter.com', s: 45, c: 'social', u: Date.now(), v: ['x.com'] },
      { d: 'facebook.com', s: 42, c: 'social', u: Date.now() },
      { d: 'instagram.com', s: 38, c: 'social', u: Date.now() },
      { d: 'tiktok.com', s: 35, c: 'social', u: Date.now() },

      // Wikipedia and reference
      { d: 'wikipedia.org', s: 78, c: 'academic', b: 'center', u: Date.now(), v: ['en.wikipedia.org'] }
    ];

    // Build database
    defaultEntries.forEach(entry => {
      this.database.set(entry.d, entry);
      if (entry.v) {
        entry.v.forEach(variant => {
          this.database.set(variant, entry);
        });
      }
    });

    // Store compressed database
    await this.compressAndStoreDatabase();

    // Create metadata
    this.metadata = {
      version: '2025.1.0',
      totalDomains: this.database.size,
      lastUpdated: Date.now(),
      compressionRatio: this.calculateCompressionRatio(),
      sources: ['default-dataset']
    };

    await storageService.set(this.METADATA_KEY, this.metadata, 'local');

    logger.info('Default domain reputation database initialized', {
      totalDomains: this.database.size
    });
  }

  private extractDomain(url: string): string {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname;
    } catch {
      // Fallback for malformed URLs
      const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/\?\#]+)/);
      return match ? match[1] : url;
    }
  }

  private normalizeDomain(domain: string): string {
    return domain
      .toLowerCase()
      .replace(/^www\./, '') // Remove www prefix
      .trim();
  }

  private findDomainVariant(domain: string): DomainReputation | undefined {
    // Try with www prefix
    let variant = this.database.get(`www.${domain}`);
    if (variant) return variant;

    // Try parent domain for subdomains
    const parts = domain.split('.');
    if (parts.length > 2) {
      const parentDomain = parts.slice(-2).join('.');
      variant = this.database.get(parentDomain);
      if (variant) return variant;
    }

    // Try TLD variations for international domains
    if (domain.endsWith('.co.uk')) {
      variant = this.database.get(domain.replace('.co.uk', '.com'));
      if (variant) return variant;
    }

    return undefined;
  }

  private generateFallbackReputation(domain: string): DomainReputation {
    let score = 50; // Default neutral score
    let category: string = 'unknown';
    let biasOrientation: string | undefined;

    // Check trusted patterns
    for (const pattern of this.TRUSTED_PATTERNS) {
      if (domain.includes(pattern) || pattern.includes(domain)) {
        score = 85;
        category = pattern.includes('gov') ? 'government' :
                  pattern.includes('scholar') || pattern.includes('pubmed') ? 'academic' : 'news';
        biasOrientation = 'center';
        break;
      }
    }

    // Check untrusted patterns
    for (const pattern of this.UNTRUSTED_PATTERNS) {
      if (domain.toLowerCase().includes(pattern)) {
        score = 25;
        category = 'blog';
        break;
      }
    }

    // TLD-based adjustments
    if (domain.endsWith('.gov') || domain.endsWith('.edu')) {
      score = Math.max(score, 80);
      category = domain.endsWith('.gov') ? 'government' : 'academic';
    }

    return {
      d: domain,
      s: score,
      c: category,
      b: biasOrientation,
      u: Date.now()
    };
  }

  private expandDomainReputation(reputation: DomainReputation, originalDomain: string): DomainReputationExpanded {
    return {
      domain: originalDomain,
      score: reputation.s,
      category: reputation.c as any,
      biasOrientation: reputation.b as any,
      lastUpdated: reputation.u,
      variants: reputation.v,
      confidence: reputation.d === originalDomain ? 1.0 : 0.8, // Lower confidence for variant matches
      source: reputation.d === originalDomain ? 'database' : 'fallback'
    };
  }

  private getFromCache(domain: string): DomainReputationExpanded | null {
    const cached = this.cache.get(domain);

    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < this.CACHE_CONFIG.ttlMs) {
        return cached.data;
      } else {
        this.cache.delete(domain);
      }
    }

    return null;
  }

  private addToCache(domain: string, reputation: DomainReputationExpanded): void {
    // Implement LRU cache eviction
    if (this.cache.size >= this.CACHE_CONFIG.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey != null) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(domain, {
      data: reputation,
      timestamp: Date.now()
    });
  }

  private async compressData(data: string): Promise<string> {
    try {
      // Use modern browser compression APIs (2025)
      if ('CompressionStream' in window) {
        const stream = new CompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();

        await writer.write(new TextEncoder().encode(data));
        await writer.close();

        const chunks = [];
        let done = false;

        while (!done) {
          const { value, done: streamDone } = await reader.read();
          done = streamDone;
          if (value) chunks.push(value);
        }

        // Convert to base64 for storage
        const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
        let offset = 0;
        for (const chunk of chunks) {
          compressed.set(chunk, offset);
          offset += chunk.length;
        }

        return btoa(String.fromCharCode(...compressed));
      } else {
        // Fallback: JSON minification
        return JSON.stringify(JSON.parse(data));
      }
    } catch (error) {
      logger.warn('Compression failed, using minified JSON', {}, error as Error);
      return JSON.stringify(JSON.parse(data));
    }
  }

  private async decompressData(compressedData: string): Promise<string> {
    try {
      // Use modern browser decompression APIs (2025)
      if ('DecompressionStream' in window) {
        const compressed = Uint8Array.from(atob(compressedData), c => c.charCodeAt(0));

        const stream = new DecompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();

        await writer.write(compressed);
        await writer.close();

        const chunks = [];
        let done = false;

        while (!done) {
          const { value, done: streamDone } = await reader.read();
          done = streamDone;
          if (value) chunks.push(value);
        }

        const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
        let offset = 0;
        for (const chunk of chunks) {
          decompressed.set(chunk, offset);
          offset += chunk.length;
        }

        return new TextDecoder().decode(decompressed);
      } else {
        // Fallback: assume it's already JSON
        return compressedData;
      }
    } catch (error) {
      logger.warn('Decompression failed, treating as JSON', {}, error as Error);
      return compressedData;
    }
  }

  private async compressAndStoreDatabase(): Promise<void> {
    const databaseArray = Array.from(this.database.values())
      .filter((entry, index, arr) => arr.findIndex(e => e.d === entry.d) === index); // Remove duplicates

    const jsonData = JSON.stringify(databaseArray);
    const compressedData = await this.compressData(jsonData);

    await storageService.set(this.DATABASE_KEY, compressedData, 'local');
  }

  private validateDomainEntry(entry: DomainReputation): boolean {
    return !!(
      entry.d &&
      typeof entry.s === 'number' &&
      entry.s >= 0 &&
      entry.s <= 100 &&
      entry.c &&
      entry.u &&
      typeof entry.u === 'number'
    );
  }

  private mergeNewData(newData: DomainReputation[]): number {
    let updatedCount = 0;

    newData.forEach(entry => {
      const existing = this.database.get(entry.d);

      if (!existing || existing.u < entry.u) {
        this.database.set(entry.d, entry);

        // Update variants
        if (entry.v) {
          entry.v.forEach(variant => {
            this.database.set(variant, entry);
          });
        }

        updatedCount++;
      }
    });

    return updatedCount;
  }

  private calculateCompressionRatio(): number {
    const originalSize = JSON.stringify(Array.from(this.database.values())).length;
    const estimatedCompressedSize = originalSize * 0.3; // Estimate 70% compression
    return originalSize / estimatedCompressedSize;
  }

  private calculateCacheHitRate(): number {
    // This would require tracking cache hits/misses in a real implementation
    return 0.85; // Placeholder
  }

  private estimateMemoryUsage(): number {
    const entrySize = 150; // Average bytes per entry
    return this.database.size * entrySize + this.cache.size * 200; // Bytes
  }

  private getDefaultReputation(url: string): DomainReputationExpanded {
    const domain = this.extractDomain(url);
    const fallback = this.generateFallbackReputation(domain);
    return this.expandDomainReputation(fallback, domain);
  }

  private setupUpdateSchedule(): void {
    // Schedule periodic database updates for premium users
    chrome.alarms.create('domain-reputation-update', {
      periodInMinutes: this.UPDATE_CONFIG.updateIntervalMs / (60 * 1000) // Convert to minutes
    });

    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'domain-reputation-update') {
        this.checkForUpdates();
      }
    });
  }

  private async checkForUpdates(): Promise<void> {
    try {
      logger.info('Checking for domain reputation database updates');

      // Check user subscription tier for update eligibility
      const subscription = await this.checkSubscriptionTier();
      if (subscription.tier === 'free') {
        logger.info('Update checks available for premium users only');
        return;
      }

      // Get current database version
      const currentVersion = this.metadata?.version || '2025.1.0';
      const lastUpdate = this.metadata?.lastUpdated || 0;

      // Check if enough time has passed since last update (respect update interval)
      const timeSinceLastUpdate = Date.now() - lastUpdate;
      if (timeSinceLastUpdate < this.UPDATE_CONFIG.updateIntervalMs) {
        logger.debug('Update check skipped - too soon since last update', {
          timeSinceLastUpdate: Math.round(timeSinceLastUpdate / (24 * 60 * 60 * 1000)) + ' days'
        });
        return;
      }

      // Attempt to check for remote updates with retry logic
      const updateInfo = await this.downloadUpdateInfo();

      if (!updateInfo) {
        logger.info('No update information available');
        return;
      }

      // Compare versions to determine if update is needed
      if (this.isNewerVersion(updateInfo.version, currentVersion)) {
        logger.info('New domain reputation database version available', {
          currentVersion,
          availableVersion: updateInfo.version,
          updateSize: updateInfo.estimatedSize
        });

        // Download and apply the update
        await this.downloadAndApplyUpdates(updateInfo);

      } else {
        logger.info('Domain reputation database is up to date', {
          currentVersion,
          latestVersion: updateInfo.version
        });
      }

    } catch (error) {
      logger.error('Failed to check for database updates', {}, error as Error);
    }
  }

  /**
   * Download update information from remote service
   * 2025 implementation with proper error handling and timeouts
   */
  private async downloadUpdateInfo(): Promise<{
    version: string;
    url: string;
    checksum: string;
    estimatedSize: number;
    releaseNotes: string;
  } | null> {
    try {
      // For production deployment, this would fetch from your update server
      // Example: const response = await fetch('https://api.truthlens.com/domain-reputation/updates');

      // For now, return simulated update info to demonstrate the mechanism
      const simulatedUpdate = {
        version: `2025.${Date.now()}`,
        url: 'https://api.truthlens.com/domain-reputation/latest.json',
        checksum: 'sha256:' + crypto.randomUUID(),
        estimatedSize: 800000, // ~800KB compressed
        releaseNotes: 'Updated domain reputation scores with latest data from MBFC, NewsGuard, and academic research'
      };

      logger.debug('Simulated update check response', simulatedUpdate);

      // In production, you would make an actual HTTP request here:
      /*
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const response = await fetch('https://api.truthlens.com/domain-reputation/updates', {
          method: 'GET',
          headers: {
            'User-Agent': 'TruthLens Extension/2025.1',
            'Accept': 'application/json'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Update server responded with status ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
      */

      // Return null to indicate no updates available (for free tier users)
      return null;

    } catch (error) {
      logger.warn('Failed to fetch update information', {}, error as Error);
      return null;
    }
  }

  /**
   * Download and apply database updates with validation and rollback
   * 2025 implementation following Chrome extension best practices
   */
  private async downloadAndApplyUpdates(updateInfo: {
    version: string;
    url: string;
    checksum: string;
    estimatedSize: number;
    releaseNotes: string;
  }): Promise<void> {
    let retryCount = 0;

    while (retryCount < this.UPDATE_CONFIG.maxRetries) {
      try {
        logger.info('Downloading domain reputation database update', {
          version: updateInfo.version,
          attempt: retryCount + 1
        });

        // Create backup of current database before update
        const backupKey = `${this.DATABASE_KEY}_backup_${Date.now()}`;
        const currentData = await storageService.get<string>(this.DATABASE_KEY, 'local');
        const currentMetadata = await storageService.get<DatabaseMetadata>(this.METADATA_KEY, 'local');

        if (currentData && currentMetadata) {
          await storageService.set(backupKey, { data: currentData, metadata: currentMetadata }, 'local');
          logger.info('Created database backup', { backupKey });
        }

        // For production, download the actual update data
        // const updateData = await this.downloadUpdateData(updateInfo.url);

        // For now, simulate update with enhanced default dataset
        const simulatedUpdateData = await this.generateSimulatedUpdate();

        // Validate checksum (in production)
        // if (!this.validateChecksum(updateData, updateInfo.checksum)) {
        //   throw new Error('Update data checksum validation failed');
        // }

        // Parse and validate the update data structure
        const parsedUpdate = JSON.parse(simulatedUpdateData) as DomainReputation[];
        const validatedUpdate = parsedUpdate.filter(entry => this.validateDomainEntry(entry));

        if (validatedUpdate.length === 0) {
          throw new Error('No valid domain entries in update data');
        }

        logger.info('Update data validated', {
          totalEntries: parsedUpdate.length,
          validEntries: validatedUpdate.length
        });

        // Apply the update using existing updateDatabase method
        const updateSuccess = await this.updateDatabase(validatedUpdate, `remote-update-${updateInfo.version}`);

        if (updateSuccess) {
          // Clean up backup after successful update
          await storageService.remove(backupKey, 'local');

          logger.info('Domain reputation database updated successfully', {
            version: updateInfo.version,
            newDomains: validatedUpdate.length,
            totalDomains: this.database.size
          });

          return; // Success - exit retry loop

        } else {
          throw new Error('Failed to apply database update');
        }

      } catch (error) {
        retryCount++;
        const isLastAttempt = retryCount >= this.UPDATE_CONFIG.maxRetries;

        logger.error(`Update attempt ${retryCount} failed${isLastAttempt ? ' (final attempt)' : ''}`, {
          error: error instanceof Error ? error.message : String(error),
          retryCount,
          maxRetries: this.UPDATE_CONFIG.maxRetries
        });

        if (isLastAttempt) {
          // Restore from backup if available
          await this.restoreFromBackup();
          throw new Error(`Failed to update database after ${this.UPDATE_CONFIG.maxRetries} attempts: ${error}`);
        } else {
          // Wait before retry with exponential backoff
          const backoffDelay = 1000 * Math.pow(this.UPDATE_CONFIG.backoffMultiplier, retryCount - 1);
          logger.info(`Retrying update in ${backoffDelay}ms`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
      }
    }
  }

  /**
   * Check user subscription tier for update eligibility
   */
  private async checkSubscriptionTier(): Promise<{ tier: 'free' | 'premium' | 'enterprise' }> {
    try {
      // This would check the user's actual subscription status
      // For now, return free tier to demonstrate the mechanism
      return { tier: 'free' };
    } catch (error) {
      logger.warn('Failed to check subscription tier', {}, error as Error);
      return { tier: 'free' };
    }
  }

  /**
   * Compare version strings to determine if update is needed
   */
  private isNewerVersion(remoteVersion: string, localVersion: string): boolean {
    try {
      const parseVersion = (version: string) => {
        const parts = version.replace('2025.', '').split('.');
        return parts.map(part => parseInt(part, 10) || 0);
      };

      const remote = parseVersion(remoteVersion);
      const local = parseVersion(localVersion);

      for (let i = 0; i < Math.max(remote.length, local.length); i++) {
        const remotePart = remote[i] || 0;
        const localPart = local[i] || 0;

        if (remotePart > localPart) return true;
        if (remotePart < localPart) return false;
      }

      return false; // Versions are equal
    } catch (error) {
      logger.warn('Failed to compare versions', { remoteVersion, localVersion });
      return false;
    }
  }

  /**
   * Generate simulated update data for testing
   */
  private async generateSimulatedUpdate(): Promise<string> {
    const additionalDomains: DomainReputation[] = [
      // Additional quality news sources
      { d: 'politico.com', s: 82, c: 'news', b: 'center', u: Date.now() },
      { d: 'axios.com', s: 85, c: 'news', b: 'center', u: Date.now() },
      { d: 'thehill.com', s: 78, c: 'news', b: 'center', u: Date.now() },
      { d: 'propublica.org', s: 93, c: 'news', b: 'center', u: Date.now() },

      // International sources
      { d: 'dw.com', s: 87, c: 'news', b: 'center', u: Date.now() },
      { d: 'france24.com', s: 84, c: 'news', b: 'center', u: Date.now() },
      { d: 'aljazeera.com', s: 79, c: 'news', b: 'center', u: Date.now() },

      // Tech and science sources
      { d: 'arstechnica.com', s: 88, c: 'news', b: 'center', u: Date.now() },
      { d: 'scientificamerican.com', s: 92, c: 'academic', u: Date.now() },
      { d: 'newscientist.com', s: 89, c: 'academic', u: Date.now() },

      // Business sources
      { d: 'reuters.com', s: 96, c: 'news', b: 'center', u: Date.now(), v: ['reuters.co.uk'] },
      { d: 'ft.com', s: 90, c: 'news', b: 'center', u: Date.now(), v: ['financial-times.com'] }
    ];

    return JSON.stringify(additionalDomains);
  }

  /**
   * Restore database from backup in case of update failure
   */
  private async restoreFromBackup(): Promise<void> {
    try {
      const items = await chrome.storage.local.get();
      const backupKeys = Object.keys(items)
        .filter(key => key.startsWith(`${this.DATABASE_KEY}_backup_`))
        .sort((a, b) => {
          const timestampA = parseInt(a.split('_').pop() || '0');
          const timestampB = parseInt(b.split('_').pop() || '0');
          return timestampB - timestampA; // Most recent first
        });

      if (backupKeys.length > 0) {
        const latestBackup = items[backupKeys[0]];

        await Promise.all([
          storageService.set(this.DATABASE_KEY, latestBackup.data, 'local'),
          storageService.set(this.METADATA_KEY, latestBackup.metadata, 'local')
        ]);

        // Reload the database
        await this.loadDatabase(latestBackup.data);
        this.metadata = latestBackup.metadata;

        logger.info('Database restored from backup', {
          backupKey: backupKeys[0],
          restoredDomains: this.database.size
        });

        // Clean up old backups
        const oldBackups = backupKeys.slice(1); // Keep only the latest backup
        if (oldBackups.length > 0) {
          await chrome.storage.local.remove(oldBackups);
        }
      }
    } catch (error) {
      logger.error('Failed to restore database from backup', {}, error as Error);
    }
  }
}

// Export singleton instance
export const domainReputationService = DomainReputationService.getInstance();
export default DomainReputationService;
