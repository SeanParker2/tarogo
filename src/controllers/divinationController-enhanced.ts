import { Request, Response } from 'express';
import { cacheService } from '../services/cacheService';
import { logger } from '../utils/logger';
import { AppError } from '../utils/AppError';
import crypto from 'crypto';
import { aiInterpretationService } from '../services/aiInterpretationService';
import { getCardById } from '../models/CardModel';
import { getById } from '../models/UserModel';
import { createRecord, addCardResults, getTypeIdByName } from '../models/RecordModel';

interface DivinationRequest {
  question: string;
  spreadType: string;
  cards: Array<{
    id: number;
    position: number;
    isReversed: boolean;
  }>;
  userId?: string;
  context?: {
    category?: string;
    urgency?: number;
    importance?: number;
  };
}

interface DivinationResult {
  id: string;
  question: string;
  spreadType: string;
  cards: Array<{
    id: number;
    name: string;
    position: number;
    isReversed: boolean;
    interpretation: string;
  }>;
  overallInterpretation: string;
  advice: string;
  confidence: number;
  category: string;
  createdAt: string;
  expiresAt?: string;
}

class DivinationController {
  /**
   * 创建新的占卜
   */
  async createDivination(req: Request, res: Response): Promise<void> {
    try {
      const divinationRequest: DivinationRequest = req.body;
      const userId = req.user?.id;

      // 验证请求数据
      this.validateDivinationRequest(divinationRequest);

      // 生成唯一ID
      const divinationId = this.generateDivinationId(divinationRequest, String(userId));
      
      // 检查是否已有缓存结果
      const cacheKey = `divination:${divinationId}`;
      const cachedResult = await cacheService.get<DivinationResult>(cacheKey, { prefix: 'tarot:' });
      
      if (cachedResult) {
        logger.info(`Divination retrieved from cache: ${divinationId}`);
        res.json({
          success: true,
          data: cachedResult,
          cached: true
        });
        return;
      }

      let interpretation: any = null
      try {
        const enriched = await Promise.all(divinationRequest.cards.map(async (c) => {
          const info: any = await getCardById(c.id)
          return { name: info?.name || `卡牌${c.id}` , englishName: info?.englishName || '', position: String(c.position), isReversed: !!c.isReversed }
        }))
        const user = await getById(Number(userId))
        const lengthLimit = user?.isVip ? 800 : 200
        const payload = { cards: enriched, question: divinationRequest.question, type: divinationRequest.spreadType, userInfo: { nickname: '微信用户' }, lengthLimit }
        interpretation = await aiInterpretationService.generateInterpretation(payload)
      } catch (e) {}
      
      const result: DivinationResult = {
        id: divinationId,
        question: divinationRequest.question,
        spreadType: divinationRequest.spreadType,
        cards: (interpretation?.cards || []).map((x: any) => ({ id: x.id, name: x.name || '', position: x.position || 0, isReversed: !!x.isReversed, interpretation: x.interpretation || '' })),
        overallInterpretation: interpretation?.overallInterpretation || '',
        advice: interpretation?.advice || '',
        confidence: interpretation?.confidence || 0,
        category: interpretation?.category || '',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }

      // 缓存结果（24小时）
      await cacheService.set(cacheKey, result, { 
        prefix: 'tarot:',
        ttl: 86400 
      });

      const typeId = await getTypeIdByName(divinationRequest.spreadType)
      const status = interpretation ? 'completed' : 'pending'
      const recordId = await createRecord({ userId: Number(userId) || 0, typeId, question: divinationRequest.question, ai: interpretation ? { interpretation: result.overallInterpretation, advice: result.advice, confidence: result.confidence } : undefined, status })
      await addCardResults(recordId, divinationRequest.cards.map(c => ({ card_id: c.id, position: c.position, is_reversed: !!c.isReversed })))
      
      // 缓存用户历史记录索引
      if (userId) {
        const userHistoryKey = `user:${userId}:divinations`;
        const userHistory = await cacheService.get<string[]>(userHistoryKey, { prefix: 'tarot:' }) || [];
        userHistory.unshift(String(recordId));
        
        // 只保留最近50次占卜记录
        if (userHistory.length > 50) {
          userHistory.splice(50);
        }
        
        await cacheService.set(userHistoryKey, userHistory, { 
          prefix: 'tarot:',
          ttl: 604800 // 7天
        });
      }

      logger.info(`New divination created: ${recordId}`);
      
      res.json({
        success: true,
        data: { ...result, id: String(recordId) },
        cached: false
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        logger.error('Error creating divination:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to create divination',
          error: (error as Error).message
        });
      }
    }
  }

