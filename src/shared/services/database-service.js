const fs = require('fs').promises;
const path = require('path');

/**
 * JSON文件数据库服务
 * 提供媒体文件信息的持久化存储和管理
 */
class DatabaseService {
  constructor() {
    this.dataPath = null;
    this.data = {
      files: [],
      scanCache: {}, // 新增扫描缓存
      metadata: {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      }
    };
  }

  /**
   * 初始化数据库服务
   * @param {string} [dataPath] - 可选的数据文件路径
   * @returns {Promise<boolean>} 初始化是否成功
   */
  async initialize(dataPath = null) {
    try {
      // 如果提供了数据路径，直接使用
      if (dataPath) {
        this.dataPath = dataPath;
        console.log(`📁 使用指定数据库路径: ${this.dataPath}`);
      } else {
        // 尝试获取Electron的app数据目录
        try {
          const { app } = require('electron');
          const userDataPath = app.getPath('userData');
          this.dataPath = path.join(userDataPath, 'media-database.json');
          console.log(`📁 使用Electron用户数据目录: ${this.dataPath}`);
        } catch (electronError) {
          // 如果Electron不可用，使用当前工作目录
          console.log('Electron不可用，使用当前工作目录作为数据目录');
          this.dataPath = path.join(process.cwd(), 'media-database.json');
          console.log(`📁 使用当前工作目录: ${this.dataPath}`);
        }
      }
      
      console.log(`🗄️  数据库服务初始化，数据文件路径: ${this.dataPath}`);
      
      // 尝试加载现有数据
      await this.loadData();
      console.log(`✅ 数据库初始化成功，当前记录数: ${this.data.files.length}`);
      return true;
    } catch (error) {
      console.error('数据库初始化失败:', error);
      return false;
    }
  }

  /**
   * 从文件加载数据
   * @returns {Promise<void>}
   */
  async loadData() {
    try {
      console.log(`📖 正在加载数据库文件: ${this.dataPath}`);
      const fileContent = await fs.readFile(this.dataPath, 'utf8');
      this.data = JSON.parse(fileContent);
      
      console.log(`✅ 数据库加载成功，记录数: ${this.data.files.length}, 元数据版本: ${this.data.metadata.version}`);
      
      // 验证数据格式
      if (!this.data.files || !this.data.metadata) {
        throw new Error('无效的数据库格式');
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        // 文件不存在，创建新数据库
        console.log(`🆕 数据库文件不存在，创建新数据库: ${this.dataPath}`);
        await this.saveData();
        console.log(`✅ 新数据库创建完成`);
      } else {
        console.error(`❌ 数据库加载失败: ${error.message}`);
        throw error;
      }
    }
  }

  /**
   * 保存数据到文件
   * @returns {Promise<void>}
   */
  async saveData() {
    try {
      // 确保目录存在
      const dir = path.dirname(this.dataPath);
      await fs.mkdir(dir, { recursive: true });

      // 更新元数据
      this.data.metadata.lastUpdated = new Date().toISOString();

      // 保存数据
      const jsonData = JSON.stringify(this.data, null, 2);
      await fs.writeFile(this.dataPath, jsonData, 'utf8');
    } catch (error) {
      console.error('保存数据库失败:', error);
      throw error;
    }
  }

  /**
   * 添加或更新文件记录
   * @param {Object} fileData - 文件数据
   * @returns {Promise<string>} 文件ID
   */
  async saveFile(fileData) {
    try {
      // 生成文件ID
      const fileId = this.generateFileId(fileData.filePath);
      
      // 检查是否已存在
      const existingIndex = this.data.files.findIndex(f => f.id === fileId);
      
      const fileRecord = {
        id: fileId,
        filePath: fileData.filePath,
        fileName: fileData.fileName || path.basename(fileData.filePath),
        fileSize: fileData.fileSize || 0,
        lastModified: fileData.lastModified || new Date().toISOString(),
        avid: fileData.avid || null,
        title: fileData.title || null,
        actors: fileData.actors || [],
        studio: fileData.studio || null,
        releaseDateFull: fileData.releaseDateFull || null,
        hasMetadata: fileData.hasMetadata !== undefined ? fileData.hasMetadata : false,
        isStandaloneVideo: fileData.isStandaloneVideo || false,
        metadata: fileData.metadata || {},
        scannedAt: new Date().toISOString(),
        ...fileData
      };
      
      if (existingIndex >= 0) {
        // 更新现有记录
        this.data.files[existingIndex] = fileRecord;
      } else {
        // 添加新记录
        this.data.files.push(fileRecord);
      }
      
      await this.saveData();
      return fileId;
    } catch (error) {
      console.error('保存文件记录失败:', error);
      throw error;
    }
  }

