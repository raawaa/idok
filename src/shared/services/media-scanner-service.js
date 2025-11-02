const fs = require('fs').promises;
const path = require('path');

/**
 * 媒体扫描服务
 * 支持Kodi标准目录结构和独立视频文件识别
 */
class MediaScannerService {
  constructor(databaseService = null) {
    this.databaseService = databaseService;
    this.videoExtensions = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.m4v', '.mpg', '.mpeg'];
    this.imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp'];
    this.nfoExtensions = ['.nfo'];
    
    // 番号识别模式
    this.avIdPatterns = [
      /^[A-Z]{2,5}-\d{2,5}$/,           // ABC-123, XYZ-1234
      /^FC2-\d{6,7}$/,                 // FC2-123456
      /^FC2-PPV-\d{6,7}$/,             // FC2-PPV-123456
      /^heydouga-\d{4}-\d{3}$/         // heydouga-4017-123
    ];
  }

  /**
   * 手动刷新指定目录的缓存（包含文件变化检测）
   * @param {string} scanPath - 要刷新的目录路径
   * @param {Object} options - 扫描选项
   * @returns {Promise<Object>} 刷新结果
   */
  async refreshDirectoryCache(scanPath, options = {}) {
    try {
      console.log(`🔄 手动刷新缓存: ${scanPath}`);
      
      // 先检查文件变化
      let hasChanged = false;
      if (this.databaseService) {
        const cache = await this.databaseService.getScanCache(scanPath);
        if (cache && cache.fileFingerprint) {
          console.log(`🔍 检测文件变化...`);
          hasChanged = await this.databaseService.hasDirectoryChanged(scanPath);
          if (hasChanged) {
            console.log(`⚠️  检测到文件变化，需要重新扫描`);
          } else {
            console.log(`✅ 文件未发生变化`);
          }
        } else {
          console.log(`ℹ️  无缓存指纹，视为文件变化`);
          hasChanged = true;
        }
      } else {
        console.log(`⚠️  数据库服务不可用，强制重新扫描`);
        hasChanged = true;
      }
      
      // 执行重新扫描
      const startTime = Date.now();
      const results = await this.scanDirectory(scanPath, { ...options, forceRescan: true });
      const scanTime = Date.now() - startTime;
      
      return {
        success: true,
        scanPath,
        results,
        hasChanged,
        scanTime,
        totalFiles: results.length,
        message: hasChanged ? '检测到文件变化，已重新扫描' : '文件未变化，已强制刷新缓存'
      };
    } catch (error) {
      console.error(`刷新缓存失败: ${scanPath}`, error);
      return {
        success: false,
        scanPath,
        error: error.message,
        message: '刷新缓存失败'
      };
    }
  }

  /**
   * 扫描指定目录（支持缓存和文件变化检测）
   * @param {string} scanPath - 要扫描的目录路径
   * @param {Object} options - 扫描选项
   * @returns {Promise<Array>} 扫描结果
   */
  async scanDirectory(scanPath, options = {}) {
    try {
      console.log(`🔍 开始扫描目录: ${scanPath}`);
      console.log(`📊 扫描选项: recursive=${options.recursive !== false}, forceRescan=${options.forceRescan || false}`);
      
      // 检查是否有缓存数据（跳过文件变化检测）
      if (this.databaseService && !options.forceRescan) {
        console.log(`🔍 检查缓存数据...`);
        const cache = await this.databaseService.getScanCache(scanPath);
        if (cache && cache.results) {
          console.log(`✅ 使用缓存数据: ${scanPath} (找到 ${cache.results.length} 个文件)`);
          console.log(`💡 提示：如需检测文件变化，请使用手动刷新功能`);
          return cache.results;
        }
        console.log(`⚠️  缓存不存在，执行实际扫描`);
      } else {
        console.log(`🔄 强制重新扫描或数据库服务不可用`);
      }

      console.log(`🚀 执行实际扫描: ${scanPath}`);
      const startTime = Date.now();
      const results = [];
      const scanOptions = {
        recursive: options.recursive !== false,
        includeImages: options.includeImages || false,
        ...options
      };

      await this.scanDirectoryRecursive(scanPath, results, scanOptions);
      
      const scanTime = Date.now() - startTime;
      console.log(`📈 扫描完成: ${scanPath}, 找到 ${results.length} 个文件, 耗时 ${scanTime}ms`);
      
      // 保存扫描结果到缓存
      if (this.databaseService) {
        console.log(`💾 保存扫描结果到缓存...`);
        // 生成文件指纹
        const fileFingerprint = await this.databaseService.generateDirectoryFingerprint(scanPath);
        
        await this.databaseService.saveScanCache(scanPath, {
          results: results,
          scanOptions: scanOptions,
          totalFiles: results.length,
          fileFingerprint: fileFingerprint
        });
        console.log(`✅ 扫描结果已缓存: ${scanPath}`);
      }

      return results;
    } catch (error) {
      console.error('扫描目录失败:', error);
      throw error;
    }
  }

