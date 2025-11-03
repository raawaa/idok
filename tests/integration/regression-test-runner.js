/**
 * JavSP风格的回归测试框架
 * 参考JavSP的test_crawler.py，实现数据驱动的回归测试
 */

const { TestDataManager } = require('./utils/test-data-manager');
const { DataComparator } = require('./utils/data-comparator');
const { TestReporter } = require('./utils/test-reporter');
const WebScraperManager = require('../../src/shared/services/web-scraper/web-scraper-manager');

class RegressionTestRunner {
  constructor(options = {}) {
    // 初始化核心组件
    this.dataManager = new TestDataManager(options.dataManager);
    this.comparator = new DataComparator(options.comparator);
    this.reporter = new TestReporter(options.reporter);

    // 测试配置
    this.config = {
      parallel: options.parallel !== false,
      maxConcurrency: options.maxConcurrency || 3,
      timeout: options.timeout || 30000,
      retryFailed: options.retryFailed !== false,
      maxRetries: options.maxRetries || 2,
      skipOnError: options.skipOnError !== false,
      verbose: options.verbose || false
    };

    // 爬虫管理器
    this.scraperManager = new WebScraperManager();

    // 统计信息
    this.stats = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      errorTests: 0,
      startTime: null,
      endTime: null
    };
  }

  /**
   * 运行完整的回归测试套件
   */
  async runRegressionTests(options = {}) {
    console.log('🚀 开始JavSP风格回归测试');
    console.log('=' .repeat(60));

    this.stats.startTime = new Date();
    this.reporter.startTest();

    try {
      // 1. 扫描测试数据
      const testData = await this.scanTestData();
      if (testData.length === 0) {
        console.log('⚠️ 未找到测试数据，跳过回归测试');
        return this.generateEmptyResult();
      }

      console.log(`📊 找到 ${testData.length} 个测试用例`);

      // 2. 准备测试套件
      await this.prepareTestSuite(testData);

      // 3. 执行测试
      const results = await this.executeTests(testData, options);

      // 4. 生成报告
      const report = await this.generateReport(results);

      this.stats.endTime = new Date();

      return {
        success: this.stats.failedTests === 0 && this.stats.errorTests === 0,
        stats: this.stats,
        results,
        report
      };

    } catch (error) {
      console.error('❌ 回归测试执行失败:', error.message);
      throw error;
    }
  }

  /**
   * 扫描测试数据
   */
  async scanTestData() {
    try {
      const testData = await this.dataManager.scanBaselineData();

      if (this.config.verbose) {
        console.log('📂 测试数据统计:');
        const statsByScraper = {};
        testData.forEach(item => {
          statsByScraper[item.scraper] = (statsByScraper[item.scraper] || 0) + 1;
        });
        Object.entries(statsByScraper).forEach(([scraper, count]) => {
          console.log(`   ${scraper}: ${count} 个测试用例`);
        });
      }

      return testData;
    } catch (error) {
      console.error('扫描测试数据失败:', error.message);
      throw error;
    }
  }

  /**
   * 准备测试套件
   */
  async prepareTestSuite(testData) {
    const suiteInfo = {
      totalTests: testData.length,
      scrapers: [...new Set(testData.map(item => item.scraper))],
      description: 'JavSP风格爬虫回归测试',
      environment: this.dataManager.environment
    };

    this.reporter.startSuite('爬虫回归测试', suiteInfo);
  }

  /**
   * 执行测试
   */
  async executeTests(testData, options = {}) {
    const results = [];
    const { filterScraper, filterAvid } = options;

    // 过滤测试数据
    let filteredData = testData;
    if (filterScraper) {
      filteredData = filteredData.filter(item => item.scraper === filterScraper);
    }
    if (filterAvid) {
      filteredData = filteredData.filter(item => item.avid === filterAvid);
    }

    console.log(`🔄 执行 ${filteredData.length} 个测试用例`);

    if (this.config.parallel) {
      // 并行执行
      const chunks = this.chunkArray(filteredData, this.config.maxConcurrency);
      for (const chunk of chunks) {
        const chunkResults = await Promise.allSettled(
          chunk.map(testCase => this.executeSingleTest(testCase))
        );
        results.push(...chunkResults);
      }
    } else {
      // 串行执行
      for (const testCase of filteredData) {
        const result = await this.executeSingleTest(testCase);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * 执行单个测试
   */
  async executeSingleTest(testCase) {
    const startTime = Date.now();
    const testResult = {
      testName: this.dataManager.generateTestCaseName(testCase.avid, testCase.scraper),
      avid: testCase.avid,
      scraper: testCase.scraper,
      status: 'running',
      startTime: new Date()
    };

    try {
      console.log(`🔍 测试 ${testCase.avid} (${testCase.scraper})`);

      // 1. 加载基准数据
      const baselineData = await this.dataManager.loadBaselineData(testCase.avid, testCase.scraper);
      if (!baselineData) {
        throw new Error(`基准数据不存在: ${testCase.avid} (${testCase.scraper})`);
      }

      // 2. 执行爬虫获取当前数据
      const currentData = await this.fetchCurrentData(testCase.avid, testCase.scraper);

      // 3. 保存当前数据（用于后续分析）
      await this.dataManager.saveCurrentData(testCase.avid, testCase.scraper, currentData);

      // 4. 比较数据
      const comparisonResult = this.comparator.compare(baselineData, currentData, testCase.scraper);

      // 5. 判断测试结果
      testResult.status = comparisonResult.isMatch ? 'passed' : 'failed';
      testResult.comparisonResult = comparisonResult;
      testResult.baselineData = baselineData;
      testResult.currentData = currentData;

      // 6. 更新统计
      if (comparisonResult.isMatch) {
        this.stats.passedTests++;
        console.log(`✅ ${testCase.avid} (${testCase.scraper}) - 通过 (${comparisonResult.summary.matchRate}%)`);
      } else {
        this.stats.failedTests++;
        console.log(`❌ ${testCase.avid} (${testCase.scraper}) - 失败 (${comparisonResult.summary.matchRate}%)`);

        if (this.config.verbose) {
          this.logTestFailure(testCase, comparisonResult);
        }
      }

    } catch (error) {
      testResult.status = 'error';
      testResult.error = error;
      this.stats.errorTests++;

      console.error(`💥 ${testCase.avid} (${testCase.scraper}) - 错误: ${error.message}`);

      // 重试机制
      if (this.config.retryFailed && testResult.retryCount < this.config.maxRetries) {
        testResult.retryCount = (testResult.retryCount || 0) + 1;
        console.log(`🔄 重试 ${testCase.avid} (${testCase.scraper}) - 第 ${testResult.retryCount} 次`);

        // 等待一段时间后重试
        await this.sleep(1000 * testResult.retryCount);
        return this.executeSingleTest(testCase);
      }
    } finally {
      testResult.duration = Date.now() - startTime;
      this.reporter.recordResult(testResult);
    }

    return testResult;
  }

  /**
   * 获取当前数据
   */
  async fetchCurrentData(avid, scraperName) {
    try {
      // 确保爬虫管理器已初始化
      await this.scraperManager.initialize();

      // 执行爬取
      console.log(`   使用 ${scraperName} 爬虫获取数据...`);
      const data = await this.scraperManager.scrapeWithScraper(avid, scraperName);

      if (!data) {
        throw new Error(`爬虫未返回数据: ${avid}`);
      }

      console.log(`   获取到数据: ${Object.keys(data).length} 个字段`);
      return data;

    } catch (error) {
      throw new Error(`获取当前数据失败: ${error.message}`);
    }
  }

  /**
   * 记录测试失败详情
   */
  logTestFailure(testCase, comparisonResult) {
    console.log(`   📋 失败详情:`);
    console.log(`      匹配字段: ${comparisonResult.summary.matchedFields}/${comparisonResult.summary.totalFields}`);
    console.log(`      差异字段: ${comparisonResult.summary.differentFields}`);

    if (comparisonResult.differences.length > 0) {
      console.log(`   🔍 主要差异:`);
      comparisonResult.differences.slice(0, 5).forEach(diff => {
        const severity = this.comparator.getSeverityLevel(diff.type);
        const icon = severity === 'critical' ? '🚨' : severity === 'error' ? '❌' : severity === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`      ${icon} ${diff.field}: ${diff.difference || '值不匹配'}`);
      });

      if (comparisonResult.differences.length > 5) {
        console.log(`      ... 还有 ${comparisonResult.differences.length - 5} 个差异`);
      }
    }
  }

  /**
   * 生成测试报告
   */
  async generateReport(results) {
    console.log('\n📝 生成测试报告...');

    // 结束测试套件
    this.reporter.endSuite();

    // 生成报告
    const report = await this.reporter.generateReport();

    // 清理旧报告
    await this.reporter.cleanupOldReports();

    return report;
  }

  /**
   * 生成空结果
   */
  generateEmptyResult() {
    return {
      success: true,
      stats: {
        ...this.stats,
        endTime: new Date()
      },
      results: [],
      report: {
        summary: {
          totalTests: 0,
          passed: 0,
          failed: 0,
          errors: 0,
          skipped: 0,
          successRate: 100,
          failureRate: 0,
          duration: 0,
          status: 'passed',
          recommendations: []
        }
      }
    };
  }

  /**
   * 运行单个AVID的测试
   */
  async testSingleAvid(avid, scraperName = null) {
    console.log(`🎯 单独测试: ${avid}${scraperName ? ` (${scraperName})` : ''}`);

    // 获取测试数据
    const testData = await this.dataManager.scanBaselineData();
    let filteredData = testData.filter(item => item.avid === avid);

    if (scraperName) {
      filteredData = filteredData.filter(item => item.scraper === scraperName);
    }

    if (filteredData.length === 0) {
      console.log(`❌ 未找到测试数据: ${avid}${scraperName ? ` (${scraperName})` : ''}`);
      return null;
    }

    // 执行测试
    const options = { filterAvid: avid, filterScraper: scraperName };
    return this.runRegressionTests(options);
  }

  /**
   * 运行单个爬虫的测试
   */
  async testSingleScraper(scraperName) {
    console.log(`🎯 单独测试爬虫: ${scraperName}`);

    const options = { filterScraper: scraperName };
    return this.runRegressionTests(options);
  }

  /**
   * 更新基准数据
   */
  async updateBaselineData(avid, scraperName, force = false) {
    console.log(`🔄 更新基准数据: ${avid} (${scraperName})`);

    try {
      // 获取当前数据
      const currentData = await this.fetchCurrentData(avid, scraperName);

      // 验证数据质量
      const validation = this.dataManager.validateDataFormat(currentData);
      if (!validation.isValid) {
        console.error('❌ 数据格式验证失败:', validation.errors);
        if (!force) {
          throw new Error('数据质量不合格，更新失败');
        }
      }

      // 更新基准数据
      const success = await this.dataManager.updateBaselineData(avid, scraperName, currentData);

      if (success) {
        console.log(`✅ 基准数据更新成功: ${avid} (${scraperName})`);
      } else {
        console.log(`⚠️ 基准数据更新失败: ${avid} (${scraperName})`);
      }

      return success;
    } catch (error) {
      console.error(`❌ 更新基准数据失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取统计信息
   */
  async getStats() {
    const dataStats = await this.dataManager.getStats();

    return {
      testStats: this.stats,
      dataStats,
      config: this.config,
      supportedScrapers: this.dataManager.supportedScrapers,
      environment: this.dataManager.environment
    };
  }

  /**
   * 数组分块
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 睡眠函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 清理资源
   */
  async cleanup() {
    try {
      if (this.scraperManager) {
        await this.scraperManager.cleanup();
      }
    } catch (error) {
      console.error('清理资源失败:', error.message);
    }
  }
}

module.exports = {
  RegressionTestRunner
};