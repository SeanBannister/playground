import { Renderer } from 'https://esm.sh/interactive-shader-format';

// ============================================================
// Default ISF Fragment Source
// ============================================================

const defaultFsSource = `/*{
    "DESCRIPTION": "Aurora Flow - campo orgânico generativo com domain warping recursivo, paleta tripla e pulsação radial. Inspirado em padrões de aurora boreal e fluxos de tinta.",
    "CREDIT": "Gerador de videos ISF",
    "ISFVSN": "2",
    "CATEGORIES": ["GENERATOR", "NOISE", "ORGANIC"],
    "INPUTS": [
        {
            "NAME": "scale",
            "LABEL": "Escala",
            "TYPE": "float",
            "DEFAULT": 2.8,
            "MIN": 0.5,
            "MAX": 10.0
        },
        {
            "NAME": "speed",
            "LABEL": "Velocidade",
            "TYPE": "float",
            "DEFAULT": 0.25,
            "MIN": 0.0,
            "MAX": 2.0
        },
        {
            "NAME": "warpAmount",
            "LABEL": "Distorção",
            "TYPE": "float",
            "DEFAULT": 1.6,
            "MIN": 0.0,
            "MAX": 4.0
        },
        {
            "NAME": "rotation",
            "LABEL": "Rotação",
            "TYPE": "float",
            "DEFAULT": 0.15,
            "MIN": -1.0,
            "MAX": 1.0
        },
        {
            "NAME": "pulse",
            "LABEL": "Pulsação",
            "TYPE": "float",
            "DEFAULT": 0.4,
            "MIN": 0.0,
            "MAX": 1.5
        },
        {
            "NAME": "colorA",
            "LABEL": "Cor Profunda",
            "TYPE": "color",
            "DEFAULT": [0.05, 0.02, 0.25, 1.0]
        },
        {
            "NAME": "colorB",
            "LABEL": "Cor Média",
            "TYPE": "color",
            "DEFAULT": [0.85, 0.20, 0.55, 1.0]
        },
        {
            "NAME": "colorC",
            "LABEL": "Cor Brilho",
            "TYPE": "color",
            "DEFAULT": [1.0, 0.90, 0.45, 1.0]
        },
        {
            "NAME": "intensity",
            "LABEL": "Intensidade",
            "TYPE": "float",
            "DEFAULT": 1.0,
            "MIN": 0.1,
            "MAX": 2.5
        },
        {
            "NAME": "vignette",
            "LABEL": "Vinheta",
            "TYPE": "float",
            "DEFAULT": 0.6,
            "MIN": 0.0,
            "MAX": 1.5
        }
    ]
}*/

// =========================================================
// Aurora Flow - ISF generative shader
// Técnica: Domain Warping recursivo (Inigo Quilez)
// Camada 1: fbm base
// Camada 2: distorção do espaço pelo fbm da camada 1
// Camada 3: distorção novamente pela camada 2 -> textura final
// =========================================================

// --- Hash determinístico 2D ---
float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

// --- Ruído de valor suavizado (smoothed value noise) ---
float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    // Curva de Hermite quintic (Perlin) para gradiente suave
    vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    float a = hash(i + vec2(0.0, 0.0));
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// --- Fractal Brownian Motion (5 oitavas) ---
float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, -0.6, 0.6, 0.8); // rotação por oitava (anti-aliasing direcional)
    for (int i = 0; i < 5; i++) {
        v += a * vnoise(p);
        p = rot * p * 2.02 + vec2(13.37, 7.13);
        a *= 0.5;
    }
    return v;
}

// --- Matriz de rotação 2D ---
mat2 rot2D(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, -s, s, c);
}

void main() {
    // Coordenadas normalizadas com correção de aspecto
    vec2 uv = isf_FragNormCoord;
    vec2 p  = (uv - 0.5) * vec2(RENDERSIZE.x / RENDERSIZE.y, 1.0);

    // Tempo escalado
    float t = TIME * speed;

    // Rotação global lenta para sensação de fluxo
    p = rot2D(TIME * rotation * 0.3) * p;
    p *= scale;

    // ---- Domain Warping recursivo ----
    vec2 q = vec2(
        fbm(p + vec2(0.0, 0.0) + vec2(t, -t * 0.7)),
        fbm(p + vec2(5.2, 1.3) - vec2(t * 0.5, t * 0.9))
    );

    vec2 r = vec2(
        fbm(p + warpAmount * q + vec2(1.7, 9.2) + 0.15 * t),
        fbm(p + warpAmount * q + vec2(8.3, 2.8) + 0.126 * t)
    );

    float f = fbm(p + warpAmount * r);

    // ---- Pulsação radial ----
    float dist = length(uv - 0.5);
    float pulseWave = pulse * sin(TIME * 1.2 - dist * 6.2831);
    f = clamp(f + pulseWave * 0.15, 0.0, 1.0);

    // ---- Mistura de paleta tripla ----
    vec3 col = mix(colorA.rgb, colorB.rgb, smoothstep(0.0, 0.85, f * 1.3));
    col = mix(col, colorC.rgb, clamp(length(q) * 0.75, 0.0, 1.0));
    col = mix(col, colorB.rgb * 1.15, clamp(r.x * r.y * 1.4, 0.0, 1.0));

    // Realce nos picos (highlights regenerativos)
    float highlight = smoothstep(0.55, 0.95, f);
    col += colorC.rgb * highlight * 0.35;

    // Modulação de intensidade
    col *= intensity * (0.55 + 0.55 * f);

    // ---- Vinheta suave ----
    float vig = 1.0 - smoothstep(0.35, 0.95, dist) * vignette;
    col *= vig;

    // Saída final
    gl_FragColor = vec4(col, 1.0);
}`;

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