  /**
   * 获取占卜详情
   */
  async getDivinationById(req: Request, res: Response): Promise<void> {
    try {
      const divinationId = req.params.id;
      const userId = req.user?.id;

      if (!divinationId) {
        throw new AppError('Divination ID is required', 400);
      }

      const cacheKey = `divination:${divinationId}`;
      const cachedResult = await cacheService.get<DivinationResult>(cacheKey, { prefix: 'tarot:' });
      
      if (cachedResult) {
        // 检查用户权限（简单实现）
        if (userId && !this.hasPermissionToView(cachedResult, String(userId))) {
          throw new AppError('Access denied', 403);
        }
        
        logger.info(`Divination retrieved from cache: ${divinationId}`);
        res.json({
          success: true,
          data: cachedResult,
          cached: true
        });
        return;
      }

      throw new AppError('Divination not found', 404);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        logger.error('Error getting divination:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to retrieve divination',
          error: (error as Error).message
        });
      }
    }
  }

  /**
   * 获取用户占卜历史
   */
  async getUserDivinationHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      if (!userId) {
        throw new AppError('User ID is required', 400);
      }

      const cacheKey = `user:${userId}:history:${limit}:${offset}`;
      const cachedHistory = await cacheService.get<DivinationResult[]>(cacheKey, { prefix: 'tarot:' });
      
      if (cachedHistory) {
        logger.info(`User divination history retrieved from cache: ${userId}`);
        res.json({
          success: true,
          data: cachedHistory,
          cached: true,
          pagination: {
            limit,
            offset,
            total: cachedHistory.length
          }
        });
        return;
      }

      // 获取用户历史记录ID列表
      const userHistoryKey = `user:${userId}:divinations`;
      const userHistoryIds = await cacheService.get<string[]>(userHistoryKey, { prefix: 'tarot:' }) || [];
      
      // 分页处理
      const paginatedIds = userHistoryIds.slice(offset, offset + limit);
      
      // 获取详细的占卜记录
      const historyPromises = paginatedIds.map(async (id) => {
        const divinationKey = `divination:${id}`;
        return await cacheService.get<DivinationResult>(divinationKey, { prefix: 'tarot:' });
      });
      
      const history = (await Promise.all(historyPromises)).filter(Boolean) as DivinationResult[];
      
      // 缓存用户历史记录（1小时）
      await cacheService.set(cacheKey, history, { 
        prefix: 'tarot:',
        ttl: 3600 
      });

      logger.info(`User divination history retrieved for user: ${userId}`);
      
      res.json({
        success: true,
        data: history,
        cached: false,
        pagination: {
          limit,
          offset,
          total: userHistoryIds.length
        }
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        logger.error('Error getting user divination history:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to retrieve divination history',
          error: (error as Error).message
        });
      }
    }
  }

  /**
   * 获取热门占卜问题
   */
  async getPopularQuestions(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const timeRange = req.query.timeRange as string || '7d'; // 7天, 30d, 90d

      const cacheKey = `popular:questions:${timeRange}:${limit}`;
      const cachedQuestions = await cacheService.get<Array<{
        question: string;
        count: number;
        category: string;
      }>>(cacheKey, { prefix: 'tarot:' });
      
      if (cachedQuestions) {
        logger.info(`Popular questions retrieved from cache: ${timeRange}`);
        res.json({
          success: true,
          data: cachedQuestions,
          cached: true
        });
        return;
      }

      // 模拟热门问题统计（实际应该基于真实数据）
      const popularQuestions = await this.getPopularQuestionsFromDatabase(timeRange, limit);
      
      // 缓存结果（1小时）
      await cacheService.set(cacheKey, popularQuestions, { 
        prefix: 'tarot:',
        ttl: 3600 
      });

      logger.info(`Popular questions retrieved for time range: ${timeRange}`);
      
      res.json({
        success: true,
        data: popularQuestions,
        cached: false
      });
    } catch (error) {
      logger.error('Error getting popular questions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve popular questions',
        error: (error as Error).message
      });
    }
  }

  /**
   * 清除占卜缓存
   */
  async clearDivinationCache(req: Request, res: Response): Promise<void> {
    try {
      const divinationId = req.params.id;
      
      if (divinationId) {
        // 清除特定占卜缓存
        const cacheKey = `divination:${divinationId}`;
        await cacheService.del(cacheKey, { prefix: 'tarot:' });
        logger.info(`Divination cache cleared: ${divinationId}`);
      } else {
        // 清除所有占卜缓存
        await cacheService.flush('divination:*');
        await cacheService.flush('user:*:divinations');
        await cacheService.flush('user:*:history:*');
        logger.info('All divination cache cleared');
      }
      
      res.json({
        success: true,
        message: divinationId ? 'Divination cache cleared' : 'All divination cache cleared'
      });
    } catch (error) {
      logger.error('Error clearing divination cache:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to clear divination cache',
        error: (error as Error).message
      });
    }
  }

  // 私有辅助方法
  private validateDivinationRequest(request: DivinationRequest): void {
    if (!request.question || request.question.trim().length < 5) {
      throw new AppError('Question must be at least 5 characters long', 400);
    }
    
    if (!request.spreadType || !['single', 'three', 'celtic'].includes(request.spreadType)) {
      throw new AppError('Invalid spread type', 400);
    }
    
    if (!request.cards || request.cards.length === 0) {
      throw new AppError('At least one card is required', 400);
    }
    
    // 验证卡片数量与牌阵匹配
    const expectedCardCount = this.getExpectedCardCount(request.spreadType);
    if (request.cards.length !== expectedCardCount) {
      throw new AppError(`Expected ${expectedCardCount} cards for ${request.spreadType} spread`, 400);
    }
  }

  private getExpectedCardCount(spreadType: string): number {
    const cardCounts: Record<string, number> = {
      'single': 1,
      'three': 3,
      'celtic': 10
    };
    return cardCounts[spreadType] || 1;
  }

  private generateDivinationId(request: DivinationRequest, userId?: string): string {
    const data = {
      question: request.question,
      spreadType: request.spreadType,
      cards: request.cards.map(card => ({
        id: card.id,
        position: card.position,
        isReversed: card.isReversed
      })),
      userId: userId || 'anonymous',
      timestamp: Math.floor(Date.now() / 60000) // 每分钟一个批次
    };
    
    const hash = crypto.createHash('md5');
    hash.update(JSON.stringify(data));
    return hash.digest('hex');
  }

  private async generateAIInterpretation(request: DivinationRequest): Promise<any> {
    // 模拟AI解读（实际应该调用真实的AI服务）
    const cardNames = ['愚者', '魔术师', '女祭司', '皇后', '皇帝', '教皇', '恋人', '战车', '力量', '隐士'];
    
    const cards = request.cards.map((card, index) => ({
      id: card.id,
      name: cardNames[card.id % cardNames.length],
      position: card.position,
      isReversed: card.isReversed,
      interpretation: `第${index + 1}张牌「${cardNames[card.id % cardNames.length]}」${card.isReversed ? '（逆位）' : '（正位）」'}：这张牌代表...`
    }));
    
    return {
      cards,
      overallInterpretation: `根据您提出的「${request.question}」问题，结合${request.spreadType}牌阵的解读...`,
      advice: '建议您保持开放的心态，相信直觉，并采取积极的行动...',
      confidence: Math.random() * 0.3 + 0.7, // 0.7-1.0
      category: this.categorizeQuestion(request.question)
    };
  }

  private categorizeQuestion(question: string): string {
    const categories = [
      { keywords: ['爱情', '感情', '恋爱', '婚姻', '伴侣'], category: '爱情' },
      { keywords: ['事业', '工作', '职业', '发展', '成功'], category: '事业' },
      { keywords: ['健康', '身体', '心理', '精神状态'], category: '健康' },
      { keywords: ['财富', '金钱', '投资', '理财', '收入'], category: '财富' },
      { keywords: ['学习', '考试', '教育', '知识', '技能'], category: '学业' }
    ];
    
    for (const rule of categories) {
      if (rule.keywords.some(keyword => question.includes(keyword))) {
        return rule.category;
      }
    }
    
    return '综合';
  }

  private hasPermissionToView(divination: DivinationResult, userId: string): boolean {
    // 简单的权限检查（实际应该更复杂）
    return true;
  }

  private async getPopularQuestionsFromDatabase(timeRange: string, limit: number): Promise<Array<{
    question: string;
    count: number;
    category: string;
  }>> {
    // 模拟热门问题数据
    const mockQuestions = [
      { question: '我和现任伴侣的未来发展如何？', count: 156, category: '爱情' },
      { question: '我是否应该换工作？', count: 134, category: '事业' },
      { question: '我的健康状况需要注意什么？', count: 98, category: '健康' },
      { question: '我的财务状况会改善吗？', count: 87, category: '财富' },
      { question: '我应该学习什么新技能？', count: 76, category: '学业' },
      { question: '我什么时候会遇到真爱？', count: 65, category: '爱情' },
      { question: '我的创业计划会成功吗？', count: 54, category: '事业' },
      { question: '我应该投资什么项目？', count: 43, category: '财富' },
      { question: '我的考试会通过吗？', count: 32, category: '学业' },
      { question: '我应该搬到新的城市吗？', count: 21, category: '综合' }
    ];
    
    return mockQuestions.slice(0, limit);
  }
}

export const divinationController = new DivinationController();