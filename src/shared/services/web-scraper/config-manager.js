/**
 * 配置管理器
 * 参考JavSP的全局配置设计，提供统一的配置管理
 */

class ConfigManager {
  constructor() {
    this.defaults = this.loadDefaults();
    this.userConfig = {};
  }

  /**
   * 加载默认配置
   */
  loadDefaults() {
    return {
      // 网络配置
      network: {
        timeout: 30000,        // 30秒超时
        retries: 3,            // 默认重试3次
        retryDelay: 1000,      // 重试延迟1秒
        proxyServer: null,     // 代理服务器
        useCloudScraper: true, // 使用CloudScraper
      },

      // 缓存配置
      cache: {
        enableCache: true,
        expiry: 3600000,       // 1小时缓存过期
      },

      // 浏览器配置
      browser: {
        delayRange: [1000, 3000], // 随机延迟范围
        enableHtmlCleaning: true,
      },

      // Cookie配置
      cookies: {
        persistence: true,
        domain: null,
      },

      // 编码配置
      encoding: {
        detection: true,
        defaultEncoding: 'utf8',
      }
    };
  }

  /**
   * 获取配置值
   * @param {string} path - 配置路径，如 'network.timeout'
   * @param {any} defaultValue - 默认值
   * @returns {any} 配置值
   */
  get(path, defaultValue = undefined) {
    const keys = path.split('.');
    let value = { ...this.defaults, ...this.userConfig };

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }

    return value;
  }

  /**
   * 设置配置值
   * @param {string} path - 配置路径
   * @param {any} value - 配置值
   */
  set(path, value) {
    const keys = path.split('.');
    let current = this.userConfig;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * 合并配置选项
   * @param {Object} options - 用户配置选项
   * @returns {Object} 合并后的配置
   */
  mergeOptions(options = {}) {
    const merged = this.deepMerge(this.defaults, this.userConfig);
    return this.deepMerge(merged, options);
  }

  /**
   * 深度合并对象
   * @param {Object} target - 目标对象
   * @param {Object} source - 源对象
   * @returns {Object} 合并后的对象
   */
  deepMerge(target, source) {
    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && source[key] !== null &&
            typeof target[key] === 'object' && target[key] !== null) {
          result[key] = this.deepMerge(target[key], source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }

    return result;
  }

  /**
   * 重置为默认配置
   */
  reset() {
    this.userConfig = {};
  }

  /**
   * 获取所有配置
   * @returns {Object} 完整配置对象
   */
  getAll() {
    return this.mergeOptions();
  }

  /**
   * 从环境变量加载配置
   */
  loadFromEnv() {
    // 代理配置
    if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
      const proxy = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
      this.set('network.proxyServer', proxy);
    }

    // 超时配置
    if (process.env.REQUEST_TIMEOUT) {
      const timeout = parseInt(process.env.REQUEST_TIMEOUT);
      if (!isNaN(timeout)) {
        this.set('network.timeout', timeout);
      }
    }

    // 调试模式
    if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
      this.set('debug', true);
    }
  }

  /**
   * 获取代理配置（兼容JavSP格式）
   * @returns {Object|null} 代理配置
   */
  getProxyConfig() {
    const proxyServer = this.get('network.proxyServer');
    if (!proxyServer) {
      return null;
    }

    // 如果已经是对象格式，直接返回
    if (typeof proxyServer === 'object') {
      return proxyServer;
    }

    // 转换字符串格式为对象格式
    return {
      http: proxyServer,
      https: proxyServer
    };
  }
}

// 创建全局配置实例
const config = new ConfigManager();

// 自动加载环境变量配置
config.loadFromEnv();

module.exports = {
  ConfigManager,
  config
};