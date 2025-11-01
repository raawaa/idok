/**
 * JavBus网站刮削器
 * 从JavSP javbus.py移植的JavaScript版本
 */

const BaseScraper = require('./base-scraper');
const { MovieInfo } = require('../models/movie');

class JavBusScraper extends BaseScraper {
    constructor(config = {}) {
        super({
            base_url: 'https://www.javbus.com',
            timeout: 15000,
            ...config
        });

        this.genreMap = new Map();
        this.loadGenreMap();
    }

    /**
     * 加载分类映射表
     */
    loadGenreMap() {
        // 简化的分类映射，实际应用中可以从配置文件加载
        const genres = {
            '101': '巨乳',
            '102': '制服',
            '103': '女教师',
            '104': '女学生',
            '105': 'OL',
            '106': '成熟的女人',
            '107': '已婚妇女',
            '108': '姐妹',
            '109': '女同性恋',
            '110': '出道作品',
            '111': '独奏',
            '112': '口交',
            '113': '潮吹',
            '114': '手淫',
            '115': '多P',
            '116': '3P',
            '117': '4P',
            '118': '团体性爱',
            '119': '面部射精',
            '120': '体内射精',
            '121': 'SM',
            '122': '调教',
            '123': '凌辱',
            '124': '强奸',
            '125': '近亲相奸',
            '126': '乱伦',
            '127': '女优'
        };

        for (const [id, name] of Object.entries(genres)) {
            this.genreMap.set(id, name);
        }
    }

    /**
     * 刮削影片信息
     * @param {string} avid - 番号
     * @returns {Promise<MovieInfo|null>} 影片信息
     */
    async scrape(avid) {
        if (!this.isSupported(avid)) {
            return null;
        }

        try {
            const url = `${this.baseURL}/${avid}`;
            const document = await this.fetchPage(url);

            // 检查是否是404页面
            const title = document.querySelector('title')?.textContent;
            if (title && title.includes('404')) {
                console.warn(`JavBus未找到番号: ${avid}`);
                return null;
            }

            const movieInfo = new MovieInfo({ dvdid: avid, source: 'javbus' });

            // 解析基本信息
            this.parseBasicInfo(document, movieInfo);

            // 解析详细信息
            this.parseDetailedInfo(document, movieInfo);

            // 解析女优信息
            this.parseActressInfo(document, movieInfo);

            // 解析分类信息
            this.parseGenreInfo(document, movieInfo);

            // 解析预览图片
            this.parsePreviewPics(document, movieInfo);

            return movieInfo;

        } catch (error) {
            console.error(`JavBus刮削失败: ${avid}`, error.message);
            return null;
        }
    }

    /**
     * 解析基本信息
     */
    parseBasicInfo(document, movieInfo) {
        try {
            // 标题
            const titleElement = document.querySelector('.container h3');
            if (titleElement) {
                movieInfo.title = this.cleanText(titleElement.textContent);
            }

            // 封面
            const coverElement = document.querySelector('.bigImage img');
            if (coverElement) {
                movieInfo.cover = this.buildURL(coverElement.getAttribute('src'));
            }

            // 番号
            const avidElement = document.querySelector('.info p span:contains("識別碼:")');
            if (avidElement) {
                const avidText = avidElement.nextSibling?.textContent;
                if (avidText) {
                    movieInfo.dvdid = this.cleanText(avidText);
                }
            }

            // 发布日期
            const dateElement = document.querySelector('.info p span:contains("發行日期:")');
            if (dateElement) {
                const dateText = dateElement.nextSibling?.textContent;
                if (dateText) {
                    movieInfo.publish_date = this.extractDate(dateText);
                }
            }

            // 时长
            const durationElement = document.querySelector('.info p span:contains("長度:")');
            if (durationElement) {
                const durationText = durationElement.nextSibling?.textContent;
                if (durationText) {
                    movieInfo.duration = this.extractNumber(durationText) + '分钟';
                }
            }

        } catch (error) {
            console.error('解析基本信息失败:', error);
        }
    }

    /**
     * 解析详细信息
     */
    parseDetailedInfo(document, movieInfo) {
        try {
            const infoSection = document.querySelector('.info');

            // 导演
            const directorElement = infoSection?.querySelector('p span:contains("導演:")');
            if (directorElement) {
                const directorLink = directorElement.nextElementSibling?.querySelector('a');
                if (directorLink) {
                    movieInfo.director = this.cleanText(directorLink.textContent);
                }
            }

            // 制作商
            const producerElement = infoSection?.querySelector('p span:contains("製作商:")');
            if (producerElement) {
                const producerLink = producerElement.nextElementSibling?.querySelector('a');
                if (producerLink) {
                    movieInfo.producer = this.cleanText(producerLink.textContent);
                }
            }

            // 发行商
            const publisherElement = infoSection?.querySelector('p span:contains("發行商:")');
            if (publisherElement) {
                const publisherLink = publisherElement.nextElementSibling?.querySelector('a');
                if (publisherLink) {
                    movieInfo.publisher = this.cleanText(publisherLink.textContent);
                }
            }

            // 系列
            const serialElement = infoSection?.querySelector('p span:contains("系列:")');
            if (serialElement) {
                const serialLink = serialElement.nextElementSibling?.querySelector('a');
                if (serialLink) {
                    movieInfo.serial = this.cleanText(serialLink.textContent);
                }
            }

        } catch (error) {
            console.error('解析详细信息失败:', error);
        }
    }

