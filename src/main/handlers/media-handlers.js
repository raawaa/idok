/**
 * 媒体相关的IPC处理器
 */

const { scanDirectories } = require('../services/media-service');
const { isPathSafe } = require('../services/file-service');

/**
 * 注册媒体相关的IPC处理器
 * @param {Electron.IpcMain} ipcMain - IPC主模块
 * @param {string} settingsPath - 设置文件路径
 * @param {Electron.BrowserWindow} mainWindow - 主窗口实例
 */
function registerMediaHandlers(ipcMain, settingsPath, mainWindow) {
    // 扫描目录处理器
    ipcMain.handle('scan-directory', async (event, directoryPaths) => {
        try {
            console.log('📁 收到扫描请求:', directoryPaths);

            // 验证输入
            if (!Array.isArray(directoryPaths)) {
                throw new Error('目录路径必须是数组');
            }

            // 清理和验证路径
            const cleanedPaths = directoryPaths
                .filter(path => typeof path === 'string' && path.trim() !== '')
                .map(path => path.trim())
                .filter(path => isPathSafe(path));

            if (cleanedPaths.length === 0) {
                return { success: false, error: '没有有效的目录路径' };
            }

            const mediaList = await scanDirectories(cleanedPaths);
            console.log(`✅ 扫描完成，找到 ${mediaList.length} 个媒体文件`);

            return { success: true, data: mediaList };
        } catch (error) {
            console.error('❌ 扫描失败:', error);
            return { success: false, error: error.message };
        }
    });

    // 打开视频处理器
    ipcMain.handle('open-video', async (event, videoPath) => {
        try {
            console.log('🎬 打开视频:', videoPath);

            // 验证视频路径
            if (typeof videoPath !== 'string' || videoPath.trim() === '') {
                throw new Error('视频路径无效');
            }

            // 安全检查
            if (!isPathSafe(videoPath)) {
                throw new Error('视频路径不安全');
            }

            const { shell } = require('electron');
            await shell.openPath(videoPath);
            return { success: true };
        } catch (error) {
            console.error('❌ 打开视频失败:', error);
            return { success: false, error: error.message };
        }
    });

    // 打开视频目录处理器
    ipcMain.handle('open-video-directory', async (event, videoPath) => {
        try {
            const path = require('path');
            const { shell } = require('electron');
            const directoryPath = path.dirname(videoPath);
            await shell.openPath(directoryPath);
            return { success: true };
        } catch (error) {
            console.error('❌ 打开目录失败:', error);
            return { success: false, error: error.message };
        }
    });
}

module.exports = {
    registerMediaHandlers
};