#!/usr/bin/env node

/**
 * 自动更新基准数据脚本
 * 智能识别需要更新的基准数据并自动更新
 */

const { TestDataManager } = require('../tests/integration/utils/test-data-manager');
const { DataComparator } = require('../tests/integration/utils/data-comparator');
const { RegressionTestRunner } = require('../tests/integration/regression-test-runner');
const path = require('path');
const fs = require('fs').promises;

class AutoUpdateBaseline {
  constructor(options = {}) {
    this.dataManager = new TestDataManager({
      baselineDir: options.baselineDir || path.join(__dirname, '../tests/integration/data/baseline'),
      currentDir: options.currentDir || path.join(__dirname, '../tests/integration/data/current'),
      enableAutoUpdate: true
    });

    this.comparator = new DataComparator({
      strictMode: false,
      ignoreWhitespace: true,
      tolerance: 0.15 // 放宽容差用于自动更新
    });

    this.runner = new RegressionTestRunner({
      dataManager: this.dataManager,
      comparator: this.comparator,
      verbose: options.verbose || false
    });

    this.options = {
      dryRun: options.dryRun || false,
      forceUpdate: options.forceUpdate || false,
      minMatchRate: options.minMatchRate || 85, // 最低匹配率阈值
      maxAgeDays: options.maxAgeDays || 30,   // 数据最大年龄
      batchSize: options.batchSize || 5,       // 批处理大小
      delayBetweenBatches: options.delayBetweenBatches || 2000 // 批次间延迟
    };

    this.stats = {
      totalScanned: 0,
      needsUpdate: 0,
      updated: 0,
      failed: 0,
      skipped: 0,
      startTime: null,
      endTime: null
    };
  }

  /**
   * 运行自动更新
   */
  async runAutoUpdate() {
    console.log('🔄 开始自动更新基准数据');
    console.log('='.repeat(50));

    this.stats.startTime = new Date();

    try {
      // 1. 扫描所有基准数据
      const allTestData = await this.scanAllTestData();
      if (allTestData.length === 0) {
        console.log('⚠️ 未找到基准数据');
        return this.generateResult();
      }

      console.log(`📊 找到 ${allTestData.length} 个基准数据文件`);

      // 2. 分析需要更新的数据
      const needsUpdate = await this.analyzeUpdateNeeds(allTestData);
      console.log(`🎯 识别出 ${needsUpdate.length} 个需要更新的数据`);

      if (this.options.dryRun) {
        console.log('\n🔍 干运行模式 - 显示更新计划:');
        needsUpdate.forEach(item => {
          console.log(`   📝 ${item.avid} (${item.scraper}) - ${item.reason}`);
        });
        return this.generateResult();
      }

      // 3. 执行批量更新
      await this.executeBatchUpdate(needsUpdate);

      // 4. 生成更新报告
      return this.generateResult();

    } catch (error) {
      console.error('❌ 自动更新失败:', error.message);
      throw error;
    } finally {
      this.stats.endTime = new Date();
    }
  }

  /**
   * 扫描所有测试数据
   */
  async scanAllTestData() {
    const testData = await this.dataManager.scanBaselineData();
    this.stats.totalScanned = testData.length;

    // 为每个测试数据添加文件信息
    const enrichedData = await Promise.all(
      testData.map(async item => {
        const filePath = item.filePath;
        const stat = await fs.stat(filePath);

        return {
          ...item,
          filePath,
          fileStats: stat,
          ageInDays: (Date.now() - stat.mtime.getTime()) / (1000 * 60 * 60 * 24)
        };
      })
    );

    return enrichedData;
  }

  /**
   * 分析需要更新的数据
   */
  async analyzeUpdateNeeds(testData) {
    const needsUpdate = [];

    console.log('🔍 分析基准数据更新需求...');

    for (const item of testData) {
      const updateReason = await this.shouldUpdate(item);

      if (updateReason) {
        needsUpdate.push({
          ...item,
          reason: updateReason,
          priority: this.calculateUpdatePriority(item, updateReason)
        });
      }
    }

    // 按优先级排序
    needsUpdate.sort((a, b) => b.priority - a.priority);

    this.stats.needsUpdate = needsUpdate.length;
    return needsUpdate;
  }

