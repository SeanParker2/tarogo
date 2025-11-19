// 性能优化工具函数

/**
 * 图片懒加载管理器
 */
class ImageLazyLoader {
  constructor() {
    this.observers = new Map();
    this.loadingImages = new Set();
    this.loadedImages = new Set();
  }

  /**
   * 创建Intersection Observer
   */
  createObserver(selector, callback) {
    if (this.observers.has(selector)) {
      return this.observers.get(selector);
    }

    const observer = wx.createIntersectionObserver();
    observer.relativeToViewport({ bottom: 100 }).observe(selector, (res) => {
      if (res.intersectionRatio > 0) {
        callback(res);
        // 停止观察已加载的元素
        observer.disconnect();
        this.observers.delete(selector);
      }
    });

    this.observers.set(selector, observer);
    return observer;
  }

  /**
   * 懒加载图片
   */
  lazyLoadImages(pageInstance, imageSelector = '.lazy-image') {
    this.createObserver(imageSelector, (res) => {
      const dataset = res.dataset;
      const src = dataset.src;
      const index = dataset.index;
      
      if (src && !this.loadedImages.has(src)) {
        this.loadImage(pageInstance, src, index);
      }
    });
  }

  /**
   * 加载单张图片
   */
  loadImage(pageInstance, src, index) {
    if (this.loadingImages.has(src) || this.loadedImages.has(src)) {
      return;
    }

    this.loadingImages.add(src);

    // 使用微信图片API预加载
    wx.getImageInfo({
      src: src,
      success: (res) => {
        this.loadedImages.add(src);
        this.loadingImages.delete(src);
        
        // 触发页面更新
        if (pageInstance && index !== undefined) {
          const key = `cards[${index}].loaded`;
          pageInstance.setData({
            [key]: true
          });
        }
      },
      fail: (err) => {
        console.error('图片加载失败:', err);
        this.loadingImages.delete(src);
      }
    });
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.loadingImages.clear();
    this.loadedImages.clear();
  }
}

/**
 * 虚拟列表管理器
 */
class VirtualList {
  constructor(options = {}) {
    this.itemHeight = options.itemHeight || 200; // 每项高度(rpx)
    this.bufferSize = options.bufferSize || 5;   // 缓冲区大小
    this.containerHeight = options.containerHeight || 800;
    this.startIndex = 0;
    this.endIndex = 0;
    this.totalItems = 0;
    this.data = [];
  }

  /**
   * 计算可视范围
   */
  calculateVisibleRange(scrollTop) {
    const visibleCount = Math.ceil(this.containerHeight / this.itemHeight);
    const startIndex = Math.floor(scrollTop / this.itemHeight);
    const endIndex = Math.min(
      startIndex + visibleCount + this.bufferSize,
      this.totalItems
    );

    return {
      startIndex: Math.max(0, startIndex - this.bufferSize),
      endIndex: endIndex,
      offsetY: startIndex * this.itemHeight
    };
  }

  /**
   * 更新虚拟列表
   */
  updateVirtualList(scrollTop, allData) {
    this.data = allData;
    this.totalItems = allData.length;

    const range = this.calculateVisibleRange(scrollTop);
    const visibleData = allData.slice(range.startIndex, range.endIndex);

    return {
      visibleData: visibleData,
      startIndex: range.startIndex,
      offsetY: range.offsetY,
      totalHeight: this.totalItems * this.itemHeight
    };
  }

  /**
   * 创建虚拟列表数据
   */
  createVirtualData(data, scrollTop = 0) {
    return this.updateVirtualList(scrollTop, data);
  }
}

/**
 * 内存管理器
 */
class MemoryManager {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 50; // 最大缓存数量
    this.cleanupThreshold = 0.8; // 清理阈值
  }

  /**
   * 添加缓存
   */
  set(key, value, ttl = 300000) { // 默认5分钟过期
    if (this.cache.size >= this.maxCacheSize) {
      this.cleanup();
    }

    const expiresAt = Date.now() + ttl;
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * 获取缓存
   */
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * 清理过期缓存
   */
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }

    // 如果仍然超过阈值，删除最旧的条目
    if (this.cache.size > this.maxCacheSize * this.cleanupThreshold) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].expiresAt - b[1].expiresAt);
      
      const toDelete = entries.slice(0, Math.floor(this.maxCacheSize * 0.2));
      toDelete.forEach(([key]) => this.cache.delete(key));
    }
  }

  /**
   * 清空缓存
   */
  clear() {
    this.cache.clear();
  }
}

