/**
 * Web Scraper工具函数
 * 提供番号识别、验证和标准化功能
 */

const AvIdValidator = require('./av-id-validator');

/**
 * 从文件名中提取AV番号
 * @param {string} fileName - 文件名或路径
 * @returns {string|null} - 提取的番号，失败返回null
 */
function extractAvId(fileName) {
  if (!fileName || typeof fileName !== 'string') {
    return null;
  }

  try {
    const validator = new AvIdValidator();

    // 首先尝试直接验证和标准化
    if (validator.validate(fileName)) {
      const normalized = validator.normalize(fileName);
      if (normalized) {
        return normalized;
      }
    }

    // 如果直接验证失败，使用模糊匹配提取番号
    const matches = validator.fuzzyMatch(fileName);

    if (matches.length > 0) {
      return matches[0]; // 返回第一个匹配的番号
    }

    return null;
  } catch (error) {
    console.error('番号提取出错:', error);
    return null;
  }
}

/**
 * 标准化AV番号格式
 * @param {string} avId - 原始番号
 * @returns {string|null} - 标准化后的番号，无效返回null
 */
function normalizeAvId(avId) {
  if (!avId || typeof avId !== 'string') {
    return null;
  }

  try {
    const validator = new AvIdValidator();
    return validator.normalize(avId);
  } catch (error) {
    console.error('番号标准化出错:', error);
    return null;
  }
}

/**
 * 验证AV番号格式是否有效
 * @param {string} avId - 番号字符串
 * @returns {boolean} - 是否有效
 */
function validateAvId(avId) {
  if (!avId || typeof avId !== 'string') {
    return false;
  }

  try {
    const validator = new AvIdValidator();
    return validator.validate(avId);
  } catch (error) {
    console.error('番号验证出错:', error);
    return false;
  }
}

/**
 * 从文件名中提取并标准化番号（便捷函数）
 * @param {string} fileName - 文件名或路径
 * @returns {string|null} - 标准化后的番号
 */
function extractAndNormalizeAvId(fileName) {
  const extractedId = extractAvId(fileName);
  if (extractedId) {
    return normalizeAvId(extractedId);
  }
  return null;
}

/**
 * 获取番号信息
 * @param {string} avId - 番号字符串
 * @returns {object|null} - 番号信息对象
 */
function getAvIdInfo(avId) {
  if (!avId || typeof avId !== 'string') {
    return null;
  }

  try {
    const validator = new AvIdValidator();
    return validator.extractInfo(avId);
  } catch (error) {
    console.error('获取番号信息出错:', error);
    return null;
  }
}

/**
 * 获取番号对应的厂商名称
 * @param {string} avId - 番号字符串
 * @returns {string|null} - 厂商名称
 */
function getStudio(avId) {
  if (!avId || typeof avId !== 'string') {
    return null;
  }

  try {
    const validator = new AvIdValidator();
    return validator.getStudio(avId);
  } catch (error) {
    console.error('获取厂商信息出错:', error);
    return null;
  }
}

/**
 * 判断两个番号是否相同
 * @param {string} avId1 - 第一个番号
 * @param {string} avId2 - 第二个番号
 * @returns {boolean} - 是否相同
 */
function isSameAvId(avId1, avId2) {
  try {
    const validator = new AvIdValidator();
    return validator.isSame(avId1, avId2);
  } catch (error) {
    console.error('番号比较出错:', error);
    return false;
  }
}

/**
 * 生成番号的搜索关键词
 * @param {string} avId - 番号字符串
 * @returns {Array} - 搜索关键词列表
 */
function generateSearchKeywords(avId) {
  if (!avId || typeof avId !== 'string') {
    return [];
  }

  try {
    const validator = new AvIdValidator();
    return validator.generateSearchKeywords(avId);
  } catch (error) {
    console.error('生成搜索关键词出错:', error);
    return [];
  }
}

/**
 * 批量从文件名中提取番号
 * @param {Array<string>} fileNames - 文件名数组
 * @returns {Array} - 提取结果数组 { fileName, avId, success }
 */
function batchExtractAvId(fileNames) {
  if (!Array.isArray(fileNames)) {
    return [];
  }

  const results = [];
  const validator = new AvIdValidator();

  fileNames.forEach(fileName => {
    try {
      const extractedIds = validator.fuzzyMatch(fileName);
      const success = extractedIds.length > 0;

      results.push({
        fileName,
        avId: success ? extractedIds[0] : null,
        allMatches: extractedIds,
        success
      });
    } catch (error) {
      console.error(`批量提取番号失败 (${fileName}):`, error);
      results.push({
        fileName,
        avId: null,
        allMatches: [],
        success: false,
        error: error.message
      });
    }
  });

  return results;
}

module.exports = {
  extractAvId,
  normalizeAvId,
  validateAvId,
  extractAndNormalizeAvId,
  getAvIdInfo,
  getStudio,
  isSameAvId,
  generateSearchKeywords,
  batchExtractAvId
};