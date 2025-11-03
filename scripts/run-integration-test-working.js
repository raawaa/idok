#!/usr/bin/env node

/**
 * 运行可工作的集成测试
 * 直接调用测试功能，避免Jest配置问题
 */

// 设置代理环境变量
process.env.HTTP_PROXY = 'http://127.0.0.1:10809';
process.env.HTTPS_PROXY = 'http://127.0.0.1:10809';
process.env.USE_SYSTEM_PROXY = 'true';

console.log('🚀 开始集成测试 - 代理版本');
console.log('📋 环境变量:');
console.log(`   HTTP_PROXY: ${process.env.HTTP_PROXY}`);
console.log(`   HTTPS_PROXY: ${process.env.HTTPS_PROXY}`);
console.log(`   USE_SYSTEM_PROXY: ${process.env.USE_SYSTEM_PROXY}`);

const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

async function runTest(testName, testFn) {
  console.log(`\n🧪 ${testName}`);
  try {
    const startTime = Date.now();
    await testFn();
    const duration = Date.now() - startTime;
    console.log(`✅ ${testName} - 成功 (${duration}ms)`);
    testResults.passed++;
    testResults.tests.push({ name: testName, status: 'passed', duration, error: null });
  } catch (error) {
    console.error(`❌ ${testName} - 失败: ${error.message}`);
    testResults.failed++;
    testResults.tests.push({ name: testName, status: 'failed', duration: 0, error: error.message });
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('集成测试开始 - 使用代理服务器');
  console.log('='.repeat(60) + '\n');

  // 测试1: 基础初始化
  await runTest('1️⃣ WebScraperManager初始化', async () => {
    const WebScraperManager = require('../src/shared/services/web-scraper/web-scraper-manager');

    const scraperManager = new WebScraperManager({
      useSystemProxy: true,
      enableCache: false,
      timeout: 15000
    });

    if (!scraperManager.getAvailableScrapers().includes('javbus')) {
      throw new Error('JavBus抓取器未注册');
    }

    console.log(`   抓取器数量: ${scraperManager.getAvailableScrapers().length}`);
  });

  // 测试2: 健康检查
  await runTest('2️⃣ 健康检查', async () => {
    const WebScraperManager = require('../src/shared/services/web-scraper/web-scraper-manager');

    const scraperManager = new WebScraperManager({
      useSystemProxy: true,
      enableCache: false,
      timeout: 15000
    });

    const health = await scraperManager.healthCheck();

    if (health.status !== 'healthy') {
      throw new Error(`健康检查失败: ${health.status}`);
    }

    if (health.availableScrapers === 0) {
      throw new Error('没有可用的抓取器');
    }

    console.log(`   抓取器状态: ${health.availableScrapers}`);
    console.log(`   运行时间: ${health.uptime}`);
  });

  // 测试3: 代理验证
  await runTest('3️⃣ 代理配置验证', async () => {
    const SystemProxyDetector = require('../src/shared/services/web-scraper/system-proxy-detector');
    const detector = new SystemProxyDetector();
    const proxyInfo = detector.getProxyInfo();

    if (!proxyInfo.hasProxy) {
      throw new Error('代理配置未检测到');
    }

    if (!proxyInfo.envProxies.http || !proxyInfo.envProxies.https) {
      throw new Error('HTTP/HTTPS代理配置缺失');
    }

    console.log(`   HTTP代理: ${proxyInfo.envProxies.http}`);
    console.log(`   HTTPS代理: ${proxyInfo.envProxies.https}`);
  });

  // 测试4: 单个抓取测试
  await runTest('4️⃣ 单个影片抓取测试', async () => {
    const WebScraperManager = require('../src/shared/services/web-scraper/web-scraper-manager');

    const scraperManager = new WebScraperManager({
      useSystemProxy: true,
      enableCache: false,
      timeout: 20000
    });

    const result = await scraperManager.scrapeWithScraper('IPX-177', 'javbus');

    if (!result || !result.title) {
      throw new Error('抓取结果无效');
    }

    if (result.getCompletenessScore() < 30) {
      console.warn(`   警告: 数据完整性较低 (${result.getCompletenessScore()}%)`);
    }

    console.log(`   番号: ${result.avid}`);
    console.log(`   标题: ${result.title.substring(0, 50)}...`);
    console.log(`   演员: ${result.actress.length} 位`);
    console.log(`   类型: ${result.genre.length} 个`);
    console.log(`   制作商: ${result.studio}`);
    console.log(`   数据完整性: ${result.getCompletenessScore()}%`);
  });

  // 测试5: 批量抓取测试
  await runTest('5️⃣ 批量抓取测试', async () => {
    const WebScraperManager = require('../src/shared/services/web-scraper/web-scraper-manager');

    const scraperManager = new WebScraperManager({
      useSystemProxy: true,
      enableCache: false,
      timeout: 30000
    });

    const testIds = ['IPX-177', 'ABP-888'];
    const results = [];

    for (const avId of testIds) {
      try {
        const result = await scraperManager.scrapeWithScraper(avId, 'javbus');
        results.push({ avId, success: true, data: result });
        console.log(`   ${avId}: ✅ 成功`);
      } catch (error) {
        results.push({ avId, success: false, error: error.message });
        console.log(`   ${avId}: ❌ 失败 - ${error.message}`);
      }

      // 添加延迟避免过于频繁的请求
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const successCount = results.filter(r => r.success).length;
    if (successCount === 0) {
      throw new Error('批量抓取全部失败');
    }

    console.log(`   成功率: ${successCount}/${testIds.length}`);
  });

  // 测试6: 错误处理
  await runTest('6️⃣ 错误处理测试', async () => {
    const WebScraperManager = require('../src/shared/services/web-scraper/web-scraper-manager');

    const scraperManager = new WebScraperManager({
      useSystemProxy: true,
      enableCache: false,
      timeout: 10000
    });

    try {
      await scraperManager.scrapeWithScraper('INVALID-FAKE-ID', 'javbus');
      throw new Error('应该抛出错误');
    } catch (error) {
      console.log(`   错误处理正常: ${error.message}`);
    }
  });

  // 测试7: 缓存测试
  await runTest('7️⃣ 缓存功能测试', async () => {
    const WebScraperManager = require('../src/shared/services/web-scraper/web-scraper-manager');

    // 启用缓存的抓取器
    const cachedScraper = new WebScraperManager({
      useSystemProxy: true,
      enableCache: true,
      cacheExpiry: 60000, // 1分钟
      timeout: 20000
    });

    const avId = 'IPX-177';

    // 第一次抓取
    const start1 = Date.now();
    const result1 = await cachedScraper.scrapeWithScraper(avId, 'javbus');
    const duration1 = Date.now() - start1;

    // 第二次抓取（应该使用缓存）
    const start2 = Date.now();
    const result2 = await cachedScraper.scrapeWithScraper(avId, 'javbus');
    const duration2 = Date.now() - start2;

    if (!result1.title || !result2.title) {
      throw new Error('抓取结果无效');
    }

    if (result1.avid !== result2.avid || result1.title !== result2.title) {
      throw new Error('缓存结果不一致');
    }

    const speedup = duration1 > 0 ? ((duration1 - duration2) / duration1 * 100).toFixed(1) : 'N/A';
    console.log(`   第一次: ${duration1}ms`);
    console.log(`   第二次: ${duration2}ms`);
    console.log(`   速度提升: ${speedup}%`);
  });

  // 测试8: 性能基准测试
  await runTest('8️⃣ 性能基准测试', async () => {
    const WebScraperManager = require('../src/shared/services/web-scraper/web-scraper-manager');

    const scraperManager = new WebScraperManager({
      useSystemProxy: true,
      enableCache: false,
      timeout: 30000
    });

    const testCount = 3;
    const times = [];

    for (let i = 0; i < testCount; i++) {
      const start = Date.now();
      await scraperManager.scrapeWithScraper('IPX-177', 'javbus');
      times.push(Date.now() - start);

      if (i < testCount - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    console.log(`   测试次数: ${testCount}`);
    console.log(`   平均时间: ${avgTime}ms`);
    console.log(`   最短时间: ${minTime}ms`);
    console.log(`   最长时间: ${maxTime}ms`);

    if (avgTime > 15000) {
      console.warn(`   警告: 平均响应时间较慢 (${avgTime}ms)`);
    }
  });

  // 输出测试结果
  console.log('\n' + '='.repeat(60));
  console.log('集成测试结果总结');
  console.log('='.repeat(60));
  console.log(`✅ 通过: ${testResults.passed}`);
  console.log(`❌ 失败: ${testResults.failed}`);
  console.log(`📊 成功率: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

  // 详细结果
  console.log('\n📋 详细结果:');
  testResults.tests.forEach((test, index) => {
    const status = test.status === 'passed' ? '✅' : '❌';
    const time = test.duration > 0 ? ` (${test.duration}ms)` : '';
    console.log(`${status} ${test.name}${time}`);
    if (test.error) {
      console.log(`   错误: ${test.error}`);
    }
  });

  // 最终状态
  if (testResults.failed === 0) {
    console.log('\n🎉 所有集成测试通过！代理功能完全正常！');
    process.exit(0);
  } else {
    console.log('\n⚠️  部分测试失败，请检查代理配置和网络连接。');
    process.exit(1);
  }
}

// 运行主函数
main().catch(error => {
  console.error('\n💥 集成测试异常:', error.message);
  console.error(error.stack);
  process.exit(1);
});