// 数据库服务测试
const fs = require('fs');
const path = require('path');
const { DatabaseService } = require('../../src/shared/services/database-service');

// 模拟数据库服务类（后续会被真实实现替换）
class MockDatabase {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.data = {
      version: "1.0",
      lastScan: new Date().toISOString(),
      files: {}
    };
  }

  // 获取文件记录
  async get(filePath) {
    return this.data.files[filePath] || null;
  }

  // 保存文件记录
  async set(filePath, metadata) {
    this.data.files[filePath] = {
      ...metadata,
      lastUpdated: new Date().toISOString()
    };
    return true;
  }

  // 删除文件记录
  async delete(filePath) {
    delete this.data.files[filePath];
    return true;
  }

  // 根据番号查找
  async findByAvid(avid) {
    return Object.entries(this.data.files)
      .filter(([_, data]) => data.avid === avid)
      .map(([filePath, data]) => ({ filePath, ...data }));
  }

  // 获取所有文件
  async getAll() {
    return Object.entries(this.data.files).map(([filePath, data]) => ({
      filePath,
      ...data
    }));
  }

  // 清空数据库
  async clear() {
    this.data.files = {};
    this.data.lastScan = new Date().toISOString();
    return true;
  }
}

describe('数据库服务测试', () => {
  let database;
  const testDbPath = '/tmp/test-database.json';

  beforeEach(() => {
    database = new MockDatabase(testDbPath);
  });

  afterEach(async () => {
    // 清理测试数据
    await database.clear();
  });

  describe('基本CRUD操作', () => {
    test('应该能够保存和获取文件记录', async () => {
      const testFile = {
        filePath: 'D:\\Videos\\ABC-123.mp4',
        fileType: 'raw-video',
        avid: 'ABC-123',
        confidence: 0.9,
        metadata: {
          title: '测试影片',
          actors: ['演员1', '演员2']
        }
      };

      // 保存记录
      await database.set(testFile.filePath, testFile);

      // 获取记录
      const result = await database.get(testFile.filePath);
      
      expect(result).toBeTruthy();
      expect(result.avid).toBe('ABC-123');
      expect(result.confidence).toBe(0.9);
      expect(result.metadata.title).toBe('测试影片');
      expect(result.lastUpdated).toBeTruthy();
    });

    test('应该返回null当文件不存在时', async () => {
      const result = await database.get('不存在的文件.mp4');
      expect(result).toBeNull();
    });

    test('应该能够删除文件记录', async () => {
      const testFile = {
        filePath: 'D:\\Videos\\TEST-001.mp4',
        fileType: 'raw-video',
        avid: 'TEST-001'
      };

      // 先保存
      await database.set(testFile.filePath, testFile);
      
      // 验证存在
      let result = await database.get(testFile.filePath);
      expect(result).toBeTruthy();

      // 删除
      await database.delete(testFile.filePath);
      
      // 验证删除
      result = await database.get(testFile.filePath);
      expect(result).toBeNull();
    });
  });

  describe('番号查询功能', () => {
    test('应该能够根据番号查找文件', async () => {
      // 准备测试数据
      const files = [
        {
          filePath: 'D:\\Videos\\ABC-123.mp4',
          fileType: 'raw-video',
          avid: 'ABC-123'
        },
        {
          filePath: 'D:\\Videos\\ABC-123-CD2.mp4',
          fileType: 'raw-video',
          avid: 'ABC-123'
        },
        {
          filePath: 'D:\\Videos\\XYZ-456.mp4',
          fileType: 'raw-video',
          avid: 'XYZ-456'
        }
      ];

      // 保存所有文件
      for (const file of files) {
        await database.set(file.filePath, file);
      }

      // 查询番号ABC-123
      const results = await database.findByAvid('ABC-123');
      
      expect(results).toHaveLength(2);
      expect(results.every(r => r.avid === 'ABC-123')).toBe(true);
      expect(results.map(r => r.filePath)).toContain('D:\\Videos\\ABC-123.mp4');
      expect(results.map(r => r.filePath)).toContain('D:\\Videos\\ABC-123-CD2.mp4');
    });

    test('应该返回空数组当番号不存在时', async () => {
      const results = await database.findByAvid('不存在的番号');
      expect(results).toEqual([]);
    });
  });

  describe('批量操作', () => {
    test('应该能够获取所有文件记录', async () => {
      const files = [
        { filePath: 'file1.mp4', avid: 'AAA-001' },
        { filePath: 'file2.mp4', avid: 'BBB-002' },
        { filePath: 'file3.mp4', avid: 'CCC-003' }
      ];

      for (const file of files) {
        await database.set(file.filePath, file);
      }

      const allFiles = await database.getAll();
      
      expect(allFiles).toHaveLength(3);
      expect(allFiles.map(f => f.filePath)).toContain('file1.mp4');
      expect(allFiles.map(f => f.filePath)).toContain('file2.mp4');
      expect(allFiles.map(f => f.filePath)).toContain('file3.mp4');
    });

    test('应该能够清空数据库', async () => {
      // 先添加一些数据
      await database.set('file1.mp4', { avid: 'AAA-001' });
      await database.set('file2.mp4', { avid: 'BBB-002' });
      
      let allFiles = await database.getAll();
      expect(allFiles).toHaveLength(2);

      // 清空
      await database.clear();
      
      allFiles = await database.getAll();
      expect(allFiles).toHaveLength(0);
    });
  });

  describe('数据验证', () => {
    test('应该自动添加lastUpdated时间戳', async () => {
      const testFile = {
        filePath: 'D:\\Videos\\TEST-123.mp4',
        avid: 'TEST-123'
      };

      await database.set(testFile.filePath, testFile);
      const result = await database.get(testFile.filePath);
      
      expect(result.lastUpdated).toBeTruthy();
      expect(new Date(result.lastUpdated)).toBeInstanceOf(Date);
    });

    test('应该保留原有的元数据字段', async () => {
      const testFile = {
        filePath: 'D:\\Videos\\META-123.mp4',
        fileType: 'raw-video',
        avid: 'META-123',
        confidence: 0.95,
        metadata: {
          title: '完整元数据测试',
          actors: ['主演A', '主演B'],
          genres: ['剧情', '爱情'],
          studio: '测试工作室',
          series: '测试系列',
          releaseDate: '2024-01-01',
          coverImage: 'http://example.com/cover.jpg'
        }
      };

      await database.set(testFile.filePath, testFile);
      const result = await database.get(testFile.filePath);
      
      expect(result.metadata.title).toBe('完整元数据测试');
      expect(result.metadata.actors).toHaveLength(2);
      expect(result.metadata.genres).toContain('剧情');
      expect(result.metadata.studio).toBe('测试工作室');
      expect(result.metadata.coverImage).toBe('http://example.com/cover.jpg');
    });
  });
});

// 导出MockDatabase供其他测试使用
module.exports = { MockDatabase };