const { ipcRenderer } = require('electron');
const path = require('path');

let allMediaList = []; // 存储所有媒体数据的原始列表

/**
 * 初始化应用程序
 * 监听DOM加载完成事件，设置事件监听器和初始化界面
 */
function initializeApp() {
    document.addEventListener('DOMContentLoaded', async () => {
        const movieCoversDiv = document.getElementById('movie-covers');

        const sortBySelect = document.getElementById('sort-by');
        const sortOrderSelect = document.getElementById('sort-order');
        const filterActorInput = document.getElementById('filter-actor');
        const filterStudioInput = document.getElementById('filter-studio');
        const filterGenreInput = document.getElementById('filter-genre');
        const clearFiltersButton = document.getElementById('clear-filters');
        const openSettingsBtn = document.getElementById('open-settings-btn');

        // 初始化事件监听器
        initEventListeners(sortBySelect, sortOrderSelect, filterActorInput, filterStudioInput, filterGenreInput, clearFiltersButton, openSettingsBtn);

        // 初始化主题设置
        initThemeSettings();

        // 初始化窗口控制按钮
        initWindowControls();
    });
}

/**
 * 初始化各种事件监听器
 * @param {HTMLSelectElement} sortBySelect - 排序方式选择器
 * @param {HTMLSelectElement} sortOrderSelect - 排序顺序选择器
 * @param {HTMLInputElement} filterActorInput - 演员过滤输入框
 * @param {HTMLInputElement} filterStudioInput - 片商过滤输入框
 * @param {HTMLInputElement} filterGenreInput - 类别过滤输入框
 * @param {HTMLButtonElement} clearFiltersButton - 清除过滤按钮
 * @param {HTMLButtonElement} openSettingsBtn - 打开设置按钮
 */
function initEventListeners(sortBySelect, sortOrderSelect, filterActorInput, filterStudioInput, filterGenreInput, clearFiltersButton, openSettingsBtn) {
    // 监听主进程发送的确认删除事件
    ipcRenderer.on('confirm-delete', (event, directoryPath) => {
        const isConfirmed = confirm(`确定要删除影片目录及其所有内容吗？\n${directoryPath}`);
        if (isConfirmed) {
            ipcRenderer.send('delete-directory', directoryPath);
        }
    });

    // 监听目录删除结果事件
    ipcRenderer.on('directory-trashed', (event, directoryPath) => {
        alert(`影片目录已移至回收站:\n${directoryPath}`);
    });

    ipcRenderer.on('trash-failed', (event, directoryPath, errorMessage) => {
        alert(`删除失败:\n${errorMessage}`);
    });
    // 监听排序和过滤事件
    sortBySelect.addEventListener('change', () => renderMediaList(allMediaList));
    sortOrderSelect.addEventListener('change', () => renderMediaList(allMediaList));
    filterActorInput.addEventListener('input', () => renderMediaList(allMediaList));
    filterStudioInput.addEventListener('input', () => renderMediaList(allMediaList));
    filterGenreInput.addEventListener('input', () => renderMediaList(allMediaList));

    // 清除过滤按钮事件
    clearFiltersButton.addEventListener('click', () => {
        filterActorInput.value = '';
        filterStudioInput.value = '';
        filterGenreInput.value = '';
        renderMediaList(allMediaList);
    });

    // 打开设置按钮事件
    openSettingsBtn.addEventListener('click', openSettingsDialog);

    // 监听主进程事件
    ipcRenderer.on('start-initial-scan', async (event, directoryPaths) => {
        console.log("开始初次扫描...");
        allMediaList = await ipcRenderer.invoke('scan-directory', directoryPaths);
        console.log("初次扫描完成，找到", allMediaList.length, "个媒体文件。");
        renderMediaList(allMediaList);
    });

    ipcRenderer.on('no-directories-configured', () => {
        const movieCoversDiv = document.getElementById('movie-covers');
        movieCoversDiv.innerHTML = '<p>请在设置中配置影片目录。</p>';
    });

    ipcRenderer.on('settings-saved-and-rescan', async () => {
        console.log("设置已保存，重新扫描...");
        const settings = await ipcRenderer.invoke('get-settings');
        if (settings && settings.directories && settings.directories.length > 0) {
            allMediaList = await ipcRenderer.invoke('scan-directory', settings.directories);
            console.log("重新扫描完成，找到", allMediaList.length, "个媒体文件。");
            renderMediaList(allMediaList);
        } else {
            const movieCoversDiv = document.getElementById('movie-covers');
            movieCoversDiv.innerHTML = '<p>请在设置中配置影片目录。</p>';
            allMediaList = [];
        }
    });
}

