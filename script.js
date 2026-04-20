import { Renderer } from 'https://esm.sh/interactive-shader-format';

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
}
`;

const canvas = document.getElementById('glcanvas');
const gl = canvas.getContext('webgl');
const errorOverlay = document.getElementById('error-overlay');
const fpsCounter = document.getElementById('fps-counter');

if (!gl) {
    errorOverlay.textContent = 'WebGL is not supported by your browser.';
    errorOverlay.style.display = 'block';
}

// Initialize the robust official Renderer!
const renderer = new Renderer(gl);

try {
    renderer.loadSource(defaultFsSource);
    errorOverlay.style.display = 'none';
} catch (err) {
    errorOverlay.textContent = err.message || err;
    errorOverlay.style.display = 'block';
}

function resizeCanvas() {
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
    }
}

let animationFrameId;
let frameCount = 0;
let lastFpsTime = performance.now();

function renderLoop() {
    resizeCanvas();
    
    // Draw the current frame using the official library!
    renderer.draw(canvas);

    frameCount++;
    const now = performance.now();
    if (now - lastFpsTime >= 1000) {
        fpsCounter.textContent = frameCount + ' FPS';
        frameCount = 0;
        lastFpsTime = now;
    }

    animationFrameId = requestAnimationFrame(renderLoop);
}

document.getElementById('btn-copy').addEventListener('click', () => {
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
        const btn = document.getElementById('btn-copy');
        const originalContent = btn.innerHTML;
        btn.innerHTML = '✅ Copied!';
        
        btn.classList.add('success');

        setTimeout(() => {
            btn.innerHTML = originalContent;
            btn.classList.remove('success');
        }, 2000);
    } catch (err) {
        console.error('Unable to copy code', err);
    }

    document.body.removeChild(textArea);
});

document.getElementById('btn-export').addEventListener('click', () => {
    // Create a Blob from the ISF string
    const blob = new Blob([defaultFsSource], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link element to trigger the download
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aurora_flow.fs'; 
    document.body.appendChild(a);
    a.click();
    
    // Clean up the DOM and memory
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Give a little visual success feedback on the button
    const btn = document.getElementById('btn-export');
    const originalContent = btn.innerHTML;
    btn.innerHTML = '✅ Exported!';
    btn.classList.add('success');

    setTimeout(() => {
        btn.innerHTML = originalContent;
        btn.classList.remove('success');
    }, 2000);
});

// Start the magic loop!
renderLoop();
window.addEventListener('resize', resizeCanvas);
