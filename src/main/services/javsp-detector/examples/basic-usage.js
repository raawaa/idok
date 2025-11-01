/**
 * JavSP番号识别模块基本使用示例
 */

const JavspDetector = require('../index');
const path = require('path');

async function basicUsageExample() {
    console.log('=== JavSP番号识别模块基本使用示例 ===\n');

    // 1. 初始化检测器
    console.log('1. 初始化检测器...');
    const detector = new JavspDetector({
        scrapers: {
            enabled: ['javbus'], // 只启用javbus刮削器
            max_concurrent: 2    // 限制并发数
        }
    });

    // 2. 检查模块状态
    console.log('\n2. 检查模块状态...');
    const status = detector.getStatus();
    console.log('模块状态:', JSON.stringify(status, null, 2));

    // 3. 番号识别示例
    console.log('\n3. 番号识别示例...');
    const testFiles = [
        'FC2-123456.mp4',
        'ABC-123 特典付き.mp4',
        'HEYDOUGA-4017-8910 无修正版.mp4',
        'GETCHU-123456.mp4',
        'some_random_file.txt'
    ];

    for (const filename of testFiles) {
        const detection = await detector.detectFromPath(filename);
        console.log(`文件: ${filename}`);
        console.log(`  番号: ${detection.avid}`);
        console.log(`  类型: ${detection.type}`);
        console.log(`  置信度: ${detection.confidence}`);
        console.log('');
    }

    // 4. 获取影片元数据示例（需要网络连接）
    console.log('4. 获取影片元数据示例...');
    const testAvids = [
        { avid: 'FC2-123456', type: 'fc2' },
        { avid: 'ABC-123', type: 'normal' }
    ];

    for (const request of testAvids) {
        try {
            console.log(`获取番号 ${request.avid} 的元数据...`);
            const metadata = await detector.getMovieMetadata(request.avid, request.type);

            if (metadata) {
                console.log(`  标题: ${metadata.title || '未知'}`);
                console.log(`  女优: ${metadata.actress ? metadata.actress.join(', ') : '未知'}`);
                console.log(`  发布日期: ${metadata.publish_date || '未知'}`);
                console.log(`  数据来源: ${metadata.source}`);
            } else {
                console.log(`  未找到影片信息`);
            }
        } catch (error) {
            console.log(`  获取失败: ${error.message}`);
        }
        console.log('');
    }

    // 5. 女优名称标准化示例
    console.log('5. 女优名称标准化示例...');
    const actressNames = [
        '三上悠亜',
        '三上悠亚',
        '波多野結衣',
        '波多野结衣',
        '未知女优'
    ];

    for (const name of actressNames) {
        const normalizedName = detector.dataLoader.normalizeActressName(name);
        const aliases = detector.dataLoader.getActressAliases(name);
        console.log(`原名: ${name}`);
        console.log(`  标准化: ${normalizedName}`);
        console.log(`  别名: ${aliases.join(', ')}`);
        console.log('');
    }

    // 6. 分类翻译示例
    console.log('6. 分类翻译示例...');
    const genreIds = ['101', '102', '103'];
    const translatedGenres = detector.dataLoader.translateGenres(genreIds, 'javbus');
    console.log(`分类ID: ${genreIds.join(', ')}`);
    console.log(`翻译结果: ${translatedGenres.join(', ')}`);

    // 7. 搜索示例
    console.log('\n7. 搜索示例...');
    try {
        console.log('搜索关键词: "三上悠亚"...');
        const searchResults = await detector.searchMovies('三上悠亚');
        console.log(`找到 ${searchResults.length} 个结果`);
        searchResults.slice(0, 3).forEach((result, index) => {
            console.log(`  ${index + 1}. ${result.avid} - ${result.title} (${result.source})`);
        });
    } catch (error) {
        console.log(`搜索失败: ${error.message}`);
    }

    console.log('\n=== 示例完成 ===');
}

// 错误处理示例
async function errorHandlingExample() {
    console.log('\n=== 错误处理示例 ===\n');

    const detector = new JavspDetector();

    // 1. 处理无效文件路径
    console.log('1. 处理无效文件路径...');
    const detection = await detector.detectFromPath('');
    console.log('空路径检测结果:', detection);

    // 2. 处理网络错误
    console.log('\n2. 处理网络错误...');
    try {
        const metadata = await detector.getMovieMetadata('INVALID-123', 'normal');
        console.log('无效番号结果:', metadata);
    } catch (error) {
        console.log('捕获错误:', error.message);
    }

    // 3. 处理批量操作中的部分失败
    console.log('\n3. 批量操作示例...');
    const requests = [
        { avid: 'ABC-123', type: 'normal' },
        { avid: 'INVALID-456', type: 'normal' },
        { avid: 'DEF-789', type: 'normal' }
    ];

    try {
        const results = await detector.batchGetMetadata(requests, { maxScrapers: 1 });
        console.log(`批量处理结果: ${results.length} 个请求`);
        results.forEach((result, index) => {
            console.log(`  ${index + 1}. ${result.avid}: ${result.success ? '成功' : '失败'}`);
        });
    } catch (error) {
        console.log('批量处理失败:', error.message);
    }

    console.log('\n=== 错误处理示例完成 ===');
}

// 性能测试示例
async function performanceExample() {
    console.log('\n=== 性能测试示例 ===\n');

    const detector = new JavspDetector();

    // 1. 番号识别性能测试
    console.log('1. 番号识别性能测试...');
    const testFiles = [];
    for (let i = 0; i < 1000; i++) {
        testFiles.push(`ABC-${i + 1}.mp4`);
    }

    const startTime = Date.now();
    const results = await detector.batchDetect(testFiles);
    const endTime = Date.now();

    console.log(`处理 ${testFiles.length} 个文件用时: ${endTime - startTime}ms`);
    console.log(`平均每个文件: ${(endTime - startTime) / testFiles.length}ms`);
    console.log(`识别成功: ${results.filter(r => r.avid).length} 个`);

    // 2. 缓存效果测试
    console.log('\n2. 缓存效果测试...');
    const avid = 'ABC-123';

    // 第一次请求
    const start1 = Date.now();
    await detector.getMovieMetadata(avid, 'normal');
    const time1 = Date.now() - start1;

    // 第二次请求（应该使用缓存）
    const start2 = Date.now();
    await detector.getMovieMetadata(avid, 'normal');
    const time2 = Date.now() - start2;

    console.log(`首次请求用时: ${time1}ms`);
    console.log(`缓存请求用时: ${time2}ms`);
    console.log(`缓存加速: ${time1 > 0 ? Math.round((time1 - time2) / time1 * 100) : 0}%`);

    console.log('\n=== 性能测试完成 ===');
}

// 运行所有示例
async function runAllExamples() {
    try {
        await basicUsageExample();
        await errorHandlingExample();
        await performanceExample();
    } catch (error) {
        console.error('示例运行出错:', error);
    }
}

// 如果直接运行此文件
if (require.main === module) {
    runAllExamples();
}

module.exports = {
    basicUsageExample,
    errorHandlingExample,
    performanceExample,
    runAllExamples
};