import { Router } from 'express';

const router = Router();

/**
 * @route   GET /api/user/profile
 * @desc    获取用户信息
 * @access  Private
 */
router.get('/profile', async (req: any, res: any) => {
  try {
    const userId = req.user?.id;

    // 模拟用户信息
    const mockUser = {
      id: userId,
      nickname: '神秘用户',
      avatarUrl: '/images/default-avatar.png',
      isVip: false,
      vipExpireAt: null,
      totalDivinations: 15,
      lastDivinationAt: new Date(Date.now() - 86400000).toISOString(),
      createdAt: new Date(Date.now() - 864000000).toISOString(),
      settings: {
        notificationEnabled: true,
        dailyTipsEnabled: true,
        language: 'zh-CN',
        theme: 'purple',
        fontSize: 'medium'
      }
    };

    res.json({
      status: 'success',
      data: mockUser
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
 * @route   PUT /api/user/profile
 * @desc    更新用户信息
 * @access  Private
 */
router.put('/profile', async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    const { nickname, avatarUrl, settings } = req.body;

    // 验证输入
    if (nickname && (nickname.length < 2 || nickname.length > 20)) {
      return res.status(400).json({
        status: 'error',
        message: '昵称长度必须在2-20个字符之间'
      });
    }

    if (avatarUrl && !isValidUrl(avatarUrl)) {
      return res.status(400).json({
        status: 'error',
        message: '头像URL格式不正确'
      });
    }

    // 模拟更新用户信息
    const updatedUser = {
      id: userId,
      nickname: nickname || '神秘用户',
      avatarUrl: avatarUrl || '/images/default-avatar.png',
      settings: settings || {
        notificationEnabled: true,
        dailyTipsEnabled: true,
        language: 'zh-CN',
        theme: 'purple',
        fontSize: 'medium'
      }
    };

    return res.json({
      status: 'success',
      data: updatedUser,
      message: '用户信息更新成功'
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: '服务器错误',
      error: (error as any).message
    });
  }
});

/**
 * @route   GET /api/user/stats
 * @desc    获取用户统计数据
 * @access  Private
 */
router.get('/stats', async (req: any, res: any) => {
  try {
    const userId = req.user?.id;

    // 模拟用户统计数据
    const mockStats = {
      totalDivinations: 15,
      thisMonthDivinations: 5,
      thisWeekDivinations: 2,
      favoriteType: 'three',
      mostAskedCategory: 'career',
      averageRating: 4.5,
      favoriteCards: [
        { id: 1, name: '愚者', count: 3 },
        { id: 2, name: '魔术师', count: 2 },
        { id: 3, name: '女祭司', count: 2 }
      ],
      divinationTrend: [
        { date: '2024-01-01', count: 1 },
        { date: '2024-01-02', count: 2 },
        { date: '2024-01-03', count: 0 },
        { date: '2024-01-04', count: 1 },
        { date: '2024-01-05', count: 3 }
      ]
    };

    return res.json({
      status: 'success',
      data: mockStats
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: '服务器错误',
      error: (error as any).message
    });
  }
});

/**
 * @route   GET /api/user/favorites
 * @desc    获取用户收藏
 * @access  Private
 */
router.get('/favorites', async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    const { type = 'all', page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // 模拟收藏数据
    const mockFavorites = [
      {
        id: 'fav_1',
        type: 'card',
        cardId: 1,
        cardName: '愚者',
        cardImage: '/images/cards/fool.jpg',
        notes: '这张牌总能给我新的启发',
        createdAt: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'fav_2',
        type: 'record',
        recordId: 'div_1234567890',
        question: '我的事业发展如何？',
        preview: '根据您抽到的三张牌，我为您解读如下...',
        createdAt: new Date(Date.now() - 172800000).toISOString()
      }
    ];

    return res.json({
      status: 'success',
      data: {
        favorites: mockFavorites,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: mockFavorites.length,
          pages: 1
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: '服务器错误',
      error: (error as any).message
    });
  }
});

/**
 * @route   POST /api/user/favorites
 * @desc    添加收藏
 * @access  Private
 */
router.post('/favorites', async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    const { type, cardId, recordId, notes } = req.body;

    if (!type || !['card', 'record'].includes(type)) {
      return res.status(400).json({
        status: 'error',
        message: '收藏类型必须是 card 或 record'
      });
    }

    if (type === 'card' && !cardId) {
      return res.status(400).json({
        status: 'error',
        message: '收藏卡牌时必须提供cardId'
      });
    }

    if (type === 'record' && !recordId) {
      return res.status(400).json({
        status: 'error',
        message: '收藏记录时必须提供recordId'
      });
    }

    // 模拟添加收藏
    const newFavorite = {
      id: 'fav_' + Date.now(),
      type,
      cardId: type === 'card' ? cardId : null,
      recordId: type === 'record' ? recordId : null,
      notes: notes || '',
      createdAt: new Date().toISOString()
    };

    return res.json({
      status: 'success',
      data: newFavorite,
      message: '收藏成功'
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: '服务器错误',
      error: (error as any).message
    });
  }
});

/**
 * @route   DELETE /api/user/favorites/:id
 * @desc    取消收藏
 * @access  Private
 */
router.delete('/favorites/:id', async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        status: 'error',
        message: '缺少收藏ID'
      });
    }

    return res.json({
      status: 'success',
      data: {
        message: '取消收藏成功'
      }
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: '服务器错误',
      error: (error as any).message
    });
  }
});

/**
 * 验证URL格式
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export default router;