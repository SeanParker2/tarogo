const app = getApp()

Page({
  data: { avatarUrl: '/images/default-avatar.png' },
  onLogin() {
    wx.login({ success: async (l) => {
      if (!l.code) return app.showToast('登录失败')
      try {
        const res = await app.request({ url: '/auth/login', method: 'POST', data: { code: l.code } })
        const token = res.data?.token
        if (!token) return app.showToast('登录失败')
        wx.setStorageSync('token', token)
        app.globalData.token = token
        app.showToast('登录成功', 'success')
        wx.switchTab({ url: '/pages/index/index' })
      } catch(e) { app.showToast('登录失败，请稍后重试') }
    } })
  }
})