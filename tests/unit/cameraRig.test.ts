import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { AUTO_ORBIT_RAD_PER_SEC, createCameraRig } from '../../src/camera/cameraRig';
import { focusDistance, focusScreenOffset } from '../../src/camera/framing';

const W = 1000;
const H = 600;

function setup() {
  const size = { w: W, h: H };
  const dom = document.createElement('div');
  Object.defineProperty(dom, 'clientWidth', { get: () => size.w });
  Object.defineProperty(dom, 'clientHeight', { get: () => size.h });
  document.body.append(dom);
  const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 20000);
  const rig = createCameraRig(camera, dom);
  return { dom, camera, rig, size };
}

function body(x: number, y: number, z: number, radius = 2) {
  const object = new THREE.Object3D();
  object.position.set(x, y, z);
  object.updateMatrixWorld();
  return { object, radius };
}

/** Steps the rig for `sec` seconds at 60 FPS. */
function run(rig: { update(dt: number): void }, sec: number): void {
  for (let t = 0; t < sec; t += 1 / 60) rig.update(1 / 60);
}

const targetOf = (camera: THREE.PerspectiveCamera): THREE.Vector3 =>
  new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);

describe('createCameraRig', () => {
  it('starts in overview looking at the origin with no view offset', () => {
    const { camera, rig } = setup();
    rig.update(0);
    expect(rig.getTarget()).toBeNull();
    expect(camera.position.length()).toBeGreaterThan(30);
    const toOrigin = camera.position.clone().negate().normalize();
    expect(targetOf(camera).dot(toOrigin)).toBeCloseTo(1, 4);
    expect(camera.view?.enabled ?? false).toBe(false);
  });

  it('flyTo resolves after the transition and frames the body at the focus distance', async () => {
    const { camera, rig } = setup();
    rig.setLayout('desktop');
    const t = body(100, 0, 0);
    let done = false;
    void rig.flyTo(t).then(() => (done = true));
    run(rig, 3);
    await Promise.resolve();
    expect(done).toBe(true);
    expect(rig.getTarget()).toBe(t);
    const d = camera.position.distanceTo(t.object.position);
    expect(d).toBeCloseTo(focusDistance(2, camera.fov, camera.aspect), 0);
  });

  it('a newer flyTo supersedes: the older promise resolves and the latest target wins', async () => {
    const { camera, rig } = setup();
    const a = body(60, 0, 0);
    const b = body(-120, 0, 40, 5);
    let aDone = false;
    void rig.flyTo(a).then(() => (aDone = true));
    rig.update(1 / 60);
    void rig.flyTo(b);
    await Promise.resolve();
    expect(aDone).toBe(true);
    run(rig, 3);
    expect(rig.getTarget()).toBe(b);
    const dir = b.object.position.clone().sub(camera.position).normalize();
    expect(targetOf(camera).dot(dir)).toBeCloseTo(1, 3);
  });

  it('follows the target: a body move shifts the camera by the same delta', async () => {
    const { camera, rig } = setup();
    const t = body(80, 0, 0);
    void rig.flyTo(t);
    run(rig, 6);
    const before = camera.position.clone();
    t.object.position.x += 5;
    t.object.updateMatrixWorld();
    rig.update(1 / 60);
    expect(camera.position.x - before.x).toBeCloseTo(5, 3);
    expect(camera.position.z - before.z).toBeCloseTo(0, 3);
  });

  it('flyToOverview clears the target and the view offset', async () => {
    const { camera, rig } = setup();
    rig.setLayout('desktop');
    void rig.flyTo(body(80, 0, 0));
    run(rig, 3);
    expect(camera.view?.enabled).toBe(true);
    let done = false;
    void rig.flyToOverview().then(() => (done = true));
    run(rig, 3);
    await Promise.resolve();
    expect(done).toBe(true);
    expect(rig.getTarget()).toBeNull();
    expect(camera.view?.enabled ?? false).toBe(false);
    const toOrigin = camera.position.clone().negate().normalize();
    expect(targetOf(camera).dot(toOrigin)).toBeCloseTo(1, 3);
  });

  it('applies focusScreenOffset as a view offset per layout while focused', () => {
    const { camera, rig } = setup();
    void rig.flyTo(body(80, 0, 0));
    rig.setLayout('desktop');
    const d = focusScreenOffset('desktop');
    expect(camera.view?.enabled).toBe(true);
    expect(camera.view?.offsetX).toBeCloseTo((-d.x * W) / 2, 6);
    expect(camera.view?.offsetY).toBeCloseTo((d.y * H) / 2, 6);
    rig.setLayout('mobile');
    const m = focusScreenOffset('mobile');
    expect(camera.view?.offsetX).toBeCloseTo((-m.x * W) / 2, 6);
    expect(camera.view?.offsetY).toBeCloseTo((m.y * H) / 2, 6);
  });

  it('setLayout reframes the focused body for the new aspect', () => {
    const { camera, rig, size } = setup();
    const t = body(80, 0, 0);
    void rig.flyTo(t);
    run(rig, 3);
    // Phone rotated to portrait: the caller resizes the canvas, then calls setLayout.
    size.w = 300;
    size.h = 600;
    camera.aspect = 0.5;
    camera.updateProjectionMatrix();
    rig.setLayout('mobile');
    run(rig, 3);
    const d = camera.position.distanceTo(t.object.position);
    expect(d).toBeCloseTo(focusDistance(2, camera.fov, 0.5), 0);
    expect(rig.getTarget()).toBe(t);
  });

  it('auto-orbit turns the azimuth around the target', () => {
    const { camera, rig } = setup();
    const t = body(80, 0, 0);
    void rig.flyTo(t);
    run(rig, 3);
    const angle = (): number => {
      const v = camera.position.clone().sub(t.object.position);
      return Math.atan2(v.x, v.z);
    };
    const a0 = angle();
    rig.setAutoOrbit(true);
    run(rig, 1);
    const turned = angle() - a0;
    expect(turned).toBeCloseTo(AUTO_ORBIT_RAD_PER_SEC, 1);
    rig.setAutoOrbit(false);
    const a1 = angle();
    run(rig, 1);
    expect(angle()).toBeCloseTo(a1, 4);
  });

  it('onUserInteract fires on a user pointer gesture and can be removed', () => {
    const { dom, rig } = setup();
    let n = 0;
    const off = rig.onUserInteract(() => n++);
    const down = (): void => {
      const e = new MouseEvent('pointerdown', { buttons: 1, button: 0, clientX: 5, clientY: 5 });
      Object.assign(e, { pointerId: 1, pointerType: 'mouse' });
      dom.dispatchEvent(e);
      const up = new MouseEvent('pointerup', { button: 0, clientX: 5, clientY: 5 });
      Object.assign(up, { pointerId: 1, pointerType: 'mouse' });
      dom.ownerDocument.dispatchEvent(up);
    };
    down();
    expect(n).toBe(1);
    off();
    down();
    expect(n).toBe(1);
  });
});
