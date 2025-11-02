/**
 * 反爬虫检测器
 * 检测和应对各种反爬虫机制
 */

const EventEmitter = require('eventemitter3');

class AntiBotDetector extends EventEmitter {
  constructor(config = {}) {
    super();
    this.detectionRules = {
      // 检测响应头中的反爬虫标志
      headers: {
        'x-robots-tag': /noindex|nofollow/i,
        'x-frame-options': /deny|sameorigin/i,
        'x-content-type-options': /nosniff/i,
        'server': /cloudflare|akamai|incapsula/i,
        'cf-ray': /.*/i, // CloudFlare
        'x-cdn': /.*/i, // CDN标识
      },
      
      // 检测页面内容中的反爬虫标志
      content: {
        // CloudFlare挑战页面
        cloudflare: /cf-browser-verification|cloudflare[-\s]?ray[-\s]?id|checking your browser/i,
        
        // reCAPTCHA
        recaptcha: /recaptcha|g-recaptcha/i,
        
        // 通用反爬虫
        generic: /bot[-\s]?detect|anti[-\s]?bot|robot[-\s]?check|automated[-\s]?request/i,
        
        // IP被封禁
        blocked: /access[-\s]?denied|forbidden|blocked|banned|blacklist/i,
        
        // 需要验证
        verification: /please[-\s]?verify|human[-\s]?verification|prove[-\s]?you[-\s]?are[-\s]?human/i,
        
        // 速率限制
        rateLimit: /too[-\s]?many[-\s]?requests|rate[-\s]?limit|exceeded|quota/i,
        
        // JavaScript挑战
        jsChallenge: /javascript[-\s]?required|enable[-\s]?javascript|js[-\s]?challenge/i,
        
        // 浏览器检查
        browserCheck: /browser[-\s]?check|unsupported[-\s]?browser|update[-\s]?your[-\s]?browser/i
      },
      
      // 检测状态码
      statusCodes: [403, 429, 503, 520, 521, 522, 523, 524],
      
      // 检测响应时间异常
      responseTimeThreshold: 5000, // 5秒
      
      // 检测页面结构变化
      structure: {
        missingElements: [], // 应该存在的元素
        unexpectedElements: [], // 不应该存在的元素
        contentLength: {
          min: 100, // 最小内容长度
          max: 1000000 // 最大内容长度
        }
      }
    };
    
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0'
    ];
    
