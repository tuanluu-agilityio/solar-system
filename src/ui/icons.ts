const SVG_NS = 'http://www.w3.org/2000/svg';

type Shape = readonly [tag: 'path' | 'circle' | 'rect', attrs: Record<string, string>];

const p = (d: string): Shape => ['path', { d }];

const SHAPES = {
  globe: [
    ['circle', { cx: '12', cy: '12', r: '9' }],
    p('M3 12h18'),
    p('M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18'),
  ],
  volumeOn: [
    p('M4 9.5v5h3.5l4.5 4v-13l-4.5 4z'),
    p('M15.5 9a4 4 0 010 6'),
    p('M18.2 6.4a8 8 0 010 11.2'),
  ],
  volumeOff: [p('M4 9.5v5h3.5l4.5 4v-13l-4.5 4z'), p('M16 9.5l5 5M21 9.5l-5 5')],
  play: [p('M8.5 5.5v13l10-6.5z')],
  stop: [['rect', { x: '7', y: '7', width: '10', height: '10', rx: '1.5' }]],
  pause: [p('M9 6v12M15 6v12')],
  info: [['circle', { cx: '12', cy: '12', r: '9' }], p('M12 11v5.5M12 7.8v.01')],
  cog: [
    ['circle', { cx: '12', cy: '12', r: '3' }],
    ['circle', { cx: '12', cy: '12', r: '6.5' }],
    p(
      'M12 2.8v2.7M12 18.5v2.7M2.8 12h2.7M18.5 12h2.7M5.5 5.5l1.9 1.9M16.6 16.6l1.9 1.9M18.5 5.5l-1.9 1.9M7.4 16.6l-1.9 1.9',
    ),
  ],
  chevronLeft: [p('M14.5 6l-6 6 6 6')],
  chevronRight: [p('M9.5 6l6 6-6 6')],
  skipPrev: [p('M7 6v12M18 6.5l-9 5.5 9 5.5z')],
  skipNext: [p('M17 6v12M6 6.5l9 5.5-9 5.5z')],
  close: [p('M6 6l12 12M18 6L6 18')],
  check: [p('M5 12.5l4.5 4.5L19 7.5')],
} satisfies Record<string, readonly Shape[]>;

export type IconName = keyof typeof SHAPES;

/** A small stroke-style inline icon, hidden from assistive tech (the button carries the name). */
export function icon(name: IconName): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.6');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('icon');
  for (const [tag, attrs] of SHAPES[name]) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    svg.append(el);
  }
  return svg;
}

/** Replaces the content of `host` with the icon (keeps other siblings untouched via `data-icon`). */
export function setIcon(host: HTMLElement, name: IconName): void {
  if (host.dataset.icon === name) return;
  host.dataset.icon = name;
  host.querySelector('svg.icon')?.remove();
  host.prepend(icon(name));
}
