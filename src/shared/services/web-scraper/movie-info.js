/**
 * 影片信息模型类
 * 统一封装影片数据，提供数据验证和合并功能
 * 参考Python JavSP的Movie数据模型设计
 */
class MovieInfo {
  constructor(data = {}) {
    // 基础信息
    this.avid = data.avid || '';
    this.title = data.title || '';
    this.cover = data.cover || '';
    this.releaseDate = data.releaseDate || '';
    this.runtime = data.runtime || '';
    this.score = data.score || '';
    this.director = data.director || '';
    this.studio = data.studio || '';
    this.label = data.label || '';
    this.series = data.series || '';
    this.plot = data.plot || '';
    
    // 演员信息
    this.actress = Array.isArray(data.actress) ? data.actress : [];
    
    // 类型标签
    this.genre = Array.isArray(data.genre) ? data.genre : [];
    
    // 预览图片
    this.previewPics = Array.isArray(data.previewPics) ? data.previewPics : [];
    
    // 元数据
    this.metadata = {
      source: data.source || '',
      scrapedAt: data.scrapedAt || new Date().toISOString(),
      scraper: data.scraper || '',
      confidence: data.confidence || 0,
      ...data.metadata
    };

    // 额外字段
    this.extra = data.extra || {};

    // 验证数据
    this.validate();
  }

  /**
   * 验证数据完整性
   */
  validate() {
    // 验证必填字段
    if (!this.avid) {
      throw new Error('AV ID不能为空');
    }

    // 验证数据类型
    if (!Array.isArray(this.actress)) {
      throw new Error('actress必须是数组');
    }

    if (!Array.isArray(this.genre)) {
      throw new Error('genre必须是数组');
    }

    if (!Array.isArray(this.previewPics)) {
      throw new Error('previewPics必须是数组');
    }

    // 验证URL格式
    if (this.cover && !this.isValidUrl(this.cover)) {
      throw new Error(`封面URL格式无效: ${this.cover}`);
    }

    // 验证日期格式
    if (this.releaseDate && !this.isValidDate(this.releaseDate)) {
      throw new Error(`发布日期格式无效: ${this.releaseDate}`);
    }

    // 验证分数
    if (this.score && !this.isValidScore(this.score)) {
      throw new Error(`分数格式无效: ${this.score}`);
    }
  }

  /**
   * 检查URL格式
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 检查日期格式
   */
  isValidDate(dateString) {
    // 支持格式: YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD
    const dateRegex = /^\d{4}[\-\/\.]\d{1,2}[\-\/\.]\d{1,2}$/;
    if (!dateRegex.test(dateString)) {
      return false;
    }

    const date = new Date(dateString.replace(/\./g, '-'));
    return !isNaN(date.getTime());
  }

  /**
   * 检查分数格式
   */
  isValidScore(score) {
    if (typeof score === 'number') {
      return score >= 0 && score <= 10;
    }

    if (typeof score === 'string') {
      const numScore = parseFloat(score);
      return !isNaN(numScore) && numScore >= 0 && numScore <= 10;
    }

    return false;
  }

  /**
   * 获取数据完整性得分
   */
  getCompletenessScore() {
    let score = 0;
    let total = 0;

    // 基础信息
    const basicFields = ['title', 'cover', 'releaseDate', 'runtime'];
    basicFields.forEach(field => {
      total += 10;
      if (this[field]) score += 10;
    });

    // 详细信息
    const detailFields = ['director', 'studio', 'label', 'series', 'plot'];
    detailFields.forEach(field => {
      total += 5;
      if (this[field]) score += 5;
    });

    // 数组字段
    total += 20;
    if (this.actress.length > 0) score += Math.min(this.actress.length * 3, 15);
    
    total += 15;
    if (this.genre.length > 0) score += Math.min(this.genre.length * 2, 10);
    
    total += 10;
    if (this.previewPics.length > 0) score += Math.min(this.previewPics.length * 1, 10);

    // 分数
    total += 5;
    if (this.score) score += 5;

    return Math.round((score / total) * 100);
  }

