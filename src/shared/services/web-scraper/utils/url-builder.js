/**
 * URL构建工具模块
 * 提供URL处理和构建功能
 */

const { URL } = require('url');

class UrlBuilder {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * 检查URL是否有效
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
   * 构建完整URL
   */
  buildUrl(path, params = {}) {
    if (this.isValidUrl(path)) {
      return path;
    }

    const baseUrl = this.baseUrl.replace(/\/$/, '');
    const cleanPath = path.replace(/^\//, '');
    const url = `${baseUrl}/${cleanPath}`;

    if (Object.keys(params).length > 0) {
      const urlObj = new URL(url);
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          urlObj.searchParams.append(key, value);
        }
      });
      return urlObj.toString();
    }

    return url;
  }

  /**
   * 提取域名
   */
  extractDomain(url) {
    try {
      const { hostname } = new URL(url);
      return hostname;
    } catch (error) {
      return '';
    }
  }

  /**
   * 提取路径
   */
  extractPath(url) {
    try {
      const { pathname } = new URL(url);
      return pathname;
    } catch (error) {
      return '';
    }
  }

  /**
   * 提取查询参数
   */
  extractQueryParams(url) {
    try {
      const { searchParams } = new URL(url);
      const params = {};
      searchParams.forEach((value, key) => {
        params[key] = value;
      });
      return params;
    } catch (error) {
      return {};
    }
  }

  /**
   * 添加查询参数到URL
   */
  addQueryParams(url, params) {
    try {
      const urlObj = new URL(url);
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          urlObj.searchParams.append(key, value);
        }
      });
      return urlObj.toString();
    } catch (error) {
      return url;
    }
  }

  /**
   * 从URL中移除查询参数
   */
  removeQueryParams(url, paramsToRemove = []) {
    try {
      const urlObj = new URL(url);

      if (paramsToRemove.length > 0) {
        paramsToRemove.forEach(param => {
          urlObj.searchParams.delete(param);
        });
      } else {
        // 移除所有查询参数
        urlObj.search = '';
      }

      return urlObj.toString();
    } catch (error) {
      return url;
    }
  }

  /**
   * 规范化URL
   */
  normalizeUrl(url) {
    try {
      const urlObj = new URL(url);

      // 移除默认端口
      if ((urlObj.protocol === 'http:' && urlObj.port === '80') ||
          (urlObj.protocol === 'https:' && urlObj.port === '443')) {
        urlObj.port = '';
      }

      // 移除片段标识符
      urlObj.hash = '';

      // 确保路径以/结尾（对于根路径）
      if (urlObj.pathname === '' && urlObj.hostname) {
        urlObj.pathname = '/';
      }

      return urlObj.toString();
    } catch (error) {
      return url;
    }
  }

  /**
   * 生成相对URL
   */
  getRelativeUrl(url, baseUrl) {
    try {
      const urlObj = new URL(url);
      const baseUrlObj = new URL(baseUrl);

      // 只有当域名和协议相同时才能生成相对URL
      if (urlObj.hostname !== baseUrlObj.hostname ||
          urlObj.protocol !== baseUrlObj.protocol) {
        return url;
      }

      // 移除域名部分
      const relativePath = urlObj.pathname + urlObj.search + urlObj.hash;
      return relativePath;
    } catch (error) {
      return url;
    }
  }

  /**
   * 解析URL路径段
   */
  parsePathSegments(url) {
    try {
      const { pathname } = new URL(url);
      return pathname.split('/').filter(segment => segment.length > 0);
    } catch (error) {
      return [];
    }
  }

  /**
   * 检查URL是否匹配模式
   */
  matchesPattern(url, pattern) {
    try {
      const urlObj = new URL(url);
      const patternObj = new URL(pattern);

      // 检查协议和域名
      if (urlObj.protocol !== patternObj.protocol ||
          urlObj.hostname !== patternObj.hostname) {
        return false;
      }

      // 检查路径（支持通配符）
      const patternPath = patternObj.pathname.replace(/\*/g, '.*');
      const pathRegex = new RegExp(`^${patternPath}$`);
      return pathRegex.test(urlObj.pathname);
    } catch (error) {
      return false;
    }
  }

  /**
   * 从URL中提取文件名
   */
  extractFilename(url) {
    try {
      const { pathname } = new URL(url);
      const filename = pathname.split('/').pop();
      return filename || '';
    } catch (error) {
      return '';
    }
  }

  /**
   * 获取文件扩展名
   */
  getFileExtension(url) {
    const filename = this.extractFilename(url);
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.substring(lastDot + 1).toLowerCase() : '';
  }

  /**
   * 构建RESTful URL
   */
  buildRestUrl(resource, id = null, action = null, params = {}) {
    let path = `/${resource}`;

    if (id) {
      path += `/${id}`;
    }

    if (action) {
      path += `/${action}`;
    }

    return this.buildUrl(path, params);
  }

  /**
   * 创建API端点URL
   */
  createApiUrl(endpoint, version = 'v1', params = {}) {
    const path = `/api/${version}/${endpoint.replace(/^\//, '')}`;
    return this.buildUrl(path, params);
  }

  /**
   * 编码URL组件
   */
  encodeUrlComponent(component) {
    return encodeURIComponent(component);
  }

  /**
   * 解码URL组件
   */
  decodeUrlComponent(component) {
    try {
      return decodeURIComponent(component);
    } catch (error) {
      return component;
    }
  }

  /**
   * 构建带认证的URL
   */
  buildAuthenticatedUrl(path, authToken, params = {}) {
    const url = this.buildUrl(path, params);
    return this.addQueryParams(url, { token: authToken });
  }

  /**
   * 检查URL是否为同源
   */
  isSameOrigin(url1, url2) {
    try {
      const urlObj1 = new URL(url1);
      const urlObj2 = new URL(url2);

      return urlObj1.protocol === urlObj2.protocol &&
             urlObj1.hostname === urlObj2.hostname &&
             urlObj1.port === urlObj2.port;
    } catch (error) {
      return false;
    }
  }

  /**
   * 设置基础URL
   */
  setBaseUrl(baseUrl) {
    this.baseUrl = baseUrl;
  }

  /**
   * 获取基础URL
   */
  getBaseUrl() {
    return this.baseUrl;
  }
}

module.exports = {
  UrlBuilder
};