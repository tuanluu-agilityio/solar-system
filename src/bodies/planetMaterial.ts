import * as THREE from 'three';
import type { PlanetLook } from './planetLook';

// Matches the old MeshStandardMaterial day side under the decay-0 sun light (intensity 3 / PI).
export const SUN_LIGHT = 0.95;
export const AMBIENT_LIGHT = 0.012;

/**
 * Shared vertex stage: object-space position, sun and view directions. The body's model matrix
 * is a rotation times a uniform scale (the overview boost), so its transpose maps world
 * directions into object space up to a positive factor that `normalize` removes.
 */
export const PLANET_VERTEX = /* glsl */ `
  uniform vec3 uSunPos;
  varying vec2 vUv;
  varying vec3 vPosL;
  varying vec3 vSunL;
  varying vec3 vViewL;
  void main() {
    vUv = uv;
    vPosL = position;
    vec4 world = modelMatrix * vec4(position, 1.0);
    mat3 toLocal = transpose(mat3(modelMatrix));
    vSunL = toLocal * (uSunPos - world.xyz);
    vViewL = toLocal * (cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

/** Hash, value noise periodic in x (seamless across the u = 0/1 seam) and the sphere frame. */
export const PLANET_COMMON = /* glsl */ `
  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  // Value noise whose lattice repeats every 'period' cells in x.
  float pnoise(vec2 p, float period) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float x0 = mod(i.x, period);
    float x1 = mod(i.x + 1.0, period);
    float a = hash12(vec2(x0, i.y));
    float b = hash12(vec2(x1, i.y));
    float c = hash12(vec2(x0, i.y + 1.0));
    float d = hash12(vec2(x1, i.y + 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
  // East (+u) and north (+v) tangents of a three.js SphereGeometry at unit normal n.
  void sphereFrame(vec3 n, out vec3 t, out vec3 b) {
    vec3 e = vec3(n.z, 0.0, -n.x);
    float el = length(e);
    t = el > 1e-4 ? e / el : vec3(1.0, 0.0, 0.0);
    b = cross(n, t);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec2 uTexel;
  uniform float uDetail;
  uniform float uTime;
  uniform float uDrift;
  uniform float uLight;
  uniform float uAmbient;
  uniform float uExposure;
  uniform float uRelief;
  uniform float uLommel;
  uniform float uOpposition;
  uniform float uMinnaert;
  uniform float uSoft;
  uniform vec3 uHazeColor;
  uniform float uHaze;
  uniform float uHazePower;
  uniform vec3 uTermColor;
  uniform float uTerm;
  uniform vec4 uFlow;
  uniform float uBands;
  uniform float uStreaks;
  uniform float uRingShadow;
  uniform sampler2D uRingMap;
  uniform float uRingHasMap;
  uniform vec2 uRingRadii;
  uniform float uRingOpacity;
  varying vec2 vUv;
  varying vec3 vPosL;
  varying vec3 vSunL;
  varying vec3 vViewL;

  ${PLANET_COMMON}

  // Two-phase flow map: each phase slides the texture a little along the flow and fades out
  // before it resets, so features drift and shear but never smear over time.
  vec3 flowAlbedo(vec2 uv, float lat) {
    float speed = uFlow.x;
    float amount = uFlow.y;
    float jets = uFlow.z;
    float turb = uFlow.w;
    vec2 nuv = vec2(uv.x * 32.0, uv.y * 20.0);
    vec2 n = vec2(pnoise(nuv + vec2(0.0, uTime * 0.05), 32.0),
                  pnoise(nuv + vec2(13.7, 7.1 - uTime * 0.05), 32.0)) - 0.5;
    vec2 dir = vec2(sin(lat * jets), 0.0) * (1.0 - turb) + n * 2.0 * turb;
    float t = uTime * speed;
    float p0 = fract(t);
    float p1 = fract(t + 0.5);
    vec2 d = dir * amount;
    vec3 a = texture2D(uMap, uv + d * (p0 - 0.5)).rgb;
    vec3 b = texture2D(uMap, uv + d * (p1 - 0.5)).rgb;
    return mix(a, b, abs(0.5 - p0) * 2.0);
  }

  void main() {
    vec3 n0 = normalize(vPosL);
    vec3 l = normalize(vSunL);
    vec3 v = normalize(vViewL);
    float lat = asin(clamp(n0.y, -1.0, 1.0));
    vec2 uv = vUv + vec2(uDrift, 0.0);
    bool detail = uDetail > 0.5;

    bool flowing = detail && uFlow.y > 0.0;
    vec3 raw = flowing ? flowAlbedo(uv, lat) : texture2D(uMap, uv).rgb;
    vec3 albedo = raw;

    if (uBands > 0.0) {
      float wob = detail ? pnoise(vec2(vUv.x * 6.0, lat * 8.0), 6.0) : 0.5;
      albedo *= 1.0 + uBands * sin(lat * 15.0 + wob * 1.5);
    }
    if (uStreaks > 0.0 && detail) {
      // Neptune: zonal streaks plus a faint dark oval in the southern hemisphere.
      float s = pnoise(vec2(vUv.x * 10.0 + uTime * 0.01, lat * 34.0), 10.0);
      float s2 = pnoise(vec2(vUv.x * 24.0, lat * 70.0), 24.0);
      albedo *= 1.0 + uStreaks * ((s - 0.5) * 1.6 + (s2 - 0.5) * 0.8);
      vec2 ds = vec2((fract(uv.x - 0.32 + 0.5) - 0.5) * 2.0 * cos(lat), lat + 0.38);
      ds.x *= 0.55;
      albedo *= 1.0 - 0.28 * exp(-dot(ds, ds) / 0.0035);
      float cirrus = smoothstep(0.78, 0.95, pnoise(vec2(vUv.x * 18.0, lat * 50.0 + 3.0), 18.0));
      albedo += vec3(0.25, 0.3, 0.35) * cirrus * uStreaks * 2.0 * exp(-dot(ds - vec2(0.0, 0.09), ds - vec2(0.0, 0.09)) / 0.02);
    }
    albedo *= uExposure;

    // Relief from albedo luminance gradients, measured at the screen-pixel footprint.
    vec3 n = n0;
    if (detail && uRelief > 0.0) {
      vec2 stepUv = clamp(fwidth(vUv), uTexel, vec2(0.01));
      float h0 = luma(raw);
      float hx = luma(texture2D(uMap, uv + vec2(stepUv.x, 0.0)).rgb);
      float hy = luma(texture2D(uMap, uv + vec2(0.0, stepUv.y)).rgb);
      vec3 t;
      vec3 b;
      sphereFrame(n0, t, b);
      // Clamp the slope: albedo edges (polar caps, maria) are not cliffs. Fade out at the
      // poles, where the map's longitudes converge.
      vec2 g = clamp(vec2(hx - h0, hy - h0), -0.05, 0.05);
      float k = uRelief * (1.0 - smoothstep(0.9, 0.99, abs(n0.y)));
      n = normalize(n0 - k * (g.x * t + g.y * b));
    }

    float mu0g = dot(n0, l);
    float mu0 = dot(n, l);
    float mu = max(dot(n0, v), 0.0);
    // Terminator: rocky bodies keep a hard edge (peaks just past it still catch light).
    float wrap = uSoft;
    float mu0w = clamp((mu0 + wrap) / (1.0 + wrap), 0.0, 1.0);
    float geo = smoothstep(-wrap - 0.06, wrap + 0.02, mu0g);
    float lambert = pow(mu0w, uMinnaert) * pow(max(mu, 0.04), uMinnaert - 1.0);
    float ls = 2.0 * mu0w / (mu0w + mu + 0.08);
    float brdf = mix(lambert, ls, uLommel) * geo;
    brdf *= 1.0 + uOpposition * smoothstep(0.96, 1.0, dot(l, v));

    // Ring shadow (Saturn): from the surface point, march toward the sun to the ring plane.
    float shadow = 1.0;
    if (uRingShadow > 0.5 && abs(l.y) > 1e-4) {
      float t = -vPosL.y / l.y;
      if (t > 0.0) {
        float r = length(vPosL.xz + l.xz * t);
        float ru = (r - uRingRadii.x) / (uRingRadii.y - uRingRadii.x);
        float inside = smoothstep(-0.01, 0.01, ru) * (1.0 - smoothstep(0.99, 1.01, ru));
        float a = uRingHasMap > 0.5 ? texture2D(uRingMap, vec2(clamp(ru, 0.0, 1.0), 0.5)).a : 1.0;
        shadow = 1.0 - inside * a * uRingOpacity * 0.9;
      }
    }

    vec3 col = albedo * (brdf * shadow * uLight + uAmbient);

    if (uTerm > 0.0) {
      float band = exp(-pow(mu0g / 0.12, 2.0)) * smoothstep(-0.25, 0.0, mu0g);
      band *= 1.0 - smoothstep(0.2, 0.85, dot(l, v));
      col += uTermColor * uTerm * band * uLight;
    }
    if (uHaze > 0.0) {
      float rim = pow(1.0 - mu, uHazePower);
      float day = smoothstep(-0.2, 0.45, mu0g);
      col = mix(col, uHazeColor * uLight * day * (0.35 + 0.65 * shadow), rim * uHaze);
    }

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Shared, per-frame uniforms: one object referenced by every planet material. */
export interface PlanetClock {
  uTime: THREE.IUniform<number>;
  uDetail: THREE.IUniform<number>;
}

export function createPlanetClock(detail: boolean): PlanetClock {
  return { uTime: { value: 0 }, uDetail: { value: detail ? 1 : 0 } };
}

export interface RingShadowSource {
  map: THREE.Texture | null;
  inner: number;
  outer: number;
  opacity: number;
}

/** Texel size of a loaded map (1 / width, 1 / height); 1/2048 until the image is known. */
export function texelOf(tex: THREE.Texture): THREE.Vector2 {
  const img = tex.image as { width?: number; height?: number } | null | undefined;
  const w = img?.width && img.width > 2 ? img.width : 2048;
  const h = img?.height && img.height > 2 ? img.height : 1024;
  return new THREE.Vector2(1 / w, 1 / h);
}

/** Planet maps wrap in u: the flow and drift offsets cross the u = 0/1 seam. */
export function prepareMap(tex: THREE.Texture): THREE.Texture {
  if (tex.wrapS !== THREE.RepeatWrapping) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.needsUpdate = true;
  }
  return tex;
}

/** Swaps the albedo map (lazy high-resolution upgrade) and refreshes the relief texel size. */
export function setPlanetMap(mat: THREE.ShaderMaterial, tex: THREE.Texture): void {
  (mat.uniforms.uMap as THREE.IUniform<THREE.Texture>).value = prepareMap(tex);
  (mat.uniforms.uTexel as THREE.IUniform<THREE.Vector2>).value = texelOf(tex);
}

/**
 * Shared lit planet shader: the sun at the world origin, per-body shading from `look`
 * (relief, regolith or limb-darkened response, haze, flow, banding) and an
 * optional ring shadow. `clock` holds the shared time and detail switches.
 */
export function createPlanetMaterial(
  map: THREE.Texture,
  look: PlanetLook,
  clock: PlanetClock,
  ring?: RingShadowSource,
): THREE.ShaderMaterial {
  const color = (c: string | undefined): THREE.Color => new THREE.Color(c ?? '#000000');
  const flow = look.flow;
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: prepareMap(map) },
      uTexel: { value: texelOf(map) },
      uSunPos: { value: new THREE.Vector3() },
      uDetail: clock.uDetail,
      uTime: clock.uTime,
      uDrift: { value: 0 },
      uLight: { value: SUN_LIGHT },
      uAmbient: { value: AMBIENT_LIGHT },
      uExposure: { value: look.exposure },
      uRelief: { value: look.relief },
      uLommel: { value: look.lommel },
      uOpposition: { value: look.opposition },
      uMinnaert: { value: look.minnaert },
      uSoft: { value: look.terminatorSoftness },
      uHazeColor: { value: color(look.haze?.color) },
      uHaze: { value: look.haze?.strength ?? 0 },
      uHazePower: { value: look.haze?.power ?? 1 },
      uTermColor: { value: color(look.terminatorTint?.color) },
      uTerm: { value: look.terminatorTint?.strength ?? 0 },
      uFlow: {
        value: new THREE.Vector4(
          flow?.speed ?? 0,
          flow?.amount ?? 0,
          flow?.jets ?? 0,
          flow?.turbulence ?? 0,
        ),
      },
      uBands: { value: look.bands },
      uStreaks: { value: look.streaks },
      uRingShadow: { value: 0 },
      uRingMap: { value: ring?.map ?? null },
      uRingHasMap: { value: ring?.map ? 1 : 0 },
      uRingRadii: { value: new THREE.Vector2(ring?.inner ?? 0, ring?.outer ?? 1) },
      uRingOpacity: { value: ring?.opacity ?? 0 },
    },
    vertexShader: PLANET_VERTEX,
    fragmentShader,
  });
  mat.name = 'planet';
  return mat;
}
