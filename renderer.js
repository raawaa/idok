console.log('renderer.js 开始执行');

// 使用electronAPI进行IPC通信（通过preload.js暴露）


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
        window.electronAPI.send('delete-directory', directoryPath);
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
 * 设置事件监听器和初始化界面
 */
function initializeApp() {
    console.log('initializeApp 被调用');
    
    // 确保 DOM 完全加载
    const ensureDOMReady = (callback) => {
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            console.log('DOM 已加载完成，执行回调');
            setTimeout(callback, 0);
        } else {
            console.log('等待 DOM 加载完成...');
            document.addEventListener('DOMContentLoaded', () => {
                console.log('DOMContentLoaded 事件触发，执行回调');
                callback();
            });
        }
    };
    
    // 初始化应用
    const initApp = () => {
        console.log('开始初始化应用...');
        
        // 获取所有需要的 DOM 元素
        const elements = {
            movieCoversDiv: document.getElementById('movie-covers'),
            sortBySelect: document.getElementById('sort-by'),
            sortOrderSelect: document.getElementById('sort-order'),
            filterActorInput: document.getElementById('filter-actor'),
            filterStudioInput: document.getElementById('filter-studio'),
            filterGenreInput: document.getElementById('filter-genre'),
            clearFiltersButton: document.getElementById('clear-filters'),
            openSettingsBtn: document.getElementById('open-settings-btn'),
            controlsElement: document.getElementById('controls')
        };
        
        console.log('获取到的元素:', elements);
        
        // 检查关键元素是否存在
        if (!elements.movieCoversDiv) {
            console.error('错误: 未找到 movie-covers 元素');
        }
        
        if (!elements.controlsElement) {
            console.error('错误: 未找到 controls 元素');
        }
        
        // 初始化事件监听器
        if (elements.sortBySelect && elements.sortOrderSelect && elements.filterActorInput && 
            elements.filterStudioInput && elements.filterGenreInput && 
            elements.clearFiltersButton && elements.openSettingsBtn) {
            
            console.log('初始化事件监听器...');
            initEventListeners(
                elements.sortBySelect, 
                elements.sortOrderSelect, 
                elements.filterActorInput, 
                elements.filterStudioInput, 
                elements.filterGenreInput, 
                elements.clearFiltersButton, 
                elements.openSettingsBtn
            );
        } else {
            console.error('部分元素未找到，无法初始化事件监听器');
        }

        // 初始化主题设置
        console.log('初始化主题设置...');
        initThemeSettings();

        // 初始化窗口控制按钮
        console.log('初始化窗口控制...');
        initWindowControls();

        // 监听应用信息事件并更新标题
        console.log('设置应用信息监听...');
        window.electronAPI.on('app-info', (appInfo) => {
            console.log('收到应用信息:', appInfo);
            const appTitleElement = document.getElementById('app-title');
            if (appTitleElement) {
                appTitleElement.textContent = `${appInfo.name} v${appInfo.version}`;
            } else {
                console.error('未找到 app-title 元素');
            }
        });
        
        // 设置 movie covers padding
        console.log('准备设置 movie covers padding...');
        const setupPadding = () => {
            console.log('调用 setupMovieCoversPadding...');
            const cleanup = setupMovieCoversPadding();
            
            if (typeof cleanup === 'function') {
                console.log('setupMovieCoversPadding 执行成功，返回了清理函数');
                
                // 延迟检查 padding 是否已应用
                setTimeout(() => {
                    const movieCovers = document.getElementById('movie-covers');
                    if (movieCovers) {
                        const paddingTop = getComputedStyle(movieCovers).paddingTop;
                        console.log('当前 movie-covers 的 padding-top:', paddingTop);
                        
                        if (paddingTop === '0px') {
                            console.warn('警告: movie-covers 的 padding-top 仍为 0，尝试重新设置...');
                            // 如果 padding 仍未应用，直接设置样式
                            const controls = document.getElementById('controls');
                            if (controls) {
                                const controlsHeight = controls.offsetHeight;
                                const newPadding = `${controlsHeight + 10}px`;
                                console.log(`直接设置 padding-top: ${newPadding}`);
                                movieCovers.style.paddingTop = newPadding;
                            }
                        }
                    }
                }, 500);
                
                // 添加一个更长的延迟检查
                setTimeout(() => {
                    const movieCovers = document.getElementById('movie-covers');
                    if (movieCovers) {
                        console.log('最终 movie-covers 的 padding-top:', getComputedStyle(movieCovers).paddingTop);
                    }
                }, 2000);
                
            } else {
                console.error('setupMovieCoversPadding 未返回清理函数，可能执行失败');
                
                // 如果 setupMovieCoversPadding 失败，尝试直接设置 padding
                const movieCovers = document.getElementById('movie-covers');
                const controls = document.getElementById('controls');
                
                if (movieCovers && controls) {
                    const controlsHeight = controls.offsetHeight;
                    const newPadding = `${controlsHeight + 10}px`;
                    console.log(`直接设置 padding-top: ${newPadding}`);
                    movieCovers.style.paddingTop = newPadding;
                }
            }
        };
        
        // 立即尝试设置 padding
        setupPadding();
        
        // 延迟 500ms 后再次尝试，确保所有内容都已加载
        setTimeout(setupPadding, 500);
        
        // 延迟 1 秒后再次尝试
        setTimeout(setupPadding, 1000);
    };
    
    // 确保 DOM 完全加载后初始化应用
    ensureDOMReady(initApp);
}

