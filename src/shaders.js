// --- SHADER DI SIMULAZIONE ACQUA ---
export const simFragmentShader = `
uniform sampler2D iChannel0;
uniform vec2 iResolution;
uniform vec4 iMouse;
uniform float iFrame;

void main() {
    vec2 fragCoord = gl_FragCoord.xy;
    if (iFrame == 0.0) { gl_FragColor = vec4(0.0); return; }

    float pressure = texture2D(iChannel0, fragCoord / iResolution).x;
    float pVel = texture2D(iChannel0, fragCoord / iResolution).y;

    float p_right = texture2D(iChannel0, (fragCoord + vec2(1.0, 0.0)) / iResolution).x;
    float p_left  = texture2D(iChannel0, (fragCoord + vec2(-1.0, 0.0)) / iResolution).x;
    float p_up    = texture2D(iChannel0, (fragCoord + vec2(0.0, 1.0)) / iResolution).x;
    float p_down  = texture2D(iChannel0, (fragCoord + vec2(0.0, -1.0)) / iResolution).x;

    if (fragCoord.x < 1.0) p_left = p_right;
    if (fragCoord.x > iResolution.x - 2.0) p_right = p_left;
    if (fragCoord.y < 1.0) p_down = p_up;
    if (fragCoord.y > iResolution.y - 2.0) p_up = p_down;

    float delta = 1.0;
    pVel += delta * (-2.0 * pressure + p_right + p_left) / 4.0;
    pVel += delta * (-2.0 * pressure + p_up + p_down) / 4.0;
    pressure += delta * pVel;
    pVel -= 0.005 * delta * pressure;
    pVel *= 1.0 - 0.002 * delta;
    pressure *= 0.999;

    float gradX = (p_right - p_left) / 2.0;
    float gradY = (p_up - p_down) / 2.0;

    float mx = iMouse.x * iResolution.x;
    float my = (1.0 - iMouse.y) * iResolution.y;
    float dist = distance(fragCoord, vec2(mx, my));
    if (iMouse.z > 0.5 && dist <= 20.0) {
        pressure += 1.0 - dist / 20.0;
    }

    gl_FragColor = vec4(pressure, pVel, gradX, gradY);
}
`;

// --- SHADER DI RENDERING ACQUA ---
export const renderFragmentShader = `
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform vec2 iResolution;
varying vec2 vUv;

void main() {
    vec2 uv = vUv;
    vec4 data = texture2D(iChannel0, uv);
    vec4 color = texture2D(iChannel1, uv + 0.2 * data.zw);

    // Sunlight glint
    vec3 normal = normalize(vec3(-data.z, 0.2, -data.w));
    color.rgb += pow(max(0.0, dot(normal, normalize(vec3(-3.0, 10.0, 3.0)))), 60.0);

    color.a = 0.3; // più trasparente
    gl_FragColor = color;
}
`;

export const vertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;