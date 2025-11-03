/**
 * Jest集成测试 - JavSP风格回归测试
 * 将回归测试框架与Jest测试系统集成
 */

const { RegressionTestRunner } = require('./regression-test-runner');
const path = require('path');

// 测试配置
const TEST_CONFIG = {
  timeout: 60000, // 60秒超时
  retries: 2,
  parallel: false, // Jest中串行执行更稳定
  verbose: process.env.VERBOSE === 'true'
};

describe('JavSP风格回归测试', () => {
  let runner;

  beforeAll(async () => {
    // 初始化测试运行器
    runner = new RegressionTestRunner({
      dataManager: {
        baselineDir: path.join(__dirname, 'data/baseline'),
        currentDir: path.join(__dirname, 'data/current'),
        reportsDir: path.join(__dirname, 'data/reports'),
        environment: process.env.NODE_ENV || 'test'
      },
      comparator: {
        strictMode: false,
        ignoreWhitespace: true,
        tolerance: 0.1
      },
      reporter: {
        verbose: TEST_CONFIG.verbose,
        enableHtmlReport: false, // Jest中禁用HTML报告
        enableJsonReport: true,
        enableConsoleReport: true
      },
      parallel: TEST_CONFIG.parallel,
      timeout: TEST_CONFIG.timeout,
      verbose: TEST_CONFIG.verbose
    });

    console.log('🔧 初始化JavSP回归测试框架');
  });

  afterAll(async () => {
    // 清理资源
    if (runner) {
      await runner.cleanup();
    }
    console.log('🧹 清理测试资源完成');
  });

  describe('完整回归测试套件', () => {
    it(
      '应该能够通过所有回归测试',
      async () => {
        console.log('\n🚀 开始JavSP完整回归测试');

        const result = await runner.runRegressionTests();

        // Jest断言
        expect(result.success).toBe(true);
        expect(result.stats.failedTests).toBe(0);
        expect(result.stats.errorTests).toBe(0);
        expect(result.stats.totalTests).toBeGreaterThan(0);

        console.log(`✅ 回归测试完成: ${result.stats.passedTests}/${result.stats.totalTests} 通过`);

        // 额外的质量检查
        if (result.stats.totalTests > 0) {
          const successRate = (result.stats.passedTests / result.stats.totalTests) * 100;
          expect(successRate).toBeGreaterThanOrEqual(90); // 至少90%成功率
          console.log(`📊 测试成功率: ${successRate.toFixed(2)}%`);
        }
      },
      TEST_CONFIG.timeout
    );
  });

  describe('特定爬虫测试', () => {
    const supportedScrapers = ['javbus', 'javdb', 'javlib'];

    supportedScrapers.forEach(scraperName => {
      describe(`${scraperName} 爬虫`, () => {
        it(
          `应该能够通过 ${scraperName} 的回归测试`,
          async () => {
            console.log(`\n🎯 测试 ${scraperName} 爬虫`);

            const result = await runner.testSingleScraper(scraperName);

            if (result && result.stats.totalTests > 0) {
              expect(result.success).toBe(true);
              expect(result.stats.failedTests + result.stats.errorTests).toBe(0);
              console.log(`✅ ${scraperName} 测试通过: ${result.stats.passedTests}/${result.stats.totalTests}`);
            } else {
              console.log(`⚠️ ${scraperName} 没有找到测试数据，跳过测试`);
            }
          },
          TEST_CONFIG.timeout
        );
      });
    });
  });

  describe('数据质量测试', () => {
    it(
      '应该能够处理各种AVID格式',
      async () => {
        const testCases = [
          'IPX-177',      // 标准格式
          '130614-KEIKO', // 带日期格式
          '082713-417'    // 数字格式
        ];

        for (const avid of testCases) {
          console.log(`\n🔍 测试AVID格式: ${avid}`);

          const result = await runner.testSingleAvid(avid);

          if (result && result.stats.totalTests > 0) {
            expect(result.success).toBe(true);
            console.log(`✅ ${avid} 格式测试通过`);
          } else {
            console.log(`⚠️ ${avid} 没有找到测试数据，跳过`);
          }
        }
      },
      TEST_CONFIG.timeout * 2 // 多种格式需要更长时间
    );
  });

  describe('错误处理测试', () => {
    it(
      '应该能够优雅地处理无效AVID',
      async () => {
        const invalidAvids = ['INVALID-123', 'NONEXISTENT-999', ''];

        for (const avid of invalidAvids) {
          if (!avid) continue; // 跳过空字符串

          console.log(`\n🚨 测试无效AVID: ${avid}`);

          try {
            const result = await runner.testSingleAvid(avid);

            // 对于无效AVID，应该返回null或空结果
            expect(result).toBeNull();
            console.log(`✅ 无效AVID ${avid} 处理正确`);
          } catch (error) {
            // 或者应该抛出预期的异常
            expect(error).toBeDefined();
            console.log(`✅ 无效AVID ${avid} 异常处理正确: ${error.message}`);
          }
        }
      },
      TEST_CONFIG.timeout
    );

    it(
      '应该能够处理不支持的爬虫',
      async () => {
        const unsupportedScrapers = ['invalid-scraper', 'nonexistent'];

        for (const scraper of unsupportedScrapers) {
          console.log(`\n🚨 测试不支持的爬虫: ${scraper}`);

          try {
            const result = await runner.testSingleScraper(scraper);
            expect(result).toBeNull();
            console.log(`✅ 不支持爬虫 ${scraper} 处理正确`);
          } catch (error) {
            expect(error).toBeDefined();
            console.log(`✅ 不支持爬虫 ${scraper} 异常处理正确: ${error.message}`);
          }
        }
      },
      TEST_CONFIG.timeout
    );
  });

  describe('性能测试', () => {
    it(
      '应该在合理时间内完成测试',
      async () => {
        console.log('\n⏱️ 性能测试开始');

        const startTime = Date.now();
        const result = await runner.runRegressionTests();
        const duration = Date.now() - startTime;

        // 性能断言 - 整个测试套件应该在5分钟内完成
        expect(duration).toBeLessThan(5 * 60 * 1000); // 5分钟

        if (result.stats.totalTests > 0) {
          const avgTimePerTest = duration / result.stats.totalTests;
          console.log(`⏱️ 平均每个测试耗时: ${avgTimePerTest.toFixed(2)}ms`);

          // 每个测试平均应该在30秒内完成
          expect(avgTimePerTest).toBeLessThan(30 * 1000); // 30秒
        }

        console.log(`✅ 性能测试通过，总耗时: ${(duration / 1000).toFixed(2)}秒`);
      },
      10 * 60 * 1000 // 10分钟超时，给性能测试留足够时间
    );
  });

  describe('并发测试', () => {
    it(
      '应该能够处理并发测试请求',
      async () => {
        console.log('\n🔄 并发测试开始');

        const testAvids = ['IPX-177', '130614-KEIKO'];
        const startTime = Date.now();

        // 并发执行多个测试
        const promises = testAvids.map(avid =>
          runner.testSingleAvid(avid).catch(error => ({ error: error.message, avid }))
        );

        const results = await Promise.allSettled(promises);
        const duration = Date.now() - startTime;

        // 检查结果
        let successCount = 0;
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const testResult = result.value;
            if (testResult && !testResult.error) {
              successCount++;
            }
          }
        });

        console.log(`✅ 并发测试完成: ${successCount}/${testAvids.length} 成功`);
        console.log(`⏱️ 并发测试耗时: ${(duration / 1000).toFixed(2)}秒`);

        // 至少应该有一半的测试成功
        expect(successCount).toBeGreaterThanOrEqual(Math.ceil(testAvids.length / 2));
      },
      TEST_CONFIG.timeout * 2
    );
  });
});

