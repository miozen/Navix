import { t } from '../core/i18n.js';
import { updateCloudConfig } from '../core/api.js';
import { resumeStarfield } from './starfield.js';

export function toggleThemeMenu(e) {
    e.stopPropagation();
    document.getElementById('theme-panel')?.classList.toggle('hidden');
}

export function setBaseTheme(themeName) {
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(themeName);
    localStorage.setItem('nav_theme_mode', themeName);
    document.getElementById('theme-panel')?.classList.add('hidden');
}

export function applyWallpaperStyles(url) {
    document.body.style.backgroundImage = `url('${url}')`;
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.backgroundAttachment = 'fixed';
    document.body.classList.add('has-custom-bg');
    const starfield = document.getElementById('starfield');
    if (starfield) starfield.style.opacity = '0';
}

export async function applyCustomBg() {
    const url = document.getElementById('custom-bg-input').value.trim();
    if (!url) return alert(t('validUrlMsg'));
    applyWallpaperStyles(url);
    localStorage.setItem('nav_custom_wallpaper', url);
    document.body.classList.remove('bg-cleared');
    document.getElementById('clear-bg-btn')?.classList.remove('hidden');
    document.getElementById('theme-panel')?.classList.add('hidden');
    await updateCloudConfig('wallpaper', url);
}

export async function clearCustomBg() {
    document.body.style.backgroundImage = '';
    document.body.classList.remove('has-custom-bg');
    localStorage.removeItem('nav_custom_wallpaper');
    document.body.classList.add('bg-cleared');
    const input = document.getElementById('custom-bg-input');
    if (input) input.value = '';
    document.getElementById('clear-bg-btn')?.classList.add('hidden');
    document.getElementById('theme-panel')?.classList.add('hidden');
    await updateCloudConfig('wallpaper', '');
    const starfield = document.getElementById('starfield');
    if (starfield) starfield.style.opacity = '1';
    resumeStarfield();
}
