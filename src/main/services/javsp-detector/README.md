# JavSP番号识别模块

从JavSP项目移植的JavaScript版本番号识别功能，支持番号识别、元数据刮削等功能。

## 功能特性

- **番号识别**：支持多种番号格式（FC2、普通番号、CID、GETCHU等）
- **元数据刮削**：支持从多个网站获取影片详细信息
- **女优别名标准化**：自动将女优别名标准化为统一名称
- **分类翻译**：将网站分类标签翻译为中文
- **批量处理**：支持批量识别和刮削
- **缓存机制**：提高重复请求的性能
- **轻量级设计**：最小化依赖，适合Electron应用集成

## 安装依赖

```bash
npm install axios jsdom
```

## 基本使用

### 初始化

```javascript
const JavspDetector = require('./javsp-detector');

// 使用默认配置
const detector = new JavspDetector();

// 使用自定义配置
const detector = new JavspDetector({
    scrapers: {
        enabled: ['javbus'], // 启用的刮削器
        sites: {
            javbus: {
                base_url: 'https://www.javbus.com',
                timeout: 15000
            }
        }
    }
});
```

### 番号识别

```javascript
// 从文件路径识别番号
const detection = await detector.detectFromPath('/path/to/FC2-123456.mp4');
console.log(detection);
// 输出: { avid: 'FC2-123456', type: 'fc2', confidence: 0.9 }

// 批量识别
const results = await detector.batchDetect([
    '/path/to/ABC-123.mp4',
    '/path/to/DEF-456.mp4'
]);
```

### 获取影片元数据

```javascript
// 获取单个影片的元数据
const metadata = await detector.getMovieMetadata('ABC-123', 'normal');
console.log(metadata.title);    // 影片标题
console.log(metadata.actress);  // 女优列表
console.log(metadata.genre);    // 分类标签

// 批量获取元数据
const requests = [
    { avid: 'ABC-123', type: 'normal' },
    { avid: 'FC2-456789', type: 'fc2' }
];
const results = await detector.batchGetMetadata(requests);
```

### 完整文件处理

```javascript
// 识别番号并获取元数据
const result = await detector.processFile('/path/to/movie.mp4');
if (result.success) {
    console.log('番号:', result.detection.avid);
    console.log('标题:', result.metadata.title);
    console.log('女优:', result.metadata.actress);
} else {
    console.error('处理失败:', result.error);
}
```

### 搜索功能

```javascript
// 搜索影片
const searchResults = await detector.searchMovies('天使もえ');
console.log(searchResults);
// 输出: [{ avid: 'ABP-123', title: '...', cover: '...', source: 'javbus' }, ...]
```

## 数据结构

### MovieInfo

```javascript
{
    dvdid: 'ABC-123',           // DVD番号
    cid: null,                  // DMM Content ID
    title: '影片标题',          // 影片标题
    ori_title: '原始标题',      // 原始标题
    cover: 'https://...',       // 封面URL
    actress: ['女优1', '女优2'], // 女优列表
    director: '导演姓名',       // 导演
    producer: '制作商',         // 制作商
    publisher: '发行商',        // 发行商
    serial: '系列名称',         // 系列
    genre: ['分类1', '分类2'],  // 原始分类
    genre_norm: ['分类1', '分类2'], // 标准化分类
    publish_date: '2023-12-25', // 发布日期
    duration: '120分钟',        // 时长
    score: '8.5',               // 评分
    uncensored: false,          // 是否无码
    source: 'javbus'            // 数据来源
}
```

### Movie

```javascript
{
    dvdid: 'ABC-123',           // DVD番号
    cid: null,                  // DMM Content ID
    files: ['/path/to/file.mp4'], // 关联文件列表
    data_src: 'normal',         // 数据源类型
    info: MovieInfo,            // 影片信息
    save_dir: null,             // 保存目录
    guid: 'abc123...'           // 唯一标识
}
```

## 配置选项

```javascript
const config = {
    // 扫描器配置
    scanner: {
        ignored_id_pattern: [
            '(144|240|360|480|720|1080)[Pp]',
            '[24][Kk]',
            '\\w+2048\\.com'
        ],
        filename_extensions: [
            '.mp4', '.mkv', '.avi', '.mov', '.wmv'
        ],
        minimum_size: 232 * 1024 * 1024, // 232MB
        manual: false
    },

    // 网络配置
    network: {
        timeout: 30000,
        max_retries: 3,
        max_concurrent: 5,
        proxy: {
            enabled: false,
            host: null,
            port: null
        }
    },

    // 刮削器配置
    scrapers: {
        enabled: ['javbus'],
        priority: {
            'normal': ['javbus', 'javdb'],
            'fc2': ['fc2'],
            'cid': ['fanza']
        }
    }
};
```

## 支持的番号格式

- **FC2番号**：`FC2-123456`, `FC2-PPV-123456`
- **HEYDOUGA**：`heydouga-4017-123`
- **GETCHU**：`GETCHU-123456`
- **GYUTTO**：`GYUTTO-123456`
- **普通番号**：`ABC-123`, `XYZ-1234`
- **特殊番号**：`MKB-D-S123`, `IBW-123z`
- **无码番号**：`123456-123`

## API参考

### JavspDetector

#### 构造函数
- `new JavspDetector(options)`: 创建检测器实例

#### 方法
- `detectFromPath(filePath)`: 从文件路径检测番号
- `batchDetect(filePaths)`: 批量检测番号
- `getMovieMetadata(avid, type, options)`: 获取影片元数据
- `batchGetMetadata(requests, options)`: 批量获取元数据
- `searchMovies(keyword, scraperNames)`: 搜索影片
- `processFile(filePath, options)`: 完整处理文件
- `scanDirectory(rootPath, onProgress)`: 扫描目录
- `getStatus()`: 获取模块状态
- `clearCache()`: 清除缓存
- `reloadData()`: 重新加载数据

## 注意事项

1. **网络请求**：确保有稳定的网络连接用于获取元数据
2. **访问限制**：某些网站可能有访问限制，建议合理设置请求间隔
3. **数据准确性**：不同网站的数据可能存在差异，建议以官方数据为准
4. **合规使用**：请确保在符合当地法律法规的前提下使用

## 错误处理

模块采用Promise-based的错误处理，建议使用try-catch：

```javascript
try {
    const metadata = await detector.getMovieMetadata('ABC-123');
    if (metadata) {
        console.log('获取成功:', metadata.title);
    } else {
        console.log('未找到影片信息');
    }
} catch (error) {
    console.error('获取失败:', error.message);
}
```

## 许可证

本项目基于原JavSP项目移植，请遵循相应的开源许可证。