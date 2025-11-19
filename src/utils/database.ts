import mysql from 'mysql2/promise';
import { config } from '../config';

// 创建连接池
const pool = mysql.createPool({
  host: config.database.host,
  port: config.database.port,
  user: config.database.user,
  password: config.database.password,
  database: config.database.name,
  connectionLimit: config.database.connectionLimit,
  charset: 'utf8mb4'
});

/**
 * 数据库查询工具函数
 */
export const query = async (sql: string, params?: any[]) => {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('数据库查询错误:', error);
    throw error;
  }
};

/**
 * 事务处理工具函数
 */
export const transaction = async (callback: (connection: mysql.PoolConnection) => Promise<any>) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * 数据库连接测试
 */
export const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log('✅ 数据库连接成功');
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    return false;
  }
};

/**
 * 初始化数据库表
 */
export const initializeDatabase = async () => {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      openid VARCHAR(100) UNIQUE NOT NULL COMMENT '微信openid',
      nickname VARCHAR(100) COMMENT '用户昵称',
      avatar_url VARCHAR(500) COMMENT '头像URL',
      gender TINYINT COMMENT '性别(1:男, 2:女, 0:未知)',
      country VARCHAR(50) COMMENT '国家',
      province VARCHAR(50) COMMENT '省份',
      city VARCHAR(50) COMMENT '城市',
      is_vip BOOLEAN DEFAULT FALSE COMMENT '是否VIP',
      vip_type VARCHAR(20) COMMENT 'VIP类型(month/year/lifetime)',
      vip_expire_at DATETIME COMMENT 'VIP到期时间',
      total_divinations INT DEFAULT 0 COMMENT '总占卜次数',
      last_divination_at DATETIME COMMENT '最后占卜时间',
      status TINYINT DEFAULT 1 COMMENT '状态(1:正常, 0:禁用)',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      
      INDEX idx_openid (openid),
      INDEX idx_vip_status (is_vip),
      INDEX idx_status (status),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表'
  `;

  const createTarotCardsTable = `
    CREATE TABLE IF NOT EXISTS tarot_cards (
      id INT PRIMARY KEY AUTO_INCREMENT COMMENT '卡牌ID',
      name VARCHAR(100) NOT NULL COMMENT '中文名',
      english_name VARCHAR(100) NOT NULL COMMENT '英文名',
      card_type VARCHAR(20) NOT NULL COMMENT '类型(major/minor)',
      suit VARCHAR(20) COMMENT '花色(cups/pentacles/swords/wands)',
      number INT COMMENT '编号',
      roman_numeral VARCHAR(10) COMMENT '罗马数字',
      image_url VARCHAR(500) COMMENT '图片URL',
      thumbnail_url VARCHAR(500) COMMENT '缩略图URL',
      upright_keywords TEXT COMMENT '正位关键词',
      reversed_keywords TEXT COMMENT '逆位关键词',
      upright_meaning TEXT COMMENT '正位含义',
      reversed_meaning TEXT COMMENT '逆位含义',
      description TEXT COMMENT '详细描述',
      element VARCHAR(20) COMMENT '元素',
      planet VARCHAR(50) COMMENT '行星',
      zodiac_sign VARCHAR(20) COMMENT '星座',
      season VARCHAR(20) COMMENT '季节',
      direction VARCHAR(20) COMMENT '方向',
      color VARCHAR(20) COMMENT '代表色',
      
      INDEX idx_card_type (card_type),
      INDEX idx_suit (suit),
      INDEX idx_number (number),
      FULLTEXT idx_search (name, english_name, upright_keywords, reversed_keywords)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='塔罗牌表'
  `;

  const createDivinationTypesTable = `
    CREATE TABLE IF NOT EXISTS divination_types (
      id INT PRIMARY KEY AUTO_INCREMENT COMMENT '类型ID',
      name VARCHAR(100) NOT NULL COMMENT '名称',
      description TEXT COMMENT '描述',
      card_count INT NOT NULL COMMENT '使用牌数',
      layout_config JSON COMMENT '布局配置',
      default_question VARCHAR(500) COMMENT '默认问题',
      suitable_for TEXT COMMENT '适用场景',
      difficulty_level TINYINT DEFAULT 1 COMMENT '难度等级',
      is_free BOOLEAN DEFAULT TRUE COMMENT '是否免费',
      vip_only BOOLEAN DEFAULT FALSE COMMENT '是否VIP专享',
      sort_order INT DEFAULT 0 COMMENT '排序',
      status TINYINT DEFAULT 1 COMMENT '状态(1:启用, 0:禁用)',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      
      INDEX idx_status (status),
      INDEX idx_vip_only (vip_only),
      INDEX idx_sort_order (sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='牌阵类型表'
  `;

  const createDivinationRecordsTable = `
    CREATE TABLE IF NOT EXISTS divination_records (
      id INT PRIMARY KEY AUTO_INCREMENT COMMENT '记录ID',
      user_id INT NOT NULL COMMENT '用户ID',
      type_id INT NOT NULL COMMENT '牌阵类型ID',
      question TEXT COMMENT '占卜问题',
      question_category VARCHAR(50) COMMENT '问题类别',
      status VARCHAR(20) DEFAULT 'pending' COMMENT '状态',
      ai_interpretation TEXT COMMENT 'AI解读',
      ai_advice TEXT COMMENT 'AI建议',
      ai_confidence FLOAT COMMENT 'AI置信度',
      user_rating TINYINT COMMENT '用户评分(1-5)',
      user_feedback TEXT COMMENT '用户反馈',
      share_count INT DEFAULT 0 COMMENT '分享次数',
      is_shared BOOLEAN DEFAULT FALSE COMMENT '是否已分享',
      session_id VARCHAR(100) COMMENT '会话ID',
      ip_address VARCHAR(45) COMMENT 'IP地址',
      user_agent TEXT COMMENT '用户代理',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (type_id) REFERENCES divination_types(id),
      INDEX idx_user_id (user_id),
      INDEX idx_type_id (type_id),
      INDEX idx_status (status),
      INDEX idx_created_at (created_at),
      INDEX idx_session_id (session_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='占卜记录表'
  `;

  const createCardDrawResultsTable = `
    CREATE TABLE IF NOT EXISTS card_draw_results (
      id INT PRIMARY KEY AUTO_INCREMENT COMMENT '结果ID',
      record_id INT NOT NULL COMMENT '占卜记录ID',
      card_id INT NOT NULL COMMENT '卡牌ID',
      position INT NOT NULL COMMENT '位置',
      position_name VARCHAR(100) COMMENT '位置名称',
      is_reversed BOOLEAN DEFAULT FALSE COMMENT '是否逆位',
      interpretation TEXT COMMENT '解读内容',
      keywords TEXT COMMENT '关键词',
      position_meaning TEXT COMMENT '位置含义',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      
      FOREIGN KEY (record_id) REFERENCES divination_records(id) ON DELETE CASCADE,
      FOREIGN KEY (card_id) REFERENCES tarot_cards(id),
      INDEX idx_record_id (record_id),
      INDEX idx_card_id (card_id),
      INDEX idx_position (position)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='抽牌结果表'
  `;

  try {
    await query(createUsersTable);
    try { await query('ALTER TABLE users ADD COLUMN last_login_at DATETIME'); } catch(e) {}
    await query(createTarotCardsTable);
    await query(createDivinationTypesTable);
    await query(createDivinationRecordsTable);
    await query(createCardDrawResultsTable);
    
    console.log('✅ 数据库表初始化成功');
    return true;
  } catch (error) {
    console.error('❌ 数据库表初始化失败:', error);
    return false;
  }
};

export default {
  query,
  transaction,
  testConnection,
  initializeDatabase,
  pool
};