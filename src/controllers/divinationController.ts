import { Router } from 'express';
import { createRecord, addCardResults, getTypeIdByName, getHistory, getResult } from '../models/RecordModel';
import { getById } from '../models/UserModel';
import { cacheService } from '../services/cacheService';
import { aiInterpretationService } from '../services/aiInterpretationService';

const router = Router();

/**
 * @route   POST /api/divination/create
 * @desc    创建新的占卜
 * @access  Private
 */
router.post('/create', async (req: any, res: any) => {
  try {
    const { type, question, cards, ai } = req.body;
    const userId = req.user?.id || req.body.userId;

    if (!type || !question || !cards || !Array.isArray(cards)) {
      return res.status(400).json({
        status: 'error',
        message: '缺少必要参数'
      });
    }

    if (!userId) {
      return res.status(401).json({ status: 'error', message: '未授权' });
    }

    // 验证占卜类型
    const validTypes = ['single', 'three', 'celtic', 'relationship', 'career'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        status: 'error',
        message: '无效的占卜类型'
      });
    }

    // 验证卡牌数量
    const expectedCardCount = getExpectedCardCount(type);
    if (cards.length !== expectedCardCount) {
      return res.status(400).json({
        status: 'error',
        message: `占卜类型 ${type} 需要 ${expectedCardCount} 张牌，但提供了 ${cards.length} 张`
      });
    }

    const advanced = ['celtic','career']
    const user = await getById(Number(userId))
    const isVip = !!user?.isVip
    if (advanced.includes(type) && !isVip) {
      return res.status(403).json({ status: 'error', message: '该牌阵为VIP专享，请升级会员' })
    }

    const typeId = await getTypeIdByName(type);
    const recordId = await createRecord({ userId, typeId, question, ai });
    const results = cards.map((c: any, idx: number) => ({ card_id: c.id, position: c.position || idx + 1, position_name: c.positionName || '', is_reversed: !!c.isReversed, interpretation: c.interpretation || '', keywords: Array.isArray(c.keywords) ? c.keywords.join(',') : (c.keywords || ''), position_meaning: c.positionMeaning || '' }));
    await addCardResults(recordId, results);

    res.json({ status: 'success', data: { divinationId: recordId, status: 'completed', message: '占卜已保存' } });
  } catch (error) {
    console.error('创建占卜错误:', error);
    res.status(500).json({
      status: 'error',
      message: '创建占卜失败，请稍后重试'
    });
  }
});

/**
 * @route   GET /api/divination/result/:id
 * @desc    获取占卜结果
 * @access  Private
 */
router.get('/result/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.query.userId;

    if (!id) {
      return res.status(400).json({
        status: 'error',
        message: '缺少占卜记录ID'
      });
    }

    const result = await getResult(parseInt(id));
    if (!result) {
      return res.status(404).json({ status: 'error', message: '记录不存在' });
    }
    res.json({ status: 'success', data: result });
  } catch (error) {
    console.error('获取占卜结果错误:', error);
    res.status(500).json({
      status: 'error',
      message: '获取占卜结果失败，请稍后重试'
    });
  }
});

/**
 * @route   GET /api/divination/history
 * @desc    获取用户占卜历史
 * @access  Private
 */
router.get('/history', async (req: any, res: any) => {
  try {
    const userId = req.user?.id || req.query.userId;
    if (!userId) {
      return res.status(401).json({ status: 'error', message: '未授权' });
    }
    const { page = 1, limit = 10 } = req.query as any;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const { records, total } = await getHistory(parseInt(userId as string), pageNum, limitNum);
    res.json({ status: 'success', data: { records, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } } });
  } catch (error) {
    console.error('获取历史记录错误:', error);
    res.status(500).json({
      status: 'error',
      message: '获取历史记录失败，请稍后重试'
    });
  }
});

/**
 * @route   POST /api/divination/rate
 * @desc    对占卜结果进行评分
 * @access  Private
 */
