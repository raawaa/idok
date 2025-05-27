if (process.env.NODE_ENV === 'development') {
    try {
        require('electron-reloader')(module, {
            // 可选配置项
            // ignore: /[^src|dist]/
        });
    } catch (err) {
        console.error('Error reloading electron:', err);
    }
}

const { app, BrowserWindow, ipcMain, shell, Menu, MenuItem, dialog } = require('electron')
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js'); // 导入 xml2js

// 设置文件路径
const settingsPath = path.join(app.getPath('userData'), 'settings.json');

// 读取设置
async function readSettings() {
    try {
        const data = await fs.promises.readFile(settingsPath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        // 如果文件不存在或读取失败，返回默认设置
        console.error("读取设置文件时出错或文件不存在:", error);
        return { directories: [] }; // 默认设置：空目录列表
    }
}

// 保存设置
async function saveSettings(settings) {
    try {
        await fs.promises.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
        console.log("设置已保存到", settingsPath);
    } catch (error) {
        console.error("保存设置文件时出错:", error);
    }
}

// 辅助函数：判断是否是视频文件
function isVideoFile(fileName) {
  const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv']; // 可以根据需要添加更多视频格式
  const ext = path.extname(fileName).toLowerCase();
  return videoExtensions.includes(ext);
}

// 辅助函数：解析 nfo 文件
async function parseNfoFile(nfoPath) {
  try {
    const xml = await fs.promises.readFile(nfoPath, 'utf-8');
    const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: true }); // 设置 explicitArray: false 避免数组，ignoreAttrs: true 忽略属性
    const result = await parser.parseStringPromise(xml);

    const movieInfo = {
        title: path.basename(nfoPath, '.nfo'), // 默认使用文件名作为标题
        year: null,
        releaseDateFull: null, // 添加完整日期字段
        studio: null,
        actors: [],
        directors: [],
        genres: []
    };

    if (result.movie) {
        const movieNode = result.movie;
        if (movieNode.title) movieInfo.title = movieNode.title;
        if (movieNode.premiered) {
            movieInfo.year = movieNode.premiered.substring(0, 4); // 仍然保留年份字段，方便需要只显示年份的地方
            movieInfo.releaseDateFull = movieNode.premiered; // 添加完整日期字段
        }
        if (movieNode.studio) movieInfo.studio = movieNode.studio;

        // 处理演员列表
        if (movieNode.actor) {
            if (Array.isArray(movieNode.actor)) {
                movieInfo.actors = movieNode.actor.map(actor => actor.name).filter(name => name);
            } else if (movieNode.actor.name) {
                movieInfo.actors.push(movieNode.actor.name);
            }
        }

         // 处理导演列表 (Kodi NFO 中导演标签通常是 <director>)
        if (movieNode.director) {
            if (Array.isArray(movieNode.director)) {
                 movieInfo.directors = movieNode.director.map(director => director).filter(name => name); // director 标签下直接是名字
            } else {
                 movieInfo.directors.push(movieNode.director);
            }
        }


        // 处理类别列表
        if (movieNode.genre) {
             let genres = [];
             if (Array.isArray(movieNode.genre)) {
                genres = movieNode.genre.reduce((acc, genre) => {
                    // 按逗号分割，并去除首尾空格
                    const splitGenres = genre.split(',').map(g => g.trim()).filter(g => g);
                    return acc.concat(splitGenres);
                }, []);
            } else {
                 // 单个 genre 标签，同样按逗号分割处理
                 genres = movieNode.genre.split(',').map(g => g.trim()).filter(g => g);
            }
             // 使用 Set 去除重复类别
             movieInfo.genres = Array.from(new Set(genres));
        }
    }

    return movieInfo; // 返回包含更多信息的对象
  } catch (error) {
    console.error("解析 nfo 文件时出错:", nfoPath, error);
    return { // 解析失败时返回默认信息
        title: path.basename(nfoPath, '.nfo'),
        year: null,
        releaseDateFull: null, // 解析失败时也包含完整日期字段
        studio: null,
        actors: [],
        directors: [],
        genres: []
    };
  }
}

