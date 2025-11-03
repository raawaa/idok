/**
 * 编码检测和处理工具模块
 * 提供文本编码检测和转换功能
 */

const iconv = require('iconv-lite');
const { config } = require('../config-manager');

class EncodingDetector {
  constructor(options = {}) {
    this.enableDetection = options.enableDetection !== false;
    this.defaultEncoding = options.defaultEncoding || config.get('encoding.defaultEncoding', 'utf8');
    this.stats = {
      detections: 0,
      conversions: 0,
      errors: 0
    };
  }

  /**
   * 处理编码问题
   * @param {Buffer|string} data - 响应数据
   * @param {Object} headers - 响应头
   * @returns {string} 解码后的文本
   */
  handleEncoding(data, headers = {}) {
    if (!this.enableDetection) {
      return typeof data === 'string' ? data : data.toString(this.defaultEncoding);
    }

    try {
      // 如果数据是字符串，直接返回
      if (typeof data === 'string') {
        return data;
      }

      // 尝试从Content-Type头中获取编码
      let encoding = this.defaultEncoding;
      const contentType = headers['content-type'] || '';
      const charsetMatch = contentType.match(/charset=([\w-]+)/);

      if (charsetMatch && charsetMatch[1]) {
        encoding = charsetMatch[1].toLowerCase();
      }

      // 如果是常见的编码，直接解码
      if (['utf-8', 'utf8', 'iso-8859-1', 'ascii'].includes(encoding)) {
        return data.toString(encoding);
      }

      // 对于其他编码，尝试使用iconv-lite
      try {
        this.stats.detections++;
        this.stats.conversions++;
        return iconv.decode(data, encoding);
      } catch (error) {
        // 如果解码失败，尝试常见编码
        const commonEncodings = ['utf8', 'gbk', 'gb2312', 'big5', 'shift_jis', 'euc-kr'];

        for (const enc of commonEncodings) {
          try {
            this.stats.conversions++;
            return iconv.decode(data, enc);
          } catch (e) {
            // 继续尝试下一个编码
          }
        }

        // 如果所有编码都失败，使用默认编码
        this.stats.errors++;
        return data.toString(this.defaultEncoding);
      }
    } catch (error) {
      console.warn('编码处理失败:', error.message);
      this.stats.errors++;
      return typeof data === 'string' ? data : data.toString(this.defaultEncoding);
    }
  }

  /**
   * 自动检测文本编码
   * @param {Buffer} data - 二进制数据
   * @returns {string} 检测到的编码
   */
  detectEncoding(data) {
    if (!data || data.length === 0) {
      return this.defaultEncoding;
    }

    // 简单的编码检测启发式方法
    const sample = data.slice(0, 1024); // 只检查前1024字节

    // 检测BOM（字节顺序标记）
    if (sample.length >= 3) {
      // UTF-8 BOM
      if (sample[0] === 0xEF && sample[1] === 0xBB && sample[2] === 0xBF) {
        return 'utf8';
      }

      // UTF-16 LE BOM
      if (sample.length >= 2 && sample[0] === 0xFF && sample[1] === 0xFE) {
        return 'utf16le';
      }

      // UTF-16 BE BOM
      if (sample.length >= 2 && sample[0] === 0xFE && sample[1] === 0xFF) {
        return 'utf16';
      }
    }

    // 检测是否为纯ASCII
    let isAscii = true;
    for (let i = 0; i < sample.length; i++) {
      if (sample[i] > 127) {
        isAscii = false;
        break;
      }
    }

    if (isAscii) {
      return 'ascii';
    }

    // 检测常见的中日韩编码
    return this.detectCJKEncoding(sample);
  }

