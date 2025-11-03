/**
 * 测试数据管理器
 * 参考JavSP的测试数据管理机制，提供多环境配置和数据版本管理
 */

const fs = require('fs').promises;
const path = require('path');
const { URL } = require('url');

class TestDataManager {
  constructor(options = {}) {
    this.baselineDir = options.baselineDir || path.join(__dirname, '../data/baseline');
    this.currentDir = options.currentDir || path.join(__dirname, '../data/current');
    this.reportsDir = options.reportsDir || path.join(__dirname, '../data/reports');

    // 环境配置
    this.environment = options.environment || process.env.NODE_ENV || 'development';
    this.enableAutoUpdate = options.enableAutoUpdate !== false;
    this.strictMode = options.strictMode || false;

    // 支持的爬虫列表
    this.supportedScrapers = ['javbus', 'javdb', 'javlib', 'fanza', 'fc2'];

    // 数据格式映射（JavSP格式 → 我们项目格式）
    this.fieldMapping = {
      'dvdid': 'avid',
      'cid': 'cid',
      'url': 'url',
      'title': 'title',
      'cover': 'cover',
      'big_cover': 'bigCover',
      'plot': 'plot',
      'genre': 'genre',
      'genre_id': 'genreId',
      'genre_norm': 'genreNorm',
      'actress': 'actress',
      'actress_pics': 'actressPics',
      'preview_pics': 'previewPics',
      'preview_video': 'previewVideo',
      'score': 'score',
      'magnet': 'magnet',
      'release_date': 'releaseDate',
      'duration': 'duration',
      'producer': 'producer',
      'studio': 'studio',
      'label': 'label',
      'director': 'director'
    };
  }

  /**
   * 扫描基准数据目录，获取所有测试文件
   */
  async scanBaselineData() {
    try {
      const files = await fs.readdir(this.baselineDir);
      const testData = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const match = file.match(/^([-\w]+)\s*\((\w+)\)\.json$/i);
          if (match) {
            const [, avid, scraperName] = match;
            if (this.supportedScrapers.includes(scraperName.toLowerCase())) {
              testData.push({
                avid,
                scraper: scraperName.toLowerCase(),
                filename: file,
                filePath: path.join(this.baselineDir, file)
              });
            }
          }
        }
      }

