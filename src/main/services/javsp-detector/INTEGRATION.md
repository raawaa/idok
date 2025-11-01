# 集成指南

本指南说明如何将JavSP番号识别模块集成到您现有的Electron项目中。

## 项目结构建议

将整个 `javsp-detector` 目录复制到您Electron项目的 `src/main/services/` 目录下：

```
您的Electron项目/
├── src/main/services/
│   ├── media-service.js (现有)
│   └── javsp-detector/ (新增)
│       ├── index.js
│       ├── config.js
│       ├── avid-detector.js
│       ├── models/
│       ├── scrapers/
│       ├── utils/
│       ├── data/
│       └── examples/
```

## 集成步骤

### 1. 扩展现有的 media-service.js

```javascript
// 在 media-service.js 顶部添加
const JavspDetector = require('./javsp-detector');

class MediaService {
    constructor() {
        // 现有初始化代码...

        // 初始化JavSP检测器
        this.javspDetector = new JavspDetector({
            scrapers: {
                enabled: ['javbus'], // 根据需要启用刮削器
                max_concurrent: 3
            }
        });
    }

    /**
     * 现有的扫描方法（扩展版）
     */
    async scanDirectory(directoryPath) {
        // 现有扫描逻辑...
        const existingResults = await this.existingScanLogic(directoryPath);

        // 使用JavSP增强扫描
        const enhancedResults = await this.enhanceWithJavsp(existingResults);

        return enhancedResults;
    }

    /**
     * 使用JavSP增强媒体信息
     */
    async enhanceWithJavsp(mediaItems) {
        const enhancedItems = [];

        for (const item of mediaItems) {
            try {
                // 1. 检测番号
                const detection = await this.javspDetector.detectFromPath(item.filePath);

                if (detection.avid) {
                    // 2. 获取元数据
                    const metadata = await this.javspDetector.getMovieMetadata(
                        detection.avid,
                        detection.type
                    );

                    // 3. 合并到现有数据结构
                    item.avid = detection.avid;
                    item.avidType = detection.type;
                    item.avidConfidence = detection.confidence;

                    if (metadata) {
                        // 映射到您现有的数据结构
                        item.title = metadata.title || item.title;
                        item.actress = metadata.actress || item.actress;
                        item.director = metadata.director || item.director;
                        item.producer = metadata.producer || item.producer;
                        item.publisher = metadata.publisher || item.publisher;
                        item.serial = metadata.serial || item.serial;
                        item.genre = metadata.genre_norm || metadata.genre || item.genre;
                        item.publishDate = metadata.publish_date || item.publishDate;
                        item.duration = metadata.duration || item.duration;
                        item.score = metadata.score || item.score;
                        item.cover = metadata.cover || item.cover;
                        item.plot = metadata.plot || item.plot;
                        item.uncensored = metadata.uncensored || item.uncensored;
                    }
                }

                enhancedItems.push(item);

            } catch (error) {
                console.error('JavSP增强处理失败:', item.filePath, error);
                enhancedItems.push(item); // 保留原始数据
            }
        }

        return enhancedItems;
    }

    /**
     * 批量获取番号信息
     */
    async batchGetAvidInfo(requests) {
        try {
            const results = await this.javspDetector.batchGetMetadata(requests);
            return results.map(result => ({
                success: result.success,
                avid: result.avid,
                data: result.data,
                error: result.error
            }));
        } catch (error) {
            console.error('批量获取番号信息失败:', error);
            return [];
        }
    }

    /**
     * 搜索影片
     */
    async searchMovies(keyword) {
        try {
            const results = await this.javspDetector.searchMovies(keyword);
            return results.map(result => ({
                avid: result.avid,
                title: result.title,
                cover: result.cover,
                date: result.date,
                source: result.source,
                url: result.url
            }));
        } catch (error) {
            console.error('搜索影片失败:', error);
            return [];
        }
    }
}

module.exports = MediaService;
```

### 2. 主进程IPC通信扩展

在您的主进程中添加IPC处理程序：

```javascript
// main.js 或主进程文件中
const { ipcMain } = require('electron');
const MediaService = require('./src/main/services/media-service');

const mediaService = new MediaService();

// 获取番号信息
ipcMain.handle('get-avid-info', async (event, avid, type) => {
    try {
        const metadata = await mediaService.javspDetector.getMovieMetadata(avid, type);
        return { success: true, data: metadata };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// 搜索影片
ipcMain.handle('search-movies', async (event, keyword) => {
    try {
        const results = await mediaService.searchMovies(keyword);
        return { success: true, data: results };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// 批量获取番号信息
ipcMain.handle('batch-get-avid-info', async (event, requests) => {
    try {
        const results = await mediaService.batchGetAvidInfo(requests);
        return { success: true, data: results };
    } catch (error) {
        return { success: false, error: error.message };
    }
});
```

### 3. 渲染进程扩展

在渲染进程中添加JavSP相关功能：

