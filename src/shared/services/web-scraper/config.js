/**
 * 网络爬虫配置管理器
 * 提供统一的配置管理和动态配置更新
 */

const path = require('path');
const fs = require('fs');

class WebScraperConfig {
  constructor() {
    this.configPath = path.join(__dirname, '..', '..', '..', 'config', 'web-scraper.json');
    this.defaultConfig = {
      // 基础配置
      base: {
        timeout: 30000,
        retries: 3,
        retryDelay: 1000,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        acceptLanguage: 'zh-CN,zh;q=0.9,en;q=0.8',
        acceptEncoding: 'gzip, deflate, br',
        cache: true,
        cacheTimeout: 3600000 // 1小时
      },
      
      // 限流配置
      rateLimit: {
        requestsPerSecond: 2,
        burstSize: 5,
        cooldownPeriod: 60000,
        adaptiveRateLimit: true,
        minRequestsPerSecond: 0.5,
        maxRequestsPerSecond: 10
      },
      
      // 代理配置
      proxy: {
        enabled: false,
        rotation: true,
        proxies: [],
        proxyTimeout: 10000,
        proxyRetries: 2,
        proxyRetryDelay: 2000,
        geoLocation: {
          enabled: false,
          countries: ['JP', 'US', 'SG', 'HK'],
          preferJapanese: true
        }
      },
      
      // 反爬虫配置
      antiBot: {
        enabled: true,
        userAgentRotation: true,
        userAgents: [
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0'
        ],
        headerSpoofing: true,
        randomHeaders: {
          'DNT': '1',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'max-age=0'
        },
        behaviorMimicry: {
          enabled: true,
          mouseMovement: true,
          scrollBehavior: true,
          clickSimulation: true,
          randomDelays: true,
          minDelay: 1000,
          maxDelay: 3000
        },
        detectionThreshold: 0.7
      },
      
      // 网站特定配置
      sites: {
        'javbus.com': {
          baseUrl: 'https://www.javbus.com',
          searchPath: '/search/{query}',
          moviePath: '/{id}',
          encoding: 'utf-8',
          rateLimit: {
            requestsPerSecond: 1,
            burstSize: 3
          },
          selectors: {
            title: 'h3',
            cover: '.bigImage img',
            releaseDate: '.info p:nth-child(3)',
            duration: '.info p:nth-child(4)',
            director: '.info p:nth-child(5)',
            studio: '.info p:nth-child(6)',
            label: '.info p:nth-child(7)',
            series: '.info p:nth-child(8)',
            genres: '.info p:nth-child(9)',
            cast: '.star-name',
            sampleImages: '.sample-box img'
          },
          antiBot: {
            enabled: true,
            detectionKeywords: ['cloudflare', 'ddos protection', 'checking your browser'],
            bypassTechniques: ['user-agent-rotation', 'header-spoofing']
          }
        },
        
        'javlibrary.com': {
          baseUrl: 'https://www.javlibrary.com',
          searchPath: '/vl_searchbyid.php?keyword={query}',
          moviePath: '/?v={id}',
          encoding: 'utf-8',
          rateLimit: {
            requestsPerSecond: 1.5,
            burstSize: 4
          },
          selectors: {
            title: '#video_title h3',
            cover: '#video_jacket_img',
            releaseDate: '.text:nth-child(2)',
            duration: '.text:nth-child(4)',
            director: '.text:nth-child(6)',
            studio: '.text:nth-child(8)',
            label: '.text:nth-child(10)',
            series: '.text:nth-child(12)',
            genres: '.genre a',
            cast: '.star a',
            sampleImages: '.previewthumbs img'
          },
          antiBot: {
            enabled: true,
            detectionKeywords: ['robot', 'crawler', 'automated'],
            bypassTechniques: ['user-agent-rotation', 'random-delays']
          }
        },
        
        'fc2.com': {
          baseUrl: 'https://adult.contents.fc2.com',
          searchPath: '/search/?q={query}',
          moviePath: '/article/{id}/',
          encoding: 'utf-8',
          rateLimit: {
            requestsPerSecond: 0.5,
            burstSize: 2
          },
          selectors: {
            title: 'h2 a',
            cover: '.main_img img',
            releaseDate: '.info .date',
            duration: '.info .duration',
            price: '.info .price',
            description: '.info .description'
          },
          antiBot: {
            enabled: true,
            detectionKeywords: ['fc2', 'adult content'],
            bypassTechniques: ['user-agent-rotation']
          }
        }
      },
      
      // 缓存配置
      cache: {
        enabled: true,
        type: 'memory', // memory, file, redis
        maxSize: 1000,
        ttl: 3600000, // 1小时
        cleanupInterval: 300000, // 5分钟清理一次
        keyPrefix: 'jav_scraper_',
        compression: true
      },
      
      // 日志配置
      logging: {
        level: 'info', // error, warn, info, debug
        file: true,
        filePath: path.join(__dirname, '..', '..', '..', 'logs', 'web-scraper.log'),
        maxSize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        console: true,
        timestamp: true,
        format: 'json'
      },
      
      // 监控配置
      monitoring: {
        enabled: true,
        metricsInterval: 60000, // 1分钟收集一次指标
        alertThresholds: {
          errorRate: 0.1, // 10%错误率
          responseTime: 5000, // 5秒响应时间
          failedRequests: 10 // 连续失败请求数
        },
        webhooks: [], // 告警webhook地址
        emailAlerts: false,
        emailConfig: {
          smtp: '',
          port: 587,
          secure: true,
          user: '',
          password: '',
          from: '',
          to: []
        }
      }
    };
    
    this.currentConfig = this.loadConfig();
  }

