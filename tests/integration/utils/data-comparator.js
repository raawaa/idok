/**
 * 智能数据对比器
 * 参考JavSP的compare函数，实现多层级的数据比较策略
 */

const { URL } = require('url');

class DataComparator {
  constructor(options = {}) {
    // 比较策略配置
    this.strategies = {
      // 时间敏感字段 - 只比较存在性
      timeSensitive: ['score', 'userScore', 'commentCount', 'viewCount'],

      // URL字段 - 只比较路径部分
      urlFields: ['cover', 'bigCover', 'previewVideo', 'magnet'],

      // 列表字段 - 忽略顺序
      listFields: ['genre', 'genre_id', 'genre_norm', 'actress', 'tags'],

      // 图片集合字段 - 只比较路径
      imageCollections: ['actress_pics', 'preview_pics'],

      // 文本字段 - 标准化比较
      textFields: ['title', 'plot', 'description']
    };

    // 比较选项
    this.options = {
      strictMode: options.strictMode || false,
      ignoreWhitespace: options.ignoreWhitespace !== false,
      ignoreCase: options.ignoreCase || false,
      tolerance: options.tolerance || 0.1
    };
  }

  /**
   * 比较两个数据对象
   */
  compare(baseline, current, scraperName = null) {
    const result = {
      isMatch: true,
      differences: [],
      summary: {
        totalFields: 0,
        matchedFields: 0,
        ignoredFields: 0,
        differentFields: 0
      }
    };

    // 获取所有需要比较的字段
    const allFields = new Set([...Object.keys(baseline), ...Object.keys(current)]);
    result.summary.totalFields = allFields.size;

    for (const field of allFields) {
      const baselineValue = baseline[field];
      const currentValue = current[field];

      try {
        const fieldResult = this.compareField(field, baselineValue, currentValue, scraperName);

        if (fieldResult.ignored) {
          result.summary.ignoredFields++;
        } else if (fieldResult.matched) {
          result.summary.matchedFields++;
        } else {
          result.isMatch = false;
          result.summary.differentFields++;
          result.differences.push(fieldResult);
        }
      } catch (error) {
        console.error(`比较字段 ${field} 时出错:`, error.message);
        result.isMatch = false;
        result.summary.differentFields++;
        result.differences.push({
          field,
          type: 'error',
          message: error.message,
          baselineValue,
          currentValue
        });
      }
    }

    // 计算匹配率
    result.summary.matchRate = result.summary.totalFields > 0
      ? Math.round((result.summary.matchedFields / result.summary.totalFields) * 100)
      : 0;

    return result;
  }

  /**
   * 比较单个字段
   */
  compareField(field, baselineValue, currentValue, scraperName) {
    const result = {
      field,
      matched: false,
      ignored: false,
      type: 'unknown',
      baselineValue,
      currentValue,
      difference: null
    };

    // 处理null/undefined值
    if (baselineValue === null || baselineValue === undefined) {
      if (currentValue === null || currentValue === undefined) {
        result.matched = true;
        result.type = 'null_match';
      } else {
        result.matched = false;
        result.type = 'null_mismatch';
        result.difference = `基准值为空，当前值: ${JSON.stringify(currentValue)}`;
      }
      return result;
    }

    if (currentValue === null || currentValue === undefined) {
      result.matched = false;
      result.type = 'null_mismatch';
      result.difference = `当前值为空，基准值: ${JSON.stringify(baselineValue)}`;
      return result;
    }

    // 根据字段类型选择比较策略
    const strategy = this.getComparisonStrategy(field, scraperName);

    switch (strategy) {
      case 'time_sensitive':
        return this.compareTimeSensitiveField(field, baselineValue, currentValue, result);

      case 'url':
        return this.compareUrlField(field, baselineValue, currentValue, result);

      case 'list':
        return this.compareListField(field, baselineValue, currentValue, result);

      case 'image_collection':
        return this.compareImageCollectionField(field, baselineValue, currentValue, result);

      case 'text':
        return this.compareTextField(field, baselineValue, currentValue, result);

      default:
        return this.compareDefaultField(field, baselineValue, currentValue, result);
    }
  }

  /**
   * 获取字段的比较策略
   */
  getComparisonStrategy(field, scraperName) {
    // 检查是否为时间敏感字段
    if (this.strategies.timeSensitive.includes(field)) {
      return 'time_sensitive';
    }

    // 检查是否为URL字段
    if (this.strategies.urlFields.includes(field)) {
      return 'url';
    }

    // 检查是否为列表字段
    if (this.strategies.listFields.includes(field)) {
      return 'list';
    }

    // 检查是否为图片集合字段（特定爬虫）
    if (this.strategies.imageCollections.includes(field)) {
      return 'image_collection';
    }

    // 检查是否为文本字段
    if (this.strategies.textFields.includes(field)) {
      return 'text';
    }

    // 默认比较策略
    return 'default';
  }

