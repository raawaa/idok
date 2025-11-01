module.exports = {
  // 测试环境配置
  testEnvironment: 'node',
  
  // 测试文件匹配模式
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  
  // 覆盖率收集配置
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/electron/**', // 排除Electron相关文件
    '!**/node_modules/**',
    '!**/coverage/**'
  ],
  
  // 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // 测试超时时间
  testTimeout: 10000,
  
  // 详细的测试输出
  verbose: true,
  
  // 设置文件
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // 模块路径映射
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@services/(.*)$': '<rootDir>/src/shared/services/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1'
  }
};