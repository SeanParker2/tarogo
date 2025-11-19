const app = getApp()

Page({
  data: { userInfo: null, isVip: false, stats: {}, token: '' },
  onShow() {
    this.setData({ userInfo: app.globalData.userInfo, isVip: app.globalData.isVip, token: app.globalData.token || '' })
    this.loadStats()
  },
  async loadStats() {
    if (!app.globalData.token) return
    try {
      const res = await app.request({ url: '/user/stats', method: 'GET' })
      this.setData({ stats: { total: res.data?.totalDivinations || 0 } })
    } catch(e) {}
  },
  goLogin() { wx.navigateTo({ url: '/pages/auth/auth' }) }
})