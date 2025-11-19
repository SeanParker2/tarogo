Page({
  data: {
    currentStep: 1,
    question: '',
    selectedSpread: '',
    pageTitle: '',
    pageSubtitle: '',
    divinationType: '',
    category: '',
    canProceed: false
  },

  onLoad(options) {
    const { type, question, category } = options;
    
    this.setData({
      divinationType: type || 'single',
      question: question || '',
      category: category || '',
      currentStep: question ? 2 : 1
    });

    this.updatePageTitle();
    this.updateCanProceed();
  },

  // 更新页面标题
  updatePageTitle() {
    const titles = {
      single: { title: '单张牌占卜', subtitle: '快速获得今日指引' },
      three: { title: '三张牌占卜', subtitle: '探索过去、现在、未来' },
      celtic: { title: '凯尔特十字', subtitle: '深度全面分析' },
      love: { title: '爱情占卜', subtitle: '探索感情关系' },
      career: { title: '事业占卜', subtitle: '职业发展指引' },
      fortune: { title: '运势占卜', subtitle: '整体运势分析' }
    };

    const titleInfo = titles[this.data.divinationType] || titles.single;
    this.setData({
      pageTitle: titleInfo.title,
      pageSubtitle: titleInfo.subtitle
    });

    // 设置导航栏标题
    wx.setNavigationBarTitle({
      title: titleInfo.title
    });
  },

  // 返回上一页
  goBack() {
    if (this.data.currentStep > 1) {
      this.setData({
        currentStep: this.data.currentStep - 1
      });
      this.updateCanProceed();
    } else {
      wx.navigateBack();
    }
  },

  // 问题输入
  onQuestionInput(e) {
    const question = e.detail.value;
    this.setData({ question });
    this.updateCanProceed();
  },

  // 选择建议问题
  selectSuggestion(e) {
    const question = e.currentTarget.dataset.question;
    this.setData({ question });
    this.updateCanProceed();
  },

  // 选择牌阵
  selectSpread(e) {
    const spread = e.currentTarget.dataset.spread;
    this.setData({ selectedSpread: spread });
    this.updateCanProceed();
  },

  // 更新是否可以继续
  updateCanProceed() {
    let canProceed = false;
    
    if (this.data.currentStep === 1) {
      canProceed = this.data.question.trim().length >= 2;
    } else if (this.data.currentStep === 2) {
      canProceed = !!this.data.selectedSpread;
    }

    this.setData({ canProceed });
  },

  // 下一步
  nextStep() {
    if (!this.data.canProceed) return;

    if (this.data.currentStep === 1) {
      // 第一步：问题输入完成，进入牌阵选择
      this.setData({ currentStep: 2 });
      this.updateCanProceed();
    } else if (this.data.currentStep === 2) {
      // 第二步：牌阵选择完成，开始占卜
      this.startDivination();
    }
  },

  // 上一步
  previousStep() {
    if (this.data.currentStep > 1) {
      this.setData({
        currentStep: this.data.currentStep - 1
      });
      this.updateCanProceed();
    }
  },

  // 开始占卜
  async startDivination() {
    if (!this.data.question.trim() || !this.data.selectedSpread) {
      wx.showToast({
        title: '请完成所有步骤',
        icon: 'none'
      });
      return;
    }

    const app = getApp();
    app.showLoading('正在准备占卜...');

    try {
      // 创建占卜记录
      const result = await app.request('/divination/create', 'POST', {
        question: this.data.question,
        type: this.data.selectedSpread,
        category: this.data.category || 'general'
      });

      if (result.status === 'success') {
        const divinationId = result.data.divinationId;
        
        // 跳转到抽牌页面
        wx.redirectTo({
          url: `/pages/drawing/drawing?divinationId=${divinationId}&type=${this.data.selectedSpread}`
        });
      } else {
        throw new Error(result.message || '创建占卜失败');
      }
    } catch (error) {
      console.error('创建占卜失败:', error);
      wx.showToast({
        title: error.message || '创建占卜失败，请重试',
        icon: 'none'
      });
    } finally {
      app.hideLoading();
    }
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: 'AI塔罗占卜 - 探索内心的智慧',
      path: '/pages/question/question?type=' + this.data.divinationType,
      imageUrl: '/assets/images/share-question.jpg'
    };
  }
});