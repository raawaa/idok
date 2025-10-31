# 代码库函数概览

## 设置模态框组件 (settings-modal.js)

### 主要函数
- **SettingsModal** 类: 封装设置模态框的所有功能和状态，通过IPC与主进程通信，实现设置的读取和保存，与主应用程序设置系统完全集成
  - **constructor()**: 初始化设置模态框
  - **initialize()**: 异步初始化设置模态框
  - **open()**: 异步打开设置对话框，确保设置已加载
  - **close()**: 关闭设置对话框
  - **loadSettings()**: 通过IPC从文件系统加载设置
  - **saveSettings()**: 异步保存设置，通过IPC与主进程通信
  - **handleSave()**: 处理保存按钮点击事件
  - **handleCancel()**: 处理取消按钮点击事件
  - **handleThemeChange()**: 处理主题变更事件
  - **applyTheme()**: 应用主题
  - **addDirectory()**: 通过IPC调用打开目录选择对话框
  - **removeDirectory()**: 移除目录
  - **showMessage()**: 显示消息
  - **showError()**: 显示错误
  - **showSuccess()**: 显示成功消息
  - **populateDirectories()**: 填充目录列表
  - **populatePlayerSettings()**: 填充播放器设置
  - **populateThemeSettings()**: 填充主题设置
  - **setupEventListeners()**: 设置事件监听器
- **window.openSettingsDialog()**: 全局函数，用于打开设置对话框
- **window.initializeSettingsModal()**: 全局函数，用于初始化设置模态框

## 渲染器入口 (renderer.js)

### 主要函数
- **initializeTheme()**: 初始化主题设置，根据保存的偏好或系统设置应用主题