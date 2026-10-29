import type { ContentId, Lang } from '../data/types';
import type { QualityTier } from '../quality/tiers';
import type { TourSnapshot } from '../tour/tourMachine';
import type { Layout } from '../ui/layout';

export type View = 'overview' | 'focus';
export interface AppState {
  lang: Lang;
  muted: boolean;
  selected: ContentId | null;
  view: View;
  layout: Layout;
  quality: QualityTier;
  tour: TourSnapshot;
  ready: boolean;
}
