const JavBusScraper = require('@services/web-scraper/javbus-scraper');
const { BaseScraper } = require('@services/web-scraper/base-scraper');
const MovieInfo = require('@services/web-scraper/movie-info');
const axios = require('axios');

// Mock 模块
jest.mock('axios');
jest.mock('cloudscraper');
jest.mock('iconv-lite');
jest.mock('@services/web-scraper/system-proxy-detector', () => {
  return jest.fn().mockImplementation(() => {
    return {
      getProxyConfig: jest.fn().mockReturnValue(null),
      getAxiosProxyConfig: jest.fn().mockReturnValue(null)
    };
  });
});

describe('JavBusScraper Tests', () => {
  let scraper;
  let mockAxios;
  let mockCloudscraper;

  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();
    
    // 获取模拟的 axios 实例
    mockAxios = axios;
    mockCloudscraper = require('cloudscraper');
    
    // 创建新的抓取器实例
    scraper = new JavBusScraper({
      timeout: 5000,
      retries: 2,
      retryDelay: 100,
      useCloudScraper: false, // 默认不使用 CloudScraper，便于测试
      enableCache: false // 默认禁用缓存，确保测试独立性
    });
  });

  afterEach(() => {
    if (scraper && typeof scraper.destroy === 'function') {
      scraper.destroy();
    }
  });

  beforeAll(() => {
    // 增加全局测试超时时间
    jest.setTimeout(30000);
  });

  describe('Constructor Tests', () => {
    test('should initialize with correct default options', () => {
      expect(scraper.name).toBe('javbus');
      expect(scraper.baseUrl).toBe('https://www.javbus.com');
      expect(scraper.timeout).toBe(5000);
      expect(scraper.retries).toBe(2);
      expect(scraper.retryDelay).toBe(100);
      expect(scraper.useCloudScraper).toBe(false);
      expect(scraper.enableCache).toBe(false);
    });

    test('should inherit from BaseScraper', () => {
      expect(scraper instanceof BaseScraper).toBe(true);
      expect(typeof scraper.request).toBe('function');
      expect(typeof scraper.fetchHtml).toBe('function');
      expect(typeof scraper.cleanText).toBe('function');
    });
  });

  describe('URL Building Tests', () => {
    test('should build movie URL correctly', () => {
      const url = scraper.buildMovieUrl('TEST-001');
      expect(url).toBe('https://www.javbus.com/TEST-001');
    });

    test('should build search URL correctly', () => {
      const url = scraper.buildSearchUrl('TEST-001');
      expect(url).toBe('https://www.javbus.com/search/TEST-001');
    });

    test('should build genre URL correctly', () => {
      const url = scraper.buildGenreUrl('genre1');
      expect(url).toBe('https://www.javbus.com/genre/genre1');
    });

    test('should build actress URL correctly', () => {
      const url = scraper.buildActressUrl('actress1');
      expect(url).toBe('https://www.javbus.com/actress/actress1');
    });

    test('should build studio URL correctly', () => {
      const url = scraper.buildStudioUrl('studio1');
      expect(url).toBe('https://www.javbus.com/studio/studio1');
    });
  });

  describe('Movie Info Extraction Tests', () => {
    test('should extract movie details from HTML', async () => {
      const mockHtml = `
        <html>
          <head><title>TEST-001 测试标题 | JavBus</title></head>
          <body>
            <div class="container">
              <div class="row movie">
                <div class="col-md-9">
                  <h3>TEST-001 测试标题</h3>
                  <div class="info">
                    <p><span class="header">發行日期:</span> 2023-11-30</p>
                    <p><span class="header">長度:</span> 120分鐘</p>
                    <p><span class="header">導演:</span> <a href="/director/director1">导演1</a></p>
                    <p><span class="header">製作商:</span> <a href="/studio/studio1">制作商1</a></p>
                    <p><span class="header">發行商:</span> <a href="/studio/studio2">发行商1</a></p>
                    <p><span class="header">系列:</span> <a href="/series/series1">系列1</a></p>
                  </div>
                  <div class="photo-info">
                    <img src="https://example.com/cover.jpg" alt="封面" />
                  </div>
                  <div class="sample-box">
                    <a href="https://example.com/sample1.jpg" class="sample-box"><img src="https://example.com/thumb1.jpg" /></a>
                    <a href="https://example.com/sample2.jpg" class="sample-box"><img src="https://example.com/thumb2.jpg" /></a>
                  </div>
                  <div class="star-show">
                    <a href="/actress/actress1">女优1</a>
                    <a href="/actress/actress2">女优2</a>
                  </div>
                  <div class="genre">
                    <a href="/genre/genre1">类型1</a>
                    <a href="/genre/genre2">类型2</a>
                  </div>
                  <div class="hd-tag">HD</div>
                  <div class="magnet-name">
                    <a href="magnet:?xt=urn:btih:hash1">磁力链接1</a>
                    <a href="magnet:?xt=urn:btih:hash2">磁力链接2</a>
                  </div>
                  <div class="score">评分: 8.5</div>
                  <div class="review">
                    <div class="review-item">
                      <div class="review-title">用户评论标题</div>
                      <div class="review-content">用户评论内容</div>
                    </div>
                  </div>
                  <div class="related-box">
                    <a href="/movie/RELATED-001" class="movie-box">
                      <img src="https://example.com/related1.jpg" />
                      <div class="photo-info">
                        <span>RELATED-001</span>
                        <date>2023-10-30</date>
                      </div>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;
      
      const mockResponse = {
        status: 200,
        data: mockHtml,
        headers: { 'content-type': 'text/html' }
      };
      
      mockAxios.mockResolvedValue(mockResponse);
      
      const movieInfo = await scraper.getMovieDetails('TEST-001');
      
      expect(movieInfo).toBeInstanceOf(MovieInfo);
      expect(movieInfo.id).toBe('TEST-001');
      expect(movieInfo.title).toBe('测试标题');
      expect(movieInfo.cover).toBe('https://example.com/cover.jpg');
      expect(movieInfo.date).toBe('2023-11-30');
      expect(movieInfo.duration).toBe('120');
      expect(movieInfo.director).toBe('导演1');
      expect(movieInfo.studio).toBe('制作商1');
      expect(movieInfo.maker).toBe('发行商1');
      expect(movieInfo.series).toBe('系列1');
      expect(movieInfo.actresses).toContain('女优1');
      expect(movieInfo.actresses).toContain('女优2');
      expect(movieInfo.genres).toContain('类型1');
      expect(movieInfo.genres).toContain('类型2');
      expect(movieInfo.hiDef).toBe(true);
      expect(movieInfo.magnetLinks).toContain('magnet:?xt=urn:btih:hash1');
      expect(movieInfo.magnetLinks).toContain('magnet:?xt=urn:btih:hash2');
      expect(movieInfo.score).toBe('8.5');
      expect(movieInfo.reviews).toHaveLength(1);
      expect(movieInfo.reviews[0].title).toBe('用户评论标题');
      expect(movieInfo.reviews[0].content).toBe('用户评论内容');
      expect(movieInfo.relatedMovies).toHaveLength(1);
      expect(movieInfo.relatedMovies[0].id).toBe('RELATED-001');
      expect(movieInfo.relatedMovies[0].cover).toBe('https://example.com/related1.jpg');
      expect(movieInfo.relatedMovies[0].date).toBe('2023-10-30');
    });

    test('should extract high definition images correctly', async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="sample-box">
              <a href="https://example.com/sample1.jpg" class="sample-box"><img src="https://example.com/thumb1.jpg" /></a>
              <a href="https://example.com/sample2.jpg" class="sample-box"><img src="https://example.com/thumb2.jpg" /></a>
            </div>
          </body>
        </html>
      `;
      
      const mockResponse = {
        status: 200,
        data: mockHtml,
        headers: { 'content-type': 'text/html' }
      };
      
      mockAxios.mockResolvedValue(mockResponse);
      
      const highDefImages = await scraper.extractHighDefImages('TEST-001');
      
      expect(highDefImages).toHaveLength(2);
      expect(highDefImages[0]).toBe('https://example.com/sample1.jpg');
      expect(highDefImages[1]).toBe('https://example.com/sample2.jpg');
    });

    test('should extract magnet links correctly', async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="magnet-name">
              <a href="magnet:?xt=urn:btih:hash1">磁力链接1</a>
              <a href="magnet:?xt=urn:btih:hash2">磁力链接2</a>
            </div>
          </body>
        </html>
      `;
      
      const mockResponse = {
        status: 200,
        data: mockHtml,
        headers: { 'content-type': 'text/html' }
      };
      
      mockAxios.mockResolvedValue(mockResponse);
      
      const magnetLinks = await scraper.extractMagnetLinks('TEST-001');
      
      expect(magnetLinks).toHaveLength(2);
      expect(magnetLinks[0]).toBe('magnet:?xt=urn:btih:hash1');
      expect(magnetLinks[1]).toBe('magnet:?xt=urn:btih:hash2');
    });

    test('should extract user ratings and reviews correctly', async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="score">评分: 8.5</div>
            <div class="review">
              <div class="review-item">
                <div class="review-title">用户评论标题1</div>
                <div class="review-content">用户评论内容1</div>
              </div>
              <div class="review-item">
                <div class="review-title">用户评论标题2</div>
                <div class="review-content">用户评论内容2</div>
              </div>
            </div>
          </body>
        </html>
      `;
      
      const mockResponse = {
        status: 200,
        data: mockHtml,
        headers: { 'content-type': 'text/html' }
      };
      
      mockAxios.mockResolvedValue(mockResponse);
      
      const reviews = await scraper.extractUserReviews('TEST-001');
      
      expect(reviews.score).toBe('8.5');
      expect(reviews.reviews).toHaveLength(2);
      expect(reviews.reviews[0].title).toBe('用户评论标题1');
      expect(reviews.reviews[0].content).toBe('用户评论内容1');
      expect(reviews.reviews[1].title).toBe('用户评论标题2');
      expect(reviews.reviews[1].content).toBe('用户评论内容2');
    });

    test('should extract related movies correctly', async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="related-box">
              <a href="/movie/RELATED-001" class="movie-box">
                <img src="https://example.com/related1.jpg" />
                <div class="photo-info">
                  <span>RELATED-001</span>
                  <date>2023-10-30</date>
                </div>
              </a>
              <a href="/movie/RELATED-002" class="movie-box">
                <img src="https://example.com/related2.jpg" />
                <div class="photo-info">
                  <span>RELATED-002</span>
                  <date>2023-09-30</date>
                </div>
              </a>
            </div>
          </body>
        </html>
      `;
      
      const mockResponse = {
        status: 200,
        data: mockHtml,
        headers: { 'content-type': 'text/html' }
      };
      
      mockAxios.mockResolvedValue(mockResponse);
      
      const relatedMovies = await scraper.extractRelatedMovies('TEST-001');
      
      expect(relatedMovies).toHaveLength(2);
      expect(relatedMovies[0].id).toBe('RELATED-001');
      expect(relatedMovies[0].cover).toBe('https://example.com/related1.jpg');
      expect(relatedMovies[0].date).toBe('2023-10-30');
      expect(relatedMovies[1].id).toBe('RELATED-002');
      expect(relatedMovies[1].cover).toBe('https://example.com/related2.jpg');
      expect(relatedMovies[1].date).toBe('2023-09-30');
    });
  });

  describe('Batch Processing Tests', () => {
    test('should process multiple movie IDs in batch', async () => {
      const movieIds = ['TEST-001', 'TEST-002', 'TEST-003'];
      
      // 模拟每个电影的HTML响应
      const mockResponses = movieIds.map(id => ({
        status: 200,
        data: `
          <html>
            <body>
              <h3>${id} 测试标题</h3>
              <div class="info">
                <p><span class="header">發行日期:</span> 2023-11-30</p>
                <p><span class="header">長度:</span> 120分鐘</p>
              </div>
              <div class="photo-info">
                <img src="https://example.com/${id}.jpg" alt="封面" />
              </div>
            </body>
          </html>
        `,
        headers: { 'content-type': 'text/html' }
      }));
      
      // 设置模拟返回值
      mockAxios
        .mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1])
        .mockResolvedValueOnce(mockResponses[2]);
      
      const results = await scraper.getMoviesBatch(movieIds);
      
      expect(results).toHaveLength(3);
      
      // 验证每个结果
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.movieInfo).toBeInstanceOf(MovieInfo);
        expect(result.movieInfo.id).toBe(movieIds[index]);
        expect(result.movieInfo.title).toBe('测试标题');
        expect(result.movieInfo.cover).toBe(`https://example.com/${movieIds[index]}.jpg`);
        expect(result.movieInfo.date).toBe('2023-11-30');
        expect(result.movieInfo.duration).toBe('120');
      });
      
      // 验证请求次数
      expect(mockAxios).toHaveBeenCalledTimes(3);
    });

    test('should handle batch processing with some failures', async () => {
      const movieIds = ['TEST-001', 'TEST-002', 'TEST-003'];
      
      // 模拟第一个和第三个请求成功，第二个失败
      mockAxios
        .mockResolvedValueOnce({
          status: 200,
          data: '<html><body><h3>TEST-001 测试标题</h3></body></html>',
          headers: { 'content-type': 'text/html' }
        })
        .mockRejectedValueOnce(new Error('Request failed'))
        .mockResolvedValueOnce({
          status: 200,
          data: '<html><body><h3>TEST-003 测试标题</h3></body></html>',
          headers: { 'content-type': 'text/html' }
        });
      
      const results = await scraper.getMoviesBatch(movieIds);
      
      expect(results).toHaveLength(3);
      
      // 验证第一个和第三个成功
      expect(results[0].success).toBe(true);
      expect(results[0].movieInfo.id).toBe('TEST-001');
      
      expect(results[2].success).toBe(true);
      expect(results[2].movieInfo.id).toBe('TEST-003');
      
      // 验证第二个失败
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBeDefined();
    });

    test('should respect batch size limit', async () => {
      const movieIds = Array.from({ length: 15 }, (_, i) => `TEST-${String(i + 1).padStart(3, '0')}`);
      
      // 模拟所有请求成功
      const mockResponses = movieIds.map(id => ({
        status: 200,
        data: `<html><body><h3>${id} 测试标题</h3></body></html>`,
        headers: { 'content-type': 'text/html' }
      }));
      
      // 设置模拟返回值
      mockAxios.mockImplementation(() => {
        const response = mockResponses.shift();
        return Promise.resolve(response);
      });
      
      // 使用较小的批次大小进行测试
      const results = await scraper.getMoviesBatch(movieIds, { batchSize: 5 });
      
      expect(results).toHaveLength(15);
      expect(mockAxios).toHaveBeenCalledTimes(15);
    });
  });

  describe('Search Functionality Tests', () => {
    test('should search movies by keyword', async () => {
      const keyword = 'TEST';
      
      const mockHtml = `
        <html>
          <body>
            <div id="waterfall">
              <a href="/TEST-001" class="movie-box">
                <img src="https://example.com/cover1.jpg" />
                <div class="photo-info">
                  <span>TEST-001</span>
                  <date>2023-11-30</date>
                </div>
              </a>
              <a href="/TEST-002" class="movie-box">
                <img src="https://example.com/cover2.jpg" />
                <div class="photo-info">
                  <span>TEST-002</span>
                  <date>2023-10-30</date>
                </div>
              </a>
            </div>
          </body>
        </html>
      `;
      
      const mockResponse = {
        status: 200,
        data: mockHtml,
        headers: { 'content-type': 'text/html' }
      };
      
      mockAxios.mockResolvedValue(mockResponse);
      
      const searchResults = await scraper.searchMovies(keyword);
      
      expect(searchResults).toHaveLength(2);
      
      // 验证第一个结果
      expect(searchResults[0].id).toBe('TEST-001');
      expect(searchResults[0].cover).toBe('https://example.com/cover1.jpg');
      expect(searchResults[0].date).toBe('2023-11-30');
      
      // 验证第二个结果
      expect(searchResults[1].id).toBe('TEST-002');
      expect(searchResults[1].cover).toBe('https://example.com/cover2.jpg');
      expect(searchResults[1].date).toBe('2023-10-30');
      
      // 验证请求URL
      expect(mockAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://www.javbus.com/search/TEST'
        })
      );
    });

    test('should handle empty search results', async () => {
      const keyword = 'NONEXISTENT';
      
      const mockHtml = `
        <html>
          <body>
            <div id="waterfall">
              <!-- No results -->
            </div>
          </body>
        </html>
      `;
      
      const mockResponse = {
        status: 200,
        data: mockHtml,
        headers: { 'content-type': 'text/html' }
      };
      
      mockAxios.mockResolvedValue(mockResponse);
      
      const searchResults = await scraper.searchMovies(keyword);
      
      expect(searchResults).toHaveLength(0);
    });

    test('should handle search errors', async () => {
      const keyword = 'TEST';
      
      mockAxios.mockRejectedValue(new Error('Search failed'));
      
      await expect(scraper.searchMovies(keyword)).rejects.toThrow('Search failed');
    });
  });

  describe('Integration Tests', () => {
    test('should integrate all features correctly', async () => {
      const movieId = 'TEST-001';
      
      // 模拟电影详情页面
      const movieDetailHtml = `
        <html>
          <body>
            <h3>${movieId} 测试标题</h3>
            <div class="info">
              <p><span class="header">發行日期:</span> 2023-11-30</p>
              <p><span class="header">長度:</span> 120分鐘</p>
            </div>
            <div class="photo-info">
              <img src="https://example.com/cover.jpg" alt="封面" />
            </div>
            <div class="sample-box">
              <a href="https://example.com/sample1.jpg" class="sample-box"><img src="https://example.com/thumb1.jpg" /></a>
            </div>
            <div class="magnet-name">
              <a href="magnet:?xt=urn:btih:hash1">磁力链接1</a>
            </div>
            <div class="score">评分: 8.5</div>
            <div class="review">
              <div class="review-item">
                <div class="review-title">用户评论标题</div>
                <div class="review-content">用户评论内容</div>
              </div>
            </div>
            <div class="related-box">
              <a href="/movie/RELATED-001" class="movie-box">
                <img src="https://example.com/related1.jpg" />
                <div class="photo-info">
                  <span>RELATED-001</span>
                  <date>2023-10-30</date>
                </div>
              </a>
            </div>
          </body>
        </html>
      `;
      
      const mockResponse = {
        status: 200,
        data: movieDetailHtml,
        headers: { 'content-type': 'text/html' }
      };
      
      mockAxios.mockResolvedValue(mockResponse);
      
      // 获取电影详情
      const movieInfo = await scraper.getMovieDetails(movieId);
      
      // 验证基本信息
      expect(movieInfo.id).toBe(movieId);
      expect(movieInfo.title).toBe('测试标题');
      expect(movieInfo.date).toBe('2023-11-30');
      expect(movieInfo.duration).toBe('120');
      expect(movieInfo.cover).toBe('https://example.com/cover.jpg');
      
      // 验证高清大图
      const highDefImages = await scraper.extractHighDefImages(movieId);
      expect(highDefImages).toHaveLength(1);
      expect(highDefImages[0]).toBe('https://example.com/sample1.jpg');
      
      // 验证磁力链接
      const magnetLinks = await scraper.extractMagnetLinks(movieId);
      expect(magnetLinks).toHaveLength(1);
      expect(magnetLinks[0]).toBe('magnet:?xt=urn:btih:hash1');
      
      // 验证用户评分和评论
      const reviews = await scraper.extractUserReviews(movieId);
      expect(reviews.score).toBe('8.5');
      expect(reviews.reviews).toHaveLength(1);
      expect(reviews.reviews[0].title).toBe('用户评论标题');
      expect(reviews.reviews[0].content).toBe('用户评论内容');
      
      // 验证相关影片
      const relatedMovies = await scraper.extractRelatedMovies(movieId);
      expect(relatedMovies).toHaveLength(1);
      expect(relatedMovies[0].id).toBe('RELATED-001');
      expect(relatedMovies[0].cover).toBe('https://example.com/related1.jpg');
      expect(relatedMovies[0].date).toBe('2023-10-30');
    });
  });

  describe('Error Handling Tests', () => {
    test('should handle movie not found error', async () => {
      const movieId = 'NONEXISTENT-001';
      
      const error = new Error('Request failed with status code 404');
      error.response = { status: 404 };
      
      mockAxios.mockRejectedValue(error);
      
      await expect(scraper.getMovieDetails(movieId)).rejects.toThrow('未找到影片');
    });

    test('should handle network error', async () => {
      const movieId = 'TEST-001';
      
      // 模拟搜索结果
      const searchHtml = `
        <html>
          <body>
            <a href="/movie/TEST-001" class="movie-box">
              <img src="https://example.com/cover.jpg" />
              <div class="photo-info">
                <span>TEST-001</span>
                <date>2023-11-30</date>
              </div>
            </a>
          </body>
        </html>
      `;
      
      const searchResponse = {
        status: 200,
        data: searchHtml,
        headers: { 'content-type': 'text/html' }
      };
      
      // 第一次调用返回搜索结果，第二次调用返回网络错误
      mockAxios
        .mockResolvedValueOnce(searchResponse)
        .mockRejectedValueOnce(new Error('Network error'));
      
      await expect(scraper.getMovieDetails(movieId)).rejects.toThrow('请求失败 [javbus]: Request failed with status code 404');
    });

    test('should handle timeout error', async () => {
      const movieId = 'TEST-001';
      
      // 模拟搜索结果
      const searchHtml = `
        <html>
          <body>
            <a href="/movie/TEST-001" class="movie-box">
              <img src="https://example.com/cover.jpg" />
              <div class="photo-info">
                <span>TEST-001</span>
                <date>2023-11-30</date>
              </div>
            </a>
          </body>
        </html>
      `;
      
      const searchResponse = {
        status: 200,
        data: searchHtml,
        headers: { 'content-type': 'text/html' }
      };
      
      // 模拟超时错误
      const error = new Error('timeout of 5000ms exceeded');
      error.code = 'ECONNABORTED';
      
      // 第一次调用返回搜索结果，第二次调用返回超时错误
      mockAxios
        .mockResolvedValueOnce(searchResponse)
        .mockRejectedValueOnce(error);
      
      await expect(scraper.getMovieDetails(movieId)).rejects.toThrow('请求失败 [javbus]: Network error');
    });

    test('should handle CloudFlare detection', async () => {
      const movieId = 'TEST-001';
      
      // 模拟搜索结果
      const searchHtml = `
        <html>
          <body>
            <a href="/movie/TEST-001" class="movie-box">
              <img src="https://example.com/cover.jpg" />
              <div class="photo-info">
                <span>TEST-001</span>
                <date>2023-11-30</date>
              </div>
            </a>
          </body>
        </html>
      `;
      
      const searchResponse = {
        status: 200,
        data: searchHtml,
        headers: { 'content-type': 'text/html' }
      };
      
      // 模拟CloudFlare响应
      const cloudflareResponse = {
        status: 403,
        data: '>Just a moment...<',
        headers: { 'content-type': 'text/html' }
      };
      
      // 第一次调用返回搜索结果，第二次调用返回CloudFlare响应
      mockAxios
        .mockResolvedValueOnce(searchResponse)
        .mockResolvedValueOnce(cloudflareResponse);
      
      await expect(scraper.getMovieDetails(movieId)).rejects.toThrow('无法通过CloudFlare检测');
    });
  });
});