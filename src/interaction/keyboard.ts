import type { ContentId } from '../data/types';

export type KeyAction =
  | { type: 'select'; id: ContentId }
  | { type: 'overview' }
  | { type: 'zoom'; factor: number }
  | { type: 'rotate'; azimuth: number };

/** One key press zooms by this factor (in) or its inverse (out). */
export const KEY_ZOOM_FACTOR = 0.8;
/** One key press turns the view by this many radians. */
export const KEY_ROTATE_RAD = Math.PI / 12;

export interface KeyContext {
  /** Bodies in navigation order (the Sun outward). */
  order: readonly ContentId[];
  selected: ContentId | null;
}

/** The body `step` places after `selected` in `order`, wrapping; from the overview, the first or last. */
export function neighbour(ctx: KeyContext, step: 1 | -1): ContentId | null {
  const n = ctx.order.length;
  if (n === 0) return null;
  const i = ctx.selected === null ? -1 : ctx.order.indexOf(ctx.selected);
  if (i < 0) return ctx.order[step === 1 ? 0 : n - 1] ?? null;
  return ctx.order[(i + step + n) % n] ?? null;
}

/**
 * Maps a key to a navigation action (pure). `]` / `[` and PageDown / PageUp step through the
 * bodies, Escape and Home return to the overview, `+` / `-` zoom, the arrow keys turn the view.
 */
export function keyAction(key: string, ctx: KeyContext): KeyAction | null {
  switch (key) {
    case ']':
    case 'PageDown': {
      const id = neighbour(ctx, 1);
      return id ? { type: 'select', id } : null;
    }
    case '[':
    case 'PageUp': {
      const id = neighbour(ctx, -1);
      return id ? { type: 'select', id } : null;
    }
    case 'Escape':
    case 'Home':
      return ctx.selected === null && key === 'Escape' ? null : { type: 'overview' };
    case '+':
    case '=':
      return { type: 'zoom', factor: KEY_ZOOM_FACTOR };
    case '-':
    case '_':
      return { type: 'zoom', factor: 1 / KEY_ZOOM_FACTOR };
    case 'ArrowLeft':
      return { type: 'rotate', azimuth: -KEY_ROTATE_RAD };
    case 'ArrowRight':
      return { type: 'rotate', azimuth: KEY_ROTATE_RAD };
    default:
      return null;
  }
}

function isTextEntry(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return (
    el.isContentEditable ||
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement
  );
}

/** True while a modal dialog is shown (the dialogs hide their overlay parent when closed). */
function modalOpen(): boolean {
  for (const d of document.querySelectorAll('[role="dialog"][aria-modal="true"]')) {
    if (!d.closest('[hidden]')) return true;
  }
  return false;
}

/**
 * Keyboard navigation for the scene. Ignores key presses with a modifier, inside a text
 * field, already handled by another listener, or while a modal dialog is open (dialogs own
 * Escape and the arrow keys).
 */
export function createKeyboardNav(
  target: Window | HTMLElement,
  getContext: () => KeyContext,
  onAction: (a: KeyAction) => void,
): { dispose(): void } {
  const onKey = (e: Event): void => {
    const k = e as KeyboardEvent;
    if (k.defaultPrevented || k.ctrlKey || k.metaKey || k.altKey) return;
    if (isTextEntry(k.target)) return;
    if (modalOpen()) return;
    const action = keyAction(k.key, getContext());
    if (!action) return;
    k.preventDefault();
    onAction(action);
  };
  target.addEventListener('keydown', onKey);
  return {
    dispose() {
      target.removeEventListener('keydown', onKey);
    },
  };
}
