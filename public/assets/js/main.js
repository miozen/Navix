import { currentLang } from './core/state.js';
import { setLanguage, applyLanguage } from './core/i18n.js';
import { initCloudData } from './core/api.js';
import { checkAdminSession, triggerAdminLogin, handleAdminTrigger, logoutAdmin, updateAdminPwd } from './features/admin.js';
import { toggleThemeMenu, setBaseTheme, applyCustomBg, clearCustomBg } from './features/appearance.js';
import { updateClockAndGreeting, fetchWeather, updateBackToTop, scrollToTop } from './features/widgets.js';
import {
    handleDragStart, handleDragEnd, handleDragOver, handleDrop,
    addCustomSection, renameCustomSection, deleteCustomSection,
    renderDynamicSections, deleteSectionLink,
    toggleEngineMenu, selectEngine,
    handleSearchSubmit, applySiteAppearance,
    setDefaultEngine, addEngine, removeEngine, resetEngines, applySiteSettings,
    openLinkModal, openEditLinkModal, toggleModal, closeModalOnBlank, saveActiveLink, deleteFriendLink
} from './features/navigation.js';

Object.assign(window, {
    setLanguage, checkAdminSession, triggerAdminLogin, handleAdminTrigger, logoutAdmin, updateAdminPwd,
    toggleThemeMenu, setBaseTheme, applyCustomBg, clearCustomBg,
    toggleEngineMenu, selectEngine, handleSearchSubmit, applySiteAppearance,
    setDefaultEngine, addEngine, removeEngine, resetEngines, applySiteSettings,
    addCustomSection, openLinkModal, openEditLinkModal,
    closeModalOnBlank, toggleModal, saveActiveLink,
    handleDragStart, handleDragEnd, handleDragOver, handleDrop,
    deleteSectionLink, renameCustomSection, deleteCustomSection, deleteFriendLink,
    scrollToTop
});

// 搜索引擎提交由自定义 URL 模板接管（含 {q} 占位符），不走表单默认 action
document.getElementById('search-form')?.addEventListener('submit', handleSearchSubmit);

// 回到顶部按钮：滚动时切换显隐（passive 提升滚动性能）
window.addEventListener('scroll', updateBackToTop, { passive: true });
updateBackToTop();

// --- 10. 初始化与键盘快捷键 ---
        document.addEventListener('click', () => {
            document.getElementById('engine-menu').classList.add('hidden');
            document.getElementById('theme-panel').classList.add('hidden');
        });

        document.addEventListener('keydown', event => {
            const activeTag = document.activeElement?.tagName?.toLowerCase();
            const isTyping = ['input', 'textarea', 'select'].includes(activeTag);

            if (event.key === 'Escape') {
                document.getElementById('engine-menu')?.classList.add('hidden');
                document.getElementById('theme-panel')?.classList.add('hidden');
                toggleModal(false);
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

        checkAdminSession();
        document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en';
        applyLanguage();
        updateClockAndGreeting();
        fetchWeather();
        initCloudData();
