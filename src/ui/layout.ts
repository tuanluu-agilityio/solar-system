export type Layout = 'mobile' | 'desktop';

export function getLayout(width: number, height: number): Layout {
  return width < 768 || height > width ? 'mobile' : 'desktop';
}
