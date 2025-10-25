const { ipcRenderer } = require('electron');


let allMediaList = []; // 存储所有媒体数据的原始列表

/**
 * 显示消息提示
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型 ('error', 'warning', 'success', 'info')
 * @param {number} duration - 显示时长(毫秒)，默认为5000
 */
function showMessage(message, type = 'info', duration = 5000) {
    // 创建消息容器（如果不存在）
    let messageContainer = document.getElementById('message-container');
    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.id = 'message-container';
        document.body.appendChild(messageContainer);
    }
    
    // 创建消息元素
    const messageElement = document.createElement('div');
    messageElement.className = `${type}-message`;
    
    // 添加图标
    const iconElement = document.createElement('span');
    iconElement.className = 'error-icon';
    let icon = '';
    switch(type) {
        case 'error': icon = '❌'; break;
        case 'warning': icon = '⚠️'; break;
        case 'success': icon = '✅'; break;
        case 'info': icon = 'ℹ️'; break;
        default: icon = 'ℹ️';
    }
    iconElement.textContent = icon;
    
    // 添加文本
    const textElement = document.createElement('span');
    textElement.className = 'error-text';
    textElement.textContent = message;
    
    // 添加关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => {
        messageElement.classList.remove('show');
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, 300);
    });
    
    // 组装消息元素
    messageElement.appendChild(iconElement);
    messageElement.appendChild(textElement);
    messageElement.appendChild(closeBtn);
    
    // 添加到容器
    messageContainer.appendChild(messageElement);
    
    // 显示动画
    setTimeout(() => {
        messageElement.classList.add('show');
    }, 10);
    
    // 自动隐藏
    if (duration > 0) {
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.classList.remove('show');
                setTimeout(() => {
                    if (messageElement.parentNode) {
                        messageElement.parentNode.removeChild(messageElement);
                    }
                }, 300);
            }
        }, duration);
    }
}

/**
 * 显示删除确认模态框
 * @param {string} directoryPath - 要删除的目录路径
 */
