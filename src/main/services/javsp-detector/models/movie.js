/**
 * 影片数据模型
 * 从JavSP datatype.py移植的JavaScript版本
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * 影片信息类
 * 包含影片的详细元数据
 */
class MovieInfo {
    constructor(options = {}) {
        // 番号相关
        this.dvdid = options.dvdid || null;          // DVD ID，即通常的番号
        this.cid = options.cid || null;              // DMM Content ID

        // 基本信息
        this.url = options.url || null;              // 影片页面的URL
        this.title = options.title || null;          // 影片标题（不含番号）
        this.ori_title = options.ori_title || null;  // 原始影片标题
        this.plot = options.plot || null;            // 故事情节

        // 媒体内容
        this.cover = options.cover || null;          // 封面图片（URL）
        this.big_cover = options.big_cover || null;  // 高清封面图片（URL）
        this.preview_pics = options.preview_pics || null;    // 预览图片（URL）
        this.preview_video = options.preview_video || null;   // 预览视频（URL）
        this.magnet = options.magnet || null;        // 磁力链接

        // 分类和标签
        this.genre = options.genre || null;          // 影片分类的标签
        this.genre_id = options.genre_id || null;    // 影片分类的标签ID
        this.genre_norm = options.genre_norm || null; // 统一后的影片分类标签
        this.score = options.score || null;          // 评分（10分制）

        // 演职人员
        this.actress = options.actress || null;      // 出演女优
        this.actress_pics = options.actress_pics || null; // 出演女优头像
        this.director = options.director || null;    // 导演

        // 制作信息
        this.serial = options.serial || null;        // 系列
        this.producer = options.producer || null;    // 制作商
        this.publisher = options.publisher || null;  // 发行商
        this.duration = options.duration || null;    // 影片时长
        this.uncensored = options.uncensored || null; // 是否为无码影片
        this.publish_date = options.publish_date || null; // 发布日期

        // 元数据
        this.source = options.source || null;        // 数据来源站点
        this.updated_at = options.updated_at || new Date().toISOString();
    }

    /**
     * 转换为JSON字符串
     */
    toString() {
        return JSON.stringify(this, null, 2);
    }

    /**
     * 从JSON对象创建实例
     * @param {Object} data - JSON数据
     * @returns {MovieInfo}
     */
    static fromJSON(data) {
        return new MovieInfo(data);
    }

