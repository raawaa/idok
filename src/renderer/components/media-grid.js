/**
 * 媒体网格组件
 */

const { safeGetElementById, safeAddEventListener } = require('../../renderer/utils/dom-utils');
// 使用全局ipcRenderer实例（已在renderer.js中设置为window.ipcRenderer）
// 直接使用window.ipcRenderer，避免重复声明

// 存储窗口大小变化监听器和控制区域观察器
let resizeListener = null;
let controlsObserver = null;

/**
 * 动态计算并设置影片容器的顶部padding
 * @param {HTMLElement} container - 影片容器元素，如果不提供则自动获取
 */
function updateContainerPadding(container = null) {
    // 如果没有提供容器，尝试获取默认容器
    if (!container) {
        container = safeGetElementById('movie-covers');
        if (!container) {
            console.warn('媒体容器未找到，无法更新padding');
            return;
        }
    }
    
    // 动态计算顶部padding，确保不被控制区域遮挡
    const controlsElement = document.getElementById('controls');
    let topPadding = 40; // 默认顶部padding
    
    if (controlsElement) {
        // 获取控制区域的高度和位置
        const controlsRect = controlsElement.getBoundingClientRect();
        const controlsHeight = controlsRect.height;
        const controlsTop = controlsRect.top;
        
        // 计算需要的padding：控制区域底部距离页面顶部的距离 + 额外间距
        // 额外间距确保内容不会紧贴控制区域，响应式设计
        const extraSpacing = window.innerWidth <= 600 ? 10 : 20;
        topPadding = Math.max(controlsTop + controlsHeight + extraSpacing, 100);
    }
    
    container.style.paddingTop = `${topPadding}px`;
    console.log(`更新影片容器顶部padding: ${topPadding}px`);
}

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
    
    // 设置左右和底部padding，顶部padding由updateContainerPadding函数动态设置
    container.style.paddingLeft = '20px';
    container.style.paddingRight = '20px';
    container.style.paddingBottom = '20px';
    
    // 动态计算并设置顶部padding
    updateContainerPadding(container);
    
    // 添加窗口大小变化监听器，确保padding始终正确
    if (resizeListener) {
        window.removeEventListener('resize', resizeListener);
    }
    
    resizeListener = () => {
        updateContainerPadding(container);
    };
    
    window.addEventListener('resize', resizeListener);
    
    // 添加控制区域变化监听器，使用MutationObserver监听控制区域的变化
    setupControlsObserver(container);

    mediaList.forEach(media => {
        const mediaElement = createMediaElement(media, onMediaClick, onMediaContextMenu);
        container.appendChild(mediaElement);
    });

    console.log(`渲染了 ${mediaList.length} 个媒体项目`);
}

/**
 * 设置控制区域观察器，监听控制区域的变化
 * @param {HTMLElement} container - 影片容器元素
 */
function setupControlsObserver(container) {
    // 清理之前的观察器
    if (controlsObserver) {
        controlsObserver.disconnect();
    }
    
    const controlsElement = document.getElementById('controls');
    if (!controlsElement) return;
    
    // 创建MutationObserver监听控制区域的变化
    controlsObserver = new MutationObserver((mutations) => {
        let shouldUpdate = false;
        
        mutations.forEach((mutation) => {
            // 如果控制区域的子节点、属性或样式发生变化，则更新padding
            if (mutation.type === 'childList' || 
                mutation.type === 'attributes' || 
                mutation.type === 'characterData') {
                shouldUpdate = true;
            }
        });
        
        if (shouldUpdate) {
            // 延迟一点时间再更新，确保DOM变化完成
            setTimeout(() => {
                updateContainerPadding(container);
            }, 50);
        }
    });
    
    // 配置观察器选项
    const observerConfig = {
        childList: true,      // 观察子节点的添加或删除
        attributes: true,      // 观察属性的变化
        subtree: true,         // 观察所有后代节点
        characterData: true,  // 观察文本内容的变化
        attributeFilter: ['style', 'class'] // 只观察特定属性
    };
    
    // 开始观察控制区域
    controlsObserver.observe(controlsElement, observerConfig);
    console.log('已设置控制区域变化观察器');
}

