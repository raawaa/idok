# Web Scraper 模块文档

## 概述

Web Scraper 模块是 idok 项目中用于网络数据抓取的核心组件，由 Claude Code 新增开发。该模块提供了完整的网络爬虫框架，支持多网站数据抓取、反爬虫应对、代理管理等功能。

## 架构设计

### 模块结构
```
src/shared/services/web-scraper/
├── index.js                    # 模块入口文件
├── base-scraper.js            # 基础抓取器类
├── javbus-scraper.js          # JavBus专用抓取器
├── web-scraper-manager.js     # 爬虫管理器
├── anti-bot-detector.js       # 反爬虫检测器
├── rate-limiter.js           # 速率限制器
├── proxy-manager.js          # 代理管理器
├── error-handler.js          # 错误处理器
├── utils.js                  # 工具函数
├── movie-info.js             # 影片信息模型
├── config.js                 # 配置文件
└── default-config.json       # 默认配置
```

### 核心特性

1. **事件驱动架构**: 所有组件基于 EventEmitter，支持异步事件处理
2. **模块化设计**: 各功能模块独立，易于扩展和维护
3. **反爬虫应对**: 多层次检测和应对机制
4. **代理支持**: 支持代理池管理和轮换
5. **速率限制**: 智能请求频率控制
6. **错误处理**: 统一的错误处理和重试机制

## 组件详解

### 1. BaseScraper (基础抓取器)

#### 功能说明
提供通用的网页抓取基础功能，是所有具体抓取器的父类。

#### 核心方法
- `constructor(options)`: 初始化抓取器，配置请求参数
- `fetch(url, options)`: 获取网页内容，支持重试机制
- `parse(html)`: 解析HTML内容，提取结构化数据
- `extractMetadata($)`: 提取页面元数据
- `handleError(error)`: 统一错误处理
- `getRandomUserAgent()`: 获取随机用户代理

#### 使用示例
```javascript
const BaseScraper = require('./base-scraper');

class MyScraper extends BaseScraper {
  async scrape(url) {
    const html = await this.fetch(url);
    const data = this.parse(html);
    return data;
  }
}
```

### 2. JavBusScraper (JavBus专用抓取器)

#### 功能说明
专门用于抓取 JavBus 网站的番号信息，继承自 BaseScraper。

#### 核心方法
- `search(code)`: 根据番号搜索影片信息
- `getMovieInfo(url)`: 获取影片详细信息
- `extractActors($)`: 提取演员信息
- `extractGenres($)`: 提取分类信息
- `extractStudio($)`: 提取制作商信息
- `extractCoverImage($)`: 提取封面图片URL

#### 数据格式
```javascript
{
  code: "ABC-123",
  title: "影片标题",
  actors: ["演员1", "演员2"],
  genres: ["分类1", "分类2"],
  studio: "制作商",
  releaseDate: "2024-01-01",
  coverImage: "封面URL",
  description: "描述信息"
}
```

### 3. WebScraperManager (爬虫管理器)

#### 功能说明
协调多个抓取器，提供统一的 API 接口，支持抓取器注册和自动选择。

#### 核心方法
- `constructor()`: 初始化管理器，注册可用抓取器
- `registerScraper(name, scraperClass)`: 注册新的抓取器
- `getScraper(name)`: 获取指定抓取器实例
- `scrape(code, options)`: 执行抓取任务，自动选择合适抓取器
- `getAvailableScrapers()`: 获取所有可用抓取器列表

#### 使用示例
```javascript
const manager = new WebScraperManager();

// 注册抓取器
manager.registerScraper('javbus', JavBusScraper);

// 执行抓取
const result = await manager.scrape('ABC-123', {
  sites: ['javbus'],
  timeout: 10000
});
```

### 4. AntiBotDetector (反爬虫检测器)

#### 功能说明
检测和应对各种反爬虫机制，提供多层次的检测能力。

#### 检测能力
- **CloudFlare 检测**: 识别 CloudFlare 挑战页面
- **reCAPTCHA 检测**: 识别人机验证页面
- **状态码检测**: 检测 403、429、503 等异常状态
- **响应头检测**: 识别反爬虫响应头标志
- **内容检测**: 识别页面中的反爬虫关键词
- **响应时间检测**: 检测异常响应时间

