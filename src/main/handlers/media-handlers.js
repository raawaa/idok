/**
 * 媒体相关的IPC处理器
 */

const { scanDirectories } = require('../services/media-service');
const { isPathSafe } = require('../services/file-service');
const fs = require('fs');
const path = require('path');
const os = require('os');

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

            const startTime = Date.now();
            const mediaList = await scanDirectories(cleanedPaths);
            const scanTime = Date.now() - startTime;
            console.log(`✅ 扫描完成，找到 ${mediaList.length} 个媒体文件，耗时 ${scanTime}ms`);

            return { success: true, data: mediaList, scanTime };
        } catch (error) {
            console.error('❌ 扫描失败:', error);
            return { success: false, error: error.message };
        }
    });

    // 打开视频处理器（单个视频）
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

            // 处理新的播放器设置格式
            let playerType = settings.playerType || 'system';
            let customPlayer = settings.customPlayer || '';
            
            // 兼容旧版本的defaultPlayer字段
            if (settings.defaultPlayer && !settings.playerType) {
                // 如果有旧的defaultPlayer但没有新的playerType，进行转换
                if (settings.defaultPlayer.includes('\\') || settings.defaultPlayer.includes('/')) {
                    playerType = 'custom';
                    customPlayer = settings.defaultPlayer;
                } else {
                    playerType = settings.defaultPlayer;
                    customPlayer = '';
                }
            }

            console.log(`🎬 播放器类型: ${playerType}`);
            if (playerType === 'custom') {
                console.log(`🎬 自定义播放器路径: ${customPlayer}`);
            }

            // 如果是系统默认播放器
            if (playerType === 'system') {
                console.log('🎬 使用系统默认播放器');
                const { shell } = require('electron');
                await shell.openPath(videoPath);
                return { success: true };
            }

            // 处理自定义播放器或预定义播放器
            let defaultPlayer = '';
            if (playerType === 'custom') {
                defaultPlayer = customPlayer;
            } else {
                // 预定义播放器
                defaultPlayer = playerType;
            }

            if (defaultPlayer && defaultPlayer.trim() !== '') {
                console.log('🎬 使用播放器:', defaultPlayer);

                // 处理播放器路径
                let playerPath = defaultPlayer;
                let foundValidPlayer = false;
                const { shell } = require('electron');

                // 检查是否为完整路径（自定义播放器）
                if (playerType === 'custom' && (defaultPlayer.includes('\\') || defaultPlayer.includes('/'))) {
                    // 用户选择的完整路径
                    if (fs.existsSync(defaultPlayer) && defaultPlayer.toLowerCase().endsWith('.exe')) {
                        playerPath = defaultPlayer;
                        foundValidPlayer = true;
                        console.log('✅ 找到自定义播放器:', playerPath);
                    } else {
                        console.log('⚠️ 自定义播放器路径无效:', defaultPlayer);
                        console.log('🔄 回退到系统默认播放器');
                        await shell.openPath(videoPath);
                        return { success: true };
                    }
                }
                // 预定义播放器名称
                else if (playerType !== 'custom' && process.platform === 'win32') {
                    const playerPaths = {
                        'vlc': [
                            'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe',
                            'C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe',
                            'C:\\Program Files\\VideoLAN\\VLC\\vlc.bat', // 批处理文件
                            'C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.bat'
                        ],
                        'mpv': [
                            'C:\\Program Files\\mpv\\mpv.exe',
                            'C:\\Program Files (x86)\\mpv\\mpv.exe',
                            'C:\\Program Files\\mpv-x86_64\\mpv.exe',
                            'C:\\Program Files (x86)\\mpv-x86_64\\mpv.exe',
                            'C:\\Users\\' + os.userInfo().username + '\\scoop\\apps\\mpv\\current\\mpv.exe',
                            'C:\\Users\\' + os.userInfo().username + '\\scoop\\apps\\mpv\\*\\mpv.exe',
                            'C:\\ProgramData\\chocolatey\\bin\\mpv.exe',
                            'C:\\ProgramData\\chocolatey\\lib\\mpv\\tools\\mpv.exe'
                        ],
                        'potplayer': [
                            'C:\\Program Files\\Daum\\PotPlayer\\PotPlayerMini64.exe',
                            'C:\\Program Files\\Daum\\PotPlayer\\PotPlayerMini.exe',
                            'C:\\Program Files (x86)\\Daum\\PotPlayer\\PotPlayerMini64.exe',
                            'C:\\Program Files (x86)\\Daum\\PotPlayer\\PotPlayerMini.exe',
                            'C:\\Program Files\\PotPlayer\\PotPlayerMini64.exe',
                            'C:\\Program Files (x86)\\PotPlayer\\PotPlayerMini64.exe'
                        ]
                    };

                    if (playerPaths[defaultPlayer]) {
                        console.log(`🔍 搜索播放器 "${defaultPlayer}" 的安装路径...`);

                        // 查找存在的播放器路径
                        for (const searchPath of playerPaths[defaultPlayer]) {
                            try {
                                // 处理通配符路径（scoop版本）
                                if (searchPath.includes('*')) {
                                    const pathParts = searchPath.split('*');
                                    const baseDir = pathParts[0];
                                    if (fs.existsSync(baseDir)) {
                                        const versions = fs.readdirSync(baseDir);
                                        for (const version of versions) {
                                            const versionPath = path.join(baseDir, version, pathParts[1] || 'mpv.exe');
                                            if (fs.existsSync(versionPath)) {
                                                playerPath = versionPath;
                                                foundValidPlayer = true;
                                                console.log('✅ 找到播放器:', playerPath);
                                                break;
                                            }
                                        }
                                    }
                                } else if (fs.existsSync(searchPath)) {
                                    playerPath = searchPath;
                                    foundValidPlayer = true;
                                    console.log('✅ 找到播放器:', playerPath);
                                    break;
                                }
                            } catch (err) {
                                continue;
                            }
                            if (foundValidPlayer) break;
                        }

                        // 如果找不到预定义播放器，尝试系统PATH
                        if (!foundValidPlayer) {
                            console.log('⚠️ 预定义播放器未找到，尝试通过系统PATH启动');
                            // 这里先不回退，继续尝试用spawn启动
                        }
                    }
                }

                // 使用自定义播放器
                return new Promise((resolve, reject) => {
                    console.log(`🚀 尝试启动播放器: "${playerPath}"`);

                    const playerProcess = spawn(playerPath, [videoPath], {
                        detached: true,
                        stdio: 'ignore',
                        windowsHide: true // Windows下隐藏控制台窗口
                    });

                    let processCompleted = false;

                    playerProcess.on('error', (error) => {
                        if (processCompleted) return;
                        processCompleted = true;

                        console.error('❌ 自定义播放器启动失败:', error.message);

                        // 如果是找不到文件错误，且有找到有效播放器但路径不对，给出更具体的错误信息
                        if (error.code === 'ENOENT' && foundValidPlayer) {
                            console.error(`❌ 播放器文件不存在: ${playerPath}`);
                        }

                        console.log('🔄 回退到系统默认播放器');
                        // 回退到系统默认播放器
                        shell.openPath(videoPath).then(() => {
                            resolve({ success: true });
                        }).catch((fallbackError) => {
                            reject(new Error(`无法启动播放器: ${error.message}，系统播放器也失败: ${fallbackError.message}`));
                        });
                    });

                    // 设置超时处理
                    const timeout = setTimeout(() => {
                        if (processCompleted) return;
                        processCompleted = true;

                        if (!playerProcess.killed) {
                            try {
                                playerProcess.kill();
                            } catch (killError) {
                                // 忽略杀死进程时的错误
                            }
                        }

                        console.log('⏰ 播放器启动超时 (8秒)，回退到系统默认播放器');
                        console.log(`🔍 尝试的播放器路径: ${playerPath}`);
                        console.log(`🔍 是否找到有效播放器: ${foundValidPlayer}`);

                        shell.openPath(videoPath).then(() => {
                            resolve({ success: true });
                        }).catch((fallbackError) => {
                            reject(new Error(`播放器启动超时，系统播放器也失败: ${fallbackError.message}`));
                        });
                    }, 8000); // 增加到8秒

                    playerProcess.on('spawn', () => {
                        if (processCompleted) return;
                        processCompleted = true;

                        clearTimeout(timeout); // 清除超时
                        console.log('✅ 自定义播放器启动成功');
                        // 不立即杀死进程，让它独立运行
                        playerProcess.unref();
                        resolve({ success: true });
                    });
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

    // 打开视频播放列表处理器（支持多个视频文件）
    ipcMain.handle('open-video-playlist', async (event, videoPaths) => {
        try {
            console.log('🎬 打开视频播放列表:', videoPaths);

            // 验证输入
            if (!Array.isArray(videoPaths) || videoPaths.length === 0) {
                throw new Error('视频路径列表无效');
            }

            // 验证所有路径
            for (const videoPath of videoPaths) {
                if (typeof videoPath !== 'string' || videoPath.trim() === '') {
                    throw new Error('视频路径无效');
                }
                if (!isPathSafe(videoPath)) {
                    throw new Error('视频路径不安全');
                }
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

            // 处理播放器设置
            let playerType = settings.playerType || 'system';
            let customPlayer = settings.customPlayer || '';
            
            // 兼容旧版本设置
            if (settings.defaultPlayer && !settings.playerType) {
                if (settings.defaultPlayer.includes('\\') || settings.defaultPlayer.includes('/')) {
                    playerType = 'custom';
                    customPlayer = settings.defaultPlayer;
                } else {
                    playerType = settings.defaultPlayer;
                    customPlayer = '';
                }
            }

            console.log(`🎬 播放器类型: ${playerType}`);

            // 如果是系统默认播放器，只能逐个打开
            if (playerType === 'system') {
                console.log('🎬 使用系统默认播放器，逐个打开视频');
                const { shell } = require('electron');
                for (const videoPath of videoPaths) {
                    await shell.openPath(videoPath);
                    // 添加小延迟，避免同时打开太多文件
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                return { success: true };
            }

            // 处理自定义播放器或预定义播放器
            let defaultPlayer = '';
            if (playerType === 'custom') {
                defaultPlayer = customPlayer;
            } else {
                defaultPlayer = playerType;
            }

            if (defaultPlayer && defaultPlayer.trim() !== '') {
                console.log('🎬 使用播放器:', defaultPlayer);

                // 获取播放器路径（复用现有逻辑）
                let playerPath = defaultPlayer;
                let foundValidPlayer = false;
                const { shell } = require('electron');

                // 检查自定义播放器路径
                if (playerType === 'custom' && (defaultPlayer.includes('\\') || defaultPlayer.includes('/'))) {
                    if (fs.existsSync(defaultPlayer) && defaultPlayer.toLowerCase().endsWith('.exe')) {
                        playerPath = defaultPlayer;
                        foundValidPlayer = true;
                        console.log('✅ 找到自定义播放器:', playerPath);
                    } else {
                        console.log('⚠️ 自定义播放器路径无效，回退到系统默认播放器');
                        for (const videoPath of videoPaths) {
                            await shell.openPath(videoPath);
                            await new Promise(resolve => setTimeout(resolve, 500));
                        }
                        return { success: true };
                    }
                }
                // 预定义播放器路径查找
                else if (playerType !== 'custom' && process.platform === 'win32') {
                    const playerPaths = {
                        'vlc': [
                            'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe',
                            'C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe',
                            'C:\\Program Files\\VideoLAN\\VLC\\vlc.bat',
                            'C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.bat'
                        ],
                        'mpv': [
                            'C:\\Program Files\\mpv\\mpv.exe',
                            'C:\\Program Files (x86)\\mpv\\mpv.exe',
                            'C:\\Program Files\\mpv-x86_64\\mpv.exe',
                            'C:\\Program Files (x86)\\mpv-x86_64\\mpv.exe',
                            'C:\\Users\\' + os.userInfo().username + '\\scoop\\apps\\mpv\\current\\mpv.exe',
                            'C:\\Users\\' + os.userInfo().username + '\\scoop\\apps\\mpv\\*\\mpv.exe',
                            'C:\\ProgramData\\chocolatey\\bin\\mpv.exe',
                            'C:\\ProgramData\\chocolatey\\lib\\mpv\\tools\\mpv.exe'
                        ],
                        'potplayer': [
                            'C:\\Program Files\\Daum\\PotPlayer\\PotPlayerMini64.exe',
                            'C:\\Program Files\\Daum\\PotPlayer\\PotPlayerMini.exe',
                            'C:\\Program Files (x86)\\Daum\\PotPlayer\\PotPlayerMini64.exe',
                            'C:\\Program Files (x86)\\Daum\\PotPlayer\\PotPlayerMini.exe',
                            'C:\\Program Files\\PotPlayer\\PotPlayerMini64.exe',
                            'C:\\Program Files (x86)\\PotPlayer\\PotPlayerMini64.exe'
                        ]
                    };

                    if (playerPaths[defaultPlayer]) {
                        console.log(`🔍 搜索播放器 "${defaultPlayer}" 的安装路径...`);
                        for (const searchPath of playerPaths[defaultPlayer]) {
                            try {
                                if (searchPath.includes('*')) {
                                    const pathParts = searchPath.split('*');
                                    const baseDir = pathParts[0];
                                    if (fs.existsSync(baseDir)) {
                                        const versions = fs.readdirSync(baseDir);
                                        for (const version of versions) {
                                            const versionPath = path.join(baseDir, version, pathParts[1] || 'mpv.exe');
                                            if (fs.existsSync(versionPath)) {
                                                playerPath = versionPath;
                                                foundValidPlayer = true;
                                                console.log('✅ 找到播放器:', playerPath);
                                                break;
                                            }
                                        }
                                    }
                                } else if (fs.existsSync(searchPath)) {
                                    playerPath = searchPath;
                                    foundValidPlayer = true;
                                    console.log('✅ 找到播放器:', playerPath);
                                    break;
                                }
                            } catch (err) {
                                continue;
                            }
                            if (foundValidPlayer) break;
                        }
                    }
                }

                // 根据不同播放器类型处理播放列表
                let args = [];
                
                if (defaultPlayer === 'vlc') {
                    // VLC 支持播放列表参数
                    console.log('🎬 VLC 播放列表模式');
                    args = ['--playlist-autostart'];
                    // VLC 可以一次性接收所有文件路径
                    args.push(...videoPaths);
                } else if (defaultPlayer === 'potplayer') {
                    // PotPlayer 播放列表模式
                    console.log('🎬 PotPlayer 播放列表模式');
                    // PotPlayer 支持多个文件参数
                    args.push(...videoPaths);
                } else if (defaultPlayer === 'mpv') {
                    // mpv 播放列表模式
                    console.log('🎬 mpv 播放列表模式');
                    // mpv 支持多个文件参数，会自动创建播放列表
                    args.push(...videoPaths);
                } else {
                    // 其他播放器，尝试一次性传入所有文件
                    console.log('🎬 通用播放器播放列表模式');
                    args.push(...videoPaths);
                }

                return new Promise((resolve, reject) => {
                    console.log(`🚀 尝试启动播放器: "${playerPath}"`);
                    console.log(`🚀 参数: ${args.join(' ')}`);

                    const playerProcess = spawn(playerPath, args, {
                        detached: true,
                        stdio: 'ignore',
                        windowsHide: true
                    });

                    let processCompleted = false;

                    playerProcess.on('error', (error) => {
                        if (processCompleted) return;
                        processCompleted = true;

                        console.error('❌ 播放器启动失败:', error.message);
                        console.log('🔄 回退到系统默认播放器，逐个打开');
                        
                        // 回退到系统默认播放器
                        const fallbackPromises = videoPaths.map(videoPath => 
                            shell.openPath(videoPath).then(() => 
                                new Promise(resolve => setTimeout(resolve, 500))
                            )
                        );
                        
                        Promise.all(fallbackPromises).then(() => {
                            resolve({ success: true });
                        }).catch((fallbackError) => {
                            reject(new Error(`无法启动播放器: ${error.message}，系统播放器也失败: ${fallbackError.message}`));
                        });
                    });

                    // 设置超时处理
                    const timeout = setTimeout(() => {
                        if (processCompleted) return;
                        processCompleted = true;

                        if (!playerProcess.killed) {
                            try {
                                playerProcess.kill();
                            } catch (killError) {
                                // 忽略杀死进程时的错误
                            }
                        }

                        console.log('⏰ 播放器启动超时 (10秒)，回退到系统默认播放器');
                        
                        // 回退到系统默认播放器
                        const fallbackPromises = videoPaths.map(videoPath => 
                            shell.openPath(videoPath).then(() => 
                                new Promise(resolve => setTimeout(resolve, 500))
                            )
                        );
                        
                        Promise.all(fallbackPromises).then(() => {
                            resolve({ success: true });
                        }).catch((fallbackError) => {
                            reject(new Error(`播放器启动超时，系统播放器也失败: ${fallbackError.message}`));
                        });
                    }, 10000); // 10秒超时

                    playerProcess.on('spawn', () => {
                        if (processCompleted) return;
                        processCompleted = true;

                        clearTimeout(timeout); // 清除超时
                        console.log('✅ 播放器启动成功，播放列表已加载');
                        // 不立即杀死进程，让它独立运行
                        playerProcess.unref();
                        resolve({ success: true });
                    });
                });
            } else {
                // 使用系统默认播放器，逐个打开
                console.log('🎬 使用系统默认播放器，逐个打开视频');
                const { shell } = require('electron');
                for (const videoPath of videoPaths) {
                    await shell.openPath(videoPath);
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                return { success: true };
            }
        } catch (error) {
            console.error('❌ 打开视频播放列表失败:', error);
            return { success: false, error: error.message };
        }
    });

} // 结束registerMediaHandlers函数

module.exports = {
    registerMediaHandlers
};