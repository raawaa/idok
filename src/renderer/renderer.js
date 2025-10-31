/**
 * 模块化渲染进程入口文件
 */

console.log('🎬 模块化渲染进程开始加载...');
console.log('🎯 测试：基础JavaScript执行正常');

// 导入Electron模块
let ipcRenderer, fs;
try {
    const electron = require('electron');
    ipcRenderer = electron.ipcRenderer;
    console.log('✅ Electron模块加载成功');
} catch (error) {
    console.error('❌ Electron模块加载失败:', error);
}

// 导入Node.js模块
try {
    fs = require('fs');
    console.log('✅ Node.js fs模块加载成功');
} catch (error) {
    console.error('❌ Node.js fs模块加载失败:', error);
}

// 导入工具函数
let showMessage, debounce;
try {
    const domUtils = require('./src/renderer/utils/dom-utils');
    showMessage = domUtils.showMessage;
    debounce = domUtils.debounce;
    console.log('✅ dom-utils模块加载成功');
} catch (error) {
    console.error('❌ dom-utils模块加载失败:', error);
}

// 导入常量
let MESSAGE_TYPES;
try {
    const constants = require('./src/shared/constants');
    MESSAGE_TYPES = constants.MESSAGE_TYPES;
    console.log('✅ constants模块加载成功');
} catch (error) {
    console.error('❌ constants模块加载失败:', error);
}

// 导入组件
const { renderMediaList } = require('./src/renderer/components/media-grid');
const { openSettingsDialog } = require('./src/renderer/components/settings-modal');

// 全局状态
let allMediaList = [];

// 快捷消息函数
const showSuccess = (message, duration) => showMessage(message, MESSAGE_TYPES.SUCCESS, duration);
const showError = (message, duration) => showMessage(message, MESSAGE_TYPES.ERROR, duration);
const showWarning = (message, duration) => showMessage(message, MESSAGE_TYPES.WARNING, duration);
const showInfo = (message, duration) => showMessage(message, MESSAGE_TYPES.INFO, duration);

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 DOM加载完成，开始初始化模块化应用程序...');
    console.log('🎯 当前窗口URL:', window.location.href);

    try {
        initializeApp();
        console.log('✅ 模块化应用程序初始化成功');

        // 测试按钮是否正确绑定
        const settingsBtn = document.getElementById('open-settings-btn');
        console.log('🎯 设置按钮元素:', settingsBtn);

    } catch (error) {
        console.error('❌ 模块化应用程序初始化失败:', error);
        showError(`初始化失败: ${error.message}`);
    }
});

/**
 * 初始化应用程序
 */
async function initializeApp() {
    console.log('开始初始化模块化应用程序...');

    // 初始化主题设置
    initializeTheme();

    // 初始化事件监听器
    initializeEventListeners();

    // 初始化搜索功能
    initializeSearch();

    console.log('模块化应用程序初始化完成');
}

/**
 * 初始化主题设置
 */
function initializeTheme() {
    console.log('初始化主题设置...');

    // 获取保存的主题设置，默认为 'auto'
    const savedTheme = localStorage.getItem('theme') || 'auto';
    const themeToggleBtn = document.getElementById('theme-toggle-btn');

    if (savedTheme !== 'auto') {
        // 如果用户手动设置了主题，直接应用
        document.body.setAttribute('data-theme', savedTheme);
        console.log(`应用手动设置的主题: ${savedTheme}`);

        // 设置按钮状态
        if (themeToggleBtn) {
            if (savedTheme === 'dark') {
                themeToggleBtn.textContent = '🌙';
                themeToggleBtn.title = '切换到浅色主题';
            } else {
                themeToggleBtn.textContent = '☀️';
                themeToggleBtn.title = '切换到深色主题';
            }
        }
    } else {
        // 如果是自动主题，根据系统偏好设置
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.setAttribute('data-theme', 'dark');
            console.log('应用系统深色主题');
            if (themeToggleBtn) {
                themeToggleBtn.textContent = '🌙';
                themeToggleBtn.title = '切换到浅色主题';
            }
        } else {
            document.body.setAttribute('data-theme', 'light');
            console.log('应用系统浅色主题');
            if (themeToggleBtn) {
                themeToggleBtn.textContent = '☀️';
                themeToggleBtn.title = '切换到深色主题';
            }
        }
    }
}

/**
 * 切换主题
 */
