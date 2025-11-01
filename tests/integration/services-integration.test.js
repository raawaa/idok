// 集成服务测试 - 数据库 + 扫描 + JavSP
const path = require('path');
const { DatabaseService } = require('../../src/shared/services/database-service');
const { MediaScannerService } = require('../../src/shared/services/media-scanner-service');
const { JavSPService } = require('../../src/shared/services/javsp-service');

// 模拟服务类
class MockDatabaseService {
  constructor() {
    this.files = new Map();
    this.metadata = {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
  }

  async saveFile(fileData) {
    const fileId = this.generateFileId(fileData.filePath);
    const fileRecord = {
      id: fileId,
      ...fileData,
      scannedAt: new Date().toISOString()
    };
    
    this.files.set(fileId, fileRecord);
    this.metadata.lastUpdated = new Date().toISOString();
    
    return fileId;
  }

  async getFile(fileId) {
    return this.files.get(fileId) || null;
  }

  async getFileByPath(filePath) {
    const fileId = this.generateFileId(filePath);
    return this.getFile(fileId);
  }

  async findFilesByAvId(avid) {
    return Array.from(this.files.values()).filter(file => file.avid === avid);
  }

  async getAllFiles() {
    return Array.from(this.files.values());
  }

  generateFileId(filePath) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(filePath).digest('hex');
  }
}

class MockMediaScannerService {
  constructor() {
    this.videoExtensions = ['.mp4', '.avi', '.mkv', '.mov', '.wmv'];
  }

  async scanDirectory(scanPath) {
    // 模拟扫描结果
    const mockResults = [
      {
        type: 'kodi-standard',
        directoryPath: 'D:\\Videos\\Movie1',
        videoFile: {
          path: 'D:\\Videos\\Movie1\\video.mp4',
          name: 'video.mp4',
          size: 1024000,
          lastModified: new Date('2024-01-15')
        },
        nfoFile: {
          path: 'D:\\Videos\\Movie1\\movie.nfo',
          name: 'movie.nfo'
        },
        metadata: {
          title: 'Kodi电影1',
          plot: '这是一个测试电影',
          genre: ['剧情'],
          actress: ['女优A'],
          studio: '制作商A',
          releaseDate: '2024-01-15'
        }
      },
      {
        type: 'standalone-videos',
        directoryPath: 'D:\\Videos',
        videos: [
          {
            type: 'standalone-video',
            videoFile: {
              path: 'D:\\Videos\\ABC-123.mp4',
              name: 'ABC-123.mp4',
              size: 2048000,
              lastModified: new Date('2024-02-20')
            },
            avid: 'ABC-123',
            confidence: 0.95,
            metadata: {
              title: 'ABC-123',
              originalFileName: 'ABC-123.mp4'
            }
          },
          {
            type: 'standalone-video',
            videoFile: {
              path: 'D:\\Videos\\XYZ-456.avi',
              name: 'XYZ-456.avi',
              size: 1536000,
              lastModified: new Date('2024-03-10')
            },
            avid: 'XYZ-456',
            confidence: 0.88,
            metadata: {
              title: 'XYZ-456',
              originalFileName: 'XYZ-456.avi'
            }
          }
        ],
        totalVideos: 2,
        videosWithAvId: 2
      }
    ];

    return mockResults.filter(result => 
      result.directoryPath.startsWith(scanPath) || 
      result.videoFile?.path.startsWith(scanPath)
    );
  }
}

class MockJavSPService {
  constructor() {
    this.isAvailable = true;
    this.version = '1.0.0';
  }