// 辅助函数：查找封面图片
async function findCoverImage(directoryPath) {
    const coverNames = ['folder.jpg', 'poster.jpg']; // 常见的封面文件名
    for (const name of coverNames) {
        const coverPath = path.join(directoryPath, name);
        try {
            await fs.promises.access(coverPath, fs.constants.F_OK);
            return coverPath; // 找到封面文件，返回路径
        } catch (error) {
            // 文件不存在或无权限，继续查找
        }
    }
    return null; // 未找到封面
}

// 辅助函数：读取图片并转换为 Base64
async function readImageAsBase64(imagePath) {
    try {
        const data = await fs.promises.readFile(imagePath);
        const base64Data = data.toString('base64');
        const ext = path.extname(imagePath).toLowerCase();
        let mimeType = 'image/jpeg'; // 默认 jpeg
        if (ext === '.png') {
            mimeType = 'image/png';
        } else if (ext === '.gif') {
            mimeType = 'image/gif';
        }
        return `data:${mimeType};base64,${base64Data}`;
    } catch (error) {
        console.error("读取图片文件时出错:", imagePath, error);
        return null;
    }
}

// 修改 scanDirectoryRecursive 使其返回找到的媒体信息
async function scanDirectoryRecursive(directoryPath) { // 不再接收 mediaList 参数
    let mediaList = []; // 在函数内部创建列表
    try {
        const files = await fs.promises.readdir(directoryPath, { withFileTypes: true });

        let videoFile = null;
        let nfoFile = null;

        const directoryPromises = []; // 用于存放子目录扫描的 Promise

        for (const dirent of files) {
            const fullPath = path.join(directoryPath, dirent.name);

            if (dirent.isDirectory()) {
                // 将子目录的扫描作为一个 Promise 添加到数组
                directoryPromises.push(scanDirectoryRecursive(fullPath));
            } else if (dirent.isFile()) {
                if (isVideoFile(dirent.name)) {
                    videoFile = fullPath;
                } else if (dirent.name.toLowerCase().endsWith('.nfo')) {
                    nfoFile = fullPath;
                }
            }
        }

        // 如果找到视频文件和 nfo 文件，处理当前目录作为一个影片文件夹
        if (videoFile && nfoFile) {
            const movieInfo = await parseNfoFile(nfoFile); // 调用修改后的解析函数
            const movieDirectory = path.dirname(nfoFile); // 影片目录是 nfo 文件所在的目录
            const coverImagePath = await findCoverImage(movieDirectory); // 查找封面图片路径在影片目录下
            let coverImageDataUrl = null;

            if (coverImagePath) {
                 coverImageDataUrl = await readImageAsBase64(coverImagePath); // 读取图片并转换为 Base64
            }

            mediaList.push({
                ...movieInfo,
                videoPath: videoFile,
                coverImageDataUrl: coverImageDataUrl
            });
        }

        // 等待所有子目录的扫描完成，并将结果合并到当前的 mediaList
        const subDirectoryMediaLists = await Promise.all(directoryPromises);
        subDirectoryMediaLists.forEach(list => {
            mediaList = mediaList.concat(list); // 合并子目录的结果
        });

    } catch (error) {
        console.error("扫描目录时出错:", directoryPath, error);
        // 发生错误时，返回当前已收集的部分结果（可能为空）
    }
    return mediaList; // 返回找到的媒体列表
}

// 修改 scan-directory IPC 处理程序，使用 Promise.all 并行处理根目录
ipcMain.handle('scan-directory', async (event, directoryPaths) => {
  let mediaList = [];
  if (directoryPaths && Array.isArray(directoryPaths)) {
      // 为每个根目录创建一个扫描 Promise
      const scanPromises = directoryPaths.map(dirPath => scanDirectoryRecursive(dirPath));
      // 并行执行所有根目录的扫描，并等待所有 Promise 完成
      const results = await Promise.all(scanPromises);
      // 合并所有根目录的扫描结果
      results.forEach(list => {
          mediaList = mediaList.concat(list);
      });
  }
  return mediaList;
});