  /**
   * 从JSON数据创建MovieInfo实例
   */
  static fromJSON(jsonData) {
    return new MovieInfo(jsonData);
  }

  /**
   * 获取简化的显示信息
   */
  getDisplayInfo() {
    return {
      avid: this.avid,
      title: this.title,
      cover: this.cover,
      actress: this.actress,
      releaseDate: this.releaseDate,
      studio: this.studio,
      genre: this.genre.slice(0, 3), // 只显示前3个分类
      score: this.score,
      completenessScore: this.getCompletenessScore()
    };
  }

  /**
   * 检查是否有足够的基本信息
   */
  hasBasicInfo() {
    return !!(this.avid && this.title);
  }

  /**
   * 检查是否有完整的元数据
   */
  hasCompleteMetadata() {
    return this.hasBasicInfo() && 
           !!(this.cover && this.actress.length > 0 && this.genre.length > 0);
  }

  /**
   * 合并其他MovieInfo的数据（用于数据融合）
   */
  merge(otherMovieInfo) {
    if (!otherMovieInfo || !(otherMovieInfo instanceof MovieInfo)) {
      return this;
    }

    const thisData = this.toJSON();
    const otherData = otherMovieInfo.toJSON();
    
    // 合并数据，优先使用已有的非空值
    const mergedData = { ...otherData, ...thisData };
    
    // 特殊处理数组字段，合并去重
    const arrayFields = ['genre', 'actress', 'previewPics'];
    arrayFields.forEach(field => {
      if (thisData[field] && otherData[field]) {
        mergedData[field] = [...new Set([...thisData[field], ...otherData[field]])];
      }
    });

    // 更新元数据
    mergedData.metadata = {
      ...mergedData.metadata,
      mergedAt: new Date().toISOString()
    };

    return new MovieInfo(mergedData);
  }

  /**
   * 创建副本
   */
  clone() {
    return new MovieInfo(this.toJSON());
  }

  /**
   * 转换为JSON对象
   */
  toJSON() {
    return {
      avid: this.avid,
      title: this.title,
      cover: this.cover,
      releaseDate: this.releaseDate,
      runtime: this.runtime,
      score: this.score,
      director: this.director,
      studio: this.studio,
      label: this.label,
      series: this.series,
      plot: this.plot,
      actress: this.actress,
      genre: this.genre,
      previewPics: this.previewPics,
      metadata: this.metadata,
      extra: this.extra,
      completenessScore: this.getCompletenessScore()
    };
  }

  /**
   * 从JSON对象创建实例
   */
  static fromJSON(json) {
    return new MovieInfo(json);
  }

  /**
   * 创建简化版本（移除敏感信息）
   */
  toSafeJSON() {
    return {
      avid: this.avid,
      title: this.title,
      cover: this.cover,
      releaseDate: this.releaseDate,
      runtime: this.runtime,
      score: this.score,
      director: this.director,
      studio: this.studio,
      label: this.label,
      series: this.series,
      actress: this.actress,
      genre: this.genre,
      previewPics: this.previewPics,
      completenessScore: this.getCompletenessScore()
    };
  }

  /**
   * 获取摘要信息
   */
  getSummary() {
    return {
      avid: this.avid,
      title: this.title,
      cover: this.cover,
      releaseDate: this.releaseDate,
      actressCount: this.actress.length,
      genreCount: this.genre.length,
      completenessScore: this.getCompletenessScore()
    };
  }

  /**
   * 检查是否为完整数据
   */
  isComplete() {
    const requiredFields = ['avid', 'title', 'cover'];
    return requiredFields.every(field => this[field]);
  }

  /**
   * 克隆对象
   */
  clone() {
    return new MovieInfo(this.toJSON());
  }

  /**
   * 比较两个MovieInfo对象
   */
  equals(other) {
    if (!(other instanceof MovieInfo)) {
      return false;
    }

    return JSON.stringify(this.toJSON()) === JSON.stringify(other.toJSON());
  }
}

module.exports = MovieInfo;