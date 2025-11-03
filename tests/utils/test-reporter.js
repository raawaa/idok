/**
 * 测试报告器
 * 提供详细的测试报告生成、错误处理和结果统计功能
 */

const fs = require('fs').promises;
const path = require('path');

class TestReporter {
  constructor(options = {}) {
    this.options = {
      outputDir: path.join(__dirname, '../../reports'),
      enableConsoleOutput: true,
      enableFileOutput: true,
      enableHtmlReport: true,
      enableJsonReport: true,
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 30000,
      ...options
    };
    
    this.results = [];
    this.startTime = null;
    this.endTime = null;
    
    // 确保输出目录存在
    this.ensureOutputDir();
  }

  /**
   * 开始测试会话
   */
  async startTestSession() {
    this.startTime = new Date();
    this.results = [];
    
    if (this.options.enableConsoleOutput) {
      console.log('🚀 开始测试会话');
      console.log(`开始时间: ${this.startTime.toLocaleString()}`);
      console.log('─'.repeat(60));
    }
    
    await this.ensureOutputDir();
  }

  /**
   * 结束测试会话
   */
  async endTestSession() {
    this.endTime = new Date();
    const duration = this.endTime - this.startTime;
    
    const summary = this.generateSummary();
    
    if (this.options.enableConsoleOutput) {
      console.log('─'.repeat(60));
      console.log('🏁 测试会话结束');
      console.log(`结束时间: ${this.endTime.toLocaleString()}`);
      console.log(`总耗时: ${this.formatDuration(duration)}`);
      console.log(this.formatSummary(summary));
    }
    
    // 生成各种格式的报告
    if (this.options.enableFileOutput) {
      await this.generateReports(summary);
    }
    
    return summary;
  }

  /**
   * 记录单个测试结果
   */
  async recordTestResult(result) {
    this.results.push(result);
    
    if (this.options.enableConsoleOutput) {
      this.logTestResult(result);
    }
    
    // 如果测试失败且有异常，记录详细的错误信息
    if (!result.success && result.error) {
      await this.recordErrorDetails(result);
    }
  }

