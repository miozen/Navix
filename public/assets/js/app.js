// 原始应用逻辑：按能力拆分的模块入口从这里导出。

        // --- 0. 全局动态星空渲染 (Canvas) ---
        function initStarfield() {
            const canvas = document.getElementById('starfield');
            const ctx = canvas.getContext('2d');
            let w = canvas.width = window.innerWidth;
            let h = canvas.height = window.innerHeight;

            const stars = [];
            for (let i = 0; i < 180; i++) {
                stars.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    r: Math.random() * 1.5 + 0.5,
                    dx: (Math.random() - 0.5) * 0.15,
                    dy: (Math.random() - 0.5) * 0.15 - 0.05
                });
            }

            function draw() {
                ctx.clearRect(0, 0, w, h);
                const isLight = document.body.classList.contains('theme-light');
                ctx.fillStyle = isLight ? 'rgba(15, 23, 42, 0.3)' : 'rgba(255, 255, 255, 0.6)';

                stars.forEach(star => {
                    ctx.beginPath();
                    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
                    ctx.fill();
                    star.x += star.dx;
                    star.y += star.dy;

                    if (star.x < 0) star.x = w;
                    if (star.x > w) star.x = 0;
                    if (star.y < 0) star.y = h;
                    if (star.y > h) star.y = 0;
                });
                requestAnimationFrame(draw);
            }
            draw();

            window.addEventListener('resize', () => {
                w = canvas.width = window.innerWidth;
                h = canvas.height = window.innerHeight;
            });
        }
        initStarfield();

        // --- 1. 全局状态与多语言 ---
        let currentLang = localStorage.getItem('nav_lang') || 'zh';
        let expandedDynamicSections = {};
        let currentModalTarget = 'friend';
        let editingTarget = null;
        let currentEngineKey = 'google';
        let enginesDraft = null;
        let enginesDefaultId = 'google';

        // 云端配置状态池（新增站点外观字段，云端无值时用默认兜底）
        let cloudConfig = { wallpaper: "", dynamicSections: [], friendLinks: [], version: 0, siteTitle: "", footerText: "", engines: null };
        let saveState = 'idle';
        let saveInProgress = false;
        // 串行保存队列：并发保存不再被布尔锁静默丢弃，而是依次执行。
        // 这样快速连续添加/编辑云端数据时每一次都会真正提交，避免「点了没反应」。
        let saveQueue = Promise.resolve();
        let saveStatusTimer = null;

        let dragType = null;
        let dragSecId = null;
        let dragLinkIdx = null;

        const i18n = {
            zh: {
                pageTitle: "Mio-智能多功能响应式导航", langTitle: "语言 / Language", themeTitle: "基础色彩模式 (本地偏好)",
                themeLight: "日间", themeDark: "夜间", bgTitle: "自定义背景 (全站同步)", bgInputPlace: "输入图片网址 https://...",
                applyBtn: "应用", clearBg: "清除壁纸", logoutBtn: "退出后台管理", weatherLoading: "正在定位测算天气...",
                enGoogle: "谷歌 Google", enBing: "必应 Bing", enBaidu: "百度 Baidu", searchGoogle: "在 Google 中搜索...", searchBing: "在 必应 Bing 中搜索...", searchBaidu: "在 百度 Baidu 中搜索...", searchGithub: "在 GitHub 中搜索仓库...",
                cardFriend: "友情链接", addCloud: "添加 (云端)", addLocal: "添加 (本地)", expandMore: "展开显示更多", collapseMore: "收起部分站点",
                footerText: "&copy; 2026 Mio-智能生态导航 · Powered by Cloudflare", adminBadge: "已登入",
                modalAddCloud: "添加站长推荐", modalAddFriend: "添加友情链接", siteName: "网站名称", siteNamePlace: "例如：百度", siteUrl: "网站网址 (URL)",
                btnCancel: "取消", btnSave: "保存站点", btnSaveEdit: "保存修改", modalEdit: "编辑网址", noCloudLinks: "暂无数据", loadingCloud: "正在加载...",
                delConfirm: "确定要删除这个链接吗？", pwdPrompt: "🔐 请输入后台管理员安全密码：", pwdSuccess: "🎉 认证成功！管理功能已全部解锁。", pwdFail: "❌ 密码错误，鉴权失败！", logoutMsg: "🔒 已安全退出管理后台，页面回归只读状态。",
                weatherCloudy: "多云", weatherClear: "晴朗", weatherRain: "阵雨", weatherSnow: "降雪", weatherThunder: "雷阵雨", weatherDefault: "风调雨顺 · 晴", validUrlMsg: "提示：请输入有效的网址！",
                addSectionBtn: "添加自定义区域", promptSectionName: "请输入新区域的名称 (例如：AI工具)：", delSectionConfirm: "确定要删除整个区域及其所有链接吗？", modalAddSection: "添加到自定义区域",
                renameSectionPrompt: "请输入新的区域名称：",
                pwdTitle: "修改管理员密码 (全站同步)", pwdInputPlace: "输入新密码", saveBtn: "保存", pwdUpdateSuccess: "管理员密码修改成功！下次登录生效。",
                defRec: "常用推荐", defDev: "效率与开发", defCustom: "站长推荐",
                sectionAppearance: "外观 / APPEARANCE", sectionSite: "站点设置 / SITE (仅管理员)", sectionAdmin: "后台 / ADMIN",
                siteTitleLabel: "站点标题", footerTextLabel: "页脚文字", enginesLabel: "搜索引擎",
                resetEngines: "恢复默认", addEngine: "+ 添加引擎", saveEngines: "保存搜索引擎"
            },
            en: {
                pageTitle: "Mio - Smart Responsive Nav", langTitle: "Language / 语言", themeTitle: "Color Theme (Local Pref)",
                themeLight: "Light", themeDark: "Dark", bgTitle: "Custom Wallpaper (Cloud Sync)", bgInputPlace: "Image URL https://...",
                applyBtn: "Apply", clearBg: "Clear Wallpaper", logoutBtn: "Logout Admin", weatherLoading: "Fetching weather...",
                enGoogle: "Google", enBing: "Bing", enBaidu: "Baidu", searchGoogle: "Search in Google...", searchBing: "Search in Bing...", searchBaidu: "Search in Baidu...", searchGithub: "Search in GitHub...",
                cardFriend: "Friend Links", addCloud: "Add (Cloud)", addLocal: "Add (Local)", expandMore: "Show More", collapseMore: "Collapse",
                footerText: "&copy; 2026 Mio Smart Nav · Powered by Cloudflare", adminBadge: "Logged In",
                modalAddCloud: "Add Link", modalAddFriend: "Add Friend Link", siteName: "Site Name", siteNamePlace: "e.g., Google", siteUrl: "Site URL",
                btnCancel: "Cancel", btnSave: "Save Site", btnSaveEdit: "Save Changes", modalEdit: "Edit Link", noCloudLinks: "No data available", loadingCloud: "Loading...",
                delConfirm: "Are you sure you want to delete this link?", pwdPrompt: "🔐 Enter Admin Password:", pwdSuccess: "🎉 Authenticated! Admin features unlocked.", pwdFail: "❌ Incorrect password!", logoutMsg: "🔒 Logged out safely. Read-only mode activated.",
                weatherCloudy: "Cloudy", weatherClear: "Clear", weatherRain: "Rain", weatherSnow: "Snow", weatherThunder: "Thunder", weatherDefault: "Good Weather · Clear", validUrlMsg: "Please enter a valid URL!",
                addSectionBtn: "Add Custom Section", promptSectionName: "Enter new section name (e.g., AI Tools):", delSectionConfirm: "Are you sure you want to delete this entire section?", modalAddSection: "Add to Custom Section",
                renameSectionPrompt: "Enter new section name:",
                pwdTitle: "Change Admin Password (Cloud Sync)", pwdInputPlace: "Enter new password", saveBtn: "Save", pwdUpdateSuccess: "Admin password updated successfully! Valid on next login.",
                defRec: "Recommended", defDev: "Dev & Tools", defCustom: "Webmaster Picks",
                sectionAppearance: "APPEARANCE", sectionSite: "SITE (Admin only)", sectionAdmin: "ADMIN",
                siteTitleLabel: "Site Title", footerTextLabel: "Footer Text", enginesLabel: "Search Engines",
                resetEngines: "Reset", addEngine: "+ Add Engine", saveEngines: "Save Search Engines"
            }
        };

        function t(key) { return i18n[currentLang][key] || key; }

        function setLanguage(lang) {
            currentLang = lang;
            localStorage.setItem('nav_lang', lang);
            document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
            applyLanguage();
            updateClockAndGreeting();
            renderWeather();
            selectEngine(currentEngineKey);
            document.getElementById('theme-panel').classList.add('hidden');
        }

        function applyLanguage() {
            document.getElementById('page-title').innerText = cloudConfig.siteTitle || t('pageTitle');
            document.title = cloudConfig.siteTitle || t('pageTitle');
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                if (key === 'footerText' && cloudConfig.footerText) {
                    el.textContent = cloudConfig.footerText;
                } else {
                    el.innerHTML = t(key);
                }
            });
            document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.getAttribute('data-i18n-placeholder')); });
            renderDynamicSections();
            loadFriendLinks();
        }

        // 应用云端外观配置（站点标题、页脚、搜索引擎）
        function applySiteAppearance() {
            const title = cloudConfig.siteTitle || t('pageTitle');
            document.getElementById('page-title').innerText = title;
            document.title = title;
            if (cloudConfig.footerText) {
                const footerEl = document.querySelector('[data-i18n="footerText"]');
                if (footerEl) footerEl.textContent = cloudConfig.footerText;
            }
            renderEngineMenu();
            const list = getEngineList();
            // 写回云端状态：未配置引擎时 cloudConfig.engines 为 null，
            // 若不写回，后续保存任意配置都会把 null 提交导致「engines 格式无效」。
            cloudConfig.engines = list;
            if (!enginesDraft) {
                enginesDraft = JSON.parse(JSON.stringify(list));
                enginesDefaultId = (list[0] && list[0].id) || 'google';
                currentEngineKey = enginesDefaultId;
            }
            renderEnginesDraft();
            selectEngine(currentEngineKey);
            // 同步设置面板输入框
            const titleInput = document.getElementById('site-title-input');
            const footerInput = document.getElementById('footer-text-input');
            if (titleInput) titleInput.value = cloudConfig.siteTitle || '';
            if (footerInput) footerInput.value = cloudConfig.footerText || '';
        }

        // --- 2. 管理员鉴权与会话管理 ---
        function checkAdminSession() {
            const isAdmin = localStorage.getItem('nav_admin_auth') === 'true';
            if (isAdmin) {
                document.body.classList.add('is-admin');
                document.getElementById('admin-badge').classList.remove('hidden');
            } else {
                document.body.classList.remove('is-admin');
                document.getElementById('admin-badge').classList.add('hidden');
            }
        }

        async function triggerAdminLogin() {
            if (localStorage.getItem('nav_admin_auth') === 'true') {
                alert(currentLang === 'zh' ? "提示：您已处于后台管理模式。" : "Notice: You are already in admin mode.");
                return;
            }
            const pwd = prompt(t('pwdPrompt'));
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
                        alert(currentLang === 'zh'
                            ? '首次使用，请先设置一个自己的管理员密码（至少 8 位），否则无法保存配置。'
                            : 'First time use: please set your own admin password (at least 8 characters) before saving config.');
                    } else {
                        // 登录成功不再弹二次提示：管理员按钮/徽章出现即为进入管理态的反馈。
                        localStorage.removeItem('nav_must_change_pwd');
                    }
                } else {
                    alert(data.message || t('pwdFail'));
                }
            } catch (e) {
                console.error('登录失败', e);
                alert(currentLang === 'zh' ? '登录失败，无法连接服务器！' : 'Login failed. Server unavailable.');
            }
        }

        // 页脚统一入口：未登录时单击触发登录；已登录时单击确认后退出。
        // 用单一 click 语义替代原来的 dblclick，避免登录/退出入口不对称与双击重复触发。
        function handleAdminTrigger() {
            if (localStorage.getItem('nav_admin_auth') === 'true') {
                const ok = confirm(currentLang === 'zh'
                    ? '确定要退出后台管理吗？'
                    : 'Log out of admin mode?');
                if (ok) logoutAdmin(true);
                return;
            }
            triggerAdminLogin();
        }

        // silent=true 时不再弹成功提示（用于页脚已 confirm 的场景，避免二次提示）；
        // 默认保留提示（用于设置面板退出按钮与 401 被动退出，让用户知道会话已失效）。
        async function logoutAdmin(silent = false) {
            try {
                await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
            } catch (e) {
                console.warn('退出请求失败', e);
            }
            localStorage.removeItem('nav_admin_auth');
            if (!silent) alert(t('logoutMsg'));
            expandedDynamicSections = {};
            checkAdminSession();
            document.getElementById('theme-panel').classList.add('hidden');
        }

        async function updateAdminPwd() {
            const newPwd = document.getElementById('custom-pwd-input').value.trim();
            if (!newPwd) return;
            if (newPwd.length < 8) {
                alert(currentLang === 'zh' ? '新密码至少需要 8 位。' : 'New password must be at least 8 characters.');
                return;
            }
            const oldPwd = prompt(currentLang === 'zh' ? '请输入当前管理员密码：' : 'Enter current admin password:');
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
                document.getElementById('custom-pwd-input').value = '';
                document.getElementById('theme-panel').classList.add('hidden');
                localStorage.removeItem('nav_admin_auth');
                localStorage.removeItem('nav_must_change_pwd');
                checkAdminSession();
                alert(currentLang === 'zh'
                    ? '密码已设置，请双击页脚用新密码重新登录。'
                    : 'Password set. Please double-click the footer to log in again with the new password.');
            } catch (e) {
                console.error('修改密码失败', e);
                alert(currentLang === 'zh' ? '修改密码失败，无法连接服务器！' : 'Password update failed. Server unavailable.');
            }
        }

        // --- 3. 拖拽排序逻辑 ---
        function handleDragStart(e, type, secId, linkIdx = null) {
            e.stopPropagation();
            if (localStorage.getItem('nav_admin_auth') !== 'true') { e.preventDefault(); return; }
            dragType = type; dragSecId = secId; dragLinkIdx = linkIdx;
            e.dataTransfer.effectAllowed = 'move';
            const target = e.currentTarget;
            setTimeout(() => target.classList.add('dragging'), 0);
        }

        function handleDragEnd(e) {
            e.stopPropagation();
            e.currentTarget.classList.remove('dragging');
            document.querySelectorAll('.dynamic-section-card, .group').forEach(el => el.style.border = '');
        }

        function handleDragOver(e, type) {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
            return false;
        }

        function handleDrop(e, type, targetSecId, targetLinkIdx = null) {
            e.stopPropagation();
            e.preventDefault();
            if (localStorage.getItem('nav_admin_auth') !== 'true') return;

            let secs = cloudConfig.dynamicSections || [];

            if (dragType === 'section' && type === 'section') {
                if (dragSecId === targetSecId) return;
                const fromIdx = secs.findIndex(s => s.id === dragSecId);
                const toIdx = secs.findIndex(s => s.id === targetSecId);
                if (fromIdx > -1 && toIdx > -1) {
                    const [moved] = secs.splice(fromIdx, 1);
                    secs.splice(toIdx, 0, moved);
                }
            } else if (dragType === 'link' && type === 'link') {
                if (dragSecId === targetSecId && dragLinkIdx === targetLinkIdx) return;
                const fromSec = secs.find(s => s.id === dragSecId);
                const toSec = secs.find(s => s.id === targetSecId);
                if (fromSec && toSec) {
                    const [movedLink] = fromSec.links.splice(dragLinkIdx, 1);
                    toSec.links.splice(targetLinkIdx, 0, movedLink);
                }
            } else if (dragType === 'link' && type === 'section') {
                const fromSec = secs.find(s => s.id === dragSecId);
                const toSec = secs.find(s => s.id === targetSecId);
                if (fromSec && toSec && fromSec !== toSec) {
                    const [movedLink] = fromSec.links.splice(dragLinkIdx, 1);
                    toSec.links.push(movedLink);
                }
            }
            saveDynamicSections(secs);
        }

        // --- 4. 云端调度与预设初始化 ---
        async function initCloudData() {
            const savedTheme = localStorage.getItem('nav_theme_mode') || 'theme-dark';
            document.body.classList.remove('theme-light', 'theme-dark');
            document.body.classList.add(savedTheme);

            let savedBg = localStorage.getItem('nav_custom_wallpaper');
            let localSections = JSON.parse(localStorage.getItem('nav_dynamic_sections') || '[]');

            // 【关键更新】读取本地缓存的友情链接
            let localFriendLinks = JSON.parse(localStorage.getItem('nav_friend_links') || '[]');

            cloudConfig.dynamicSections = localSections;
            cloudConfig.friendLinks = localFriendLinks;

            try {
                const res = await fetch('/api/config');
                if (res.ok) {
                    const configData = await res.json();
                    if (configData) {
                        if (typeof configData.version === 'number') cloudConfig.version = configData.version;
                        if (configData.wallpaper !== undefined) {
                            if (configData.wallpaper === "") {
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
                            cloudConfig.dynamicSections = configData.dynamicSections;
                            localStorage.setItem('nav_dynamic_sections', JSON.stringify(cloudConfig.dynamicSections));
                        }
                        // 同步云端的友情链接
                        if (configData.friendLinks) {
                            cloudConfig.friendLinks = configData.friendLinks;
                            localStorage.setItem('nav_friend_links', JSON.stringify(cloudConfig.friendLinks));
                        }
                        // 同步站点外观配置
                        if (typeof configData.siteTitle === 'string') cloudConfig.siteTitle = configData.siteTitle;
                        if (typeof configData.footerText === 'string') cloudConfig.footerText = configData.footerText;
                        if (Array.isArray(configData.engines) && configData.engines.length) cloudConfig.engines = configData.engines;
                    }
                }
            } catch (e) {
                console.warn("未能连接云端 API，使用本地缓存", e);
            }

            if (!cloudConfig.dynamicSections || cloudConfig.dynamicSections.length === 0) {
                cloudConfig.dynamicSections = [
                    { id: "sec_rec", title: t('defRec'), links: [] },
                    { id: "sec_dev", title: t('defDev'), links: [] },
                    { id: "sec_custom", title: t('defCustom'), links: [] }
                ];
                localStorage.setItem('nav_dynamic_sections', JSON.stringify(cloudConfig.dynamicSections));
            }

            if (savedBg && !document.body.classList.contains('bg-cleared')) {
                applyWallpaperStyles(savedBg);
                document.getElementById('custom-bg-input').value = savedBg;
                document.getElementById('clear-bg-btn').classList.remove('hidden');
            } else {
                document.getElementById('starfield').style.opacity = '1';
            }
            renderDynamicSections();
            loadFriendLinks();
            applySiteAppearance();
        }

        // 保存状态机：idle / saving / saved / failed / unknown
        function setSaveState(state, message) {
            saveState = state;
            const el = document.getElementById('cloud-save-status');
            if (!el) return;
            clearTimeout(saveStatusTimer);
            el.classList.remove('hidden', 'text-slate-400', 'text-emerald-400', 'text-rose-400', 'text-amber-400');
            const colors = {
                saving: 'text-slate-400',
                saved: 'text-emerald-400',
                failed: 'text-rose-400',
                unknown: 'text-amber-400'
            };
            el.classList.add(colors[state] || 'text-slate-400');
            el.textContent = message || state;
            if (state === 'saved') {
                saveStatusTimer = setTimeout(() => el.classList.add('hidden'), 2500);
            }
        }

        // 通过 HttpOnly Cookie 会话保存配置，不再传递或存储明文 Token
        // 支持 (key, value) 单字段，也支持 (patchObject) 一次原子提交多字段
        // 串行队列执行：并发保存依次排队，不被布尔锁静默丢弃（根治「偶发无响应」）。
        async function updateCloudConfig(key, value) {
            const patch = (key && typeof key === 'object' && !Array.isArray(key))
                ? key
                : { [key]: value };

            // 把本次保存追加到队列尾部；无论前一个任务是 resolve 还是 reject 都继续执行。
            // 用 .catch(() => {}) 生成"干净"的下游队列，避免某个失败毒化整条链。
            const task = saveQueue.then(() => performSave(patch), () => performSave(patch));
            saveQueue = task.then(() => {}, () => {});
            return task;
        }

        // 真正执行一次保存；所有可能抛错的操作都在 try 内，finally 一定释放锁。
        async function performSave(patch) {
            saveInProgress = true;
            try {
                Object.assign(cloudConfig, patch);
                setSaveState('saving', currentLang === 'zh' ? '正在保存…' : 'Saving…');

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000);
                try {
                    // 只剔除 null/undefined（如未初始化的 engines），保留 '' 与 [] 的清空语义。
                    const body = {};
                    for (const [k, v] of Object.entries({ ...cloudConfig, version: cloudConfig.version || 0 })) {
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
                            setSaveState('failed', currentLang === 'zh' ? '会话已失效，请重新登录' : 'Session expired');
                            await logoutAdmin();
                        } else if (res.status === 409) {
                            setSaveState('failed', data.message || '配置可能已被其他设备更新，请刷新确认');
                            alert(data.message || '配置可能已被其他设备更新，请刷新确认');
                        } else {
                            setSaveState('failed', data.message || `保存失败 (${res.status})`);
                            alert(data.message || `保存失败：服务端异常 (${res.status})`);
                        }
                        return false;
                    }

                    if (typeof data.version === 'number') cloudConfig.version = data.version;
                    setSaveState('saved', currentLang === 'zh' ? '已保存' : 'Saved');
                    return true;
                } catch (e) {
                    console.error('云端同步失败', e);
                    const isTimeout = e.name === 'AbortError';
                    const msg = isTimeout
                        ? (currentLang === 'zh' ? '保存结果未知，请刷新确认' : 'Save result unknown, please refresh')
                        : (currentLang === 'zh' ? '网络异常，结果未知，请刷新确认' : 'Network error, result unknown');
                    setSaveState('unknown', msg);
                    alert(msg);
                    return false;
                } finally {
                    clearTimeout(timeoutId);
                }
            } finally {
                saveInProgress = false;
            }
        }

        function toggleThemeMenu(e) { e.stopPropagation(); document.getElementById('theme-panel').classList.toggle('hidden'); }
        function setBaseTheme(themeName) { document.body.classList.remove('theme-light', 'theme-dark'); document.body.classList.add(themeName); localStorage.setItem('nav_theme_mode', themeName); document.getElementById('theme-panel').classList.add('hidden'); }

        // 回到顶部：顶部标题区滚出视口时显示按钮，滚回可见时隐藏。
        // 用 IntersectionObserver 而非固定像素阈值，链接多少都能正确触发。
        function initBackToTop() {
            const btn = document.getElementById('back-to-top');
            const hero = document.getElementById('hero-header');
            if (!btn || !hero) return;
            const show = (visible) => btn.classList.toggle('is-visible', visible);
            if (typeof IntersectionObserver === 'undefined') {
                // 降级：老浏览器用滚动位置兜底
                const onScroll = () => show(window.scrollY > hero.offsetHeight);
                window.addEventListener('scroll', onScroll, { passive: true });
                onScroll();
                return;
            }
            const observer = new IntersectionObserver((entries) => {
                // hero 不再与视口相交（已滚出顶部）时显示回顶按钮
                show(!entries[0].isIntersecting && entries[0].boundingClientRect.bottom < 0);
            }, { threshold: 0 });
            observer.observe(hero);
        }
        function scrollToTop() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function applyWallpaperStyles(url) {
            document.body.style.backgroundImage = `url('${url}')`;
            document.body.style.backgroundPosition = 'center';
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundRepeat = 'no-repeat';
            document.body.style.backgroundAttachment = 'fixed';
            document.body.classList.add('has-custom-bg');
            document.getElementById('starfield').style.opacity = '0';
        }

        async function applyCustomBg() {
            const url = document.getElementById('custom-bg-input').value.trim();
            if (!url) return alert(t('validUrlMsg'));
            applyWallpaperStyles(url);
            localStorage.setItem('nav_custom_wallpaper', url);
            document.body.classList.remove('bg-cleared');
            document.getElementById('clear-bg-btn').classList.remove('hidden');
            document.getElementById('theme-panel').classList.add('hidden');
            await updateCloudConfig('wallpaper', url);
        }

        async function clearCustomBg() {
            document.body.style.backgroundImage = '';
            document.body.classList.remove('has-custom-bg');
            localStorage.removeItem('nav_custom_wallpaper');
            document.body.classList.add('bg-cleared');
            document.getElementById('custom-bg-input').value = '';
            document.getElementById('clear-bg-btn').classList.add('hidden');
            document.getElementById('theme-panel').classList.add('hidden');
            await updateCloudConfig('wallpaper', "");
            document.getElementById('starfield').style.opacity = '1';
        }

        // --- 5. 动态自定义区域管理 ---
        async function saveDynamicSections(sections) {
            localStorage.setItem('nav_dynamic_sections', JSON.stringify(sections));
            renderDynamicSections();
            await updateCloudConfig('dynamicSections', sections);
        }

        function addCustomSection() {
            const title = prompt(t('promptSectionName'));
            if (!title || title.trim() === '') return;
            let secs = cloudConfig.dynamicSections || [];
            secs.push({ id: "sec_" + Date.now().toString(), title: title.trim(), links: [] });
            saveDynamicSections(secs);
        }

        function renameCustomSection(id) {
            let secs = cloudConfig.dynamicSections || [];
            const sec = secs.find(s => s.id === id);
            if (!sec) return;
            const newTitle = prompt(t('renameSectionPrompt'), sec.title);
            if (!newTitle || newTitle.trim() === '' || newTitle === sec.title) return;
            sec.title = newTitle.trim();
            saveDynamicSections(secs);
        }

        function deleteCustomSection(id) {
            if (!confirm(t('delSectionConfirm'))) return;
            let secs = cloudConfig.dynamicSections || [];
            secs = secs.filter(s => s.id !== id);
            saveDynamicSections(secs);
        }

        function renderDynamicSections() {
            document.querySelectorAll('.dynamic-section-card').forEach(el => el.remove());
            const grid = document.getElementById('main-nav-grid');
            const addBtnCard = document.getElementById('add-section-card');
            let secs = cloudConfig.dynamicSections || [];

            secs.forEach((sec) => {
                const linkCount = sec.links.length;
                let gridCols = 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3';

                // 【关键更新】已移除 >10 就折叠的限制逻辑，永远完全平铺展示
                let visibleLinks = sec.links;

                const card = document.createElement('div');
                card.className = "dynamic-section-card glass-card rounded-2xl p-6 shadow-xl hover:border-indigo-500/30 transition-all duration-300 relative w-full";
                card.id = `section-${sec.id}`;
                card.draggable = true;
                card.ondragstart = (e) => handleDragStart(e, 'section', sec.id);
                card.ondragend = handleDragEnd;
                card.ondragover = (e) => handleDragOver(e, 'section');
                card.ondrop = (e) => handleDrop(e, 'section', sec.id);

                let linksHtml = '';
                if (linkCount === 0) {
                    linksHtml = `<div class="empty-hint col-span-full text-center text-xs text-slate-400/60 py-4">${t('noCloudLinks')}</div>`;
                } else {
                    const pClass = 'p-3';
                    const spaceXClass = 'space-x-2.5';
                    const iconSizeClass = 'w-5 h-5 text-[10px]';
                    const imgSizeClass = 'w-5 h-5';
                    const textSizeClass = 'text-sm';
                    const dragMrClass = 'mr-2.5';
                    const btnClass = 'right-2 text-xs p-1';

                    visibleLinks.forEach((link, idx) => {
                        const displayName = link.name;
                        const letterHtml = `<div class="link-letter ${iconSizeClass} rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0">${displayName.charAt(0).toUpperCase()}</div>`;
                        let iconHtml = letterHtml;

                        try {
                            if (link.url) {
                                const hostname = new URL(link.url).hostname;
                                iconHtml = `
                                    <img src="https://unavatar.io/duckduckgo/${hostname}" draggable="false" class="${imgSizeClass} rounded object-contain shrink-0" alt="icon" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                                    <div style="display:none;" class="link-letter ${iconSizeClass} rounded-full bg-indigo-500/20 text-indigo-400 items-center justify-center font-bold shrink-0">${displayName.charAt(0).toUpperCase()}</div>
                                `;
                            }
                        } catch (e) {}

                        linksHtml += `
                        <div class="link-card group relative flex items-center justify-between ${pClass} bg-slate-500/5 border border-slate-500/10 rounded-xl hover:bg-indigo-600/10 transition-all"
                             draggable="true"
                             ondragstart="handleDragStart(event, 'link', '${sec.id}', ${idx})"
                             ondragend="handleDragEnd(event)"
                             ondragover="handleDragOver(event, 'link')"
                             ondrop="handleDrop(event, 'link', '${sec.id}', ${idx})">
                            <div class="flex items-center w-full overflow-hidden">
                                <i class="fas fa-grip-vertical text-slate-500 opacity-0 group-hover:opacity-50 transition-opacity ${dragMrClass} cursor-move admin-only text-[10px] shrink-0"></i>
                                <a href="${link.url}" draggable="false" target="_blank" rel="noopener noreferrer" title="${displayName}" class="link-title flex items-center ${spaceXClass} w-full pr-1">
                                    ${iconHtml} <span class="section-link-label ${textSizeClass} font-medium truncate">${displayName}</span>
                                </a>
                            </div>
                            <div class="admin-only link-actions absolute right-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <button type="button" onclick="openEditLinkModal('section', '${sec.id}', ${idx})" class="text-xs p-1 text-slate-400 hover:text-sky-400 bg-slate-500/20 rounded cursor-pointer" title="编辑"><i class="fas fa-pen"></i></button>
                                <button type="button" onclick="deleteSectionLink(event, '${sec.id}', ${idx})" class="text-xs p-1 text-slate-400 hover:text-red-400 bg-slate-500/20 rounded cursor-pointer" title="删除"><i class="fas fa-trash-alt"></i></button>
                            </div>
                        </div>`;
                    });
                }

                card.innerHTML = `
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold text-indigo-400 flex items-center cursor-move" title="长按拖拽排序" style="cursor: grab;">
                            <i class="fas fa-grip-vertical mr-2 text-slate-500 opacity-60 admin-only text-sm"></i>
                            <i class="fas fa-layer-group mr-2.5"></i> <span>${sec.title}</span>
                        </h3>
                        <div class="flex gap-1.5 shrink-0 ml-2">
                            <button type="button" onclick="openLinkModal('section_${sec.id}')" class="admin-only text-[10px] px-2 py-1 bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-md hover:bg-indigo-600/40 transition-colors cursor-pointer z-[50]">${t('addCloud')}</button>
                            <button type="button" onclick="renameCustomSection('${sec.id}')" class="admin-only text-[10px] px-2 py-1 bg-sky-600/20 text-sky-400 border border-sky-500/20 rounded-md hover:bg-sky-600/40 transition-colors cursor-pointer z-[50]"><i class="fas fa-pen"></i></button>
                            <button type="button" onclick="deleteCustomSection('${sec.id}')" class="admin-only text-[10px] px-2 py-1 bg-red-600/20 text-red-400 border border-red-500/20 rounded-md hover:bg-red-600/40 transition-colors cursor-pointer z-[50]"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                    <div class="grid ${gridCols}" style="min-height: 40px;" ondragover="handleDragOver(event, 'section')" ondrop="handleDrop(event, 'section', '${sec.id}')">
                        ${linksHtml}
                    </div>
                `;
                grid.insertBefore(card, addBtnCard);
            });
            checkAdminSession();
        }

        function deleteSectionLink(e, secId, linkIdx) {
            e.preventDefault();
            e.stopPropagation();
            let secs = cloudConfig.dynamicSections || [];
            const sec = secs.find(s => s.id === secId);
            if (sec) {
                sec.links.splice(linkIdx, 1);
                saveDynamicSections(secs);
            }
        }

        // --- 6. 智能时间与问候语 ---
        const sTermNames = ["小寒", "大寒", "立春", "雨水", "惊蛰", "春分", "清明", "谷雨", "立夏", "小满", "芒种", "夏至", "小暑", "大暑", "立秋", "处暑", "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至"];
        const sTermInfo = [0, 21208, 42467, 63836, 85337, 107014, 128867, 150921, 173149, 195551, 218072, 240693, 263343, 285989, 308563, 331033, 353350, 375494, 397447, 419210, 440795, 462224, 483532, 504758];

        function getSolarTerm(y, m, d) {
            const baseDate = new Date(1900, 0, 6, 2, 5, 0);
            const termDate = new Date((31556925974.7 * (y - 1900) + sTermInfo[(m * 2)]) + baseDate.getTime());
            if (termDate.getMonth() == m && termDate.getDate() == d) return sTermNames[m * 2];
            const termDate2 = new Date((31556925974.7 * (y - 1900) + sTermInfo[(m * 2 + 1)]) + baseDate.getTime());
            if (termDate2.getMonth() == m && termDate2.getDate() == d) return sTermNames[m * 2 + 1];
            return null;
        }

        function updateClockAndGreeting() {
            const now = new Date();
            const y = now.getFullYear(), m = now.getMonth(), d = now.getDate(), h = now.getHours();

            document.getElementById('clock').innerText = `${String(h).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

            let greetStr = "";
            if (currentLang === 'zh') {
                const term = getSolarTerm(y, m, d);
                const md = `${String(m+1).padStart(2, '0')}${String(d).padStart(2, '0')}`;
                const fests = { "0101": "元旦快乐", "0308": "妇女节快乐", "0501": "五一劳动节", "0601": "儿童节快乐", "1001": "国庆节快乐", "1225": "圣诞节" };
                const fest = fests[md] || null;

                if (fest) {
                    greetStr = `🎉 今天是 ${fest}，祝你开心！`;
                } else if (term) {
                    greetStr = `🍃 今日节气 · 【${term}】，顺应四时，平安喜乐。`;
                } else {
                    if (h >= 0 && h < 5) greetStr = "🌙 夜深了，静谧的星空在守护你，早点休息哦";
                    else if (h >= 5 && h < 8) greetStr = "🌅 清晨的朝阳刚刚升起，新的一天充满希望";
                    else if (h >= 8 && h < 11.5) greetStr = "☀️ 早上好，专注当下，今天也要元气满满";
                    else if (h >= 11.5 && h < 13.5) greetStr = "🍲 中午好，记得按时吃饭，歇息一下双眼";
                    else if (h >= 13.5 && h < 17.5) greetStr = "☕ 下午好，来杯清茶或咖啡，继续保持高效";
                    else if (h >= 17.5 && h < 19.5) greetStr = "🌇 傍晚好，落日余晖很美，放下疲惫准备享受夜晚吧";
                    else greetStr = "✨ 晚上好，属于自己的惬意时光，好好犒劳一下自己";
                }
            } else {
                if (h >= 0 && h < 5) greetStr = "🌙 Late night, the stars are watching over you. Sleep early.";
                else if (h >= 5 && h < 8) greetStr = "🌅 The morning sun is rising, a new day full of hope.";
                else if (h >= 8 && h < 11.5) greetStr = "☀️ Good morning! Stay focused and full of energy.";
                else if (h >= 11.5 && h < 13.5) greetStr = "🍲 Good noon! Remember to eat on time and rest your eyes.";
                else if (h >= 13.5 && h < 17.5) greetStr = "☕ Good afternoon! Grab a tea or coffee and keep it up.";
                else if (h >= 17.5 && h < 19.5) greetStr = "🌇 Good evening! The sunset is beautiful. Relax and enjoy.";
                else greetStr = "✨ Good night! Enjoy your cozy time and treat yourself well.";
            }
            document.getElementById('greeting').innerText = greetStr;
        }
        setInterval(updateClockAndGreeting, 1000);

        // --- 7. 天气系统 ---
        let weatherState = { city: "Earth", temp: 26, code: 0, fetched: false };

        async function fetchWeather() {
            try {
                const ipRes = await fetch('https://ipapi.co/json/');
                if (!ipRes.ok) throw new Error("Location API rate limited or failed.");

                const ipData = await ipRes.json();
                const { latitude, longitude, city } = ipData;
                if (!latitude || !longitude) throw new Error("Missing coordinates.");

                const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
                if (!weatherRes.ok) throw new Error("Weather API failed.");

                const weatherData = await weatherRes.json();
                weatherState = {
                    city: city || "Earth",
                    temp: Math.round(weatherData.current_weather.temperature),
                    code: weatherData.current_weather.weathercode,
                    fetched: true
                };
            } catch (e) {
                console.warn("Weather fetching gracefully degraded:", e.message);
                weatherState.fetched = false;
            }
            renderWeather();
        }

        function renderWeather() {
            const el = document.getElementById('weather-info');
            if (!weatherState.fetched) {
                el.innerHTML = `<i class="fas fa-cloud text-slate-400"></i> <span>${t('weatherDefault')}</span>`;
                return;
            }

            let displayCity = weatherState.city;
            if (currentLang === 'zh') {
                const cityMap = { "Singapore": "新加坡", "Santa Clara": "圣克拉拉", "San Jose": "圣何塞", "Beijing": "北京", "Shanghai": "上海", "Shenzhen": "深圳", "Guangzhou": "广州", "Hangzhou": "杭州", "Chengdu": "成都", "Hong Kong": "香港" };
                displayCity = cityMap[displayCity] || displayCity;
                displayCity = displayCity.replace(/Province|City/gi, "").trim();
            }

            const code = weatherState.code;
            let icon = 'fa-cloud';
            let descKey = 'weatherCloudy';

            if (code === 0) { icon = 'fa-sun text-amber-500'; descKey = 'weatherClear'; }
            else if ([1, 2, 3].includes(code)) { icon = 'fa-cloud-sun text-indigo-300'; descKey = 'weatherCloudy'; }
            else if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) { icon = 'fa-cloud-showers-heavy text-sky-400'; descKey = 'weatherRain'; }
            else if ([71, 73, 75, 77, 85, 86].includes(code)) { icon = 'fa-snowflake text-blue-200'; descKey = 'weatherSnow'; }
            else if ([95, 96, 99].includes(code)) { icon = 'fa-bolt text-yellow-500'; descKey = 'weatherThunder'; }

            el.innerHTML = `<i class="fas ${icon}"></i> <span>${displayCity} · ${t(descKey)} ${weatherState.temp}°C</span>`;
        }

        // --- 8. 搜索引擎系统 ---
        // 默认引擎（云端未配置 engines 时兜底）；url 为含 {q} 的模板。
        const DEFAULT_ENGINES = [
            { id: 'google', name: 'Google', url: 'https://www.google.com/search?q={q}', icon: 'fab fa-google text-blue-400' },
            { id: 'bing', name: 'Bing', url: 'https://cn.bing.com/search?q={q}', icon: 'fab fa-microsoft text-teal-400' },
            { id: 'baidu', name: '百度', url: 'https://www.baidu.com/s?wd={q}', icon: 'fas fa-paw text-red-400' },
            { id: 'github', name: 'GitHub', url: 'https://github.com/search?q={q}', icon: 'fab fa-github text-slate-400' }
        ];
        const engines = Object.fromEntries(DEFAULT_ENGINES.map(e => [e.id, e]));

        function getEngineList() {
            return Array.isArray(cloudConfig.engines) && cloudConfig.engines.length
                ? cloudConfig.engines
                : DEFAULT_ENGINES;
        }

        function toggleEngineMenu(e) { e.stopPropagation(); document.getElementById('engine-menu').classList.toggle('hidden'); }

        function renderEngineMenu() {
            const menu = document.getElementById('engine-menu');
            if (!menu) return;
            menu.innerHTML = getEngineList().map(e =>
                `<button type="button" onclick="selectEngine('${e.id}')" class="w-full text-left px-4 py-2.5 hover:bg-indigo-600/20 text-sm flex items-center space-x-2 cursor-pointer"><i class="${e.icon || 'fas fa-globe text-slate-400'}"></i> <span>${e.name}</span></button>`
            ).join('');
        }

        function currentEngine() {
            const list = getEngineList();
            return list.find(e => e.id === currentEngineKey) || list[0] || DEFAULT_ENGINES[0];
        }

        function selectEngine(key) {
            const list = getEngineList();
            const engine = list.find(e => e.id === key) || list[0];
            if (!engine) return;
            currentEngineKey = engine.id;
            const input = document.getElementById('search-input');
            const icon = document.getElementById('engine-icon');

            // 占位文案用引擎名；实际提交由 handleSearchSubmit 用 URL 模板构造
            input.placeholder = (currentLang === 'zh' ? '在 ' : 'Search in ') + engine.name + (currentLang === 'zh' ? ' 中搜索...' : '...');
            icon.className = engine.icon || 'fas fa-globe text-slate-400';
            document.getElementById('engine-menu').classList.add('hidden');
        }

        // 拦截搜索提交，用模板替换 {q} 后跳转，完整保留自定义模板中的额外参数
        function handleSearchSubmit(event) {
            event.preventDefault();
            const term = document.getElementById('search-input').value.trim();
            if (!term) return;
            const template = currentEngine().url || DEFAULT_ENGINES[0].url;
            const target = template.replace('{q}', encodeURIComponent(term));
            window.open(target, '_blank', 'noopener,noreferrer');
        }

        // --- 8.1 站点设置（仅管理员） ---
        function renderEnginesDraft() {
            const list = document.getElementById('engines-list');
            if (!list) return;
            list.innerHTML = (enginesDraft || []).map((e, i) => `
                <div class="engine-row border border-slate-700 rounded-lg p-2 space-y-1.5" data-idx="${i}">
                    <div class="flex gap-1.5">
                        <input type="text" class="engine-name w-1/3 bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-100" value="${e.name.replace(/"/g, '&quot;')}" placeholder="名称">
                        <input type="text" class="engine-url flex-1 bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-100" value="${e.url.replace(/"/g, '&quot;')}" placeholder="https://...q={q}">
                        <button type="button" onclick="removeEngine(${i})" class="text-red-400 hover:text-red-300 px-1 cursor-pointer" title="删除">×</button>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <input type="text" class="engine-icon flex-1 bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-[10px] text-slate-100" value="${(e.icon || '').replace(/"/g, '&quot;')}" placeholder="图标 class（可选）">
                        <button type="button" onclick="setDefaultEngine(${i})" class="text-[10px] px-1.5 py-1 rounded ${e.id === enginesDefaultId ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'} cursor-pointer">${e.id === enginesDefaultId ? '默认' : '设为默认'}</button>
                    </div>
                </div>`).join('');
        }

        function syncEnginesDraftFromInputs() {
            document.querySelectorAll('#engines-list .engine-row').forEach(row => {
                const i = Number(row.getAttribute('data-idx'));
                if (!enginesDraft[i]) return;
                enginesDraft[i].name = row.querySelector('.engine-name').value.trim();
                enginesDraft[i].url = row.querySelector('.engine-url').value.trim();
                enginesDraft[i].icon = row.querySelector('.engine-icon').value.trim();
            });
        }

        function setDefaultEngine(idx) {
            syncEnginesDraftFromInputs();
            if (enginesDraft[idx]) enginesDefaultId = enginesDraft[idx].id;
            renderEnginesDraft();
        }

        function addEngine() {
            syncEnginesDraftFromInputs();
            let id = 'engine' + Date.now().toString(36);
            enginesDraft.push({ id, name: '新引擎', url: 'https://example.com/search?q={q}', icon: '' });
            renderEnginesDraft();
        }

        function removeEngine(idx) {
            syncEnginesDraftFromInputs();
            enginesDraft.splice(idx, 1);
            if (!enginesDraft.length) enginesDraft = JSON.parse(JSON.stringify(DEFAULT_ENGINES));
            if (!enginesDraft.some(e => e.id === enginesDefaultId)) enginesDefaultId = enginesDraft[0].id;
            renderEnginesDraft();
        }

        function resetEngines() {
            enginesDraft = JSON.parse(JSON.stringify(DEFAULT_ENGINES));
            enginesDefaultId = DEFAULT_ENGINES[0].id;
            renderEnginesDraft();
        }

        async function applySiteSettings() {
            const title = (document.getElementById('site-title-input')?.value || '').trim();
            const footer = (document.getElementById('footer-text-input')?.value || '').trim();
            syncEnginesDraftFromInputs();
            const valid = enginesDraft.every(e => e.name && e.url.includes('{q}') && /^https?:\/\//i.test(e.url));
            if (!valid) {
                return alert(currentLang === 'zh' ? '每个引擎都需要名称和含 {q} 的 http(s) 网址。' : 'Each engine needs a name and an http(s) URL containing {q}.');
            }
            const ordered = [...enginesDraft].sort((a, b) => (a.id === enginesDefaultId ? -1 : b.id === enginesDefaultId ? 1 : 0));
            const ok = await updateCloudConfig({ engines: ordered, siteTitle: title, footerText: footer });
            if (ok === false) return;
            currentEngineKey = enginesDefaultId;
            applySiteAppearance();
            alert(currentLang === 'zh' ? '站点设置已保存。' : 'Site settings saved.');
        }

        // --- 9. 弹窗与链接保存 ---
        function openLinkModal(target) {
            currentModalTarget = target;
            editingTarget = null;
            const textEl = document.getElementById('modal-title-text');

            if (target === 'friend') {
                textEl.innerText = t('modalAddFriend');
            } else if (target.startsWith('section_')) {
                textEl.innerText = t('modalAddSection');
            }
            const saveBtn = document.getElementById('modal-save-btn');
            saveBtn.setAttribute('data-i18n', 'btnSave');
            saveBtn.innerText = t('btnSave');
            toggleModal(true);
        }

        // 编辑分区链接或友链：预填当前值，保存时走替换而非新增。
        function openEditLinkModal(type, secId, idx) {
            let link;
            if (type === 'friend') {
                currentModalTarget = 'friend';
                link = (cloudConfig.friendLinks || [])[idx];
            } else {
                currentModalTarget = `section_${secId}`;
                const sec = (cloudConfig.dynamicSections || []).find(s => s.id === secId);
                link = sec && sec.links[idx];
            }
            if (!link) return;
            editingTarget = { type, secId, idx };
            document.getElementById('modal-title-text').innerText = t('modalEdit');
            const saveBtn = document.getElementById('modal-save-btn');
            saveBtn.setAttribute('data-i18n', 'btnSaveEdit');
            saveBtn.innerText = t('btnSaveEdit');
            toggleModal(true, link.name, link.url);
        }

        function toggleModal(show, prefillName = '', prefillUrl = '') {
            const modal = document.getElementById('modal');
            if (show) {
                document.getElementById('site-name').value = prefillName;
                document.getElementById('site-url').value = prefillUrl;
                modal.classList.remove('hidden');
                setTimeout(() => document.getElementById('site-name')?.focus(), 50);
            } else {
                modal.classList.add('hidden');
                editingTarget = null;
            }
        }

        function closeModalOnBlank(e) {
            if (e.target.id === 'modal') toggleModal(false);
        }

        function normalizeURL(value) {
            let url = String(value || '').trim();
            if (!url) return null;
            if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
            try {
                const parsed = new URL(url);
                if (!['http:', 'https:'].includes(parsed.protocol)) return null;
                return parsed.href;
            } catch (error) {
                return null;
            }
        }

        async function saveActiveLink() {
            const name = document.getElementById('site-name').value.trim();
            const url = normalizeURL(document.getElementById('site-url').value);

            if (!name || !url) {
                return alert(currentLang === 'zh' ? '请完整填写有效的名称和网址！' : 'Please enter a valid name and URL!');
            }

            const edit = editingTarget;
            // 保存友情链接时，更新云端状态池并同步（新增 push / 编辑 splice 替换）
            if (currentModalTarget === 'friend') {
                let links = cloudConfig.friendLinks || [];
                if (edit && edit.type === 'friend') {
                    links.splice(edit.idx, 1, { name, url });
                } else {
                    links.push({ name, url });
                }
                cloudConfig.friendLinks = links;
                localStorage.setItem('nav_friend_links', JSON.stringify(links));
                loadFriendLinks();
                await updateCloudConfig('friendLinks', links);
            } else if (currentModalTarget.startsWith('section_')) {
                const secId = currentModalTarget.replace('section_', '');
                let secs = cloudConfig.dynamicSections || [];
                const sec = secs.find(s => s.id === secId);
                if (sec) {
                    if (edit && edit.type === 'section') {
                        sec.links.splice(edit.idx, 1, { name, url });
                    } else {
                        sec.links.push({ name, url });
                    }
                    await saveDynamicSections(secs);
                }
            }
            toggleModal(false);
        }

        // 【关键更新】渲染友情链接时优先使用云端状态池的数据
        function loadFriendLinks() {
            const container = document.getElementById('friend-links-container');
            let links = cloudConfig.friendLinks || [];
            container.innerHTML = '';

            if (links.length === 0) {
                container.innerHTML = `<div class="empty-hint col-span-full text-center text-xs text-slate-400/60 py-4">${t('noCloudLinks')}</div>`;
                return;
            }

            links.forEach((item, index) => {
                container.innerHTML += `
                    <div class="link-card group relative flex items-center justify-between p-2.5 bg-slate-500/5 border border-slate-500/10 rounded-xl hover:bg-emerald-600/10 transition-all text-center">
                        <a href="${item.url}" draggable="false" target="_blank" rel="noopener noreferrer" title="${item.name}" class="link-title friend-link-label w-full text-xs font-medium text-slate-400 hover:text-emerald-400 transition-colors truncate px-2">${item.name}</a>
                        <div class="admin-only link-actions absolute right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button type="button" onclick="openEditLinkModal('friend', null, ${index})" class="text-[10px] text-slate-400 hover:text-sky-400 bg-slate-500/10 px-1 rounded cursor-pointer" title="编辑"><i class="fas fa-pen"></i></button>
                            <button type="button" onclick="deleteFriendLink(event, ${index})" class="text-[10px] text-slate-500 hover:text-red-400 bg-slate-500/10 px-1 rounded cursor-pointer" title="删除"><i class="fas fa-times"></i></button>
                        </div>
                    </div>`;
            });
        }

        // 【关键更新】删除友情链接时，更新云端状态池并同步
        async function deleteFriendLink(e, index) {
            e.preventDefault(); e.stopPropagation();
            let links = cloudConfig.friendLinks || [];
            if (links.length > 0) {
                links.splice(index, 1);
                cloudConfig.friendLinks = links;
                localStorage.setItem('nav_friend_links', JSON.stringify(links));
                loadFriendLinks();
                await updateCloudConfig('friendLinks', links);
            }
        }

export {
    cloudConfig,
    currentLang,
    i18n,
    saveState,
    saveInProgress,
    saveStatusTimer,
    weatherState,
    engines,
    sTermInfo,
    sTermNames,
    expandedDynamicSections,
    currentModalTarget,
    currentEngineKey,
    dragType,
    dragSecId,
    dragLinkIdx,
    initStarfield,
    t,
    setLanguage,
    applyLanguage,
    checkAdminSession,
    triggerAdminLogin,
    handleAdminTrigger,
    logoutAdmin,
    updateAdminPwd,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop,
    initCloudData,
    setSaveState,
    updateCloudConfig,
    toggleThemeMenu,
    setBaseTheme,
    applyWallpaperStyles,
    applyCustomBg,
    clearCustomBg,
    saveDynamicSections,
    addCustomSection,
    renameCustomSection,
    deleteCustomSection,
    renderDynamicSections,
    deleteSectionLink,
    getSolarTerm,
    updateClockAndGreeting,
    fetchWeather,
    renderWeather,
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
    normalizeURL,
    saveActiveLink,
    loadFriendLinks,
    deleteFriendLink,
    initBackToTop,
    scrollToTop
};
