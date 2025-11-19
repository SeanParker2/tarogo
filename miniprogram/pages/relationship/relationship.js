const app = getApp()

Page({
  data: { sessionId: '', question: '', cards: [], result: null, creator: null },
  onLoad(options) {
    const sid = options.sessionId || ''
    if (sid) this.setData({ sessionId: sid })
    if (sid) this.getMeta()
  },
  onSessionInput(e) { this.setData({ sessionId: e.detail.value }) },
  onQuestionInput(e) { this.setData({ question: e.detail.value }) },
  onShareAppMessage() {
    return { title: '好友关系洞察邀请', path: `/pages/relationship/relationship?sessionId=${this.data.sessionId}` }
  },
  async createSession() {
    try {
      const res = await app.request({ url: '/divination/relationship/session/create', method: 'POST' })
      const sid = res.data?.sessionId
      if (!sid) return app.showToast('创建失败')
      this.setData({ sessionId: sid })
      wx.setClipboardData({ data: sid })
      app.showToast('会话ID已复制，分享给好友')
    } catch(e) { app.showToast('创建失败') }
  },
  async getMeta() {
    try {
      const res = await app.request({ url: `/divination/relationship/session/${this.data.sessionId}/meta`, method: 'GET' })
      this.setData({ creator: res.data?.creator || null })
    } catch(e) {}
  },
  async drawCards() {
    try {
      const res = await app.request({ url: '/cards/random?count=3', method: 'GET' })
      const cards = (res.data?.cards || []).map(c => ({ id: c.id, name: c.name, englishName: c.englishName || '', imageUrl: c.imageUrl || c.thumbnailUrl || '', isReversed: !!c.isReversed }))
      this.setData({ cards })
    } catch(e) { app.showToast('选卡失败') }
  },
  async submit() {
    try {
      const payload = { sessionId: this.data.sessionId, cards: this.data.cards, question: this.data.question }
      const res = await app.request({ url: '/divination/relationship/session/submit', method: 'POST', data: payload })
      if (res.data?.ready && res.data?.result) {
        wx.navigateTo({ url: `/pages/relationship-result/relationship-result?sessionId=${this.data.sessionId}` })
      } else {
        app.showToast('等待好友完成选择')
      }
    } catch(e) { app.showToast('提交失败') }
  },
  async checkResult() {
    try {
      const res = await app.request({ url: `/divination/relationship/session/${this.data.sessionId}`, method: 'GET' })
      if (res.data?.ready && res.data?.result) {
        wx.navigateTo({ url: `/pages/relationship-result/relationship-result?sessionId=${this.data.sessionId}` })
      } else {
        app.showToast('报告尚未生成')
      }
    } catch(e) { app.showToast('查询失败') }
  }
})