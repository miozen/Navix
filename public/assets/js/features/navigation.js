import { state } from '../core/state.js';
import { escapeHtml, normalizeURL, DEFAULT_ENGINES, getEngineList } from '../core/utils.js';
import { t } from '../core/i18n.js';
import { updateCloudConfig } from '../core/api.js';
import { checkAdminSession } from './admin.js';

export { normalizeURL };

// --- 拖拽排序逻辑 ---
export function handleDragStart(e, type, secId, linkIdx = null) {
    e.stopPropagation();
    if (localStorage.getItem('nav_admin_auth') !== 'true') { e.preventDefault(); return; }
    state.dragType = type;
    state.dragSecId = secId;
    state.dragLinkIdx = linkIdx;
    e.dataTransfer.effectAllowed = 'move';
    const target = e.currentTarget;
    setTimeout(() => target.classList.add('dragging'), 0);
}

export function handleDragEnd(e) {
    e.stopPropagation();
    e.currentTarget.classList.remove('dragging');
    document.querySelectorAll('.dynamic-section-card, .group').forEach((el) => { el.style.border = ''; });
}

export function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    return false;
}

export function handleDrop(e, type, targetSecId, targetLinkIdx = null) {
    e.stopPropagation();
    e.preventDefault();
    if (localStorage.getItem('nav_admin_auth') !== 'true') return;

    const secs = state.cloudConfig.dynamicSections || [];

    if (state.dragType === 'section' && type === 'section') {
        if (state.dragSecId === targetSecId) return;
        const fromIdx = secs.findIndex((s) => s.id === state.dragSecId);
        const toIdx = secs.findIndex((s) => s.id === targetSecId);
        if (fromIdx > -1 && toIdx > -1) {
            const [moved] = secs.splice(fromIdx, 1);
            secs.splice(toIdx, 0, moved);
        }
    } else if (state.dragType === 'link' && type === 'link') {
        if (state.dragSecId === targetSecId && state.dragLinkIdx === targetLinkIdx) return;
        const fromSec = secs.find((s) => s.id === state.dragSecId);
        const toSec = secs.find((s) => s.id === targetSecId);
        if (fromSec && toSec) {
            const [movedLink] = fromSec.links.splice(state.dragLinkIdx, 1);
            toSec.links.splice(targetLinkIdx, 0, movedLink);
        }
    } else if (state.dragType === 'link' && type === 'section') {
        const fromSec = secs.find((s) => s.id === state.dragSecId);
        const toSec = secs.find((s) => s.id === targetSecId);
        if (fromSec && toSec && fromSec !== toSec) {
            const [movedLink] = fromSec.links.splice(state.dragLinkIdx, 1);
            toSec.links.push(movedLink);
        }
    }
    saveDynamicSections(secs);
}

// --- 动态自定义区域管理 ---
export async function saveDynamicSections(sections) {
    localStorage.setItem('nav_dynamic_sections', JSON.stringify(sections));
    renderDynamicSections();
    return await updateCloudConfig('dynamicSections', sections);
}

export function addCustomSection() {
    const title = prompt(t('promptSectionName'));
    if (!title || title.trim() === '') return;
    const secs = state.cloudConfig.dynamicSections || [];
    secs.push({ id: 'sec_' + Date.now().toString(), title: title.trim(), links: [] });
    saveDynamicSections(secs);
}

export function renameCustomSection(id) {
    const secs = state.cloudConfig.dynamicSections || [];
    const sec = secs.find((s) => s.id === id);
    if (!sec) return;
    const newTitle = prompt(t('renameSectionPrompt'), sec.title);
    if (!newTitle || newTitle.trim() === '' || newTitle === sec.title) return;
    sec.title = newTitle.trim();
    saveDynamicSections(secs);
}

export function deleteCustomSection(id) {
    if (!confirm(t('delSectionConfirm'))) return;
    let secs = state.cloudConfig.dynamicSections || [];
    secs = secs.filter((s) => s.id !== id);
    state.cloudConfig.dynamicSections = secs;
    saveDynamicSections(secs);
}

