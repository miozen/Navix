let starfieldAnimationId = null;
let drawLoop = null;
let starfieldInitialized = false;

export function resumeStarfield() {
    if (drawLoop && !starfieldAnimationId && !document.body.classList.contains('has-custom-bg')) {
        starfieldAnimationId = requestAnimationFrame(drawLoop);
    }
}

export function initStarfield() {
    if (starfieldInitialized) {
        resumeStarfield();
        return;
    }
    const canvas = document.getElementById('starfield');
    if (!canvas) return;
    starfieldInitialized = true;

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

    drawLoop = function draw() {
        // 自定义壁纸激活时暂停循环，节省系统资源
        if (document.body.classList.contains('has-custom-bg')) {
            starfieldAnimationId = null;
            return;
        }
        ctx.clearRect(0, 0, w, h);
        const isLight = document.body.classList.contains('theme-light');
        ctx.fillStyle = isLight ? 'rgba(15, 23, 42, 0.3)' : 'rgba(255, 255, 255, 0.6)';

        stars.forEach((star) => {
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
        starfieldAnimationId = requestAnimationFrame(drawLoop);
    };

    window.resumeStarfield = resumeStarfield;
    drawLoop();

    window.addEventListener('resize', () => {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
    });
}
