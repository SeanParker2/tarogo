import { Router } from 'express';
import { aiInterpretationService } from '../services/aiInterpretationService';
import jwt, { Secret } from 'jsonwebtoken';
import { config } from '../config';

const router = Router();

/**
 * @route   POST /api/ai/interpret
 * @desc    AI解读塔罗牌
 * @access  Private
 */
router.post('/interpret', async (req: any, res: any): Promise<void> => {
  try {
    const { cards, question, type, userInfo } = req.body;

    if (!cards || !Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: '缺少卡牌信息'
      });
    }

  if (!question || question.trim().length === 0) {
    return res.status(400).json({
      status: 'error',
      message: '缺少占卜问题'
    });
  }

  if (!type) {
    return res.status(400).json({
      status: 'error',
      message: '缺少占卜类型'
    });
  }

    let lengthLimit = 500
    try {
      const token = req.headers.authorization?.replace('Bearer ', '')
      if (token) {
        const payload: any = jwt.verify(token, config.jwt.secret as Secret)
        // 简单规则：VIP更长
        const userRow: any = await (await import('../models/UserModel')).getById(Number(payload.id))
        if (userRow?.isVip) lengthLimit = 800; else lengthLimit = 200
      }
    } catch(e) {}

    const interpretation = await aiInterpretationService.generateInterpretation({
      cards,
      question: question.trim(),
      type,
      userInfo,
      lengthLimit
    });

    return res.json({ status: 'success', data: interpretation });
  } catch (error) {
    console.error('AI解读错误:', error);
    return res.status(500).json({ status: 'error', message: 'AI解读服务暂时不可用，请稍后重试' });
  }
});

router.post('/interpret/stream', async (req: any, res: any): Promise<void> => {
  try {
    const { cards, question, type, userInfo } = req.body;
    let lengthLimit = 500
    try {
      const token = req.headers.authorization?.replace('Bearer ', '')
      if (token) {
        const payload: any = jwt.verify(token, config.jwt.secret as Secret)
        const userRow: any = await (await import('../models/UserModel')).getById(Number(payload.id))
        if (userRow?.isVip) lengthLimit = 800; else lengthLimit = 200
      }
    } catch(e) {}
    const result = await aiInterpretationService.generateInterpretation({ cards, question, type, userInfo, lengthLimit })
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Transfer-Encoding', 'chunked')
    const text = result.interpretation
    const chunks = text.match(/.{1,30}/g) || [text]
    for (const ch of chunks) {
      res.write(ch)
      await new Promise(r => setTimeout(r, 50))
    }
    res.end()
  } catch (error) {
    res.status(500).end('AI解读服务暂时不可用')
  }
})

/**
 * @route   POST /api/ai/batch-interpret
 * @desc    批量AI解读塔罗牌
 * @access  Private
 */
router.post('/batch-interpret', async (req: any, res: any) => {
  const { interpretations } = req.body;

  if (!interpretations || !Array.isArray(interpretations) || interpretations.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: '缺少解读请求数据'
    });
  }

  if (interpretations.length > 10) {
    return res.status(400).json({
      status: 'error',
      message: '批量解读数量不能超过10个'
    });
  }

  try {
    // 批量调用AI解读服务
    const results = await aiInterpretationService.batchGenerateInterpretations(interpretations);

    res.json({
      status: 'success',
      data: {
        results,
        total: results.length
      }
    });
  } catch (error) {
    console.error('批量AI解读错误:', error);
    res.status(500).json({
      status: 'error',
      message: '批量AI解读服务暂时不可用，请稍后重试'
    });
  }
});

/**
 * @route   GET /api/ai/models
 * @desc    获取可用的AI模型列表
 * @access  Public
 */
router.get('/models', async (req: any, res: any) => {
  const models = [
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      provider: 'OpenAI',
      description: '快速、高效的AI模型，适合日常占卜解读',
      isAvailable: true,
      features: ['快速响应', '准确解读', '多语言支持']
    },
    {
      id: 'gpt-4',
      name: 'GPT-4',
      provider: 'OpenAI',
      description: '更强大的AI模型，提供更深入的塔罗牌解读',
      isAvailable: false, // 假设当前不可用
      features: ['深度解读', '复杂分析', '个性化建议']
    },
    {
      id: 'claude-3-sonnet',
      name: 'Claude 3 Sonnet',
      provider: 'Anthropic',
      description: 'Anthropic的AI模型，提供温和的塔罗牌解读',
      isAvailable: true,
      features: ['温和解读', '情感理解', '详细解释']
    }
  ];

  res.json({
    status: 'success',
    data: {
      models,
      currentModel: 'gpt-3.5-turbo'
    }
  });
});

/**
 * @route   POST /api/ai/feedback
 * @desc    提交AI解读反馈
 * @access  Private
 */
router.post('/feedback', async (req: any, res: any) => {
  const { interpretationId, rating, feedback, suggestions } = req.body;

  if (!interpretationId) {
    return res.status(400).json({
      status: 'error',
      message: '缺少解读ID'
    });
  }

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({
      status: 'error',
      message: '评分必须在1-5之间'
    });
  }

  // 这里应该将反馈保存到数据库
  // 暂时只返回成功响应

  res.json({
    status: 'success',
    data: {
      message: '反馈提交成功，感谢您的宝贵意见！'
    }
  });
});

export default router;