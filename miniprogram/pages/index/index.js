Page({
  data: {
    dailyCard: null,
    quickQuestion: '',
    isLoading: false
  },

  onLoad() {
    this.loadDailyCard();
  },

  onShow() {
    // 页面显示时刷新数据
    if (this.data.dailyCard === null) {
      this.loadDailyCard();
    }
  },

  // 加载今日塔罗
  async loadDailyCard() {
    try {
      const app = getApp();
      const result = await app.request('/cards/random?count=1');
      
      if (result.status === 'success' && result.data.cards.length > 0) {
        this.setData({
          dailyCard: result.data.cards[0]
        });
      }
    } catch (error) {
      console.error('加载今日塔罗失败:', error);
    }
  },

  // 单张牌占卜
  startSingleDivination(e) {
    wx.navigateTo({
      url: '/pages/question/question?type=single'
    });
  },

  // 三张牌占卜
  startThreeDivination(e) {
    wx.navigateTo({
      url: '/pages/question/question?type=three'
    });
  },

  // 凯尔特十字占卜
  startCelticDivination(e) {
    wx.navigateTo({
      url: '/pages/question/question?type=celtic'
    });
  },

  // 爱情占卜
  startLoveDivination(e) {
    wx.navigateTo({
      url: '/pages/question/question?type=love&category=love'
    });
  },

  // 事业占卜
  startCareerDivination(e) {
    wx.navigateTo({
      url: '/pages/question/question?type=career&category=career'
    });
  },

  // 运势占卜
  startFortuneDivination(e) {
    wx.navigateTo({
      url: '/pages/question/question?type=fortune&category=fortune'
    });
  },

  async startRelationshipSession() {
    try {
      const res = await getApp().request({ url: '/divination/relationship/session/create', method: 'POST' })
      const sessionId = res.data?.sessionId
      if (!sessionId) return getApp().showToast('创建失败')
      wx.setClipboardData({ data: `好友合盘会话ID：${sessionId}` })
      getApp().showToast('会话ID已复制，分享给好友')
    } catch(e) { getApp().showToast('创建失败') }
  },

  // 查看今日塔罗详情
  viewDailyDetail() {
    if (this.data.dailyCard) {
      wx.navigateTo({
        url: `/pages/result/result?cardId=${this.data.dailyCard.id}&type=daily`
      });
    }
  },

  // 输入问题
  onQuestionInput(e) {
    this.setData({
      quickQuestion: e.detail.value
    });
  },

  // 快速提问
  startQuickDivination() {
    const question = this.data.quickQuestion.trim();
    if (!question) {
      wx.showToast({
        title: '请输入你的问题',
        icon: 'none'
      });
      return;
    }

    if (question.length < 2) {
      wx.showToast({
        title: '问题需要至少2个字符',
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/question/question?question=${encodeURIComponent(question)}`
    });
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: 'AI塔罗占卜 - 探索内心的智慧',
      path: '/pages/index/index',
      imageUrl: '/assets/images/share-card.jpg'
    };
  },

  onShareTimeline() {
    return {
      title: 'AI塔罗占卜 - 探索内心的智慧',
      query: '',
      imageUrl: '/assets/images/share-card.jpg'
    };
  }
});