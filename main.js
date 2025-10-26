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

const { app, BrowserWindow, ipcMain, shell, Menu, MenuItem, dialog } = require('electron');
const packageJson = require('./package.json');
const appVersion = packageJson.version;
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js'); // 导入 xml2js
const url = require('url'); // 导入 url 模块
const { exec } = require('child_process'); // 导入 child_process 模块用于执行系统命令

// 设置文件路径
const settingsPath = path.join(app.getPath('userData'), 'settings.json');

// 定义常见播放器列表
const commonPlayers = {
  'win32': [
    { name: 'VLC Media Player', executable: 'vlc.exe' },
    { name: 'PotPlayer', executable: 'PotPlayerMini.exe' },
    { name: 'PotPlayer64', executable: 'PotPlayerMini64.exe'},
    { name: 'Windows Media Player', executable: 'wmplayer.exe' },
    { name: 'MPC-HC', executable: 'mpc-hc.exe' },
    { name: 'MPC-HC64', executable: 'mpc-hc64.exe' },
    { name: 'MPC-BE', executable: 'mpc-be.exe' },
    { name: 'MPC-BE64', executable: 'mpc-be64.exe' },
    { name: 'KMPlayer', executable: 'KMPlayer.exe' },
    { name: 'GOM Player', executable: 'GOM.exe' },
    { name: 'Daum PotPlayer', executable: 'PotPlayer.exe' },
    { name: 'Zoom Player', executable: 'zplayer.exe' },
    { name: 'mpv', executable: 'mpv.exe'},
    { name: '5KPlayer', executable: '5KPlayer.exe' },
    { name: 'BSPlayer', executable: 'bsplayer.exe' },
    { name: 'DivX Player', executable: 'DivX Player.exe' }
  ],
  'darwin': [ // macOS
    { name: 'VLC Media Player', executable: 'VLC' },
    { name: 'QuickTime Player', executable: 'QuickTime Player' },
    { name: 'IINA', executable: 'IINA' },
    { name: 'MPlayerX', executable: 'MPlayerX' }
  ],
  'linux': [
    { name: 'VLC Media Player', executable: 'vlc' },
    { name: 'SMPlayer', executable: 'smplayer' },
    { name: 'MPV', executable: 'mpv' },
    { name: 'MPlayer', executable: 'mplayer' },
    { name: 'Totem', executable: 'totem' },
    { name: 'GNOME MPV', executable: 'gnome-mpv' }
  ]
};

// 获取当前系统的播放器列表
function getSystemPlayers() {
  const platform = process.platform;
  console.log(`当前系统平台: ${platform}`);
  const players = commonPlayers[platform] || [];
  console.log(`平台对应的播放器列表:`, players);
  return players;
}

// 检测系统中已安装的播放器
async function detectInstalledPlayers() {
  console.log('开始检测系统播放器...');
  const systemPlayers = getSystemPlayers();
  console.log('系统播放器列表:', systemPlayers);
  const installedPlayers = [];
  
  // 添加系统默认播放器选项
  installedPlayers.push({ name: '系统默认播放器', executable: '', path: '' });
  console.log('已添加系统默认播放器选项');
  
  // 检查是否有自定义播放器
  try {
    const settings = await readSettings();
    if (settings.customPlayer && settings.customPlayer.path) {
      // 添加自定义播放器
      const customPlayer = {
        name: settings.customPlayer.name || '自定义播放器',
        executable: path.basename(settings.customPlayer.path),
        path: settings.customPlayer.path
      };
      installedPlayers.push(customPlayer);
      console.log(`已添加自定义播放器: ${customPlayer.name} (${customPlayer.path})`);
    }
  } catch (error) {
    console.error('读取自定义播放器设置时出错:', error);
  }
  
  for (const player of systemPlayers) {
    try {
      console.log(`正在检测播放器: ${player.name} (${player.executable})`);
      // 检查播放器是否已安装
      const isInstalled = await checkPlayerInstalled(player);
      console.log(`播放器 ${player.name} 检测结果:`, isInstalled);
      if (isInstalled) {
        installedPlayers.push(player);
        console.log(`已添加播放器: ${player.name}`);
      }
    } catch (error) {
      console.error(`检测播放器 ${player.name} 时出错:`, error);
    }
  }
  
  console.log('最终检测到的播放器列表:', installedPlayers);
  return installedPlayers;
}

