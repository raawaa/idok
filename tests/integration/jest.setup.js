/**
 * Jest回归测试设置文件
 * 配置测试环境和全局设置
 */

const path = require('path');

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.HTTP_PROXY = 'http://127.0.0.1:10809';
process.env.HTTPS_PROXY = 'http://127.0.0.1:10809';

// 设置超时时间
jest.setTimeout(60000);

// 全局测试配置
global.testConfig = {
  timeout: 60000,
  retries: 2,
  verbose: process.env.VERBOSE === 'true',
  testDataDir: path.join(__dirname, 'data'),
  baselineDir: path.join(__dirname, 'data/baseline'),
  currentDir: path.join(__dirname, 'data/current'),
  reportsDir: path.join(__dirname, 'data/reports')
};

// 控制台输出美化
const originalConsoleLog = console.log;
console.log = (...args) => {
  // 添加时间戳前缀
  const timestamp = new Date().toLocaleTimeString();
  originalConsoleLog(`[${timestamp}]`, ...args);
};

// 错误处理增强
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  // 不退出进程，让Jest处理
});

// 全局测试工具函数
global.testUtils = {
  /**
   * 等待指定时间
   */
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * 重试函数
   */
  retry: async (fn, maxRetries = 3, delay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        console.log(`🔄 Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
        await global.testUtils.sleep(delay);
      }
    }
  },

  /**
   * 检查网络连接
   */
  checkNetwork: async () => {
    try {
      const https = require('https');
      return new Promise((resolve) => {
        const req = https.request('https://www.google.com', { timeout: 5000 }, (res) => {
          resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => {
          req.destroy();
          resolve(false);
        });
        req.end();
      });
    } catch {
      return false;
    }
  },

  /**
   * 格式化文件大小
   */
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * 格式化持续时间
   */
  formatDuration: (ms) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}m`;
  }
};

// 测试开始前的全局设置
beforeAll(async () => {
  console.log('🔧 Jest回归测试环境初始化开始');

  // 检查网络连接
  const hasNetwork = await global.testUtils.checkNetwork();
  process.env.HAS_NETWORK = hasNetwork.toString();
  console.log(`🌐 网络连接状态: ${hasNetwork ? '✅' : '❌'}`);

  // 检查测试数据目录
  const fs = require('fs').promises;
  try {
    await fs.access(global.testConfig.testDataDir);
    console.log('📁 测试数据目录: ✅');
  } catch (error) {
    console.log('📁 测试数据目录: ❌', error.message);
  }

  // 设置全局错误处理
  const originalEmit = process.emit;
  process.emit = function (event, ...args) {
    if (event === 'warning') {
      // 过滤掉一些常见的警告
      const warning = args[0];
      if (warning && typeof warning === 'object') {
        if (warning.name === 'ExperimentalWarning') {
          return false; // 忽略实验性功能警告
        }
      }
    }
    return originalEmit.apply(this, [event, ...args]);
  };

  console.log('🔧 Jest回归测试环境初始化完成');
});

// 每个测试文件开始前的设置
beforeEach(() => {
  // 清理控制台
  if (!global.testConfig.verbose) {
    console.log = (...args) => {
      if (args[0] && args[0].includes('✅') ||
          args[0] && args[0].includes('❌') ||
          args[0] && args[0].includes('🎯')) {
        originalConsoleLog(...args);
      }
    };
  }
});

// 每个测试文件结束后的清理
afterEach(() => {
  // 恢复控制台
  console.log = originalConsoleLog;
});

// 全局清理
afterAll(() => {
  console.log('🧹 Jest回归测试环境清理完成');

  // 恢复process.emit
  if (process.emit.restore) {
    process.emit.restore();
  }

  // 强制垃圾回收（如果可用）
  if (global.gc) {
    global.gc();
  }
});

// Jest匹配器扩展
expect.extend({
  /**
   * 检查是否为有效的AVID格式
   */
  toBeValidAvid(received) {
    const avidPatterns = [
      /^[A-Z]+-\d+$/,           // IPX-177, ABP-123
      /^\d{6}-[A-Z]+$/,         // 130614-KEIKO
      /^\d{6}-\d+$/             // 082713-417
    ];

    const isValid = avidPatterns.some(pattern => pattern.test(received));

    if (isValid) {
      return {
        message: () => `expected ${received} not to be a valid AVID format`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid AVID format`,
        pass: false
      };
    }
  },

  /**
   * 检查是否为有效的URL
   */
  toBeValidUrl(received) {
    try {
      new URL(received);
      return {
        message: () => `expected ${received} not to be a valid URL`,
        pass: true
      };
    } catch {
      return {
        message: () => `expected ${received} to be a valid URL`,
        pass: false
      };
    }
  },

  /**
   * 检查测试结果是否成功
   */
  toBeSuccessfulTest(received) {
    if (!received || typeof received !== 'object') {
      return {
        message: () => `expected test result to be an object`,
        pass: false
      };
    }

    const isSuccess = received.success === true &&
                     (received.stats?.failedTests || 0) === 0 &&
                     (received.stats?.errorTests || 0) === 0;

    if (isSuccess) {
      return {
        message: () => `expected test result not to be successful`,
        pass: true
      };
    } else {
      return {
        message: () => `expected test result to be successful, but got: ${JSON.stringify(received)}`,
        pass: false
      };
    }
  },

  /**
   * 检查数据质量
   */
  toHaveGoodDataQuality(received) {
    if (!received || typeof received !== 'object') {
      return {
        message: () => `expected data to be an object`,
        pass: false
      };
    }

    const issues = [];

    // 检查必需字段
    if (!received.avid) issues.push('missing avid');
    if (!received.title) issues.push('missing title');
    if (!received.url) issues.push('missing url');

    // 检查数据类型
    if (received.genre && !Array.isArray(received.genre)) {
      issues.push('genre should be array');
    }
    if (received.actress && !Array.isArray(received.actress)) {
      issues.push('actress should be array');
    }

    const hasGoodQuality = issues.length === 0;

    if (hasGoodQuality) {
      return {
        message: () => `expected data not to have good quality`,
        pass: true
      };
    } else {
      return {
        message: () => `expected data to have good quality, but has issues: ${issues.join(', ')}`,
        pass: false
      };
    }
  }
});

// 导出测试工具（供其他文件使用）
module.exports = {
  testConfig: global.testConfig,
  testUtils: global.testUtils
};