#### 检测结果格式
```javascript
{
  isBotDetected: true,
  detectionType: 'cloudflare',
  confidence: 0.9,
  details: {
    statusCode: { detected: true, code: 403 },
    headers: { detected: true, suspiciousHeaders: {...} },
    content: { detected: true, patterns: {...} }
  },
  recommendations: [
    '使用代理服务器',
    '增加请求延迟',
    '更换用户代理'
  ]
}
```

### 5. RateLimiter (速率限制器)

#### 功能说明
控制请求频率，避免触发反爬虫机制。

#### 核心方法
- `constructor(options)`: 初始化限制器，配置速率参数
- `acquire()`: 获取请求许可，支持排队机制
- `release()`: 释放请求许可
- `getQueueSize()`: 获取当前队列大小
- `reset()`: 重置限制器状态

#### 配置选项
```javascript
{
  maxRequests: 10,        // 最大并发请求数
  windowMs: 60000,        // 时间窗口（毫秒）
  queueSize: 100,         // 队列大小限制
  retryDelay: 1000        // 重试延迟（毫秒）
}
```

### 6. ProxyManager (代理管理器)

#### 功能说明
管理代理池，支持代理轮换和故障处理。

#### 核心方法
- `constructor(proxies)`: 初始化代理池
- `getProxy()`: 获取可用代理
- `markFailed(proxy)`: 标记代理失败
- `getStats()`: 获取代理使用统计

### 7. ErrorHandler (错误处理器)

#### 功能说明
统一处理爬虫过程中的各种错误，提供分类处理和重试机制。

#### 核心方法
- `handle(error, context)`: 处理错误，分类处理
- `isRetryable(error)`: 判断错误是否可重试
- `getRetryDelay(attempt)`: 获取重试延迟时间

### 8. Utils (工具函数)

#### 功能说明
提供番号相关的工具函数。

#### 主要函数
- `extractAvId(filename)`: 从文件名提取番号
- `normalizeAvId(code)`: 标准化番号格式
- `validateAvId(code)`: 验证番号格式有效性

### 9. MovieInfo (影片信息模型)

#### 功能说明
定义影片信息的数据结构。

#### 数据字段
- `code`: 番号
- `title`: 标题
- `actors`: 演员列表
- `genres`: 分类列表
- `studio`: 制作商
- `releaseDate`: 发布日期
- `coverImage`: 封面图片URL
- `description`: 描述信息

## 使用指南

### 基本使用

```javascript
const { WebScraperManager, JavBusScraper } = require('./src/shared/services/web-scraper');

// 创建管理器
const manager = new WebScraperManager();

// 注册抓取器
manager.registerScraper('javbus', JavBusScraper);

// 执行抓取
async function scrapeMovie(code) {
  try {
    const result = await manager.scrape(code, {
      sites: ['javbus'],
      timeout: 30000,
      useProxy: true,
      retryCount: 3
    });
    
    console.log('抓取结果:', result);
    return result;
  } catch (error) {
    console.error('抓取失败:', error);
    throw error;
  }
}

// 使用示例
scrapeMovie('ABC-123').then(result => {
  console.log('影片信息:', result);
});
```

### 高级配置

```javascript
const config = {
  // 反爬虫检测配置
  antiBot: {
    enabled: true,
    confidenceThreshold: 0.7,
    autoHandle: true
  },
  
  // 速率限制配置
  rateLimit: {
    maxRequests: 5,
    windowMs: 60000,
    retryDelay: 2000
  },
  
  // 代理配置
  proxy: {
    enabled: true,
    rotation: true,
    timeout: 10000
  },
  
  // 重试配置
  retry: {
    maxRetries: 3,
    backoffMultiplier: 2,
    maxDelay: 30000
  }
};

const manager = new WebScraperManager(config);
```

## 错误处理

### 错误类型

1. **网络错误**: 连接超时、DNS 解析失败等
2. **反爬虫错误**: 被目标网站拦截
3. **解析错误**: HTML 解析失败、选择器无效
4. **验证错误**: 番号格式无效、数据不完整

### 错误处理示例

