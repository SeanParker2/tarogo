import { Request, Response, NextFunction } from 'express';
import { createClient } from 'redis';
import { config } from '../config';

// 创建Redis客户端
const redisClient = createClient({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password || undefined,
  db: config.redis.db
});

// 连接Redis
redisClient.connect().catch(console.error);

// 简单的内存限流（作为Redis的备选方案）
const requestCounts = new Map<string, { count: number; resetTime: number }>();

/**
 * 限流中间件
 * 基于IP地址进行限流，每个时间窗口内限制请求次数
 */
export const rateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const key = `rate_limit:${ip}`;
    const windowMs = config.security.rateLimitWindow * 60 * 1000; // 转换为毫秒
    const maxRequests = config.security.rateLimitMax;
    
    const now = Date.now();
    const windowStart = now - windowMs;

    // 尝试使用Redis
    if (redisClient.isOpen) {
      const requests = await redisClient.zRangeByScore(key, windowStart, now);
      
      if (requests.length >= maxRequests) {
        return res.status(429).json({
          status: 'error',
          message: '请求过于频繁，请稍后再试',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }

      // 添加当前请求
      await redisClient.zAdd(key, { score: now, value: now.toString() });
      
      // 清理过期请求
      await redisClient.zRemRangeByScore(key, 0, windowStart);
      
      // 设置过期时间
      await redisClient.expire(key, Math.ceil(windowMs / 1000));
      
    } else {
      // 使用内存限流（备选方案）
      const clientData = requestCounts.get(key);
      
      if (!clientData || now > clientData.resetTime) {
        // 新的时间窗口
        requestCounts.set(key, {
          count: 1,
          resetTime: now + windowMs
        });
      } else if (clientData.count >= maxRequests) {
        // 超过限制
        return res.status(429).json({
          status: 'error',
          message: '请求过于频繁，请稍后再试',
          retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
        });
      } else {
        // 增加计数
        clientData.count++;
      }
      
      // 定期清理过期数据
      if (Math.random() < 0.01) { // 1%概率清理
        for (const [k, v] of requestCounts.entries()) {
          if (now > v.resetTime) {
            requestCounts.delete(k);
          }
        }
      }
    }

    next();
  } catch (error) {
    console.error('限流中间件错误:', error);
    // 限流出错时允许请求通过，避免影响正常服务
    next();
  }
};

/**
 * JWT认证中间件
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: '未提供认证token'
      });
    }

    // 这里应该验证JWT token
    // 暂时跳过实际验证，后续实现
    req.user = { id: 'temp_user_id' };
    
    next();
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: '无效的认证token'
    });
  }
};

/**
 * 错误日志中间件
 */
export const errorLogger = (error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.url}`, {
    error: error.message,
    stack: error.stack,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  next(error);
};

export default redisClient;