import * as THREE from 'three';
import { BODIES } from '../data/bodies';
import { displayRadius } from '../config/scale';
import { LIMB_DARKENING, prefersReducedMotion, sunTimeScale, type SunDetail } from './sunParams';

export { sunDetailForTier } from './sunParams';

const LIGHT_COLOR = 0xfff4e0;
// decay 0: physically based lights need ~PI for a fully lit Lambert surface; 3 keeps
// the day side bright without clipping.
const LIGHT_INTENSITY = 3;
const AMBIENT_COLOR = 0x223344;
const AMBIENT_INTENSITY = 0.04;
// Linear HDR gain of the photosphere. The disc centre lands around 1.0-1.6 so ACES keeps the
// granulation readable; only the hottest granules cross the bloom threshold (bloomConfig.ts).
const SURFACE_GAIN = 1.25;
// Corona quad half-size, in radii of the visible limb.
const CORONA_EXTENT = 4;
const CORONA_GAIN = 1;

export interface SunOptions {
  /** Shader cost: 'low' for phones (fewer octaves, no cellular granulation). Default 'high'. */
  detail?: SunDetail;
  /** Strongly slow the animation. Default: the `prefers-reduced-motion` media query. */
  reducedMotion?: boolean;
}

export interface Sun {
  group: THREE.Group;
  light: THREE.PointLight;
  update(tSec: number): void;
  radius: number;
  setDetail(detail: SunDetail): void;
  setReducedMotion(reduced: boolean): void;
}

// Shared GLSL: hashed value noise in 3D and an fbm whose octave count is set by SUN_DETAIL.
const noiseGlsl = /* glsl */ `
  #if SUN_DETAIL == 1
    #define FBM_OCTAVES 5
  #else
    #define FBM_OCTAVES 3
  #endif
  // Integer lattice hashes: a float hash of "i + 1" can round differently from the
  // neighbouring cell's "i" after compiler reassociation, which shows up as seams.
  uint ihash(ivec3 c) {
    uvec3 q = uvec3(c + 4096) * uvec3(1597334673u, 3812015801u, 2798796415u);
    uint h = (q.x ^ q.y ^ q.z) * 1597334673u;
    h ^= h >> 16u;
    h *= 2246822519u;
    h ^= h >> 13u;
    h *= 3266489917u;
    h ^= h >> 16u;
    return h;
  }
  float hash13(ivec3 c) {
    return float(ihash(c) >> 8u) * (1.0 / 16777216.0);
  }
  vec3 hash33(ivec3 c) {
    uint h = ihash(c);
    return vec3(uvec3(h, h >> 11u, h >> 22u) & uvec3(2047u, 2047u, 1023u))
      / vec3(2047.0, 2047.0, 1023.0);
  }
  float vnoise(vec3 x) {
    vec3 fl = floor(x);
    ivec3 i = ivec3(fl);
    vec3 f = x - fl;
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash13(i), hash13(i + ivec3(1, 0, 0)), f.x),
          mix(hash13(i + ivec3(0, 1, 0)), hash13(i + ivec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash13(i + ivec3(0, 0, 1)), hash13(i + ivec3(1, 0, 1)), f.x),
          mix(hash13(i + ivec3(0, 1, 1)), hash13(i + ivec3(1, 1, 1)), f.x), f.y),
      f.z);
  }
  // Rotation between octaves hides the lattice.
  const mat3 OCT_ROT = mat3(0.00, 0.80, 0.60, -0.80, 0.36, -0.48, -0.60, -0.48, 0.64);
  float fbm(vec3 p) {
    float s = 0.0;
    float a = 0.5;
    for (int i = 0; i < FBM_OCTAVES; i++) {
      s += a * vnoise(p);
      p = OCT_ROT * p * 2.02;
      a *= 0.5;
    }
    return s / (1.0 - pow(0.5, float(FBM_OCTAVES)));
  }
  // Fixed three octaves for low-frequency fields where more octaves add cost but no detail.
  float fbm3(vec3 p) {
    float s = 0.5 * vnoise(p);
    p = OCT_ROT * p * 2.02;
    s += 0.25 * vnoise(p);
    p = OCT_ROT * p * 2.02;
    s += 0.125 * vnoise(p);
    return s / 0.875;
  }
`;

const surfaceVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vPos;
  varying vec3 vNormalV;
  varying vec3 vViewPos;
  void main() {
    vUv = uv;
    vPos = normalize(position);
    vNormalV = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewPos = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const surfaceFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uTime;
  uniform float uGain;
  uniform vec2 uLimb;
  varying vec2 vUv;
  varying vec3 vPos;
  varying vec3 vNormalV;
  varying vec3 vViewPos;
  ${noiseGlsl}

  // Granulation: bright convection cells separated by narrow dark intergranular lanes.
  float granulation(vec3 p, float t) {
  #if SUN_DETAIL == 1
    // Warp the lattice so cell walls curve and vary in width: straight Voronoi edges read as
    // a wire mesh in a close-up.
    p += 0.42 * (vec3(vnoise(p * 1.3 + 3.1), vnoise(p * 1.3 + 17.7), vnoise(p * 1.3 + 41.3)) - 0.5);
    vec3 fl = floor(p);
    ivec3 i = ivec3(fl);
    vec3 f = p - fl;
    float f1 = 8.0;
    float f2 = 8.0;
    float cellLum = 0.0;
    for (int z = -1; z <= 1; z++)
    for (int y = -1; y <= 1; y++)
    for (int x = -1; x <= 1; x++) {
      vec3 g = vec3(float(x), float(y), float(z));
      vec3 h = hash33(i + ivec3(x, y, z));
      // Cell centres wander slowly so granules form, drift and dissolve. The jitter stays
      // within +-0.3 so the 3x3x3 search finds the two nearest centres (no seams).
      vec3 o = 0.5 + 0.3 * sin(t * (0.6 + 0.5 * h) + 6.2831 * h);
      vec3 d = g + o - f;
      float dd = dot(d, d);
      if (dd < f1) { f2 = f1; f1 = dd; cellLum = h.x; }
      else if (dd < f2) { f2 = dd; }
    }
    // Bright, domed granule centres falling off into soft dark lanes.
    float edge = sqrt(f2) - sqrt(f1);
    float laneWidth = 0.45 + 0.5 * vnoise(p * 0.9 + 9.0);
    float lane = smoothstep(0.0, laneWidth, edge);
    lane = mix(0.38, 1.0, lane * lane * (3.0 - 2.0 * lane));
    float dome = 1.0 - smoothstep(0.0, 0.9, sqrt(f1));
    // Granules differ in brightness and carry faint internal structure.
    float inner = 0.8 + 0.4 * vnoise(p * 2.7 + t * 0.2);
    return lane * (0.5 + 0.5 * dome) * (0.6 + 0.4 * cellLum) * inner;
  #else
    float n = 0.65 * vnoise(p + t * 0.1) + 0.35 * vnoise(p * 2.3 - t * 0.13);
    return 0.2 + 0.7 * smoothstep(0.3, 0.7, n);
  #endif
  }

  vec3 rotY(vec3 p, float a) {
    float c = cos(a);
    float s = sin(a);
    return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
  }

  // Temperature ramp: umbra brown -> deep orange -> yellow -> near-white hot spots (linear).
  vec3 ramp(float t) {
    vec3 c0 = vec3(0.16, 0.025, 0.0);
    vec3 c1 = vec3(0.75, 0.17, 0.01);
    vec3 c2 = vec3(1.0, 0.42, 0.05);
    vec3 c3 = vec3(1.0, 0.70, 0.24);
    vec3 c4 = vec3(1.0, 0.92, 0.70);
    t = clamp(t, 0.0, 1.0);
    if (t < 0.3) return mix(c0, c1, t / 0.3);
    if (t < 0.55) return mix(c1, c2, (t - 0.3) / 0.25);
    if (t < 0.8) return mix(c2, c3, (t - 0.55) / 0.25);
    return mix(c3, c4, (t - 0.8) / 0.2);
  }

  void main() {
    float t = uTime;
    vec3 pos = normalize(vPos);
    float lat = pos.y;
    // Differential rotation: the equator turns faster than the poles.
    float spin = t * 0.012 * (1.0 - 0.3 * lat * lat);
    vec3 sp = rotY(pos, spin);

    // Slow large-scale turbulent flow: domain-warped fbm on the sphere (no UV seam, no pinch).
    vec3 q = sp * 1.6;
    vec3 warp = vec3(
      fbm3(q + vec3(0.0, 0.0, t * 0.010)),
      fbm3(q + vec3(5.2, 1.3, -t * 0.012)),
      fbm3(q + vec3(2.1, 7.7, t * 0.008)));
    vec3 wp = sp + 0.45 * (warp - 0.5);
    float flow = fbm(wp * 4.5 + vec3(0.0, t * 0.02, 0.0));

    // Mesogranulation-scale mottling: the texture readable at the focus distance.
    float mott = fbm(wp * 14.0 + vec3(t * 0.015, 0.0, -t * 0.01));

    // Granulation on irregular cells, faded to its mean where cells shrink below ~3 px.
    vec3 gp = wp * 48.0;
    gp += 0.9 * vec3(vnoise(gp * 0.35), vnoise(gp * 0.35 + 3.7), vnoise(gp * 0.35 + 7.1)) - 0.45;
    float cellsPerPx = length(fwidth(sp)) * 48.0;
    float gran = mix(0.55, granulation(gp, t * 0.35), 1.0 - smoothstep(0.12, 0.3, cellsPerPx));

    // Large-scale structure from the texture, drifting with the rotation.
    vec2 uv = vec2(vUv.x - spin / 6.2831853, vUv.y);
    float texL = dot(texture2D(uMap, uv).rgb, vec3(0.299, 0.587, 0.114));

    // Active regions in the sunspot belts (about 5-35 degrees either side of the equator):
    // a sparse large-scale mask, then small spots and bright faculae inside it.
    float belt = smoothstep(0.06, 0.16, abs(lat)) * (1.0 - smoothstep(0.42, 0.6, abs(lat)));
    float region = smoothstep(0.66, 0.86, vnoise(sp * 2.4 + vec3(11.0, 3.0, t * 0.003))) * belt;
    float spotField = region > 0.0 ? region * fbm3(sp * 15.0 + 4.0 + 0.3 * warp) : 0.0;
    float umbra = smoothstep(0.6, 0.64, spotField);
    float penumbra = smoothstep(0.5, 0.57, spotField);
    float faculae = region * (1.0 - penumbra);

    float mu = clamp(dot(normalize(vNormalV), normalize(-vViewPos)), 0.0, 1.0);
    float m = 1.0 - mu;

    float temp = 0.6 + 0.55 * (gran - 0.55) + 0.34 * (mott - 0.5) + 0.26 * (flow - 0.5)
      + 0.2 * (texL - 0.5);
    // Faculae are bright network patches, most visible towards the limb.
    temp += faculae * (0.05 + 0.25 * m) * smoothstep(0.35, 0.7, mott);
    temp = mix(temp, 0.3 + 0.12 * gran, penumbra * 0.85);
    temp = mix(temp, 0.05, umbra);
    // Limb reddening: the limb shows cooler, higher layers.
    temp -= 0.22 * m * m;

    float limb = 1.0 - uLimb.x * m - uLimb.y * m * m;
    float lum = limb * (0.62 + 0.55 * temp);
    gl_FragColor = vec4(ramp(temp) * lum * uGain, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Camera-facing quad through the Sun's centre, sized from the visible limb so the glow, the
// chromosphere and the prominences hug the silhouette at every distance.
const coronaVertex = /* glsl */ `
  uniform float uRadius;
  uniform float uExtent;
  varying vec2 vP;
  varying float vFar;
  void main() {
    vec4 c = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    float d = length(c.xyz);
    float k = min((uRadius * uRadius) / max(d * d, 1e-6), 0.98);
    float limbR = uRadius / sqrt(1.0 - k);
    // Apparent disc radius as a fraction of the viewport half-height: when the Sun is a small
    // disc (overview, or behind a focused planet) the glow widens into a soft star glare.
    float screenR = limbR * projectionMatrix[1][1] / max(-c.z, 1e-6);
    vFar = 1.0 - smoothstep(0.03, 0.2, screenR);
    vP = position.xy * uExtent * (1.0 + 1.5 * vFar);
    gl_Position = projectionMatrix * vec4(c.xy + vP * limbR, c.z, 1.0);
  }
`;

const coronaFragment = /* glsl */ `
  uniform float uTime;
  uniform float uExtent;
  uniform float uGain;
  varying vec2 vP;
  varying float vFar;
  ${noiseGlsl}

  // A prominence loop: an arc of plasma standing on the limb at angle a.
  float loop(vec2 p, float a, float w, float hgt, float t, float seed) {
    vec2 n = vec2(cos(a), sin(a));
    vec2 tg = vec2(-n.y, n.x);
    float x = dot(p, tg);
    float y = dot(p, n) - 1.0;
    // Lean the loop and let it wobble so it never reads as a perfect ring.
    x += (0.5 * sin(seed * 1.7) + 0.25 * sin(t * 0.03 + seed)) * y;
    x += 0.012 * (vnoise(vec3(y * 40.0, seed, t * 0.1)) - 0.5);
    float e = length(vec2(x / w, y / hgt));
    float thick = 0.09 + 0.06 * vnoise(vec3(x * 60.0, y * 60.0, t * 0.15 + seed));
    float above = smoothstep(-0.004, 0.012, y);
    float arc = exp(-pow((e - 1.0) / thick, 2.0)) * above;
    // Broken, knotty filaments, brighter in the legs than at the apex, in a faint diffuse veil.
    arc *= smoothstep(0.2, 0.75, vnoise(vec3(x * 110.0, y * 110.0, t * 0.2 + seed * 3.0)));
    arc *= 0.55 + 0.45 * (1.0 - clamp(y / hgt, 0.0, 1.0));
    arc += 0.12 * exp(-pow((e - 0.8) / 0.5, 2.0)) * above * step(e, 1.6);
    return arc;
  }

  void main() {
    float t = uTime;
    float r = length(vP);
    vec2 dir = vP / max(r, 1e-5);
    float h = r - 1.0;
    float hp = max(h, 0.0);
    float px = max(fwidth(r), 1e-4);

    // Inner corona: a bright, steep falloff right at the limb plus a wide, faint envelope.
    float glow = 0.35 * exp(-hp * 12.0) + 0.22 * exp(-hp * 3.0) + 0.05 * exp(-hp * 0.9);

    // Streamers and rays: noise in polar form, stretched radially, slowly flowing outwards.
    // Helmet streamers: a few broad lobes; rays: many thin radial filaments.
    float big = fbm3(vec3(dir * 1.8, hp * 0.25 - t * 0.005 + 7.0));
    float streamers = smoothstep(0.35, 0.8, big);
    float fine = vnoise(vec3(dir * 28.0, hp * 0.6 - t * 0.02))
      * 0.6 + 0.4 * vnoise(vec3(dir * 61.0, hp * 0.8 - t * 0.03 + 5.0));
    float rays = 0.3 + 2.0 * streamers * (0.55 + 0.7 * fine) + 0.25 * fine;
    float corona = glow * mix(1.0, rays, smoothstep(0.0, 0.2, hp));
    // Star glare for a small, distant Sun: a wide soft halo instead of fine structure.
    corona += vFar * (0.9 * exp(-hp * 1.8) + 0.2 * exp(-hp * 0.5));
    float ext = uExtent * (1.0 + 1.5 * vFar);
    corona *= 1.0 - smoothstep(ext * 0.55, ext * 0.98, r);

    // Chromosphere: a thin, bright, reddish rim with spicule texture just above the limb.
    float w = max(0.012, px * 1.5);
    float chromo = exp(-hp / w) * smoothstep(-px, 0.0, h);
    chromo *= 0.75 + 0.5 * vnoise(vec3(dir * 90.0, t * 0.2));

    // Prominences: a few slowly evolving loops plus noise-driven tongues on the limb, only
    // evaluated in a thin shell above the limb (the branch is spatially coherent).
    float prom = 0.0;
    if (h > -0.02 && h < 0.25) {
      for (int i = 0; i < 3; i++) {
        float fi = float(i);
        float a = fi * 2.17 + 0.6 + t * 0.002;
        float life = 0.5 + 0.5 * sin(t * 0.021 + fi * 2.3);
        float hgt = 0.07 + 0.05 * life + 0.02 * fi;
        prom += loop(vP, a, 0.035 + 0.015 * fi, hgt, t, fi * 11.0 + 1.0) * (0.35 + 0.65 * life);
      }
      float site = smoothstep(0.5, 0.72, vnoise(vec3(dir * 2.5, t * 0.004 + 3.0)));
      vec3 tq = vec3(dir * 11.0, hp * 9.0 - t * 0.04);
      float tongue = fbm3(tq + 0.8 * vec3(vnoise(tq * 0.6), vnoise(tq * 0.6 + 4.1), 0.0));
      prom += site * smoothstep(0.5, 0.78, tongue - hp * 5.0);
      prom *= smoothstep(-px, px, h);
    }

    vec3 coronaCol = mix(vec3(1.0, 0.62, 0.30), vec3(1.0, 0.86, 0.66), smoothstep(0.0, 1.5, hp));
    vec3 col = coronaCol * corona * 0.75
      + vec3(1.0, 0.28, 0.08) * chromo * 0.6
      + vec3(1.0, 0.32, 0.12) * prom * 1.8;
    gl_FragColor = vec4(col * uGain, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function detailDefine(detail: SunDetail): number {
  return detail === 'high' ? 1 : 0;
}

export function createSun(tex: THREE.Texture, opts: SunOptions = {}): Sun {
  const radius = displayRadius(BODIES.sun.physical.diameterKm);
  const group = new THREE.Group();
  group.name = 'sun';

  tex.wrapS = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  const defines = { SUN_DETAIL: detailDefine(opts.detail ?? 'high') };
  const surfaceUniforms = {
    uMap: { value: tex },
    uTime: { value: 0 },
    uGain: { value: SURFACE_GAIN },
    uLimb: { value: new THREE.Vector2(LIMB_DARKENING.a, LIMB_DARKENING.b) },
  };
  const surfaceMat = new THREE.ShaderMaterial({
    defines: { ...defines },
    uniforms: surfaceUniforms,
    vertexShader: surfaceVertex,
    fragmentShader: surfaceFragment,
  });
  const surface = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 32), surfaceMat);
  surface.name = 'sun-surface';
  group.add(surface);

  const coronaUniforms = {
    uTime: { value: 0 },
    uRadius: { value: radius },
    uExtent: { value: CORONA_EXTENT },
    uGain: { value: CORONA_GAIN },
  };
  const coronaMat = new THREE.ShaderMaterial({
    defines: { ...defines },
    uniforms: coronaUniforms,
    vertexShader: coronaVertex,
    fragmentShader: coronaFragment,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const corona = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), coronaMat);
  corona.name = 'sun-corona';
  // Billboarded and resized in the vertex shader: the geometry bounds mean nothing.
  corona.frustumCulled = false;
  corona.raycast = () => {};
  group.add(corona);

  const light = new THREE.PointLight(LIGHT_COLOR, LIGHT_INTENSITY, 0, 0);
  group.add(light);
  group.add(new THREE.AmbientLight(AMBIENT_COLOR, AMBIENT_INTENSITY));

  // Shader time integrates the wall clock at the current speed, so toggling reduced motion
  // never makes the surface jump.
  let scale = sunTimeScale(
    opts.reducedMotion ?? prefersReducedMotion(typeof window === 'undefined' ? undefined : window),
  );
  let lastT: number | null = null;
  let shaderT = 0;

  return {
    group,
    light,
    radius,
    update(tSec: number) {
      shaderT = lastT === null ? tSec * scale : shaderT + (tSec - lastT) * scale;
      lastT = tSec;
      surfaceUniforms.uTime.value = shaderT;
      coronaUniforms.uTime.value = shaderT;
    },
    setDetail(detail: SunDetail) {
      const v = detailDefine(detail);
      for (const mat of [surfaceMat, coronaMat]) {
        if (mat.defines.SUN_DETAIL === v) continue;
        mat.defines.SUN_DETAIL = v;
        mat.needsUpdate = true;
      }
    },
    setReducedMotion(reduced: boolean) {
      scale = sunTimeScale(reduced);
    },
  };
}
