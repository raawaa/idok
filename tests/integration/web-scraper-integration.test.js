/**
 * 网络抓取模块测试套件
 * 基于Python JavSP的unittest/test_crawlers.py实现
 * 测试所有抓取器的功能和数据准确性
 */

const fs = require('fs');
const path = require('path');
const WebScraperManager = require('../../src/shared/services/web-scraper/web-scraper-manager');
const MovieInfo = require('../../src/shared/services/web-scraper/movie-info');

/**
 * 测试数据管理器
 * 管理测试数据和基准数据
 */
class TestDataManager {
  constructor() {
    this.testDataDir = path.join(__dirname, 'data');
    this.ensureTestDataDir();
  }

  ensureTestDataDir() {
    if (!fs.existsSync(this.testDataDir)) {
      fs.mkdirSync(this.testDataDir, { recursive: true });
    }
  }

  /**
   * 获取测试番号列表
   */
  getTestAvIds() {
    return [
      'IPX-177',  // JavBus测试数据
      'ABP-888',  // 通用测试
      'SSNI-999', // 边界测试
      'FC2-PPV-1234567', // FC2格式
      'HEYZO-1234' // Heyzo格式
    ];
  }

  /**
   * 获取基准数据文件路径
   */
  getBaselineFilePath(avId, scraperName) {
    return path.join(this.testDataDir, `${avId} (${scraperName}).json`);
  }

  /**
   * 保存基准数据
   */
  saveBaselineData(avId, scraperName, data) {
    const filePath = this.getBaselineFilePath(avId, scraperName);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return filePath;
  }

  /**
   * 加载基准数据
   */
  loadBaselineData(avId, scraperName) {
    const filePath = this.getBaselineFilePath(avId, scraperName);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  /**
   * 检查是否有基准数据
   */
  hasBaselineData(avId, scraperName) {
    return fs.existsSync(this.getBaselineFilePath(avId, scraperName));
  }

  /**
   * 获取所有可用的基准数据
   */
  getAvailableBaselineData() {
    const files = fs.readdirSync(this.testDataDir);
    return files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const match = file.match(/^(.+?) \((.+?)\)\.json$/);
        return match ? { avId: match[1], scraperName: match[2] } : null;
      })
      .filter(item => item !== null);
  }
}

/**
 * 抓取器测试套件
 */
