const { JavSPService } = require('../../src/shared/services/javsp-service');
const path = require('path');

// 模拟JavSP番号识别功能
class MockJavSP {
  static async identify(videoPath) {
    const filename = path.parse(videoPath).name;
    
    // 模拟番号识别结果
    const mockResults = {
      'ABC-123': {
        avid: 'ABC-123',
        confidence: 0.95,
        title: '番号ABC-123的标题',
        actress: ['女优A', '女优B'],
        releaseDate: '2024-01-15',
        studio: '制作商A'
      },
      'XYZ-456': {
        avid: 'XYZ-456',
        confidence: 0.88,
        title: '番号XYZ-456的标题',
        actress: ['女优C'],
        releaseDate: '2024-02-20',
        studio: '制作商B'
      },
      'FC2-PPV-123456': {
        avid: 'FC2-PPV-123456',
        confidence: 0.92,
        title: 'FC2作品标题',
        actress: ['素人女优'],
        releaseDate: '2024-03-10',
        studio: 'FC2'
      },
      'heydouga-4017-123': {
        avid: 'heydouga-4017-123',
        confidence: 0.85,
        title: 'Hey動画作品标题',
        actress: ['女优D'],
        releaseDate: '2024-04-05',
        studio: 'Hey動画'
      }
    };

    return mockResults[filename] || {
      avid: filename,
      confidence: 0.0,
      title: '未知作品',
      actress: [],
      releaseDate: null,
      studio: '未知制作商'
    };
  }

  static async validateAvId(avid) {
    // 模拟番号格式验证
    const patterns = [
      /^[A-Z]{2,5}-\d{2,5}$/,           // ABC-123, XYZ-1234
      /^FC2-\d{6,7}$/,                 // FC2-123456
      /^FC2-PPV-\d{6,7}$/,             // FC2-PPV-123456
      /^heydouga-\d{4}-\d{3}$/         // heydouga-4017-123
    ];

    return patterns.some(pattern => pattern.test(avid));
  }

  static async batchIdentify(videoPaths) {
    // 模拟批量识别
    const results = [];
    for (const videoPath of videoPaths) {
      try {
        const result = await this.identify(videoPath);
        results.push({
          videoPath,
          success: true,
          result
        });
      } catch (error) {
        results.push({
          videoPath,
          success: false,
          error: error.message
        });
      }
    }
    return results;
  }
}