```javascript
try {
  const result = await manager.scrape('ABC-123');
} catch (error) {
  switch (error.type) {
    case 'NETWORK_ERROR':
      console.log('网络错误，请检查连接');
      break;
    case 'ANTI_BOT_DETECTED':
      console.log('检测到反爬虫，更换代理重试');
      break;
    case 'PARSE_ERROR':
      console.log('解析错误，网站结构可能已变更');
      break;
    case 'VALIDATION_ERROR':
      console.log('数据验证失败:', error.details);
      break;
    default:
      console.log('未知错误:', error.message);
  }
}
```

## 性能优化

### 最佳实践

1. **合理设置速率限制**: 避免过于频繁的请求
2. **使用代理轮换**: 降低被封 IP 的风险
3. **启用缓存机制**: 避免重复抓取相同内容
4. **并发控制**: 合理控制并发请求数量
5. **错误重试**: 设置适当的重试机制和退避策略

### 性能监控

```javascript
// 监听性能事件
manager.on('requestStart', (url) => {
  console.log(`开始请求: ${url}`);
});

manager.on('requestEnd', (url, duration) => {
  console.log(`请求完成: ${url}, 耗时: ${duration}ms`);
});

manager.on('antiBotDetected', (result) => {
  console.log('检测到反爬虫:', result);
});
```

## 扩展开发

### 添加新的抓取器

```javascript
const BaseScraper = require('./base-scraper');

class MyScraper extends BaseScraper {
  constructor(options = {}) {
    super(options);
    this.baseUrl = 'https://example.com';
  }
  
  async search(code) {
    const searchUrl = `${this.baseUrl}/search/${code}`;
    const html = await this.fetch(searchUrl);
    return this.parse(html);
  }
  
  parse(html) {
    const $ = this.loadCheerio(html);
    
    return {
      code: this.extractCode($),
      title: this.extractTitle($),
      actors: this.extractActors($),
      // ... 其他字段
    };
  }
  
  extractCode($) {
    return $('h1').text().trim();
  }
  
  extractTitle($) {
    return $('.title').text().trim();
  }
  
  extractActors($) {
    return $('.actor').map((i, el) => $(el).text()).get();
  }
}

// 注册新抓取器
manager.registerScraper('myscraper', MyScraper);
```

### 添加自定义检测规则

```javascript
const antiBotDetector = new AntiBotDetector();

// 添加自定义内容检测规则
antiBotDetector.addContentRule('myrule', /自定义检测模式/i);

// 添加自定义响应头检测
antiBotDetector.addHeaderRule('x-custom-header', /blocked/i);
```

## 测试

### 单元测试

```bash
# 运行爬虫模块测试
npm test -- tests/unit/web-scraper.test.js

# 运行特定测试
npm test -- --testNamePattern="AntiBotDetector"
```

### 集成测试

```bash
# 运行集成测试
npm test -- tests/integration/web-scraper-integration.test.js
```

## 配置参考

### 默认配置 (default-config.json)

```json
{
  "request": {
    "timeout": 30000,
    "retryCount": 3,
    "retryDelay": 1000
  },
  "rateLimit": {
    "enabled": true,
    "maxRequests": 10,
    "windowMs": 60000
  },
  "antiBot": {
    "enabled": true,
    "confidenceThreshold": 0.7
  },
  "proxy": {
    "enabled": false,
    "rotation": true
  }
}
```

## 更新日志

### v1.0.0 (Claude Code 新增)
- ✨ 创建 Web Scraper 模块
- ✨ 实现 BaseScraper 基础类
- ✨ 实现 JavBusScraper 专用抓取器
- ✨ 实现 WebScraperManager 管理器
- ✨ 实现 AntiBotDetector 反爬虫检测器
- ✨ 实现 RateLimiter 速率限制器
- ✨ 实现 ProxyManager 代理管理器
- ✨ 实现 ErrorHandler 错误处理器
- ✨ 提供完整的工具函数集
- ✨ 建立完善的测试覆盖

## 注意事项

1. **法律合规**: 使用爬虫时请遵守目标网站的 robots.txt 和服务条款
2. **道德规范**: 避免对目标网站造成过大负载
3. **隐私保护**: 妥善处理抓取到的个人信息
4. **错误处理**: 始终做好异常处理和错误恢复
5. **性能优化**: 合理设置请求频率和并发数

## 相关文档

- [项目主文档](../README.md)
- [代码库概览](../project_codebase.md)
- [JavSP 集成规划](../project_javsp_integration_plan.md)
- [测试文档](../tests/README.md)