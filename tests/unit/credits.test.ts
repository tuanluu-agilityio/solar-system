import { afterEach, describe, expect, it } from 'vitest';
import { createStore } from '../../src/state/store';
import type { AppState } from '../../src/state/appState';
import { initialTour } from '../../src/tour/tourMachine';
import { MOON_MAPS_URL, TEXTURES_URL, createCredits } from '../../src/ui/credits';
import { UI_STRINGS } from '../../src/i18n/strings';
import { SUPPORTED_LANGS } from '../../src/data/types';

function setup() {
  const root = document.createElement('div');
  document.body.append(root);
  const store = createStore<AppState>({
    lang: 'en',
    muted: true,
    selected: null,
    view: 'overview',
    layout: 'desktop',
    quality: 'high',
    tour: initialTour(3),
    ready: true,
  });
  createCredits(root, store);
  return { root, store };
}

describe('createCredits', () => {
  afterEach(() => document.body.replaceChildren());

  it('keeps the required credits and credits the moon maps in every language', () => {
    const { root, store } = setup();
    for (const lang of SUPPORTED_LANGS) {
      store.set({ lang });
      const items = [...root.querySelectorAll('.credits-list li')].map((li) => li.textContent);
      expect(items, lang).toEqual([
        UI_STRINGS[lang]['credits.textures'],
        UI_STRINGS[lang]['credits.moonMaps'],
        UI_STRINGS[lang]['credits.data'],
        UI_STRINGS[lang]['credits.voice'],
      ]);
      expect(UI_STRINGS[lang]['credits.moonMaps'], lang).toContain('USGS');
    }
    const links = [...root.querySelectorAll<HTMLAnchorElement>('.credits-list a')].map(
      (a) => a.href,
    );
    expect(links).toEqual([TEXTURES_URL, MOON_MAPS_URL]);
    expect(MOON_MAPS_URL).toMatch(/^https:\/\/astrogeology\.usgs\.gov\//);
  });
});