  /**
   * 根据文件ID获取文件记录
   * @param {string} fileId - 文件ID
   * @returns {Promise<Object|null>} 文件记录或null
   */
  async getFile(fileId) {
    try {
      const file = this.data.files.find(f => f.id === fileId);
      return file || null;
    } catch (error) {
      console.error('获取文件记录失败:', error);
      return null;
    }
  }

  /**
   * 根据文件路径获取文件记录
   * @param {string} filePath - 文件路径
   * @returns {Promise<Object|null>} 文件记录或null
   */
  async getFileByPath(filePath) {
    try {
      const fileId = this.generateFileId(filePath);
      return await this.getFile(fileId);
    } catch (error) {
      console.error('根据路径获取文件记录失败:', error);
      return null;
    }
  }

  /**
   * 根据番号查找文件
   * @param {string} avid - 番号
   * @returns {Promise<Array>} 匹配的文件记录数组
   */
  async findFilesByAvId(avid) {
    try {
      return this.data.files.filter(file => file.avid === avid);
    } catch (error) {
      console.error('根据番号查找文件失败:', error);
      return [];
    }
  }

  /**
   * 获取所有文件记录
   * @param {Object} options - 查询选项
   * @returns {Promise<Array>} 文件记录数组
   */
  async getAllFiles(options = {}) {
    try {
      let files = [...this.data.files];
      
      // 应用排序
      if (options.sortBy) {
        files.sort((a, b) => {
          const aVal = a[options.sortBy];
          const bVal = b[options.sortBy];
          
          if (options.order === 'desc') {
            return bVal > aVal ? 1 : -1;
          }
          return aVal > bVal ? 1 : -1;
        });
      }
      
      // 应用分页
      if (options.limit) {
        const offset = options.offset || 0;
        files = files.slice(offset, offset + options.limit);
      }
      
      return files;
    } catch (error) {
      console.error('获取所有文件记录失败:', error);
      return [];
    }
  }

  /**
   * 删除文件记录
   * @param {string} fileId - 文件ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  async deleteFile(fileId) {
    try {
      const index = this.data.files.findIndex(f => f.id === fileId);
      if (index >= 0) {
        this.data.files.splice(index, 1);
        await this.saveData();
        return true;
      }
      return false;
    } catch (error) {
      console.error('删除文件记录失败:', error);
      return false;
    }
  }

  /**
   * 根据文件路径删除文件记录
   * @param {string} filePath - 文件路径
   * @returns {Promise<boolean>} 是否删除成功
   */
  async deleteFileByPath(filePath) {
    try {
      const fileId = this.generateFileId(filePath);
      return await this.deleteFile(fileId);
    } catch (error) {
      console.error('根据路径删除文件记录失败:', error);
      return false;
    }
  }

  /**
   * 清空数据库
   * @returns {Promise<void>}
   */
  async clearDatabase() {
    try {
      this.data.files = [];
      this.data.scanCache = {}; // 同时清空扫描缓存
      this.data.metadata.lastUpdated = new Date().toISOString();
      await this.saveData();
    } catch (error) {
      console.error('清空数据库失败:', error);
      throw error;
    }
  }

  /**
   * 获取扫描缓存
   * @param {string} scanPath - 扫描路径
   * @returns {Promise<Object|null>} 扫描缓存或null
   */
  async getScanCache(scanPath) {
    try {
      return this.data.scanCache[scanPath] || null;
    } catch (error) {
      console.error('获取扫描缓存失败:', error);
      return null;
    }
  }

  /**
   * 保存扫描缓存
   * @param {string} scanPath - 扫描路径
   * @param {Object} cacheData - 缓存数据
   * @returns {Promise<void>}
   */
  async saveScanCache(scanPath, cacheData) {
    try {
      this.data.scanCache[scanPath] = {
        ...cacheData,
        cachedAt: new Date().toISOString()
      };
      await this.saveData();
    } catch (error) {
      console.error('保存扫描缓存失败:', error);
      throw error;
    }
  }

