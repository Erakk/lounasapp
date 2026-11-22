import { describe, expect, it } from 'vitest';
import { PLACES } from '../data/places';
import { DEFAULT_FILTERS, filterPlaces } from './filters';
import { DEFAULT_RANDOM_SETTINGS, buildOptions, pickRandom, placeWeight, seededRng, type RandomOption } from './randomPick';
import { EMPTY_STATS, type PlaceStats } from './stats';

const MON_NOON = new Date(2026, 10, 23, 12, 0);
const SUN_NOON = new Date(2026, 10, 22, 12, 0);
const byId = (id: string) => PLACES.find((p) => p.id === id)!;
const st = (over: Partial<PlaceStats>): PlaceStats => ({ ...EMPTY_STATS, ...over });
const S = DEFAULT_RANDOM_SETTINGS;

describe('placeWeight', () => {
  const malika = byId('ravintola-malika');
  it('down-weights recent visits', () => {
    expect(placeWeight(malika, st({ lastVisited: '2026-11-20T10:00:00Z' }), S, MON_NOON)).toBeCloseTo(0.3);
    expect(placeWeight(malika, st({ lastVisited: '2026-11-12T10:00:00Z' }), S, MON_NOON)).toBeCloseTo(0.6);
    expect(placeWeight(malika, st({ lastVisited: '2026-10-01T10:00:00Z' }), S, MON_NOON)).toBe(1);
  });
  it('boosts favourites and good own ratings', () => {
    expect(placeWeight(malika, st({ favourite: true }), S, MON_NOON)).toBeCloseTo(1.5);
    expect(placeWeight(malika, st({ avgStars: 5 }), S, MON_NOON)).toBeCloseTo(1.5);
    expect(placeWeight(malika, st({ avgStars: 1 }), S, MON_NOON)).toBeCloseTo(1);
  });
  it('can halve divisive places', () => {
    const gopal = byId('gopal');
    expect(placeWeight(gopal, undefined, { ...S, avoidDivisive: true }, MON_NOON)).toBeCloseTo(0.5);
    expect(placeWeight(gopal, undefined, S, MON_NOON)).toBe(1);
  });
  it('ignores history when the settings are off', () => {
    const off = { ...S, avoidRecent: false, preferLiked: false };
    expect(placeWeight(malika, st({ lastVisited: '2026-11-22T10:00:00Z', favourite: true, avgStars: 5 }), off, MON_NOON)).toBe(1);
  });
});

describe('buildOptions', () => {
  const all = filterPlaces(PLACES, DEFAULT_FILTERS, MON_NOON);

  it('only includes places with lunch today and confirmed info by default', () => {
    const sunday = buildOptions(all, new Map(), S, SUN_NOON);
    const monday = buildOptions(all, new Map(), S, MON_NOON);
    expect(sunday.length).toBeLessThan(monday.length);
    expect(monday.every((o) => o.kind !== 'place' || o.place.status === 'open')).toBe(true);
  });

  it('merges cluster places into one option each', () => {
    const opts = buildOptions(all, new Map(), { ...S, clustersAsOne: true }, MON_NOON);
    const clusters = opts.filter((o) => o.kind === 'cluster');
    expect(clusters.map((c) => c.id).sort()).toEqual(['cluster:kauppahalli', 'cluster:koskikeskus', 'cluster:ratina']);
    expect(opts.some((o) => o.kind === 'place' && o.place.clusterId)).toBe(false);
    const kh = clusters.find((c) => c.id === 'cluster:kauppahalli') as Extract<RandomOption, { kind: 'cluster' }>;
    expect(kh.places.length).toBeGreaterThan(5);
  });
});

describe('pickRandom', () => {
  const opts: RandomOption[] = ['a', 'b', 'c'].map((id, i) => ({
    kind: 'place',
    id,
    place: PLACES[i]!,
    weight: id === 'c' ? 0 : 1,
  }));

  it('is deterministic with a seeded rng and never picks weight 0', () => {
    const r1 = seededRng(42);
    const r2 = seededRng(42);
    const seq1 = Array.from({ length: 50 }, () => pickRandom(opts, r1)!.id);
    const seq2 = Array.from({ length: 50 }, () => pickRandom(opts, r2)!.id);
    expect(seq1).toEqual(seq2);
    expect(seq1).not.toContain('c');
  });

  it('respects weights roughly', () => {
    const weighted: RandomOption[] = [
      { kind: 'place', id: 'heavy', place: PLACES[0]!, weight: 3 },
      { kind: 'place', id: 'light', place: PLACES[1]!, weight: 1 },
    ];
    const rng = seededRng(7);
    const heavy = Array.from({ length: 4000 }, () => pickRandom(weighted, rng)!.id).filter((x) => x === 'heavy').length;
    expect(heavy / 4000).toBeGreaterThan(0.7);
    expect(heavy / 4000).toBeLessThan(0.8);
  });

  it('avoids repeating the previous pick unless it is the only option', () => {
    const rng = seededRng(1);
    for (let i = 0; i < 30; i++) expect(pickRandom(opts, rng, 'a')!.id).toBe('b');
    expect(pickRandom([opts[0]!], rng, 'a')!.id).toBe('a');
  });

  it('returns undefined when nothing can be picked', () => {
    expect(pickRandom([])).toBeUndefined();
  });
});
