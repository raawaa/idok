const BaseScraper = require('./base-scraper');
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
      
      // 创建MovieInfo对象
      const movieInfo = new MovieInfo(avId);
      
      // 提取基本信息
      this.extractBasicInfo($, movieInfo);
      
      // 提取演员信息
      this.extractActressInfo($, movieInfo);
      
      // 提取分类信息
      this.extractGenreInfo($, movieInfo);
      
      // 提取制作信息
      this.extractProductionInfo($, movieInfo);
      
      // 提取图片信息
      this.extractImageInfo($, movieInfo);
      
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
      movieInfo.title = title;
      movieInfo.originalTitle = title;
    }

    // 番号（从URL或页面中提取）
    const avIdFromPage = $('.info p:contains("識別碼:")').next().text().trim();
    if (avIdFromPage) {
      movieInfo.avId = avIdFromPage;
    }

    // 发行日期
    const releaseDate = $('.info p:contains("發行日期:")').next().text().trim();
    if (releaseDate) {
      movieInfo.releaseDate = this.parseDate(releaseDate);
    }

    // 时长
    const runtime = $('.info p:contains("長度:")').next().text().trim();
    if (runtime) {
      movieInfo.runtime = this.parseRuntime(runtime);
      movieInfo.duration = movieInfo.runtime;
    }

    // 导演
    const director = $('.info p:contains("導演:")').next().text().trim();
    if (director && director !== 'N/A') {
      movieInfo.director = director;
    }

    // 评分
    const score = $('.score').text().trim();
    if (score) {
      movieInfo.score = this.parseScore(score);
    }
  }

  /**
   * 提取演员信息
   */
  extractActressInfo($, movieInfo) {
    const actressElements = $('.star-name a');
    const actressPics = {};
    
    actressElements.each((i, elem) => {
      const name = $(elem).text().trim();
      const avatarUrl = $(elem).find('img').attr('src') || $(elem).closest('.star-box').find('img').attr('src');
      
      if (name) {
        movieInfo.actress.push(name);
        if (avatarUrl) {
          actressPics[name] = avatarUrl;
        }
      }
    });

    if (Object.keys(actressPics).length > 0) {
      movieInfo.actressPics = actressPics;
    }
  }

  /**
   * 提取分类信息
   */
  extractGenreInfo($, movieInfo) {
    const genreElements = $('.genre a');
    
    genreElements.each((i, elem) => {
      const genreText = $(elem).text().trim();
      const genreUrl = $(elem).attr('href');
      
      if (genreText && genreText !== 'N/A') {
        movieInfo.genre.push(genreText);
        
        // 尝试标准化分类
        const normalizedGenre = this.genreMap[genreText] || genreText;
        if (normalizedGenre !== genreText) {
          movieInfo.genreNorm.push(normalizedGenre);
        }
        
        // 提取分类ID
        if (genreUrl) {
          const genreIdMatch = genreUrl.match(this.genreUrlPattern);
          if (genreIdMatch) {
            movieInfo.genreId.push(genreIdMatch[1]);
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
      movieInfo.studio = studio;
    }

    // 发行商
    const publisher = $('.info p:contains("發行商:")').next().text().trim();
    if (publisher && publisher !== 'N/A') {
      movieInfo.publisher = publisher;
    }

    // 系列
    const series = $('.info p:contains("系列:")').next().text().trim();
    if (series && series !== 'N/A') {
      movieInfo.series = series;
    }

    // 标签
    const label = $('.info p:contains("標籤:")').next().text().trim();
    if (label && label !== 'N/A') {
      movieInfo.label = label;
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
}

module.exports = JavBusScraper;