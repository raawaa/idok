/**
 * 测试数据管理器
 * 基于JavSP项目思路，管理测试数据和基准数据
 * 支持JSON基准数据的存储、加载和对比
 */

const fs = require('fs');
const path = require('path');

class TestDataManager {
  constructor() {
    this.testDataDir = path.join(__dirname, '..', 'data');
    this.baselineDir = path.join(this.testDataDir, 'baseline');
    this.ensureDirectories();
  }

  /**
   * 确保必要的目录存在
   */
  ensureDirectories() {
    [this.testDataDir, this.baselineDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * 获取测试番号列表（参考JavSP的设计）
   */
  getTestAvIds() {
    return [
      'IPX-177',      // JavBus标准测试数据
      'JBS-018',      // 通用测试
      'ABP-888',      // 边界测试
      'SSNI-999',     // 大数字测试
      'FC2-PPV-1234567', // FC2格式
      'HEYDOUGA-4017-123', // HEYDOUGA格式
      'GETCHU-123456'  // GETCHU格式
    ];
  }

  /**
   * 获取支持的抓取器列表
   */
  getSupportedScrapers() {
    return [
      'javbus',
      'javdb',
      'airav'
    ];
  }

  /**
   * 获取基准数据文件路径
   */
  getBaselineFilePath(avId, scraperName) {
    return path.join(this.baselineDir, `${avId} (${scraperName}).json`);
  }

  /**
   * 检查基准数据是否存在
   */
  hasBaselineData(avId, scraperName) {
    return fs.existsSync(this.getBaselineFilePath(avId, scraperName));
  }

  /**
   * 加载基准数据
   */
  loadBaselineData(avId, scraperName) {
    const filePath = this.getBaselineFilePath(avId, scraperName);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
      console.error(`加载基准数据失败: ${filePath}`, error);
      return null;
    }
  }

  /**
   * 保存基准数据（参考JavSP的dump逻辑）
   */
  saveBaselineData(avId, scraperName, data) {
    const filePath = this.getBaselineFilePath(avId, scraperName);
    
    // 确保数据是可序列化的
    const serializableData = this.makeSerializable(data);
    
    try {
      fs.writeFileSync(filePath, JSON.stringify(serializableData, null, 2));
      console.log(`基准数据已保存: ${filePath}`);
      return filePath;
    } catch (error) {
      console.error(`保存基准数据失败: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * 使数据可序列化
   */
  makeSerializable(data) {
    if (data && typeof data.toJSON === 'function') {
      return data.toJSON();
    }
    
    // 处理普通对象
    if (data && typeof data === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined && value !== null) {
          result[key] = value;
        }
      }
      return result;
    }
    
    return data;
  }

  /**
   * 获取所有可用的基准数据
   */
  getAvailableBaselineData() {
    try {
      const files = fs.readdirSync(this.baselineDir);
      return files
        .filter(file => file.endsWith('.json'))
        .map(file => {
          const match = file.match(/^(.+?) \((.+?)\)\.json$/);
          return match ? { 
            avId: match[1], 
            scraperName: match[2],
            fileName: file
          } : null;
        })
        .filter(item => item !== null);
    } catch (error) {
      console.error('获取可用基准数据失败', error);
      return [];
    }
  }

  /**
   * 生成测试参数（参考JavSP的pytest_generate_tests）
   */
  generateTestParameters(options = {}) {
    const { 
      specificScraper = null, 
      specificAvId = null,
      includeMissing = false 
    } = options;

    const testCases = [];
    const avIds = specificAvId ? [specificAvId] : this.getTestAvIds();
    const scrapers = specificScraper ? [specificScraper] : this.getSupportedScrapers();

    for (const avId of avIds) {
      for (const scraper of scrapers) {
        const hasBaseline = this.hasBaselineData(avId, scraper);
        
        // 如果没有基准数据且不要求包含缺失的，则跳过
        if (!hasBaseline && !includeMissing) {
          continue;
        }

        testCases.push({
          avId,
          scraperName: scraper,
          hasBaseline,
          testName: `${avId}: ${scraper}`,
          description: hasBaseline ? '回归测试' : '新测试用例'
        });
      }
    }

    return testCases;
  }

  /**
   * 清理旧的基准数据
   */
  cleanupOldBaselineData(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    try {
      const files = fs.readdirSync(this.baselineDir);
      let cleanedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.baselineDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          cleanedCount++;
          console.log(`删除旧基准数据: ${file}`);
        }
      }

      console.log(`清理完成，删除了 ${cleanedCount} 个旧文件`);
      return cleanedCount;
    } catch (error) {
      console.error('清理旧基准数据失败', error);
      return 0;
    }
  }

  /**
   * 获取测试统计信息
   */
  getTestStatistics() {
    const baselineData = this.getAvailableBaselineData();
    const testAvIds = this.getTestAvIds();
    const scrapers = this.getSupportedScrapers();

    const totalPossibleTests = testAvIds.length * scrapers.length;
    const availableTests = baselineData.length;
    const coverageRate = (availableTests / totalPossibleTests * 100).toFixed(1);

    return {
      totalTestCases: testAvIds.length,
      supportedScrapers: scrapers.length,
      totalPossibleTests,
      availableTests,
      coverageRate: `${coverageRate}%`,
      baselineFiles: baselineData.length,
      testAvIds,
      scrapers
    };
  }

  /**
   * 创建缺失的基准数据模板
   */
  createMissingBaselineTemplates() {
    const testAvIds = this.getTestAvIds();
    const scrapers = this.getSupportedScrapers();
    let createdCount = 0;

    for (const avId of testAvIds) {
      for (const scraper of scrapers) {
        if (!this.hasBaselineData(avId, scraper)) {
          const template = this.createBaselineTemplate(avId, scraper);
          this.saveBaselineData(avId, scraper, template);
          createdCount++;
        }
      }
    }

    console.log(`创建了 ${createdCount} 个基准数据模板`);
    return createdCount;
  }

  /**
   * 创建基准数据模板
   */
  createBaselineTemplate(avId, scraperName) {
    return {
      avid: avId,
      title: `测试影片标题 - ${avId}`,
      actors: ['测试女优'],
      genres: ['测试分类'],
      studio: '测试片商',
      releaseDate: '2024-01-01',
      cover: `https://example.com/${avId}/cover.jpg`,
      description: `这是 ${avId} 的测试描述`,
      previewPics: [
        `https://example.com/${avId}/preview1.jpg`,
        `https://example.com/${avId}/preview2.jpg`
      ],
      score: 8.5,
      duration: 120,
      director: '测试导演',
      series: '测试系列',
      scrapedAt: new Date().toISOString(),
      scraper: scraperName,
      isTemplate: true
    };
  }
}

module.exports = TestDataManager;