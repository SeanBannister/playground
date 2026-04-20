import { computeStep, formatNum, updateSwatchColor, rgbaToHex, hexToRgba } from './helpers.js';

export function createPlaygroundDOM() {
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

            <div class="sidebar-actions-header">
                <button id="btn-browse" class="btn-action btn-secondary" title="Load local .fs file">
                    <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor"><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm8 3a1 1 0 00-1 1v2H7a1 1 0 000 2h2v2a1 1 0 002 0v-2h2a1 1 0 000-2h-2v-2a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                    Browse .fs
                </button>
                <button id="btn-paste" class="btn-action btn-secondary" title="Paste from clipboard">
                    <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/><path d="M6 3a3 3 0 00-3 3v8a3 3 0 003 3h4a3 3 0 003-3V6a3 3 0 00-3-3H6z"/><path d="M14 7a1 1 0 00-1 1v6a1 1 0 001 0h.5A2.5 2.5 0 0017 11.5v-2A2.5 2.5 0 0014.5 7H14z"/></svg>
                    Paste ISF
                </button>
                <input type="file" id="file-input" accept=".fs" style="display: none;" />
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
    return root;
}

export function buildControls(model, controlsContainer, shaderDescription, renderer) {
    if (!model || !model.inputs) return;

    if (model.description) {
        shaderDescription.textContent = model.description;
    }

    controlsContainer.innerHTML = '';

    const builders = {
        'float': (input) => createFloatControl(input, renderer),
        'color': (input) => createColorControl(input, renderer),
        'bool': (input) => createBoolControl(input, renderer),
        'event': (input) => createEventControl(input, renderer),
        'long': (input) => createLongControl(input, renderer),
        'point2D': (input) => createPoint2DControl(input, renderer)
    };

    for (const input of model.inputs) {
        const builder = builders[input.TYPE];
        if (builder) {
            controlsContainer.appendChild(builder(input));
        }
    }
}

function createFloatControl(input, renderer) {
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

function createColorControl(input, renderer) {
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

function createBoolControl(input, renderer) {
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

function createEventControl(input, renderer) {
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

function createLongControl(input, renderer) {
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

function createPoint2DControl(input, renderer) {
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
