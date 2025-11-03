/**
 * 文本处理工具模块
 * 提供各种文本处理和数据提取功能
 */

class TextProcessor {
  constructor() {
    this.htmlCleaner = {
      // 删除的标签列表
      removeTags: ['script', 'noscript', 'iframe', 'object', 'embed', 'style'],
      // 保留属性的标签列表
      keepAttributes: {
        'a': ['href', 'title'],
        'img': ['src', 'alt', 'title', 'data-original'],
        'div': ['id', 'class'],
        'span': ['id', 'class'],
        'p': ['id', 'class']
      }
    };
  }

  /**
   * 清理文本内容
   */
  cleanText(text) {
    if (!text) return '';
    return text
      .replace(/\s+/g, ' ')
      .replace(/^\s+|\s+$/g, '');
  }

  /**
   * 高级文本清理
   */
  advancedCleanText(text, options = {}) {
    if (!text) return '';

    let cleaned = text;

    // 基础清理
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // 移除HTML标签
    if (options.removeHtml !== false) {
      cleaned = cleaned.replace(/<[^>]*>/g, '');
    }

    // 移除特殊字符
    if (options.removeSpecialChars !== false) {
      cleaned = cleaned.replace(/[^\w\s\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff]/g, '');
    }

    // 移除多余空格
    if (options.normalizeSpaces !== false) {
      cleaned = cleaned.replace(/\s+/g, ' ');
    }

    // 移除特定模式
    if (options.removePatterns) {
      options.removePatterns.forEach(pattern => {
        cleaned = cleaned.replace(new RegExp(pattern, 'g'), '');
      });
    }

    return cleaned.trim();
  }

  /**
   * 从文本中提取数字
   */
  extractNumber(text) {
    if (!text) return null;

    const match = text.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : null;
  }

  /**
   * 解析日期字符串
   */
  parseDate(dateStr) {
    if (!dateStr) return null;

    // 尝试多种日期格式
    const formats = [
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/,     // YYYY-MM-DD
      /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,   // YYYY/MM/DD
      /^(\d{4})\.(\d{1,2})\.(\d{1,2})$/,    // YYYY.MM.DD
      /(\d{4})年(\d{1,2})月(\d{1,2})日/   // YYYY年MM月DD日
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        let year, month, day;

        if (format.source.includes('年')) {
          year = parseInt(match[1]);
          month = parseInt(match[2]);
          day = parseInt(match[3]);
        } else {
          year = parseInt(match[1]);
          month = parseInt(match[2]);
          day = parseInt(match[3]);
        }

        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        }
      }
    }

    return null;
  }

  /**
   * 转换时长字符串为分钟数
   */
  parseDuration(durationStr) {
    if (!durationStr) return null;

    // 匹配小时和分钟
    const hourMatch = durationStr.match(/(\d+)\s*小时/);
    const minuteMatch = durationStr.match(/(\d+)\s*分钟/);

    let hours = 0;
    let minutes = 0;

    if (hourMatch) {
      hours = parseInt(hourMatch[1]);
    }

    if (minuteMatch) {
      minutes = parseInt(minuteMatch[1]);
    }

    // 如果只匹配到数字，假设是分钟
    if (!hourMatch && !minuteMatch) {
      const numberMatch = durationStr.match(/(\d+)/);
      if (numberMatch) {
        minutes = parseInt(numberMatch[1]);
      }
    }

    return hours * 60 + minutes;
  }

  /**
   * 移除标题末尾的演员名字
   * 参考JavSP的remove_trail_actor_in_title函数
   */
  removeTrailingActors(title, actorNames = []) {
    if (!title || !actorNames.length) return title;

    const delimiters = ['-xX &·,;　＆・，；'];
    let cleanedTitle = title;

    // 尝试各种分隔符
    for (const delimiter of delimiters) {
      const parts = cleanedTitle.split(delimiter);
      if (parts.length > 1) {
        // 检查最后一部分是否是演员名字
        const lastPart = parts[parts.length - 1].trim();
        const isActorName = actorNames.some(actor =>
          lastPart.toLowerCase().includes(actor.toLowerCase())
        );

        if (isActorName) {
          cleanedTitle = parts.slice(0, -1).join(delimiter);
        }
      }
    }

    return this.cleanText(cleanedTitle);
  }

  /**
   * 标准化文本（移除多余空格、特殊字符等）
   */
  normalizeText(text) {
    if (!text) return '';

    return text
      .replace(/\s+/g, ' ')           // 合并多个空格
      .replace(/[^\w\s\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\-.,!?]/g, '') // 保留基本标点
      .trim();
  }

  /**
   * 提取URL
   */
  extractUrls(text) {
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    return text.match(urlRegex) || [];
  }

  /**
   * 提取邮箱地址
   */
  extractEmails(text) {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    return text.match(emailRegex) || [];
  }

  /**
   * 格式化文件大小
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 截断文本并添加省略号
   */
  truncateText(text, maxLength, suffix = '...') {
    if (!text || text.length <= maxLength) return text;

    return text.substring(0, maxLength - suffix.length) + suffix;
  }

  /**
   * 生成文本的哈希值（用于缓存键等）
   */
  hashText(text) {
    let hash = 0;
    if (text.length === 0) return hash;

    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return hash.toString(36);
  }

  /**
   * 比较两个文本的相似度（简单的算法）
   */
  textSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;

    const longer = text1.length > text2.length ? text1 : text2;
    const shorter = text1.length > text2.length ? text2 : text1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * 计算编辑距离
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}

module.exports = {
  TextProcessor
};