    /**
     * 解析女优信息
     */
    parseActressInfo(document, movieInfo) {
        try {
            const actressElements = document.querySelectorAll('.avatar-box');
            const actresses = [];
            const actressPics = {};

            actressElements.forEach(element => {
                const nameElement = element.querySelector('img');
                const linkElement = element.querySelector('a');

                if (nameElement && linkElement) {
                    const name = this.cleanText(nameElement.getAttribute('title'));
                    const pic = this.buildURL(nameElement.getAttribute('src'));

                    if (name) {
                        actresses.push(name);
                        actressPics[name] = pic;
                    }
                }
            });

            if (actresses.length > 0) {
                movieInfo.actress = actresses;
                movieInfo.actress_pics = actressPics;
            }

        } catch (error) {
            console.error('解析女优信息失败:', error);
        }
    }

    /**
     * 解析分类信息
     */
    parseGenreInfo(document, movieInfo) {
        try {
            const genreElements = document.querySelectorAll('.genre label a');
            const genres = [];
            const genreIds = [];

            genreElements.forEach(element => {
                const genreName = this.cleanText(element.textContent);
                const genreUrl = element.getAttribute('href');

                if (genreName && genreUrl) {
                    genres.push(genreName);

                    // 提取分类ID
                    const idMatch = genreUrl.match(/\/([^\/]+)\/?$/);
                    if (idMatch) {
                        const genreId = idMatch[1];
                        genreIds.push(genreId);

                        // 检查是否为无码
                        if (genreUrl.includes('uncensored')) {
                            movieInfo.uncensored = true;
                        }
                    }
                }
            });

            if (genres.length > 0) {
                movieInfo.genre = genres;
                movieInfo.genre_id = genreIds;

                // 映射到标准分类
                const normalizedGenres = [];
                for (const genreId of genreIds) {
                    const mappedGenre = this.genreMap.get(genreId);
                    if (mappedGenre && !normalizedGenres.includes(mappedGenre)) {
                        normalizedGenres.push(mappedGenre);
                    }
                }
                movieInfo.genre_norm = normalizedGenres;
            }

        } catch (error) {
            console.error('解析分类信息失败:', error);
        }
    }

    /**
     * 解析预览图片
     */
    parsePreviewPics(document, movieInfo) {
        try {
            const previewElements = document.querySelectorAll('#sample-waterfall a');
            const previewPics = [];

            previewElements.forEach(element => {
                const href = element.getAttribute('href');
                if (href) {
                    previewPics.push(this.buildURL(href));
                }
            });

            if (previewPics.length > 0) {
                movieInfo.preview_pics = previewPics;
            }

        } catch (error) {
            console.error('解析预览图片失败:', error);
        }
    }

    /**
     * 检查番号格式是否支持
     */
    isSupported(avid) {
        // JavBus主要支持普通番号格式
        if (!avid) return false;

        // 检查是否为FC2番号（不支持）
        if (/^FC2-\d+$/i.test(avid)) {
            return false;
        }

        // 检查是否为CID格式（不支持）
        if (/^[a-z\d_]+$/i.test(avid) && !/[A-Z]-\d+/.test(avid)) {
            return false;
        }

        return true;
    }

    /**
     * 获取搜索结果（用于模糊匹配）
     * @param {string} keyword - 搜索关键词
     * @returns {Promise<Array>} 搜索结果列表
     */
    async search(keyword) {
        try {
            const searchURL = `${this.baseURL}/search/${encodeURIComponent(keyword)}`;
            const document = await this.fetchPage(searchURL);

            const results = [];
            const resultElements = document.querySelectorAll('.movie-box');

            resultElements.forEach(element => {
                const linkElement = element.querySelector('a');
                const imgElement = element.querySelector('img');
                const dateElement = element.querySelector('.date');

                if (linkElement && imgElement) {
                    const href = linkElement.getAttribute('href');
                    const title = this.cleanText(imgElement.getAttribute('title'));
                    const cover = this.buildURL(imgElement.getAttribute('src'));
                    const date = dateElement ? this.cleanText(dateElement.textContent) : '';

                    // 从URL提取番号
                    const avidMatch = href.match(/\/([^\/]+)\/?$/);
                    const avid = avidMatch ? avidMatch[1] : '';

                    if (avid && title) {
                        results.push({
                            avid,
                            title,
                            cover,
                            date,
                            url: this.buildURL(href)
                        });
                    }
                }
            });

            return results;

        } catch (error) {
            console.error(`JavBus搜索失败: ${keyword}`, error.message);
            return [];
        }
    }
}

module.exports = JavBusScraper;