function toggleTheme() {
    console.log('🎨 开始切换主题...');

    const currentTheme = document.body.getAttribute('data-theme');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');

    let newTheme;
    if (currentTheme === 'dark') {
        newTheme = 'light';
        if (themeToggleBtn) {
            themeToggleBtn.textContent = '☀️';
            themeToggleBtn.title = '切换到深色主题';
        }
        console.log('🌞 切换到浅色主题');
        showSuccess('已切换到浅色主题', 1500);
    } else {
        newTheme = 'dark';
        if (themeToggleBtn) {
            themeToggleBtn.textContent = '🌙';
            themeToggleBtn.title = '切换到浅色主题';
        }
        console.log('🌙 切换到深色主题');
        showSuccess('已切换到深色主题', 1500);
    }

    // 应用新主题
    document.body.setAttribute('data-theme', newTheme);

    // 保存到localStorage
    localStorage.setItem('theme', newTheme);
    console.log(`💾 主题设置已保存: ${newTheme}`);
}

/**
 * 初始化事件监听器
 */
function initializeEventListeners() {
    console.log('初始化事件监听器...');

    // 监听主进程事件
    ipcRenderer.on('app-info', (event, appInfo) => {
        console.log('收到应用信息:', appInfo);
        updateAppTitle(appInfo);
    });

    ipcRenderer.on('start-initial-scan', async (event, directoryPaths) => {
        console.log('收到初始扫描请求:', directoryPaths);
        await handleInitialScan(directoryPaths);
    });

    ipcRenderer.on('no-directories-configured', () => {
        console.log('没有配置目录');
        showNoDirectoriesMessage();
    });

    ipcRenderer.on('video-opened', (event, videoPath) => {
        console.log('视频打开成功:', videoPath);
        showSuccess('视频已开始播放', 2000);
    });

    ipcRenderer.on('video-open-failed', (event, videoPath, errorMessage) => {
        console.error('视频打开失败:', errorMessage);
        showError(`无法打开视频: ${errorMessage}`);
    });

    ipcRenderer.on('confirm-delete', (event, directoryPath) => {
        console.log('🗑️ 显示删除确认对话框:', directoryPath);
        showDeleteConfirmDialog(directoryPath);
    });

    ipcRenderer.on('directory-trashed', (event, directoryPath) => {
        console.log('✅ 目录已删除:', directoryPath);
        showSuccess(`目录已删除: ${directoryPath}`);
    });

    ipcRenderer.on('trash-failed', (event, directoryPath, errorMessage) => {
        console.error('❌ 删除目录失败:', errorMessage);
        showError(`删除目录失败: ${errorMessage}`);
    });

    // DOM事件
    const sortBySelect = document.getElementById('sort-by');
    const sortOrderSelect = document.getElementById('sort-order');
    const clearFiltersBtn = document.getElementById('clear-filters');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const openSettingsBtn = document.getElementById('open-settings-btn');

    // 过滤器元素
    const filterActorSelect = document.getElementById('filter-actor');
    const filterStudioSelect = document.getElementById('filter-studio');
    const filterGenreSelect = document.getElementById('filter-genre');

    if (sortBySelect) {
        sortBySelect.addEventListener('change', handleSortChange);
    }
    if (sortOrderSelect) {
        sortOrderSelect.addEventListener('change', handleSortChange);
    }
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearAllFilters);
    }

    // 添加过滤事件监听器
    if (filterActorSelect) {
        filterActorSelect.addEventListener('change', handleFilterChange);
    }
    if (filterStudioSelect) {
        filterStudioSelect.addEventListener('change', handleFilterChange);
    }
    if (filterGenreSelect) {
        filterGenreSelect.addEventListener('change', handleFilterChange);
    }
    if (themeToggleBtn) {
        console.log('✅ 找到主题切换按钮，添加事件监听器');
        themeToggleBtn.addEventListener('click', () => {
            console.log('🎨 主题切换按钮被点击！');
            toggleTheme();
        });
    } else {
        console.error('❌ 未找到主题切换按钮 #theme-toggle-btn');
    }
    if (openSettingsBtn) {
        console.log('✅ 找到设置按钮，添加事件监听器');
        openSettingsBtn.addEventListener('click', () => {
            console.log('⚙️ 设置按钮被点击！开始打开设置对话框');
            showMessage('设置按钮被点击了！', MESSAGE_TYPES.INFO);
            openSettingsDialog();
        });
    } else {
        console.error('❌ 未找到设置按钮 #open-settings-btn');
    }

    console.log('✅ 事件监听器初始化完成');
}



/**
 * 初始化搜索功能
 */
