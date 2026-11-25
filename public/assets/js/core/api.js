import { state, hooks } from './state.js';
import { t } from './i18n.js';

export async function initCloudData() {
    const savedTheme = localStorage.getItem('nav_theme_mode') || 'theme-dark';
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(savedTheme);

    let savedBg = localStorage.getItem('nav_custom_wallpaper');
    const localSections = JSON.parse(localStorage.getItem('nav_dynamic_sections') || '[]');
    const localFriendLinks = JSON.parse(localStorage.getItem('nav_friend_links') || '[]');

    state.cloudConfig.dynamicSections = localSections;
    state.cloudConfig.friendLinks = localFriendLinks;

    try {
        const res = await fetch('/api/config');
        if (res.ok) {
            const configData = await res.json();
            if (configData) {
                if (typeof configData.version === 'number') state.cloudConfig.version = configData.version;
                if (configData.wallpaper !== undefined) {
                    if (configData.wallpaper === '') {
                        savedBg = null;
                        localStorage.removeItem('nav_custom_wallpaper');
                        document.body.classList.add('bg-cleared');
                    } else {
                        savedBg = configData.wallpaper;
                        localStorage.setItem('nav_custom_wallpaper', savedBg);
                        document.body.classList.remove('bg-cleared');
                    }
                }
                if (configData.dynamicSections) {
                    state.cloudConfig.dynamicSections = configData.dynamicSections;
                    localStorage.setItem('nav_dynamic_sections', JSON.stringify(state.cloudConfig.dynamicSections));
                }
                if (configData.friendLinks) {
                    state.cloudConfig.friendLinks = configData.friendLinks;
                    localStorage.setItem('nav_friend_links', JSON.stringify(state.cloudConfig.friendLinks));
                }
                if (typeof configData.siteTitle === 'string') state.cloudConfig.siteTitle = configData.siteTitle;
                if (typeof configData.footerText === 'string') state.cloudConfig.footerText = configData.footerText;
                if (Array.isArray(configData.engines) && configData.engines.length) state.cloudConfig.engines = configData.engines;
            }
        }
    } catch (e) {
        console.warn('未能连接云端 API，使用本地缓存', e);
    }

    const hasInitSections = localStorage.getItem('nav_sections_init') === 'true' || state.cloudConfig.version > 0;
    if (!hasInitSections && (!state.cloudConfig.dynamicSections || state.cloudConfig.dynamicSections.length === 0)) {
        state.cloudConfig.dynamicSections = [
            { id: 'sec_rec', title: t('defRec'), links: [] },
            { id: 'sec_dev', title: t('defDev'), links: [] },
            { id: 'sec_custom', title: t('defCustom'), links: [] }
        ];
        localStorage.setItem('nav_dynamic_sections', JSON.stringify(state.cloudConfig.dynamicSections));
    }
    localStorage.setItem('nav_sections_init', 'true');

    if (typeof hooks.onCloudConfigLoaded === 'function') {
        hooks.onCloudConfigLoaded(savedBg);
    }
}

// 保存状态机：idle / saving / saved / failed / unknown
export function setSaveState(nextState, message) {
    state.saveState = nextState;
    const el = document.getElementById('cloud-save-status');
    if (!el) return;
    clearTimeout(state.saveStatusTimer);
    el.classList.remove('hidden', 'text-slate-400', 'text-emerald-400', 'text-rose-400', 'text-amber-400');
    const colors = {
        saving: 'text-slate-400',
        saved: 'text-emerald-400',
        failed: 'text-rose-400',
        unknown: 'text-amber-400'
    };
    el.classList.add(colors[nextState] || 'text-slate-400');
    el.textContent = message || nextState;
    if (nextState === 'saved') {
        state.saveStatusTimer = setTimeout(() => el.classList.add('hidden'), 2500);
    }
}

// 通过 HttpOnly Cookie 会话保存配置，支持 (key, value) 或 (patchObject) 原子提交。
// 串行队列执行：并发保存依次排队，不被布尔锁静默丢弃。
export async function updateCloudConfig(key, value) {
    const patch = (key && typeof key === 'object' && !Array.isArray(key))
        ? key
        : { [key]: value };

    const task = state.saveQueue.then(() => performSave(patch), () => performSave(patch));
    state.saveQueue = task.then(() => {}, () => {});
    return task;
}

async function performSave(patch) {
    state.saveInProgress = true;
    try {
        Object.assign(state.cloudConfig, patch);
        setSaveState('saving', state.currentLang === 'zh' ? '正在保存…' : 'Saving…');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        try {
            // 只剔除 null/undefined（如未初始化的 engines），保留 '' 与 [] 的清空语义。
            const body = {};
            for (const [k, v] of Object.entries({ ...state.cloudConfig, version: state.cloudConfig.version || 0 })) {
                if (v !== null && v !== undefined) body[k] = v;
            }

            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                signal: controller.signal,
                body: JSON.stringify(body)
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                if (res.status === 401) {
                    setSaveState('failed', state.currentLang === 'zh' ? '会话已失效，请重新登录' : 'Session expired');
                    if (typeof hooks.onUnauthorized === 'function') {
                        await hooks.onUnauthorized();
                    }
                } else if (res.status === 409) {
                    if (typeof data.currentVersion === 'number') {
                        state.cloudConfig.version = data.currentVersion;
                    }
                    if (data.config && typeof data.config === 'object') {
                        Object.assign(state.cloudConfig, data.config);
                        state.cloudConfig.version = data.currentVersion;
                    }
                    setSaveState('failed', data.message || '配置可能已被其他设备更新，请刷新确认');
                    alert(data.message || '配置可能已被其他设备更新，请刷新确认');
                } else {
                    setSaveState('failed', data.message || `保存失败 (${res.status})`);
                    alert(data.message || `保存失败：服务端异常 (${res.status})`);
                }
                return false;
            }

            if (typeof data.version === 'number') state.cloudConfig.version = data.version;
            setSaveState('saved', state.currentLang === 'zh' ? '已保存' : 'Saved');
            return true;
        } catch (e) {
            console.error('云端同步失败', e);
            const isTimeout = e.name === 'AbortError';
            const msg = isTimeout
                ? (state.currentLang === 'zh' ? '保存结果未知，请刷新确认' : 'Save result unknown, please refresh')
                : (state.currentLang === 'zh' ? '网络异常，结果未知，请刷新确认' : 'Network error, result unknown');
            setSaveState('unknown', msg);
            alert(msg);
            return false;
        } finally {
            clearTimeout(timeoutId);
        }
    } finally {
        state.saveInProgress = false;
    }
}
