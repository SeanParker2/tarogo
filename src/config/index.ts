import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
dotenv.config();

export const config = {
  // 基础配置
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // 数据库配置
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    name: process.env.DB_NAME || 'tarot_db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    connectionLimit: 10,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
  },
  
  // Redis配置
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || '',
    db: 0,
  },
  
  // AI服务配置
  ai: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      timeout: parseInt(process.env.AI_SERVICE_TIMEOUT || '30000'),
    },
    claude: {
      apiKey: process.env.CLAUDE_API_KEY || '',
      timeout: parseInt(process.env.AI_SERVICE_TIMEOUT || '30000'),
    },
  },
  
  // JWT配置
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  // 微信小程序配置
  wechat: {
    appId: process.env.WECHAT_APP_ID || '',
    appSecret: process.env.WECHAT_APP_SECRET || '',
  },
  
  // 文件上传配置
  upload: {
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE || '5242880'), // 5MB
    allowedTypes: (process.env.UPLOAD_ALLOWED_TYPES || 'image/jpeg,image/png,image/webp').split(','),
  },
  
  // 日志配置
  log: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log',
  },
  
  // 安全配置
  security: {
    corsOrigin: process.env.CORS_ORIGIN || '*',
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '15'),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  },
  
  // 验证配置
  validate() {
    const required = [
      'OPENAI_API_KEY',
      'JWT_SECRET',
      'WECHAT_APP_ID',
      'WECHAT_APP_SECRET'
    ];
    
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }
};

export default config;