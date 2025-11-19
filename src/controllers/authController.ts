import { Router } from 'express';
import axios from 'axios';
import jwt, { Secret } from 'jsonwebtoken';
import config from '../config';
import { getByOpenId, createUser, updateLastLogin } from '../models/UserModel';

const router = Router();

/**
 * @route   POST /api/auth/login
 * @desc    微信小程序登录
 * @access  Public
 */
router.post('/login', async (req: any, res: any) => {
  try {
    const { code, userInfo } = req.body
    if (!code) {
      return res.status(400).json({ status: 'error', message: '缺少微信登录code' })
    }
    if (!config.wechat?.appId || !config.wechat?.appSecret) {
      return res.status(500).json({ status: 'error', message: '微信AppId或AppSecret未配置' })
    }
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${config.wechat.appId}&secret=${config.wechat.appSecret}&js_code=${code}&grant_type=authorization_code`
    const resp = await axios.get(url)
    const data = resp.data || {}
    if (!data.openid) {
      const msg = typeof data.errmsg === 'string' ? data.errmsg : '微信接口错误'
      return res.status(400).json({ status: 'error', message: msg })
    }
    let user = await getByOpenId(data.openid)
    if (!user) {
      user = await createUser({ openid: data.openid, nickname: userInfo?.nickName, avatarUrl: userInfo?.avatarUrl })
    }
    await updateLastLogin(data.openid)
    const token = jwt.sign({ id: user.id, openid: user.openid }, config.jwt.secret as Secret, { expiresIn: config.jwt.expiresIn as any })
    res.json({ status: 'success', data: { token, userId: user.id, isVip: !!user.isVip, userInfo: { nickname: user.nickname || '神秘用户', avatarUrl: user.avatarUrl || '/images/default-avatar.png' } } })
  } catch (error) {
    res.status(500).json({ status: 'error', message: '登录失败，请稍后重试' })
  }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    刷新token
 * @access  Private
 */
router.post('/refresh', async (req: any, res: any) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        status: 'error',
        message: '缺少刷新token'
      });
    }

    // 这里应该验证刷新token并生成新的访问token
    const newToken = 'new_mock_jwt_token_' + Date.now();

    res.json({
      status: 'success',
      data: {
        token: newToken
      }
    });
  } catch (error) {
    console.error('刷新token错误:', error);
    res.status(500).json({
      status: 'error',
      message: '刷新token失败'
    });
  }
});

/**
 * @route   GET /api/auth/check
 * @desc    检查登录状态
 * @access  Private
 */
router.get('/check', async (req: any, res: any) => {
  try {
    // 这里应该验证JWT token
    res.json({
      status: 'success',
      data: {
        isLogin: true,
        userId: 'mock_user_id',
        isVip: false
      }
    });
  } catch (error) {
    console.error('检查登录状态错误:', error);
    res.status(500).json({
      status: 'error',
      message: '检查登录状态失败'
    });
  }
});

export default router;