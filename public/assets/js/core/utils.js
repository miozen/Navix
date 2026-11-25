// 纯工具函数与默认搜索引擎定义（无副作用，不依赖其他模块）

export const DEFAULT_ENGINES = [
    { id: 'google', name: 'Google', url: 'https://www.google.com/search?q={q}', icon: 'fab fa-google text-blue-400' },
    { id: 'bing', name: 'Bing', url: 'https://cn.bing.com/search?q={q}', icon: 'fab fa-microsoft text-teal-400' },
    { id: 'baidu', name: '百度', url: 'https://www.baidu.com/s?wd={q}', icon: 'fas fa-paw text-red-400' },
    { id: 'github', name: 'GitHub', url: 'https://github.com/search?q={q}', icon: 'fab fa-github text-slate-400' }
];

export function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function normalizeURL(value) {
    let url = String(value || '').trim();
    if (!url) return null;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) return null;
        return parsed.href;
    } catch {
        return null;
    }
}

export function getEngineList(cloudConfig) {
    return Array.isArray(cloudConfig?.engines) && cloudConfig.engines.length
        ? cloudConfig.engines
        : DEFAULT_ENGINES;
}
