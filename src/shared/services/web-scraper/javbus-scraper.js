const { BaseScraper } = require('./base-scraper');
const MovieInfo = require('./movie-info');

/**
 * JavBus抓取器
 * 参考Python JavSP的javsp/web/javbus.py实现
 */
class JavBusScraper extends BaseScraper {
  constructor(options = {}) {
    super({
      name: 'javbus',
      baseUrl: 'https://www.javbus.com',
      searchUrl: 'https://www.javbus.com/search',
      ...options
    });

    // JavBus特定的配置
    this.searchUrl = 'https://www.javbus.com/search';
    this.movieUrlPattern = /\/([A-Z0-9-]+)$/;
    this.actressUrlPattern = /\/star\/([a-z0-9]+)$/;
    this.genreUrlPattern = /\/genre\/([a-z0-9]+)$/;
    
    // 分类映射
    this.genreMap = {
      '中文字幕': '中文字幕',
      '高清': '高清',
      '無碼': '无码',
      '制服': '制服',
      '學生': '学生',
      '人妻': '人妻',
      '女教師': '女教师',
      '護士': '护士',
      'OL': 'OL',
      '巨乳': '巨乳',
      '貧乳': '贫乳',
      '美乳': '美乳',
      '美臀': '美臀',
      '美腿': '美腿',
      '美脚': '美脚',
      '美少女': '美少女',
      '素人': '素人',
      '痴女': '痴女',
      'SM': 'SM',
      '凌辱': '凌辱',
      '強姦': '强奸',
      '輪姦': '轮奸',
      '肛交': '肛交',
      '口交': '口交',
      '顔射': '颜射',
      '中出': '中出',
      '潮吹': '潮吹',
      '手淫': '手淫',
      '玩具': '玩具',
      '角色扮演': '角色扮演',
      '戶外': '户外',
      '窺視': '窥视',
      '偷拍': '偷拍',
      '自拍': '自拍',
      '情侶': '情侣',
      '群交': '群交',
      '多P': '多P',
      '亂交': '乱交',
      '溫泉': '温泉',
      '按摩': '按摩',
      '內衣': '内衣',
      '制服誘惑': '制服诱惑',
      '女同': '女同',
      '男同': '男同',
      '變態': '变态',
      '痴漢': '痴汉',
      '鬼畜': '鬼畜',
      '殘忍': '残忍',
      '虐待': '虐待',
      '緊縛': '紧缚',
      '懸疑': '悬疑',
      '驚悚': '惊悚',
      '恐怖': '恐怖',
      '科幻': '科幻',
      '奇幻': '奇幻',
      '冒險': '冒险',
      '動作': '动作',
      '喜劇': '喜剧',
      '悲劇': '悲剧',
      '愛情': '爱情',
      '浪漫': '浪漫',
      '溫馨': '温馨',
      '感人': '感人',
      '勵志': '励志',
      '教育': '教育',
      '紀錄': '纪录',
      '寫真': '写真',
      '藝術': '艺术',
      '經典': '经典',
      '復古': '复古',
      '懷舊': '怀旧',
      '現代': '现代',
      '時尚': '时尚',
      '流行': '流行',
      '前衛': '前卫',
      '實驗': '实验',
      '創新': '创新',
      '獨特': '独特',
      '另類': '另类',
      '非主流': '非主流',
      '地下': '地下',
      '獨立': '独立',
      '業餘': '业余',
      '愛好者': '爱好者',
      '粉絲': '粉丝',
      '同人': '同人',
      '二次創作': '二次创作',
      '改編': '改编',
      '翻拍': '翻拍',
      '續集': '续集',
      '系列': '系列',
      '合集': '合集',
      '精選': '精选',
      '最佳': '最佳',
      '熱門': '热门',
      '最新': '最新',
      '推薦': '推荐',
      '必看': '必看',
      '經典重映': '经典重映',
      '修復': '修复',
      '重製': '重制',
      '高清修復': '高清修复',
      '數位修復': '数字修复',
      '重新發行': '重新发行'
    };
  }

