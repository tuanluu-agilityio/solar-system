import * as THREE from 'three';

export const SKY_RADIUS = 5000;

/**
 * The Milky Way sits about 60 degrees from the ecliptic (the orbit plane). Tilting the sky
 * sphere the same way (about the z axis, so the overview never looks at a stretched texture
 * pole) lets the band cross the downward-looking overview instead of hiding along the
 * horizon just above the top edge.
 */
export const SKY_TILT_RAD = THREE.MathUtils.degToRad(60.2);
/** Turn of the tilted band about the vertical axis so it crosses the default overview. */
export const SKY_YAW_RAD = THREE.MathUtils.degToRad(-22);

/**
 * The committed sky maps are very dark (band texels about 3-10 of 255, the brightest stars
 * about 0.2), and the composer's ACES tone mapping darkens them further. Linear texel `c`
 * loses a black point (the 1-2 of 255 compression noise of empty space, which a plain gain
 * turns into visible blocks), becomes `gain * c^gamma`, then a soft shoulder toward `max`:
 * the band reads clearly, empty space stays black, and no star reaches the bloom threshold
 * (only the Sun blooms).
 */
export const SKY_TONE = { black: 0.0008, gain: 14, gamma: 1, max: 0.6 } as const;

/** CPU mirror of the sky shader's tone curve (for tests and tuning). */
export function skyTone(c: number): number {
  const x = SKY_TONE.gain * Math.pow(Math.max(c - SKY_TONE.black, 0), SKY_TONE.gamma);
  return SKY_TONE.max * (1 - Math.exp(-x / SKY_TONE.max));
}

/**
 * Sky look (visual only, not data). The sky map is expected to be the star-free glow baked by
 * `skyGlow.ts` (the raw texture's point stars read as chunky squares when magnified), while
 * `starfield.ts` supplies crisp stars. The bake also adds darker dust lanes and a faint fbm
 * nebula map (muted hues on the galactic band), which this shader scales by `nebula`.
 */
export const SKY_FX = {
  /**
   * Gain on the sky map. The baked glow has lost the light of its point stars and is lifted a
   * little to keep the band as bright as before.
   */
  glowGain: 1.25,
  /** Linear scale of the baked nebula colour (its hues peak at about 0.55). */
  nebula: 0.15,
  /** Strength of the dust lanes darkening the band (0..1), applied in the bake. */
  lanes: 0.6,
} as const;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform sampler2D uNebulaMap;
  uniform float uBlack;
  uniform float uGain;
  uniform float uGamma;
  uniform float uMax;
  uniform float uGlowGain;
  uniform float uNebula;
  varying vec2 vUv;
  void main() {
    vec3 c = texture2D(uMap, vUv).rgb * uGlowGain;
    vec3 x = uGain * pow(max(c - uBlack, vec3(0.0)), vec3(uGamma));
    vec3 col = uMax * (1.0 - exp(-x / uMax));
    // Gas follows the starlight: strongest where the band's glow is bright.
    float glow = smoothstep(0.0, 0.1, dot(col, vec3(0.2126, 0.7152, 0.0722)));
    col += uNebula * (0.25 + 0.75 * glow) * texture2D(uNebulaMap, vUv).rgb;
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

let black: THREE.DataTexture | null = null;
function blackTexture(): THREE.DataTexture {
  if (!black) {
    black = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    black.needsUpdate = true;
  }
  return black;
}

/**
 * The sky sphere. `tex` is the Milky Way map (ideally the baked glow from `skyGlow.ts`);
 * `nebulaMap` is the baked nebula colour (without one there is no nebula).
 */
export function createSky(tex: THREE.Texture, nebulaMap?: THREE.Texture): THREE.Mesh {
  const geo = new THREE.SphereGeometry(SKY_RADIUS, 64, 32);
  geo.scale(-1, 1, 1); // mirror: flips winding so front faces point inward
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: tex },
      uNebulaMap: { value: nebulaMap ?? blackTexture() },
      uBlack: { value: SKY_TONE.black },
      uGain: { value: SKY_TONE.gain },
      uGamma: { value: SKY_TONE.gamma },
      uMax: { value: SKY_TONE.max },
      uGlowGain: { value: SKY_FX.glowGain },
      uNebula: { value: SKY_FX.nebula },
    },
    vertexShader,
    fragmentShader,
    side: THREE.FrontSide, // the mirrored geometry has inward-facing front faces
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  // Euler XYZ applies z first: tilt the band, then turn it about the vertical axis.
  mesh.rotation.set(0, SKY_YAW_RAD, SKY_TILT_RAD);
  mesh.renderOrder = -1;
  mesh.frustumCulled = false;
  return mesh;
}
