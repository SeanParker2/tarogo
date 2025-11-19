import axios from 'axios';
import { config } from '../config';

interface AIInterpretationRequest {
  cards: Array<{
    name: string;
    englishName: string;
    position?: string;
    isReversed: boolean;
  }>;
  question: string;
  type: string;
  userInfo?: {
    nickname: string;
    birthDate?: string;
    gender?: string;
  };
}

interface AIInterpretationResponse {
  interpretation: string;
  advice: string;
  keywords: string[];
  confidence: number;
  mood: 'positive' | 'neutral' | 'negative';
}

/**
 * AI塔罗牌解读服务
 */
export class AIInterpretationService {
  private openaiApiKey: string;
  private claudeApiKey: string;
  private timeout: number;

  constructor() {
    this.openaiApiKey = config.ai.openai.apiKey;
    this.claudeApiKey = config.ai.claude.apiKey;
    this.timeout = config.ai.openai.timeout;
  }

  /**
   * 生成塔罗牌解读
   */
  async generateInterpretation(request: AIInterpretationRequest): Promise<AIInterpretationResponse> {
    try {
      // 构建提示词
      const prompt = this.buildPrompt(request);
      
      // 尝试使用OpenAI
      if (this.openaiApiKey) {
        return await this.callOpenAI(prompt);
      }
      
      // OpenAI失败时尝试Claude
      if (this.claudeApiKey) {
        return await this.callClaude(prompt);
      }
      
      // 如果都没有配置，返回模拟数据
      return this.getMockInterpretation(request);
      
    } catch (error) {
      console.error('AI解读服务错误:', error);
      // 出错时返回模拟数据
      return this.getMockInterpretation(request);
    }
  }

  /**
   * 构建AI提示词
   */
  private buildPrompt(request: AIInterpretationRequest): string {
    const { cards, question, type, userInfo } = request;
    
    const cardDescriptions = cards.map((card, index) => {
      const position = card.position ? `${card.position}位置` : `第${index + 1}张`;
      const orientation = card.isReversed ? '逆位' : '正位';
      return `${position}：${card.name}（${card.englishName}）-${orientation}`;
    }).join('\n');

    const typeDescriptions = {
      'single': '单张牌占卜',
      'three': '三张牌占卜（过去-现在-未来）',
      'celtic': '凯尔特十字牌阵',
      'relationship': '关系牌阵',
      'career': '事业牌阵'
    };

    return `你是一位经验丰富且富有洞察力的塔罗牌占卜师。请基于用户抽到的塔罗牌，结合他们的问题，提供专业、温暖、有启发性的解读。

占卜类型：${typeDescriptions[type as keyof typeof typeDescriptions] || type}
用户问题：${question}

抽到的牌：
${cardDescriptions}

${userInfo ? `用户信息：
- 昵称：${userInfo.nickname}
${userInfo.birthDate ? `- 生日：${userInfo.birthDate}` : ''}
${userInfo.gender ? `- 性别：${userInfo.gender}` : ''}` : ''}

请提供以下内容的解读：
1. 每张牌的含义及其在牌阵中的意义
2. 牌阵整体的综合解读
3. 针对用户问题的具体建议
4. 用温暖、积极、有启发性的语言表达
5. 字数控制在300-500字之间

请以JSON格式返回，包含以下字段：
{
  "interpretation": "详细的解读内容",
  "advice": "具体的建议",
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "confidence": 0.85,
  "mood": "positive"
}`;
  }

  /**
   * 调用OpenAI API
   */
  private async callOpenAI(prompt: string): Promise<AIInterpretationResponse> {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: '你是一位专业的塔罗牌占卜师，具有丰富的占卜经验和深刻的心理洞察力。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
        top_p: 0.9,
      },
      {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: this.timeout,
      }
    );

    const content = response.data.choices[0].message.content;
    
    try {
      // 尝试解析JSON格式的响应
      const parsed = JSON.parse(content);
      return {
        interpretation: parsed.interpretation || content,
        advice: parsed.advice || '',
        keywords: parsed.keywords || [],
        confidence: parsed.confidence || 0.8,
        mood: parsed.mood || 'neutral'
      };
    } catch (error) {
      // 如果不是JSON格式，直接返回文本
      return {
        interpretation: content,
        advice: '',
        keywords: [],
        confidence: 0.8,
        mood: 'neutral'
      };
    }
  }

  /**
   * 调用Claude API
   */
  private async callClaude(prompt: string): Promise<AIInterpretationResponse> {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
      },
      {
        headers: {
          'x-api-key': this.claudeApiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        timeout: this.timeout,
      }
    );

    const content = response.data.content[0].text;
    
    try {
      // 尝试解析JSON格式的响应
      const parsed = JSON.parse(content);
      return {
        interpretation: parsed.interpretation || content,
        advice: parsed.advice || '',
        keywords: parsed.keywords || [],
        confidence: parsed.confidence || 0.8,
        mood: parsed.mood || 'neutral'
      };
    } catch (error) {
      // 如果不是JSON格式，直接返回文本
      return {
        interpretation: content,
        advice: '',
        keywords: [],
        confidence: 0.8,
        mood: 'neutral'
      };
    }
  }

  /**
   * 获取模拟解读（当AI服务不可用时）
   */
  private getMockInterpretation(request: AIInterpretationRequest): AIInterpretationResponse {
    const { cards, question, type } = request;
    
    const mockInterpretations = [
      `根据您抽到的${cards.length}张牌，我为您解读如下：

每张牌都有其独特的含义和位置意义。${cards.map(card => `${card.name}出现在这个位置，代表着${card.isReversed ? '需要特别注意的' : '积极的'}能量和影响`).join('；')}。

整体来看，这个牌阵显示您当前的情况${Math.random() > 0.5 ? '充满机遇' : '需要谨慎对待'}。建议您保持开放的心态，相信直觉的指引。`,
      
      `您抽到的牌面很有意思：

${cards.map(card => `${card.name}的${card.isReversed ? '逆位' : '正位'}出现在这里，暗示着${card.isReversed ? '需要克服的挑战' : '积极的发展方向'}`).join('；')}。

这个牌阵建议您${Math.random() > 0.5 ? '勇敢地迈出下一步' : '耐心等待合适的时机'}。记住，塔罗牌提供的是指引，最终的决定权在您手中。`
    ];

    const randomInterpretation = mockInterpretations[Math.floor(Math.random() * mockInterpretations.length)];
    
    const moods: Array<'positive' | 'neutral' | 'negative'> = ['positive', 'neutral', 'positive'];
    const randomMood = moods[Math.floor(Math.random() * moods.length)];

    return {
      interpretation: randomInterpretation,
      advice: '相信直觉，保持积极的心态，勇敢地面对生活中的每一个选择。',
      keywords: ['直觉', '指引', '机遇', '成长'],
      confidence: 0.75 + Math.random() * 0.2, // 0.75-0.95
      mood: randomMood
    };
  }

  /**
   * 批量生成解读（用于测试或批量处理）
   */
  async batchGenerateInterpretations(requests: AIInterpretationRequest[]): Promise<AIInterpretationResponse[]> {
    const results = await Promise.allSettled(
      requests.map(request => this.generateInterpretation(request))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        // 失败的请求返回模拟数据
        return this.getMockInterpretation(requests[index]);
      }
    });
  }
}

// 创建单例实例
export const aiInterpretationService = new AIInterpretationService();

export default AIInterpretationService;