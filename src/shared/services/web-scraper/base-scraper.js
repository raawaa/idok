const axios = require('axios');
const cheerio = require('cheerio');
const cloudscraper = require('cloudscraper');
const { URL } = require('url');
const SystemProxyDetector = require('./system-proxy-detector');
const iconv = require('iconv-lite');

// 导入新创建的模块
const { config } = require('./config-manager');
const { HttpClient } = require('./http-client');
const { CacheManager, TextProcessor, UrlBuilder, EncodingDetector } = require('./utils/index');

/**
 * 网页抓取相关的异常基类
 * 参考Python JavSP的web/exceptions.py实现
 */
class CrawlerError extends Error {
  constructor(message, module = null, avId = null) {
    super(message);
    this.name = 'CrawlerError';
    this.module = module;
    this.avId = avId;
  }
}

/**
 * 影片未找到异常
 */
class MovieNotFoundError extends CrawlerError {
  constructor(module, avId) {
    super(`${module}: 未找到影片: '${avId}'`, module, avId);
    this.name = 'MovieNotFoundError';
  }
}

/**
 * 影片重复异常
 */
class MovieDuplicateError extends CrawlerError {
  constructor(module, avId, dupCount) {
    super(`${module}: '${avId}': 存在${dupCount}个完全匹配目标番号的搜索结果`, module, avId);
    this.name = 'MovieDuplicateError';
    this.dupCount = dupCount;
  }
}

/**
 * 站点封锁异常
 */
class SiteBlocked extends CrawlerError {
  constructor(message = '由于IP段或者触发反爬机制等原因导致用户被站点封锁', module = null, avId = null) {
    super(message, module, avId);
    this.name = 'SiteBlocked';
  }
}

/**
 * 站点权限异常
 */
class SitePermissionError extends CrawlerError {
  constructor(message = '由于缺少权限而无法访问影片资源', module = null, avId = null) {
    super(message, module, avId);
    this.name = 'SitePermissionError';
  }
}

/**
 * 凭据异常
 */
class CredentialError extends CrawlerError {
  constructor(message = '由于缺少Cookies等凭据而无法访问影片资源', module = null, avId = null) {
    super(message, module, avId);
    this.name = 'CredentialError';
  }
}

/**
 * 网站错误异常
 */
class WebsiteError extends CrawlerError {
  constructor(message = '非预期的状态码等网页故障', module = null, avId = null, statusCode = null) {
    super(message, module, avId);
    this.name = 'WebsiteError';
    this.statusCode = statusCode;
  }
}

/**
 * 其他未分类异常
 */
class OtherError extends CrawlerError {
  constructor(message = '其他尚未分类的错误', module = null, avId = null) {
    super(message, module, avId);
    this.name = 'OtherError';
  }
}

/**
 * 网络抓取基础模块
 * 提供统一的HTTP请求、HTML解析和反爬虫处理功能
 * 参考Python JavSP的web/base.py实现
 */
