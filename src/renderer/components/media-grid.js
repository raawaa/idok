/**
 * 媒体网格组件
 */

const { safeGetElementById, safeAddEventListener } = require('../utils/dom-utils');

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
    div.className = 'media-item';
    div.dataset.videoPath = media.videoPath;

    Object.assign(div.style, {
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column'
    });

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
    coverContainer.style.cssText = `
        position: relative;
        width: 100%;
        paddingTop: 150%;
        backgroundColor: '#f5f5f5';
        overflow: hidden;
    `;

    // 封面图片
    if (media.coverImagePath) {
        const img = document.createElement('img');
        img.src = media.coverImagePath;
        img.alt = media.title;
        img.loading = 'lazy';

        Object.assign(img.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: '0',
            transition: 'opacity 0.3s ease'
        });

        img.addEventListener('load', () => {
            img.style.opacity = '1';
        });

        img.addEventListener('error', () => {
            img.style.display = 'none';
            showCoverError(coverContainer);
        });

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
        lineHeight: 1.4;
        color: #333;
        overflow: hidden;
        textOverflow: ellipsis;
        display: -webkit-box;
        WebkitLineClamp: 2;
        WebkitBoxOrient: vertical;
    `;
    infoContainer.appendChild(titleElement);

    // 发布日期
    if (media.releaseDateFull) {
        const dateElement = document.createElement('div');
        dateElement.textContent = media.releaseDateFull;
        dateElement.style.cssText = `
            font-size: 12px;
            color: #666;
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
            color: #888;
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
    // 鼠标悬停效果
    element.addEventListener('mouseenter', () => {
        element.style.transform = 'translateY(-4px)';
        element.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
    });

    element.addEventListener('mouseleave', () => {
        element.style.transform = 'translateY(0)';
        element.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    });

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
 * 显示封面错误
 * @param {HTMLElement} container - 封面容器
 */
function showCoverError(container) {
    const errorDiv = document.createElement('div');
    errorDiv.textContent = '封面加载失败';
    errorDiv.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #f44336;
        font-size: 14px;
        background-color: '#f5f5f5';
    `;
    container.appendChild(errorDiv);
}

/**
 * 显示无封面
 * @param {HTMLElement} container - 封面容器
 */
function showNoCover(container) {
    const noCoverDiv = document.createElement('div');
    noCoverDiv.textContent = '无封面';
    noCoverDiv.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #999;
        font-size: 14px;
        background-color: '#f5f5f5';
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