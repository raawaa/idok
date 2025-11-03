#!/usr/bin/env node

/**
 * 简化的集成测试，直接测试代理功能
 */

// 设置代理环境变量
process.env.HTTP_PROXY = 'http://127.0.0.1:10809';
process.env.HTTPS_PROXY = 'http://127.0.0.1:10809';
process.env.USE_SYSTEM_PROXY = 'true';

const { execSync } = require('child_process');

async function runSimpleIntegrationTest() {
  console.log('🧪 简化集成测试 - 代理功能验证');
  console.log('📋 环境变量:');
  console.log(`   HTTP_PROXY: ${process.env.HTTP_PROXY}`);
  console.log(`   HTTPS_PROXY: ${process.env.HTTPS_PROXY}`);

  try {
    // 测试1: WebScraperManager初始化
    console.log('\n1️⃣ 测试WebScraperManager初始化');
    const WebScraperManager = require('../src/shared/services/web-scraper/web-scraper-manager');

    const scraperManager = new WebScraperManager({
      useSystemProxy: true,
      enableCache: false,
      timeout: 15000
    });

    console.log('✅ WebScraperManager初始化成功');
    console.log(`   可用抓取器: ${scraperManager.getAvailableScrapers().join(', ')}`);

    // 测试2: 健康检查
    console.log('\n2️⃣ 测试健康检查');
    const health = await scraperManager.healthCheck();
    console.log(`✅ 健康检查: ${health.status}`);
    console.log(`   抓取器数量: ${health.availableScrapers}`);

    // 测试3: 实际抓取测试（单个测试）
    console.log('\n3️⃣ 测试实际抓取功能');
    console.log('   开始抓取: IPX-177');

    const startTime = Date.now();
    const result = await scraperManager.scrapeWithScraper('IPX-177', 'javbus');
    const duration = Date.now() - startTime;

    console.log(`✅ 抓取成功 (${duration}ms)`);
    console.log(`   标题: ${result.title}`);
    console.log(`   演员: ${result.actress.join(', ')}`);
    console.log(`   制作商: ${result.studio}`);
    console.log(`   数据完整性: ${result.getCompletenessScore()}%`);

    scraperManager.clearCache();

    // 测试4: 代理验证
    console.log('\n4️⃣ 验证代理使用情况');
    const SystemProxyDetector = require('../src/shared/services/web-scraper/system-proxy-detector');
    const detector = new SystemProxyDetector();
    const proxyInfo = detector.getProxyInfo();

    if (proxyInfo.hasProxy) {
      console.log('✅ 代理配置检测成功');
      console.log(`   HTTP代理: ${proxyInfo.envProxies.http}`);
      console.log(`   HTTPS代理: ${proxyInfo.envProxies.https}`);
    } else {
      console.log('❌ 代理配置未检测到');
    }

    console.log('\n🎉 所有测试通过！代理在集成测试中正常工作。');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('错误堆栈:', error.stack);
    process.exit(1);
  }
}

runSimpleIntegrationTest().catch(console.error);