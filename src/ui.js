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
                <h1 class="sidebar-title">ISF Playground</h1>
                <span id="fps-counter" class="fps-badge">60 FPS</span>
            </div>

            <div class="sidebar-actions-header">
                <div class="dropdown">
                    <button class="btn-action btn-primary dropdown-toggle">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        <span>Import</span>
                        <svg class="chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                    <div class="dropdown-menu">
                        <button id="btn-browse" class="dropdown-item" title="Load local .fs file">
                            <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor"><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm8 3a1 1 0 00-1 1v2H7a1 1 0 000 2h2v2a1 1 0 002 0v-2h2a1 1 0 000-2h-2v-2a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                            <span>Browse .fs</span>
                        </button>
                        <button id="btn-paste" class="dropdown-item" title="Paste from clipboard">
                            <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/><path d="M6 3a3 3 0 00-3 3v8a3 3 0 003 3h4a3 3 0 003-3V6a3 3 0 00-3-3H6z"/><path d="M14 7a1 1 0 00-1 1v6a1 1 0 001 0h.5A2.5 2.5 0 0017 11.5v-2A2.5 2.5 0 0014.5 7H14z"/></svg>
                            <span>Paste ISF</span>
                        </button>
                    </div>
                </div>

                <div class="dropdown">
                    <button class="btn-action btn-secondary dropdown-toggle">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                        <span>Export</span>
                        <svg class="chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                    <div class="dropdown-menu">
                        <button id="btn-export" class="dropdown-item">
                            <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor"><path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"/></svg>
                            <span>Export .fs</span>
                        </button>
                        <button id="btn-copy" class="dropdown-item">
                            <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/><path d="M6 3a3 3 0 00-3 3v8a3 3 0 003 3h4a3 3 0 003-3V6a3 3 0 00-3-3H6z"/><path d="M14 7a1 1 0 00-1 1v6a1 1 0 001 0h.5A2.5 2.5 0 0017 11.5v-2A2.5 2.5 0 0014.5 7H14z"/></svg>
                            <span>Copy ISF</span>
                        </button>
                    </div>
                </div>

                <input type="file" id="file-input" accept=".fs" style="display: none;" />
            </div>

            <div class="sidebar-description" id="shader-description"></div>

            <div class="sidebar-body" id="controls-container"></div>

            <div class="sidebar-footer-actions" id="sidebar-footer-actions">
                <button id="btn-copy-inputs" class="btn-action btn-secondary" title="Copy input values"><span>Copy</span></button>
                <button id="btn-paste-inputs" class="btn-action btn-primary" title="Paste input values"><span>Paste</span></button>
                <button id="btn-reset-inputs" class="btn-action btn-danger" title="Reset to defaults"><span>Reset</span></button>
            </div>
        </aside>

        <div id="canvas-container">
            <canvas id="glcanvas"></canvas>
            <div id="error-overlay"></div>
        </div>

        <div id="clipboard-modal" class="isf-modal-overlay" style="display: none;">
            <div class="isf-modal">
                <div class="isf-modal-header">
                    <h2 id="modal-title">Clipboard Access</h2>
                    <button id="modal-close-btn" class="modal-close-icon">&times;</button>
                </div>
                <div class="isf-modal-body">
                    <p id="modal-message"></p>
                    <textarea id="modal-textarea" readonly></textarea>
                </div>
                <div class="isf-modal-footer">
                    <button id="modal-cancel" class="btn-action">Close</button>
                    <button id="modal-apply" class="btn-action btn-primary" style="display: none;">Apply</button>
                </div>
            </div>
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
            const row = document.createElement('div');
            row.className = 'control-row';
            row.appendChild(builder(input));
            controlsContainer.appendChild(row);
        }
    }
}

function createFloatControl(input, renderer) {
    const container = document.createElement('div');
    const labelRow = document.createElement('div');
    labelRow.className = 'control-label-row';

    const label = document.createElement('label');
    label.className = 'control-label';
    label.textContent = input.LABEL || input.NAME;

    const valueInput = document.createElement('input');
    valueInput.type = 'number';
    valueInput.className = 'control-value';
    valueInput.step = computeStep(input);
    if (input.MIN !== undefined) valueInput.min = input.MIN;
    if (input.MAX !== undefined) valueInput.max = input.MAX;
    valueInput.value = formatNum(input.DEFAULT !== undefined ? input.DEFAULT : 0);

    labelRow.appendChild(label);
    labelRow.appendChild(valueInput);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'range-slider';
    slider.step = computeStep(input);
    slider.min = input.MIN !== undefined ? input.MIN : 0;
    slider.max = input.MAX !== undefined ? input.MAX : 1;
    slider.value = input.DEFAULT !== undefined ? input.DEFAULT : 0;

    const update = (val) => {
        const num = parseFloat(val);
        renderer.setValue(input.NAME, num);
        valueInput.value = formatNum(num);
        slider.value = num;
    };

    slider.addEventListener('input', (e) => update(e.target.value));
    valueInput.addEventListener('input', (e) => update(e.target.value));

    container.appendChild(labelRow);
    container.appendChild(slider);
    return container;
}

