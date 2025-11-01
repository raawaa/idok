/**
 * JavSP番号识别模块配置
 * 从config.yml移植的JavaScript版本
 */

const path = require('path');
const os = require('os');

const defaultConfig = {
    // 扫描器配置
    scanner: {
        // 忽略的文件名模式（正则表达式）
        ignored_id_pattern: [
            '(144|240|360|480|720|1080)[Pp]',  // 分辨率标记
            '[24][Kk]',                        // 2K/4K标记
            '\\w+2048\\.com',                  // 网站水印
            '-UNCENSORED',                     // 无码标记
            '-c$',                             // 字幕文件
            '-s$'                              // 字幕文件
        ],

        // 支持的文件扩展名
        filename_extensions: [
            '.mp4', '.mkv', '.avi', '.mov', '.wmv',
            '.flv', '.webm', '.m4v', '.mpg', '.mpeg',
            '.rmvb', '.rm', '.3gp', '.ts', '.mts', '.m2ts'
        ],

        // 最小文件大小 (232MiB)
        minimum_size: 232 * 1024 * 1024,

        // 是否启用人工审核
        manual: false
    },

    // 网络配置
    network: {
        // 请求超时时间（毫秒）
        timeout: 30000,

        // 重试次数
        max_retries: 3,

        // 并发请求限制
        max_concurrent: 5,

        // 用户代理
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',

        // 代理配置
        proxy: {
            enabled: false,
            host: null,
            port: null,
            username: null,
            password: null
        }
    },

    // 刮削器配置
    scrapers: {
        // 启用的刮削器
        enabled: ['javbus', 'javdb', 'fanza', 'javlib'],

        // 各站点的优先级
        priority: {
            'normal': ['javbus', 'javdb', 'javlib', 'jav321'],
            'fc2': ['fc2', 'javdb', 'javmenu', 'fc2ppvdb'],
            'cid': ['fanza'],
            'getchu': ['dl_getchu'],
            'gyutto': ['gyutto']
        },

        // 站点配置
        sites: {
            javbus: {
                base_url: 'https://www.javbus.com',
                enabled: true,
                timeout: 15000
            },
            javdb: {
                base_url: 'https://javdb.com',
                enabled: true,
                timeout: 15000
            },
            fanza: {
                base_url: 'https://www.dmm.co.jp',
                enabled: true,
                timeout: 15000
            },
            javlib: {
                base_url: 'https://www.javlibrary.com',
                enabled: true,
                timeout: 20000
            }
        }
    },

    // 缓存配置
    cache: {
        // 缓存过期时间（毫秒）
        ttl: 24 * 60 * 60 * 1000, // 24小时

        // 最大缓存条目数
        max_entries: 1000,

        // 是否启用磁盘缓存
        disk_cache: true,

        // 缓存目录
        cache_dir: path.join(os.tmpdir(), 'javsp-detector-cache')
    },

    // 日志配置
    logging: {
        // 日志级别: error, warn, info, debug
        level: 'info',

        // 是否启用文件日志
        file: false,

        // 日志文件路径
        file_path: path.join(os.tmpdir(), 'javsp-detector.log')
    },

    // 输出配置
    output: {
        // 数据输出格式
        format: 'json',

        // 是否保存缩略图
        save_thumb: true,

        // 图片质量 (1-100)
        image_quality: 85
    }
};

// 合并用户自定义配置
function mergeConfig(userConfig = {}) {
    const config = JSON.parse(JSON.stringify(defaultConfig));

    function deepMerge(target, source) {
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                target[key] = target[key] || {};
                deepMerge(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
    }

    deepMerge(config, userConfig);
    return config;
}

// 从环境变量加载配置
function loadFromEnv() {
    const envConfig = {};

    if (process.env.JAVSP_PROXY_HOST) {
        envConfig.network = envConfig.network || {};
        envConfig.network.proxy = envConfig.network.proxy || {};
        envConfig.network.proxy.enabled = true;
        envConfig.network.proxy.host = process.env.JAVSP_PROXY_HOST;
        envConfig.network.proxy.port = process.env.JAVSP_PROXY_PORT || '8080';
    }

    if (process.env.JAVSP_LOG_LEVEL) {
        envConfig.logging = envConfig.logging || {};
        envConfig.logging.level = process.env.JAVSP_LOG_LEVEL;
    }

    return envConfig;
}

// 导出配置
const envConfig = loadFromEnv();
module.exports = mergeConfig(envConfig);