/**
 * JavSP番号识别模块
 * 从JavSP项目移植的JavaScript版本番号识别功能
 */

const AVIDDetector = require('./avid-detector');
const ScraperManager = require('./scrapers/scraper-manager');
const DataLoader = require('./utils/data-loader');
const { Movie, MovieInfo } = require('./models/movie');
const config = require('./config');

class JavspDetector {
    constructor(options = {}) {
        this.config = { ...config, ...options };
        this.detector = new AVIDDetector(this.config);
        this.scraperManager = new ScraperManager(this.config);
        this.dataLoader = new DataLoader();
        this.cache = new Map(); // 简单的内存缓存
    }

    /**
     * 从文件路径检测番号
     * @param {string} filePath - 文件路径
     * @returns {Promise<{avid: string|null, type: string, confidence: number}>}
     */
    async detectFromPath(filePath) {
        // 检查缓存
        const cacheKey = filePath;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            // 基本文件检查
            if (!this._isValidMediaFile(filePath)) {
                const result = { avid: null, type: 'unknown', confidence: 0 };
                this.cache.set(cacheKey, result);
                return result;
            }

            // 提取番号
            const avid = this.detector.get_id(filePath);
            const cid = this.detector.get_cid(filePath);

            if (!avid && !cid) {
                const result = { avid: null, type: 'unknown', confidence: 0 };
                this.cache.set(cacheKey, result);
                return result;
            }

            // 识别类型
            const type = this.detector.guess_av_type(avid || cid);
            const confidence = this._calculateConfidence(avid || cid, filePath);

            const result = {
                avid: avid || cid,
                type,
                confidence
            };

            this.cache.set(cacheKey, result);
            return result;

        } catch (error) {
            console.error('番号检测失败:', filePath, error);
            const result = { avid: null, type: 'unknown', confidence: 0 };
            this.cache.set(cacheKey, result);
            return result;
        }
    }

    /**
     * 批量检测文件
     * @param {string[]} filePaths - 文件路径数组
     * @returns {Promise<Array>} 检测结果数组
     */
    async batchDetect(filePaths) {
        const results = [];
        for (const filePath of filePaths) {
            const result = await this.detectFromPath(filePath);
            results.push({ filePath, ...result });
        }
        return results;
    }

    /**
     * 创建Movie对象
     * @param {string} filePath - 文件路径
     * @returns {Promise<Movie|null>}
     */
    async createMovie(filePath) {
        const detection = await this.detectFromPath(filePath);
        if (!detection.avid) {
            return null;
        }

        const movie = new Movie();
        if (detection.type === 'cid') {
            movie.cid = detection.avid;
        } else {
            movie.dvdid = detection.avid;
        }

        movie.files.push(filePath);
        movie.data_src = detection.type;

        return movie;
    }

    /**
     * 扫描目录中的影片文件
     * @param {string} rootPath - 根目录路径
     * @param {function} onProgress - 进度回调函数
     * @returns {Promise<Movie[]>} 影片列表
     */
    async scanDirectory(rootPath, onProgress) {
        const fs = require('fs').promises;
        const path = require('path');

        const movies = [];
        const movieMap = new Map(); // 用于合并多分片影片

        async function scanDir(dir, progress = { current: 0, total: 0 }) {
            try {
                const entries = await fs.readdir(dir, { withFileTypes: true });

                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);

                    if (entry.isDirectory()) {
                        await scanDir(fullPath, progress);
                    } else if (entry.isFile()) {
                        progress.current++;
                        if (onProgress) {
                            onProgress(progress.current, progress.total);
                        }

                        const movie = await this.createMovie(fullPath);
                        if (movie) {
                            // 检查是否是同一影片的不同分片
                            const key = movie.dvdid || movie.cid;
                            if (movieMap.has(key)) {
                                const existingMovie = movieMap.get(key);
                                existingMovie.files.push(...movie.files);
                            } else {
                                movieMap.set(key, movie);
                                movies.push(movie);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('扫描目录失败:', dir, error);
            }
        }

        await scanDir.call(this, rootPath);
        return movies;
    }

    /**
     * 获取影片元数据
     * @param {string} avid - 番号
     * @param {string} type - 番号类型
     * @param {Object} options - 选项
     * @returns {Promise<MovieInfo|null>} 影片信息
     */
    async getMovieMetadata(avid, type = 'normal', options = {}) {
        if (!avid) return null;

        // 检查缓存
        const cacheKey = `metadata:${avid}:${type}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const movieInfo = await this.scraperManager.scrape(avid, type, options);

            if (movieInfo) {
                // 标准化女优名称
                if (movieInfo.actress && Array.isArray(movieInfo.actress)) {
                    movieInfo.actress = movieInfo.actress.map(name =>
                        this.dataLoader.normalizeActressName(name)
                    );
                }

                // 翻译分类名称
                if (movieInfo.genre_id && movieInfo.source) {
                    movieInfo.genre_norm = this.dataLoader.translateGenres(
                        movieInfo.genre_id,
                        movieInfo.source
                    );
                }

                // 缓存结果
                this.cache.set(cacheKey, movieInfo);
            }

            return movieInfo;

        } catch (error) {
            console.error('获取影片元数据失败:', avid, error.message);
            return null;
        }
    }

    /**
     * 搜索番号
     * @param {string} keyword - 搜索关键词
     * @param {Array} scraperNames - 指定的刮削器列表
     * @returns {Promise<Array>} 搜索结果
     */
    async searchMovies(keyword, scraperNames = null) {
        if (!keyword) return [];

        try {
            const results = await this.scraperManager.search(keyword, scraperNames);
            return results;
        } catch (error) {
            console.error('搜索影片失败:', keyword, error.message);
            return [];
        }
    }

    /**
     * 批量获取影片元数据
     * @param {Array} requests - 请求列表 [{avid, type}, ...]
     * @param {Object} options - 选项
     * @returns {Promise<Array>} 结果列表
     */
    async batchGetMetadata(requests, options = {}) {
        if (!Array.isArray(requests) || requests.length === 0) return [];

        try {
            const results = await this.scraperManager.batchScrape(requests, options);

            // 后处理结果
            for (const result of results) {
                if (result.success && result.data) {
                    const movieInfo = result.data;

                    // 标准化女优名称
                    if (movieInfo.actress && Array.isArray(movieInfo.actress)) {
                        movieInfo.actress = movieInfo.actress.map(name =>
                            this.dataLoader.normalizeActressName(name)
                        );
                    }

                    // 翻译分类名称
                    if (movieInfo.genre_id && movieInfo.source) {
                        movieInfo.genre_norm = this.dataLoader.translateGenres(
                            movieInfo.genre_id,
                            movieInfo.source
                        );
                    }
                }
            }

            return results;

        } catch (error) {
            console.error('批量获取元数据失败:', error.message);
            return [];
        }
    }

    /**
     * 完整处理文件：识别番号并获取元数据
     * @param {string} filePath - 文件路径
     * @param {Object} options - 选项
     * @returns {Promise<Object>} 处理结果
     */
    async processFile(filePath, options = {}) {
        try {
            // 1. 检测番号
            const detection = await this.detectFromPath(filePath);
            if (!detection.avid) {
                return {
                    success: false,
                    filePath,
                    error: '未检测到有效番号',
                    detection: null,
                    metadata: null
                };
            }

            // 2. 获取元数据
            const metadata = await this.getMovieMetadata(detection.avid, detection.type, options);

            // 3. 创建Movie对象
            const movie = await this.createMovie(filePath);
            if (movie && metadata) {
                movie.info = metadata;
            }

            return {
                success: true,
                filePath,
                detection,
                metadata,
                movie
            };

        } catch (error) {
            console.error('处理文件失败:', filePath, error.message);
            return {
                success: false,
                filePath,
                error: error.message,
                detection: null,
                metadata: null
            };
        }
    }

    /**
     * 获取模块状态
     * @returns {Object} 状态信息
     */
    getStatus() {
        return {
            detector: {
                cacheSize: this.cache.size,
                configLoaded: !!this.config
            },
            scrapers: this.scraperManager.getStatus(),
            dataLoader: this.dataLoader.getStatus(),
            dataValidation: this.dataLoader.validateDataFiles()
        };
    }

    /**
     * 重新加载数据
     */
    reloadData() {
        this.dataLoader.reload();
        this.clearCache();
        console.log('数据已重新加载');
    }

    /**
     * 清除缓存
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * 检查是否为有效的媒体文件
     * @private
     */
    _isValidMediaFile(filePath) {
        const path = require('path');
        const ext = path.extname(filePath).toLowerCase();
        return this.config.filename_extensions.includes(ext);
    }

    /**
     * 计算检测置信度
     * @private
     */
    _calculateConfidence(avid, filePath) {
        if (!avid) return 0;

        // 基于文件名匹配度的简单置信度计算
        const path = require('path');
        const filename = path.basename(filePath).toLowerCase();
        const avidLower = avid.toLowerCase();

        if (filename.includes(avidLower)) {
            return 0.9; // 高置信度
        } else if (filename.match(/[a-zA-Z]{2,6}[-_]?\d{3,6}/)) {
            return 0.7; // 中等置信度
        } else {
            return 0.5; // 低置信度
        }
    }
}

module.exports = JavspDetector;