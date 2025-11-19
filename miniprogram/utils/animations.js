// 3D动画和粒子特效工具

/**
 * 3D卡片翻转动画管理器
 */
class Card3DAnimation {
  constructor() {
    this.animations = new Map();
    this.isWebGLSupported = this.checkWebGLSupport();
  }

  /**
   * 检查WebGL支持
   */
  checkWebGLSupport() {
    try {
      const canvas = wx.createOffscreenCanvas();
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    } catch (e) {
      return false;
    }
  }

  /**
   * 创建3D翻转动画
   */
  create3DFlipAnimation(duration = 800, easing = 'ease-in-out') {
    return wx.createAnimation({
      duration: duration,
      timingFunction: easing,
      transformOrigin: 'center center'
    });
  }

  /**
   * 卡片翻转效果
   */
  flipCard(element, onComplete) {
    const animation = this.create3DFlipAnimation();
    
    // 第一阶段：开始翻转
    animation.rotateY(90).scale(1.1).step({ duration: 300 });
    
    // 第二阶段：完成翻转
    setTimeout(() => {
      if (onComplete) onComplete();
      animation.rotateY(0).scale(1).step({ duration: 500 });
    }, 300);

    return animation.export();
  }

  /**
   * 卡片悬浮效果
   */
  createHoverEffect(element) {
    const animation = wx.createAnimation({
      duration: 300,
      timingFunction: 'ease-out'
    });

    animation.translateY(-10).scale(1.05).step();
    return animation.export();
  }

  /**
   * 卡片点击波纹效果
   */
  createRippleEffect(x, y, element) {
    const ripple = {
      x: x,
      y: y,
      scale: 0,
      opacity: 1
    };

    const animation = wx.createAnimation({
      duration: 600,
      timingFunction: 'ease-out'
    });

    animation.scale(3).opacity(0).step();
    
    return {
      ripple: ripple,
      animation: animation.export()
    };
  }

  /**
   * 洗牌动画序列
   */
  createShuffleSequence() {
    const sequence = [];
    const steps = [
      { rotate: 360, scale: 1.2, duration: 400 },
      { rotate: -180, scale: 0.9, duration: 300 },
      { rotate: 90, scale: 1.1, duration: 200 },
      { rotate: 0, scale: 1, duration: 300 }
    ];

    steps.forEach((step, index) => {
      const animation = wx.createAnimation({
        duration: step.duration,
        timingFunction: 'ease-in-out'
      });
      
      animation.rotate(step.rotate).scale(step.scale).step();
      sequence.push(animation.export());
    });

    return sequence;
  }
}

/**
 * 粒子系统管理器
 */
class ParticleSystem {
  constructor() {
    this.particles = [];
    this.animationFrame = null;
    this.canvas = null;
    this.ctx = null;
  }

  /**
   * 初始化粒子系统
   */
  init(canvasId, pageInstance) {
    this.pageInstance = pageInstance;
    this.query = wx.createSelectorQuery();
    
    this.query.select(`#${canvasId}`).fields({ node: true, size: true }).exec((res) => {
      if (res[0]) {
        this.canvas = res[0].node;
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();
      }
    });
  }

  /**
   * 设置画布
   */
  setupCanvas() {
    const dpr = wx.getSystemInfoSync().pixelRatio;
    this.canvas.width = this.canvas._width * dpr;
    this.canvas.height = this.canvas._height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  /**
   * 创建魔法粒子
   */
  createMagicParticles(count = 50, options = {}) {
    const defaults = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 2,
      color: '#d1c4e9',
      life: 1,
      decay: 0.02,
      gravity: 0.1
    };

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const velocity = 1 + Math.random() * 2;
      
      this.particles.push({
        ...defaults,
        ...options,
        x: options.x || this.canvas._width / 2,
        y: options.y || this.canvas._height / 2,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        size: 1 + Math.random() * 3,
        color: this.getRandomColor(),
        life: 1,
        decay: 0.01 + Math.random() * 0.02
      });
    }

