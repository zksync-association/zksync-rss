import fs from 'fs';
import path from 'path';

interface BlockTimestamp {
  blockNumber: number;
  timestamp: number;
  cached: number; // When it was cached
}

class BlockTimestampCache {
  private cache: Map<number, BlockTimestamp> = new Map();
  private cacheFile: string;
  private maxAge = 7 * 24 * 60 * 60 * 1000; // 1 week
  private maxEntries = 10000;

  constructor(cacheFileName: string = 'block-timestamps.json') {
    this.cacheFile = path.join(__dirname, '../data', cacheFileName);
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.cacheFile)) {
        const data = JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
        const now = Date.now();
        
        for (const item of data) {
          // Only load if not expired
          if (now - item.cached < this.maxAge) {
            this.cache.set(item.blockNumber, item);
          }
        }
        console.log(`Loaded ${this.cache.size} block timestamps from cache`);
      }
    } catch (error) {
      console.warn('Failed to load block timestamp cache:', error);
    }
  }

  private saveToDisk() {
    try {
      const dir = path.dirname(this.cacheFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = Array.from(this.cache.values());
      fs.writeFileSync(this.cacheFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.warn('Failed to save block timestamp cache:', error);
    }
  }

  get(blockNumber: number): number | null {
    const cached = this.cache.get(blockNumber);
    if (cached && Date.now() - cached.cached < this.maxAge) {
      return cached.timestamp;
    }
    return null;
  }

  set(blockNumber: number, timestamp: number) {
    const now = Date.now();
    this.cache.set(blockNumber, { blockNumber, timestamp, cached: now });

    // Cleanup old entries if cache is too large
    if (this.cache.size > this.maxEntries) {
      const sorted = Array.from(this.cache.values()).sort((a, b) => a.cached - b.cached);
      const toDelete = sorted.slice(0, Math.floor(this.maxEntries * 0.1)); // Remove oldest 10%
      
      for (const item of toDelete) {
        this.cache.delete(item.blockNumber);
      }
    }

    // Periodically save to disk
    if (this.cache.size % 100 === 0) {
      this.saveToDisk();
    }
  }

  flush() {
    this.saveToDisk();
  }

  size() {
    return this.cache.size;
  }
}

// Global cache instances
export const ethBlockCache = new BlockTimestampCache('eth-block-timestamps.json');
export const zkBlockCache = new BlockTimestampCache('zk-block-timestamps.json');

export function getBlockCache(networkName: string): BlockTimestampCache {
  return networkName === 'Ethereum Mainnet' ? ethBlockCache : zkBlockCache;
}