// 检查播放器是否已安装
function checkPlayerInstalled(player) {
  return new Promise((resolve) => {
    const platform = process.platform;
    console.log(`检查播放器平台: ${platform}`);
    
    if (platform === 'win32') {
      // Windows系统检查 - 使用fs.access检查程序文件是否存在
      console.log(`Windows系统检查播放器: ${player.executable}`);
      
      // 常见的播放器安装路径
      const commonPaths = [
        // 标准安装路径 (使用环境变量替代硬编码)
        `${process.env.PROGRAMFILES}\\${player.name}\\${player.executable}`,
        `${process.env['PROGRAMFILES(X86)']}\\${player.name}\\${player.executable}`,
        
        // VLC特殊路径
        `${process.env.PROGRAMFILES}\\VideoLAN\\VLC\\${player.executable}`,
        `${process.env['PROGRAMFILES(X86)']}\\VideoLAN\\VLC\\${player.executable}`,
        `${process.env.PROGRAMFILES}\\VLC\\${player.executable}`,
        `${process.env['PROGRAMFILES(X86)']}\\VLC\\${player.executable}`,
        
        // PotPlayer特殊路径 (包括完美解码)
        `${process.env.PROGRAMFILES}\\PotPlayer\\${player.executable}`,
        `${process.env['PROGRAMFILES(X86)']}\\PotPlayer\\${player.executable}`,
        `C:\\PotPlayer\\${player.executable}`,
        `D:\\PotPlayer\\${player.executable}`,
        // 完美解码(PotPlayer)的其他可能路径
        `${process.env.PROGRAMFILES}\\DAUM\\PotPlayer\\${player.executable}`,
        `${process.env['PROGRAMFILES(X86)']}\\DAUM\\PotPlayer\\${player.executable}`,
        `${process.env.USERPROFILE}\\Desktop\\PotPlayer\\${player.executable}`,
        `${process.env.USERPROFILE}\\Downloads\\PotPlayer\\${player.executable}`,
        `${process.env.PROGRAMFILES}\\Pure Codec\x64\\${player.executable}`,
        
        // MPC-HC特殊路径
        `${process.env.PROGRAMFILES}\\MPC-HC\\${player.executable}`,
        `${process.env['PROGRAMFILES(X86)']}\\MPC-HC\\${player.executable}`,
        `${process.env.PROGRAMFILES}\\Media Player Classic\\${player.executable}`,
        `${process.env['PROGRAMFILES(X86)']}\\Media Player Classic\\${player.executable}`,
        `C:\\MPC-HC\\${player.executable}`,
        
        // MPC-BE特殊路径
        `${process.env.PROGRAMFILES}\\MPC-BE\\${player.executable}`,
        `${process.env['PROGRAMFILES(X86)']}\\MPC-BE\\${player.executable}`,
        `C:\\MPC-BE\\${player.executable}`,
        
        // KMPlayer特殊路径
        `${process.env.PROGRAMFILES}\\KMPlayer\\${player.executable}`,
        `${process.env['PROGRAMFILES(X86)']}\\KMPlayer\\${player.executable}`,
        `C:\\KMPlayer\\${player.executable}`,
        
        // GOM Player特殊路径
        `${process.env.PROGRAMFILES}\\GOM\\GOM Player\\${player.executable}`,
        `${process.env['PROGRAMFILES(X86)']}\\GOM\\GOM Player\\${player.executable}`,
        `${process.env.PROGRAMFILES}\\GRETECH\\GOM Player\\${player.executable}`,
        `${process.env['PROGRAMFILES(X86)']}\\GRETECH\\GOM Player\\${player.executable}`,
        
        // Daum PotPlayer特殊路径
        `${process.env.PROGRAMFILES}\\DAUM\\PotPlayer\\${player.executable}`,
        `${process.env['PROGRAMFILES(X86)']}\\DAUM\\PotPlayer\\${player.executable}`,
        
        // Zoom Player特殊路径
        `${process.env.PROGRAMFILES}\\Inmatrix\\Zoom Player\\${player.executable}`,
        `${process.env['PROGRAMFILES(X86)']}\\Inmatrix\\Zoom Player\\${player.executable}`,
        
        // mpv特殊路径
        `${process.env.PROGRAMFILES}\\mpv\\${player.executable}`,
        `${process.env['PROGRAMFILES(X86)']}\\mpv\\${player.executable}`,
        `C:\\mpv\\${player.executable}`,
        
        // 5KPlayer特殊路径
        `${process.env.PROGRAMFILES}\\5KPlayer\\${player.executable}`,
        `${process.env['PROGRAMFILES(X86)']}\\5KPlayer\\${player.executable}`,
        
        // BSPlayer特殊路径
        `${process.env.PROGRAMFILES}\\BSPlayer\\${player.executable}`,
        `${process.env['PROGRAMFILES(X86)']}\\BSPlayer\\${player.executable}`,
        `C:\\BSPlayer\\${player.executable}`,
        
        // DivX Player特殊路径
        `${process.env.PROGRAMFILES}\\DivX\\DivX Player\\${player.executable}`,
        `${process.env['PROGRAMFILES(X86)']}\\DivX\\DivX Player\\${player.executable}`,
        
        // 用户目录下的可能安装路径 (包括AppData)
        `${process.env.USERPROFILE}\\AppData\\Local\\${player.name}\\${player.executable}`,
        `${process.env.USERPROFILE}\\AppData\\Roaming\\${player.name}\\${player.executable}`,
        `${process.env.USERPROFILE}\\AppData\\Local\\Programs\\${player.name}\\${player.executable}`,
        // AppData中的其他常见路径
        `${process.env.USERPROFILE}\\AppData\\Local\\DAUM\\PotPlayer\\${player.executable}`,
        `${process.env.USERPROFILE}\\AppData\\Roaming\\DAUM\\PotPlayer\\${player.executable}`,
        `${process.env.USERPROFILE}\\AppData\\Local\\VideoLAN\\VLC\\${player.executable}`,
        `${process.env.USERPROFILE}\\AppData\\Roaming\\VideoLAN\\VLC\\${player.executable}`,
        // 桌面和下载目录中的可能路径
        `${process.env.USERPROFILE}\\Desktop\\${player.name}\\${player.executable}`,
        `${process.env.USERPROFILE}\\Downloads\\${player.name}\\${player.executable}`,
        `${process.env.USERPROFILE}\\Documents\\${player.name}\\${player.executable}`,
      ];
      
      // 检查常见路径
      let found = false;
      for (const playerPath of commonPaths) {
        try {
          fs.accessSync(playerPath, fs.constants.F_OK);
          // 找到了播放器
          player.path = playerPath;
          console.log(`播放器 ${player.name} 已安装，路径: ${player.path}`);
          resolve(true);
          found = true;
          break;
        } catch (err) {
          // 文件不存在，继续检查下一个路径
          continue;
        }
      }
      
      if (!found) {
        console.log(`播放器 ${player.name} 未在常见路径中找到`);
        resolve(false);
      }
    } else {
      // 对于macOS和Linux，仍然使用原来的命令检查方法
      let command;
      
      if (platform === 'darwin') {
        // macOS系统检查
        command = `which "${player.executable}"`;
        console.log(`macOS系统检查命令: ${command}`);
      } else {
        // Linux系统检查
        command = `which ${player.executable}`;
        console.log(`Linux系统检查命令: ${command}`);
      }
      
      exec(command, (error, stdout, stderr) => {
        console.log(`执行命令结果 - 错误: ${error}, 输出: ${stdout}, 错误输出: ${stderr}`);
        if (error) {
          console.log(`命令执行出错，播放器 ${player.name} 未安装`);
          resolve(false);
        } else {
          // 对于macOS和Linux，直接使用which命令的结果
          if (stdout) {
            player.path = stdout.trim();
            console.log(`播放器 ${player.name} 已安装，路径: ${player.path}`);
            resolve(true);
          } else {
            console.log(`播放器 ${player.name} 未找到`);
            resolve(false);
          }
        }
      });
    }
  });
}

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
  const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.m4v', '.mpeg', '.mpg', '.m2ts', '.ts', '.webm', '.vob', '.ogv', '.3gp', '.3g2']; // 可以根据需要添加更多视频格式
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
// async function readImageAsBase64(imagePath) {
//     try {
//         const data = await fs.promises.readFile(imagePath);
//         const base64Data = data.toString('base64');
//         const ext = path.extname(imagePath).toLowerCase();
//         let mimeType = 'image/jpeg'; // 默认 jpeg
//         if (ext === '.png') {
//             mimeType = 'image/png';
//         } else if (ext === '.gif') {
//             mimeType = 'image/gif';
//         }
//         return `data:${mimeType};base64,${base64Data}`;
//     } catch (error) {
//         console.error("读取图片文件时出错:", imagePath, error);
//         return null;
//     }
// }

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
            // let coverImageDataUrl = null; // 不再需要存储 base64 数据

            // if (coverImagePath) {
            //      coverImageDataUrl = await readImageAsBase64(coverImagePath); // 读取图片并转换为 Base64
            // }

            mediaList.push({
                ...movieInfo,
                videoPath: videoFile,
                // coverImageDataUrl: coverImageDataUrl // 不再添加 base64 数据
                coverImagePath: coverImagePath ? url.pathToFileURL(coverImagePath).toString() : null // 转换为 file:// URL
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

ipcMain.on('open-video', async (event, videoPath) => {
  try {
    // 获取用户设置
    const settings = await readSettings();
    const defaultPlayer = settings.defaultPlayer;
    
    if (defaultPlayer && defaultPlayer.executable && defaultPlayer.path) {
      // 使用用户选择的默认播放器
      const platform = process.platform;
      
      if (platform === 'win32') {
        // Windows系统 - 使用spawn替代exec以更好地处理特殊字符
        const { spawn } = require('child_process');
        console.log(`尝试使用播放器打开视频: ${defaultPlayer.name}`);
        console.log(`播放器路径: ${defaultPlayer.path}`);
        console.log(`视频路径: ${videoPath}`);
        
        // 检查播放器文件是否存在
        try {
          await fs.promises.access(defaultPlayer.path, fs.constants.F_OK);
          console.log("播放器文件存在，尝试启动");
          
          // 对于Windows Store版本的播放器，直接回退到系统默认播放器
          if (defaultPlayer.path.includes('WindowsApps')) {
            console.log('检测到Windows Store版本的播放器，可能无法直接调用，将使用系统默认播放器');
            // Windows Store应用有特殊限制，直接回退到系统默认播放器
            return fallbackToSystemPlayer(event, videoPath);
          } else {
            // 对于非Windows Store版本，使用原来的spawn方式
            const playerProcess = spawn(`"${defaultPlayer.path}"`, [`"${videoPath}"`], {
              shell: true,
              stdio: 'ignore',
              detached: true,
              windowsHide: true
            });
            
            // 不等待进程完成，分离父进程
            playerProcess.unref();
            
            // 给一点时间检查是否有立即错误
            setTimeout(() => {
              if (playerProcess.exitCode === null) {
                // 进程仍在运行，认为成功
                console.log("播放器启动成功");
                event.sender.send('video-opened', videoPath);
              } else {
                console.error(`播放器启动失败，退出码: ${playerProcess.exitCode}`);
                // 回退到系统默认播放器
                fallbackToSystemPlayer(event, videoPath);
              }
            }, 1000);
            
            // 监听错误事件
            playerProcess.on('error', (error) => {
              console.error("播放器启动出错:", error);
              // 回退到系统默认播放器
              fallbackToSystemPlayer(event, videoPath);
            });
          }
          
        } catch (accessError) {
          console.error("播放器文件不存在或无法访问:", accessError);
          // 回退到系统默认播放器
          fallbackToSystemPlayer(event, videoPath);
        }
      } else if (platform === 'darwin') {
        // macOS系统
        const command = `open -a "${defaultPlayer.executable}" "${videoPath}"`;
        exec(command, (error, stdout, stderr) => {
          if (error) {
            console.error("使用默认播放器打开视频时出错:", error);
            fallbackToSystemPlayer(event, videoPath);
          } else {
            event.sender.send('video-opened', videoPath);
          }
        });
      } else {
        // Linux系统
        const command = `${defaultPlayer.executable} "${videoPath}"`;
        exec(command, (error, stdout, stderr) => {
          if (error) {
            console.error("使用默认播放器打开视频时出错:", error);
            fallbackToSystemPlayer(event, videoPath);
          } else {
            event.sender.send('video-opened', videoPath);
          }
        });
      }
    } else {
      // 使用系统默认播放器
      fallbackToSystemPlayer(event, videoPath);
    }
  } catch (error) {
    console.error("获取播放器设置时出错:", error);
    // 出错时使用系统默认播放器
    fallbackToSystemPlayer(event, videoPath);
  }
});

// 辅助函数：回退到系统默认播放器
function fallbackToSystemPlayer(event, videoPath) {
  console.log("回退到系统默认播放器");
  shell.openPath(videoPath).catch(err => {
    console.error("使用系统默认播放器打开视频时出错:", err);
    event.sender.send('video-open-failed', videoPath, err.message);
  });
}

// IPC handler for opening video directory
ipcMain.on('open-video-directory', (event, videoPath) => {
  const directoryPath = path.dirname(videoPath);
  shell.openPath(directoryPath).catch(err => {
    console.error("打开视频文件所在目录时出错:", directoryPath, err);
    // 发送错误消息到渲染进程
    event.sender.send('video-directory-open-failed', videoPath, err.message);
  });
});

// IPC handler to get settings
ipcMain.handle('get-settings', async () => {
    return readSettings();
});

// IPC handler to save settings
ipcMain.handle('save-settings', async (event, settings) => {
    try {
        await saveSettings(settings);
        // 保存后可以通知主窗口重新加载数据
        const mainWindow = BrowserWindow.getAllWindows().find(win => win.getURL().includes('index.html'));
        if (mainWindow) {
            mainWindow.webContents.send('settings-saved-and-rescan'); // 发送消息通知主界面重新扫描
        }
        return { success: true };
    } catch (error) {
        console.error('保存设置失败:', error);
        return { success: false, error: error.message };
    }
});

// IPC handler to get installed players
ipcMain.handle('get-installed-players', async () => {
    try {
        console.log('收到获取已安装播放器列表的请求');
        const players = await detectInstalledPlayers();
        console.log('返回已安装播放器列表:', players);
        return { success: true, players };
    } catch (error) {
        console.error('获取已安装播放器列表失败:', error);
        return { success: false, error: error.message };
    }
});

// IPC handler to open directory dialog
ipcMain.handle('open-directory-dialog', async (event) => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    return result;
});

// IPC handler to open file dialog for custom player
ipcMain.handle('open-player-dialog', async (event) => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            { name: '播放器程序', extensions: ['exe'] },
            { name: '所有文件', extensions: ['*'] }
        ]
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

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: false
        },
        autoHideMenuBar: true
    });

    // Set window title from app name
    win.setTitle(`${app.name} v${appVersion}`);

    win.loadFile('index.html').then(() => {
    win.webContents.send('app-info', {
        name: app.name,
        version: appVersion
    });
})

    // 开发者工具
    if (process.env.NODE_ENV === 'development') {
        win.webContents.openDevTools()
    }

    // 窗口控制事件处理
    win.on('maximize', () => {
        win.webContents.send('window-maximized', true)
    })

    win.on('unmaximize', () => {
        win.webContents.send('window-maximized', false)
    })

    win.on('focus', () => {
        win.webContents.send('window-focused', true)
    })

    win.on('blur', () => {
        win.webContents.send('window-focused', false)
    })

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
        // await fs.promises.rm(directoryPath, { recursive: true, force: true }); // 替换为移动到回收站
        await shell.trashItem(directoryPath);
        console.log("成功将目录移动到回收站:", directoryPath);
        // 可以发送消息回渲染进程通知删除成功，以便更新列表
        event.sender.send('directory-trashed', directoryPath); // 修改事件名称以反映操作
         // 删除后重新扫描，更新主界面
        readSettings().then(settings => {
             if (settings && settings.directories && settings.directories.length > 0) {
                 const mainWindow = BrowserWindow.getAllWindows().find(win => win.getURL().includes('index.html'));
                 if (mainWindow) {
                     mainWindow.webContents.send('start-initial-scan', settings.directories); // 通知主界面重新扫描
                 } else {
                    console.error("未找到主窗口进行重新扫描通知");
                 }
             } else {
                 // 如果删除后目录为空，清空列表并显示提示
                 const mainWindow = BrowserWindow.getAllWindows().find(win => win.getURL().includes('index.html'));
                 if (mainWindow) {
                     mainWindow.webContents.send('no-directories-configured');
                 }
             }
         });

    } catch (err) {
        console.error("将目录移动到回收站时出错:", directoryPath, err);
        // 可以发送消息回渲染进程通知删除失败
        event.sender.send('trash-failed', directoryPath, err.message); // 修改事件名称以反映操作
    }
});