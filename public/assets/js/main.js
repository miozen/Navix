import { state, hooks } from './core/state.js';
import { setLanguage, applyLanguage } from './core/i18n.js';
import { initCloudData } from './core/api.js';
import { initStarfield } from './features/starfield.js';
import {
    checkAdminSession, verifyAdminSession, triggerAdminLogin, handleAdminTrigger,
    logoutAdmin, updateAdminPwd, closeAuthModalOnBlank, submitAuthModal, cancelAuthModal
} from './features/admin.js';
import { toggleThemeMenu, setBaseTheme, applyWallpaperStyles, applyCustomBg, clearCustomBg } from './features/appearance.js';
import { updateClockAndGreeting, fetchWeather, renderWeather, initBackToTop, scrollToTop } from './features/widgets.js';
import {
    handleDragStart, handleDragEnd, handleDragOver, handleDrop,
    handleLinkIconError, handleLinkIconLoad,
    addCustomSection, renameCustomSection, deleteCustomSection,
    renderDynamicSections, deleteSectionLink, loadFriendLinks,
    toggleEngineMenu, selectEngine,
    handleSearchSubmit, applySiteAppearance,
    setDefaultEngine, addEngine, removeEngine, resetEngines, applySiteSettings,
    openLinkModal, openEditLinkModal, toggleModal, closeModalOnBlank, saveActiveLink, deleteFriendLink
} from './features/navigation.js';

// 注册跨模块生命周期回调，保持依赖单向无环。
hooks.onUnauthorized = () => logoutAdmin();
hooks.onLanguageApplied = () => {
    renderDynamicSections();
    loadFriendLinks();
};
hooks.onLanguageChanged = () => {
    updateClockAndGreeting();
    renderWeather();
    selectEngine(state.currentEngineKey);
};
hooks.onCloudConfigLoaded = (savedBg) => {
    if (savedBg && !document.body.classList.contains('bg-cleared')) {
        applyWallpaperStyles(savedBg);
        const bgInput = document.getElementById('custom-bg-input');
        if (bgInput) bgInput.value = savedBg;
        document.getElementById('clear-bg-btn')?.classList.remove('hidden');
    } else {
        const starfield = document.getElementById('starfield');
        if (starfield) starfield.style.opacity = '1';
    }
    renderDynamicSections();
    loadFriendLinks();
    applySiteAppearance();
};

// 挂载 HTML 内联事件所需的全局处理器
Object.assign(window, {
    setLanguage, checkAdminSession, verifyAdminSession, triggerAdminLogin, handleAdminTrigger,
    logoutAdmin, updateAdminPwd, closeAuthModalOnBlank, submitAuthModal, cancelAuthModal,
    toggleThemeMenu, setBaseTheme, applyCustomBg, clearCustomBg,
    toggleEngineMenu, selectEngine, handleSearchSubmit, applySiteAppearance,
    setDefaultEngine, addEngine, removeEngine, resetEngines, applySiteSettings,
    addCustomSection, openLinkModal, openEditLinkModal,
    closeModalOnBlank, toggleModal, saveActiveLink,
    handleDragStart, handleDragEnd, handleDragOver, handleDrop,
    deleteSectionLink, renameCustomSection, deleteCustomSection, deleteFriendLink,
    handleLinkIconError, handleLinkIconLoad,
    scrollToTop
});

// 搜索引擎提交由自定义 URL 模板接管（含 {q} 占位符），不走表单默认 action
document.getElementById('search-form')?.addEventListener('submit', handleSearchSubmit);

initStarfield();
initBackToTop();
setInterval(updateClockAndGreeting, 1000);

// 全局空白点击与快捷键
document.addEventListener('click', () => {
    document.getElementById('engine-menu')?.classList.add('hidden');
    document.getElementById('theme-panel')?.classList.add('hidden');
});

document.addEventListener('keydown', (event) => {
    const activeTag = document.activeElement?.tagName?.toLowerCase();
    const isTyping = ['input', 'textarea', 'select'].includes(activeTag);

    if (event.key === 'Escape') {
        document.getElementById('engine-menu')?.classList.add('hidden');
        document.getElementById('theme-panel')?.classList.add('hidden');
        toggleModal(false);
        cancelAuthModal();
    }

    if (event.key === '/' && !isTyping) {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            event.preventDefault();
            searchInput.focus();
            searchInput.select();
        }
    }
});

// 首屏初始化
checkAdminSession();
verifyAdminSession();
document.documentElement.lang = state.currentLang === 'zh' ? 'zh-CN' : 'en';
applyLanguage();
updateClockAndGreeting();
fetchWeather();
initCloudData();
