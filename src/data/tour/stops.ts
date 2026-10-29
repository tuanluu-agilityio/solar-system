import type { TourStopDef } from '../types';

// Tour route (spec §3.8): intro on the overview, 12 body stops, outro back on the overview.
// Narration text for each stop id lives in ./vi.json and ./en.json.
export const TOUR_STOPS: TourStopDef[] = [
  { id: 'intro', focus: 'overview' },
  { id: 'sun', focus: 'sun' },
  { id: 'mercury', focus: 'mercury' },
  { id: 'venus', focus: 'venus' },
  { id: 'earth', focus: 'earth' },
  { id: 'moon', focus: 'moon' },
  { id: 'mars', focus: 'mars' },
  { id: 'asteroid-belt', focus: 'asteroid-belt' },
  { id: 'jupiter', focus: 'jupiter' },
  { id: 'saturn', focus: 'saturn' },
  { id: 'uranus', focus: 'uranus' },
  { id: 'neptune', focus: 'neptune' },
  { id: 'pluto', focus: 'pluto' },
  { id: 'outro', focus: 'overview' },
];
