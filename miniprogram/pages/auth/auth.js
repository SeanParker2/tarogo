const app = getApp()

Page({
  data: { avatarUrl: '/images/default-avatar.png' },
  onLogin() {
    wx.getUserProfile({ desc: '用于完善个人资料', success: (profile) => {
      wx.login({ success: async (l) => {
        if (!l.code) return app.showToast('登录失败')
        try {
          const res = await app.request({ url: '/auth/login', method: 'POST', data: { code: l.code, userInfo: profile.userInfo } })
          const token = res.data?.token
          if (!token) return app.showToast('登录失败')
          wx.setStorageSync('token', token)
          app.globalData.token = token
          app.globalData.userInfo = res.data?.userInfo || profile.userInfo
          app.globalData.isVip = !!res.data?.isVip
          app.showToast('登录成功', 'success')
          wx.switchTab({ url: '/pages/index/index' })
        } catch(e) { app.showToast('登录失败，请稍后重试') }
      } })
    }, fail: () => app.showToast('授权失败，请重试') })
  }
})