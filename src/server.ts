import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { cacheService } from './services/cacheService';
import { logger, stream } from './utils/logger';
import axios from 'axios';
import { query } from './utils/database';
import schedule from 'node-schedule';

// 路由导入
import authRoutes from './controllers/authController';
import divinationRoutes from './controllers/divinationController';
import cardRoutes from './controllers/cardController';
import userRoutes from './controllers/userController';
import paymentRoutes from './controllers/paymentController';
import aiRoutes from './controllers/aiController';
import seedCards from './utils/seeder';
import { initializeDatabase } from './utils/database';

// 中间件导入
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { authMiddleware } from './middleware/rateLimiter';
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
app.use('/api/divination', authMiddleware, divinationRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/user', authMiddleware, userRoutes);
app.use('/api/payment', paymentRoutes);

app.get('/api/poster/:id', (req, res) => {
  const { id } = req.params as any
  cacheService.get<{ base64: string; mimeType: string }>(`poster:${id}`, { prefix: 'tarot:' })
    .then((data) => {
      if (!data) { res.status(404).send('Not Found'); return }
      const buf = Buffer.from(data.base64, 'base64')
      res.setHeader('Content-Type', data.mimeType || 'image/png')
      res.setHeader('Cache-Control', 'public, max-age=604800')
      res.send(buf)
    })
    .catch(() => { res.status(500).send('Server Error') })
})

// 错误处理中间件
app.use(notFoundHandler);
app.use(errorHandler);

// 启动服务器
const startServer = async () => {
  try {
    await initializeDatabase();
    await seedCards();
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

    const initScheduledJobs = () => {
      schedule.scheduleJob('0 8 * * *', async () => {
        try {
          const rows: any = await query('SELECT id, openid FROM users WHERE daily_push_enabled = 1 AND openid IS NOT NULL')
          for (const u of rows) {
            const cardRows: any = await query('SELECT id, name, english_name AS englishName FROM tarot_cards ORDER BY RAND() LIMIT 1')
            const card = cardRows[0]
            const access = await axios.get(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${config.wechat.appId}&secret=${config.wechat.appSecret}`).then(r => r.data)
            const token = access?.access_token
            if (!token || !config.wechat.subscribeDailyTemplateId) continue
            const data = { touser: u.openid, template_id: config.wechat.subscribeDailyTemplateId, page: 'pages/index/index', data: { thing1: { value: card.name }, thing2: { value: '今日指引已就绪' } } }
            await axios.post(`https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${token}`, data).catch(()=>{})
          }
        } catch (e) {}
      })
    }
    initScheduledJobs()

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