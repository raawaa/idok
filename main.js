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
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(xml);
    // 提取电影标题，根据 Kodi nfo 结构可能不同，这里假设是 <movie><title>...</title></movie>
    return result.movie ? result.movie.title[0] : path.basename(nfoPath, '.nfo');
  } catch (error) {
    console.error("解析 nfo 文件时出错:", nfoPath, error);
    return path.basename(nfoPath, '.nfo'); // 解析失败时使用文件名作为标题
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
                // 递归扫描子目录
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
            const title = await parseNfoFile(nfoFile);
            coverImagePath = await findCoverImage(directoryPath); // 查找封面图片路径
            let coverImageDataUrl = null;

            if (coverImagePath) {
                 coverImageDataUrl = await readImageAsBase64(coverImagePath); // 读取图片并转换为 Base64
            }


            mediaList.push({
                title: title,
                videoPath: videoFile,
                coverImageDataUrl: coverImageDataUrl // 存储 Base64 数据 URL
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