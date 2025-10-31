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
- **toggleTheme()**: 性能优化的主题切换函数，使用requestAnimationFrame和防抖机制来优化性能
  - 使用requestAnimationFrame确保在下一次重绘前应用主题
  - 延迟更新容器padding，避免与主题切换同时进行
  - 保存主题设置到localStorage
  - 更新主题切换按钮状态
- **updateContainerPadding()**: 更新媒体容器padding，根据窗口大小调整内容区域
- **initializeEventListeners()**: 初始化事件监听器，包括主题切换按钮点击事件
- **handleFileSelection()**: 处理文件选择事件
- **handleDragStart()**: 处理拖拽开始事件
- **handleDragOver()**: 处理拖拽悬停事件
- **handleDrop()**: 处理文件拖放事件
- **handleModalClose()**: 处理模态框关闭事件
- **openFile()**: 打开文件
- **playMedia()**: 播放媒体文件
- **showMediaInfo()**: 显示媒体信息
- **updateMediaGrid()**: 更新媒体网格显示
- **filterMedia()**: 过滤媒体文件
- **sortMedia()**: 排序媒体文件
  - 支持按片名、发布日期、系列名称排序
  - 系列排序逻辑：优先按系列名称排序，没有系列信息的按标题排序
  - 支持升序和降序切换
- **searchMedia()**: 搜索媒体文件
- **formatFileSize()**: 格式化文件大小
- **formatDuration()**: 格式化时长
- **escapeHtml()**: HTML转义
- **debounce()**: 防抖函数
- **throttle()**: 节流函数

## 媒体网格组件 (src\renderer\components\media-grid.js)

### 主要函数
- **renderMediaList(mediaList)**: 渲染媒体列表到网格中
  - 参数: mediaList (Array) - 媒体数据数组
  - 功能: 设置网格布局，处理空状态，创建并添加媒体元素到DOM

- **createMediaElement(media, onClick, onContextMenu)**: 创建媒体元素
  - 参数: media (Object) - 媒体数据对象，onClick (Function) - 点击回调，onContextMenu (Function) - 右键回调
  - 返回: HTMLElement - 媒体元素
  - 功能: 创建完整的媒体卡片，包含封面容器和信息容器

- **createCoverContainer(media)**: 创建封面容器
  - 参数: media (Object) - 媒体数据对象
  - 返回: HTMLElement - 封面容器元素
  - 功能: 处理封面图片加载，显示多盘片标记(CD徽章)，错误处理

- **createInfoContainer(media)**: 创建信息容器
  - 参数: media (Object) - 媒体数据对象
  - 返回: HTMLElement - 信息容器元素
  - 功能: 创建包含标题、发布日期、片商、系列标签、演员标签的信息容器
  - 系列标签: 绿色主题，可点击，点击后按系列名称搜索过滤
  - 演员标签: 蓝色主题，最多显示3个演员，超出显示"..."，可点击过滤
  - 支持演员标签展开收起功能: 点击"+n"显示全部演员，点击chevron-up图标收起恢复紧凑显示，使用Lucide图标。修复了事件委托问题，使用closest方法确保点击图标时也能正确识别

### 依赖管理
- **Electron** - 桌面应用框架
- **Lucide** - 原生JavaScript图标库，用于UI图标显示
- **其他依赖** - 见package.json文件

- **addMediaEventListeners(element, media, onClick, onContextMenu)**: 添加媒体元素事件监听器
  - 功能: 为媒体元素添加点击和右键事件监听，特别处理tag点击事件
  - tag点击: 检测点击的是否为media-tag类元素，调用handleTagClick处理

- **handleTagClick(tagElement)**: 处理tag点击事件
  - 参数: tagElement (HTMLElement) - 被点击的tag元素
  - 功能: 根据tag类型执行不同过滤操作
  - 演员标签: 设置演员下拉框值并触发change事件
  - 系列标签: 设置搜索框值并触发input事件（因为系列不是下拉框选项）
  - 显示过滤提示信息

- **loadImageThroughIPC(imagePath)**: 通过IPC加载图片
  - 参数: imagePath (string) - 图片路径
  - 返回: Promise<string> - 图片URL
  - 功能: 处理路径格式转换，Windows路径修复，错误处理

- **updateContainerPadding()**: 动态计算影片容器顶部padding
  - 功能: 根据控制区域高度动态调整内容区域padding，避免内容被遮挡

- **setupControlsObserver()**: 设置控制区域变化监听器
  - 功能: 使用MutationObserver监听控制区域大小变化，自动调整容器padding

- **cleanupListeners()**: 清理监听器和观察器
  - 功能: 移除所有事件监听器和MutationObserver，防止内存泄漏

## 主进程服务 (src\main\services\media-service.js)

### 主要函数
- **parseNfoFile(nfoPath)**: 解析NFO文件
  - 参数: nfoPath (string) - NFO文件路径
  - 返回: Promise<Object> - 电影信息对象
  - 功能: 读取并解析NFO文件的XML内容，提取影片元数据
  - 支持两种set节点格式：对象格式`<set><name>系列名</name></set>`和字符串格式`<set>系列名</set>`
  - 提取信息包括: 标题、年份、发布日期、片商、系列(set)、演员(actors)、导演、类别