  /**
   * 检查扫描缓存是否有效
   * @param {string} scanPath - 扫描路径
   * @param {number} cacheTimeout - 缓存超时时间（毫秒）
   * @returns {Promise<boolean>} 缓存是否有效
   */
  async isScanCacheValid(scanPath, cacheTimeout = 24 * 60 * 60 * 1000) {
    try {
      console.log(`🔍 检查扫描缓存有效性: ${scanPath}`);
      
      const cache = await this.getScanCache(scanPath);
      if (!cache || !cache.cachedAt) {
        console.log(`❌ 缓存不存在: ${scanPath}`);
        return false;
      }

      const cachedTime = new Date(cache.cachedAt).getTime();
      const currentTime = new Date().getTime();
      const timeDiff = currentTime - cachedTime;
      
      console.log(`📅 缓存时间: ${new Date(cachedTime).toLocaleString()}`);
      console.log(`⏰ 当前时间: ${new Date(currentTime).toLocaleString()}`);
      console.log(`⏱️  缓存年龄: ${Math.round(timeDiff / 1000 / 60)} 分钟`);
      
      // 检查时间有效性
      if (timeDiff >= cacheTimeout) {
        console.log(`❌ 缓存超时: ${Math.round(timeDiff / 1000 / 60)} 分钟 > ${Math.round(cacheTimeout / 1000 / 60)} 分钟`);
        return false;
      }

      // 检查文件指纹是否变化（如果有指纹信息）
      if (cache.fileFingerprint) {
        console.log(`🔍 检查文件指纹变化...`);
        const currentFingerprint = await this.generateDirectoryFingerprint(scanPath);
        if (currentFingerprint !== cache.fileFingerprint) {
          console.log(`⚠️  检测到文件变化: ${scanPath}`);
          console.log(`📊 旧指纹: ${cache.fileFingerprint}`);
          console.log(`📊 新指纹: ${currentFingerprint}`);
          return false;
        }
        console.log(`✅ 文件指纹匹配，目录未变化`);
      }
      
      console.log(`✅ 缓存有效: ${scanPath}`);
      return true;
    } catch (error) {
      console.error('检查扫描缓存有效性失败:', error);
      return false;
    }
  }

  /**
   * 清除扫描缓存
   * @param {string} scanPath - 扫描路径（可选，不传则清除所有缓存）
   * @returns {Promise<void>}
   */
  async clearScanCache(scanPath = null) {
    try {
      if (scanPath) {
        delete this.data.scanCache[scanPath];
      } else {
        this.data.scanCache = {};
      }
      await this.saveData();
    } catch (error) {
      console.error('清除扫描缓存失败:', error);
      throw error;
    }
  }

  /**
   * 生成目录文件指纹
   * @param {string} directoryPath - 目录路径
   * @returns {Promise<string>} 文件指纹哈希值
   */
  async generateDirectoryFingerprint(directoryPath) {
    try {
      const fs = require('fs');
      const path = require('path');
      const crypto = require('crypto');
      
      const hash = crypto.createHash('md5');
      const stats = [];
      
      // 递归遍历目录获取所有文件信息
      async function walkDir(dir) {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            await walkDir(fullPath);
          } else if (entry.isFile()) {
            try {
              const stat = await fs.promises.stat(fullPath);
              stats.push({
                path: fullPath,
                size: stat.size,
                mtime: stat.mtime.getTime()
              });
            } catch (error) {
              // 忽略无法访问的文件
              continue;
            }
          }
        }
      }
      
      await walkDir(directoryPath);
      
      // 按路径排序确保一致性
      stats.sort((a, b) => a.path.localeCompare(b.path));
      
      // 生成指纹
      for (const stat of stats) {
        hash.update(`${stat.path}:${stat.size}:${stat.mtime}\n`);
      }
      
