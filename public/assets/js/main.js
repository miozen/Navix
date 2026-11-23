import { currentLang } from './core/state.js';
import { setLanguage, applyLanguage } from './core/i18n.js';
import { initCloudData } from './core/api.js';
import { checkAdminSession, triggerAdminLogin, logoutAdmin, updateAdminPwd } from './features/admin.js';
import { toggleThemeMenu, setBaseTheme, applyCustomBg, clearCustomBg } from './features/appearance.js';
import { updateClockAndGreeting, fetchWeather } from './features/widgets.js';
import {
    handleDragStart, handleDragEnd, handleDragOver, handleDrop,
    addCustomSection, renameCustomSection, deleteCustomSection,
    renderDynamicSections, deleteSectionLink,
    toggleEngineMenu, selectEngine,
    openLinkModal, toggleModal, closeModalOnBlank, saveActiveLink, deleteFriendLink
} from './features/navigation.js';

Object.assign(window, {
    setLanguage, checkAdminSession, triggerAdminLogin, logoutAdmin, updateAdminPwd,
    toggleThemeMenu, setBaseTheme, applyCustomBg, clearCustomBg,
    toggleEngineMenu, selectEngine, addCustomSection, openLinkModal,
    closeModalOnBlank, toggleModal, saveActiveLink,
    handleDragStart, handleDragEnd, handleDragOver, handleDrop,
    deleteSectionLink, renameCustomSection, deleteCustomSection, deleteFriendLink
});

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
