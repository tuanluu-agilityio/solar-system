import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createSolarSystem } from '../../src/scene/solarSystem';
import { textureKeysFor } from '../../src/scene/textures';
import { makeFallbackTexture } from '../../src/scene/textures';
import { tierSettings } from '../../src/quality/tiers';
import { BODY_IDS } from '../../src/data/types';

const ALL_KEYS = [
  'mercury',
  'venus_surface',
  'venus_atmosphere',
  'earth_day',
  'earth_night',
  'earth_clouds',
  'moon',
  'mars',
  'jupiter',
  'saturn',
  'saturn_ring',
  'uranus',
  'neptune',
  'pluto',
];

function tex(): THREE.Texture {
  return new THREE.DataTexture(new Uint8Array([200, 200, 200, 255]), 1, 1);
}

function textures(keys = ALL_KEYS): Map<string, THREE.Texture> {
  return new Map(keys.map((k) => [k, tex()]));
}

describe('textureKeysFor', () => {
  it('lists every texture a body uses', () => {
    expect(textureKeysFor('earth')).toEqual(['earth_day', 'earth_night', 'earth_clouds']);
    expect(textureKeysFor('venus')).toEqual(['venus_atmosphere', 'venus_surface']);
    expect(textureKeysFor('saturn')).toEqual(['saturn', 'saturn_ring']);
    expect(textureKeysFor('jupiter')).toEqual(['jupiter']);
    expect(textureKeysFor('moon')).toEqual(['moon']);
  });

  it('gives the sun no keys (it has its own shader) and the rest their own key', () => {
    expect(textureKeysFor('sun')).toEqual([]);
    for (const id of BODY_IDS) {
      if (id === 'sun') continue;
      expect(textureKeysFor(id).length).toBeGreaterThan(0);
    }
  });
});

describe('SolarSystem.upgradeTextures', () => {
  it('swaps a planet map and disposes the low texture', () => {
    const low = textures();
    const ss = createSolarSystem(low, tierSettings('high'));
    const lowJupiter = low.get('jupiter')!;
    const dispose = vi.spyOn(lowJupiter, 'dispose');
    const hi = tex();
    ss.upgradeTextures('jupiter', new Map([['jupiter', hi]]));
    const m = ss.bodies.get('jupiter')!.mesh.material as THREE.MeshStandardMaterial;
    expect(m.map).toBe(hi);
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('does not dispose a low texture another body still uses', () => {
    const low = textures();
    low.set('mars', low.get('jupiter')!);
    const ss = createSolarSystem(low, tierSettings('high'));
    const shared = low.get('jupiter')!;
    const dispose = vi.spyOn(shared, 'dispose');
    ss.upgradeTextures('jupiter', new Map([['jupiter', tex()]]));
    expect(dispose).not.toHaveBeenCalled();
  });

  it('swaps Earth day, night and clouds', () => {
    const ss = createSolarSystem(textures(), tierSettings('high'));
    const hi = new Map([
      ['earth_day', tex()],
      ['earth_night', tex()],
      ['earth_clouds', tex()],
    ]);
    ss.upgradeTextures('earth', hi);
    const m = ss.bodies.get('earth')!.mesh.material as THREE.ShaderMaterial;
    expect(m.uniforms.uDay!.value).toBe(hi.get('earth_day'));
    expect(m.uniforms.uNight!.value).toBe(hi.get('earth_night'));
    const clouds = ss.root.getObjectByName('earth-clouds') as THREE.Mesh;
    expect((clouds.material as THREE.MeshStandardMaterial).map).toBe(hi.get('earth_clouds'));
  });

  it('swaps the Saturn ring strip and Venus atmosphere map', () => {
    const ss = createSolarSystem(textures(), tierSettings('high'));
    const hi = new Map([
      ['saturn', tex()],
      ['saturn_ring', tex()],
    ]);
    ss.upgradeTextures('saturn', hi);
    const ring = ss.root.getObjectByName('saturn-ring') as THREE.Mesh;
    expect((ring.material as THREE.ShaderMaterial).uniforms.uMap!.value).toBe(
      hi.get('saturn_ring'),
    );
    const venus = new Map([['venus_atmosphere', tex()]]);
    ss.upgradeTextures('venus', venus);
    const vm = ss.bodies.get('venus')!.mesh.material as THREE.MeshStandardMaterial;
    expect(vm.map).toBe(venus.get('venus_atmosphere'));
  });

  it('ignores fallback stand-ins from a failed high load', () => {
    const low = textures();
    const ss = createSolarSystem(low, tierSettings('high'));
    ss.upgradeTextures('jupiter', new Map([['jupiter', makeFallbackTexture('jupiter')]]));
    const m = ss.bodies.get('jupiter')!.mesh.material as THREE.MeshStandardMaterial;
    expect(m.map).toBe(low.get('jupiter'));
  });
});
