/**
 * 数据加载工具
 * 用于加载女优别名、分类映射等数据文件
 */

const fs = require('fs');
const path = require('path');

class DataLoader {
    constructor(dataDir = null) {
        this.dataDir = dataDir || path.join(__dirname, '../data');
        this.actressAliasCache = null;
        this.genreMappingCache = null;
    }

    /**
     * 加载女优别名映射
     * @returns {Object} 女优别名映射表
     */
    loadActressAlias() {
        if (this.actressAliasCache !== null) {
            return this.actressAliasCache;
        }

        try {
            const filePath = path.join(this.dataDir, 'actress-alias.json');
            if (!fs.existsSync(filePath)) {
                console.warn('女优别名文件不存在:', filePath);
                this.actressAliasCache = {};
                return this.actressAliasCache;
            }

            const data = fs.readFileSync(filePath, 'utf8');
            this.actressAliasCache = JSON.parse(data);
            console.log(`加载女优别名映射: ${Object.keys(this.actressAliasCache).length} 个别名组`);
            return this.actressAliasCache;

        } catch (error) {
            console.error('加载女优别名映射失败:', error);
            this.actressAliasCache = {};
            return this.actressAliasCache;
        }
    }

    /**
     * 加载分类映射
     * @returns {Object} 分类映射表
     */
    loadGenreMapping() {
        if (this.genreMappingCache !== null) {
            return this.genreMappingCache;
        }

        try {
            const filePath = path.join(this.dataDir, 'genre-mapping.json');
            if (!fs.existsSync(filePath)) {
                console.warn('分类映射文件不存在:', filePath);
                this.genreMappingCache = {};
                return this.genreMappingCache;
            }

            const data = fs.readFileSync(filePath, 'utf8');
            this.genreMappingCache = JSON.parse(data);
            console.log(`加载分类映射: ${Object.keys(this.genreMappingCache).length} 个站点`);
            return this.genreMappingCache;

        } catch (error) {
            console.error('加载分类映射失败:', error);
            this.genreMappingCache = {};
            return this.genreMappingCache;
        }
    }

    /**
     * 标准化女优名称
     * @param {string} name - 原始名称
     * @returns {string} 标准化后的名称
     */
    normalizeActressName(name) {
        if (!name) return '';

        const aliasMap = this.loadActressAlias();

        // 首先检查是否为标准名称
        if (aliasMap[name]) {
            return name;
        }

        // 检查是否为别名
        for (const [standardName, aliases] of Object.entries(aliasMap)) {
            if (aliases.includes(name)) {
                return standardName;
            }
        }

        // 如果没有找到映射，返回原始名称
        return name;
    }

    /**
     * 获取女优的所有别名
     * @param {string} name - 女优名称
     * @returns {Array} 别名列表
     */
    getActressAliases(name) {
        if (!name) return [];

        const aliasMap = this.loadActressAlias();

        // 如果是标准名称，返回所有别名
        if (aliasMap[name]) {
            return [...new Set([name, ...aliasMap[name]])];
        }

        // 如果是别名，找到标准名称并返回所有别名
        for (const [standardName, aliases] of Object.entries(aliasMap)) {
            if (aliases.includes(name)) {
                return [...new Set([standardName, ...aliases])];
            }
        }

        // 如果没有找到，返回原名称
        return [name];
    }

    /**
     * 翻译分类名称
     * @param {string} genreId - 分类ID
     * @param {string} site - 站点名称
     * @returns {string} 翻译后的分类名称
     */
    translateGenre(genreId, site = 'javbus') {
        if (!genreId) return '';

        const genreMap = this.loadGenreMapping();
        const siteMap = genreMap[site] || {};

        return siteMap[genreId] || genreId;
    }

    /**
     * 批量翻译分类名称
     * @param {Array} genreIds - 分类ID列表
     * @param {string} site - 站点名称
     * @returns {Array} 翻译后的分类名称列表
     */
    translateGenres(genreIds, site = 'javbus') {
        if (!Array.isArray(genreIds)) return [];

        return genreIds.map(id => this.translateGenre(id, site))
                      .filter(name => name && name.trim() !== '');
    }

    /**
     * 重新加载数据
     */
    reload() {
        this.actressAliasCache = null;
        this.genreMappingCache = null;
        console.log('数据缓存已清空，将在下次访问时重新加载');
    }

    /**
     * 获取数据加载状态
     * @returns {Object} 状态信息
     */
    getStatus() {
        return {
            dataDir: this.dataDir,
            actressAliasLoaded: this.actressAliasCache !== null,
            genreMappingLoaded: this.genreMappingCache !== null,
            actressAliasCount: this.actressAliasCache ? Object.keys(this.actressAliasCache).length : 0,
            genreMappingCount: this.genreMappingCache ? Object.keys(this.genreMappingCache).length : 0
        };
    }

    /**
     * 验证数据文件完整性
     * @returns {Object} 验证结果
     */
    validateDataFiles() {
        const result = {
            valid: true,
            files: {},
            errors: []
        };

        // 检查女优别名文件
        const actressAliasPath = path.join(this.dataDir, 'actress-alias.json');
        try {
            if (fs.existsSync(actressAliasPath)) {
                const data = JSON.parse(fs.readFileSync(actressAliasPath, 'utf8'));
                result.files.actressAlias = {
                    exists: true,
                    valid: true,
                    size: fs.statSync(actressAliasPath).size,
                    count: Object.keys(data).length
                };
            } else {
                result.files.actressAlias = { exists: false, valid: false };
                result.errors.push('女优别名文件不存在');
                result.valid = false;
            }
        } catch (error) {
            result.files.actressAlias = { exists: true, valid: false, error: error.message };
            result.errors.push(`女优别名文件格式错误: ${error.message}`);
            result.valid = false;
        }

        // 检查分类映射文件
        const genreMappingPath = path.join(this.dataDir, 'genre-mapping.json');
        try {
            if (fs.existsSync(genreMappingPath)) {
                const data = JSON.parse(fs.readFileSync(genreMappingPath, 'utf8'));
                result.files.genreMapping = {
                    exists: true,
                    valid: true,
                    size: fs.statSync(genreMappingPath).size,
                    sites: Object.keys(data).length
                };
            } else {
                result.files.genreMapping = { exists: false, valid: false };
                result.errors.push('分类映射文件不存在');
                result.valid = false;
            }
        } catch (error) {
            result.files.genreMapping = { exists: true, valid: false, error: error.message };
            result.errors.push(`分类映射文件格式错误: ${error.message}`);
            result.valid = false;
        }

        return result;
    }
}

module.exports = DataLoader;