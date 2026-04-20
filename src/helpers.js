// ============================================================
// Helpers
// ============================================================

export function computeStep(min, max) {
    const range = (max || 1) - (min || 0);
    if (range <= 0.01) return range / 500;
    if (range <= 1) return range / 500;
    if (range <= 10) return 0.01;
    return 0.1;
}

export function formatNum(n) {
    const num = Number(n);
    if (Math.abs(num) < 0.01 && num !== 0) {
        return num.toExponential(2);
    }
    return Number(num.toFixed(4)).toString();
}

export function updateSwatchColor(swatch, rgba) {
    const r = Math.round(rgba[0] * 255);
    const g = Math.round(rgba[1] * 255);
    const b = Math.round(rgba[2] * 255);
    const a = rgba[3];
    swatch.style.background = `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function rgbaToHex(rgba) {
    const toHex = (v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0');
    return `#${toHex(rgba[0])}${toHex(rgba[1])}${toHex(rgba[2])}`;
}

export function hexToRgba(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return [r, g, b, 1.0];
}

export function flashButton(btn, msg) {
    const original = btn.innerHTML;
    btn.textContent = msg;
    btn.classList.add('success');
    setTimeout(() => {
        btn.innerHTML = original;
        btn.classList.remove('success');
    }, 2000);
}