function showDeleteModal(directoryPath) {
    const deleteModal = document.getElementById('delete-modal');
    const deletePathElement = document.getElementById('delete-path');
    const confirmBtn = document.getElementById('confirm-delete-btn');
    const cancelBtn = document.getElementById('cancel-delete-btn');
    
    // 设置要删除的路径
    deletePathElement.textContent = directoryPath;
    
    // 显示模态框
    deleteModal.style.display = 'block';
    
    // 确认删除按钮事件
    const handleConfirm = () => {
        ipcRenderer.send('delete-directory', directoryPath);
        deleteModal.style.display = 'none';
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
    };
    
    // 取消删除按钮事件
    const handleCancel = () => {
        deleteModal.style.display = 'none';
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
    };
    
    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
}

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

        // 监听应用信息事件并更新标题
        ipcRenderer.on('app-info', (event, appInfo) => {
            const appTitleElement = document.getElementById('app-title');
            if (appTitleElement) {
                appTitleElement.textContent = `${appInfo.name} v${appInfo.version}`;
            }
        });
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
        showDeleteModal(directoryPath);
    });

    // 监听目录删除结果事件
    ipcRenderer.on('directory-trashed', (event, directoryPath) => {
        showMessage(`影片目录已移至回收站:\n${directoryPath}`, 'success');
    });

    ipcRenderer.on('trash-failed', (event, directoryPath, errorMessage) => {
        showMessage(`删除失败:\n${errorMessage}`, 'error');
    });
    // 监听排序和过滤事件
    sortBySelect.addEventListener('change', () => renderMediaList(allMediaList));
    sortOrderSelect.addEventListener('change', () => renderMediaList(allMediaList));
    filterActorInput.addEventListener('change', () => renderMediaList(allMediaList));
    filterStudioInput.addEventListener('change', () => renderMediaList(allMediaList));
    filterGenreInput.addEventListener('change', () => renderMediaList(allMediaList));

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
        try {
            allMediaList = await ipcRenderer.invoke('scan-directory', directoryPaths);
            console.log("初次扫描完成，找到", allMediaList.length, "个媒体文件。");
            populateDropdowns(allMediaList);
            renderMediaList(allMediaList);
            showMessage(`扫描完成，找到 ${allMediaList.length} 个媒体文件`, 'success', 3000);
        } catch (error) {
            console.error("扫描目录时出错:", error);
            showMessage(`扫描目录时出错: ${error.message}`, 'error');
        }
    });

    ipcRenderer.on('no-directories-configured', () => {
        const movieCoversDiv = document.getElementById('movie-covers');
        movieCoversDiv.innerHTML = '<p>请在设置中配置影片目录。</p>';
        showMessage('尚未配置影片目录，请打开设置添加目录', 'warning');
    });

    ipcRenderer.on('settings-saved-and-rescan', async () => {
        console.log("设置已保存，重新扫描...");
        try {
            const settings = await ipcRenderer.invoke('get-settings');
            if (settings && settings.directories && settings.directories.length > 0) {
                allMediaList = await ipcRenderer.invoke('scan-directory', settings.directories);
                console.log("重新扫描完成，找到", allMediaList.length, "个媒体文件。");
                populateDropdowns(allMediaList);
                renderMediaList(allMediaList);
                showMessage(`重新扫描完成，找到 ${allMediaList.length} 个媒体文件`, 'success', 3000);
            } else {
                const movieCoversDiv = document.getElementById('movie-covers');
                movieCoversDiv.innerHTML = '<p>请在设置中配置影片目录。</p>';
                allMediaList = [];
                showMessage('尚未配置影片目录，请打开设置添加目录', 'warning');
            }
        } catch (error) {
            console.error("重新扫描目录时出错:", error);
            showMessage(`重新扫描目录时出错: ${error.message}`, 'error');
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

    // 监听视频打开失败事件
    ipcRenderer.on('video-open-failed', (event, videoPath, errorMessage) => {
        showMessage(`无法打开视频文件:\n${videoPath}\n错误: ${errorMessage}`, 'error');
    });

    // 监听视频打开成功事件
    ipcRenderer.on('video-opened', (event, videoPath) => {
        showMessage(`已打开视频: ${videoPath}`, 'success', 3000);
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

    // 使用HTML模板而非字符串拼接
    const template = document.getElementById('directory-settings-template');
    settingsContent.innerHTML = template.innerHTML;
    
    const directoryList = document.getElementById('directory-list');
    // 清空现有目录项（保留模板结构）
    directoryList.innerHTML = '';
    
    // 填充目录数据
    (currentSettings.directories || []).forEach((dir, index) => {
        const dirItem = document.createElement('div');
        dirItem.className = 'directory-item';
        dirItem.dataset.index = index;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.value = dir;
        input.readOnly = true;
        input.className = 'directory-path';
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-directory-btn';
        removeBtn.textContent = '删除';
        
        dirItem.appendChild(input);
        dirItem.appendChild(removeBtn);
        directoryList.appendChild(dirItem);
    });

    // 使用事件委托统一管理设置对话框中的按钮事件
    settingsModal.addEventListener('click', async (e) => {
        // 添加目录按钮点击事件
        if (e.target.id === 'add-directory-btn') {
            const result = await ipcRenderer.invoke('open-directory-dialog');
            if (!result.canceled && result.filePaths.length > 0) {
                const newDir = result.filePaths[0];
                const directoryList = document.getElementById('directory-list');
                
                const dirItem = document.createElement('div');
                dirItem.className = 'directory-item';
                dirItem.dataset.index = directoryList.children.length;
                
                const input = document.createElement('input');
                input.type = 'text';
                input.value = newDir;
                input.readOnly = true;
                input.className = 'directory-path';
                
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-directory-btn';
                removeBtn.textContent = '删除';
                
                dirItem.appendChild(input);
                dirItem.appendChild(removeBtn);
                directoryList.appendChild(dirItem);
            }
        }
        // 删除目录按钮点击事件
        else if (e.target.classList.contains('remove-directory-btn')) {
            e.target.closest('.directory-item').remove();
        }
        // 保存设置按钮点击事件
        else if (e.target.id === 'save-settings-btn') {
            const dirInputs = document.querySelectorAll('#directory-list input[type="text"]');
            const directories = Array.from(dirInputs).map(input => input.value);
            
            try {
                await ipcRenderer.invoke('save-settings', { directories });
                settingsModal.style.display = 'none';
                showMessage('设置已保存', 'success', 3000);
            } catch (error) {
                console.error("保存设置时出错:", error);
                showMessage(`保存设置时出错: ${error.message}`, 'error');
            }
        }
        // 取消设置按钮点击事件
        else if (e.target.id === 'cancel-settings-btn') {
            settingsModal.style.display = 'none';
        }
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

                // 添加图片加载错误处理
                coverElement.addEventListener('error', () => {
                    coverElement.style.display = 'none';
                    const noCoverElement = document.createElement('p');
                    noCoverElement.textContent = '封面加载失败';
                    movieElement.appendChild(noCoverElement);
                });

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

/**
 * 从媒体列表中提取唯一的演员列表
 * @param {Array} mediaList - 媒体数据列表
 * @returns {Array} 唯一的演员数组
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
 * 从媒体列表中提取唯一的片商列表
 * @param {Array} mediaList - 媒体数据列表
 * @returns {Array} 唯一的片商数组
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
 * 从媒体列表中提取唯一的类别列表
 * @param {Array} mediaList - 媒体数据列表
 * @returns {Array} 唯一的类别数组
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
 * 填充下拉菜单选项
 * @param {Array} mediaList - 媒体数据列表
 */
function populateDropdowns(mediaList) {
    const actorSelect = document.getElementById('filter-actor');
    const studioSelect = document.getElementById('filter-studio');
    const genreSelect = document.getElementById('filter-genre');

    // 清空现有选项，保留第一个"全部"选项
    while (actorSelect.options.length > 1) {
        actorSelect.remove(1);
    }
    while (studioSelect.options.length > 1) {
        studioSelect.remove(1);
    }
    while (genreSelect.options.length > 1) {
        genreSelect.remove(1);
    }

    // 添加演员选项
    getUniqueActors(mediaList).forEach(actor => {
        const option = document.createElement('option');
        option.value = actor;
        option.textContent = actor;
        actorSelect.appendChild(option);
    });

    // 添加片商选项
    getUniqueStudios(mediaList).forEach(studio => {
        const option = document.createElement('option');
        option.value = studio;
        option.textContent = studio;
        studioSelect.appendChild(option);
    });

    // 添加类别选项
    getUniqueGenres(mediaList).forEach(genre => {
        const option = document.createElement('option');
        option.value = genre;
        option.textContent = genre;
        genreSelect.appendChild(option);
    });
}