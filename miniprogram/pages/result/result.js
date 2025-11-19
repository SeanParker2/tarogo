const app = getApp()

Page({
  data: {
    cards: [],
    question: '',
    spread: '',
    spreadName: '',
    aiLoading: true,
    aiNodes: [],
    aiRaw: '',
    followUp: '',
    posterGenerating: false
  },

  onLoad(options) {
    const recordId = options.recordId
    if (recordId) {
      this.loadRecord(recordId)
    } else {
      const cards = options.cards ? JSON.parse(decodeURIComponent(options.cards)) : []
      const question = options.question ? decodeURIComponent(options.question) : ''
      const spread = options.spread || 'single'
      const spreadName = this.getSpreadName(spread)
      this.setData({ cards, question, spread, spreadName })
      this.startParticles()
      this.fetchInterpretation()
    }
  },

  onShareAppMessage() {
    return { title: '我的洞察与建议', path: '/pages/result/result' }
  },

  getSpreadName(type) {
    const map = { single: '单张卡面洞察', three: '三张卡面洞察', celtic: '十点关系分析', relationship: '关系洞察', career: '职业发展洞察' }
    return map[type] || '洞察与建议'
  },

  startParticles() {
    try {
      const animations = require('../../utils/animations.js')
      animations.particleSystem.init('particle-canvas', this)
      animations.particleSystem.createMagicParticles(60, {})
    } catch(e) {}
  },

  fetchInterpretation() {
    const cardsPayload = this.data.cards.map((c, i) => ({ id: c.id, name: c.name, isReversed: !!c.isReversed, position: c.position || i + 1, positionName: c.positionName || '', imageUrl: c.imageUrl || c.thumbnailUrl || '' }))
    this.fetchInterpretationStream(cardsPayload)
  },

  fetchInterpretationStream(cardsPayload) {
    const that = this
    let acc = ''
    wx.request({
      url: `${app.globalData.apiBase}/ai/interpret/stream`,
      method: 'POST',
      enableChunked: true,
      data: { cards: cardsPayload, question: this.data.question, type: this.data.spread },
      header: { 'Authorization': app.globalData.token ? `Bearer ${app.globalData.token}` : '' },
      onChunkReceived(res) {
        const txt = res?.data || ''
        if (txt) {
          acc += txt
          const nodes = that.toNodes(acc)
          that.setData({ aiNodes: nodes, aiRaw: acc })
          try {
            const animations = require('../../utils/animations.js')
            animations.particleSystem.flicker?.()
          } catch(e) {}
        }
      },
      success() {
        that.setData({ aiLoading: false })
        that.saveHistory(acc)
        that.saveServer(acc)
      },
      fail() { that.setData({ aiLoading: false }); app.showToast('解读失败，请稍后重试') }
    })
  },

  toNodes(md) {
    const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    const lines = md.split(/\n+/).map(l => l.trim()).filter(Boolean)
    const html = lines.map(l => {
      let h = esc(l)
      h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      return `<p>${h}</p>`
    }).join('')
    return html
  },

  onCardTap(e) {
    const idx = e.currentTarget.dataset.index
    const card = this.data.cards[idx]
    const title = `${card.name}${card.isReversed ? ' · 逆位' : ' · 正位'}`
    const suit = card.suit || ''
    const upright = card.meaning_up || card.upright_meaning || ''
    const reversed = card.meaning_rev || card.reversed_meaning || ''
    const content = `牌组：${suit}\n正位：${upright}\n逆位：${reversed}`
    wx.showModal({ title, content, showCancel: false })
  },

  generatePoster() {
    if (this.data.posterGenerating) return
    this.setData({ posterGenerating: true })
    const ctx = wx.createCanvasContext('poster-canvas', this)
    const w = 600, h = 900
    ctx.setFillStyle('#1f1147')
    ctx.fillRect(0, 0, w, h)
    ctx.setFillStyle('#8b5cf6')
    ctx.setFontSize(28)
    ctx.fillText('AI 心理洞察 · 今日能量指引', 30, 60)
    ctx.setFillStyle('#f5f3ff')
    ctx.setFontSize(24)
    ctx.fillText(`问题：${this.data.question}`, 30, 110)
    const img = this.data.cards[0]?.imageUrl || this.data.cards[0]?.thumbnailUrl || ''
    if (img) {
      ctx.drawImage(img, 30, 140, 540, 700)
    }
    ctx.setFillStyle('#d8b4fe')
    ctx.setFontSize(22)
    ctx.fillText(`${this.data.spreadName}`, 30, 880)
    ctx.draw(false, () => {
      wx.canvasToTempFilePath({
        canvasId: 'poster-canvas',
        success: (res) => {
          wx.saveImageToPhotosAlbum({ filePath: res.tempFilePath, success: () => { wx.showToast({ title: '海报已保存', icon: 'success' }) }, complete: () => { this.setData({ posterGenerating: false }) } })
        },
        fail: () => { this.setData({ posterGenerating: false }); wx.showToast({ title: '生成失败', icon: 'none' }) }
      }, this)
    })
  }

  saveHistory(interpretation) {
    const history = wx.getStorageSync('divinationHistory') || []
    const record = { id: `local_${Date.now()}`, question: this.data.question, type: this.data.spread, cards: this.data.cards, aiInterpretation: interpretation, createdAt: new Date().toISOString() }
    history.unshift(record)
    wx.setStorageSync('divinationHistory', history)
  },

  async saveServer(interpretation) {
    if (!app.globalData.token) return
    try {
      const cardsPayload = this.data.cards.map((c, i) => ({ id: c.id, position: c.position || i + 1, isReversed: !!c.isReversed }))
      await app.request({ url: '/divination/create', method: 'POST', data: { type: this.data.spread, question: this.data.question, cards: cardsPayload, ai: { interpretation } } })
    } catch(e) {}
  },

  async loadRecord(id) {
    try {
      const res = await app.request({ url: `/divination/result/${id}`, method: 'GET' })
      const d = res.data
      const spreadName = this.getSpreadName(d.type)
      const nodes = this.toNodes(d.aiInterpretation || '')
      this.setData({ cards: d.cards || [], question: d.question || '', spread: d.type || '', spreadName, aiNodes: nodes, aiRaw: d.aiInterpretation || '', aiLoading: false })
    } catch(e) { app.showToast('加载记录失败') }
  },

  onFollowUpInput(e) { this.setData({ followUp: e.detail.value }) },
  sendFollowUp() {
    const q = this.data.followUp.trim(); if (!q) return;
    const that = this
    let acc = ''
    wx.request({
      url: `${app.globalData.apiBase}/ai/chat/stream`,
      method: 'POST',
      enableChunked: true,
      data: { recordId: this.options?.recordId, question: q },
      header: { 'Authorization': app.globalData.token ? `Bearer ${app.globalData.token}` : '' },
      onChunkReceived(res) {
        const txt = res?.data || ''
        if (txt) {
          acc += txt
          const nodes = that.toNodes(acc)
          that.setData({ aiNodes: nodes, aiRaw: acc })
        }
      },
      success(res) {
        that.setData({ followUp: '' })
        if (res.statusCode === 403) {
          app.showToast('追问次数已用完，升级VIP可无限追问')
        }
      },
      fail() { app.showToast('追问失败，请稍后重试') }
    })
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})