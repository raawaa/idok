# 代码库函数概览

## 项目概述
iDok 是一个基于 Electron 的番号管理应用，主要用于扫描、识别和管理番号相关的媒体文件。项目采用现代化的前端技术栈，包括 Electron、HTML、CSS 和 JavaScript。当前已完成限制性第一阶段开发，建立了完整的测试基础设施和核心服务层。

## 架构分层原则

### 1. 主进程专属服务 (Main Process Services)
- **位置**: `src/main/services/`
- **特点**: 仅限主进程调用，可访问Node.js原生模块
- **包含**: 文件系统操作、系统级服务

### 2. 共享服务层 (Shared Services)
- **位置**: `src/shared/services/`
- **特点**: 主进程和渲染进程都可调用，业务逻辑核心
- **包含**: 数据库操作、媒体扫描、番号识别

### 3. 渲染进程服务 (Renderer Process Services)
- **位置**: `src/renderer/services/`
- **特点**: 仅限渲染进程调用，UI相关逻辑
- **包含**: UI状态管理、用户交互处理

## 服务层详细说明

### 共享服务层 (Shared Services)

#### DatabaseService (数据库服务)
- **文件位置**: `src/shared/services/database-service.js`
- **核心功能**: JSON文件存储，提供数据持久化能力
- **主要方法**:
  - `constructor(dataPath)` - 初始化数据库服务，指定数据存储路径
  - `init()` - 初始化数据库文件和目录结构
  - `loadData()` - 从JSON文件加载数据
  - `saveData()` - 将数据保存到JSON文件
  - `addFile(fileData)` - 添加文件记录到数据库
  - `getFile(filePath)` - 根据文件路径获取文件记录
  - `updateFile(filePath, updates)` - 更新文件记录
  - `deleteFile(filePath)` - 删除文件记录
  - `getAllFiles()` - 获取所有文件记录
  - `findByCode(code)` - 根据番号查找文件
  - `clear()` - 清空数据库

#### MediaScannerService (媒体扫描服务 - 新架构)
- **文件位置**: `src/shared/services/media-scanner-service.js`
- **核心功能**: 扫描媒体文件，识别番号，分层扫描策略
- **主要方法**:
  - `constructor(databaseService, javspService)` - 初始化扫描服务，依赖数据库和JavSP服务
  - `scanDirectory(directoryPath, options)` - 扫描指定目录，支持缓存选项
  - `scanFile(filePath)` - 扫描单个文件
  - `isVideoFile(filePath)` - 判断是否为视频文件
  - `extractCodeFromPath(filePath)` - 从文件路径提取番号
  - `shouldIgnoreFile(filePath)` - 判断是否应该忽略该文件
  - `getFileHash(filePath)` - 计算文件哈希值
  - `hasFileChanged(filePath)` - 检查文件是否发生变化
  - `processStandaloneVideos(videoFiles)` - 处理独立视频文件，调用JavSP进行番号识别
  - `scanDirectory(directoryPath, options)` - 增强扫描方法，支持Kodi标准和独立文件处理

### 扫描结果缓存机制

#### 数据库服务导入修复
- **问题**: `TypeError: DatabaseService is not a constructor`
- **原因**: 错误的导入语法（使用了解构导入而不是默认导入）
- **修复**: 修改导入语句 `const { DatabaseService }` → `const DatabaseService`
- **增强**: 支持动态路径配置，优雅处理Electron不可用的情况
**功能概述**: 使用JSON数据库存储扫描结果，结合文件变化检测避免重复扫描
**核心方法**:
- `saveScanCache(scanPath, data)` - 保存扫描缓存（包含文件指纹）
- `getScanCache(scanPath)` - 获取扫描缓存
- `isScanCacheValid(scanPath)` - 验证缓存有效性（时间+文件指纹）
- `hasDirectoryChanged(scanPath)` - 检测目录文件变化
- `generateDirectoryFingerprint(scanPath)` - 生成目录文件指纹
- `scanDirectory(directoryPath, options)` - 增强扫描方法（缓存+变化检测）
- `scanDirectories(directoryPaths)` - 批量扫描（带性能统计）

**性能提升**:
- 秒级扫描时间 → 毫秒级缓存加载（缓存命中时）
- 启动速度提升 80%+
- 智能文件变化检测，避免无效缓存
- 实时性能监控和缓存命中率统计

