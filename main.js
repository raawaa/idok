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

const { app, BrowserWindow, ipcMain, shell } = require('electron')
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js'); // 导入 xml2js

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
        studio: null,
        actors: [],
        directors: [],
        genres: []
    };

    if (result.movie) {
        const movieNode = result.movie;
        if (movieNode.title) movieInfo.title = movieNode.title;
        if (movieNode.year) movieInfo.year = movieNode.year;
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
             if (Array.isArray(movieNode.genre)) {
                movieInfo.genres = movieNode.genre.map(genre => genre).filter(name => name); // genre 标签下直接是类别名
            } else {
                 movieInfo.genres.push(movieNode.genre);
            }
        }
    }

    return movieInfo; // 返回包含更多信息的对象
  } catch (error) {
    console.error("解析 nfo 文件时出错:", nfoPath, error);
    return { // 解析失败时返回默认信息
        title: path.basename(nfoPath, '.nfo'),
        year: null,
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


async function scanDirectoryRecursive(directoryPath, mediaList) {
    try {
        const files = await fs.promises.readdir(directoryPath, { withFileTypes: true });

        let videoFile = null;
        let nfoFile = null;
        let coverImagePath = null; // 存储封面图片路径，稍后读取内容

        for (const dirent of files) {
            const fullPath = path.join(directoryPath, dirent.name);

            if (dirent.isDirectory()) {
                await scanDirectoryRecursive(fullPath, mediaList);
            } else if (dirent.isFile()) {
                if (isVideoFile(dirent.name)) {
                    videoFile = fullPath;
                } else if (dirent.name.toLowerCase().endsWith('.nfo')) {
                    nfoFile = fullPath;
                }
            }
        }

        // 如果找到视频文件和 nfo 文件，则认为是一个电影文件夹
        if (videoFile && nfoFile) {
            const movieInfo = await parseNfoFile(nfoFile); // 调用修改后的解析函数
            coverImagePath = await findCoverImage(directoryPath); // 查找封面图片路径
            let coverImageDataUrl = null;

            if (coverImagePath) {
                 coverImageDataUrl = await readImageAsBase64(coverImagePath); // 读取图片并转换为 Base64
            }

            mediaList.push({
                ...movieInfo, // 展开解析出的电影信息
                videoPath: videoFile,
                coverImageDataUrl: coverImageDataUrl
            });
        }

    } catch (error) {
        console.error("扫描目录时出错:", directoryPath, error);
    }
}


ipcMain.handle('scan-directory', async (event, directoryPath) => {
  const mediaList = [];
  await scanDirectoryRecursive(directoryPath, mediaList);
  return mediaList;
});

ipcMain.on('open-video', (event, videoPath) => {
  shell.openPath(videoPath).catch(err => {
    console.error("打开视频文件时出错:", videoPath, err);
  });
});

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  win.loadFile('index.html')
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