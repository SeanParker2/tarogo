const app = getApp()

Page({
  data: { records: [] },
  onShow() { this.load() },
  async load() {
    try {
      const res = await app.request({ url: '/divination/history', method: 'GET' })
      const records = res.data?.records || []
      this.setData({ records })
    } catch(e) { app.showToast('获取历史失败') }
  },
  open(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/result/result?recordId=${id}` })
  }
})