try {
    renderer.loadSource(defaultFsSource);
    errorOverlay.style.display = 'none';
} catch (err) {
    errorOverlay.textContent = err.message || err;
    errorOverlay.style.display = 'block';
}

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

    // Group inputs by type for cleaner layout
    const floatInputs = [];
    const colorInputs = [];
    const boolInputs = [];
    const eventInputs = [];
    const longInputs = [];
    const point2DInputs = [];
    const otherInputs = [];

    for (const input of model.inputs) {
        switch (input.TYPE) {
            case 'float': floatInputs.push(input); break;
            case 'color': colorInputs.push(input); break;
            case 'bool': boolInputs.push(input); break;
            case 'event': eventInputs.push(input); break;
            case 'long': longInputs.push(input); break;
            case 'point2D': point2DInputs.push(input); break;
            default:
                if (input.TYPE !== 'image') otherInputs.push(input);
                break;
        }
    }

    controlsContainer.innerHTML = '';

    if (floatInputs.length) {
        controlsContainer.appendChild(createGroup('Parameters', floatInputs, createFloatControl));
    }
    if (colorInputs.length) {
        controlsContainer.appendChild(createGroup('Colors', colorInputs, createColorControl));
    }
    if (boolInputs.length) {
        controlsContainer.appendChild(createGroup('Toggles', boolInputs, createBoolControl));
    }
    if (eventInputs.length) {
        controlsContainer.appendChild(createGroup('Events', eventInputs, createEventControl));
    }
    if (longInputs.length) {
        controlsContainer.appendChild(createGroup('Options', longInputs, createLongControl));
    }
    if (point2DInputs.length) {
        controlsContainer.appendChild(createGroup('Points', point2DInputs, createPoint2DControl));
    }
}

function createGroup(title, inputs, builder) {
    const group = document.createElement('div');
    group.className = 'control-group';

    const label = document.createElement('div');
    label.className = 'control-group-label';
    label.textContent = title;
    group.appendChild(label);

    for (const input of inputs) {
        group.appendChild(builder(input));
    }

    return group;
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
    if (range <= 1) return 0.001;
    if (range <= 10) return 0.01;
    return 0.1;
}

function formatNum(n) {
    return Number(n).toFixed(2);
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

    // Draw the current frame
    renderer.draw(canvas);

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
    navigator.clipboard.writeText(defaultFsSource).then(() => {
        flashButton(document.getElementById('btn-copy'), '✅ Copied!');
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = defaultFsSource;
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
    const blob = new Blob([defaultFsSource], { type: 'text/plain' });
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

buildControls();
renderLoop();
window.addEventListener('resize', resizeCanvas);
