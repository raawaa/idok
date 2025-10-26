const { contextBridge, ipcRenderer } = require('electron');

// 白名单机制 - 定义允许的IPC通道
const VALID_CHANNELS = {
  send: [
    'minimize-window',
    'maximize-restore-window', 
    'close-window',
    'show-context-menu',
    'delete-directory',
    'open-video',
    'open-video-directory',
    'open-settings-dialog',
    'save-settings',
    'get-settings',
    'scan-directory',
    'get-installed-players',
    'open-directory-dialog',
    'open-player-dialog'
  ],
  invoke: [
    'save-settings',
    'get-settings', 
    'scan-directory',
    'get-installed-players',
    'open-directory-dialog',
    'open-player-dialog'
  ],
  on: [
    'app-info',
    'start-initial-scan',
    'no-directories-configured',
    'settings-saved-and-rescan',
    'confirm-delete',
    'directory-trashed',
    'trash-failed',
    'video-open-failed',
    'video-opened',
    'video-directory-open-failed',
    'window-maximized',
    'window-focused'
  ]
};

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 发送消息到主进程（单向通信）
  send: (channel, data) => {
    if (VALID_CHANNELS.send.includes(channel)) {
      ipcRenderer.send(channel, data);
    } else {
      console.warn(`Blocked send to invalid channel: ${channel}`);
    }
  },
  
  // 调用主进程方法并等待响应（双向通信）
  invoke: (channel, data) => {
    if (VALID_CHANNELS.invoke.includes(channel)) {
      return ipcRenderer.invoke(channel, data);
    } else {
      console.warn(`Blocked invoke on invalid channel: ${channel}`);
      return Promise.reject(new Error(`Invalid channel: ${channel}`));
    }
  },
  
  // 监听主进程消息
  on: (channel, callback) => {
    if (VALID_CHANNELS.on.includes(channel)) {
      // 包装回调函数，移除事件参数
      const wrappedCallback = (event, ...args) => callback(...args);
      ipcRenderer.on(channel, wrappedCallback);
      
      // 返回取消订阅函数
      return () => {
        ipcRenderer.removeListener(channel, wrappedCallback);
      };
    } else {
      console.warn(`Blocked listener on invalid channel: ${channel}`);
      return () => {}; // 返回空的取消订阅函数
    }
  },
  
  // 移除所有监听器
  removeAllListeners: (channel) => {
    if (VALID_CHANNELS.on.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  },
  
  // 路径处理工具方法
  pathBasename: (pathString, ext) => {
    // 简单实现path.basename功能
    const parts = pathString.split(/[\\/]/);
    let basename = parts[parts.length - 1];
    if (ext && basename.endsWith(ext)) {
      basename = basename.slice(0, -ext.length);
    }
    return basename;
  }
});