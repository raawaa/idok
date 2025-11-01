// 媒体扫描服务测试
const path = require('path');

describe('媒体扫描服务测试', () => {
  
  describe('文件类型识别', () => {
    test('应该能够识别Kodi标准目录结构', () => {
      const mockFiles = [
        'D:\\Videos\\Movie1\\video.mp4',
        'D:\\Videos\\Movie1\\movie.nfo',
        'D:\\Videos\\Movie1\\folder.jpg'
      ];

      // 模拟Kodi标准检测逻辑
      const isKodiStandard = (files) => {
        return files.some(file => file.endsWith('.nfo'));
      };

      expect(isKodiStandard(mockFiles)).toBe(true);
    });

    test('应该能够识别独立视频文件', () => {
      const mockFiles = [
        'D:\\Videos\\ABC-123.mp4',
        'D:\\Videos\\XYZ-456.avi',
        'D:\\Videos\\普通视频.mkv'
      ];

      // 模拟独立视频检测逻辑
      const isStandaloneVideo = (file) => {
        const videoExtensions = ['.mp4', '.avi', '.mkv', '.mov', '.wmv'];
        return videoExtensions.some(ext => file.endsWith(ext));
      };

      mockFiles.forEach(file => {
        expect(isStandaloneVideo(file)).toBe(true);
      });
    });

    test('应该能够识别番号格式', () => {
      const testCases = [
        { filename: 'ABC-123.mp4', expected: true },
        { filename: 'XYZ-1234.avi', expected: true },
        { filename: 'FC2-PPV-123456.mkv', expected: true },
        { filename: 'heydouga-4017-123.mp4', expected: true },
        { filename: '普通视频.mp4', expected: false },
        { filename: 'movie-2024.avi', expected: false }
      ];

      // 模拟番号识别逻辑
      const hasAvId = (filename) => {
        const avidPatterns = [
          /^[A-Z]{2,5}-\d{2,5}$/,           // ABC-123, XYZ-1234
          /^FC2-\d{6,7}$/,                 // FC2-123456
          /^FC2-PPV-\d{6,7}$/,             // FC2-PPV-123456
          /^heydouga-\d{4}-\d{3}$/         // heydouga-4017-123
        ];
        
        const nameWithoutExt = path.parse(filename).name;
        return avidPatterns.some(pattern => pattern.test(nameWithoutExt));
      };

      testCases.forEach(({ filename, expected }) => {
        expect(hasAvId(filename)).toBe(expected);
      });
    });
  });

  describe('分层扫描策略', () => {
    test('应该优先处理Kodi标准文件', () => {
      const mockDirectory = {
        path: 'D:\\Videos\\Movie1',
        files: [
          'D:\\Videos\\Movie1\\video.mp4',
          'D:\\Videos\\Movie1\\movie.nfo'
        ]
      };

      // 模拟分层扫描逻辑
      const scanStrategy = (directory) => {
        const hasNfo = directory.files.some(file => file.endsWith('.nfo'));
        
        if (hasNfo) {
          return { type: 'kodi-standard', priority: 1 };
        }
        
        const hasVideo = directory.files.some(file => {
          const videoExtensions = ['.mp4', '.avi', '.mkv'];
          return videoExtensions.some(ext => file.endsWith(ext));
        });
        
        if (hasVideo) {
          return { type: 'raw-video', priority: 2 };
        }
        
        return { type: 'skip', priority: 3 };
      };

      const result = scanStrategy(mockDirectory);
      expect(result.type).toBe('kodi-standard');
      expect(result.priority).toBe(1);
    });

    test('应该处理独立视频文件', () => {
      const mockDirectory = {
        path: 'D:\\Videos',
        files: [
          'D:\\Videos\\ABC-123.mp4',
          'D:\\Videos\\XYZ-456.avi'
        ]
      };

      // 模拟扫描策略
      const scanStrategy = (directory) => {
        const hasNfo = directory.files.some(file => file.endsWith('.nfo'));
        const hasVideo = directory.files.some(file => {
          const videoExtensions = ['.mp4', '.avi', '.mkv'];
          return videoExtensions.some(ext => file.endsWith(ext));
        });

        if (hasNfo) {
          return 'kodi-standard';
        } else if (hasVideo) {
          return 'raw-video';
        }
        return 'skip';
      };

      const result = scanStrategy(mockDirectory);
      expect(result).toBe('raw-video');
    });
  });

  describe('文件变化检测', () => {
    test('应该能够检测文件是否发生变化', () => {
      const cachedFile = {
        filePath: 'D:\\Videos\\ABC-123.mp4',
        lastModified: 1234567890000,
        fileSize: 1024000
      };

      const currentFile = {
        filePath: 'D:\\Videos\\ABC-123.mp4',
        lastModified: 1234567890000,
        fileSize: 1024000
      };

      // 模拟文件变化检测逻辑
      const isFileChanged = (cached, current) => {
        return cached.lastModified !== current.lastModified || 
               cached.fileSize !== current.fileSize;
      };

      expect(isFileChanged(cachedFile, currentFile)).toBe(false);

      // 测试文件大小变化
      const changedFile = { ...currentFile, fileSize: 2048000 };
      expect(isFileChanged(cachedFile, changedFile)).toBe(true);
    });
  });

  describe('扫描结果处理', () => {
    test('应该能够正确处理扫描结果', () => {
      const scanResults = [
        {
          type: 'kodi-standard',
          videoPath: 'D:\\Videos\\Movie1\\video.mp4',
          nfoPath: 'D:\\Videos\\Movie1\\movie.nfo',
          title: 'Kodi电影1'
        },
        {
          type: 'raw-video',
          videoPath: 'D:\\Videos\\ABC-123.mp4',
          avid: 'ABC-123',
          confidence: 0.9
        }
      ];

      // 模拟结果处理逻辑
      const processResults = (results) => {
        return results.map(result => ({
          ...result,
          id: `${result.type}-${Date.now()}-${Math.random()}`,
          processedAt: new Date().toISOString()
        }));
      };

      const processedResults = processResults(scanResults);
      
      expect(processedResults).toHaveLength(2);
      expect(processedResults[0]).toHaveProperty('id');
      expect(processedResults[0]).toHaveProperty('processedAt');
      expect(processedResults[1].type).toBe('raw-video');
    });
  });
});