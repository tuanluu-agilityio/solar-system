import * as THREE from 'three';
import {
  AMBIENT_LIGHT,
  PLANET_COMMON,
  PLANET_VERTEX,
  SUN_LIGHT,
  prepareMap,
} from './planetMaterial';
import { shellLimbCosine } from './planetLook';

/** Shells around a planet: clouds just above the surface, the atmosphere glow a bit higher. */
export const CLOUD_SCALE = 1.01;
export const ATMOSPHERE_SCALE = 1.04;
/** Earth's air is thin: its glow shell hugs the limb. */
export const EARTH_ATMOSPHERE_SCALE = 1.025;
/** Clouds drift eastward relative to the ground. */
export const CLOUD_SPIN_FACTOR = 1.2;

// City lights sit slightly above the bloom threshold so they glow softly.
const NIGHT_GAIN = 1.6;
/** Rayleigh-blue limb by day, warming to orange at the terminator. */
const RIM_COLOR = new THREE.Color('#5d9cff');
const RIM_TWILIGHT = new THREE.Color('#ff8a4a');
const RIM_STRENGTH = 0.5;
/** Normal map strength for a 4096 px map; smaller maps average the relief away, so scale up. */
const NORMAL_STRENGTH = 2.5;
const NORMAL_REFERENCE_WIDTH = 4096;

const worldVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vUv = uv;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vPosW = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const earthFragment = /* glsl */ `
  uniform sampler2D uDay;
  uniform sampler2D uNight;
  uniform sampler2D uNormal;
  uniform sampler2D uSpecular;
  uniform sampler2D uClouds;
  uniform float uHasNormal;
  uniform float uHasSpecular;
  uniform float uHasClouds;
  uniform float uNormalScale;
  uniform float uCloudOffset;
  uniform float uDetail;
  uniform float uDayLight;
  uniform float uAmbient;
  uniform float uNightGain;
  uniform vec3 uRimColor;
  uniform vec3 uRimTwilight;
  uniform float uRimStrength;
  varying vec2 vUv;
  varying vec3 vPosL;
  varying vec3 vSunL;
  varying vec3 vViewL;

  ${PLANET_COMMON}

  void main() {
    vec3 n0 = normalize(vPosL);
    vec3 l = normalize(vSunL);
    vec3 v = normalize(vViewL);
    bool detail = uDetail > 0.5;
    vec3 t;
    vec3 b;
    sphereFrame(n0, t, b);
    float lat = asin(clamp(n0.y, -1.0, 1.0));

    vec3 day = texture2D(uDay, vUv).rgb;
    // Ocean mask: the specular map, else a blue-dominance guess from the day map.
    float ocean = uHasSpecular > 0.5
      ? texture2D(uSpecular, vUv).r
      : smoothstep(0.02, 0.1, day.b - max(day.r, day.g * 0.8));

    vec3 n = n0;
    if (detail && uHasNormal > 0.5) {
      vec3 tn = texture2D(uNormal, vUv).xyz * 2.0 - 1.0;
      tn.xy *= uNormalScale * (1.0 - ocean);
      n = normalize(t * tn.x + b * tn.y + n0 * max(tn.z, 0.2));
    }

    float mu0g = dot(n0, l);
    float mu0 = dot(n, l);
    float mu = max(dot(n0, v), 0.0);
    // Smooth terminator: twilight band of roughly +-8 degrees.
    float dayMix = smoothstep(-0.12, 0.16, mu0g);

    vec2 cloudUv = vUv + vec2(uCloudOffset, 0.0);
    float cover = uHasClouds > 0.5 ? texture2D(uClouds, cloudUv).a : 0.0;
    // Cloud shadows: the cloud above the point where the sun ray leaves the cloud layer.
    float cloudShadow = 0.0;
    if (detail && uHasClouds > 0.5) {
      float h = 0.01 / max(mu0g, 0.2);
      vec2 shift = vec2(dot(l, t) / (6.2831853 * max(cos(lat), 0.15)), dot(l, b) / 3.1415927) * h;
      cloudShadow = texture2D(uClouds, cloudUv + shift).a;
    }

    float diffuse = max(mu0, 0.0) * smoothstep(-0.1, 0.05, mu0g);
    vec3 col = day * (diffuse * uDayLight * (1.0 - 0.6 * cloudShadow) + uAmbient);

    // Ocean sun glint: normalized Blinn lobes (a sharp core and a wave-roughened sheen) with
    // Schlick Fresnel for water, so the glint is about as bright as sunlit cloud tops.
    vec3 hv = normalize(l + v);
    float nh = max(dot(n0, hv), 0.0);
    float fres = 0.02 + 0.98 * pow(1.0 - max(dot(hv, v), 0.0), 5.0);
    float lobe = 0.75 * 25.8 * pow(nh, 160.0) + 0.25 * 3.2 * pow(nh, 18.0);
    float glint = ocean * fres * lobe * 3.0 / (4.0 * max(mu, 0.15));
    glint *= smoothstep(0.0, 0.12, mu0g) * (1.0 - 0.85 * cloudShadow) * (1.0 - cover);
    col += vec3(1.0, 0.94, 0.85) * glint;
    // Oceans read a touch deeper blue from the air above them.
    col += vec3(0.004, 0.012, 0.03) * ocean * max(mu0g, 0.0);

    // City lights on the night side only, dimmed under clouds.
    vec3 night = texture2D(uNight, vUv).rgb * uNightGain * (1.0 - dayMix) * (1.0 - 0.8 * cover);

    // Thin Rayleigh limb: blue by day, warming toward the terminator, gone at night.
    float rim = pow(1.0 - mu, 4.0);
    float sunUp = smoothstep(-0.15, 0.35, mu0g);
    float warm = (1.0 - smoothstep(0.0, 0.4, mu0g)) * (1.0 - smoothstep(0.2, 0.85, dot(l, v)));
    vec3 scatter = mix(uRimColor, uRimTwilight, warm);
    col = mix(col, scatter * uDayLight * sunUp, rim * uRimStrength * sunUp);

    gl_FragColor = vec4(col + night, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const cloudFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uLight;
  uniform float uAmbient;
  varying vec2 vUv;
  varying vec3 vPosL;
  varying vec3 vSunL;
  varying vec3 vViewL;

  void main() {
    vec3 n = normalize(vPosL);
    vec3 l = normalize(vSunL);
    vec3 v = normalize(vViewL);
    float a = texture2D(uMap, vUv).a;
    float mu0 = dot(n, l);
    // Soft cloud terminator: light wraps a little, sunset-warm at the edge, dark at night.
    float lit = smoothstep(-0.08, 0.3, mu0) * (0.35 + 0.65 * max(mu0, 0.0));
    vec3 tint = mix(vec3(1.0, 0.62, 0.4), vec3(1.0), smoothstep(0.02, 0.3, mu0));
    // Thick clouds thin out toward the limb, where they are seen through more haze.
    float limb = mix(0.8, 1.0, smoothstep(0.0, 0.35, dot(n, v)));
    gl_FragColor = vec4(tint * (lit * uLight + uAmbient), a * limb);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const atmosphereFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uTwilight;
  uniform float uIntensity;
  uniform float uEdge;
  uniform vec3 uSunPos;
  varying vec3 vNormalW;
  varying vec3 vPosW;

  void main() {
    vec3 n = normalize(vNormalW);
    vec3 v = normalize(cameraPosition - vPosW);
    // Back faces: n.v runs from 0 at the shell's silhouette to -uEdge at the planet's limb,
    // so the glow peaks at the limb and fades to nothing outward.
    float rim = smoothstep(0.0, uEdge, -dot(n, v));
    rim *= rim;
    vec3 l = normalize(uSunPos - vPosW);
    float s = dot(n, l);
    // Twilight wraps a little past the terminator; the night limb stays nearly dark.
    float lit = 0.02 + 0.98 * smoothstep(-0.25, 0.45, s);
    // Reddened twilight shows where the terminator is seen side-on, not with the sun behind
    // the viewer (then the limb only looks terminator-like but is lit straight on).
    float warm = (1.0 - smoothstep(-0.05, 0.4, s)) * (1.0 - smoothstep(0.2, 0.85, dot(l, v)));
    vec3 col = mix(uColor, uTwilight, warm);
    gl_FragColor = vec4(col * rim * lit * uIntensity, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export interface EarthMaps {
  normal?: THREE.Texture | null;
  specular?: THREE.Texture | null;
  clouds?: THREE.Texture | null;
}

/** Normal-map strength for a map of this width (smaller maps hold less relief per texel). */
export function normalScaleFor(tex: THREE.Texture | null | undefined): number {
  const w = (tex?.image as { width?: number } | null | undefined)?.width;
  const k = w && w > 2 ? Math.min(4, Math.max(1, NORMAL_REFERENCE_WIDTH / w)) : 1;
  return NORMAL_STRENGTH * k;
}

type U<T> = THREE.IUniform<T>;

/** Sets (or clears) one of Earth's optional maps; `null` falls back gracefully. */
export function setEarthMap(
  mat: THREE.ShaderMaterial,
  which: 'normal' | 'specular' | 'clouds',
  tex: THREE.Texture | null,
): void {
  const key = which === 'normal' ? 'Normal' : which === 'specular' ? 'Specular' : 'Clouds';
  if (which === 'clouds' && tex) prepareMap(tex);
  (mat.uniforms[`u${key}`] as U<THREE.Texture | null>).value = tex;
  (mat.uniforms[`uHas${key}`] as U<number>).value = tex ? 1 : 0;
  if (which === 'normal') (mat.uniforms.uNormalScale as U<number>).value = normalScaleFor(tex);
}

/**
 * Earth shader: day/night blend with a smooth terminator, normal-mapped land, ocean sun
 * glint, cloud shadows and a Rayleigh limb; city lights only on the night side, dimmed under
 * clouds. Normal, specular and cloud maps are optional (graceful fallback when absent).
 */
export function createEarthMaterial(
  day: THREE.Texture,
  night: THREE.Texture,
  sunWorldPos: THREE.Vector3,
  maps: EarthMaps = {},
  detail: U<number> = { value: 1 },
): THREE.ShaderMaterial {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uDay: { value: day },
      uNight: { value: night },
      uNormal: { value: null },
      uSpecular: { value: null },
      uClouds: { value: null },
      uHasNormal: { value: 0 },
      uHasSpecular: { value: 0 },
      uHasClouds: { value: 0 },
      uNormalScale: { value: NORMAL_STRENGTH },
      uCloudOffset: { value: 0 },
      uDetail: detail,
      uSunPos: { value: sunWorldPos },
      uDayLight: { value: SUN_LIGHT },
      uAmbient: { value: AMBIENT_LIGHT },
      uNightGain: { value: NIGHT_GAIN },
      uRimColor: { value: RIM_COLOR.clone() },
      uRimTwilight: { value: RIM_TWILIGHT.clone() },
      uRimStrength: { value: RIM_STRENGTH },
    },
    vertexShader: PLANET_VERTEX,
    fragmentShader: earthFragment,
  });
  mat.name = 'earth';
  setEarthMap(mat, 'normal', maps.normal ?? null);
  setEarthMap(mat, 'specular', maps.specular ?? null);
  setEarthMap(mat, 'clouds', maps.clouds ?? null);
  return mat;
}

/**
 * Transparent, sun-lit cloud shell at radius * 1.01: soft terminator, dark on the night side.
 * The caller spins it 1.2x Earth's rate.
 */
export function createCloudLayer(clouds: THREE.Texture, radius: number, segments = 64): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius * CLOUD_SCALE, segments, segments / 2),
    new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: clouds },
        // The sun sits at the world origin.
        uSunPos: { value: new THREE.Vector3() },
        uLight: { value: SUN_LIGHT },
        uAmbient: { value: AMBIENT_LIGHT },
      },
      vertexShader: PLANET_VERTEX,
      fragmentShader: cloudFragment,
      transparent: true,
      depthWrite: false,
    }),
  );
  mesh.name = 'clouds';
  return mesh;
}

/**
 * Additive Fresnel glow on a back-side shell at radius * `scale` (default 1.04), brighter on
 * the sunlit side and shifting to `twilight` toward the terminator.
 */
export function createAtmosphere(
  radius: number,
  color: THREE.ColorRepresentation,
  intensity: number,
  segments = 64,
  opts: { scale?: number; twilight?: THREE.ColorRepresentation } = {},
): THREE.Mesh {
  const scale = opts.scale ?? ATMOSPHERE_SCALE;
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius * scale, segments, segments / 2),
    new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uTwilight: { value: new THREE.Color(opts.twilight ?? color) },
        uIntensity: { value: intensity },
        uEdge: { value: shellLimbCosine(scale) },
        // The sun sits at the world origin.
        uSunPos: { value: new THREE.Vector3() },
      },
      vertexShader: worldVertex,
      fragmentShader: atmosphereFragment,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    }),
  );
  mesh.name = 'atmosphere';
  return mesh;
}
