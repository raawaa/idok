# 更新历史：
### [0.2.1](https://github.com/raawaa/idok/compare/v0.2.0...v0.2.1) (2025-10-25)


### 🐛 Bug 修复

* **release:** 添加draft:false配置以避免发布草稿版本 ([0b1ae72](https://github.com/raawaa/idok/commit/0b1ae72b9b1a7e2b9899906dddf09415e6d39645))

## [0.2.0](https://github.com/raawaa/idok/compare/v0.1.5...v0.2.0) (2025-10-25)


### 📝 文档

* 移除README.md中重复的下载说明 ([e143160](https://github.com/raawaa/idok/commit/e143160ce00ed30873c3d619ce91320d6e5710c1))


### ♻️ 代码重构

* 移除未使用的path模块导入 ([f0690bc](https://github.com/raawaa/idok/commit/f0690bc33165b61e02e0a6f9644712b55a9bf77a))
* **renderer:** 移除未使用的设置保存和重新扫描逻辑 ([11ed18a](https://github.com/raawaa/idok/commit/11ed18a42db62dcee01938e3707001066088db5a))
* **settings:** 使用模板和事件委托重构目录设置界面 ([af89ec0](https://github.com/raawaa/idok/commit/af89ec004a3e8010c2843cc15b15f3e9f726b86c))


### ✨ 新增功能

* **窗口标题:** 添加应用版本号显示功能 ([7bbbb17](https://github.com/raawaa/idok/commit/7bbbb17acd076fc79466d28ec6b2f0c9fe1ee8b3))
* **打开视频所在目录:** 添加打开视频文件所在目录功能 ([7e2b3ca](https://github.com/raawaa/idok/commit/7e2b3caba1421b702ec5bc7887ae3bef7b5c8add))
* **电影详情:** 添加电影详细信息模态框及交互功能 ([5411d02](https://github.com/raawaa/idok/commit/5411d0252a489b819423115b959d1736cd9249fb))
* **过滤器:** 将文本输入框改为下拉选择框并实现动态填充 ([c731d05](https://github.com/raawaa/idok/commit/c731d05f2a5368205295cb115ac6e9f239c79b52))
* 扩展支持的视频格式列表 ([b38171a](https://github.com/raawaa/idok/commit/b38171a477f6113b4d06ccab39a7da16f1a8b1d0))
* **主题切换:** 将主题切换按钮改为现代化滑动开关样式 ([01f0248](https://github.com/raawaa/idok/commit/01f024865d80387ebaabff3d96148c9002186d53))
* **ui:** 添加消息提示系统和改进删除确认对话框 ([c2849c3](https://github.com/raawaa/idok/commit/c2849c3d2e7d6aa015be6503194c6e6f6c0ff26b))

### [0.1.5](https://github.com/raawaa/idok/compare/v0.1.4...v0.1.5) (2025-07-05)


### ⚡ 性能优化

* **image-display:** 优化图片加载性能，使用文件路径直接显示 ([23cfaf8](https://github.com/raawaa/idok/commit/23cfaf87327b78093717076be1ed589980bdae8f))


### ✨ 新增功能

* **delete:** 删除影片目录时移至回收站 ([d65919f](https://github.com/raawaa/idok/commit/d65919faa3b4873d92c20dcbd9e5c8d0cd4af746))
* **loading:** 添加加载指示器以改善用户体验 ([42b231f](https://github.com/raawaa/idok/commit/42b231f70bbfbc1f4ff38934d47682d5de351f39))


### 🔧 其他改动

* **version:** 更新 .versionrc.json 文件，修改 CHANGELOG 章节标题为中文 ([f0bb447](https://github.com/raawaa/idok/commit/f0bb4476766e5c05f86dba7538287c5378c2e7a2))


### ♻️ 代码重构

* 将内联脚本提取到独立的renderer.js文件并删除settings.html ([40f1778](https://github.com/raawaa/idok/commit/40f17789ee5f29054faa4d55fb63113ea2ff871b))
* **ui:** 重构设置模态框样式并提取为CSS类 ([9950004](https://github.com/raawaa/idok/commit/9950004b6ca6330aa622193664133bff7639258d))


### 🐛 Bug 修复

* **事件监听:** 添加影片目录删除确认及结果处理逻辑 ([fac7d84](https://github.com/raawaa/idok/commit/fac7d8459e62ff68c7a65bc97ad15eb386158dd8))
* **ipc:** 将save-settings从on改为handle并添加错误处理 ([cec7263](https://github.com/raawaa/idok/commit/cec7263b5638783123ee23846fe69c21bb395468))

### [0.1.4](https://github.com/raawaa/idok/compare/v0.1.3...v0.1.4) (2025-05-28)


### 🔧 其他改动

* 优化 GitHub Release 配置 ([131264b](https://github.com/raawaa/idok/commit/131264b757889696f7367dafed31841555945d4d))

### [0.1.3](https://github.com/raawaa/idok/compare/v0.1.2...v0.1.3) (2025-05-28)


### 🔧 其他改动

* 添加 .windsurf 目录到 .gitignore ([b687b19](https://github.com/raawaa/idok/commit/b687b197821c85e10f45d5e2df189673462477bc))
* **changelog:** 手动清理重复的 changelog 内容 ([5a3d1e7](https://github.com/raawaa/idok/commit/5a3d1e71382d9b99df88d1653b285ed48f16aa4d))
* **changelog:** 修改 changelog 章节标题为中文 ([540ee05](https://github.com/raawaa/idok/commit/540ee05da57399dbce6d4be28a369a1552936c4f))


### 🐛 Bug 修复

* 修复自定义标题栏按钮错误 ([35727e2](https://github.com/raawaa/idok/commit/35727e267e7658ec62538b523e385522134cc485))

### [0.1.2](https://github.com/raawaa/idok/compare/v0.1.1...v0.1.2) (2025-05-27)


### 🔧 Chores

* 配置自动化版本管理和发布流程 ([eb1d57d](https://github.com/raawaa/idok/commit/eb1d57d874b370b26ecbb552c1e3f1754d9714b2))
* 添加初始 CHANGELOG.md 文件 ([c697f19](https://github.com/raawaa/idok/commit/c697f19dbd829c54bb7ae93e0b2cf5e7633e885c))


### 🐛 Bug Fixes

* **build:** 修复打包后应用无法启动问题 ([36720e2](https://github.com/raawaa/idok/commit/36720e2f07f4677ffe4b8bdc3759642146a9bfd4))