```javascript
// renderer.js 或相关渲染进程文件

// 获取番号信息
async function getAvidInfo(avid, type = 'normal') {
    try {
        const result = await window.electronAPI.invoke('get-avid-info', avid, type);
        if (result.success) {
            return result.data;
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('获取番号信息失败:', error);
        return null;
    }
}

// 搜索影片
async function searchMovies(keyword) {
    try {
        const result = await window.electronAPI.invoke('search-movies', keyword);
        if (result.success) {
            return result.data;
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('搜索影片失败:', error);
        return [];
    }
}

// 在媒体卡片中显示番号信息
function enhanceMediaCard(mediaItem) {
    if (mediaItem.avid) {
        // 添加番号显示
        const avidElement = document.createElement('div');
        avidElement.className = 'avid-badge';
        avidElement.textContent = mediaItem.avid;

        // 根据类型设置不同样式
        if (mediaItem.avidType === 'fc2') {
            avidElement.classList.add('avid-fc2');
        } else if (mediaItem.avidType === 'cid') {
            avidElement.classList.add('avid-cid');
        }

        // 插入到媒体卡片中
        const card = document.querySelector(`[data-id="${mediaItem.id}"]`);
        if (card) {
            card.appendChild(avidElement);
        }
    }
}
```

### 4. CSS样式扩展

在您的样式文件中添加番号相关样式：

```css
/* style.css */
.avid-badge {
    position: absolute;
    top: 10px;
    left: 10px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: bold;
    z-index: 10;
}

.avid-fc2 {
    background: rgba(255, 100, 100, 0.9);
}

.avid-cid {
    background: rgba(100, 100, 255, 0.9);
}

.avid-normal {
    background: rgba(100, 255, 100, 0.9);
}

/* 搜索框样式 */
.javsp-search {
    margin: 10px 0;
}

.javsp-search input {
    width: 100%;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
}

/* 搜索结果样式 */
.search-results {
    max-height: 300px;
    overflow-y: auto;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.search-result-item {
    padding: 8px;
    border-bottom: 1px solid #eee;
    cursor: pointer;
}

.search-result-item:hover {
    background-color: #f5f5f5;
}
```

### 5. 设置集成

在您的设置系统中添加JavSP相关选项：

```javascript
// settings-modal.js 或相关设置文件中

class SettingsModal {
    constructor() {
        // 现有代码...

        // 添加JavSP设置
        this.javspSettings = {
            enabledScrapers: ['javbus'],
            maxConcurrent: 3,
            enableCache: true,
            proxyEnabled: false
        };
    }

    // 渲染设置界面
    renderJavspSettings() {
        const settingsHTML = `
            <div class="settings-section">
                <h3>番号识别设置</h3>

                <div class="setting-item">
                    <label>
                        <input type="checkbox" ${this.javspSettings.enabled ? 'checked' : ''}>
                        启用番号识别
                    </label>
                </div>

                <div class="setting-item">
                    <label>启用的刮削器:</label>
                    <div>
                        <label><input type="checkbox" name="scraper" value="javbus" checked> JavBus</label>
                        <!-- 未来可以添加更多刮削器 -->
                    </div>
                </div>

                <div class="setting-item">
                    <label>最大并发数:</label>
                    <input type="number" min="1" max="10" value="${this.javspSettings.maxConcurrent}">
                </div>

                <div class="setting-item">
                    <label>
                        <input type="checkbox" ${this.javspSettings.enableCache ? 'checked' : ''}>
                        启用缓存
                    </label>
                </div>
            </div>
        `;

        return settingsHTML;
    }

    // 保存设置
    async saveJavspSettings() {
        const settings = {
            enabled: document.querySelector('input[type="checkbox"]').checked,
            scrapers: Array.from(document.querySelectorAll('input[name="scraper"]:checked')).map(el => el.value),
            maxConcurrent: parseInt(document.querySelector('input[type="number"]').value),
            enableCache: document.querySelectorAll('input[type="checkbox"]')[1].checked
        };

        // 保存到配置文件
        await window.electronAPI.invoke('save-javsp-settings', settings);

        // 重新初始化检测器
        await window.electronAPI.invoke('reinit-javsp-detector', settings);
    }
}
```

## 性能优化建议

1. **批量处理**：对于大量文件，使用批量API而不是单个请求
2. **缓存利用**：启用缓存以提高重复请求的性能
3. **并发控制**：合理设置并发数量，避免过多网络请求
4. **懒加载**：只在需要时才获取元数据
5. **错误处理**：优雅处理网络错误和数据缺失

## 注意事项

1. **网络依赖**：确保应用在网络可用时才调用刮削功能
2. **用户代理**：某些网站可能需要特定的用户代理
3. **访问限制**：注意网站的访问频率限制
4. **数据准确性**：不同网站的数据可能存在差异
5. **合规使用**：确保在合法合规的前提下使用

## 故障排除

### 常见问题

1. **模块无法加载**
   - 检查依赖是否正确安装：`npm install axios jsdom`
   - 确认路径引用正确

2. **网络请求失败**
   - 检查网络连接
   - 验证代理设置
   - 查看控制台错误信息

3. **番号识别不准确**
   - 检查文件名格式
   - 调整忽略模式配置
   - 查看识别日志

4. **元数据获取失败**
   - 确认刮削器是否启用
   - 检查网站是否可访问
   - 查看网络请求日志

### 调试方法

```javascript
// 启用详细日志
const detector = new JavspDetector({
    logging: {
        level: 'debug'
    }
});

// 检查模块状态
console.log(detector.getStatus());

// 验证数据文件
console.log(detector.dataLoader.validateDataFiles());
```

通过以上步骤，您应该能够成功将JavSP番号识别模块集成到现有的Electron项目中。