#!/usr/bin/env node

/**
 * JavSP风格回归测试命令行工具
 * 提供便捷的命令行接口来运行回归测试
 */

const { RegressionTestRunner } = require('../tests/integration/regression-test-runner');
const path = require('path');

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    avid: null,
    scraper: null,
    verbose: false,
    parallel: true,
    maxConcurrency: 3,
    timeout: 30000,
    updateBaseline: false,
    dryRun: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '-h':
      case '--help':
        options.help = true;
        break;

      case '-v':
      case '--verbose':
        options.verbose = true;
        break;

      case '--serial':
        options.parallel = false;
        break;

      case '--concurrency':
        options.maxConcurrency = parseInt(args[++i]) || 3;
        break;

      case '--timeout':
        options.timeout = parseInt(args[++i]) || 30000;
        break;

      case '--update-baseline':
        options.updateBaseline = true;
        break;

      case '--dry-run':
        options.dryRun = true;
        break;

      case '--avid':
        options.avid = args[++i];
        break;

      case '--scraper':
        options.scraper = args[++i];
        break;

      default:
        if (!arg.startsWith('-') && !options.avid) {
          // 第一个非选项参数作为AVID
          options.avid = arg;
        }
        break;
    }
  }

  return options;
}

// 显示帮助信息
function showHelp() {
  console.log(`
JavSP风格回归测试工具

用法:
  node scripts/run-regression-tests.js [选项] [AVID]

选项:
  -h, --help                 显示此帮助信息
  -v, --verbose              详细输出模式
  --serial                   串行执行测试（默认并行）
  --concurrency <num>        最大并发数 (默认: 3)
  --timeout <ms>             单个测试超时时间 (默认: 30000ms)
  --update-baseline          更新基准数据而不是比较
  --dry-run                  只显示将要执行的测试，不实际运行
  --avid <AVID>              指定要测试的AVID
  --scraper <name>           指定要测试的爬虫 (javbus, javdb, etc.)

示例:
  # 运行所有回归测试
  node scripts/run-regression-tests.js

  # 测试特定AVID
  node scripts/run-regression-tests.js IPX-177

  # 测试特定爬虫
  node scripts/run-regression-tests.js --scraper javbus

  # 测试特定AVID和爬虫组合
  node scripts/run-regression-tests.js --avid IPX-177 --scraper javbus

  # 详细输出模式
  node scripts/run-regression-tests.js --verbose

  # 串行执行
  node scripts/run-regression-tests.js --serial

  # 更新基准数据
  node scripts/run-regression-tests.js --avid IPX-177 --update-baseline

  # 干运行（只查看测试计划）
  node scripts/run-regression-tests.js --dry-run
`);
}

// 主函数
async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  console.log('🚀 JavSP风格回归测试工具');
  console.log('='.repeat(50));

  // 创建测试运行器
  const runnerOptions = {
    dataManager: {
      baselineDir: path.join(__dirname, '../tests/integration/data/baseline'),
      currentDir: path.join(__dirname, '../tests/integration/data/current'),
      reportsDir: path.join(__dirname, '../tests/integration/data/reports'),
      environment: process.env.NODE_ENV || 'development',
      enableAutoUpdate: options.updateBaseline
    },
    comparator: {
      strictMode: false,
      ignoreWhitespace: true,
      ignoreCase: false,
      tolerance: 0.1
    },
    reporter: {
      verbose: options.verbose,
      enableHtmlReport: true,
      enableJsonReport: true,
      enableConsoleReport: true
    },
    parallel: options.parallel,
    maxConcurrency: options.maxConcurrency,
    timeout: options.timeout,
    verbose: options.verbose
  };

  const runner = new RegressionTestRunner(runnerOptions);

  try {
    if (options.dryRun) {
      // 干运行模式
      console.log('🔍 干运行模式 - 显示测试计划');

      const testData = await runner.dataManager.scanBaselineData();
      let filteredData = testData;

      if (options.avid) {
        filteredData = filteredData.filter(item => item.avid === options.avid);
      }

      if (options.scraper) {
        filteredData = filteredData.filter(item => item.scraper === options.scraper);
      }

      console.log(`\n📋 将执行 ${filteredData.length} 个测试:`);
      filteredData.forEach(item => {
        const status = item.avid === options.avid ? '🎯' : '  ';
        console.log(`${status} ${item.avid} (${item.scraper})`);
      });

      if (filteredData.length === 0) {
        console.log('❌ 没有找到匹配的测试用例');
      }

      return;
    }

    if (options.updateBaseline) {
      // 更新基准数据模式
      if (!options.avid || !options.scraper) {
        console.error('❌ 更新基准数据需要指定 --avid 和 --scraper');
        process.exit(1);
      }

      console.log(`🔄 更新基准数据模式: ${options.avid} (${options.scraper})`);

      const success = await runner.updateBaselineData(options.avid, options.scraper);

      if (success) {
        console.log('✅ 基准数据更新成功');
      } else {
        console.log('❌ 基准数据更新失败');
        process.exit(1);
      }

      return;
    }

    // 运行回归测试
    let result;

    if (options.avid) {
      // 测试特定AVID
      console.log(`🎯 测试特定AVID: ${options.avid}`);
      result = await runner.testSingleAvid(options.avid, options.scraper);
    } else if (options.scraper) {
      // 测试特定爬虫
      console.log(`🎯 测试特定爬虫: ${options.scraper}`);
      result = await runner.testSingleScraper(options.scraper);
    } else {
      // 运行完整测试套件
      console.log('🔍 运行完整回归测试套件');
      result = await runner.runRegressionTests();
    }

    // 显示最终结果
    console.log('\n' + '='.repeat(50));
    if (result.success) {
      console.log('✅ 回归测试完成 - 所有测试通过');
      process.exit(0);
    } else {
      console.log('❌ 回归测试完成 - 存在失败的测试');

      const stats = result.stats;
      console.log(`   通过: ${stats.passedTests}`);
      console.log(`   失败: ${stats.failedTests}`);
      console.log(`   错误: ${stats.errorTests}`);

      process.exit(1);
    }

  } catch (error) {
    console.error('💥 回归测试执行失败:', error.message);

    if (options.verbose) {
      console.error(error.stack);
    }

    process.exit(1);
  } finally {
    // 清理资源
    await runner.cleanup();
  }
}

// 处理未捕获的异常
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 未处理的Promise拒绝:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('💥 未捕获的异常:', error.message);
  if (options.verbose) {
    console.error(error.stack);
  }
  process.exit(1);
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n\n🛑 收到中断信号，正在清理资源...');
  process.exit(0);
});

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  parseArgs,
  showHelp,
  main
};