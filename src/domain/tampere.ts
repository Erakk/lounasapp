import boundary from '../data/tampere-boundary.json';
import { pointInRing } from './geo';

/** [west, south, east, north] of the City of Tampere. */
export const TAMPERE_BBOX = boundary.bbox as [number, number, number, number];

/** True if the point lies inside the City of Tampere (municipal boundary, simplified to ~100 m). */
export function isInTampere(lat: number, lon: number): boolean {
  const [w, s, e, n] = TAMPERE_BBOX;
  if (lon < w || lon > e || lat < s || lat > n) return false;
  return pointInRing(lat, lon, boundary.ring);
}
