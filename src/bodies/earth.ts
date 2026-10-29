import * as THREE from 'three';

/** Shells around a planet: clouds just above the surface, the atmosphere glow a bit higher. */
export const CLOUD_SCALE = 1.01;
export const ATMOSPHERE_SCALE = 1.04;
/** Clouds drift eastward relative to the ground. */
export const CLOUD_SPIN_FACTOR = 1.2;

// Matches the MeshStandardMaterial day side under the decay-0 sun light (intensity 3 / PI).
const DAY_LIGHT = 0.95;
const DAY_AMBIENT = 0.015;
// City lights sit slightly above the bloom threshold so they glow softly.
const NIGHT_GAIN = 1.6;
const RIM_COLOR = new THREE.Color('#6fb4ff');
const RIM_STRENGTH = 0.55;

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
  uniform vec3 uSunPos;
  uniform float uDayLight;
  uniform float uAmbient;
  uniform float uNightGain;
  uniform vec3 uRimColor;
  uniform float uRimStrength;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;

  void main() {
    vec3 n = normalize(vNormalW);
    vec3 l = normalize(uSunPos - vPosW);
    vec3 v = normalize(cameraPosition - vPosW);
    float ndl = dot(n, l);
    // Smooth terminator: twilight band of roughly +-10 degrees.
    float dayMix = smoothstep(-0.15, 0.2, ndl);
    vec3 day = texture2D(uDay, vUv).rgb * (max(ndl, 0.0) * uDayLight + uAmbient);
    vec3 night = texture2D(uNight, vUv).rgb * uNightGain * (1.0 - dayMix);
    // Thin scattering rim on the lit limb.
    float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
    vec3 rim = uRimColor * fres * uRimStrength * smoothstep(-0.2, 0.5, ndl);
    gl_FragColor = vec4(day + night + rim, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const atmosphereFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform vec3 uSunPos;
  varying vec3 vNormalW;
  varying vec3 vPosW;

  void main() {
    vec3 n = normalize(vNormalW);
    vec3 v = normalize(cameraPosition - vPosW);
    // Back faces: n.v runs from 0 at the shell's silhouette to about -0.28 at the planet's
    // limb (1.04 shell), so the glow peaks at the limb and fades to nothing outward.
    float rim = smoothstep(0.0, 0.3, -dot(n, v));
    rim *= rim;
    // Twilight wraps a little past the terminator; the night limb stays nearly dark.
    float lit = 0.02 + 0.98 * smoothstep(-0.25, 0.45, dot(n, normalize(uSunPos - vPosW)));
    gl_FragColor = vec4(uColor * rim * lit * uIntensity, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Day/night shader for Earth: N.L blend, city lights on the dark side, smooth terminator. */
export function createEarthMaterial(
  day: THREE.Texture,
  night: THREE.Texture,
  sunWorldPos: THREE.Vector3,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uDay: { value: day },
      uNight: { value: night },
      uSunPos: { value: sunWorldPos },
      uDayLight: { value: DAY_LIGHT },
      uAmbient: { value: DAY_AMBIENT },
      uNightGain: { value: NIGHT_GAIN },
      uRimColor: { value: RIM_COLOR.clone() },
      uRimStrength: { value: RIM_STRENGTH },
    },
    vertexShader: worldVertex,
    fragmentShader: earthFragment,
  });
}

/** Transparent cloud shell at radius * 1.01. The caller spins it 1.2x Earth's rate. */
export function createCloudLayer(clouds: THREE.Texture, radius: number, segments = 64): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius * CLOUD_SCALE, segments, segments / 2),
    new THREE.MeshStandardMaterial({
      map: clouds,
      transparent: true,
      depthWrite: false,
      roughness: 1,
      metalness: 0,
    }),
  );
  mesh.name = 'clouds';
  return mesh;
}

/** Additive Fresnel glow on a back-side shell at radius * 1.04, brighter on the sunlit side. */
export function createAtmosphere(
  radius: number,
  color: THREE.ColorRepresentation,
  intensity: number,
  segments = 64,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius * ATMOSPHERE_SCALE, segments, segments / 2),
    new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uIntensity: { value: intensity },
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
