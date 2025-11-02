const EventEmitter = require('eventemitter3');

// 简化的反爬虫检测器实现
class AntiBotDetector extends EventEmitter {
  constructor() {
    super();
    
    this.botPatterns = [
      /access denied.*ddos protection/i,
      /cloudflare.*ray id/i,
      /please verify you are human/i,
      /robot.*verification/i,
      /captcha.*required/i,
      /blocked.*suspicious activity/i,
      /security.*check/i,
      /human.*verification/i
    ];

    this.suspiciousHeaders = [
      'cf-ray',
      'x-rate-limit',
      'x-ratelimit-remaining',
      'x-captcha-required',
      'x-security-check',
      'x-bot-protection'
    ];

    this.botStatusCodes = [403, 429, 503, 520, 521, 522, 523, 524];

    this.stats = {
      totalChecks: 0,
      botDetected: 0,
      rateLimitHits: 0
    };
  }

  detect(content = '', headers = {}, statusCode = 200) {
    this.stats.totalChecks++;
    
    const result = {
      isBot: false,
      reason: '',
      confidence: 0,
      statusCode,
      timestamp: Date.now()
    };

    // 检测状态码
    if (this.botStatusCodes.includes(statusCode)) {
      result.isBot = true;
      result.confidence += 0.4;
      result.reason = this.getStatusCodeReason(statusCode);
      
      if (statusCode === 429) {
        this.stats.rateLimitHits++;
      }
    }

    // 检测内容模式
    const contentMatch = this.detectContentPatterns(content);
    if (contentMatch) {
      result.isBot = true;
      result.confidence += 0.3;
      result.reason = contentMatch;
    }

    // 检测头部模式
    const headerMatch = this.detectHeaderPatterns(headers);
    if (headerMatch) {
      result.isBot = true;
      result.confidence += 0.2;
      result.reason = headerMatch;
    }

    // 限制置信度最大值
    result.confidence = Math.min(result.confidence, 1.0);

    if (result.isBot) {
      this.stats.botDetected++;
      this.emit('botDetected', result);
    }

    return result;
  }

  detectContentPatterns(content) {
    for (const pattern of this.botPatterns) {
      if (pattern.test(content)) {
        return `Content pattern: ${pattern.toString()}`;
      }
    }
    return null;
  }

  detectHeaderPatterns(headers) {
    const headerKeys = Object.keys(headers).map(key => key.toLowerCase());
    
    for (const suspiciousHeader of this.suspiciousHeaders) {
      if (headerKeys.includes(suspiciousHeader.toLowerCase())) {
        return `Header pattern: ${suspiciousHeader}`;
      }
    }
    return null;
  }

  getStatusCodeReason(statusCode) {
    const reasons = {
      403: 'Access denied',
      429: 'Rate limit exceeded',
      503: 'Service unavailable',
      520: 'Web server is returning an unknown error',
      521: 'Web server is down',
      522: 'Connection timed out',
      523: 'Origin is unreachable',
      524: 'A timeout occurred'
    };
    
    return reasons[statusCode] || 'Unknown bot protection';
  }

  getRecommendations(detectionResult) {
    const recommendations = [];

    if (detectionResult.statusCode === 429) {
      recommendations.push('增加请求间隔');
      recommendations.push('使用代理池轮换IP');
    }

    if (detectionResult.statusCode === 403) {
      recommendations.push('检查User-Agent设置');
      recommendations.push('添加必要的请求头');
    }

    if (detectionResult.reason.includes('Content pattern')) {
      recommendations.push('等待一段时间再尝试');
      recommendations.push('使用不同的User-Agent');
    }

    if (detectionResult.reason.includes('Header pattern')) {
      recommendations.push('使用代理');
      recommendations.push('轮换User-Agent');
    }

    recommendations.push('使用更自然的访问模式');
    recommendations.push('添加随机延迟');

    return recommendations;
  }

  getStats() {
    return {
      ...this.stats,
      botDetectionRate: this.stats.totalChecks > 0 ? 
        (this.stats.botDetected / this.stats.totalChecks).toFixed(2) : '0.00'
    };
  }

  resetStats() {
    this.stats = {
      totalChecks: 0,
      botDetected: 0,
      rateLimitHits: 0
    };
  }

  destroy() {
    if (this.removeAllListeners) {
      this.removeAllListeners();
    }
  }
}

describe('AntiBotDetector Tests', () => {
  let antiBotDetector;

  beforeEach(() => {
    antiBotDetector = new AntiBotDetector();
  });

  afterEach(() => {
    if (antiBotDetector && typeof antiBotDetector.destroy === 'function') {
      antiBotDetector.destroy();
    }
  });

  test('should detect rate limit status codes', () => {
    const result = antiBotDetector.detect('', {}, 429);
    expect(result.isBot).toBe(true);
    expect(result.reason).toContain('Rate limit');
  });

  test('should detect blocked status codes', () => {
    const result = antiBotDetector.detect('', {}, 403);
    expect(result.isBot).toBe(true);
    expect(result.reason).toContain('Access denied');
  });

  test('should detect anti-bot content patterns', () => {
    const content = 'Access Denied - DDoS Protection by Cloudflare';
    const result = antiBotDetector.detect(content, {}, 200);
    expect(result.isBot).toBe(true);
    expect(result.reason).toContain('Content pattern');
  });

  test('should detect suspicious headers', () => {
    const headers = {
      'cf-ray': '123456789',
      'x-rate-limit': '10'
    };
    const result = antiBotDetector.detect('', headers, 200);
    expect(result.isBot).toBe(true);
    expect(result.reason).toContain('Header pattern');
  });

  test('should provide bypass recommendations', () => {
    const result = antiBotDetector.detect('', {}, 429);
    const recommendations = antiBotDetector.getRecommendations(result);
    
    expect(recommendations).toContain('增加请求间隔');
    expect(recommendations).toContain('使用代理池轮换IP');
  });
});