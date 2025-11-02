/**
 * 应用常量
 */

// 视频文件扩展名
const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.m4v', '.mpeg', '.mpg', '.m2ts', '.ts', '.webm', '.vob', '.ogv', '.3gp', '.3g2'];

// 封面图片名称 (按优先级排序，poster.jpg 优先于 folder.jpg/fanart)
const COVER_NAMES = ['poster.jpg', 'folder.jpg'];

// 危险路径模式（用于安全检查）
const DANGEROUS_PATH_PATTERNS = ['..', '~/', '/etc/', '/system/', 'C:\\Windows\\'];

// 消息类型
const MESSAGE_TYPES = {
    ERROR: 'error',
    WARNING: 'warning',
    SUCCESS: 'success',
    INFO: 'info'
};

// 主题类型
const THEMES = {
    LIGHT: 'light',
    DARK: 'dark',
    AUTO: 'auto'
};

module.exports = {
    VIDEO_EXTENSIONS,
    COVER_NAMES,
    DANGEROUS_PATH_PATTERNS,
    MESSAGE_TYPES,
    THEMES
};