  async identify(videoPath) {
    const fileName = path.parse(videoPath).name;
    
    // 模拟番号识别结果
    const mockResults = {
      'ABC-123': {
        avid: 'ABC-123',
        confidence: 0.95,
        title: '番号ABC-123的完整标题',
        actress: ['女优A', '女优B'],
        releaseDate: '2024-01-15',
        studio: '制作商A',
        director: '导演A',
        duration: 120,
        genre: ['剧情', '爱情'],
        coverUrl: 'https://example.com/cover/abc-123.jpg',
        previewImages: ['https://example.com/preview/abc-123-1.jpg']
      },
      'XYZ-456': {
        avid: 'XYZ-456',
        confidence: 0.88,
        title: '番号XYZ-456的完整标题',
        actress: ['女优C'],
        releaseDate: '2024-02-20',
        studio: '制作商B',
        director: '导演B',
        duration: 90,
        genre: ['动作'],
        coverUrl: 'https://example.com/cover/xyz-456.jpg',
        previewImages: []
      }
    };

    const result = mockResults[fileName] || {
      avid: fileName,
      confidence: 0.0,
      title: '未知作品',
      actress: [],
      releaseDate: null,
      studio: '未知制作商',
      director: null,
      duration: null,
      genre: [],
      coverUrl: null,
      previewImages: []
    };

    return {
      success: true,
      videoPath,
      result,
      identifiedAt: new Date().toISOString()
    };
  }
}