      return hash.digest('hex');
    } catch (error) {
      console.error('生成目录指纹失败:', error);
      return '';
    }
  }

  /**
   * 检查目录是否发生变化
   * @param {string} directoryPath - 目录路径
   * @returns {Promise<boolean>} 是否发生变化
   */
  async hasDirectoryChanged(directoryPath) {
    try {
      const cache = await this.getScanCache(directoryPath);
      if (!cache || !cache.fileFingerprint) {
        return true; // 没有缓存或指纹，认为发生变化
      }
      
      const currentFingerprint = await this.generateDirectoryFingerprint(directoryPath);
      return currentFingerprint !== cache.fileFingerprint;
    } catch (error) {
      console.error('检查目录变化失败:', error);
      return true; // 出错时默认认为发生变化
    }
  }

  /**
   * 获取数据库统计信息
   * @returns {Promise<Object>} 统计信息
   */
  async getStatistics() {
    try {
      const totalFiles = this.data.files.length;
      const filesWithAvId = this.data.files.filter(f => f.avid).length;
      const totalSize = this.data.files.reduce((sum, file) => sum + (file.fileSize || 0), 0);
      
      return {
        totalFiles,
        filesWithAvId,
        filesWithoutAvId: totalFiles - filesWithAvId,
        totalSize,
        lastUpdated: this.data.metadata.lastUpdated,
        createdAt: this.data.metadata.createdAt
      };
    } catch (error) {
      console.error('获取统计信息失败:', error);
      return {
        totalFiles: 0,
        filesWithAvId: 0,
        filesWithoutAvId: 0,
        totalSize: 0,
        lastUpdated: null,
        createdAt: null
      };
    }
  }

  /**
   * 搜索文件
   * @param {string} query - 搜索查询
   * @param {Object} options - 搜索选项
   * @returns {Promise<Array>} 搜索结果
   */
  async searchFiles(query, options = {}) {
    try {
      const searchTerm = query.toLowerCase();
      const results = this.data.files.filter(file => {
        // 搜索文件名
        if (file.fileName && file.fileName.toLowerCase().includes(searchTerm)) {
          return true;
        }
        
        // 搜索番号
        if (file.avid && file.avid.toLowerCase().includes(searchTerm)) {
          return true;
        }
        
        // 搜索标题
        if (file.title && file.title.toLowerCase().includes(searchTerm)) {
          return true;
        }
        
        // 搜索女优
        if (file.actors && file.actors.some(actor =>
          actor.toLowerCase().includes(searchTerm)
        )) {
          return true;
        }
        
        // 搜索制作商
        if (file.studio && file.studio.toLowerCase().includes(searchTerm)) {
          return true;
        }
        
        return false;
      });
      
      // 应用排序和分页
      if (options.sortBy) {
        results.sort((a, b) => {
          const aVal = a[options.sortBy];
          const bVal = b[options.sortBy];
          
          if (options.order === 'desc') {
            return bVal > aVal ? 1 : -1;
          }
          return aVal > bVal ? 1 : -1;
        });
      }
      
      if (options.limit) {
        const offset = options.offset || 0;
        return results.slice(offset, offset + options.limit);
      }
      
      return results;
    } catch (error) {
      console.error('搜索文件失败:', error);
      return [];
    }
  }

  /**
   * 生成文件ID
   * @param {string} filePath - 文件路径
   * @returns {string} 文件ID
   */
  generateFileId(filePath) {
    // 使用文件路径的哈希值作为ID
    const crypto = require('crypto');

    // 添加空值检查，防止undefined导致错误
    if (!filePath || typeof filePath !== 'string') {
      console.error('generateFileId: 文件路径无效', filePath);
      // 使用时间戳和随机数作为备用ID
      return crypto.createHash('md5').update(Date.now() + Math.random().toString()).digest('hex');
    }

    return crypto.createHash('md5').update(filePath).digest('hex');
  }

  /**
   * 备份数据库
   * @param {string} backupPath - 备份文件路径
   * @returns {Promise<boolean>} 是否备份成功
   */
  async backup(backupPath) {
    try {
      const backupData = JSON.stringify(this.data, null, 2);
      await fs.writeFile(backupPath, backupData, 'utf8');
      return true;
    } catch (error) {
      console.error('备份数据库失败:', error);
      return false;
    }
  }

  /**
   * 从备份恢复数据库
   * @param {string} backupPath - 备份文件路径
   * @returns {Promise<boolean>} 是否恢复成功
   */
  async restore(backupPath) {
    try {
      const backupContent = await fs.readFile(backupPath, 'utf8');
      const backupData = JSON.parse(backupContent);
      
      // 验证备份数据格式
      if (!backupData.files || !backupData.metadata) {
        throw new Error('无效的备份文件格式');
      }
      
      this.data = backupData;
      await this.saveData();
      return true;
    } catch (error) {
      console.error('恢复数据库失败:', error);
      return false;
    }
  }
}

module.exports = DatabaseService;