import * as THREE from 'three';
import { SKY_FX } from './sky';

/**
 * Bakes the Milky Way texture into a star-free "galactic glow" map, once, on the GPU.
 *
 * The committed sky map has its stars baked in at 1-3 texels; magnified on screen they read as
 * chunky squares, and its 8-bit dark band (3-10 of 255) shows compression blocks once the sky
 * tone curve lifts it. A morphological opening (erode, then dilate, with a disc) removes every
 * feature smaller than the disc (the point stars) while keeping the shape and brightness of the
 * broad band and its dark lanes; a Gaussian blur then smooths the 8-bit steps and blocks. The
 * result is stored in a half-float target (an 8-bit linear target would band) with mipmaps.
 * Crisp stars come from `starfield.ts` instead.
 *
 * The same bake adds the procedural terms, which are static in the sky frame and so cost
 * nothing per frame: dark dust lanes along the band (multiplied into the glow) and a faint
 * nebula (low-frequency domain-warped fbm in 2-3 muted hues, on the band, written to its own
 * map that the sky shader scales by `SKY_FX.nebula`). Visual only, not data.
 */
export const SKY_GLOW = {
  /** Disc radius of the opening, in texels of a 4096-wide source (scaled for other sizes). */
  openRadius4096: 4.5,
  /** Gaussian sigma of the final blur, in source texels of a 4096-wide map. */
  blurSigma4096: 2,
} as const;

/** Glow map size: half the source resolution (it holds only low-frequency structure). */
export function glowSize(srcWidth: number, srcHeight: number): { width: number; height: number } {
  return {
    width: Math.max(1, Math.round(srcWidth / 2)),
    height: Math.max(1, Math.round(srcHeight / 2)),
  };
}

/** Integer offsets inside a disc of radius `r` (the opening's structuring element). */
export function discOffsets(r: number): [number, number][] {
  const out: [number, number][] = [];
  const n = Math.ceil(r);
  for (let j = -n; j <= n; j++) {
    for (let i = -n; i <= n; i++) if (i * i + j * j <= r * r + 1e-9) out.push([i, j]);
  }
  return out;
}

/** Value-noise fbm and the sky direction of an equirect UV (matches the mirrored sky sphere). */
const NOISE_GLSL = /* glsl */ `
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x),
          mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
          mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = p * 2.03 + vec3(1.7, 9.2, 3.1);
      a *= 0.5;
    }
    return v;
  }
  // SphereGeometry: phi = u * 2pi, theta = (1 - v) * pi; the sky mirrors x. The galactic band
  // is the texture equator (y = 0) and its centre (u = 0.5) lies toward -x.
  vec3 skyDir(vec2 uv) {
    float phi = uv.x * 6.2831853;
    float theta = (1.0 - uv.y) * 3.1415927;
    return vec3(cos(phi) * sin(theta), cos(theta), sin(phi) * sin(theta));
  }
  vec3 warp(vec3 d) {
    vec3 q = d * 2.6;
    return vec3(fbm(q + 3.1), fbm(q + 7.7), fbm(q + 1.3));
  }
  float laneMask(vec3 d, vec3 w) {
    return smoothstep(0.5, 0.72, fbm(d * vec3(4.0, 11.0, 4.0) + 5.0 * w))
      * exp(-d.y * d.y / (2.0 * 0.07 * 0.07));
  }
`;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

function morphShader(offsets: [number, number][], op: 'min' | 'max'): string {
  const taps = offsets
    .map(([i, j]) => `acc = ${op}(acc, texture2D(uSrc, vUv + vec2(${i}.0, ${j}.0) * uStep).rgb);`)
    .join('\n    ');
  return /* glsl */ `
  uniform sampler2D uSrc;
  uniform vec2 uStep;
  varying vec2 vUv;
  void main() {
    vec3 acc = texture2D(uSrc, vUv).rgb;
    ${taps}
    gl_FragColor = vec4(acc, 1.0);
  }
`;
}

