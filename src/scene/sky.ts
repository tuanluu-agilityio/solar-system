import * as THREE from 'three';

export const SKY_RADIUS = 5000;

export function createSky(tex: THREE.Texture): THREE.Mesh {
  const geo = new THREE.SphereGeometry(SKY_RADIUS, 64, 32);
  geo.scale(-1, 1, 1); // mirror: flips winding so front faces point inward
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    side: THREE.FrontSide, // the mirrored geometry has inward-facing front faces
    depthWrite: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = -1;
  mesh.frustumCulled = false;
  return mesh;
}
