import { CLUSTERS, type ClusterId } from '../data/categories';
import { weekdayOf } from './openingHours';
import type { Place } from './schema';
import { daysSince, type PlaceStats } from './stats';
import type { StatsMap } from './filters';

export interface RandomSettings {
  /** ×0.3 if visited within 7 days, ×0.6 within 14 days. */
  avoidRecent: boolean;
  /** Favourites ×1.5 and own star average ×1.0–1.5. */
  preferLiked: boolean;
  /** Koskikeskus / Kauppahalli / Ratina compete as one option ("everyone picks their own counter"). */
  clustersAsOne: boolean;
  /** Places with dislike risk H get ×0.5. */
  avoidDivisive: boolean;
  /** Only places that serve lunch today. */
  lunchTodayOnly: boolean;
  /** Leave out places whose lunch info is unconfirmed (status "verify"). */
  skipUnverified: boolean;
}

export const DEFAULT_RANDOM_SETTINGS: RandomSettings = {
  avoidRecent: true,
  preferLiked: true,
  clustersAsOne: false,
  avoidDivisive: false,
  lunchTodayOnly: true,
  skipUnverified: true,
};

export type RandomOption =
  | { kind: 'place'; id: string; place: Place; weight: number }
  | { kind: 'cluster'; id: string; clusterId: ClusterId; name: string; places: Place[]; weight: number };

/** Weight for one place (≥ 0). Exported for tests and for explaining the pick. */
export function placeWeight(p: Place, s: PlaceStats | undefined, settings: RandomSettings, now: Date): number {
  let w = 1;
  if (settings.avoidRecent && s?.lastVisited) {
    const d = daysSince(s.lastVisited, now);
    if (d < 7) w *= 0.3;
    else if (d < 14) w *= 0.6;
  }
  if (settings.preferLiked) {
    if (s?.favourite) w *= 1.5;
    if (s?.avgStars !== undefined) w *= 1 + (Math.max(1, Math.min(5, s.avgStars)) - 1) / 8; // 1★ → ×1.0, 5★ → ×1.5
  }
  if (settings.avoidDivisive && p.dislikeRisk.level === 'H') w *= 0.5;
  return w;
}

/**
 * Turns the (already filtered) place list into weighted options.
 * `places` should come from filterPlaces(), so hidden places, categories, group size etc. are already applied.
 */
export function buildOptions(places: Place[], stats: StatsMap, settings: RandomSettings, now: Date): RandomOption[] {
  const today = weekdayOf(now);
  const eligible = places.filter(
    (p) => (!settings.lunchTodayOnly || (p.lunchHours[today]?.length ?? 0) > 0) && (!settings.skipUnverified || p.status === 'open'),
  );

  const options: RandomOption[] = [];
  const clusters = new Map<ClusterId, Place[]>();
  for (const p of eligible) {
    if (settings.clustersAsOne && p.clusterId) {
      clusters.set(p.clusterId, [...(clusters.get(p.clusterId) ?? []), p]);
    } else {
      options.push({ kind: 'place', id: p.id, place: p, weight: placeWeight(p, stats.get(p.id), settings, now) });
    }
  }
  for (const [clusterId, members] of clusters) {
    if (members.length === 1) {
      // A "cluster" of one is just that place.
      const p = members[0]!;
      options.push({ kind: 'place', id: p.id, place: p, weight: placeWeight(p, stats.get(p.id), settings, now) });
      continue;
    }
    // One option for the whole cluster; it is as attractive as its best member.
    const weight = Math.max(...members.map((p) => placeWeight(p, stats.get(p.id), settings, now)));
    options.push({ kind: 'cluster', id: `cluster:${clusterId}`, clusterId, name: CLUSTERS[clusterId].name, places: members, weight });
  }
  return options.filter((o) => o.weight > 0);
}

/**
 * Weighted random choice. `excludeId` avoids showing the same result twice in a row on "Arvo uudelleen"
 * (ignored if it is the only option). `rng` is injectable for deterministic tests.
 */
export function pickRandom(options: RandomOption[], rng: () => number = Math.random, excludeId?: string): RandomOption | undefined {
  const pool = options.length > 1 && excludeId ? options.filter((o) => o.id !== excludeId) : options;
  const total = pool.reduce((sum, o) => sum + o.weight, 0);
  if (!pool.length || total <= 0) return undefined;
  let r = rng() * total;
  for (const o of pool) {
    r -= o.weight;
    if (r < 0) return o;
  }
  return pool[pool.length - 1];
}

/** Small seeded PRNG (mulberry32) for tests and reproducible demos. */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
