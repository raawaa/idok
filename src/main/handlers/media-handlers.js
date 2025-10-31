/**
 * 媒体相关的IPC处理器
 */

const { scanDirectories } = require('../services/media-service');
const { isPathSafe } = require('../services/file-service');
const fs = require('fs');
const path = require('path');

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

            // 读取设置获取播放器配置
            const { spawn } = require('child_process');
            const path = require('path');
            const fs = require('fs');

            let settings = {};
            try {
                const settingsData = await fs.promises.readFile(settingsPath, 'utf-8');
                settings = JSON.parse(settingsData);
            } catch (error) {
                console.log('⚠️ 无法读取设置，使用默认播放器');
            }

            const defaultPlayer = settings.defaultPlayer || '';

            if (defaultPlayer && defaultPlayer.trim() !== '') {
                console.log('🎬 使用自定义播放器:', defaultPlayer);

                // 使用自定义播放器
                return new Promise((resolve, reject) => {
                    const playerProcess = spawn(defaultPlayer, [videoPath], {
                        detached: true,
                        stdio: 'ignore'
                    });

                    playerProcess.on('error', (error) => {
                        console.error('❌ 自定义播放器启动失败:', error);
                        reject(new Error(`无法启动播放器: ${error.message}`));
                    });

                    playerProcess.on('spawn', () => {
                        console.log('✅ 自定义播放器启动成功');
                        resolve({ success: true });
                    });

                    // 超时处理
                    setTimeout(() => {
                        if (!playerProcess.killed) {
                            playerProcess.kill();
                            reject(new Error('播放器启动超时'));
                        }
                    }, 5000);
                });
            } else {
                // 使用系统默认播放器
                console.log('🎬 使用系统默认播放器');
                const { shell } = require('electron');
                await shell.openPath(videoPath);
                return { success: true };
            }
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

    // 读取图片文件处理器
    ipcMain.handle('get-image-data', async (event, imagePath) => {
        try {
            // 验证文件路径
            if (!imagePath || typeof imagePath !== 'string') {
                throw new Error('无效的图片路径');
            }

            // 读取文件
            const imageBuffer = await fs.promises.readFile(imagePath);

            // 获取文件扩展名以确定MIME类型
            const ext = path.extname(imagePath).toLowerCase();
            let mimeType = 'image/jpeg'; // 默认MIME类型

            switch (ext) {
                case '.jpg':
                case '.jpeg':
                    mimeType = 'image/jpeg';
                    break;
                case '.png':
                    mimeType = 'image/png';
                    break;
                case '.gif':
                    mimeType = 'image/gif';
                    break;
                case '.bmp':
                    mimeType = 'image/bmp';
                    break;
                case '.webp':
                    mimeType = 'image/webp';
                    break;
            }

            // 转换为base64
            const base64Data = imageBuffer.toString('base64');
            const dataUrl = `data:${mimeType};base64,${base64Data}`;

            return {
                success: true,
                dataUrl: dataUrl,
                mimeType: mimeType
            };
        } catch (error) {
            console.error('❌ 读取图片失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    });
}

module.exports = {
    registerMediaHandlers
};