#### JavSPService (JavSP番号识别服务)
- **文件位置**: `src/shared/services/javsp-service.js`
- **核心功能**: 番号识别和验证，支持多种番号格式，集成JavSP进行智能番号识别
- **主要方法**:
  - `constructor()` - 初始化JavSP服务，支持真实模式和模拟模式
  - `detectCode(filePath)` - 检测单个文件的番号，支持智能降级机制
  - `detectCodes(filePaths)` - 批量检测多个文件的番号，支持并行处理
  - `validateCode(code)` - 验证番号格式是否正确
  - `isStandardCode(code)` - 判断是否为标准番号格式
  - `isFC2Code(code)` - 判断是否为FC2番号格式
  - `isHeydougaCode(code)` - 判断是否为Hey動画番号格式
  - `isSimulationMode()` - 判断是否处于模拟模式
  - `getMockResult()` - 获取模拟识别结果

### 主进程专属服务 (Main Process Services)

#### FileService (文件服务)
- **文件位置**: `src/main/services/file-service.js`
- **核心功能**: 文件系统操作，路径安全验证
- **主要方法**:
  - `isValidPath(path)` - 验证路径是否安全
  - `isVideoFile(filename)` - 判断是否为视频文件
  - `readSettings()` - 读取应用设置
  - `writeSettings(settings)` - 写入应用设置
  - `getCoverImage(videoPath)` - 获取视频封面图片路径

#### MediaService (媒体服务 - 基于NFO)
- **文件位置**: `src/main/services/media-service.js`
- **核心功能**: 基于NFO文件的媒体信息解析，繁简转换，支持智能缓存机制
- **主要方法**:
  - `scanDirectory(dirPath)` - 扫描目录（支持缓存机制）
  - `scanMediaDirectories(directoryPaths, options)` - 批量扫描媒体目录，支持缓存和文件变化检测
  - `parseNfoFile(nfoPath)` - 解析NFO文件
  - `extractVideoInfo(videoPath)` - 提取视频信息
  - `convertTraditionalToSimplified(text)` - 繁体转简体
  - `getVideoMetadata(videoPath)` - 获取视频元数据
  - `saveScanCache(scanPath, data)` - 保存扫描缓存（包含文件指纹）
  - `getScanCache(scanPath)` - 获取扫描缓存
  - `isScanCacheValid(scanPath)` - 验证缓存有效性（时间+文件指纹）
  - `hasDirectoryChanged(scanPath)` - 检测目录文件变化
  - `generateDirectoryFingerprint(scanPath)` - 生成目录文件指纹

**缓存机制特点**:
- 基于文件指纹的智能缓存验证
- 毫秒级缓存加载 vs 秒级完整扫描
- 实时缓存命中率统计
- 文件变化自动检测和重新扫描
- 性能提升80%+（缓存命中时）

#### AVIDDetector (AVID番号检测器)
- **文件位置**: `src/main/services/javsp-detector/avid-detector.js`
- **核心功能**: 从文件路径中提取番号，支持多种番号格式识别
- **主要方法**:
  - `constructor()` - 初始化检测器
  - `get_id(path)` - 从文件路径中提取番号ID
  - `get_cid(path)` - 提取内容ID
  - `is_valid_avid(avid)` - 验证番号格式是否有效
  - `extract_fc2_id(path)` - 提取FC2番号
  - `extract_heydouga_id(path)` - 提取HEYDOUGA番号
  - `extract_getchu_id(path)` - 提取GETCHU番号
  - `extract_standard_id(path)` - 提取标准番号格式

**支持的番号格式**:
- **FC2格式**: `FC2-PPV-1234567`, `fc2-ppv-1234567`
- **HEYDOUGA格式**: `HEYDOUGA-4017-123`, `HEY-4017-123`
- **GETCHU格式**: `GETCHU-123456`, `getchu-123456`
- **标准番号**: `ABC-123`, `ABCD-1234`, `ABCDE-12345`
- **特殊番号**: `259LUXU-1234`, `MUGEN-001`, `IBW-123`

**格式验证规则**:
- **FC2**: 7位数字，支持PPV后缀
- **HEYDOUGA**: 4位年份 + 3-5位数字，支持HEY缩写
- **标准番号**: 2-5位字母 + 2-5位数字，严格长度限制
- **特殊处理**: 防止OTHER前缀误识别为HEYDOUGA

