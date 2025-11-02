/**
 * 窗口相关的IPC处理器
 */

/**
 * 注册窗口相关的IPC处理器
 * @param {Electron.IpcMain} ipcMain - IPC主模块
 * @param {Electron.BrowserWindow} mainWindow - 主窗口实例
 * @param {string} settingsPath - 设置文件路径
 */
function registerWindowHandlers(ipcMain, mainWindow, settingsPath) {
    // 注意：窗口控制处理器已移除，现在使用系统默认标题栏

    // 右键菜单处理器
    ipcMain.on('show-context-menu', (event, videoPath) => {
        try {
            console.log('📋 处理右键菜单请求，视频路径:', videoPath);

            if (!videoPath) {
                console.error('❌ 视频路径为空');
                return;
            }

            const path = require('path');
            const { Menu, shell } = require('electron');

            // 确保路径是有效的绝对路径
            let normalizedPath = videoPath;

            // 如果是相对路径，转换为绝对路径（这种情况不应该发生，但作为安全措施）
            if (!path.isAbsolute(normalizedPath)) {
                console.warn('⚠️ 收到相对路径，尝试转换为绝对路径:', normalizedPath);
                // 这里我们无法安全地将相对路径转换为绝对路径，因为缺少基础路径
                // 所以我们记录错误并返回
                console.error('❌ 无法处理相对路径:', normalizedPath);
                return;
            }

            const directoryPath = path.dirname(normalizedPath);
            console.log('📂 提取的目录路径:', directoryPath);

            const template = [
                {
                    label: '在文件管理器中打开目录',
                    click: () => {
                        console.log('📂 打开文件管理器:', directoryPath);
                        shell.openPath(directoryPath).catch(err => {
                            console.error('❌ 打开目录失败:', err);
                            // 可以在这里发送错误消息到渲染进程
                            event.sender.send('show-error', `无法打开目录: ${directoryPath}`);
                        });
                    }
                },
                { type: 'separator' },
                {
                    label: '删除影片目录...',
                    click: () => {
                        console.log('🗑️ 发送删除确认请求:', directoryPath);
                        event.sender.send('confirm-delete', directoryPath);
                    }
                }
            ];

            const menu = Menu.buildFromTemplate(template);
            const browserWindow = require('electron').BrowserWindow.fromWebContents(event.sender);
            menu.popup({ window: browserWindow });

        } catch (error) {
            console.error('❌ 右键菜单处理失败:', error);
        }
    });

    // 删除目录处理器
    ipcMain.on('delete-directory', async (event, directoryPath) => {
        try {
            console.log('🗑️ 删除目录:', directoryPath);
            const { isPathSafe } = require('../services/file-service');
            const { readSettings } = require('../services/file-service');

            // 安全检查
            if (!isPathSafe(directoryPath)) {
                throw new Error('目录路径不安全');
            }

            const { shell } = require('electron');
            await shell.trashItem(directoryPath);
            console.log('✅ 目录已移至回收站');

            // 发送删除成功消息
            event.sender.send('directory-trashed', directoryPath);

            // 重新扫描
            const settings = await readSettings(settingsPath);
            if (settings.directories && settings.directories.length > 0) {
                if (mainWindow) {
                    mainWindow.webContents.send('start-initial-scan', settings.directories);
                }
            } else {
                if (mainWindow) {
                    mainWindow.webContents.send('no-directories-configured');
                }
            }

        } catch (error) {
            console.error('❌ 删除目录失败:', error);
            event.sender.send('trash-failed', directoryPath, error.message);
        }
    });
}

module.exports = {
    registerWindowHandlers
};