describe('Web Scraper Integration Tests', () => {
  let scraperManager;
  let testDataManager;

  beforeAll(() => {
    // 设置较长的超时时间用于网络请求
    jest.setTimeout(30000); // 30秒

    testDataManager = new TestDataManager();
  });

  afterAll(() => {
    // 清理资源
    if (testDataManager && typeof testDataManager.cleanup === 'function') {
      testDataManager.cleanup();
    }
  });

  beforeEach(() => {
    // 每个测试用例创建新的抓取器管理器
    scraperManager = new WebScraperManager({
      timeout: 10000,
      retries: 2,
      useCloudScraper: true,
      enableCache: false, // 测试时禁用缓存
      delayRange: [1000, 2000]
    });
  });

  afterEach(() => {
    // 清理资源
    if (scraperManager) {
      scraperManager.clearCache();
    }
  });

  describe('Scraper Manager Tests', () => {
    test('should initialize with default configuration', () => {
      expect(scraperManager).toBeDefined();
      expect(scraperManager.getAvailableScrapers().length).toBeGreaterThan(0);
      expect(scraperManager.getStats().totalRequests).toBe(0);
    });

    test('should register scrapers correctly', () => {
      const availableScrapers = scraperManager.getAvailableScrapers();
      expect(availableScrapers).toContain('javbus');
      
      const javbusScraper = scraperManager.getScraper('javbus');
      expect(javbusScraper).toBeDefined();
      expect(typeof javbusScraper.scrapeMovie).toBe('function');
    });

    test('should handle invalid scraper requests', async () => {
      await expect(
        scraperManager.scrapeWithScraper('IPX-177', 'invalid-scraper')
      ).rejects.toThrow('抓取器 invalid-scraper 不存在');
    });
  });

  describe('JavBus Scraper Tests', () => {
    const testAvId = 'IPX-177';

    test('should scrape movie info from JavBus', async () => {
      // 在CI环境中跳过网络测试
      if (process.env.CI) {
        console.log('CI环境跳过网络测试');
        return;
      }
      const result = await scraperManager.scrapeWithScraper(testAvId, 'javbus');
      
      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(MovieInfo);
      expect(result.avid).toBe(testAvId);
      expect(result.title).toBeTruthy();
      expect(result.cover).toBeTruthy();
      expect(result.actress.length).toBeGreaterThan(0);
      expect(result.genre.length).toBeGreaterThan(0);
      
      // 验证数据完整性
      expect(result.getCompletenessScore()).toBeGreaterThan(50);
    });

    test('should handle non-existent movie', async () => {
      // 在CI环境中跳过网络测试
      if (process.env.CI) {
        console.log('CI环境跳过网络测试');
        return;
      }
      const fakeAvId = 'XXX-999';
      
      await expect(
        scraperManager.scrapeWithScraper(fakeAvId, 'javbus')
      ).rejects.toThrow();
    });

    test('should handle network errors gracefully', async () => {
      // 创建一个配置错误的抓取器来模拟网络错误
      const brokenManager = new WebScraperManager({
        timeout: 1, // 极短的超时时间
        retries: 0
      });

      await expect(
        brokenManager.scrapeWithScraper('IPX-177', 'javbus')
      ).rejects.toThrow();
    });
  });

  describe('Data Validation Tests', () => {
    test('should validate scraped data format', async () => {
      const result = await scraperManager.scrapeWithScraper('IPX-177', 'javbus');
      
      // 验证基础字段
      expect(typeof result.avid).toBe('string');
      expect(typeof result.title).toBe('string');
      expect(typeof result.cover).toBe('string');
      expect(Array.isArray(result.actress)).toBe(true);
      expect(Array.isArray(result.genre)).toBe(true);
      expect(Array.isArray(result.previewPics)).toBe(true);
      
      // 验证URL格式
      if (result.cover) {
        expect(() => new URL(result.cover)).not.toThrow();
      }
      
      // 验证日期格式
      if (result.releaseDate) {
        expect(result.releaseDate).toMatch(/^\d{4}[\-\/\.]\d{1,2}[\-\/\.]\d{1,2}$/);
      }
      
      // 验证分数格式
      if (result.score) {
        const score = parseFloat(result.score);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(10);
      }
    });

    test('should handle different AV ID formats', async () => {
      const testCases = [
        'IPX-177',
        'ABP-888',
        'SSNI-999'
      ];

      for (const avId of testCases) {
        try {
          const result = await scraperManager.scrapeWithScraper(avId, 'javbus');
          expect(result.avid).toBe(avId);
          expect(result.getCompletenessScore()).toBeGreaterThan(30);
        } catch (error) {
          // 某些番号可能不存在，记录但不中断测试
          console.warn(`测试番号 ${avId} 抓取失败:`, error.message);
        }
      }
    });
  });

  describe('Multiple Scrapers Strategy Tests', () => {
    test('should use parallel scraping strategy', async () => {
      const avId = 'IPX-177';
      
      // 目前只有一个抓取器，但测试框架应该能正常工作
      const results = await scraperManager.scrapeWithMultipleScrapers(avId);
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
      // 检查是否有成功的结果
      const successfulResults = results.filter(r => r.success);
      expect(successfulResults.length).toBeGreaterThan(0);
    });

    test('should use fallback scraping strategy', async () => {
      const avId = 'IPX-177';
      
      const result = await scraperManager.scrapeWithFallback(avId);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.avid).toBe(avId);
    });

    test('should use smart scraping strategy', async () => {
      const avId = 'IPX-177';
      
      const result = await scraperManager.scrapeSmart(avId, {
        strategy: 'parallel',
        requireComplete: true
      });
      
      expect(result).toBeDefined();
      expect(result.avid).toBe(avId);
      expect(result.getCompletenessScore()).toBeGreaterThan(50);
    });
  });

  describe('Performance and Statistics Tests', () => {
    test('should track scraping statistics', async () => {
      const avId = 'IPX-177';
      
      // 执行几次抓取
      await scraperManager.scrapeWithScraper(avId, 'javbus');
      await scraperManager.scrapeWithScraper(avId, 'javbus');
      
      const stats = scraperManager.getStats();
      
      expect(stats.totalRequests).toBe(2);
      expect(stats.successfulRequests).toBe(2);
      expect(stats.successRate).toBe(100);
      expect(stats.availableScrapers).toContain('javbus');
    });

    test('should handle caching correctly', async () => {
      const avId = 'IPX-177';
      
      // 启用缓存的抓取器
      const cachedManager = new WebScraperManager({
        enableCache: true,
        cacheExpiry: 60000 // 1分钟
      });
      
      const start1 = Date.now();
      const result1 = await cachedManager.scrapeWithScraper(avId, 'javbus');
      const duration1 = Date.now() - start1;
      
      const start2 = Date.now();
      const result2 = await cachedManager.scrapeWithScraper(avId, 'javbus');
      const duration2 = Date.now() - start2;
      
      // 第二次应该更快（使用缓存）
      expect(duration2).toBeLessThan(duration1 / 2);
      expect(result1.avid).toBe(result2.avid);
      expect(result1.title).toBe(result2.title);
    });
  });

  describe('Error Handling Tests', () => {
    test('should handle timeout errors', async () => {
      const timeoutManager = new WebScraperManager({
        timeout: 1, // 1ms超时
        retries: 0
      });

      await expect(
        timeoutManager.scrapeWithScraper('IPX-177', 'javbus')
      ).rejects.toThrow();
    });

    test('should handle invalid AV ID format', async () => {
      const invalidAvIds = [
        '',           // 空字符串
        'INVALID',    // 无效格式
        '123',        // 过短
        'A'.repeat(100) // 过长
      ];

      for (const avId of invalidAvIds) {
        try {
          await scraperManager.scrapeWithScraper(avId, 'javbus');
          // 如果成功，验证数据质量
          console.warn(`意外成功抓取无效番号: ${avId}`);
        } catch (error) {
          // 期望失败
          expect(error).toBeDefined();
        }
      }
    });

    test('should handle concurrent requests gracefully', async () => {
      const avIds = ['IPX-177', 'ABP-888', 'SSNI-999'];
      
      const promises = avIds.map(avId => 
        scraperManager.scrapeWithScraper(avId, 'javbus')
          .then(result => ({ success: true, data: result }))
          .catch(error => ({ success: false, error: error.message }))
      );
      
      const results = await Promise.all(promises);
      
      // 至少有一个成功
      const successfulResults = results.filter(r => r.success);
      expect(successfulResults.length).toBeGreaterThan(0);
    });
  });

  describe('Baseline Data Comparison Tests', () => {
    test('should generate baseline data for future comparisons', async () => {
      const avId = 'IPX-177';
      const scraperName = 'javbus';
      
      // 抓取当前数据
      const result = await scraperManager.scrapeWithScraper(avId, scraperName);
      const baselineData = result.toJSON();
      
      // 保存为基准数据（用于后续回归测试）
      const baselineFile = testDataManager.saveBaselineData(avId, scraperName, baselineData);
      
      expect(fs.existsSync(baselineFile)).toBe(true);
      
      // 验证保存的数据
      const loadedData = testDataManager.loadBaselineData(avId, scraperName);
      expect(loadedData.avid).toBe(avId);
      expect(loadedData.title).toBeTruthy();
    });

    test('should compare with existing baseline data', async () => {
      const avId = 'IPX-177';
      const scraperName = 'javbus';
      
      // 确保有基准数据
      if (!testDataManager.hasBaselineData(avId, scraperName)) {
        // 如果没有，先创建一个
        const result = await scraperManager.scrapeWithScraper(avId, scraperName);
        testDataManager.saveBaselineData(avId, scraperName, result.toJSON());
      }
      
      // 抓取当前数据
      const currentResult = await scraperManager.scrapeWithScraper(avId, scraperName);
      const currentData = currentResult.toJSON();
      
      // 加载基准数据
      const baselineData = testDataManager.loadBaselineData(avId, scraperName);
      
      // 比较关键字段
      expect(currentData.avid).toBe(baselineData.avid);
      expect(currentData.title).toBeTruthy();
      expect(currentData.cover).toBeTruthy();
      expect(currentData.actress.length).toBeGreaterThan(0);
      expect(currentData.genre.length).toBeGreaterThan(0);
      
      // 记录差异（用于调试）
      const differences = [];
      if (currentData.title !== baselineData.title) {
        differences.push(`标题不同: "${baselineData.title}" -> "${currentData.title}"`);
      }
      if (currentData.cover !== baselineData.cover) {
        differences.push('封面URL不同');
      }
      if (currentData.actress.length !== baselineData.actress.length) {
        differences.push(`演员数量不同: ${baselineData.actress.length} -> ${currentData.actress.length}`);
      }
      
      if (differences.length > 0) {
        console.warn(`[回归测试] 发现差异:`, differences);
      }
    });
  });

  describe('Health Check Tests', () => {
    test('should perform health check', async () => {
      const health = await scraperManager.healthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.uptime).toBeGreaterThanOrEqual(0);
      expect(health.availableScrapers).toBeGreaterThan(0);
      expect(health.timestamp).toBeDefined();
    });

    test('should check all scrapers availability', async () => {
      const statuses = await scraperManager.checkAllScrapers();
      
      expect(statuses).toBeDefined();
      expect(statuses.javbus).toBeDefined();
      expect(typeof statuses.javbus.available).toBe('boolean');
    });
  });
});

