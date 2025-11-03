const BaseScraper = require('./base-scraper');
const MovieInfo = require('./movie-info');

/**
 * 网络抓取管理器
 * 统一管理多个网站的抓取器，提供统一的抓取接口
 * 参考Python JavSP的架构设计
 */
class WebScraperManager {
  constructor(options = {}) {
    // 全局配置
    this.globalOptions = {
      timeout: options.timeout || 30000,
      retries: options.retries || 3,
      proxy: options.proxy || null,
      useCloudScraper: options.useCloudScraper !== false,
      enableCache: options.enableCache !== false,
      cacheExpiry: options.cacheExpiry || 3600000,
      delayRange: options.delayRange || [1000, 3000],
      useSystemProxy: options.useSystemProxy !== false, // 默认启用系统代理
      ...options
    };

    // 注册可用的抓取器
    this.scrapers = new Map();
    this.registerScrapers();

    // 抓取统计
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      startTime: Date.now()
    };

    // 结果缓存
    this.resultCache = new Map();
    this.cacheExpiry = this.globalOptions.cacheExpiry;
  }

  /**
   * 初始化管理器
   */
  async initialize() {
    try {
      // 确保所有抓取器都已正确初始化
      for (const [name, scraper] of this.scrapers) {
        if (typeof scraper.initialize === 'function') {
          await scraper.initialize();
        }
      }

      console.log(`[WebScraperManager] 初始化完成，已注册 ${this.scrapers.size} 个抓取器`);
    } catch (error) {
      console.error('[WebScraperManager] 初始化失败:', error.message);
      throw error;
    }
  }

  /**
   * 注册所有可用的抓取器
   */
  registerScrapers() {
    try {
      // JavBus抓取器
      const JavBusScraper = require('./javbus-scraper');
      this.registerScraper('javbus', new JavBusScraper(this.globalOptions));
    } catch (error) {
      console.warn(`[WebScraperManager] 注册JavBus抓取器失败:`, error.message);
    }

    // 可以在这里添加更多抓取器
    // try {
    //   const JavDBScraper = require('./javdb-scraper');
    //   this.registerScraper('javdb', new JavDBScraper(this.globalOptions));
    // } catch (error) {
    //   console.warn(`[WebScraperManager] 注册JavDB抓取器失败:`, error.message);
    // }
  }

  /**
   * 注册单个抓取器
   */
  registerScraper(name, scraper) {
    if (!scraper || typeof scraper.scrapeMovie !== 'function') {
      throw new Error(`抓取器 ${name} 必须实现 scrapeMovie 方法`);
    }

    this.scrapers.set(name, scraper);
    console.log(`[WebScraperManager] 已注册抓取器: ${name}`);
  }

  /**
   * 获取所有可用的抓取器名称
   */
  getAvailableScrapers() {
    return Array.from(this.scrapers.keys());
  }

  /**
   * 获取抓取器实例
   */
  getScraper(name) {
    return this.scrapers.get(name);
  }

  /**
   * 检查抓取器是否可用
   */
  isScraperAvailable(name) {
    return this.scrapers.has(name);
  }

  /**
   * 从缓存获取结果
   */
  getCachedResult(avId, scraperName) {
    const cacheKey = `${avId}:${scraperName}`;
    const cached = this.resultCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    
    return null;
  }

  /**
   * 缓存结果
   */
  cacheResult(avId, scraperName, data) {
    const cacheKey = `${avId}:${scraperName}`;
    this.resultCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 使用指定抓取器抓取影片信息
   */
  async scrapeWithScraper(avId, scraperName) {
    const scraper = this.getScraper(scraperName);
    if (!scraper) {
      throw new Error(`抓取器 ${scraperName} 不存在`);
    }

    // 检查缓存
    const cachedResult = this.getCachedResult(avId, scraperName);
    if (cachedResult) {
      console.log(`[WebScraperManager] 使用缓存结果: ${avId} (${scraperName})`);
      return cachedResult;
    }

    this.stats.totalRequests++;

    try {
      console.log(`[WebScraperManager] 开始抓取: ${avId} (${scraperName})`);
      const startTime = Date.now();
      
      const movieInfo = await scraper.scrapeMovie(avId);
      
      const duration = Date.now() - startTime;
      console.log(`[WebScraperManager] 抓取成功: ${avId} (${scraperName}) - ${duration}ms`);
      
      this.stats.successfulRequests++;
      
      // 缓存结果
      this.cacheResult(avId, scraperName, movieInfo);
      
      return movieInfo;
    } catch (error) {
      this.stats.failedRequests++;
      console.error(`[WebScraperManager] 抓取失败: ${avId} (${scraperName}):`, error.message);
      throw error;
    }
  }

  /**
   * 使用多个抓取器抓取影片信息（并行）
   */
  async scrapeWithMultipleScrapers(avId, scraperNames = null) {
    const targetScrapers = scraperNames || this.getAvailableScrapers();
    
    if (!Array.isArray(targetScrapers) || targetScrapers.length === 0) {
      throw new Error('必须指定至少一个抓取器');
    }

    console.log(`[WebScraperManager] 并行抓取: ${avId} (${targetScrapers.join(', ')})`);

    const promises = targetScrapers.map(scraperName =>
      this.scrapeWithScraper(avId, scraperName)
        .then(result => ({ scraperName, success: true, data: result }))
        .catch(error => ({ scraperName, success: false, error: error.message }))
    );

    const results = await Promise.allSettled(promises);
    
    return results.map(result => 
      result.status === 'fulfilled' ? result.value : {
        scraperName: result.reason?.scraperName || 'unknown',
        success: false,
        error: result.reason?.message || 'Unknown error'
      }
    );
  }

  /**
   * 使用多个抓取器抓取影片信息（串行，直到成功）
   */
  async scrapeWithFallback(avId, scraperNames = null) {
    const targetScrapers = scraperNames || this.getAvailableScrapers();
    
    if (!Array.isArray(targetScrapers) || targetScrapers.length === 0) {
      throw new Error('必须指定至少一个抓取器');
    }

    console.log(`[WebScraperManager] 串行抓取: ${avId} (${targetScrapers.join(' -> ')})`);

    const errors = [];
    
    for (const scraperName of targetScrapers) {
      try {
        const result = await this.scrapeWithScraper(avId, scraperName);
        console.log(`[WebScraperManager] 成功使用 ${scraperName} 抓取: ${avId}`);
        return {
          success: true,
          scraperName,
          data: result
        };
      } catch (error) {
        console.warn(`[WebScraperManager] ${scraperName} 抓取失败: ${avId} - ${error.message}`);
        errors.push({ scraperName, error: error.message });
        
        // 继续尝试下一个抓取器
        continue;
      }
    }

    // 所有抓取器都失败了
    return {
      success: false,
      errors
    };
  }

  /**
   * 融合多个抓取结果
   */
  mergeResults(results) {
    if (!Array.isArray(results) || results.length === 0) {
      return null;
    }

    // 只保留成功的结果
    const successfulResults = results
      .filter(result => result.success && result.data)
      .map(result => result.data);

    if (successfulResults.length === 0) {
      return null;
    }

    if (successfulResults.length === 1) {
      return successfulResults[0];
    }

    // 从第一个结果开始，依次合并其他结果
    let mergedResult = successfulResults[0];
    
    for (let i = 1; i < successfulResults.length; i++) {
      mergedResult = mergedResult.merge(successfulResults[i]);
    }

    return mergedResult;
  }

  /**
   * 智能抓取（自动选择最佳策略）
   */
  async scrapeSmart(avId, options = {}) {
    const {
      scrapers = null,
      strategy = 'parallel', // 'parallel', 'fallback', 'merge'
      timeout = 30000,
      requireComplete = false
    } = options;

    const targetScrapers = scrapers || this.getAvailableScrapers();

    try {
      let result;

      switch (strategy) {
        case 'parallel':
          const parallelResults = await this.scrapeWithMultipleScrapers(avId, targetScrapers);
          
          if (requireComplete) {
            // 如果需要完整数据，选择最完整的结果
            result = this.selectBestResult(parallelResults);
          } else {
            // 否则选择第一个成功的结果
            const firstSuccess = parallelResults.find(r => r.success);
            result = firstSuccess ? firstSuccess.data : null;
          }
          break;

        case 'fallback':
          const fallbackResult = await this.scrapeWithFallback(avId, targetScrapers);
          result = fallbackResult.success ? fallbackResult.data : null;
          break;

        case 'merge':
          const mergeResults = await this.scrapeWithMultipleScrapers(avId, targetScrapers);
          result = this.mergeResults(mergeResults);
          break;

        default:
          // 默认使用第一个可用的抓取器
          if (targetScrapers.length > 0) {
            result = await this.scrapeWithScraper(avId, targetScrapers[0]);
          }
      }

      if (!result) {
        throw new Error(`无法抓取番号 ${avId} 的信息`);
      }

      return result;
    } catch (error) {
      console.error(`[WebScraperManager] 智能抓取失败: ${avId}:`, error.message);
      throw error;
    }
  }

  /**
   * 选择最佳结果（基于数据完整性）
   */
  selectBestResult(results) {
    const successfulResults = results.filter(result => result.success && result.data);
    
    if (successfulResults.length === 0) {
      return null;
    }

    if (successfulResults.length === 1) {
      return successfulResults[0].data;
    }

    // 计算每个结果的完整性得分
    const scoredResults = successfulResults.map(result => {
      const data = result.data;
      let score = 0;

      // 基础信息得分
      if (data.title) score += 10;
      if (data.cover) score += 10;
      if (data.releaseDate) score += 5;
      if (data.runtime) score += 5;
      
      // 详细信息得分
      if (data.actress.length > 0) score += data.actress.length * 3;
      if (data.genre.length > 0) score += data.genre.length * 2;
      if (data.studio) score += 5;
      if (data.director) score += 3;
      if (data.score) score += 2;
      if (data.previewPics.length > 0) score += data.previewPics.length;

      return { ...result, score };
    });

    // 选择得分最高的结果
    const bestResult = scoredResults.reduce((best, current) => 
      current.score > best.score ? current : best
    );

    return bestResult.data;
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    const successRate = this.stats.totalRequests > 0 
      ? Math.round((this.stats.successfulRequests / this.stats.totalRequests) * 100)
      : 0;

    // 获取各个抓取器的统计
    const scraperStats = {};
    for (const [name, scraper] of this.scrapers) {
      scraperStats[name] = scraper.getStats();
    }

    return {
      uptime,
      totalRequests: this.stats.totalRequests,
      successfulRequests: this.stats.successfulRequests,
      failedRequests: this.stats.failedRequests,
      successRate,
      availableScrapers: this.getAvailableScrapers(),
      scraperStats,
      cacheSize: this.resultCache.size
    };
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.resultCache.clear();
    
    // 清理各个抓取器的缓存
    for (const scraper of this.scrapers.values()) {
      if (typeof scraper.clearCache === 'function') {
        scraper.clearCache();
      }
    }
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      startTime: Date.now()
    };

    // 重置各个抓取器的统计
    for (const scraper of this.scrapers.values()) {
      if (typeof scraper.resetStats === 'function') {
        scraper.resetStats();
      }
    }
  }

  /**
   * 检查所有抓取器状态
   */
  async checkAllScrapers() {
    const results = {};
    
    for (const [name, scraper] of this.scrapers) {
      try {
        const status = await scraper.checkSiteAvailability();
        results[name] = status;
      } catch (error) {
        results[name] = {
          available: false,
          error: error.message
        };
      }
    }

    return results;
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    const stats = this.getStats();
    const scraperStatuses = await this.checkAllScrapers();

    return {
      status: 'healthy',
      uptime: stats.uptime,
      successRate: stats.successRate,
      availableScrapers: stats.availableScrapers.length,
      totalRequests: stats.totalRequests,
      scraperStatuses,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 清理资源
   */
  async cleanup() {
    try {
      // 清理缓存
      this.clearCache();

      // 清理各个抓取器的资源
      for (const [name, scraper] of this.scrapers) {
        try {
          if (typeof scraper.cleanup === 'function') {
            await scraper.cleanup();
          } else if (typeof scraper.clearCache === 'function') {
            scraper.clearCache();
          }
        } catch (error) {
          console.warn(`[WebScraperManager] 清理抓取器 ${name} 时出错:`, error.message);
        }
      }

      // 清理缓存
      this.resultCache.clear();
      this.scrapers.clear();

      console.log('[WebScraperManager] 资源清理完成');
    } catch (error) {
      console.error('[WebScraperManager] 清理资源时出错:', error.message);
    }
  }
}

module.exports = WebScraperManager;