function initializeSearch() {
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');

    if (searchInput) {
        console.log('搜索输入框找到');

        // 防抖搜索
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                handleSearch(e.target.value);
            }, 300);
        });

        // ESC键清除
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && searchInput.value.trim() !== '') {
                e.preventDefault();
                searchInput.value = '';
                searchInput.blur();
                handleSearch('');
            }
        });

        // 全局快捷键
        document.addEventListener('keydown', (event) => {
            if (document.activeElement === searchInput) return;

            const activeElement = document.activeElement;
            const isInputFocused = activeElement && (
                activeElement.tagName === 'INPUT' ||
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.contentEditable === 'true'
            );

            if (isInputFocused) return;

            if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
                event.preventDefault();
                searchInput.value = event.key;
                searchInput.focus();
                const inputEvent = new Event('input', { bubbles: true });
                searchInput.dispatchEvent(inputEvent);
            }
        });

        // 清除按钮
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                searchInput.value = '';
                handleSearch('');
            });
        }
    } else {
        console.warn('⚠️ 搜索输入框未找到');
    }
}

/**
 * 处理初始扫描
 */
async function handleInitialScan(directoryPaths) {
    try {
        console.log('开始初始扫描...', directoryPaths);
        showInfo('正在扫描媒体文件...');

        const result = await ipcRenderer.invoke('scan-directory', directoryPaths);

        if (result.success) {
            allMediaList = result.data || [];
            console.log(`初始扫描完成，找到 ${allMediaList.length} 个媒体文件`);

            // 更新下拉框选项
            updateFilterDropdowns(allMediaList);

            // 渲染媒体列表
            renderMediaList(allMediaList, handleMediaClick, handleMediaContextMenu);

            showSuccess(`扫描完成，找到 ${allMediaList.length} 个媒体文件`, 3000);
        } else {
            throw new Error(result.error || '扫描失败');
        }
    } catch (error) {
        console.error('初始扫描失败:', error);
        showError(`扫描失败: ${error.message}`);
    }
}

/**
 * 处理搜索
 */
function handleSearch(query) {
    // 更新搜索输入框的值
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = query;
    }

    // 使用统一的过滤系统
    applyFilters();

    if (query && query.trim() !== '') {
        console.log(`🔍 搜索 "${query}"`);
    }
}

/**
 * 处理排序变化
 */
function handleSortChange() {
    const sortBy = document.getElementById('sort-by').value;
    const sortOrder = document.getElementById('sort-order').value;
    console.log(`📊 排序变化: ${sortBy} ${sortOrder}`);

    // 使用统一的过滤系统（包含排序逻辑）
    applyFilters();
}

/**
 * 清除所有过滤器
 */
function clearAllFilters() {
    const actorSelect = document.getElementById('filter-actor');
    const studioSelect = document.getElementById('filter-studio');
    const genreSelect = document.getElementById('filter-genre');
    const searchInput = document.getElementById('search-input');

    if (actorSelect) actorSelect.value = '';
    if (studioSelect) studioSelect.value = '';
    if (genreSelect) genreSelect.value = '';
    if (searchInput) searchInput.value = '';

    // 使用统一的过滤系统
    applyFilters();
    console.log('已清除所有过滤器');
}

/**
 * 处理媒体点击
 */
async function handleMediaClick(media) {
    try {
        console.log('🎬 开始播放视频:', media.videoPath);
        const result = await ipcRenderer.invoke('open-video', media.videoPath);
        if (result.success) {
            console.log('✅ 视频播放成功');
        } else {
            console.error('❌ 视频播放失败:', result.error);
            showError(`无法播放视频: ${result.error}`);
        }
    } catch (error) {
        console.error('❌ 播放视频异常:', error);
        showError(`播放视频失败: ${error.message}`);
    }
}

/**
 * 处理媒体右键菜单
 */
function handleMediaContextMenu(event, media) {
    try {
        console.log('📋 显示右键菜单:', media.videoPath);
        ipcRenderer.send('show-context-menu', media.videoPath);
    } catch (error) {
        console.error('❌ 显示右键菜单失败:', error);
    }
}

/**
 * 更新应用标题
 */
function updateAppTitle(appInfo) {
    const appTitleElement = document.getElementById('app-title');
    if (appTitleElement) {
        appTitleElement.textContent = `${appInfo.name} v${appInfo.version}`;
    }
}

/**
 * 显示无目录消息
 */
