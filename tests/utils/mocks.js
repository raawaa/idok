/**
 * 模拟工具函数
 * 提供HTTP请求、文件系统等的模拟功能
 */

const nock = require('nock');

/**
 * HTTP请求模拟器
 */
class HttpMocker {
  constructor() {
    this.activeMocks = [];
  }

  /**
   * 模拟JavBus搜索页面
   */
  mockJavBusSearch(avId, responseOverrides = {}) {
    const { HttpResponseFactory } = require('./factories');
    const mockResponse = HttpResponseFactory.javbusResponse(avId, responseOverrides);

    const scope = nock('https://www.javbus.com')
      .get(`/${avId}`)
      .reply(mockResponse.status, mockResponse.data, mockResponse.headers);

    this.activeMocks.push(scope);
    return scope;
  }

  /**
   * 模拟封面图片请求
   */
  mockCoverImage(imageUrl, statusCode = 200) {
    const url = new URL(imageUrl);
    const mockData = Buffer.from('fake-image-data');

    const scope = nock(url.origin)
      .get(url.pathname)
      .reply(statusCode, mockData, {
        'Content-Type': 'image/jpeg',
        'Content-Length': mockData.length
      });

    this.activeMocks.push(scope);
    return scope;
  }

  /**
   * 模拟404错误
   */
  mockNotFound(url) {
    const scope = nock('https://www.javbus.com')
      .get(url)
      .reply(404, 'Not Found');

    this.activeMocks.push(scope);
    return scope;
  }

  /**
   * 模拟网络错误
   */
  mockNetworkError(url) {
    const scope = nock('https://www.javbus.com')
      .get(url)
      .replyWithError('Network Error');

    this.activeMocks.push(scope);
    return scope;
  }

  /**
   * 模拟超时
   */
  mockTimeout(url) {
    const scope = nock('https://www.javbus.com')
      .get(url)
      .delayConnection(30000) // 30秒延迟导致超时
      .reply(200, 'Delayed Response');

    this.activeMocks.push(scope);
    return scope;
  }

  /**
   * 清理所有模拟
   */
  cleanup() {
    nock.cleanAll();
    this.activeMocks = [];
  }

  /**
   * 检查是否所有模拟都被使用
   */
  verifyAll() {
    this.activeMocks.forEach(scope => scope.done());
  }
}

/**
 * 文件系统模拟器
 */
class FsMocker {
  constructor() {
    this.files = new Map();
    this.directories = new Set();
  }

  /**
   * 添加模拟文件
   */
  addFile(filePath, content = 'mock file content') {
    this.files.set(filePath, {
      content,
      stats: {
        isFile: () => true,
        isDirectory: () => false,
        size: content.length,
        mtime: new Date(),
        atime: new Date(),
        ctime: new Date()
      }
    });
  }

  /**
   * 添加模拟目录
   */
  addDirectory(dirPath) {
    this.directories.add(dirPath);
  }

  /**
   * 检查文件是否存在
   */
  existsSync(filePath) {
    return this.files.has(filePath) || this.directories.has(filePath);
  }

  /**
   * 读取文件
   */
  readFileSync(filePath, encoding) {
    const file = this.files.get(filePath);
    if (file) {
      return encoding === 'utf8' ? file.content : Buffer.from(file.content);
    }
    throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
  }

  /**
   * 获取文件状态
   */
  statSync(filePath) {
    const file = this.files.get(filePath);
    if (file) {
      return file.stats;
    }

    if (this.directories.has(filePath)) {
      return {
        isFile: () => false,
        isDirectory: () => true,
        size: 0,
        mtime: new Date(),
        atime: new Date(),
        ctime: new Date()
      };
    }

    throw new Error(`ENOENT: no such file or directory, stat '${filePath}'`);
  }

  /**
   * 读取目录
   */
  readdirSync(dirPath) {
    if (!this.directories.has(dirPath)) {
      throw new Error(`ENOENT: no such file or directory, scandir '${dirPath}'`);
    }

    const entries = [];
    const prefix = dirPath.endsWith('/') ? dirPath : dirPath + '/';

    // 添加子目录
    for (const dir of this.directories) {
      if (dir.startsWith(prefix) && dir !== dirPath) {
        const relativePath = dir.substring(prefix.length);
        const firstLevel = relativePath.split('/')[0];
        if (!entries.includes(firstLevel)) {
          entries.push(firstLevel);
        }
      }
    }

    // 添加文件
    for (const [filePath] of this.files) {
      if (filePath.startsWith(prefix)) {
        const relativePath = filePath.substring(prefix.length);
        const firstLevel = relativePath.split('/')[0];
        if (!entries.includes(firstLevel)) {
          entries.push(firstLevel);
        }
      }
    }

    return entries;
  }

  /**
   * 清理所有模拟
   */
  cleanup() {
    this.files.clear();
    this.directories.clear();
  }
}

/**
 * 数据库模拟器
 */
class DatabaseMocker {
  constructor() {
    this.data = new Map();
    this.collections = new Map();
  }

  /**
   * 添加模拟数据
   */
  addData(key, value) {
    this.data.set(key, value);
  }

  /**
   * 获取数据
   */
  getData(key) {
    return this.data.get(key);
  }

  /**
   * 添加集合数据
   */
  addCollection(name, items) {
    this.collections.set(name, items);
  }

  /**
   * 获取集合数据
   */
  getCollection(name) {
    return this.collections.get(name) || [];
  }

  /**
   * 模拟数据库操作
   */
  createMockDb() {
    return {
      get: (key) => Promise.resolve(this.getData(key)),
      set: (key, value) => {
        this.addData(key, value);
        return Promise.resolve();
      },
      delete: (key) => {
        this.data.delete(key);
        return Promise.resolve();
      },
      clear: () => {
        this.data.clear();
        return Promise.resolve();
      },
      getAll: () => Promise.resolve(Object.fromEntries(this.data))
    };
  }

  /**
   * 清理所有数据
   */
  cleanup() {
    this.data.clear();
    this.collections.clear();
  }
}

/**
 * 测试环境设置器
 */
class TestEnvironment {
  constructor() {
    this.httpMocker = new HttpMocker();
    this.fsMocker = new FsMocker();
    this.dbMocker = new DatabaseMocker();
    this.originalConsole = console;
  }

  /**
   * 设置测试环境
   */
  setup() {
    // 模拟console输出，保持测试输出整洁
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();

    // 设置环境变量
    process.env.NODE_ENV = 'test';
  }

  /**
   * 恢复原始环境
   */
  teardown() {
    // 恢复console
    Object.assign(console, this.originalConsole);

    // 清理模拟
    this.httpMocker.cleanup();
    this.fsMocker.cleanup();
    this.dbMocker.cleanup();

    // 恢复环境变量
    delete process.env.NODE_ENV;
  }

  /**
   * 创建测试用的配置
   */
  createTestConfig(overrides = {}) {
    return {
      timeout: 5000,
      maxRetries: 1,
      testMode: true,
      ...overrides
    };
  }
}

module.exports = {
  HttpMocker,
  FsMocker,
  DatabaseMocker,
  TestEnvironment
};