  /**
   * 比较时间敏感字段（只比较存在性）
   */
  compareTimeSensitiveField(field, baselineValue, currentValue, result) {
    result.type = 'time_sensitive';

    // 检查是否两个值都存在
    const baselineExists = this.hasValue(baselineValue);
    const currentExists = this.hasValue(currentValue);

    if (baselineExists && currentExists) {
      result.matched = true;
      result.type = 'time_sensitive_both_exist';
    } else if (!baselineExists && !currentExists) {
      result.matched = true;
      result.type = 'time_sensitive_both_null';
    } else {
      result.matched = false;
      result.type = 'time_sensitive_mismatch';
      result.difference = `存在性不匹配: 基准值=${baselineExists}, 当前值=${currentExists}`;
    }

    return result;
  }

  /**
   * 比较URL字段（只比较路径部分）
   */
  compareUrlField(field, baselineValue, currentValue, result) {
    result.type = 'url';

    try {
      const baselineUrl = new URL(baselineValue);
      const currentUrl = new URL(currentValue);

      // 比较路径部分
      const baselinePath = baselineUrl.pathname;
      const currentPath = currentUrl.pathname;

      if (baselinePath === currentPath) {
        result.matched = true;
        result.type = 'url_path_match';
      } else {
        result.matched = false;
        result.type = 'url_path_mismatch';
        result.difference = `路径不匹配: 基准="${baselinePath}", 当前="${currentPath}"`;
      }
    } catch (error) {
      // 如果URL解析失败，使用字符串比较
      if (baselineValue === currentValue) {
        result.matched = true;
        result.type = 'url_string_match';
      } else {
        result.matched = false;
        result.type = 'url_string_mismatch';
        result.difference = `URL字符串不匹配`;
      }
    }

    return result;
  }

  /**
   * 比较列表字段（忽略顺序）
   */
  compareListField(field, baselineValue, currentValue, result) {
    result.type = 'list';

    if (!Array.isArray(baselineValue) || !Array.isArray(currentValue)) {
      // 如果不是数组，尝试转换
      const baselineArray = this.toArray(baselineValue);
      const currentArray = this.toArray(currentValue);

      return this.compareArrayField(field, baselineArray, currentArray, result);
    }

    // 转换为集合进行比较
    const baselineSet = new Set(baselineValue.map(item => String(item).trim()));
    const currentSet = new Set(currentValue.map(item => String(item).trim()));

    if (this.setsEqual(baselineSet, currentSet)) {
      result.matched = true;
      result.type = 'list_match';
    } else {
      result.matched = false;
      result.type = 'list_mismatch';

      const missing = [...baselineSet].filter(x => !currentSet.has(x));
      const extra = [...currentSet].filter(x => !baselineSet.has(x));

      if (missing.length > 0 || extra.length > 0) {
        const issues = [];
        if (missing.length > 0) issues.push(`缺失: [${missing.join(', ')}]`);
        if (extra.length > 0) issues.push(`多余: [${extra.join(', ')}]`);
        result.difference = issues.join('; ');
      }
    }

    return result;
  }

  /**
   * 比较图片集合字段
   */
  compareImageCollectionField(field, baselineValue, currentValue, result) {
    result.type = 'image_collection';

    if (!baselineValue || !currentValue) {
      return this.compareDefaultField(field, baselineValue, currentValue, result);
    }

    if (typeof baselineValue !== 'object' || typeof currentValue !== 'object') {
      return this.compareDefaultField(field, baselineValue, currentValue, result);
    }

    const baselinePaths = this.extractImagePaths(baselineValue);
    const currentPaths = this.extractImagePaths(currentValue);

    return this.compareArrayField(field, baselinePaths, currentPaths, result);
  }

  /**
   * 比较文本字段（标准化比较）
   */
  compareTextField(field, baselineValue, currentValue, result) {
    result.type = 'text';

    const baselineText = this.normalizeText(baselineValue);
    const currentText = this.normalizeText(currentValue);

    if (baselineText === currentText) {
      result.matched = true;
      result.type = 'text_match';
    } else {
      result.matched = false;
      result.type = 'text_mismatch';

      // 计算相似度
      const similarity = this.calculateTextSimilarity(baselineText, currentText);
      result.difference = `文本不匹配 (相似度: ${Math.round(similarity * 100)}%)`;

      // 在非严格模式下，如果相似度足够高则认为匹配
      if (!this.options.strictMode && similarity > (1 - this.options.tolerance)) {
        result.matched = true;
        result.type = 'text_fuzzy_match';
      }
    }

    return result;
  }

  /**
   * 比较数组字段
   */
  compareArrayField(field, baselineArray, currentArray, result) {
    if (baselineArray.length === currentArray.length) {
      const allMatch = baselineArray.every((item, index) =>
        String(item) === String(currentArray[index])
      );

      if (allMatch) {
        result.matched = true;
        result.type = 'array_match';
      } else {
        result.matched = false;
        result.type = 'array_mismatch';
        result.difference = '数组元素不匹配';
      }
    } else {
      result.matched = false;
      result.type = 'array_length_mismatch';
      result.difference = `数组长度不匹配: 基准=${baselineArray.length}, 当前=${currentArray.length}`;
    }

    return result;
  }

