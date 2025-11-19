App({
  onLaunch() {
    // 初始化云开发环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'your-cloud-env-id',
        traceUser: true,
      });
    }

  // 全局数据
  const acc = wx.getAccountInfoSync?.()
  const env = acc?.miniProgram?.envVersion || 'develop'
  const testBase = 'http://localhost:3000/api'
  const prodBase = 'https://api.tarogo.com/api'
  const apiBase = (env === 'release') ? prodBase : testBase
  this.globalData = {
    userInfo: null,
    isVip: false,
    apiBase,
    systemInfo: wx.getSystemInfoSync(),
    dailyTemplateId: ''
  };

    // 检查登录状态
    this.checkLoginStatus();
  },

  // 检查登录状态
  checkLoginStatus() {
    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.token = token;
      this.getUserInfo();
    }
  },

  // 获取用户信息
  getUserInfo() {
    wx.request({
      url: `${this.globalData.apiBase}/user/profile`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${this.globalData.token}`
      },
      success: (res) => {
        if (res.data.status === 'success') {
          this.globalData.userInfo = res.data.data;
          this.globalData.isVip = res.data.data.isVip;
        }
      },
      fail: (err) => {
        console.error('获取用户信息失败:', err);
      }
    });
  },

  // 全局请求封装
  request(options) {
    const { url, method = 'GET', data = {}, header = {} } = options;
    
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.globalData.apiBase}${url}`,
        method,
        data,
        header: {
          'Content-Type': 'application/json',
          'Authorization': this.globalData.token ? `Bearer ${this.globalData.token}` : '',
          ...header
        },
        success: (res) => {
          if (res.statusCode === 200) {
            if (res.data.status === 'success') {
              resolve(res.data);
            } else {
              reject(res.data);
            }
          } else if (res.statusCode === 401) {
            // 未授权，跳转到登录页
            wx.removeStorageSync('token');
            delete this.globalData.token;
            wx.navigateTo({
              url: '/pages/auth/auth'
            });
            reject(res.data);
          } else {
            reject(res.data);
          }
        },
        fail: reject
      });
    });
  },

  // 显示提示信息
  showToast(title, icon = 'none', duration = 2000) {
    wx.showToast({
      title,
      icon,
      duration
    });
  },

  // 显示加载状态
  showLoading(title = '加载中...') {
    wx.showLoading({
      title,
      mask: true
    });
  },

  // 隐藏加载状态
  hideLoading() {
    wx.hideLoading();
  }
});