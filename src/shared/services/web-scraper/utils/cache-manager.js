/**
 * 缓存管理器
 * 独立的缓存功能模块
 */

const { config } = require('../config-manager');

class CacheManager {
  constructor(options = {}) {
    this.enableCache = options.enableCache !== false;
    this.cacheExpiry = options.cacheExpiry || config.get('cache.expiry', 3600000); // 1小时默认过期
    this.cache = new Map();
    this.stats = {
      cacheHits: 0,
      cacheMisses: 0,
      cacheSets: 0,
      cacheDeletes: 0
    };
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
    if (!this.enableCache) {
      this.stats.cacheMisses++;
      return null;
    }

    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      this.stats.cacheHits++;
      return cached.data;
    }

    this.stats.cacheMisses++;
    return null;
  }

  /**
   * 保存到缓存
   */
  saveToCache(cacheKey, data) {
    if (!this.enableCache) {
      return;
    }

    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    this.stats.cacheSets++;
  }

  /**
   * 删除缓存项
   */
  deleteFromCache(cacheKey) {
    const deleted = this.cache.delete(cacheKey);
    if (deleted) {
      this.stats.cacheDeletes++;
    }
    return deleted;
  }

  /**
   * 清理过期缓存
   */
  cleanExpiredCache() {
    const now = Date.now();
    const expiredKeys = [];

    this.cache.forEach((value, key) => {
      if (now - value.timestamp >= this.cacheExpiry) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => {
      this.cache.delete(key);
      this.stats.cacheDeletes++;
    });

    return expiredKeys.length;
  }

  /**
   * 清空所有缓存
   */
  clearCache() {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.cacheDeletes += size;
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats() {
    const totalRequests = this.stats.cacheHits + this.stats.cacheMisses;
    const hitRate = totalRequests > 0
      ? Math.round((this.stats.cacheHits / totalRequests) * 100)
      : 0;

    return {
      ...this.stats,
      cacheSize: this.cache.size,
      hitRate
    };
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      cacheHits: 0,
      cacheMisses: 0,
      cacheSets: 0,
      cacheDeletes: 0
    };
  }

  /**
   * 设置缓存过期时间
   */
  setCacheExpiry(expiry) {
    this.cacheExpiry = expiry;
  }

  /**
   * 启用/禁用缓存
   */
  setCacheEnabled(enabled) {
    this.enableCache = enabled;
    if (!enabled) {
      this.clearCache();
    }
  }

  /**
   * 检查缓存是否已满（简单的内存管理）
   */
  isCacheFull(maxSize = 1000) {
    return this.cache.size >= maxSize;
  }

  /**
   * LRU缓存清理（当缓存满时）
   */
  evictLRU(maxSize = 1000) {
    if (this.cache.size < maxSize) {
      return 0;
    }

    // 简单的LRU实现：按时间戳排序，删除最旧的项目
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    const toDelete = entries.slice(0, Math.floor(this.cache.size * 0.2)); // 删除20%最旧的项目
    let deletedCount = 0;

    toDelete.forEach(([key]) => {
      this.cache.delete(key);
      this.stats.cacheDeletes++;
      deletedCount++;
    });

    return deletedCount;
  }
}

module.exports = {
  CacheManager
};