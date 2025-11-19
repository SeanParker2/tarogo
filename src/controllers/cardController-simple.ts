import { Router } from 'express';

const router = Router();

/**
 * @route   GET /api/cards/list
 * @desc    获取塔罗牌列表
 * @access  Public
 */
router.get('/list', async (req: any, res: any) => {
  try {
    const { type, suit, page = 1, limit = 78 } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // 模拟塔罗牌数据
    const mockCards = [
      {
        id: 1,
        name: '愚者',
        englishName: 'The Fool',
        type: 'major',
        number: 0,
        romanNumeral: '0',
        imageUrl: '/images/cards/fool.jpg',
        thumbnailUrl: '/images/cards/thumb/fool.jpg',
        uprightKeywords: '新开始, 冒险, 纯真, 自由',
        reversedKeywords: '鲁莽, 愚蠢, 缺乏方向, 冲动',
        uprightMeaning: '愚者代表新的开始和冒险。这张牌鼓励你相信自己的直觉，勇敢地踏出舒适圈。',
        reversedMeaning: '逆位的愚者提醒你要谨慎行事，避免过于冲动或鲁莽的决定。',
        description: '愚者是塔罗牌中的第0号牌，象征旅程的开始。他代表着纯真、冒险精神和对未知的勇气。',
        element: '风',
        planet: '天王星',
        keywords: '开始, 冒险, 纯真, 自由, 信任, 新旅程'
      },
      {
        id: 2,
        name: '魔术师',
        englishName: 'The Magician',
        type: 'major',
        number: 1,
        romanNumeral: 'I',
        imageUrl: '/images/cards/magician.jpg',
        thumbnailUrl: '/images/cards/thumb/magician.jpg',
        uprightKeywords: '创造力, 技能, 意志力, 专注',
        reversedKeywords: '操纵, 缺乏专注, 滥用技能, 欺骗',
        uprightMeaning: '魔术师代表你具备实现目标的所有技能和资源。这张牌鼓励你运用意志力来创造现实。',
        reversedMeaning: '逆位的魔术师警告你不要滥用技能或操纵他人，也可能是缺乏专注的表现。',
        description: '魔术师是塔罗牌中的第1号牌，象征创造力和意志力。他代表着将想法转化为现实的能力。',
        element: '风',
        planet: '水星',
        keywords: '创造力, 技能, 意志力, 专注, 实现, 力量'
      },
      {
        id: 3,
        name: '女祭司',
        englishName: 'The High Priestess',
        type: 'major',
        number: 2,
        romanNumeral: 'II',
        imageUrl: '/images/cards/high-priestess.jpg',
        thumbnailUrl: '/images/cards/thumb/high-priestess.jpg',
        uprightKeywords: '直觉, 神秘, 内在智慧, 潜意识',
        reversedKeywords: '缺乏直觉, 秘密, 困惑, 表面化',
        uprightMeaning: '女祭司代表内在的智慧和直觉。这张牌鼓励你倾听内心的声音，相信你的直觉。',
        reversedMeaning: '逆位的女祭司可能表示你忽略了直觉，或者有些秘密需要被揭示。',
        description: '女祭司是塔罗牌中的第2号牌，象征直觉和内在智慧。她代表着潜意识的力量和神秘的知识。',
        element: '水',
        planet: '月亮',
        keywords: '直觉, 神秘, 内在智慧, 潜意识, 秘密, 月亮'
      }
    ];

    // 根据类型筛选
    let filteredCards = mockCards;
    if (type) {
      filteredCards = filteredCards.filter(card => card.type === type);
    }
    if (suit) {
      filteredCards = filteredCards.filter(card => card.suit === suit);
    }

    // 分页
    const total = filteredCards.length;
    const paginatedCards = filteredCards.slice(skip, skip + limitNum);

    res.json({
      status: 'success',
      data: {
        cards: paginatedCards,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('获取塔罗牌列表错误:', error);
    res.status(500).json({
      status: 'error',
      message: '获取塔罗牌列表失败，请稍后重试'
    });
  }
});

/**
 * @route   GET /api/cards/detail/:id
 * @desc    获取单张塔罗牌详情
 * @access  Public
 */
router.get('/detail/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        status: 'error',
        message: '缺少卡牌ID'
      });
    }

    // 模拟单张牌详情
    const mockCard = {
      id: parseInt(id),
      name: '愚者',
      englishName: 'The Fool',
      type: 'major',
      number: 0,
      romanNumeral: '0',
      imageUrl: '/images/cards/fool.jpg',
      thumbnailUrl: '/images/cards/thumb/fool.jpg',
      uprightKeywords: '新开始, 冒险, 纯真, 自由',
      reversedKeywords: '鲁莽, 愚蠢, 缺乏方向, 冲动',
      uprightMeaning: '愚者代表新的开始和冒险。这张牌鼓励你相信自己的直觉，勇敢地踏出舒适圈。',
      reversedMeaning: '逆位的愚者提醒你要谨慎行事，避免过于冲动或鲁莽的决定。',
      description: '愚者是塔罗牌中的第0号牌，象征旅程的开始。他代表着纯真、冒险精神和对未知的勇气。',
      element: '风',
      planet: '天王星',
      zodiacSign: '',
      season: '春天',
      direction: '北',
      color: '白色',
      keywords: '开始, 冒险, 纯真, 自由, 信任, 新旅程',
      interpretations: {
        love: '在爱情中，愚者代表新的恋情开始，充满激情和冒险精神。',
        career: '事业上，愚者鼓励你尝试新的方向，不要害怕失败。',
        finance: '财务上，愚者提醒你要谨慎投资，避免过于冒险的决定。',
        health: '健康方面，愚者代表活力和健康，但要注意安全。'
      }
    };

    res.json({
      status: 'success',
      data: mockCard
    });
  } catch (error) {
    console.error('获取塔罗牌详情错误:', error);
    res.status(500).json({
      status: 'error',
      message: '获取塔罗牌详情失败，请稍后重试'
    });
  }
});