router.post('/rate', async (req: any, res: any) => {
  try {
    const { divinationId, rating, feedback } = req.body;
    const userId = req.user?.id || req.body.userId;

    if (!divinationId || !rating) {
      return res.status(400).json({
        status: 'error',
        message: '缺少必要参数'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        status: 'error',
        message: '评分必须在1-5之间'
      });
    }

    await (await import('../utils/database')).query(`UPDATE divination_records SET user_rating = ?, user_feedback = ? WHERE id = ? AND user_id = ?`, [rating, feedback || null, divinationId, userId]);
    res.json({ status: 'success', data: { message: '评分提交成功，感谢您的反馈！' } });
  } catch (error) {
    console.error('评分错误:', error);
    res.status(500).json({
      status: 'error',
      message: '提交评分失败，请稍后重试'
    });
  }
});

/**
 * 获取期望的卡牌数量
 */
function getExpectedCardCount(type: string): number {
  const cardCounts: Record<string, number> = {
    'single': 1,
    'three': 3,
    'celtic': 10,
    'relationship': 6,
    'career': 7
  };
  return cardCounts[type] || 3;
}

export default router;

router.post('/relationship/session/create', async (req: any, res: any) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ status: 'error', message: '未授权' })
    const sessionId = 'rel_' + Date.now()
    await cacheService.set(`relationship:session:${sessionId}:creator`, { userId }, { prefix: 'tarot:', ttl: 600 })
    res.json({ status: 'success', data: { sessionId } })
  } catch (error) {
    res.status(500).json({ status: 'error', message: '服务器错误', error: (error as any).message })
  }
})

router.post('/relationship/session/submit', async (req: any, res: any) => {
  try {
    const userId = req.user?.id
    const { sessionId, cards, question } = req.body
    if (!userId) return res.status(401).json({ status: 'error', message: '未授权' })
    if (!sessionId || !Array.isArray(cards) || cards.length !== 3) return res.status(400).json({ status: 'error', message: '参数错误' })
    const creator = await cacheService.get<any>(`relationship:session:${sessionId}:creator`, { prefix: 'tarot:' })
    if (!creator) return res.status(404).json({ status: 'error', message: '会话不存在或已过期' })
    const key = creator.userId === userId ? `relationship:session:${sessionId}:A` : `relationship:session:${sessionId}:B`
    await cacheService.set(key, { userId, cards, question }, { prefix: 'tarot:', ttl: 600 })
    const A = await cacheService.get<any>(`relationship:session:${sessionId}:A`, { prefix: 'tarot:' })
    const B = await cacheService.get<any>(`relationship:session:${sessionId}:B`, { prefix: 'tarot:' })
    if (A && B) {
      const payloadCards = [...A.cards, ...B.cards].map((c: any, i: number) => ({ name: c.name, englishName: c.englishName || '', isReversed: !!c.isReversed, position: String(i + 1) }))
      const mergedQuestion = `关系合盘：甲方「${A.question || ''}」与乙方「${B.question || ''}」`;
      const result = await aiInterpretationService.generateInterpretation({ cards: payloadCards, question: mergedQuestion, type: 'relationship', userInfo: { nickname: '好友合盘' }, lengthLimit: 800 })
      await cacheService.set(`relationship:session:${sessionId}:result`, result, { prefix: 'tarot:', ttl: 600 })
      return res.json({ status: 'success', data: { ready: true, result } })
    }
    res.json({ status: 'success', data: { ready: false } })
  } catch (error) {
    res.status(500).json({ status: 'error', message: '服务器错误', error: (error as any).message })
  }
})

router.get('/relationship/session/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params
    const result = await cacheService.get<any>(`relationship:session:${id}:result`, { prefix: 'tarot:' })
    res.json({ status: 'success', data: { ready: !!result, result: result || null } })
  } catch (error) {
    res.status(500).json({ status: 'error', message: '服务器错误', error: (error as any).message })
  }
})