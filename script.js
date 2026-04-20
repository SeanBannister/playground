import { Renderer } from 'https://esm.sh/interactive-shader-format';

// ============================================================
// Default ISF Fragment Source
// ============================================================

let currentFsSource = '';

// ============================================================
// DOM References
// ============================================================

const canvas = document.getElementById('glcanvas');
const gl = canvas.getContext('webgl');
const errorOverlay = document.getElementById('error-overlay');
const fpsCounter = document.getElementById('fps-counter');
const sidebarToggle = document.getElementById('sidebar-toggle');
const controlsContainer = document.getElementById('controls-container');
const shaderDescription = document.getElementById('shader-description');

// ============================================================
// WebGL + ISF Renderer Init
// ============================================================

if (!gl) {
    errorOverlay.textContent = 'WebGL is not supported by your browser.';
    errorOverlay.style.display = 'block';
}

const renderer = new Renderer(gl);

// Try to load shader.fs, handle initialization afterwards
fetch('shader.fs')
    .then(response => {
        if (!response.ok) {
            throw new Error(`Failed to load shader.fs: ${response.status} ${response.statusText}`);
        }
        return response.text();
    })
    .then(text => {
        currentFsSource = text;
        try {
            renderer.loadSource(currentFsSource);
            errorOverlay.style.display = 'none';
            buildControls(); // Rebuild controls with new shader input
        } catch (err) {
            errorOverlay.textContent = err.message || err;
            errorOverlay.style.display = 'block';
        }
    })
    .catch(err => {
        errorOverlay.textContent = err.message || err;
        errorOverlay.style.display = 'block';
    });

// ============================================================
// Sidebar Toggle
// ============================================================

sidebarToggle.addEventListener('click', () => {
    document.body.classList.toggle('sidebar-open');
});

// ============================================================
// Build Controls from ISF Inputs
// ============================================================

function buildControls() {
    const model = renderer.model;
    if (!model || !model.inputs) return;

    // Show description
    if (model.description) {
        shaderDescription.textContent = model.description;
    }

    controlsContainer.innerHTML = '';

    const builders = {
        'float': createFloatControl,
        'color': createColorControl,
        'bool': createBoolControl,
        'event': createEventControl,
        'long': createLongControl,
        'point2D': createPoint2DControl
    };

    for (const input of model.inputs) {
        const builder = builders[input.TYPE];
        if (builder) {
            controlsContainer.appendChild(builder(input));
        }
    }
}

// ============================================================
// Float → Range Slider
// ============================================================

function createFloatControl(input) {
    const row = document.createElement('div');
    row.className = 'control-row';

    const labelRow = document.createElement('div');
    labelRow.className = 'control-label-row';

    const labelEl = document.createElement('span');
    labelEl.className = 'control-label';
    labelEl.textContent = input.LABEL || input.NAME;

    const valueEl = document.createElement('span');
    valueEl.className = 'control-value';
    const defaultVal = input.DEFAULT !== undefined ? input.DEFAULT : (input.MIN || 0);
    valueEl.textContent = formatNum(defaultVal);

    labelRow.appendChild(labelEl);
    labelRow.appendChild(valueEl);
    row.appendChild(labelRow);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'range-slider';
    slider.min = input.MIN !== undefined ? input.MIN : 0;
    slider.max = input.MAX !== undefined ? input.MAX : 1;
    slider.step = computeStep(input.MIN, input.MAX);
    slider.value = defaultVal;

    slider.addEventListener('input', () => {
        const v = parseFloat(slider.value);
        valueEl.textContent = formatNum(v);
        renderer.setValue(input.NAME, v);
    });

    row.appendChild(slider);
    return row;
}

function computeStep(min, max) {
    const range = (max || 1) - (min || 0);
    if (range <= 0.01) return range / 500;
    if (range <= 1) return range / 500;
    if (range <= 10) return 0.01;
    return 0.1;
}

function formatNum(n) {
    const num = Number(n);
    if (Math.abs(num) < 0.01 && num !== 0) {
        return num.toExponential(2);
    }
    return Number(num.toFixed(4)).toString(); // Crops trailing zeros while preserving up to 4 decimals
}

// ============================================================
// Color → Swatch + RGBA Sliders
// ============================================================

