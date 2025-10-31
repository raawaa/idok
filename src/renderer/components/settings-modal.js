/**
 * 设置模态框组件
 */

const { ipcRenderer } = require('electron');
const { showMessage } = require('../../renderer/utils/dom-utils');
const { MESSAGE_TYPES } = require('../../shared/constants');

let currentSettings = null;

/**
 * 打开设置对话框
 */
async function openSettingsDialog() {
    try {
        console.log('🚀 openSettingsDialog 函数被调用');
        console.log('⚙️ 开始打开设置对话框...');
        showMessage('正在加载设置...', MESSAGE_TYPES.INFO);
        console.log('📋 显示了加载信息');

        // 获取当前设置
        const result = await ipcRenderer.invoke('get-settings');
        if (!result.success) {
            throw new Error(result.error || '获取设置失败');
        }

        currentSettings = result.data;
        console.log('📋 当前设置:', currentSettings);

        // 使用现有的静态设置对话框
        const settingsModal = document.getElementById('settings-modal');
        if (!settingsModal) {
            throw new Error('未找到设置模态框元素');
        }

        console.log('🎯 找到设置模态框，开始填充内容');

        // 填充设置内容
        await populateSettingsContent(currentSettings);

        // 显示对话框
        settingsModal.style.display = 'block';
        console.log('✅ 设置对话框已显示');

        // 添加显示动画
        requestAnimationFrame(() => {
            settingsModal.classList.add('show');
        });

        console.log('✅ 设置对话框打开成功');

    } catch (error) {
        console.error('❌ 打开设置对话框失败:', error);
        showMessage(`打开设置失败: ${error.message}`, MESSAGE_TYPES.ERROR);
    }
}

/**
 * 填充设置内容
 */
async function populateSettingsContent(settings) {
    const content = document.getElementById('settings-content');
    if (!content) return;

    content.innerHTML = `
        <!-- 目录设置部分 -->
        <div class="settings-section">
            <h3 style="margin: 0; padding: 20px 24px 10px; color: #333; font-size: 18px;">📁 媒体库目录</h3>
            <div id="directory-list" class="directory-list"></div>
            <div style="padding: 0 24px 20px;">
                <button type="button" id="add-directory-btn" class="btn btn-primary" style="
                    padding: 10px 16px;
                    background: #007bff;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background-color 0.2s;
                ">添加目录</button>
            </div>
        </div>

        <!-- 播放器设置部分 -->
        <div class="settings-section">
            <h3 style="margin: 0; padding: 20px 24px 10px; color: #333; font-size: 18px;">🎬 默认播放器</h3>
            <div style="padding: 0 24px 20px;">
                <div style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 6px; font-weight: 500; color: #555;">选择播放器:</label>
                    <select id="default-player-select" style="
                        width: 100%;
                        padding: 8px 12px;
                        border: 1px solid #ddd;
                        border-radius: 6px;
                        font-size: 14px;
                        background: white;
                    ">
                        <option value="">系统默认播放器</option>
                        <option value="vlc">VLC Media Player</option>
                        <option value="mpv">MPV</option>
                        <option value="potplayer">PotPlayer</option>
                    </select>
                </div>
                <button type="button" id="custom-player-btn" class="btn btn-secondary" style="
                    padding: 8px 16px;
                    background: #6c757d;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    margin-right: 10px;
                    transition: background-color 0.2s;
                ">自定义播放器</button>
                <div id="player-status" style="margin-top: 8px; font-size: 12px; color: #666;"></div>
            </div>
        </div>

        <!-- 主题设置部分 -->
        <div class="settings-section">
            <h3 style="margin: 0; padding: 20px 24px 10px; color: #333; font-size: 18px;">🎨 主题设置</h3>
            <div style="padding: 0 24px 20px;">
                <label style="display: block; margin-bottom: 6px; font-weight: 500; color: #555;">主题模式:</label>
                <select id="theme-select" style="
                    width: 100%;
                    padding: 8px 12px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    font-size: 14px;
                    background: white;
                ">
                    <option value="auto">跟随系统</option>
                    <option value="light">浅色主题</option>
                    <option value="dark">深色主题</option>
                </select>
            </div>
        </div>
    `;

    // 设置事件监听器
    setupSettingsEventListeners(settings);
}

/**
 * 设置设置对话框事件监听器
 */
