# AI塔罗牌占卜小程序 - 数据库设计文档

## 1. 数据库概述

本系统采用MySQL 8.0作为主力数据库，Redis作为缓存数据库。数据库设计遵循第三范式，确保数据的一致性和完整性。

## 2. 数据表结构

### 2.1 用户相关表

#### 用户表 (users)
```sql
-- 用户表
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';
```

#### 用户设置表 (user_settings)
```sql
-- 用户设置表
CREATE TABLE user_settings (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '设置ID',
    user_id INT NOT NULL COMMENT '用户ID',
    notification_enabled BOOLEAN DEFAULT TRUE COMMENT '是否开启通知',
    daily_tips_enabled BOOLEAN DEFAULT TRUE COMMENT '是否开启每日提示',
    language VARCHAR(10) DEFAULT 'zh-CN' COMMENT '语言设置',
    theme VARCHAR(20) DEFAULT 'purple' COMMENT '主题设置',
    font_size VARCHAR(10) DEFAULT 'medium' COMMENT '字体大小',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户设置表';
```

### 2.2 塔罗牌相关表

#### 塔罗牌表 (tarot_cards)
```sql
-- 塔罗牌表
CREATE TABLE tarot_cards (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='塔罗牌表';
```

#### 牌阵类型表 (divination_types)
```sql
-- 牌阵类型表
CREATE TABLE divination_types (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='牌阵类型表';
```

### 2.3 占卜相关表

#### 占卜记录表 (divination_records)
```sql
-- 占卜记录表
CREATE TABLE divination_records (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='占卜记录表';
```

#### 抽牌结果表 (card_draw_results)
```sql
-- 抽牌结果表
CREATE TABLE card_draw_results (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='抽牌结果表';
```

### 2.4 支付相关表

#### 产品套餐表 (product_packages)
```sql
-- 产品套餐表
CREATE TABLE product_packages (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '套餐ID',
    name VARCHAR(100) NOT NULL COMMENT '套餐名称',
    description TEXT COMMENT '描述',
    type VARCHAR(20) NOT NULL COMMENT '类型(vip/divination)',
    price DECIMAL(10,2) NOT NULL COMMENT '价格(元)',
    original_price DECIMAL(10,2) COMMENT '原价',
    duration_days INT COMMENT '有效天数',
    divination_count INT COMMENT '占卜次数',
    features JSON COMMENT '功能特性',
    is_recommended BOOLEAN DEFAULT FALSE COMMENT '是否推荐',
    sort_order INT DEFAULT 0 COMMENT '排序',
    status TINYINT DEFAULT 1 COMMENT '状态',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    INDEX idx_type (type),
    INDEX idx_status (status),
    INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='产品套餐表';
```

#### 订单表 (orders)
```sql
-- 订单表
CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '订单ID',
    order_no VARCHAR(100) UNIQUE NOT NULL COMMENT '订单号',
    user_id INT NOT NULL COMMENT '用户ID',
    package_id INT NOT NULL COMMENT '套餐ID',
    product_name VARCHAR(200) NOT NULL COMMENT '产品名称',
    price DECIMAL(10,2) NOT NULL COMMENT '价格',
    discount_amount DECIMAL(10,2) DEFAULT 0 COMMENT '优惠金额',
    final_amount DECIMAL(10,2) NOT NULL COMMENT '实付金额',
    status VARCHAR(20) DEFAULT 'pending' COMMENT '状态',
    payment_method VARCHAR(20) COMMENT '支付方式',
    transaction_id VARCHAR(100) COMMENT '交易号',
    paid_at DATETIME COMMENT '支付时间',
    expired_at DATETIME COMMENT '过期时间',
    refund_amount DECIMAL(10,2) DEFAULT 0 COMMENT '退款金额',
    refund_at DATETIME COMMENT '退款时间',
    refund_reason TEXT COMMENT '退款原因',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (package_id) REFERENCES product_packages(id),
    INDEX idx_user_id (user_id),
    INDEX idx_order_no (order_no),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';
```

### 2.5 内容相关表

#### 每日提示表 (daily_tips)
```sql
-- 每日提示表
CREATE TABLE daily_tips (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '提示ID',
    date DATE NOT NULL COMMENT '日期',
    card_id INT COMMENT '关联卡牌ID',
    tip_content TEXT NOT NULL COMMENT '提示内容',
    tip_type VARCHAR(50) COMMENT '提示类型',
    lucky_color VARCHAR(20) COMMENT '幸运色',
    lucky_number INT COMMENT '幸运数字',
    lucky_direction VARCHAR(20) COMMENT '幸运方向',
    mood_rating TINYINT COMMENT '心情指数',
    love_rating TINYINT COMMENT '爱情指数',
    career_rating TINYINT COMMENT '事业指数',
    wealth_rating TINYINT COMMENT '财富指数',
    status TINYINT DEFAULT 1 COMMENT '状态',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    UNIQUE KEY uk_date (date),
    INDEX idx_card_id (card_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='每日提示表';
```

