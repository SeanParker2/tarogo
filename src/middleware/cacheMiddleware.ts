import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cacheService';
import { logger } from '../utils/logger';

export interface CacheMiddlewareOptions {
  ttl?: number;
  prefix?: string;
  keyGenerator?: (req: Request) => string;
  skipCache?: (req: Request) => boolean;
  cacheableStatusCodes?: number[];
}

/**
 * 生成缓存键的默认函数
 */
const defaultKeyGenerator = (req: Request): string => {
  const method = req.method;
  const url = req.originalUrl || req.url;
  const query = JSON.stringify(req.query);
  const body = JSON.stringify(req.body);
  
  return `${method}:${url}:${query}:${body}`;
};

/**
 * 缓存中间件
 * 用于自动缓存API响应
 */
export const cacheMiddleware = (options: CacheMiddlewareOptions = {}) => {
  const {
    ttl = 300, // 默认5分钟
    prefix = 'api:',
    keyGenerator = defaultKeyGenerator,
    skipCache = () => false,
    cacheableStatusCodes = [200, 201]
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // 检查是否应该跳过缓存
    if (skipCache(req)) {
      return next();
    }

    const cacheKey = keyGenerator(req);
    
    try {
      // 尝试从缓存获取数据
      const cachedData = await cacheService.get(cacheKey, { prefix });
      
      if (cachedData !== null) {
        logger.debug(`Cache hit: ${cacheKey}`);
        
        // 设置缓存命中响应头
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        
        return res.json(cachedData);
      }
      
      logger.debug(`Cache miss: ${cacheKey}`);
      res.set('X-Cache', 'MISS');
      
    } catch (error) {
      logger.error(`Cache lookup error for key ${cacheKey}:`, error);
      // 缓存查找失败时继续正常处理
    }

    // 保存原始的 json 方法
    const originalJson = res.json;
    
    // 重写 json 方法以缓存响应数据
    res.json = function(data: any) {
      // 检查响应状态码是否可缓存
      if (cacheableStatusCodes.includes(res.statusCode)) {
        // 异步缓存数据（不阻塞响应）
        cacheService.set(cacheKey, data, { ttl, prefix })
          .then(() => {
            logger.debug(`Response cached: ${cacheKey}`);
          })
          .catch((error) => {
            logger.error(`Failed to cache response for key ${cacheKey}:`, error);
          });
      }
      
      // 调用原始的 json 方法发送响应
      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * 清除缓存中间件
 * 用于在数据更新后清除相关缓存
 */
export const clearCacheMiddleware = (keyPatterns: string[] | ((req: Request) => string[])) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patterns = typeof keyPatterns === 'function' ? keyPatterns(req) : keyPatterns;
      
      // 异步清除缓存（不阻塞响应）
      Promise.all(
        patterns.map(async (pattern) => {
          try {
            await cacheService.flush(pattern);
            logger.debug(`Cache cleared for pattern: ${pattern}`);
          } catch (error) {
            logger.error(`Failed to clear cache for pattern ${pattern}:`, error);
          }
        })
      );
      
    } catch (error) {
      logger.error('Error in clearCacheMiddleware:', error);
    }
    
    next();
  };
};

/**
 * 缓存统计中间件
 * 用于获取缓存统计信息
 */
export const cacheStatsMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await cacheService.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Failed to get cache stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cache statistics',
      error: (error as Error).message
    });
  }
};

/**
 * 用户相关缓存键生成器
 */
export const userCacheKeyGenerator = (req: Request): string => {
  const userId = req.user?.id || 'anonymous';
  const method = req.method;
  const url = req.originalUrl || req.url;
  const query = JSON.stringify(req.query);
  
  return `user:${userId}:${method}:${url}:${query}`;
};

/**
 * 塔罗牌相关缓存键生成器
 */
export const cardCacheKeyGenerator = (req: Request): string => {
  const cardId = req.params.id || req.query.cardId || 'all';
  const method = req.method;
  const url = req.originalUrl || req.url;
  
  return `card:${cardId}:${method}:${url}`;
};

/**
 * 占卜记录缓存键生成器
 */
export const divinationCacheKeyGenerator = (req: Request): string => {
  const userId = req.user?.id || 'anonymous';
  const divinationId = req.params.id || req.query.id || 'list';
  const method = req.method;
  const url = req.originalUrl || req.url;
  
  return `divination:${userId}:${divinationId}:${method}:${url}`;
};

export default {
  cacheMiddleware,
  clearCacheMiddleware,
  cacheStatsMiddleware,
  userCacheKeyGenerator,
  cardCacheKeyGenerator,
  divinationCacheKeyGenerator
};