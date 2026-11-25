import type { CategoryId } from '../data/categories';
import { inCategory } from '../data/places';
import { isOpenForLunch } from './openingHours';
import type { Diet, Format, Place } from './schema';
import type { PlaceStats } from './stats';

export type SortKey = 'distance' | 'price' | 'rating' | 'name' | 'stale';

export interface Filters {
  categories: CategoryId[];
  /** Group size; places whose comfortable max is smaller are hidden. null = any. */
  groupSize: number | null;
  /** Area: only places within this straight-line distance (m) of the starting point. null = all of Tampere. */
  maxDistanceM: number | null;
  /** Max walking minutes from the chosen starting point (finer than the area). null = any. */
  maxWalk: number | null;
  /** Max lunch price in €. Places with unknown price are kept (we don't hide what we don't know). */
  maxPrice: number | null;
  openNow: boolean;
  formats: Format[];
  /** Every selected diet must be available. Vegan places also satisfy "vegetarian". */
  diets: Diet[];
  hideHighRisk: boolean;
  /** Only places whose price was checked from the restaurant this week. */
  verifiedPriceOnly: boolean;
  /** Show places marked "tarkista" (lunch info unconfirmed). */
  showUnverified: boolean;
  /** Only places marked ♥. */
  favouritesOnly: boolean;
  /** Include places the user has hidden. */
  showHidden: boolean;
  sort: SortKey;
}

/** The user's own data, keyed by place id (see domain/stats.ts). */
export type StatsMap = Map<string, PlaceStats>;
const NO_STATS: StatsMap = new Map();

export const DEFAULT_FILTERS: Filters = {
  categories: [],
  groupSize: null,
  maxDistanceM: 1000,
  maxWalk: null,
  maxPrice: null,
  openNow: false,
  formats: [],
  diets: [],
  hideHighRisk: false,
  verifiedPriceOnly: false,
  showUnverified: true,
  favouritesOnly: false,
  showHidden: false,
  sort: 'distance',
};

/** Area choices in metres; null = all of Tampere. The default is 1 km so the lists stay short. */
export const AREA_OPTIONS = [500, 1000, 2000, 5000, null] as const;
export const DEFAULT_AREA_M = 1000;
export const WALK_OPTIONS = [3, 5, 10, 15] as const;
export const PRICE_OPTIONS = [12, 14, 16] as const;

/** The price used for filtering and sorting: lunch price, else the cheapest listed. */
export function effectivePrice(p: Place): number | undefined {
  return p.price.lunch ?? p.price.min;
}

function hasDiet(p: Place, d: Diet): boolean {
  if (p.diet.includes(d)) return true;
  return d === 'vegetarian' && p.diet.includes('vegan');
}

export function matches(p: Place, f: Filters, now: Date, stats: StatsMap = NO_STATS): boolean {
  if (p.status === 'closed') return false;
  const mine = stats.get(p.id);
  if (!f.showHidden && mine?.hidden) return false;
  if (f.favouritesOnly && !mine?.favourite) return false;
  if (!f.showUnverified && p.status === 'verify') return false;
  if (f.categories.length && !f.categories.some((c) => inCategory(p, c))) return false;
  if (f.groupSize !== null && p.group.comfortMax < f.groupSize) return false;
  if (f.maxDistanceM !== null && p.distanceM > f.maxDistanceM) return false;
  if (f.maxWalk !== null && p.walkMin > f.maxWalk) return false;
  if (f.maxPrice !== null) {
    const price = effectivePrice(p);
    if (price !== undefined && price > f.maxPrice) return false;
  }
  if (f.openNow && !isOpenForLunch(p.lunchHours, now)) return false;
  if (f.formats.length && !f.formats.includes(p.format)) return false;
  if (f.diets.length && !f.diets.every((d) => hasDiet(p, d))) return false;
  if (f.hideHighRisk && p.dislikeRisk.level === 'H') return false;
  if (f.verifiedPriceOnly && !p.priceVerified) return false;
  return true;
}

const byUndefinedLast =
  <T,>(get: (p: Place) => T | undefined, cmp: (a: T, b: T) => number) =>
  (a: Place, b: Place) => {
    const va = get(a);
    const vb = get(b);
    if (va === undefined && vb === undefined) return a.distanceM - b.distanceM;
    if (va === undefined) return 1;
    if (vb === undefined) return -1;
    return cmp(va, vb) || a.distanceM - b.distanceM;
  };

export function sortPlaces(places: Place[], sort: SortKey, stats: StatsMap = NO_STATS): Place[] {
  const list = [...places];
  switch (sort) {
    case 'distance':
      return list.sort((a, b) => a.distanceM - b.distanceM);
    case 'price':
      return list.sort(byUndefinedLast(effectivePrice, (a, b) => a - b));
    case 'rating':
      // Ratings with very few reviews are noise; require at least 10.
      return list.sort(byUndefinedLast((p) => (p.rating && p.rating.count >= 10 ? p.rating.value : undefined), (a, b) => b - a));
    case 'name':
      return list.sort((a, b) => a.name.localeCompare(b.name, 'fi'));
    case 'stale':
      // "Käyty kauan sitten": places you've been to, longest ago first; never-visited after, nearest first.
      return list.sort(byUndefinedLast((p) => stats.get(p.id)?.lastVisited, (a, b) => a.localeCompare(b)));
  }
}

export function filterPlaces(places: Place[], f: Filters, now: Date, stats: StatsMap = NO_STATS): Place[] {
  return sortPlaces(
    places.filter((p) => matches(p, f, now, stats)),
    f.sort,
    stats,
  );
}

/** The next wider area after `m`, or null (all of Tampere). */
export function widerArea(m: number | null): number | null {
  if (m === null) return null;
  return AREA_OPTIONS.find((a) => a === null || a > m) ?? null;
}

/** Number of non-default filters, excluding categories, sort and area (each shown separately). */
export function activeFilterCount(f: Filters): number {
  let n = 0;
  if (f.groupSize !== null) n++;
  if (f.maxWalk !== null) n++;
  if (f.maxPrice !== null) n++;
  if (f.openNow) n++;
  n += f.formats.length + f.diets.length;
  if (f.hideHighRisk) n++;
  if (f.verifiedPriceOnly) n++;
  if (!f.showUnverified) n++;
  if (f.favouritesOnly) n++;
  if (f.showHidden) n++;
  return n;
}
