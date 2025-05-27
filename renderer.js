// 更新提示相关的状态
let updateAvailable = false;
let downloadProgress = 0;

// 监听更新事件
window.addEventListener('DOMContentLoaded', () => {
    const updateNotification = document.createElement('div');
    updateNotification.style.cssText = `
        position: fixed;
        top: 30px;
        right: 10px;
        background: #4caf50;
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        display: none;
        z-index: 1000;
    `;
    document.body.appendChild(updateNotification);

    const updateProgress = document.createElement('div');
    updateProgress.style.cssText = `
        position: fixed;
        top: 30px;
        right: 10px;
        background: #2196f3;
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        display: none;
        z-index: 1000;
    `;
    document.body.appendChild(updateProgress);

    // 监听更新事件
    window.electronAPI.on('update-available', () => {
        updateAvailable = true;
        updateNotification.textContent = '新版本可用！点击安装更新...';
        updateNotification.style.display = 'block';
        updateNotification.onclick = () => {
            updateNotification.style.display = 'none';
            updateProgress.style.display = 'block';
            window.electronAPI.send('install-update');
        };
    });

    window.electronAPI.on('download-progress', (progress) => {
        downloadProgress = progress.percent;
        updateProgress.textContent = `正在下载更新... ${Math.round(downloadProgress)}%`;
    });

    window.electronAPI.on('update-downloaded', () => {
        updateProgress.textContent = '更新已下载，点击重启应用...';
        updateProgress.onclick = () => {
            window.electronAPI.send('quit-and-install');
        };
    });

    // 监听关闭事件
    window.addEventListener('beforeunload', () => {
        if (updateAvailable) {
            window.electronAPI.send('quit-and-install');
        }
    });
});
