import { state } from '../core/state.js';
import { t } from '../core/i18n.js';

export const sTermNames = [
    '小寒', '大寒', '立春', '雨水', '惊蛰', '春分',
    '清明', '谷雨', '立夏', '小满', '芒种', '夏至',
    '小暑', '大暑', '立秋', '处暑', '白露', '秋分',
    '寒露', '霜降', '立冬', '小雪', '大雪', '冬至'
];

export const sTermInfo = [
    0, 21208, 42467, 63836, 85337, 107014,
    128867, 150921, 173149, 195551, 218072, 240693,
    263343, 285989, 308563, 331033, 353350, 375494,
    397447, 419210, 440795, 462224, 483532, 504758
];

export function getSolarTerm(y, m, d) {
    const baseDate = new Date(1900, 0, 6, 2, 5, 0);
    const termDate = new Date((31556925974.7 * (y - 1900) + sTermInfo[m * 2]) + baseDate.getTime());
    if (termDate.getMonth() == m && termDate.getDate() == d) return sTermNames[m * 2];
    const termDate2 = new Date((31556925974.7 * (y - 1900) + sTermInfo[m * 2 + 1]) + baseDate.getTime());
    if (termDate2.getMonth() == m && termDate2.getDate() == d) return sTermNames[m * 2 + 1];
    return null;
}

