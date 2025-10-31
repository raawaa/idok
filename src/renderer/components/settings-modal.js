/**
 * 设置模态框组件 - 重构版本
 * 通过IPC与主进程通信，实现设置的读取和保存，与主应用程序设置系统完全集成
 */

// 使用全局ipcRenderer实例（已在renderer.js中设置为window.ipcRenderer）
// 直接使用window.ipcRenderer，避免重复声明

class SettingsModal {
    constructor() {
        this.modal = null;
        this.settings = {};
        this.settingsLoaded = false;
        this.activeTab = 'basic'; // 默认显示基础设置标签页
        this.init();
    }

    /**
     * 初始化设置模态框
     */
    async init() {
        // 等待DOM加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupModal());
        } else {
            this.setupModal();
        }
    }

    /**
     * 设置模态框
     */
    setupModal() {
        // 创建模态框结构
        this.createModalStructure();
        
        // 绑定事件
        this.bindEvents();
        
        // 加载设置
        this.loadSettings();
    }

    /**
     * 创建模态框结构
     */
    createModalStructure() {
        // 检查是否已存在模态框
        if (document.getElementById('settings-modal')) return;
        
        const modalHTML = `
            <div id="settings-modal" class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>设置</h2>
                    </div>
                    
                    <!-- 标签页导航 -->
                    <div class="tab-navigation">
                        <button class="tab-btn active" data-tab="basic">基础设置</button>
                        <button class="tab-btn" data-tab="advanced">高级设置</button>
                    </div>
                    
                    <!-- 标签页内容 -->
                    <div id="basic-tab" class="tab-pane active">
                        <div id="directory-settings">
                            <h3>媒体目录</h3>
                            <div id="directory-list" class="directory-list"></div>
                            <button id="add-directory" class="btn btn-primary">添加目录</button>
                        </div>
                    </div>
                    
                    <div id="advanced-tab" class="tab-pane">
                        <div id="player-settings">
                            <h3>播放器设置</h3>
                            <div class="player-setting-container">
                                <div class="player-select-container">
                                    <select id="player-select">
                                        <option value="system">系统默认播放器</option>
                                        <option value="vlc">VLC Media Player</option>
                                        <option value="mpv">MPV Player</option>
                                        <option value="potplayer">PotPlayer</option>
                                        <option value="custom">自定义播放器</option>
                                    </select>
                                    <button id="browse-player" class="btn btn-secondary">选择播放器</button>
                                </div>
                                <div id="player-status" class="player-status"></div>
                            </div>
                        </div>
                        
                        <div id="theme-settings">
                            <h3>主题设置</h3>
                            <div class="theme-setting-container">
                                <div class="theme-select-container">
                                    <select id="theme-select">
                                        <option value="system">跟随系统</option>
                                        <option value="light">亮色主题</option>
                                        <option value="dark">暗色主题</option>
                                    </select>
                                </div>
                                <div id="theme-status" class="theme-status"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-actions">
                        <button id="save-settings" class="btn btn-primary">保存</button>
                        <button id="cancel-settings" class="btn btn-secondary">取消</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('settings-modal');
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 打开设置 - 使用index.html中已有的设置按钮
        const settingsBtn = document.getElementById('open-settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.open());
        }
        
                
        // 点击遮罩关闭
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.close();
                }
            });
        }
        
        // 保存设置
        const saveBtn = document.getElementById('save-settings');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveSettings());
        }
        
        // 取消设置
        const cancelBtn = document.getElementById('cancel-settings');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.close());
        }
        
        // 添加目录
        const addDirBtn = document.getElementById('add-directory');
        if (addDirBtn) {
            addDirBtn.addEventListener('click', () => this.addDirectory());
        }
        
        // 浏览播放器
        const browsePlayerBtn = document.getElementById('browse-player');
        if (browsePlayerBtn) {
            browsePlayerBtn.addEventListener('click', () => this.browsePlayer());
        }
        
        // 播放器选择变化
        const playerSelect = document.getElementById('player-select');
        if (playerSelect) {
            playerSelect.addEventListener('change', () => this.onPlayerChange());
        }
        
        // 主题选择变化
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            themeSelect.addEventListener('change', () => this.onThemeChange());
        }
        
        // 标签页切换
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => this.switchTab(button.dataset.tab));
        });
        
        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal && this.modal.classList.contains('show')) {
                this.close();
            }
        });
    }

    /**
     * 切换标签页
     * @param {string} tabName - 标签页名称
     */
    switchTab(tabName) {
        // 更新按钮状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // 更新内容显示
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === `${tabName}-tab`);
        });
        
        // 更新当前活动标签页
        this.activeTab = tabName;
    }

    /**
     * 打开设置模态框
     */
    open() {
        if (!this.modal) return;
        
        // 加载最新设置
        this.loadSettings();
        
        // 显示模态框
        this.modal.classList.add('show');
        
        // 聚焦到第一个输入元素
        const firstInput = this.modal.querySelector('input, select, button');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }

    /**
     * 关闭设置模态框
     */
    close() {
        if (!this.modal) return;
        
        this.modal.classList.remove('show');
    }

    /**
     * 加载设置
     */
    async loadSettings() {
        try {
            // 检查ipcRenderer是否可用
    if (!window.ipcRenderer) {
                throw new Error('IPC通信不可用，无法加载设置');
            }
            
            // 从主进程获取设置
            const result = await window.ipcRenderer.invoke('get-settings');
            if (result.success) {
                this.settings = result.data;
                this.settingsLoaded = true;
                
                // 更新UI
                this.updateUI();
            } else {
                throw new Error(result.error || '获取设置失败');
            }
        } catch (error) {
            console.error('加载设置失败:', error);
            this.showError('加载设置失败: ' + error.message);
        }
    }

    /**
     * 更新UI
     */
    updateUI() {
        if (!this.settingsLoaded) return;
        
        // 更新目录列表
        this.updateDirectoryList();
        
        // 更新播放器设置
        this.updatePlayerSettings();
        
        // 更新主题设置
        this.updateThemeSettings();
    }

    /**
     * 更新目录列表
     */
    updateDirectoryList() {
        const directoryList = document.getElementById('directory-list');
        if (!directoryList) return;
        
        directoryList.innerHTML = '';
        
        if (this.settings.directories && this.settings.directories.length > 0) {
            this.settings.directories.forEach((dir, index) => {
                const dirItem = document.createElement('div');
                dirItem.className = 'directory-item';
                
                const dirPath = document.createElement('input');
                dirPath.type = 'text';
                dirPath.value = dir;
                dirPath.readOnly = true;
                
                const removeBtn = document.createElement('button');
                removeBtn.className = 'btn btn-danger remove-directory-btn';
                removeBtn.textContent = '删除';
                removeBtn.addEventListener('click', () => this.removeDirectory(index));
                
                dirItem.appendChild(dirPath);
                dirItem.appendChild(removeBtn);
                directoryList.appendChild(dirItem);
            });
        } else {
            directoryList.innerHTML = '<p class="no-directories">暂无媒体目录</p>';
        }
    }

    /**
     * 更新播放器设置
     */
    updatePlayerSettings() {
        const playerSelect = document.getElementById('player-select');
        const playerStatus = document.getElementById('player-status');
        const browsePlayerBtn = document.getElementById('browse-player');
        
        if (!playerSelect) return;
        
        // 设置播放器类型
        playerSelect.value = this.settings.playerType || 'system';
        
        // 根据播放器类型启用/禁用"选择播放器"按钮
        if (browsePlayerBtn) {
            if (this.settings.playerType === 'custom') {
                browsePlayerBtn.disabled = false;
                browsePlayerBtn.classList.remove('disabled');
            } else {
                browsePlayerBtn.disabled = true;
                browsePlayerBtn.classList.add('disabled');
            }
        }
        
        // 更新播放器状态
        if (playerStatus) {
            if (this.settings.playerType === 'custom' && this.settings.customPlayer) {
                playerStatus.textContent = `当前播放器: ${this.settings.customPlayer}`;
                playerStatus.className = 'player-status success';
            } else if (this.settings.playerType === 'system') {
                playerStatus.textContent = '使用系统默认播放器';
                playerStatus.className = 'player-status';
            } else {
                // 预制播放器
                const playerNames = {
                    'vlc': 'VLC Media Player',
                    'mpv': 'MPV Player',
                    'potplayer': 'PotPlayer'
                };
                
                const playerName = playerNames[this.settings.playerType] || '未知播放器';
                playerStatus.textContent = `当前播放器: ${playerName}`;
                playerStatus.className = 'player-status success';
            }
        }
    }

    /**
     * 更新主题设置
     */
    updateThemeSettings() {
        const themeSelect = document.getElementById('theme-select');
        const themeStatus = document.getElementById('theme-status');
        
        if (!themeSelect) return;
        
        // 设置主题
        themeSelect.value = this.settings.theme || 'system';
        
        // 更新主题状态
        if (themeStatus) {
            const themeText = {
                'system': '跟随系统主题',
                'light': '亮色主题',
                'dark': '暗色主题'
            };
            
            themeStatus.textContent = `当前主题: ${themeText[this.settings.theme] || '跟随系统主题'}`;
            themeStatus.className = 'theme-status';
        }
    }

    /**
     * 添加目录
     */
    async addDirectory() {
        try {
            // 检查ipcRenderer是否可用
    if (!window.ipcRenderer) {
                throw new Error('IPC通信不可用，无法添加目录');
            }
            
            const result = await window.ipcRenderer.invoke('open-directory-dialog');
            if (result && !result.canceled && result.filePaths.length > 0) {
                const directory = result.filePaths[0];
                
                if (!this.settings.directories) {
                    this.settings.directories = [];
                }
                
                // 检查是否已存在
                if (this.settings.directories.includes(directory)) {
                    this.showError('该目录已存在');
                    return;
                }
                
                this.settings.directories.push(directory);
                this.updateDirectoryList();
            }
        } catch (error) {
            console.error('添加目录失败:', error);
            this.showError('添加目录失败: ' + error.message);
        }
    }

    /**
     * 删除目录
     * @param {number} index - 目录索引
     */
    removeDirectory(index) {
        if (!this.settings.directories || index < 0 || index >= this.settings.directories.length) {
            return;
        }
        
        this.settings.directories.splice(index, 1);
        this.updateDirectoryList();
    }

    /**
     * 浏览播放器
     */
    async browsePlayer() {
        try {
            // 检查ipcRenderer是否可用
    if (!window.ipcRenderer) {
                throw new Error('IPC通信不可用，无法选择播放器');
            }
            
            const result = await window.ipcRenderer.invoke('open-player-dialog');
            if (result && !result.canceled && result.filePaths.length > 0) {
                const playerPath = result.filePaths[0];
                
                this.settings.customPlayer = playerPath;
                this.settings.playerType = 'custom';
                
                // 更新播放器选择
                const playerSelect = document.getElementById('player-select');
                if (playerSelect) {
                    playerSelect.value = 'custom';
                }
                
                this.updatePlayerSettings();
            }
        } catch (error) {
            console.error('选择播放器失败:', error);
            this.showError('选择播放器失败: ' + error.message);
        }
    }

    /**
     * 播放器选择变化
     */
    onPlayerChange() {
        const playerSelect = document.getElementById('player-select');
        const browsePlayerBtn = document.getElementById('browse-player');
        
        if (!playerSelect) return;
        
        this.settings.playerType = playerSelect.value;
        
        // 根据播放器类型启用/禁用"选择播放器"按钮
        if (browsePlayerBtn) {
            if (this.settings.playerType === 'custom') {
                browsePlayerBtn.disabled = false;
                browsePlayerBtn.classList.remove('disabled');
            } else {
                browsePlayerBtn.disabled = true;
                browsePlayerBtn.classList.add('disabled');
            }
        }
        
        this.updatePlayerSettings();
    }

    /**
     * 主题选择变化
     */
    onThemeChange() {
        const themeSelect = document.getElementById('theme-select');
        if (!themeSelect) return;
        
        this.settings.theme = themeSelect.value;
        
        // 立即应用主题预览
        if (this.settings.theme && this.settings.theme !== 'system') {
            document.body.setAttribute('data-theme', this.settings.theme);
        } else {
            // 如果选择跟随系统，移除data-theme属性，让系统自动处理
            document.body.removeAttribute('data-theme');
        }
        
        // 主题切换后更新媒体容器的padding
        try {
            // 导入updateContainerPadding函数
            const { updateContainerPadding } = require('../components/media-grid');
            updateContainerPadding();
            console.log('✅ 主题切换后已更新媒体容器padding');
        } catch (error) {
            console.error('❌ 更新媒体容器padding失败:', error);
        }
        
        this.updateThemeSettings();
    }

    /**
     * 保存设置
     */
    async saveSettings() {
        try {
            // 检查ipcRenderer是否可用
    if (!window.ipcRenderer) {
                throw new Error('IPC通信不可用，无法保存设置');
            }
            
            // 收集所有设置数据
            const settingsToSave = {
                directories: this.settings.directories || [],
                playerType: this.settings.playerType || 'system',
                customPlayer: this.settings.customPlayer || '',
                theme: this.settings.theme || 'system'
            };
            
            // 通过主进程保存设置
            const result = await window.ipcRenderer.invoke('save-settings', settingsToSave);
            if (!result.success) {
                throw new Error(result.error || '保存设置失败');
            }
            
            // 显示成功消息
            this.showSuccess('设置已保存');
            
            // 如果主题发生变化，应用新主题
            if (this.settings.theme) {
                document.body.setAttribute('data-theme', this.settings.theme);
            }
            
            // 关闭模态框
            this.close();
            
            // 通知其他组件设置已更新（如果需要）
            if (window.onSettingsUpdated) {
                window.onSettingsUpdated(settingsToSave);
            }
        } catch (error) {
            console.error('保存设置失败:', error);
            this.showError('保存设置失败: ' + error.message);
        }
    }

    /**
     * 显示错误消息
     * @param {string} message - 错误消息
     */
    showError(message) {
        this.showMessage(message, 'error');
    }

    /**
     * 显示成功消息
     * @param {string} message - 成功消息
     */
    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    /**
     * 显示消息
     * @param {string} message - 消息内容
     * @param {string} type - 消息类型 (error, success, warning, info)
     */
    showMessage(message, type = 'info') {
        // 创建消息元素
        const messageEl = document.createElement('div');
        messageEl.className = `${type}-message`;
        
        const icon = document.createElement('span');
        icon.className = `${type}-icon`;
        icon.textContent = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
        
        const text = document.createElement('span');
        text.className = `${type}-text`;
        text.textContent = message;
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-btn';
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(messageEl);
        });
        
        messageEl.appendChild(icon);
        messageEl.appendChild(text);
        messageEl.appendChild(closeBtn);
        
        // 添加到页面
        document.body.appendChild(messageEl);
        
        // 显示动画
        setTimeout(() => {
            messageEl.classList.add('show');
        }, 10);
        
        // 自动隐藏
        setTimeout(() => {
            if (document.body.contains(messageEl)) {
                messageEl.classList.remove('show');
                setTimeout(() => {
                    if (document.body.contains(messageEl)) {
                        document.body.removeChild(messageEl);
                    }
                }, 300);
            }
        }, 3000);
    }
}

// 创建设置模态框实例
const settingsModal = new SettingsModal();

// 导出到全局对象
window.settingsModal = settingsModal;