/**
 * 清理所有监听器和观察器
 */
function cleanupListeners() {
    // 清理窗口大小变化监听器
    if (resizeListener) {
        window.removeEventListener('resize', resizeListener);
        resizeListener = null;
    }
    
    // 清理控制区域观察器
    if (controlsObserver) {
        controlsObserver.disconnect();
        controlsObserver = null;
    }
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

    // 如果是独立视频文件或缺少元数据，添加特殊样式
    if (media.isStandaloneVideo || !media.hasMetadata) {
        div.classList.add('standalone-video');
        div.style.opacity = '0.8'; // 降低透明度表示待刮削状态
        div.style.border = '2px dashed #999'; // 虚线边框表示待刮削
        div.style.borderRadius = '8px';
        div.style.position = 'relative';
        
        // 添加待刮削标识
        const pendingBadge = document.createElement('div');
        pendingBadge.textContent = '待刮削';
        pendingBadge.style.cssText = `
            position: absolute;
            top: 8px;
            left: 8px;
            background: rgba(255, 165, 0, 0.9);
            color: #fff;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            z-index: 10;
            backdrop-filter: blur(2px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            transition: all 0.2s ease;
        `;
        
        // 添加悬停效果
        pendingBadge.addEventListener('mouseenter', () => {
            pendingBadge.style.background = 'rgba(255, 140, 0, 0.95)';
            pendingBadge.style.transform = 'scale(1.05)';
        });
        
        pendingBadge.addEventListener('mouseleave', () => {
            pendingBadge.style.background = 'rgba(255, 165, 0, 0.9)';
            pendingBadge.style.transform = 'scale(1)';
        });
        
        div.appendChild(pendingBadge);
    }

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

    // 添加多盘片标记
    if (media.totalParts && media.totalParts > 1) {
        const cdBadge = document.createElement('div');
        cdBadge.textContent = `${media.totalParts}CD`;
        cdBadge.style.cssText = `
            position: absolute;
            top: 8px;
            right: 8px;
            background: rgba(0, 0, 0, 0.7);
            color: #fff;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            z-index: 10;
            backdrop-filter: blur(2px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            transition: all 0.2s ease;
        `;
        
        // 添加悬停效果
        cdBadge.addEventListener('mouseenter', () => {
            cdBadge.style.background = 'rgba(0, 0, 0, 0.8)';
            cdBadge.style.transform = 'scale(1.05)';
        });
        
        cdBadge.addEventListener('mouseleave', () => {
            cdBadge.style.background = 'rgba(0, 0, 0, 0.7)';
            cdBadge.style.transform = 'scale(1)';
        });
        
        coverContainer.appendChild(cdBadge);
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

    // 标题 - 独立视频文件显示番号，否则显示标题
    const titleElement = document.createElement('h3');
    titleElement.textContent = media.isStandaloneVideo ? (media.avid || media.fileName || '未知番号') : (media.title || '未知标题');
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

    // 如果是独立视频文件，显示番号作为标题
    if (media.isStandaloneVideo) {
        if (media.avid) {
            const avidElement = document.createElement('div');
            avidElement.textContent = `番号: ${media.avid}`;
            avidElement.style.cssText = `
                font-size: 12px;
                color: var(--movie-date-color);
                margin-bottom: 4px;
                font-weight: 500;
                background: rgba(255, 165, 0, 0.1);
                padding: 2px 6px;
                border-radius: 4px;
                display: inline-block;
            `;
            infoContainer.appendChild(avidElement);
        }
    }

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

    // 系列
    if (media.set) {
        const setContainer = document.createElement('div');
        setContainer.style.cssText = `
            margin-top: 8px;
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
        `;
        
        const setTag = document.createElement('span');
        setTag.textContent = media.set;
        setTag.className = 'media-tag media-tag-set';
        setTag.dataset.filterType = 'set';
        setTag.dataset.filterValue = media.set;
        setTag.style.cssText = `
            display: inline-block;
            padding: 2px 8px;
            font-size: 11px;
            border-radius: 12px;
            background-color: var(--tag-set-bg, #e3f2fd);
            color: var(--tag-set-color, #1976d2);
            border: 1px solid var(--tag-set-border, #bbdefb);
            cursor: pointer;
            transition: all 0.2s ease;
            user-select: none;
        `;
        
        // 添加悬停效果
        setTag.addEventListener('mouseenter', () => {
            setTag.style.backgroundColor = 'var(--tag-set-hover-bg, #bbdefb)';
            setTag.style.transform = 'scale(1.05)';
        });
        
        setTag.addEventListener('mouseleave', () => {
            setTag.style.backgroundColor = 'var(--tag-set-bg, #e3f2fd)';
            setTag.style.transform = 'scale(1)';
        });
        
        setContainer.appendChild(setTag);
        infoContainer.appendChild(setContainer);
    }

    // 演员
    if (media.actors && media.actors.length > 0) {
        const actorsContainer = document.createElement('div');
        actorsContainer.style.cssText = `
            margin-top: 8px;
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
        `;
        
        // 存储演员数据用于展开功能
        actorsContainer.dataset.actors = JSON.stringify(media.actors);
        actorsContainer.dataset.expanded = 'false';
        
        // 显示前3个演员，如果有更多则显示"+?"
        const displayActors = media.actors.slice(0, 3);
        displayActors.forEach(actor => {
            const actorTag = document.createElement('span');
            actorTag.textContent = actor;
            actorTag.className = 'media-tag media-tag-actor';
            actorTag.dataset.filterType = 'actor';
            actorTag.dataset.filterValue = actor;
            actorTag.style.cssText = `
                display: inline-block;
                padding: 2px 8px;
                font-size: 11px;
                border-radius: 12px;
                background-color: var(--tag-actor-bg, #f3e5f5);
                color: var(--tag-actor-color, #7b1fa2);
                border: 1px solid var(--tag-actor-border, #e1bee7);
                cursor: pointer;
                transition: all 0.2s ease;
                user-select: none;
            `;
            
            // 添加悬停效果
            actorTag.addEventListener('mouseenter', () => {
                actorTag.style.backgroundColor = 'var(--tag-actor-hover-bg, #e1bee7)';
                actorTag.style.transform = 'scale(1.05)';
            });
            
            actorTag.addEventListener('mouseleave', () => {
                actorTag.style.backgroundColor = 'var(--tag-actor-bg, #f3e5f5)';
                actorTag.style.transform = 'scale(1)';
            });
            
            actorsContainer.appendChild(actorTag);
        });
        
        // 如果演员数量超过3个，显示"+?"展开按钮
        if (media.actors.length > 3) {
            const moreIndicator = document.createElement('span');
            moreIndicator.textContent = `+${media.actors.length - 3}`;
            moreIndicator.className = 'media-tag media-tag-more';
            moreIndicator.dataset.remainingCount = media.actors.length - 3;
            moreIndicator.style.cssText = `
                display: inline-block;
                padding: 2px 8px;
                font-size: 11px;
                border-radius: 12px;
                background-color: var(--tag-more-bg, #f5f5f5);
                color: var(--tag-more-color, #666);
                border: 1px solid var(--tag-more-border, #e0e0e0);
                cursor: pointer;
                transition: all 0.2s ease;
                user-select: none;
            `;
            
            // 添加悬停效果
            moreIndicator.addEventListener('mouseenter', () => {
                moreIndicator.style.backgroundColor = 'var(--tag-more-hover-bg, #e0e0e0)';
                moreIndicator.style.transform = 'scale(1.05)';
            });
            
            moreIndicator.addEventListener('mouseleave', () => {
                moreIndicator.style.backgroundColor = 'var(--tag-more-bg, #f5f5f5)';
                moreIndicator.style.transform = 'scale(1)';
            });
            
            actorsContainer.appendChild(moreIndicator);
        }
        
        infoContainer.appendChild(actorsContainer);
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
    safeAddEventListener(element, 'click', (e) => {
        // 查找点击的元素或其父元素中是否包含media-tag类
        const tagElement = e.target.closest('.media-tag');
        
        if (tagElement) {
            // 处理"+?"展开按钮或"收起"按钮
            if (tagElement.classList.contains('media-tag-more')) {
                handleActorExpand(tagElement);
                return;
            }
            // 处理普通tag过滤
            handleTagClick(tagElement);
            return;
        }
        
        // 普通媒体点击
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
        // 检查ipcRenderer是否可用
        if (!window.ipcRenderer) {
            console.error('❌ IPC通信不可用，无法加载图片');
            showCoverError(container);
            return;
        }
        
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

        const result = await window.ipcRenderer.invoke('get-image-data', filePath);

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

/**
 * 处理tag点击事件
 * @param {HTMLElement} tagElement - 被点击的tag元素
 */
function handleTagClick(tagElement) {
    const filterType = tagElement.dataset.filterType;
    const filterValue = tagElement.dataset.filterValue;
    
    if (!filterType || !filterValue) {
        console.warn('Tag缺少必要的过滤信息');
        return;
    }
    
    console.log(`点击了${filterType}标签: ${filterValue}`);
    
    // 根据tag类型设置对应的过滤器
    if (filterType === 'actor') {
        const actorSelect = document.getElementById('filter-actor');
        if (actorSelect) {
            actorSelect.value = filterValue;
            // 触发change事件来应用过滤
            const event = new Event('change', { bubbles: true });
            actorSelect.dispatchEvent(event);
        }
    } else if (filterType === 'set') {
        // 系列过滤通过系列过滤器实现
        const setSelect = document.getElementById('filter-set');
        if (setSelect) {
            setSelect.value = filterValue;
            // 触发change事件来应用过滤
            const event = new Event('change', { bubbles: true });
            setSelect.dispatchEvent(event);
        }
    }
    
    // 显示过滤提示
    if (window.showInfo) {
        window.showInfo(`已按${filterType === 'actor' ? '演员' : '系列'} "${filterValue}" 过滤`, 2000);
    }
}

/**
 * 处理演员展开功能
 * @param {HTMLElement} moreElement - "+?"展开按钮元素
 */
function handleActorExpand(moreElement) {
    const actorsContainer = moreElement.parentElement;
    if (!actorsContainer || !actorsContainer.dataset.actors) {
        return;
    }
    
    const isExpanded = actorsContainer.dataset.expanded === 'true';
    const actors = JSON.parse(actorsContainer.dataset.actors);
    
    if (!isExpanded) {
        // 展开显示全部演员
        console.log(`展开显示全部${actors.length}个演员`);
        
        // 移除现有的"+?"按钮
        moreElement.remove();
        
        // 添加剩余的所有演员
        const remainingActors = actors.slice(3);
        remainingActors.forEach(actor => {
            const actorTag = document.createElement('span');
            actorTag.textContent = actor;
            actorTag.className = 'media-tag media-tag-actor';
            actorTag.dataset.filterType = 'actor';
            actorTag.dataset.filterValue = actor;
            actorTag.style.cssText = `
                display: inline-block;
                padding: 2px 8px;
                font-size: 11px;
                border-radius: 12px;
                background-color: var(--tag-actor-bg, #f3e5f5);
                color: var(--tag-actor-color, #7b1fa2);
                border: 1px solid var(--tag-actor-border, #e1bee7);
                cursor: pointer;
                transition: all 0.2s ease;
                user-select: none;
                animation: fadeIn 0.3s ease;
            `;
            
            // 添加悬停效果
            actorTag.addEventListener('mouseenter', () => {
                actorTag.style.backgroundColor = 'var(--tag-actor-hover-bg, #e1bee7)';
                actorTag.style.transform = 'scale(1.05)';
            });
            
            actorTag.addEventListener('mouseleave', () => {
                actorTag.style.backgroundColor = 'var(--tag-actor-bg, #f3e5f5)';
                actorTag.style.transform = 'scale(1)';
            });
            
            actorsContainer.appendChild(actorTag);
        });
        
        // 添加"收起"按钮（使用Lucide图标）
        const collapseButton = document.createElement('span');
        collapseButton.innerHTML = '<i data-lucide="chevron-up" style="width: 12px; height: 12px;"></i>';
        collapseButton.className = 'media-tag media-tag-more';
        collapseButton.style.cssText = `
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 2px 6px;
            font-size: 11px;
            border-radius: 12px;
            background-color: var(--tag-more-bg, #f5f5f5);
            color: var(--tag-more-color, #666);
            border: 1px solid var(--tag-more-border, #e0e0e0);
            cursor: pointer;
            transition: all 0.2s ease;
            user-select: none;
            line-height: 1;
        `;
        
        // 添加悬停效果
        collapseButton.addEventListener('mouseenter', () => {
            collapseButton.style.backgroundColor = 'var(--tag-more-hover-bg, #e0e0e0)';
            collapseButton.style.transform = 'scale(1.05)';
        });
        
        collapseButton.addEventListener('mouseleave', () => {
            collapseButton.style.backgroundColor = 'var(--tag-more-bg, #f5f5f5)';
            collapseButton.style.transform = 'scale(1)';
        });
        
        actorsContainer.appendChild(collapseButton);
        actorsContainer.dataset.expanded = 'true';
        
        // 初始化Lucide图标
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        // 显示提示
        if (window.showInfo) {
            window.showInfo(`已展开显示全部${actors.length}个演员，点击"收起"可恢复紧凑显示`, 2000);
        }
    } else {
        // 收起，只显示前3个
        console.log('收起演员显示');
        
        // 移除所有额外的演员标签和"+n"按钮
        const allTags = actorsContainer.querySelectorAll('.media-tag-actor');
        const moreButton = actorsContainer.querySelector('.media-tag-more');
        
        // 保留前3个演员标签
        for (let i = 3; i < allTags.length; i++) {
            allTags[i].remove();
        }
        
        if (moreButton) {
            moreButton.remove();
        }
        
        // 重新添加"+n"按钮
        const moreIndicator = document.createElement('span');
        moreIndicator.textContent = `+${actors.length - 3}`;
        moreIndicator.className = 'media-tag media-tag-more';
        moreIndicator.style.cssText = `
            display: inline-block;
            padding: 2px 8px;
            font-size: 11px;
            border-radius: 12px;
            background-color: var(--tag-more-bg, #f5f5f5);
            color: var(--tag-more-color, #666);
            border: 1px solid var(--tag-more-border, #e0e0e0);
            cursor: pointer;
            transition: all 0.2s ease;
            user-select: none;
        `;
        
        // 添加悬停效果
        moreIndicator.addEventListener('mouseenter', () => {
            moreIndicator.style.backgroundColor = 'var(--tag-more-hover-bg, #e0e0e0)';
            moreIndicator.style.transform = 'scale(1.05)';
        });
        
        moreIndicator.addEventListener('mouseleave', () => {
            moreIndicator.style.backgroundColor = 'var(--tag-more-bg, #f5f5f5)';
            moreIndicator.style.transform = 'scale(1)';
        });
        
        actorsContainer.appendChild(moreIndicator);
        actorsContainer.dataset.expanded = 'false';
        
        // 显示提示
        if (window.showInfo) {
            window.showInfo('已收起演员显示，显示前3个演员', 1500);
        }
    }
}

module.exports = {
    renderMediaList,
    createMediaElement,
    createCoverContainer,
    createInfoContainer,
    addMediaEventListeners,
    updateContainerPadding,
    setupControlsObserver,
    cleanupListeners,
    handleTagClick
};