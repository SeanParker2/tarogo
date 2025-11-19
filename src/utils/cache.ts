import { createClient } from 'redis';
import { config } from '../config';

// 创建Redis客户端
const redisClient = createClient({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password || undefined,
  db: config.redis.db
});

// 连接事件处理
redisClient.on('connect', () => {
  console.log('🔄 正在连接Redis...');
});

redisClient.on('ready', () => {
  console.log('✅ Redis连接成功');
});

redisClient.on('error', (err) => {
  console.error('❌ Redis连接错误:', err);
});

redisClient.on('end', () => {
  console.log('🔌 Redis连接已关闭');
});

// 连接Redis
redisClient.connect().catch(console.error);

/**
 * 缓存工具类
 */
export class CacheManager {
  private client = redisClient;
  private defaultTTL = 3600; // 默认1小时过期

  /**
   * 获取缓存
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('获取缓存失败:', error);
      return null;
    }
  }

  /**
   * 设置缓存
   */
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const serializedValue = JSON.stringify(value);
      const expireTime = ttl || this.defaultTTL;
      
      await this.client.setEx(key, expireTime, serializedValue);
      return true;
    } catch (error) {
      console.error('设置缓存失败:', error);
      return false;
    }
  }

  /**
   * 删除缓存
   */
  async del(key: string): Promise<boolean> {
    try {
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      console.error('删除缓存失败:', error);
      return false;
    }
  }

  /**
   * 批量删除缓存（支持通配符）
   */
  async delPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) return 0;
      
      const result = await this.client.del(keys);
      return result;
    } catch (error) {
      console.error('批量删除缓存失败:', error);
      return 0;
    }
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('检查缓存存在失败:', error);
      return false;
    }
  }

  /**
   * 设置过期时间
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, ttl);
      return result;
    } catch (error) {
      console.error('设置缓存过期时间失败:', error);
      return false;
    }
  }

  /**
   * 获取剩余过期时间
   */
  async ttl(key: string): Promise<number> {
    try {
      const result = await this.client.ttl(key);
      return result;
    } catch (error) {
      console.error('获取缓存剩余时间失败:', error);
      return -2;
    }
  }

  /**
   * 递增计数器
   */
  async incr(key: string, increment = 1): Promise<number | null> {
    try {
      const result = await this.client.incrBy(key, increment);
      return result;
    } catch (error) {
      console.error('递增计数器失败:', error);
      return null;
    }
  }

  /**
   * 递减计数器
   */
  async decr(key: string, decrement = 1): Promise<number | null> {
    try {
      const result = await this.client.decrBy(key, decrement);
      return result;
    } catch (error) {
      console.error('递减计数器失败:', error);
      return null;
    }
  }

  /**
   * 获取哈希表字段
   */
  async hget(key: string, field: string): Promise<any | null> {
    try {
      const value = await this.client.hGet(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('获取哈希表字段失败:', error);
      return null;
    }
  }

  /**
   * 设置哈希表字段
   */
  async hset(key: string, field: string, value: any): Promise<boolean> {
    try {
      const serializedValue = JSON.stringify(value);
      const result = await this.client.hSet(key, field, serializedValue);
      return result > 0;
    } catch (error) {
      console.error('设置哈希表字段失败:', error);
      return false;
    }
  }

  /**
   * 获取哈希表所有字段
   */
  async hgetall(key: string): Promise<Record<string, any>> {
    try {
      const hash = await this.client.hGetAll(key);
      const result: Record<string, any> = {};
      
      for (const [field, value] of Object.entries(hash)) {
        try {
          result[field] = JSON.parse(value);
        } catch {
          result[field] = value;
        }
      }
      
      return result;
    } catch (error) {
      console.error('获取哈希表所有字段失败:', error);
      return {};
    }
  }

  /**
   * 添加到集合
   */
  async sadd(key: string, ...members: string[]): Promise<number> {
    try {
      const result = await this.client.sAdd(key, members);
      return result;
    } catch (error) {
      console.error('添加到集合失败:', error);
      return 0;
    }
  }

  /**
   * 从集合中移除
   */
  async srem(key: string, ...members: string[]): Promise<number> {
    try {
      const result = await this.client.sRem(key, members);
      return result;
    } catch (error) {
      console.error('从集合中移除失败:', error);
      return 0;
    }
  }

  /**
   * 获取集合成员数
   */
  async scard(key: string): Promise<number> {
    try {
      const result = await this.client.sCard(key);
      return result;
    } catch (error) {
      console.error('获取集合成员数失败:', error);
      return 0;
    }
  }

  /**
   * 检查是否是集合成员
   */
  async sismember(key: string, member: string): Promise<boolean> {
    try {
      const result = await this.client.sIsMember(key, member);
      return result;
    } catch (error) {
      console.error('检查集合成员失败:', error);
      return false;
    }
  }

  /**
   * 获取集合所有成员
   */
  async smembers(key: string): Promise<string[]> {
    try {
      const result = await this.client.sMembers(key);
      return result;
    } catch (error) {
      console.error('获取集合成员失败:', error);
      return [];
    }
  }

  /**
   * 关闭连接
   */
  async close(): Promise<void> {
    try {
      await this.client.quit();
    } catch (error) {
      console.error('关闭Redis连接失败:', error);
    }
  }
}

// 创建缓存管理器实例
export const cacheManager = new CacheManager();

export default redisClient;