  /**
   * 判断是否需要更新
   */
  async shouldUpdate(item) {
    const reasons = [];

    // 1. 检查数据年龄
    if (item.ageInDays > this.options.maxAgeDays) {
      reasons.push(`数据过旧 (${Math.round(item.ageInDays)}天)`);
    }

    // 2. 检查数据质量
    try {
      const baselineData = await this.dataManager.loadBaselineData(item.avid, item.scraper);
      const qualityIssues = this.analyzeDataQuality(baselineData);

      if (qualityIssues.length > 0) {
        reasons.push(`数据质量问题: ${qualityIssues.join(', ')}`);
      }

    } catch (error) {
      reasons.push(`无法加载基准数据: ${error.message}`);
    }

    // 3. 检查是否有当前数据可用于比较
    try {
      const currentData = await this.runner.fetchCurrentData(item.avid, item.scraper);

      if (!currentData || Object.keys(currentData).length === 0) {
        reasons.push('当前爬虫无法获取数据');
        return reasons.join('; ');
      }

      // 4. 比较数据差异
      const baselineData = await this.dataManager.loadBaselineData(item.avid, item.scraper);
      const comparison = this.comparator.compare(baselineData, currentData, item.scraper);

      if (comparison.summary.matchRate < this.options.minMatchRate) {
        reasons.push(`匹配率过低 (${comparison.summary.matchRate}% < ${this.options.minMatchRate}%)`);
      }

      // 5. 检查新增字段
      const newFields = this.findNewFields(baselineData, currentData);
      if (newFields.length > 0) {
        reasons.push(`发现新字段: ${newFields.join(', ')}`);
      }

    } catch (error) {
      // 如果无法获取当前数据，可能网站结构已变化
      reasons.push(`爬虫异常: ${error.message}`);
    }

    return reasons.length > 0 ? reasons.join('; ') : null;
  }

  /**
   * 分析数据质量
   */
  analyzeDataQuality(data) {
    const issues = [];

    // 检查必需字段
    if (!data.avid) issues.push('缺少AVID');
    if (!data.title) issues.push('缺少标题');

    // 检查数据完整性
    if (Array.isArray(data.genre) && data.genre.length === 0) {
      issues.push('类型为空');
    }

    if (Array.isArray(data.actress) && data.actress.length === 0) {
      issues.push('演员为空');
    }

    // 检查URL有效性
    if (!data.cover) issues.push('缺少封面图');
    if (!data.url) issues.push('缺少详情页URL');

    // 检查数据一致性
    if (data.releaseDate && !this.isValidDate(data.releaseDate)) {
      issues.push('发布日期格式无效');
    }

    return issues;
  }

  /**
   * 查找新字段
   */
  findNewFields(baselineData, currentData) {
    const baselineFields = new Set(Object.keys(baselineData));
    const currentFields = new Set(Object.keys(currentData));

    const newFields = [...currentFields].filter(field => !baselineFields.has(field));

    // 过滤掉系统字段和时间敏感字段
    return newFields.filter(field =>
      !field.startsWith('_') &&
      !['lastUpdated', 'fetchTime', 'cacheTime'].includes(field)
    );
  }

  /**
   * 计算更新优先级
   */
  calculateUpdatePriority(item, reason) {
    let priority = 0;

    // 数据年龄权重
    priority += Math.min(item.ageInDays * 2, 50);

    // 匹配率权重
    if (reason.includes('匹配率过低')) {
      priority += 30;
    }

    // 数据质量权重
    if (reason.includes('数据质量问题')) {
      priority += 25;
    }

    // 爬虫异常权重
    if (reason.includes('爬虫异常')) {
      priority += 40;
    }

    // 新字段权重
    if (reason.includes('发现新字段')) {
      priority += 15;
    }

    return priority;
  }

  /**
   * 执行批量更新
   */
  async executeBatchUpdate(needsUpdate) {
    console.log(`🔄 开始批量更新 ${needsUpdate.length} 个基准数据...`);

    // 分批处理
    const batches = this.chunkArray(needsUpdate, this.options.batchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`\n📦 处理批次 ${i + 1}/${batches.length} (${batch.length} 项)`);

      await this.processBatch(batch);

      // 批次间延迟
      if (i < batches.length - 1 && this.options.delayBetweenBatches > 0) {
        console.log(`⏱️  等待 ${this.options.delayBetweenBatches / 1000} 秒...`);
        await this.sleep(this.options.delayBetweenBatches);
      }
    }