/**
 * 初始化主题设置
 * 从本地存储加载主题偏好，设置主题切换按钮事件
 */
function initThemeSettings() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = document.querySelector('.theme-icon');

    // 从本地存储加载主题偏好
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.body.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.setAttribute('data-theme', 'dark');
        updateThemeIcon('dark');
    }

    // 监听系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem('theme')) {
            const newTheme = e.matches ? 'dark' : 'light';
            document.body.setAttribute('data-theme', newTheme);
            updateThemeIcon(newTheme);
        }
    });

    // 主题切换按钮点击事件
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.body.getAttribute('data-theme') ||
            (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });
}

/**
 * 更新主题图标
 * @param {string} theme - 当前主题模式('dark'或'light')
 */
function updateThemeIcon(theme) {
    const themeIcon = document.querySelector('.theme-icon');
    if (theme === 'dark') {
        themeIcon.textContent = '☀️';
        themeIcon.title = '切换到亮色主题';
    } else {
        themeIcon.textContent = '🌙';
        themeIcon.title = '切换到暗色主题';
    }
}

/**
 * 初始化窗口控制按钮
 * 设置最小化、最大化和关闭按钮的事件监听
 */
function initWindowControls() {
    const minimizeBtn = document.getElementById('minimize-btn');
    const maximizeBtn = document.getElementById('maximize-btn');
    const closeBtn = document.getElementById('close-btn');

    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => {
            ipcRenderer.send('minimize-window');
        });
    }
    if (maximizeBtn) {
        maximizeBtn.addEventListener('click', () => {
            ipcRenderer.send('maximize-restore-window');
        });
    }
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            ipcRenderer.send('close-window');
        });
    }

    // 监听窗口最大化状态变化
    ipcRenderer.on('window-maximized', (event, isMaximized) => {
        maximizeBtn.textContent = isMaximized ? '❐' : '□';
    });
}

/**
 * 打开设置对话框
 * 从主进程获取当前设置并动态创建设置表单
 */
async function openSettingsDialog() {
    const currentSettings = await ipcRenderer.invoke('get-settings');
    const settingsModal = document.getElementById('settings-modal');
    const settingsContent = document.getElementById('settings-content');

    settingsContent.innerHTML = `
        <div>
            <h3>媒体库目录</h3>
            <div id="directory-list">
                ${currentSettings.directories ? currentSettings.directories.map((dir, index) => `
                    <div class="directory-item" style="display: flex; align-items: center; margin-bottom: 10px;">
                        <input type="text" value="${dir}" readonly style="flex-grow: 1; margin-right: 10px;">
                        <button class="remove-directory-btn" data-index="${index}">删除</button>
                    </div>
                `).join('') : ''}
            </div>
            <button id="add-directory-btn">添加目录</button>
        </div>
    `;

    // 添加目录按钮事件
    document.getElementById('add-directory-btn').addEventListener('click', async () => {
        const result = await ipcRenderer.invoke('open-directory-dialog');
        if (!result.canceled && result.filePaths.length > 0) {
            const newDir = result.filePaths[0];
            const directoryList = document.getElementById('directory-list');
            directoryList.innerHTML += `
                <div class="directory-item" style="display: flex; align-items: center; margin-bottom: 10px;">
                    <input type="text" value="${newDir}" readonly style="flex-grow: 1; margin-right: 10px;">
                    <button class="remove-directory-btn" data-index="${directoryList.children.length}">删除</button>
                </div>
            `;
        }
    });

    // 删除目录按钮事件
    settingsContent.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-directory-btn')) {
            e.target.closest('.directory-item').remove();
        }
    });

    // 绑定设置模态框按钮事件
    document.getElementById('save-settings-btn').addEventListener('click', () => {
        // 获取所有目录输入框
        const dirInputs = document.querySelectorAll('#directory-list input[type="text"]');
        const directories = Array.from(dirInputs).map(input => input.value);

        // 保存设置
        ipcRenderer.invoke('save-settings', { directories });
        settingsModal.style.display = 'none';
    });

    document.getElementById('cancel-settings-btn').addEventListener('click', () => {
        settingsModal.style.display = 'none';
    });

    // 显示模态框
    settingsModal.style.display = 'block';
}

