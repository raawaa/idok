const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

/**
 * JavSP番号识别服务
 * 提供番号识别、验证和批量处理功能
 */
class JavSPService {
  constructor() {
    this.javspPath = null;
    this.isAvailable = false;
    this.version = null;
    
    // 番号识别模式
    this.avIdPatterns = [
      /^[A-Z]{2,5}-\d{2,5}$/,           // ABC-123, XYZ-1234
      /^FC2-\d{6,7}$/,                 // FC2-123456
      /^FC2-PPV-\d{6,7}$/,             // FC2-PPV-123456
      /^heydouga-\d{4}-\d{3}$/         // heydouga-4017-123
    ];
  }

  /**
   * 初始化JavSP服务
   * @returns {Promise<boolean>} 是否初始化成功
   */
  async initialize() {
    try {
      // 检查JavSP是否可用
      await this.checkJavSPAvailability();
      
      if (this.isAvailable) {
        console.log(`JavSP服务初始化成功，版本: ${this.version}`);
      } else {
        console.warn('JavSP服务不可用，将使用模拟识别模式');
      }
      
      return this.isAvailable;
    } catch (error) {
      console.error('JavSP服务初始化失败:', error);
      this.isAvailable = false;
      return false;
    }
  }

  /**
   * 检查JavSP可用性
   * @returns {Promise<void>}
   */
  async checkJavSPAvailability() {
    try {
      // 检查JavSP是否在PATH中
      await this.executeJavSP(['--version']);
      this.isAvailable = true;
    } catch (error) {
      console.warn('JavSP未安装或不可用:', error.message);
      this.isAvailable = false;
      this.version = '模拟模式';
    }
  }

  /**
   * 识别视频文件的番号
   * @param {string} videoPath - 视频文件路径
   * @param {Object} options - 识别选项
   * @returns {Promise<Object>} 识别结果
   */
  async identify(videoPath, options = {}) {
    try {
      // 验证文件是否存在
      await fs.access(videoPath);
      
      if (this.isAvailable) {
        return await this.identifyWithJavSP(videoPath, options);
      } else {
        return await this.identifyWithMock(videoPath, options);
      }
    } catch (error) {
      console.error(`番号识别失败: ${videoPath}`, error);
      return this.createErrorResult(videoPath, error.message);
    }
  }

  /**
   * 使用JavSP进行番号识别
   * @param {string} videoPath - 视频文件路径
   * @param {Object} options - 识别选项
   * @returns {Promise<Object>} 识别结果
   */
  async identifyWithJavSP(videoPath, options = {}) {
    return new Promise((resolve, reject) => {
      const args = [
        videoPath,
        '--json',  // 输出JSON格式
        '--no-download',  // 不下载封面和元数据
        '--no-review',    // 不显示预览
        '--timeout', (options.timeout || 30).toString()
      ];

      const javspProcess = spawn('javsp', args);
      let stdout = '';
      let stderr = '';

      javspProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      javspProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      javspProcess.on('close', (code) => {
        try {
          if (code === 0) {
            const result = JSON.parse(stdout);
            resolve(this.formatJavSPResult(videoPath, result));
          } else {
            reject(new Error(`JavSP执行失败: ${stderr}`));
          }
        } catch (error) {
          reject(new Error(`解析JavSP结果失败: ${error.message}`));
        }
      });

      javspProcess.on('error', (error) => {
        reject(new Error(`JavSP进程错误: ${error.message}`));
      });

      // 设置超时
      setTimeout(() => {
        javspProcess.kill();
        reject(new Error('JavSP执行超时'));
      }, (options.timeout || 30) * 1000);
    });
  }