  /**
   * 递归扫描目录
   * @param {string} dirPath - 目录路径
   * @param {Array} results - 结果数组
   * @param {Object} options - 扫描选项
   * @returns {Promise<void>}
   */
  async scanDirectoryRecursive(dirPath, results, options) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      // 收集当前目录的文件
      const files = [];
      const subdirectories = [];
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          subdirectories.push(fullPath);
        } else if (entry.isFile()) {
          files.push({
            path: fullPath,
            name: entry.name,
            ext: path.extname(entry.name).toLowerCase()
          });
        }
      }
      
      // 处理当前目录
      const directoryResult = await this.processDirectory(dirPath, files, options);
      if (directoryResult) {
        results.push(directoryResult);
      }
      
      // 递归处理子目录
      if (options.recursive) {
        for (const subdir of subdirectories) {
          await this.scanDirectoryRecursive(subdir, results, options);
        }
      }
    } catch (error) {
      if (error.code === 'EACCES') {
        console.warn(`无法访问目录: ${dirPath}`);
      } else {
        console.error(`扫描目录失败: ${dirPath}`, error);
      }
    }
  }

  /**
   * 处理目录
   * @param {string} dirPath - 目录路径
   * @param {Array} files - 文件列表
   * @param {Object} options - 扫描选项
   * @returns {Promise<Object|null>} 处理结果
   */
  async processDirectory(dirPath, files, options) {
    try {
      // 1. 检查是否为Kodi标准目录
      const kodiResult = await this.processKodiStandardDirectory(dirPath, files, options);
      if (kodiResult) {
        return kodiResult;
      }
      
      // 2. 发现独立视频文件 → 非标准处理
      const standaloneResult = await this.processStandaloneVideos(dirPath, files, options);
      if (standaloneResult) {
        return standaloneResult;
      }
      
      return null;
    } catch (error) {
      console.error(`处理目录失败: ${dirPath}`, error);
      return null;
    }
  }

  /**
   * 处理Kodi标准目录
   * @param {string} dirPath - 目录路径
   * @param {Array} files - 文件列表
   * @param {Object} options - 扫描选项
   * @returns {Promise<Object|null>} Kodi标准目录结果
   */
  async processKodiStandardDirectory(dirPath, files, options) {
    try {
      // 查找视频文件
      const videoFiles = files.filter(file => 
        this.videoExtensions.includes(file.ext)
      );
      
      if (videoFiles.length === 0) {
        return null;
      }
      
      // 查找NFO文件
      const nfoFiles = files.filter(file => 
        this.nfoExtensions.includes(file.ext)
      );
      
      // 查找图片文件
      const imageFiles = files.filter(file => 
        this.imageExtensions.includes(file.ext)
      );
      
      // 如果没有NFO文件，不是Kodi标准目录
      if (nfoFiles.length === 0) {
        return null;
      }
      
      // 获取文件信息
      const videoFile = videoFiles[0]; // 优先处理第一个视频文件
      const fileStats = await fs.stat(videoFile.path);
      
      // 解析NFO文件
      let nfoData = {};
      if (nfoFiles.length > 0) {
        try {
          const nfoContent = await fs.readFile(nfoFiles[0].path, 'utf8');
          nfoData = this.parseNfoFile(nfoContent);
        } catch (error) {
          console.warn(`解析NFO文件失败: ${nfoFiles[0].path}`, error);
        }
      }
      
      return {
        type: 'kodi-standard',
        directoryPath: dirPath,
        videoFile: {
          path: videoFile.path,
          name: videoFile.name,
          size: fileStats.size,
          lastModified: fileStats.mtime
        },
        nfoFile: nfoFiles.length > 0 ? {
          path: nfoFiles[0].path,
          name: nfoFiles[0].name
        } : null,
        imageFiles: imageFiles.map(img => ({
          path: img.path,
          name: img.name
        })),
        metadata: {
          title: nfoData.title || path.basename(dirPath),
          plot: nfoData.plot || '',
          genre: nfoData.genre || [],
          actors: nfoData.actress || nfoData.actors || [],  // 修复：支持actress和actors两种字段
          studio: nfoData.studio || '',
          releaseDateFull: nfoData.releaseDate || nfoData.releaseDateFull || null,  // 修复：支持releaseDate和releaseDateFull两种字段
          ...nfoData
        },
        scannedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error(`处理Kodi标准目录失败: ${dirPath}`, error);
      return null;
    }
  }

  /**
   * 处理独立视频文件
   * @param {string} dirPath - 目录路径
   * @param {Array} files - 文件列表
   * @param {Object} options - 扫描选项
   * @returns {Promise<Object|null>} 独立视频文件结果
   */
  async processStandaloneVideos(dirPath, files, options) {
    try {
      const results = [];
      
      // 查找所有视频文件
      const videoFiles = files.filter(file => 
        this.videoExtensions.includes(file.ext)
      );
      
      if (videoFiles.length === 0) {
        return null;
      }
      
      // 处理每个视频文件
      for (const videoFile of videoFiles) {
        try {
          const fileStats = await fs.stat(videoFile.path);
          const fileNameWithoutExt = path.parse(videoFile.name).name;
          
          // 识别番号
          const avid = this.extractAvId(fileNameWithoutExt);
          
          // 查找相关的图片文件（同名）
          const relatedImages = files.filter(file => {
            const nameWithoutExt = path.parse(file.name).name;
            return this.imageExtensions.includes(file.ext) && 
                   nameWithoutExt === fileNameWithoutExt;
          });
          
          results.push({
            type: 'standalone-video',
            directoryPath: dirPath,
            videoFile: {
              path: videoFile.path,
              name: videoFile.name,
              size: fileStats.size,
              lastModified: fileStats.mtime
            },
            avid: avid || null,
            confidence: avid ? this.calculateConfidence(fileNameWithoutExt) : 0,
            metadata: {
              title: avid || fileNameWithoutExt,
              originalFileName: videoFile.name,
              ...this.extractMetadataFromFilename(fileNameWithoutExt)
            },
            relatedImages: relatedImages.map(img => ({
              path: img.path,
              name: img.name
            })),
            scannedAt: new Date().toISOString()
          });
        } catch (error) {
          console.error(`处理视频文件失败: ${videoFile.path}`, error);
        }
      }
      
      return {
        type: 'standalone-videos',
        directoryPath: dirPath,
        videos: results,
        totalVideos: results.length,
        videosWithAvId: results.filter(v => v.avid).length,
        scannedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error(`处理独立视频文件失败: ${dirPath}`, error);
      return null;
    }
  }

  /**
   * 解析NFO文件
   * @param {string} content - NFO文件内容
   * @returns {Object} 解析后的数据
   */
  parseNfoFile(content) {
    const data = {};
    
    try {
      // 简单的XML解析（可以根据需要增强）
      const titleMatch = content.match(/<title>(.*?)<\/title>/i);
      if (titleMatch) {
        data.title = titleMatch[1].trim();
      }
      
      const plotMatch = content.match(/<plot>(.*?)<\/plot>/i);
      if (plotMatch) {
        data.plot = plotMatch[1].trim();
      }
      
      const studioMatch = content.match(/<studio>(.*?)<\/studio>/i);
      if (studioMatch) {
        data.studio = studioMatch[1].trim();
      }
      
      const premieredMatch = content.match(/<premiered>(.*?)<\/premiered>/i);
      if (premieredMatch) {
        data.releaseDate = premieredMatch[1].trim();
      }
      
      // 解析女优信息
      const actressMatches = content.match(/<actor>.*?<name>(.*?)<\/name>.*?<\/actor>/gis);
      if (actressMatches) {
        data.actress = actressMatches.map(match => {
          const nameMatch = match.match(/<name>(.*?)<\/name>/i);
          return nameMatch ? nameMatch[1].trim() : '';
        }).filter(name => name);
      }
      
      // 解析类型信息
      const genreMatches = content.match(/<genre>(.*?)<\/genre>/gi);
      if (genreMatches) {
        data.genre = genreMatches.map(match => {
          const genreMatch = match.match(/<genre>(.*?)<\/genre>/i);
          return genreMatch ? genreMatch[1].trim() : '';
        }).filter(genre => genre);
      }
    } catch (error) {
      console.warn('解析NFO文件失败:', error);
    }
    
    return data;
  }

  /**
   * 从文件名中提取番号
   * @param {string} fileName - 文件名（不含扩展名）
   * @returns {string|null} 提取的番号
   */
  extractAvId(fileName) {
    for (const pattern of this.avIdPatterns) {
      if (pattern.test(fileName)) {
        return fileName;
      }
    }
    return null;
  }

  /**
   * 计算番号识别的置信度
   * @param {string} fileName - 文件名
   * @returns {number} 置信度（0-1）
   */
  calculateConfidence(fileName) {
    // 简单的置信度计算
    if (this.extractAvId(fileName)) {
      return 0.9; // 高置信度
    }
    return 0.0;
  }

  /**
   * 从文件名中提取元数据
   * @param {string} fileName - 文件名
   * @returns {Object} 提取的元数据
   */
  extractMetadataFromFilename(fileName) {
    const metadata = {};
    
    // 提取年份
    const yearMatch = fileName.match(/(19|20)\d{2}/);
    if (yearMatch) {
      metadata.year = parseInt(yearMatch[0]);
    }
    
    // 提取分辨率
    const resolutionMatch = fileName.match(/(\d{3,4}p|4K|UHD)/i);
    if (resolutionMatch) {
      metadata.resolution = resolutionMatch[0];
    }
    
    // 提取制作商代码（假设是番号的前缀）
    const studioMatch = fileName.match(/^([A-Z]{2,5})-/);
    if (studioMatch) {
      metadata.studioCode = studioMatch[1];
    }
    
    return metadata;
  }

  /**
   * 检查文件是否为视频文件
   * @param {string} filePath - 文件路径
   * @returns {boolean} 是否为视频文件
   */
  isVideoFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return this.videoExtensions.includes(ext);
  }

  /**
   * 获取文件统计信息
   * @param {string} dirPath - 目录路径
   * @returns {Promise<Object>} 统计信息
   */
  async getFileStatistics(dirPath) {
    try {
      const results = await this.scanDirectory(dirPath, { recursive: true });
      
      const stats = {
        totalDirectories: results.length,
        totalVideos: 0,
        videosWithAvId: 0,
        kodiStandardDirectories: 0,
        standaloneVideos: 0,
        totalSize: 0
      };
      
      for (const result of results) {
        if (result.type === 'kodi-standard') {
          stats.kodiStandardDirectories++;
          stats.totalVideos++;
          stats.totalSize += result.videoFile.size;
          
          if (result.metadata && result.metadata.title) {
            stats.videosWithAvId++;
          }
        } else if (result.type === 'standalone-videos') {
          stats.standaloneVideos += result.totalVideos;
          stats.totalVideos += result.totalVideos;
          stats.videosWithAvId += result.videosWithAvId;
          
          for (const video of result.videos) {
            stats.totalSize += video.videoFile.size;
          }
        }
      }
      
      return stats;
    } catch (error) {
      console.error('获取文件统计信息失败:', error);
      throw error;
    }
  }
}

module.exports = MediaScannerService;