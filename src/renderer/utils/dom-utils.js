/**
 * DOM操作工具函数
 */

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间(毫秒)
 * @returns {Function} 防抖后的函数
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 创建消息提示元素
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型 (error, warning, success, info)
 * @param {number} duration - 显示时长(毫秒)
 * @returns {HTMLElement} 消息元素
 */
function createMessageElement(message, type, duration = 5000) {
    const messageDiv = document.createElement('div');

    const colors = {
        error: '#f44336',
        success: '#4caf50',
        warning: '#ff9800',
        info: '#2196f3'
    };

    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${colors[type] || colors.info};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        font-size: 14px;
        max-width: 400px;
        word-wrap: break-word;
        opacity: 0;
        transform: translateX(100%);
        transition: opacity 0.3s ease, transform 0.3s ease;
        margin-bottom: 10px;
    `;

    messageDiv.textContent = message;

    // 添加动画效果
    requestAnimationFrame(() => {
        messageDiv.style.opacity = '1';
        messageDiv.style.transform = 'translateX(0)';
    });

    return messageDiv;
}

/**
 * 显示消息
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型
 * @param {number} duration - 显示时长
 */
function showMessage(message, type = 'info', duration = 5000) {
    console.log(`[${type.toUpperCase()}] ${message}`);

    const messageDiv = createMessageElement(message, type, duration);
    
    // 计算新消息的位置 - 从上到下排列
    const existingMessages = document.querySelectorAll('div[style*="position: fixed"][style*="right: 20px"]');
    let totalHeight = 20; // 初始顶部距离
    
    existingMessages.forEach(msg => {
        if (msg.parentNode && msg !== messageDiv) {
            totalHeight += msg.offsetHeight + 10; // 加上已有消息的高度和间距
        }
    });
    
    // 设置新消息的位置
    messageDiv.style.top = `${totalHeight}px`;
    
    document.body.appendChild(messageDiv);

    // 自动移除
    setTimeout(() => {
        messageDiv.style.opacity = '0';
        messageDiv.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
            // 重新排列剩余的消息
            rearrangeMessages();
        }, 300);
    }, duration);
}

/**
 * 安全地获取DOM元素
 * @param {string} id - 元素ID
 * @returns {HTMLElement|null} DOM元素或null
 */
function safeGetElementById(id) {
    try {
        return document.getElementById(id);
    } catch (error) {
        console.error(`获取元素失败: ${id}`, error);
        return null;
    }
}

/**
 * 安全地添加事件监听器
 * @param {HTMLElement} element - DOM元素
 * @param {string} event - 事件类型
 * @param {Function} handler - 事件处理函数
 */
function safeAddEventListener(element, event, handler) {
    if (!element) return;

    try {
        element.addEventListener(event, handler);
    } catch (error) {
        console.error(`添加事件监听器失败: ${event}`, error);
    }
}

/**
 * 重新排列剩余的消息气泡
 */
function rearrangeMessages() {
    const existingMessages = document.querySelectorAll('div[style*="position: fixed"][style*="right: 20px"]');
    let totalHeight = 20; // 初始顶部距离
    
    existingMessages.forEach(msg => {
        if (msg.parentNode) {
            msg.style.top = `${totalHeight}px`;
            totalHeight += msg.offsetHeight + 10; // 加上消息的高度和间距
        }
    });
}

module.exports = {
    debounce,
    showMessage,
    safeGetElementById,
    safeAddEventListener
};