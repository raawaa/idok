/**
 * 媒体扫描服务
 */

const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const { isVideoFile, findCoverImage } = require('./file-service');

/**
 * 扫描多个目录
 * @param {string[]} directoryPaths - 目录路径数组
 * @returns {Promise<Object[]>} 媒体文件列表
 */
async function scanDirectories(directoryPaths) {
    const allMedia = [];

    for (const dirPath of directoryPaths) {
        try {
            console.log(`📂 扫描目录: ${dirPath}`);
            const mediaFiles = await scanDirectoryRecursive(dirPath);
            allMedia.push(...mediaFiles);
            console.log(`✅ 目录 ${dirPath} 扫描完成，找到 ${mediaFiles.length} 个文件`);
        } catch (error) {
            console.error(`❌ 扫描目录 ${dirPath} 失败:`, error);
        }
    }

    console.log(`🎉 总共找到 ${allMedia.length} 个媒体文件`);
    return allMedia;
}

/**
 * 递归扫描目录
 * @param {string} directoryPath - 目录路径
 * @returns {Promise<Object[]>} 媒体文件列表
 */
async function scanDirectoryRecursive(directoryPath) {
    const mediaList = [];

    try {
        const files = await fs.promises.readdir(directoryPath, { withFileTypes: true });

        let videoFile = null;
        let nfoFile = null;

        for (const dirent of files) {
            const fullPath = path.join(directoryPath, dirent.name);

            if (dirent.isDirectory()) {
                // 递归扫描子目录
                const subMedia = await scanDirectoryRecursive(fullPath);
                mediaList.push(...subMedia);
            } else if (dirent.isFile()) {
                if (isVideoFile(dirent.name)) {
                    videoFile = fullPath;
                } else if (dirent.name.toLowerCase().endsWith('.nfo')) {
                    nfoFile = fullPath;
                }
            }
        }

        // 如果找到视频文件和 NFO 文件
        if (videoFile && nfoFile) {
            try {
                const movieInfo = await parseNfoFile(nfoFile);
                const coverImagePath = await findCoverImage(path.dirname(nfoFile));

                mediaList.push({
                    ...movieInfo,
                    videoPath: videoFile,
                    coverImagePath: coverImagePath ? encodeFilePath(coverImagePath) : null
                });
            } catch (error) {
                console.error('处理媒体文件失败:', error);
            }
        }
    } catch (error) {
        console.error('扫描目录失败:', directoryPath, error);
    }

    return mediaList;
}

/**
 * 解析 NFO 文件
 * @param {string} nfoPath - NFO文件路径
 * @returns {Promise<Object>} 电影信息对象
 */
async function parseNfoFile(nfoPath) {
    try {
        const xml = await fs.promises.readFile(nfoPath, 'utf-8');
        const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: true });
        const result = await parser.parseStringPromise(xml);

        const movieInfo = {
            title: path.basename(nfoPath, '.nfo'),
            year: null,
            releaseDateFull: null,
            studio: null,
            actors: [],
            directors: [],
            genres: []
        };

        if (result.movie) {
            const movieNode = result.movie;
            if (movieNode.title) movieInfo.title = movieNode.title;
            if (movieNode.premiered) {
                movieInfo.year = movieNode.premiered.substring(0, 4);
                movieInfo.releaseDateFull = movieNode.premiered;
            }
            if (movieNode.studio) movieInfo.studio = movieNode.studio;

            if (movieNode.actor) {
                if (Array.isArray(movieNode.actor)) {
                    movieInfo.actors = movieNode.actor.map(actor => actor.name).filter(name => name);
                } else if (movieNode.actor.name) {
                    movieInfo.actors.push(movieNode.actor.name);
                }
            }

            if (movieNode.director) {
                if (Array.isArray(movieNode.director)) {
                    movieInfo.directors = movieNode.director;
                } else {
                    movieInfo.directors.push(movieNode.director);
                }
            }

            if (movieNode.genre) {
                if (Array.isArray(movieNode.genre)) {
                    movieInfo.genres = movieNode.genre;
                } else {
                    movieInfo.genres = [movieNode.genre];
                }
            }
        }

        return movieInfo;
    } catch (error) {
        console.error('解析 NFO 文件失败:', nfoPath, error);
        return {
            title: path.basename(nfoPath, '.nfo'),
            year: null,
            releaseDateFull: null,
            studio: null,
            actors: [],
            directors: [],
            genres: []
        };
    }
}

/**
 * 编码文件路径为正确的file:// URL格式
 * @param {string} filePath - 文件路径
 * @returns {string} 编码后的file:// URL
 */
function encodeFilePath(filePath) {
    // 确保路径是绝对路径
    const absolutePath = path.resolve(filePath);

    // 转换为正斜杠
    const normalizedPath = absolutePath.replace(/\\/g, '/');

    // 对Windows路径进行特殊处理
    let fileUrl;
    if (process.platform === 'win32' && !normalizedPath.startsWith('/')) {
        // Windows路径需要添加额外的斜杠
        fileUrl = `file:///${normalizedPath}`;
    } else {
        fileUrl = `file://${normalizedPath}`;
    }

    // 对URL中的特殊字符进行编码，但保留路径分隔符
    return encodeURI(fileUrl);
}

module.exports = {
    scanDirectories,
    scanDirectoryRecursive,
    parseNfoFile,
    encodeFilePath
};