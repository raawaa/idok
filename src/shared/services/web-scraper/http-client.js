/**
 * HTTP客户端模块
 * 参考JavSP的Request类设计，提供简洁的HTTP请求功能
 */

const axios = require('axios');
const cloudscraper = require('cloudscraper');
const { config } = require('./config-manager');
const {
  CrawlerError,
  MovieNotFoundError,
  SiteBlocked,
  SitePermissionError,
  CredentialError,
  WebsiteError,
  OtherError
} = require('./exceptions');

class HttpClient {
  constructor(options = {}) {
    // 合并配置
    const mergedConfig = config.mergeOptions(options);

    // 直接使用传入的options，保持向后兼容
    this.timeout = options.timeout || mergedConfig.network?.timeout || 30000;
    this.retries = options.retries || mergedConfig.network?.retries || 3;
    this.retryDelay = options.retryDelay || mergedConfig.network?.retryDelay || 1000;
    this.useCloudScraper = options.useCloudScraper !== undefined ? options.useCloudScraper : (mergedConfig.network?.useCloudScraper !== false);
    this.userAgent = this.getRandomUserAgent();

    // 代理配置
    this.proxy = options.proxy || config.getProxyConfig();

    // 统计信息
    this.stats = {
      requests: 0,
      successfulRequests: 0,
      failedRequests: 0,
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
  getHeaders(referer = null, extraHeaders = {}) {
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
      'Cache-Control': 'no-cache',
      ...extraHeaders
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
    const delayRange = config.get('browser.delayRange', [1000, 3000]);
    const [min, max] = delayRange;
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * 使用CloudScraper请求
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
      // CloudScraper特定的错误处理
      if (error.message.includes('Captcha')) {
        throw new SiteBlocked(`CloudFlare验证码拦截: ${url}`, options.module, options.avId);
      }

      if (error.message.includes('Challenge')) {
        throw new SiteBlocked(`CloudFlare挑战失败: ${url}`, options.module, options.avId);
      }

      if (error.message.includes('timeout')) {
        throw new WebsiteError(`CloudScraper超时: ${url}`, options.module, options.avId);
      }

      throw new WebsiteError(`CloudScraper请求失败: ${error.message}`, options.module, options.avId);
    }
  }

  /**
   * 使用Axios请求
   */
  async requestWithAxios(url, options = {}) {
    const axiosOptions = {
      method: options.method || 'GET',
      url,
      headers: options.headers || this.getHeaders(),
      timeout: this.timeout,
      maxRedirects: 5,
      validateStatus: (status) => status < 500,
      ...options
    };

    // 设置代理
    if (this.proxy) {
      axiosOptions.proxy = this.proxy;
    }

    try {
      const response = await axios(axiosOptions);

      // 高级错误处理
      if (response.status === 403 && response.data && response.data.includes('Just a moment...')) {
        throw new SiteBlocked(`403 Forbidden: 无法通过CloudFlare检测: ${url}`, options.module, options.avId);
      }

      if (response.status === 404) {
        throw new MovieNotFoundError(options.module || 'unknown', options.avId || 'unknown');
      }

      if (response.status === 403) {
        throw new SitePermissionError(`访问被拒绝 (403): ${url}`, options.module, options.avId);
      }

      if (response.status === 401) {
        throw new CredentialError(`需要身份验证 (401): ${url}`, options.module, options.avId);
      }

      if (response.status >= 400 && response.status < 500) {
        throw new WebsiteError(`客户端错误 (${response.status}): ${url}`, options.module, options.avId, response.status);
      }

      if (response.status >= 500) {
        throw new WebsiteError(`服务器错误 (${response.status}): ${url}`, options.module, options.avId, response.status);
      }

      return response;

    } catch (error) {
      // 如果是我们抛出的自定义异常，直接重新抛出
      if (error instanceof CrawlerError) {
        throw error;
      }

      // 处理网络错误
      if (error.code === 'ECONNREFUSED') {
        throw new WebsiteError(`连接被拒绝: ${url}`, options.module, options.avId);
      }

      if (error.code === 'ETIMEDOUT') {
        throw new WebsiteError(`请求超时: ${url}`, options.module, options.avId);
      }

      if (error.code === 'ENOTFOUND') {
        throw new WebsiteError(`域名无法解析: ${url}`, options.module, options.avId);
      }

      // 重新抛出原始错误
      throw error;
    }
  }

  /**
   * 执行HTTP请求（带重试机制）
   */
  async request(url, options = {}) {
    const startTime = Date.now();
    this.stats.requests++;

    try {
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
            return response;
          }

        } catch (error) {
          lastError = error;

          // 如果是最后一次尝试，记录失败
          if (attempt === this.retries) {
            this.stats.failedRequests++;
            throw error;
          }

          // 对于某些错误类型，不重试
          if (error instanceof MovieNotFoundError ||
              error instanceof SiteBlocked ||
              error instanceof CredentialError) {
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

      // 如果是自定义异常，直接抛出
      if (error && error.constructor && (error instanceof CrawlerError ||
          error.constructor.name === 'CrawlerError' ||
          error.constructor.name === 'MovieNotFoundError' ||
          error.constructor.name === 'SiteBlocked' ||
          error.constructor.name === 'SitePermissionError' ||
          error.constructor.name === 'CredentialError' ||
          error.constructor.name === 'WebsiteError' ||
          error.constructor.name === 'OtherError')) {
        throw error;
      }

      // 包装为通用错误
      throw new OtherError(`请求失败: ${error.message}`, options.module, options.avId);
    }
  }

  /**
   * GET请求
   */
  async get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  }

  /**
   * POST请求
   */
  async post(url, data, options = {}) {
    return this.request(url, { ...options, method: 'POST', data });
  }

  /**
   * HEAD请求
   */
  async head(url, options = {}) {
    return this.request(url, { ...options, method: 'HEAD' });
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
        : 0
    };
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      requests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cloudflareBypasses: 0,
      totalTime: 0
    };
  }
}

module.exports = {
  HttpClient
};