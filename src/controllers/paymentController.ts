import { Router } from 'express';
import crypto from 'crypto';
import axios from 'axios';
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
    const userId = req.user?.id
    const { packageId, description = 'AI塔罗占卜' } = req.body;
    if (!userId) return res.status(401).json({ status: 'error', message: '未授权' })
    if (!packageId) return res.status(400).json({ status: 'error', message: '缺少套餐ID' });
    if (!config.wechat?.appId || !config.wechat?.mchId || !config.wechat?.merchantPrivateKey || !config.wechat?.merchantSerialNo || !config.wechat?.notifyUrl) {
      return res.status(500).json({ status: 'error', message: '微信支付未配置完整' });
    }

    const userRows: any = await query('SELECT openid FROM users WHERE id = ? LIMIT 1', [userId])
    const openid = userRows[0]?.openid
    if (!openid) return res.status(400).json({ status: 'error', message: '缺少用户openid' })

    const outTradeNo = 'TR' + Date.now()
    const amount = 100
    await query('INSERT INTO orders (user_id, package_id, out_trade_no, amount, status) VALUES (?, ?, ?, ?, ?)', [userId, packageId, outTradeNo, amount, 'pending']).catch(()=>{})

    const url = 'https://api.mch.weixin.qq.com/v3/pay/transactions/jsapi'
    const body = {
      appid: config.wechat.appId,
      mchid: config.wechat.mchId,
      description,
      out_trade_no: outTradeNo,
      notify_url: config.wechat.notifyUrl,
      amount: { total: amount, currency: 'CNY' },
      payer: { openid }
    }
    const timestamp = String(Math.floor(Date.now()/1000))
    const nonceStr = crypto.randomBytes(16).toString('hex')
    const method = 'POST'
    const urlPath = '/v3/pay/transactions/jsapi'
    const message = `${method}\n${urlPath}\n${timestamp}\n${nonceStr}\n${JSON.stringify(body)}\n`
    const sign = crypto.createSign('RSA-SHA256').update(message).sign(config.wechat.merchantPrivateKey, 'base64')
    const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${config.wechat.mchId}",nonce_str="${nonceStr}",timestamp="${timestamp}",serial_no="${config.wechat.merchantSerialNo}",signature="${sign}"`
    const resp = await axios.post(url, body, { headers: { Authorization: authorization, 'Content-Type': 'application/json' } })
    const prepayId = resp.data?.prepay_id
    if (!prepayId) return res.status(500).json({ status: 'error', message: '统一下单失败' })
    const pkg = `prepay_id=${prepayId}`
    const paySign = crypto.createSign('RSA-SHA256').update(`${timestamp}\n${nonceStr}\n${pkg}\n`).sign(config.wechat.merchantPrivateKey, 'base64')
    await query('UPDATE orders SET prepay_id = ? WHERE out_trade_no = ?', [prepayId, outTradeNo]).catch(()=>{})
    res.json({ status: 'success', data: { timeStamp: timestamp, nonceStr, package: pkg, signType: 'RSA', paySign } })
  } catch (error) {
    res.status(500).json({ status: 'error', message: '服务器错误', error: (error as any).message });
  }
});

router.post('/notify', async (req: any, res: any) => {
  try {
    const timestamp = req.header('Wechatpay-Timestamp') || req.header('wechatpay-timestamp')
    const nonce = req.header('Wechatpay-Nonce') || req.header('wechatpay-nonce')
    const signature = req.header('Wechatpay-Signature') || req.header('wechatpay-signature')
    const serial = req.header('Wechatpay-Serial') || req.header('wechatpay-serial')
    const body = JSON.stringify(req.body || {})

    if (!timestamp || !nonce || !signature || !serial) {
      return res.status(400).json({ status: 'error', message: '缺少验签头' })
    }
    if (!config.wechat.platformPublicKey || !config.wechat.platformSerialNo) {
      return res.status(500).json({ status: 'error', message: '平台证书未配置' })
    }
    if (serial !== config.wechat.platformSerialNo) {
      return res.status(400).json({ status: 'error', message: '证书序列号不匹配' })
    }
    const verifier = crypto.createVerify('RSA-SHA256')
    verifier.update(`${timestamp}\n${nonce}\n${body}\n`)
    const ok = verifier.verify(config.wechat.platformPublicKey, signature, 'base64')
    if (!ok) {
      return res.status(401).json({ status: 'error', message: '签名验证失败' })
    }

    const resource = req.body?.resource
    if (!resource?.ciphertext || !resource?.nonce) {
      return res.status(400).json({ status: 'error', message: '通知内容不完整' })
    }
    const key = Buffer.from(config.wechat.apiV3Key)
    const nonceBuf = Buffer.from(resource.nonce, 'utf8')
    const associated = resource.associated_data ? Buffer.from(resource.associated_data, 'utf8') : Buffer.alloc(0)
    const cipherBuf = Buffer.from(resource.ciphertext, 'base64')
    const data = cipherBuf.slice(0, cipherBuf.length - 16)
    const authTag = cipherBuf.slice(cipherBuf.length - 16)
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonceBuf)
    if (associated.length) decipher.setAAD(associated)
    decipher.setAuthTag(authTag)
    let decoded = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
    const notify = JSON.parse(decoded)

    const outTradeNo = notify.out_trade_no
    const transactionId = notify.transaction_id
    if (!outTradeNo || !transactionId) {
      return res.status(400).json({ status: 'error', message: '通知数据缺少交易信息' })
    }
    await query('UPDATE orders SET status=?, updated_at=CURRENT_TIMESTAMP WHERE out_trade_no=?', ['paid', outTradeNo]).catch(()=>{})
    const ordRows: any = await query('SELECT user_id, package_id FROM orders WHERE out_trade_no = ? LIMIT 1', [outTradeNo])
    const userId = ordRows[0]?.user_id
    const pkg = Number(ordRows[0]?.package_id || 1)
    if (userId) {
      if (pkg === 2) {
        await query('UPDATE users SET is_vip = 1, vip_expire_at = DATE_ADD(NOW(), INTERVAL 365 DAY) WHERE id = ?', [userId]).catch(()=>{})
      } else if (pkg === 3) {
        await query('UPDATE users SET is_vip = 1, vip_expire_at = DATE_ADD(NOW(), INTERVAL 36500 DAY) WHERE id = ?', [userId]).catch(()=>{})
      } else {
        await query('UPDATE users SET is_vip = 1, vip_expire_at = DATE_ADD(NOW(), INTERVAL 30 DAY) WHERE id = ?', [userId]).catch(()=>{})
      }
    }
    res.status(200).send('SUCCESS')
  } catch (error) {
    res.status(500).json({ status: 'error', message: '服务器错误', error: (error as any).message })
  }
})

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
// 旧版XML通知接口保留示例，不再使用

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