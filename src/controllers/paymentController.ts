import { Router } from 'express';
import crypto from 'crypto';
import { query } from '../utils/database';
import { config } from '../config';

const router = Router();

/**
 * @route   GET /api/payment/packages
 * @desc    获取产品套餐列表
 * @access  Public
 */
router.get('/packages', async (req, res) => {
  try {
    // 模拟产品套餐
    const mockPackages = [
      {
        id: 1,
        name: '月度VIP会员',
        type: 'vip',
        price: 28.00,
        originalPrice: 38.00,
        durationDays: 30,
        divinationCount: -1, // -1表示无限次
        description: '享受30天VIP特权，无限次占卜，解锁所有牌阵',
        features: [
          '无限次塔罗牌占卜',
          '解锁所有牌阵类型',
          '详细的AI解读报告',
          '优先客服支持',
          '无广告体验'
        ],
        isRecommended: false,
        sortOrder: 1,
        status: 'active'
    },
    {
      id: 2,
      name: '年度VIP会员',
      type: 'vip',
      price: 198.00,
      originalPrice: 336.00,
      durationDays: 365,
      divinationCount: -1,
      description: '最优惠的选择，全年VIP特权，平均每天仅需0.54元',
      features: [
        '全年无限次占卜',
        '解锁所有牌阵类型',
        '详细的AI解读报告',
        '专属客服支持',
        '无广告体验',
        '生日专属占卜'
      ],
      isRecommended: true,
      sortOrder: 2,
      status: 'active'
    },
    {
      id: 3,
      name: '终身VIP会员',
      type: 'vip',
      price: 398.00,
      originalPrice: 798.00,
      durationDays: -1, // -1表示永久
      divinationCount: -1,
      description: '一次购买，终身享受VIP特权，最超值的选择',
      features: [
        '终身无限次占卜',
        '解锁所有牌阵类型',
        '详细的AI解读报告',
        '专属客服支持',
        '无广告体验',
        '生日专属占卜',
        '新功能优先体验'
      ],
      isRecommended: false,
      sortOrder: 3,
      status: 'active'
    },
    {
      id: 4,
      name: '10次占卜包',
      type: 'divination',
      price: 18.00,
      originalPrice: 30.00,
      durationDays: -1,
      divinationCount: 10,
      description: '按需购买，灵活使用，适合偶尔占卜的用户',
      features: [
        '10次塔罗牌占卜',
        '基础牌阵可用',
        '标准AI解读',
        '30天内有效'
      ],
      isRecommended: false,
      sortOrder: 4,
      status: 'active'
    },
    {
      id: 5,
      name: '50次占卜包',
      type: 'divination',
      price: 68.00,
      originalPrice: 150.00,
      durationDays: -1,
      divinationCount: 50,
      description: '大量占卜，更优惠，适合经常占卜的用户',
      features: [
        '50次塔罗牌占卜',
        '基础牌阵可用',
        '标准AI解读',
        '90天内有效'
      ],
      isRecommended: false,
      sortOrder: 5,
      status: 'active'
    }
  ];

  res.json({
    status: 'success',
    data: {
      packages: mockPackages
    }
  });
  } catch (error) {
    res.status(500).json({ status: 'error', message: '服务器错误', error: (error as any).message });
  }
});

router.post('/prepay', async (req: any, res: any) => {
  try {
    const { packageId } = req.body;
    if (!packageId) return res.status(400).json({ status: 'error', message: '缺少套餐ID' });
    if (!config.wechat?.appId) return res.status(500).json({ status: 'error', message: '微信支付未配置' });
    const prepayId = 'mock_prepay_' + Date.now();
    const timeStamp = String(Math.floor(Date.now()/1000));
    const nonceStr = crypto.randomBytes(16).toString('hex');
    const pkg = `prepay_id=${prepayId}`;
    const signType = 'RSA';
    const paySign = crypto.createHash('sha256').update(`${timeStamp}\n${nonceStr}\n${pkg}\n`).digest('hex');
    await query('INSERT INTO orders (user_id, package_id, status) VALUES (?, ?, ?)', [req.user?.id || null, packageId, 'pending']).catch(()=>{})
    res.json({ status: 'success', data: { timeStamp, nonceStr, package: pkg, signType, paySign } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: '服务器错误', error: (error as any).message });
  }
});