**测试覆盖**:
- ✅ 19个测试用例，涵盖所有番号格式
- ✅ 边界情况和错误处理
- ✅ 性能测试（批量处理性能）
- ✅ 复杂文件名处理能力

### 网络爬虫服务层 (Web Scraper Services)

#### Web Scraper模块架构
- **模块位置**: `src/shared/services/web-scraper/`
- **设计目标**: 提供可扩展的网络爬虫框架，支持多网站数据抓取
- **核心特性**: 事件驱动、模块化设计、反爬虫应对、代理支持、速率限制

#### BaseScraper (基础抓取器)
- **文件位置**: `src/shared/services/web-scraper/base-scraper.js`
- **核心功能**: 提供通用的网页抓取基础功能，集成Python JavSP错误处理机制
- **主要方法**:
  - `constructor(options)` - 初始化抓取器，配置请求参数
  - `fetch(url, options)` - 获取网页内容，支持重试机制
  - `parse(html)` - 解析HTML内容，提取结构化数据
  - `extractMetadata($)` - 提取页面元数据
  - `handleError(error)` - 统一错误处理
  - `getRandomUserAgent()` - 获取随机用户代理
  - `requestWithAxios(url, options)` - Axios请求实现，集成高级错误处理
  - `requestWithCloudScraper(url, options)` - CloudScraper请求实现，处理反爬虫
  - `request(url, options)` - 统一请求方法，智能重试和错误分类

**错误处理机制**:
- **CrawlerError**: 基础爬虫错误类，继承自Error
- **MovieNotFoundError**: 404错误，影片未找到，不重试
- **MovieDuplicateError**: 影片重复错误
- **SiteBlocked**: 403/503错误，站点阻止访问，不重试
- **SitePermissionError**: 401错误，权限不足，不重试
- **CredentialError**: 认证相关错误
- **WebsiteError**: 网站内部错误（5xx状态码）
- **OtherError**: 其他未分类错误

**智能重试策略**:
- MovieNotFoundError、SiteBlocked、CredentialError等特定异常不重试
- 网络错误和临时性错误支持重试机制
- CloudFlare检测和专门处理（验证码、挑战失败）

### 测试覆盖
- 所有47个测试用例100%通过
- 包括初始化、URL处理、Cookie管理、缓存管理、HTTP请求、HTML解析、编码处理、错误处理等测试

#### JavBusScraper (JavBus专用抓取器)
- **文件位置**: `src/shared/services/web-scraper/javbus-scraper.js`
- **核心功能**: 专门用于抓取JavBus网站的番号信息，支持头像过滤、无码影片检测、高清大图提取、磁力链接提取、用户评分评论提取、相关影片推荐、批量处理和搜索功能
- **主要方法**:
  - `search(code)` - 根据番号搜索影片信息
  - `scrapeMovie(url)` - 抓取影片详细信息
  - `getMovieDetails(avid)` - 获取影片详细信息，整合所有新功能
  - `extractBasicInfo($, movieInfo)` - 提取基础信息（标题、番号、日期等）
  - `extractActressInfo($, movieInfo)` - 提取演员信息，过滤默认头像`nowprinting.gif`
  - `extractGenreInfo($, movieInfo)` - 提取分类信息，检测无码影片（通过URL中的`uncensored`标识）
  - `extractProductionInfo($, movieInfo)` - 提取制作信息（导演、片商、标签等）
  - `extractImageInfo($, movieInfo)` - 提取图片信息（封面、预览图、高清大图）
  - `extractMagnetLinks($, movieInfo)` - 提取磁力链接信息（高清、标清、无码等）
  - `extractUserRating($, movieInfo)` - 提取用户评分信息
  - `extractReviews($, movieInfo)` - 提取用户评论信息
  - `extractRelatedMovies($, movieInfo)` - 提取相关影片推荐
  - `getMoviesBatch(avids, options)` - 批量获取影片信息，支持并发处理
  - `searchMovies(keyword, options)` - 按关键词搜索影片
  - `parseDate(dateStr)` - 解析日期字符串
  - `parseRuntime(runtimeStr)` - 解析时长字符串
  - `parseScore(scoreStr)` - 解析评分字符串

