/**
 * 设置模态框组件 - 重构版本
 * 采用组件化设计、单向数据流和模板化结构
 */

/**
 * 设置模态框类
 * 封装设置界面的所有功能和状态管理
 */
class SettingsModal {
    constructor() {
        this.modal = null;
        this.content = null;
        this.templates = null;
        this.settings = {
            directories: [],
            defaultPlayer: '',
            theme: 'auto'
        };
        
        // 异步初始化
        this.init().catch(error => {
            console.error('设置模态框初始化失败:', error);
        });
    }

    /**
     * 初始化设置模态框
     */
    async init() {
        this.loadModalElements();
        this.loadTemplates();
        this.setupEventListeners();
        await this.loadSavedSettings();
    }

    /**
     * 加载模态框DOM元素
     */
    loadModalElements() {
        this.modal = document.getElementById('settings-modal');
        this.content = document.getElementById('settings-content');
        this.templates = document.getElementById('settings-templates');
    }

    /**
     * 加载HTML模板
     */
    loadTemplates() {
        if (!this.templates) {
            console.error('设置模板未找到');
            return;
        }
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 保存和取消按钮
        const saveBtn = document.getElementById('save-settings-btn');
        const cancelBtn = document.getElementById('cancel-settings-btn');
        
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveSettings());
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeModal());
        }
        
        // 点击模态框外部关闭
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.closeModal();
                }
            });
        }
        
        // ESC键关闭模态框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal && this.modal.style.display === 'flex') {
                this.closeModal();
            }
        });
    }

    /**
     * 加载保存的设置
     */
    async loadSavedSettings() {
        try {
            // 通过IPC从文件系统加载设置
            const { ipcRenderer } = require('electron');
            const result = await ipcRenderer.invoke('get-settings');
            
            if (result.success && result.data) {
                this.settings = { ...this.settings, ...result.data };
                this.settingsLoaded = true;
            }
        } catch (error) {
            console.error('加载设置失败:', error);
        }
    }

    /**
     * 显示设置模态框
     */
    async openModal() {
        if (!this.modal || !this.content || !this.templates) return;
        
        // 确保设置已加载
        if (!this.settingsLoaded) {
            await this.loadSavedSettings();
            this.settingsLoaded = true;
        }
        
        this.renderSettingsContent();
        this.modal.style.display = 'flex';
        this.modal.classList.add('show');
        document.body.style.overflow = 'hidden'; // 防止背景滚动
    }

    /**
     * 关闭设置模态框
     */
    closeModal() {
        if (!this.modal) return;
        
        this.modal.style.display = 'none';
        this.modal.classList.remove('show');
        document.body.style.overflow = ''; // 恢复滚动
    }

    /**
     * 渲染设置内容
     */
    renderSettingsContent() {
        if (!this.content || !this.templates) return;
        
        // 清空现有内容
        this.content.innerHTML = '';
        
        // 克隆并添加各个设置部分
        this.addSection('directory-settings');
        this.addSection('player-settings');
        this.addSection('theme-settings');
        
        // 填充当前设置值
        this.populateSettingsValues();
        
        // 设置各部分的事件监听器
        this.setupSectionEventListeners();
    }

    /**
     * 添加设置部分
     * @param {string} sectionName - 设置部分的类名
     */
    addSection(sectionName) {
        const template = this.templates.content.querySelector(`.${sectionName}`);
        if (template) {
            const clone = template.cloneNode(true);
            this.content.appendChild(clone);
        }
    }

    /**
     * 填充设置值
     */
    populateSettingsValues() {
        // 填充目录列表
        this.populateDirectoryList();
        
        // 填充播放器选择
        this.populatePlayerSelect();
        
        // 填充主题选择
        this.populateThemeSelect();
    }

    /**
     * 填充目录列表
     */
    populateDirectoryList() {
        const directoryList = this.content.querySelector('.directory-list');
        if (!directoryList) return;
        
        // 清空现有目录项
        directoryList.innerHTML = '';
        
        // 添加每个目录
        this.settings.directories.forEach(dir => {
            this.addDirectoryItem(dir, directoryList);
        });
    }

    /**
     * 添加目录项
     * @param {string} directoryPath - 目录路径
     * @param {HTMLElement} container - 容器元素
     */
    addDirectoryItem(directoryPath, container) {
        const itemTemplate = this.templates.content.querySelector('.directory-item');
        if (!itemTemplate) return;
        
        const clone = itemTemplate.cloneNode(true);
        const input = clone.querySelector('.directory-path');
        const removeBtn = clone.querySelector('.remove-directory-btn');
        
        if (input) {
            input.value = directoryPath;
        }
        
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                this.removeDirectory(directoryPath);
            });
        }
        
        container.appendChild(clone);
    }

    /**
     * 填充播放器选择
     */
    populatePlayerSelect() {
        const playerSelect = this.content.querySelector('.default-player-select');
        if (!playerSelect) return;
        
        playerSelect.value = this.settings.defaultPlayer || '';
    }

    /**
     * 填充主题选择
     */
    populateThemeSelect() {
        const themeSelect = this.content.querySelector('.theme-select');
        if (!themeSelect) return;
        
        themeSelect.value = this.settings.theme || 'auto';
    }

    /**
     * 设置各部分的事件监听器
     */
    setupSectionEventListeners() {
        // 添加目录按钮
        const addDirBtn = this.content.querySelector('.add-directory-btn');
        if (addDirBtn) {
            addDirBtn.addEventListener('click', () => this.addDirectory());
        }
        
        // 自定义播放器按钮
        const customPlayerBtn = this.content.querySelector('.custom-player-btn');
        if (customPlayerBtn) {
            customPlayerBtn.addEventListener('click', () => this.selectCustomPlayer());
        }
        
        // 播放器选择变化
        const playerSelect = this.content.querySelector('.default-player-select');
        if (playerSelect) {
            playerSelect.addEventListener('change', (e) => {
                this.updatePlayerStatus(e.target.value);
            });
            
            // 初始更新状态
            this.updatePlayerStatus(playerSelect.value);
        }
    }

    /**
     * 添加目录
     */
    async addDirectory() {
        try {
            // 使用IPC调用打开目录选择对话框
            const { ipcRenderer } = require('electron');
            const result = await ipcRenderer.invoke('open-directory-dialog');
            
            if (result.canceled || result.filePaths.length === 0) {
                return; // 用户取消了选择
            }
            
            const directoryPath = result.filePaths[0];
            
            if (directoryPath && !this.settings.directories.includes(directoryPath)) {
                this.settings.directories.push(directoryPath);
                this.populateDirectoryList();
            }
        } catch (error) {
            console.error('添加目录失败:', error);
            this.showError('添加目录失败，请重试');
        }
    }

    /**
     * 删除目录
     * @param {string} directoryPath - 要删除的目录路径
     */
    removeDirectory(directoryPath) {
        const index = this.settings.directories.indexOf(directoryPath);
        if (index !== -1) {
            this.settings.directories.splice(index, 1);
            this.populateDirectoryList();
        }
    }

    /**
     * 选择自定义播放器
     */
    async selectCustomPlayer() {
        try {
            // 使用IPC调用打开文件选择对话框
            const { ipcRenderer } = require('electron');
            const result = await ipcRenderer.invoke('open-player-dialog');
            
            if (result.canceled || result.filePaths.length === 0) {
                return; // 用户取消了选择
            }
            
            const playerPath = result.filePaths[0];
            
            if (playerPath) {
                this.addCustomPlayer(playerPath);
            }
        } catch (error) {
            console.error('选择自定义播放器失败:', error);
            this.showError('选择自定义播放器失败，请重试');
        }
    }

    /**
     * 添加自定义播放器
     * @param {string} playerPath - 播放器路径
     */
    addCustomPlayer(playerPath) {
        const playerName = this.getPlayerName(playerPath);
        const playerSelect = this.content.querySelector('.default-player-select');
        
        if (playerSelect) {
            // 检查是否已存在
            let option = playerSelect.querySelector(`option[value="${playerPath}"]`);
            
            if (!option) {
                // 创建新选项
                option = document.createElement('option');
                option.value = playerPath;
                option.textContent = playerName;
                playerSelect.appendChild(option);
            }
            
            // 选择新添加的播放器
            playerSelect.value = playerPath;
            this.settings.defaultPlayer = playerPath;
            this.updatePlayerStatus(playerPath);
        }
    }

    /**
     * 从路径获取播放器名称
     * @param {string} playerPath - 播放器路径
     * @returns {string} 播放器名称
     */
    getPlayerName(playerPath) {
        const parts = playerPath.split('\\');
        return parts[parts.length - 1].replace('.exe', '');
    }

    /**
     * 更新播放器状态显示
     * @param {string} playerPath - 播放器路径
     */
    updatePlayerStatus(playerPath) {
        const statusElement = this.content.querySelector('.player-status');
        if (!statusElement) return;
        
        if (playerPath) {
            statusElement.textContent = `当前选择: ${this.getPlayerName(playerPath)}`;
            statusElement.style.color = 'var(--success-color, #28a745)';
        } else {
            statusElement.textContent = '使用系统默认播放器';
            statusElement.style.color = 'var(--secondary-text)';
        }
    }

    /**
     * 保存设置
     */
    async saveSettings() {
        try {
            // 收集表单数据
            this.collectFormData();
            
            // 通过IPC保存到文件系统
            const { ipcRenderer } = require('electron');
            const result = await ipcRenderer.invoke('save-settings', this.settings);
            
            if (result.success) {
                // 应用主题设置
                this.applyThemeSettings();
                
                // 显示成功消息
                this.showSuccess('设置已保存');
                
                // 关闭模态框
                setTimeout(() => this.closeModal(), 1000);
            } else {
                throw new Error(result.error || '保存失败');
            }
        } catch (error) {
            console.error('保存设置失败:', error);
            this.showError('保存设置失败，请重试');
        }
    }

    /**
     * 收集表单数据
     */
    collectFormData() {
        // 收集目录设置
        const directoryInputs = this.content.querySelectorAll('.directory-path');
        this.settings.directories = Array.from(directoryInputs)
            .map(input => input.value.trim())
            .filter(path => path !== '');
        
        // 收集播放器设置
        const playerSelect = this.content.querySelector('.default-player-select');
        if (playerSelect) {
            this.settings.defaultPlayer = playerSelect.value;
        }
        
        // 收集主题设置
        const themeSelect = this.content.querySelector('.theme-select');
        if (themeSelect) {
            this.settings.theme = themeSelect.value;
        }
    }

    /**
     * 应用主题设置
     */
    applyThemeSettings() {
        const { theme } = this.settings;
        
        // 移除所有主题类
        document.body.classList.remove('light-theme', 'dark-theme');
        
        // 应用新主题
        if (theme === 'light') {
            document.body.classList.add('light-theme');
            document.body.setAttribute('data-theme', 'light');
        } else if (theme === 'dark') {
            document.body.classList.add('dark-theme');
            document.body.setAttribute('data-theme', 'dark');
        } else {
            // 跟随系统主题
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                document.body.classList.add('dark-theme');
                document.body.setAttribute('data-theme', 'dark');
            } else {
                document.body.classList.add('light-theme');
                document.body.setAttribute('data-theme', 'light');
            }
        }
    }

    /**
     * 显示成功消息
     * @param {string} message - 消息内容
     */
    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    /**
     * 显示错误消息
     * @param {string} message - 消息内容
     */
    showError(message) {
        this.showMessage(message, 'error');
    }

    /**
     * 显示消息
     * @param {string} message - 消息内容
     * @param {string} type - 消息类型 (success/error)
     */
    showMessage(message, type) {
        // 创建消息元素
        const messageEl = document.createElement('div');
        messageEl.className = `message message-${type}`;
        messageEl.textContent = message;
        
        // 设置样式
        Object.assign(messageEl.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '6px',
            backgroundColor: type === 'success' ? '#28a745' : '#dc3545',
            color: 'white',
            zIndex: '2000',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });
        
        // 添加到页面
        document.body.appendChild(messageEl);
        
        // 显示动画
        setTimeout(() => {
            messageEl.style.transform = 'translateX(0)';
        }, 10);
        
        // 自动隐藏
        setTimeout(() => {
            messageEl.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(messageEl)) {
                    document.body.removeChild(messageEl);
                }
            }, 300);
        }, 3000);
    }
}

// 创建全局设置模态框实例
let settingsModal = null;

/**
 * 初始化设置模态框
 */
function initializeSettingsModal() {
    if (!settingsModal) {
        settingsModal = new SettingsModal();
    }
    return settingsModal;
}

/**
 * 打开设置对话框
 */
function openSettingsDialog() {
    const modal = initializeSettingsModal();
    modal.openModal();
}

// 导出函数供其他模块使用
window.SettingsModal = SettingsModal;
window.openSettingsDialog = openSettingsDialog;

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    initializeSettingsModal();
});