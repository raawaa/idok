/**
 * 媒体网格组件
 */

const { safeGetElementById, safeAddEventListener } = require('../../renderer/utils/dom-utils');
const { ipcRenderer } = require('electron');

/**
 * 渲染媒体列表
 * @param {Object[]} mediaList - 媒体文件列表
 * @param {Function} onMediaClick - 媒体点击回调
 * @param {Function} onMediaContextMenu - 媒体右键回调
 */
function renderMediaList(mediaList, onMediaClick, onMediaContextMenu) {
    const container = safeGetElementById('movie-covers');
    if (!container) {
        console.warn('媒体容器未找到');
        return;
    }

    container.innerHTML = '';

    if (mediaList.length === 0) {
        container.innerHTML = '<p>没有找到媒体文件。</p>';
        return;
    }

    // 使用网格布局
    container.style.display = 'grid';
    container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
    container.style.gap = '20px';
    container.style.padding = '20px';

    mediaList.forEach(media => {
        const mediaElement = createMediaElement(media, onMediaClick, onMediaContextMenu);
        container.appendChild(mediaElement);
    });

    console.log(`渲染了 ${mediaList.length} 个媒体项目`);
}

/**
 * 创建媒体元素
 * @param {Object} media - 媒体对象
 * @param {Function} onClick - 点击回调
 * @param {Function} onContextMenu - 右键回调
 * @returns {HTMLElement} 媒体元素
 */
function createMediaElement(media, onClick, onContextMenu) {
    const div = document.createElement('div');
    div.className = 'movie-item';
    div.dataset.videoPath = media.videoPath;

    // 添加鼠标悬停效果
    div.style.cursor = 'pointer';

    // 封面容器
    const coverContainer = createCoverContainer(media);
    div.appendChild(coverContainer);

    // 信息容器
    const infoContainer = createInfoContainer(media);
    div.appendChild(infoContainer);

    // 添加事件监听器
    addMediaEventListeners(div, media, onClick, onContextMenu);

    return div;
}

/**
 * 创建封面容器
 * @param {Object} media - 媒体对象
 * @returns {HTMLElement} 封面容器元素
 */
function createCoverContainer(media) {
    const coverContainer = document.createElement('div');
    coverContainer.className = 'cover-container';

    // 封面图片
    if (media.coverImagePath) {
        const img = document.createElement('img');
        img.alt = media.title;
        img.loading = 'lazy';

        Object.assign(img.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: '1',
            transition: 'opacity 0.3s ease'
        });

        // 使用IPC加载图片
        loadImageThroughIPC(media.coverImagePath, img, coverContainer);

        coverContainer.appendChild(img);
    } else {
        showNoCover(coverContainer);
    }

    return coverContainer;
}

/**
 * 创建信息容器
 * @param {Object} media - 媒体对象
 * @returns {HTMLElement} 信息容器元素
 */
function createInfoContainer(media) {
    const infoContainer = document.createElement('div');
    infoContainer.style.cssText = `
        padding: 12px;
        flexGrow: 1;
        display: flex;
        flex-direction: column;
    `;

    // 标题
    const titleElement = document.createElement('h3');
    titleElement.textContent = media.title;
    titleElement.style.cssText = `
        margin: 0 0 8px 0;
        font-size: 14px;
        font-weight: 600;
        line-height: 1.4;
        color: var(--movie-title-color);
        /* 支持多行显示，最多2行 */
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        word-wrap: break-word;
        word-break: break-word;
        min-height: 2.8em;
    `;
    infoContainer.appendChild(titleElement);

    // 发布日期
    if (media.releaseDateFull) {
        const dateElement = document.createElement('div');
        dateElement.textContent = media.releaseDateFull;
        dateElement.style.cssText = `
            font-size: 12px;
            color: var(--movie-date-color);
            marginBottom: 4px;
        `;
        infoContainer.appendChild(dateElement);
    }

    // 片商
    if (media.studio) {
        const studioElement = document.createElement('div');
        studioElement.textContent = media.studio;
        studioElement.style.cssText = `
            font-size: 12px;
            color: var(--movie-studio-color);
            overflow: hidden;
            textOverflow: ellipsis;
            whiteSpace: nowrap;
        `;
        infoContainer.appendChild(studioElement);
    }

    return infoContainer;
}

