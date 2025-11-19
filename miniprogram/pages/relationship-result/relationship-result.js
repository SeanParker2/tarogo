const app = getApp()

Page({
  data: { sessionId: '', A: {}, B: {}, result: null, posterGenerating: false, shareImageUrl: '', _pollTimer: null },
  onLoad(options) {
    const sid = options.sessionId || ''
    this.setData({ sessionId: sid })
    if (sid) {
      this.loadDetail()
      this.startPolling()
    }
  },
  async loadDetail() {
    try {
      const res = await app.request({ url: `/divination/relationship/session/${this.data.sessionId}/detail`, method: 'GET' })
      const r = res.data?.result || null
      this.setData({ A: res.data?.A || {}, B: res.data?.B || {}, result: r })
      if (r) this.stopPolling()
    } catch(e) { app.showToast('加载失败') }
  },
  startPolling() {
    if (this.data._pollTimer) return
    const timer = setInterval(() => { this.loadDetail() }, 5000)
    this.setData({ _pollTimer: timer })
  },
  stopPolling() {
    const t = this.data._pollTimer
    if (t) { clearInterval(t); this.setData({ _pollTimer: null }) }
  },
  onUnload() { this.stopPolling() },
  onShareAppMessage() {
    return { title: '关系洞察报告', path: `/pages/relationship-result/relationship-result?sessionId=${this.data.sessionId}`, imageUrl: this.data.shareImageUrl || '' }
  },
  generatePoster() {
    if (this.data.posterGenerating) return
    this.setData({ posterGenerating: true })
    const ctx = wx.createCanvasContext('rel-poster', this)
    const w = 600, h = 900
    ctx.setFillStyle('#111827')
    ctx.fillRect(0, 0, w, h)
    ctx.setFillStyle('#a78bfa')
    ctx.setFontSize(28)
    ctx.fillText('AI 心理洞察 · 关系报告', 30, 60)
    const Aname = this.data.A?.user?.nickname || '甲方'
    const Bname = this.data.B?.user?.nickname || '乙方'
    ctx.setFillStyle('#e5e7eb')
    ctx.setFontSize(24)
    ctx.fillText(`${Aname} × ${Bname}`, 30, 100)
    const a0 = this.data.A?.cards?.[0]?.imageUrl || ''
    const a1 = this.data.A?.cards?.[1]?.imageUrl || ''
    const a2 = this.data.A?.cards?.[2]?.imageUrl || ''
    const b0 = this.data.B?.cards?.[0]?.imageUrl || ''
    const b1 = this.data.B?.cards?.[1]?.imageUrl || ''
    const b2 = this.data.B?.cards?.[2]?.imageUrl || ''
    let y = 140
    if (a0) ctx.drawImage(a0, 30, y, 160, 240)
    if (a1) ctx.drawImage(a1, 220, y, 160, 240)
    if (a2) ctx.drawImage(a2, 410, y, 160, 240)
    y += 260
    if (b0) ctx.drawImage(b0, 30, y, 160, 240)
    if (b1) ctx.drawImage(b1, 220, y, 160, 240)
    if (b2) ctx.drawImage(b2, 410, y, 160, 240)
    const summary = (this.data.result?.interpretation || '').slice(0, 80)
    ctx.setFillStyle('#d1d5db')
    ctx.setFontSize(20)
    ctx.fillText(summary, 30, 720)
    ctx.draw(false, () => {
      wx.canvasToTempFilePath({
        canvasId: 'rel-poster',
        success: (res) => {
          const fsm = wx.getFileSystemManager()
          fsm.readFile({
            filePath: res.tempFilePath,
            encoding: 'base64',
            success: async (r) => {
              try {
                const uploadRes = await app.request({ url: '/divination/upload/poster', method: 'POST', data: { data: 'data:image/png;base64,' + r.data } })
                const url = uploadRes.data?.url || ''
                this.setData({ shareImageUrl: url })
                wx.saveImageToPhotosAlbum({ filePath: res.tempFilePath, success: () => { wx.showToast({ title: '海报已保存并上传', icon: 'success' }) }, complete: () => { this.setData({ posterGenerating: false }) } })
              } catch (e) {
                this.setData({ posterGenerating: false })
                wx.showToast({ title: '上传失败', icon: 'none' })
              }
            },
            fail: () => {
              this.setData({ posterGenerating: false })
              wx.showToast({ title: '读取失败', icon: 'none' })
            }
          })
        },
        fail: () => { this.setData({ posterGenerating: false }); wx.showToast({ title: '生成失败', icon: 'none' }) }
      }, this)
    })
  }
})