  /**
   * 检测中日韩编码
   * @param {Buffer} data - 数据样本
   * @returns {string} 检测到的编码
   */
  detectCJKEncoding(data) {
    // 简单的启发式检测
    let gb2312Score = 0;
    let gbkScore = 0;
    let big5Score = 0;
    let sjisScore = 0;
    let eucKrScore = 0;

    // 统计字节模式
    for (let i = 0; i < data.length - 1; i++) {
      const byte1 = data[i];
      const byte2 = data[i + 1];

      // GB2312/GBK 范围检查
      if (byte1 >= 0xA1 && byte1 <= 0xF7 && byte2 >= 0xA1 && byte2 <= 0xFE) {
        gb2312Score++;
        gbkScore++;
      } else if (byte1 >= 0x81 && byte1 <= 0xFE &&
                 ((byte2 >= 0x40 && byte2 <= 0x7E) || (byte2 >= 0x80 && byte2 <= 0xFE))) {
        gbkScore++;
      }

      // Big5 范围检查
      if (byte1 >= 0x81 && byte1 <= 0xFE &&
          ((byte2 >= 0x40 && byte2 <= 0x7E) || (byte2 >= 0xA1 && byte2 <= 0xFE))) {
        big5Score++;
      }

      // Shift-JIS 范围检查
      if ((byte1 >= 0x81 && byte1 <= 0x9F) || (byte1 >= 0xE0 && byte1 <= 0xEF)) {
        if (byte2 >= 0x40 && byte2 <= 0xFC) {
          sjisScore++;
        }
      }

      // EUC-KR 范围检查
      if (byte1 >= 0xA1 && byte1 <= 0xFE && byte2 >= 0xA1 && byte2 <= 0xFE) {
        eucKrScore++;
      }
    }

    // 选择得分最高的编码
    const scores = [
      { encoding: 'gbk', score: gbkScore },
      { encoding: 'gb2312', score: gb2312Score },
      { encoding: 'big5', score: big5Score },
      { encoding: 'shift_jis', score: sjisScore },
      { encoding: 'euc-kr', score: eucKrScore }
    ];

    scores.sort((a, b) => b.score - a.score);

    // 如果最高分太低，可能是UTF-8
    if (scores[0].score < 10) {
      return 'utf8';
    }

    return scores[0].encoding;
  }

  /**
   * 转换编码
   * @param {string|Buffer} data - 输入数据
   * @param {string} fromEncoding - 源编码
   * @param {string} toEncoding - 目标编码
   * @returns {Buffer|string} 转换后的数据
   */
  convertEncoding(data, fromEncoding, toEncoding = 'utf8') {
    try {
      this.stats.conversions++;

      // 如果源编码和目标编码相同，直接返回
      if (fromEncoding.toLowerCase() === toEncoding.toLowerCase()) {
        return typeof data === 'string' ? data : data.toString(fromEncoding);
      }

      // 如果数据是字符串，先转换为Buffer
      if (typeof data === 'string') {
        data = Buffer.from(data, fromEncoding);
      }

      // 使用iconv-lite进行转换
      if (fromEncoding.toLowerCase() !== 'utf8' || toEncoding.toLowerCase() !== 'utf8') {
        const decoded = iconv.decode(data, fromEncoding);
        return toEncoding.toLowerCase() === 'utf8' ? decoded : iconv.encode(decoded, toEncoding);
      }

      return data.toString(toEncoding);
    } catch (error) {
      console.warn(`编码转换失败: ${fromEncoding} -> ${toEncoding}:`, error.message);
      this.stats.errors++;
      return typeof data === 'string' ? data : data.toString(this.defaultEncoding);
    }
  }

  /**
   * 验证编码
   * @param {Buffer} data - 数据
   * @param {string} encoding - 编码名称
   * @returns {boolean} 是否有效
   */
  validateEncoding(data, encoding) {
    try {
      if (encoding.toLowerCase() === 'utf8') {
        // 简单的UTF-8验证
        let i = 0;
        while (i < data.length) {
          if ((data[i] & 0x80) === 0) {
            // ASCII字符
            i++;
          } else if ((data[i] & 0xE0) === 0xC0) {
            // 2字节UTF-8
            if (i + 1 >= data.length || (data[i + 1] & 0xC0) !== 0x80) return false;
            i += 2;
          } else if ((data[i] & 0xF0) === 0xE0) {
            // 3字节UTF-8
            if (i + 2 >= data.length ||
                (data[i + 1] & 0xC0) !== 0x80 ||
                (data[i + 2] & 0xC0) !== 0x80) return false;
            i += 3;
          } else if ((data[i] & 0xF8) === 0xF0) {
            // 4字节UTF-8
            if (i + 3 >= data.length ||
                (data[i + 1] & 0xC0) !== 0x80 ||
                (data[i + 2] & 0xC0) !== 0x80 ||
                (data[i + 3] & 0xC0) !== 0x80) return false;
            i += 4;
          } else {
            return false;
          }
        }
        return true;
      } else {
        // 对于其他编码，尝试解码
        iconv.decode(data, encoding);
        return true;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.detections > 0
        ? Math.round(((this.stats.detections - this.stats.errors) / this.stats.detections) * 100)
        : 0
    };
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      detections: 0,
      conversions: 0,
      errors: 0
    };
  }

  /**
   * 设置默认编码
   */
  setDefaultEncoding(encoding) {
    this.defaultEncoding = encoding;
  }

  /**
   * 启用/禁用编码检测
   */
  setDetectionEnabled(enabled) {
    this.enableDetection = enabled;
  }
}

module.exports = {
  EncodingDetector
};