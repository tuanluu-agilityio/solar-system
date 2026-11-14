import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  KEY_ROTATE_RAD,
  KEY_ZOOM_FACTOR,
  createKeyboardNav,
  keyAction,
  neighbour,
  type KeyAction,
} from '../../src/interaction/keyboard';
import type { ContentId } from '../../src/data/types';

const order: ContentId[] = ['sun', 'mercury', 'venus', 'earth'];

describe('neighbour', () => {
  it('steps forward and backward and wraps', () => {
    expect(neighbour({ order, selected: 'mercury' }, 1)).toBe('venus');
    expect(neighbour({ order, selected: 'mercury' }, -1)).toBe('sun');
    expect(neighbour({ order, selected: 'earth' }, 1)).toBe('sun');
    expect(neighbour({ order, selected: 'sun' }, -1)).toBe('earth');
  });

  it('starts at the first or last body from the overview', () => {
    expect(neighbour({ order, selected: null }, 1)).toBe('sun');
    expect(neighbour({ order, selected: null }, -1)).toBe('earth');
  });

  it('returns null for an empty order', () => {
    expect(neighbour({ order: [], selected: null }, 1)).toBeNull();
  });
});

describe('keyAction', () => {
  const ctx = { order, selected: 'venus' as ContentId };

  it('maps the bracket and page keys to the neighbouring body', () => {
    expect(keyAction(']', ctx)).toEqual({ type: 'select', id: 'earth' });
    expect(keyAction('PageDown', ctx)).toEqual({ type: 'select', id: 'earth' });
    expect(keyAction('[', ctx)).toEqual({ type: 'select', id: 'mercury' });
    expect(keyAction('PageUp', ctx)).toEqual({ type: 'select', id: 'mercury' });
  });

  it('Escape leaves a focused body but does nothing in the overview; Home always returns', () => {
    expect(keyAction('Escape', ctx)).toEqual({ type: 'overview' });
    expect(keyAction('Escape', { order, selected: null })).toBeNull();
    expect(keyAction('Home', { order, selected: null })).toEqual({ type: 'overview' });
  });

  it('maps zoom and rotate keys', () => {
    expect(keyAction('+', ctx)).toEqual({ type: 'zoom', factor: KEY_ZOOM_FACTOR });
    expect(keyAction('=', ctx)).toEqual({ type: 'zoom', factor: KEY_ZOOM_FACTOR });
    expect(keyAction('-', ctx)).toEqual({ type: 'zoom', factor: 1 / KEY_ZOOM_FACTOR });
    expect(keyAction('ArrowLeft', ctx)).toEqual({ type: 'rotate', azimuth: -KEY_ROTATE_RAD });
    expect(keyAction('ArrowRight', ctx)).toEqual({ type: 'rotate', azimuth: KEY_ROTATE_RAD });
  });

  it('ignores other keys', () => {
    expect(keyAction('a', ctx)).toBeNull();
    expect(keyAction('Enter', ctx)).toBeNull();
  });
});

describe('createKeyboardNav', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  const press = (init: KeyboardEventInit, target: EventTarget = window): KeyboardEvent => {
    const e = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
    target.dispatchEvent(e);
    return e;
  };

  it('dispatches the action and prevents the default', () => {
    const seen: KeyAction[] = [];
    const nav = createKeyboardNav(
      window,
      () => ({ order, selected: null }),
      (a) => seen.push(a),
    );
    const e = press({ key: ']' });
    expect(seen).toEqual([{ type: 'select', id: 'sun' }]);
    expect(e.defaultPrevented).toBe(true);
    nav.dispose();
    press({ key: ']' });
    expect(seen).toHaveLength(1);
  });

  it('ignores modifier chords, text fields and unmapped keys', () => {
    const onAction = vi.fn();
    const nav = createKeyboardNav(window, () => ({ order, selected: 'sun' }), onAction);
    press({ key: '+', ctrlKey: true });
    press({ key: 'x' });
    const input = document.createElement('input');
    document.body.append(input);
    press({ key: 'ArrowLeft' }, input);
    expect(onAction).not.toHaveBeenCalled();
    nav.dispose();
  });

  it('stays out of the way while a modal dialog is open', () => {
    const onAction = vi.fn();
    const nav = createKeyboardNav(window, () => ({ order, selected: 'sun' }), onAction);
    const overlay = document.createElement('div');
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    overlay.append(dialog);
    document.body.append(overlay);
    press({ key: 'Escape' });
    expect(onAction).not.toHaveBeenCalled();
    overlay.hidden = true;
    press({ key: 'Escape' });
    expect(onAction).toHaveBeenCalledWith({ type: 'overview' });
    nav.dispose();
  });
});
