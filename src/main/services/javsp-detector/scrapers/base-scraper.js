/**
 * 网站刮削器基类
 * 从JavSP base.py移植的JavaScript版本
 */

const https = require('https');
const axios = require('axios');
const { JSDOM } = require('jsdom');

class BaseScraper {
    constructor(config = {}) {
        this.config = config;
        this.baseURL = config.base_url || '';
        this.timeout = config.timeout || 15000;
        this.maxRetries = config.max_retries || 3;
        this.userAgent = config.user_agent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

        this.headers = {
            'User-Agent': this.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        };

        this.axiosConfig = {
            timeout: this.timeout,
            headers: this.headers,
            httpsAgent: new https.Agent({
                rejectUnauthorized: false
            })
        };

        // 代理配置
        if (this.config.proxy && this.config.proxy.enabled) {
            this.axiosConfig.proxy = {
                host: this.config.proxy.host,
                port: this.config.proxy.port,
                auth: this.config.proxy.username ? {
                    username: this.config.proxy.username,
                    password: this.config.proxy.password
                } : undefined
            };
        }
    }

    /**
     * 发送HTTP GET请求
     * @param {string} url - 请求URL
     * @param {Object} options - 请求选项
     * @returns {Promise<Object>} 响应数据
     */
    async get(url, options = {}) {
        const config = { ...this.axiosConfig, ...options };
        const maxRetries = options.maxRetries || this.maxRetries;

        for (let i = 0; i < maxRetries; i++) {
            try {
                const response = await axios.get(url, config);
                return response;
            } catch (error) {
                console.warn(`请求失败 (尝试 ${i + 1}/${maxRetries}):`, url, error.message);

                if (i === maxRetries - 1) {
                    throw error;
                }

                // 指数退避重试
                const delay = Math.min(1000 * Math.pow(2, i), 5000);
                await this.sleep(delay);
            }
        }
    }

    /**
     * 发送HTTP POST请求
     * @param {string} url - 请求URL
     * @param {Object} data - POST数据
     * @param {Object} options - 请求选项
     * @returns {Promise<Object>} 响应数据
     */
    async post(url, data, options = {}) {
        const config = { ...this.axiosConfig, ...options };
        const maxRetries = options.maxRetries || this.maxRetries;

        for (let i = 0; i < maxRetries; i++) {
            try {
                const response = await axios.post(url, data, config);
                return response;
            } catch (error) {
                console.warn(`POST请求失败 (尝试 ${i + 1}/${maxRetries}):`, url, error.message);

                if (i === maxRetries - 1) {
                    throw error;
                }

                const delay = Math.min(1000 * Math.pow(2, i), 5000);
                await this.sleep(delay);
            }
        }
    }

    /**
     * 解析HTML内容
     * @param {string} html - HTML字符串
     * @returns {Object} DOM对象
     */
    parseHTML(html) {
        try {
            const dom = new JSDOM(html);
            return dom.window.document;
        } catch (error) {
            console.error('HTML解析失败:', error);
            throw new Error(`HTML解析失败: ${error.message}`);
        }
    }

    /**
     * 从响应中解析HTML
     * @param {Object} response - Axios响应对象
     * @returns {Object} DOM对象
     */
    parseResponse(response) {
        return this.parseHTML(response.data);
    }

    /**
     * 获取页面并解析HTML
     * @param {string} url - 页面URL
     * @param {Object} options - 请求选项
     * @returns {Promise<Object>} DOM对象
     */
    async fetchPage(url, options = {}) {
        try {
            const response = await this.get(url, options);
            return this.parseResponse(response);
        } catch (error) {
            console.error('获取页面失败:', url, error.message);
            throw error;
        }
    }

    /**
     * 检查URL是否可访问
     * @param {string} url - URL
     * @returns {Promise<boolean>} 是否可访问
     */
    async isAccessible(url) {
        try {
            const response = await this.get(url, { maxRetries: 1 });
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }

    /**
     * 下载文件
     * @param {string} url - 文件URL
     * @param {string} savePath - 保存路径
     * @param {function} onProgress - 进度回调
     * @returns {Promise<string>} 保存路径
     */
    async downloadFile(url, savePath, onProgress) {
        const fs = require('fs');
        const path = require('path');

        try {
            const response = await this.get(url, { responseType: 'stream' });

            // 确保目录存在
            const dir = path.dirname(savePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            const writer = fs.createWriteStream(savePath);
            const totalLength = parseInt(response.headers['content-length'] || '0');
            let downloadedLength = 0;

            response.data.on('data', (chunk) => {
                downloadedLength += chunk.length;
                if (onProgress && totalLength > 0) {
                    const progress = (downloadedLength / totalLength) * 100;
                    onProgress(progress, downloadedLength, totalLength);
                }
            });

            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => resolve(savePath));
                writer.on('error', reject);
            });
        } catch (error) {
            console.error('文件下载失败:', url, error.message);
            throw error;
        }
    }

    /**
     * 清理和标准化文本
     * @param {string} text - 原始文本
     * @returns {string} 清理后的文本
     */
    cleanText(text) {
        if (!text) return '';

        return text
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/[\r\n\t]/g, '')
            .replace(/\u00A0/g, ' '); // 替换不间断空格
    }

    /**
     * 从相对URL构建完整URL
     * @param {string} relativeURL - 相对URL
     * @param {string} baseURL - 基础URL
     * @returns {string} 完整URL
     */
    buildURL(relativeURL, baseURL = null) {
        const base = baseURL || this.baseURL;

        if (!relativeURL) return '';

        // 如果已经是完整URL，直接返回
        if (relativeURL.startsWith('http://') || relativeURL.startsWith('https://')) {
            return relativeURL;
        }

        // 处理协议相对URL
        if (relativeURL.startsWith('//')) {
            return 'https:' + relativeURL;
        }

        // 处理根相对URL
        if (relativeURL.startsWith('/')) {
            return base + relativeURL;
        }

        // 处理相对URL
        return base + '/' + relativeURL;
    }

    /**
     * 提取数字
     * @param {string} text - 文本
     * @returns {string|null} 数字字符串
     */
    extractNumber(text) {
        if (!text) return null;

        const match = text.match(/\d+/);
        return match ? match[0] : null;
    }

    /**
     * 提取日期
     * @param {string} text - 文本
     * @returns {string|null} 标准化日期字符串 (YYYY-MM-DD)
     */
    extractDate(text) {
        if (!text) return null;

        // 匹配常见的日期格式
        const patterns = [
            /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/,  // 2023-12-25, 2023/12/25
            /(\d{4})年(\d{1,2})月(\d{1,2})日/,       // 2023年12月25日
            /(\d{4})\.(\d{1,2})\.(\d{1,2})/,        // 2023.12.25
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                const year = match[1].padStart(4, '0');
                const month = match[2].padStart(2, '0');
                const day = match[3].padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
        }

        return null;
    }

    /**
     * 睡眠函数
     * @param {number} ms - 毫秒数
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 抽象方法：刮削器必须实现
     */
    async scrape(avid) {
        throw new Error('子类必须实现scrape方法');
    }

    /**
     * 检查番号是否被支持
     * @param {string} avid - 番号
     * @returns {boolean} 是否支持
     */
    isSupported(avid) {
        // 默认实现，子类可以重写
        return avid && avid.length > 0;
    }

    /**
     * 获取刮削器名称
     * @returns {string} 刮削器名称
     */
    getName() {
        return this.constructor.name.replace('Scraper', '').toLowerCase();
    }
}

module.exports = BaseScraper;