/**
 * 根据当前排序和过滤条件渲染媒体列表
 * @param {Array} mediaList - 媒体文件列表
 */
function renderMediaList(mediaList) {
    const movieCoversDiv = document.getElementById('movie-covers');
    const sortBy = document.getElementById('sort-by').value;
    const sortOrder = document.getElementById('sort-order').value;
    const filterActor = document.getElementById('filter-actor').value.toLowerCase();
    const filterStudio = document.getElementById('filter-studio').value.toLowerCase();
    const filterGenre = document.getElementById('filter-genre').value.toLowerCase();

    // 过滤
    const filteredList = mediaList.filter(movie => {
        const matchActor = filterActor === '' || (movie.actors && movie.actors.some(actor => actor.toLowerCase().includes(filterActor)));
        const matchStudio = filterStudio === '' || (movie.studio && movie.studio.toLowerCase().includes(filterStudio));
        const matchGenre = filterGenre === '' || (movie.genres && movie.genres.some(genre => genre.toLowerCase().includes(filterGenre)));
        return matchActor && matchStudio && matchGenre;
    });

    // 排序
    const sortedList = filteredList.sort((a, b) => {
        let compareResult = 0;
        if (sortBy === 'title') {
            compareResult = a.title.localeCompare(b.title);
        } else if (sortBy === 'releaseDate') {
            const dateA = a.releaseDateFull ? new Date(a.releaseDateFull) : new Date(0);
            const dateB = b.releaseDateFull ? new Date(b.releaseDateFull) : new Date(0);
            compareResult = dateA.getTime() - dateB.getTime();
        }

        return sortOrder === 'desc' ? -compareResult : compareResult;
    });

    // 清空当前显示
    movieCoversDiv.innerHTML = '';

    // 渲染过滤和排序后的列表
    if (sortedList.length > 0) {
        sortedList.forEach(movie => {
            const movieElement = document.createElement('div');
            movieElement.classList.add('movie-item');
            movieElement.dataset.videoPath = movie.videoPath;

            // 右键点击事件
            movieElement.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const videoPath = e.currentTarget.dataset.videoPath;
                ipcRenderer.send('show-context-menu', videoPath);
            });

            // 加载指示器
            const loadingSpinner = document.createElement('div');
            loadingSpinner.classList.add('loading-spinner');
            loadingSpinner.style.display = 'none';
            movieElement.appendChild(loadingSpinner);

            // 封面图片
            if (movie.coverImagePath) {
                const coverElement = document.createElement('img');
                coverElement.src = movie.coverImagePath;
                coverElement.alt = movie.title;
                coverElement.style.cursor = 'pointer';

                coverElement.addEventListener('click', () => {
                    ipcRenderer.send('open-video', movie.videoPath);
                });

                movieElement.appendChild(coverElement);
            } else {
                const noCoverElement = document.createElement('p');
                noCoverElement.textContent = '无封面';
                movieElement.appendChild(noCoverElement);
            }

            // 影片信息
            const movieInfoDiv = document.createElement('div');
            movieInfoDiv.classList.add('movie-info');

            const titleElement = document.createElement('h3');
            titleElement.textContent = movie.title;
            movieInfoDiv.appendChild(titleElement);

            if (movie.releaseDateFull) {
                const dateElement = document.createElement('p');
                dateElement.textContent = `发布日期: ${movie.releaseDateFull}`;
                movieInfoDiv.appendChild(dateElement);
            }

            if (movie.studio) {
                const studioElement = document.createElement('p');
                const studioLabel = document.createElement('span');
                studioLabel.textContent = '片商: ';
                studioElement.appendChild(studioLabel);

                const studioNameSpan = document.createElement('span');
                studioNameSpan.textContent = movie.studio;
                studioNameSpan.classList.add('clickable-text');
                studioNameSpan.style.cursor = 'pointer';
                studioNameSpan.style.textDecoration = 'underline';
                studioNameSpan.addEventListener('click', () => {
                    document.getElementById('filter-studio').value = movie.studio;
                    renderMediaList(allMediaList);
                });
                studioElement.appendChild(studioNameSpan);
                movieInfoDiv.appendChild(studioElement);
            }

            movieElement.appendChild(movieInfoDiv);
            movieCoversDiv.appendChild(movieElement);
        });
    } else {
        movieCoversDiv.innerHTML = '<p>没有找到匹配的媒体文件。</p>';
    }
}

// 初始化应用
initializeApp();