**特色功能**:
- **头像过滤**: 自动过滤演员默认头像`nowprinting.gif`
- **无码检测**: 通过分类URL检测无码影片，自动设置`movieInfo.uncensored = true`
- **高清大图提取**: 支持多种高清图片源的选择和提取
- **磁力链接提取**: 实现多种磁力链接识别和分类（高清、标清、无码等）
- **用户评分提取**: 支持用户评分提取和格式转换
- **评论提取**: 实现评论内容、标题、评论者等信息的提取
- **相关影片推荐**: 构建完整的推荐影片数据结构
- **批量处理**: 支持并发抓取和智能重试机制
- **搜索功能**: 支持关键词搜索和过滤条件
- **数据完整性**: 全面的影片信息提取，包括演员、分类、制作信息、图片等

#### WebScraperManager (爬虫管理器)
- **文件位置**: `src/shared/services/web-scraper/web-scraper-manager.js`
- **核心功能**: 协调多个抓取器，提供统一的API接口
- **主要方法**:
  - `constructor()` - 初始化管理器，注册可用抓取器
  - `registerScraper(name, scraperClass)` - 注册新的抓取器
  - `getScraper(name)` - 获取指定抓取器实例
  - `scrape(code, options)` - 执行抓取任务，自动选择合适抓取器
  - `getAvailableScrapers()` - 获取所有可用抓取器列表

## 测试基础设施

### 测试工具类 (tests/utils/)

#### TestDataManager (测试数据管理器)
- **文件位置**: `tests/utils/test-data-manager.js`
- **核心功能**: 管理测试基准数据，支持JSON数据存储和加载
- **主要方法**:
  - `constructor(dataDir)` - 初始化数据管理器，指定数据目录
  - `init()` - 初始化数据目录结构
  - `loadBaselineData(code, scraper)` - 加载指定番号和抓取器的基准数据
  - `saveBaselineData(code, scraper, data)` - 保存基准数据到JSON文件
  - `hasBaselineData(code, scraper)` - 检查是否存在基准数据
  - `getTestCodes()` - 获取所有测试番号列表
  - `getSupportedScrapers()` - 获取支持的抓取器列表
  - `generateTestParams()` - 生成测试参数组合
  - `cleanupBaselineData()` - 清理基准数据文件

#### DataComparator (数据比较器)
- **文件位置**: `tests/utils/data-comparator.js`
- **核心功能**: 对比在线抓取结果与基准数据，智能字段比较
- **主要方法**:
  - `normalizeField(value)` - 标准化字段值（去除空白、统一大小写）
  - `compareUrls(url1, url2)` - 比较URL路径（忽略协议和主机）
  - `compareArrays(arr1, arr2, options)` - 比较数组（支持顺序忽略）
  - `compareDates(date1, date2)` - 比较日期（支持多种格式）
  - `compareObjects(obj1, obj2, fieldMap)` - 比较对象（支持字段映射）
  - `getFieldMapping()` - 获取字段映射规则
  - `compareResults(actual, expected, options)` - 比较抓取结果
  - `generateComparisonReport(actual, expected, differences)` - 生成比较报告

#### TestReporter (测试报告生成器)
- **文件位置**: `tests/utils/test-reporter.js`
- **核心功能**: 管理测试会话，生成多格式测试报告
- **主要方法**:
  - `constructor()` - 初始化测试报告器
  - `startTestSession(name)` - 开始新的测试会话
  - `recordTestResult(testName, status, details)` - 记录测试结果
  - `executeTest(testName, testFn, options)` - 执行测试（支持重试和超时）
  - `recordError(testName, error, context)` - 记录错误详情
  - `generateSummary()` - 生成测试汇总统计
  - `generateJsonReport()` - 生成JSON格式报告
  - `generateHtmlReport()` - 生成HTML格式报告
  - `generateTextReport()` - 生成文本格式报告
  - `formatConsoleOutput()` - 格式化控制台输出

