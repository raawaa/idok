# idok 项目概览

## 项目简介

idok 是一个专业的本地 AV 影片管理工具，使用 Electron 框架开发的桌面应用程序。它专为需要整理和管理大量本地 AV 影片文件的用户设计，提供多目录支持、NFO 元数据解析、智能过滤和一键播放等功能。

## 技术栈

- **框架**: Electron 36.3.1
- **语言**: JavaScript (ES6+)
- **UI 组件**: 自定义组件系统
- **图标**: Lucide 0.552.0
- **数据解析**: xml2js 0.6.2, opencc-js 1.0.5
- **构建工具**: electron-builder 24.9.1
- **开发工具**: nodemon 3.1.10, electron-reloader 1.2.3, concurrently 9.2.1
- **版本管理**: standard-version 9.5.0
- **CI/CD**: GitHub Actions

## 项目架构

### 主要目录结构

```
src/
├── main/                    # 主进程代码
│   ├── main.js             # 主进程入口文件
│   ├── handlers/           # IPC 处理器
│   │   ├── media-handlers.js    # 媒体相关操作处理器
│   │   ├── settings-handlers.js # 设置相关操作处理器
│   │   └── window-handlers.js   # 窗口管理处理器
│   └── services/           # 主进程服务
│       ├── file-service.js      # 文件操作服务
│       └── media-service.js     # 媒体处理服务
├── renderer/               # 渲染进程代码
│   ├── renderer.js         # 渲染进程入口文件
│   ├── components/         # UI 组件
│   │   ├── media-grid.js        # 媒体网格组件
│   │   └── settings-modal.js    # 设置模态框组件
│   ├── services/           # 渲染进程服务
│   └── utils/              # 工具函数
│       └── dom-utils.js         # DOM 操作工具
└── shared/                 # 共享代码
    └── constants.js        # 常量定义
```

### 核心模块

1. **主进程 (Main Process)**
   - 窗口管理和应用生命周期
   - 文件系统操作
   - IPC 通信处理
   - 媒体文件扫描和 NFO 解析

2. **渲染进程 (Renderer Process)**
   - 用户界面渲染
   - 用户交互处理
   - 媒体网格显示
   - 设置界面管理

3. **共享模块 (Shared)**
   - 应用常量
   - 通用数据结构

## 构建和运行

### 环境要求

- Node.js (推荐 v16+)
- npm 或 yarn
- Windows 10/11 (目前仅支持 Windows)

### 安装依赖

```bash
npm install
```

### 开发模式运行

```bash
npm run dev
```

### 详细开发模式（带热重载）

```bash
npm run dev:verbose
```

### 生产模式运行

```bash
npm start
```

### 构建安装包

```bash
npm run build
```

### 版本发布

```bash
npm run release:patch  # 补丁版本
npm run release:minor  # 次版本
npm run release:major  # 主版本
```

### CI/CD 自动化构建

项目使用 GitHub Actions 进行自动化构建和发布：

- **触发条件**: 推送标签 (`v*`) 或创建 Release 时自动触发
- **构建环境**: Windows 最新版本
- **构建步骤**: 自动安装依赖、构建应用、上传到 Release
- **发布地址**: [GitHub Releases](https://github.com/raawaa/idok/releases)

## 开发约定

### 代码结构约定

1. **模块化设计**: 每个功能模块独立，职责单一
2. **IPC 通信**: 主进程和渲染进程通过 IPC 通信，避免直接耦合
3. **组件化 UI**: 使用组件化方式构建用户界面
4. **错误处理**: 所有异步操作必须有错误处理机制

### 文件命名约定

- 使用 kebab-case 命名文件
- 主进程文件以 `-handlers.js` 或 `-service.js` 结尾
- 渲染进程组件文件以 `-modal.js` 或 `-grid.js` 等描述性后缀结尾

### 代码风格约定

- 使用 ES6+ 语法
- 函数优先使用箭头函数
- 类名使用 PascalCase
- 变量和函数使用 camelCase
- 常量使用 UPPER_SNAKE_CASE

## 核心功能

### 1. 媒体文件管理

- **多目录扫描**: 支持同时扫描多个本地目录
- **NFO 解析**: 完全支持 Kodi NFO 格式元数据解析
- **智能过滤**: 按演员、片商、类别等多维度过滤
- **全局搜索**: 支持片名和番号搜索

### 2. 用户界面

- **网格布局**: 响应式媒体网格显示
- **主题切换**: 支持明暗主题切换，性能优化
- **交互式标签**: 可点击的演员/系列标签，快速过滤
- **拖拽支持**: 支持文件拖放操作

### 3. 播放功能

- **自定义播放器**: 支持设置用户偏好的视频播放器
- **一键播放**: 点击封面直接播放
- **便捷删除**: 应用内直接删除不需要的影片

### 4. 设置管理

- **持久化设置**: 设置保存在用户数据目录
- **实时同步**: 设置变更实时生效
- **目录管理**: 灵活的媒体目录添加和移除

## 开发工作流

1. **任务规划**: 使用 `project_task.md` 规划和跟踪任务
2. **代码修改**: 遵循模块化设计原则进行开发
3. **测试验证**: 确保功能正常且性能良好
4. **文档更新**: 及时更新相关文档

## 版本管理规范

项目采用 Conventional Commits 规范进行版本管理：

- **提交类型**: feat, fix, chore, docs, style, refactor, perf, test
- **自动更新**: 使用 standard-version 自动生成 CHANGELOG.md 和更新版本号
- **发布流程**: 
  1. 使用规范的提交信息格式
  2. 运行 `npm run release:patch/minor/major` 生成新版本
  3. 推送标签触发 CI/CD 自动构建和发布

## 开发环境配置

### 镜像源配置

项目已配置国内镜像源以加速依赖安装（`.npmrc`）：
- npm registry: https://registry.npmmirror.com
- Electron: https://npmmirror.com/mirrors/electron/
- electron-builder: https://npmmirror.com/mirrors/electron-builder-binaries/

### 热重载配置

开发模式支持文件监控和热重载（`nodemon.json`）：
- 监控文件类型: js, json, html, css
- 忽略目录: node_modules, dist, build
- 延迟重启: 1000ms（避免频繁重启）

## 注意事项

1. **安全性**: 禁用了部分 Electron 安全警告以简化开发
2. **性能优化**: 主题切换和媒体加载都进行了性能优化
3. **兼容性**: 目前仅支持 Windows 平台
4. **缓存管理**: 应用启动时会清理缓存目录以避免权限问题

## 常见问题

1. **依赖缺失**: 运行前确保执行 `npm install`
2. **GPU 问题**: 应用已禁用 GPU 加速以避免兼容性问题
3. **权限问题**: 确保应用有访问媒体目录的权限
4. **NFO 格式**: 支持两种 set 节点格式的 NFO 文件

## 扩展开发

如需添加新功能，建议遵循以下步骤：

1. 在 `project_task.md` 中创建新任务
2. 确定功能属于主进程还是渲染进程
3. 创建相应的处理器或组件
4. 添加必要的 IPC 通信接口
5. 更新相关文档

## 当前版本信息

- **版本号**: 0.4.1
- **发布日期**: 2025年10月31日
- **主要特性**: 系列过滤、消息气泡优化、主题切换图标化、滚动条样式优化

## 项目资源

- **GitHub 仓库**: https://github.com/raawaa/idok
- **发布页面**: https://github.com/raawaa/idok/releases
- **问题反馈**: https://github.com/raawaa/idok/issues

---

*最后更新: 2025年11月4日*