// 在文件底部调用 initializeApp 来启动应用
console.log('renderer.js 加载完成，准备初始化应用...');
initializeApp();

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
    window.electronAPI.on('confirm-delete', (directoryPath) => {
        showDeleteModal(directoryPath);
    });

    // 监听目录删除结果事件
    window.electronAPI.on('directory-trashed', (directoryPath) => {
        showMessage(`影片目录已移至回收站:\n${directoryPath}`, 'success');
    });

    window.electronAPI.on('trash-failed', (directoryPath, errorMessage) => {
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
        titlebarSearchInput.value = ''; // 同时清除搜索框
        renderMediaList(allMediaList);
    });

    // 打开设置按钮事件
    openSettingsBtn.addEventListener('click', openSettingsDialog);

    // 监听主进程事件
    window.electronAPI.on('start-initial-scan', async (directoryPaths) => {
        console.log("开始初次扫描...");
        try {
            allMediaList = await window.electronAPI.invoke('scan-directory', directoryPaths);
            console.log("初次扫描完成，找到", allMediaList.length, "个媒体文件。");
            populateDropdowns(allMediaList);
            renderMediaList(allMediaList);
            showMessage(`扫描完成，找到 ${allMediaList.length} 个媒体文件`, 'success', 3000);
        } catch (error) {
            console.error("扫描目录时出错:", error);
            showMessage(`扫描目录时出错: ${error.message}`, 'error');
        }
    });

    window.electronAPI.on('no-directories-configured', () => {
        const movieCoversDiv = document.getElementById('movie-covers');
        movieCoversDiv.innerHTML = '<p>请在设置中配置影片目录。</p>';
        showMessage('尚未配置影片目录，请打开设置添加目录', 'warning');
    });

    window.electronAPI.on('settings-saved-and-rescan', async () => {
        console.log("设置已保存，重新扫描...");
        try {
            const settings = await window.electronAPI.invoke('get-settings');
            if (settings && settings.directories && settings.directories.length > 0) {
                allMediaList = await window.electronAPI.invoke('scan-directory', settings.directories);
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
    console.log('初始化主题设置...');
    const themeToggleCheckbox = document.getElementById('theme-toggle');
    
    // 如果主题切换按钮不存在，则使用默认主题
    if (!themeToggleCheckbox) {
        console.warn('未找到主题切换按钮，使用默认主题设置');
        const defaultTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        document.body.setAttribute('data-theme', defaultTheme);
        return;
    }

    try {
        // 从本地存储加载主题偏好
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            document.body.setAttribute('data-theme', savedTheme);
            themeToggleCheckbox.checked = savedTheme === 'dark';
        } else if (window.matchMedia) {
            const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const theme = isDarkMode ? 'dark' : 'light';
            document.body.setAttribute('data-theme', theme);
            themeToggleCheckbox.checked = isDarkMode;
        }

        // 监听系统主题变化
        const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleSystemThemeChange = (e) => {
            if (!localStorage.getItem('theme')) {
                const newTheme = e.matches ? 'dark' : 'light';
                document.body.setAttribute('data-theme', newTheme);
                if (themeToggleCheckbox) {
                    themeToggleCheckbox.checked = e.matches;
                }
            }
        };
        
        // 添加事件监听器
        if (darkModeMediaQuery.addEventListener) {
            darkModeMediaQuery.addEventListener('change', handleSystemThemeChange);
        } else if (darkModeMediaQuery.addListener) { // 兼容旧版浏览器
            darkModeMediaQuery.addListener(handleSystemThemeChange);
        }

        // 主题切换按钮点击事件
        themeToggleCheckbox.addEventListener('change', () => {
            const newTheme = themeToggleCheckbox.checked ? 'dark' : 'light';
            document.body.setAttribute('data-theme', newTheme);
            try {
                localStorage.setItem('theme', newTheme);
            } catch (e) {
                console.error('无法保存主题设置到本地存储:', e);
            }
        });
        
        console.log('主题设置初始化完成');
    } catch (error) {
        console.error('初始化主题设置时出错:', error);
    }
}

/**
 * 初始化窗口控制按钮
 * 设置最小化、最大化和关闭按钮的事件监听
 */
function initWindowControls() {
    console.log('初始化窗口控制...');
    
    try {
        // 监听视频打开失败事件
        window.electronAPI.on('video-open-failed', (videoPath, errorMessage) => {
            console.error('视频播放失败:', videoPath, errorMessage);
            showMessage(`视频播放失败: ${errorMessage}`, 'error', 5000);
        });

        // 监听视频打开成功事件
        window.electronAPI.on('video-opened', (videoPath) => {
            console.log('视频已开始播放:', videoPath);
            showMessage('视频已开始播放', 'success', 2000);
        });

        // 监听打开视频文件所在目录失败事件
        window.electronAPI.on('video-directory-open-failed', (videoPath, errorMessage) => {
            console.error('无法打开视频文件所在目录:', videoPath, errorMessage);
            showMessage(`无法打开视频文件所在目录: ${errorMessage}`, 'error');
        });
        
        console.log('窗口控制初始化完成');
    } catch (error) {
        console.error('初始化窗口控制时出错:', error);
    }
}

// 监听右键菜单命令
window.electronAPI.on('context-menu-command', (command, videoPath) => {
    switch(command) {
        case 'play':
            window.electronAPI.send('open-video', videoPath);
            break;
        case 'open-folder':
            window.electronAPI.send('open-video-directory', videoPath);
            break;
        case 'delete':
            showDeleteModal(videoPath);
            break;
    }
});

/**
 * 打开设置对话框
 * 从主进程获取当前设置并动态创建设置表单
 */
async function openSettingsDialog() {
    const currentSettings = await window.electronAPI.invoke('get-settings');
    const settingsModal = document.getElementById('settings-modal');
    const settingsContent = document.getElementById('settings-content');

    // 使用HTML模板而非字符串拼接
    const directoryTemplate = document.getElementById('directory-settings-template');
    const playerTemplate = document.getElementById('player-settings-template');
    
    // 清空并重新填充设置内容
    settingsContent.innerHTML = '';
    settingsContent.appendChild(directoryTemplate.cloneNode(true));
    settingsContent.appendChild(playerTemplate.cloneNode(true));
    
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

    // 获取已安装的播放器列表
    try {
        const result = await ipcRenderer.invoke('get-installed-players');
        if (result.success && result.players && result.players.length > 0) {
            const playerSelect = document.getElementById('default-player-select');
            playerSelect.innerHTML = '<option value="">使用系统默认播放器</option>';
            
            result.players.forEach(player => {
                const option = document.createElement('option');
                option.value = JSON.stringify(player);
                option.textContent = player.name;
                playerSelect.appendChild(option);
            });
            
            // 设置当前选择的播放器
            if (currentSettings.defaultPlayer) {
                const currentPlayer = result.players.find(p => 
                    p.executable === currentSettings.defaultPlayer.executable && 
                    p.path === currentSettings.defaultPlayer.path
                );
                
                if (currentPlayer) {
                    playerSelect.value = JSON.stringify(currentPlayer);
                } else if (currentSettings.customPlayer && 
                          currentSettings.customPlayer.executable === currentSettings.defaultPlayer.executable && 
                          currentSettings.customPlayer.path === currentSettings.defaultPlayer.path) {
                    // 如果是自定义播放器，添加到列表并选中
                    const option = document.createElement('option');
                    option.value = JSON.stringify(currentSettings.customPlayer);
                    option.textContent = `${currentSettings.customPlayer.name} (自定义)`;
                    option.selected = true;
                    playerSelect.appendChild(option);
                }
            }
            
            // 更新播放器状态显示
            updatePlayerStatus(currentSettings.defaultPlayer);
        } else {
            // 没有找到播放器
            const playerSelect = document.getElementById('default-player-select');
            playerSelect.innerHTML = '<option value="">未找到可用播放器</option>';
            playerSelect.disabled = true;
            
            const playerStatus = document.getElementById('player-status');
            if (playerStatus) {
                playerStatus.textContent = '未检测到系统中的播放器';
                playerStatus.className = 'player-status error';
            }
        }
    } catch (error) {
        console.error('获取播放器列表失败:', error);
        const playerStatus = document.getElementById('player-status');
        if (playerStatus) {
            playerStatus.textContent = '获取播放器列表失败';
            playerStatus.className = 'player-status error';
        }
    }

    // 移除之前的事件监听器，避免重复添加
    const newSettingsModal = settingsModal.cloneNode(true);
    settingsModal.parentNode.replaceChild(newSettingsModal, settingsModal);
    
    // 使用新克隆的元素重新获取引用
    const modalElement = document.getElementById('settings-modal');
    
    // 使用事件委托统一管理设置对话框中的按钮事件
    modalElement.addEventListener('click', async (e) => {
        // 添加目录按钮点击事件
        if (e.target.id === 'add-directory-btn') {
            const result = await window.electronAPI.invoke('open-directory-dialog');
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
        // 自定义播放器按钮点击事件
        else if (e.target.id === 'custom-player-btn') {
            const result = await window.electronAPI.invoke('open-player-dialog');
            if (!result.canceled && result.filePaths.length > 0) {
                const playerPath = result.filePaths[0];
                const playerName = window.electronAPI.pathBasename(playerPath, '.exe');
                
                // 添加到播放器选择列表
                const playerSelect = document.getElementById('default-player-select');
                const option = document.createElement('option');
                option.value = JSON.stringify({
                    name: playerName,
                    executable: window.electronAPI.pathBasename(playerPath),
                    path: playerPath
                });
                option.textContent = `${playerName} (自定义)`;
                option.selected = true;
                playerSelect.appendChild(option);
                
                // 更新播放器状态显示
                updatePlayerStatus({
                    name: playerName,
                    executable: window.electronAPI.pathBasename(playerPath),
                    path: playerPath
                });
                
                showMessage(`已添加自定义播放器: ${playerName}`, 'success', 3000);
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
            
            // 获取选择的播放器
            const playerSelect = document.getElementById('default-player-select');
            let defaultPlayer = null;
            let customPlayer = null;
            
            if (playerSelect.value) {
                try {
                    defaultPlayer = JSON.parse(playerSelect.value);
                    
                    // 如果是自定义播放器，则保存到customPlayer字段
                    if (playerSelect.options[playerSelect.selectedIndex].textContent.includes('(自定义)')) {
                        customPlayer = defaultPlayer;
                    }
                } catch (error) {
                    console.error('解析播放器设置失败:', error);
                }
            }
            
            try {
                await window.electronAPI.invoke('save-settings', { directories, defaultPlayer, customPlayer });
                modalElement.style.display = 'none';
                showMessage('设置已保存', 'success', 3000);
            } catch (error) {
                console.error("保存设置时出错:", error);
                showMessage(`保存设置时出错: ${error.message}`, 'error');
            }
        }
        // 取消设置按钮点击事件
        else if (e.target.id === 'cancel-settings-btn') {
            modalElement.style.display = 'none';
        }
    });
    
    // 播放器选择器变化事件
    const playerSelect = document.getElementById('default-player-select');
    if (playerSelect) {
        playerSelect.addEventListener('change', (e) => {
            let selectedPlayer = null;
            
            if (e.target.value) {
                try {
                    selectedPlayer = JSON.parse(e.target.value);
                } catch (error) {
                    console.error('解析播放器设置失败:', error);
                }
            }
            
            updatePlayerStatus(selectedPlayer);
        });
    }

    // 显示模态框
    modalElement.style.display = 'block';
}

/**
 * 更新播放器状态显示
 * @param {Object} player - 播放器对象
 */
function updatePlayerStatus(player) {
    const playerStatus = document.getElementById('player-status');
    if (!playerStatus) return;
    
    if (player && player.name) {
        playerStatus.textContent = `当前选择: ${player.name}`;
        playerStatus.className = 'player-status success';
    } else {
        playerStatus.textContent = '使用系统默认播放器';
        playerStatus.className = 'player-status';
    }
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
                window.electronAPI.send('show-context-menu', videoPath);
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
                    window.electronAPI.send('open-video', movie.videoPath);
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

            // 添加info按钮
            const infoButton = document.createElement('button');
            infoButton.classList.add('info-button');
            infoButton.textContent = '信息';
            infoButton.title = '查看详细信息';
            infoButton.addEventListener('click', (e) => {
            e.stopPropagation();
            showMovieDetails(movie);
        });
        movieInfoDiv.appendChild(infoButton);

        movieElement.appendChild(movieInfoDiv);
        movieCoversDiv.appendChild(movieElement);
    });
} else {
    movieCoversDiv.innerHTML = '<p>没有找到匹配的媒体文件。</p>';
}
}

/**
 * 使用 ResizeObserver 动态调整 #movie-covers 的 padding-top
 * 确保内容始终在 controls 元素下方 10px 处开始
 * @returns {Function} 清理函数，用于在组件卸载时调用
 */
function setupMovieCoversPadding() {
    console.log('setupMovieCoversPadding 被调用');
    
    // 确保 DOM 完全加载
    const ensureElements = () => {
        const controlsElement = document.getElementById('controls');
        const movieCovers = document.getElementById('movie-covers');
        
        if (!controlsElement || !movieCovers) {
            console.log('元素尚未加载完成，等待 100ms 后重试...');
            setTimeout(ensureElements, 100);
            return null;
        }
        
        return { controlsElement, movieCovers };
    };
    
    const elements = ensureElements();
    if (!elements) return () => {};
    
    const { controlsElement, movieCovers } = elements;
    console.log('找到 controls 和 movie-covers 元素');

    // 立即设置初始 padding 为 0，避免初始加载时的闪烁
    movieCovers.style.setProperty('padding-top', '0', 'important');
    
    // 添加一个类名用于调试
    movieCovers.classList.add('movie-covers-padding-adjusted');

    // 更新 padding 的函数
    const updatePadding = () => {
        const controlsHeight = controlsElement.offsetHeight;
        const newPadding = `${controlsHeight + 20}px`;
        console.log(`更新 padding-top: ${newPadding}`);
        
        // 直接设置样式
        movieCovers.style.setProperty('padding-top', newPadding, 'important');
    };

    // 检查是否支持 ResizeObserver
    if (typeof ResizeObserver !== 'undefined') {
        console.log('使用 ResizeObserver 监听 controls 高度变化');
        
        let animationFrameId;
        const resizeObserver = new ResizeObserver((entries) => {
            console.log('检测到 controls 尺寸变化');
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            animationFrameId = requestAnimationFrame(updatePadding);
        });

        // 监听 controls 元素的大小变化
        resizeObserver.observe(controlsElement, { box: 'border-box' });
        
        // 初始设置
        updatePadding();
        
        // 添加一个定时器，确保在加载后再次更新
        const updateAfterLoad = () => {
            console.log('执行延迟更新...');
            updatePadding();
        };
        
        // 延迟 500ms 后再次更新，确保所有内容都已加载
        setTimeout(updateAfterLoad, 500);
        
        // 返回清理函数
        return () => {
            console.log('清理 ResizeObserver');
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            resizeObserver.disconnect();
        };
    } else {
        console.warn('浏览器不支持 ResizeObserver，使用回退方案');
        
        // 回退方案：使用 window.resize 事件
        let animationFrameId;
        const handleResize = () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            animationFrameId = requestAnimationFrame(updatePadding);
        };

        // 添加事件监听
        window.addEventListener('resize', handleResize);
        
        // 初始设置
        updatePadding();
        
        // 添加一个定时器，确保在加载后再次更新
        const updateAfterLoad = () => {
            console.log('执行延迟更新...');
            updatePadding();
        };
        
        // 延迟 500ms 后再次更新，确保所有内容都已加载
        setTimeout(updateAfterLoad, 500);

        // 返回清理函数
        return () => {
            console.log('清理 resize 事件监听');
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            window.removeEventListener('resize', handleResize);
        };
    }
}

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
 * 显示影片详细信息模态框
 * @param {Object} movie - 影片信息对象
 */