    console.log(`\n✅ 批量更新完成`);
    console.log(`   更新成功: ${this.stats.updated}`);
    console.log(`   更新失败: ${this.stats.failed}`);
    console.log(`   跳过: ${this.stats.skipped}`);
  }

  /**
   * 处理单个批次
   */
  async processBatch(batch) {
    for (const item of batch) {
      try {
        console.log(`   🔄 ${item.avid} (${item.scraper}) - ${item.reason}`);

        const success = await this.updateSingleItem(item);

        if (success) {
          this.stats.updated++;
          console.log(`   ✅ ${item.avid} - 更新成功`);
        } else {
          this.stats.failed++;
          console.log(`   ❌ ${item.avid} - 更新失败`);
        }

      } catch (error) {
        this.stats.failed++;
        console.log(`   💥 ${item.avid} - 更新异常: ${error.message}`);
      }
    }
  }

  /**
   * 更新单个项目
   */
  async updateSingleItem(item) {
    try {
      // 获取当前数据
      const currentData = await this.runner.fetchCurrentData(item.avid, item.scraper);

      if (!currentData) {
        throw new Error('无法获取当前数据');
      }

      // 验证数据质量
      const validation = this.dataManager.validateDataFormat(currentData);
      if (!validation.isValid && !this.options.forceUpdate) {
        console.log(`      ⚠️ 数据质量检查失败: ${validation.errors.join(', ')}`);
        this.stats.skipped++;
        return false;
      }

      // 创建备份
      await this.createBackup(item);

      // 更新基准数据
      const success = await this.dataManager.updateBaselineData(item.avid, item.scraper, currentData);

      if (success) {
        // 记录更新日志
        await this.logUpdate(item, currentData);
      }

      return success;

    } catch (error) {
      console.error(`      💥 更新失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 创建备份
   */
  async createBackup(item) {
    const backupPath = `${item.filePath}.backup.${Date.now()}`;

    try {
      await fs.copyFile(item.filePath, backupPath);
      console.log(`      📋 已创建备份: ${path.basename(backupPath)}`);
    } catch (error) {
      console.warn(`      ⚠️ 备份失败: ${error.message}`);
    }
  }

  /**
   * 记录更新日志
   */
  async logUpdate(item, newData) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      avid: item.avid,
      scraper: item.scraper,
      reason: item.reason,
      fields: Object.keys(newData),
      fieldCount: Object.keys(newData).length
    };

    const logPath = path.join(path.dirname(item.filePath), '../updates.log');

    try {
      const logLine = JSON.stringify(logEntry) + '\n';
      await fs.appendFile(logPath, logLine, 'utf8');
    } catch (error) {
      console.warn(`      ⚠️ 记录日志失败: ${error.message}`);
    }
  }

  /**
   * 生成结果
   */
  generateResult() {
    const duration = this.stats.endTime - this.stats.startTime;

    return {
      success: this.stats.failed === 0,
      stats: this.stats,
      duration,
      summary: {
        totalScanned: this.stats.totalScanned,
        needsUpdate: this.stats.needsUpdate,
        updated: this.stats.updated,
        failed: this.stats.failed,
        skipped: this.stats.skipped,
        successRate: this.stats.needsUpdate > 0 ?
          Math.round((this.stats.updated / this.stats.needsUpdate) * 100) : 100
      }
    };
  }

  /**
   * 验证日期格式
   */
  isValidDate(dateString) {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && date.getFullYear() > 1900;
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
    await this.runner.cleanup();
  }
}

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: false,
    forceUpdate: false,
    verbose: false,
    minMatchRate: 85,
    maxAgeDays: 30,
    batchSize: 5,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '-h':
      case '--help':
        options.help = true;
        break;
      case '-n':
      case '--dry-run':
        options.dryRun = true;
        break;
      case '-f':
      case '--force':
        options.forceUpdate = true;
        break;
      case '-v':
      case '--verbose':
        options.verbose = true;
        break;
      case '--min-match-rate':
        options.minMatchRate = parseInt(args[++i]) || 85;
        break;
      case '--max-age-days':
        options.maxAgeDays = parseInt(args[++i]) || 30;
        break;
      case '--batch-size':
        options.batchSize = parseInt(args[++i]) || 5;
        break;
    }
  }

  return options;
}

// 显示帮助信息
function showHelp() {
  console.log(`
自动更新基准数据工具

用法:
  node scripts/auto-update-baseline.js [选项]

选项:
  -h, --help                 显示此帮助信息
  -n, --dry-run              干运行模式，只显示将要更新的项目
  -f, --force                强制更新，忽略数据质量检查
  -v, --verbose              详细输出模式
  --min-match-rate <num>     最低匹配率阈值 (默认: 85)
  --max-age-days <num>       数据最大年龄 (默认: 30天)
  --batch-size <num>         批处理大小 (默认: 5)

示例:
  # 干运行模式查看更新计划
  node scripts/auto-update-baseline.js --dry-run

  # 执行自动更新
  node scripts/auto-update-baseline.js

  # 详细输出模式
  node scripts/auto-update-baseline.js --verbose

  # 强制更新所有需要更新的数据
  node scripts/auto-update-baseline.js --force

  # 调整更新阈值
  node scripts/auto-update-baseline.js --min-match-rate 80 --max-age-days 60
`);
}

// 主函数
async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  console.log('🔄 自动更新基准数据工具');
  console.log('='.repeat(50));

  const updater = new AutoUpdateBaseline(options);

  try {
    const result = await updater.runAutoUpdate();

    console.log('\n' + '='.repeat(50));
    console.log('📊 自动更新完成');
    console.log(`扫描总数: ${result.summary.totalScanned}`);
    console.log(`需要更新: ${result.summary.needsUpdate}`);
    console.log(`更新成功: ${result.summary.updated}`);
    console.log(`更新失败: ${result.summary.failed}`);
    console.log(`跳过项目: ${result.summary.skipped}`);
    console.log(`成功率: ${result.summary.successRate}%`);
    console.log(`耗时: ${(result.duration / 1000).toFixed(2)}秒`);

    if (result.success) {
      console.log('✅ 自动更新成功完成');
      process.exit(0);
    } else {
      console.log('⚠️ 自动更新完成，但存在失败的项目');
      process.exit(1);
    }

  } catch (error) {
    console.error('💥 自动更新失败:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await updater.cleanup();
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  AutoUpdateBaseline,
  parseArgs,
  showHelp,
  main
};