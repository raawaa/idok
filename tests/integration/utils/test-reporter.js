/**
 * 测试报告生成器
 * 参考JavSP的报告生成机制，提供多格式的详细测试报告
 */

const fs = require('fs').promises;
const path = require('path');

class TestReporter {
  constructor(options = {}) {
    this.reportsDir = options.reportsDir || path.join(__dirname, '../data/reports');
    this.enableHtmlReport = options.enableHtmlReport !== false;
    this.enableJsonReport = options.enableJsonReport !== false;
    this.enableConsoleReport = options.enableConsoleReport !== false;
    this.verbose = options.verbose || false;

    // 报告配置
    this.config = {
      includeSuccessfulDetails: options.includeSuccessfulDetails || false,
      includeStackTrace: options.includeStackTrace || true,
      maxDiffLength: options.maxDiffLength || 500,
      groupBySeverity: options.groupBySeverity !== false
    };

    // 统计数据
    this.stats = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      errors: 0,
      startTime: null,
      endTime: null,
      duration: 0
    };

    // 测试结果
    this.testResults = [];
    this.currentSuite = null;
  }

  /**
   * 开始新的测试套件
   */
  startSuite(suiteName, suiteInfo = {}) {
    this.currentSuite = {
      name: suiteName,
      info: suiteInfo,
      startTime: new Date(),
      testCases: [],
      stats: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        errors: 0
      }
    };

    console.log(`\n📋 测试套件: ${suiteName}`);
    if (suiteInfo.description) {
      console.log(`   ${suiteInfo.description}`);
    }
    console.log(''.padEnd(60, '='));
  }

  /**
   * 结束当前测试套件
   */
  endSuite() {
    if (!this.currentSuite) return;

    this.currentSuite.endTime = new Date();
    this.currentSuite.duration = this.currentSuite.endTime - this.currentSuite.startTime;

    this.testResults.push(this.currentSuite);
    this.currentSuite = null;

    console.log(''.padEnd(60, '='));
    console.log('');
  }

  /**
   * 开始测试
   */
  startTest() {
    if (!this.stats.startTime) {
      this.stats.startTime = new Date();
    }
  }

  /**
   * 记录测试结果
   */
  recordResult(testCase) {
    const result = {
      ...testCase,
      timestamp: new Date(),
      duration: testCase.duration || 0
    };

    // 更新套件统计
    if (this.currentSuite) {
      this.currentSuite.testCases.push(result);
      this.currentSuite.stats.total++;

      switch (result.status) {
        case 'passed':
          this.currentSuite.stats.passed++;
          break;
        case 'failed':
          this.currentSuite.stats.failed++;
          break;
        case 'skipped':
          this.currentSuite.stats.skipped++;
          break;
        case 'error':
          this.currentSuite.stats.errors++;
          break;
      }
    }

    // 更新全局统计
    this.stats.total++;
    switch (result.status) {
      case 'passed':
        this.stats.passed++;
        break;
      case 'failed':
        this.stats.failed++;
        break;
      case 'skipped':
        this.stats.skipped++;
        break;
      case 'error':
        this.stats.errors++;
        break;
    }

    // 实时控制台输出
    if (this.enableConsoleReport) {
      this.outputConsoleResult(result);
    }
  }

  /**
   * 输出控制台结果
   */
  outputConsoleResult(result) {
    const statusIcons = {
      passed: '✅',
      failed: '❌',
      skipped: '⏭️',
      error: '💥'
    };

    const icon = statusIcons[result.status] || '❓';
    const testName = result.testName || result.name || 'Unknown Test';
    const duration = result.duration ? ` (${result.duration}ms)` : '';

    console.log(`${icon} ${testName}${duration}`);

    if (result.status === 'failed' || result.status === 'error') {
      if (result.error) {
        console.log(`   错误: ${result.error.message || result.error}`);
      }

      if (result.comparisonResult && this.verbose) {
        const summary = result.comparisonResult.summary;
        console.log(`   匹配率: ${summary.matchRate}% (${summary.matchedFields}/${summary.totalFields})`);

        if (result.comparisonResult.differences.length > 0) {
          console.log(`   差异字段: ${result.comparisonResult.differences.length}个`);
        }
      }
    }
  }

  /**
   * 生成完整测试报告
   */
  async generateReport(customFileName = null) {
    this.stats.endTime = new Date();
    this.stats.duration = this.stats.endTime - this.stats.startTime;

    const reportData = {
      summary: this.generateSummary(),
      suites: this.testResults,
      globalStats: this.stats,
      generatedAt: new Date(),
      environment: this.getEnvironmentInfo()
    };

    const fileName = customFileName || this.generateReportFileName();
    const reports = [];

    // 生成JSON报告
    if (this.enableJsonReport) {
      const jsonReport = await this.generateJsonReport(reportData, fileName);
      reports.push(jsonReport);
    }

    // 生成HTML报告
    if (this.enableHtmlReport) {
      const htmlReport = await this.generateHtmlReport(reportData, fileName);
      reports.push(htmlReport);
    }

    // 输出最终摘要
    this.outputFinalSummary();

    return {
      reportData,
      files: reports,
      summary: reportData.summary
    };
  }

  /**
   * 生成JSON格式报告
   */
  async generateJsonReport(reportData, fileName) {
    const filePath = path.join(this.reportsDir, `${fileName}.json`);

    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      const jsonData = JSON.stringify(reportData, null, 2);
      await fs.writeFile(filePath, jsonData, 'utf8');

      return { type: 'json', path: filePath, size: jsonData.length };
    } catch (error) {
      console.error('生成JSON报告失败:', error.message);
      return null;
    }
  }

  /**
   * 生成HTML格式报告
   */
  async generateHtmlReport(reportData, fileName) {
    const filePath = path.join(this.reportsDir, `${fileName}.html`);

    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      const htmlContent = this.generateHtmlContent(reportData);
      await fs.writeFile(filePath, htmlContent, 'utf8');

      return { type: 'html', path: filePath, size: htmlContent.length };
    } catch (error) {
      console.error('生成HTML报告失败:', error.message);
      return null;
    }
  }

  /**
   * 生成HTML内容
   */
  generateHtmlContent(reportData) {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>爬虫回归测试报告 - ${reportData.generatedAt.toLocaleString()}</title>
    <style>
        ${this.getReportStyles()}
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>爬虫回归测试报告</h1>
            <div class="meta">
                <span>生成时间: ${reportData.generatedAt.toLocaleString()}</span>
                <span>环境: ${reportData.environment.os} ${reportData.environment.nodeVersion}</span>
            </div>
        </header>

        <section class="summary">
            <h2>测试摘要</h2>
            <div class="summary-cards">
                <div class="card total">
                    <div class="number">${reportData.globalStats.total}</div>
                    <div class="label">总测试数</div>
                </div>
                <div class="card passed">
                    <div class="number">${reportData.globalStats.passed}</div>
                    <div class="label">通过</div>
                </div>
                <div class="card failed">
                    <div class="number">${reportData.globalStats.failed}</div>
                    <div class="label">失败</div>
                </div>
                <div class="card errors">
                    <div class="number">${reportData.globalStats.errors}</div>
                    <div class="label">错误</div>
                </div>
                <div class="card duration">
                    <div class="number">${(reportData.globalStats.duration / 1000).toFixed(2)}s</div>
                    <div class="label">总耗时</div>
                </div>
            </div>
            <div class="progress-bar">
                <div class="progress passed" style="width: ${this.getPercentage(reportData.globalStats.passed, reportData.globalStats.total)}%"></div>
                <div class="progress failed" style="width: ${this.getPercentage(reportData.globalStats.failed, reportData.globalStats.total)}%"></div>
                <div class="progress errors" style="width: ${this.getPercentage(reportData.globalStats.errors, reportData.globalStats.total)}%"></div>
            </div>
        </section>

        <section class="suites">
            <h2>测试套件详情</h2>
            ${reportData.suites.map(suite => this.generateSuiteHtml(suite)).join('')}
        </section>

        <footer class="footer">
            <p>报告由 JavSP 风格的回归测试框架生成</p>
        </footer>
    </div>

    <script>
        ${this.getReportScripts()}
    </script>
</body>
</html>`;
  }

  /**
   * 生成测试套件HTML
   */
  generateSuiteHtml(suite) {
    const successRate = this.getPercentage(suite.stats.passed, suite.stats.total);

    return `
        <div class="suite">
            <div class="suite-header" onclick="toggleSuite('suite-${suite.name.replace(/[^a-zA-Z0-9]/g, '-')}')">
                <h3>${suite.name}</h3>
                <div class="suite-stats">
                    <span class="stat passed">${suite.stats.passed} 通过</span>
                    <span class="stat failed">${suite.stats.failed} 失败</span>
                    <span class="stat errors">${suite.stats.errors} 错误</span>
                    <span class="stat rate">${successRate}% 成功率</span>
                    <span class="stat duration">(${(suite.duration / 1000).toFixed(2)}s)</span>
                </div>
            </div>

            <div class="suite-content" id="suite-${suite.name.replace(/[^a-zA-Z0-9]/g, '-')}">
                ${suite.testCases.map(test => this.generateTestHtml(test)).join('')}
            </div>
        </div>`;
  }

  /**
   * 生成单个测试HTML
   */
  generateTestHtml(test) {
    if (test.status === 'passed' && !this.config.includeSuccessfulDetails) {
      return '';
    }

    const statusClass = test.status;
    const testName = test.testName || test.name || 'Unknown Test';

    return `
        <div class="test ${statusClass}">
            <div class="test-header" onclick="toggleTest('test-${test.testName?.replace(/[^a-zA-Z0-9]/g, '-')}')">
                <span class="status ${statusClass}">${this.getStatusIcon(test.status)}</span>
                <span class="name">${testName}</span>
                <span class="duration">${test.duration}ms</span>
            </div>

            <div class="test-details" id="test-${test.testName?.replace(/[^a-zA-Z0-9]/g, '-')}" style="display: none;">
                ${this.generateTestDetails(test)}
            </div>
        </div>`;
  }

  /**
   * 生成测试详情HTML
   */
  generateTestDetails(test) {
    let details = '';

    // 基本信息
    if (test.avid || test.scraper) {
      details += '<div class="detail-group">';
      if (test.avid) details += `<div class="detail-item"><strong>AVID:</strong> ${test.avid}</div>`;
      if (test.scraper) details += `<div class="detail-item"><strong>爬虫:</strong> ${test.scraper}</div>`;
      details += '</div>';
    }

    // 错误信息
    if (test.error) {
      details += '<div class="detail-group error">';
      details += `<h4>错误信息</h4>`;
      details += `<div class="error-message">${test.error.message || test.error}</div>`;
      if (this.config.includeStackTrace && test.error.stack) {
        details += `<pre class="stack-trace">${test.error.stack}</pre>`;
      }
      details += '</div>';
    }

    // 比较结果
    if (test.comparisonResult) {
      details += this.generateComparisonDetails(test.comparisonResult);
    }

    return details;
  }

  /**
   * 生成比较详情HTML
   */
  generateComparisonDetails(comparisonResult) {
    const summary = comparisonResult.summary;

    let html = '<div class="detail-group comparison">';
    html += '<h4>数据比较结果</h4>';
    html += `<div class="comparison-summary">`;
    html += `<span>匹配率: <strong>${summary.matchRate}%</strong></span>`;
    html += `<span>总字段: ${summary.totalFields}</span>`;
    html += `<span>匹配: ${summary.matchedFields}</span>`;
    html += `<span>差异: ${summary.differentFields}</span>`;
    html += `</div>`;

    if (comparisonResult.differences.length > 0) {
      html += '<div class="differences">';
      html += '<h5>字段差异详情</h5>';
      html += '<table class="diff-table">';
      html += '<thead><tr><th>字段</th><th>类型</th><th>严重程度</th><th>差异描述</th><th>基准值</th><th>当前值</th></tr></thead>';
      html += '<tbody>';

      comparisonResult.differences.forEach(diff => {
        const severity = this.getSeverityLevel(diff.type);
        html += `<tr class="severity-${severity}">`;
        html += `<td>${diff.field}</td>`;
        html += `<td>${diff.type}</td>`;
        html += `<td><span class="severity ${severity}">${severity}</span></td>`;
        html += `<td>${diff.difference || '-'}</td>`;
        html += `<td class="baseline-value">${this.formatValue(diff.baselineValue)}</td>`;
        html += `<td class="current-value">${this.formatValue(diff.currentValue)}</td>`;
        html += `</tr>`;
      });

      html += '</tbody></table>';
      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  /**
   * 获取报告样式
   */
  getReportStyles() {
    return `
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            text-align: center;
        }

        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }

        .meta span {
            margin: 0 15px;
            opacity: 0.9;
        }

        .summary {
            background: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .summary h2 {
            margin-bottom: 20px;
            color: #333;
        }

        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }

        .card {
            text-align: center;
            padding: 20px;
            border-radius: 8px;
            color: white;
            font-weight: bold;
        }

        .card .number {
            font-size: 2.5em;
            margin-bottom: 5px;
        }

        .card.total { background: #6c757d; }
        .card.passed { background: #28a745; }
        .card.failed { background: #dc3545; }
        .card.errors { background: #fd7e14; }
        .card.duration { background: #17a2b8; }

        .progress-bar {
            height: 10px;
            background: #e9ecef;
            border-radius: 5px;
            overflow: hidden;
            display: flex;
        }

        .progress {
            height: 100%;
            transition: width 0.3s ease;
        }

        .progress.passed { background: #28a745; }
        .progress.failed { background: #dc3545; }
        .progress.errors { background: #fd7e14; }

        .suites {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .suite {
            margin-bottom: 20px;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            overflow: hidden;
        }

        .suite-header {
            background: #f8f9fa;
            padding: 15px 20px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #dee2e6;
        }

        .suite-header:hover {
            background: #e9ecef;
        }

        .suite-stats {
            display: flex;
            gap: 15px;
            font-size: 0.9em;
        }

        .stat.passed { color: #28a745; }
        .stat.failed { color: #dc3545; }
        .stat.errors { color: #fd7e14; }
        .stat.rate { color: #6c757d; }
        .stat.duration { color: #17a2b8; }

        .suite-content {
            padding: 20px;
        }

        .test {
            margin-bottom: 15px;
            border-left: 4px solid #dee2e6;
            background: #f8f9fa;
            border-radius: 0 4px 4px 0;
        }

        .test.passed { border-left-color: #28a745; }
        .test.failed { border-left-color: #dc3545; }
        .test.error { border-left-color: #fd7e14; }
        .test.skipped { border-left-color: #6c757d; }

        .test-header {
            padding: 10px 15px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .test-header:hover {
            background: rgba(0,0,0,0.05);
        }

        .status { font-size: 1.2em; }
        .name { flex: 1; font-weight: 500; }
        .duration { color: #6c757d; font-size: 0.9em; }

        .test-details {
            padding: 15px;
            border-top: 1px solid #dee2e6;
            background: white;
        }

        .detail-group {
            margin-bottom: 20px;
        }

        .detail-group:last-child {
            margin-bottom: 0;
        }

        .detail-item {
            margin-bottom: 5px;
        }

        .error-message {
            background: #f8d7da;
            color: #721c24;
            padding: 10px;
            border-radius: 4px;
            border-left: 4px solid #dc3545;
            font-family: monospace;
            font-size: 0.9em;
        }

        .stack-trace {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            padding: 10px;
            font-family: monospace;
            font-size: 0.8em;
            overflow-x: auto;
            margin-top: 10px;
        }

        .comparison-summary {
            display: flex;
            gap: 15px;
            margin-bottom: 15px;
            font-weight: bold;
        }

        .diff-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 0.9em;
        }

        .diff-table th,
        .diff-table td {
            padding: 8px 12px;
            border: 1px solid #dee2e6;
            text-align: left;
            vertical-align: top;
        }

        .diff-table th {
            background: #f8f9fa;
            font-weight: 600;
        }

        .severity {
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.8em;
            font-weight: bold;
            text-transform: uppercase;
        }

        .severity.success { background: #d4edda; color: #155724; }
        .severity.warning { background: #fff3cd; color: #856404; }
        .severity.error { background: #f8d7da; color: #721c24; }
        .severity.critical { background: #f5c6cb; color: #721c24; }

        .severity-success { background-color: rgba(40, 167, 69, 0.1); }
        .severity-warning { background-color: rgba(255, 193, 7, 0.1); }
        .severity-error { background-color: rgba(220, 53, 69, 0.1); }
        .severity-critical { background-color: rgba(253, 126, 20, 0.1); }

        .baseline-value,
        .current-value {
            font-family: monospace;
            font-size: 0.8em;
            max-width: 200px;
            word-break: break-all;
        }

        .footer {
            text-align: center;
            margin-top: 40px;
            padding: 20px;
            color: #6c757d;
            border-top: 1px solid #dee2e6;
        }

        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }

            .summary-cards {
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                gap: 10px;
            }

            .suite-stats {
                flex-wrap: wrap;
                gap: 8px;
            }

            .comparison-summary {
                flex-wrap: wrap;
                gap: 8px;
            }
        }
    `;
  }

  /**
   * 获取报告脚本
   */
  getReportScripts() {
    return `
        function toggleSuite(suiteId) {
            const content = document.getElementById(suiteId);
            if (content) {
                content.style.display = content.style.display === 'none' ? 'block' : 'none';
            }
        }

        function toggleTest(testId) {
            const details = document.getElementById(testId);
            if (details) {
                details.style.display = details.style.display === 'none' ? 'block' : 'none';
            }
        }

        // 默认展开失败的测试
        document.addEventListener('DOMContentLoaded', function() {
            const failedTests = document.querySelectorAll('.test.failed, .test.error');
            failedTests.forEach(test => {
                const details = test.querySelector('.test-details');
                if (details) {
                    details.style.display = 'block';
                }
            });
        });
    `;
  }

  /**
   * 生成测试摘要
   */
  generateSummary() {
    const successRate = this.getPercentage(this.stats.passed, this.stats.total);
    const failureRate = this.getPercentage(this.stats.failed + this.stats.errors, this.stats.total);

    return {
      totalTests: this.stats.total,
      passed: this.stats.passed,
      failed: this.stats.failed,
      errors: this.stats.errors,
      skipped: this.stats.skipped,
      successRate,
      failureRate,
      duration: this.stats.duration,
      status: this.stats.errors > 0 ? 'critical' : this.stats.failed > 0 ? 'failed' : 'passed',
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * 生成改进建议
   */
  generateRecommendations() {
    const recommendations = [];

    if (this.stats.errors > 0) {
      recommendations.push({
        type: 'critical',
        message: `存在 ${this.stats.errors} 个严重错误，需要立即修复`
      });
    }

    if (this.stats.failed > 0) {
      recommendations.push({
        type: 'warning',
        message: `${this.stats.failed} 个测试失败，建议检查相关功能`
      });
    }

    const successRate = this.getPercentage(this.stats.passed, this.stats.total);
    if (successRate < 80) {
      recommendations.push({
        type: 'info',
        message: `整体成功率较低 (${successRate}%)，建议全面检查系统稳定性`
      });
    }

    if (this.stats.duration > 30000) {
      recommendations.push({
        type: 'performance',
        message: `测试耗时较长 (${(this.stats.duration / 1000).toFixed(2)}s)，考虑优化测试性能`
      });
    }

    return recommendations;
  }

  /**
   * 输出最终摘要
   */
  outputFinalSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 测试完成摘要');
    console.log('='.repeat(60));

    const summary = this.generateSummary();
    console.log(`总测试数: ${summary.totalTests}`);
    console.log(`通过: ${summary.passed} ✅`);
    console.log(`失败: ${summary.failed} ❌`);
    console.log(`错误: ${summary.errors} 💥`);
    console.log(`跳过: ${summary.skipped} ⏭️`);
    console.log(`成功率: ${summary.successRate}%`);
    console.log(`总耗时: ${(summary.duration / 1000).toFixed(2)}s`);

    if (summary.recommendations.length > 0) {
      console.log('\n💡 建议:');
      summary.recommendations.forEach((rec, index) => {
        const icon = rec.type === 'critical' ? '🚨' : rec.type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${index + 1}. ${icon} ${rec.message}`);
      });
    }

    console.log('='.repeat(60));
  }

  /**
   * 获取环境信息
   */
  getEnvironmentInfo() {
    return {
      os: process.platform,
      nodeVersion: process.version,
      memory: process.memoryUsage(),
      cwd: process.cwd(),
      testFramework: 'JavSP-style Regression Testing',
      reportVersion: '1.0.0'
    };
  }

  /**
   * 生成报告文件名
   */
  generateReportFileName() {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
    return `regression-test-report-${timestamp}`;
  }

  /**
   * 获取百分比
   */
  getPercentage(value, total) {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  }

  /**
   * 获取状态图标
   */
  getStatusIcon(status) {
    const icons = {
      passed: '✅',
      failed: '❌',
      error: '💥',
      skipped: '⏭️'
    };
    return icons[status] || '❓';
  }

  /**
   * 获取严重程度
   */
  getSeverityLevel(type) {
    const severityLevels = {
      'default_match': 'success',
      'text_match': 'success',
      'list_match': 'success',
      'url_path_match': 'success',
      'time_sensitive_both_exist': 'success',
      'time_sensitive_both_null': 'success',
      'text_fuzzy_match': 'warning',
      'time_sensitive_mismatch': 'warning',
      'null_mismatch': 'error',
      'default_mismatch': 'error',
      'list_mismatch': 'error',
      'url_path_mismatch': 'error',
      'text_mismatch': 'error',
      'array_mismatch': 'error',
      'error': 'critical'
    };

    return severityLevels[type] || 'info';
  }

  /**
   * 格式化值显示
   */
  formatValue(value) {
    if (value === null || value === undefined) {
      return '<span class="null">null</span>';
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return '<span class="empty">[]</span>';
      return `<span class="array">[${value.length} items]</span>`;
    }

    if (typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.length === 0) return '<span class="empty">{}</span>';
      return `<span class="object">{${keys.length} keys}</span>`;
    }

    const str = String(value);
    if (str.length > 50) {
      return `<span class="truncated" title="${str}">${str.substring(0, 50)}...</span>`;
    }

    return `<span class="string">${str}</span>`;
  }

  /**
   * 清理旧报告
   */
  async cleanupOldReports(maxReports = 10) {
    try {
      const files = await fs.readdir(this.reportsDir);
      const reportFiles = files.filter(file =>
        file.startsWith('regression-test-report-') &&
        (file.endsWith('.json') || file.endsWith('.html'))
      );

      if (reportFiles.length <= maxReports) return;

      // 按修改时间排序，删除最旧的报告
      const fileStats = await Promise.all(
        reportFiles.map(async file => {
          const filePath = path.join(this.reportsDir, file);
          const stat = await fs.stat(filePath);
          return { file, filePath, mtime: stat.mtime };
        })
      );

      fileStats.sort((a, b) => a.mtime - b.mtime);
      const toDelete = fileStats.slice(0, fileStats.length - maxReports);

      for (const { filePath } of toDelete) {
        await fs.unlink(filePath);
      }

      console.log(`清理了 ${toDelete.length} 个旧报告文件`);
    } catch (error) {
      console.error('清理旧报告失败:', error.message);
    }
  }
}

module.exports = {
  TestReporter
};