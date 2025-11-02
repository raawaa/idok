/**
 * 网络爬虫服务主入口
 * 集成所有爬虫组件，提供统一的API接口
 */

const axios = require('axios');
const https = require('https');
const { JSDOM } = require('jsdom');
const iconv = require('iconv-lite');

const WebScraperConfig = require('./config');
const ErrorHandler = require('./error-handler');
const AntiBotDetector = require('./anti-bot-detector');
const ProxyManager = require('./proxy-manager');
const RateLimiter = require('./rate-limiter');

class WebScraperService {
  constructor(configPath = null) {
    this.config = new WebScraperConfig();
    if (configPath) {
      this.config.configPath = configPath;
      this.config.currentConfig = this.config.loadConfig();
    }
    
    this.errorHandler = new ErrorHandler(this.config.get('base'));
    this.antiBotDetector = new AntiBotDetector(this.config.get('antiBot'));
    this.proxyManager = new ProxyManager(this.config.get('proxy'));
    this.rateLimiter = new RateLimiter(this.config.get('rateLimit'));
    
    // 缓存管理
    this.cache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0
    };
    
    // 统计信息
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cachedRequests: 0,
      startTime: Date.now()
    };
    
    // 请求会话管理
    this.sessions = new Map();
    this.sessionId = 0;
    
    this.initializeService();
  }

  /**
   * 初始化服务
   */
  initializeService() {
    // 设置错误处理
    this.setupErrorHandling();
    
    // 设置事件监听
    this.setupEventListeners();
    
    // 添加EventEmitter功能
    const EventEmitter = require('eventemitter3');
    this.__proto__ = Object.assign(this.__proto__, EventEmitter.prototype);
    EventEmitter.call(this);
    
    // 启动缓存清理
    this.startCacheCleanup();
    
    // 启动统计信息收集
    this.startStatsCollection();
    
    console.log('网络爬虫服务已初始化');
  }

  /**
   * 设置错误处理
   */
  setupErrorHandling() {
    // 全局错误处理
    process.on('uncaughtException', (error) => {
      console.error('未捕获的异常:', error);
      this.errorHandler.handleError(error);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('未处理的Promise拒绝:', reason);
      this.errorHandler.handleError(new Error(`Unhandled rejection: ${reason}`));
    });
  }

  /**
   * 设置事件监听
   */
  setupEventListeners() {
    // 代理管理器事件
    this.proxyManager.on('proxy:failed', (proxy, error) => {
      console.warn(`代理失败: ${proxy.host}:${proxy.port} - ${error.message}`);
      this.emit('proxy:failed', proxy, error);
    });
    
    this.proxyManager.on('proxy:disabled', (proxy, error) => {
      console.error(`代理已禁用: ${proxy.host}:${proxy.port} - ${error.message}`);
      this.emit('proxy:disabled', proxy, error);
    });
    
    // 限流器事件
    this.rateLimiter.on('rate:adjusted', (data) => {
      console.log(`限流调整: ${data.oldRate} -> ${data.newRate} req/s (${data.reason})`);
      this.emit('rate:adjusted', data);
    });
    
    this.rateLimiter.on('cooldown:triggered', (data) => {
      console.warn(`限流冷却期触发: ${data.duration}ms, 新速率: ${data.newRate} req/s`);
      this.emit('cooldown:triggered', data);
    });
    
    // 错误处理器事件
    this.errorHandler.on('error:classified', (error, classification) => {
      console.log(`错误分类: ${classification.type} - ${error.message}`);
      this.emit('error:classified', error, classification);
    });
  }

  /**
   * 创建请求配置
   * @param {string} url - 请求URL
   * @param {Object} options - 请求选项
   * @returns {Object} - axios配置
   */
  createRequestConfig(url, options = {}) {
    const {
      method = 'GET',
      headers = {},
      timeout = this.config.get('base.timeout', 30000),
      encoding = 'utf-8',
      site = 'default',
      useProxy = true,
      antiBot = true,
      userAgentRotation = true
    } = options;
    
    // 基础配置
    const config = {
      method,
      url,
      timeout,
      responseType: 'arraybuffer', // 处理不同编码
      validateStatus: (status) => status >= 200 && status < 500,
      maxRedirects: 5,
      decompress: true,
      metadata: {
        startTime: Date.now(),
        site,
        options
      },
      ...options
    };
    
    // 设置请求头
    config.headers = this.createRequestHeaders(headers, {
      site,
      antiBot,
      userAgentRotation
    });
    
    // 设置代理
    if (useProxy && this.config.get('proxy.enabled')) {
      const proxy = this.proxyManager.getNextProxy({
        preferJapanese: this.config.get('proxy.geoLocation.preferJapanese', false)
      });
      
      if (proxy) {
        config.proxy = this.proxyManager.getAxiosProxyConfig(proxy);
      }
    }
    
    // HTTPS代理配置
    if (url.startsWith('https://')) {
      config.httpsAgent = new https.Agent({
        rejectUnauthorized: false,
        timeout: timeout
      });
    }
    
    return config;
  }

  /**
   * 创建请求头
   * @param {Object} customHeaders - 自定义请求头
   * @param {Object} options - 选项
   * @returns {Object} - 请求头
   */
  createRequestHeaders(customHeaders = {}, options = {}) {
    const {
      site = 'default',
      antiBot = true,
      userAgentRotation = true
    } = options;
    
    let headers = {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': this.config.get('base.acceptLanguage', 'zh-CN,zh;q=0.9,en;q=0.8'),
      'Accept-Encoding': this.config.get('base.acceptEncoding', 'gzip, deflate, br'),
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
      ...customHeaders
    };
    
    // 反爬虫头部伪装
    if (antiBot && this.config.get('antiBot.headerSpoofing')) {
      const randomHeaders = this.config.get('antiBot.randomHeaders', {});
      headers = { ...headers, ...randomHeaders };
    }
    
    // User-Agent轮换
    if (userAgentRotation && this.config.get('antiBot.userAgentRotation')) {
      const userAgents = this.config.get('antiBot.userAgents', []);
      if (userAgents.length > 0) {
        const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];
        headers['User-Agent'] = randomUA;
      }
    } else {
      headers['User-Agent'] = this.config.get('base.userAgent');
    }
    
    // 网站特定头部
    const siteConfig = this.config.getSiteConfig(site);
    if (siteConfig.headers) {
      headers = { ...headers, ...siteConfig.headers };
    }
    
    return headers;
  }

  /**
   * 发送HTTP请求
   * @param {string} url - 请求URL
   * @param {Object} options - 请求选项
   * @returns {Promise<Object>} - 响应数据
   */
  async request(url, options = {}) {
    const startTime = Date.now();
    const site = options.site || this.extractSiteFromUrl(url);
    
    // 检查限流
    const canProceed = await this.rateLimiter.checkLimit({
      site,
      priority: options.priority || 0
    });
    
    if (!canProceed) {
      throw new Error('Rate limit exceeded');
    }
    
    // 检查缓存
    if (this.config.get('cache.enabled') && options.useCache !== false) {
      const cachedResult = this.getFromCache(url, options);
      if (cachedResult) {
        this.stats.cachedRequests++;
        return cachedResult;
      }
    }
    
    // 创建请求配置
    const config = this.createRequestConfig(url, { ...options, site });
    
    // 错误处理和重试
    const result = await this.errorHandler.executeWithRetry(
      async () => {
        const response = await axios(config);
        return this.processResponse(response, config, options);
      },
      {
        retries: options.retries || this.config.get('base.retries', 3),
        retryDelay: options.retryDelay || this.config.get('base.retryDelay', 1000),
        context: { url, site, options }
      }
    );
    
    // 记录统计信息
    this.recordStats(startTime, true, site);
    
    // 缓存结果
    if (this.config.get('cache.enabled') && options.useCache !== false) {
      this.setCache(url, options, result);
    }
    
    return result;
  }

  /**
   * 处理响应
   * @param {Object} response - axios响应
   * @param {Object} config - 请求配置
   * @param {Object} options - 请求选项
   * @returns {Object} - 处理后的响应数据
   */
  processResponse(response, config, options = {}) {
    const { data, status, headers, statusText } = response;
    
    // 检查反爬虫检测
    const botDetection = this.antiBotDetector.detect(data, headers, status);
    if (botDetection.isBot) {
      throw new Error(`Anti-bot detection: ${botDetection.reason}`);
    }
    
    // 编码转换
    let content = data;
    if (options.encoding && options.encoding !== 'utf-8') {
      content = iconv.decode(data, options.encoding);
    } else {
      content = data.toString('utf-8');
    }
    
    // 解析HTML
    let dom = null;
    if (options.parseHTML !== false && this.isHTMLContent(headers)) {
      try {
        dom = new JSDOM(content);
      } catch (error) {
        console.warn('HTML解析失败:', error.message);
      }
    }
    
    // 代理成功标记
    if (config.proxy && config.proxy.host) {
      const proxy = this.proxyManager.proxies.find(p => 
        p.host === config.proxy.host && p.port === config.proxy.port
      );
      
      if (proxy) {
        const responseTime = Date.now() - config.metadata.startTime;
        this.proxyManager.markProxySuccess(proxy, responseTime);
      }
    }
    
    return {
      content,
      status,
      statusText,
      headers,
      dom,
      url: config.url,
      responseTime: Date.now() - config.metadata.startTime,
      proxyUsed: !!config.proxy,
      cached: false
    };
  }

  /**
   * 检查是否为HTML内容
   * @param {Object} headers - 响应头
   * @returns {boolean} - 是否为HTML内容
   */
  isHTMLContent(headers) {
    const contentType = headers['content-type'] || '';
    return contentType.includes('text/html') || contentType.includes('application/xhtml');
  }

  /**
   * 从URL提取网站信息
   * @param {string} url - URL
   * @returns {string} - 网站标识
   */
  extractSiteFromUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch (error) {
      return 'default';
    }
  }

  /**
   * 缓存管理
   */
  getFromCache(url, options) {
    if (!this.config.get('cache.enabled')) return null;
    
    const cacheKey = this.generateCacheKey(url, options);
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.config.get('cache.ttl', 3600000)) {
      this.cacheStats.hits++;
      return { ...cached.data, cached: true };
    }
    
    this.cacheStats.misses++;
    return null;
  }

  /**
   * 设置缓存
   * @param {string} url - URL
   * @param {Object} options - 选项
   * @param {Object} data - 数据
   */
  setCache(url, options, data) {
    if (!this.config.get('cache.enabled')) return;
    
    const cacheKey = this.generateCacheKey(url, options);
    const maxSize = this.config.get('cache.maxSize', 1000);
    
    // 缓存大小限制
    if (this.cache.size >= maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      this.cacheStats.evictions++;
    }
    
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    this.cacheStats.sets++;
  }

  /**
   * 生成缓存键
   * @param {string} url - URL
   * @param {Object} options - 选项
   * @returns {string} - 缓存键
   */
  generateCacheKey(url, options) {
    const keyParts = [url];
    
    if (options.method && options.method !== 'GET') {
      keyParts.push(`method:${options.method}`);
    }
    
    if (options.encoding) {
      keyParts.push(`encoding:${options.encoding}`);
    }
    
    if (options.site) {
      keyParts.push(`site:${options.site}`);
    }
    
    return keyParts.join('|');
  }

  /**
   * 启动缓存清理
   */
  startCacheCleanup() {
    const interval = this.config.get('cache.cleanupInterval', 300000); // 5分钟
    
    this.cacheCleanupInterval = setInterval(() => {
      const now = Date.now();
      const ttl = this.config.get('cache.ttl', 3600000); // 1小时
      
      for (const [key, cached] of this.cache.entries()) {
        if (now - cached.timestamp > ttl) {
          this.cache.delete(key);
        }
      }
    }, interval);
  }

  /**
   * 记录统计信息
   * @param {number} startTime - 开始时间
   * @param {boolean} success - 是否成功
   * @param {string} site - 网站
   */
  recordStats(startTime, success, site) {
    const responseTime = Date.now() - startTime;
    
    this.stats.totalRequests++;
    
    if (success) {
      this.stats.successfulRequests++;
    } else {
      this.stats.failedRequests++;
    }
    
    // 记录响应时间
    this.rateLimiter.recordResponseTime(responseTime, site);
  }

  /**
   * 启动统计信息收集
   */
  startStatsCollection() {
    const interval = this.config.get('monitoring.metricsInterval', 60000); // 1分钟
    
    this.statsInterval = setInterval(() => {
      this.collectMetrics();
    }, interval);
  }

  /**
   * 收集指标
   */
  collectMetrics() {
    const metrics = {
      timestamp: Date.now(),
      service: {
        totalRequests: this.stats.totalRequests,
        successfulRequests: this.stats.successfulRequests,
        failedRequests: this.stats.failedRequests,
        cachedRequests: this.stats.cachedRequests,
        successRate: this.stats.totalRequests > 0 ? 
          (this.stats.successfulRequests / this.stats.totalRequests * 100).toFixed(2) + '%' : '0%',
        cacheHitRate: (this.stats.totalRequests - this.stats.cachedRequests) > 0 ?
          (this.stats.cachedRequests / (this.stats.totalRequests - this.stats.cachedRequests) * 100).toFixed(2) + '%' : '0%'
      },
      cache: this.cacheStats,
      rateLimit: this.rateLimiter.getStats(),
      proxy: this.proxyManager.getStats(),
      uptime: this.getUptime()
    };
    
    // 检查告警阈值
    this.checkAlertThresholds(metrics);
    
    this.emit('metrics:collected', metrics);
  }

  /**
   * 检查告警阈值
   * @param {Object} metrics - 指标数据
   */
  checkAlertThresholds(metrics) {
    const thresholds = this.config.get('monitoring.alertThresholds', {});
    
    // 错误率告警
    if (thresholds.errorRate && metrics.service.successRate) {
      const errorRate = 100 - parseFloat(metrics.service.successRate);
      if (errorRate > thresholds.errorRate * 100) {
        this.emit('alert:error-rate', {
          current: errorRate,
          threshold: thresholds.errorRate * 100,
          metrics
        });
      }
    }
    
    // 响应时间告警
    if (thresholds.responseTime && metrics.rateLimit.avgResponseTime) {
      const avgResponseTime = parseInt(metrics.rateLimit.avgResponseTime);
      if (avgResponseTime > thresholds.responseTime) {
        this.emit('alert:response-time', {
          current: avgResponseTime,
          threshold: thresholds.responseTime,
          metrics
        });
      }
    }
    
    // 连续失败告警
    if (thresholds.failedRequests && metrics.service.failedRequests >= thresholds.failedRequests) {
      this.emit('alert:failed-requests', {
        current: metrics.service.failedRequests,
        threshold: thresholds.failedRequests,
        metrics
      });
    }
  }

  /**
   * 获取运行时间
   * @returns {string} - 运行时间
   */
  getUptime() {
    const uptime = Date.now() - this.stats.startTime;
    const hours = Math.floor(uptime / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((uptime % (1000 * 60)) / 1000);
    
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  /**
   * 获取服务状态
   * @returns {Object} - 服务状态
   */
  getStatus() {
    return {
      status: 'running',
      uptime: this.getUptime(),
      stats: this.stats,
      cache: this.cacheStats,
      rateLimit: this.rateLimiter.getStats(),
      proxy: this.proxyManager.getStats(),
      config: this.config.getSummary(),
      timestamp: Date.now()
    };
  }

  /**
   * 获取网站数据
   * @param {string} avId - AV番号
   * @param {Object} options - 选项
   * @returns {Promise<Object>} - 网站数据
   */
  async scrapeMovie(avId, options = {}) {
    const { sites = ['javbus.com', 'javlibrary.com'], timeout = 30000 } = options;
    
    const results = {};
    const errors = [];
    
    // 并行请求多个网站
    const promises = sites.map(async (site) => {
      try {
        const siteConfig = this.config.getSiteConfig(site);
        const searchUrl = this.buildSearchUrl(siteConfig, avId);
        
        const response = await this.request(searchUrl, {
          site,
          timeout,
          parseHTML: true,
          ...options
        });
        
        // 解析页面数据
        const movieData = this.parseMovieData(response, siteConfig, avId);
        
        results[site] = {
          success: true,
          data: movieData,
          responseTime: response.responseTime,
          proxyUsed: response.proxyUsed
        };
        
      } catch (error) {
        console.error(`抓取 ${site} 失败:`, error.message);
        
        results[site] = {
          success: false,
          error: error.message,
          code: error.code
        };
        
        errors.push({ site, error: error.message });
      }
    });
    
    await Promise.allSettled(promises);
    
    return {
      avId,
      results,
      errors,
      totalSites: sites.length,
      successfulSites: Object.values(results).filter(r => r.success).length,
      timestamp: Date.now()
    };
  }

  /**
   * 构建搜索URL
   * @param {Object} siteConfig - 网站配置
   * @param {string} avId - AV番号
   * @returns {string} - 搜索URL
   */
  buildSearchUrl(siteConfig, avId) {
    const baseUrl = siteConfig.baseUrl;
    const searchPath = siteConfig.searchPath.replace('{query}', encodeURIComponent(avId));
    
    return `${baseUrl}${searchPath}`;
  }

  /**
   * 解析电影数据
   * @param {Object} response - 响应数据
   * @param {Object} siteConfig - 网站配置
   * @param {string} avId - AV番号
   * @returns {Object} - 电影数据
   */
  parseMovieData(response, siteConfig, avId) {
    const { dom } = response;
    const selectors = siteConfig.selectors;
    
    if (!dom) {
      throw new Error('无法解析HTML内容');
    }
    
    const document = dom.window.document;
    
    // 提取基本信息
    const movieData = {
      avId,
      title: this.extractText(document, selectors.title),
      cover: this.extractImageUrl(document, selectors.cover),
      releaseDate: this.extractText(document, selectors.releaseDate),
      duration: this.extractText(document, selectors.duration),
      director: this.extractText(document, selectors.director),
      studio: this.extractText(document, selectors.studio),
      label: this.extractText(document, selectors.label),
      series: this.extractText(document, selectors.series),
      genres: this.extractList(document, selectors.genres),
      cast: this.extractList(document, selectors.cast),
      sampleImages: this.extractImageUrls(document, selectors.sampleImages),
      site: siteConfig.baseUrl,
      scrapedAt: new Date().toISOString()
    };
    
    return this.cleanMovieData(movieData);
  }

  /**
   * 提取文本内容
   * @param {Document} document - DOM文档
   * @param {string} selector - CSS选择器
   * @returns {string} - 文本内容
   */
  extractText(document, selector) {
    if (!selector) return null;
    
    try {
      const element = document.querySelector(selector);
      return element ? element.textContent.trim() : null;
    } catch (error) {
      console.warn(`提取文本失败 (${selector}):`, error.message);
      return null;
    }
  }

  /**
   * 提取图片URL
   * @param {Document} document - DOM文档
   * @param {string} selector - CSS选择器
   * @returns {string} - 图片URL
   */
  extractImageUrl(document, selector) {
    if (!selector) return null;
    
    try {
      const element = document.querySelector(selector);
      if (!element) return null;
      
      return element.getAttribute('src') || element.getAttribute('data-src') || null;
    } catch (error) {
      console.warn(`提取图片URL失败 (${selector}):`, error.message);
      return null;
    }
  }

  /**
   * 提取图片URL列表
   * @param {Document} document - DOM文档
   * @param {string} selector - CSS选择器
   * @returns {Array} - 图片URL列表
   */
  extractImageUrls(document, selector) {
    if (!selector) return [];
    
    try {
      const elements = document.querySelectorAll(selector);
      return Array.from(elements).map(element => 
        element.getAttribute('src') || element.getAttribute('data-src')
      ).filter(url => url);
    } catch (error) {
      console.warn(`提取图片URL列表失败 (${selector}):`, error.message);
      return [];
    }
  }

  /**
   * 提取列表内容
   * @param {Document} document - DOM文档
   * @param {string} selector - CSS选择器
   * @returns {Array} - 列表内容
   */
  extractList(document, selector) {
    if (!selector) return [];
    
    try {
      const elements = document.querySelectorAll(selector);
      return Array.from(elements).map(element => element.textContent.trim()).filter(text => text);
    } catch (error) {
      console.warn(`提取列表失败 (${selector}):`, error.message);
      return [];
    }
  }

  /**
   * 清理电影数据
   * @param {Object} data - 原始数据
   * @returns {Object} - 清理后的数据
   */
  cleanMovieData(data) {
    const cleaned = { ...data };
    
    // 清理标题
    if (cleaned.title) {
      cleaned.title = cleaned.title.replace(/\s+/g, ' ').trim();
    }
    
    // 清理发布日期
    if (cleaned.releaseDate) {
      const dateMatch = cleaned.releaseDate.match(/\d{4}-\d{2}-\d{2}/);
      if (dateMatch) {
        cleaned.releaseDate = dateMatch[0];
      }
    }
    
    // 清理时长
    if (cleaned.duration) {
      const durationMatch = cleaned.duration.match(/\d+/);
      if (durationMatch) {
        cleaned.duration = parseInt(durationMatch[0]);
      }
    }
    
    // 清理封面URL
    if (cleaned.cover && !cleaned.cover.startsWith('http')) {
      if (cleaned.cover.startsWith('//')) {
        cleaned.cover = 'https:' + cleaned.cover;
      } else if (cleaned.cover.startsWith('/')) {
        const baseUrl = data.site.replace(/\/+$/, '');
        cleaned.cover = baseUrl + cleaned.cover;
      }
    }
    
    // 清理样本图片URL
    if (cleaned.sampleImages && cleaned.sampleImages.length > 0) {
      cleaned.sampleImages = cleaned.sampleImages.map(url => {
        if (!url.startsWith('http')) {
          if (url.startsWith('//')) {
            return 'https:' + url;
          } else if (url.startsWith('/')) {
            const baseUrl = data.site.replace(/\/+$/, '');
            return baseUrl + url;
          }
        }
        return url;
      }).filter(url => url && url.startsWith('http'));
    }
    
    return cleaned;
  }

  /**
   * 销毁服务
   */
  destroy() {
    // 停止定时器
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
    }
    
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }
    
    // 销毁组件
    this.proxyManager.destroy();
    this.rateLimiter.destroy();
    this.errorHandler.destroy();
    
    // 清空缓存
    this.cache.clear();
    
    // 移除事件监听
    this.removeAllListeners();
    
    console.log('网络爬虫服务已销毁');
  }
}

module.exports = WebScraperService;