function createColorControl(input, renderer) {
    const container = document.createElement('div');
    container.className = 'color-control';

    const label = document.createElement('div');
    label.className = 'control-label';
    label.style.marginBottom = '10px';
    label.textContent = input.LABEL || input.NAME;
    container.appendChild(label);

    const content = document.createElement('div');
    content.className = 'color-control';
    content.style.gap = '14px';

    const swatchWrapper = document.createElement('div');
    swatchWrapper.className = 'color-swatch-wrapper';

    const swatch = document.createElement('div');
    swatch.className = 'color-swatch';

    const nativeInput = document.createElement('input');
    nativeInput.type = 'color';
    nativeInput.className = 'color-native-input';

    const initialColor = input.DEFAULT || [0, 0, 0, 1];
    updateSwatchColor(swatch, initialColor);
    nativeInput.value = rgbaToHex(initialColor);

    swatchWrapper.appendChild(swatch);
    swatchWrapper.appendChild(nativeInput);

    const sliders = document.createElement('div');
    sliders.className = 'color-sliders';

    const channels = ['r', 'g', 'b', 'a'];
    const colorSliders = channels.map((ch, i) => {
        const row = document.createElement('div');
        row.className = 'color-channel-row';

        const chLabel = document.createElement('span');
        chLabel.className = 'color-channel-label';
        chLabel.textContent = ch.toUpperCase();

        const chSlider = document.createElement('input');
        chSlider.type = 'range';
        chSlider.className = `color-channel-slider ch-${ch}`;
        chSlider.min = 0;
        chSlider.max = 1;
        chSlider.step = 0.01;
        chSlider.value = initialColor[i] !== undefined ? initialColor[i] : 1;

        row.appendChild(chLabel);
        row.appendChild(chSlider);
        return chSlider;
    });

    const update = () => {
        const rgba = colorSliders.map(s => parseFloat(s.value));
        renderer.setValue(input.NAME, rgba);
        updateSwatchColor(swatch, rgba);
        nativeInput.value = rgbaToHex(rgba);
    };

    colorSliders.forEach(s => s.addEventListener('input', update));
    nativeInput.addEventListener('input', (e) => {
        const rgba = hexToRgba(e.target.value);
        colorSliders.forEach((s, i) => { if (i < 3) s.value = rgba[i]; });
        update();
    });

    content.appendChild(swatchWrapper);
    content.appendChild(sliders);
    colorSliders.forEach(s => sliders.appendChild(s.parentElement));

    container.appendChild(content);
    return container;
}

function createBoolControl(input, renderer) {
    const container = document.createElement('div');
    container.className = 'toggle-row';

    const label = document.createElement('label');
    label.className = 'control-label';
    label.textContent = input.LABEL || input.NAME;

    const toggle = document.createElement('label');
    toggle.className = 'toggle-switch';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!input.DEFAULT;

    const track = document.createElement('span');
    track.className = 'toggle-track';

    checkbox.addEventListener('change', (e) => {
        renderer.setValue(input.NAME, e.target.checked);
    });

    toggle.appendChild(checkbox);
    toggle.appendChild(track);
    container.appendChild(label);
    container.appendChild(toggle);
    return container;
}

function createEventControl(input, renderer) {
    const btn = document.createElement('button');
    btn.className = 'event-btn';
    btn.style.width = '100%';
    btn.textContent = input.LABEL || input.NAME;

    btn.addEventListener('mousedown', () => renderer.setValue(input.NAME, true));
    btn.addEventListener('mouseup', () => renderer.setValue(input.NAME, false));
    return btn;
}

function createLongControl(input, renderer) {
    const container = document.createElement('div');

    const label = document.createElement('label');
    label.className = 'control-label';
    label.style.display = 'block';
    label.style.marginBottom = '8px';
    label.textContent = input.LABEL || input.NAME;

    const select = document.createElement('select');
    select.className = 'isf-select';

    if (input.VALUES && input.LABELS) {
        input.VALUES.forEach((val, i) => {
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = input.LABELS[i];
            if (val === input.DEFAULT) opt.selected = true;
            select.appendChild(opt);
        });
    }

    select.addEventListener('change', (e) => {
        renderer.setValue(input.NAME, parseInt(e.target.value));
    });

    container.appendChild(label);
    container.appendChild(select);
    return container;
}

function createPoint2DControl(input, renderer) {
    const container = document.createElement('div');

    const label = document.createElement('label');
    label.className = 'control-label';
    label.style.display = 'block';
    label.style.marginBottom = '10px';
    label.textContent = input.LABEL || input.NAME;
    container.appendChild(label);

    const sliders = document.createElement('div');
    sliders.className = 'point2d-sliders';

    const currentPos = input.DEFAULT || [0, 0];
    const axes = ['X', 'Y'];
    const pointSliders = axes.map((axis, i) => {
        const row = document.createElement('div');
        row.className = 'point2d-row';

        const axisLabel = document.createElement('span');
        axisLabel.className = 'point2d-label';
        axisLabel.textContent = axis;

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.className = 'point2d-slider';
        slider.min = 0;
        slider.max = 1;
        slider.step = 0.001;
        slider.value = currentPos[i];

        const valueInput = document.createElement('input');
        valueInput.type = 'number';
        valueInput.className = 'point2d-value';
        valueInput.step = 0.01;
        valueInput.value = formatNum(currentPos[i]);

        row.appendChild(axisLabel);
        row.appendChild(slider);
        row.appendChild(valueInput);
        sliders.appendChild(row);

        return { slider, valueInput };
    });

    const update = () => {
        const pos = pointSliders.map(p => parseFloat(p.slider.value));
        renderer.setValue(input.NAME, pos);
        pointSliders.forEach((p, i) => {
            p.valueInput.value = formatNum(pos[i]);
        });
    };

    pointSliders.forEach(p => {
        p.slider.addEventListener('input', update);
        p.valueInput.addEventListener('input', (e) => {
            p.slider.value = e.target.value;
            update();
        });
    });

    container.appendChild(sliders);
    return container;
}
