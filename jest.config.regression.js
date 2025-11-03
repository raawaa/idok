/**
 * Jest回归测试配置
 * 专门为JavSP风格回归测试优化的Jest配置
 */

const path = require('path');

module.exports = {
  // 测试环境
  testEnvironment: 'node',

  // 测试文件匹配模式
  testMatch: [
    '<rootDir>/tests/integration/**/*.test.js'
  ],

  // 覆盖率收集
  collectCoverage: true,
  collectCoverageFrom: [
    'src/shared/services/web-scraper/**/*.js',
    '!src/shared/services/web-scraper/**/*.test.js',
    '!**/node_modules/**'
  ],

  // 覆盖率报告格式
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],

  // 覆盖率输出目录
  coverageDirectory: 'coverage/regression',

  // 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    }
  },

  // 测试设置文件
  setupFilesAfterEnv: [
    '<rootDir>/tests/integration/jest.setup.js'
  ],

  // 测试超时
  testTimeout: 60000, // 60秒

  // 最大并发工作进程数
  maxWorkers: 2, // 限制并发数避免网络请求过多

  // 串行运行测试（避免网络请求冲突）
  runInBand: true,

  // 详细输出
  verbose: true,

  // 测试结果处理器
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './tests/integration/reports',
        filename: 'jest-regression-report.html',
        expand: true
      }
    ],
    [
      'jest-junit',
      {
        outputDirectory: './tests/integration/reports',
        outputName: 'junit-regression.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true
      }
    ]
  ],

  // 全局变量
  globals: {
    'process.env.NODE_ENV': 'test',
    'process.env.HTTP_PROXY': 'http://127.0.0.1:10809',
    'process.env.HTTPS_PROXY': 'http://127.0.0.1:10809'
  },

  // 模块路径映射
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },

  // 模块文件扩展名
  moduleFileExtensions: [
    'js',
    'json',
    'node'
  ],

  // 忽略的路径
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
    '<rootDir>/coverage/'
  ],

  // 转换忽略模式
  transformIgnorePatterns: [
    'node_modules/(?!(cloudscraper)/)'
  ],

  // 清除模拟
  clearMocks: true,

  // 重置模拟
  resetMocks: true,

  // 恢复模拟
  restoreMocks: true,

  // 错误时停止
  bail: false, // 不在第一个失败时停止，运行所有测试

  // 最大工作进程
  maxConcurrency: 1, // 回归测试串行执行更稳定

  // 检测打开的句柄
  detectOpenHandles: true,

  // 检测泄漏
  forceExit: false, // 让测试自然退出

  // 错误时收集覆盖率
  collectCoverageOnlyFrom: undefined,

  // 通知配置
  notify: false,
  notifyMode: 'failure-change',

  // 项目配置（多项目模式）
  projects: [
    {
      displayName: 'Web Scraper Regression Tests',
      testMatch: ['<rootDir>/tests/integration/regression.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/integration/jest.setup.js'],
      testTimeout: 120000, // 回归测试需要更长时间
      maxWorkers: 1,
      runInBand: true
    },
    {
      displayName: 'Web Scraper Unit Tests',
      testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
      testTimeout: 30000,
      maxWorkers: 2
    }
  ]
};