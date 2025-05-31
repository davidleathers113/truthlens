/**
 * Performance Storage - IndexedDB with Memory Leak Prevention
 * 2025 Best Practices with proper cleanup and compression
 */

import { PerformanceMeasurement, PerformanceReport } from './types';

interface StorageConfig {
  maxEntries: number;
  retentionDays: number;
  compressionEnabled: boolean;
}

interface StoredMeasurement extends PerformanceMeasurement {
  compressed?: boolean;
}

export class PerformanceStorage {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'TruthLensPerformance';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'measurements';
  private config: StorageConfig;
  private cleanupTimer: number | null = null;

  constructor(config: StorageConfig) {
    this.config = config;
  }

  public async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        console.error('[PerformanceStorage] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.setupCleanupSchedule();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create measurements store
        const store = db.createObjectStore(this.STORE_NAME, { 
          keyPath: 'id',
          autoIncrement: false 
        });
        
        // Create indexes for efficient querying
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('context_url', 'context.url', { unique: false });
        
        console.log('[PerformanceStorage] Database structure created');
      };
    });
  }

  private setupCleanupSchedule(): void {
    // Run cleanup every hour
    const cleanupInterval = 60 * 60 * 1000; // 1 hour
    
    this.cleanupTimer = window.setInterval(() => {
      this.performCleanup();
    }, cleanupInterval);

    // Initial cleanup
    this.performCleanup();
  }

  private async performCleanup(): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('timestamp');

      // Calculate cutoff time for retention
      const cutoffTime = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);
      
      // Get old entries
      const oldEntriesRequest = index.openCursor(IDBKeyRange.upperBound(cutoffTime));
      
      let deletedCount = 0;
      
      oldEntriesRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        }
      };

      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => {
          if (deletedCount > 0) {
            console.log(`[PerformanceStorage] Cleaned up ${deletedCount} old entries`);
          }
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      });

      // Check total entry count and remove oldest if necessary
      await this.enforceMaxEntries();

    } catch (error) {
      console.error('[PerformanceStorage] Cleanup failed:', error);
    }
  }

  private async enforceMaxEntries(): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      // Count total entries
      const countRequest = store.count();
      
      await new Promise<void>((resolve, reject) => {
        countRequest.onsuccess = async () => {
          const totalCount = countRequest.result;
          
          if (totalCount > this.config.maxEntries) {
            const excessCount = totalCount - this.config.maxEntries;
            
            // Delete oldest entries
            const index = store.index('timestamp');
            const cursor = index.openCursor();
            let deletedCount = 0;
            
            cursor.onsuccess = (event) => {
              const cursorResult = (event.target as IDBRequest).result;
              if (cursorResult && deletedCount < excessCount) {
                cursorResult.delete();
                deletedCount++;
                cursorResult.continue();
              }
            };
          }
          resolve();
        };
        countRequest.onerror = () => reject(countRequest.error);
      });

    } catch (error) {
      console.error('[PerformanceStorage] Failed to enforce max entries:', error);
    }
  }

  public async storeMeasurement(measurement: PerformanceMeasurement): Promise<void> {
    if (!this.db) {
      console.warn('[PerformanceStorage] Database not initialized');
      return;
    }

    try {
      const storedMeasurement: StoredMeasurement = this.config.compressionEnabled 
        ? this.compressMeasurement(measurement)
        : measurement;

      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      const request = store.add(storedMeasurement);
      
      await new Promise<void>((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => {
          console.error('[PerformanceStorage] Failed to store measurement:', request.error);
          reject(request.error);
        };
      });

    } catch (error) {
      console.error('[PerformanceStorage] Store measurement error:', error);
    }
  }

  private compressMeasurement(measurement: PerformanceMeasurement): StoredMeasurement {
    // Simple compression - remove non-essential fields and compress strings
    const compressed: StoredMeasurement = {
      ...measurement,
      compressed: true,
      context: {
        userAgent: measurement.context.userAgent.substring(0, 50), // Truncate
        viewport: measurement.context.viewport,
        // Remove optional fields if not critical
        ...(measurement.context.url && { url: measurement.context.url }),
        ...(measurement.context.deviceMemory && { deviceMemory: measurement.context.deviceMemory })
      }
    };

    // Compress metadata if present
    if (measurement.metadata) {
      compressed.metadata = this.compressMetadata(measurement.metadata);
    }

    return compressed;
  }

  private compressMetadata(metadata: Record<string, any>): Record<string, any> {
    const compressed: Record<string, any> = {};
    
    Object.entries(metadata).forEach(([key, value]) => {
      if (typeof value === 'string' && value.length > 100) {
        compressed[key] = value.substring(0, 100) + '...';
      } else if (typeof value === 'object' && value !== null) {
        // Only keep essential object properties
        compressed[key] = JSON.stringify(value).substring(0, 200);
      } else {
        compressed[key] = value;
      }
    });

    return compressed;
  }

  public async getMeasurements(
    filters: {
      type?: string;
      startTime?: number;
      endTime?: number;
      limit?: number;
    } = {}
  ): Promise<PerformanceMeasurement[]> {
    if (!this.db) {
      console.warn('[PerformanceStorage] Database not initialized');
      return [];
    }

    try {
      const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      
      let request: IDBRequest;
      
      if (filters.type) {
        const index = store.index('type');
        request = index.getAll(filters.type);
      } else if (filters.startTime || filters.endTime) {
        const index = store.index('timestamp');
        const range = this.createTimeRange(filters.startTime, filters.endTime);
        request = index.getAll(range);
      } else {
        request = store.getAll();
      }

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          let results: PerformanceMeasurement[] = request.result || [];
          
          // Decompress if necessary
          results = results.map(measurement => 
            (measurement as StoredMeasurement).compressed 
              ? this.decompressMeasurement(measurement as StoredMeasurement)
              : measurement
          );

          // Apply additional filters
          if (filters.startTime || filters.endTime) {
            results = results.filter(m => {
              if (filters.startTime && m.timestamp < filters.startTime) return false;
              if (filters.endTime && m.timestamp > filters.endTime) return false;
              return true;
            });
          }

          // Apply limit
          if (filters.limit && results.length > filters.limit) {
            results = results.slice(-filters.limit); // Get most recent
          }

          resolve(results);
        };
        
        request.onerror = () => {
          console.error('[PerformanceStorage] Failed to retrieve measurements:', request.error);
          reject(request.error);
        };
      });

    } catch (error) {
      console.error('[PerformanceStorage] Get measurements error:', error);
      return [];
    }
  }

  private createTimeRange(startTime?: number, endTime?: number): IDBKeyRange | undefined {
    if (startTime && endTime) {
      return IDBKeyRange.bound(startTime, endTime);
    } else if (startTime) {
      return IDBKeyRange.lowerBound(startTime);
    } else if (endTime) {
      return IDBKeyRange.upperBound(endTime);
    }
    return undefined;
  }

  private decompressMeasurement(compressed: StoredMeasurement): PerformanceMeasurement {
    // Remove compression flag and return as normal measurement
    const { compressed: isCompressed, ...measurement } = compressed;
    return measurement;
  }

  public async getMetricsSummary(timeRange: number = 24 * 60 * 60 * 1000): Promise<{
    totalMeasurements: number;
    averageResponseTime: number;
    averageMemoryUsage: number;
    alertsTriggered: number;
  }> {
    const endTime = Date.now();
    const startTime = endTime - timeRange;
    
    const measurements = await this.getMeasurements({ startTime, endTime });
    
    const responseTimeMeasurements = measurements.filter(m => m.type === 'responseTime');
    const memoryMeasurements = measurements.filter(m => m.type === 'memoryUsage');
    
    return {
      totalMeasurements: measurements.length,
      averageResponseTime: responseTimeMeasurements.length > 0 
        ? responseTimeMeasurements.reduce((sum, m) => sum + m.value, 0) / responseTimeMeasurements.length 
        : 0,
      averageMemoryUsage: memoryMeasurements.length > 0
        ? memoryMeasurements.reduce((sum, m) => sum + m.value, 0) / memoryMeasurements.length
        : 0,
      alertsTriggered: measurements.filter(m => 
        m.metadata?.alertLevel === 'warning' || m.metadata?.alertLevel === 'critical'
      ).length
    };
  }

  public async exportData(format: 'json' | 'csv' = 'json'): Promise<string> {
    const measurements = await this.getMeasurements();
    
    if (format === 'csv') {
      return this.convertToCSV(measurements);
    }
    
    return JSON.stringify(measurements, null, 2);
  }

  private convertToCSV(measurements: PerformanceMeasurement[]): string {
    if (measurements.length === 0) return '';
    
    const headers = ['id', 'type', 'value', 'timestamp', 'url', 'userAgent', 'viewport_width', 'viewport_height'];
    const rows = measurements.map(m => [
      m.id,
      m.type,
      m.value.toString(),
      m.timestamp.toString(),
      m.context.url || '',
      m.context.userAgent.substring(0, 50),
      m.context.viewport.width.toString(),
      m.context.viewport.height.toString()
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  public async clearAllData(): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => {
          console.log('[PerformanceStorage] All data cleared');
          resolve();
        };
        request.onerror = () => reject(request.error);
      });

    } catch (error) {
      console.error('[PerformanceStorage] Failed to clear data:', error);
    }
  }

  public cleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}