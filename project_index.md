# 项目文件索引

## 项目结构

### 根目录文件
- **index.html**: 应用程序主 HTML 文件，包含页面结构和模态框结构，使用HTML模板
- **style.css**: 全局样式文件，包含应用程序的样式、设置相关样式和暗色主题适配
- **package.json**: 项目依赖和脚本配置

### src 目录
- **main/**: 主进程相关代码
- **renderer/**: 渲染进程相关代码
  - **components/**: UI 组件
    - **settings-modal.js**: 设置模态框组件，采用组件化设计，使用SettingsModal类封装所有功能和状态管理。通过IPC与主进程通信，实现设置的读取和保存，与主应用程序设置系统完全集成
    - **media-grid.js**: 媒体网格组件
  - **utils/**: 工具函数
  - **renderer.js**: 渲染进程入口文件
- **shared/**: 共享代码

### 文档目录
- **project_task.md**: 项目任务规划文档
- **project_doing.md**: 项目过程记录文档
- **project_index.md**: 项目文件索引
- **project_codebase.md**: 代码库函数概览