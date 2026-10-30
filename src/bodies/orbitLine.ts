import * as THREE from 'three';
import { CORE_FEATHER, CORE_SHARE, ORBIT_STYLE } from './orbitMath';

const S = ORBIT_STYLE;
/** Angle step (radians) to the look-ahead point used for the projected tangent. */
const TANGENT_STEP_RAD = 0.01;
/** Viewport assumed until `setViewport` is first called (keeps the width sane, never divides by 0). */
const DEFAULT_VIEWPORT = { width: 1280, height: 720, pixelRatio: 1 };

/** A JS number as a GLSL float literal (integers get ".0"). */
function f(n: number): string {
  return Number.isInteger(n) ? `${n}.0` : String(n);
}

const vertexShader = /* glsl */ `
  attribute float aSide;
  attribute float aAngle;
  uniform vec2 uViewport;
  uniform float uPixelRatio;
  uniform float uRadius;
  varying float vSide;
  varying float vAngle;

  void main() {
    vSide = aSide;
    vAngle = aAngle;
    mat4 mvp = projectionMatrix * modelViewMatrix;
    vec4 c0 = mvp * vec4(position, 1.0);
    // Direction of motion at this angle: d/da (r cos a, 0, -r sin a).
    vec3 tangent = vec3(-sin(aAngle), 0.0, -cos(aAngle));
    vec4 c1 = mvp * vec4(position + tangent * (uRadius * ${f(TANGENT_STEP_RAD)}), 1.0);
    gl_Position = c0;
    // Behind or at the camera: no meaningful screen direction, collapse onto the centre line.
    if (c0.w <= 0.001 || c1.w <= 0.001) return;
    // Screen-space tangent in pixels (aspect-correct), then its normal.
    vec2 d = (c1.xy / c1.w - c0.xy / c0.w) * uViewport;
    float len = length(d);
    if (len < 1e-6) return;
    vec2 n = vec2(-d.y, d.x) / len;
    // Half-width in drawing-buffer px -> NDC (2 units span the viewport), scaled by w so it
    // stays constant in pixels after the perspective divide.
    vec2 offsetNdc = n * (aSide * ${f(S.totalWidthPx / 2)} * uPixelRatio * 2.0) / uViewport;
    gl_Position.xy += offsetNdc * c0.w;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uPlanetAngle;
  uniform float uEmphasis;
  varying float vSide;
  varying float vAngle;

  const float TAU = 6.283185307179586;

  // Mirrors trailIntensity() in orbitMath.ts.
  float trail(float vertexAngle, float planetAngle) {
    float delta = mod(planetAngle - vertexAngle, TAU);
    return ${f(S.baseIntensity)} + (${f(S.headIntensity)} - ${f(S.baseIntensity)}) * exp(-delta / ${f(S.tailRad)});
  }

  // Mirrors ribbonProfile() in orbitMath.ts.
  float profile(float v) {
    float x = abs(v);
    float core = 1.0 - smoothstep(${f(CORE_SHARE - CORE_FEATHER)}, ${f(CORE_SHARE + CORE_FEATHER)}, x);
    float halo = ${f(S.haloShare)} * (1.0 - smoothstep(${f(CORE_SHARE)}, 1.0, x));
    return 1.0 - (1.0 - core) * (1.0 - halo);
  }

  void main() {
    float intensity = trail(vAngle, uPlanetAngle) * profile(vSide) * uEmphasis;
    gl_FragColor = vec4(uColor * intensity, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export interface OrbitLine {
  /** Name 'orbit-line', frustumCulled = false. */
  object: THREE.Mesh;
  /** Planet angle in radians, in the sense of `orbitPivot.rotation.y`. */
  setPlanetAngle(angle: number): void;
  /** Drawing-buffer size in device px and the renderer pixel ratio. */
  setViewport(drawingWidthPx: number, drawingHeightPx: number, pixelRatio: number): void;
  /** 0..1 multiplier (dims the orbit while a body is focused). */
  setEmphasis(e: number): void;
  dispose(): void;
}

function makeRibbonGeometry(radius: number): THREE.BufferGeometry {
  const n = S.segments;
  const count = 2 * (n + 1);
  const pos = new Float32Array(count * 3);
  const side = new Float32Array(count);
  const angle = new Float32Array(count);
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = Math.cos(a) * radius;
    const z = -Math.sin(a) * radius;
    for (let s = 0; s < 2; s++) {
      const k = 2 * i + s;
      pos.set([x, 0, z], k * 3);
      side[k] = s === 0 ? -1 : 1;
      angle[k] = a;
    }
  }
  const index = new Uint16Array(6 * n);
  for (let i = 0; i < n; i++) {
    const a = 2 * i;
    index.set([a, a + 1, a + 2, a + 1, a + 3, a + 2], i * 6);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
  geo.setAttribute('aAngle', new THREE.BufferAttribute(angle, 1));
  geo.setIndex(new THREE.BufferAttribute(index, 1));
  return geo;
}

/**
 * Glowing orbit ribbon in the XZ plane, centred on the origin of its parent: a closed strip
 * widened in the vertex shader to a constant `ORBIT_STYLE.totalWidthPx` CSS px, brightest at
 * the planet and fading behind its motion, tinted by `color` and blended additively.
 */
export function createOrbitLine(radius: number, color: THREE.ColorRepresentation): OrbitLine {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uPlanetAngle: { value: 0 },
      uEmphasis: { value: 1 },
      uRadius: { value: radius },
      uViewport: { value: new THREE.Vector2(DEFAULT_VIEWPORT.width, DEFAULT_VIEWPORT.height) },
      uPixelRatio: { value: DEFAULT_VIEWPORT.pixelRatio },
    },
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthTest: true,
    depthWrite: false,
  });
  const geometry = makeRibbonGeometry(radius);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'orbit-line';
  // The vertex shader moves vertices off the circle, so the CPU bounds are not reliable.
  mesh.frustumCulled = false;
  const u = material.uniforms;
  return {
    object: mesh,
    setPlanetAngle(angle) {
      u.uPlanetAngle!.value = angle;
    },
    setViewport(w, h, pr) {
      (u.uViewport!.value as THREE.Vector2).set(Math.max(1, w), Math.max(1, h));
      u.uPixelRatio!.value = pr;
    },
    setEmphasis(e) {
      u.uEmphasis!.value = Math.min(1, Math.max(0, e));
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