ipcMain.on('open-video', (event, videoPath) => {
  shell.openPath(videoPath).catch(err => {
    console.error("打开视频文件时出错:", videoPath, err);
  });
});

// IPC handler to get settings
ipcMain.handle('get-settings', async () => {
    return readSettings();
});

// IPC handler to save settings
ipcMain.on('save-settings', async (event, settings) => {
    await saveSettings(settings);
    // 保存后可以通知主窗口重新加载数据
    const mainWindow = BrowserWindow.getAllWindows().find(win => win.getURL().includes('index.html'));
    if (mainWindow) {
        // mainWindow.reload(); // 或者发送一个特定的消息让主界面重新扫描
        mainWindow.webContents.send('settings-saved-and-rescan'); // 发送消息通知主界面重新扫描
    }
});

// IPC handler to open directory dialog
ipcMain.handle('open-directory-dialog', async (event) => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    return result;
});

// IPC handler for window controls
ipcMain.on('minimize-window', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
        focusedWindow.minimize();
    }
});

ipcMain.on('maximize-restore-window', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
        if (focusedWindow.isMaximized()) {
            focusedWindow.unmaximize();
        } else {
            focusedWindow.maximize();
        }
    }
});

ipcMain.on('close-window', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
        focusedWindow.close();
    }
});

function createWindow () {
    // 从 package.json 读取产品名称
    const packageJson = require('./package.json');
    const productName = packageJson.build.productName;

    // 创建浏览器窗口
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        title: productName, // 设置窗口标题为产品名称
        autoHideMenuBar: true, // 自动隐藏菜单栏
        frame: false, // 移除默认窗口框架
        titleBarStyle: 'hidden', // 隐藏 macOS 上的原生标题栏，内容会上移
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    })

    win.loadFile('index.html')
    // 在创建窗口时加载设置并开始扫描
    readSettings().then(settings => {
        if (settings && settings.directories && settings.directories.length > 0) {
            // 在 DOMContentLoaded 事件中触发扫描，确保 index.html 已加载
            win.webContents.on('did-finish-load', () => {
                win.webContents.send('start-initial-scan', settings.directories);
            });
        } else {
             // 如果没有设置目录，可以在界面上给用户提示
             console.log("没有配置影片目录，请在设置中添加。");
              win.webContents.on('did-finish-load', () => {
                   win.webContents.send('no-directories-configured');
              });
        }
    });
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC handler for context menu
ipcMain.on('show-context-menu', (event, videoPath) => {
    const directoryPath = path.dirname(videoPath);
    const template = [
        {
            label: '在文件管理器中打开目录',
            click: () => {
                shell.openPath(directoryPath).catch(err => {
                    console.error("打开目录时出错:", directoryPath, err);
                });
            }
        },
        {
            label: '删除影片目录...',
            click: async () => {
                // 发送 IPC 消息到渲染进程，显示确认模态框
                event.sender.send('confirm-delete', directoryPath);
            }
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    menu.popup({ window: BrowserWindow.fromWebContents(event.sender) });
});

// IPC handler for deleting directory after confirmation from renderer
ipcMain.on('delete-directory', async (event, directoryPath) => {
    try {
        await fs.promises.rm(directoryPath, { recursive: true, force: true });
        console.log("成功删除目录:", directoryPath);
        // 可以发送消息回渲染进程通知删除成功，以便更新列表
        event.sender.send('directory-deleted', directoryPath);
         // 删除后重新扫描，更新主界面
        readSettings().then(settings => {
             if (settings && settings.directories && settings.directories.length > 0) {
                 const mainWindow = BrowserWindow.getAllWindows().find(win => win.getURL().includes('index.html'));
                 if (mainWindow) {
                     mainWindow.webContents.send('start-initial-scan', settings.directories); // 通知主界面重新扫描
                 }
             }
         });

    } catch (err) {
        console.error("删除目录时出错:", directoryPath, err);
        // 可以发送消息回渲染进程通知删除失败
        event.sender.send('delete-failed', directoryPath, err.message);
    }
}); 