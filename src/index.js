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
        link.onload = () => { root.style.opacity = '1'; };
        
        link.href = cssUrl;
        document.head.appendChild(link);
    } else {
        // Show immediately if styles are already loaded
        setTimeout(() => { root.style.opacity = '1'; }, 10);
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

    // Initial Load
    function loadShader(code) {
        currentFsSource = code;
        try {
            renderer.loadSource(currentFsSource);
            errorOverlay.style.display = 'none';
            buildControls(renderer.model, controlsContainer, shaderDescription, renderer);
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
        root.classList.toggle('sidebar-open');
    });

    // File Loading Events
    const fileInput = root.querySelector('#file-input');
    const btnBrowse = root.querySelector('#btn-browse');
    const btnPaste = root.querySelector('#btn-paste');

    btnBrowse.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            loadShader(evt.target.result);
            flashButton(btnBrowse, '✅ Loaded!');
        };
        reader.readAsText(file);
        e.target.value = null; // Reset so same file can be selected again
    });

    btnPaste.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                loadShader(text);
                flashButton(btnPaste, '✅ Pasted!');
            }
        } catch (err) {
            console.error("Failed to read clipboard:", err);
            errorOverlay.textContent = 'Unable to paste. Make sure clipboard permissions are granted.';
            errorOverlay.style.display = 'block';
        }
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