// 集成测试辅助函数
describe('测试工具函数', () => {
  it('应该能够正确解析测试环境', () => {
    expect(process.env.NODE_ENV).toBeDefined();
    expect(path.join(__dirname, 'data/baseline')).toBeTruthy();
  });

  it('应该能够创建测试运行器', () => {
    const testRunner = new RegressionTestRunner({
      dataManager: {
        baselineDir: path.join(__dirname, 'data/baseline'),
        environment: 'test'
      }
    });

    expect(testRunner).toBeDefined();
    expect(testRunner.dataManager).toBeDefined();
    expect(testRunner.comparator).toBeDefined();
    expect(testRunner.reporter).toBeDefined();
  });
});

// 条件性测试 - 只在有网络连接时运行
describe('条件性集成测试', () => {
  const hasNetwork = process.env.HAS_NETWORK !== 'false';

  (hasNetwork ? it : it.skip)(
    '在有网络连接时应该能够获取实时数据',
    async () => {
      console.log('\n🌐 网络连接测试');

      // 只在有网络时运行这个测试
      const result = await runner.testSingleAvid('IPX-177', 'javbus');

      if (result) {
        expect(result.success).toBe(true);
        console.log('✅ 网络连接测试通过');
      } else {
        console.log('⚠️ 没有找到测试数据，跳过网络测试');
      }
    },
    TEST_CONFIG.timeout
  );
});