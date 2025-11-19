const app = getApp()

Page({
  data: { userInfo: null, isVip: false, stats: {}, token: '', personas: ['治愈型','毒舌型','心理学型','神秘学型','warm','direct','psychology','mystic'], personaIndex: 0, currentPersonaLabel: '治愈型' },
  onShow() {
    this.setData({ userInfo: app.globalData.userInfo, isVip: app.globalData.isVip, token: app.globalData.token || '' })
    this.loadStats()
    this.loadPersona()
  },
  async loadStats() {
    if (!app.globalData.token) return
    try {
      const res = await app.request({ url: '/user/stats', method: 'GET' })
      this.setData({ stats: { total: res.data?.totalDivinations || 0 } })
    } catch(e) {}
  },
  async loadPersona() {
    if (!app.globalData.token) return
    try {
      const res = await app.request({ url: '/user/persona', method: 'GET' })
      const persona = res.data?.persona || '治愈型'
      const idx = this.data.personas.indexOf(persona)
      this.setData({ personaIndex: idx >= 0 ? idx : 0, currentPersonaLabel: persona })
    } catch(e) {}
  },
  async onPersonaChange(e) {
    const idx = Number(e.detail.value)
    const persona = this.data.personas[idx]
    try {
      await app.request({ url: '/user/persona', method: 'PUT', data: { persona } })
      this.setData({ personaIndex: idx, currentPersonaLabel: persona })
      app.showToast('人设已更新', 'success')
    } catch(e) { app.showToast('更新失败') }
  },
  async subscribeDaily() {
    const tmplId = app.globalData.dailyTemplateId || ''
    if (tmplId) {
      try {
        await new Promise((resolve) => wx.requestSubscribeMessage({ tmplIds: [tmplId], success: resolve, fail: resolve }))
      } catch(e) {}
    }
    try {
      await app.request({ url: '/user/subscribe/daily', method: 'POST' })
      app.showToast('订阅成功', 'success')
    } catch(e) { app.showToast('订阅失败') }
  },
  async openVip() {
    try {
      const res = await app.request({ url: '/payment/prepay', method: 'POST', data: { packageId: 2, description: '年度VIP会员' } })
      const p = res.data || {}
      await new Promise((resolve) => wx.requestPayment({ timeStamp: p.timeStamp, nonceStr: p.nonceStr, package: p.package, signType: p.signType, paySign: p.paySign, success: resolve, fail: resolve }))
      app.showToast('支付完成')
    } catch(e) { app.showToast('支付失败') }
  },
  goLogin() { wx.navigateTo({ url: '/pages/auth/auth' }) }
})