#### 用户收藏表 (user_favorites)
```sql
-- 用户收藏表
CREATE TABLE user_favorites (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '收藏ID',
    user_id INT NOT NULL COMMENT '用户ID',
    card_id INT COMMENT '卡牌ID',
    record_id INT COMMENT '占卜记录ID',
    favorite_type VARCHAR(20) NOT NULL COMMENT '收藏类型(card/record)',
    notes TEXT COMMENT '备注',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (card_id) REFERENCES tarot_cards(id),
    FOREIGN KEY (record_id) REFERENCES divination_records(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_type (favorite_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户收藏表';
```

## 3. 数据字典

### 3.1 枚举值定义

#### 占卜类型枚举
- `single`: 单张牌占卜
- `three`: 三张牌占卜
- `celtic`: 凯尔特十字
- `relationship`: 关系牌阵
- `career`: 事业牌阵
- `yearly`: 年度运势

#### 卡牌类型枚举
- `major`: 大阿卡纳
- `minor`: 小阿卡纳

#### 花色枚举
- `cups`: 圣杯
- `pentacles`: 星币
- `swords`: 宝剑
- `wands`: 权杖

#### 订单状态枚举
- `pending`: 待支付
- `paid`: 已支付
- `expired`: 已过期
- `refunded`: 已退款
- `cancelled`: 已取消

### 3.2 索引设计说明

所有表都包含以下索引：
- 主键索引（PRIMARY KEY）
- 外键索引（FOREIGN KEY）
- 状态字段索引（status）
- 创建时间索引（created_at）

特殊索引：
- 用户表：openid唯一索引
- 订单表：订单号唯一索引
- 塔罗牌表：全文搜索索引
- 每日提示表：日期唯一索引

### 3.3 数据库优化策略

1. **读写分离**：主库写入，从库查询
2. **分表策略**：按用户ID分片存储历史记录
3. **缓存策略**：Redis缓存热门查询
4. **归档策略**：历史数据定期归档
5. **备份策略**：每日全量备份，binlog增量备份

## 4. 数据初始化

### 4.1 塔罗牌数据初始化
```sql
-- 大阿卡纳牌数据
INSERT INTO tarot_cards (name, english_name, card_type, number, roman_numeral, upright_keywords, reversed_keywords) VALUES
('愚者', 'The Fool', 'major', 0, '0', '新开始, 冒险, 纯真', '鲁莽, 愚蠢, 缺乏方向'),
('魔术师', 'The Magician', 'major', 1, 'I', '创造力, 技能, 意志力', '操纵, 缺乏专注, 滥用技能'),
('女祭司', 'The High Priestess', 'major', 2, 'II', '直觉, 神秘, 内在智慧', '缺乏直觉, 秘密, 困惑'),
-- ... 继续添加其他牌

-- 小阿卡纳牌数据
INSERT INTO tarot_cards (name, english_name, card_type, suit, number, upright_keywords, reversed_keywords) VALUES
('王牌', 'Ace of Cups', 'minor', 'cups', 1, '新情感, 直觉, 灵感', '情感阻塞, 失望, 空虚'),
('二杯', 'Two of Cups', 'minor', 'cups', 2, '伙伴关系, 和谐, 平衡', '不平衡, 沟通中断, 紧张'),
-- ... 继续添加其他牌
```

### 4.2 牌阵类型初始化
```sql
INSERT INTO divination_types (name, description, card_count, is_free, sort_order) VALUES
('单张牌占卜', '快速简洁的占卜方式，适合日常指引', 1, TRUE, 1),
('三张牌占卜', '过去-现在-未来的时间线占卜', 3, TRUE, 2),
('凯尔特十字', '最经典的塔罗牌阵，全面分析问题', 10, FALSE, 3),
('关系牌阵', '专门分析人际关系的牌阵', 6, FALSE, 4),
('事业牌阵', '专注职业发展的占卜牌阵', 7, FALSE, 5);
```

### 4.3 产品套餐初始化
```sql
INSERT INTO product_packages (name, description, type, price, duration_days, divination_count, is_recommended) VALUES
('月度VIP', '月度会员，享受无限占卜', 'vip', 28.00, 30, -1, FALSE),
('年度VIP', '年度会员，最优惠的选择', 'vip', 198.00, 365, -1, TRUE),
('终身VIP', '一次购买，终身享受', 'vip', 398.00, -1, -1, FALSE),
('10次占卜包', '按需购买，灵活使用', 'divination', 18.00, -1, 10, FALSE),
('50次占卜包', '大量占卜，更优惠', 'divination', 68.00, -1, 50, FALSE);
```