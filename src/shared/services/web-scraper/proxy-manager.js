/**
 * 代理管理模块
 * 提供代理轮换、健康检查和故障处理
 */

const EventEmitter = require('eventemitter3');

class ProxyManager extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = config;
    this.proxies = [];
    this.activeProxies = [];
    this.failedProxies = new Map();
    this.currentIndex = 0;
    this.healthCheckInterval = null;
    
    this.initializeProxies();
  }

  /**
   * 初始化代理列表
   */
  initializeProxies() {
    if (!this.config.enabled || !this.config.proxies || this.config.proxies.length === 0) {
      console.log('代理未启用或未配置代理服务器');
      return;
    }

    this.proxies = this.config.proxies.map((proxy, index) => {
      const proxyObj = {
        id: index,
        host: proxy.host,
        port: proxy.port,
        protocol: proxy.protocol || 'http',
        auth: proxy.auth || null,
        geoLocation: proxy.geoLocation || null,
        successCount: 0,
        failureCount: 0,
        consecutiveFailures: 0,
        lastUsed: null,
        lastSuccess: null,
        responseTime: null,
        status: 'active', // active, failed, disabled
        weight: proxy.weight || 1
      };

      return proxyObj;
    });

    this.activeProxies = this.proxies.filter(proxy => proxy.status === 'active');
    
    if (this.config.healthCheck && this.config.healthCheck.enabled) {
      this.startHealthCheck();
    }

    console.log(`代理管理器已初始化，共 ${this.proxies.length} 个代理服务器`);
  }

  /**
   * 获取下一个可用代理
   * @param {Object} options - 选项
   * @returns {Object|null} - 代理对象
   */
  getNextProxy(options = {}) {
    if (!this.config.enabled || this.activeProxies.length === 0) {
      return null;
    }

    const { preferJapanese = false, excludeFailed = true } = options;
    
    let availableProxies = this.activeProxies;
    
    // 过滤失败的代理
    if (excludeFailed) {
      availableProxies = availableProxies.filter(proxy => proxy.consecutiveFailures < 3);
    }
    
    // 优先选择日本代理
    if (preferJapanese && this.config.geoLocation && this.config.geoLocation.preferJapanese) {
      const japaneseProxies = availableProxies.filter(proxy => 
        proxy.geoLocation && proxy.geoLocation.country === 'JP'
      );
      
      if (japaneseProxies.length > 0) {
        availableProxies = japaneseProxies;
      }
    }

    if (availableProxies.length === 0) {
      console.warn('没有可用的代理服务器');
      return null;
    }

    // 使用加权轮询算法
    const selectedProxy = this.selectWeightedProxy(availableProxies);
    
    if (selectedProxy) {
      selectedProxy.lastUsed = Date.now();
      this.emit('proxy:selected', selectedProxy);
    }

    return selectedProxy;
  }

  /**
   * 加权轮询选择代理
   * @param {Array} proxies - 可用代理列表
   * @returns {Object} - 选中的代理
   */
  selectWeightedProxy(proxies) {
    // 计算总权重
    const totalWeight = proxies.reduce((sum, proxy) => sum + proxy.weight, 0);
    
    // 生成随机权重
    let randomWeight = Math.random() * totalWeight;
    
    // 选择代理
    for (const proxy of proxies) {
      randomWeight -= proxy.weight;
      if (randomWeight <= 0) {
        return proxy;
      }
    }
    
    // 如果出现问题，返回第一个代理
    return proxies[0];
  }

  /**
   * 标记代理成功
   * @param {Object} proxy - 代理对象
   * @param {number} responseTime - 响应时间
   */
  markProxySuccess(proxy, responseTime) {
    if (!proxy) return;
    
    proxy.successCount++;
    proxy.consecutiveFailures = 0;
    proxy.lastSuccess = Date.now();
    proxy.responseTime = responseTime;
    
    // 如果代理之前失败，现在重新激活
    if (proxy.status === 'failed') {
      proxy.status = 'active';
      this.activeProxies.push(proxy);
      this.emit('proxy:reactivated', proxy);
    }
    
    this.emit('proxy:success', proxy);
  }

  /**
   * 标记代理失败
   * @param {Object} proxy - 代理对象
   * @param {Error} error - 错误对象
   */
  markProxyFailed(proxy, error) {
    if (!proxy) return;
    
    proxy.failureCount++;
    proxy.consecutiveFailures++;
    proxy.lastFailure = Date.now();
    
    // 如果连续失败次数过多，禁用代理
    if (proxy.consecutiveFailures >= this.config.proxyRetries || proxy.failureCount >= 10) {
      this.disableProxy(proxy, error);
    } else {
      console.warn(`代理 ${proxy.host}:${proxy.port} 失败 (次数: ${proxy.consecutiveFailures})`);
    }
    
    this.emit('proxy:failed', proxy, error);
  }

  /**
   * 禁用代理
   * @param {Object} proxy - 代理对象
   * @param {Error} error - 错误对象
   */
  disableProxy(proxy, error) {
    proxy.status = 'failed';
    proxy.disabledAt = Date.now();
    
    // 从活跃代理列表中移除
    const index = this.activeProxies.findIndex(p => p.id === proxy.id);
    if (index !== -1) {
      this.activeProxies.splice(index, 1);
    }
    
    this.failedProxies.set(proxy.id, {
      proxy,
      error: error.message,
      failedAt: Date.now()
    });
    
    console.warn(`代理 ${proxy.host}:${proxy.port} 已被禁用: ${error.message}`);
    this.emit('proxy:disabled', proxy, error);
  }

  /**
   * 重新激活代理
   * @param {Object} proxy - 代理对象
   */
  reactivateProxy(proxy) {
    if (proxy.status !== 'failed') return;
    
    proxy.status = 'active';
    proxy.consecutiveFailures = 0;
    proxy.lastSuccess = Date.now();
    
    this.activeProxies.push(proxy);
    this.failedProxies.delete(proxy.id);
    
    console.log(`代理 ${proxy.host}:${proxy.port} 已重新激活`);
    this.emit('proxy:reactivated', proxy);
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    if (!this.config.healthCheck || !this.config.healthCheck.enabled) {
      return;
    }

    console.log('开始代理健康检查...');
    
    const checkPromises = this.proxies
      .filter(proxy => proxy.status !== 'disabled')
      .map(proxy => this.checkProxyHealth(proxy));
    
    try {
      await Promise.allSettled(checkPromises);
      console.log('代理健康检查完成');
    } catch (error) {
      console.error('代理健康检查出错:', error.message);
    }
  }

  /**
   * 检查单个代理的健康状态
   * @param {Object} proxy - 代理对象
   */
  async checkProxyHealth(proxy) {
    const startTime = Date.now();
    
    try {
      const axios = require('axios');
      const https = require('https');
      
      const agent = new https.Agent({
        rejectUnauthorized: false,
        timeout: this.config.proxyTimeout || 10000
      });
      
      const proxyConfig = {
        host: proxy.host,
        port: proxy.port,
        protocol: proxy.protocol || 'http'
      };
      
      if (proxy.auth) {
        proxyConfig.auth = proxy.auth;
      }
      
      const response = await axios.get('https://httpbin.org/ip', {
        proxy: proxyConfig,
        httpsAgent: agent,
        timeout: this.config.proxyTimeout || 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const responseTime = Date.now() - startTime;
      
      if (response.status === 200) {
        this.markProxySuccess(proxy, responseTime);
        console.log(`代理 ${proxy.host}:${proxy.port} 健康检查通过，响应时间: ${responseTime}ms`);
      } else {
        throw new Error(`HTTP状态码: ${response.status}`);
      }
      
    } catch (error) {
      console.error(`代理 ${proxy.host}:${proxy.port} 健康检查失败:`, error.message);
      this.markProxyFailed(proxy, error);
    }
  }

  /**
   * 开始健康检查
   */
  startHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    const interval = this.config.healthCheck.interval || 300000; // 默认5分钟
    
    this.healthCheckInterval = setInterval(() => {
      this.healthCheck();
    }, interval);
    
    console.log(`代理健康检查已启动，检查间隔: ${interval}ms`);
    
    // 立即执行一次健康检查
    setTimeout(() => this.healthCheck(), 5000);
  }

  /**
   * 停止健康检查
   */
  stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('代理健康检查已停止');
    }
  }

  /**
   * 获取代理统计信息
   * @returns {Object} - 统计信息
   */
  getStats() {
    const total = this.proxies.length;
    const active = this.activeProxies.length;
    const failed = this.failedProxies.size;
    const disabled = this.proxies.filter(p => p.status === 'disabled').length;
    
    const totalRequests = this.proxies.reduce((sum, proxy) => 
      sum + proxy.successCount + proxy.failureCount, 0);
    const successRequests = this.proxies.reduce((sum, proxy) => 
      sum + proxy.successCount, 0);
    const failureRequests = this.proxies.reduce((sum, proxy) => 
      sum + proxy.failureCount, 0);
    
    const avgResponseTime = this.proxies
      .filter(proxy => proxy.responseTime)
      .reduce((sum, proxy) => sum + proxy.responseTime, 0) / 
      this.proxies.filter(proxy => proxy.responseTime).length || 0;
    
    return {
      total,
      active,
      failed,
      disabled,
      totalRequests,
      successRequests,
      failureRequests,
      successRate: totalRequests > 0 ? (successRequests / totalRequests * 100).toFixed(2) + '%' : '0%',
      avgResponseTime: avgResponseTime ? avgResponseTime.toFixed(0) + 'ms' : 'N/A',
      uptime: this.calculateUptime()
    };
  }

  /**
   * 计算运行时间
   * @returns {string} - 运行时间
   */
  calculateUptime() {
    const now = Date.now();
    const startTime = this.startTime || now;
    const uptime = now - startTime;
    
    const hours = Math.floor(uptime / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((uptime % (1000 * 60)) / 1000);
    
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  /**
   * 添加代理
   * @param {Object} proxyConfig - 代理配置
   */
  addProxy(proxyConfig) {
    const proxy = {
      id: this.proxies.length,
      host: proxyConfig.host,
      port: proxyConfig.port,
      protocol: proxyConfig.protocol || 'http',
      auth: proxyConfig.auth || null,
      geoLocation: proxyConfig.geoLocation || null,
      successCount: 0,
      failureCount: 0,
      consecutiveFailures: 0,
      lastUsed: null,
      lastSuccess: null,
      responseTime: null,
      status: 'active',
      weight: proxyConfig.weight || 1
    };
    
    this.proxies.push(proxy);
    this.activeProxies.push(proxy);
    
    console.log(`代理 ${proxy.host}:${proxy.port} 已添加`);
    this.emit('proxy:added', proxy);
  }

  /**
   * 移除代理
   * @param {number} proxyId - 代理ID
   */
  removeProxy(proxyId) {
    const proxyIndex = this.proxies.findIndex(p => p.id === proxyId);
    if (proxyIndex === -1) {
      return;
    }
    
    const proxy = this.proxies[proxyIndex];
    
    // 从活跃代理列表中移除
    const activeIndex = this.activeProxies.findIndex(p => p.id === proxyId);
    if (activeIndex !== -1) {
      this.activeProxies.splice(activeIndex, 1);
    }
    
    // 从失败代理列表中移除
    this.failedProxies.delete(proxyId);
    
    // 从主列表中移除
    this.proxies.splice(proxyIndex, 1);
    
    console.log(`代理 ${proxy.host}:${proxy.port} 已移除`);
    this.emit('proxy:removed', proxy);
  }

  /**
   * 获取代理配置
   * @param {Object} proxy - 代理对象
   * @returns {Object} - axios代理配置
   */
  getAxiosProxyConfig(proxy) {
    if (!proxy) return null;
    
    const config = {
      host: proxy.host,
      port: proxy.port,
      protocol: proxy.protocol || 'http'
    };
    
    if (proxy.auth) {
      config.auth = proxy.auth;
    }
    
    return config;
  }

  /**
   * 销毁代理管理器
   */
  destroy() {
    this.stopHealthCheck();
    this.removeAllListeners();
    
    // 清理资源
    this.proxies = [];
    this.activeProxies = [];
    this.failedProxies.clear();
    
    console.log('代理管理器已销毁');
  }
}

module.exports = ProxyManager;