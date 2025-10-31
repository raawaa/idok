/**
 * 文件操作服务
 */

const fs = require('fs');
const path = require('path');
const { DANGEROUS_PATH_PATTERNS } = require('../../shared/constants');

/**
 * 检查路径是否安全
 * @param {string} pathToCheck - 要检查的路径
 * @returns {boolean} 路径是否安全
 */
function isPathSafe(pathToCheck) {
    if (typeof pathToCheck !== 'string' || pathToCheck.trim() === '') {
        return false;
    }

    return !DANGEROUS_PATH_PATTERNS.some(pattern =>
        pathToCheck.toLowerCase().includes(pattern.toLowerCase())
    );
}

/**
 * 检查是否为视频文件
 * @param {string} fileName - 文件名
 * @returns {boolean} 是否为视频文件
 */
function isVideoFile(fileName) {
    const { VIDEO_EXTENSIONS } = require('../../shared/constants');
    const ext = path.extname(fileName).toLowerCase();
    return VIDEO_EXTENSIONS.includes(ext);
}

/**
 * 读取设置文件
 * @param {string} settingsPath - 设置文件路径
 * @returns {Promise<Object>} 设置对象
 */
async function readSettings(settingsPath) {
    try {
        const data = await fs.promises.readFile(settingsPath, 'utf-8');
        const settings = JSON.parse(data);

        // 验证设置
        if (!settings.directories || !Array.isArray(settings.directories)) {
            settings.directories = [];
        }

        return settings;
    } catch (error) {
        console.error('读取设置文件失败或文件不存在:', error);
        return { directories: [] }; // 默认设置
    }
}

/**
 * 保存设置文件
 * @param {string} settingsPath - 设置文件路径
 * @param {Object} settings - 设置对象
 * @returns {Promise<void>}
 */
async function saveSettings(settingsPath, settings) {
    try {
        // 验证设置
        if (!settings.directories || !Array.isArray(settings.directories)) {
            throw new Error('目录配置无效');
        }

        // 清理目录列表
        settings.directories = settings.directories
            .filter(dir => typeof dir === 'string' && dir.trim() !== '')
            .map(dir => dir.trim())
            .filter(dir => isPathSafe(dir));

        await fs.promises.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
        console.log('✅ 设置已保存');
    } catch (error) {
        console.error('❌ 保存设置失败:', error);
        throw error;
    }
}

/**
 * 查找封面图片
 * @param {string} directoryPath - 目录路径
 * @returns {Promise<string|null>} 封面图片路径或null
 */
async function findCoverImage(directoryPath) {
    const { COVER_NAMES } = require('../../shared/constants');

    for (const name of COVER_NAMES) {
        const coverPath = path.join(directoryPath, name);
        try {
            await fs.promises.access(coverPath, fs.constants.F_OK);
            return coverPath;
        } catch (error) {
            // 继续查找下一个
        }
    }

    return null;
}

module.exports = {
    isPathSafe,
    isVideoFile,
    readSettings,
    saveSettings,
    findCoverImage
};