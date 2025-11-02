/**
 * AVID番号检测器 - TDD简化版本
 * 只实现测试需要的核心功能
 */

const path = require('path');

class AVIDDetectorSimplified {
    constructor(config = {}) {
        this.config = config;
        this.ignoredPattern = this._compileIgnoredPattern();
    }

    /**
     * 编译忽略模式
     */
    _compileIgnoredPattern() {
        // 移除常见的后缀
        const patterns = [
            /\s*\(([^)]+)\)\s*$/,          // 括号内容
            /\s*\[[^\]]*\]\s*$/,         // 方括号内容
            /\s*【[^】]*】\s*$/,         // 中文方括号
            /\s*\{[^}]*\}\s*$/,          // 花括号内容
            /\s*<[^>]*>\s*$/,            // 尖括号内容
            /\s*[^A-Z0-9\-_]+$/,         // 非字母数字连字符下划线
            /[-_](HD|4K|UHD|720P|1080P)\s*$/i, // 质量标识
            /[-_]\.?\w+$/                // 文件扩展名
        ];

        return {
            sub: patterns.reduce((regex, pattern) => {
            return regex.replace(pattern, '');
        }, '')
        };
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

        // 预处理：移除常见的后缀
        norm = this._preprocessFilename(norm);

        // FC2番号检测
        if (norm.includes('FC2')) {
            // 严格匹配FC2格式：使用单词边界确保完整匹配
            const match = norm.match(/\bFC2[^A-Z\d]{0,5}(PPV[^A-Z\d]{0,5})?(\d{6,7})\b/i);
            if (match) {
                const number = match[2];
                // 验证FC2数字长度：严格6-7位
                if (number.length >= 6 && number.length <= 7) {
                    return 'FC2-' + number;
                }
            }
        }
        // HEYOUGA番号检测
        else if (norm.includes('HEYDOUGA')) {
            const match = norm.match(/(HEYDOUGA)[-_]*(\d{4})[-_]?0?(\d{3,4})/i);
            if (match) {
                const part1 = match[2];
                const part2 = match[3];
                // 验证HEYOUGA格式：严格4位数字 + 3-4位数字
                if (part1.length === 4 && part2.length >= 3 && part2.length <= 4) {
                    return 'HEYDOUGA-' + part1 + '-' + part2;
                }
            }
        }
        // GETCHU番号检测
        else if (norm.includes('GETCHU')) {
            const match = norm.match(/GETCHU[-_]*(\d+)/i);
            if (match) {
                const number = match[1];
                // GETCHU至少6位数字
                if (number.length >= 6) {
                    return 'GETCHU-' + number;
                }
            }
        }
        // 普通番号检测（严格按照测试要求）
        else {
            // 匹配标准格式：2-5个字母 + 连字符 + 3-4个数字
            const match = norm.match(/([A-Z]{2,5})[-_](\d{3,4})/i);
            if (match) {
                const letters = match[1];
                const numbers = match[2];
                // 验证字母和数字长度
                if (letters.length >= 2 && letters.length <= 5 &&
                    numbers.length >= 3 && numbers.length <= 4) {
                    return letters.toUpperCase() + '-' + numbers;
                }
            }
        }

        // 未找到匹配的番号
        return '';
    }

    /**
     * 预处理文件名
     */
    _preprocessFilename(filename) {
        // 移除文件扩展名
        let processed = filename.replace(/\s*\.\w+$/, '').trim();

        return processed;
    }

    /**
     * 验证番号格式
     * @param {string} avid - 番号
     * @returns {Object} 验证结果
     */
    validateAvId(avid) {
        if (!avid || typeof avid !== 'string') {
            return { valid: false, type: null, format: null };
        }

        const normalized = avid.toUpperCase();

        // FC2格式
        if (normalized.startsWith('FC2-')) {
            const match = normalized.match(/^FC2-(PPV-)?(\d{5,7})$/);
            if (match && match[1]) {
                const number = parseInt(match[1]);
                return {
                    valid: number >= 123456 && number <= 9999999,
                    type: 'fc2',
                    format: normalized
                };
            }
        }

        // HEYOUGA格式
        if (normalized.startsWith('HEYDOUGA-')) {
            const match = normalized.match(/^HEYDOUGA-(\d{4})-(\d{3,5})$/);
            if (match) {
                return {
                    valid: true,
                    type: 'heydouga',
                    format: normalized
                };
            }
        }

        // GETCHU格式
        if (normalized.startsWith('GETCHU-')) {
            const match = normalized.match(/^GETCHU-(\d+)$/);
            if (match) {
                return {
                    valid: true,
                    type: 'getchu',
                    format: normalized
                };
            }
        }

        // 普通格式
        const match = normalized.match(/^([A-Z]{2,5})-(\d{2,5})$/);
        if (match) {
            return {
                valid: true,
                type: 'regular',
                format: normalized
            };
        }

        return { valid: false, type: null, format: null };
    }

    /**
     * 计算番号识别的置信度
     * @param {string} avid - 番号
     * @returns {number} 置信度（0-1）
     */
    calculateConfidence(avid) {
        const validation = this.validateAvId(avid);

        if (!validation.valid) {
            return 0.0;
        }

        // 根据类型和格式质量计算置信度
        switch (validation.type) {
            case 'fc2':
                // FC2格式置信度较高
                return validation.format.includes('PPV') ? 0.95 : 0.9;
            case 'heydouga':
                // HEYOUGA格式置信度高
                return 0.9;
            case 'getchu':
                // GETCHU格式置信度中等
                return 0.8;
            case 'regular':
                // 普通格式置信度取决于格式质量
                const prefixLen = validation.format.split('-')[0].length;
                const numberLen = validation.format.split('-')[1].length;

                // 字母和数字长度越接近理想值，置信度越高
                let prefixScore = 0;
                if (prefixLen >= 2 && prefixLen <= 5) {
                    prefixScore = 1.0;
                } else if (prefixLen === 1 || prefixLen > 5) {
                    prefixScore = 0.5;
                }

                let numberScore = 0;
                if (numberLen >= 2 && numberLen <= 5) {
                    numberScore = 1.0;
                } else if (numberLen === 1 || numberLen > 5) {
                    numberScore = 0.5;
                }

                return (prefixScore + numberScore) / 2 * 0.85;
            default:
                return 0.0;
        }
    }
}

module.exports = AVIDDetectorSimplified;