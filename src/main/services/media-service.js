/**
 * 媒体扫描服务
 */

const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const { isVideoFile, findCoverImage } = require('./file-service');
const DatabaseService = require('../../shared/services/database-service');
const OpenCC = require('opencc-js');
const { extractAvId } = require('../../shared/services/web-scraper/utils');

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
 * 扫描多个目录（支持缓存）
 * @param {string[]} directoryPaths - 目录路径数组
 * @param {Object} options - 扫描选项
 * @returns {Promise<Object>} 扫描结果对象 { data: 媒体文件列表, usedCache: 是否使用了缓存 }
 */
async function scanDirectories(directoryPaths, options = {}) {
    const allMedia = [];
    let totalScanTime = 0;
    let cacheHitCount = 0;
    let cacheMissCount = 0;
    let usedCache = false;
    
    // 初始化数据库服务
    const databaseService = new DatabaseService();
    
    // 尝试使用Electron的数据目录，如果失败则使用备用路径
    let dataPath;
    try {
      const { app } = require('electron');
      const userDataPath = app.getPath('userData');
      dataPath = path.join(userDataPath, 'media-database.json');
    } catch (electronError) {
      // 如果Electron不可用，使用当前工作目录
      console.log('Electron不可用，使用当前工作目录作为数据目录');
      dataPath = path.join(process.cwd(), 'media-database.json');
    }
    
    await databaseService.initialize(dataPath);

    for (const dirPath of directoryPaths) {
        try {
            console.log(`📂 加载目录数据: ${dirPath}`);
            const startTime = Date.now();
            
            // 检查是否有有效的缓存
            if (!options.forceRescan) {
                // 首先检查文件是否发生变化
                const hasChanged = await databaseService.hasDirectoryChanged(dirPath);
                if (!hasChanged) {
                    const isCacheValid = await databaseService.isScanCacheValid(dirPath);
                    if (isCacheValid) {
                        const cache = await databaseService.getScanCache(dirPath);
                        if (cache && cache.results) {
                            console.log(`✅ 使用缓存数据加载: ${dirPath}`);
                            
                            // 将缓存数据转换为渲染器期望的格式
                            const convertedResults = await Promise.all(cache.results.map(async (cacheItem) => {
                                // 检查缓存数据格式：新格式直接包含媒体信息，旧格式需要转换
                                if (cacheItem.videoPath) {
                                    // 新格式：已经是转换后的媒体格式，直接使用
                                    return {
                                        title: cacheItem.title,
                                        videoPath: cacheItem.videoPath,
                                        videoFiles: cacheItem.videoFiles || [cacheItem.videoPath],
                                        coverImagePath: cacheItem.coverImagePath,
                                        studio: cacheItem.studio,
                                        actors: cacheItem.actors || [],
                                        releaseDateFull: cacheItem.releaseDateFull,
                                        year: cacheItem.year,
                                        set: cacheItem.set,
                                        genres: cacheItem.genres || [],
                                        directors: cacheItem.directors || [],
                                        totalParts: cacheItem.totalParts || 1,
                                        hasMetadata: cacheItem.hasMetadata !== undefined ? cacheItem.hasMetadata : false,
                                        isStandaloneVideo: cacheItem.isStandaloneVideo || false
                                    };
                                } else {
                                    // 旧格式：需要从原始文件信息转换
                                    const videoFiles = [];
                                    let videoPath = '';
                                    let coverImagePath = null;
                                    
                                    // 提取视频文件路径
                                    if (cacheItem.videoFile && cacheItem.videoFile.path) {
                                        videoPath = cacheItem.videoFile.path;
                                        videoFiles.push(cacheItem.videoFile.path);
                                    }
                                    
                                    // 提取封面图片路径
                                    if (cacheItem.imageFiles && cacheItem.imageFiles.length > 0) {
                                        // 优先选择poster.jpg，其次才是fanart/folder
                                        let posterImage = cacheItem.imageFiles.find(img =>
                                            img.name.toLowerCase().includes('poster')
                                        );
                                        if (!posterImage) {
                                            posterImage = cacheItem.imageFiles.find(img =>
                                                img.name.toLowerCase().includes('fanart') ||
                                                img.name.toLowerCase().includes('folder')
                                            );
                                        }
                                        if (posterImage) {
                                            coverImagePath = encodeFilePath(posterImage.path);
                                        }
                                    }
                                    
                                    // 解析NFO文件获取元数据（如果存在）
                                    let title = path.basename(videoPath, path.extname(videoPath));
                                    let studio = null;
                                    let actors = [];
                                    let releaseDateFull = null;
                                    let year = null;
                                    let set = null;
                                    let genres = [];
                                    let directors = [];
                                    
                                    if (cacheItem.nfoFile && cacheItem.nfoFile.path) {
                                        try {
                                            const xml = fs.readFileSync(cacheItem.nfoFile.path, 'utf-8');
                                            const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: true });
                                            const result = await parser.parseStringPromise(xml);
                                            
                                            if (result.movie) {
                                                const movieNode = result.movie;
                                                if (movieNode.title) title = movieNode.title;
                                                if (movieNode.premiered) {
                                                    year = movieNode.premiered.substring(0, 4);
                                                    releaseDateFull = movieNode.premiered;
                                                }
                                                if (movieNode.studio) studio = movieNode.studio;
                                                if (movieNode.set) {
                                                    if (typeof movieNode.set === 'object' && movieNode.set.name) {
                                                        set = movieNode.set.name;
                                                    } else if (typeof movieNode.set === 'string') {
                                                        set = movieNode.set;
                                                    }
                                                }
                                                
                                                if (movieNode.actor) {
                                                    if (Array.isArray(movieNode.actor)) {
                                                        actors = movieNode.actor.map(actor => actor.name).filter(name => name);
                                                    } else if (movieNode.actor.name) {
                                                        actors.push(movieNode.actor.name);
                                                    }
                                                }
                                                
                                                if (movieNode.director) {
                                                    if (Array.isArray(movieNode.director)) {
                                                        directors = movieNode.director;
                                                    } else {
                                                        directors.push(movieNode.director);
                                                    }
                                                }
                                                
                                                if (movieNode.genre) {
                                                    const allGenres = new Set();
                                                    const processGenre = (genreValue) => {
                                                        if (typeof genreValue === 'string') {
                                                            const simplifiedGenre = convertTraditionalToSimplified(genreValue);
                                                            if (simplifiedGenre.includes(',')) {
                                                                simplifiedGenre.split(',').forEach(g => allGenres.add(g.trim()));
                                                            } else {
                                                                allGenres.add(simplifiedGenre.trim());
                                                            }
                                                        }
                                                    };
                                                    
                                                    if (Array.isArray(movieNode.genre)) {
                                                        movieNode.genre.forEach(genre => processGenre(genre));
                                                    } else {
                                                        processGenre(movieNode.genre);
                                                    }
                                                    genres = Array.from(allGenres);
                                                }
                                            }
                                        } catch (nfoError) {
                                            console.warn(`解析NFO文件失败: ${cacheItem.nfoFile.path}`, nfoError);
                                        }
                                    }
                                    
                                    return {
                                        title: title,
                                        videoPath: videoPath,
                                        videoFiles: videoFiles,
                                        coverImagePath: coverImagePath,
                                        studio: studio,
                                        actors: actors,
                                        releaseDateFull: releaseDateFull,
                                        year: year,
                                        set: set,
                                        genres: genres,
                                        directors: directors,
                                        totalParts: videoFiles.length,
                                        hasMetadata: true, // 从NFO文件解析的都有完整元数据
                                        isStandaloneVideo: false // 这是Kodi标准文件，不是独立视频
                                    };
                                }
                            }));
                            
                            allMedia.push(...convertedResults);
                            
                            // 同时将转换后的媒体文件保存到主数据库的files数组
                            for (const mediaFile of convertedResults) {
                                await databaseService.saveFile({
                                    filePath: mediaFile.videoPath,
                                    fileName: mediaFile.title || path.basename(mediaFile.videoPath),
                                    title: mediaFile.title,
                                    avid: extractAvIdWrapper(mediaFile.title),
                                    actors: mediaFile.actors || [],  // 修复：actress -> actors
                                    studio: mediaFile.studio,
                                    releaseDateFull: mediaFile.releaseDateFull,  // 修复：releaseDate -> releaseDateFull
                                    metadata: {
                                        year: mediaFile.year,
                                        genres: mediaFile.genres || [],
                                        directors: mediaFile.directors || [],
                                        set: mediaFile.set,
                                        totalParts: mediaFile.totalParts,
                                        videoFiles: mediaFile.videoFiles,
                                        coverImagePath: mediaFile.coverImagePath
                                    }
                                });
                            }
                            console.log(`💾 已将缓存中的 ${convertedResults.length} 个媒体文件转换并保存到主数据库`);
                            
                            const scanTime = Date.now() - startTime;
                            totalScanTime += scanTime;
                            cacheHitCount++;
                            usedCache = true;
                            continue;
                        }
                    }
                } else {
                    console.log(`🔄 检测到文件变化，执行重新扫描: ${dirPath}`);
                }
            }

            console.log(`🔍 执行实际扫描: ${dirPath}`);
            const mediaFiles = await scanDirectoryRecursive(dirPath);
            allMedia.push(...mediaFiles);
            
            const scanTime = Date.now() - startTime;
            totalScanTime += scanTime;
            cacheMissCount++;
            
            // 保存扫描结果到缓存
            const fileFingerprint = await databaseService.generateDirectoryFingerprint(dirPath);
            await databaseService.saveScanCache(dirPath, {
                results: mediaFiles,
                totalFiles: mediaFiles.length,
                fileFingerprint: fileFingerprint
            });
            console.log(`💾 扫描结果已缓存: ${dirPath}`);
            
            // 同时将媒体文件保存到主数据库的files数组
            for (const media of mediaFiles) {
                try {
                    // 提取番号信息
                    const avid = extractAvIdWrapper(media.title);
                    
                    await databaseService.saveFile({
                        filePath: media.videoPath,
                        fileName: media.title || path.basename(media.videoPath),
                        title: media.title,
                        avid: avid,
                        actors: media.actors || [],
                        studio: media.studio,
                        releaseDateFull: media.releaseDateFull,
                        hasMetadata: media.hasMetadata !== undefined ? media.hasMetadata : false, // 标记是否有完整元数据
                        isStandaloneVideo: media.isStandaloneVideo || false, // 标记是否为独立视频文件
                        metadata: {
                            year: media.year,
                            genres: media.genres || [],
                            directors: media.directors || [],
                            set: media.set,
                            totalParts: media.totalParts,
                            videoFiles: media.videoFiles,
                            coverImagePath: media.coverImagePath
                        }
                    });
                } catch (error) {
                    console.error(`保存媒体文件失败: ${media.videoPath}`, error);
                }
            }
            console.log(`💾 已将 ${mediaFiles.length} 个媒体文件保存到主数据库`);
            
            console.log(`✅ 目录 ${dirPath} 数据加载完成，找到 ${mediaFiles.length} 个文件`);
        } catch (error) {
            console.error(`❌ 扫描目录 ${dirPath} 失败:`, error);
        }
    }

    console.log(`🎉 总共找到 ${allMedia.length} 个媒体文件`);
    if (usedCache) {
        console.log(`⚡ 数据加载完成 - 总耗时: ${totalScanTime}ms, 缓存命中: ${cacheHitCount}, 缓存未命中: ${cacheMissCount}`);
    } else {
        console.log(`📊 扫描完成 - 总耗时: ${totalScanTime}ms, 缓存命中: ${cacheHitCount}, 缓存未命中: ${cacheMissCount}`);
    }
    return { data: allMedia, usedCache: usedCache };
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

        // 如果找到视频文件和 NFO 文件 (Kodi标准)
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
                    coverImagePath: coverImagePath ? encodeFilePath(coverImagePath) : null,
                    hasMetadata: true // 标记有完整的元数据
                });
            } catch (error) {
                console.error('处理媒体文件失败:', error);
            }
        }

        // 处理独立视频文件（没有NFO文件）
        else if (videoFiles.length > 0 && !nfoFile) {
            console.log(`🎬 发现独立视频文件: ${directoryPath}, 数量: ${videoFiles.length}`);

            // 对每个视频文件进行处理
            for (const videoFile of videoFiles) {
                try {
                    const fileName = path.basename(videoFile, path.extname(videoFile));
                    const avid = extractAvIdWrapper(fileName);

                    // 只有能识别出番号的文件才处理
                    if (avid) {
                        console.log(`✅ 识别到番号: ${avid} -> ${path.basename(videoFile)}`);

                        // 查找相关的封面图片（同名）
                        const videoDir = path.dirname(videoFile);
                        let coverImagePath = null;

                        try {
                            const coverFiles = await fs.promises.readdir(videoDir);
                            const coverFile = coverFiles.find(file => {
                                const baseName = path.parse(file).name;
                                const ext = path.parse(file).ext.toLowerCase();
                                return (baseName === fileName && ['.jpg', '.jpeg', '.png', '.bmp'].includes(ext));
                            });

                            if (coverFile) {
                                coverImagePath = encodeFilePath(path.join(videoDir, coverFile));
                            }
                        } catch (coverError) {
                            console.warn(`查找封面失败: ${videoFile}`, coverError.message);
                        }

                        mediaList.push({
                            title: avid, // 使用番号作为标题
                            videoPath: videoFile,
                            videoFiles: [videoFile],
                            totalParts: 1,
                            coverImagePath: coverImagePath,
                            avid: avid,
                            actors: [], // 空的女优列表，待刮削
                            studio: null,
                            releaseDateFull: null,
                            year: null,
                            genres: [],
                            directors: [],
                            set: null,
                            hasMetadata: false, // 标记为缺少元数据，需要刮削
                            isStandaloneVideo: true // 标记为独立视频文件
                        });
                    } else {
                        console.log(`❌ 无法识别番号，跳过: ${path.basename(videoFile)}`);
                    }
                } catch (error) {
                    console.error(`处理独立视频文件失败: ${videoFile}`, error);
                }
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
 * 从文件名中提取番号（使用web-scraper的番号识别功能）
 * @param {string} fileName - 文件名
 * @returns {string|null} 提取的番号
 */
function extractAvIdWrapper(fileName) {
    if (!fileName || typeof fileName !== 'string') {
        return null;
    }

    try {
        // 使用web-scraper中的番号识别功能
        const avid = extractAvId(fileName);
        return avid || null;
    } catch (error) {
        console.error('番号提取出错:', error);
        return null;
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
    convertTraditionalToSimplified,
    extractAvId: extractAvIdWrapper // 保持接口兼容性，导出为 extractAvId
};