/**
 * 添加媒体元素事件监听器
 * @param {HTMLElement} element - 媒体元素
 * @param {Object} media - 媒体对象
 * @param {Function} onClick - 点击回调
 * @param {Function} onContextMenu - 右键回调
 */
function addMediaEventListeners(element, media, onClick, onContextMenu) {
    // 点击事件
    safeAddEventListener(element, 'click', () => {
        if (onClick) onClick(media);
    });

    // 右键菜单事件
    safeAddEventListener(element, 'contextmenu', (e) => {
        e.preventDefault();
        if (onContextMenu) onContextMenu(e, media);
    });
}

/**
 * 通过IPC加载图片
 * @param {string} imagePath - 图片路径
 * @param {HTMLImageElement} imgElement - 图片元素
 * @param {HTMLElement} container - 封面容器
 */
async function loadImageThroughIPC(imagePath, imgElement, container) {
    try {
        // 解码file:// URL为文件路径
        let filePath = decodeURIComponent(imagePath.replace(/^file:\/\//, ''));

        // 修复Windows路径格式问题
        if (filePath.startsWith('/') && /^[A-Za-z]:/.test(filePath.substring(1))) {
            // 移除开头的斜杠，转换 /D:/path 为 D:/path
            filePath = filePath.substring(1);
        }

        // 修复Windows路径中的重复驱动器字母问题
        if (filePath.match(/^[A-Za-z]:[\/\\][A-Za-z]:[\/\\]/)) {
            filePath = filePath.substring(2); // 移除重复的驱动器字母
        }

        // 确保使用正确的Windows路径分隔符
        filePath = filePath.replace(/\//g, '\\');

        console.log('🖼️ 通过IPC加载图片:', filePath);

        const result = await ipcRenderer.invoke('get-image-data', filePath);

        if (result.success) {
            imgElement.src = result.dataUrl;
            imgElement.addEventListener('load', () => {
                console.log('✅ 图片加载成功:', filePath);
            });
            imgElement.addEventListener('error', () => {
                console.error('❌ 图片显示失败:', filePath);
                showCoverError(container);
            });
        } else {
            console.error('❌ IPC图片加载失败:', result.error);
            showCoverError(container);
        }
    } catch (error) {
        console.error('❌ IPC图片加载异常:', error);
        showCoverError(container);
    }
}

/**
 * 显示封面错误
 * @param {HTMLElement} container - 封面容器
 */
function showCoverError(container) {
    // 移除可能存在的错误提示
    const existingError = container.querySelector('.cover-error');
    if (existingError) {
        existingError.remove();
    }

    const errorDiv = document.createElement('div');
    errorDiv.className = 'cover-error';
    errorDiv.innerHTML = `
        <div style="font-size: 24px; margin-bottom: 8px;">🖼️</div>
        <div style="font-size: 12px; color: var(--movie-date-color);">封面加载失败</div>
    `;
    container.appendChild(errorDiv);
}

/**
 * 显示无封面
 * @param {HTMLElement} container - 封面容器
 */
function showNoCover(container) {
    // 移除可能存在的错误提示
    const existingNoCover = container.querySelector('.no-cover');
    if (existingNoCover) {
        existingNoCover.remove();
    }

    const noCoverDiv = document.createElement('div');
    noCoverDiv.className = 'no-cover';
    noCoverDiv.innerHTML = `
        <div style="font-size: 24px; margin-bottom: 8px;">📁</div>
        <div style="font-size: 12px; color: var(--movie-date-color);">无封面</div>
    `;
    container.appendChild(noCoverDiv);
}

module.exports = {
    renderMediaList,
    createMediaElement,
    createCoverContainer,
    createInfoContainer,
    addMediaEventListeners
};