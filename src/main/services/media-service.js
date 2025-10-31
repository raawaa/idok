/**
 * 媒体扫描服务
 */

const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const { isVideoFile, findCoverImage } = require('./file-service');
const OpenCC = require('opencc-js');

// 创建繁体转简体的转换器实例
const converter = OpenCC.Converter({ from: 'tw', to: 'cn' });

/**
 * 使用OpenCC库将繁体中文转换为简体中文
 * @param {string} text - 包含繁体中文的文本
 * @returns {string} 转换为简体中文的文本
 */
function convertTraditionalToSimplified(text) {
    if (!text || typeof text !== 'string') {
        return text;
    }
    
    try {
        // 使用OpenCC转换器进行繁简转换
        return converter(text);
    } catch (error) {
        console.error('简繁转换出错:', error);
        // 如果转换失败，返回原始文本
        return text;
    }
}

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

        let videoFiles = [];  // 改为数组，支持多个视频文件
        let nfoFile = null;

        for (const dirent of files) {
            const fullPath = path.join(directoryPath, dirent.name);

            if (dirent.isDirectory()) {
                // 递归扫描子目录
                const subMedia = await scanDirectoryRecursive(fullPath);
                mediaList.push(...subMedia);
            } else if (dirent.isFile()) {
                if (isVideoFile(dirent.name)) {
                    videoFiles.push(fullPath);  // 收集所有视频文件
                } else if (dirent.name.toLowerCase().endsWith('.nfo')) {
                    nfoFile = fullPath;
                }
            }
        }

        // 如果找到视频文件和 NFO 文件
        if (videoFiles.length > 0 && nfoFile) {
            try {
                const movieInfo = await parseNfoFile(nfoFile);
                const coverImagePath = await findCoverImage(path.dirname(nfoFile));

                // 无论有多少个视频文件，都只创建一个媒体项
                videoFiles.sort((a, b) => a.localeCompare(b)); // 按文件名排序
                
                mediaList.push({
                    ...movieInfo,
                    videoPath: videoFiles[0], // 使用第一个视频文件作为主路径
                    videoFiles: videoFiles, // 保存所有视频文件列表，用于播放
                    totalParts: videoFiles.length, // 总部分数
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
            set: null,
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
            if (movieNode.set) {
                // 处理set节点，可能是对象包含name属性，也可能是直接字符串
                if (typeof movieNode.set === 'object' && movieNode.set.name) {
                    movieInfo.set = movieNode.set.name;
                } else if (typeof movieNode.set === 'string') {
                    movieInfo.set = movieNode.set;
                }
            }

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

            /**
             * 处理 genre 信息，支持多个 genre 标签和逗号分隔的 genre 条目
             * 同时将繁体中文类别转换为简体中文
             */
            if (movieNode.genre) {
                const allGenres = new Set(); // 使用 Set 去重
                
                // 处理 genre 信息，可能是数组或单个值
                const processGenre = (genreValue) => {
                    if (typeof genreValue === 'string') {
                        // 将繁体中文转换为简体中文
                        const simplifiedGenre = convertTraditionalToSimplified(genreValue);
                        
                        // 检查是否包含逗号分隔的多个类别
                        if (simplifiedGenre.includes(',')) {
                            // 分割逗号分隔的类别并去除前后空格
                            const splitGenres = simplifiedGenre.split(',').map(g => g.trim()).filter(g => g);
                            splitGenres.forEach(g => allGenres.add(g));
                        } else {
                            // 单个类别
                            allGenres.add(simplifiedGenre);
                        }
                    }
                };
                
                if (Array.isArray(movieNode.genre)) {
                    // 多个 genre 标签
                    movieNode.genre.forEach(genreValue => processGenre(genreValue));
                } else {
                    // 单个 genre 标签
                    processGenre(movieNode.genre);
                }
                
                // 将 Set 转换为数组
                movieInfo.genres = Array.from(allGenres);
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
            set: null,
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
    encodeFilePath,
    convertTraditionalToSimplified
};