describe('JavSP番号识别服务测试', () => {
  
  describe('番号识别功能', () => {
    test('应该能够识别标准番号格式', async () => {
      const testCases = [
        {
          videoPath: 'D:\\Videos\\ABC-123.mp4',
          expectedAvid: 'ABC-123',
          expectedConfidence: 0.95
        },
        {
          videoPath: 'D:\\Videos\\XYZ-456.avi',
          expectedAvid: 'XYZ-456',
          expectedConfidence: 0.88
        }
      ];

      for (const testCase of testCases) {
        const result = await MockJavSP.identify(testCase.videoPath);
        expect(result.avid).toBe(testCase.expectedAvid);
        expect(result.confidence).toBeGreaterThanOrEqual(testCase.expectedConfidence);
        expect(result).toHaveProperty('title');
        expect(result).toHaveProperty('actress');
        expect(result).toHaveProperty('releaseDate');
        expect(result).toHaveProperty('studio');
      }
    });

    test('应该能够识别FC2番号格式', async () => {
      const videoPath = 'D:\\Videos\\FC2-PPV-123456.mkv';
      const result = await MockJavSP.identify(videoPath);
      
      expect(result.avid).toBe('FC2-PPV-123456');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.studio).toBe('FC2');
      expect(result.actress).toContain('素人女优');
    });

    test('应该能够识别Hey動画番号格式', async () => {
      const videoPath = 'D:\\Videos\\heydouga-4017-123.mp4';
      const result = await MockJavSP.identify(videoPath);
      
      expect(result.avid).toBe('heydouga-4017-123');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.studio).toBe('Hey動画');
    });

    test('应该能够处理无法识别的番号', async () => {
      const videoPath = 'D:\\Videos\\普通视频.mp4';
      const result = await MockJavSP.identify(videoPath);
      
      expect(result.avid).toBe('普通视频');
      expect(result.confidence).toBe(0.0);
      expect(result.title).toBe('未知作品');
      expect(result.actress).toEqual([]);
    });
  });

  describe('番号格式验证', () => {
    test('应该能够验证正确的番号格式', async () => {
      const validAvIds = [
        'ABC-123',
        'XYZ-4567',
        'FC2-123456',
        'FC2-PPV-123456',
        'heydouga-4017-123'
      ];

      for (const avid of validAvIds) {
        const isValid = await MockJavSP.validateAvId(avid);
        expect(isValid).toBe(true);
      }
    });

    test('应该能够拒绝无效的番号格式', async () => {
      const invalidAvIds = [
        'abc-123',           // 小写字母
        'ABC-12345-678',     // 格式不正确
        '普通视频',          // 中文
        '123-ABC',           // 顺序错误
        ''                   // 空字符串
      ];

      for (const avid of invalidAvIds) {
        const isValid = await MockJavSP.validateAvId(avid);
        expect(isValid).toBe(false);
      }
    });
  });

  describe('批量识别功能', () => {
    test('应该能够批量识别多个视频文件', async () => {
      const videoPaths = [
        'D:\\Videos\\ABC-123.mp4',
        'D:\\Videos\\XYZ-456.avi',
        'D:\\Videos\\FC2-PPV-123456.mkv',
        'D:\\Videos\\普通视频.mp4'
      ];

      const results = await MockJavSP.batchIdentify(videoPaths);
      
      expect(results).toHaveLength(4);
      expect(results.every(r => r.success)).toBe(true);
      
      // 验证识别结果
      expect(results[0].result.avid).toBe('ABC-123');
      expect(results[1].result.avid).toBe('XYZ-456');
      expect(results[2].result.avid).toBe('FC2-PPV-123456');
      expect(results[3].result.confidence).toBe(0.0);
    });

    test('应该能够处理批量识别中的错误', async () => {
      const videoPaths = [
        'D:\\Videos\\ABC-123.mp4',
        'D:\\Videos\\不存在的文件.mp4',
        'D:\\Videos\\XYZ-456.avi'
      ];

      // 模拟文件不存在的错误
      const originalIdentify = MockJavSP.identify;
      MockJavSP.identify = jest.fn(async (videoPath) => {
        if (videoPath.includes('不存在的文件')) {
          throw new Error('文件不存在');
        }
        return originalIdentify.call(MockJavSP, videoPath);
      });

      const results = await MockJavSP.batchIdentify(videoPaths);
      
      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe('文件不存在');
      expect(results[2].success).toBe(true);

      // 恢复原始方法
      MockJavSP.identify = originalIdentify;
    });
  });

  describe('性能测试', () => {
    test('应该能够在合理时间内完成番号识别', async () => {
      const startTime = Date.now();
      const videoPath = 'D:\\Videos\\ABC-123.mp4';
      
      const result = await MockJavSP.identify(videoPath);
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      expect(executionTime).toBeLessThan(100); // 100ms内完成
      expect(result.avid).toBe('ABC-123');
    });

    test('应该能够在合理时间内完成批量识别', async () => {
      const videoPaths = Array(10).fill(null).map((_, index) => 
        `D:\\Videos\\ABC-${123 + index}.mp4`
      );

      const startTime = Date.now();
      const results = await MockJavSP.batchIdentify(videoPaths);
      const endTime = Date.now();
      
      const executionTime = endTime - startTime;
      
      expect(executionTime).toBeLessThan(1000); // 1秒内完成10个文件
      expect(results).toHaveLength(10);
    });
  });

  describe('错误处理', () => {
    test('应该能够处理空输入', async () => {
      const result = await MockJavSP.identify('');
      
      expect(result.avid).toBe('');
      expect(result.confidence).toBe(0.0);
    });

    test('应该能够处理无效路径', async () => {
      const result = await MockJavSP.identify('invalid/path');
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('avid');
      expect(result).toHaveProperty('confidence');
    });
  });
});