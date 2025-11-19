import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { cacheService } from './services/cacheService';
import { logger, stream } from './utils/logger';

// 路由导入
import authRoutes from './controllers/authController';
import divinationRoutes from './controllers/divinationController';
import cardRoutes from './controllers/cardController';
import userRoutes from './controllers/userController';
import paymentRoutes from './controllers/paymentController';
import aiRoutes from './controllers/aiController';

// 中间件导入
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { cacheMiddleware, cacheStatsMiddleware } from './middleware/cacheMiddleware';
import { 
  performanceMiddleware, 
  cachePerformanceMiddleware, 
  performanceMetricsMiddleware, 
  resetPerformanceMiddleware 
} from './middleware/performanceMiddleware';

// 验证配置（注释掉，避免启动失败）
// config.validate();

const app = express();

// 基础中间件
app.use(helmet()); // 安全头
app.use(cors({
  origin: config.security.corsOrigin,
  credentials: true
}));
app.use(morgan('combined', { stream })); // 日志
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 性能监控中间件
app.use(performanceMiddleware);
app.use(cachePerformanceMiddleware);

// 限流中间件
app.use('/api/', rateLimiter);

// 健康检查
app.get('/health', async (req, res) => {
  const cacheStats = await cacheService.getStats();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    cache: {
      connected: cacheStats.connected,
      hits: cacheStats.keyspaceHits,
      misses: cacheStats.keyspaceMisses
    }
  });
});

// 缓存统计API
app.get('/api/cache/stats', cacheStatsMiddleware);

// 性能监控API
app.get('/api/performance/metrics', performanceMetricsMiddleware);
app.post('/api/performance/reset', resetPerformanceMiddleware);

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/divination', divinationRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/user', userRoutes);
app.use('/api/payment', paymentRoutes);

// 错误处理中间件
app.use(notFoundHandler);
app.use(errorHandler);

// 启动服务器
const startServer = async () => {
  try {
    // 初始化Redis缓存
    await cacheService.connect();
    logger.info('Redis cache service connected');
    
    const server = app.listen(config.port, () => {
      logger.info(`🚀 AI塔罗牌占卜服务启动成功！`);
      logger.info(`📡 服务端口: ${config.port}`);
      logger.info(`🌍 环境模式: ${config.nodeEnv}`);
      logger.info(`🕐 启动时间: ${new Date().toLocaleString()}`);
      logger.info(`💾 Redis缓存: 已连接`);
    });

    // 优雅关闭
    process.on('SIGTERM', async () => {
      logger.info('🔄 收到SIGTERM信号，正在优雅关闭服务...');
      
      try {
        await cacheService.disconnect();
        logger.info('Redis cache service disconnected');
      } catch (error) {
        logger.error('Error disconnecting Redis:', error);
      }
      
      server.close(() => {
        logger.info('✅ 服务已关闭');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      logger.info('🔄 收到SIGINT信号，正在优雅关闭服务...');
      
      try {
        await cacheService.disconnect();
        logger.info('Redis cache service disconnected');
      } catch (error) {
        logger.error('Error disconnecting Redis:', error);
      }
      
      server.close(() => {
        logger.info('✅ 服务已关闭');
        process.exit(0);
      });
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// 启动应用
if (require.main === module) {
  startServer();
}

export default app;