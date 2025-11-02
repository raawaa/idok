const axios = require('axios');
const cheerio = require('cheerio');
const cloudscraper = require('cloudscraper');
const { URL } = require('url');

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
    
    // 请求配置
    this.timeout = options.timeout || 30000; // 30秒默认超时
    this.retries = options.retries || 3; // 默认重试3次
    this.retryDelay = options.retryDelay || 1000; // 重试延迟1秒
    
    // 代理配置
    this.proxy = options.proxy || null;
    this.userAgent = options.userAgent || this.getRandomUserAgent();
    
    // 反爬虫配置
    this.useCloudScraper = options.useCloudScraper !== false; // 默认启用
    this.delayRange = options.delayRange || [1000, 3000]; // 随机延迟范围
    
    // 缓存配置
    this.enableCache = options.enableCache !== false;
    this.cache = new Map();
    this.cacheExpiry = options.cacheExpiry || 3600000; // 1小时缓存
    
    // 统计信息
    this.stats = {
      requests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      cloudflareBypasses: 0,
      totalTime: 0
    };
  }

  /**
   * 获取随机User-Agent
   */
  getRandomUserAgent() {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/121.0'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
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

    return headers;
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
   * 检查URL是否有效
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 构建完整URL
   */
  buildUrl(path, params = {}) {
    if (this.isValidUrl(path)) {
      return path;
    }

    const baseUrl = this.baseUrl.replace(/\/$/, '');
    const cleanPath = path.replace(/^\//, '');
    const url = `${baseUrl}/${cleanPath}`;

    if (Object.keys(params).length > 0) {
      const urlObj = new URL(url);
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          urlObj.searchParams.append(key, value);
        }
      });
      return urlObj.toString();
    }

    return url;
  }

  /**
   * 生成缓存键
   */
  getCacheKey(url, options = {}) {
    const keyData = {
      url,
      method: options.method || 'GET',
      headers: options.headers || {},
      data: options.data || null
    };
    return JSON.stringify(keyData);
  }

  /**
   * 检查缓存
   */
  getFromCache(cacheKey) {
    if (!this.enableCache) return null;
    
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      this.stats.cacheHits++;
      return cached.data;
    }
    
    return null;
  }

  /**
   * 保存到缓存
   */
  saveToCache(cacheKey, data) {
    if (!this.enableCache) return;
    
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
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
   * 清空缓存（兼容接口）
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * 使用CloudScraper绕过CloudFlare
   */
  async requestWithCloudScraper(url, options = {}) {
    try {
      const cloudScraperOptions = {
        uri: url,
        method: options.method || 'GET',
        headers: options.headers || this.getHeaders(),
        timeout: this.timeout,
        ...options
      };

      if (this.proxy) {
        cloudScraperOptions.proxy = this.proxy;
      }

      const response = await cloudscraper(cloudScraperOptions);
      this.stats.cloudflareBypasses++;
      
      return {
        status: 200,
        data: response,
        headers: {},
        config: cloudScraperOptions
      };
    } catch (error) {
      throw new Error(`CloudScraper请求失败: ${error.message}`);
    }
  }

  /**
   * 使用Axios进行标准HTTP请求
   */
  async requestWithAxios(url, options = {}) {
    const axiosOptions = {
      method: options.method || 'GET',
      url,
      headers: options.headers || this.getHeaders(),
      timeout: this.timeout,
      maxRedirects: 5,
      validateStatus: (status) => status < 500, // 不抛出4xx错误
      ...options
    };

    if (this.proxy) {
      axiosOptions.proxy = this.proxy;
    }

    return await axios(axiosOptions);
  }

  /**
   * 执行HTTP请求（带重试机制）
   */
  async request(url, options = {}) {
    const startTime = Date.now();
    this.stats.requests++;

    try {
      // 检查缓存
      const cacheKey = this.getCacheKey(url, options);
      const cachedResponse = this.getFromCache(cacheKey);
      if (cachedResponse) {
        return cachedResponse;
      }

      let lastError;
      
      for (let attempt = 1; attempt <= this.retries; attempt++) {
        try {
          // 添加随机延迟（除了第一次尝试）
          if (attempt > 1) {
            await this.randomDelay();
          }

          let response;
          
          // 选择请求方式
          if (this.useCloudScraper) {
            response = await this.requestWithCloudScraper(url, options);
          } else {
            response = await this.requestWithAxios(url, options);
          }

          // 检查响应状态
          if (response.status >= 200 && response.status < 300) {
            this.stats.successfulRequests++;
            this.stats.totalTime += Date.now() - startTime;
            
            // 保存到缓存
            this.saveToCache(cacheKey, response);
            
            return response;
          } else if (response.status === 404) {
            throw new Error('页面不存在 (404)');
          } else if (response.status === 403) {
            throw new Error('访问被拒绝 (403)');
          } else if (response.status >= 400) {
            throw new Error(`HTTP错误 ${response.status}`);
          }

        } catch (error) {
          lastError = error;
          
          // 如果是最后一次尝试，记录失败
          if (attempt === this.retries) {
            this.stats.failedRequests++;
            throw error;
          }
          
          // 等待更长的延迟再重试
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        }
      }

      throw lastError;

    } catch (error) {
      this.stats.totalTime += Date.now() - startTime;
      throw new Error(`请求失败 [${this.name}]: ${error.message}`);
    }
  }

  /**
   * 获取HTML内容并解析为Cheerio对象
   */
  async fetchHtml(url, options = {}) {
    const response = await this.request(url, options);
    return cheerio.load(response.data);
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
   * 获取统计信息
   */
  getStats() {
    const avgResponseTime = this.stats.successfulRequests > 0 
      ? Math.round(this.stats.totalTime / this.stats.successfulRequests)
      : 0;

    return {
      ...this.stats,
      avgResponseTime,
      successRate: this.stats.requests > 0 
        ? Math.round((this.stats.successfulRequests / this.stats.requests) * 100)
        : 0,
      cacheSize: this.cache.size,
      cacheHitRate: this.stats.requests > 0
        ? Math.round((this.stats.cacheHits / this.stats.requests) * 100)
        : 0
    };
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      requests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      cloudflareBypasses: 0,
      totalTime: 0
    };
  }

  /**
   * 清理文本内容
   * @param {string} text - 原始文本
   * @returns {string} 清理后的文本
   */
  cleanText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/^\s+|\s+$/g, '');
  }

  /**
   * 从文本中提取数字
   * @param {string} text - 包含数字的文本
   * @returns {number|null} 提取的数字
   */
  extractNumber(text) {
    const match = text.match(/\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : null;
  }

  /**
   * 解析日期字符串
   * @param {string} dateStr - 日期字符串
   * @returns {string|null} 标准格式的日期(YYYY-MM-DD)
   */
  parseDate(dateStr) {
    if (!dateStr) return null;
    
    // 尝试多种日期格式
    const formats = [
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/,     // YYYY-MM-DD
      /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,   // YYYY/MM/DD
      /^(\d{4})\.(\d{1,2})\.(\d{1,2})$/    // YYYY.MM.DD
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        const year = parseInt(match[1]);
        const month = parseInt(match[2]);
        const day = parseInt(match[3]);
        
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        }
      }
    }
    
    return null;
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
    return {
      name: this.name,
      baseUrl: this.baseUrl,
      searchUrl: this.searchUrl,
      useCloudScraper: this.useCloudScraper,
      proxyEnabled: !!this.proxy,
      timeout: this.timeout,
      retries: this.retries,
      cacheEnabled: this.enableCache
    };
  }
}

module.exports = BaseScraper;