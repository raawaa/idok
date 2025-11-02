/**
 * 测试数据工厂
 * 为TDD测试提供各种模拟数据
 */

/**
 * 创建模拟文件路径数据
 */
class FilePathFactory {
  /**
   * 创建FC2格式的文件路径
   */
  static fc2Format(number = '123456', extension = 'mp4') {
    return {
      fullPath: `/path/to/FC2-PPV${number}.${extension}`,
      name: `FC2-PPV${number}`,
      dir: '/path/to',
      ext: `.${extension}`,
      expectedAvId: `FC2-${number}`
    };
  }

  /**
   * 创建普通番号格式的文件路径
   */
  static regularFormat(prefix = 'ABC', number = '123', extension = 'mp4') {
    return {
      fullPath: `/path/to/${prefix}-${number}.${extension}`,
      name: `${prefix}-${number}`,
      dir: '/path/to',
      ext: `.${extension}`,
      expectedAvId: `${prefix}-${number}`
    };
  }

  /**
   * 创建HEYOUGA格式的文件路径
   */
  static heydougaFormat(part1 = '4017', part2 = '123', extension = 'mp4') {
    return {
      fullPath: `/path/to/heydouga-${part1}-${part2}.${extension}`,
      name: `heydouga-${part1}-${part2}`,
      dir: '/path/to',
      ext: `.${extension}`,
      expectedAvId: `HEYDOUGA-${part1}-${part2}`
    };
  }

  /**
   * 创建无效格式的文件路径
   */
  static invalidFormat() {
    return {
      fullPath: '/path/to/random-video-file.mp4',
      name: 'random-video-file',
      dir: '/path/to',
      ext: '.mp4',
      expectedAvId: null
    };
  }

  /**
   * 批量创建测试文件路径
   */
  static createBatch() {
    return [
      this.fc2Format('123456'),
      this.fc2Format('789012', 'avi'),
      this.regularFormat('JBS', '018'),
      this.regularFormat('SSNI', '254'),
      this.heydougaFormat('4017', '123'),
      this.invalidFormat(),
      this.regularFormat('YRZ', '011', 'avi')
    ];
  }
}

/**
 * 创建模拟电影信息数据
 */
