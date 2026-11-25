import type { Place } from './schema';

/** Same constants as scripts/build-places.ts: walk = air distance × 1.3 ÷ 80 m/min. */
export const WALK_DETOUR = 1.3;
export const WALK_SPEED_M_PER_MIN = 80;

/** Straight-line radius (m) that corresponds to `minutes` of walking in our estimate. */
export const radiusForWalk = (minutes: number) => Math.round((minutes * WALK_SPEED_M_PER_MIN) / WALK_DETOUR);

/** Closed ring of [lon, lat] points approximating a circle (good enough at city scale). */
export function circlePolygon(center: { lat: number; lon: number }, radiusM: number, steps = 64): [number, number][] {
  const R = 6371000;
  const lat = (center.lat * Math.PI) / 180;
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * 2 * Math.PI;
    const dLat = (radiusM * Math.cos(a)) / R;
    const dLon = (radiusM * Math.sin(a)) / (R * Math.cos(lat));
    pts.push([center.lon + (dLon * 180) / Math.PI, center.lat + (dLat * 180) / Math.PI]);
  }
  return pts;
}

export interface MapSpot {
  /** Stable key: cluster id or rounded coordinates. */
  key: string;
  lat: number;
  lon: number;
  places: Place[];
  clusterId?: Place['clusterId'];
}

/**
 * One map marker per location: places in the same shopping centre / market hall, or at the
 * exact same coordinates (e.g. Suoma + Eflatun in one building), share a marker.
 */
export function groupSpots(places: Place[]): MapSpot[] {
  const spots = new Map<string, MapSpot>();
  for (const p of places) {
    const key = p.clusterId ? `cluster:${p.clusterId}` : `${p.lat.toFixed(5)},${p.lon.toFixed(5)}`;
    const s = spots.get(key);
    if (s) s.places.push(p);
    else spots.set(key, { key, lat: p.lat, lon: p.lon, places: [p], ...(p.clusterId ? { clusterId: p.clusterId } : {}) });
  }
  return [...spots.values()];
}

/** Bounding box [[west, south], [east, north]] of the given points, padded a little. */
export function bounds(points: { lat: number; lon: number }[], padDeg = 0.002): [[number, number], [number, number]] {
  const lats = points.map((p) => p.lat);
  const lons = points.map((p) => p.lon);
  return [
    [Math.min(...lons) - padDeg, Math.min(...lats) - padDeg],
    [Math.max(...lons) + padDeg, Math.max(...lats) + padDeg],
  ];
}

/** Great-circle distance in metres (same formula as scripts/build-places.ts). */
export function haversineM(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const walkMinFor = (distanceM: number) => Math.max(1, Math.round((distanceM * WALK_DETOUR) / WALK_SPEED_M_PER_MIN));

/** Ray-casting point-in-polygon test; `ring` is [lon, lat] pairs. */
export function pointInRing(lat: number, lon: number, ring: readonly (readonly [number, number] | readonly number[])[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i] as [number, number];
    const [xj, yj] = ring[j] as [number, number];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Places with distance and walking time measured from `origin`, sorted nearest first.
 * Returns the input untouched when the origin is where the data was built from.
 */
export function withOrigin(places: Place[], origin: { lat: number; lon: number }, dataOrigin?: { lat: number; lon: number }): Place[] {
  if (dataOrigin && dataOrigin.lat === origin.lat && dataOrigin.lon === origin.lon) return places;
  return places
    .map((p) => {
      const distanceM = Math.round(haversineM(origin, p));
      return { ...p, distanceM, walkMin: walkMinFor(distanceM) };
    })
    .sort((a, b) => a.distanceM - b.distanceM);
}