class BaseScraper {
  constructor(options = {}) {
    // 基础配置
    this.name = options.name || 'base';
    this.baseUrl = options.baseUrl || '';
    this.searchUrl = options.searchUrl || '';

    // 合并配置
    const mergedConfig = config.mergeOptions(options);

    // 初始化模块化组件
    this.httpClient = new HttpClient(mergedConfig);
    this.cacheManager = new CacheManager(mergedConfig);
    this.textProcessor = new TextProcessor();
    this.urlBuilder = new UrlBuilder(this.baseUrl);
    this.encodingDetector = new EncodingDetector(mergedConfig);

    // 代理配置（保持向后兼容）
    this.proxy = options.proxy || null;
    this.useSystemProxy = options.useSystemProxy !== false;
    this.systemProxyDetector = null;

    if (this.useSystemProxy && !this.proxy) {
      this.systemProxyDetector = new SystemProxyDetector();
    }

    // HTML清理配置（保持向后兼容）
    this.enableHtmlCleaning = options.enableHtmlCleaning !== false;
    this.htmlCleaner = {
      // 删除的标签列表
      removeTags: ['script', 'noscript', 'iframe', 'object', 'embed', 'style'],
      // 保留属性的标签列表
      keepAttributes: {
        'a': ['href', 'title'],
        'img': ['src', 'alt', 'title', 'data-original'],
        'div': ['id', 'class'],
        'span': ['id', 'class'],
        'p': ['id', 'class']
      }
    };

    // Cookie管理配置（保持向后兼容）
    this.cookieJar = new Map();
    this.cookiePersistence = options.cookiePersistence !== false;
    this.cookieDomain = options.cookieDomain || null;

    // 统计信息（合并各模块统计）
    this.updateCombinedStats();

    // 保持向后兼容的属性
    this.timeout = this.httpClient.timeout;
    this.retries = this.httpClient.retries;
    this.retryDelay = this.httpClient.retryDelay;
    this.useCloudScraper = this.httpClient.useCloudScraper;
    this.enableCache = this.cacheManager.enableCache;
    this.delayRange = mergedConfig.browser?.delayRange || [1000, 3000];
  }

  /**
   * 合并各模块的统计信息
   */
  updateCombinedStats() {
    const httpStats = this.httpClient.getStats();
    const cacheStats = this.cacheManager.getCacheStats();
    const encodingStats = this.encodingDetector.getStats();

    this.stats = {
      requests: httpStats.requests,
      successfulRequests: httpStats.successfulRequests,
      failedRequests: httpStats.failedRequests,
      cacheHits: cacheStats.cacheHits,
      cloudflareBypasses: httpStats.cloudflareBypasses,
      totalTime: httpStats.totalTime,
      htmlCleanings: this.stats?.htmlCleanings || 0,
      encodingDetections: encodingStats.detections
    };
  }

  /**
   * 获取随机User-Agent（委托给HttpClient）
   */
  getRandomUserAgent() {
    return this.httpClient.getRandomUserAgent();
  }

  /**
   * 生成请求头
   */
  getHeaders(referer = null) {
    const headers = {
      'User-Agent': this.userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'no-cache'
    };

    if (referer) {
      headers['Referer'] = referer;
    }

    // 添加Cookie
    if (this.cookiePersistence && this.cookieJar.size > 0) {
      const cookies = this.getCookiesForDomain(referer || this.baseUrl);
      if (cookies.length > 0) {
        headers['Cookie'] = cookies.map(c => `${c.name}=${c.value}`).join('; ');
      }
    }

    return headers;
  }

  /**
   * 解析并保存Cookie
   * @param {string} cookieString - Cookie字符串
   * @param {string} url - 请求URL
   */
  parseAndSaveCookies(cookieString, url) {
    if (!this.cookiePersistence || !cookieString) return;

    try {
      const domain = this.extractDomain(url);
      const cookies = cookieString.split(',').map(cookie => cookie.trim());

      cookies.forEach(cookieStr => {
        const parts = cookieStr.split(';')[0].split('=');
        if (parts.length >= 2) {
          const name = parts.shift().trim();
          const value = parts.join('=').trim();
          
          this.cookieJar.set(`${domain}:${name}`, {
            name,
            value,
            domain,
            url,
            timestamp: Date.now()
          });
        }
      });
    } catch (error) {
      console.warn('解析Cookie失败:', error.message);
    }
  }

  /**
   * 获取指定域名的Cookie
   * @param {string} url - 请求URL
   * @returns {Array} Cookie列表
   */
  getCookiesForDomain(url) {
    const domain = this.extractDomain(url);
    const cookies = [];

    this.cookieJar.forEach((cookie, key) => {
      if (cookie.domain === domain || domain.endsWith(cookie.domain)) {
        cookies.push(cookie);
      }
    });

    return cookies;
  }

