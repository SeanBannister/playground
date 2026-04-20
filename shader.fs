/*{
    "CREDIT": "20Block Radius",
    "DESCRIPTION": "Dual interacting melt fields with independent size control",
    "CATEGORIES": [ "generator" ],
    "INPUTS": [
        { "NAME": "noiseIntensity", "TYPE": "float", "DEFAULT": 6.0, "MIN": 0.0, "MAX": 10.0 },
        { "NAME": "noiseScaleX", "TYPE": "float", "DEFAULT": 5.5, "MIN": 0.1, "MAX": 10.0 },
        { "NAME": "noiseScaleY", "TYPE": "float", "DEFAULT": 3.5, "MIN": 0.1, "MAX": 10.0 },
        { "NAME": "wavePhase", "TYPE": "float", "DEFAULT": 0.2, "MIN": 0.0, "MAX": 1.0 },
        { "NAME": "rotationAmount", "TYPE": "float", "DEFAULT": 0.0, "MIN": -3.14, "MAX": 3.14 },
        { "NAME": "colorTint", "TYPE": "color", "DEFAULT": [1,1,1,1] },
        { "NAME": "deformAmount", "TYPE": "float", "DEFAULT": 0.2, "MIN": 0.0, "MAX": 2.0 },

        { "NAME": "center",  "TYPE": "point2D", "DEFAULT": [0.5,0.5], "MIN":[0,0], "MAX":[1,1] },
        { "NAME": "center2", "TYPE": "point2D", "DEFAULT": [0.65,0.65], "MIN":[0,0], "MAX":[1,1] },

        { "NAME": "size1", "TYPE": "float", "DEFAULT": 0.5, "MIN": 0.05, "MAX": 1.5 },
        { "NAME": "size2", "TYPE": "float", "DEFAULT": 0.5, "MIN": 0.05, "MAX": 1.5 },

        { "NAME": "interactionStrength", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 3.0 }
    ]
}*/

#define PI 3.1415926535
#define TWO_PI (PI * 2.0)

float map(float x, float a, float b, float c, float d){
    return (x-a)*(d-c)/(b-a)+c;
}

float ease(float p, float g){
    return (p < 0.5) ? 0.5*pow(2.0*p,g) : 1.0 - 0.5*pow(2.0*(1.0-p),g);
}

float hash(vec2 p){
    vec3 p3 = fract(vec3(p.xyx)*0.13);
    p3 += dot(p3,p3.yzx+3.333);
    return fract((p3.x+p3.y)*p3.z);
}

float noise(vec2 x){
    vec2 i=floor(x), f=fract(x);
    float a=hash(i), b=hash(i+vec2(1,0));
    float c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
    vec2 u=f*f*(3.0-2.0*f);
    return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y;
}

float fbm(vec2 x){
    float v=0.0, a=0.5;
    mat2 rot=mat2(cos(0.5),sin(0.5),-sin(0.5),cos(0.5));
    for(int i=0;i<3;i++){
        v+=a*noise(x);
        x=rot*x*2.0+100.0;
        a*=0.5;
    }
    return v;
}

float distC(vec2 uv, vec2 c){
    vec2 p=uv-c;
    p.x*=RENDERSIZE.x/RENDERSIZE.y;
    return length(p);
}

vec2 rotateUV(vec2 uv, float a, vec2 c){
    uv-=c;
    uv=mat2(cos(a),-sin(a),sin(a),cos(a))*uv;
    uv+=c;
    return uv;
}

// --- SIZE-AWARE INTERACTION ---
float interactingWave(vec2 uv, float t){

    float d1 = distC(uv, center) / size1;
    float d2 = distC(uv, center2) / size2;

    vec2 ns = vec2(noiseScaleX, noiseScaleY);

    float n1 = fbm(uv * ns + t*0.3);
    float n2 = fbm((uv+5.0) * ns + t*0.35);

    float offset1 = n1 * noiseIntensity * smoothstep(0.32,0.22,d1);
    float offset2 = n2 * noiseIntensity * smoothstep(0.32,0.22,d2);

    float wave1 = smoothstep(0.8,0.001,d1)*18.0;
    float wave2 = smoothstep(0.8,0.001,d2)*18.0;

    float combined = offset1 + offset2 + wave1 + wave2;

    combined += interactionStrength * (offset1 * offset2);

    float w = sin(TWO_PI * (t + combined + wavePhase));
    return map(w,-1.0,1.0,0.0,1.0);
}

void main(){
    vec2 uv = gl_FragCoord.xy / RENDERSIZE.xy;

    uv += deformAmount * 0.02 * vec2(
        sin(uv.y*10.0+TIME),
        cos(uv.x*10.0+TIME)
    );

    vec2 mid = mix(center, center2, 0.5);
    uv = rotateUV(uv, rotationAmount, mid);

    float r = interactingWave(uv, TIME);
    float g = interactingWave(uv + 0.01, TIME);
    float b = interactingWave(uv + 0.02, TIME);

    vec3 col = vec3(r,g,b) * colorTint.rgb;

    float v1 = distC(uv, center) / size1;
    float v2 = distC(uv, center2) / size2;
    float v = min(v1, v2);

    float fade = 1.0 - min(ease(v+0.2, 20.0),1.0);

    gl_FragColor = vec4(col * fade, 1.0);
}