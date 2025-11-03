/**
 * 数据比较器
 * 参考JavSP项目的compare函数，实现在线抓取数据与基准数据的智能对比
 */

const { URL } = require('url');

class DataComparator {
  constructor(options = {}) {
    this.options = {
      // 允许部分字段存在差异（如评分、磁力链接等）
      flexibleFields: ['score', 'magnet', 'preview_video'],
      // URL字段只比较路径部分（处理域名变化）
      urlPathOnlyFields: ['cover', 'actress_pics', 'preview_pics'],
      // 忽略顺序的数组字段
      ignoreOrderFields: ['genre', 'genre_id', 'genre_norm', 'actress'],
      // 允许为空的字段
      nullableFields: ['plot', 'big_cover', 'preview_pics', 'preview_video', 'magnet'],
      // 特定抓取器的特殊处理
      scraperSpecificRules: {
        javbus: {
          urlPathOnly: true, // JavBus的图片URL可能因代理域名变化
          flexiblePreviewVideo: true // airav和javdb的preview_video字段可能变化
        },
        javdb: {
          flexiblePreviewVideo: true
        },
        airav: {
          flexiblePreviewVideo: true
        }
      },
      ...options
    };
  }

  /**
   * 比较在线数据与基准数据（核心方法）
   */
  compare(onlineData, baselineData, scraperName = 'unknown') {
    const differences = [];
    const warnings = [];
    
    try {
      // 获取所有字段
      const onlineVars = this.normalizeData(onlineData);
      const baselineVars = this.normalizeData(baselineData);
      
      // 遍历在线数据的所有字段
      for (const [key, onlineValue] of Object.entries(onlineVars)) {
        const baselineValue = baselineVars[key];
        
        // 特殊字段处理
        if (this.options.flexibleFields.includes(key)) {
          // 评分、磁力链接等字段，只要都有值或都没有值即可
          if (Boolean(onlineValue) !== Boolean(baselineValue)) {
            warnings.push(`${key}: 一方有值一方无值 (在线: ${Boolean(onlineValue)}, 基准: ${Boolean(baselineValue)})`);
          }
          continue;
        }
        
        // 特定抓取器的preview_video特殊处理
        if (key === 'preview_video' && this.options.scraperSpecificRules[scraperName]?.flexiblePreviewVideo) {
          if (Boolean(onlineValue) !== Boolean(baselineValue)) {
            warnings.push(`${key}: preview_video字段变化 (在线: ${Boolean(onlineValue)}, 基准: ${Boolean(baselineValue)})`);
          }
          continue;
        }
        
        // URL路径比较（处理域名变化）
        if (this.options.urlPathOnlyFields.includes(key) && this.options.scraperSpecificRules[scraperName]?.urlPathOnly) {
          const onlinePath = this.extractUrlPath(onlineValue);
          const baselinePath = this.extractUrlPath(baselineValue);
          
          if (onlinePath !== baselinePath) {
            differences.push(`${key}: URL路径不同 (在线: ${onlinePath}, 基准: ${baselinePath})`);
          }
          continue;
        }
        
        // 数组字段比较（忽略顺序）
        if (this.options.ignoreOrderFields.includes(key) && Array.isArray(onlineValue)) {
          const onlineSorted = [...onlineValue].sort();
          const baselineSorted = Array.isArray(baselineValue) ? [...baselineValue].sort() : [];
          
          if (JSON.stringify(onlineSorted) !== JSON.stringify(baselineSorted)) {
            differences.push(`${key}: 数组内容不同 (在线: [${onlineSorted.join(', ')}], 基准: [${baselineSorted.join(', ')}])`);
          }
          continue;
        }
        
        // 普通字段比较
        if (onlineValue !== baselineValue) {
          differences.push(`${key}: 值不同 (在线: ${this.truncateValue(onlineValue)}, 基准: ${this.truncateValue(baselineValue)})`);
        }
      }
      
      // 检查基准数据中有但在线数据中没有的字段
      for (const key of Object.keys(baselineVars)) {
        if (!(key in onlineVars)) {
          warnings.push(`${key}: 基准数据中有但在线数据中没有`);
        }
      }
      
      return {
        success: differences.length === 0,
        differences,
        warnings,
        summary: {
          totalFields: Object.keys(onlineVars).length,
          differentFields: differences.length,
          warningFields: warnings.length
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: `比较过程出错: ${error.message}`,
        differences: [],
        warnings: []
      };
    }
  }

  /**
   * 标准化数据格式
   */
  normalizeData(data) {
    if (!data || typeof data !== 'object') {
      return {};
    }
    
    const normalized = {};
    
    for (const [key, value] of Object.entries(data)) {
      // 跳过undefined和null值
      if (value === undefined || value === null) {
        continue;
      }
      
      // 标准化字段名
      const normalizedKey = this.normalizeFieldName(key);
      
      // 标准化字段值
      normalized[normalizedKey] = this.normalizeFieldValue(value, normalizedKey);
    }
    
    return normalized;
  }

  /**
   * 标准化字段名
   */
  normalizeFieldName(key) {
    // 处理不同数据源可能使用的不同字段名
    const fieldMappings = {
      'dvdid': 'avid',
      'dvd_id': 'avid',
      'code': 'avid',
      'actress': 'actors',
      'actresses': 'actors',
      'genre': 'genres',
      'genres': 'genres',
      'studio': 'studio',
      'maker': 'studio',
      'producer': 'studio',
      'release_date': 'releaseDate',
      'publish_date': 'releaseDate',
      'date': 'releaseDate',
      'cover_image': 'cover',
      'cover_url': 'cover',
      'big_image': 'bigCover',
      'big_cover': 'bigCover',
      'preview_pics': 'previewPics',
      'preview_images': 'previewPics',
      'preview_video': 'previewVideo',
      'trailer': 'previewVideo'
    };
    
    return fieldMappings[key] || key;
  }

  /**
   * 标准化字段值
   */
  normalizeFieldValue(value, fieldName) {
    // 处理URL字段
    if (this.isUrlField(fieldName) && typeof value === 'string') {
      try {
        const url = new URL(value);
        return url.href;
      } catch {
        return value;
      }
    }
    
    // 处理日期字段
    if (this.isDateField(fieldName) && value) {
      return this.normalizeDate(value);
    }
    
    // 处理数组字段
    if (Array.isArray(value)) {
      return value.filter(item => item !== null && item !== undefined);
    }
    
    return value;
  }

  /**
   * 检查是否为URL字段
   */
  isUrlField(fieldName) {
    const urlFields = ['cover', 'bigCover', 'previewPics', 'previewVideo', 'url', 'actress_pics'];
    return urlFields.includes(fieldName) || fieldName.endsWith('_url') || fieldName.endsWith('_image');
  }

  /**
   * 检查是否为日期字段
   */
  isDateField(fieldName) {
    const dateFields = ['releaseDate', 'publishDate', 'date', 'createdAt', 'updatedAt'];
    return dateFields.includes(fieldName) || fieldName.endsWith('_date') || fieldName.endsWith('_at');
  }

  /**
   * 标准化日期格式
   */
  normalizeDate(dateValue) {
    if (!dateValue) return null;
    
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return dateValue; // 如果不是有效日期，返回原值
      }
      
      // 格式化为 YYYY-MM-DD
      return date.toISOString().split('T')[0];
    } catch {
      return dateValue;
    }
  }

  /**
   * 提取URL路径部分
   */
  extractUrlPath(urlValue) {
    if (!urlValue || typeof urlValue !== 'string') {
      return urlValue;
    }
    
    try {
      const url = new URL(urlValue);
      return url.pathname;
    } catch {
      // 如果不是完整URL，返回原值
      return urlValue;
    }
  }

  /**
   * 截断值用于显示
   */
  truncateValue(value, maxLength = 50) {
    if (value === null || value === undefined) {
      return 'null';
    }
    
    const str = String(value);
    if (str.length <= maxLength) {
      return str;
    }
    
    return str.substring(0, maxLength) + '...';
  }

  /**
   * 生成详细的对比报告
   */
  generateReport(comparisonResult, avId, scraperName) {
    const { success, differences, warnings, summary, error } = comparisonResult;
    
    let report = `\n=== 数据对比报告 ===\n`;
    report += `番号: ${avId}\n`;
    report += `抓取器: ${scraperName}\n`;
    report += `时间: ${new Date().toLocaleString()}\n`;
    report += `结果: ${success ? '✅ 通过' : '❌ 失败'}\n`;
    
    if (error) {
      report += `错误: ${error}\n`;
      return report;
    }
    
    report += `\n统计信息:\n`;
    report += `  - 总字段数: ${summary.totalFields}\n`;
    report += `  - 差异字段: ${summary.differentFields}\n`;
    report += `  - 警告字段: ${summary.warningFields}\n`;
    
    if (differences.length > 0) {
      report += `\n差异详情:\n`;
      differences.forEach(diff => {
        report += `  - ${diff}\n`;
      });
    }
    
    if (warnings.length > 0) {
      report += `\n警告信息:\n`;
      warnings.forEach(warning => {
        report += `  - ${warning}\n`;
      });
    }
    
    return report;
  }

  /**
   * 批量比较多个结果
   */
  batchCompare(results) {
    const batchResult = {
      total: results.length,
      passed: 0,
      failed: 0,
      errors: 0,
      details: []
    };

    for (const result of results) {
      const detail = {
        avId: result.avId,
        scraper: result.scraperName,
        success: result.comparison.success,
        differences: result.comparison.differences.length,
        warnings: result.comparison.warnings.length
      };

      if (result.comparison.error) {
        detail.error = result.comparison.error;
        batchResult.errors++;
        batchResult.failed++;
      } else if (result.comparison.success) {
        batchResult.passed++;
      } else {
        batchResult.failed++;
      }

      batchResult.details.push(detail);
    }

    batchResult.successRate = ((batchResult.passed / batchResult.total) * 100).toFixed(1);
    
    return batchResult;
  }
}

module.exports = DataComparator;