    this.startAnimation();
  }

  /**
   * 创建星尘效果
   */
  createStardustEffect(x, y, count = 30) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 2 + 1,
        color: '#ffffff',
        life: 1,
        decay: 0.02,
        gravity: 0.05,
        twinkle: Math.random() * 0.5 + 0.5
      });
    }

    this.startAnimation();
  }

  /**
   * 创建能量波纹
   */
  createEnergyRipple(x, y, rings = 3) {
    for (let ring = 0; ring < rings; ring++) {
      setTimeout(() => {
        const particles = 20;
        const radius = 20 + ring * 15;
        
        for (let i = 0; i < particles; i++) {
          const angle = (Math.PI * 2 * i) / particles;
          
          this.particles.push({
            x: x + Math.cos(angle) * radius,
            y: y + Math.sin(angle) * radius,
            vx: Math.cos(angle) * 0.5,
            vy: Math.sin(angle) * 0.5,
            size: 2,
            color: this.getRandomColor(['#9c27b0', '#e91e63', '#673ab7']),
            life: 1,
            decay: 0.03,
            type: 'ripple'
          });
        }
      }, ring * 200);
    }

    this.startAnimation();
  }

  /**
   * 动画循环
   */
  startAnimation() {
    if (this.animationFrame) return;
    
    const animate = () => {
      this.ctx.clearRect(0, 0, this.canvas._width, this.canvas._height);
      
      this.updateParticles();
      this.renderParticles();
      
      if (this.particles.length > 0) {
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        this.animationFrame = null;
      }
    };
    
    animate();
  }

  /**
   * 更新粒子
   */
  updateParticles() {
    this.particles = this.particles.filter(particle => {
      // 更新位置
      particle.x += particle.vx;
      particle.y += particle.vy;
      
      // 应用重力
      if (particle.gravity) {
        particle.vy += particle.gravity;
      }
      
      // 更新生命值
      particle.life -= particle.decay;
      
      // 闪烁效果
      if (particle.twinkle) {
        particle.alpha = Math.sin(Date.now() * 0.01) * particle.twinkle + (1 - particle.twinkle);
      } else {
        particle.alpha = particle.life;
      }
      
      // 边界检查
      if (particle.x < 0 || particle.x > this.canvas._width || 
          particle.y < 0 || particle.y > this.canvas._height) {
        return false;
      }
      
      return particle.life > 0;
    });
  }

  /**
   * 渲染粒子
   */
  renderParticles() {
    this.particles.forEach(particle => {
      this.ctx.save();
      
      this.ctx.globalAlpha = particle.alpha || particle.life;
      this.ctx.fillStyle = particle.color;
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = particle.color;
      
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.restore();
    });
  }

  /**
   * 获取随机颜色
   */
  getRandomColor(predefinedColors = null) {
    const colors = predefinedColors || [
      '#d1c4e9', '#9c27b0', '#e91e63', '#673ab7', 
      '#3f51b5', '#2196f3', '#00bcd4', '#4caf50'
    ];
    
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * 停止动画
   */
  stop() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.particles = [];
    
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas._width, this.canvas._height);
    }
  }
}

/**
 * 高级动画效果组合
 */
class AdvancedEffects {
  constructor() {
    this.card3D = new Card3DAnimation();
    this.particles = new ParticleSystem();
  }

  /**
   * 创建神秘的开场动画
   */
  createMysticalIntro(pageInstance) {
    // 星尘效果
    setTimeout(() => {
      this.particles.createStardustEffect(
        wx.getSystemInfoSync().windowWidth / 2,
        200,
        50
      );
    }, 500);

    // 能量波纹
    setTimeout(() => {
      this.particles.createEnergyRipple(
        wx.getSystemInfoSync().windowWidth / 2,
        300,
        3
      );
    }, 1000);

    // 魔法粒子
    setTimeout(() => {
      this.particles.createMagicParticles(30, {
        x: wx.getSystemInfoSync().windowWidth / 2,
        y: 400
      });
    }, 1500);
  }

  /**
   * 卡牌选择特效
   */
  createCardSelectionEffect(x, y, cardElement) {
    // 3D翻转
    const flipAnimation = this.card3D.flipCard(cardElement);
    
    // 能量波纹
    this.particles.createEnergyRipple(x, y, 2);
    
    // 星尘效果
    this.particles.createStardustEffect(x, y, 20);
    
    return flipAnimation;
  }

  /**
   * 占卜完成庆祝动画
   */
  createCompletionCelebration() {
    const screenWidth = wx.getSystemInfoSync().windowWidth;
    const screenHeight = wx.getSystemInfoSync().windowHeight;
    
    // 多重点位粒子爆发
    const positions = [
      { x: screenWidth * 0.2, y: screenHeight * 0.3 },
      { x: screenWidth * 0.5, y: screenHeight * 0.2 },
      { x: screenWidth * 0.8, y: screenHeight * 0.3 },
      { x: screenWidth * 0.3, y: screenHeight * 0.6 },
      { x: screenWidth * 0.7, y: screenHeight * 0.6 }
    ];
    
    positions.forEach((pos, index) => {
      setTimeout(() => {
        this.particles.createMagicParticles(20, pos);
        this.particles.createStardustEffect(pos.x, pos.y, 15);
      }, index * 300);
    });
    
    // 中心大爆发
    setTimeout(() => {
      this.particles.createEnergyRipple(
        screenWidth / 2,
        screenHeight / 2,
        5
      );
    }, positions.length * 300);
  }

