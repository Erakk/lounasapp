import { describe, expect, it } from 'vitest';
import { PLACES } from '../data/places';
import { ORIGIN } from '../data/categories';
import { bounds, circlePolygon, groupSpots, radiusForWalk } from './geo';

const haversine = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const R = 6371000;
  const r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lon - a.lon) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

describe('walking rings', () => {
  it('matches the walk-time estimate used in the data', () => {
    expect(radiusForWalk(5)).toBe(308);
    expect(radiusForWalk(10)).toBe(615);
    // A place listed as 5 min away lies within the 5.5 min radius.
    const fiveMin = PLACES.filter((p) => p.walkMin === 5);
    expect(fiveMin.every((p) => p.distanceM <= radiusForWalk(5.5))).toBe(true);
  });

  it('draws a closed circle at the right radius', () => {
    const ring = circlePolygon(ORIGIN, 615, 32);
    expect(ring).toHaveLength(33);
    expect(ring[0]).toEqual(ring[32]);
    for (const [lon, lat] of ring) expect(haversine(ORIGIN, { lat, lon })).toBeCloseTo(615, -1);
  });
});

describe('groupSpots', () => {
  const spots = groupSpots(PLACES);

  it('puts each shopping centre / market hall into one spot', () => {
    const kh = spots.find((s) => s.key === 'cluster:kauppahalli')!;
    expect(kh.places.length).toBeGreaterThan(8);
    expect(spots.filter((s) => s.clusterId === 'kauppahalli')).toHaveLength(1);
  });

  it('merges places at identical coordinates and keeps every place exactly once', () => {
    const suoma = spots.find((s) => s.places.some((p) => p.id === 'suoma'))!;
    expect(suoma.places.map((p) => p.id)).toContain('eflatun');
    expect(spots.reduce((n, s) => n + s.places.length, 0)).toBe(PLACES.length);
  });

  it('computes padded bounds around all places', () => {
    const [[w, s], [e, n]] = bounds(PLACES);
    expect(PLACES.every((p) => p.lon > w && p.lon < e && p.lat > s && p.lat < n)).toBe(true);
  });
});
