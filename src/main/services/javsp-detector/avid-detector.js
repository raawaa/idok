/**
 * AVID番号检测器
 * 从JavSP avid.py移植的JavaScript版本
 */

const path = require('path');

class AVIDDetector {
    constructor(config = {}) {
        this.config = config;
        this.ignoredPattern = this._compileIgnoredPattern();
        this.cdPostfix = /([-_]\w|cd\d)$/;
    }

    /**
     * 从文件路径提取DVD番号
     * @param {string} filepath - 文件路径
     * @returns {string} 番号，如果未找到返回空字符串
     */
    get_id(filepath) {
        // 处理非字符串输入
        if (!filepath || typeof filepath !== 'string') return '';

        const filepath_obj = path.parse(filepath);
        const ignore_pattern = this.ignoredPattern;
        let norm = ignore_pattern.sub ?
            ignore_pattern.sub('', filepath_obj.name).toUpperCase() :
            filepath_obj.name.toUpperCase();

        // FC2番号检测
        if (norm.includes('FC2')) {
            const match = norm.match(/FC2[^A-Z\d]{0,5}(PPV[^A-Z\d]{0,5})?(\d{5,7})/i);
            if (match) {
                return 'FC2-' + match[2];
            }
        }
        // HEYDOUGA番号检测
        else if (norm.includes('HEYDOUGA')) {
            const match = norm.match(/(HEYDOUGA)[-_]*(\d{4})[-_]?0?(\d{3,5})/i);
            if (match) {
                return match[1] + '-' + match[2] + '-' + match[3];
            }
        }
        // GETCHU番号检测
        else if (norm.includes('GETCHU')) {
            const match = norm.match(/GETCHU[-_]*(\d+)/i);
            if (match) {
                return 'GETCHU-' + match[1];
            }
        }
        // GYUTTO番号检测
        else if (norm.includes('GYUTTO')) {
            const match = norm.match(/GYUTTO-(\d+)/i);
            if (match) {
                return 'GYUTTO-' + match[1];
            }
        }
        // 259LUXU特殊番号
        else if (norm.includes('259LUXU')) {
            const match = norm.match(/259LUXU-(\d+)/i);
            if (match) {
                return '259LUXU-' + match[1];
            }
        }
        else {
            // 尝试移除可疑域名进行匹配
            const no_domain = norm.replace(/\w{3,10}\.(COM|NET|APP|XYZ)/gi, '');
            if (no_domain !== norm) {
                const avid = this.get_id(no_domain);
                if (avid) return avid;
            }

            // 匹配缩写成hey的heydouga影片
            let match = norm.match(/(?:HEY)[-_]*(\d{4})[-_]?0?(\d{3,5})/i);
            if (match) {
                return 'heydouga-' + match[1] + '-' + match[2];
            }

            // 匹配片商MUGEN的奇怪番号
            match = norm.match(/(MKB?D)[-_]*(S\d{2,3})|(MK3D2DBD|S2M|S2MBD)[-_]*(\d{2,3})/i);
            if (match) {
                if (match[1] !== undefined) {
                    return match[1] + '-' + match[2];
                } else {
                    return match[3] + '-' + match[4];
                }
            }

            // 匹配IBW这样带有后缀z的番号
            match = norm.match(/(IBW)[-_](\d{2,5}z)/i);
            if (match) {
                return match[1] + '-' + match[2];
            }

            // 普通番号，优先匹配带分隔符的
            match = norm.match(/([A-Z]{2,10})[-_](\d{2,5})/i);
            if (match) {
                return match[1] + '-' + match[2];
            }

            // 东热red, sky, ex系列（不带-分隔符）
            match = norm.match(/(RED[01]\d\d|SKY[0-3]\d\d|EX00[01]\d)/i);
            if (match) {
                return match[1];
            }

            // 缺失分隔符的普通番号
            match = norm.match(/([A-Z]{2,})(\d{2,5})/i);
            if (match) {
                return match[1] + '-' + match[2];
            }
        }

        // TMA制作的影片
        let match = norm.match(/(T[23]8[-_]\d{3})/);
        if (match) {
            return match[1];
        }

        // 东热n, k系列
        match = norm.match(/(N\d{4}|K\d{4})/i);
        if (match) {
            return match[1];
        }

        // R18-XXX番号
        match = norm.match(/R18-?\d{3}/i);
        if (match) {
            return match[1];
        }

        // 纯数字番号（无码影片）
        match = norm.match(/(\d{6}[-_]\d{2,3})/);
        if (match) {
            return match[1];
        }

        // 如果匹配不到，尝试将')('替换为'-'后重试
        if (norm.includes(')(')) {
            const avid = this.get_id(norm.replace(')(', '-'));
            if (avid) return avid;
        }

        // 如果仍然匹配不到，尝试使用文件夹名称
        const parentDir = path.dirname(filepath);
        if (parentDir && parentDir !== '.' && parentDir !== '/') {
            return this.get_id(parentDir);
        }

        return '';
    }

