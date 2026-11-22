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
