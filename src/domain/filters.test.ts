import { describe, expect, it } from 'vitest';
import { PLACES } from '../data/places';
import { DEFAULT_FILTERS, activeFilterCount, effectivePrice, filterPlaces, matches, type Filters } from './filters';
import { EMPTY_STATS } from './stats';

const MON_NOON = new Date(2026, 10, 23, 12, 0);
const SUN_NOON = new Date(2026, 10, 22, 12, 0);
const f = (over: Partial<Filters>): Filters => ({ ...DEFAULT_FILTERS, ...over });
const byId = (id: string) => PLACES.find((p) => p.id === id)!;

describe('filterPlaces', () => {
  it('returns every non-closed place with default filters, nearest first', () => {
    const r = filterPlaces(PLACES, DEFAULT_FILTERS, MON_NOON);
    expect(r.length).toBe(PLACES.filter((p) => p.status !== 'closed').length);
    expect(r[0]!.distanceM).toBeLessThanOrEqual(r[r.length - 1]!.distanceM);
  });

  it('filters by group size using comfortMax', () => {
    const r = filterPlaces(PLACES, f({ groupSize: 12 }), MON_NOON);
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((p) => p.group.comfortMax >= 12)).toBe(true);
    expect(r.some((p) => p.id === 'kauppahallin-kotilounas')).toBe(false); // max 3
  });

  it('filters by walking time', () => {
    const r = filterPlaces(PLACES, f({ maxWalk: 5 }), MON_NOON);
    expect(r.every((p) => p.walkMin <= 5)).toBe(true);
  });

  it('keeps places with unknown price when a max price is set', () => {
    const r = filterPlaces(PLACES, f({ maxPrice: 12 }), MON_NOON);
    expect(r.some((p) => p.id === 'kauppahallin-kotilounas')).toBe(true); // 12 €
    expect(r.some((p) => p.id === 'astor')).toBe(false); // 26 €
    expect(r.some((p) => p.id === 'sayam9')).toBe(true); // unknown
  });

  it('open now depends on the weekday', () => {
    expect(matches(byId('ravintola-malika'), f({ openNow: true }), MON_NOON)).toBe(true);
    expect(matches(byId('ravintola-malika'), f({ openNow: true }), SUN_NOON)).toBe(false);
  });

  it('vegan places count as vegetarian', () => {
    expect(matches(byId('gopal'), f({ diets: ['vegetarian'] }), MON_NOON)).toBe(true);
    expect(matches(byId('eurolohi'), f({ diets: ['vegetarian'] }), MON_NOON)).toBe(false);
  });

  it('can hide high dislike risk and unverified places', () => {
    const r = filterPlaces(PLACES, f({ hideHighRisk: true, showUnverified: false }), MON_NOON);
    expect(r.some((p) => p.dislikeRisk.level === 'H')).toBe(false);
    expect(r.some((p) => p.status === 'verify')).toBe(false);
  });

  it('combines categories with OR and other filters with AND', () => {
    const r = filterPlaces(PLACES, f({ categories: ['intia', 'kebab'], maxWalk: 10 }), MON_NOON);
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((p) => p.walkMin <= 10 && (p.categories.includes('intia') || p.categories.includes('kebab')))).toBe(true);
  });
});

describe('sorting', () => {
  it('sorts by price with unknown prices last', () => {
    const r = filterPlaces(PLACES, f({ sort: 'price' }), MON_NOON);
    const prices = r.map(effectivePrice);
    const firstUnknown = prices.indexOf(undefined);
    const known = prices.slice(0, firstUnknown) as number[];
    expect(known).toEqual([...known].sort((a, b) => a - b));
    expect(prices.slice(firstUnknown).every((x) => x === undefined)).toBe(true);
  });

  it('sorts by rating, ignoring ratings with fewer than 10 reviews', () => {
    const r = filterPlaces(PLACES, f({ sort: 'rating' }), MON_NOON);
    expect(r[0]!.rating!.count).toBeGreaterThanOrEqual(10);
    expect(r[0]!.rating!.value).toBeGreaterThanOrEqual(r[1]!.rating?.value ?? 0);
  });
});

describe('personal data in filters', () => {
  const stats = new Map([
    ['ravintola-malika', { ...EMPTY_STATS, visitCount: 3, lastVisited: '2026-11-01T10:00:00.000Z', favourite: true }],
    ['noodle-master', { ...EMPTY_STATS, visitCount: 1, lastVisited: '2026-11-20T10:00:00.000Z' }],
    ['astor', { ...EMPTY_STATS, hidden: true }],
  ]);

  it('hides hidden places unless asked', () => {
    expect(filterPlaces(PLACES, DEFAULT_FILTERS, MON_NOON, stats).some((p) => p.id === 'astor')).toBe(false);
    expect(filterPlaces(PLACES, f({ showHidden: true }), MON_NOON, stats).some((p) => p.id === 'astor')).toBe(true);
  });

  it('can show favourites only', () => {
    expect(filterPlaces(PLACES, f({ favouritesOnly: true }), MON_NOON, stats).map((p) => p.id)).toEqual(['ravintola-malika']);
  });

  it('"stale" sort puts the longest-ago visit first and never-visited after', () => {
    const r = filterPlaces(PLACES, f({ sort: 'stale' }), MON_NOON, stats);
    expect(r[0]!.id).toBe('ravintola-malika');
    expect(r[1]!.id).toBe('noodle-master');
    expect(stats.has(r[2]!.id)).toBe(false);
  });
});

describe('activeFilterCount', () => {
  it('counts non-default filters', () => {
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
    expect(activeFilterCount(f({ groupSize: 4, openNow: true, diets: ['vegan', 'halal'] }))).toBe(4);
  });
});