    /**
     * 尝试将文件名匹配为CID（Content ID）
     * @param {string} filepath - 文件路径
     * @returns {string} CID，如果未找到返回空字符串
     */
    get_cid(filepath) {
        if (!filepath) return '';

        const basename = path.basename(filepath, path.extname(filepath));

        // 移除末尾可能带有的分段影片序号
        const possible = basename.replace(this.cdPostfix, '');

        // cid只由数字、小写字母和下划线组成
        const match = possible.match(/^([a-z\d_]+)$/);
        if (match) {
            const cid = match[1];

            if (!cid.includes('_')) {
                // 长度为7-14的cid占了约99.01%
                const match2 = cid.match(/^[a-z\d]{7,19}$/);
                if (match2) {
                    return cid;
                }
            } else {
                // 绝大多数都只有一个下划线
                const patterns = [
                    /^h_\d{3,4}[a-z]{1,10}\d{2,5}[a-z\d]{0,8}$/,      // 约 99.17%
                    /^\d{3}_\d{4,5}$/,                               // 约 0.57%
                    /^402[a-z]{3,6}\d*_[a-z]{3,8}\d{5,6}$/,         // 约 0.09%
                    /^h_\d{3,4}wvr\d\w\d{4,5}[a-z\d]{0,8}$/          // 约 0.06%
                ];

                for (const pattern of patterns) {
                    if (pattern.test(cid)) {
                        return cid;
                    }
                }
            }
        }

        return '';
    }

    /**
     * 识别番号类型
     * @param {string} avid - 番号
     * @returns {string} 类型：normal, fc2, cid, getchu, gyutto
     */
    guess_av_type(avid) {
        if (!avid) return 'unknown';

        // FC2类型
        if (/^FC2-\d{5,7}$/i.test(avid)) {
            return 'fc2';
        }

        // GETCHU类型
        if (/^GETCHU-(\d+)$/i.test(avid)) {
            return 'getchu';
        }

        // GYUTTO类型
        if (/^GYUTTO-(\d+)$/i.test(avid)) {
            return 'gyutto';
        }

        // CID类型
        const cid = this.get_cid(avid);
        if (cid === avid) {
            return 'cid';
        }

        // 默认为normal类型
        return 'normal';
    }

    /**
     * 验证番号格式是否有效
     * @param {string} avid - 番号
     * @returns {boolean} 是否有效
     */
    is_valid_avid(avid) {
        if (!avid) return false;

        const type = this.guess_av_type(avid);
        switch (type) {
            case 'fc2':
                return /^FC2-\d{5,7}$/i.test(avid);
            case 'getchu':
                return /^GETCHU-\d+$/i.test(avid);
            case 'gyutto':
                return /^GYUTTO-\d+$/i.test(avid);
            case 'cid':
                return this.get_cid(avid) === avid;
            case 'normal':
                return /^([A-Z]{2,10})[-_](\d{2,5})$/i.test(avid) ||
                       /^(RED[01]\d\d|SKY[0-3]\d\d|EX00[01]\d)$/i.test(avid) ||
                       /^([A-Z]{2,})(\d{2,5})$/i.test(avid);
            default:
                return false;
        }
    }

    /**
     * 标准化番号格式
     * @param {string} avid - 原始番号
     * @returns {string} 标准化后的番号
     */
    normalize_avid(avid) {
        if (!avid) return '';

        const type = this.guess_av_type(avid);
        switch (type) {
            case 'fc2':
                // 确保FC2番号格式为FC2-XXXXXX
                return avid.replace(/^FC2[_\s]*(\d{5,7})$/i, 'FC2-$1');
            case 'normal':
                // 确保普通番号使用-分隔符
                return avid.replace(/^([A-Z]{2,})(\d{2,5})$/i, '$1-$2');
            default:
                return avid.toUpperCase();
        }
    }

    /**
     * 编译忽略模式正则表达式
     * @private
     */
    _compileIgnoredPattern() {
        if (!this.config.scanner || !this.config.scanner.ignored_id_pattern) {
            return { sub: (str, repl) => str.replace(/$/, repl) };
        }

        try {
            const pattern = this.config.scanner.ignored_id_pattern.join('|');
            const regex = new RegExp(pattern, 'gi');
            return {
                sub: (str, repl) => str.replace(regex, repl)
            };
        } catch (error) {
            console.warn('忽略模式编译失败:', error);
            return { sub: (str, repl) => str };
        }
    }
}

module.exports = AVIDDetector;