function createColorControl(input) {
    const row = document.createElement('div');
    row.className = 'control-row';

    const labelRow = document.createElement('div');
    labelRow.className = 'control-label-row';
    const labelEl = document.createElement('span');
    labelEl.className = 'control-label';
    labelEl.textContent = input.LABEL || input.NAME;
    labelRow.appendChild(labelEl);
    row.appendChild(labelRow);

    const colorControl = document.createElement('div');
    colorControl.className = 'color-control';

    // Current RGBA values (0-1)
    const rgba = input.DEFAULT ? [...input.DEFAULT] : [1, 1, 1, 1];

    // Circular swatch with native color picker hidden behind it
    const swatchWrapper = document.createElement('div');
    swatchWrapper.className = 'color-swatch-wrapper';

    const swatch = document.createElement('div');
    swatch.className = 'color-swatch';
    updateSwatchColor(swatch, rgba);

    const nativeInput = document.createElement('input');
    nativeInput.type = 'color';
    nativeInput.className = 'color-native-input';
    nativeInput.value = rgbaToHex(rgba);

    swatchWrapper.appendChild(swatch);
    swatchWrapper.appendChild(nativeInput);
    colorControl.appendChild(swatchWrapper);

    // RGBA channel sliders
    const slidersDiv = document.createElement('div');
    slidersDiv.className = 'color-sliders';

    const channels = ['R', 'G', 'B', 'A'];
    const channelSliders = [];

    channels.forEach((ch, idx) => {
        const chRow = document.createElement('div');
        chRow.className = 'color-channel-row';

        const chLabel = document.createElement('span');
        chLabel.className = 'color-channel-label';
        chLabel.textContent = ch;

        const chSlider = document.createElement('input');
        chSlider.type = 'range';
        chSlider.className = `color-channel-slider ch-${ch.toLowerCase()}`;
        chSlider.min = 0;
        chSlider.max = 1;
        chSlider.step = 0.005;
        chSlider.value = rgba[idx];

        channelSliders.push(chSlider);

        chSlider.addEventListener('input', () => {
            rgba[idx] = parseFloat(chSlider.value);
            updateSwatchColor(swatch, rgba);
            nativeInput.value = rgbaToHex(rgba);
            renderer.setValue(input.NAME, [...rgba]);
        });

        chRow.appendChild(chLabel);
        chRow.appendChild(chSlider);
        slidersDiv.appendChild(chRow);
    });

    // When native picker changes, update RGBA sliders
    nativeInput.addEventListener('input', () => {
        const parsed = hexToRgba(nativeInput.value);
        rgba[0] = parsed[0];
        rgba[1] = parsed[1];
        rgba[2] = parsed[2];
        // Keep alpha unchanged from native picker (it doesn't support alpha)
        channelSliders[0].value = rgba[0];
        channelSliders[1].value = rgba[1];
        channelSliders[2].value = rgba[2];
        updateSwatchColor(swatch, rgba);
        renderer.setValue(input.NAME, [...rgba]);
    });

    colorControl.appendChild(slidersDiv);
    row.appendChild(colorControl);
    return row;
}

function updateSwatchColor(swatch, rgba) {
    const r = Math.round(rgba[0] * 255);
    const g = Math.round(rgba[1] * 255);
    const b = Math.round(rgba[2] * 255);
    const a = rgba[3];
    swatch.style.background = `rgba(${r}, ${g}, ${b}, ${a})`;
}

function rgbaToHex(rgba) {
    const toHex = (v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0');
    return `#${toHex(rgba[0])}${toHex(rgba[1])}${toHex(rgba[2])}`;
}

function hexToRgba(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return [r, g, b, 1.0];
}

// ============================================================
// Bool → Toggle Switch
// ============================================================

function createBoolControl(input) {
    const row = document.createElement('div');
    row.className = 'control-row toggle-row';

    const labelEl = document.createElement('span');
    labelEl.className = 'control-label';
    labelEl.textContent = input.LABEL || input.NAME;

    const toggleSwitch = document.createElement('label');
    toggleSwitch.className = 'toggle-switch';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!input.DEFAULT;

    const track = document.createElement('span');
    track.className = 'toggle-track';

    checkbox.addEventListener('change', () => {
        renderer.setValue(input.NAME, checkbox.checked);
    });

    toggleSwitch.appendChild(checkbox);
    toggleSwitch.appendChild(track);

    row.appendChild(labelEl);
    row.appendChild(toggleSwitch);
    return row;
}

// ============================================================
// Event → Momentary Button
// ============================================================

function createEventControl(input) {
    const row = document.createElement('div');
    row.className = 'control-row';

    const btn = document.createElement('button');
    btn.className = 'event-btn';
    btn.textContent = input.LABEL || input.NAME;

    btn.addEventListener('mousedown', () => {
        renderer.setValue(input.NAME, true);
    });
    btn.addEventListener('mouseup', () => {
        renderer.setValue(input.NAME, false);
    });
    btn.addEventListener('mouseleave', () => {
        renderer.setValue(input.NAME, false);
    });

    row.appendChild(btn);
    return row;
}

// ============================================================
// Long → Dropdown Select
// ============================================================

function createLongControl(input) {
    const row = document.createElement('div');
    row.className = 'control-row';

    const labelRow = document.createElement('div');
    labelRow.className = 'control-label-row';
    const labelEl = document.createElement('span');
    labelEl.className = 'control-label';
    labelEl.textContent = input.LABEL || input.NAME;
    labelRow.appendChild(labelEl);
    row.appendChild(labelRow);

    const select = document.createElement('select');
    select.className = 'isf-select';

    const values = input.VALUES || [];
    const labels = input.LABELS || values.map(String);

    values.forEach((val, idx) => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = labels[idx] || val;
        if (val === input.DEFAULT) opt.selected = true;
        select.appendChild(opt);
    });

    select.addEventListener('change', () => {
        renderer.setValue(input.NAME, parseInt(select.value, 10));
    });

    row.appendChild(select);
    return row;
}

