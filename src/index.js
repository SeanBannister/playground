import { Renderer } from 'https://esm.sh/interactive-shader-format';
import { flashButton } from './helpers.js';
import { createPlaygroundDOM, buildControls } from './ui.js';

export function isfPlayground(shaderCode, container = document.body) {
    // 1. Generate HTML
    const root = createPlaygroundDOM();
    
    // Hide initially to prevent Flash of Unstyled Content (FOUC)
    root.style.opacity = '0';
    root.style.transition = 'opacity 0.3s ease';

    // 2. Inject Styles
    if (!document.getElementById('isf-playground-styles')) {
        const link = document.createElement('link');
        link.id = 'isf-playground-styles';
        link.rel = 'stylesheet';
        const cssUrl = new URL('./styles.css', import.meta.url).href;
        
        // Wait for CSS to load before showing UI
        link.onload = () => { 
            root.style.opacity = '1'; 
            // Enable transitions after a short delay to ensure initial state is rendered without animation
            setTimeout(() => root.classList.add('ready'), 100);
        };
        
        link.href = cssUrl;
        document.head.appendChild(link);
    } else {
        // Show immediately if styles are already loaded
        setTimeout(() => { 
            root.style.opacity = '1'; 
            setTimeout(() => root.classList.add('ready'), 100);
        }, 10);
    }

    // 3. Mount HTML
    container.appendChild(root);

    // 3. State Variables
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

    // State to track input changes
    let originalDefaults = {};
    let currentInputValues = {};
    let isInitialLoad = true;

    function areValuesEqual(val1, val2) {
        if (Array.isArray(val1) && Array.isArray(val2)) {
            if (val1.length !== val2.length) return false;
            for (let i = 0; i < val1.length; i++) {
                if (val1[i] !== val2[i]) return false;
            }
            return true;
        }
        return val1 === val2;
    }

    function checkIfValuesChanged() {
        let hasChanged = false;
        for (const key in originalDefaults) {
            if (!areValuesEqual(originalDefaults[key], currentInputValues[key])) {
                hasChanged = true;
                break;
            }
        }
        const footer = root.querySelector('#sidebar-footer-actions');
        if (footer) {
            footer.classList.toggle('visible', hasChanged);
        }
    }

    // Proxy setValue to track changes and show buttons
    const originalSetValue = renderer.setValue.bind(renderer);
    renderer.setValue = (name, value) => {
        originalSetValue(name, value);
        currentInputValues[name] = Array.isArray(value) ? [...value] : value;
        
        if (!isInitialLoad) {
            checkIfValuesChanged();
        }
    };

    // Initial Load
    function loadShader(code) {
        currentFsSource = code;
        try {
            isInitialLoad = true;
            renderer.loadSource(currentFsSource);
            
            if (!renderer.valid || renderer.error) {
                throw new Error(renderer.error || 'Shader compilation failed with no specific error message.');
            }

            originalDefaults = {};
            currentInputValues = {};
            if (renderer.model && renderer.model.inputs) {
                renderer.model.inputs.forEach(input => {
                    const defaultVal = input.DEFAULT !== undefined ? (Array.isArray(input.DEFAULT) ? [...input.DEFAULT] : input.DEFAULT) : 0;
                    originalDefaults[input.NAME] = Array.isArray(defaultVal) ? [...defaultVal] : defaultVal;
                    currentInputValues[input.NAME] = Array.isArray(defaultVal) ? [...defaultVal] : defaultVal;
                });
            }

            const footer = root.querySelector('#sidebar-footer-actions');
            if (footer) footer.classList.remove('visible');

            errorOverlay.style.display = 'none';
            buildControls(renderer.model, controlsContainer, shaderDescription, renderer);
            isInitialLoad = false;
        } catch (err) {
            errorOverlay.textContent = err.message || err;
            errorOverlay.style.display = 'block';
            console.error("ISF Shader Error:", err.message || err);
            isInitialLoad = false;
        }
    }
    
    if (currentFsSource) {
        loadShader(currentFsSource);
    }

    // UI Events
    sidebarToggle.addEventListener('click', () => {
        root.classList.toggle('sidebar-open');
    });

    // Close sidebar when clicking outside
    window.addEventListener('mousedown', (e) => {
        const sidebar = root.querySelector('#sidebar');
        const isToggle = sidebarToggle.contains(e.target);
        const isSidebar = sidebar.contains(e.target);
        
        if (root.classList.contains('sidebar-open') && !isToggle && !isSidebar) {
            root.classList.remove('sidebar-open');
        }
    });

    // Sidebar Resizing
    const sidebar = root.querySelector('#sidebar');
    const resizer = root.querySelector('#sidebar-resizer');
    let isResizing = false;

    resizer?.addEventListener('mousedown', (e) => {
        isResizing = true;
        root.classList.add('resizing');
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', stopResizing);
        e.preventDefault();
    });

    function handleMouseMove(e) {
        if (!isResizing) return;
        const newWidth = Math.min(Math.max(280, e.clientX), 800);
        root.style.setProperty('--sidebar-width', `${newWidth}px`);
    }

    function stopResizing() {
        isResizing = false;
        root.classList.remove('resizing');
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', stopResizing);
    }

    // File Loading Events
    const fileInput = root.querySelector('#file-input');
    const btnBrowse = root.querySelector('#btn-browse');
    const btnPaste = root.querySelector('#btn-paste');

    const showClipboardModal = (title, message, content = '', onApply = null) => {
        const modal = root.querySelector('#clipboard-modal');
        const titleEl = modal.querySelector('#modal-title');
        const messageEl = modal.querySelector('#modal-message');
        const textarea = modal.querySelector('#modal-textarea');
        const applyBtn = modal.querySelector('#modal-apply');
        const cancelBtn = modal.querySelector('#modal-cancel');
        const closeIcon = modal.querySelector('#modal-close-btn');

        titleEl.textContent = title;
        messageEl.textContent = message;
        messageEl.style.color = 'var(--text-secondary)';
        textarea.value = content;
        textarea.readOnly = !onApply;
        applyBtn.style.display = onApply ? 'block' : 'none';
        
        const closeModal = () => {
            modal.style.display = 'none';
            applyBtn.onclick = null;
            cancelBtn.onclick = null;
            closeIcon.onclick = null;
            textarea.oncopy = null;
            textarea.onpaste = null;
        };

        textarea.oncopy = () => {
            if (!onApply) { // Only for copy mode
                messageEl.textContent = 'Copied!';
                messageEl.style.color = 'var(--success)';
                setTimeout(closeModal, 800);
            }
        };

        textarea.onpaste = (e) => {
            if (onApply) { // Only for paste mode
                messageEl.textContent = 'Pasted!';
                messageEl.style.color = 'var(--success)';
                // Short delay to let the paste hit the textarea
                setTimeout(() => {
                    onApply(textarea.value);
                    closeModal();
                }, 800);
            }
        };

        applyBtn.onclick = () => {
            if (onApply) onApply(textarea.value);
            closeModal();
        };
        cancelBtn.onclick = closeModal;
        closeIcon.onclick = closeModal;

        modal.style.display = 'flex';
        if (!onApply) {
            textarea.select();
        } else {
            textarea.focus();
        }
    };

    btnBrowse.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            loadShader(evt.target.result);
            flashButton(btnBrowse, 'Loaded!');
        };
        reader.readAsText(file);
        e.target.value = null; // Reset so same file can be selected again
    });

    btnPaste.addEventListener('click', async () => {
        const pasteAction = (text) => {
            if (text) {
                loadShader(text);
                flashButton(btnPaste, 'Pasted!');
            }
        };

        try {
            const text = await navigator.clipboard.readText();
            pasteAction(text);
        } catch (err) {
            console.warn('Clipboard read failed, showing fallback modal:', err);
            showClipboardModal(                'Paste ISF',
                'We were unable to access your clipboard automatically. Please paste your ISF shader code into the area below using Ctrl+V (or Cmd+V) and click Apply.',
                '',
                pasteAction
            );
        }
    });

    // Input actions Events
    root.querySelector('#btn-copy-inputs').addEventListener('click', (e) => {
        const btn = e.currentTarget;
        if (!renderer.model || !renderer.model.inputs) return;
        
        // Format as ISF INPUTS array for easy reuse
        // We only pick serializable properties to avoid issues with Clipboard API / JSON.stringify
        const isfInputs = renderer.model.inputs.map(input => {
            const cleanInput = {};
            ['NAME', 'TYPE', 'LABEL', 'MIN', 'MAX', 'STEP', 'VALUES', 'LABELS'].forEach(key => {
                if (input[key] !== undefined) cleanInput[key] = input[key];
            });
            cleanInput.DEFAULT = currentInputValues[input.NAME];
            return cleanInput;
        });

        try {
            const content = JSON.stringify(isfInputs, null, 2);
            navigator.clipboard.writeText(content).then(() => {
                flashButton(btn, 'Copied!');
            }).catch((err) => {
                console.warn('Clipboard API failed, showing fallback modal:', err);
                showClipboardModal(
                    'Copy Inputs',
                    'We were unable to access your clipboard automatically. Please copy the input values from the area below using Ctrl+C (or Cmd+C).',
                    content
                );
            });
        } catch (err) {
            console.error('Failed to stringify inputs:', err);
            flashButton(btn, 'Error!');
        }
    });

    root.querySelector('#btn-paste-inputs').addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        const pasteInputsAction = (text) => {
            try {
                let pastedData = JSON.parse(text);
                if (!renderer.model || !renderer.model.inputs) return;
                
                // Handle both plain object and ISF INPUTS array format
                const getValue = (name) => {
                    if (Array.isArray(pastedData)) {
                        const found = pastedData.find(item => item.NAME === name);
                        return found ? found.DEFAULT : undefined;
                    }
                    return pastedData[name];
                };

                isInitialLoad = true;
                renderer.model.inputs.forEach(input => {
                    const newVal = getValue(input.NAME);
                    if (newVal !== undefined) {
                        const val = Array.isArray(newVal) ? [...newVal] : newVal;
                        input.DEFAULT = val;
                        renderer.setValue(input.NAME, val);
                        currentInputValues[input.NAME] = val;
                    }
                });
                buildControls(renderer.model, controlsContainer, shaderDescription, renderer);
                isInitialLoad = false;
                
                checkIfValuesChanged();
                flashButton(btn, 'Pasted!');
            } catch (err) {
                console.error('Failed to parse pasted inputs:', err);
                flashButton(btn, 'Error!');
            }
        };

        try {
            const text = await navigator.clipboard.readText();
            pasteInputsAction(text);
        } catch (err) {
            console.warn('Clipboard read failed (inputs), showing fallback modal:', err);
            showClipboardModal(
                'Paste Inputs',
                'We were unable to access your clipboard automatically. Please paste your input JSON into the area below using Ctrl+V (or Cmd+V) and click Apply.',
                '',
                pasteInputsAction
            );
        }
    });

    root.querySelector('#btn-reset-inputs').addEventListener('click', (e) => {
        if (!renderer.model || !renderer.model.inputs) return;

        isInitialLoad = true;
        renderer.model.inputs.forEach(input => {
            if (originalDefaults[input.NAME] !== undefined) {
                const val = Array.isArray(originalDefaults[input.NAME]) ? [...originalDefaults[input.NAME]] : originalDefaults[input.NAME];
                input.DEFAULT = val;
                renderer.setValue(input.NAME, val);
                currentInputValues[input.NAME] = val;
            }
        });
        buildControls(renderer.model, controlsContainer, shaderDescription, renderer);
        isInitialLoad = false;

        checkIfValuesChanged();
        flashButton(e.currentTarget, 'Reset!');
    });
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
            try {
                renderer.draw(canvas);
                
                // If the drawing caused an error state without throwing
                if (renderer.error) {
                    throw new Error(renderer.error);
                }
            } catch (err) {
                // If draw loop throws, catch it once to show on screen
                renderer.valid = false;
                errorOverlay.textContent = err.message || err;
                errorOverlay.style.display = 'block';
                console.error("ISF Render Error:", err.message || err);
            }
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
        const btn = e.currentTarget;
        navigator.clipboard.writeText(currentFsSource).then(() => {
            flashButton(btn, 'Copied!');
        }).catch(() => {
            showClipboardModal(
                'Copy ISF',
                'We were unable to access your clipboard automatically. Please copy the shader code from the area below using Ctrl+C (or Cmd+C).',
                currentFsSource
            );
        });
    });

    root.querySelector('#btn-export').addEventListener('click', (e) => {
        const btn = e.currentTarget;
        const blob = new Blob([currentFsSource], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'aurora_flow.fs';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        flashButton(btn, 'Exported!');
    });

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