/**
 * 网络请求优化
 */
class NetworkOptimizer {
  constructor() {
    this.requestQueue = [];
    this.isProcessing = false;
    this.batchSize = 5; // 批量请求大小
    this.retryAttempts = 3;
    this.retryDelay = 1000;
  }

  /**
   * 批量请求处理
   */
  async batchRequest(requests) {
    const batches = this.createBatches(requests, this.batchSize);
    const results = [];

    for (const batch of batches) {
      try {
        const batchResults = await Promise.allSettled(
          batch.map(request => this.executeRequest(request))
        );
        results.push(...batchResults);
      } catch (error) {
        console.error('批量请求失败:', error);
      }
    }

    return results;
  }

  /**
   * 创建请求批次
   */
  createBatches(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * 执行请求（带重试机制）
   */
  async executeRequest(request, attempt = 1) {
    try {
      const result = await wx.request({
        url: request.url,
        method: request.method || 'GET',
        data: request.data,
        header: request.header,
        timeout: request.timeout || 5000
      });

      if (result.statusCode >= 200 && result.statusCode < 300) {
        return result.data;
      } else {
        throw new Error(`HTTP ${result.statusCode}`);
      }
    } catch (error) {
      if (attempt < this.retryAttempts) {
        await this.delay(this.retryDelay * attempt);
        return this.executeRequest(request, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 性能监控器
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      pageLoadTime: 0,
      apiResponseTime: [],
      renderTime: [],
      memoryUsage: [],
      errors: []
    };
    this.startTime = Date.now();
  }

  /**
   * 记录页面加载时间
   */
  recordPageLoadTime() {
    const loadTime = Date.now() - this.startTime;
    this.metrics.pageLoadTime = loadTime;
    
    console.log(`页面加载时间: ${loadTime}ms`);
    
    // 如果加载时间超过3秒，记录为性能问题
    if (loadTime > 3000) {
      this.recordPerformanceIssue('slow_page_load', loadTime);
    }
  }

  /**
   * 记录API响应时间
   */
  recordApiResponseTime(apiName, startTime) {
    const responseTime = Date.now() - startTime;
    this.metrics.apiResponseTime.push({
      api: apiName,
      time: responseTime,
      timestamp: Date.now()
    });

    // 如果响应时间超过2秒，记录为性能问题
    if (responseTime > 2000) {
      this.recordPerformanceIssue('slow_api_response', { api: apiName, time: responseTime });
    }
  }

  /**
   * 记录渲染时间
   */
  recordRenderTime(component, startTime) {
    const renderTime = Date.now() - startTime;
    this.metrics.renderTime.push({
      component: component,
      time: renderTime,
      timestamp: Date.now()
    });
  }

  /**
   * 记录性能问题
   */
  recordPerformanceIssue(type, data) {
    this.metrics.errors.push({
      type: type,
      data: data,
      timestamp: Date.now(),
      userAgent: wx.getSystemInfoSync().model
    });
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport() {
    const avgApiTime = this.metrics.apiResponseTime.length > 0 
      ? this.metrics.apiResponseTime.reduce((sum, item) => sum + item.time, 0) / this.metrics.apiResponseTime.length
      : 0;

    const avgRenderTime = this.metrics.renderTime.length > 0
      ? this.metrics.renderTime.reduce((sum, item) => sum + item.time, 0) / this.metrics.renderTime.length
      : 0;

    return {
      pageLoadTime: this.metrics.pageLoadTime,
      avgApiResponseTime: avgApiTime,
      avgRenderTime: avgRenderTime,
      errorCount: this.metrics.errors.length,
      totalRequests: this.metrics.apiResponseTime.length,
      performanceIssues: this.metrics.errors
    };
  }
}

// 导出实例
const imageLazyLoader = new ImageLazyLoader();
const virtualList = new VirtualList();
const memoryManager = new MemoryManager();
const networkOptimizer = new NetworkOptimizer();
const performanceMonitor = new PerformanceMonitor();

module.exports = {
  ImageLazyLoader,
  VirtualList,
  MemoryManager,
  NetworkOptimizer,
  PerformanceMonitor,
  imageLazyLoader,
  virtualList,
  memoryManager,
  networkOptimizer,
  performanceMonitor
};