function showMovieDetails(movie) {
    // 获取模态框元素
    const modal = document.getElementById('movie-details-modal');
    
    // 填充模态框内容
    document.getElementById('movie-details-title').textContent = movie.title;
    
    document.getElementById('movie-details-date').textContent = movie.releaseDateFull || '无';
    
    // 为片商添加可点击功能
    const studioElement = document.getElementById('movie-details-studio');
    if (movie.studio) {
        studioElement.innerHTML = '';
        const studioSpan = document.createElement('span');
        studioSpan.textContent = movie.studio;
        studioSpan.classList.add('clickable-detail');
        studioSpan.addEventListener('click', () => {
            modal.style.display = 'none';
            document.getElementById('filter-studio').value = movie.studio;
            renderMediaList(allMediaList);
        });
        studioElement.appendChild(studioSpan);
    } else {
        studioElement.textContent = '无';
    }
    
    // 为演员添加可点击功能
    const actorsElement = document.getElementById('movie-details-actors');
    if (movie.actors && movie.actors.length > 0) {
        actorsElement.innerHTML = '';
        movie.actors.forEach((actor, index) => {
            const actorSpan = document.createElement('span');
            actorSpan.textContent = actor;
            actorSpan.classList.add('clickable-detail');
            actorSpan.addEventListener('click', () => {
                modal.style.display = 'none';
                document.getElementById('filter-actor').value = actor;
                renderMediaList(allMediaList);
            });
            actorsElement.appendChild(actorSpan);
            // 添加分隔符
            if (index < movie.actors.length - 1) {
                actorsElement.appendChild(document.createTextNode(', '));
            }
        });
    } else {
        actorsElement.textContent = '无';
    }
    
    // 为导演添加可点击功能
    const directorsElement = document.getElementById('movie-details-directors');
    if (movie.directors && movie.directors.length > 0) {
        directorsElement.innerHTML = '';
        movie.directors.forEach((director, index) => {
            const directorSpan = document.createElement('span');
            directorSpan.textContent = director;
            directorSpan.classList.add('clickable-detail');
            directorSpan.addEventListener('click', () => {
                modal.style.display = 'none';
                // 这里可以添加导演筛选功能，如果需要的话
                // 目前我们只关闭模态框
                console.log('导演筛选功能待实现:', director);
            });
            directorsElement.appendChild(directorSpan);
            // 添加分隔符
            if (index < movie.directors.length - 1) {
                directorsElement.appendChild(document.createTextNode(', '));
            }
        });
    } else {
        directorsElement.textContent = '无';
    }
    
    // 为类别添加可点击功能
    const genresElement = document.getElementById('movie-details-genres');
    if (movie.genres && movie.genres.length > 0) {
        genresElement.innerHTML = '';
        movie.genres.forEach((genre, index) => {
            const genreSpan = document.createElement('span');
            genreSpan.textContent = genre;
            genreSpan.classList.add('clickable-detail');
            genreSpan.addEventListener('click', () => {
                modal.style.display = 'none';
                document.getElementById('filter-genre').value = genre;
                renderMediaList(allMediaList);
            });
            genresElement.appendChild(genreSpan);
            // 添加分隔符
            if (index < movie.genres.length - 1) {
                genresElement.appendChild(document.createTextNode(', '));
            }
        });
    } else {
        genresElement.textContent = '无';
    }
    
    // 为视频路径添加可点击功能
    const pathElement = document.getElementById('movie-details-path');
    if (movie.videoPath) {
        pathElement.innerHTML = '';
        const pathSpan = document.createElement('span');
        pathSpan.textContent = movie.videoPath;
        pathSpan.classList.add('clickable-detail');
        pathSpan.title = '点击打开文件所在目录';
        pathSpan.addEventListener('click', () => {
            // 发送IPC消息到主进程打开文件所在目录
            window.electronAPI.send('open-video-directory', movie.videoPath);
            modal.style.display = 'none';
        });
        pathElement.appendChild(pathSpan);
    } else {
        pathElement.textContent = '无';
    }

    // 显示模态框
    modal.style.display = 'block';

    // 添加关闭按钮事件
    document.getElementById('close-details-btn').addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // 点击模态框外部关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
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