  /**
   * 加载配置文件
   * @returns {Object} - 配置对象
   */
  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        const userConfig = JSON.parse(configData);
        return this.mergeConfig(this.defaultConfig, userConfig);
      }
    } catch (error) {
      console.warn('加载配置文件失败，使用默认配置:', error.message);
    }
    
    return JSON.parse(JSON.stringify(this.defaultConfig)); // 深拷贝默认配置
  }

  /**
   * 保存配置到文件
   * @param {Object} config - 配置对象
   */
  saveConfig(config) {
    try {
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf8');
      this.currentConfig = config;
      
      console.log('配置已保存到:', this.configPath);
    } catch (error) {
      console.error('保存配置失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取配置
   * @param {string} path - 配置路径（点分隔）
   * @param {*} defaultValue - 默认值
   * @returns {*} - 配置值
   */
  get(path, defaultValue = null) {
    const keys = path.split('.');
    let current = this.currentConfig;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return defaultValue;
      }
    }
    
    return current;
  }

  /**
   * 设置配置
   * @param {string} path - 配置路径（点分隔）
   * @param {*} value - 配置值
   */
  set(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let current = this.currentConfig;
    
    for (const key of keys) {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[lastKey] = value;
  }

  /**
   * 更新配置
   * @param {Object} updates - 更新对象
   */
  update(updates) {
    this.currentConfig = this.mergeConfig(this.currentConfig, updates);
  }

  /**
   * 获取网站配置
   * @param {string} site - 网站域名
   * @returns {Object} - 网站配置
   */
  getSiteConfig(site) {
    const siteConfig = this.get(`sites.${site}`);
    if (!siteConfig) {
      return this.getDefaultSiteConfig(site);
    }
    
    // 合并通用配置和网站特定配置
    return {
      ...this.get('base'),
      ...this.get('rateLimit'),
      ...this.get('antiBot'),
      ...siteConfig,
      rateLimit: {
        ...this.get('rateLimit'),
        ...siteConfig.rateLimit
      },
      antiBot: {
        ...this.get('antiBot'),
        ...siteConfig.antiBot
      }
    };
  }

  /**
   * 获取默认网站配置
   * @param {string} site - 网站域名
   * @returns {Object} - 默认网站配置
   */
  getDefaultSiteConfig(site) {
    return {
      ...this.get('base'),
      ...this.get('rateLimit'),
      ...this.get('antiBot'),
      baseUrl: `https://${site}`,
      searchPath: '/search/?q={query}',
      moviePath: '/{id}',
      encoding: 'utf-8',
      selectors: {},
      antiBot: {
        enabled: true,
        detectionKeywords: ['bot', 'crawler', 'automated']
      }
    };
  }

  /**
   * 获取代理配置
   * @returns {Object} - 代理配置
   */
  getProxyConfig() {
    return this.get('proxy');
  }

  /**
   * 获取缓存配置
   * @returns {Object} - 缓存配置
   */
  getCacheConfig() {
    return this.get('cache');
  }

  /**
   * 获取日志配置
   * @returns {Object} - 日志配置
   */
  getLoggingConfig() {
    return this.get('logging');
  }

  /**
   * 合并配置对象
   * @param {Object} target - 目标对象
   * @param {Object} source - 源对象
   * @returns {Object} - 合并后的对象
   */
  mergeConfig(target, source) {
    const result = JSON.parse(JSON.stringify(target)); // 深拷贝
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          if (typeof result[key] === 'object' && result[key] !== null && !Array.isArray(result[key])) {
            result[key] = this.mergeConfig(result[key], source[key]);
          } else {
            result[key] = JSON.parse(JSON.stringify(source[key]));
          }
        } else {
          result[key] = source[key];
        }
      }
    }
    
    return result;
  }

  /**
   * 创建默认配置文件
   */
  createDefaultConfig() {
    try {
      this.saveConfig(this.defaultConfig);
      console.log('默认配置文件已创建');
    } catch (error) {
      console.error('创建默认配置文件失败:', error.message);
    }
  }

  /**
   * 验证配置
   * @returns {Object} - 验证结果
   */
  validate() {
    const errors = [];
    const warnings = [];
    
    // 验证基础配置
    if (this.get('base.timeout') < 1000) {
      errors.push('基础超时时间不能小于1000ms');
    }
    
    if (this.get('base.retries') < 0) {
      errors.push('重试次数不能为负数');
    }
    
    // 验证限流配置
    if (this.get('rateLimit.requestsPerSecond') <= 0) {
      errors.push('请求频率必须大于0');
    }
    
    if (this.get('rateLimit.burstSize') <= 0) {
      errors.push('突发请求数必须大于0');
    }
    
    // 验证代理配置
    if (this.get('proxy.enabled') && this.get('proxy.proxies').length === 0) {
      warnings.push('代理已启用但未配置代理服务器');
    }
    
    // 验证缓存配置
    if (this.get('cache.enabled') && this.get('cache.maxSize') <= 0) {
      errors.push('缓存最大数量必须大于0');
    }
    
    // 验证日志配置
    if (this.get('logging.file') && !this.get('logging.filePath')) {
      warnings.push('文件日志已启用但未指定日志文件路径');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors,
      warnings: warnings
    };
  }

  /**
   * 获取配置摘要
   * @returns {Object} - 配置摘要
   */
  getSummary() {
    return {
      configPath: this.configPath,
      sitesConfigured: Object.keys(this.get('sites') || {}).length,
      proxyEnabled: this.get('proxy.enabled'),
      antiBotEnabled: this.get('antiBot.enabled'),
      cacheEnabled: this.get('cache.enabled'),
      currentRequestsPerSecond: this.get('rateLimit.requestsPerSecond'),
      userAgentRotation: this.get('antiBot.userAgentRotation'),
      validation: this.validate()
    };
  }
}

module.exports = WebScraperConfig;