    /**
     * 从文件加载数据
     * @param {string} filePath - 文件路径
     * @returns {MovieInfo}
     */
    static fromFile(filePath) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`文件不存在: ${filePath}`);
        }

        try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            return MovieInfo.fromJSON(data);
        } catch (error) {
            throw new Error(`读取文件失败: ${filePath}, 错误: ${error.message}`);
        }
    }

    /**
     * 保存到文件
     * @param {string} filePath - 文件路径
     */
    saveToFile(filePath) {
        try {
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(filePath, this.toString(), 'utf8');
        } catch (error) {
            throw new Error(`保存文件失败: ${filePath}, 错误: ${error.message}`);
        }
    }

    /**
     * 生成用于模板填充的字典
     * @param {Object} config - 配置对象，用于默认值
     * @returns {Object}
     */
    getInfoDic(config = {}) {
        const defaults = config.summarizer?.default || {};
        const censorOptions = config.summarizer?.censor_options_representation || ['有码', '无码'];

        const num = this.dvdid || this.cid || '';
        const numItems = num.split('-');
        const label = numItems.length > 1 ? numItems[0] : '---';

        return {
            num,
            title: this.title || defaults.title || '',
            rawtitle: this.ori_title || this.title || defaults.title || '',
            actress: Array.isArray(this.actress) ? this.actress.join(',') : (this.actress || defaults.actress || ''),
            score: this.score || '0',
            censor: censorOptions[this.uncensored ? 1 : 0],
            serial: this.serial || defaults.series || '',
            director: this.director || defaults.director || '',
            producer: this.producer || defaults.producer || '',
            publisher: this.publisher || defaults.publisher || '',
            date: this.publish_date || '0000-00-00',
            year: (this.publish_date || '0000-00-00').split('-')[0],
            label,
            genre: Array.isArray(this.genre_norm) ? this.genre_norm.join(',') :
                   Array.isArray(this.genre) ? this.genre.join(',') : '',
            url: this.url || '',
            cover: this.cover || '',
            plot: this.plot || '',
            duration: this.duration || '',
            source: this.source || ''
        };
    }

    /**
     * 验证数据完整性
     * @returns {Object} 验证结果
     */
    validate() {
        const errors = [];
        const warnings = [];

        if (!this.dvdid && !this.cid) {
            errors.push('缺少番号(dvdid或cid)');
        }

        if (!this.title) {
            warnings.push('缺少标题');
        }

        if (this.score && (isNaN(this.score) || this.score < 0 || this.score > 10)) {
            warnings.push('评分格式不正确，应为0-10之间的数字');
        }

        if (this.publish_date && !/^\d{4}-\d{2}-\d{2}$/.test(this.publish_date)) {
            warnings.push('发布日期格式不正确，应为YYYY-MM-DD');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * 合并其他MovieInfo的数据
     * @param {MovieInfo} other - 另一个MovieInfo实例
     * @param {Object} options - 合并选项
     */
    merge(other, options = {}) {
        const { overwrite = false, preferSource = [] } = options;

        const fields = [
            'title', 'ori_title', 'plot', 'cover', 'big_cover', 'genre', 'genre_norm',
            'actress', 'director', 'serial', 'producer', 'publisher', 'duration',
            'publish_date', 'score', 'uncensored'
        ];

        for (const field of fields) {
            if (other[field] !== null && other[field] !== undefined) {
                if (!this[field] || overwrite || preferSource.includes(other.source)) {
                    this[field] = other[field];
                }
            }
        }

        // 特殊处理数组字段
        if (other.actress && Array.isArray(other.actress)) {
            if (!this.actress || !Array.isArray(this.actress)) {
                this.actress = [...other.actress];
            } else {
                // 合并女优列表，去重
                const merged = [...new Set([...this.actress, ...other.actress])];
                this.actress = merged;
            }
        }

        if (other.genre && Array.isArray(other.genre)) {
            if (!this.genre || !Array.isArray(this.genre)) {
                this.genre = [...other.genre];
            } else {
                const merged = [...new Set([...this.genre, ...other.genre])];
                this.genre = merged;
            }
        }

        return this;
    }
}

/**
 * 影片文件类
 * 用于关联影片文件和管理文件操作
 */
class Movie {
    constructor(options = {}) {
        this.dvdid = options.dvdid || null;              // DVD ID，即通常的番号
        this.cid = options.cid || null;                  // DMM Content ID
        this.files = options.files || [];                // 关联到此番号的所有影片文件列表
        this.data_src = options.data_src || 'normal';    // 数据源类型
        this.info = options.info || null;                // 影片信息(MovieInfo实例)
        this.save_dir = options.save_dir || null;        // 存放影片、封面、NFO的文件夹路径
        this.basename = options.basename || null;        // 按照命名模板生成的basename
        this.nfo_file = options.nfo_file || null;        // nfo文件路径
        this.fanart_file = options.fanart_file || null;  // fanart文件路径
        this.poster_file = options.poster_file || null;  // poster文件路径
        this.guid = options.guid || null;                // GUI使用的唯一标识

        if (!this.guid && (this.dvdid || this.cid)) {
            this.generateGuid();
        }
    }

    /**
     * 生成GUID
     */
    generateGuid() {
        const content = `${this.dvdid || this.cid}-${this.files.join('-')}`;
        this.guid = crypto.createHash('md5').update(content).digest('hex');
    }

    /**
     * 获取番号（优先返回dvdid）
     */
    get avid() {
        return this.dvdid || this.cid;
    }

    /**
     * 检测影片是否带有内嵌字幕
     */
    get hardSub() {
        return this.attrStr.includes('C');
    }

    /**
     * 检测影片是否为无码版本
     */
    get uncensored() {
        return this.attrStr.includes('U');
    }

    /**
     * 获取影片文件的额外属性字符串
     */
    get attrStr() {
        if (this.files.length !== 1) {
            return '';
        }

        const filename = path.basename(this.files[0]).toUpperCase();
        const avid = (this.dvdid || this.cid || '').toUpperCase();

        // 简化版本的特殊属性检测
        let attr = '';
        if (filename.includes('UNCENSORED') || filename.includes('无码')) {
            attr += 'U';
        }
        if (filename.includes('SUB') || filename.includes('字幕') || filename.includes('-C')) {
            attr += 'C';
        }

        return attr ? '-' + attr : '';
    }

    /**
     * 添加文件
     * @param {string} filePath - 文件路径
     */
    addFile(filePath) {
        if (!this.files.includes(filePath)) {
            this.files.push(filePath);
            this.generateGuid(); // 重新生成GUID
        }
    }

    /**
     * 移除文件
     * @param {string} filePath - 文件路径
     */
    removeFile(filePath) {
        const index = this.files.indexOf(filePath);
        if (index > -1) {
            this.files.splice(index, 1);
            this.generateGuid(); // 重新生成GUID
        }
    }

    /**
     * 获取主文件（第一个文件）
     */
    get mainFile() {
        return this.files.length > 0 ? this.files[0] : null;
    }

    /**
     * 检查是否为多分片影片
     */
    get isMultiPart() {
        return this.files.length > 1;
    }

    /**
     * 验证影片数据
     * @returns {Object} 验证结果
     */
    validate() {
        const errors = [];
        const warnings = [];

        if (!this.dvdid && !this.cid) {
            errors.push('缺少番号(dvdid或cid)');
        }

        if (this.files.length === 0) {
            warnings.push('没有关联的影片文件');
        }

        // 检查文件是否存在
        for (const file of this.files) {
            if (!fs.existsSync(file)) {
                warnings.push(`文件不存在: ${file}`);
            }
        }

        if (this.info) {
            const infoValidation = this.info.validate();
            errors.push(...infoValidation.errors);
            warnings.push(...infoValidation.warnings);
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * 转换为JSON对象
     */
    toJSON() {
        return {
            dvdid: this.dvdid,
            cid: this.cid,
            files: this.files,
            data_src: this.data_src,
            info: this.info ? this.info.toJSON() : null,
            save_dir: this.save_dir,
            basename: this.basename,
            nfo_file: this.nfo_file,
            fanart_file: this.fanart_file,
            poster_file: this.poster_file,
            guid: this.guid
        };
    }

    /**
     * 从JSON对象创建实例
     * @param {Object} data - JSON数据
     * @returns {Movie}
     */
    static fromJSON(data) {
        const movie = new Movie({
            dvdid: data.dvdid,
            cid: data.cid,
            files: data.files || [],
            data_src: data.data_src || 'normal',
            save_dir: data.save_dir,
            basename: data.basename,
            nfo_file: data.nfo_file,
            fanart_file: data.fanart_file,
            poster_file: data.poster_file,
            guid: data.guid
        });

        if (data.info) {
            movie.info = MovieInfo.fromJSON(data.info);
        }

        return movie;
    }

    /**
     * 字符串表示
     */
    toString() {
        return `Movie(${this.cid && this.data_src === 'cid' ? `cid=${this.cid}` : `'${this.dvdid}'`})`;
    }
}

module.exports = {
    MovieInfo,
    Movie
};