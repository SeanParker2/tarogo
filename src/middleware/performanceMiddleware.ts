import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';
import { cacheService } from '../services/cacheService';
import { logger } from '../utils/logger';

export interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  cacheHitRate: number;
  errorRate: number;
  timestamp: string;
}

class PerformanceMonitor {
  private requestMetrics = new Map<string, {
    count: number;
    totalTime: number;
    errors: number;
  }>();
  
  private cacheMetrics = {
    hits: 0,
    misses: 0,
    total: 0
  };

  /**
   * 记录请求性能指标
   */
  recordRequest(endpoint: string, responseTime: number, isError: boolean = false): void {
    const metrics = this.requestMetrics.get(endpoint) || {
      count: 0,
      totalTime: 0,
      errors: 0
    };
    
    metrics.count++;
    metrics.totalTime += responseTime;
    if (isError) {
      metrics.errors++;
    }
    
    this.requestMetrics.set(endpoint, metrics);
  }

  /**
   * 记录缓存指标
   */
  recordCacheHit(): void {
    this.cacheMetrics.hits++;
    this.cacheMetrics.total++;
  }

  recordCacheMiss(): void {
    this.cacheMetrics.misses++;
    this.cacheMetrics.total++;
  }

  /**
   * 获取性能指标
   */
  getMetrics(): PerformanceMetrics {
    let totalRequests = 0;
    let totalTime = 0;
    let totalErrors = 0;
    
    this.requestMetrics.forEach((metrics) => {
      totalRequests += metrics.count;
      totalTime += metrics.totalTime;
      totalErrors += metrics.errors;
    });
    
    const averageResponseTime = totalRequests > 0 ? totalTime / totalRequests : 0;
    const cacheHitRate = this.cacheMetrics.total > 0 ? 
      this.cacheMetrics.hits / this.cacheMetrics.total : 0;
    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;
    
    return {
      requestCount: totalRequests,
      averageResponseTime,
      cacheHitRate,
      errorRate,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 重置指标
   */
  resetMetrics(): void {
    this.requestMetrics.clear();
    this.cacheMetrics = {
      hits: 0,
      misses: 0,
      total: 0
    };
  }
}

const performanceMonitor = new PerformanceMonitor();

/**
 * 性能监控中间件
 */
export const performanceMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = performance.now();
  const endpoint = `${req.method} ${req.route?.path || req.path}`;
  
  // 监听响应完成事件
  res.on('finish', () => {
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    const isError = res.statusCode >= 400;
    
    // 记录性能指标
    performanceMonitor.recordRequest(endpoint, responseTime, isError);
    
    // 记录慢请求
    if (responseTime > 1000) { // 超过1秒的请求
      logger.warn(`Slow request detected: ${endpoint} took ${responseTime.toFixed(2)}ms`);
    }
    
    // 设置响应头
    res.set('X-Response-Time', `${responseTime.toFixed(2)}ms`);
  });
  
  next();
};

/**
 * 缓存性能监控中间件
 */
export const cachePerformanceMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const originalSet = res.set;
  
  res.set = function(field: string, value?: string | string[]): Response {
    if (field === 'X-Cache' && typeof value === 'string') {
      if (value === 'HIT') {
        performanceMonitor.recordCacheHit();
      } else if (value === 'MISS') {
        performanceMonitor.recordCacheMiss();
      }
    }
    return originalSet.call(this, field, value);
  };
  
  next();
};

/**
 * 获取性能指标API
 */
export const performanceMetricsMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const metrics = performanceMonitor.getMetrics();
    const cacheStats = await cacheService.getStats();
    
    res.json({
      success: true,
      data: {
        performance: metrics,
        cache: {
          connected: cacheStats.connected,
          hits: cacheStats.keyspaceHits,
          misses: cacheStats.keyspaceMisses,
          hitRate: cacheStats.keyspaceHits + cacheStats.keyspaceMisses > 0 ? 
            cacheStats.keyspaceHits / (cacheStats.keyspaceHits + cacheStats.keyspaceMisses) : 0
        },
        memory: process.memoryUsage(),
        uptime: process.uptime()
      }
    });
  } catch (error) {
    logger.error('Error getting performance metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve performance metrics',
      error: (error as Error).message
    });
  }
};

/**
 * 重置性能指标API
 */
export const resetPerformanceMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    performanceMonitor.resetMetrics();
    logger.info('Performance metrics reset');
    
    res.json({
      success: true,
      message: 'Performance metrics reset successfully'
    });
  } catch (error) {
    logger.error('Error resetting performance metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset performance metrics',
      error: (error as Error).message
    });
  }
};

/**
 * 数据库查询性能监控装饰器
 */
export function monitorDatabaseQuery(target: any, propertyName: string, descriptor: PropertyDescriptor): PropertyDescriptor {
  const method = descriptor.value;
  
  descriptor.value = async function (...args: any[]) {
    const startTime = performance.now();
    const queryName = `${target.constructor.name}.${propertyName}`;
    
    try {
      const result = await method.apply(this, args);
      const endTime = performance.now();
      const queryTime = endTime - startTime;
      
      if (queryTime > 500) { // 超过500ms的数据库查询
        logger.warn(`Slow database query detected: ${queryName} took ${queryTime.toFixed(2)}ms`);
      }
      
      logger.debug(`Database query: ${queryName} took ${queryTime.toFixed(2)}ms`);
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const queryTime = endTime - startTime;
      
      logger.error(`Database query failed: ${queryName} took ${queryTime.toFixed(2)}ms`, error);
      throw error;
    }
  };
  
  return descriptor;
}

/**
   * API响应时间监控装饰器
   */
export function monitorAPIResponse(target: any, propertyName: string, descriptor: PropertyDescriptor): PropertyDescriptor {
  const method = descriptor.value;
  
  descriptor.value = async function (req: Request, res: Response, next: NextFunction) {
    const startTime = performance.now();
    const apiName = `${target.constructor.name}.${propertyName}`;
    
    try {
      await method.apply(this, [req, res, next]);
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      logger.info(`API response: ${apiName} took ${responseTime.toFixed(2)}ms`);
      
      if (responseTime > 2000) { // 超过2秒的API响应
        logger.warn(`Slow API response detected: ${apiName} took ${responseTime.toFixed(2)}ms`);
      }
    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      logger.error(`API response failed: ${apiName} took ${responseTime.toFixed(2)}ms`, error);
      throw error;
    }
  };
  
  return descriptor;
}

export default {
  performanceMiddleware,
  cachePerformanceMiddleware,
  performanceMetricsMiddleware,
  resetPerformanceMiddleware,
  monitorDatabaseQuery,
  monitorAPIResponse,
  performanceMonitor
};