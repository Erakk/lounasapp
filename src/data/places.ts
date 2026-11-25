import raw from './places.json';
import type { Place } from '../domain/schema';
import { ASIAN_SUBCATEGORIES, type CategoryId } from './categories';

/** All places, sorted by distance from Kehräsaari (validated at build time by `npm run validate`).
 *  Screens use `usePlaces()`, which re-measures from the starting point the user picked. */
export const PLACES = raw as Place[];

export const placeById = new Map(PLACES.map((p) => [p.id, p]));

/** True if the place belongs to the category, treating 'aasia' as an umbrella for its subcategories. */
export function inCategory(place: Place, cat: CategoryId): boolean {
  if (place.categories.includes(cat)) return true;
  return cat === 'aasia' && place.categories.some((c) => ASIAN_SUBCATEGORIES.includes(c));
}

export function countByCategory(places: Place[] = PLACES): Map<CategoryId, number> {
  const out = new Map<CategoryId, number>();
  for (const p of places) {
    for (const c of new Set<CategoryId>([...p.categories, ...(p.categories.some((c) => ASIAN_SUBCATEGORIES.includes(c)) ? (['aasia'] as const) : [])])) {
      out.set(c, (out.get(c) ?? 0) + 1);
    }
  }
  return out;
}