  /**
   * 搜索番号
   */
  async search(avId) {
    try {
      const searchUrl = `${this.searchUrl}/${avId}`;
      const $ = await this.fetchHtml(searchUrl);
      
      // 检查是否直接跳转到详情页
      const currentUrl = $.html().match(/window\.location\.href\s*=\s*"([^"]+)"/);
      if (currentUrl) {
        return currentUrl[1];
      }

      // 检查搜索结果
      const firstResult = $('.movie-box').first().attr('href');
      if (firstResult) {
        return firstResult;
      }

      // 检查是否有完全匹配的结果
      const exactMatch = $(`a[href*="${avId}"]`).first().attr('href');
      if (exactMatch) {
        return exactMatch;
      }

      return null;
    } catch (error) {
      console.error(`[JavBus] 搜索失败 ${avId}:`, error.message);
      return null;
    }
  }

  /**
   * 抓取影片详情
   */
  async scrapeMovie(avId) {
    try {
      // 首先搜索番号
      const movieUrl = await this.search(avId);
      if (!movieUrl) {
        throw new Error(`番号 ${avId} 未找到`);
      }

      // 获取详情页
      const $ = await this.fetchHtml(movieUrl);
      
      // 使用HTML清理功能
      const cleaned$ = this.cleanHtml($);
      
      // 创建MovieInfo对象
      const movieInfo = new MovieInfo({ avId });
      
      // 提取基本信息
      this.extractBasicInfo(cleaned$, movieInfo);
      
      // 提取演员信息
      this.extractActressInfo(cleaned$, movieInfo);
      
      // 提取分类信息
      this.extractGenreInfo(cleaned$, movieInfo);
      
      // 提取制作信息
      this.extractProductionInfo(cleaned$, movieInfo);
      
      // 提取图片信息
    this.extractImageInfo(cleaned$, movieInfo);
    
    // 提取磁力链接
    this.extractMagnetLinks(cleaned$, movieInfo);
    
    // 提取用户评分和评论
    this.extractUserRating(cleaned$, movieInfo);
    this.extractReviews(cleaned$, movieInfo);
    
    // 提取相关影片推荐
    this.extractRelatedMovies(cleaned$, movieInfo);
    
    // 设置URL和抓取时间
    movieInfo.url = movieUrl;
    movieInfo.scrapedAt = new Date().toISOString();
    movieInfo.hasMetadata = true;

    return movieInfo;
    } catch (error) {
      console.error(`[JavBus] 抓取失败 ${avId}:`, error.message);
      throw error;
    }
  }

  /**
   * 提取基本信息
   */
  extractBasicInfo($, movieInfo) {
    // 标题
    const title = $('.container h3').text().trim();
    if (title) {
      movieInfo.title = this.advancedCleanText(title, { removeHtml: true });
      movieInfo.originalTitle = movieInfo.title;
    }

    // 番号（从URL或页面中提取）
    const avIdFromPage = $('.info p:contains("識別碼:")').next().text().trim();
    if (avIdFromPage) {
      movieInfo.avId = this.advancedCleanText(avIdFromPage, { removeHtml: true });
    }

    // 发行日期
    const releaseDate = $('.info p:contains("發行日期:")').next().text().trim();
    if (releaseDate) {
      const parsedDate = this.parseDate(releaseDate);
      if (parsedDate && typeof parsedDate.toISOString === 'function') {
        movieInfo.releaseDate = parsedDate.toISOString().split('T')[0];
      } else if (parsedDate) {
        // 如果parseDate返回的是字符串，直接使用
        movieInfo.releaseDate = parsedDate;
      }
    }

    // 时长
    const runtime = $('.info p:contains("長度:")').next().text().trim();
    if (runtime) {
      const duration = this.parseDuration(runtime);
      if (duration !== null) {
        movieInfo.runtime = duration;
        movieInfo.duration = duration;
      }
    }

    // 导演
    const director = $('.info p:contains("導演:")').next().text().trim();
    if (director && director !== 'N/A') {
      movieInfo.director = this.advancedCleanText(director, { removeHtml: true });
    }

    // 评分
    const score = $('.score').text().trim();
    if (score) {
      const scoreValue = this.extractNumber(score);
      if (scoreValue !== null) {
        movieInfo.score = scoreValue > 10 ? scoreValue / 10 : scoreValue;
      }
    }
  }

  /**
   * 提取演员信息（添加头像图片过滤）
   */
  extractActressInfo($, movieInfo) {
    const actressElements = $('.star-name a');
    const actressPics = {};
    
    actressElements.each((i, elem) => {
      const name = $(elem).text().trim();
      let avatarUrl = $(elem).find('img').attr('src') || $(elem).closest('.star-box').find('img').attr('src');
      
      if (name) {
        movieInfo.actress.push(this.advancedCleanText(name, { removeHtml: true }));
        
        // 头像图片过滤：略过默认的头像（参考Python版本的nowprinting.gif过滤）
        if (avatarUrl && !avatarUrl.endsWith('nowprinting.gif')) {
          actressPics[name] = avatarUrl;
        }
      }
    });

    if (Object.keys(actressPics).length > 0) {
      movieInfo.actressPics = actressPics;
    }
  }

  /**
   * 提取分类信息（添加无码影片检测）
   */
  extractGenreInfo($, movieInfo) {
    const genreElements = $('.genre a');
    
    genreElements.each((i, elem) => {
      const genreText = $(elem).text().trim();
      const genreUrl = $(elem).attr('href');
      
      if (genreText && genreText !== 'N/A') {
        movieInfo.genre.push(this.advancedCleanText(genreText, { removeHtml: true }));
        
        // 尝试标准化分类
        const normalizedGenre = this.genreMap[genreText] || genreText;
        if (normalizedGenre !== genreText) {
          movieInfo.genreNorm.push(normalizedGenre);
        }
        
        // 提取分类ID和无码影片检测（参考Python版本的uncensored检测）
        if (genreUrl) {
          const genreIdMatch = genreUrl.match(this.genreUrlPattern);
          if (genreIdMatch) {
            const genreId = genreIdMatch[1];
            movieInfo.genreId.push(genreId);
            
            // 无码影片检测：通过URL中的uncensored标识
            if (genreUrl.includes('uncensored')) {
              movieInfo.uncensored = true;
              movieInfo.genreId.push('uncensored-' + genreId);
            }
          }
        }
      }
    });
  }

  /**
   * 提取制作信息
   */
  extractProductionInfo($, movieInfo) {
    // 制作商
    const studio = $('.info p:contains("製作商:")').next().text().trim();
    if (studio && studio !== 'N/A') {
      movieInfo.studio = this.advancedCleanText(studio, { removeHtml: true });
    }

    // 发行商
    const publisher = $('.info p:contains("發行商:")').next().text().trim();
    if (publisher && publisher !== 'N/A') {
      movieInfo.publisher = this.advancedCleanText(publisher, { removeHtml: true });
    }

    // 系列
    const series = $('.info p:contains("系列:")').next().text().trim();
    if (series && series !== 'N/A') {
      movieInfo.series = this.advancedCleanText(series, { removeHtml: true });
    }

    // 标签
    const label = $('.info p:contains("標籤:")').next().text().trim();
    if (label && label !== 'N/A') {
      movieInfo.label = this.advancedCleanText(label, { removeHtml: true });
    }
  }

  /**
   * 提取图片信息
   */
  extractImageInfo($, movieInfo) {
    // 封面图
    const coverUrl = $('.bigImage img').attr('src');
    if (coverUrl) {
      movieInfo.cover = coverUrl;
    }

    // 预览图
    const previewPics = [];
    $('.sample-box img').each((i, elem) => {
      const picUrl = $(elem).attr('src');
      if (picUrl) {
        previewPics.push(picUrl);
      }
    });

    if (previewPics.length > 0) {
      movieInfo.previewPics = previewPics;
    }

    // 高清大图（如果有）
    const bigCoverUrl = $('.bigImage img').attr('data-original');
    if (bigCoverUrl) {
      movieInfo.bigCover = bigCoverUrl;
    } else if (coverUrl) {
      // 尝试从封面图生成高清图URL
      const hdUrl = coverUrl.replace(/covers/, 'thumbs').replace(/jpg$/, 'png');
      movieInfo.bigCover = hdUrl;
    }
  }

  /**
   * 提取磁力链接信息
   * @param {CheerioAPI} $ - Cheerio实例
   * @param {MovieInfo} movieInfo - 影片信息对象
   */
  extractMagnetLinks($, movieInfo) {
    const magnetLinks = [];
    
    // 尝试从不同位置提取磁力链接
    const possibleSelectors = [
      '.magnet-link a',
      '.download-link a[href^="magnet:"]',
      'a[href^="magnet:"]',
      '.torrent-link a',
      '.gdrive-link a'
    ];
    
    for (const selector of possibleSelectors) {
      $(selector).each((i, elem) => {
        const href = $(elem).attr('href');
        const text = $(elem).text().trim();
        
        if (href && href.startsWith('magnet:')) {
          magnetLinks.push({
            url: href,
            title: text || '磁力链接',
            type: 'magnet'
          });
        } else if (href && (href.includes('torrent') || href.includes('magnet'))) {
          // 可能是磁力链接或种子文件链接
          magnetLinks.push({
            url: href,
            title: text || '下载链接',
            type: href.includes('magnet') ? 'magnet' : 'torrent'
          });
        }
      });
    }
    
    if (magnetLinks.length > 0) {
      movieInfo.magnetLinks = magnetLinks;
    }
  }

  /**
   * 提取用户评分和评论
   * @param {CheerioAPI} $ - Cheerio实例
   * @param {MovieInfo} movieInfo - 影片信息对象
   */
  extractUserReviews($, movieInfo) {
    // 提取用户评分
    const userRating = this.extractUserRating($);
    if (userRating !== null) {
      movieInfo.userRating = userRating;
    }
    
    // 提取评论
    const reviews = this.extractReviews($);
    if (reviews.length > 0) {
      movieInfo.reviews = reviews;
    }
  }

  /**
   * 提取用户评分
   * @param {CheerioAPI} $ - Cheerio实例
   * @returns {number|null} 用户评分
   */
  extractUserRating($) {
    // 尝试从不同位置提取用户评分
    const ratingSelectors = [
      '.user-rating .score',
      '.rating .average',
      '.review-rating',
      '.user-score',
      '.community-rating'
    ];
    
    for (const selector of ratingSelectors) {
      const ratingText = $(selector).first().text().trim();
      const rating = this.extractNumber(ratingText);
      
      if (rating !== null) {
        // 如果评分是百分制，转换为10分制
        return rating > 10 ? rating / 10 : rating;
      }
    }
    
    return null;
  }

  /**
   * 提取评论
   * @param {CheerioAPI} $ - Cheerio实例
   * @returns {Array} 评论列表
   */
  extractReviews($) {
    const reviews = [];
    
    // 尝试从不同位置提取评论
    const reviewContainers = [
      '.review-item',
      '.comment-item',
      '.user-review',
      '.review-container'
    ];
    
    for (const container of reviewContainers) {
      $(container).each((i, elem) => {
        const $review = $(elem);
        
        // 提取评论标题
        const title = this.advancedCleanText(
          $review.find('.review-title, .comment-title, h3, h4').first().text(),
          { removeHtml: true }
        );
        
        // 提取评论内容
        const content = this.advancedCleanText(
          $review.find('.review-content, .comment-content, .review-text').first().text(),
          { removeHtml: true }
        );
        
        // 提取评论者
        const reviewer = this.advancedCleanText(
          $review.find('.reviewer, .user-name, .comment-author').first().text(),
          { removeHtml: true }
        );
        
        // 提取评论日期
        const dateText = $review.find('.review-date, .comment-date, .date').first().text().trim();
        const date = this.parseDate(dateText);
        
        // 提取评分
        const ratingText = $review.find('.rating, .score, .stars').first().text().trim();
        const rating = this.extractNumber(ratingText);
        
        if (content || title) {
          reviews.push({
            title: title || '',
            content: content || title || '',
            reviewer: reviewer || '匿名用户',
            date: date ? date.toISOString().split('T')[0] : null,
            rating: rating !== null ? (rating > 10 ? rating / 10 : rating) : null
          });
        }
      });
    }
    
    return reviews;
  }

  /**
   * 提取相关影片推荐
   * @param {CheerioAPI} $ - Cheerio实例
   * @param {MovieInfo} movieInfo - 影片信息对象
   */
  extractRelatedMovies($, movieInfo) {
    const relatedMovies = [];
    
    // 尝试从不同位置提取相关影片
    const relatedSelectors = [
      '.related-movies .movie-item',
      '.recommendations .movie-box',
      '.similar-movies .item',
      '.also-liked .movie-card',
      '.related .movie-item'
    ];
    
    for (const selector of relatedSelectors) {
      $(selector).each((i, elem) => {
        const $movie = $(elem);
        
        // 提取影片ID
        const link = $movie.find('a').first();
        const href = link.attr('href');
        let avid = null;
        
        if (href) {
          const avidMatch = href.match(/([A-Z]+-?\d+)/i);
          if (avidMatch) {
            avid = avidMatch[1].toUpperCase();
          }
        }
        
        // 提取标题
        const title = this.advancedCleanText(
          $movie.find('.title, .movie-title, a').first().text(),
          { removeHtml: true }
        );
        
        // 提取封面
        const cover = $movie.find('img').first().attr('src');
        
        // 提取评分
        const ratingText = $movie.find('.score, .rating').first().text().trim();
        const rating = this.extractNumber(ratingText);
        
        // 提取日期
        const dateText = $movie.find('.date, .release-date').first().text().trim();
        const date = this.parseDate(dateText);
        
        if (avid || title) {
          relatedMovies.push({
            avid: avid || '',
            title: title || '',
            cover: cover || '',
            rating: rating !== null ? (rating > 10 ? rating / 10 : rating) : null,
            date: date ? date.toISOString().split('T')[0] : null,
            url: href ? (href.startsWith('http') ? href : this.baseUrl + href) : ''
          });
        }
      });
    }
    
    if (relatedMovies.length > 0) {
      movieInfo.relatedMovies = relatedMovies;
    }
  }

  /**
   * 批量获取影片信息
   * @param {Array<string>} avids - 影片ID列表
   * @param {Object} options - 选项
   * @returns {Promise<Array<Object>>} 影片信息列表
   */
  async getMoviesBatch(avids, options = {}) {
    const { 
      concurrency = 3,           // 并发数
      delay = 1000,             // 请求间隔(毫秒)
      retryFailed = true,       // 是否重试失败的请求
      progressCallback = null   // 进度回调函数
    } = options;
    
    const results = [];
    const total = avids.length;
    let completed = 0;
    
    // 分批处理
    for (let i = 0; i < avids.length; i += concurrency) {
      const batch = avids.slice(i, i + concurrency);
      
      // 并发处理当前批次
      const batchPromises = batch.map(async (avid, index) => {
        try {
          const movieInfo = await this.getMovieDetails(avid);
          completed++;
          
          if (progressCallback) {
            progressCallback(completed, total, avid, movieInfo);
          }
          
          return { avid, success: true, data: movieInfo };
        } catch (error) {
          console.error(`[JavBus] 批量抓取失败 ${avid}:`, error.message);
          completed++;
          
          if (progressCallback) {
            progressCallback(completed, total, avid, null);
          }
          
          return { avid, success: false, error: error.message };
        }
      });
      
      // 等待当前批次完成
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // 添加延迟，避免请求过于频繁
      if (i + concurrency < avids.length && delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // 重试失败的请求
    if (retryFailed) {
      const failedItems = results.filter(item => !item.success);
      
      if (failedItems.length > 0) {
        console.log(`[JavBus] 重试 ${failedItems.length} 个失败的请求`);
        
        const retryOptions = {
          ...options,
          concurrency: Math.max(1, Math.floor(concurrency / 2)), // 降低并发数
          retryFailed: false // 避免无限重试
        };
        
        const retryResults = await this.getMoviesBatch(
          failedItems.map(item => item.avid),
          retryOptions
        );
        
        // 合并重试结果
        retryResults.forEach(retryItem => {
          const originalIndex = results.findIndex(item => item.avid === retryItem.avid);
          if (originalIndex !== -1) {
            results[originalIndex] = retryItem;
          }
        });
      }
    }
    
    return results;
  }

  /**
   * 搜索影片
   * @param {string} keyword - 搜索关键词
   * @param {Object} options - 搜索选项
   * @returns {Promise<Array<Object>>} 搜索结果
   */
  async searchMovies(keyword, options = {}) {
    const { 
      page = 1,                 // 页码
      limit = 20,               // 每页结果数
      sortBy = 'relevance',     // 排序方式: relevance, date, rating
      filters = {}              // 过滤条件: actress, genre, studio, etc.
    } = options;
    
    try {
      // 构建搜索URL
      let searchUrl = `${this.baseUrl}/search/${encodeURIComponent(keyword)}`;
      const queryParams = [];
      
      if (page > 1) queryParams.push(`page=${page}`);
      if (limit !== 20) queryParams.push(`limit=${limit}`);
      if (sortBy !== 'relevance') queryParams.push(`sort=${sortBy}`);
      
      // 添加过滤条件
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.push(`${key}=${encodeURIComponent(value)}`);
      });
      
      if (queryParams.length > 0) {
        searchUrl += '?' + queryParams.join('&');
      }
      
      // 获取搜索结果页面
      const html = await this.fetchHtml(searchUrl);
      const $ = cheerio.load(html);
      
      // 清理HTML
      const cleaned$ = this.cleanHtml($);
      
      const searchResults = [];
      
      // 提取搜索结果
      const movieSelectors = [
        '.movie-box',
        '.search-result .item',
        '.movie-item',
        '.result-item'
      ];
      
      for (const selector of movieSelectors) {
        cleaned$(selector).each((i, elem) => {
          if (searchResults.length >= limit) return false; // 限制结果数量
          
          const $movie = cleaned$(elem);
          
          // 提取影片ID
          const link = $movie.find('a').first();
          const href = link.attr('href');
          let avid = null;
          
          if (href) {
            const avidMatch = href.match(/([A-Z]+-?\d+)/i);
            if (avidMatch) {
              avid = avidMatch[1].toUpperCase();
            }
          }
          
          // 提取标题
          const title = this.advancedCleanText(
            $movie.find('.title, .movie-title, a').first().text(),
            { removeHtml: true }
          );
          
          // 提取封面
          const cover = $movie.find('img').first().attr('src');
          
          // 提取评分
          const ratingText = $movie.find('.score, .rating').first().text().trim();
          const rating = this.extractNumber(ratingText);
          
          // 提取日期
          const dateText = $movie.find('.date, .release-date').first().text().trim();
          const date = this.parseDate(dateText);
          
          // 提取演员
          const actressText = $movie.find('.actress, .star').first().text().trim();
          const actress = actressText ? actressText.split(/[,，]/).map(a => a.trim()) : [];
          
          // 提取标签
          const tagsText = $movie.find('.tag, .genre').first().text().trim();
          const tags = tagsText ? tagsText.split(/[,，\s]+/).map(t => t.trim()).filter(t => t) : [];
          
          if (avid || title) {
            searchResults.push({
              avid: avid || '',
              title: title || '',
              cover: cover || '',
              rating: rating !== null ? (rating > 10 ? rating / 10 : rating) : null,
              date: date ? date.toISOString().split('T')[0] : null,
              actress,
              tags,
              url: href ? (href.startsWith('http') ? href : this.baseUrl + href) : ''
            });
          }
        });
      }
      
      return searchResults;
    } catch (error) {
      console.error(`[JavBus] 搜索失败 "${keyword}":`, error.message);
      throw new Error(`搜索失败: ${error.message}`);
    }
  }

  /**
   * 解析日期
   */
  parseDate(dateStr) {
    if (!dateStr) return null;
    
    // 尝试多种日期格式
    const patterns = [
      /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
      /(\d{4})\/(\d{2})\/(\d{2})/, // YYYY/MM/DD
      /(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
      /(\d{2})\/(\d{2})\/(\d{4})/ // DD/MM/YYYY
    ];

    for (const pattern of patterns) {
      const match = dateStr.match(pattern);
      if (match) {
        if (pattern.source.includes('YYYY')) {
          return `${match[1]}-${match[2]}-${match[3]}`;
        } else {
          return `${match[3]}-${match[2]}-${match[1]}`;
        }
      }
    }

    return dateStr;
  }

  /**
   * 解析时长
   */
  parseRuntime(runtimeStr) {
    if (!runtimeStr) return null;
    
    // 提取分钟数
    const match = runtimeStr.match(/(\d+)\s*分/);
    if (match) {
      return parseInt(match[1], 10);
    }

    // 提取小时和分钟
    const hourMatch = runtimeStr.match(/(\d+)\s*小?時?\s*(\d*)\s*分?/);
    if (hourMatch) {
      const hours = parseInt(hourMatch[1], 10) || 0;
      const minutes = parseInt(hourMatch[2], 10) || 0;
      return hours * 60 + minutes;
    }

    return null;
  }

  /**
   * 解析评分
   */
  parseScore(scoreStr) {
    if (!scoreStr) return null;
    
    // 提取数字评分
    const match = scoreStr.match(/(\d+(?:\.\d+)?)/);
    if (match) {
      const score = parseFloat(match[1]);
      // 如果是百分制，转换为10分制
      if (score > 10) {
        return Math.round(score / 10 * 10) / 10;
      }
      return score;
    }

    return null;
  }

  /**
   * 获取站点状态
   */
  async getSiteStatus() {
    try {
      const status = await this.checkSiteAvailability();
      return {
        ...status,
        site: this.name,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        site: this.name,
        available: false,
        error: error.message,
        lastChecked: new Date().toISOString()
      };
    }
  }

  /**
   * 批量抓取（用于测试）
   */
  async scrapeBatch(avIds) {
    const results = [];
    
    for (const avId of avIds) {
      try {
        const movieInfo = await this.scrapeMovie(avId);
        results.push({ avId, success: true, data: movieInfo });
      } catch (error) {
        results.push({ avId, success: false, error: error.message });
      }
      
      // 添加延迟避免被封
      await this.randomDelay();
    }
    
    return results;
  }

  /**
   * 获取影片详情（别名方法）
   * @param {string} avId - 影片番号
   * @returns {Promise<MovieInfo>} 影片信息对象
   */
  async getMovieDetails(avId) {
    try {
      // 首先搜索番号
      const movieUrl = await this.search(avId);
      if (!movieUrl) {
        throw new Error(`番号 ${avId} 未找到`);
      }

      // 获取详情页
      const response = await this.request(movieUrl);
      
      // 检查是否被CloudFlare拦截
      if (response.status === 403 && response.data.includes('Just a moment...')) {
        throw new Error('无法通过CloudFlare检测');
      }
      
      // 检查是否找到影片
      if (response.status === 404) {
        throw new Error(`未找到影片: ${avId}`);
      }
      
      const $ = this.parseHtml(response.data);
      const cleaned$ = this.cleanHtml($);
      
      // 创建MovieInfo对象
      const movieInfo = new MovieInfo({ avId });
      
      // 提取基本信息
      this.extractBasicInfo(cleaned$, movieInfo);
      
      // 提取演员信息
      this.extractActressInfo(cleaned$, movieInfo);
      
      // 提取分类信息
      this.extractGenreInfo(cleaned$, movieInfo);
      
      // 提取制作信息
      this.extractProductionInfo(cleaned$, movieInfo);
      
      // 提取图片信息
      this.extractImageInfo(cleaned$, movieInfo);
      
      // 提取磁力链接
      this.extractMagnetLinks(cleaned$, movieInfo);
      
      // 提取用户评分和评论
      this.extractUserRating(cleaned$, movieInfo);
      this.extractReviews(cleaned$, movieInfo);
      
      // 提取相关影片推荐
      this.extractRelatedMovies(cleaned$, movieInfo);
      
      // 设置URL和抓取时间
      movieInfo.url = movieUrl;
      movieInfo.scrapedAt = new Date().toISOString();
      movieInfo.hasMetadata = true;

      return movieInfo;
    } catch (error) {
      console.error(`[JavBus] 获取影片详情失败 ${avId}:`, error.message);
      throw error;
    }
  }

  /**
   * 提取高清图片
   * @param {string} avId - 影片番号
   * @returns {Promise<Array<string>>} 高清图片URL列表
   */
  async extractHighDefImages(avId) {
    try {
      const movieUrl = await this.search(avId);
      if (!movieUrl) {
        throw new Error(`番号 ${avId} 未找到`);
      }

      const $ = await this.fetchHtml(movieUrl);
      const cleaned$ = this.cleanHtml($);
      
      const highDefImages = [];
      
      // 提取高清图片
      cleaned$('.sample-box a').each((i, elem) => {
        const href = cleaned$(elem).attr('href');
        if (href && href.match(/^https?:\/\//)) {
          highDefImages.push(href);
        }
      });
      
      return highDefImages;
    } catch (error) {
      console.error(`[JavBus] 提取高清图片失败 ${avId}:`, error.message);
      throw error;
    }
  }

  /**
   * 提取磁力链接
   * @param {string} avId - 影片番号
   * @returns {Promise<Array<string>>} 磁力链接列表
   */
  async extractMagnetLinks(avId) {
    try {
      const movieUrl = await this.search(avId);
      if (!movieUrl) {
        throw new Error(`番号 ${avId} 未找到`);
      }

      const $ = await this.fetchHtml(movieUrl);
      const cleaned$ = this.cleanHtml($);
      
      const magnetLinks = [];
      
      // 提取磁力链接
      cleaned$('.magnet-name a').each((i, elem) => {
        const href = cleaned$(elem).attr('href');
        if (href && href.startsWith('magnet:')) {
          magnetLinks.push(href);
        }
      });
      
      return magnetLinks;
    } catch (error) {
      console.error(`[JavBus] 提取磁力链接失败 ${avId}:`, error.message);
      throw error;
    }
  }

  /**
   * 提取用户评分和评论
   * @param {string} avId - 影片番号
   * @returns {Promise<Object>} 包含评分和评论的对象
   */
  async extractUserReviews(avId) {
    try {
      const movieUrl = await this.search(avId);
      if (!movieUrl) {
        throw new Error(`番号 ${avId} 未找到`);
      }

      const $ = await this.fetchHtml(movieUrl);
      const cleaned$ = this.cleanHtml($);
      
      // 提取评分
      let score = null;
      const scoreText = cleaned$('.score').text().trim();
      if (scoreText) {
        const scoreMatch = scoreText.match(/(\d+(?:\.\d+)?)/);
        if (scoreMatch) {
          score = scoreMatch[1];
        }
      }
      
      // 提取评论
      const reviews = [];
      
      cleaned$('.review-item').each((i, elem) => {
        const $review = cleaned$(elem);
        const title = this.advancedCleanText($review.find('.review-title').text(), { removeHtml: true });
        const content = this.advancedCleanText($review.find('.review-content').text(), { removeHtml: true });
        
        if (title || content) {
          reviews.push({ title, content });
        }
      });
      
      return { score, reviews };
    } catch (error) {
      console.error(`[JavBus] 提取用户评分和评论失败 ${avId}:`, error.message);
      throw error;
    }
  }

  /**
   * 提取相关影片
   * @param {string} avId - 影片番号
   * @returns {Promise<Array<Object>>} 相关影片列表
   */
  async extractRelatedMovies(avId) {
    try {
      const movieUrl = await this.search(avId);
      if (!movieUrl) {
        throw new Error(`番号 ${avId} 未找到`);
      }

      const $ = await this.fetchHtml(movieUrl);
      const cleaned$ = this.cleanHtml($);
      
      const relatedMovies = [];
      
      // 提取相关影片
      cleaned$('.related-box .movie-box').each((i, elem) => {
        const $movie = cleaned$(elem);
        
        // 提取影片ID
        const link = $movie.find('a').first();
        const href = link.attr('href');
        let id = null;
        
        if (href) {
          const idMatch = href.match(/\/([A-Z0-9-]+)$/);
          if (idMatch) {
            id = idMatch[1];
          }
        }
        
        // 提取封面
        const cover = $movie.find('img').first().attr('src');
        
        // 提取日期
        const dateText = $movie.find('date').first().text().trim();
        const date = this.parseDate(dateText);
        
        if (id) {
          relatedMovies.push({
            id,
            cover: cover || '',
            date: date || ''
          });
        }
      });
      
      return relatedMovies;
    } catch (error) {
      console.error(`[JavBus] 提取相关影片失败 ${avId}:`, error.message);
      throw error;
    }
  }

  /**
   * 搜索电影
   * @param {string} keyword - 搜索关键词
   * @returns {Promise<Array<Object>>} 搜索结果列表
   */
  async searchMovies(keyword) {
    try {
      const searchUrl = `${this.searchUrl}/${encodeURIComponent(keyword)}`;
      const $ = await this.fetchHtml(searchUrl);
      const cleaned$ = this.cleanHtml($);
      
      const searchResults = [];
      
      // 提取搜索结果
      cleaned$('.movie-box').each((i, elem) => {
        const $movie = cleaned$(elem);
        
        // 提取影片ID
        const link = $movie.find('a').first();
        const href = link.attr('href');
        let id = null;
        
        if (href) {
          const idMatch = href.match(/\/([A-Z0-9-]+)$/);
          if (idMatch) {
            id = idMatch[1];
          }
        }
        
        // 提取封面
        const cover = $movie.find('img').first().attr('src');
        
        // 提取日期
        const dateText = $movie.find('date').first().text().trim();
        const date = this.parseDate(dateText);
        
        if (id) {
          searchResults.push({
            id,
            cover: cover || '',
            date: date || ''
          });
        }
      });
      
      return searchResults;
    } catch (error) {
      console.error(`[JavBus] 搜索电影失败 "${keyword}":`, error.message);
      throw error;
    }
  }
}

module.exports = JavBusScraper;