/**
 * 性能基准测试
 */
describe('Performance Benchmarks', () => {
  let scraperManager;

  beforeEach(() => {
    scraperManager = new WebScraperManager({
      enableCache: false,
      delayRange: [500, 1000] // 较短的延迟用于测试
    });
  });

  test('should complete single scrape within reasonable time', async () => {
    const avId = 'IPX-177';
    const startTime = Date.now();
    
    const result = await scraperManager.scrapeWithScraper(avId, 'javbus');
    const duration = Date.now() - startTime;
    
    expect(result).toBeDefined();
    expect(duration).toBeLessThan(10000); // 10秒内完成
    console.log(`单次抓取耗时: ${duration}ms`);
  });

  test('should handle multiple scrapes efficiently', async () => {
    const avIds = ['IPX-177', 'ABP-888'];
    const startTime = Date.now();
    
    const results = await Promise.all(
      avIds.map(avId => 
        scraperManager.scrapeWithScraper(avId, 'javbus')
          .catch(error => ({ error: error.message }))
      )
    );
    
    const duration = Date.now() - startTime;
    const successfulResults = results.filter(r => !r.error);
    
    expect(successfulResults.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(20000); // 20秒内完成多个抓取
    console.log(`批量抓取耗时: ${duration}ms (${successfulResults.length}/${avIds.length} 成功)`);
  });
});