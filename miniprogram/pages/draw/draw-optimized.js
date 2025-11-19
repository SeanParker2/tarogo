// 抽卡页面逻辑（集成性能优化）
const { imageLazyLoader, virtualList, memoryManager, performanceMonitor } = require('../../utils/performance');

Page({
  data: {
    currentStep: 1,
    spreadType: 'single',
    cardsToSelect: 1,
    isShuffling: false,
    showMagicEffects: false,
    allCards: [],
    displayCards: [],
    selectedCards: [],
    finalCards: [],
    revealedCount: 0,
    shuffleAnimation: {},
    completeBtnAnimation: {},
    currentStepText: '静心凝神，让象征卡片感受你的能量',
    
    // 性能优化相关
    isLoading: false,
    loadedImages: new Set(),
    virtualData: {
      visibleData: [],
      startIndex: 0,
      offsetY: 0,
      totalHeight: 0
    },
    page: 1,
    pageSize: 20,
    hasMore: true
  },

  onLoad: function(options) {
    console.log('抽卡页面加载', options);
    
    const startTime = Date.now();
    performanceMonitor.recordPageLoadTime();
    
    const spreadType = options.spread || 'single';
    const cardsToSelect = this.getCardsToSelect(spreadType);
    
    this.setData({
      spreadType: spreadType,
      cardsToSelect: cardsToSelect
    });
    
    // 初始化虚拟列表配置
    virtualList.containerHeight = wx.getSystemInfoSync().windowHeight - 200;
    virtualList.itemHeight = 220; // 卡片项高度
    
    this.loadTarotCards();
    
    // 初始化图片懒加载
    this.initLazyLoading();
  },

  onUnload: function() {
    // 清理资源
    imageLazyLoader.clearCache();
    memoryManager.clear();
  },

  onPageScroll: function(e) {},

  /**
   * 处理虚拟列表滚动
   */
  handleVirtualScroll: function(scrollTop) {},

  /**
   * 初始化图片懒加载
   */
  initLazyLoading: function() {
    // 使用防抖优化滚动事件
    let scrollTimer = null;
    
    this.lazyLoadHandler = () => {
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        imageLazyLoader.lazyLoadImages(this, '.card-image');
      }, 100);
    };
    
    // 监听滚动事件
    this.lazyLoadHandler();
  },

  getCardsToSelect: function(spreadType) {
    const cardCounts = {
      'single': 1,
      'three': 3,
      'celtic': 10,
      'love': 6,
      'career': 5,
      'fortune': 7
    };
    return cardCounts[spreadType] || 1;
  },

  loadTarotCards: function() {
    this.setData({ isLoading: true });
    const apiStartTime = Date.now();
    
    // 先检查内存缓存
    const cacheKey = 'tarot_cards_all';
    const cachedCards = memoryManager.get(cacheKey);
    
    if (cachedCards) {
      this.processCards(cachedCards);
      performanceMonitor.recordApiResponseTime('loadTarotCards', Date.now() - apiStartTime);
      return;
    }
    
    wx.showLoading({
      title: '加载象征卡片...'
    });

    wx.request({
      url: 'http://localhost:3000/api/cards',
      method: 'GET',
      success: (res) => {
        wx.hideLoading();
        performanceMonitor.recordApiResponseTime('loadTarotCards', Date.now() - apiStartTime);
        
        if (res.data.success) {
          const cards = res.data.data.map(card => ({
            ...card,
            selected: false,
            flipped: false,
            revealed: false,
            position: Math.random() > 0.5 ? 'upright' : 'reversed',
            animation: {},
            loaded: false // 图片加载状态
          }));
          
          // 缓存到内存
          memoryManager.set(cacheKey, cards, 600000); // 10分钟缓存
          
          this.processCards(cards);
          
          console.log('象征卡片加载完成', cards.length);
        } else {
          wx.showToast({
            title: '加载失败',
            icon: 'error'
          });
        }
      },
      fail: (error) => {
        wx.hideLoading();
        console.error('加载象征卡片失败', error);
        performanceMonitor.recordApiResponseTime('loadTarotCards', Date.now() - apiStartTime);
        
        // 使用模拟数据
        this.loadMockCards();
      }
    });
  },

  processCards: function(cards) {
    const pageSize = this.data.pageSize
    const first = cards.slice(0, pageSize)
    this.setData({ allCards: cards, displayCards: first, page: 1, hasMore: cards.length > pageSize, isLoading: false })
  },

  onReachBottom: function() {
    if (!this.data.hasMore || this.data.currentStep !== 2) return
    const nextPage = this.data.page + 1
    const start = (nextPage - 1) * this.data.pageSize
    const end = start + this.data.pageSize
    const next = this.data.allCards.slice(start, end)
    if (next.length === 0) { this.setData({ hasMore: false }); return }
    this.setData({ displayCards: this.data.displayCards.concat(next), page: nextPage, hasMore: this.data.allCards.length > end })
  },

  loadMockCards: function() {
    const mockCards = [
      { id: 1, name: '愚者', suit: '大阿卡纳', image: '/images/cards/fool.jpg', meaning_up: '新的开始', meaning_rev: '鲁莽冲动' },
      { id: 2, name: '魔术师', suit: '大阿卡纳', image: '/images/cards/magician.jpg', meaning_up: '创造力', meaning_rev: '操纵' },
      { id: 3, name: '女祭司', suit: '大阿卡纳', image: '/images/cards/priestess.jpg', meaning_up: '直觉', meaning_rev: '秘密' },
      { id: 4, name: '皇后', suit: '大阿卡纳', image: '/images/cards/empress.jpg', meaning_up: '丰饶', meaning_rev: '依赖' },
      { id: 5, name: '皇帝', suit: '大阿卡纳', image: '/images/cards/emperor.jpg', meaning_up: '权威', meaning_rev: '专制' },
      { id: 6, name: '教皇', suit: '大阿卡纳', image: '/images/cards/hierophant.jpg', meaning_up: '传统', meaning_rev: '叛逆' }
    ];

    const cards = mockCards.map(card => ({
      ...card,
      selected: false,
      flipped: false,
      revealed: false,
      position: Math.random() > 0.5 ? 'upright' : 'reversed',
      animation: {},
      loaded: false
    }));

    this.processCards(cards);
  },

  startShuffling: function() {
    if (this.data.isShuffling) return;
    
    this.setData({ isShuffling: true });
    
    // 创建洗牌动画
    const animation = wx.createAnimation({
      duration: 2000,
      timingFunction: 'ease-in-out'
    });
    
    animation.scale(1.1).rotate(360).step()
              .scale(0.9).rotate(-180).step()
              .scale(1.0).rotate(0).step();
    
    this.setData({
      shuffleAnimation: animation.export()
    });
    
    // 2秒后进入下一步
    setTimeout(() => {
      this.nextStep();
    }, 2000);
  },

  selectCard: function(e) {
    const { card, index } = e.currentTarget.dataset;
    const { selectedCards, cardsToSelect } = this.data;
    
    if (selectedCards.length >= cardsToSelect && !card.selected) {
      wx.showToast({
        title: `已选择 ${cardsToSelect} 张牌`,
        icon: 'none'
      });
      return;
    }
    
    // 切换选择状态
    const displayCards = this.data.displayCards.slice();
    const selectedCard = displayCards[index];
    
    if (selectedCard.selected) {
      selectedCard.selected = false;
      selectedCard.flipped = false;
      
      const newSelectedCards = selectedCards.filter(c => c.id !== card.id);
      newSelectedCards.forEach((c, i) => {
        c.selectionNumber = i + 1;
      });
      
      this.setData({
        displayCards: displayCards,
        selectedCards: newSelectedCards
      });
      
    } else {
      selectedCard.selected = true;
      selectedCard.selectionNumber = selectedCards.length + 1;
      
      setTimeout(() => {
        selectedCard.flipped = true;
        this.setData({ displayCards: displayCards });
      }, 200);
      
      const newSelectedCards = [...selectedCards, selectedCard];
      
      this.setData({
        displayCards: displayCards,
        selectedCards: newSelectedCards
      });
      
      if (newSelectedCards.length === cardsToSelect) {
        setTimeout(() => {
          wx.showToast({
            title: '选择完成！',
            icon: 'success'
          });
        }, 500);
      }
    }
  },

  confirmSelection: function() {
    if (this.data.selectedCards.length !== this.data.cardsToSelect) {
      wx.showToast({
        title: `请选择 ${this.data.cardsToSelect} 张牌`,
        icon: 'none'
      });
      return;
    }
    
    const finalCards = this.data.selectedCards.map(card => ({
      ...card,
      revealed: false
    }));
    
    this.setData({
      finalCards: finalCards
    });
    
    this.nextStep();
  },

  revealCard: function(e) {
    const { card, index } = e.currentTarget.dataset;
    
    if (card.revealed) return;
    
    const finalCards = this.data.finalCards.slice();
    finalCards[index].revealed = true;
    
    this.setData({
      finalCards: finalCards,
      revealedCount: this.data.revealedCount + 1
    });
    
    if (wx.vibrateShort) {
      wx.vibrateShort();
    }
  },

  completeDivination: function() {
    this.saveDivinationResult();
    
    const finalCards = this.data.finalCards;
    const question = wx.getStorageSync('currentQuestion') || '';
    const spreadType = this.data.spreadType;
    
    wx.navigateTo({
      url: `/pages/result/result?cards=${encodeURIComponent(JSON.stringify(finalCards))}&question=${encodeURIComponent(question)}&spread=${spreadType}`
    });
  },

  nextStep: function() {
    const nextStep = this.data.currentStep + 1;
    const stepTexts = {
      1: '静心凝神，让象征卡片感受你的能量',
      2: '选择你感应最强的牌',
      3: '翻开卡面，洞察内在能量'
    };
    
    if (nextStep > 3) return;
    
    this.setData({
      currentStep: nextStep,
      currentStepText: stepTexts[nextStep]
    });
  },

  saveDivinationResult: function() {
    const result = {
      id: Date.now(),
      question: wx.getStorageSync('currentQuestion') || '',
      spreadType: this.data.spreadType,
      cards: this.data.finalCards,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toLocaleString('zh-CN')
    };
    
    let history = wx.getStorageSync('divinationHistory') || [];
    history.unshift(result);
    
    if (history.length > 50) {
      history = history.slice(0, 50);
    }
    
    wx.setStorageSync('divinationHistory', history);
    wx.removeStorageSync('currentQuestion');
  },

  shuffleArray: function(array) {
    const shuffled = array.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },

  onShareAppMessage: function() {
    return {
      title: 'AI心理洞察卡片 - 探索内在启示',
      path: '/pages/index/index'
    };
  }
});