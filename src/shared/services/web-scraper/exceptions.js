/**
 * 网页抓取相关的异常基类
 * 参考Python JavSP的web/exceptions.py实现
 */

class CrawlerError extends Error {
  constructor(message, module = null, avId = null) {
    super(message);
    this.name = 'CrawlerError';
    this.module = module;
    this.avId = avId;
  }
}

/**
 * 影片未找到异常
 */
class MovieNotFoundError extends CrawlerError {
  constructor(module, avId) {
    super(`${module}: 未找到影片: '${avId}'`, module, avId);
    this.name = 'MovieNotFoundError';
  }
}

/**
 * 影片重复异常
 */
class MovieDuplicateError extends CrawlerError {
  constructor(module, avId, dupCount) {
    super(`${module}: '${avId}': 存在${dupCount}个完全匹配目标番号的搜索结果`, module, avId);
    this.name = 'MovieDuplicateError';
    this.dupCount = dupCount;
  }
}

/**
 * 站点封锁异常
 */
class SiteBlocked extends CrawlerError {
  constructor(message = '由于IP段或者触发反爬机制等原因导致用户被站点封锁', module = null, avId = null) {
    super(message, module, avId);
    this.name = 'SiteBlocked';
  }
}

/**
 * 站点权限异常
 */
class SitePermissionError extends CrawlerError {
  constructor(message = '由于缺少权限而无法访问影片资源', module = null, avId = null) {
    super(message, module, avId);
    this.name = 'SitePermissionError';
  }
}

/**
 * 凭据异常
 */
class CredentialError extends CrawlerError {
  constructor(message = '由于缺少Cookies等凭据而无法访问影片资源', module = null, avId = null) {
    super(message, module, avId);
    this.name = 'CredentialError';
  }
}

/**
 * 网站错误异常
 */
class WebsiteError extends CrawlerError {
  constructor(message = '非预期的状态码等网页故障', module = null, avId = null, statusCode = null) {
    super(message, module, avId);
    this.name = 'WebsiteError';
    this.statusCode = statusCode;
  }
}

/**
 * 其他未分类异常
 */
class OtherError extends CrawlerError {
  constructor(message = '其他尚未分类的错误', module = null, avId = null) {
    super(message, module, avId);
    this.name = 'OtherError';
  }
}

module.exports = {
  CrawlerError,
  NetworkError: WebsiteError,
  TimeoutError: WebsiteError,
  NotFoundError: MovieNotFoundError,
  AccessDeniedError: SitePermissionError,
  ServerError: WebsiteError,
  SiteBlockedError: SiteBlocked,
  CloudflareError: SiteBlocked,
  MovieNotFoundError,
  MovieDuplicateError,
  SitePermissionError,
  CredentialError,
  WebsiteError,
  OtherError
};