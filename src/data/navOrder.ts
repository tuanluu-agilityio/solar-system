import { BODY_IDS, type ContentId } from './types';

/**
 * Navigation order for "next / previous body": the Sun outward, with the asteroid belt
 * between Mars (and its moons) and Jupiter. A moon follows its planet because `BODY_IDS`
 * lists it there.
 */
export const NAV_ORDER: readonly ContentId[] = BODY_IDS.flatMap((id): ContentId[] =>
  id === 'jupiter' ? ['asteroid-belt', id] : [id],
);