  /**
   * 带重试机制的测试执行
   */
  async executeWithRetry(testFunction, context = {}) {
    const { avId, scraperName, maxRetries = this.options.maxRetries } = context;
    
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.executeWithTimeout(testFunction, context);
        
        if (result.success) {
          return {
            ...result,
            attempt,
            maxRetries
          };
        }
        
        // 如果是不可重试的错误，直接返回
        if (this.isNonRetryableError(result.error)) {
          return {
            ...result,
            attempt,
            maxRetries,
            nonRetryable: true
          };
        }
        
        lastError = result.error;
        
        if (attempt < maxRetries) {
          if (this.options.enableConsoleOutput) {
            console.log(`⚠️  测试失败，${this.options.retryDelay}ms后重试 (${attempt}/${maxRetries})`);
          }
          await this.delay(this.options.retryDelay);
        }
        
      } catch (error) {
        lastError = error;
        
        if (this.isNonRetryableError(error)) {
          return {
            success: false,
            error: error.message,
            attempt,
            maxRetries,
            nonRetryable: true
          };
        }
        
        if (attempt < maxRetries) {
          if (this.options.enableConsoleOutput) {
            console.log(`⚠️  异常错误，${this.options.retryDelay}ms后重试 (${attempt}/${maxRetries})`);
          }
          await this.delay(this.options.retryDelay);
        }
      }
    }
    
    return {
      success: false,
      error: lastError?.message || '所有重试均失败',
      attempt: maxRetries,
      maxRetries,
      exhausted: true
    };
  }

  /**
   * 带超时的测试执行
   */
  async executeWithTimeout(testFunction, context = {}) {
    const { timeout = this.options.timeout } = context;
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`测试超时 (${timeout}ms)`));
      }, timeout);
      
      Promise.resolve(testFunction())
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * 记录错误详情
   */
  async recordErrorDetails(result) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      avId: result.avId,
      scraper: result.scraperName,
      error: result.error,
      stack: result.stack,
      context: result.context,
      comparison: result.comparison
    };
    
    const errorFile = path.join(this.options.outputDir, 'errors', `${result.avId}_${result.scraperName}_${Date.now()}.json`);
    
    try {
      await fs.mkdir(path.dirname(errorFile), { recursive: true });
      await fs.writeFile(errorFile, JSON.stringify(errorLog, null, 2));
    } catch (error) {
      console.error('无法写入错误日志:', error.message);
    }
  }

  /**
   * 生成汇总统计
   */
  generateSummary() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.success).length;
    const failed = total - passed;
    const errors = this.results.filter(r => r.error).length;
    
    const scraperStats = {};
    const avIdStats = {};
    
    this.results.forEach(result => {
      // 按抓取器统计
      if (!scraperStats[result.scraperName]) {
        scraperStats[result.scraperName] = { total: 0, passed: 0, failed: 0 };
      }
      scraperStats[result.scraperName].total++;
      if (result.success) {
        scraperStats[result.scraperName].passed++;
      } else {
        scraperStats[result.scraperName].failed++;
      }
      
      // 按番号统计
      if (!avIdStats[result.avId]) {
        avIdStats[result.avId] = { total: 0, passed: 0, failed: 0 };
      }
      avIdStats[result.avId].total++;
      if (result.success) {
        avIdStats[result.avId].passed++;
      } else {
        avIdStats[result.avId].failed++;
      }
    });
    
    const duration = this.endTime ? this.endTime - this.startTime : 0;
    
    return {
      total,
      passed,
      failed,
      errors,
      successRate: total > 0 ? ((passed / total) * 100).toFixed(1) : 0,
      duration,
      startTime: this.startTime,
      endTime: this.endTime,
      scraperStats,
      avIdStats,
      results: this.results
    };
  }

  /**
   * 生成各种格式的报告
   */
  async generateReports(summary) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    try {
      // JSON报告
      if (this.options.enableJsonReport) {
        const jsonFile = path.join(this.options.outputDir, `test-report-${timestamp}.json`);
        await fs.writeFile(jsonFile, JSON.stringify(summary, null, 2));
      }
      
      // HTML报告
      if (this.options.enableHtmlReport) {
        const htmlFile = path.join(this.options.outputDir, `test-report-${timestamp}.html`);
        const htmlContent = this.generateHtmlReport(summary);
        await fs.writeFile(htmlFile, htmlContent);
      }
      
      // 文本报告
      const textFile = path.join(this.options.outputDir, `test-report-${timestamp}.txt`);
      const textContent = this.generateTextReport(summary);
      await fs.writeFile(textFile, textContent);
      
    } catch (error) {
      console.error('生成报告时出错:', error.message);
    }
  }

  /**
   * 生成HTML报告
   */
  generateHtmlReport(summary) {
    const { total, passed, failed, errors, successRate, duration, scraperStats, avIdStats } = summary;
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Web爬虫测试报告</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: #2c3e50; color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 2.5em; }
        .header .subtitle { margin: 10px 0 0; opacity: 0.8; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; padding: 30px; background: #ecf0f1; }
        .stat-card { background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .stat-number { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .stat-label { color: #7f8c8d; font-size: 0.9em; }
        .success { color: #27ae60; }
        .failure { color: #e74c3c; }
        .warning { color: #f39c12; }
        .details { padding: 30px; }
        .section { margin-bottom: 40px; }
        .section h2 { color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 10px; }
        .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #ecf0f1; }
        .table th { background: #f8f9fa; font-weight: 600; }
        .table tr:hover { background: #f8f9fa; }
        .progress-bar { width: 100%; height: 20px; background: #ecf0f1; border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; background: #27ae60; transition: width 0.3s ease; }
        .footer { background: #34495e; color: white; padding: 20px; text-align: center; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Web爬虫测试报告</h1>
            <div class="subtitle">生成时间: ${new Date().toLocaleString()}</div>
        </div>
        
        <div class="summary">
            <div class="stat-card">
                <div class="stat-number">${total}</div>
                <div class="stat-label">总测试数</div>
            </div>
            <div class="stat-card">
                <div class="stat-number success">${passed}</div>
                <div class="stat-label">通过</div>
            </div>
            <div class="stat-card">
                <div class="stat-number failure">${failed}</div>
                <div class="stat-label">失败</div>
            </div>
            <div class="stat-card">
                <div class="stat-number warning">${errors}</div>
                <div class="stat-label">错误</div>
            </div>
            <div class="stat-card">
                <div class="stat-number ${successRate >= 80 ? 'success' : successRate >= 60 ? 'warning' : 'failure'}">${successRate}%</div>
                <div class="stat-label">成功率</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${this.formatDuration(duration)}</div>
                <div class="stat-label">总耗时</div>
            </div>
        </div>
        
        <div class="details">
            <div class="section">
                <h2>按抓取器统计</h2>
                <table class="table">
                    <thead>
                        <tr>
                            <th>抓取器</th>
                            <th>总数</th>
                            <th>通过</th>
                            <th>失败</th>
                            <th>成功率</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(scraperStats).map(([name, stats]) => `
                        <tr>
                            <td>${name}</td>
                            <td>${stats.total}</td>
                            <td class="success">${stats.passed}</td>
                            <td class="failure">${stats.failed}</td>
                            <td>${((stats.passed / stats.total) * 100).toFixed(1)}%</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div class="section">
                <h2>按番号统计</h2>
                <table class="table">
                    <thead>
                        <tr>
                            <th>番号</th>
                            <th>总数</th>
                            <th>通过</th>
                            <th>失败</th>
                            <th>成功率</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(avIdStats).map(([avId, stats]) => `
                        <tr>
                            <td>${avId}</td>
                            <td>${stats.total}</td>
                            <td class="success">${stats.passed}</td>
                            <td class="failure">${stats.failed}</td>
                            <td>${((stats.passed / stats.total) * 100).toFixed(1)}%</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        
        <div class="footer">
            测试报告由 iDok 项目自动生成
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * 生成文本报告
   */
  generateTextReport(summary) {
    const { total, passed, failed, errors, successRate, duration, scraperStats, avIdStats } = summary;
    
    let report = '=== Web爬虫测试报告 ===\n\n';
    report += `生成时间: ${new Date().toLocaleString()}\n`;
    report += `总耗时: ${this.formatDuration(duration)}\n\n`;
    
    report += '汇总统计:\n';
    report += `  总测试数: ${total}\n`;
    report += `  通过: ${passed}\n`;
    report += `  失败: ${failed}\n`;
    report += `  错误: ${errors}\n`;
    report += `  成功率: ${successRate}%\n\n`;
    
    report += '按抓取器统计:\n';
    Object.entries(scraperStats).forEach(([name, stats]) => {
      report += `  ${name}: ${stats.total} 测试, ${stats.passed} 通过, ${stats.failed} 失败 (${((stats.passed / stats.total) * 100).toFixed(1)}%)\n`;
    });
    report += '\n';
    
    report += '按番号统计:\n';
    Object.entries(avIdStats).forEach(([avId, stats]) => {
      report += `  ${avId}: ${stats.total} 测试, ${stats.passed} 通过, ${stats.failed} 失败 (${((stats.passed / stats.total) * 100).toFixed(1)}%)\n`;
    });
    
    return report;
  }

  /**
   * 控制台输出测试结果
   */
  logTestResult(result) {
    const status = result.success ? '✅' : '❌';
    const duration = result.duration ? ` (${this.formatDuration(result.duration)})` : '';
    
    console.log(`${status} ${result.avId} (${result.scraperName})${duration}`);
    
    if (!result.success) {
      if (result.error) {
        console.log(`   错误: ${result.error}`);
      }
      if (result.comparison && result.comparison.differences.length > 0) {
        console.log(`   差异: ${result.comparison.differences.length} 个字段`);
      }
    }
  }

  /**
   * 格式化汇总信息
   */
  formatSummary(summary) {
    const { total, passed, failed, errors, successRate } = summary;
    
    return `📊 测试汇总:
  总测试数: ${total}
  通过: ${passed} ✅
  失败: ${failed} ❌
  错误: ${errors} ⚠️
  成功率: ${successRate}% ${successRate >= 80 ? '🎉' : successRate >= 60 ? '😐' : '😱'}`;
  }

  /**
   * 格式化持续时间
   */
  formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  }

  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 检查是否为不可重试的错误
   */
  isNonRetryableError(error) {
    if (!error) return false;
    
    const message = error.message || error.toString();
    const nonRetryablePatterns = [
      /404/i,
      /not found/i,
      /invalid.*id/i,
      /parse.*error/i,
      /validation.*error/i
    ];
    
    return nonRetryablePatterns.some(pattern => pattern.test(message));
  }

  /**
   * 确保输出目录存在
   */
  async ensureOutputDir() {
    try {
      await fs.mkdir(this.options.outputDir, { recursive: true });
      await fs.mkdir(path.join(this.options.outputDir, 'errors'), { recursive: true });
    } catch (error) {
      console.error('创建输出目录失败:', error.message);
    }
  }
}

module.exports = TestReporter;