function showNoDirectoriesMessage() {
    const movieCoversDiv = document.getElementById('movie-covers');
    if (movieCoversDiv) {
        movieCoversDiv.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #666;">
                <div style="font-size: 64px; margin-bottom: 20px;">📁</div>
                <h2 style="margin: 0 0 12px 0; color: #333; font-size: 24px;">没有配置影片目录</h2>
                <p style="margin: 0 0 24px 0; color: #666; font-size: 16px;">请打开设置添加您的影片目录</p>
                <button onclick="openSettingsDialog()" style="
                    padding: 12px 24px;
                    background-color: #2196f3;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-size: 16px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                ">打开设置</button>
            </div>
        `;
    }

    showWarning('尚未配置影片目录，请打开设置添加目录');
}

/**
 * 显示删除确认对话框
 */
function showDeleteConfirmDialog(directoryPath) {
    console.log('🗑️ 显示删除确认对话框:', directoryPath);

    if (confirm(`确定要删除以下目录吗？\n\n${directoryPath}\n\n目录将被移动到回收站。`)) {
        ipcRenderer.send('delete-directory', directoryPath);
    }
}

/**
 * 更新过滤器下拉框
 */
function updateFilterDropdowns(mediaList) {
    updateDropdown('filter-actor', getUniqueActors(mediaList));
    updateDropdown('filter-studio', getUniqueStudios(mediaList));
    updateDropdown('filter-genre', getUniqueGenres(mediaList));
}

/**
 * 更新下拉框选项
 */
function updateDropdown(elementId, options) {
    const select = document.getElementById(elementId);
    if (!select) return;

    while (select.options.length > 1) {
        select.remove(1);
    }

    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        select.appendChild(optionElement);
    });
}

/**
 * 获取唯一的演员列表
 */
function getUniqueActors(mediaList) {
    const actors = new Set();
    mediaList.forEach(media => {
        if (media.actors && Array.isArray(media.actors)) {
            media.actors.forEach(actor => actors.add(actor));
        }
    });
    return Array.from(actors).sort();
}

/**
 * 获取唯一的片商列表
 */
function getUniqueStudios(mediaList) {
    const studios = new Set();
    mediaList.forEach(media => {
        if (media.studio) {
            studios.add(media.studio);
        }
    });
    return Array.from(studios).sort();
}

/**
 * 获取唯一的类别列表
 */
function getUniqueGenres(mediaList) {
    const genres = new Set();
    mediaList.forEach(media => {
        if (media.genres && Array.isArray(media.genres)) {
            media.genres.forEach(genre => genres.add(genre));
        }
    });
    return Array.from(genres).sort();
}

/**
 * 处理过滤变化
 */
function handleFilterChange() {
    console.log('🔍 过滤条件已更改');
    applyFilters();
}

/**
 * 应用当前过滤条件
 */
function applyFilters() {
    const filteredList = getFilteredMediaList();
    renderMediaList(filteredList, handleMediaClick, handleMediaContextMenu);
    console.log(`🔍 过滤完成，显示 ${filteredList.length} 个结果`);
}

/**
 * 获取过滤后的媒体列表
 * @returns {Object[]} 过滤后的媒体列表
 */
function getFilteredMediaList() {
    const actorFilter = document.getElementById('filter-actor')?.value || '';
    const studioFilter = document.getElementById('filter-studio')?.value || '';
    const genreFilter = document.getElementById('filter-genre')?.value || '';
    const searchQuery = document.getElementById('search-input')?.value || '';

    let filteredList = [...allMediaList];

    // 应用搜索过滤
    if (searchQuery.trim() !== '') {
        const searchLower = searchQuery.toLowerCase();
        filteredList = filteredList.filter(media => {
            return (media.title && media.title.toLowerCase().includes(searchLower)) ||
                   (media.id && media.id.toLowerCase().includes(searchLower));
        });
    }

    // 应用演员过滤
    if (actorFilter !== '') {
        filteredList = filteredList.filter(media => {
            return media.actors && Array.isArray(media.actors) &&
                   media.actors.some(actor => actor === actorFilter);
        });
    }

    // 应用片商过滤
    if (studioFilter !== '') {
        filteredList = filteredList.filter(media => {
            return media.studio === studioFilter;
        });
    }

    // 应用类别过滤
    if (genreFilter !== '') {
        filteredList = filteredList.filter(media => {
            return media.genres && Array.isArray(media.genres) &&
                   media.genres.some(genre => genre === genreFilter);
        });
    }

    // 应用排序
    const sortBy = document.getElementById('sort-by')?.value || 'title';
    const sortOrder = document.getElementById('sort-order')?.value || 'asc';

    filteredList.sort((a, b) => {
        let compareResult = 0;

        if (sortBy === 'title') {
            compareResult = (a.title || '').localeCompare(b.title || '');
        } else if (sortBy === 'releaseDate') {
            const dateA = a.releaseDateFull ? new Date(a.releaseDateFull) : new Date(0);
            const dateB = b.releaseDateFull ? new Date(b.releaseDateFull) : new Date(0);
            compareResult = dateA.getTime() - dateB.getTime();
        }

        return sortOrder === 'desc' ? -compareResult : compareResult;
    });

    return filteredList;
}

// 全局函数供HTML调用
window.openSettingsDialog = openSettingsDialog;

// 清理资源
window.addEventListener('beforeunload', () => {
    console.log('模块化应用程序即将关闭...');
});

console.log('✅ 模块化渲染进程脚本定义完成');