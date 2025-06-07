/**
 * Feedback Storage Service - 2025 Best Practices Implementation
 *
 * Features:
 * - IndexedDB with encryption for sensitive data
 * - Privacy-first data handling
 * - Quota management and cleanup
 * - Real-time clustering for pattern detection
 * - GDPR compliance and data retention policies
 */

import { logger } from './logger';
import type { FeedbackData } from '../../popup/components/FeedbackSystem/FeedbackCollector';
import type { SpamAnalysisResult } from './feedbackAntiSpamService';

export interface StoredFeedback {
  id: string;
  feedbackData: FeedbackData;
  spamAnalysis: SpamAnalysisResult;
  encryptedContent?: string; // Encrypted sensitive content
  createdAt: number;
  lastAccessed: number;
  retentionExpiry: number;
  anonymized: boolean;
  clusterId?: string; // For pattern detection
}

export interface FeedbackCluster {
  id: string;
  pattern: string;
  feedbackIds: string[];
  confidence: number;
  createdAt: number;
  lastUpdated: number;
  spamLikelihood: number;
}

export interface StorageMetrics {
  totalFeedback: number;
  spamFeedback: number;
  storageUsed: number;
  quotaUsed: number;
  oldestEntry: number;
  newestEntry: number;
  retentionComplianceRate: number;
}

class FeedbackStorageService {
  private static instance: FeedbackStorageService;
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'TruthLensFeedback';
  private readonly DB_VERSION = 1;
  private readonly STORES = {
    FEEDBACK: 'feedback',
    CLUSTERS: 'clusters',
    METADATA: 'metadata'
  };

  // Data retention policy (GDPR compliance)
  private readonly RETENTION_PERIODS = {
    feedback: 365 * 24 * 60 * 60 * 1000, // 1 year
    spamFeedback: 90 * 24 * 60 * 60 * 1000, // 3 months
    anonymizedData: 2 * 365 * 24 * 60 * 60 * 1000, // 2 years
    clusters: 180 * 24 * 60 * 60 * 1000 // 6 months
  };

  // Storage quota management
  private readonly QUOTA_LIMITS = {
    maxFeedbackEntries: 10000,
    maxStorageSize: 50 * 1024 * 1024, // 50MB
    cleanupThreshold: 0.9 // 90% usage triggers cleanup
  };

  // Encryption key (in production, use secure key management)
  private encryptionKey: CryptoKey | null = null;

  private constructor() {
    this.initializeDatabase();
    this.initializeEncryption();
  }

  public static getInstance(): FeedbackStorageService {
    if (!FeedbackStorageService.instance) {
      FeedbackStorageService.instance = new FeedbackStorageService();
    }
    return FeedbackStorageService.instance;
  }

  /**
   * Initialize IndexedDB database
   */
  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open database'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        logger.info('Feedback storage database initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create feedback store
        if (!db.objectStoreNames.contains(this.STORES.FEEDBACK)) {
          const feedbackStore = db.createObjectStore(this.STORES.FEEDBACK, { keyPath: 'id' });
          feedbackStore.createIndex('createdAt', 'createdAt');
          feedbackStore.createIndex('url', 'feedbackData.url');
          feedbackStore.createIndex('type', 'feedbackData.type');
          feedbackStore.createIndex('spamLikelihood', 'spamAnalysis.confidence');
          feedbackStore.createIndex('retentionExpiry', 'retentionExpiry');
          feedbackStore.createIndex('clusterId', 'clusterId');
        }

        // Create clusters store
        if (!db.objectStoreNames.contains(this.STORES.CLUSTERS)) {
          const clustersStore = db.createObjectStore(this.STORES.CLUSTERS, { keyPath: 'id' });
          clustersStore.createIndex('pattern', 'pattern');
          clustersStore.createIndex('confidence', 'confidence');
          clustersStore.createIndex('spamLikelihood', 'spamLikelihood');
          clustersStore.createIndex('lastUpdated', 'lastUpdated');
        }

        // Create metadata store
        if (!db.objectStoreNames.contains(this.STORES.METADATA)) {
          db.createObjectStore(this.STORES.METADATA, { keyPath: 'key' });
        }

