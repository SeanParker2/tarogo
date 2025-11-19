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
      single: { title: '单张卡面洞察', subtitle: '快速获得今日能量指引' },
      three: { title: '三张卡面洞察', subtitle: '探索过去、现在、未来的能量' },
      celtic: { title: '十点关系分析', subtitle: '结构化深度分析' },
      love: { title: '情感关系洞察', subtitle: '探索连接与关系' },
      career: { title: '职业发展洞察', subtitle: '职业成长方向' },
      fortune: { title: '每日能量指引', subtitle: '整体能量分析' }
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
    app.showLoading('正在准备洞察...');

    try {
      // 创建洞察记录
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
        throw new Error(result.message || '创建洞察失败');
      }
    } catch (error) {
      console.error('创建洞察失败:', error);
      wx.showToast({
        title: error.message || '创建洞察失败，请重试',
        icon: 'none'
      });
    } finally {
      app.hideLoading();
    }
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: 'AI心理洞察卡片 - 探索内在启示',
      path: '/pages/question/question?type=' + this.data.divinationType,
      imageUrl: '/assets/images/share-question.jpg'
    };
  }
});