// 增强版抽卡页面（集成3D动画和粒子特效）
const { imageLazyLoader, virtualList, memoryManager, performanceMonitor } = require('../../utils/performance');
const { card3DAnimation, particleSystem, advancedEffects, touchGestureRecognizer } = require('../../utils/animations');

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
    currentStepText: '静心凝神，让塔罗牌感受你的能量',
    
    // 性能优化
    isLoading: false,
    loadedImages: new Set(),
    virtualData: {
      visibleData: [],
      startIndex: 0,
      offsetY: 0,
      totalHeight: 0
    },
    
    // 3D动画和特效
    showPerformancePanel: false,
    performanceData: {
      pageLoadTime: 0,
      avgApiTime: 0,
      memoryUsage: 0
    },
    touchStartData: null,
    particleCanvasId: 'particle-canvas'
  },

  onLoad: function(options) {
    console.log('增强版抽卡页面加载', options);
    
    const startTime = Date.now();
    performanceMonitor.recordPageLoadTime();
    
    const spreadType = options.spread || 'single';
    const cardsToSelect = this.getCardsToSelect(spreadType);
    
    this.setData({
      spreadType: spreadType,
      cardsToSelect: cardsToSelect
    });
    
    // 初始化虚拟列表
    virtualList.containerHeight = wx.getSystemInfoSync().windowHeight - 200;
    virtualList.itemHeight = 220;
    
    // 初始化粒子系统
    this.initParticleSystem();
    
    // 创建神秘开场动画
    setTimeout(() => {
      advancedEffects.createMysticalIntro(this);
    }, 500);
    
    this.loadTarotCards();
    this.initLazyLoading();
    
    // 性能监控
    this.updatePerformanceData();
  },

  onUnload: function() {
    imageLazyLoader.clearCache();
    memoryManager.clear();
    particleSystem.stop();
  },

  onPageScroll: function(e) {
    if (this.data.currentStep === 2 && this.data.allCards.length > 20) {
      this.handleVirtualScroll(e.scrollTop);
    }
  },

  /**
   * 初始化粒子系统
   */
  initParticleSystem: function() {
    // 创建粒子画布
    this.setData({
      particleCanvasStyle: `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 50;
      `
    });
    
    // 初始化粒子系统
    setTimeout(() => {
      particleSystem.init(this.data.particleCanvasId, this);
    }, 100);
  },

  /**
   * 触摸开始事件
   */
  onTouchStart: function(e) {
    const touch = e.touches[0];
    this.setData({
      touchStartData: {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      }
    });
  },

  /**
   * 触摸结束事件
   */
  onTouchEnd: function(e) {
    if (!this.data.touchStartData) return;
    
    const touch = e.changedTouches[0];
    const touchEndData = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
    
    // 识别手势
    const gesture = touchGestureRecognizer.recognizeGesture(
      this.data.touchStartData,
      touchEndData
    );
    
    // 处理手势
    this.handleGesture(gesture, e.currentTarget);
    
    this.setData({
      touchStartData: null
    });
  },

  /**
   * 处理手势
   */
  handleGesture: function(gesture, element) {
    switch (gesture.type) {
      case 'swipe-right':
        this.handleSwipeRight(element, gesture);
        break;
      case 'swipe-left':
        this.handleSwipeLeft(element, gesture);
        break;
      case 'long-press':
        this.handleLongPress(element, gesture);
        break;
      case 'tap':
        this.handleTap(element, gesture);
        break;
    }
  },

  /**
   * 处理右滑手势（翻牌）
   */
  handleSwipeRight: function(element, gesture) {
    if (this.data.currentStep === 3) {
      // 在翻牌阶段，右滑可以翻牌
      const cardIndex = element.dataset.index;
      if (cardIndex !== undefined) {
        this.revealCard({
          currentTarget: {
            dataset: {
              card: this.data.finalCards[cardIndex],
              index: cardIndex
            }
          }
        });
      }
    }
  },

  /**
   * 处理左滑手势（返回）
   */
  handleSwipeLeft: function(element, gesture) {
    // 可以添加返回逻辑
    if (this.data.currentStep > 1) {
      this.previousStep();
    }
  },

  /**
   * 处理长按手势（显示详情）
   */
  handleLongPress: function(element, gesture) {
    const cardData = element.dataset.card;
    if (cardData) {
      this.showCardDetail(cardData);
    }
  },

  /**
   * 处理点击手势（选择）
   */
  handleTap: function(element, gesture) {
    // 添加点击特效
    this.createTapEffect(gesture.position.x, gesture.position.y);
  },

  /**
   * 创建点击特效
   */
  createTapEffect: function(x, y) {
    // 在点击位置创建粒子效果
    particleSystem.createStardustEffect(x, y, 10);
    
    // 创建能量波纹
    setTimeout(() => {
      particleSystem.createEnergyRipple(x, y, 1);
    }, 100);
  },

  /**
   * 显示卡片详情
   */
  showCardDetail: function(cardData) {
    wx.showModal({
      title: cardData.name,
      content: `牌组: ${cardData.suit}\n正位: ${cardData.meaning_up}\n逆位: ${cardData.meaning_rev}`,
      showCancel: false,
      confirmText: '知道了'
    });
  },

  /**
   * 返回上一步
   */
  previousStep: function() {
    if (this.data.currentStep <= 1) return;
    
    const prevStep = this.data.currentStep - 1;
    const stepTexts = {
      1: '静心凝神，让塔罗牌感受你的能量',
      2: '选择你感应最强的牌',
      3: '翻开塔罗牌，揭示命运的奥秘'
    };
    
    this.setData({
      currentStep: prevStep,
      currentStepText: stepTexts[prevStep]
    });
  },

  /**
   * 处理虚拟列表滚动
   */
  handleVirtualScroll: function(scrollTop) {
    const virtualData = virtualList.updateVirtualList(
      scrollTop * wx.getSystemInfoSync().pixelRatio,
      this.data.allCards
    );
    
    this.setData({
      virtualData: virtualData,
      displayCards: virtualData.visibleData
    });
  },

  /**
   * 初始化图片懒加载
   */
  initLazyLoading: function() {
    let scrollTimer = null;
    
    this.lazyLoadHandler = () => {
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        imageLazyLoader.lazyLoadImages(this, '.lazy-image');
      }, 100);
    };
    
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
    
    const cacheKey = 'tarot_cards_all';
    const cachedCards = memoryManager.get(cacheKey);
    
    if (cachedCards) {
      this.processCards(cachedCards);
      performanceMonitor.recordApiResponseTime('loadTarotCards', Date.now() - apiStartTime);
      return;
    }
    
    wx.showLoading({
      title: '加载塔罗牌中...'
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
            loaded: false
          }));
          
          memoryManager.set(cacheKey, cards, 600000);
          this.processCards(cards);
          
          console.log('塔罗牌加载完成', cards.length);
        } else {
          wx.showToast({
            title: '加载失败',
            icon: 'error'
          });
        }
      },
      fail: (error) => {
        wx.hideLoading();
        performanceMonitor.recordApiResponseTime('loadTarotCards', Date.now() - apiStartTime);
        console.error('加载塔罗牌失败', error);
        this.loadMockCards();
      }
    });
  },

  processCards: function(cards) {
    if (cards.length > 20) {
      const virtualData = virtualList.createVirtualData(cards);
      this.setData({
        allCards: cards,
        virtualData: virtualData,
        displayCards: virtualData.visibleData,
        isLoading: false
      });
    } else {
      this.setData({
        allCards: cards,
        displayCards: cards,
        isLoading: false
      });
    }
  },

  startShuffling: function() {
    if (this.data.isShuffling) return;
    
    this.setData({ isShuffling: true });
    
    // 创建3D洗牌动画序列
    const shuffleSequence = card3DAnimation.createShuffleSequence();
    
    // 播放洗牌音效
    this.playSound('shuffle');
    
    // 创建魔法粒子效果
    particleSystem.createMagicParticles(30, {
      x: wx.getSystemInfoSync().windowWidth / 2,
      y: 300
    });
    
    // 执行动画序列
    let currentStep = 0;
    const executeNextAnimation = () => {
      if (currentStep < shuffleSequence.length) {
        this.setData({
          shuffleAnimation: shuffleSequence[currentStep]
        });
        currentStep++;
        setTimeout(executeNextAnimation, 400);
      } else {
        // 动画完成
        setTimeout(() => {
          this.nextStep();
        }, 500);
      }
    };
    
    executeNextAnimation();
  },

  selectCard: function(e) {
    const { card, index } = e.touches ? e.touches[0] : e.currentTarget.dataset;
    const { selectedCards, cardsToSelect } = this.data;
    
    if (selectedCards.length >= cardsToSelect && !card.selected) {
      wx.showToast({
        title: `已选择 ${cardsToSelect} 张牌`,
        icon: 'none'
      });
      return;
    }
    
    // 创建选择特效
    if (e.touches && e.touches[0]) {
      const touch = e.touches[0];
      advancedEffects.createCardSelectionEffect(
        touch.clientX,
        touch.clientY,
        null
      );
    }
    
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
      
      // 3D翻牌动画
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
    
    // 创建翻牌特效
    const finalCards = this.data.finalCards.slice();
    finalCards[index].revealed = true;
    
    this.setData({
      finalCards: finalCards,
      revealedCount: this.data.revealedCount + 1
    });
    
    // 创建翻牌动画和特效
    if (e.touches && e.touches[0]) {
      const touch = e.touches[0];
      advancedEffects.createCardSelectionEffect(
        touch.clientX,
        touch.clientY,
        null
      );
    }
    
    if (wx.vibrateShort) {
      wx.vibrateShort();
    }
  },

  completeDivination: function() {
    // 创建完成庆祝动画
    advancedEffects.createCompletionCelebration();
    
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
      1: '静心凝神，让塔罗牌感受你的能量',
      2: '选择你感应最强的牌',
      3: '翻开塔罗牌，揭示命运的奥秘'
    };
    
    if (nextStep > 3) return;
    
    this.setData({
      currentStep: nextStep,
      currentStepText: stepTexts[nextStep]
    });
    
    // 步骤切换特效
    if (nextStep === 3) {
      // 进入翻牌阶段，创建神秘背景
      advancedEffects.createMysticalBackground();
    }
  },

  /**
   * 更新性能数据
   */
  updatePerformanceData: function() {
    const report = performanceMonitor.getPerformanceReport();
    
    this.setData({
      performanceData: {
        pageLoadTime: report.pageLoadTime,
        avgApiTime: Math.round(report.avgApiResponseTime),
        memoryUsage: this.getMemoryUsage()
      }
    });
  },

  /**
   * 获取内存使用情况
   */
  getMemoryUsage: function() {
    const systemInfo = wx.getSystemInfoSync();
    return systemInfo.memory ? Math.round(systemInfo.memory / 1024) : 0;
  },

  /**
   * 切换性能面板显示
   */
  togglePerformancePanel: function() {
    this.setData({
      showPerformancePanel: !this.data.showPerformancePanel
    });
    
    if (this.data.showPerformancePanel) {
      this.updatePerformanceData();
    }
  },

  /**
   * 播放音效
   */
  playSound: function(type) {
    const sounds = {
      shuffle: '/sounds/shuffle.mp3',
      select: '/sounds/select.mp3',
      reveal: '/sounds/reveal.mp3',
      complete: '/sounds/complete.mp3'
    };
    
    const audioContext = wx.createInnerAudioContext();
    audioContext.src = sounds[type] || '/sounds/default.mp3';
    audioContext.volume = 0.5;
    audioContext.play().catch(() => {
      // 忽略播放错误
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

  onShareAppMessage: function() {
    return {
      title: 'AI塔罗牌占卜 - 探索命运的奥秘',
      path: '/pages/index/index'
    };
  }
});