  /**
   * 使用模拟模式进行番号识别
   * @param {string} videoPath - 视频文件路径
   * @param {Object} options - 识别选项
   * @returns {Promise<Object>} 识别结果
   */
  async identifyWithMock(videoPath, options = {}) {
    const fileName = path.parse(videoPath).name;
    
    // 模拟番号识别结果
    const mockResults = {
      'ABC-123': {
        avid: 'ABC-123',
        confidence: 0.95,
        title: '番号ABC-123的标题',
        actress: ['女优A', '女优B'],
        releaseDate: '2024-01-15',
        studio: '制作商A',
        director: '导演A',
        duration: 120,
        genre: ['类型1', '类型2'],
        coverUrl: 'https://example.com/cover/abc-123.jpg',
        previewImages: [
          'https://example.com/preview/abc-123-1.jpg',
          'https://example.com/preview/abc-123-2.jpg'
        ]
      },
      'XYZ-456': {
        avid: 'XYZ-456',
        confidence: 0.88,
        title: '番号XYZ-456的标题',
        actress: ['女优C'],
        releaseDate: '2024-02-20',
        studio: '制作商B',
        director: '导演B',
        duration: 90,
        genre: ['类型3'],
        coverUrl: 'https://example.com/cover/xyz-456.jpg',
        previewImages: [
          'https://example.com/preview/xyz-456-1.jpg'
        ]
      },
      'FC2-PPV-123456': {
        avid: 'FC2-PPV-123456',
        confidence: 0.92,
        title: 'FC2作品标题',
        actress: ['素人女优'],
        releaseDate: '2024-03-10',
        studio: 'FC2',
        director: '素人',
        duration: 60,
        genre: ['素人', '自拍'],
        coverUrl: 'https://example.com/cover/fc2-ppv-123456.jpg',
        previewImages: []
      },
      'heydouga-4017-123': {
        avid: 'heydouga-4017-123',
        confidence: 0.85,
        title: 'Hey動画作品标题',
        actress: ['女优D'],
        releaseDate: '2024-04-05',
        studio: 'Hey動画',
        director: '导演D',
        duration: 150,
        genre: ['类型4', '类型5'],
        coverUrl: 'https://example.com/cover/heydouga-4017-123.jpg',
        previewImages: [
          'https://example.com/preview/heydouga-4017-123-1.jpg',
          'https://example.com/preview/heydouga-4017-123-2.jpg',
          'https://example.com/preview/heydouga-4017-123-3.jpg'
        ]
      }
    };

    // 模拟网络延迟
    await this.simulateNetworkDelay(100 + Math.random() * 200);

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

  /**
   * 格式化JavSP结果
   * @param {string} videoPath - 视频文件路径
   * @param {Object} javspResult - JavSP原始结果
   * @returns {Object} 格式化后的结果
   */
  formatJavSPResult(videoPath, javspResult) {
    return {
      success: true,
      videoPath,
      result: {
        avid: javspResult.avid || javspResult.id,
        confidence: javspResult.confidence || 1.0,
        title: javspResult.title || '',
        actress: javspResult.actress || javspResult.actresses || [],
        releaseDate: javspResult.release_date || javspResult.releaseDate,
        studio: javspResult.studio || javspResult.maker || '',
        director: javspResult.director || '',
        duration: javspResult.duration || null,
        genre: javspResult.genre || javspResult.genres || [],
        coverUrl: javspResult.cover_url || javspResult.coverUrl,
        previewImages: javspResult.preview_images || javspResult.previewImages || []
      },
      identifiedAt: new Date().toISOString()
    };
  }

  /**
   * 创建错误结果
   * @param {string} videoPath - 视频文件路径
   * @param {string} errorMessage - 错误信息
   * @returns {Object} 错误结果
   */
  createErrorResult(videoPath, errorMessage) {
    return {
      success: false,
      videoPath,
      error: errorMessage,
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
    };
  }

  /**
   * 批量识别视频文件
   * @param {Array<string>} videoPaths - 视频文件路径数组
   * @param {Object} options - 识别选项
   * @returns {Promise<Array>} 批量识别结果
   */
  async batchIdentify(videoPaths, options = {}) {
    const results = [];
    const batchSize = options.batchSize || 5; // 默认批量大小
    
    // 分批处理，避免同时处理过多文件
    for (let i = 0; i < videoPaths.length; i += batchSize) {
      const batch = videoPaths.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(videoPath => this.identify(videoPath, options))
      );
      
      results.push(...batchResults);
      
      // 添加延迟，避免过于频繁的请求
      if (i + batchSize < videoPaths.length) {
        await this.simulateNetworkDelay(1000);
      }
    }
    
    return results;
  }

  /**
   * 验证番号格式
   * @param {string} avid - 番号
   * @returns {Promise<boolean>} 是否为有效番号
   */
  async validateAvId(avid) {
    if (!avid || typeof avid !== 'string') {
      return false;
    }
    
    // 使用预定义的模式进行验证
    return this.avIdPatterns.some(pattern => pattern.test(avid));
  }

  /**
   * 执行JavSP命令
   * @param {Array<string>} args - 命令参数
   * @returns {Promise<string>} 命令输出
   */
  async executeJavSP(args) {
    return new Promise((resolve, reject) => {
      const javspProcess = spawn('javsp', args);
      let stdout = '';
      let stderr = '';

      javspProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      javspProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      javspProcess.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`JavSP执行失败 (代码: ${code}): ${stderr}`));
        }
      });

      javspProcess.on('error', (error) => {
        reject(new Error(`JavSP进程错误: ${error.message}`));
      });
    });
  }

  /**
   * 模拟网络延迟
   * @param {number} ms - 延迟毫秒数
   * @returns {Promise<void>}
   */
  async simulateNetworkDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取服务状态
   * @returns {Object} 服务状态
   */
  getStatus() {
    return {
      available: this.isAvailable,
      version: this.version,
      mode: this.isAvailable ? '真实模式' : '模拟模式',
      patterns: this.avIdPatterns.map(pattern => pattern.source)
    };
  }
}

module.exports = JavSPService;