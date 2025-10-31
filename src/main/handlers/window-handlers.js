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
        const path = require('path');
        const { Menu, shell } = require('electron');
        const directoryPath = path.dirname(videoPath);
        const template = [
            {
                label: '在文件管理器中打开目录',
                click: () => {
                    shell.openPath(directoryPath).catch(err => {
                        console.error('打开目录失败:', err);
                    });
                }
            },
            { type: 'separator' },
            {
                label: '删除影片目录...',
                click: () => {
                    event.sender.send('confirm-delete', directoryPath);
                }
            }
        ];

        const menu = Menu.buildFromTemplate(template);
        menu.popup({ window: require('electron').BrowserWindow.fromWebContents(event.sender) });
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