/**
 * @route   GET /api/cards/random
 * @desc    随机获取塔罗牌
 * @access  Public
 */
router.get('/random', async (req: any, res: any) => {
  try {
    const { count = 1, type } = req.query;
    const cardCount = parseInt(count as string);

    if (cardCount < 1 || cardCount > 78) {
      return res.status(400).json({
        status: 'error',
        message: '卡牌数量必须在1-78之间'
      });
    }

    // 模拟随机卡牌
    const mockCards = [
      {
        id: Math.floor(Math.random() * 78) + 1,
        name: '愚者',
        englishName: 'The Fool',
        type: 'major',
        number: 0,
        romanNumeral: '0',
        imageUrl: '/images/cards/fool.jpg',
        thumbnailUrl: '/images/cards/thumb/fool.jpg',
        uprightKeywords: '新开始, 冒险, 纯真, 自由',
        reversedKeywords: '鲁莽, 愚蠢, 缺乏方向, 冲动',
        isReversed: Math.random() > 0.5 // 50%概率逆位
      }
    ];

    // 生成指定数量的随机牌
    const randomCards = Array.from({ length: cardCount }, () => ({
      ...mockCards[0],
      id: Math.floor(Math.random() * 78) + 1,
      isReversed: Math.random() > 0.5
    }));

    res.json({
      status: 'success',
      data: {
        cards: randomCards
      }
    });
  } catch (error) {
    console.error('随机获取塔罗牌错误:', error);
    res.status(500).json({
      status: 'error',
      message: '随机获取塔罗牌失败，请稍后重试'
    });
  }
});

/**
 * @route   GET /api/cards/search
 * @desc    搜索塔罗牌
 * @access  Public
 */
router.get('/search', async (req: any, res: any) => {
  try {
    const { keyword, type } = req.query;

    if (!keyword) {
      return res.status(400).json({
        status: 'error',
        message: '缺少搜索关键词'
      });
    }

    // 模拟搜索结果
    const mockResults = [
      {
        id: 1,
        name: '愚者',
        englishName: 'The Fool',
        type: 'major',
        number: 0,
        romanNumeral: '0',
        imageUrl: '/images/cards/fool.jpg',
        thumbnailUrl: '/images/cards/thumb/fool.jpg',
        uprightKeywords: '新开始, 冒险, 纯真, 自由',
        reversedKeywords: '鲁莽, 愚蠢, 缺乏方向, 冲动',
        relevance: 0.95 // 相关性分数
      }
    ];

    res.json({
      status: 'success',
      data: {
        results: mockResults,
        total: mockResults.length,
        keyword: keyword
      }
    });
  } catch (error) {
    console.error('搜索塔罗牌错误:', error);
    res.status(500).json({
      status: 'error',
      message: '搜索塔罗牌失败，请稍后重试'
    });
  }
});

export default router;