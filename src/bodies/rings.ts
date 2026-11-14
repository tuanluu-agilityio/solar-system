import * as THREE from 'three';

const RING_SEGMENTS = 128;
/** Tint used when a ring has no texture (Uranus: faint, dusty grey-blue). */
const PLAIN_RING_COLOR = new THREE.Color('#8a97a3');
/** How dark the planet's shadow makes the ring (0 = black, 1 = no shadow). */
const SHADOW_LIGHT = 0.12;
/** Matches the planets' direct sun light (see `planetMaterial.ts`). */
const RING_LIGHT = 0.95;
/** Drawn after the planet's atmosphere shell, so the order never flips (no popping). */
export const RING_RENDER_ORDER = 2;

export interface RingStyle {
  /** Contrast of the procedural fine ringlets added on top of the strip (0 = none). */
  ringlets: number;
  /** Plain rings (no strip): number of narrow, distinct ringlets (Uranus' thin rings). */
  narrow: number;
  /** Slow colour variation across the radius (0 = none). */
  tint: number;
}

const DEFAULT_STYLE: RingStyle = { ringlets: 0.35, narrow: 0, tint: 0.12 };

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vPosW;
  varying vec3 vCenterW;
  varying vec3 vNormalW;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vPosW = world.xyz;
    // The ring is centred on its planet, so the model origin is the planet centre.
    vCenterW = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    // The ring plane's normal is the local +y axis (geometry lies in XZ).
    vNormalW = normalize(mat3(modelMatrix) * vec3(0.0, 1.0, 0.0));
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform bool uHasMap;
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uShadow;
  uniform float uPlanetRadius;
  uniform vec3 uSunPos;
  uniform float uShadowLight;
  uniform float uLight;
  uniform float uDetail;
  uniform float uRinglets;
  uniform float uNarrow;
  uniform float uTint;
  varying vec2 vUv;
  varying vec3 vPosW;
  varying vec3 vCenterW;
  varying vec3 vNormalW;

  float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
  }
  float noise1(float x) {
    float i = floor(x);
    float f = fract(x);
    return mix(hash11(i), hash11(i + 1.0), f * f * (3.0 - 2.0 * f));
  }
  // Fine ringlet structure: noise bands at three scales, each faded out once a band gets
  // thinner than a pixel (derivative-based), so grazing views never shimmer or moire.
  float ringlets(float u, float fw) {
    float s = 0.0;
    float w = 0.0;
    for (int k = 0; k < 3; k++) {
      float f = 90.0 * pow(4.0, float(k));
      float fade = 1.0 - smoothstep(0.15, 0.6, fw * f);
      s += (noise1(u * f + float(k) * 17.0) - 0.5) * fade;
      w += 0.5;
    }
    return s / w;
  }

  void main() {
    float u = vUv.x;
    float fw = fwidth(u);
    bool detail = uDetail > 0.5;
    vec4 c = uHasMap ? texture2D(uMap, vec2(u, 0.5)) : vec4(uColor, 1.0);
    if (!uHasMap && uNarrow > 0.0) {
      // Uranus: a handful of narrow ringlets with dust between them, widened when sub-pixel.
      float bands = 0.0;
      for (int k = 0; k < 6; k++) {
        float centre = 0.08 + 0.17 * float(k) + 0.03 * hash11(float(k) * 7.0);
        float width = (k == 5 ? 0.035 : 0.012) + fw;
        bands = max(bands, 1.0 - smoothstep(0.0, width, abs(u - centre)));
      }
      c.a = mix(0.25, 1.0, bands);
    }
    if (detail && uRinglets > 0.0) {
      float r = ringlets(u, fw);
      c.a = clamp(c.a * (1.0 + uRinglets * 1.4 * r), 0.0, 1.0);
      c.rgb *= 1.0 + uRinglets * 0.5 * r;
    }
    if (uTint > 0.0) {
      // Natural colour drift across the radius: warmer inner B ring, greyer edges.
      float drift = noise1(u * 7.0 + 3.0) - 0.5;
      c.rgb *= vec3(1.0 + uTint * drift, 1.0, 1.0 - uTint * drift);
    }

    vec3 l = normalize(uSunPos - vPosW);
    vec3 v = normalize(cameraPosition - vPosW);
    vec3 nrm = normalize(vNormalW);
    float ln = dot(nrm, l);
    float vn = dot(nrm, v);
    float cosPhase = dot(l, v);
    // Lit face: particles back-scatter, brightest with the sun behind the viewer.
    float back = (0.78 + 0.32 * sqrt(abs(ln))) * (0.85 + 0.35 * pow(max(cosPhase, 0.0), 6.0));
    // Unlit face: only light diffusing through the ring reaches the viewer, so dense parts
    // go dark and thin parts glow, strongest when looking toward the sun.
    float through = 4.0 * c.a * (1.0 - c.a);
    float fwd = through * (0.18 + 1.1 * pow(max(-cosPhase, 0.0), 5.0)) + 0.06;
    float litFace = smoothstep(-0.02, 0.02, ln * sign(vn + 1e-6));
    float phase = mix(fwd, back, litFace);

    // Analytic planet shadow with a soft edge: does the ray toward the sun hit the sphere?
    float shade = 1.0;
    if (uShadow > 0.5 && uPlanetRadius > 0.0) {
      vec3 oc = vPosW - vCenterW;
      float b = dot(oc, l);
      float r2 = uPlanetRadius * uPlanetRadius;
      float disc = b * b - (dot(oc, oc) - r2);
      float inShadow = step(b, 0.0) * smoothstep(-0.02 * r2, 0.12 * r2, disc);
      shade = mix(1.0, uShadowLight, inShadow);
    }
    gl_FragColor = vec4(c.rgb * phase * shade * uLight, c.a * uOpacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** RingGeometry rotated into the XZ (equatorial) plane, with u = 0 at the inner edge and 1 at the outer. */
function makeRingGeometry(innerR: number, outerR: number): THREE.RingGeometry {
  const geo = new THREE.RingGeometry(innerR, outerR, RING_SEGMENTS, 1);
  const pos = geo.getAttribute('position');
  const uv = geo.getAttribute('uv');
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getX(i), pos.getY(i));
    uv.setXY(i, (r - innerR) / (outerR - innerR), 0.5);
  }
  uv.needsUpdate = true;
  geo.rotateX(-Math.PI / 2);
  return geo;
}

