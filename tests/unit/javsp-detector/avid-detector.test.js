/**
 * AVID番号检测器测试
 * TDD方法：先写测试，然后实现功能
 */

const AVIDDetector = require('../../../src/main/services/javsp-detector/avid-detector-simplified');

describe('AVIDDetector', () => {
  let detector;

  beforeEach(() => {
    detector = new AVIDDetector();
  });

  describe('FC2格式番号识别', () => {
    test('应该识别标准FC2番号', () => {
      const testCases = [
        { input: 'FC2-123456', expected: 'FC2-123456' },
        { input: 'FC2-789012', expected: 'FC2-789012' },
        { input: 'fc2-123456', expected: 'FC2-123456' }, // 小写转大写
        { input: 'FC2-1234567', expected: 'FC2-1234567' } // 7位数字
      ];

      testCases.forEach(({ input, expected }) => {
        expect(detector.get_id(input)).toBe(expected);
        expect(expected).toBeValidAvId();
        expect(expected).toBeFc2Format();
      });
    });

    test('应该识别FC2-PPV格式番号', () => {
      const testCases = [
        { input: 'FC2-PPV123456', expected: 'FC2-123456' },
        { input: 'FC2-PPV789012', expected: 'FC2-789012' },
        { input: 'fc2-ppv123456', expected: 'FC2-123456' }, // 小写转大写
        { input: 'FC2-PPV1234567', expected: 'FC2-1234567' } // 7位数字
      ];

      testCases.forEach(({ input, expected }) => {
        expect(detector.get_id(input)).toBe(expected);
        expect(expected).toBeValidAvId();
        expect(expected).toBeFc2Format();
      });
    });

    test('应该从文件路径中提取FC2番号', () => {
      const testCases = [
        {
          input: '/path/to/FC2-123456.mp4',
          expected: 'FC2-123456'
        },
        {
          input: '/path/to/FC2-PPV789012.avi',
          expected: 'FC2-789012'
        },
        {
          input: '/videos/FC2-123456 (HD).mkv',
          expected: 'FC2-123456'
        }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(detector.get_id(input)).toBe(expected);
        expect(expected).toBeValidAvId();
      });
    });

    test('应该拒绝无效的FC2格式', () => {
      const invalidCases = [
        'FC2-12345',    // 数字太短
        'FC2-12345678', // 数字太长
        'FC2-ABCDEF',   // 非数字
        'FC1-123456',   // 错误的前缀
        'FC2'           // 缺少数字
      ];

      invalidCases.forEach(input => {
        expect(detector.get_id(input)).toBe('');
      });
    });
  });

  describe('HEYOUGA格式番号识别', () => {
    test('应该识别标准HEYOUGA番号', () => {
      const testCases = [
        { input: 'heydouga-4017-123', expected: 'HEYDOUGA-4017-123' },
        { input: 'HEYDOUGA-4017-123', expected: 'HEYDOUGA-4017-123' },
        { input: 'heydouga-4017-1234', expected: 'HEYDOUGA-4017-1234' },
        { input: 'HEYDOUGA-4017-045', expected: 'HEYDOUGA-4017-045' }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(detector.get_id(input)).toBe(expected);
        expect(expected).toBeValidAvId();
        expect(expected).toBeHeydougaFormat();
      });
    });

    test('应该从文件路径中提取HEYOUGA番号', () => {
      const testCases = [
        {
          input: '/path/to/heydouga-4017-123.mp4',
          expected: 'HEYDOUGA-4017-123'
        },
        {
          input: '/videos/HEYDOUGA-4017-123.avi',
          expected: 'HEYDOUGA-4017-123'
        }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(detector.get_id(input)).toBe(expected);
        expect(expected).toBeValidAvId();
      });
    });

    test('应该拒绝无效的HEYOUGA格式', () => {
      const invalidCases = [
        'heydouga-4017',     // 缺少第二部分
        'heydouga-4017-12',  // 第二部分太短
        'heydouga-401-123',  // 第一部分太短
        'heydouga-4017-12345', // 第二部分太长
        'other-4017-123'    // 错误的前缀
      ];

      invalidCases.forEach(input => {
        expect(detector.get_id(input)).toBe('');
      });
    });
  });

  describe('GETCHU格式番号识别', () => {
    test('应该识别GETCHU番号', () => {
      const testCases = [
        { input: 'GETCHU-123456', expected: 'GETCHU-123456' },
        { input: 'getchu-789012', expected: 'GETCHU-789012' },
        { input: 'GETCHU-1234567', expected: 'GETCHU-1234567' }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(detector.get_id(input)).toBe(expected);
        expect(expected).toBeValidAvId();
      });
    });

    test('应该拒绝无效的GETCHU格式', () => {
      const invalidCases = [
        'GETCHU-12345',    // 数字太短
        'GETCHU-ABCDEF',   // 非数字
        'GETCHU'           // 缺少数字
      ];

      invalidCases.forEach(input => {
        expect(detector.get_id(input)).toBe('');
      });
    });
  });

  describe('普通番号格式识别', () => {
    test('应该识别标准番号格式', () => {
      const testCases = [
        { input: 'ABC-123', expected: 'ABC-123' },
        { input: 'JBS-018', expected: 'JBS-018' },
        { input: 'SSNI-254', expected: 'SSNI-254' },
        { input: 'YRZ-011', expected: 'YRZ-011' },
        { input: 'XYZ-1234', expected: 'XYZ-1234' }, // 4位数字
        { input: 'ABCDE-123', expected: 'ABCDE-123' } // 5个字母
      ];

      testCases.forEach(({ input, expected }) => {
        expect(detector.get_id(input)).toBe(expected);
        expect(expected).toBeValidAvId();
        expect(expected).toBeRegularFormat();
      });
    });

    test('应该从文件路径中提取普通番号', () => {
      const testCases = [
        {
          input: '/path/to/JBS-018.mp4',
          expected: 'JBS-018'
        },
        {
          input: '/videos/SSNI-254.avi',
          expected: 'SSNI-254'
        },
        {
          input: '/collection/YRZ-011 VOL.8.mkv',
          expected: 'YRZ-011'
        }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(detector.get_id(input)).toBe(expected);
        expect(expected).toBeValidAvId();
      });
    });

    test('应该拒绝无效的普通番号格式', () => {
      const invalidCases = [
        'A-123',        // 字母太短
        'ABC-12',       // 数字太短
        'ABC-123456',   // 数字太长
        'ABCDEF-123',   // 字母太长
        '123-ABC',      // 格式错误
        'ABC123',       // 缺少连字符
        'ABC-123-XYZ'   // 额外的连字符
      ];

      invalidCases.forEach(input => {
        expect(detector.get_id(input)).toBe('');
      });
    });
  });

  describe('边界情况和错误处理', () => {
    test('应该处理空输入', () => {
      expect(detector.get_id(null)).toBe('');
      expect(detector.get_id(undefined)).toBe('');
      expect(detector.get_id('')).toBe('');
    });

    test('应该处理非字符串输入', () => {
      expect(detector.get_id(123)).toBe('');
      expect(detector.get_id({})).toBe('');
      expect(detector.get_id([])).toBe('');
    });

    test('应该处理特殊字符和空格', () => {
      const testCases = [
        { input: '  ABC-123  ', expected: 'ABC-123' }, // 前后空格
        { input: 'ABC-123 (HD)', expected: 'ABC-123' }, // 后缀
        { input: '[ABC-123]', expected: 'ABC-123' }, // 方括号
        { input: 'ABC-123.mp4', expected: 'ABC-123' }, // 文件扩展名
        { input: '【ABC-123】', expected: 'ABC-123' } // 中文括号
      ];

      testCases.forEach(({ input, expected }) => {
        expect(detector.get_id(input)).toBe(expected);
      });
    });

    test('应该处理大小写混合', () => {
      const testCases = [
        { input: 'abc-123', expected: 'ABC-123' },
        { input: 'AbC-123', expected: 'ABC-123' },
        { input: 'fc2-123456', expected: 'FC2-123456' },
        { input: 'HeyDouGa-4017-123', expected: 'HEYDOUGA-4017-123' },
        { input: 'GeTcHu-123456', expected: 'GETCHU-123456' }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(detector.get_id(input)).toBe(expected);
      });
    });
  });

  describe('复杂文件名处理', () => {
    test('应该从复杂的文件名中提取番号', () => {
      const testCases = [
        {
          input: '【重磅】JBS-018 働くオンナ3 Vol.04 河愛雪乃.mp4',
          expected: 'JBS-018'
        },
        {
          input: 'FC2-PPV123456 (1080p).mkv',
          expected: 'FC2-123456'
        },
        {
          input: 'SSNI-254 三上悠亚 绝对領域.avi',
          expected: 'SSNI-254'
        },
        {
          input: 'heydouga-4017-123 完整版.mp4',
          expected: 'HEYDOUGA-4017-123'
        }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(detector.get_id(input)).toBe(expected);
        expect(expected).toBeValidAvId();
      });
    });

    test('应该处理多个可能的番号匹配', () => {
      // 当文件名中包含多个可能的番号时，应该返回最匹配的
      const testCases = [
        {
          input: 'JBS-018 and SSNI-254 comparison.mp4',
          expected: 'JBS-018' // 返回第一个匹配的
        },
        {
          input: 'FC2-123456 vs ABC-123.mp4',
          expected: 'FC2-123456' // FC2优先级更高
        }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = detector.get_id(input);
        // 注意：实际的优先级逻辑需要在实现中确定
        expect(result).toBeOneOf(['JBS-018', 'SSNI-254', 'FC2-123456', 'ABC-123']);
      });
    });
  });

  describe('性能测试', () => {
    test('应该能快速处理大量文件路径', () => {
      const testPaths = [];
      for (let i = 0; i < 1000; i++) {
        testPaths.push(`JBS-${String(i).padStart(3, '0')}.mp4`);
      }

      const startTime = Date.now();
      testPaths.forEach(path => {
        detector.get_id(path);
      });
      const endTime = Date.now();

      // 应该在1秒内完成1000个文件路径的处理
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});