export function renderDynamicSections() {
    document.querySelectorAll('.dynamic-section-card').forEach((el) => el.remove());
    const grid = document.getElementById('main-nav-grid');
    const addBtnCard = document.getElementById('add-section-card');
    if (!grid || !addBtnCard) return;
    const secs = state.cloudConfig.dynamicSections || [];

    secs.forEach((sec) => {
        const linkCount = sec.links.length;
        const gridCols = 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3';
        const visibleLinks = sec.links;

        const card = document.createElement('div');
        card.className = 'dynamic-section-card glass-card rounded-2xl p-6 shadow-xl hover:border-indigo-500/30 transition-all duration-300 relative w-full';
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

            visibleLinks.forEach((link, idx) => {
                const displayName = link.name;
                const safeName = escapeHtml(displayName);
                const safeUrl = escapeHtml(link.url);
                const firstChar = escapeHtml((displayName.charAt(0) || '?').toUpperCase());
                const letterHtml = `<div class="link-letter ${iconSizeClass} rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0">${firstChar}</div>`;
                let iconHtml = letterHtml;

                try {
                    if (link.url) {
                        const hostname = new URL(link.url).hostname;
                        iconHtml = `
                            <img src="https://unavatar.io/duckduckgo/${encodeURIComponent(hostname)}" loading="lazy" draggable="false" class="${imgSizeClass} rounded object-contain shrink-0" alt="icon" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                            <div style="display:none;" class="link-letter ${iconSizeClass} rounded-full bg-indigo-500/20 text-indigo-400 items-center justify-center font-bold shrink-0">${firstChar}</div>
                        `;
                    }
                } catch {}

                linksHtml += `
                <div class="link-card group relative flex items-center justify-between ${pClass} bg-slate-500/5 border border-slate-500/10 rounded-xl hover:bg-indigo-600/10 transition-all"
                     draggable="true"
                     ondragstart="handleDragStart(event, 'link', '${sec.id}', ${idx})"
                     ondragend="handleDragEnd(event)"
                     ondragover="handleDragOver(event, 'link')"
                     ondrop="handleDrop(event, 'link', '${sec.id}', ${idx})">
                    <div class="flex items-center w-full overflow-hidden">
                        <i class="fas fa-grip-vertical text-slate-500 opacity-0 group-hover:opacity-50 transition-opacity ${dragMrClass} cursor-move admin-only text-[10px] shrink-0"></i>
                        <a href="${safeUrl}" draggable="false" target="_blank" rel="noopener noreferrer" title="${safeName}" class="link-title flex items-center ${spaceXClass} w-full pr-1">
                            ${iconHtml} <span class="section-link-label ${textSizeClass} font-medium truncate">${safeName}</span>
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
                    <i class="fas fa-layer-group mr-2.5"></i> <span>${escapeHtml(sec.title)}</span>
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

export async function deleteSectionLink(e, secId, linkIdx) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(t('delConfirm'))) return;
    const secs = state.cloudConfig.dynamicSections || [];
    const sec = secs.find((s) => s.id === secId);
    if (sec) {
        const prevSecs = JSON.stringify(secs);
        sec.links.splice(linkIdx, 1);
        const ok = await saveDynamicSections(secs);
        if (ok === false) {
            state.cloudConfig.dynamicSections = JSON.parse(prevSecs);
            localStorage.setItem('nav_dynamic_sections', prevSecs);
            renderDynamicSections();
        }
    }
}

// --- 搜索引擎与站点设置 ---
export function toggleEngineMenu(e) {
    e.stopPropagation();
    document.getElementById('engine-menu')?.classList.toggle('hidden');
}

function renderEngineMenu() {
    const menu = document.getElementById('engine-menu');
    if (!menu) return;
    menu.innerHTML = getEngineList(state.cloudConfig).map((e) =>
        `<button type="button" onclick="selectEngine('${escapeHtml(e.id)}')" class="w-full text-left px-4 py-2.5 hover:bg-indigo-600/20 text-sm flex items-center space-x-2 cursor-pointer"><i class="${escapeHtml(e.icon) || 'fas fa-globe text-slate-400'}"></i> <span>${escapeHtml(e.name)}</span></button>`
    ).join('');
}

export function currentEngine() {
    const list = getEngineList(state.cloudConfig);
    return list.find((e) => e.id === state.currentEngineKey) || list[0] || DEFAULT_ENGINES[0];
}

export function selectEngine(key) {
    const list = getEngineList(state.cloudConfig);
    const engine = list.find((e) => e.id === key) || list[0];
    if (!engine) return;
    state.currentEngineKey = engine.id;
    const input = document.getElementById('search-input');
    const icon = document.getElementById('engine-icon');

    if (input) {
        input.placeholder = (state.currentLang === 'zh' ? '在 ' : 'Search in ') + engine.name + (state.currentLang === 'zh' ? ' 中搜索...' : '...');
    }
    if (icon) {
        icon.className = engine.icon || 'fas fa-globe text-slate-400';
    }
    document.getElementById('engine-menu')?.classList.add('hidden');
}

export function handleSearchSubmit(event) {
    event.preventDefault();
    const term = document.getElementById('search-input')?.value.trim();
    if (!term) return;
    const template = currentEngine().url || DEFAULT_ENGINES[0].url;
    const target = template.replace('{q}', encodeURIComponent(term));
    window.open(target, '_blank', 'noopener,noreferrer');
}

function renderEnginesDraft() {
    const list = document.getElementById('engines-list');
    if (!list) return;
    list.innerHTML = (state.enginesDraft || []).map((e, i) => `
        <div class="engine-row border border-slate-700 rounded-lg p-2 space-y-1.5" data-idx="${i}">
            <div class="flex gap-1.5">
                <input type="text" class="engine-name w-1/3 bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-100" value="${escapeHtml(e.name)}" placeholder="名称">
                <input type="text" class="engine-url flex-1 bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-100" value="${escapeHtml(e.url)}" placeholder="https://...q={q}">
                <button type="button" onclick="removeEngine(${i})" class="text-red-400 hover:text-red-300 px-1 cursor-pointer" title="删除">×</button>
            </div>
            <div class="flex items-center gap-1.5">
                <input type="text" class="engine-icon flex-1 bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-[10px] text-slate-100" value="${escapeHtml(e.icon || '')}" placeholder="图标 class（可选）">
                <button type="button" onclick="setDefaultEngine(${i})" class="text-[10px] px-1.5 py-1 rounded ${e.id === state.enginesDefaultId ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'} cursor-pointer">${e.id === state.enginesDefaultId ? '默认' : '设为默认'}</button>
            </div>
        </div>`).join('');
}

function syncEnginesDraftFromInputs() {
    document.querySelectorAll('#engines-list .engine-row').forEach((row) => {
        const i = Number(row.getAttribute('data-idx'));
        if (!state.enginesDraft || !state.enginesDraft[i]) return;
        state.enginesDraft[i].name = row.querySelector('.engine-name').value.trim();
        state.enginesDraft[i].url = row.querySelector('.engine-url').value.trim();
        state.enginesDraft[i].icon = row.querySelector('.engine-icon').value.trim();
    });
}

export function applySiteAppearance() {
    const title = state.cloudConfig.siteTitle || t('pageTitle');
    const pageTitleEl = document.getElementById('page-title');
    if (pageTitleEl) pageTitleEl.innerText = title;
    document.title = title;
    if (state.cloudConfig.footerText) {
        const footerEl = document.querySelector('[data-i18n="footerText"]');
        if (footerEl) footerEl.textContent = state.cloudConfig.footerText;
    }
    renderEngineMenu();
    const list = getEngineList(state.cloudConfig);
    state.cloudConfig.engines = list;
    if (!state.enginesDraft) {
        state.enginesDraft = JSON.parse(JSON.stringify(list));
        state.enginesDefaultId = (list[0] && list[0].id) || 'google';
        state.currentEngineKey = state.enginesDefaultId;
    }
    renderEnginesDraft();
    selectEngine(state.currentEngineKey);
    const titleInput = document.getElementById('site-title-input');
    const footerInput = document.getElementById('footer-text-input');
    if (titleInput) titleInput.value = state.cloudConfig.siteTitle || '';
    if (footerInput) footerInput.value = state.cloudConfig.footerText || '';
}

export function setDefaultEngine(idx) {
    syncEnginesDraftFromInputs();
    if (state.enginesDraft && state.enginesDraft[idx]) {
        state.enginesDefaultId = state.enginesDraft[idx].id;
    }
    renderEnginesDraft();
}

export function addEngine() {
    syncEnginesDraftFromInputs();
    if (!state.enginesDraft) state.enginesDraft = [];
    const id = 'engine' + Date.now().toString(36);
    state.enginesDraft.push({ id, name: '新引擎', url: 'https://example.com/search?q={q}', icon: '' });
    renderEnginesDraft();
}

export function removeEngine(idx) {
    syncEnginesDraftFromInputs();
    if (!state.enginesDraft) return;
    state.enginesDraft.splice(idx, 1);
    if (!state.enginesDraft.length) state.enginesDraft = JSON.parse(JSON.stringify(DEFAULT_ENGINES));
    if (!state.enginesDraft.some((e) => e.id === state.enginesDefaultId)) state.enginesDefaultId = state.enginesDraft[0].id;
    renderEnginesDraft();
}

export function resetEngines() {
    state.enginesDraft = JSON.parse(JSON.stringify(DEFAULT_ENGINES));
    state.enginesDefaultId = DEFAULT_ENGINES[0].id;
    renderEnginesDraft();
}

export async function applySiteSettings() {
    const title = (document.getElementById('site-title-input')?.value || '').trim();
    const footer = (document.getElementById('footer-text-input')?.value || '').trim();
    syncEnginesDraftFromInputs();
    const draft = state.enginesDraft || [];
    const valid = draft.length > 0 && draft.every((e) => e.name && e.url.includes('{q}') && /^https?:\/\//i.test(e.url));
    if (!valid) {
        return alert(state.currentLang === 'zh' ? '每个引擎都需要名称和含 {q} 的 http(s) 网址。' : 'Each engine needs a name and an http(s) URL containing {q}.');
    }
    const ordered = [...draft].sort((a, b) => (a.id === state.enginesDefaultId ? -1 : b.id === state.enginesDefaultId ? 1 : 0));
    const ok = await updateCloudConfig({ engines: ordered, siteTitle: title, footerText: footer });
    if (ok === false) return;
    state.currentEngineKey = state.enginesDefaultId;
    applySiteAppearance();
    alert(state.currentLang === 'zh' ? '站点设置已保存。' : 'Site settings saved.');
}

// --- 弹窗与链接保存 ---
export function openLinkModal(target) {
    state.currentModalTarget = target;
    state.editingTarget = null;
    const textEl = document.getElementById('modal-title-text');
    if (textEl) {
        if (target === 'friend') textEl.innerText = t('modalAddFriend');
        else if (target.startsWith('section_')) textEl.innerText = t('modalAddSection');
    }
    const saveBtn = document.getElementById('modal-save-btn');
    if (saveBtn) {
        saveBtn.setAttribute('data-i18n', 'btnSave');
        saveBtn.innerText = t('btnSave');
    }
    toggleModal(true);
}

export function openEditLinkModal(type, secId, idx) {
    let link;
    if (type === 'friend') {
        state.currentModalTarget = 'friend';
        link = (state.cloudConfig.friendLinks || [])[idx];
    } else {
        state.currentModalTarget = `section_${secId}`;
        const sec = (state.cloudConfig.dynamicSections || []).find((s) => s.id === secId);
        link = sec && sec.links[idx];
    }
    if (!link) return;
    state.editingTarget = { type, secId, idx };
    const textEl = document.getElementById('modal-title-text');
    if (textEl) textEl.innerText = t('modalEdit');
    const saveBtn = document.getElementById('modal-save-btn');
    if (saveBtn) {
        saveBtn.setAttribute('data-i18n', 'btnSaveEdit');
        saveBtn.innerText = t('btnSaveEdit');
    }
    toggleModal(true, link.name, link.url);
}

export function toggleModal(show, prefillName = '', prefillUrl = '') {
    const modal = document.getElementById('modal');
    if (!modal) return;
    if (show) {
        const nameEl = document.getElementById('site-name');
        const urlEl = document.getElementById('site-url');
        if (nameEl) nameEl.value = prefillName;
        if (urlEl) urlEl.value = prefillUrl;
        modal.classList.remove('hidden');
        setTimeout(() => nameEl?.focus(), 50);
    } else {
        modal.classList.add('hidden');
        state.editingTarget = null;
    }
}

export function closeModalOnBlank(e) {
    if (e.target && e.target.id === 'modal') toggleModal(false);
}

export async function saveActiveLink() {
    const name = document.getElementById('site-name')?.value.trim();
    const url = normalizeURL(document.getElementById('site-url')?.value);

    if (!name || !url) {
        return alert(state.currentLang === 'zh' ? '请完整填写有效的名称和网址！' : 'Please enter a valid name and URL!');
    }

    const edit = state.editingTarget;
    if (state.currentModalTarget === 'friend') {
        const links = state.cloudConfig.friendLinks || [];
        const prevLinks = JSON.stringify(links);
        if (edit && edit.type === 'friend') {
            links.splice(edit.idx, 1, { name, url });
        } else {
            links.push({ name, url });
        }
        state.cloudConfig.friendLinks = links;
        localStorage.setItem('nav_friend_links', JSON.stringify(links));
        loadFriendLinks();
        toggleModal(false);
        const ok = await updateCloudConfig('friendLinks', links);
        if (ok === false) {
            state.cloudConfig.friendLinks = JSON.parse(prevLinks);
            localStorage.setItem('nav_friend_links', prevLinks);
            loadFriendLinks();
        }
    } else if (state.currentModalTarget.startsWith('section_')) {
        const secId = state.currentModalTarget.replace('section_', '');
        const secs = state.cloudConfig.dynamicSections || [];
        const prevSecs = JSON.stringify(secs);
        const sec = secs.find((s) => s.id === secId);
        if (sec) {
            if (edit && edit.type === 'section') {
                sec.links.splice(edit.idx, 1, { name, url });
            } else {
                sec.links.push({ name, url });
            }
            toggleModal(false);
            const ok = await saveDynamicSections(secs);
            if (ok === false) {
                state.cloudConfig.dynamicSections = JSON.parse(prevSecs);
                localStorage.setItem('nav_dynamic_sections', prevSecs);
                renderDynamicSections();
            }
        } else {
            toggleModal(false);
        }
    } else {
        toggleModal(false);
    }
}

export function loadFriendLinks() {
    const container = document.getElementById('friend-links-container');
    if (!container) return;
    const links = state.cloudConfig.friendLinks || [];
    container.innerHTML = '';

    if (links.length === 0) {
        container.innerHTML = `<div class="empty-hint col-span-full text-center text-xs text-slate-400/60 py-4">${t('noCloudLinks')}</div>`;
        return;
    }

    links.forEach((item, index) => {
        const safeName = escapeHtml(item.name);
        const safeUrl = escapeHtml(item.url);
        container.innerHTML += `
            <div class="link-card group relative flex items-center justify-between p-2.5 bg-slate-500/5 border border-slate-500/10 rounded-xl hover:bg-emerald-600/10 transition-all text-center">
                <a href="${safeUrl}" draggable="false" target="_blank" rel="noopener noreferrer" title="${safeName}" class="link-title friend-link-label w-full text-xs font-medium text-slate-400 hover:text-emerald-400 transition-colors truncate px-2">${safeName}</a>
                <div class="admin-only link-actions absolute right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onclick="openEditLinkModal('friend', null, ${index})" class="text-[10px] text-slate-400 hover:text-sky-400 bg-slate-500/10 px-1 rounded cursor-pointer" title="编辑"><i class="fas fa-pen"></i></button>
                    <button type="button" onclick="deleteFriendLink(event, ${index})" class="text-[10px] text-slate-500 hover:text-red-400 bg-slate-500/10 px-1 rounded cursor-pointer" title="删除"><i class="fas fa-times"></i></button>
                </div>
            </div>`;
    });
}

export async function deleteFriendLink(e, index) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(t('delConfirm'))) return;
    const links = state.cloudConfig.friendLinks || [];
    if (links.length > 0) {
        const prevLinks = JSON.stringify(links);
        links.splice(index, 1);
        state.cloudConfig.friendLinks = links;
        localStorage.setItem('nav_friend_links', JSON.stringify(links));
        loadFriendLinks();
        const ok = await updateCloudConfig('friendLinks', links);
        if (ok === false) {
            state.cloudConfig.friendLinks = JSON.parse(prevLinks);
            localStorage.setItem('nav_friend_links', prevLinks);
            loadFriendLinks();
        }
    }
}