// ============================================================
// Point2D → Dual Sliders (X / Y)
// ============================================================

function createPoint2DControl(input) {
    const row = document.createElement('div');
    row.className = 'control-row';

    const labelRow = document.createElement('div');
    labelRow.className = 'control-label-row';
    const labelEl = document.createElement('span');
    labelEl.className = 'control-label';
    labelEl.textContent = input.LABEL || input.NAME;
    labelRow.appendChild(labelEl);
    row.appendChild(labelRow);

    const pt = input.DEFAULT ? [...input.DEFAULT] : [0, 0];
    const min = input.MIN || [0, 0];
    const max = input.MAX || [1, 1];

    const slidersDiv = document.createElement('div');
    slidersDiv.className = 'point2d-sliders';

    ['X', 'Y'].forEach((axis, idx) => {
        const axisRow = document.createElement('div');
        axisRow.className = 'point2d-row';

        const axisLabel = document.createElement('span');
        axisLabel.className = 'point2d-label';
        axisLabel.textContent = axis;

        const axisSlider = document.createElement('input');
        axisSlider.type = 'range';
        axisSlider.className = 'point2d-slider';
        axisSlider.min = Array.isArray(min) ? min[idx] : min;
        axisSlider.max = Array.isArray(max) ? max[idx] : max;
        axisSlider.step = 0.01;
        axisSlider.value = pt[idx];

        const axisValue = document.createElement('span');
        axisValue.className = 'point2d-value';
        axisValue.textContent = formatNum(pt[idx]);

        axisSlider.addEventListener('input', () => {
            pt[idx] = parseFloat(axisSlider.value);
            axisValue.textContent = formatNum(pt[idx]);
            renderer.setValue(input.NAME, [...pt]);
        });

        axisRow.appendChild(axisLabel);
        axisRow.appendChild(axisSlider);
        axisRow.appendChild(axisValue);
        slidersDiv.appendChild(axisRow);
    });

    row.appendChild(slidersDiv);
    return row;
}

// ============================================================
// Canvas Resize
// ============================================================

function resizeCanvas() {
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
    }
}

// ============================================================
// Render Loop
// ============================================================

let frameCount = 0;
let lastFpsTime = performance.now();

function renderLoop() {
    resizeCanvas();

    // Draw the current frame, but only if the shader is loaded and valid!
    if (renderer.valid) {
        renderer.draw(canvas);
    }

    frameCount++;
    const now = performance.now();
    if (now - lastFpsTime >= 1000) {
        fpsCounter.textContent = frameCount + ' FPS';
        frameCount = 0;
        lastFpsTime = now;
    }

    requestAnimationFrame(renderLoop);
}

// ============================================================
// Export / Copy Buttons
// ============================================================

document.getElementById('btn-copy').addEventListener('click', () => {
    navigator.clipboard.writeText(currentFsSource).then(() => {
        flashButton(document.getElementById('btn-copy'), '✅ Copied!');
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = currentFsSource;
        textArea.style.position = 'fixed';
        textArea.style.top = '0';
        textArea.style.left = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            flashButton(document.getElementById('btn-copy'), '✅ Copied!');
        } catch (err) {
            console.error('Unable to copy', err);
        }
        document.body.removeChild(textArea);
    });
});

document.getElementById('btn-export').addEventListener('click', () => {
    const blob = new Blob([currentFsSource], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aurora_flow.fs';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    flashButton(document.getElementById('btn-export'), '✅ Exported!');
});

function flashButton(btn, msg) {
    const original = btn.innerHTML;
    btn.textContent = msg;
    btn.classList.add('success');
    setTimeout(() => {
        btn.innerHTML = original;
        btn.classList.remove('success');
    }, 2000);
}

// ============================================================
// Init
// ============================================================

// Note: buildControls() is now called after fetch successfully loads the shader

renderLoop();
window.addEventListener('resize', resizeCanvas);
