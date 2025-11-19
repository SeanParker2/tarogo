# AI塔罗牌占卜小程序

## 项目简介
这是一个结合人工智能技术的塔罗牌占卜小程序，为用户提供个性化、智能化的塔罗牌占卜服务。

## 技术栈
- **后端**: Node.js + Express.js + TypeScript
- **数据库**: MySQL 8.0 + Redis
- **AI服务**: OpenAI GPT-4 / Claude API
- **前端**: 微信小程序原生开发

## 项目结构
```
tarogo/
├── src/                    # 后端源码
│   ├── config/            # 配置文件
│   ├── controllers/       # 控制器
│   ├── middleware/        # 中间件
│   ├── models/           # 数据模型
│   ├── services/         # 业务逻辑
│   ├── utils/            # 工具函数
│   └── server.ts         # 服务器入口
├── weapp/                # 微信小程序源码
├── supabase/             # 数据库迁移文件
├── dist/                 # 编译输出
└── docs/                 # 项目文档
```

## 快速开始

### 后端开发
```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 编译
npm run build

# 生产环境启动
npm start
```

### 环境变量
创建 `.env` 文件：
```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=tarot_db
DB_USER=root
DB_PASSWORD=password
REDIS_HOST=localhost
REDIS_PORT=6379
OPENAI_API_KEY=your_openai_key
CLAUDE_API_KEY=your_claude_key
JWT_SECRET=your_jwt_secret
```

## API文档

### 认证相关
- `POST /api/auth/login` - 微信小程序登录
- `POST /api/auth/refresh` - 刷新token
- `GET /api/auth/check` - 检查登录状态

### 占卜相关
- `POST /api/divination/create` - 创建新的占卜
- `GET /api/divination/result/:id` - 获取占卜结果
- `GET /api/divination/history` - 获取用户占卜历史
- `POST /api/divination/rate` - 对占卜结果进行评分

### 卡牌相关
- `GET /api/cards/list` - 获取塔罗牌列表
- `GET /api/cards/detail/:id` - 获取单张塔罗牌详情
- `GET /api/cards/random` - 随机获取塔罗牌
- `GET /api/cards/search` - 搜索塔罗牌

### 用户相关
- `GET /api/user/profile` - 获取用户信息
- `PUT /api/user/profile` - 更新用户信息
- `GET /api/user/stats` - 获取用户统计数据
- `GET /api/user/favorites` - 获取用户收藏
- `POST /api/user/favorites` - 添加收藏
- `DELETE /api/user/favorites/:id` - 取消收藏

### 支付相关
- `GET /api/payment/packages` - 获取产品套餐列表
- `POST /api/payment/create` - 创建支付订单
- `POST /api/payment/notify` - 支付回调通知
- `GET /api/payment/orders` - 获取用户订单列表
- `GET /api/payment/order/:orderNo` - 获取订单详情

### AI相关
- `POST /api/ai/interpret` - AI解读塔罗牌
- `POST /api/ai/batch-interpret` - 批量AI解读塔罗牌
- `GET /api/ai/models` - 获取可用的AI模型列表
- `POST /api/ai/feedback` - 提交AI解读反馈

## 开发规范
- 使用TypeScript进行开发
- 遵循RESTful API设计规范
- 使用ESLint进行代码检查
- 编写单元测试

## 许可证
MIT License