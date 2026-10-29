import * as THREE from 'three';

const RING_SEGMENTS = 128;
/** Tint used when a ring has no texture (Uranus: faint, dusty grey-blue). */
const PLAIN_RING_COLOR = new THREE.Color('#8a97a3');
/** How dark the planet's shadow makes the ring (0 = black, 1 = no shadow). */
const SHADOW_LIGHT = 0.12;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vPosW;
  varying vec3 vCenterW;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vPosW = world.xyz;
    // The ring is centred on its planet, so the model origin is the planet centre.
    vCenterW = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
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
  varying vec2 vUv;
  varying vec3 vPosW;
  varying vec3 vCenterW;

  void main() {
    vec4 c = uHasMap ? texture2D(uMap, vec2(vUv.x, 0.5)) : vec4(uColor, 1.0);
    // Analytic planet shadow: does the ray from this fragment toward the sun hit the sphere?
    float shade = 1.0;
    if (uShadow > 0.5 && uPlanetRadius > 0.0) {
      vec3 dir = normalize(uSunPos - vPosW);
      vec3 oc = vPosW - vCenterW;
      float b = dot(oc, dir);
      float disc = b * b - (dot(oc, oc) - uPlanetRadius * uPlanetRadius);
      float r2 = uPlanetRadius * uPlanetRadius;
      float inShadow = step(b, 0.0) * smoothstep(0.0, 0.08 * r2, disc);
      shade = mix(1.0, uShadowLight, inShadow);
    }
    gl_FragColor = vec4(c.rgb * shade, c.a * uOpacity);
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
 * Flat planetary ring. With a texture, its colour and alpha come from the radial strip;
 * without one it is a plain faint band. Set `uniforms.uPlanetRadius` and `uShadow` to cast
 * the planet's shadow onto it.
 */
export function createRing(
  innerR: number,
  outerR: number,
  tex: THREE.Texture | null,
  opacity: number,
): THREE.Mesh {
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
      },
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
    }),
  );
  mesh.name = 'ring';
  return mesh;
}
