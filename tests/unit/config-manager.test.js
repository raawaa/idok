// 简化的配置管理器实现
class ConfigManager {
  constructor() {
    this.config = {
      // 默认配置
      scraping: {
        timeout: 30000,
        retries: 3,
        retryDelay: 1000,
        concurrentRequests: 5,
        requestDelay: 1000,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive'
        }
      },
      
      proxy: {
        enabled: false,
        rotationEnabled: true,
        maxFailures: 3,
        timeout: 10000,
        proxies: []
      },

      antiBot: {
        enabled: true,
        detectionEnabled: true,
        autoBypassEnabled: false,
        maxRetries: 5,
        bypassDelay: 5000
      },

      rateLimit: {
        enabled: true,
        maxRequests: 100,
        timeWindow: 60000, // 1分钟
        backoffMultiplier: 2
      },

      logging: {
        level: 'info',
        enabled: true,
        file: 'scraper.log',
        maxSize: '10m',
        maxFiles: 5
      },

      storage: {
        maxRetries: 3,
        retryDelay: 1000,
        cacheEnabled: true,
        cacheExpiry: 3600000 // 1小时
      }
    };

    this.validationRules = {
      scraping: {
        timeout: (v) => v >= 1000 && v <= 120000,
        retries: (v) => v >= 0 && v <= 10,
        retryDelay: (v) => v >= 100 && v <= 30000,
        concurrentRequests: (v) => v >= 1 && v <= 50,
        requestDelay: (v) => v >= 0 && v <= 30000
      },
      proxy: {
        enabled: (v) => typeof v === 'boolean',
        rotationEnabled: (v) => typeof v === 'boolean',
        maxFailures: (v) => v >= 1 && v <= 10,
        timeout: (v) => v >= 1000 && v <= 60000
      },
      antiBot: {
        enabled: (v) => typeof v === 'boolean',
        detectionEnabled: (v) => typeof v === 'boolean',
        autoBypassEnabled: (v) => typeof v === 'boolean',
        maxRetries: (v) => v >= 1 && v <= 20,
        bypassDelay: (v) => v >= 1000 && v <= 60000
      },
      rateLimit: {
        enabled: (v) => typeof v === 'boolean',
        maxRequests: (v) => v >= 1 && v <= 1000,
        timeWindow: (v) => v >= 1000 && v <= 3600000,
        backoffMultiplier: (v) => v >= 1 && v <= 10
      }
    };
  }

  get(path) {
    return this.getNestedValue(this.config, path);
  }

  set(path, value) {
    if (!this.validateValue(path, value)) {
      throw new Error(`Invalid value for ${path}: ${value}`);
    }
    this.setNestedValue(this.config, path, value);
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  validateValue(path, value) {
    const rules = this.getValidationRules(path);
    if (rules) {
      return rules(value);
    }
    return true;
  }

  getValidationRules(path) {
    const [category, key] = path.split('.');
    return this.validationRules[category]?.[key];
  }

  getAll() {
    return JSON.parse(JSON.stringify(this.config));
  }

  merge(newConfig) {
    this.config = this.deepMerge(this.config, newConfig);
  }

  deepMerge(target, source) {
    const result = { ...target };
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  reset() {
    this.config = this.getDefaultConfig();
  }

  getDefaultConfig() {
    return {
      scraping: {
        timeout: 30000,
        retries: 3,
        retryDelay: 1000,
        concurrentRequests: 5,
        requestDelay: 1000,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive'
        }
      },
      proxy: {
        enabled: false,
        rotationEnabled: true,
        maxFailures: 3,
        timeout: 10000,
        proxies: []
      },
      antiBot: {
        enabled: true,
        detectionEnabled: true,
        autoBypassEnabled: false,
        maxRetries: 5,
        bypassDelay: 5000
      },
      rateLimit: {
        enabled: true,
        maxRequests: 100,
        timeWindow: 60000,
        backoffMultiplier: 2
      },
      logging: {
        level: 'info',
        enabled: true,
        file: 'scraper.log',
        maxSize: '10m',
        maxFiles: 5
      },
      storage: {
        maxRetries: 3,
        retryDelay: 1000,
        cacheEnabled: true,
        cacheExpiry: 3600000
      }
    };
  }
}

describe('ConfigManager Tests', () => {
  let configManager;

  beforeEach(() => {
    configManager = new ConfigManager();
  });

  test('should get configuration values', () => {
    expect(configManager.get('scraping.timeout')).toBe(30000);
    expect(configManager.get('scraping.retries')).toBe(3);
    expect(configManager.get('proxy.enabled')).toBe(false);
  });

  test('should set valid configuration values', () => {
    configManager.set('scraping.timeout', 60000);
    expect(configManager.get('scraping.timeout')).toBe(60000);

    configManager.set('proxy.enabled', true);
    expect(configManager.get('proxy.enabled')).toBe(true);
  });

  test('should throw error for invalid values', () => {
    expect(() => {
      configManager.set('scraping.timeout', 500); // 太小
    }).toThrow();

    expect(() => {
      configManager.set('scraping.retries', 15); // 太大
    }).toThrow();
  });

  test('should get all configuration', () => {
    const allConfig = configManager.getAll();
    expect(allConfig).toHaveProperty('scraping');
    expect(allConfig).toHaveProperty('proxy');
    expect(allConfig).toHaveProperty('antiBot');
  });

  test('should merge configuration', () => {
    const newConfig = {
      scraping: {
        timeout: 45000,
        retries: 5
      },
      proxy: {
        enabled: true
      }
    };

    configManager.merge(newConfig);

    expect(configManager.get('scraping.timeout')).toBe(45000);
    expect(configManager.get('scraping.retries')).toBe(5);
    expect(configManager.get('proxy.enabled')).toBe(true);
    // 其他未修改的值应该保持不变
    expect(configManager.get('scraping.concurrentRequests')).toBe(5);
  });

  test('should reset to default configuration', () => {
    configManager.set('scraping.timeout', 60000);
    configManager.set('proxy.enabled', true);

    configManager.reset();

    expect(configManager.get('scraping.timeout')).toBe(30000);
    expect(configManager.get('proxy.enabled')).toBe(false);
  });

  test('should handle nested object access', () => {
    const headers = configManager.get('scraping.headers');
    expect(headers).toHaveProperty('Accept');
    expect(headers).toHaveProperty('Accept-Language');

    configManager.set('scraping.headers.User-Agent', 'Custom Agent');
    expect(configManager.get('scraping.headers.User-Agent')).toBe('Custom Agent');
  });

  test('should validate different configuration categories', () => {
    // 测试反爬虫配置
    expect(() => {
      configManager.set('antiBot.maxRetries', 25); // 太大
    }).toThrow();

    // 测试速率限制配置
    expect(() => {
      configManager.set('rateLimit.maxRequests', 2000); // 太大
    }).toThrow();

    // 测试代理配置
    expect(() => {
      configManager.set('proxy.timeout', 500); // 太小
    }).toThrow();
  });
});