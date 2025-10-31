# 项目文件索引

## 项目结构

### 根目录文件
- **index.html**: 应用程序主 HTML 文件，包含页面结构和模态框结构，使用HTML模板。排序控制包含片名、发布日期、系列三个选项
- **style.css**: 全局样式文件，包含应用程序的样式、设置相关样式和暗色主题适配
- **package.json**: 项目依赖和脚本配置

### src 目录
- **main/**: 主进程相关代码
  - **services/media-service.js**: 媒体服务，负责扫描目录、解析NFO文件、提取影片信息（包括标题、发布日期、演员、片商、类别、系列等）
- **renderer/**: 渲染进程相关代码
  - **renderer.js**: 渲染进程入口文件，包含主题切换、媒体过滤排序、事件处理等核心功能。支持按片名、发布日期、系列名称排序
  - **components/**: UI 组件
    - **settings-modal.js**: 设置模态框组件，采用组件化设计，使用SettingsModal类封装所有功能和状态管理。通过IPC与主进程通信，实现设置的读取和保存，与主应用程序设置系统完全集成
    - **media-grid.js**: 媒体网格组件，负责渲染媒体卡片网格，包含封面显示、信息展示、事件处理等功能。支持在影片卡片中显示演员和系列标签，点击标签可自动过滤影片
  - **utils/**: 工具函数
- **shared/**: 共享代码

### 文档目录
- **project_task.md**: 项目任务规划文档
- **project_doing.md**: 项目过程记录文档
- **project_index.md**: 项目文件索引
- **project_codebase.md**: 代码库函数概览
- **THEME_PERFORMANCE_OPTIMIZATION.md**: 主题切换性能优化报告
- **performance-test.html**: 主题切换性能测试工具