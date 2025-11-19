import { Router, Request, Response } from 'express';
import { getCards, getCardById, countCards } from '../models/CardModel';
import { query } from '../utils/database';
import { cacheService } from '../services/cacheService';

const router = Router();

/**
 * @route   GET /api/cards/list
 * @desc    获取塔罗牌列表
 * @access  Public
 */
router.get('/list', async (req: Request, res: Response) => {
  try {
    const { type, suit } = req.query as any;
    const pageNum = parseInt(String((req.query as any).page || 1));
    const limitNum = parseInt(String((req.query as any).limit || 78));
    const cards = await getCards({ type, suit, page: pageNum, limit: limitNum });
    const total = await countCards({ type, suit });

    res.json({
      status: 'success',
      data: {
        cards,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: '服务器错误',
      error: (error as any).message
    });
  }
});

/**
 * @route   GET /api/cards/detail/:id
 * @desc    获取单张塔罗牌详情
 * @access  Public
 */
router.get('/detail/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        status: 'error',
        message: '缺少卡牌ID'
      });
    }
    const card = await getCardById(parseInt(id));
    if (!card) {
      return res.status(404).json({ status: 'error', message: '卡牌不存在' });
    }
    res.json({ status: 'success', data: card });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: '服务器错误',
      error: (error as any).message
    });
  }
});

/**
 * @route   GET /api/cards/random
 * @desc    随机获取塔罗牌
 * @access  Public
 */
router.get('/random', async (req: Request, res: Response): Promise<any> => {
  try {
    const cardCount = parseInt(String((req.query as any).count || 1));
    const type = (req.query as any).type as string | undefined;
    if (cardCount < 1 || cardCount > 78) {
      return res.status(400).json({ status: 'error', message: '卡牌数量必须在1-78之间' });
    }

    const where = type ? 'WHERE card_type = ?' : '';
    const values: any[] = [];
    if (type) values.push(type);
    const rows: any = await query(`SELECT id, name, english_name AS englishName, card_type AS type, image_url AS imageUrl, thumbnail_url AS thumbnailUrl FROM tarot_cards ${where} ORDER BY RAND() LIMIT ?`, [...values, cardCount]);
    const randomCards = rows.map((r: any) => ({ ...r, isReversed: Math.random() > 0.5 }));

    res.json({
      status: 'success',
      data: {
        cards: randomCards
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: '服务器错误',
      error: (error as any).message
    });
  }
});

/**
 * @route   GET /api/cards/search
 * @desc    搜索塔罗牌
 * @access  Public
 */
router.get('/search', async (req: Request, res: Response): Promise<any> => {
  try {
    const keyword = String((req.query as any).keyword || '')
    const type = (req.query as any).type as string | undefined
    if (!keyword) {
      return res.status(400).json({ status: 'error', message: '缺少搜索关键词' });
    }

    const values: any[] = [];
    let where = '';
    if (type) { where = 'card_type = ? AND '; values.push(type); }
    const like = `%${keyword}%`;
    values.push(like, like, like, like);
    const rows: any = await query(
      `SELECT id, name, english_name AS englishName, card_type AS type, image_url AS imageUrl, thumbnail_url AS thumbnailUrl, upright_keywords AS uprightKeywords, reversed_keywords AS reversedKeywords 
       FROM tarot_cards 
       WHERE ${where}(name LIKE ? OR english_name LIKE ? OR upright_keywords LIKE ? OR reversed_keywords LIKE ?)
       ORDER BY id LIMIT 50`,
      values
    );

    res.json({ status: 'success', data: { results: rows, total: rows.length, keyword } });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: '服务器错误',
      error: (error as any).message
    });
  }
});

router.get('/daily', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || req.ip || 'guest'
    const date = new Date().toISOString().slice(0,10)
    const key = `daily_card_user_${userId}_${date}`
    const data = await cacheService.getOrFetch<any>(key, async () => {
      const rows: any = await query('SELECT id, name, english_name AS englishName, card_type AS type, image_url AS imageUrl, thumbnail_url AS thumbnailUrl FROM tarot_cards ORDER BY RAND() LIMIT 1')
      const card = { ...rows[0], isReversed: Math.random() > 0.5 }
      return card
    }, { ttl: 24 * 60 * 60 })
    res.json({ status: 'success', data })
  } catch (error) {
    res.status(500).json({ status: 'error', message: '服务器错误', error: (error as any).message })
  }
})

export default router;