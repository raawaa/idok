const EventEmitter = require('eventemitter3');

// 简化的代理管理器实现
class ProxyManager extends EventEmitter {
  constructor() {
    super();
    
    this.proxies = [];
    this.currentIndex = 0;
    this.failedProxies = new Set();
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      proxyRotations: 0
    };
  }

  addProxy(proxy) {
    this.proxies.push({
      ...proxy,
      id: Date.now() + Math.random(),
      lastUsed: null,
      successRate: 1.0,
      consecutiveFailures: 0
    });
  }

  addProxies(proxyList) {
    proxyList.forEach(proxy => this.addProxy(proxy));
  }

  getNextProxy() {
    if (this.proxies.length === 0) {
      return null;
    }

    // 过滤掉失败的代理
    const availableProxies = this.proxies.filter(proxy => 
      !this.failedProxies.has(proxy.id) && proxy.consecutiveFailures < 3
    );

    if (availableProxies.length === 0) {
      // 如果没有可用代理，重置失败状态
      this.failedProxies.clear();
      this.proxies.forEach(proxy => {
        proxy.consecutiveFailures = 0;
      });
      return this.proxies[0];
    }

    // 轮询选择
    const proxy = availableProxies[this.currentIndex % availableProxies.length];
    this.currentIndex++;
    this.stats.proxyRotations++;

    return proxy;
  }

  markProxySuccess(proxyId) {
    const proxy = this.proxies.find(p => p.id === proxyId);
    if (proxy) {
      proxy.lastUsed = Date.now();
      proxy.successRate = Math.min(1.0, proxy.successRate + 0.1);
      proxy.consecutiveFailures = 0;
      this.stats.successfulRequests++;
      this.stats.totalRequests++;
    }
  }

  markProxyFailure(proxyId) {
    const proxy = this.proxies.find(p => p.id === proxyId);
    if (proxy) {
      proxy.consecutiveFailures++;
      proxy.successRate = Math.max(0, proxy.successRate - 0.2);
      this.stats.failedRequests++;

      // 如果连续失败超过阈值，标记为失败
      if (proxy.consecutiveFailures >= 3) {
        this.failedProxies.add(proxyId);
        this.emit('proxyFailed', proxy);
      }
    }
  }

  getProxyStats() {
    return {
      ...this.stats,
      totalProxies: this.proxies.length,
      activeProxies: this.proxies.length - this.failedProxies.size,
      failedProxies: this.failedProxies.size,
      successRate: this.stats.totalRequests > 0 ? 
        (this.stats.successfulRequests / this.stats.totalRequests).toFixed(2) : '0.00'
    };
  }

  getProxyConfig(proxy) {
    if (!proxy) return null;

    const config = {
      host: proxy.host,
      port: proxy.port,
      auth: proxy.username ? {
        username: proxy.username,
        password: proxy.password
      } : undefined
    };

    return config;
  }

  validateProxy(proxy) {
    if (!proxy || !proxy.host || !proxy.port) {
      return false;
    }
    return proxy.port > 0 && proxy.port < 65536;
  }

  removeProxy(proxyId) {
    this.proxies = this.proxies.filter(p => p.id !== proxyId);
    this.failedProxies.delete(proxyId);
  }

  clearFailedProxies() {
    this.failedProxies.clear();
    this.proxies.forEach(proxy => {
      proxy.consecutiveFailures = 0;
    });
  }

  destroy() {
    this.proxies = [];
    this.failedProxies.clear();
    if (this.removeAllListeners) {
      this.removeAllListeners();
    }
  }
}

describe('ProxyManager Tests', () => {
  let proxyManager;

  beforeEach(() => {
    proxyManager = new ProxyManager();
  });

  afterEach(() => {
    if (proxyManager && typeof proxyManager.destroy === 'function') {
      proxyManager.destroy();
    }
  });

  test('should add and retrieve proxies', () => {
    const proxy = {
      host: '127.0.0.1',
      port: 8080,
      username: 'user',
      password: 'pass'
    };

    proxyManager.addProxy(proxy);
    const retrievedProxy = proxyManager.getNextProxy();

    expect(retrievedProxy).toBeTruthy();
    expect(retrievedProxy.host).toBe('127.0.0.1');
    expect(retrievedProxy.port).toBe(8080);
  });

  test('should rotate proxies correctly', () => {
    const proxy1 = { host: '127.0.0.1', port: 8080 };
    const proxy2 = { host: '127.0.0.2', port: 8081 };

    proxyManager.addProxy(proxy1);
    proxyManager.addProxy(proxy2);

    const firstProxy = proxyManager.getNextProxy();
    const secondProxy = proxyManager.getNextProxy();

    expect(firstProxy.host).not.toBe(secondProxy.host);
  });

  test('should mark proxy success and update stats', () => {
    const proxy = { host: '127.0.0.1', port: 8080 };
    proxyManager.addProxy(proxy);
    
    const retrievedProxy = proxyManager.getNextProxy();
    proxyManager.markProxySuccess(retrievedProxy.id);

    const stats = proxyManager.getProxyStats();
    expect(stats.successfulRequests).toBe(1);
    expect(stats.successRate).toBe('1.00');
  });

  test('should mark proxy failure and handle consecutive failures', () => {
    const proxy = { host: '127.0.0.1', port: 8080 };
    proxyManager.addProxy(proxy);
    
    const retrievedProxy = proxyManager.getNextProxy();
    
    // 模拟连续失败
    proxyManager.markProxyFailure(retrievedProxy.id);
    proxyManager.markProxyFailure(retrievedProxy.id);
    proxyManager.markProxyFailure(retrievedProxy.id);

    const stats = proxyManager.getProxyStats();
    expect(stats.failedRequests).toBe(3);
    expect(proxyManager.failedProxies.size).toBe(1);
  });

  test('should generate correct proxy configuration', () => {
    const proxy = {
      host: '127.0.0.1',
      port: 8080,
      username: 'user',
      password: 'pass'
    };

    proxyManager.addProxy(proxy);
    const retrievedProxy = proxyManager.getNextProxy();
    const config = proxyManager.getProxyConfig(retrievedProxy);

    expect(config).toEqual({
      host: '127.0.0.1',
      port: 8080,
      auth: {
        username: 'user',
        password: 'pass'
      }
    });
  });

  test('should validate proxy configuration', () => {
    const validProxy = { host: '127.0.0.1', port: 8080 };
    const invalidProxy = { host: '', port: -1 };

    expect(proxyManager.validateProxy(validProxy)).toBe(true);
    expect(proxyManager.validateProxy(invalidProxy)).toBe(false);
  });

  test('should handle empty proxy list', () => {
    const proxy = proxyManager.getNextProxy();
    expect(proxy).toBeNull();
  });

  test('should clear failed proxies', () => {
    const proxy = { host: '127.0.0.1', port: 8080 };
    proxyManager.addProxy(proxy);
    
    const retrievedProxy = proxyManager.getNextProxy();
    proxyManager.markProxyFailure(retrievedProxy.id);
    proxyManager.markProxyFailure(retrievedProxy.id);
    proxyManager.markProxyFailure(retrievedProxy.id);

    expect(proxyManager.failedProxies.size).toBe(1);
    
    proxyManager.clearFailedProxies();
    expect(proxyManager.failedProxies.size).toBe(0);
  });
});