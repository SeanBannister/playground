/*{
    "DESCRIPTION": "Aurora Flow - generative organic field with recursive domain warping, triple palette and radial pulse. Inspired by northern lights patterns and ink flows.",
    "CREDIT": "ISF video generator",
    "ISFVSN": "2",
    "CATEGORIES": ["GENERATOR", "NOISE", "ORGANIC"],
    "INPUTS": [
        {
            "NAME": "scale",
            "LABEL": "Scale",
            "TYPE": "float",
            "DEFAULT": 2.8,
            "MIN": 0.5,
            "MAX": 10.0
        },
        {
            "NAME": "speed",
            "LABEL": "Speed",
            "TYPE": "float",
            "DEFAULT": 0.25,
            "MIN": 0.0,
            "MAX": 2.0
        },
        {
            "NAME": "warpAmount",
            "LABEL": "Warp Amount",
            "TYPE": "float",
            "DEFAULT": 1.6,
            "MIN": 0.0,
            "MAX": 4.0
        },
        {
            "NAME": "rotation",
            "LABEL": "Rotation",
            "TYPE": "float",
            "DEFAULT": 0.15,
            "MIN": -1.0,
            "MAX": 1.0
        },
        {
            "NAME": "pulse",
            "LABEL": "Pulse",
            "TYPE": "float",
            "DEFAULT": 0.4,
            "MIN": 0.0,
            "MAX": 1.5
        },
        {
            "NAME": "colorA",
            "LABEL": "Deep Color",
            "TYPE": "color",
            "DEFAULT": [0.05, 0.02, 0.25, 1.0]
        },
        {
            "NAME": "colorB",
            "LABEL": "Mid Color",
            "TYPE": "color",
            "DEFAULT": [0.85, 0.20, 0.55, 1.0]
        },
        {
            "NAME": "colorC",
            "LABEL": "Glow Color",
            "TYPE": "color",
            "DEFAULT": [1.0, 0.90, 0.45, 1.0]
        },
        {
            "NAME": "intensity",
            "LABEL": "Intensity",
            "TYPE": "float",
            "DEFAULT": 1.0,
            "MIN": 0.1,
            "MAX": 2.5
        },
        {
            "NAME": "vignette",
            "LABEL": "Vignette",
            "TYPE": "float",
            "DEFAULT": 0.6,
            "MIN": 0.0,
            "MAX": 1.5
        }
    ]
}*/

// =========================================================
// Aurora Flow - ISF generative shader
// Technique: Recursive Domain Warping (Inigo Quilez)
// Layer 1: base fbm
// Layer 2: space distortion by layer 1 fbm
// Layer 3: distortion again by layer 2 -> final texture
// =========================================================

// --- Deterministic 2D Hash ---
float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

// --- Smoothed value noise ---
float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    // Quintic Hermite curve (Perlin) for smooth gradient
    vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    float a = hash(i + vec2(0.0, 0.0));
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// --- Fractal Brownian Motion (5 octaves) ---
float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, -0.6, 0.6, 0.8); // rotation per octave (directional anti-aliasing)
    for (int i = 0; i < 5; i++) {
        v += a * vnoise(p);
        p = rot * p * 2.02 + vec2(13.37, 7.13);
        a *= 0.5;
    }
    return v;
}

// --- 2D rotation matrix ---
mat2 rot2D(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, -s, s, c);
}

void main() {
    // Normalized coordinates with aspect correction
    vec2 uv = isf_FragNormCoord;
    vec2 p  = (uv - 0.5) * vec2(RENDERSIZE.x / RENDERSIZE.y, 1.0);

    // Scaled time
    float t = TIME * speed;

    // Slow global rotation for flow sensation
    p = rot2D(TIME * rotation * 0.3) * p;
    p *= scale;

    // ---- Recursive Domain Warping ----
    vec2 q = vec2(
        fbm(p + vec2(0.0, 0.0) + vec2(t, -t * 0.7)),
        fbm(p + vec2(5.2, 1.3) - vec2(t * 0.5, t * 0.9))
    );

    vec2 r = vec2(
        fbm(p + warpAmount * q + vec2(1.7, 9.2) + 0.15 * t),
        fbm(p + warpAmount * q + vec2(8.3, 2.8) + 0.126 * t)
    );

    float f = fbm(p + warpAmount * r);

    // ---- Radial pulsation ----
    float dist = length(uv - 0.5);
    float pulseWave = pulse * sin(TIME * 1.2 - dist * 6.2831);
    f = clamp(f + pulseWave * 0.15, 0.0, 1.0);

    // ---- Triple palette mixing ----
    vec3 col = mix(colorA.rgb, colorB.rgb, smoothstep(0.0, 0.85, f * 1.3));
    col = mix(col, colorC.rgb, clamp(length(q) * 0.75, 0.0, 1.0));
    col = mix(col, colorB.rgb * 1.15, clamp(r.x * r.y * 1.4, 0.0, 1.0));

    // Peak highlights (regenerative highlights)
    float highlight = smoothstep(0.55, 0.95, f);
    col += colorC.rgb * highlight * 0.35;

    // Intensity modulation
    col *= intensity * (0.55 + 0.55 * f);

    // ---- Smooth vignette ----
    float vig = 1.0 - smoothstep(0.35, 0.95, dist) * vignette;
    col *= vig;

    // Final output
    gl_FragColor = vec4(col, 1.0);
}