#### 测试模拟工具 (tests/utils/mocks.js)
- **文件位置**: `tests/utils/mocks.js`
- **核心功能**: 提供HTTP请求模拟、文件系统模拟、数据库模拟
- **主要类**:
  - **HttpMocker**: HTTP请求模拟器，使用nock库
    - `mockJavBusSearchPage()` - 模拟JavBus搜索页面
    - `mockCoverImage()` - 模拟封面图片请求
    - `mock404Error()` - 模拟404错误
    - `mockNetworkError()` - 模拟网络错误
    - `mockTimeout()` - 模拟请求超时
  - **FsMocker**: 文件系统模拟器
    - `mockFileExists()` - 模拟文件存在
    - `mockFileNotExists()` - 模拟文件不存在
    - `mockDirectory()` - 模拟目录结构
  - **DatabaseMocker**: 数据库模拟器
    - `mockDatabase()` - 模拟数据库操作
    - `mockQuery()` - 模拟数据库查询
  - **TestEnvironment**: 测试环境管理器
    - `setup()` - 设置测试环境
    - `cleanup()` - 清理测试环境

#### AntiBotDetector (反爬虫检测器)
- **文件位置**: `src/shared/services/web-scraper/anti-bot-detector.js`
- **核心功能**: 检测和应对各种反爬虫机制
- **检测能力**:
  - **CloudFlare检测**: 识别CloudFlare挑战页面
  - **reCAPTCHA检测**: 识别人机验证页面
  - **状态码检测**: 检测403、429、503等异常状态
  - **响应头检测**: 识别反爬虫响应头标志
  - **内容检测**: 识别页面中的反爬虫关键词
  - **响应时间检测**: 检测异常响应时间
- **主要方法**:
  - `detect(response, options)` - 执行完整的反爬虫检测
  - `checkStatusCode(statusCode, result)` - 检测异常状态码
  - `checkHeaders(headers, result)` - 检测可疑响应头
  - `checkContent(content, result)` - 检测页面内容中的反爬虫标志
  - `generateRecommendations(result)` - 生成应对建议

#### RateLimiter (速率限制器)
- **文件位置**: `src/shared/services/web-scraper/rate-limiter.js`
- **核心功能**: 控制请求频率，避免触发反爬虫
- **主要方法**:
  - `constructor(options)` - 初始化限制器，配置速率参数
  - `acquire()` - 获取请求许可，支持排队机制
  、 `release()` - 释放请求许可
  - `getQueueSize()` - 获取当前队列大小
  - `reset()` - 重置限制器状态

#### ProxyManager (代理管理器)
- **文件位置**: `src/shared/services/web-scraper/proxy-manager.js`
- **核心功能**: 管理代理池，支持代理轮换
- **主要方法**:
  - `constructor(proxies)` - 初始化代理池
  - `getProxy()` - 获取可用代理
  - `markFailed(proxy)` - 标记代理失败
  - `getStats()` - 获取代理使用统计

#### ErrorHandler (错误处理器)
- **文件位置**: `src/shared/services/web-scraper/error-handler.js`
- **核心功能**: 统一处理爬虫过程中的各种错误
- **主要方法**:
  - `handle(error, context)` - 处理错误，分类处理
  - `isRetryable(error)` - 判断错误是否可重试
  - `getRetryDelay(attempt)` - 获取重试延迟时间

#### Utils (工具函数)
- **文件位置**: `src/shared/services/web-scraper/utils.js`
- **核心功能**: 提供番号相关的工具函数
- **主要函数**:
  - `extractAvId(filename)` - 从文件名提取番号
  - `normalizeAvId(code)` - 标准化番号格式
  - `validateAvId(code)` - 验证番号格式有效性

#### MovieInfo (影片信息模型)
- **文件位置**: `src/shared/services/web-scraper/movie-info.js`
- **核心功能**: 统一封装影片数据，提供数据验证和合并功能，支持无码影片标识
- **主要属性**:
  - `avid` - 番号ID
  - `title` - 影片标题
  - `cover` - 封面图片URL
  - `releaseDate` - 发布日期
  - `runtime` - 时长
  - `score` - 评分
  - `director` - 导演
  - `studio` - 制作商
  - `label` - 标签
  - `series` - 系列
  - `plot` - 剧情简介
  - `uncensored` - 无码影片标识（布尔值，新增）
  - `actress` - 演员数组
  - `genre` - 分类数组
  - `previewPics` - 预览图片数组
  - `metadata` - 元数据（来源、抓取时间、置信度等）

