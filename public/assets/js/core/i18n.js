import { state, hooks } from './state.js';

export const i18n = {
    zh: {
        pageTitle: 'Mio-智能多功能响应式导航', langTitle: '语言 / Language', themeTitle: '基础色彩模式 (本地偏好)',
        themeLight: '日间', themeDark: '夜间', bgTitle: '自定义背景 (全站同步)', bgInputPlace: '输入图片网址 https://...',
        applyBtn: '应用', clearBg: '清除壁纸', logoutBtn: '退出后台管理', weatherLoading: '正在定位测算天气...',
        enGoogle: '谷歌 Google', enBing: '必应 Bing', enBaidu: '百度 Baidu', searchGoogle: '在 Google 中搜索...', searchBing: '在 必应 Bing 中搜索...', searchBaidu: '在 百度 Baidu 中搜索...', searchGithub: '在 GitHub 中搜索仓库...',
        cardFriend: '友情链接', addCloud: '添加 (云端)', addLocal: '添加 (本地)', expandMore: '展开显示更多', collapseMore: '收起部分站点',
        footerText: '&copy; 2026 Mio-智能生态导航 · Powered by Cloudflare', adminBadge: '已登入',
        modalAddCloud: '添加站长推荐', modalAddFriend: '添加友情链接', siteName: '网站名称', siteNamePlace: '例如：百度', siteUrl: '网站网址 (URL)',
        btnCancel: '取消', btnSave: '保存站点', btnSaveEdit: '保存修改', modalEdit: '编辑网址', noCloudLinks: '暂无数据', loadingCloud: '正在加载...',
        delConfirm: '确定要删除这个链接吗？', pwdPrompt: '请输入后台管理员安全密码：', pwdSuccess: '🎉 认证成功！管理功能已全部解锁。', pwdFail: '❌ 密码错误，鉴权失败！', logoutMsg: '🔒 已安全退出管理后台，页面回归只读状态。',
        authLoginTitle: '管理员登录', authVerifyTitle: '验证当前密码', authOldPwdLabel: '请输入当前管理员密码：', authPwdPlace: '请输入密码', authLoginBtn: '登录', authConfirmBtn: '确认',
        weatherCloudy: '多云', weatherClear: '晴朗', weatherRain: '阵雨', weatherSnow: '降雪', weatherThunder: '雷阵雨', weatherDefault: '风调雨顺 · 晴', validUrlMsg: '提示：请输入有效的网址！',
        addSectionBtn: '添加自定义区域', promptSectionName: '请输入新区域的名称 (例如：AI工具)：', delSectionConfirm: '确定要删除整个区域及其所有链接吗？', modalAddSection: '添加到自定义区域',
        renameSectionPrompt: '请输入新的区域名称：',
        pwdTitle: '修改管理员密码 (全站同步)', pwdInputPlace: '输入新密码', saveBtn: '保存', pwdUpdateSuccess: '管理员密码修改成功！下次登录生效。',
        defRec: '常用推荐', defDev: '效率与开发', defCustom: '站长推荐',
        sectionAppearance: '外观 / APPEARANCE', sectionSite: '站点设置 / SITE (仅管理员)', sectionAdmin: '后台 / ADMIN',
        siteTitleLabel: '站点标题', footerTextLabel: '页脚文字', enginesLabel: '搜索引擎',
        resetEngines: '恢复默认', addEngine: '+ 添加引擎', saveEngines: '保存搜索引擎'
    },
    en: {
        pageTitle: 'Mio - Smart Responsive Nav', langTitle: 'Language / 语言', themeTitle: 'Color Theme (Local Pref)',
        themeLight: 'Light', themeDark: 'Dark', bgTitle: 'Custom Wallpaper (Cloud Sync)', bgInputPlace: 'Image URL https://...',
        applyBtn: 'Apply', clearBg: 'Clear Wallpaper', logoutBtn: 'Logout Admin', weatherLoading: 'Fetching weather...',
        enGoogle: 'Google', enBing: 'Bing', enBaidu: 'Baidu', searchGoogle: 'Search in Google...', searchBing: 'Search in Bing...', searchBaidu: 'Search in Baidu...', searchGithub: 'Search in GitHub...',
        cardFriend: 'Friend Links', addCloud: 'Add (Cloud)', addLocal: 'Add (Local)', expandMore: 'Show More', collapseMore: 'Collapse',
        footerText: '&copy; 2026 Mio Smart Nav · Powered by Cloudflare', adminBadge: 'Logged In',
        modalAddCloud: 'Add Link', modalAddFriend: 'Add Friend Link', siteName: 'Site Name', siteNamePlace: 'e.g., Google', siteUrl: 'Site URL',
        btnCancel: 'Cancel', btnSave: 'Save Site', btnSaveEdit: 'Save Changes', modalEdit: 'Edit Link', noCloudLinks: 'No data available', loadingCloud: 'Loading...',
        delConfirm: 'Are you sure you want to delete this link?', pwdPrompt: 'Enter Admin Password:', pwdSuccess: '🎉 Authenticated! Admin features unlocked.', pwdFail: '❌ Incorrect password!', logoutMsg: '🔒 Logged out safely. Read-only mode activated.',
        authLoginTitle: 'Admin Login', authVerifyTitle: 'Verify Current Password', authOldPwdLabel: 'Enter current admin password:', authPwdPlace: 'Enter password', authLoginBtn: 'Login', authConfirmBtn: 'Confirm',
        weatherCloudy: 'Cloudy', weatherClear: 'Clear', weatherRain: 'Rain', weatherSnow: 'Snow', weatherThunder: 'Thunder', weatherDefault: 'Good Weather · Clear', validUrlMsg: 'Please enter a valid URL!',
        addSectionBtn: 'Add Custom Section', promptSectionName: 'Enter new section name (e.g., AI Tools):', delSectionConfirm: 'Are you sure you want to delete this entire section?', modalAddSection: 'Add to Custom Section',
        renameSectionPrompt: 'Enter new section name:',
        pwdTitle: 'Change Admin Password (Cloud Sync)', pwdInputPlace: 'Enter new password', saveBtn: 'Save', pwdUpdateSuccess: 'Admin password updated successfully! Valid on next login.',
        defRec: 'Recommended', defDev: 'Dev & Tools', defCustom: 'Webmaster Picks',
        sectionAppearance: 'APPEARANCE', sectionSite: 'SITE (Admin only)', sectionAdmin: 'ADMIN',
        siteTitleLabel: 'Site Title', footerTextLabel: 'Footer Text', enginesLabel: 'Search Engines',
        resetEngines: 'Reset', addEngine: '+ Add Engine', saveEngines: 'Save Search Engines'
    }
};

export function t(key) {
    return (i18n[state.currentLang] && i18n[state.currentLang][key]) || key;
}

export function applyLanguage() {
    const title = state.cloudConfig.siteTitle || t('pageTitle');
    const pageTitleEl = document.getElementById('page-title');
    if (pageTitleEl) pageTitleEl.innerText = title;
    document.title = title;

    document.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.getAttribute('data-i18n');
        if (key === 'footerText' && state.cloudConfig.footerText) {
            el.textContent = state.cloudConfig.footerText;
        } else {
            el.innerHTML = t(key);
        }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
        el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });

    if (typeof hooks.onLanguageApplied === 'function') {
        hooks.onLanguageApplied();
    }
}

export function setLanguage(lang) {
    state.currentLang = lang;
    localStorage.setItem('nav_lang', lang);
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    applyLanguage();
    if (typeof hooks.onLanguageChanged === 'function') {
        hooks.onLanguageChanged();
    }
    document.getElementById('theme-panel')?.classList.add('hidden');
}
