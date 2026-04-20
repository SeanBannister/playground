import { Renderer } from 'https://esm.sh/interactive-shader-format';

export function isfPlayground(shaderCode, container = document.body) {
    // 1. Inject Styles
    if (!document.getElementById('isf-playground-styles')) {
        const link = document.createElement('link');
        link.id = 'isf-playground-styles';
        link.rel = 'stylesheet';
        const cssUrl = new URL('./styles.css', import.meta.url).href;
        link.href = cssUrl;
        document.head.appendChild(link);
    }

    // 2. Generate HTML
    const root = document.createElement('div');
    root.className = 'isf-playground-root';
    root.innerHTML = `
        <button id="sidebar-toggle" class="sidebar-toggle" aria-label="Toggle sidebar">
            <svg id="toggle-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line class="hamburger-line top" x1="3" y1="6" x2="21" y2="6" />
                <line class="hamburger-line middle" x1="3" y1="12" x2="21" y2="12" />
                <line class="hamburger-line bottom" x1="3" y1="18" x2="21" y2="18" />
            </svg>
        </button>

        <aside id="sidebar" class="sidebar">
            <div class="sidebar-header">
                <h1 class="sidebar-title">✨ ISF Playground</h1>
                <span id="fps-counter" class="fps-badge">60 FPS</span>
            </div>

            <div class="sidebar-description" id="shader-description"></div>

            <div class="sidebar-body" id="controls-container"></div>

            <div class="sidebar-footer">
                <button id="btn-export" class="btn-action btn-secondary">
                    <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor"><path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"/></svg>
                    Export .fs
                </button>
                <button id="btn-copy" class="btn-action">
                    <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/><path d="M6 3a3 3 0 00-3 3v8a3 3 0 003 3h4a3 3 0 003-3V6a3 3 0 00-3-3H6z"/><path d="M14 7a1 1 0 00-1 1v6a1 1 0 001 0h.5A2.5 2.5 0 0017 11.5v-2A2.5 2.5 0 0014.5 7H14z"/></svg>
                    Copy ISF
                </button>
            </div>
        </aside>

        <div id="canvas-container">
            <canvas id="glcanvas"></canvas>
            <div id="error-overlay"></div>
        </div>
    `;
    container.appendChild(root);

    // State Variables
    let currentFsSource = shaderCode || '';
    const canvas = root.querySelector('#glcanvas');
    const gl = canvas.getContext('webgl');
    const errorOverlay = root.querySelector('#error-overlay');
    const fpsCounter = root.querySelector('#fps-counter');
    const sidebarToggle = root.querySelector('#sidebar-toggle');
    const controlsContainer = root.querySelector('#controls-container');
    const shaderDescription = root.querySelector('#shader-description');
    let frameCount = 0;
    let lastFpsTime = performance.now();
    let animationFrameId = null;

    if (!gl) {
        errorOverlay.textContent = 'WebGL is not supported by your browser.';
        errorOverlay.style.display = 'block';
        return;
    }

    const renderer = new Renderer(gl);

    // Initial Load
    function loadShader(code) {
        currentFsSource = code;
        try {
            renderer.loadSource(currentFsSource);
            errorOverlay.style.display = 'none';
            buildControls();
        } catch (err) {
            errorOverlay.textContent = err.message || err;
            errorOverlay.style.display = 'block';
            console.error(err);
        }
    }
    
    if (currentFsSource) {
        loadShader(currentFsSource);
    }

    // UI Events
    sidebarToggle.addEventListener('click', () => {
        // Toggle scoping it to the root wrapper
        root.classList.toggle('sidebar-open');
    });

    // Control Builders
    function buildControls() {
        const model = renderer.model;
        if (!model || !model.inputs) return;

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

        const rgba = input.DEFAULT ? [...input.DEFAULT] : [1, 1, 1, 1];
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

        nativeInput.addEventListener('input', () => {
            const parsed = hexToRgba(nativeInput.value);
            rgba[0] = parsed[0];
            rgba[1] = parsed[1];
            rgba[2] = parsed[2];
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

    // Render loop and resizing
    function resizeCanvas() {
        const displayWidth = canvas.clientWidth;
        const displayHeight = canvas.clientHeight;
        if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
            canvas.width = displayWidth;
            canvas.height = displayHeight;
        }
    }

    function renderLoop() {
        resizeCanvas();
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
        animationFrameId = requestAnimationFrame(renderLoop);
    }

    // Start Rendering
    renderLoop();
    window.addEventListener('resize', resizeCanvas);

    // Export Buttons Logic
    root.querySelector('#btn-copy').addEventListener('click', (e) => {
        navigator.clipboard.writeText(currentFsSource).then(() => {
            flashButton(e.currentTarget, '✅ Copied!');
        }).catch(() => {
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
                flashButton(e.currentTarget, '✅ Copied!');
            } catch (err) {}
            document.body.removeChild(textArea);
        });
    });

    root.querySelector('#btn-export').addEventListener('click', (e) => {
        const blob = new Blob([currentFsSource], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'aurora_flow.fs';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        flashButton(e.currentTarget, '✅ Exported!');
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

    // Return the instance api
    return {
        loadShader: loadShader,
        destroy: () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', resizeCanvas);
            root.remove();
        }
    };
}

// Helpers
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
    return Number(num.toFixed(4)).toString();
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