- **主要方法**:
  - `constructor(data)` - 初始化影片信息对象，支持无码标识
  - `validate()` - 验证数据完整性和格式
  - `getCompletenessScore()` - 计算数据完整性得分
  - `toJSON()` - 转换为JSON对象（包含uncensored属性）
  - `toSafeJSON()` - 创建简化版本（包含uncensored属性）
  - `merge(otherMovieInfo)` - 合并其他MovieInfo的数据
  - `getDisplayInfo()` - 获取简化的显示信息
  - `hasBasicInfo()` - 检查是否有基础信息
  - `hasCompleteMetadata()` - 检查是否有完整元数据
  - `isComplete()` - 检查是否为完整数据
  - `clone()` - 创建对象副本
  - `equals(other)` - 比较两个MovieInfo对象

## 测试架构

### 测试配置 (jest.config.js)
- **测试环境**: Node.js环境配置
- **覆盖率设置**: 80%阈值配置
- **测试匹配**: `**/*.test.js`模式
- **超时设置**: 30秒超时
- **模块映射**: 路径别名配置
  - `@services/*` -> `src/shared/services/*`
  - `@shared/*` -> `src/shared/*`

### 测试工具 (tests/setup.js)
- **环境变量**: 测试环境配置
- **全局Mock**: Electron模块模拟
- **测试辅助函数**: 文件操作、延迟等工具函数
- **控制台输出**: 测试输出配置

### 单元测试覆盖
1. **数据库服务测试**: CRUD操作、番号查询、批量处理
2. **媒体扫描测试**: 文件类型识别、分层扫描、元数据提取
3. **JavSP服务测试**: 番号识别、格式验证、批量处理、错误处理

### 集成测试
- **服务集成测试**: 完整扫描工作流程、错误处理、性能测试

## 技术特点
- **测试驱动开发**: TDD模式，80%代码覆盖率要求
- **分层架构**: 服务层分离，模块化设计
- **渐进式集成**: 从模拟到真实服务的平滑过渡
- **智能降级**: JavSP不可用时自动切换到模拟模式
- **批量处理**: 支持高效的批量番号识别
- **错误处理**: 完善的异常捕获和处理机制
- **性能优化**: 分层扫描策略，优先处理Kodi标准
- **架构清晰**: 明确的职责分离，避免循环依赖

## UI组件和工具函数

### 消息提示系统 (Message System)
- **文件位置**: `src/renderer/utils/dom-utils.js`
- **核心功能**: 气泡消息提示，支持多种消息类型和自动排列
- **主要方法**:
  - `createMessageElement(message, type)` - 创建消息元素
  - `showMessage(message, type, duration)` - 显示消息（支持error/warning/success/info类型）
  - `showError(message)` - 显示错误消息
  - `showWarning(message)` - 显示警告消息
  - `showSuccess(message)` - 显示成功消息
  - `showInfo(message)` - 显示信息消息
  - `rearrangeMessages()` - 重新排列消息气泡位置
  - `debounce(func, wait)` - 防抖函数

**消息类型适配**:
- 扫描相关消息已适配缓存机制
- 使用缓存时显示"数据加载完成"
- 未使用缓存时显示"扫描完成"
- 文件变化检测显示"正在重新加载数据"
- 启动过程显示"正在加载媒体数据"

**技术特点**:
- 自动消息排列和重叠处理
- 支持自定义显示时长和自动消失
- 防抖处理避免消息重复
- 安全的DOM操作和内存管理
- 响应式设计，适配移动端

#### MediaGrid (媒体网格组件)
- **文件位置**: `src/renderer/components/media-grid.js`
- **核心功能**: 媒体卡片网格渲染，支持封面显示、信息展示、事件处理，独立视频文件特殊标识
- **主要方法**:
  - `renderMediaList(mediaList, containerId)` - 渲染媒体列表到指定容器
  - `createMediaElement(media, index)` - 创建单个媒体元素，支持独立视频文件特殊样式
  - `createCoverContainer(media)` - 创建封面容器
  - `createInfoContainer(media)` - 创建信息容器，独立视频文件显示番号信息
  - `addMediaEventListeners(element, media)` - 添加媒体事件监听器
  - `loadImageThroughIPC(imagePath)` - 通过IPC加载图片
  - `handleTagClick(tag, type)` - 处理标签点击事件
  - `handleActorExpand(media, container)` - 处理演员展开/收起

**独立视频文件支持**:
- 特殊视觉样式：透明度0.8、虚线边框(#999 2px dashed)
- 悬停显示"待刮削"状态提示
- 番号信息以橙色背景突出显示