class MovieInfoFactory {
  /**
   * 创建完整的电影信息
   */
  static completeMovie(overrides = {}) {
    return {
      dvdid: 'JBS-018',
      cid: 'jbs00018',
      url: 'https://www.javbus.com/JBS-018',
      title: '働くオンナ3 Vol.04',
      ori_title: '働くオンナ3 Vol.04',
      plot: 'OL系列作品，讲述职场女性的故事',
      cover: 'https://example.com/cover.jpg',
      big_cover: 'https://example.com/big_cover.jpg',
      preview_pics: ['https://example.com/preview1.jpg'],
      preview_video: 'https://example.com/preview.mp4',
      magnet: 'magnet:?xt=urn:btih:example',
      genre: ['制服', 'OL', '成熟的女人'],
      genre_id: ['102', '105', '106'],
      genre_norm: ['制服', 'OL', '熟女'],
      score: 8.5,
      actress: ['河愛雪乃'],
      actress_id: ['actress123'],
      director: '导演名',
      studio: 'スタジオ',
      studio_id: 'studio123',
      label: 'レーベル',
      label_id: 'label123',
      series: '働くオンナ3',
      series_id: 'series123',
      release: '2022-01-01',
      runtime: 120,
      producer: '製作公司',
      publisher: '發行商',

      // 模块特定字段
      hasMetadata: true,
      isStandaloneVideo: false,
      scrapedAt: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * 创建独立视频文件的电影信息
   */
  static standaloneMovie(avId, overrides = {}) {
    return {
      dvdid: avId,
      cid: null,
      url: null,
      title: avId,
      ori_title: null,
      plot: null,
      cover: null,
      big_cover: null,
      preview_pics: null,
      preview_video: null,
      magnet: null,
      genre: [],
      genre_id: [],
      genre_norm: [],
      score: null,
      actress: [],
      actress_id: [],
      director: null,
      studio: null,
      studio_id: null,
      label: null,
      label_id: null,
      series: null,
      series_id: null,
      release: null,
      runtime: null,
      producer: null,
      publisher: null,

      // 模块特定字段
      hasMetadata: false,
      isStandaloneVideo: true,
      scrapedAt: null,
      ...overrides
    };
  }

  /**
   * 创建部分缺失信息的电影
   */
  static partialMovie(overrides = {}) {
    return {
      dvdid: 'ABC-123',
      cid: null,
      url: 'https://www.javbus.com/ABC-123',
      title: '测试影片',
      ori_title: null,
      plot: null,
      cover: 'https://example.com/cover.jpg',
      big_cover: null,
      preview_pics: null,
      preview_video: null,
      magnet: null,
      genre: ['制服'],
      genre_id: ['102'],
      genre_norm: ['制服'],
      score: null,
      actress: ['测试女优'],
      actress_id: ['actress456'],
      director: null,
      studio: '测试片商',
      studio_id: 'studio456',
      label: null,
      label_id: null,
      series: null,
      series_id: null,
      release: '2023-01-01',
      runtime: null,
      producer: null,
      publisher: null,

      // 模块特定字段
      hasMetadata: true,
      isStandaloneVideo: false,
      scrapedAt: new Date().toISOString(),
      ...overrides
    };
  }
}

/**
 * 创建模拟HTTP响应数据
 */
class HttpResponseFactory {
  /**
   * 创建JavBus页面响应
   */
  static javbusResponse(avId, overrides = {}) {
    const baseHtml = `
    <!DOCTYPE html>
    <html>
    <head><title>${avId} 测试影片 - JavBus</title></head>
    <body>
      <div class="container">
        <h3>${avId}</h3>
        <h1>测试影片标题</h1>
        <p>这是一个测试影片的描述信息。</p>
        <a class="bigImage" href="https://example.com/cover.jpg">
          <img src="https://example.com/thumb.jpg" alt="封面">
        </a>
        <div class="info">
          <p><span class="info-label">發行日期:</span> 2022-01-01</p>
          <p><span class="info-label">片商:</span> 测试片商</p>
          <p><span class="info-label">導演:</span> 测试导演</p>
        </div>
        <div class="star-name">
          <a href="/actress/test">测试女优</a>
        </div>
        <div class="genre">
          <a href="/genre/102">制服</a>
          <a href="/genre/105">OL</a>
        </div>
      </div>
    </body>
    </html>
    `;

    return {
      status: 200,
      statusText: 'OK',
      headers: {
        'content-type': 'text/html; charset=utf-8'
      },
      data: baseHtml,
      ...overrides
    };
  }

  /**
   * 创建404响应
   */
  static notFoundResponse(url) {
    return {
      status: 404,
      statusText: 'Not Found',
      headers: {
        'content-type': 'text/html'
      },
      data: `<html><body><h1>404 Not Found</h1><p>The requested URL ${url} was not found on this server.</p></body></html>`
    };
  }

  /**
   * 创建网络错误响应
   */
  static networkErrorResponse(message = 'Network Error') {
    const error = new Error(message);
    error.code = 'NETWORK_ERROR';
    return error;
  }

  /**
   * 创建超时响应
   */
  static timeoutResponse() {
    const error = new Error('timeout of 15000ms exceeded');
    error.code = 'ECONNABORTED';
    return error;
  }
}

/**
 * 创建模拟配置数据
 */
class ConfigFactory {
  /**
   * 创建基础配置
   */
  static baseConfig(overrides = {}) {
    return {
      timeout: 15000,
      max_retries: 3,
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      base_url: 'https://www.javbus.com',
      ...overrides
    };
  }

  /**
   * 创建测试环境配置
   */
  static testConfig(overrides = {}) {
    return {
      ...this.baseConfig(),
      timeout: 5000,
      max_retries: 1,
      base_url: 'https://test.javbus.com',
      ...overrides
    };
  }
}

module.exports = {
  FilePathFactory,
  MovieInfoFactory,
  HttpResponseFactory,
  ConfigFactory
};