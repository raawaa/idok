// Jest测试环境设置文件
// 在这里可以设置全局的测试辅助函数和mock

// 设置console.log在测试中的行为
global.console = {
  ...console,
  // 在测试中忽略某些console输出，保持输出整洁
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  // 保留info和debug用于调试
  info: console.info,
  debug: console.debug
};

// 设置测试环境变量
process.env.NODE_ENV = 'test';

// 全局测试超时设置
jest.setTimeout(10000);

// Mock Electron模块，避免在测试中引入Electron依赖
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/mock/path'),
    getName: jest.fn(() => 'idok-test')
  },
  dialog: {
    showOpenDialog: jest.fn(() => Promise.resolve({ canceled: false, filePaths: ['/mock/path'] })),
    showSaveDialog: jest.fn(() => Promise.resolve({ canceled: false, filePath: '/mock/path' }))
  },
  ipcMain: {
    on: jest.fn(),
    handle: jest.fn(),
    removeListener: jest.fn()
  },
  ipcRenderer: {
    on: jest.fn(),
    send: jest.fn(),
    invoke: jest.fn()
  }
}));

// 导入自定义匹配器
require('./utils/matchers');

// 导入测试工具
const {
  FilePathFactory,
  MovieInfoFactory,
  HttpResponseFactory,
  ConfigFactory
} = require('./utils/factories');

const {
  HttpMocker,
  FsMocker,
  DatabaseMocker,
  TestEnvironment
} = require('./utils/mocks');

// 全局的测试辅助函数
global.testHelpers = {
  // 创建模拟文件信息
  createMockFile: (name, size = 1024, modified = Date.now()) => ({
    name,
    size,
    modified,
    path: `/mock/path/${name}`
  }),

  // 创建模拟媒体数据
  createMockMedia: (overrides = {}) => ({
    title: 'Test Movie',
    actors: ['Actor 1', 'Actor 2'],
    genres: ['Genre 1', 'Genre 2'],
    studio: 'Test Studio',
    series: 'Test Series',
    releaseDate: '2024-01-01',
    coverImage: '/mock/cover.jpg',
    videoPath: '/mock/video.mp4',
    nfoPath: '/mock/video.nfo',
    ...overrides
  }),

  // 延迟函数，用于测试异步操作
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // 模拟文件系统操作
  mockFs: {
    existsSync: jest.fn(() => true),
    readFileSync: jest.fn(() => 'mock file content'),
    writeFileSync: jest.fn(),
    readdirSync: jest.fn(() => []),
    statSync: jest.fn(() => ({
      isFile: () => true,
      isDirectory: () => false,
      size: 1024,
      mtime: new Date()
    }))
  },

  // 测试数据工厂
  factories: {
    FilePathFactory,
    MovieInfoFactory,
    HttpResponseFactory,
    ConfigFactory
  },

  // 模拟工具
  mocks: {
    HttpMocker,
    FsMocker,
    DatabaseMocker,
    TestEnvironment
  }
};

// 每个测试后清理nock
afterEach(() => {
  const nock = require('nock');
  nock.cleanAll();
  nock.enableNetConnect();
});

// 全局测试环境管理
global.testEnv = new TestEnvironment();

// 在所有测试开始前设置环境
beforeAll(() => {
  global.testEnv.setup();
});

// 在所有测试结束后清理环境
afterAll(() => {
  global.testEnv.teardown();
});