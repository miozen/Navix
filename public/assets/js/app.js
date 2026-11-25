// 向后兼容聚合导出入口：真实实现已下沉至 core/ 与 features/ 各独立模块。

export { state, hooks, engines } from './core/state.js';
export { escapeHtml, normalizeURL, DEFAULT_ENGINES, getEngineList } from './core/utils.js';
export { i18n, t, setLanguage, applyLanguage } from './core/i18n.js';
export { initCloudData, setSaveState, updateCloudConfig } from './core/api.js';
export { initStarfield, resumeStarfield } from './features/starfield.js';
export {
    checkAdminSession,
    verifyAdminSession,
    requestPasswordModal,
    submitAuthModal,
    cancelAuthModal,
    closeAuthModalOnBlank,
    triggerAdminLogin,
    handleAdminTrigger,
    logoutAdmin,
    updateAdminPwd
} from './features/admin.js';
export {
    toggleThemeMenu,
    setBaseTheme,
    applyWallpaperStyles,
    applyCustomBg,
    clearCustomBg
} from './features/appearance.js';
export {
    sTermNames,
    sTermInfo,
    getSolarTerm,
    updateClockAndGreeting,
    fetchWeather,
    renderWeather,
    initBackToTop,
    scrollToTop
} from './features/widgets.js';
export {
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop,
    saveDynamicSections,
    addCustomSection,
    renameCustomSection,
    deleteCustomSection,
    renderDynamicSections,
    deleteSectionLink,
    toggleEngineMenu,
    selectEngine,
    currentEngine,
    handleSearchSubmit,
    applySiteAppearance,
    setDefaultEngine,
    addEngine,
    removeEngine,
    resetEngines,
    applySiteSettings,
    openLinkModal,
    openEditLinkModal,
    toggleModal,
    closeModalOnBlank,
    saveActiveLink,
    loadFriendLinks,
    deleteFriendLink
} from './features/navigation.js';