router.post('/notify', async (req: any, res: any) => {
  try {
    const { out_trade_no } = req.body || {}
    if (out_trade_no) {
      await query('UPDATE orders SET status=? WHERE id=?', ['paid', out_trade_no]).catch(()=>{})
    }
    res.send('SUCCESS');
  } catch (error) {
    res.status(500).json({ status: 'error', message: '服务器错误', error: (error as any).message });
  }
});

/**
 * @route   POST /api/payment/create
 * @desc    创建支付订单
 * @access  Private
 */
router.post('/create', async (req: any, res: any) => {
  const userId = req.user?.id;
  const { packageId } = req.body;

  if (!packageId) {
    return res.status(400).json({
      status: 'error',
      message: '缺少套餐ID'
    });
  }

  // 模拟订单创建
  const orderNo = 'TAROT' + Date.now() + Math.random().toString(36).substr(2, 6).toUpperCase();
  const mockOrder = {
    orderNo,
    packageId,
    productName: '年度VIP会员',
    price: 198.00,
    originalPrice: 336.00,
    status: 'pending',
    createdAt: new Date().toISOString(),
    expireAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30分钟后过期
  };

  return res.status(404).json({ status: 'error', message: '未实现' })
});

/**
 * @route   POST /api/payment/notify
 * @desc    支付回调通知
 * @access  Public
 */
router.post('/notify', async (req: any, res: any) => {
  // 这里是微信支付回调
  const { out_trade_no, result_code, total_fee } = req.body;

  if (result_code === 'SUCCESS') {
    // 支付成功，更新订单状态
    console.log(`支付成功：订单号 ${out_trade_no}, 金额 ${total_fee}`);
    
    // 返回成功响应给微信
    res.send('<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>');
  } else {
    // 支付失败
    console.log(`支付失败：订单号 ${out_trade_no}`);
    res.send('<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[支付失败]]></return_msg></xml>');
  }
});

/**
 * @route   GET /api/payment/orders
 * @desc    获取用户订单列表
 * @access  Private
 */
router.get('/orders', async (req: any, res: any) => {
  const userId = req.user?.id;
  const { page = 1, limit = 10, status } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  // 模拟订单数据
  const mockOrders = [
    {
      id: 1,
      orderNo: 'TAROT123456789',
      productName: '年度VIP会员',
      price: 198.00,
      originalPrice: 336.00,
      status: 'paid',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      paidAt: new Date(Date.now() - 85000000).toISOString(),
      expiredAt: null
    },
    {
      id: 2,
      orderNo: 'TAROT987654321',
      productName: '10次占卜包',
      price: 18.00,
      originalPrice: 30.00,
      status: 'expired',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      paidAt: null,
      expiredAt: new Date(Date.now() - 86400000).toISOString()
    }
  ];

  // 根据状态筛选
  let filteredOrders = mockOrders;
  if (status) {
    filteredOrders = mockOrders.filter(order => order.status === status);
  }

  res.json({
    status: 'success',
    data: {
      orders: filteredOrders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filteredOrders.length,
        pages: 1
      }
    }
  });
});

/**
 * @route   GET /api/payment/order/:orderNo
 * @desc    获取订单详情
 * @access  Private
 */
router.get('/order/:orderNo', async (req: any, res: any) => {
  const userId = req.user?.id;
  const { orderNo } = req.params;

  if (!orderNo) {
    return res.status(400).json({
      status: 'error',
      message: '缺少订单号'
    });
  }

  // 模拟订单详情
  const mockOrder = {
    id: 1,
    orderNo,
    productName: '年度VIP会员',
    description: '享受全年VIP特权，无限次占卜',
    price: 198.00,
    originalPrice: 336.00,
    status: 'paid',
    paymentMethod: 'wechat',
    transactionId: 'mock_transaction_id',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    paidAt: new Date(Date.now() - 85000000).toISOString(),
    expiredAt: null
  };

  res.json({
    status: 'success',
    data: {
      order: mockOrder
    }
  });
});

export default router;