# 更新历史：
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