    this.detectionHistory = [];
    this.currentUserAgentIndex = 0;
    this.failedAttempts = 0;
    this.lastDetectionTime = 0;
  }

  /**
   * 检测反爬虫机制
   * @param {Object} response - HTTP响应对象
   * @param {Object} options - 检测选项
   * @returns {Object} - 检测结果
   */
  detect(response, options = {}) {
    const result = {
      isBotDetected: false,
      detectionType: null,
      confidence: 0,
      details: {},
      recommendations: [],
      timestamp: new Date().toISOString()
    };
    
    try {
      // 检测状态码
      if (this.checkStatusCode(response.status, result)) {
        result.isBotDetected = true;
        result.confidence += 0.3;
      }
      
      // 检测响应头
      if (response.headers && this.checkHeaders(response.headers, result)) {
        result.isBotDetected = true;
        result.confidence += 0.2;
      }
      
      // 检测内容
      if (response.data && this.checkContent(response.data, result)) {
        result.isBotDetected = true;
        result.confidence += 0.4;
      }
      
      // 检测响应时间
      if (response.responseTime && this.checkResponseTime(response.responseTime, result)) {
        result.isBotDetected = true;
        result.confidence += 0.1;
      }
      
      // 检测页面结构
      if (options.expectedStructure && this.checkStructure(response.data, options.expectedStructure, result)) {
        result.isBotDetected = true;
        result.confidence += 0.2;
      }
      
      // 生成建议
      result.recommendations = this.generateRecommendations(result);
      
      // 记录检测历史
      this.recordDetection(result);
      
    } catch (error) {
      this.log('error', '检测过程中出错', error);
      result.details.detectionError = error.message;
    }
    
    return result;
  }

  /**
   * 检查状态码
   * @param {number} statusCode - HTTP状态码
   * @param {Object} result - 检测结果
   * @returns {boolean} - 是否检测到反爬虫
   */
  checkStatusCode(statusCode, result) {
    if (this.detectionRules.statusCodes.includes(statusCode)) {
      result.details.statusCode = {
        detected: true,
        code: statusCode,
        description: this.getStatusCodeDescription(statusCode)
      };
      return true;
    }
    return false;
  }

  /**
   * 检查响应头
   * @param {Object} headers - HTTP响应头
   * @param {Object} result - 检测结果
   * @returns {boolean} - 是否检测到反爬虫
   */
  checkHeaders(headers, result) {
    const detectedHeaders = {};
    
    for (const [header, pattern] of Object.entries(this.detectionRules.headers)) {
      const headerValue = headers[header.toLowerCase()] || headers[header];
      if (headerValue && pattern.test(headerValue)) {
        detectedHeaders[header] = {
          value: headerValue,
          pattern: pattern.source
        };
      }
    }
    
    if (Object.keys(detectedHeaders).length > 0) {
      result.details.headers = {
        detected: true,
        suspiciousHeaders: detectedHeaders
      };
      return true;
    }
    
    return false;
  }

  /**
   * 检查内容
   * @param {string} content - 页面内容
   * @param {Object} result - 检测结果
   * @returns {boolean} - 是否检测到反爬虫
   */
  checkContent(content, result) {
    const detectedPatterns = {};
    
    for (const [type, pattern] of Object.entries(this.detectionRules.content)) {
      if (pattern.test(content)) {
        const matches = content.match(pattern);
        detectedPatterns[type] = {
          pattern: pattern.source,
          matches: matches ? matches.slice(0, 3) : [], // 只保留前3个匹配
          matchCount: matches ? matches.length : 0
        };
      }
    }
    
    if (Object.keys(detectedPatterns).length > 0) {
      result.details.content = {
        detected: true,
        detectedPatterns: detectedPatterns,
        contentLength: content.length
      };
      return true;
    }
    
    // 检查内容长度
    const contentLength = content.length;
    if (contentLength < this.detectionRules.structure.contentLength.min ||
        contentLength > this.detectionRules.structure.contentLength.max) {
      result.details.contentLength = {
        detected: true,
        length: contentLength,
        expected: this.detectionRules.structure.contentLength
      };
      return true;
    }
    
    return false;
  }

  /**
   * 检查响应时间
   * @param {number} responseTime - 响应时间（毫秒）
   * @param {Object} result - 检测结果
   * @returns {boolean} - 是否检测到异常
   */
  checkResponseTime(responseTime, result) {
    if (responseTime > this.detectionRules.responseTimeThreshold) {
      result.details.responseTime = {
        detected: true,
        responseTime: responseTime,
        threshold: this.detectionRules.responseTimeThreshold
      };
      // 发送反爬虫检测事件
      this.emit('bot:detected', {
        type: 'response_time',
        responseTime: responseTime,
        threshold: this.detectionRules.responseTimeThreshold,
        timestamp: Date.now()
      });
      return true;
    }
    return false;
  }

  /**
   * 检查页面结构
   * @param {string} content - 页面内容
   * @param {Object} expectedStructure - 期望的结构
   * @param {Object} result - 检测结果
   * @returns {boolean} - 是否检测到异常
   */
  checkStructure(content, expectedStructure, result) {
    const missingElements = [];
    const unexpectedElements = [];
    
    // 检查缺失的元素
    if (expectedStructure.requiredElements) {
      for (const element of expectedStructure.requiredElements) {
        if (!content.includes(element)) {
          missingElements.push(element);
        }
      }
    }
    
    // 检查意外的元素
    if (expectedStructure.forbiddenElements) {
      for (const element of expectedStructure.forbiddenElements) {
        if (content.includes(element)) {
          unexpectedElements.push(element);
        }
      }
    }
    
    if (missingElements.length > 0 || unexpectedElements.length > 0) {
      result.details.structure = {
        detected: true,
        missingElements: missingElements,
        unexpectedElements: unexpectedElements
      };
      return true;
    }
    
    return false;
  }

  /**
   * 生成应对建议
   * @param {Object} detectionResult - 检测结果
   * @returns {Array} - 建议列表
   */
  generateRecommendations(detectionResult) {
    const recommendations = [];
    
    if (detectionResult.details.statusCode) {
      switch (detectionResult.details.statusCode.code) {
        case 403:
          recommendations.push('IP可能被封禁，建议使用代理');
          recommendations.push('检查User-Agent是否被识别');
          break;
        case 429:
          recommendations.push('降低请求频率');
          recommendations.push('增加请求间隔');
          break;
        case 503:
          recommendations.push('服务可能暂时不可用，稍后重试');
          break;
      }
    }
    
    if (detectionResult.details.content) {
      const patterns = detectionResult.details.content.detectedPatterns;
      
      if (patterns.cloudflare) {
        recommendations.push('检测到CloudFlare保护');
        recommendations.push('需要使用更高级的绕过技术');
      }
      
      if (patterns.recaptcha) {
        recommendations.push('检测到reCAPTCHA验证');
        recommendations.push('需要人工干预或使用验证码解决服务');
      }
      
      if (patterns.jsChallenge) {
        recommendations.push('检测到JavaScript挑战');
        recommendations.push('需要支持JavaScript执行');
      }
      
      if (patterns.blocked) {
        recommendations.push('检测到访问被阻止');
        recommendations.push('建议更换IP地址');
      }
    }
    
    if (detectionResult.details.headers) {
      recommendations.push('检测到反爬虫响应头');
      recommendations.push('建议模拟更真实的浏览器行为');
    }
    
    if (detectionResult.confidence > 0.7) {
      recommendations.push('高置信度检测到反爬虫机制');
      recommendations.push('建议暂停爬取并重新评估策略');
    }
    
    return recommendations;
  }

  /**
   * 获取状态码描述
   * @param {number} statusCode - HTTP状态码
   * @returns {string} - 状态码描述
   */
  getStatusCodeDescription(statusCode) {
    const descriptions = {
      403: 'Forbidden - 访问被禁止',
      429: 'Too Many Requests - 请求过多',
      503: 'Service Unavailable - 服务不可用',
      520: 'Unknown Error - 未知错误',
      521: 'Web Server is Down - 服务器宕机',
      522: 'Connection Timed Out - 连接超时',
      523: 'Origin is Unreachable - 源服务器不可达',
      524: 'A Timeout Occurred - 发生超时'
    };
    
    return descriptions[statusCode] || 'Unknown status code';
  }

  /**
   * 记录检测历史
   * @param {Object} result - 检测结果
   */
  recordDetection(result) {
    this.detectionHistory.push({
      ...result,
      id: Date.now()
    });
    
    // 保持历史记录在合理范围内
    if (this.detectionHistory.length > 100) {
      this.detectionHistory = this.detectionHistory.slice(-50);
    }
    
    this.lastDetectionTime = Date.now();
    
    if (result.isBotDetected) {
      this.failedAttempts++;
    } else {
      this.failedAttempts = 0;
    }
  }

  /**
   * 获取下一个User-Agent
   * @returns {string} - User-Agent字符串
   */
  getNextUserAgent() {
    const userAgent = this.userAgents[this.currentUserAgentIndex];
    this.currentUserAgentIndex = (this.currentUserAgentIndex + 1) % this.userAgents.length;
    return userAgent;
  }

  /**
   * 获取检测统计
   * @returns {Object} - 统计信息
   */
  getDetectionStats() {
    const total = this.detectionHistory.length;
    const detected = this.detectionHistory.filter(d => d.isBotDetected).length;
    const recent = this.detectionHistory.slice(-10);
    const recentDetected = recent.filter(d => d.isBotDetected).length;
    
    return {
      totalDetections: total,
      botDetectedCount: detected,
      detectionRate: total > 0 ? detected / total : 0,
      recentDetectionRate: recent.length > 0 ? recentDetected / recent.length : 0,
      failedAttempts: this.failedAttempts,
      lastDetectionTime: this.lastDetectionTime,
      userAgentRotation: this.currentUserAgentIndex
    };
  }

  /**
   * 清除检测历史
   */
  clearDetectionHistory() {
    this.detectionHistory = [];
    this.failedAttempts = 0;
    this.lastDetectionTime = 0;
  }

  /**
   * 日志函数
   * @param {string} level - 日志级别
   * @param {string} message - 日志消息
   * @param {Object} meta - 元数据
   */
  log(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [AntiBotDetector] [${level.toUpperCase()}] ${message}`, meta);
  }

  /**
   * 销毁反爬虫检测器
   */
  destroy() {
    // 清理资源
    this.detectionRules = null;
    this.userAgents = null;
    this.detectionHistory = null;
    if (this.removeAllListeners) {
      this.removeAllListeners();
    }
  }
}

module.exports = AntiBotDetector;