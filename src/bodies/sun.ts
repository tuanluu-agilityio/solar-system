import * as THREE from 'three';
import { BODIES } from '../data/bodies';
import { displayRadius } from '../config/scale';

const LIGHT_COLOR = 0xfff4e0;
// decay 0: physically based lights need ~PI for a fully lit Lambert surface; 3 keeps
// the day side bright without clipping.
const LIGHT_INTENSITY = 3;
const AMBIENT_COLOR = 0x223344;
const AMBIENT_INTENSITY = 0.04;
const CORONA_SCALE = 1.6;
// HDR gain so the photosphere's luminance sits above the bloom threshold (0.85).
const SURFACE_GAIN = 2.4;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vPos;
  void main() {
    vUv = uv;
    vPos = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uTime;
  uniform float uGain;
  varying vec2 vUv;
  varying vec3 vPos;

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
      mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }

  void main() {
    // Two layers of the texture drifting at different speeds give a "living" surface.
    vec3 a = texture2D(uMap, vUv + vec2(uTime * 0.004, 0.0)).rgb;
    vec3 b = texture2D(uMap, vec2(vUv.x * 2.0 - uTime * 0.0025, vUv.y)).rgb;
    vec3 col = mix(a, b, 0.4);
    // Granulation: two octaves of slowly evolving value noise on the sphere.
    float n = 0.65 * noise(vPos * 14.0 + uTime * 0.08) + 0.35 * noise(vPos * 38.0 - uTime * 0.12);
    float gran = 0.78 + 0.4 * n;
    gl_FragColor = vec4(col * gran * uGain, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Soft radial falloff used for the corona sprite (alpha channel). */
function makeCoronaTexture(size = 64): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5) / size - 0.5;
      const dy = (y + 0.5) / size - 0.5;
      const r = Math.min(1, Math.sqrt(dx * dx + dy * dy) * 2);
      const a = (1 - r) ** 2.2;
      data.set([255, 255, 255, Math.round(a * 255)], (y * size + x) * 4);
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export function createSun(tex: THREE.Texture): {
  group: THREE.Group;
  light: THREE.PointLight;
  update(tSec: number): void;
  radius: number;
} {
  const radius = displayRadius(BODIES.sun.physical.diameterKm);
  const group = new THREE.Group();
  group.name = 'sun';

  tex.wrapS = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  const uniforms = {
    uMap: { value: tex },
    uTime: { value: 0 },
    uGain: { value: SURFACE_GAIN },
  };
  const surface = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 64, 32),
    new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader }),
  );
  surface.name = 'sun-surface';
  group.add(surface);

  const corona = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: makeCoronaTexture(),
      color: 0xffb860,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const d = radius * CORONA_SCALE * 2;
  corona.scale.set(d, d, 1);
  corona.name = 'sun-corona';
  group.add(corona);

  const light = new THREE.PointLight(LIGHT_COLOR, LIGHT_INTENSITY, 0, 0);
  group.add(light);
  group.add(new THREE.AmbientLight(AMBIENT_COLOR, AMBIENT_INTENSITY));

  return {
    group,
    light,
    radius,
    update(tSec: number) {
      uniforms.uTime.value = tSec;
    },
  };
}
