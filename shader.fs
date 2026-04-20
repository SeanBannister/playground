/*{
    "DESCRIPTION": "Fractal 29_gaz: A recursive KIFS fractal tunnel using spherical inversion.",
    "CREDIT": "gaz (converted by Gemini) https://www.shadertoy.com/view/wtGfRy",
    "ISFVSN": "2",
    "CATEGORIES": [
        "Fractal", "Raymarching", "Infinite"
    ],
    "INPUTS": [
        {
            "NAME": "fractalSpeed",
            "TYPE": "float",
            "MIN": 0.0,
            "MAX": 1.0,
            "DEFAULT": 0.3
        },
        {
            "NAME": "glowIntensity",
            "TYPE": "float",
            "MIN": 0.0,
            "MAX": 0.0002,
            "DEFAULT": 0.00005
        }
    ]
}*/

#ifdef GL_ES
precision highp float;
#endif

// Rodrigues' Rotation Formula macro: rotates vector 'p' around axis 'a' by 'r' radians
#define R(p,a,r)mix(a*dot(p,a),p,cos(r))+sin(r)*cross(p,a)

void main() {
    vec4 O = vec4(0.0);
    vec2 C = gl_FragCoord.xy;
    vec3 p, r = vec3(RENDERSIZE.xy, 0.0);
    
    // Normalize ray direction from pixel coordinates
    vec3 d = normalize(vec3((C - 0.5 * r.xy) / r.y, 1.0));  
    
    // Main Raymarching Loop
    float g = 0.0; // Total distance traveled along the ray
    float e, s;    // 'e' is the step size/scale, 's' is the accumulator for fractal scaling
    
    for(float i = 0.0; i < 99.0; i++) {
        p = g * d;           // Current position in 3D space
        p.z += TIME * fractalSpeed; // Move camera forward along Z-axis
        
        // Rotate the entire world space to create variety
        p = R(p, normalize(vec3(1, 2, 3)), 0.5);   
        
        s = 2.5;
        // Modulo repetition to make the fractal infinite in all directions
        p = abs(mod(p - 1.0, 2.0) - 1.0) - 1.0;
        
        // Fractal Recursive Loop (The "Folding")
        // 
        for(int j = 0; j < 10; j++) {
            p = 1.0 - abs(p - 1.0); // Folding space
            
            // Spherical Inversion: The heart of the "Apollonian" fractal look
            // 
            e = -1.8 / dot(p, p); 
            s *= e;                 // Track the total scale multiplier
            p = p * e - 0.7;        // Apply scale and offset
        }
        
        // Distance estimation step
        e = abs(p.z) / s + 0.001; 
        g += e;
        
        // Coloring logic based on scale 's' and distance 'dot(p,p)'
        O.xyz += glowIntensity * abs(cos(vec3(3, 2, 1) + log(abs(s * 9.0)))) / dot(p, p) / e;
    }
    
    gl_FragColor = vec4(O.xyz, 1.0);
}