/**
 * AV番号验证器单元测试
 */

const AvIdValidator = require('../../src/shared/services/web-scraper/av-id-validator');

describe('AvIdValidator Unit Tests', () => {
  let validator;

  beforeEach(() => {
    validator = new AvIdValidator();
  });

  describe('Basic Validation Tests', () => {
    test('should validate standard S1 format', () => {
      expect(validator.validate('IPX-177')).toBe(true);
      expect(validator.validate('SSNI-999')).toBe(true);
      expect(validator.validate('ABP-888')).toBe(true);
    });

    test('should validate FC2 format', () => {
      expect(validator.validate('FC2-PPV-1234567')).toBe(true);
      expect(validator.validate('FC2_PPV_1234567')).toBe(true);
      expect(validator.validate('FC2PPV1234567')).toBe(true);
    });

    test('should validate HEYZO format', () => {
      expect(validator.validate('HEYZO-1234')).toBe(true);
      expect(validator.validate('HEYZO_1234')).toBe(true);
      expect(validator.validate('HEYZO1234')).toBe(true);
    });

    test('should validate generic format', () => {
      expect(validator.validate('ABC-123')).toBe(true);
      expect(validator.validate('XYZ-4567')).toBe(true);
      expect(validator.validate('TEST-12')).toBe(true);
    });

    test('should reject invalid formats', () => {
      expect(validator.validate('')).toBe(false);
      expect(validator.validate('INVALID')).toBe(false);
      expect(validator.validate('123')).toBe(false);
      expect(validator.validate('A'.repeat(100))).toBe(false);
    });

    test('should handle null and undefined', () => {
      expect(validator.validate(null)).toBe(false);
      expect(validator.validate(undefined)).toBe(false);
    });
  });

  describe('Normalization Tests', () => {
    test('should normalize standard formats', () => {
      expect(validator.normalize('ipx-177')).toBe('IPX-177');
      expect(validator.normalize('IPX-177')).toBe('IPX-177');
      expect(validator.normalize('Ipx-177')).toBe('IPX-177');
    });

    test('should normalize FC2 formats', () => {
      expect(validator.normalize('FC2-PPV-1234567')).toBe('FC2-PPV-1234567');
      expect(validator.normalize('FC2_PPV_1234567')).toBe('FC2-PPV-1234567');
      expect(validator.normalize('FC2PPV1234567')).toBe('FC2-PPV-1234567');
    });

    test('should normalize HEYZO formats', () => {
      expect(validator.normalize('HEYZO-1234')).toBe('HEYZO-1234');
      expect(validator.normalize('HEYZO_1234')).toBe('HEYZO-1234');
      expect(validator.normalize('HEYZO1234')).toBe('HEYZO-1234');
    });

    test('should return null for invalid formats', () => {
      expect(validator.normalize('INVALID')).toBe(null);
      expect(validator.normalize('')).toBe(null);
      expect(validator.normalize(null)).toBe(null);
    });
  });

  describe('Information Extraction Tests', () => {
    test('should extract info from IPX format', () => {
      const info = validator.extractInfo('IPX-177');
      expect(info).toBeDefined();
      expect(info.normalized).toBe('IPX-177');
      expect(info.studio).toBe('IdeaPocket');
      expect(info.series).toBe('IPX');
      expect(info.number).toBe('177');
      expect(info.format).toBe('s1');
    });

    test('should extract info from FC2 format', () => {
      const info = validator.extractInfo('FC2-PPV-1234567');
      expect(info).toBeDefined();
      expect(info.normalized).toBe('FC2-PPV-1234567');
      expect(info.studio).toBe('FC2');
      expect(info.series).toBe('FC2-PPV');
      expect(info.number).toBe('1234567');
      expect(info.format).toBe('fc2');
    });

    test('should extract info from HEYZO format', () => {
      const info = validator.extractInfo('HEYZO-1234');
      expect(info).toBeDefined();
      expect(info.normalized).toBe('HEYZO-1234');
      expect(info.studio).toBe('Heyzo');
      expect(info.series).toBe('HEYZO');
      expect(info.number).toBe('1234');
      expect(info.format).toBe('heyzo');
    });

    test('should return null for invalid formats', () => {
      const info = validator.extractInfo('INVALID');
      expect(info).toBe(null);
    });
  });

  describe('Studio Detection Tests', () => {
    test('should detect IdeaPocket studio', () => {
      expect(validator.getStudio('IPX-177')).toBe('IdeaPocket');
      expect(validator.getStudio('IPIT-123')).toBe('IdeaPocket');
    });

    test('should detect S1 studio', () => {
      expect(validator.getStudio('SSNI-999')).toBe('S1');
      expect(validator.getStudio('SSIS-456')).toBe('S1');
    });

    test('should detect Prestige studio', () => {
      expect(validator.getStudio('ABP-888')).toBe('Prestige');
    });

    test('should detect Moodyz studio', () => {
      expect(validator.getStudio('MIAE-123')).toBe('Moodyz');
      expect(validator.getStudio('MIRD-456')).toBe('Moodyz');
    });

    test('should return null for unknown studios', () => {
      expect(validator.getStudio('UNKNOWN-123')).toBe(null);
    });
  });

  describe('Format Specific Tests', () => {
    test('should identify FC2 format', () => {
      expect(validator.isFC2('FC2-PPV-1234567')).toBe(true);
      expect(validator.isFC2('IPX-177')).toBe(false);
    });

    test('should identify HEYZO format', () => {
      expect(validator.isHeyzo('HEYZO-1234')).toBe(true);
      expect(validator.isHeyzo('IPX-177')).toBe(false);
    });

    test('should identify S1 format', () => {
      expect(validator.isS1('SSNI-999')).toBe(true);
      expect(validator.isS1('SSIS-456')).toBe(true);
      expect(validator.isS1('IPX-177')).toBe(false);
    });

    test('should identify IdeaPocket format', () => {
      expect(validator.isIdeaPocket('IPX-177')).toBe(true);
      expect(validator.isIdeaPocket('IPIT-123')).toBe(true);
      expect(validator.isIdeaPocket('SSNI-999')).toBe(false);
    });
  });

  describe('Fuzzy Matching Tests', () => {
    test('should match single AV ID in text', () => {
      const text = '这部电影的番号是IPX-177，非常精彩';
      const matches = validator.fuzzyMatch(text);
      expect(matches).toContain('IPX-177');
      expect(matches.length).toBe(1);
    });

    test('should match multiple AV IDs in text', () => {
      const text = '推荐IPX-177和SSNI-999这两部作品';
      const matches = validator.fuzzyMatch(text);
      expect(matches).toContain('IPX-177');
      expect(matches).toContain('SSNI-999');
      expect(matches.length).toBe(2);
    });

    test('should match FC2 format in text', () => {
      const text = 'FC2-PPV-1234567这部作品很不错';
      const matches = validator.fuzzyMatch(text);
      expect(matches).toContain('FC2-PPV-1234567');
    });

    test('should return empty array for no matches', () => {
      const matches = validator.fuzzyMatch('这里没有番号');
      expect(matches).toEqual([]);
    });
  });

  describe('Search Keywords Tests', () => {
    test('should generate keywords for standard format', () => {
      const keywords = validator.generateSearchKeywords('IPX-177');
      expect(keywords).toContain('IPX-177');
      expect(keywords).toContain('IPX177');
      expect(keywords).toContain('IPX_177');
      expect(keywords).toContain('IPX 177');
    });

    test('should generate keywords for FC2 format', () => {
      const keywords = validator.generateSearchKeywords('FC2-PPV-1234567');
      expect(keywords).toContain('FC2-PPV-1234567');
      expect(keywords).toContain('FC2PPV1234567');
      expect(keywords).toContain('fc2_ppv_1234567');
    });

    test('should return empty array for invalid format', () => {
      const keywords = validator.generateSearchKeywords('INVALID');
      expect(keywords).toEqual([]);
    });
  });

  describe('Comparison Tests', () => {
    test('should identify same AV IDs', () => {
      expect(validator.isSame('IPX-177', 'IPX-177')).toBe(true);
      expect(validator.isSame('ipx-177', 'IPX-177')).toBe(true);
      expect(validator.isSame('IPX-177', 'ipx-177')).toBe(true);
    });

    test('should identify different AV IDs', () => {
      expect(validator.isSame('IPX-177', 'SSNI-999')).toBe(false);
      expect(validator.isSame('IPX-177', 'IPX-178')).toBe(false);
    });

    test('should handle invalid inputs', () => {
      expect(validator.isSame('INVALID', 'IPX-177')).toBe(false);
      expect(validator.isSame('IPX-177', 'INVALID')).toBe(false);
      expect(validator.isSame('INVALID1', 'INVALID2')).toBe(false);
    });
  });

  describe('Utility Tests', () => {
    test('should return supported formats', () => {
      const formats = validator.getSupportedFormats();
      expect(Array.isArray(formats)).toBe(true);
      expect(formats.length).toBeGreaterThan(0);
      expect(formats).toContain('s1');
      expect(formats).toContain('fc2');
      expect(formats).toContain('heyzo');
    });

    test('should handle edge cases', () => {
      // 测试各种边界情况
      expect(validator.validate('A-1')).toBe(true);
      expect(validator.validate('AB-12')).toBe(true);
      expect(validator.validate('ABC-123')).toBe(true);
      expect(validator.validate('ABCD-1234')).toBe(true);
      expect(validator.validate('ABCDE-12345')).toBe(true);
    });
  });
});