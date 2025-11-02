/**
 * 智能限流器
 * 提供动态限流、突发请求处理和自适应调整功能
 */

const EventEmitter = require('eventemitter3');

class RateLimiter extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = config;
    
    // 限流状态
    this.tokens = config.burstSize || 5;
    this.maxTokens = config.burstSize || 5;
    this.refillRate = config.requestsPerSecond || 1;
    this.lastRefill = Date.now();
    
    // 请求队列
    this.requestQueue = [];
    this.processingQueue = false;
    
    // 统计信息
    this.stats = {
      totalRequests: 0,
      acceptedRequests: 0,
      rejectedRequests: 0,
      queueSize: 0,
      avgResponseTime: 0,
      errorRate: 0,
      lastAdjustment: Date.now()
    };
    
    // 自适应限流
    this.adaptiveEnabled = config.adaptiveRateLimit || false;
    this.minRate = config.minRequestsPerSecond || 0.5;
    this.maxRate = config.maxRequestsPerSecond || 10;
    this.currentRate = this.refillRate;
    
    // 性能监控
    this.responseTimes = [];
    this.errors = [];
    this.requestHistory = [];
    
    // 冷却期
    this.cooldownPeriod = config.cooldownPeriod || 60000; // 1分钟
    this.lastCooldown = 0;
    
    this.initializeLimiter();
  }

  /**
   * 初始化限流器
   */
  initializeLimiter() {
    // 启动令牌补充定时器
    this.startTokenRefill();
    
    // 启动统计信息更新定时器
    this.startStatsUpdate();
    
    // 启动自适应调整定时器
    if (this.adaptiveEnabled) {
      this.startAdaptiveAdjustment();
    }
    
    console.log(`限流器已初始化: ${this.currentRate} req/s, 突发容量: ${this.maxTokens}`);
  }

  /**
   * 请求限流检查
   * @param {Object} options - 请求选项
   * @returns {Promise<boolean>} - 是否允许请求
   */
  async checkLimit(options = {}) {
    const { priority = 0, site = 'default', adaptive = true } = options;
    
    // 检查冷却期
    if (this.isInCooldown()) {
      return false;
    }
    
    // 检查令牌桶
    if (this.tokens > 0) {
      this.consumeToken();
      this.recordRequest(true, site);
      return true;
    }
    
    // 如果没有令牌，加入队列等待
    if (this.requestQueue.length < 100) { // 队列长度限制
      return new Promise((resolve) => {
        this.requestQueue.push({
          resolve,
          timestamp: Date.now(),
          priority,
          site,
          adaptive
        });
        
        // 按优先级排序
        this.requestQueue.sort((a, b) => b.priority - a.priority);
        this.processQueue();
      });
    }
    
    // 队列已满，拒绝请求
    this.recordRequest(false, site);
    return false;
  }

  /**
   * 消耗令牌
   */
  consumeToken() {
    this.tokens = Math.max(0, this.tokens - 1);
    this.stats.totalRequests++;
    this.stats.acceptedRequests++;
    
    this.emit('token:consumed', {
      tokens: this.tokens,
      timestamp: Date.now()
    });
  }

  /**
   * 补充令牌
   */
  refillTokens() {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000; // 转换为秒
    const tokensToAdd = timePassed * this.currentRate;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
    
    this.emit('token:refilled', {
      tokens: this.tokens,
      rate: this.currentRate,
      timestamp: now
    });
  }

  /**
   * 启动令牌补充
   */
  startTokenRefill() {
    // 使用更精确的定时器
    this.refillInterval = setInterval(() => {
      this.refillTokens();
      this.processQueue();
    }, 100); // 每100ms检查一次
  }

  /**
   * 处理请求队列
   */
  processQueue() {
    if (this.processingQueue || this.requestQueue.length === 0 || this.tokens <= 0) {
      return;
    }
    
    this.processingQueue = true;
    
    while (this.requestQueue.length > 0 && this.tokens > 0) {
      const request = this.requestQueue.shift();
      const waitTime = Date.now() - request.timestamp;
      
      this.consumeToken();
      request.resolve(true);
      
      this.emit('queue:processed', {
        waitTime,
        priority: request.priority,
        site: request.site
      });
    }
    
    this.processingQueue = false;
  }

  /**
   * 记录请求
   * @param {boolean} accepted - 是否被接受
   * @param {string} site - 网站
   */
  recordRequest(accepted, site = 'default') {
    const requestInfo = {
      timestamp: Date.now(),
      accepted,
      site,
      tokens: this.tokens,
      rate: this.currentRate
    };
    
    this.requestHistory.push(requestInfo);
    
    // 保持历史记录在合理范围内
    if (this.requestHistory.length > 1000) {
      this.requestHistory = this.requestHistory.slice(-500);
    }
    
    if (!accepted) {
      this.stats.rejectedRequests++;
      
      // 触发冷却期
      this.triggerCooldown();
    }
    
    this.updateSiteStats(site, accepted);
  }

  /**
   * 更新网站统计
   * @param {string} site - 网站
   * @param {boolean} accepted - 是否被接受
   */
  updateSiteStats(site, accepted) {
    if (!this.siteStats) {
      this.siteStats = {};
    }
    
    if (!this.siteStats[site]) {
      this.siteStats[site] = {
        totalRequests: 0,
        acceptedRequests: 0,
        rejectedRequests: 0,
        avgResponseTime: 0,
        errorRate: 0,
        lastRequest: Date.now()
      };
    }
    
    const stats = this.siteStats[site];
    stats.totalRequests++;
    stats.lastRequest = Date.now();
    
    if (accepted) {
      stats.acceptedRequests++;
    } else {
      stats.rejectedRequests++;
    }
    
    stats.errorRate = stats.rejectedRequests / stats.totalRequests;
  }

  /**
   * 记录响应时间
   * @param {number} responseTime - 响应时间
   * @param {string} site - 网站
   */
  recordResponseTime(responseTime, site = 'default') {
    this.responseTimes.push(responseTime);
    
    // 保持响应时间在合理范围内
    if (this.responseTimes.length > 100) {
      this.responseTimes = this.responseTimes.slice(-50);
    }
    
    // 更新平均响应时间
    this.stats.avgResponseTime = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
    
    // 更新网站统计
    if (this.siteStats && this.siteStats[site]) {
      this.siteStats[site].avgResponseTime = this.stats.avgResponseTime;
    }
  }

  /**
   * 记录错误
   * @param {Error} error - 错误对象
   * @param {string} site - 网站
   */
  recordError(error, site = 'default') {
    this.errors.push({
      timestamp: Date.now(),
      error: error.message,
      site
    });
    
    // 保持错误记录在合理范围内
    if (this.errors.length > 50) {
      this.errors = this.errors.slice(-25);
    }
    
    // 更新错误率
    const recentErrors = this.errors.filter(e => 
      Date.now() - e.timestamp < 300000 // 最近5分钟的错误
    );
    
    const recentRequests = this.requestHistory.filter(r => 
      Date.now() - r.timestamp < 300000 // 最近5分钟的请求
    );
    
    this.stats.errorRate = recentErrors.length / Math.max(recentRequests.length, 1);
    
    // 更新网站统计
    if (this.siteStats && this.siteStats[site]) {
      this.siteStats[site].errorRate = this.stats.errorRate;
    }
  }

  /**
   * 触发冷却期
   */
  triggerCooldown() {
    const now = Date.now();
    
    // 如果最近没有触发冷却期，则触发
    if (now - this.lastCooldown > this.cooldownPeriod / 2) {
      this.lastCooldown = now;
      
      // 临时降低限流速率
      if (this.adaptiveEnabled) {
        this.currentRate = Math.max(this.minRate, this.currentRate * 0.5);
        this.refillRate = this.currentRate;
      }
      
      this.emit('cooldown:triggered', {
        duration: this.cooldownPeriod,
        newRate: this.currentRate,
        reason: 'high_error_rate',
        timestamp: now
      });
    }
  }

  /**
   * 检查是否在冷却期
   * @returns {boolean} - 是否在冷却期
   */
  isInCooldown() {
    return Date.now() - this.lastCooldown < this.cooldownPeriod;
  }

  /**
   * 启动统计信息更新
   */
  startStatsUpdate() {
    this.statsInterval = setInterval(() => {
      this.stats.queueSize = this.requestQueue.length;
      this.emit('stats:updated', this.getStats());
    }, 5000); // 每5秒更新一次
  }

  /**
   * 启动自适应调整
   */
  startAdaptiveAdjustment() {
    this.adaptiveInterval = setInterval(() => {
      this.performAdaptiveAdjustment();
    }, 30000); // 每30秒调整一次
  }

  /**
   * 执行自适应调整
   */
  performAdaptiveAdjustment() {
    const now = Date.now();
    
    // 获取最近的数据
    const recentRequests = this.requestHistory.filter(r => 
      now - r.timestamp < 300000 // 最近5分钟
    );
    
    const recentErrors = this.errors.filter(e => 
      now - e.timestamp < 300000 // 最近5分钟
    );
    
    if (recentRequests.length < 10) {
      return; // 数据不足，不调整
    }
    
    // 计算关键指标
    const errorRate = recentErrors.length / recentRequests.length;
    const avgResponseTime = this.stats.avgResponseTime;
    const rejectionRate = recentRequests.filter(r => !r.accepted).length / recentRequests.length;
    
    // 自适应调整逻辑
    let newRate = this.currentRate;
    
    // 基于错误率调整
    if (errorRate > 0.1) { // 错误率超过10%
      newRate = Math.max(this.minRate, this.currentRate * 0.8);
    } else if (errorRate < 0.01 && rejectionRate < 0.1) { // 错误率低于1%且拒绝率低于10%
      newRate = Math.min(this.maxRate, this.currentRate * 1.2);
    }
    
    // 基于响应时间调整
    if (avgResponseTime > 5000) { // 平均响应时间超过5秒
      newRate = Math.max(this.minRate, this.currentRate * 0.9);
    }
    
    // 应用新的限流速率
    if (newRate !== this.currentRate) {
      const oldRate = this.currentRate;
      this.currentRate = newRate;
      this.refillRate = newRate;
      
      this.stats.lastAdjustment = now;
      
      const reason = `errorRate: ${(errorRate * 100).toFixed(1)}%, avgResponseTime: ${avgResponseTime.toFixed(0)}ms`;
      
      console.log(`自适应限流调整: ${oldRate} -> ${this.currentRate} req/s (${reason})`);
      
      this.emit('rate:adjusted', {
        oldRate: oldRate,
        newRate: this.currentRate,
        reason: reason,
        timestamp: now
      });
    }
  }

  /**
   * 获取限流统计信息
   * @returns {Object} - 统计信息
   */
  getStats() {
    const now = Date.now();
    
    // 计算最近5分钟的统计
    const recentRequests = this.requestHistory.filter(r => 
      now - r.timestamp < 300000
    );
    
    const recentErrors = this.errors.filter(e => 
      now - e.timestamp < 300000
    );
    
    const recentAccepts = recentRequests.filter(r => r.accepted);
    const recentRejections = recentRequests.filter(r => !r.accepted);
    
    return {
      currentRate: this.currentRate,
      tokens: this.tokens,
      maxTokens: this.maxTokens,
      queueSize: this.requestQueue.length,
      totalRequests: this.stats.totalRequests,
      acceptedRequests: this.stats.acceptedRequests,
      rejectedRequests: this.stats.rejectedRequests,
      recentAccepts: recentAccepts.length,
      recentRejections: recentRejections.length,
      recentErrors: recentErrors.length,
      errorRate: this.stats.errorRate,
      avgResponseTime: this.stats.avgResponseTime,
      adaptiveEnabled: this.adaptiveEnabled,
      inCooldown: this.isInCooldown(),
      siteStats: this.siteStats || {},
      lastAdjustment: this.stats.lastAdjustment
    };
  }

  /**
   * 获取网站统计信息
   * @param {string} site - 网站
   * @returns {Object} - 网站统计信息
   */
  getSiteStats(site) {
    if (!this.siteStats || !this.siteStats[site]) {
      return {
        totalRequests: 0,
        acceptedRequests: 0,
        rejectedRequests: 0,
        avgResponseTime: 0,
        errorRate: 0,
        lastRequest: 0
      };
    }
    
    return this.siteStats[site];
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      acceptedRequests: 0,
      rejectedRequests: 0,
      queueSize: 0,
      avgResponseTime: 0,
      errorRate: 0,
      lastAdjustment: Date.now()
    };
    
    this.responseTimes = [];
    this.errors = [];
    this.requestHistory = [];
    this.siteStats = {};
    
    this.emit('stats:reset', {
      timestamp: Date.now()
    });
  }

  /**
   * 更新限流配置
   * @param {Object} newConfig - 新配置
   */
  updateConfig(newConfig) {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    // 更新限流参数
    this.refillRate = newConfig.requestsPerSecond || this.refillRate;
    this.maxTokens = newConfig.burstSize || this.maxTokens;
    this.minRate = newConfig.minRequestsPerSecond || this.minRate;
    this.maxRate = newConfig.maxRequestsPerSecond || this.maxRate;
    this.cooldownPeriod = newConfig.cooldownPeriod || this.cooldownPeriod;
    this.adaptiveEnabled = newConfig.adaptiveRateLimit !== undefined ? 
      newConfig.adaptiveRateLimit : this.adaptiveEnabled;
    
    this.emit('config:updated', {
      oldConfig,
      newConfig: this.config,
      timestamp: Date.now()
    });
  }

  /**
   * 强制暂停限流
   * @param {number} duration - 暂停时间（毫秒）
   */
  pause(duration = 10000) {
    const oldRate = this.currentRate;
    this.currentRate = this.maxRate * 2; // 临时提高速率
    this.refillRate = this.currentRate;
    
    setTimeout(() => {
      this.currentRate = oldRate;
      this.refillRate = oldRate;
      
      this.emit('rate:resumed', {
        oldRate: this.currentRate,
        newRate: oldRate,
        timestamp: Date.now()
      });
    }, duration);
    
    this.emit('rate:paused', {
      duration,
      timestamp: Date.now()
    });
  }

  /**
   * 销毁限流器
   */
  destroy() {
    if (this.refillInterval) {
      clearInterval(this.refillInterval);
    }
    
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }
    
    if (this.adaptiveInterval) {
      clearInterval(this.adaptiveInterval);
    }
    
    this.requestQueue = [];
    this.removeAllListeners();
    
    console.log('限流器已销毁');
  }
}

module.exports = RateLimiter;