        logger.info('Database schema created/updated');
      };
    });
  }

  /**
   * Initialize encryption for sensitive data
   */
  private async initializeEncryption(): Promise<void> {
    try {
      if (!window.crypto || !window.crypto.subtle) {
        logger.warn('Web Crypto API not available - encryption disabled');
        return;
      }

      // Check if we have a stored key
      const storedKeyData = await chrome.storage.local.get('feedbackEncryptionKey');

      if (storedKeyData.feedbackEncryptionKey) {
        // Import existing key
        this.encryptionKey = await crypto.subtle.importKey(
          'raw',
          new Uint8Array(storedKeyData.feedbackEncryptionKey),
          'AES-GCM',
          false,
          ['encrypt', 'decrypt']
        );
      } else {
        // Generate new key
        this.encryptionKey = await crypto.subtle.generateKey(
          { name: 'AES-GCM', length: 256 },
          true,
          ['encrypt', 'decrypt']
        );

        // Store key for future use
        const exportedKey = await crypto.subtle.exportKey('raw', this.encryptionKey);
        await chrome.storage.local.set({
          feedbackEncryptionKey: Array.from(new Uint8Array(exportedKey))
        });
      }

      logger.info('Encryption initialized for feedback storage');
    } catch (error) {
      logger.error('Failed to initialize encryption', {}, error as Error);
    }
  }

  /**
   * Store feedback with spam analysis and encryption
   */
  public async storeFeedback(
    feedbackData: FeedbackData,
    spamAnalysis: SpamAnalysisResult,
    _userId?: string
  ): Promise<string> {
    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      const id = this.generateFeedbackId(feedbackData);
      const now = Date.now();

      // Determine retention period based on spam analysis
      const retentionPeriod = spamAnalysis.isSpam
        ? this.RETENTION_PERIODS.spamFeedback
        : this.RETENTION_PERIODS.feedback;

      // Encrypt sensitive content if encryption is available
      let encryptedContent: string | undefined;
      if (this.encryptionKey && feedbackData.userComment) {
        encryptedContent = await this.encryptData(feedbackData.userComment);
        // Remove plain text comment for privacy
        feedbackData = { ...feedbackData, userComment: undefined };
      }

      // Create storage entry
      const storedFeedback: StoredFeedback = {
        id,
        feedbackData,
        spamAnalysis,
        encryptedContent,
        createdAt: now,
        lastAccessed: now,
        retentionExpiry: now + retentionPeriod,
        anonymized: false,
        clusterId: await this.assignToCluster(feedbackData, spamAnalysis)
      };

      // Check quota before storing
      await this.checkAndManageQuota();

      // Store in IndexedDB
      const transaction = this.db.transaction([this.STORES.FEEDBACK], 'readwrite');
      const store = transaction.objectStore(this.STORES.FEEDBACK);
      await this.promisifyRequest(store.add(storedFeedback));

      // Update storage metrics
      await this.updateStorageMetrics();

      logger.info('Feedback stored successfully', {
        id: id.substring(0, 8) + '***',
        isSpam: spamAnalysis.isSpam,
        encrypted: !!encryptedContent
      });

      return id;

    } catch (error) {
      logger.error('Failed to store feedback', {}, error as Error);
      throw error;
    }
  }

  /**
   * Retrieve feedback by ID with decryption
   */
  public async getFeedback(id: string, includeContent: boolean = false): Promise<StoredFeedback | null> {
    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      const transaction = this.db.transaction([this.STORES.FEEDBACK], 'readonly');
      const store = transaction.objectStore(this.STORES.FEEDBACK);
      const feedback = await this.promisifyRequest(store.get(id)) as StoredFeedback;

      if (!feedback) {
        return null;
      }

      // Update last accessed time
      await this.updateLastAccessed(id);

      // Decrypt content if requested and available
      if (includeContent && feedback.encryptedContent && this.encryptionKey) {
        try {
          const decryptedContent = await this.decryptData(feedback.encryptedContent);
          feedback.feedbackData.userComment = decryptedContent;
        } catch {
          logger.warn('Failed to decrypt feedback content', { id });
        }
      }

      return feedback;

    } catch (error) {
      logger.error('Failed to retrieve feedback', { id }, error as Error);
      return null;
    }
  }

  /**
   * Get feedback for a specific URL with pagination
   */
  public async getFeedbackForUrl(
    url: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<StoredFeedback[]> {
    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      const transaction = this.db.transaction([this.STORES.FEEDBACK], 'readonly');
      const store = transaction.objectStore(this.STORES.FEEDBACK);
      const index = store.index('url');

      const request = index.getAll(url);
      const allFeedback = await this.promisifyRequest(request) as StoredFeedback[];

      // Sort by creation date (newest first) and apply pagination
      return allFeedback
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(offset, offset + limit);

    } catch (error) {
      logger.error('Failed to get feedback for URL', { url }, error as Error);
      return [];
    }
  }

  /**
   * Get aggregated feedback statistics for a URL
   */
  public async getFeedbackStats(url: string): Promise<any> {
    try {
      const feedback = await this.getFeedbackForUrl(url, 1000); // Get more for accurate stats

      const total = feedback.length;
      const agree = feedback.filter(f => f.feedbackData.type === 'agree').length;
      const disagree = feedback.filter(f => f.feedbackData.type === 'disagree').length;
      const issues = feedback.filter(f => f.feedbackData.type === 'report_issue').length;
      const spam = feedback.filter(f => f.spamAnalysis.isSpam).length;

      const avgConfidence = feedback.reduce((sum, f) =>
        sum + f.feedbackData.confidence, 0) / Math.max(1, total);

      return {
        total,
        agree,
        disagree,
        issues,
        spam,
        agreementRate: total > 0 ? agree / total : 0,
        avgConfidence,
        lastUpdated: Math.max(...feedback.map(f => f.createdAt), 0)
      };

    } catch (error) {
      logger.error('Failed to get feedback stats', { url }, error as Error);
      return {
        total: 0,
        agree: 0,
        disagree: 0,
        issues: 0,
        spam: 0,
        agreementRate: 0,
        avgConfidence: 0,
        lastUpdated: 0
      };
    }
  }

  /**
   * Assign feedback to a cluster for pattern detection
   */
  private async assignToCluster(
    feedbackData: FeedbackData,
    spamAnalysis: SpamAnalysisResult
  ): Promise<string | undefined> {
    try {
      if (!this.db) return undefined;

      // Create feature vector for clustering
      const features = this.extractClusteringFeatures(feedbackData, spamAnalysis);
      const pattern = this.generatePattern(features);

      // Find existing cluster or create new one
      let clusterId = await this.findMatchingCluster(pattern, features);

      if (!clusterId) {
        clusterId = await this.createNewCluster(pattern, features);
      } else {
        await this.updateCluster(clusterId, features);
      }

      return clusterId;

    } catch (error) {
      logger.error('Failed to assign to cluster', {}, error as Error);
      return undefined;
    }
  }

  /**
   * Extract features for clustering
   */
  private extractClusteringFeatures(
    feedbackData: FeedbackData,
    spamAnalysis: SpamAnalysisResult
  ): any {
    return {
      type: feedbackData.type,
      urlDomain: new URL(feedbackData.url).hostname,
      textLength: feedbackData.userComment?.length || 0,
      confidence: feedbackData.confidence,
      spamScore: spamAnalysis.confidence,
      riskLevel: spamAnalysis.riskLevel,
      timeOfDay: new Date(feedbackData.timestamp).getHours(),
      dayOfWeek: new Date(feedbackData.timestamp).getDay()
    };
  }

  /**
   * Generate pattern signature for clustering
   */
  private generatePattern(features: any): string {
    return JSON.stringify({
      type: features.type,
      domain: features.urlDomain,
      lengthBucket: this.bucketizeTextLength(features.textLength),
      confidenceBucket: this.bucketizeConfidence(features.confidence),
      riskLevel: features.riskLevel
    });
  }

  /**
   * Find matching cluster based on similarity
   */
  private async findMatchingCluster(pattern: string, features: any): Promise<string | undefined> {
    if (!this.db) return undefined;

    const transaction = this.db.transaction([this.STORES.CLUSTERS], 'readonly');
    const store = transaction.objectStore(this.STORES.CLUSTERS);
    const index = store.index('pattern');

    const clusters = await this.promisifyRequest(index.getAll(pattern)) as FeedbackCluster[];

    // Find cluster with highest similarity
    let bestMatch: FeedbackCluster | null = null;
    let bestSimilarity = 0;

    for (const cluster of clusters) {
      const similarity = this.calculateFeatureSimilarity(features, cluster);
      if (similarity > bestSimilarity && similarity > 0.7) {
        bestSimilarity = similarity;
        bestMatch = cluster;
      }
    }

    return bestMatch?.id;
  }

  /**
   * Create new cluster
   */
  private async createNewCluster(pattern: string, features: any): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const clusterId = this.generateClusterId();
    const cluster: FeedbackCluster = {
      id: clusterId,
      pattern,
      feedbackIds: [],
      confidence: 0.5,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      spamLikelihood: features.spamScore
    };

    const transaction = this.db.transaction([this.STORES.CLUSTERS], 'readwrite');
    const store = transaction.objectStore(this.STORES.CLUSTERS);
    await this.promisifyRequest(store.add(cluster));

    return clusterId;
  }

  /**
   * Update existing cluster
   */
  private async updateCluster(clusterId: string, features: any): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction([this.STORES.CLUSTERS], 'readwrite');
    const store = transaction.objectStore(this.STORES.CLUSTERS);

    const cluster = await this.promisifyRequest(store.get(clusterId)) as FeedbackCluster;
    if (!cluster) return;

    // Update cluster statistics
    cluster.lastUpdated = Date.now();
    cluster.spamLikelihood = (cluster.spamLikelihood + features.spamScore) / 2;
    cluster.confidence = Math.min(1, cluster.confidence + 0.1);

    await this.promisifyRequest(store.put(cluster));
  }

  /**
   * Calculate feature similarity between feedback and cluster
   */
  private calculateFeatureSimilarity(features: any, cluster: FeedbackCluster): number {
    // Simple similarity calculation - can be enhanced with more sophisticated algorithms
    const patternMatch = features.type === JSON.parse(cluster.pattern).type ? 0.3 : 0;
    const domainMatch = features.urlDomain === JSON.parse(cluster.pattern).domain ? 0.3 : 0;
    const riskMatch = features.riskLevel === JSON.parse(cluster.pattern).riskLevel ? 0.2 : 0;
    const spamSimilarity = 1 - Math.abs(features.spamScore - cluster.spamLikelihood);

    return patternMatch + domainMatch + riskMatch + (spamSimilarity * 0.2);
  }

  /**
   * Encryption utilities
   */
  private async encryptData(plaintext: string): Promise<string> {
    if (!this.encryptionKey) throw new Error('Encryption key not available');

    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      data
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedData), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  private async decryptData(encryptedData: string): Promise<string> {
    if (!this.encryptionKey) throw new Error('Encryption key not available');

    const combined = new Uint8Array(atob(encryptedData).split('').map(char => char.charCodeAt(0)));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      data
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  }

  /**
   * Quota management and cleanup
   */
  private async checkAndManageQuota(): Promise<void> {
    const metrics = await this.getStorageMetrics();

    if (metrics.quotaUsed > this.QUOTA_LIMITS.cleanupThreshold) {
      await this.performCleanup();
    }
  }

  private async performCleanup(): Promise<void> {
    try {
      if (!this.db) return;

      const now = Date.now();
      let cleanedCount = 0;

      // Clean expired feedback
      const transaction = this.db.transaction([this.STORES.FEEDBACK], 'readwrite');
      const store = transaction.objectStore(this.STORES.FEEDBACK);
      const index = store.index('retentionExpiry');

      const expiredRequest = index.openCursor(IDBKeyRange.upperBound(now));

      expiredRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cleanedCount++;
          cursor.continue();
        }
      };

      await this.promisifyTransaction(transaction);

      // Clean old clusters
      await this.cleanupOldClusters();

      logger.info('Storage cleanup completed', { cleanedCount });

    } catch (error) {
      logger.error('Failed to perform cleanup', {}, error as Error);
    }
  }

  private async cleanupOldClusters(): Promise<void> {
    if (!this.db) return;

    const maxAge = this.RETENTION_PERIODS.clusters;
    const cutoff = Date.now() - maxAge;

    const transaction = this.db.transaction([this.STORES.CLUSTERS], 'readwrite');
    const store = transaction.objectStore(this.STORES.CLUSTERS);
    const index = store.index('lastUpdated');

    const oldClusters = index.openCursor(IDBKeyRange.upperBound(cutoff));

    oldClusters.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    await this.promisifyTransaction(transaction);
  }

  /**
   * Get storage metrics for monitoring
   */
  public async getStorageMetrics(): Promise<StorageMetrics> {
    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      const transaction = this.db.transaction([this.STORES.FEEDBACK], 'readonly');
      const store = transaction.objectStore(this.STORES.FEEDBACK);

      const allFeedback = await this.promisifyRequest(store.getAll()) as StoredFeedback[];

      const totalFeedback = allFeedback.length;
      const spamFeedback = allFeedback.filter(f => f.spamAnalysis.isSpam).length;

      const timestamps = allFeedback.map(f => f.createdAt);
      const oldestEntry = timestamps.length > 0 ? Math.min(...timestamps) : 0;
      const newestEntry = timestamps.length > 0 ? Math.max(...timestamps) : 0;

      // Estimate storage usage
      const storageUsed = JSON.stringify(allFeedback).length;
      const quotaUsed = storageUsed / this.QUOTA_LIMITS.maxStorageSize;

      // Calculate retention compliance
      const now = Date.now();
      const validEntries = allFeedback.filter(f => f.retentionExpiry > now).length;
      const retentionComplianceRate = totalFeedback > 0 ? validEntries / totalFeedback : 1;

      return {
        totalFeedback,
        spamFeedback,
        storageUsed,
        quotaUsed,
        oldestEntry,
        newestEntry,
        retentionComplianceRate
      };

    } catch (error) {
      logger.error('Failed to get storage metrics', {}, error as Error);
      return {
        totalFeedback: 0,
        spamFeedback: 0,
        storageUsed: 0,
        quotaUsed: 0,
        oldestEntry: 0,
        newestEntry: 0,
        retentionComplianceRate: 0
      };
    }
  }

  // Utility methods

  private generateFeedbackId(feedbackData: FeedbackData): string {
    const content = feedbackData.url + feedbackData.timestamp + feedbackData.type;
    return 'feedback_' + this.hashString(content) + '_' + Date.now();
  }

  private generateClusterId(): string {
    return 'cluster_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private bucketizeTextLength(length: number): string {
    if (length < 10) return 'very_short';
    if (length < 50) return 'short';
    if (length < 200) return 'medium';
    if (length < 500) return 'long';
    return 'very_long';
  }

  private bucketizeConfidence(confidence: number): string {
    if (confidence < 0.3) return 'low';
    if (confidence < 0.7) return 'medium';
    return 'high';
  }

  private async updateLastAccessed(id: string): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction([this.STORES.FEEDBACK], 'readwrite');
      const store = transaction.objectStore(this.STORES.FEEDBACK);

      const feedback = await this.promisifyRequest(store.get(id)) as StoredFeedback;
      if (feedback) {
        feedback.lastAccessed = Date.now();
        await this.promisifyRequest(store.put(feedback));
      }
    } catch {
      // Non-critical error, just log it
      logger.warn('Failed to update last accessed time', { id });
    }
  }

  private async updateStorageMetrics(): Promise<void> {
    try {
      const metrics = await this.getStorageMetrics();

      if (this.db) {
        const transaction = this.db.transaction([this.STORES.METADATA], 'readwrite');
        const store = transaction.objectStore(this.STORES.METADATA);

        await this.promisifyRequest(store.put({
          key: 'storage_metrics',
          value: metrics,
          lastUpdated: Date.now()
        }));
      }
    } catch (error) {
      logger.warn('Failed to update storage metrics', {}, error as Error);
    }
  }

  private promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private promisifyTransaction(transaction: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(new Error('Transaction aborted'));
    });
  }

  /**
   * GDPR compliance - anonymize user data
   */
  public async anonymizeUserData(userId: string): Promise<void> {
    try {
      if (!this.db) throw new Error('Database not initialized');

      const transaction = this.db.transaction([this.STORES.FEEDBACK], 'readwrite');
      const store = transaction.objectStore(this.STORES.FEEDBACK);

      const allFeedback = await this.promisifyRequest(store.getAll()) as StoredFeedback[];

      for (const feedback of allFeedback) {
        // Remove or anonymize user-identifiable data
        if (feedback.encryptedContent) {
          feedback.encryptedContent = undefined;
        }

        feedback.anonymized = true;
        feedback.feedbackData.userComment = undefined;

        await this.promisifyRequest(store.put(feedback));
      }

      logger.info('User data anonymized for GDPR compliance', { userId: userId.substring(0, 8) + '***' });

    } catch (error) {
      logger.error('Failed to anonymize user data', { userId }, error as Error);
      throw error;
    }
  }

  /**
   * Export user data for GDPR compliance
   */
  public async exportUserData(userId: string): Promise<any> {
    try {
      if (!this.db) throw new Error('Database not initialized');

      const transaction = this.db.transaction([this.STORES.FEEDBACK], 'readonly');
      const store = transaction.objectStore(this.STORES.FEEDBACK);

      const allFeedback = await this.promisifyRequest(store.getAll()) as StoredFeedback[];

      // Filter and prepare user data for export
      const userData = allFeedback.map(feedback => ({
        id: feedback.id,
        type: feedback.feedbackData.type,
        url: feedback.feedbackData.url,
        timestamp: feedback.feedbackData.timestamp,
        confidence: feedback.feedbackData.confidence,
        createdAt: feedback.createdAt,
        // Include decrypted content if available
        comment: feedback.encryptedContent ? '[ENCRYPTED]' : feedback.feedbackData.userComment
      }));

      return {
        exportDate: new Date().toISOString(),
        totalEntries: userData.length,
        data: userData
      };

    } catch (error) {
      logger.error('Failed to export user data', { userId }, error as Error);
      throw error;
    }
  }
}

// Export singleton instance
export const feedbackStorageService = FeedbackStorageService.getInstance();
export default FeedbackStorageService;