const blurShader = /* glsl */ `
  uniform sampler2D uSrc;
  uniform vec2 uStep;
  uniform float uSigma;
  uniform float uLanes;
  varying vec2 vUv;
  ${NOISE_GLSL}
  void main() {
    vec3 sum = vec3(0.0);
    float wsum = 0.0;
    for (int j = -4; j <= 4; j++) {
      for (int i = -4; i <= 4; i++) {
        vec2 o = vec2(float(i), float(j)) * 0.75;
        float w = exp(-dot(o, o) / (2.0 * uSigma * uSigma));
        sum += w * texture2D(uSrc, vUv + o * uStep).rgb;
        wsum += w;
      }
    }
    vec3 d = skyDir(vUv);
    float lanes = laneMask(d, warp(d));
    gl_FragColor = vec4(sum / wsum * (1.0 - uLanes * lanes), 1.0);
  }
`;

const nebulaShader = /* glsl */ `
  varying vec2 vUv;
  ${NOISE_GLSL}
  void main() {
    vec3 d = skyDir(vUv);
    vec3 w = warp(d);
    float n = fbm(d * 3.64 + 2.0 * w);
    float lanes = laneMask(d, w);
    float band = exp(-d.y * d.y / (2.0 * 0.22 * 0.22));
    float bulge = 0.45 + 0.55 * smoothstep(-0.2, -0.9, d.x);
    float cloud = smoothstep(0.3, 0.75, n);
    vec3 rose = vec3(0.55, 0.22, 0.26);
    vec3 teal = vec3(0.16, 0.30, 0.42);
    vec3 dusk = vec3(0.42, 0.30, 0.22);
    vec3 hue = mix(mix(teal, rose, smoothstep(0.35, 0.65, w.x)), dusk, smoothstep(0.45, 0.7, w.z));
    gl_FragColor = vec4(cloud * cloud * band * bulge * (1.0 - 0.7 * lanes) * hue, 1.0);
  }
`;

function makeTarget(width: number, height: number, mipmaps: boolean): THREE.WebGLRenderTarget {
  return new THREE.WebGLRenderTarget(width, height, {
    type: THREE.HalfFloatType,
    depthBuffer: false,
    generateMipmaps: mipmaps,
    minFilter: mipmaps ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
  });
}

export interface SkyMaps {
  /** Star-free galactic glow with the dust lanes (linear, half float, mipmapped). */
  glow: THREE.Texture;
  /** Unscaled nebula colour (linear, half float), same UV layout as the sky map. */
  nebula: THREE.Texture;
}

/** Bakes the sky maps once. The caller owns them; the source texture is left untouched. */
export function bakeSkyGlow(renderer: THREE.WebGLRenderer, src: THREE.Texture): SkyMaps {
  const image = src.image as { width?: number; height?: number } | null;
  const srcW = image?.width ?? 2048;
  const srcH = image?.height ?? 1024;
  const { width, height } = glowSize(srcW, srcH);
  const k = srcW / 4096;
  const step = new THREE.Vector2(1 / srcW, 1 / srcH);
  const disc = discOffsets(Math.max(1.5, SKY_GLOW.openRadius4096 * k));

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  const scene = new THREE.Scene();
  scene.add(quad);
  const pass = (
    fragmentShader: string,
    input: THREE.Texture,
    out: THREE.WebGLRenderTarget,
    extra = {},
  ): void => {
    const mat = new THREE.ShaderMaterial({
      uniforms: { uSrc: { value: input }, uStep: { value: step }, ...extra },
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
    });
    quad.material = mat;
    renderer.setRenderTarget(out);
    renderer.render(scene, camera);
    mat.dispose();
  };

  const prevTarget = renderer.getRenderTarget();
  const a = makeTarget(width, height, false);
  const b = makeTarget(width, height, false);
  const glow = makeTarget(width, height, true);
  pass(morphShader(disc, 'min'), src, a);
  pass(morphShader(disc, 'max'), a.texture, b);
  pass(blurShader, b.texture, glow, {
    uSigma: { value: Math.max(1, SKY_GLOW.blurSigma4096 * k) },
    uLanes: { value: SKY_FX.lanes },
  });
  // The nebula holds only low-frequency structure: half the glow size is plenty.
  const nebula = makeTarget(Math.max(1, width >> 1), Math.max(1, height >> 1), false);
  pass(nebulaShader, src, nebula);
  renderer.setRenderTarget(prevTarget);
  a.dispose();
  b.dispose();
  quad.geometry.dispose();
  // The two remaining targets live for the app's lifetime; their textures are the result.
  return { glow: glow.texture, nebula: nebula.texture };
}
