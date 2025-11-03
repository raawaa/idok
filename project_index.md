# 项目文件索引

## 项目结构

### 根目录文件
- **index.html**: 应用程序主 HTML 文件，包含页面结构和模态框结构，使用HTML模板，已集成Lucide图标库。控制区包含过滤控件、排序选项（片名、发布日期、系列）、清除过滤按钮、主题切换按钮（Lucide moon/sun图标）、设置按钮（Lucide settings图标）
- **style.css**: 全局样式文件，包含应用程序的样式、设置相关样式和暗色主题适配
- **package.json**: 项目依赖和脚本配置，包含版本管理脚本（release:patch/minor/major）
- **jest.config.js**: Jest测试框架配置
- **CHANGELOG.md**: 版本变更日志，记录每个版本的更新内容
- **.github/workflows/release_build.yml**: GitHub Actions工作流配置，自动构建发布版本
- **project_javsp_integration_plan.md**: JavSP集成开发规划文档
- **task_detail.md**: 任务执行摘要

### src 目录
- **main/**: 主进程相关代码
  - **main.js**: 主进程入口
  - **handlers/**: IPC通信处理器
    - **media-handlers.js**
    - **settings-handlers.js**
    - **window-handlers.js**
  - **services/**: 主进程专属服务
    - **file-service.js**: 文件系统操作
    - **media-service.js**: 媒体扫描服务（基于NFO），负责扫描目录、解析NFO文件、提取影片信息（包括标题、发布日期、演员、片商、类别、系列等）
    - **javsp-detector/**: AVID番号检测器模块
      - **avid-detector.js**: 番号识别核心，支持FC2、HEYDOUGA、GETCHU、标准番号等多种格式识别
- **renderer/**: 渲染进程相关代码
  - **renderer.js**: 渲染进程入口文件，包含主题切换、媒体过滤排序、事件处理等核心功能。支持按片名、发布日期、系列名称排序
  - **components/**: UI 组件
    - **settings-modal.js**: 设置模态框组件，采用组件化设计，使用SettingsModal类封装所有功能和状态管理。通过IPC与主进程通信，实现设置的读取和保存，与主应用程序设置系统完全集成
    - **media-grid.js**: 媒体网格组件，负责渲染媒体卡片网格，包含封面显示、信息展示、事件处理等功能，使用Lucide图标。支持在影片卡片中显示演员和系列标签，点击标签可自动过滤影片。新增演员标签展开收起功能，超过3个演员时显示"+?"按钮
  - **utils/**: 工具函数
  - **services/**: 渲染进程服务
- **shared/**: 共享层（主进程和渲染进程都可访问）
  - **constants.js**: 常量定义
  - **services/**: 共享服务层
    - **database-service.js**: 数据存储(JSON存储)，支持扫描结果缓存和文件变化检测
    - **media-scanner-service.js**: 媒体扫描（新架构），支持Kodi标准目录和独立视频文件处理
    - **javsp-service.js**: 番号识别，集成JavSP进行番号自动识别
    - **web-scraper/**: 网络爬虫模块（Claude Code新增）
      - **index.js**: 爬虫模块入口，导出所有抓取器和相关工具
      - **base-scraper.js**: 基础抓取器类，提供通用爬虫功能
      - **javbus-scraper.js**: JavBus网站专用抓取器
      - **web-scraper-manager.js**: 爬虫管理器，协调多个抓取器
      - **anti-bot-detector.js**: 反爬虫检测器，检测和应对各种反爬虫机制
      - **rate-limiter.js**: 速率限制器，控制请求频率
      - **proxy-manager.js**: 代理管理器，管理代理池
      - **error-handler.js**: 错误处理器，统一错误处理
      - **utils.js**: 工具函数，包含番号提取和验证功能
      - **movie-info.js**: 影片信息模型，支持无码影片标识(uncensored属性)
      - **base-scraper.js**: 基础抓取器，集成Python JavSP错误处理机制，包含CrawlerError系列异常类
      - **javbus-scraper.js**: JavBus专用抓取器，支持头像过滤、无码影片检测、高清大图提取、磁力链接提取、用户评分评论提取、相关影片推荐、批量处理和搜索功能
- **electron/**: Electron相关配置
  - **main/**
  - **renderer/**

### 测试目录结构
```
tests/
├── setup.js                    # 测试环境配置
├── utils/                      # 测试工具类
│   ├── mocks.js               # 测试模拟工具（HttpMocker, FsMocker, DatabaseMocker, TestEnvironment）
│   ├── test-data-manager.js   # 测试数据管理器，支持JSON基准数据存储和加载
│   ├── data-comparator.js     # 数据比较器，对比在线抓取与基准数据
│   └── test-reporter.js       # 测试报告生成器，支持多格式报告输出
├── unit/                       # 单元测试
│   ├── database.test.js       # 数据库服务测试
│   ├── media-scanner.test.js  # 媒体扫描服务测试
│   ├── javsp-service.test.js  # JavSP服务测试
│   ├── javsp-detector/       # AVID检测器测试
│   │   └── avid-detector.test.js  # AVID检测器单元测试（19个测试用例）
│   ├── web-scraper.test.js    # 网页爬虫测试
│   ├── av-id-validator.test.js # 番号验证器测试
│   ├── config-manager.test.js  # 配置管理器测试
│   ├── anti-bot-detector.test.js # 反爬虫检测器测试
│   ├── proxy-manager.test.js   # 代理管理器测试
│   ├── error-handler.test.js   # 错误处理器测试
│   └── media-scanner.test.js   # 媒体扫描器测试（重复，需要清理）
└── integration/                # 集成测试
    ├── services-integration.test.js  # 服务集成测试
    ├── web-scraper-integration.test.js  # 网页爬虫集成测试
    └── data/                     # 测试基准数据
        ├── IPX-177 (javbus).json   # IPX-177番号基准数据
        ├── ABP-588 (javbus).json   # ABP-588番号基准数据
        ├── AGEMIX-175 (javbus).json # AGEMIX-175番号基准数据
        ├── KING-048 (javbus).json  # KING-048番号基准数据
        ├── MTF-020 (javbus).json   # MTF-020番号基准数据
        ├── NANP-030 (javbus).json  # NANP-030番号基准数据
        ├── SQTE-148 (javbus).json  # SQTE-148番号基准数据
        └── STAR-676 (javbus).json  # STAR-676番号基准数据
```

### 文档目录
- **project_task.md**: 项目任务规划文档
- **project_doing.md**: 项目过程记录文档
- **project_index.md**: 项目文件索引
- **project_codebase.md**: 代码库函数概览
- **THEME_PERFORMANCE_OPTIMIZATION.md**: 主题切换性能优化报告
- **performance-test.html**: 主题切换性能测试工具