function setupSettingsEventListeners(settings) {
    // 添加目录按钮
    const addDirBtn = document.getElementById('add-directory-btn');
    if (addDirBtn) {
        addDirBtn.addEventListener('click', async () => {
            try {
                const result = await ipcRenderer.invoke('open-directory-dialog');
                if (!result.canceled && result.filePaths.length > 0) {
                    const newDir = result.filePaths[0];
                    addDirectoryToList(newDir);
                    showMessage(`已添加目录: ${newDir}`, MESSAGE_TYPES.SUCCESS);
                }
            } catch (error) {
                console.error('添加目录失败:', error);
                showMessage('添加目录失败', MESSAGE_TYPES.ERROR);
            }
        });
    }

    // 自定义播放器按钮
    const customPlayerBtn = document.getElementById('custom-player-btn');
    if (customPlayerBtn) {
        customPlayerBtn.addEventListener('click', async () => {
            try {
                const result = await ipcRenderer.invoke('open-player-dialog');
                if (!result.canceled && result.filePaths.length > 0) {
                    const playerPath = result.filePaths[0];
                    const playerName = getFileName(playerPath);

                    addCustomPlayer(playerName, playerPath);
                    showMessage(`已添加自定义播放器: ${playerName}`, MESSAGE_TYPES.SUCCESS);
                }
            } catch (error) {
                console.error('添加自定义播放器失败:', error);
                showMessage('添加自定义播放器失败', MESSAGE_TYPES.ERROR);
            }
        });
    }

    // 删除目录按钮事件委托
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-directory-btn')) {
            e.target.closest('.directory-item').remove();
        }
    });

    // 播放器选择变化
    const playerSelect = document.getElementById('default-player-select');
    if (playerSelect) {
        playerSelect.addEventListener('change', () => {
            updatePlayerStatus(playerSelect.value);
        });
    }

    // 主题选择变化
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
        themeSelect.addEventListener('change', (e) => {
            const newTheme = e.target.value;
            if (newTheme !== 'auto') {
                document.body.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
            } else {
                localStorage.removeItem('theme');
                // 恢复系统主题
                if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    document.body.setAttribute('data-theme', 'dark');
                } else {
                    document.body.setAttribute('data-theme', 'light');
                }
            }
        });
    }

    // 保存设置按钮
    const saveBtn = document.getElementById('save-settings-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            try {
                console.log('💾 保存设置按钮被点击');
                const newSettings = collectCurrentSettings();
                const result = await ipcRenderer.invoke('save-settings', newSettings);
                if (result.success) {
                    showMessage('设置已保存', MESSAGE_TYPES.SUCCESS);
                    closeSettingsDialog();
                } else {
                    showMessage(result.error || '保存设置失败', MESSAGE_TYPES.ERROR);
                }
            } catch (error) {
                console.error('保存设置失败:', error);
                showMessage('保存设置失败', MESSAGE_TYPES.ERROR);
            }
        });
    }

    // 取消设置按钮
    const cancelBtn = document.getElementById('cancel-settings-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            console.log('❌ 取消设置按钮被点击');
            closeSettingsDialog();
        });
    }

    // 填充当前设置
    populateCurrentSettings(settings);
}

/**
 * 填充当前设置
 */
function populateCurrentSettings(settings) {
    // 填充目录列表
    if (settings.directories && settings.directories.length > 0) {
        settings.directories.forEach(dir => {
            addDirectoryToList(dir);
        });
    }

    // 填充播放器选择
    const playerSelect = document.getElementById('default-player-select');
    if (playerSelect && settings.defaultPlayer) {
        playerSelect.value = settings.defaultPlayer;
    }

    // 填充主题选择
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect && settings.theme) {
        themeSelect.value = settings.theme;
    }
}

/**
 * 添加目录到列表
 */
function addDirectoryToList(directoryPath) {
    const directoryList = document.getElementById('directory-list');
    if (!directoryList) return;

    const directoryItem = document.createElement('div');
    directoryItem.className = 'directory-item';
    directoryItem.style.cssText = `
        display: flex;
        align-items: center;
        padding: 12px;
        margin-bottom: 8px;
        background: #f8f9fa;
        border-radius: 6px;
        border: 1px solid #e9ecef;
    `;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = directoryPath;
    input.readOnly = true;
    input.style.cssText = `
        flex: 1;
        padding: 6px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: white;
        font-size: 14px;
        margin-right: 12px;
    `;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-directory-btn';
    removeBtn.textContent = '删除';
    removeBtn.style.cssText = `
        padding: 6px 12px;
        background: #dc3545;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: background-color 0.2s;
    `;

    removeBtn.addEventListener('mouseenter', () => {
        removeBtn.style.backgroundColor = '#c82333';
    });

    removeBtn.addEventListener('mouseleave', () => {
        removeBtn.style.backgroundColor = '#dc3545';
    });

    directoryItem.appendChild(input);
    directoryItem.appendChild(removeBtn);
    directoryList.appendChild(directoryItem);
}

/**
 * 添加自定义播放器
 */
function addCustomPlayer(playerName, playerPath) {
    const playerSelect = document.getElementById('default-player-select');
    if (!playerSelect) return;

    // 检查是否已存在
    const existingOption = Array.from(playerSelect.options).find(
        option => option.value === playerPath
    );

    if (!existingOption) {
        const option = document.createElement('option');
        option.value = playerPath;
        option.textContent = playerName;
        playerSelect.appendChild(option);
        playerSelect.value = playerPath;
    }

    updatePlayerStatus(playerPath);
}

/**
 * 更新播放器状态
 */
function updatePlayerStatus(playerPath) {
    const statusDiv = document.getElementById('player-status');
    if (!statusDiv) return;

    if (playerPath) {
        statusDiv.textContent = `已选择: ${getFileName(playerPath)}`;
        statusDiv.style.color = '#28a745';
    } else {
        statusDiv.textContent = '将使用系统默认播放器';
        statusDiv.style.color = '#6c757d';
    }
}

/**
 * 收集当前设置
 */
function collectCurrentSettings() {
    const directories = [];
    const directoryItems = document.querySelectorAll('#directory-list .directory-item');
    directoryItems.forEach(item => {
        const input = item.querySelector('input');
        if (input && input.value) {
            directories.push(input.value);
        }
    });

    const defaultPlayer = document.getElementById('default-player-select')?.value || '';
    const theme = document.getElementById('theme-select')?.value || 'auto';

    return {
        directories,
        defaultPlayer,
        theme
    };
}

/**
 * 关闭设置对话框
 */
function closeSettingsDialog() {
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) {
        settingsModal.style.display = 'none';
        settingsModal.classList.remove('show');
    }
}

/**
 * 获取文件名
 */
function getFileName(filePath) {
    const path = require('path');
    return path.basename(filePath);
}

module.exports = {
    openSettingsDialog,
    closeSettingsDialog,
    populateCurrentSettings
};