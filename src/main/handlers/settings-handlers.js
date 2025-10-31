/**
 * 设置相关的IPC处理器
 */

const { readSettings, saveSettings } = require('../services/file-service');

/**
 * 注册设置相关的IPC处理器
 * @param {Electron.IpcMain} ipcMain - IPC主模块
 * @param {string} settingsPath - 设置文件路径
 * @param {Electron.BrowserWindow} mainWindow - 主窗口实例
 */
function registerSettingsHandlers(ipcMain, settingsPath, mainWindow) {
    // 获取设置处理器
    ipcMain.handle('get-settings', async () => {
        try {
            const settings = await readSettings(settingsPath);
            return { success: true, data: settings };
        } catch (error) {
            console.error('❌ 获取设置失败:', error);
            return { success: false, error: error.message };
        }
    });

    // 保存设置处理器
    ipcMain.handle('save-settings', async (event, settings) => {
        try {
            await saveSettings(settingsPath, settings);

            // 通知主窗口重新加载数据
            if (mainWindow) {
                mainWindow.webContents.send('settings-saved-and-rescan');
            }

            return { success: true };
        } catch (error) {
            console.error('❌ 保存设置失败:', error);
            return { success: false, error: error.message };
        }
    });

    // 打开目录选择对话框处理器
    ipcMain.handle('open-directory-dialog', async () => {
        try {
            console.log('📂 打开目录选择对话框');
            const { dialog } = require('electron');
            const result = await dialog.showOpenDialog(mainWindow, {
                properties: ['openDirectory'],
                title: '选择媒体库目录'
            });
            console.log('📂 目录选择结果:', result);
            return result;
        } catch (error) {
            console.error('❌ 打开目录对话框失败:', error);
            throw error;
        }
    });

    // 打开播放器选择对话框处理器
    ipcMain.handle('open-player-dialog', async () => {
        try {
            console.log('🎬 打开播放器选择对话框');
            const { dialog } = require('electron');
            const result = await dialog.showOpenDialog(mainWindow, {
                properties: ['openFile'],
                filters: [
                    { name: '应用程序', extensions: ['exe', 'app'] },
                    { name: '所有文件', extensions: ['*'] }
                ],
                title: '选择播放器程序'
            });
            console.log('🎬 播放器选择结果:', result);
            return result;
        } catch (error) {
            console.error('❌ 打开播放器对话框失败:', error);
            throw error;
        }
    });
}

module.exports = {
    registerSettingsHandlers
};