  /**
   * 比较默认字段（严格相等）
   */
  compareDefaultField(field, baselineValue, currentValue, result) {
    result.type = 'default';

    if (baselineValue === currentValue) {
      result.matched = true;
      result.type = 'default_match';
    } else {
      result.matched = false;
      result.type = 'default_mismatch';

      if (typeof baselineValue === 'object' && typeof currentValue === 'object') {
        result.difference = '对象不匹配';
      } else {
        result.difference = `值不匹配: 基准="${JSON.stringify(baselineValue)}", 当前="${JSON.stringify(currentValue)}"`;
      }
    }

    return result;
  }

  /**
   * 检查值是否存在（非空、非null、非undefined）
   */
  hasValue(value) {
    return value !== null && value !== undefined && value !== '';
  }

  /**
   * 将值转换为数组
   */
  toArray(value) {
    if (Array.isArray(value)) {
      return value;
    }
    if (value === null || value === undefined || value === '') {
      return [];
    }
    return [value];
  }

  /**
   * 标准化文本
   */
  normalizeText(text) {
    if (typeof text !== 'string') {
      text = String(text);
    }

    let normalized = text;

    if (this.options.ignoreWhitespace) {
      normalized = normalized.replace(/\s+/g, ' ').trim();
    }

    if (this.options.ignoreCase) {
      normalized = normalized.toLowerCase();
    }

    return normalized;
  }

  /**
   * 计算文本相似度
   */
  calculateTextSimilarity(text1, text2) {
    if (text1 === text2) return 1.0;
    if (!text1 || !text2) return 0.0;

    const longer = text1.length > text2.length ? text1 : text2;
    const shorter = text1.length > text2.length ? text2 : text1;

    if (longer.length === 0) return 1.0;

    // 简单的Levenshtein距离算法
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * 计算Levenshtein距离
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
            matrix[i][j - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * 提取图片路径
   */
  extractImagePaths(imageObj) {
    const paths = [];

    if (typeof imageObj === 'object') {
      if (Array.isArray(imageObj)) {
        // 数组形式
        imageObj.forEach(item => {
          if (typeof item === 'string') {
            try {
              const url = new URL(item);
              paths.push(url.pathname);
            } catch {
              paths.push(item);
            }
          }
        });
      } else {
        // 对象形式
        Object.values(imageObj).forEach(item => {
          if (typeof item === 'string') {
            try {
              const url = new URL(item);
              paths.push(url.pathname);
            } catch {
              paths.push(item);
            }
          }
        });
      }
    }

    return paths;
  }

  /**
   * 检查两个集合是否相等
   */
  setsEqual(set1, set2) {
    if (set1.size !== set2.size) return false;
    for (const item of set1) {
      if (!set2.has(item)) return false;
    }
    return true;
  }

  /**
   * 生成详细的差异报告
   */
  generateDetailedReport(comparisonResult) {
    const report = {
      summary: comparisonResult.summary,
      differences: comparisonResult.differences.map(diff => ({
        field: diff.field,
        type: diff.type,
        message: diff.difference,
        baselineValue: diff.baselineValue,
        currentValue: diff.currentValue,
        severity: this.getSeverityLevel(diff.type)
      })),
      recommendations: this.generateRecommendations(comparisonResult)
    };

    return report;
  }

  /**
   * 获取差异的严重程度
   */
  getSeverityLevel(type) {
    const severityLevels = {
      'default_match': 'success',
      'text_match': 'success',
      'list_match': 'success',
      'url_path_match': 'success',
      'time_sensitive_both_exist': 'success',
      'time_sensitive_both_null': 'success',
      'text_fuzzy_match': 'warning',
      'time_sensitive_mismatch': 'warning',
      'null_mismatch': 'error',
      'default_mismatch': 'error',
      'list_mismatch': 'error',
      'url_path_mismatch': 'error',
      'text_mismatch': 'error',
      'array_mismatch': 'error',
      'error': 'critical'
    };

    return severityLevels[type] || 'info';
  }

  /**
   * 生成改进建议
   */
  generateRecommendations(comparisonResult) {
    const recommendations = [];

    if (comparisonResult.summary.matchRate < 80) {
      recommendations.push('数据匹配率较低，建议检查爬虫算法或网站结构是否发生变化');
    }

    if (comparisonResult.summary.differentFields > 5) {
      recommendations.push('差异字段较多，建议逐一检查各字段的数据提取逻辑');
    }

    const criticalDifferences = comparisonResult.differences.filter(
      diff => this.getSeverityLevel(diff.type) === 'critical'
    );

    if (criticalDifferences.length > 0) {
      recommendations.push('存在严重差异，需要立即修复');
    }

    return recommendations;
  }
}

module.exports = {
  DataComparator
};