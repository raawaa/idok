/**
 * 系统代理检测工具
 * 自动检测系统代理设置和环境变量代理
 */

const { URL } = require('url');

class SystemProxyDetector {
  constructor() {
    this.envProxies = this.detectEnvProxies();
    this.systemProxy = this.detectSystemProxy();
  }

  /**
   * 检测环境变量中的代理设置
   */
  detectEnvProxies() {
    const env = process.env;

    return {
      http: env.HTTP_PROXY || env.http_proxy || null,
      https: env.HTTPS_PROXY || env.https_proxy || null,
      noProxy: env.NO_PROXY || env.no_proxy || null,
      allProxy: env.ALL_PROXY || env.all_proxy || null
    };
  }

  /**
   * 检测系统代理设置（简化版）
   * 注意：完整的系统代理检测需要平台特定的实现
   */
  detectSystemProxy() {
    // 这里可以扩展为读取系统注册表（Windows）或系统配置（macOS/Linux）
    // 目前返回null，需要手动配置或通过环境变量设置
    return null;
  }

  /**
   * 获取指定URL的代理配置
   */
  getProxyForUrl(url) {
    try {
      const urlObj = new URL(url);
      const protocol = urlObj.protocol.toLowerCase().replace(':', '');

      // 检查NO_PROXY列表
      if (this.shouldBypassProxy(urlObj.hostname)) {
        return null;
      }

      // 优先使用协议特定的代理
      if (this.envProxies[protocol]) {
        return this.parseProxyUrl(this.envProxies[protocol]);
      }

      // 回退到通用代理
      if (this.envProxies.allProxy) {
        return this.parseProxyUrl(this.envProxies.allProxy);
      }

      return null;
    } catch (error) {
      console.warn('代理检测失败:', error.message);
      return null;
    }
  }

  /**
   * 检查主机是否应该绕过代理
   */
  shouldBypassProxy(hostname) {
    if (!this.envProxies.noProxy) {
      return false;
    }

    const noProxyList = this.envProxies.noProxy
      .split(',')
      .map(host => host.trim().toLowerCase());

    // 精确匹配
    if (noProxyList.includes(hostname.toLowerCase())) {
      return true;
    }

    // 通配符匹配
    for (const noProxyHost of noProxyList) {
      if (noProxyHost.startsWith('*.')) {
        const domain = noProxyHost.substring(2);
        if (hostname.endsWith(domain)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 解析代理URL
   */
  parseProxyUrl(proxyUrl) {
    try {
      const parsed = new URL(proxyUrl);

      const proxy = {
        protocol: parsed.protocol.replace(':', ''),
        host: parsed.hostname,
        port: parsed.port || this.getDefaultPort(parsed.protocol)
      };

      // 添加认证信息
      if (parsed.username && parsed.password) {
        proxy.auth = {
          username: decodeURIComponent(parsed.username),
          password: decodeURIComponent(parsed.password)
        };
      }

      return proxy;
    } catch (error) {
      console.warn(`代理URL解析失败: ${proxyUrl}`, error.message);
      return null;
    }
  }

  /**
   * 获取协议的默认端口
   */
  getDefaultPort(protocol) {
    const defaultPorts = {
      'http:': 80,
      'https:': 8080,
      'socks5:': 1080,
      'socks4:': 1080
    };

    return defaultPorts[protocol] || 8080;
  }

  /**
   * 获取适用于axios的代理配置
   */
  getAxiosProxyConfig(url) {
    const proxy = this.getProxyForUrl(url);

    if (!proxy) {
      return null;
    }

    const axiosProxy = {
      host: proxy.host,
      port: proxy.port
    };

    // 添加认证
    if (proxy.auth) {
      axiosProxy.auth = {
        username: proxy.auth.username,
        password: proxy.auth.password
      };
    }

    return axiosProxy;
  }

  /**
   * 检测代理是否可用
   */
  async testProxy(proxyConfig) {
    try {
      const axios = require('axios');
      const response = await axios.get('http://httpbin.org/ip', {
        proxy: proxyConfig,
        timeout: 5000
      });

      return {
        success: true,
        ip: response.data.origin,
        responseTime: response.headers['x-response-time'] || 'unknown'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取代理信息摘要
   */
  getProxyInfo() {
    return {
      envProxies: this.envProxies,
      systemProxy: this.systemProxy,
      hasProxy: !!(this.envProxies.http || this.envProxies.https || this.envProxies.allProxy),
      supportedProtocols: ['http', 'https', 'socks4', 'socks5']
    };
  }

  /**
   * 创建代理配置（供其他模块使用）
   */
  static createProxyConfig(options = {}) {
    const detector = new SystemProxyDetector();

    return {
      // 自动检测系统代理
      autoDetect: options.autoDetect !== false,

      // 手动配置的代理（优先级高于自动检测）
      manual: options.manual || null,

      // 代理检测器实例
      detector,

      // 获取代理配置的方法
      getProxyForUrl: (url) => {
        // 优先使用手动配置
        if (options.manual) {
          return options.manual;
        }

        // 自动检测
        if (options.autoDetect !== false) {
          return detector.getAxiosProxyConfig(url);
        }

        return null;
      }
    };
  }
}

module.exports = SystemProxyDetector;