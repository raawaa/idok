/**
 * 刮削器管理器
 * 管理多个网站刮削器，提供统一的接口
 */

const JavBusScraper = require('./javbus-scraper');

class ScraperManager {
    constructor(config = {}) {
        this.config = config;
        this.scrapers = new Map();
        this.enabledScrapers = config.scrapers?.enabled || ['javbus'];
        this.priority = config.scrapers?.priority || {};

        this.initScrapers();
    }

    /**
     * 初始化刮削器
     */
    initScrapers() {
        // 注册刮削器
        this.registerScraper('javbus', new JavBusScraper(this.config.scrapers?.sites?.javbus || {}));

        // 未来可以添加更多刮削器
        // this.registerScraper('javdb', new JavDBScraper(...));
        // this.registerScraper('fanza', new FanzaScraper(...));
    }

    /**
     * 注册刮削器
     * @param {string} name - 刮削器名称
     * @param {BaseScraper} scraper - 刮削器实例
     */
    registerScraper(name, scraper) {
        this.scrapers.set(name, scraper);
    }

    /**
     * 获取指定类型的优先级刮削器列表
     * @param {string} type - 番号类型 (normal, fc2, cid, getchu, gyutto)
     * @returns {Array} 刮削器名称列表
     */
    getScrapersByType(type) {
        const priorityList = this.priority[type] || this.enabledScrapers;
        return priorityList.filter(name => this.scrapers.has(name) && this.enabledScrapers.includes(name));
    }

    /**
     * 刮削单个番号
     * @param {string} avid - 番号
     * @param {string} type - 番号类型
     * @param {Object} options - 选项
     * @returns {Promise<MovieInfo|null>} 影片信息
     */
    async scrape(avid, type = 'normal', options = {}) {
        if (!avid) return null;

        const { maxScrapers = 3, preferSource = null } = options;
        const scrapersToTry = [];

        // 如果指定了偏好来源，优先使用
        if (preferSource && this.scrapers.has(preferSource)) {
            scrapersToTry.push(preferSource);
        }

        // 添加优先级刮削器
        const priorityScrapers = this.getScrapersByType(type);
        for (const scraperName of priorityScrapers) {
            if (!scrapersToTry.includes(scraperName)) {
                scrapersToTry.push(scraperName);
            }
        }

        // 添加其他启用的刮削器
        for (const scraperName of this.enabledScrapers) {
            if (!scrapersToTry.includes(scraperName) && this.scrapers.has(scraperName)) {
                scrapersToTry.push(scraperName);
            }
        }

        // 限制尝试的刮削器数量
        const scrapers = scrapersToTry.slice(0, maxScrapers);

        for (const scraperName of scrapers) {
            try {
                const scraper = this.scrapers.get(scraperName);
                if (!scraper.isSupported(avid)) {
                    continue;
                }

                console.log(`尝试使用 ${scraperName} 刮削: ${avid}`);
                const movieInfo = await scraper.scrape(avid);

                if (movieInfo && this.validateMovieInfo(movieInfo)) {
                    console.log(`${scraperName} 刮削成功: ${avid}`);
                    return movieInfo;
                }

            } catch (error) {
                console.error(`${scraperName} 刮削失败: ${avid}`, error.message);
            }
        }

        console.warn(`所有刮削器都无法获取番号信息: ${avid}`);
        return null;
    }

    /**
     * 批量刮削
     * @param {Array} requests - 请求列表 [{avid, type}, ...]
     * @param {Object} options - 选项
     * @returns {Promise<Array>} 结果列表
     */
    async batchScrape(requests, options = {}) {
        const { maxConcurrent = 3, delay = 1000 } = options;
        const results = [];

        // 分批处理
        for (let i = 0; i < requests.length; i += maxConcurrent) {
            const batch = requests.slice(i, i + maxConcurrent);
            const batchPromises = batch.map(async (request, index) => {
                const result = await this.scrape(request.avid, request.type, options);
                return {
                    index: i + index,
                    avid: request.avid,
                    type: request.type,
                    success: result !== null,
                    data: result
                };
            });

            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);

            // 批次间延迟
            if (i + maxConcurrent < requests.length && delay > 0) {
                await this.sleep(delay);
            }
        }

        return results;
    }

    /**
     * 搜索番号
     * @param {string} keyword - 搜索关键词
     * @param {Array} scraperNames - 要使用的刮削器列表
     * @returns {Promise<Array>} 搜索结果
     */
    async search(keyword, scraperNames = null) {
        const scrapersToTry = scraperNames || this.enabledScrapers;
        const allResults = [];

        for (const scraperName of scrapersToTry) {
            try {
                const scraper = this.scrapers.get(scraperName);
                if (scraper && typeof scraper.search === 'function') {
                    console.log(`使用 ${scraperName} 搜索: ${keyword}`);
                    const results = await scraper.search(keyword);
                    allResults.push(...results.map(r => ({ ...r, source: scraperName })));
                }
            } catch (error) {
                console.error(`${scraperName} 搜索失败: ${keyword}`, error.message);
            }
        }

        // 去重（基于番号）
        const uniqueResults = [];
        const seenAvids = new Set();

        for (const result of allResults) {
            if (!seenAvids.has(result.avid)) {
                seenAvids.add(result.avid);
                uniqueResults.push(result);
            }
        }

        return uniqueResults;
    }

    /**
     * 验证影片信息的有效性
     * @param {MovieInfo} movieInfo - 影片信息
     * @returns {boolean} 是否有效
     */
    validateMovieInfo(movieInfo) {
        if (!movieInfo) return false;

        // 至少要有标题或番号
        if (!movieInfo.title && !movieInfo.dvdid && !movieInfo.cid) {
            return false;
        }

        // 可以添加更多验证规则
        return true;
    }

    /**
     * 获取刮削器状态
     * @returns {Object} 状态信息
     */
    getStatus() {
        const status = {};

        for (const [name, scraper] of this.scrapers) {
            status[name] = {
                enabled: this.enabledScrapers.includes(name),
                baseURL: scraper.baseURL,
                accessible: false // 可以异步检查连通性
            };
        }

        return status;
    }

    /**
     * 启用刮削器
     * @param {string|Array} scraperNames - 刮削器名称
     */
    enableScrapers(scraperNames) {
        const names = Array.isArray(scraperNames) ? scraperNames : [scraperNames];
        for (const name of names) {
            if (!this.enabledScrapers.includes(name) && this.scrapers.has(name)) {
                this.enabledScrapers.push(name);
            }
        }
    }

    /**
     * 禁用刮削器
     * @param {string|Array} scraperNames - 刮削器名称
     */
    disableScrapers(scraperNames) {
        const names = Array.isArray(scraperNames) ? scraperNames : [scraperNames];
        for (const name of names) {
            const index = this.enabledScrapers.indexOf(name);
            if (index > -1) {
                this.enabledScrapers.splice(index, 1);
            }
        }
    }

    /**
     * 设置刮削器优先级
     * @param {string} type - 番号类型
     * @param {Array} scraperNames - 刮削器名称列表（按优先级排序）
     */
    setPriority(type, scraperNames) {
        this.priority[type] = scraperNames;
    }

    /**
     * 睡眠函数
     * @param {number} ms - 毫秒数
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = ScraperManager;