/**
 * 自定义Jest匹配器
 * 用于验证番号抓取相关的测试结果
 */

/**
 * 验证是否为有效的番号格式
 */
expect.extend({
  toBeValidAvId(received) {
    const avIdPatterns = [
      /^[A-Z]{2,5}-\d{3,4}$/,           // ABC-123, XYZ-1234
      /^FC2-\d{6,7}$/,                 // FC2-123456, FC2-1234567
      /^FC2-PPV\d{6,7}$/,              // FC2-PPV123456 (测试中的格式)
      /^HEYDOUGA-\d{4}-\d{3,4}$/,      // HEYDOUGA-4017-123
      /^GETCHU-\d+$/                   // GETCHU-123456
    ];

    const isValid = avIdPatterns.some(pattern => pattern.test(received));

    if (isValid) {
      return {
        message: () => `expected ${received} not to be a valid AV ID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid AV ID format`,
        pass: false,
      };
    }
  },

  /**
   * 验证是否为FC2格式的番号
   */
  toBeFc2Format(received) {
    const fc2Pattern = /^FC2-(PPV)?\d{5,7}$/i;
    const isFc2 = fc2Pattern.test(received);

    if (isFc2) {
      return {
        message: () => `expected ${received} not to be FC2 format`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be FC2 format`,
        pass: false,
      };
    }
  },

  /**
   * 验证是否为HEYOUGA格式的番号
   */
  toBeHeydougaFormat(received) {
    const heydougaPattern = /^HEYDOUGA-\d{4}-\d{3,4}$/i;
    const isHeydouga = heydougaPattern.test(received);

    if (isHeydouga) {
      return {
        message: () => `expected ${received} not to be Heydouga format`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be Heydouga format`,
        pass: false,
      };
    }
  },

  /**
   * 验证是否为普通格式的番号
   */
  toBeRegularFormat(received) {
    const regularPattern = /^[A-Z]{2,5}-\d{3,4}$/;
    const isRegular = regularPattern.test(received);

    if (isRegular) {
      return {
        message: () => `expected ${received} not to be regular AV format`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be regular AV format`,
        pass: false,
      };
    }
  },

  /**
   * 验证电影信息对象是否包含必要字段
   */
  toBeValidMovieInfo(received) {
    const requiredFields = ['dvdid', 'title'];
    const missingFields = requiredFields.filter(field => !received[field]);

    if (missingFields.length === 0) {
      return {
        message: () => `expected movie info to be invalid`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected movie info to have required fields: ${missingFields.join(', ')}`,
        pass: false,
      };
    }
  },

  /**
   * 验证是否为独立视频文件
   */
  toBeStandaloneVideo(received) {
    const isStandalone = received.isStandaloneVideo === true && received.hasMetadata === false;

    if (isStandalone) {
      return {
        message: () => `expected ${received.dvdid || 'object'} not to be a standalone video`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received.dvdid || 'object'} to be a standalone video`,
        pass: false,
      };
    }
  },

  /**
   * 验证是否有完整的元数据
   */
  toHaveCompleteMetadata(received) {
    const hasMetadata = received.hasMetadata === true && !received.isStandaloneVideo;
    const hasBasicInfo = received.title && received.dvdid;
    const hasExtendedInfo = received.actress && received.studio && received.release;

    const isComplete = hasMetadata && hasBasicInfo && hasExtendedInfo;

    if (isComplete) {
      return {
        message: () => `expected movie not to have complete metadata`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected movie to have complete metadata (missing: ${
          !hasMetadata ? 'hasMetadata flag, ' : ''
        }${!hasBasicInfo ? 'basic info, ' : ''
        }${!hasExtendedInfo ? 'extended info' : ''})`,
        pass: false,
      };
    }
  },

  /**
   * 验证置信度分数是否在有效范围内
   */
  toHaveValidConfidence(received) {
    const isValidConfidence = typeof received === 'number' && received >= 0 && received <= 1;

    if (isValidConfidence) {
      return {
        message: () => `expected ${received} not to be a valid confidence score`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid confidence score (0-1)`,
        pass: false,
      };
    }
  },

  /**
   * 验证URL是否有效
   */
  toBeValidUrl(received) {
    try {
      new URL(received);
      return {
        message: () => `expected ${received} not to be a valid URL`,
        pass: true,
      };
    } catch {
      return {
        message: () => `expected ${received} to be a valid URL`,
        pass: false,
      };
    }
  },

  /**
   * 验证是否为有效的HTTP状态码
   */
  toBeValidHttpStatus(received) {
    const isValidStatus = typeof received === 'number' && received >= 100 && received < 600;

    if (isValidStatus) {
      return {
        message: () => `expected ${received} not to be a valid HTTP status`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid HTTP status (100-599)`,
        pass: false,
      };
    }
  },

  /**
   * 验证是否为给定值之一
   */
  toBeOneOf(received, acceptableValues) {
    const isOneOf = acceptableValues.includes(received);

    if (isOneOf) {
      return {
        message: () => `expected ${received} not to be one of [${acceptableValues.join(', ')}]`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of [${acceptableValues.join(', ')}]`,
        pass: false,
      };
    }
  }
});

/**
 * 扩展expect类型定义（TypeScript支持）
 */
if (typeof expect !== 'undefined') {
  // 这些匹配器将在Jest测试中可用
}