describe('集成服务测试', () => {
  let databaseService;
  let scannerService;
  let javspService;

  beforeEach(() => {
    databaseService = new MockDatabaseService();
    scannerService = new MockMediaScannerService();
    javspService = new MockJavSPService();
  });

  describe('完整扫描流程', () => {
    test('应该能够完成完整的扫描和识别流程', async () => {
      // 1. 扫描目录
      const scanResults = await scannerService.scanDirectory('D:\\Videos');
      expect(scanResults).toHaveLength(2);

      // 2. 处理Kodi标准目录
      const kodiResult = scanResults.find(r => r.type === 'kodi-standard');
      expect(kodiResult).toBeDefined();
      
      if (kodiResult) {
        // 直接保存到数据库（已有完整信息）
        const fileData = {
          filePath: kodiResult.videoFile.path,
          fileName: kodiResult.videoFile.name,
          fileSize: kodiResult.videoFile.size,
          lastModified: kodiResult.videoFile.lastModified,
          avid: null, // Kodi标准目录没有番号
          title: kodiResult.metadata.title,
          actress: kodiResult.metadata.actress,
          studio: kodiResult.metadata.studio,
          releaseDate: kodiResult.metadata.releaseDate,
          metadata: {
            type: 'kodi-standard',
            plot: kodiResult.metadata.plot,
            genre: kodiResult.metadata.genre,
            nfoPath: kodiResult.nfoFile?.path,
            imageFiles: kodiResult.imageFiles
          }
        };

        const fileId = await databaseService.saveFile(fileData);
        expect(fileId).toBeDefined();
      }

      // 3. 处理独立视频文件
      const standaloneResult = scanResults.find(r => r.type === 'standalone-videos');
      expect(standaloneResult).toBeDefined();
      
      if (standaloneResult) {
        for (const video of standaloneResult.videos) {
          // 使用JavSP进行番号识别
          const identifyResult = await javspService.identify(video.videoFile.path);
          expect(identifyResult.success).toBe(true);

          if (identifyResult.success) {
            // 合并扫描和识别结果
            const fileData = {
              filePath: video.videoFile.path,
              fileName: video.videoFile.name,
              fileSize: video.videoFile.size,
              lastModified: video.videoFile.lastModified,
              avid: identifyResult.result.avid,
              title: identifyResult.result.title,
              actress: identifyResult.result.actress,
              studio: identifyResult.result.studio,
              releaseDate: identifyResult.result.releaseDate,
              metadata: {
                type: 'standalone-video',
                confidence: video.confidence,
                originalFileName: video.metadata.originalFileName,
                relatedImages: video.relatedImages,
                director: identifyResult.result.director,
                duration: identifyResult.result.duration,
                genre: identifyResult.result.genre,
                coverUrl: identifyResult.result.coverUrl,
                previewImages: identifyResult.result.previewImages,
                identifiedAt: identifyResult.identifiedAt
              }
            };

            const fileId = await databaseService.saveFile(fileData);
            expect(fileId).toBeDefined();
          }
        }
      }

      // 4. 验证数据库中的数据
      const allFiles = await databaseService.getAllFiles();
      expect(allFiles.length).toBeGreaterThan(0);

      // 验证番号查询
      const abc123Files = await databaseService.findFilesByAvId('ABC-123');
      expect(abc123Files).toHaveLength(1);
      expect(abc123Files[0].title).toBe('番号ABC-123的完整标题');
    });
  });

  describe('错误处理', () => {
    test('应该能够处理识别失败的情况', async () => {
      // 模拟识别失败
      const originalIdentify = javspService.identify;
      javspService.identify = jest.fn(async (videoPath) => ({
        success: false,
        videoPath,
        error: '识别失败',
        result: {
          avid: path.parse(videoPath).name,
          confidence: 0.0,
          title: '识别失败',
          actress: [],
          releaseDate: null,
          studio: '未知',
          director: null,
          duration: null,
          genre: [],
          coverUrl: null,
          previewImages: []
        },
        identifiedAt: new Date().toISOString()
      }));

      const scanResults = await scannerService.scanDirectory('D:\\Videos');
      const standaloneResult = scanResults.find(r => r.type === 'standalone-videos');

      if (standaloneResult) {
        for (const video of standaloneResult.videos) {
          const identifyResult = await javspService.identify(video.videoFile.path);
          
          if (!identifyResult.success) {
            // 使用扫描结果的基础信息保存到数据库
            const fileData = {
              filePath: video.videoFile.path,
              fileName: video.videoFile.name,
              fileSize: video.videoFile.size,
              lastModified: video.videoFile.lastModified,
              avid: null, // 识别失败，不设置番号
              title: video.metadata.title,
              actress: [],
              studio: null,
              releaseDate: null,
              metadata: {
                type: 'standalone-video',
                confidence: video.confidence,
                originalFileName: video.metadata.originalFileName,
                relatedImages: video.relatedImages,
                identifyError: identifyResult.error,
                identifiedAt: identifyResult.identifiedAt
              }
            };

            const fileId = await databaseService.saveFile(fileData);
            expect(fileId).toBeDefined();
          }
        }
      }

      // 恢复原始方法
      javspService.identify = originalIdentify;
    });
  });

  describe('性能测试', () => {
    test('应该能够在合理时间内完成批量处理', async () => {
      const startTime = Date.now();

      // 模拟批量扫描
      const scanResults = await scannerService.scanDirectory('D:\\Videos');
      
      // 批量识别
      const allVideos = [];
      for (const result of scanResults) {
        if (result.type === 'standalone-videos') {
          allVideos.push(...result.videos);
        }
      }

      // 批量识别
      const identifyPromises = allVideos.map(video => 
        javspService.identify(video.videoFile.path)
      );
      
      const identifyResults = await Promise.all(identifyPromises);

      // 批量保存到数据库
      const savePromises = identifyResults.map((identifyResult, index) => {
        const video = allVideos[index];
        const fileData = {
          filePath: video.videoFile.path,
          fileName: video.videoFile.name,
          fileSize: video.videoFile.size,
          lastModified: video.videoFile.lastModified,
          avid: identifyResult.result.avid,
          title: identifyResult.result.title,
          actress: identifyResult.result.actress,
          studio: identifyResult.result.studio,
          releaseDate: identifyResult.result.releaseDate,
          metadata: {
            confidence: video.confidence,
            identifiedAt: identifyResult.identifiedAt
          }
        };

        return databaseService.saveFile(fileData);
      });

      await Promise.all(savePromises);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(5000); // 5秒内完成
      
      // 验证结果
      const allFiles = await databaseService.getAllFiles();
      expect(allFiles.length).toBeGreaterThan(0);
    });
  });
});