/**
 * 网络抓取模块入口文件
 * 导出所有抓取器和相关工具
 */

// 基础抓取器
const BaseScraper = require('./base-scraper');

// 具体网站抓取器
const JavBusScraper = require('./javbus-scraper');

// 管理器
const WebScraperManager = require('./web-scraper-manager');

// 工具函数
const { extractAvId, normalizeAvId, validateAvId } = require('./utils');

// 模型
const MovieInfo = require('./movie-info');

module.exports = {
  // 基础类
  BaseScraper,
  
  // 具体实现
  JavBusScraper,
  
  // 管理器
  WebScraperManager,
  
  // 工具函数
  utils: {
    extractAvId,
    normalizeAvId,
    validateAvId
  },
  
  // 模型
  MovieInfo
};