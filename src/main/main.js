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

// 在引入electron之前设置缓存和环境配置
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
process.env.ELECTRON_ENABLE_LOGGING = 'true';

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

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
 * 清理缓存目录
 */
function clearCacheDirectory() {
    try {
        const cachePath = path.join(app.getPath('userData'), 'cache');
        if (fs.existsSync(cachePath)) {
            console.log('🧹 清理缓存目录...');
            fs.rmSync(cachePath, { recursive: true, force: true });
            console.log('✅ 缓存目录清理完成');
        }
    } catch (error) {
        console.warn('⚠️ 清理缓存目录失败:', error.message);
    }
}

/**
 * 创建应用主窗口
 */
function createWindow() {
    try {
        console.log('📱 创建主窗口...', '当前窗口数量:', BrowserWindow.getAllWindows().length);

        // 清理缓存目录以避免权限问题
        clearCacheDirectory();
        
        // 配置Electron缓存和GPU设置以避免常见错误
        app.setPath('cache', path.join(app.getPath('userData'), 'cache'));
        
        mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            minWidth: 800,
            minHeight: 600,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                // 禁用GPU加速以避免GPU缓存错误
                webgl: false,
                // 禁用平滑滚动以减少缓存问题
                smoothScrolling: false
            },
            autoHideMenuBar: true,
            show: false
        });

        console.log('✅ 主窗口创建成功');
    } catch (error) {
        console.error('❌ 创建主窗口失败:', error);
        // 重置mainWindow引用
        mainWindow = null;
        throw error;
    }

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
        try {
            console.log('🖥️ 显示主窗口');
            mainWindow.show();
            console.log('✅ 主窗口显示成功');
        } catch (error) {
            console.error('❌ 显示主窗口失败:', error);
            // 尝试重新创建窗口
            if (!mainWindow.isDestroyed()) {
                mainWindow.destroy();
            }
            createWindow();
        }
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

    win.on('close', (event) => {
        // 在macOS上，关闭窗口时隐藏而不是销毁，这样点击dock图标可以恢复
        // 但如果是应用退出事件（Cmd+Q），则允许关闭
        if (process.platform === 'darwin' && !app.isQuitting) {
            console.log('🍎 macOS平台，隐藏窗口而不是销毁');
            event.preventDefault();
            win.hide();
        }
    });

    win.on('closed', () => {
        console.log('🔚 窗口已销毁');
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
    
    // 添加额外的命令行参数来避免缓存问题
    app.commandLine.appendSwitch('disable-gpu');
    app.commandLine.appendSwitch('disable-software-rasterizer');
    app.commandLine.appendSwitch('disable-gpu-sandbox');
    app.commandLine.appendSwitch('disable-web-security');
    app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor');
    app.commandLine.appendSwitch('no-sandbox');
    
    createWindow();

    app.on('activate', () => {
        console.log('🖱️ Dock图标被点击，当前窗口数量:', BrowserWindow.getAllWindows().length);
        
        // 在macOS上，当用户点击dock图标时，如果没有可见窗口，则创建或恢复窗口
        const allWindows = BrowserWindow.getAllWindows();
        const visibleWindows = allWindows.filter(win => win.isVisible());
        
        if (allWindows.length === 0) {
            console.log('📱 没有窗口存在，创建新窗口');
            createWindow();
        } else if (visibleWindows.length === 0) {
            // 有窗口存在但都不可见，恢复主窗口
            console.log('🔍 恢复已存在但隐藏的窗口');
            if (mainWindow && !mainWindow.isDestroyed()) {
                try {
                    mainWindow.show();
                    mainWindow.focus();
                    console.log('✅ 主窗口已恢复并聚焦');
                } catch (error) {
                    console.error('❌ 恢复主窗口失败:', error);
                    createWindow();
                }
            } else {
                console.log('⚠️ 主窗口引用无效，创建新窗口');
                createWindow();
            }
        } else {
            // 有可见窗口，聚焦到最前面的窗口
            console.log('🎯 聚焦到现有可见窗口');
            visibleWindows[0].focus();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        console.log('👋 应用即将退出');
        app.quit();
    }
});

// 处理应用退出前的事件（Cmd+Q）
app.on('before-quit', () => {
    console.log('🚪 应用准备退出...');
    app.isQuitting = true;
});

console.log('✅ 模块化主进程脚本加载完成');