  /**
   * 创建神秘的背景动画
   */
  createMysticalBackground() {
    // 创建多个粒子系统层
    const layers = [
      { count: 20, speed: 0.5, color: '#d1c4e9', size: 1 },
      { count: 15, speed: 0.3, color: '#9c27b0', size: 2 },
      { count: 10, speed: 0.2, color: '#e91e63', size: 3 }
    ];
    
    layers.forEach((layer, index) => {
      setTimeout(() => {
        this.particles.createMagicParticles(layer.count, {
          color: layer.color,
          size: layer.size,
          vy: -layer.speed
        });
      }, index * 1000);
    });
  }
}

/**
 * 触摸手势识别器
 */
class TouchGestureRecognizer {
  constructor() {
    this.startTime = 0;
    this.startX = 0;
    this.startY = 0;
    this.gestures = [];
  }

  /**
   * 识别触摸手势
   */
  recognizeGesture(touchStart, touchEnd) {
    const deltaX = touchEnd.x - touchStart.x;
    const deltaY = touchEnd.y - touchStart.y;
    const deltaTime = touchEnd.time - touchStart.time;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // 滑动手势
    if (distance > 50 && deltaTime < 300) {
      const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
      
      if (angle >= -45 && angle <= 45) {
        return { type: 'swipe-right', distance: distance, angle: angle };
      } else if (angle >= 135 || angle <= -135) {
        return { type: 'swipe-left', distance: distance, angle: angle };
      } else if (angle >= 45 && angle <= 135) {
        return { type: 'swipe-down', distance: distance, angle: angle };
      } else {
        return { type: 'swipe-up', distance: distance, angle: angle };
      }
    }
    
    // 长按手势
    if (deltaTime > 500 && distance < 10) {
      return { type: 'long-press', duration: deltaTime };
    }
    
    // 点击手势
    if (distance < 10 && deltaTime < 200) {
      return { type: 'tap', position: touchEnd };
    }
    
    return { type: 'unknown' };
  }

  /**
   * 处理手势
   */
  handleGesture(gesture, element, callback) {
    switch (gesture.type) {
      case 'swipe-right':
        this.handleSwipeRight(element, callback);
        break;
      case 'swipe-left':
        this.handleSwipeLeft(element, callback);
        break;
      case 'long-press':
        this.handleLongPress(element, gesture, callback);
        break;
      case 'tap':
        this.handleTap(element, gesture, callback);
        break;
    }
  }

  /**
   * 处理右滑（翻牌）
   */
  handleSwipeRight(element, callback) {
    const animation = wx.createAnimation({
      duration: 300,
      timingFunction: 'ease-out'
    });
    
    animation.rotateY(90).step()
              .rotateY(0).step();
    
    if (callback) callback(animation.export());
  }

  /**
   * 处理左滑（返回）
   */
  handleSwipeLeft(element, callback) {
    const animation = wx.createAnimation({
      duration: 300,
      timingFunction: 'ease-out'
    });
    
    animation.translateX(-100).opacity(0.5).step()
              .translateX(0).opacity(1).step();
    
    if (callback) callback(animation.export());
  }

  /**
   * 处理长按（显示详细信息）
   */
  handleLongPress(element, gesture, callback) {
    const animation = wx.createAnimation({
      duration: 200,
      timingFunction: 'ease-out'
    });
    
    animation.scale(1.1).step();
    
    if (callback) callback(animation.export(), gesture);
  }

  /**
   * 处理点击（选择）
   */
  handleTap(element, gesture, callback) {
    const animation = wx.createAnimation({
      duration: 150,
      timingFunction: 'ease-out'
    });
    
    animation.scale(0.95).step()
              .scale(1).step();
    
    if (callback) callback(animation.export(), gesture);
  }
}

// 导出实例
const card3DAnimation = new Card3DAnimation();
const particleSystem = new ParticleSystem();
const advancedEffects = new AdvancedEffects();
const touchGestureRecognizer = new TouchGestureRecognizer();

module.exports = {
  Card3DAnimation,
  ParticleSystem,
  AdvancedEffects,
  TouchGestureRecognizer,
  card3DAnimation,
  particleSystem,
  advancedEffects,
  touchGestureRecognizer
};