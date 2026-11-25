import { DEFAULT_ENGINES } from './utils.js';

// 全局可变状态容器：避免 ES Module 跨模块重赋值错误。
export const state = {
    currentLang: localStorage.getItem('nav_lang') || 'zh',
    expandedDynamicSections: {},
    currentModalTarget: 'friend',
    editingTarget: null,
    currentEngineKey: 'google',
    enginesDraft: null,
    enginesDefaultId: 'google',
    cloudConfig: {
        wallpaper: '',
        dynamicSections: [],
        friendLinks: [],
        version: 0,
        siteTitle: '',
        footerText: '',
        engines: null
    },
    saveState: 'idle',
    saveInProgress: false,
    // 串行保存队列：并发保存依次执行，不被布尔锁静默丢弃。
    saveQueue: Promise.resolve(),
    saveStatusTimer: null,
    weatherState: { city: 'Earth', temp: 26, code: 0, fetched: false },
    dragType: null,
    dragSecId: null,
    dragLinkIdx: null
};

// 生命周期回调注册表：用于解耦底层模块对上层特性模块的反向调用，保持依赖单向无环。
export const hooks = {
    onUnauthorized: null,
    onLanguageApplied: null,
    onLanguageChanged: null,
    onCloudConfigLoaded: null
};

export const engines = Object.fromEntries(DEFAULT_ENGINES.map((e) => [e.id, e]));
