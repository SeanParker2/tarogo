import Redis, { RedisOptions } from 'ioredis';
import { logger } from '../utils/logger';

export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  ttl?: number;
}

export interface CacheOptions {
  ttl?: number;
  prefix?: string;
  compress?: boolean;
}

class CacheService {
  private redis: Redis;
  private defaultTTL: number;
  private keyPrefix: string;
  private isConnected: boolean = false;

  constructor(config: CacheConfig) {
    this.defaultTTL = config.ttl || 3600; // 默认1小时
    this.keyPrefix = config.keyPrefix || 'tarot:';

    const redisOptions: RedisOptions = {
      port: config.port || 6379,
      host: config.host || 'localhost',
      password: config.password,
      db: config.db || 0,
      keyPrefix: this.keyPrefix
    };

    this.redis = new Redis(redisOptions);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.redis.on('connect', () => {
      this.isConnected = true;
      logger.info('Redis connected successfully');
    });

    this.redis.on('error', (error) => {
      this.isConnected = false;
      logger.error('Redis connection error:', error);
    });

    this.redis.on('close', () => {
      this.isConnected = false;
      logger.warn('Redis connection closed');
    });

    this.redis.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });
  }

  async connect(): Promise<void> {
    try {
      await this.redis.connect();
      logger.info('Redis cache service initialized');
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.redis.disconnect();
      this.isConnected = false;
      logger.info('Redis cache service disconnected');
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
    }
  }

  private buildKey(key: string, prefix?: string): string {
    const finalPrefix = prefix || this.keyPrefix;
    return `${finalPrefix}${key}`;
  }

  private serialize(value: any): string {
    try {
      return JSON.stringify(value);
    } catch (error) {
      logger.error('Failed to serialize value:', error);
      return String(value);
    }
  }

  private deserialize<T>(value: string | null): T | null {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch (error) {
      logger.error('Failed to deserialize value:', error);
      return value as T;
    }
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, skipping cache set');
      return;
    }

    try {
      const cacheKey = this.buildKey(key, options?.prefix);
      const serializedValue = this.serialize(value);
      const ttl = options?.ttl || this.defaultTTL;

      if (ttl > 0) {
        await this.redis.setex(cacheKey, ttl, serializedValue);
      } else {
        await this.redis.set(cacheKey, serializedValue);
      }

      logger.debug(`Cache set: ${cacheKey} (TTL: ${ttl}s)`);
    } catch (error) {
      logger.error(`Failed to set cache for key ${key}:`, error);
    }
  }

  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, skipping cache get');
      return null;
    }

    try {
      const cacheKey = this.buildKey(key, options?.prefix);
      const value = await this.redis.get(cacheKey);
      
      if (value) {
        logger.debug(`Cache hit: ${cacheKey}`);
        return this.deserialize<T>(value);
      }
      
      logger.debug(`Cache miss: ${cacheKey}`);
      return null;
    } catch (error) {
      logger.error(`Failed to get cache for key ${key}:`, error);
      return null;
    }
  }

  async getOrFetch<T>(key: string, fetcher: () => Promise<T>, options?: CacheOptions): Promise<T> {
    const cached = await this.get<T>(key, options)
    if (cached !== null && cached !== undefined) return cached as T
    const data = await fetcher()
    await this.set<T>(key, data, options)
    return data
  }

  async del(key: string, options?: CacheOptions): Promise<void> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, skipping cache delete');
      return;
    }

    try {
      const cacheKey = this.buildKey(key, options?.prefix);
      await this.redis.del(cacheKey);
      logger.debug(`Cache deleted: ${cacheKey}`);
    } catch (error) {
      logger.error(`Failed to delete cache for key ${key}:`, error);
    }
  }

  async exists(key: string, options?: CacheOptions): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const cacheKey = this.buildKey(key, options?.prefix);
      const result = await this.redis.exists(cacheKey);
      return result === 1;
    } catch (error) {
      logger.error(`Failed to check cache existence for key ${key}:`, error);
      return false;
    }
  }

  async ttl(key: string, options?: CacheOptions): Promise<number> {
    if (!this.isConnected) {
      return -2;
    }

    try {
      const cacheKey = this.buildKey(key, options?.prefix);
      return await this.redis.ttl(cacheKey);
    } catch (error) {
      logger.error(`Failed to get TTL for key ${key}:`, error);
      return -2;
    }
  }

  async expire(key: string, seconds: number, options?: CacheOptions): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      const cacheKey = this.buildKey(key, options?.prefix);
      await this.redis.expire(cacheKey, seconds);
      logger.debug(`Cache TTL updated: ${cacheKey} (${seconds}s)`);
    } catch (error) {
      logger.error(`Failed to set TTL for key ${key}:`, error);
    }
  }

  async incr(key: string, options?: CacheOptions): Promise<number> {
    if (!this.isConnected) {
      return 0;
    }

    try {
      const cacheKey = this.buildKey(key, options?.prefix);
      return await this.redis.incr(cacheKey);
    } catch (error) {
      logger.error(`Failed to increment cache for key ${key}:`, error);
      return 0;
    }
  }

  async decr(key: string, options?: CacheOptions): Promise<number> {
    if (!this.isConnected) {
      return 0;
    }

    try {
      const cacheKey = this.buildKey(key, options?.prefix);
      return await this.redis.decr(cacheKey);
    } catch (error) {
      logger.error(`Failed to decrement cache for key ${key}:`, error);
      return 0;
    }
  }

  async mget<T>(keys: string[], options?: CacheOptions): Promise<(T | null)[]> {
    if (!this.isConnected) {
      return keys.map(() => null);
    }

    try {
      const cacheKeys = keys.map(key => this.buildKey(key, options?.prefix));
      const values = await this.redis.mget(...cacheKeys);
      
      return values.map(value => this.deserialize<T>(value));
    } catch (error) {
      logger.error(`Failed to get multiple cache keys:`, error);
      return keys.map(() => null);
    }
  }

  async mset<T>(keyValuePairs: Record<string, T>, options?: CacheOptions): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      const pipeline = this.redis.pipeline();
      const ttl = options?.ttl || this.defaultTTL;

      Object.entries(keyValuePairs).forEach(([key, value]) => {
        const cacheKey = this.buildKey(key, options?.prefix);
        const serializedValue = this.serialize(value);
        
        if (ttl > 0) {
          pipeline.setex(cacheKey, ttl, serializedValue);
        } else {
          pipeline.set(cacheKey, serializedValue);
        }
      });

      await pipeline.exec();
      logger.debug(`Multiple cache keys set (${Object.keys(keyValuePairs).length})`);
    } catch (error) {
      logger.error(`Failed to set multiple cache keys:`, error);
    }
  }

  async flush(pattern?: string): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      if (pattern) {
        const keys = await this.redis.keys(this.buildKey(pattern));
        if (keys.length > 0) {
          await this.redis.del(...keys);
          logger.info(`Flushed ${keys.length} cache keys matching pattern: ${pattern}`);
        }
      } else {
        await this.redis.flushdb();
        logger.info('Flushed all cache keys');
      }
    } catch (error) {
      logger.error(`Failed to flush cache:`, error);
    }
  }

  async getStats(): Promise<{
    connected: boolean;
    keyspaceHits: number;
    keyspaceMisses: number;
    usedMemory: number;
    connectedClients: number;
  }> {
    if (!this.isConnected) {
      return {
        connected: false,
        keyspaceHits: 0,
        keyspaceMisses: 0,
        usedMemory: 0,
        connectedClients: 0,
      };
    }

    try {
      const info = await this.redis.info('stats');
      const memory = await this.redis.info('memory');
      const clients = await this.redis.info('clients');

      const parseInfo = (infoStr: string, key: string): number => {
        const match = infoStr.match(new RegExp(`${key}:(\\d+)`));
        return match ? parseInt(match[1], 10) : 0;
      };

      return {
        connected: true,
        keyspaceHits: parseInfo(info, 'keyspace_hits'),
        keyspaceMisses: parseInfo(info, 'keyspace_misses'),
        usedMemory: parseInfo(memory, 'used_memory'),
        connectedClients: parseInfo(clients, 'connected_clients'),
      };
    } catch (error) {
      logger.error('Failed to get cache stats:', error);
      return {
        connected: true,
        keyspaceHits: 0,
        keyspaceMisses: 0,
        usedMemory: 0,
        connectedClients: 0,
      };
    }
  }

  get isHealthy(): boolean {
    return this.isConnected;
  }
}

// 创建全局缓存实例
const cacheConfig: CacheConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'tarot:',
  ttl: parseInt(process.env.REDIS_DEFAULT_TTL || '3600'),
};

export const cacheService = new CacheService(cacheConfig);

export default CacheService;