import * as THREE from 'three';

const SEGMENTS = 256;
const OPACITY = 0.15;

/** Faint circular orbit guide in the XZ plane, centred on the origin of its parent. */
export function createOrbitLine(radius: number): THREE.LineLoop {
  const pts = new Float32Array(SEGMENTS * 3);
  for (let i = 0; i < SEGMENTS; i++) {
    const a = (i / SEGMENTS) * Math.PI * 2;
    pts.set([Math.cos(a) * radius, 0, -Math.sin(a) * radius], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  const mat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: OPACITY,
    depthWrite: false,
  });
  const line = new THREE.LineLoop(geo, mat);
  line.name = 'orbit-line';
  return line;
}
