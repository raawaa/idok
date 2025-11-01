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
- **核心功能**: 番号识别和验证，支持多种番号格式
- **主要方法**:
  - `constructor()` - 初始化JavSP服务
  - `detectCode(filePath)` - 检测单个文件的番号
  - `detectCodes(filePaths)` - 批量检测多个文件的番号
  - `validateCode(code)` - 验证番号格式是否正确
  - `isStandardCode(code)` - 判断是否为标准番号格式
  - `isFC2Code(code)` - 判断是否为FC2番号格式
  - `isHeydougaCode(code)` - 判断是否为Hey動画番号格式

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
- **核心功能**: 基于NFO文件的媒体信息解析，繁简转换
- **主要方法**:
  - `scanDirectory(dirPath)` - 扫描目录
  - `parseNfoFile(nfoPath)` - 解析NFO文件
  - `extractVideoInfo(videoPath)` - 提取视频信息
  - `convertTraditionalToSimplified(text)` - 繁体转简体
  - `getVideoMetadata(videoPath)` - 获取视频元数据

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