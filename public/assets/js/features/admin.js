import { state } from '../core/state.js';
import { t } from '../core/i18n.js';

let authModalResolver = null;

function resolveAuthModal(value) {
    const modal = document.getElementById('auth-modal');
    const input = document.getElementById('auth-modal-password');
    if (modal) modal.classList.add('hidden');
    if (input) input.value = '';
    const resolver = authModalResolver;
    authModalResolver = null;
    if (typeof resolver === 'function') resolver(value);
}

// 带遮罩的密码输入模态框：替代原生明文 prompt 弹窗，供登录与改密复用。
export function requestPasswordModal({ title, label, placeholder, submitText }) {
    if (authModalResolver) resolveAuthModal(null);

    const modal = document.getElementById('auth-modal');
    const titleEl = document.getElementById('auth-modal-title');
    const labelEl = document.getElementById('auth-modal-label');
    const inputEl = document.getElementById('auth-modal-password');
    const submitEl = document.getElementById('auth-modal-submit');
    if (!modal || !inputEl) return Promise.resolve(null);

    if (titleEl) titleEl.textContent = title || t('authVerifyTitle');
    if (labelEl) labelEl.textContent = label || t('authOldPwdLabel');
    inputEl.placeholder = placeholder || t('authPwdPlace');
    inputEl.value = '';
    if (submitEl) submitEl.textContent = submitText || t('authConfirmBtn');

    modal.classList.remove('hidden');
    setTimeout(() => inputEl.focus(), 50);

    return new Promise((resolve) => {
        authModalResolver = resolve;
    });
}

export function submitAuthModal() {
    const input = document.getElementById('auth-modal-password');
    const value = input ? input.value : '';
    if (!value.trim()) {
        input?.focus();
        return;
    }
    resolveAuthModal(value);
}

export function cancelAuthModal() {
    if (!authModalResolver) {
        const modal = document.getElementById('auth-modal');
        const input = document.getElementById('auth-modal-password');
        if (modal) modal.classList.add('hidden');
        if (input) input.value = '';
        return;
    }
    resolveAuthModal(null);
}

export function closeAuthModalOnBlank(e) {
    if (e.target && e.target.id === 'auth-modal') cancelAuthModal();
}

export function checkAdminSession() {
    const isAdmin = localStorage.getItem('nav_admin_auth') === 'true';
    const badge = document.getElementById('admin-badge');
    if (isAdmin) {
        document.body.classList.add('is-admin');
        badge?.classList.remove('hidden');
    } else {
        document.body.classList.remove('is-admin');
        badge?.classList.add('hidden');
    }
}

// 首屏静默探活：仅当本地存在登录态时向服务端核对 HttpOnly Cookie，避免“伪登录”。
export async function verifyAdminSession() {
    if (localStorage.getItem('nav_admin_auth') !== 'true') return false;
    try {
        const res = await fetch('/api/session', { credentials: 'same-origin' });
        if (!res.ok) return true;
        const data = await res.json().catch(() => null);
        if (!data || typeof data.authenticated !== 'boolean') return true;
        if (!data.authenticated) {
            localStorage.removeItem('nav_admin_auth');
            localStorage.removeItem('nav_must_change_pwd');
            state.expandedDynamicSections = {};
            checkAdminSession();
            return false;
        }
        if (data.mustChangePassword) {
            localStorage.setItem('nav_must_change_pwd', 'true');
        } else {
            localStorage.removeItem('nav_must_change_pwd');
        }
        return true;
    } catch {
        // 离线或网络抖动时不误踢出本地状态
        return true;
    }
}

export async function triggerAdminLogin() {
    if (localStorage.getItem('nav_admin_auth') === 'true') {
        alert(state.currentLang === 'zh' ? '提示：您已处于后台管理模式。' : 'Notice: You are already in admin mode.');
        return;
    }
    const pwd = await requestPasswordModal({
        title: t('authLoginTitle'),
        label: t('pwdPrompt'),
        placeholder: t('authPwdPlace'),
        submitText: t('authLoginBtn')
    });
    if (pwd === null) return;

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ password: pwd.trim() })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
            localStorage.setItem('nav_admin_auth', 'true');
            checkAdminSession();
            if (data.mustChangePassword) {
                localStorage.setItem('nav_must_change_pwd', 'true');
                const panel = document.getElementById('theme-panel');
                if (panel) panel.classList.remove('hidden');
                const pwdInput = document.getElementById('custom-pwd-input');
                if (pwdInput) setTimeout(() => pwdInput.focus(), 50);
                alert(state.currentLang === 'zh'
                    ? '首次使用，请先设置一个自己的管理员密码（至少 8 位），否则无法保存配置。'
                    : 'First time use: please set your own admin password (at least 8 characters) before saving config.');
            } else {
                localStorage.removeItem('nav_must_change_pwd');
            }
        } else {
            alert(data.message || t('pwdFail'));
        }
    } catch (e) {
        console.error('登录失败', e);
        alert(state.currentLang === 'zh' ? '登录失败，无法连接服务器！' : 'Login failed. Server unavailable.');
    }
}

// 页脚统一入口：未登录时单击登录；已登录时单击确认后退出。
export function handleAdminTrigger() {
    if (localStorage.getItem('nav_admin_auth') === 'true') {
        const ok = confirm(state.currentLang === 'zh'
            ? '确定要退出后台管理吗？'
            : 'Log out of admin mode?');
        if (ok) logoutAdmin(true);
        return;
    }
    triggerAdminLogin();
}

// silent=true 用于页脚已 confirm 的场景；默认保留提示用于设置面板退出与 401 被动退出。
export async function logoutAdmin(silent = false) {
    try {
        await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
    } catch (e) {
        console.warn('退出请求失败', e);
    }
    localStorage.removeItem('nav_admin_auth');
    localStorage.removeItem('nav_must_change_pwd');
    if (!silent) alert(t('logoutMsg'));
    state.expandedDynamicSections = {};
    checkAdminSession();
    document.getElementById('theme-panel')?.classList.add('hidden');
}

export async function updateAdminPwd() {
    const pwdInput = document.getElementById('custom-pwd-input');
    const newPwd = pwdInput ? pwdInput.value.trim() : '';
    if (!newPwd) return;
    if (newPwd.length < 8) {
        alert(state.currentLang === 'zh' ? '新密码至少需要 8 位。' : 'New password must be at least 8 characters.');
        return;
    }
    const oldPwd = await requestPasswordModal({
        title: t('authVerifyTitle'),
        label: t('authOldPwdLabel'),
        placeholder: t('authPwdPlace'),
        submitText: t('authConfirmBtn')
    });
    if (oldPwd === null) return;

    try {
        const res = await fetch('/api/password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
            alert(data.message || t('pwdFail'));
            return;
        }
        if (pwdInput) pwdInput.value = '';
        document.getElementById('theme-panel')?.classList.add('hidden');
        localStorage.removeItem('nav_admin_auth');
        localStorage.removeItem('nav_must_change_pwd');
        checkAdminSession();
        alert(state.currentLang === 'zh'
            ? '密码已设置，请单击页脚用新密码重新登录。'
            : 'Password set. Please click the footer to log in again with the new password.');
    } catch (e) {
        console.error('修改密码失败', e);
        alert(state.currentLang === 'zh' ? '修改密码失败，无法连接服务器！' : 'Password update failed. Server unavailable.');
    }
}