/**
 * Sun-lit planetary ring. With a texture, its colour and alpha come from the radial strip
 * (the Cassini Division stays transparent) plus procedural ringlets; without one it is a
 * plain faint band. Back-scatter on the lit face, forward-scattered glow through thin parts
 * from the unlit face. Set `uniforms.uPlanetRadius` and `uShadow` to cast the planet's
 * shadow onto it; `uDetail` switches the fine structure off on the low tier.
 */
export function createRing(
  innerR: number,
  outerR: number,
  tex: THREE.Texture | null,
  opacity: number,
  style: Partial<RingStyle> = {},
): THREE.Mesh {
  const st = { ...DEFAULT_STYLE, ...style };
  const mesh = new THREE.Mesh(
    makeRingGeometry(innerR, outerR),
    new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: tex },
        uHasMap: { value: tex !== null },
        uColor: { value: PLAIN_RING_COLOR.clone() },
        uOpacity: { value: opacity },
        uShadow: { value: 0 },
        uPlanetRadius: { value: 0 },
        // The sun sits at the world origin.
        uSunPos: { value: new THREE.Vector3() },
        uShadowLight: { value: SHADOW_LIGHT },
        uLight: { value: RING_LIGHT },
        uDetail: { value: 1 },
        uRinglets: { value: st.ringlets },
        uNarrow: { value: st.narrow },
        uTint: { value: st.tint },
      },
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
    }),
  );
  mesh.name = 'ring';
  mesh.renderOrder = RING_RENDER_ORDER;
  return mesh;
}