      return testData;
    } catch (error) {
      console.error('扫描基准数据失败:', error.message);
      return [];
    }
  }

  /**
   * 加载基准数据
   */
  async loadBaselineData(avid, scraperName) {
    const filename = `${avid} (${scraperName}).json`;
    const filePath = path.join(this.baselineDir, filename);

    try {
      const data = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(data);

      // 转换字段格式
      return this.transformData(parsed);
    } catch (error) {
      throw new Error(`加载基准数据失败: ${avid} (${scraperName}) - ${error.message}`);
    }
  }

  /**
   * 保存当前测试数据
   */
  async saveCurrentData(avid, scraperName, data) {
    const filename = `${avid} (${scraperName}).json`;
    const filePath = path.join(this.currentDir, filename);

    try {
      // 确保目录存在
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      // 保存数据
      const jsonData = JSON.stringify(data, null, 2);
      await fs.writeFile(filePath, jsonData, 'utf8');

      console.log(`保存当前数据成功: ${avid} (${scraperName})`);
    } catch (error) {
      throw new Error(`保存当前数据失败: ${avid} (${scraperName}) - ${error.message}`);
    }
  }

  /**
   * 更新基准数据
   */
  async updateBaselineData(avid, scraperName, data) {
    if (!this.enableAutoUpdate) {
      console.log('自动更新功能已禁用');
      return false;
    }

    if (this.environment === 'ci') {
      console.log('CI环境不允许自动更新基准数据');
      return false;
    }

    const filename = `${avid} (${scraperName}).json`;
    const filePath = path.join(this.baselineDir, filename);

    try {
      // 转换数据格式
      const transformedData = this.reverseTransformData(data);

      // 创建备份
      const backupPath = `${filePath}.backup.${Date.now()}`;
      if (await this.fileExists(filePath)) {
        await fs.copyFile(filePath, backupPath);
      }

      // 更新基准数据
      const jsonData = JSON.stringify(transformedData, null, 2);
      await fs.writeFile(filePath, jsonData, 'utf8');

      console.log(`更新基准数据成功: ${avid} (${scraperName})`);
      return true;
    } catch (error) {
      console.error(`更新基准数据失败: ${avid} (${scraperName}) - ${error.message}`);
      return false;
    }
  }

  /**
   * 转换数据格式（JavSP → 我们项目）
   */
  transformData(data) {
    const transformed = {};

    for (const [javspField, ourField] of Object.entries(this.fieldMapping)) {
      if (data.hasOwnProperty(javspField)) {
        transformed[ourField] = data[javspField];
      }
    }

    return transformed;
  }

  /**
   * 反向转换数据格式（我们项目 → JavSP）
   */
  reverseTransformData(data) {
    const transformed = {};

    for (const [javspField, ourField] of Object.entries(this.fieldMapping)) {
      if (data.hasOwnProperty(ourField)) {
        transformed[javspField] = data[ourField];
      }
    }

    return transformed;
  }

  /**
   * 从文件名解析测试信息
   */
  parseFileName(filename) {
    const match = filename.match(/^([-\w]+)\s*\((\w+)\)\.json$/i);
    if (match) {
      const [, avid, scraperName] = match;
      return { avid, scraper: scraperName.toLowerCase() };
    }
    return null;
  }

  /**
   * 生成测试用例名称
   */
  generateTestCaseName(avid, scraperName) {
    return `${avid}: ${scraperName}`;
  }

  /**
   * 清理过期的备份数据
   */
  async cleanupBackups(maxBackups = 5) {
    try {
      const files = await fs.readdir(this.baselineDir);
      const backupFiles = files.filter(file => file.endsWith('.backup.'));

      if (backupFiles.length > maxBackups) {
        // 按时间排序，删除最旧的备份
        backupFiles.sort((a, b) => {
          const timeA = parseInt(a.split('.').pop());
          const timeB = parseInt(b.split('.').pop());
          return timeA - timeB;
        });

        const toDelete = backupFiles.slice(0, backupFiles.length - maxBackups);

        for (const file of toDelete) {
          const filePath = path.join(this.baselineDir, file);
          await fs.unlink(filePath);
        }

        console.log(`清理了 ${toDelete.length} 个过期备份文件`);
      }
    } catch (error) {
      console.error('清理备份数据失败:', error.message);
    }
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取统计信息
   */
  async getStats() {
    try {
      const testData = await this.scanBaselineData();
      const statsByScraper = {};

      testData.forEach(item => {
        if (!statsByScraper[item.scraper]) {
          statsByScraper[item.scraper] = 0;
        }
        statsByScraper[item.scraper]++;
      });

      return {
        totalTestCases: testData.length,
        statsByScraper,
        baselineDir: this.baselineDir,
        currentDir: this.currentDir,
        reportsDir: this.reportsDir,
        environment: this.environment,
        autoUpdateEnabled: this.enableAutoUpdate,
        strictMode: this.strictMode
      };
    } catch (error) {
      console.error('获取统计信息失败:', error.message);
      return {};
    }
  }

  /**
   * 验证数据格式
   */
  validateDataFormat(data) {
    const requiredFields = ['avid'];
    const optionalFields = ['title', 'cover', 'genre', 'actress'];

    const errors = [];

    // 检查必需字段
    requiredFields.forEach(field => {
      if (!data.hasOwnProperty(field)) {
        errors.push(`缺少必需字段: ${field}`);
      }
    });

    // 检查字段类型
    if (data.genre && !Array.isArray(data.genre)) {
      errors.push('genre字段必须是数组');
    }

    if (data.actress && !Array.isArray(data.actress)) {
      errors.push('actress字段必须是数组');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 生成数据摘要
   */
  generateDataSummary(data) {
    const summary = {
      avid: data.avid || 'unknown',
      title: data.title ? data.title.substring(0, 50) + (data.title.length > 50 ? '...' : '') : 'no title',
      hasCover: !!data.cover,
      genreCount: Array.isArray(data.genre) ? data.genre.length : 0,
      actressCount: Array.isArray(data.actress) ? data.actress.length : 0,
      hasPlot: !!data.plot,
      hasScore: !!data.score,
      hasMagnet: !!data.magnet,
      fields: Object.keys(data)
    };

    return summary;
  }
}

module.exports = {
  TestDataManager
};