  /**
   * 提取域名
   * @param {string} url - URL
   * @returns {string} 域名
   */
  extractDomain(url) {
    try {
      const { hostname } = new URL(url);
      return hostname;
    } catch (error) {
      return '';
    }
  }

  /**
   * 清理过期Cookie
   */
  cleanExpiredCookies() {
    const now = Date.now();
    const expiredKeys = [];

    this.cookieJar.forEach((cookie, key) => {
      // Cookie默认过期时间为30天
      if (now - cookie.timestamp > 30 * 24 * 60 * 60 * 1000) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => this.cookieJar.delete(key));
  }

  /**
   * 添加随机延迟
   */
  async randomDelay() {
    const [min, max] = this.delayRange;
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * 延迟执行（兼容接口）
   * @param {number} ms - 延迟毫秒数
   */
  async delay(ms = null) {
    if (ms !== null) {
      await new Promise(resolve => setTimeout(resolve, ms));
    } else {
      await this.randomDelay();
    }
  }

  /**
   * 检查URL是否有效（委托给UrlBuilder）
   */
  isValidUrl(url) {
    return this.urlBuilder.isValidUrl(url);
  }

  /**
   * 构建完整URL（委托给UrlBuilder）
   */
  buildUrl(path, params = {}) {
    return this.urlBuilder.buildUrl(path, params);
  }

  /**
   * 生成缓存键（委托给CacheManager）
   */
  getCacheKey(url, options = {}) {
    return this.cacheManager.getCacheKey(url, options);
  }

  /**
   * 检查缓存（委托给CacheManager）
   */
  getFromCache(cacheKey) {
    return this.cacheManager.getFromCache(cacheKey);
  }

  /**
   * 保存到缓存（委托给CacheManager）
   */
  saveToCache(cacheKey, data) {
    this.cacheManager.saveToCache(cacheKey, data);
  }

  /**
   * 缓存结果（兼容接口）
   * @param {string} key - 缓存键
   * @param {any} data - 缓存数据
   */
  cacheResult(key, data) {
    this.saveToCache(key, data);
  }

  /**
   * 获取缓存结果（兼容接口）
   * @param {string} key - 缓存键
   * @returns {any|null} 缓存数据
   */
  getCachedResult(key) {
    return this.getFromCache(key);
  }

  /**
   * 清空缓存（委托给CacheManager）
   */
  clearCache() {
    this.cacheManager.clearCache();
  }

  /**
   * 执行HTTP请求（委托给HttpClient，简化接口）
   */
  async request(url, options = {}) {
    const startTime = Date.now();

    try {
      // 检查缓存
      const cacheKey = this.getCacheKey(url, options);
      const cachedResponse = this.getFromCache(cacheKey);
      if (cachedResponse) {
        return cachedResponse;
      }

      // 添加模块和avId信息到选项中
      const requestOptions = {
        ...options,
        module: this.name,
        avId: options.avId || null
      };

      // 委托给HttpClient
      let response = await this.httpClient.request(url, requestOptions);

      // 处理编码问题
      if (options.responseType !== 'json' && response.data) {
        response.data = this.encodingDetector.handleEncoding(response.data, response.headers);
      }

      // 保存到缓存
      this.saveToCache(cacheKey, response);

      // 更新统计信息
      this.updateCombinedStats();

      return response;

    } catch (error) {
      this.updateCombinedStats();
      throw error;
    }
  }

  /**
   * 获取HTML内容并解析为Cheerio对象
   */
  async fetchHtml(url, options = {}) {
    const response = await this.request(url, options);
    const html = this.handleEncoding(response.data, response.headers);
    return cheerio.load(html);
  }

  /**
   * 处理编码问题（委托给EncodingDetector）
   * @param {Buffer|string} data - 响应数据
   * @param {Object} headers - 响应头
   * @returns {string} 解码后的文本
   */
  handleEncoding(data, headers = {}) {
    return this.encodingDetector.handleEncoding(data, headers);
  }

  /**
   * 获取JSON数据
   */
  async fetchJson(url, options = {}) {
    const response = await this.request(url, {
      ...options,
      headers: {
        ...options.headers,
        'Accept': 'application/json, text/plain, */*'
      }
    });
    
    if (typeof response.data === 'string') {
      return JSON.parse(response.data);
    }
    
    return response.data;
  }

  /**
   * 下载文件
   */
  async downloadFile(url, options = {}) {
    const response = await this.request(url, {
      ...options,
      responseType: 'arraybuffer'
    });
    
    return {
      data: response.data,
      contentType: response.headers['content-type'],
      contentLength: response.headers['content-length'],
      filename: this.extractFilename(url, response.headers)
    };
  }

  /**
   * 从URL或响应头中提取文件名
   */
  extractFilename(url, headers = {}) {
    // 从Content-Disposition头中提取
    const contentDisposition = headers['content-disposition'];
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[*]?=(?:UTF-8'')?([^;]+)/);
      if (filenameMatch) {
        return decodeURIComponent(filenameMatch[1].replace(/['"]/g, ''));
      }
    }

    // 从URL路径中提取
    const urlPath = new URL(url).pathname;
    const filename = urlPath.split('/').pop();
    return filename || 'download';
  }

  /**
   * 获取统计信息（合并各模块统计）
   */
  getStats() {
    // 更新统计信息
    this.updateCombinedStats();

    const httpStats = this.httpClient.getStats();
    const cacheStats = this.cacheManager.getCacheStats();

    const avgResponseTime = this.stats.successfulRequests > 0
      ? Math.round(this.stats.totalTime / this.stats.successfulRequests)
      : 0;

    return {
      ...this.stats,
      avgResponseTime,
      successRate: this.stats.requests > 0
        ? Math.round((this.stats.successfulRequests / this.stats.requests) * 100)
        : 0,
      cacheSize: cacheStats.cacheSize,
      cacheHitRate: cacheStats.hitRate
    };
  }

  /**
   * 重置统计信息（重置所有模块统计）
   */
  resetStats() {
    this.httpClient.resetStats();
    this.cacheManager.resetStats();
    this.encodingDetector.resetStats();

    // 重置自身统计
    this.stats.htmlCleanings = 0;

    this.updateCombinedStats();
  }

  /**
   * 清理HTML内容
   * @param {string|CheerioAPI} html - HTML内容或Cheerio实例
   * @returns {CheerioAPI} 清理后的Cheerio实例
   */
  cleanHtml(html) {
    if (!this.enableHtmlCleaning) {
      return typeof html === 'string' ? cheerio.load(html) : html;
    }
    
    this.stats.htmlCleanings++;
    
    let $;
    if (typeof html === 'string') {
      $ = cheerio.load(html);
    } else {
      $ = html;
    }
    
    // 删除指定标签
    this.htmlCleaner.removeTags.forEach(tag => {
      $(tag).remove();
    });
    
    // 清理属性
    $('*').each((i, elem) => {
      const tagName = elem.tagName.toLowerCase();
      const keepAttrs = this.htmlCleaner.keepAttributes[tagName];
      
      if (keepAttrs) {
        // 只保留指定的属性
        const attrs = $(elem).attr();
        Object.keys(attrs).forEach(attr => {
          if (!keepAttrs.includes(attr)) {
            $(elem).removeAttr(attr);
          }
        });
      } else if (this.htmlCleaner.keepAttributes[tagName] === undefined) {
        // 如果标签不在保留列表中，删除所有属性（除了id和class）
        const attrs = $(elem).attr();
        Object.keys(attrs).forEach(attr => {
          if (attr !== 'id' && attr !== 'class') {
            $(elem).removeAttr(attr);
          }
        });
      }
    });
    
    return $;
  }

  /**
   * 清理文本内容（委托给TextProcessor）
   * @param {string} text - 原始文本
   * @returns {string} 清理后的文本
   */
  cleanText(text) {
    return this.textProcessor.cleanText(text);
  }

  /**
   * 高级文本清理（委托给TextProcessor）
   * @param {string} text - 原始文本
   * @param {Object} options - 清理选项
   * @returns {string} 清理后的文本
   */
  advancedCleanText(text, options = {}) {
    return this.textProcessor.advancedCleanText(text, options);
  }

  /**
   * 提取数字（委托给TextProcessor）
   * @param {string} text - 文本
   * @returns {number|null} 提取的数字
   */
  extractNumber(text) {
    return this.textProcessor.extractNumber(text);
  }

  /**
   * 解析日期字符串（委托给TextProcessor）
   * @param {string} dateStr - 日期字符串
   * @returns {string|null} 标准格式的日期(YYYY-MM-DD)
   */
  parseDate(dateStr) {
    return this.textProcessor.parseDate(dateStr);
  }

  /**
   * 转换时长字符串为分钟数（委托给TextProcessor）
   * @param {string} durationStr - 时长字符串
   * @returns {number|null} 时长（分钟）
   */
  parseDuration(durationStr) {
    return this.textProcessor.parseDuration(durationStr);
  }

  
  /**
   * 解析HTML内容
   * @param {string} html - HTML内容
   * @returns {CheerioAPI} Cheerio实例
   */
  parseHtml(html) {
    return cheerio.load(html);
  }

  /**
   * 提取文本内容
   * @param {CheerioAPI} $ - Cheerio实例
   * @param {string} selector - CSS选择器
   * @returns {string} 提取的文本
   */
  extractText($, selector) {
    const element = $(selector);
    return element.length ? this.cleanText(element.text()) : '';
  }

  /**
   * 提取属性值
   * @param {CheerioAPI} $ - Cheerio实例
   * @param {string} selector - CSS选择器
   * @param {string} attr - 属性名
   * @returns {string} 属性值
   */
  extractAttr($, selector, attr) {
    const element = $(selector);
    return element.length ? (element.attr(attr) || '') : '';
  }

  /**
   * 检查站点是否可访问
   */
  async checkSiteAvailability() {
    try {
      const response = await this.request(this.baseUrl, { method: 'HEAD' });
      return {
        available: response.status < 400,
        statusCode: response.status,
        responseTime: Date.now()
      };
    } catch (error) {
      return {
        available: false,
        statusCode: 0,
        error: error.message,
        responseTime: Date.now()
      };
    }
  }

  /**
   * 获取站点信息
   */
  getSiteInfo() {
    const httpStats = this.httpClient.getStats();
    const cacheStats = this.cacheManager.getCacheStats();

    return {
      name: this.name,
      baseUrl: this.baseUrl,
      searchUrl: this.searchUrl,
      useCloudScraper: this.httpClient.useCloudScraper,
      proxyEnabled: !!this.httpClient.proxy,
      timeout: this.httpClient.timeout,
      retries: this.httpClient.retries,
      cacheEnabled: this.cacheManager.enableCache,
      stats: {
        requests: httpStats.requests,
        successRate: httpStats.successRate,
        cacheHitRate: cacheStats.hitRate,
        avgResponseTime: httpStats.avgResponseTime
      }
    };
  }
}

module.exports = {
  BaseScraper,
  CrawlerError,
  NetworkError: WebsiteError,
  TimeoutError: WebsiteError,
  NotFoundError: MovieNotFoundError,
  AccessDeniedError: SitePermissionError,
  ServerError: WebsiteError,
  SiteBlockedError: SiteBlocked,
  CloudflareError: SiteBlocked,
  MovieNotFoundError,
  MovieDuplicateError,
  SitePermissionError,
  CredentialError,
  WebsiteError,
  OtherError
};