export function updateClockAndGreeting() {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth(), d = now.getDate(), h = now.getHours();

    const clockEl = document.getElementById('clock');
    if (clockEl) {
        clockEl.innerText = `${String(h).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    }

    let greetStr = '';
    if (state.currentLang === 'zh') {
        const term = getSolarTerm(y, m, d);
        const md = `${String(m + 1).padStart(2, '0')}${String(d).padStart(2, '0')}`;
        const fests = { '0101': '元旦快乐', '0308': '妇女节快乐', '0501': '五一劳动节', '0601': '儿童节快乐', '1001': '国庆节快乐', '1225': '圣诞节' };
        const fest = fests[md] || null;

        if (fest) {
            greetStr = `🎉 今天是 ${fest}，祝你开心！`;
        } else if (term) {
            greetStr = `🍃 今日节气 · 【${term}】，顺应四时，平安喜乐。`;
        } else {
            if (h >= 0 && h < 5) greetStr = '🌙 夜深了，静谧的星空在守护你，早点休息哦';
            else if (h >= 5 && h < 8) greetStr = '🌅 清晨的朝阳刚刚升起，新的一天充满希望';
            else if (h >= 8 && h < 11.5) greetStr = '☀️ 早上好，专注当下，今天也要元气满满';
            else if (h >= 11.5 && h < 13.5) greetStr = '🍲 中午好，记得按时吃饭，歇息一下双眼';
            else if (h >= 13.5 && h < 17.5) greetStr = '☕ 下午好，来杯清茶或咖啡，继续保持高效';
            else if (h >= 17.5 && h < 19.5) greetStr = '🌇 傍晚好，落日余晖很美，放下疲惫准备享受夜晚吧';
            else greetStr = '✨ 晚上好，属于自己的惬意时光，好好犒劳一下自己';
        }
    } else {
        if (h >= 0 && h < 5) greetStr = '🌙 Late night, the stars are watching over you. Sleep early.';
        else if (h >= 5 && h < 8) greetStr = '🌅 The morning sun is rising, a new day full of hope.';
        else if (h >= 8 && h < 11.5) greetStr = '☀️ Good morning! Stay focused and full of energy.';
        else if (h >= 11.5 && h < 13.5) greetStr = '🍲 Good noon! Remember to eat on time and rest your eyes.';
        else if (h >= 13.5 && h < 17.5) greetStr = '☕ Good afternoon! Grab a tea or coffee and keep it up.';
        else if (h >= 17.5 && h < 19.5) greetStr = '🌇 Good evening! The sunset is beautiful. Relax and enjoy.';
        else greetStr = '✨ Good night! Enjoy your cozy time and treat yourself well.';
    }
    const greetingEl = document.getElementById('greeting');
    if (greetingEl) greetingEl.innerText = greetStr;
}

export async function fetchWeather() {
    try {
        let latitude, longitude, city;
        const cachedLoc = localStorage.getItem('nav_weather_loc');
        const cachedTime = Number(localStorage.getItem('nav_weather_time') || 0);
        const isLocFresh = cachedLoc && (Date.now() - cachedTime < 24 * 60 * 60 * 1000);

        if (isLocFresh) {
            try {
                const parsed = JSON.parse(cachedLoc);
                latitude = parsed.lat;
                longitude = parsed.lon;
                city = parsed.city;
            } catch {}
        }

        if (!latitude || !longitude) {
            const ipRes = await fetch('https://ipapi.co/json/');
            if (ipRes.ok) {
                const ipData = await ipRes.json();
                latitude = ipData.latitude;
                longitude = ipData.longitude;
                city = ipData.city;
                if (latitude && longitude) {
                    localStorage.setItem('nav_weather_loc', JSON.stringify({ lat: latitude, lon: longitude, city }));
                    localStorage.setItem('nav_weather_time', String(Date.now()));
                }
            } else if (cachedLoc) {
                const parsed = JSON.parse(cachedLoc);
                latitude = parsed.lat;
                longitude = parsed.lon;
                city = parsed.city;
            } else {
                throw new Error('Location API rate limited or failed.');
            }
        }

        if (!latitude || !longitude) throw new Error('Missing coordinates.');

        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
        if (!weatherRes.ok) throw new Error('Weather API failed.');

        const weatherData = await weatherRes.json();
        state.weatherState = {
            city: city || 'Earth',
            temp: Math.round(weatherData.current_weather.temperature),
            code: weatherData.current_weather.weathercode,
            fetched: true
        };
    } catch (e) {
        console.warn('Weather fetching gracefully degraded:', e.message);
        state.weatherState.fetched = false;
    }
    renderWeather();
}

export function renderWeather() {
    const el = document.getElementById('weather-info');
    if (!el) return;
    if (!state.weatherState.fetched) {
        el.innerHTML = `<i class="fas fa-cloud text-slate-400"></i> <span>${t('weatherDefault')}</span>`;
        return;
    }

    let displayCity = state.weatherState.city;
    if (state.currentLang === 'zh') {
        const cityMap = { Singapore: '新加坡', 'Santa Clara': '圣克拉拉', 'San Jose': '圣何塞', Beijing: '北京', Shanghai: '上海', Shenzhen: '深圳', Guangzhou: '广州', Hangzhou: '杭州', Chengdu: '成都', 'Hong Kong': '香港' };
        displayCity = cityMap[displayCity] || displayCity;
        displayCity = displayCity.replace(/Province|City/gi, '').trim();
    }

    const code = state.weatherState.code;
    let icon = 'fa-cloud';
    let descKey = 'weatherCloudy';

    if (code === 0) { icon = 'fa-sun text-amber-500'; descKey = 'weatherClear'; }
    else if ([1, 2, 3].includes(code)) { icon = 'fa-cloud-sun text-indigo-300'; descKey = 'weatherCloudy'; }
    else if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) { icon = 'fa-cloud-showers-heavy text-sky-400'; descKey = 'weatherRain'; }
    else if ([71, 73, 75, 77, 85, 86].includes(code)) { icon = 'fa-snowflake text-blue-200'; descKey = 'weatherSnow'; }
    else if ([95, 96, 99].includes(code)) { icon = 'fa-bolt text-yellow-500'; descKey = 'weatherThunder'; }

    el.innerHTML = `<i class="fas ${icon}"></i> <span>${displayCity} · ${t(descKey)} ${state.weatherState.temp}°C</span>`;
}

// 回到顶部：滚动超过阈值（160px）显示按钮，滚回顶部平滑隐藏。
export function initBackToTop() {
    const btn = document.getElementById('back-to-top');
    if (!btn) return;
    let ticking = false;
    const updateVisibility = () => {
        const visible = (window.scrollY || document.documentElement.scrollTop || 0) > 160;
        btn.classList.toggle('is-visible', visible);
        ticking = false;
    };
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(updateVisibility);
            ticking = true;
        }
    }, { passive: true });
    updateVisibility();
}

export function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
