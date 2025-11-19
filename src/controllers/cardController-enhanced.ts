import { Request, Response } from 'express';
import { cacheService } from '../services/cacheService';
import { logger } from '../utils/logger';
import { AppError } from '../utils/AppError';

interface Card {
  id: number;
  name: string;
  nameEn: string;
  suit: string;
  number: number;
  keywords: string[];
  description: string;
  uprightMeaning: string;
  reversedMeaning: string;
  imageUrl: string;
  element: string;
  planet: string;
  zodiac: string;
}

interface CardQuery {
  suit?: string;
  element?: string;
  planet?: string;
  zodiac?: string;
  limit?: number;
  offset?: number;
}

class CardController {
  /**
   * 获取所有塔罗牌
   */
  async getAllCards(req: Request, res: Response): Promise<void> {
    try {
      const query: CardQuery = {
        suit: req.query.suit as string,
        element: req.query.element as string,
        planet: req.query.planet as string,
        zodiac: req.query.zodiac as string,
        limit: parseInt(req.query.limit as string) || 78,
        offset: parseInt(req.query.offset as string) || 0
      };

      // 构建缓存键
      const cacheKey = `cards:all:${JSON.stringify(query)}`;
      
      // 尝试从缓存获取
      const cachedCards = await cacheService.get<Card[]>(cacheKey, { prefix: 'tarot:' });
      
      if (cachedCards) {
        logger.info('Cards retrieved from cache');
        res.json({
          success: true,
          data: cachedCards,
          cached: true
        });
        return;
      }

      // 模拟数据库查询（实际应该从数据库获取）
      const allCards: Card[] = await this.getCardsFromDatabase(query);
      
      // 缓存结果（1小时）
      await cacheService.set(cacheKey, allCards, { 
        prefix: 'tarot:',
        ttl: 3600 
      });

      logger.info(`Retrieved ${allCards.length} cards from database`);
      
      res.json({
        success: true,
        data: allCards,
        cached: false
      });
    } catch (error) {
      logger.error('Error getting all cards:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve cards',
        error: (error as Error).message
      });
    }
  }

  /**
   * 获取单张塔罗牌详情
   */
  async getCardById(req: Request, res: Response): Promise<void> {
    try {
      const cardId = parseInt(req.params.id);
      
      if (isNaN(cardId) || cardId < 1 || cardId > 78) {
        throw new AppError('Invalid card ID', 400);
      }

      // 构建缓存键
      const cacheKey = `card:${cardId}`;
      
      // 尝试从缓存获取
      const cachedCard = await cacheService.get<Card>(cacheKey, { prefix: 'tarot:' });
      
      if (cachedCard) {
        logger.info(`Card ${cardId} retrieved from cache`);
        res.json({
          success: true,
          data: cachedCard,
          cached: true
        });
        return;
      }

      // 模拟数据库查询（实际应该从数据库获取）
      const card = await this.getCardFromDatabase(cardId);
      
      if (!card) {
        throw new AppError('Card not found', 404);
      }
      
      // 缓存结果（24小时，单张卡片变化较少）
      await cacheService.set(cacheKey, card, { 
        prefix: 'tarot:',
        ttl: 86400 
      });

      logger.info(`Card ${cardId} retrieved from database`);
      
      res.json({
        success: true,
        data: card,
        cached: false
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        logger.error('Error getting card by ID:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to retrieve card',
          error: (error as Error).message
        });
      }
    }
  }

  /**
   * 随机获取塔罗牌
   */
  async getRandomCards(req: Request, res: Response): Promise<void> {
    try {
      const count = parseInt(req.query.count as string) || 3;
      const allowRepeats = req.query.allowRepeats === 'true';
      
      if (count < 1 || count > 78) {
        throw new AppError('Count must be between 1 and 78', 400);
      }

      // 构建缓存键（包含随机种子以提高缓存命中率）
      const randomSeed = Math.floor(Date.now() / 60000); // 每分钟一个种子
      const cacheKey = `cards:random:${count}:${allowRepeats}:${randomSeed}`;
      
      // 尝试从缓存获取（随机牌缓存1分钟）
      const cachedCards = await cacheService.get<Card[]>(cacheKey, { prefix: 'tarot:' });
      
      if (cachedCards) {
        logger.info(`Random cards retrieved from cache`);
        res.json({
          success: true,
          data: cachedCards,
          cached: true,
          seed: randomSeed
        });
        return;
      }

      // 模拟数据库查询
      const randomCards = await this.getRandomCardsFromDatabase(count, allowRepeats);
      
      // 缓存结果（1分钟）
      await cacheService.set(cacheKey, randomCards, { 
        prefix: 'tarot:',
        ttl: 60 
      });

      logger.info(`Generated ${randomCards.length} random cards`);
      
      res.json({
        success: true,
        data: randomCards,
        cached: false,
        seed: randomSeed
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        logger.error('Error getting random cards:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to retrieve random cards',
          error: (error as Error).message
        });
      }
    }
  }

  /**
   * 获取塔罗牌分类统计
   */
  async getCardStats(req: Request, res: Response): Promise<void> {
    try {
      const cacheKey = 'cards:stats';
      
      // 尝试从缓存获取
      const cachedStats = await cacheService.get<any>(cacheKey, { prefix: 'tarot:' });
      
      if (cachedStats) {
        logger.info('Card stats retrieved from cache');
        res.json({
          success: true,
          data: cachedStats,
          cached: true
        });
        return;
      }

      // 模拟统计查询
      const stats = await this.getCardStatsFromDatabase();
      
      // 缓存结果（6小时，统计数据变化较少）
      await cacheService.set(cacheKey, stats, { 
        prefix: 'tarot:',
        ttl: 21600 
      });

      logger.info('Card stats retrieved from database');
      
      res.json({
        success: true,
        data: stats,
        cached: false
      });
    } catch (error) {
      logger.error('Error getting card stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve card statistics',
        error: (error as Error).message
      });
    }
  }

  /**
   * 清除卡片相关缓存
   */
  async clearCardCache(req: Request, res: Response): Promise<void> {
    try {
      // 清除所有卡片相关缓存
      await cacheService.flush('cards:*');
      await cacheService.flush('card:*');
      
      logger.info('Card cache cleared');
      
      res.json({
        success: true,
        message: 'Card cache cleared successfully'
      });
    } catch (error) {
      logger.error('Error clearing card cache:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to clear card cache',
        error: (error as Error).message
      });
    }
  }

  // 模拟数据库方法（实际应该连接真实数据库）
  private async getCardsFromDatabase(query: CardQuery): Promise<Card[]> {
    // 这里应该连接真实数据库查询
    // 现在返回模拟数据
    const mockCards: Card[] = [];
    
    for (let i = 1; i <= 78; i++) {
      const suits = ['major', 'cups', 'wands', 'swords', 'pentacles'];
      const elements = ['spirit', 'water', 'fire', 'air', 'earth'];
      const planets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
      const zodiacs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
      
      const suit = i === 0 ? 'major' : suits[Math.floor((i - 1) / 14) + 1] || 'major';
      const number = i === 0 ? 0 : (i - 1) % 14 + 1;
      
      const card: Card = {
        id: i,
        name: `塔罗牌 ${i}`,
        nameEn: `Tarot Card ${i}`,
        suit: suit,
        number: number,
        keywords: ['关键词1', '关键词2', '关键词3'],
        description: `这是第${i}张塔罗牌的描述`,
        uprightMeaning: `正位含义：积极的能量和正面的影响`,
        reversedMeaning: `逆位含义：需要注意的挑战和阻碍`,
        imageUrl: `/images/cards/card_${i}.jpg`,
        element: elements[suits.indexOf(suit)] || 'spirit',
        planet: planets[i % planets.length],
        zodiac: zodiacs[i % zodiacs.length]
      };
      
      // 应用查询过滤
      if (query.suit && card.suit !== query.suit) continue;
      if (query.element && card.element !== query.element) continue;
      if (query.planet && card.planet !== query.planet) continue;
      if (query.zodiac && card.zodiac !== query.zodiac) continue;
      
      mockCards.push(card);
    }
    
    // 应用分页
    const start = query.offset || 0;
    const end = start + (query.limit || 78);
    
    return mockCards.slice(start, end);
  }

  private async getCardFromDatabase(cardId: number): Promise<Card | null> {
    const cards = await this.getCardsFromDatabase({ limit: 78, offset: 0 });
    return cards.find(card => card.id === cardId) || null;
  }

  private async getRandomCardsFromDatabase(count: number, allowRepeats: boolean): Promise<Card[]> {
    const allCards = await this.getCardsFromDatabase({ limit: 78, offset: 0 });
    
    if (allowRepeats) {
      const randomCards: Card[] = [];
      for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(Math.random() * allCards.length);
        randomCards.push(allCards[randomIndex]);
      }
      return randomCards;
    } else {
      const shuffled = [...allCards].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count);
    }
  }

  private async getCardStatsFromDatabase(): Promise<any> {
    const allCards = await this.getCardsFromDatabase({ limit: 78, offset: 0 });
    
    const stats = {
      total: allCards.length,
      bySuit: {} as Record<string, number>,
      byElement: {} as Record<string, number>,
      byPlanet: {} as Record<string, number>,
      byZodiac: {} as Record<string, number>
    };
    
    allCards.forEach(card => {
      stats.bySuit[card.suit] = (stats.bySuit[card.suit] || 0) + 1;
      stats.byElement[card.element] = (stats.byElement[card.element] || 0) + 1;
      stats.byPlanet[card.planet] = (stats.byPlanet[card.planet] || 0) + 1;
      stats.byZodiac[card.zodiac] = (stats.byZodiac[card.zodiac] || 0) + 1;
    });
    
    return stats;
  }
}

export const cardController = new CardController();