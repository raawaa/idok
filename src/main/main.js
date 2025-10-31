/**
 * 模块化主进程入口文件
 */

// 暂时禁用electron-reloader以避免重复初始化问题
// if (process.env.NODE_ENV === 'development') {
//     try {
//         require('electron-reloader')(module);
//     } catch (err) {
//         console.error('Error reloading electron:', err);
//     }
// }

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// 导入服务
const { readSettings } = require('./services/file-service');

// 导入处理器
const { registerSettingsHandlers } = require('./handlers/settings-handlers');
const { registerMediaHandlers } = require('./handlers/media-handlers');
const { registerWindowHandlers } = require('./handlers/window-handlers');

console.log('🚀 模块化主进程启动...');

// 读取版本信息
const packageJson = require('../../package.json');
const appVersion = packageJson.version;

// 设置文件路径
const settingsPath = path.join(app.getPath('userData'), 'settings.json');

// 全局变量
let mainWindow = null;

/**
 * 创建应用主窗口
 */
function createWindow() {
    console.log('📱 创建主窗口...', '当前窗口数量:', BrowserWindow.getAllWindows().length);

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        autoHideMenuBar: true,
        show: false
    });

    // 设置窗口标题
    mainWindow.setTitle(`${app.name} v${appVersion}`);

    // 加载应用页面
    mainWindow.loadFile(path.join(__dirname, '../../index.html')).then(() => {
        console.log('✅ 页面加载成功');

        // 发送应用信息到渲染进程
        mainWindow.webContents.send('app-info', {
            name: app.name,
            version: appVersion
        });

        // 初始化应用程序
        initializeApplication();
    }).catch(error => {
        console.error('❌ 页面加载失败:', error);
    });

    // 开发者工具 - 默认关闭
    // mainWindow.webContents.openDevTools();

    // 窗口事件处理
    setupWindowEvents(mainWindow);

    // 注册所有IPC处理器
    registerAllIpcHandlers();

    // 页面加载完成后显示窗口
    mainWindow.once('ready-to-show', () => {
        console.log('🖥️ 显示主窗口');
        mainWindow.show();
    });
}

/**
 * 设置窗口事件
 */
function setupWindowEvents(win) {
    win.on('maximize', () => {
        win.webContents.send('window-maximized', true);
    });

    win.on('unmaximize', () => {
        win.webContents.send('window-maximized', false);
    });

    win.on('closed', () => {
        mainWindow = null;
    });

    win.on('page-title-updated', (event, title) => {
        console.log('页面标题更新:', title);
    });
}

/**
 * 注册所有IPC处理器
 */
function registerAllIpcHandlers() {
    console.log('🔌 注册IPC处理器...');

    registerSettingsHandlers(ipcMain, settingsPath, mainWindow);
    registerMediaHandlers(ipcMain, settingsPath, mainWindow);
    registerWindowHandlers(ipcMain, mainWindow, settingsPath);

    console.log('✅ IPC处理器注册完成');
}

/**
 * 初始化应用程序
 */
async function initializeApplication() {
    try {
        console.log('⚙️ 初始化应用程序...');
        const settings = await readSettings(settingsPath);

        if (settings.directories && settings.directories.length > 0) {
            setTimeout(() => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    console.log('📤 发送初始扫描请求');
                    mainWindow.webContents.send('start-initial-scan', settings.directories);
                }
            }, 1000);
        } else {
            setTimeout(() => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    console.log('📤 发送无目录配置消息');
                    mainWindow.webContents.send('no-directories-configured');
                }
            }, 1000);
        }
    } catch (error) {
        console.error('❌ 初始化应用程序失败:', error);
    }
}

// 应用事件处理
app.whenReady().then(() => {
    console.log('🚀 应用准备就绪');
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        console.log('👋 应用即将退出');
        app.quit();
    }
});

console.log('✅ 模块化主进程脚本加载完成');