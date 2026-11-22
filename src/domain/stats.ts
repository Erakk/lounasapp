import type { Note, PlacePref, Visit } from '../db/db';

export interface PlaceStats {
  visitCount: number;
  lastVisited?: string; // ISO
  avgStars?: number;
  noteCount: number;
  favourite: boolean;
  hidden: boolean;
}

export const EMPTY_STATS: PlaceStats = { visitCount: 0, noteCount: 0, favourite: false, hidden: false };

/** Per-place summary of the user's own data. Pure: easy to test, cheap to recompute (~hundreds of rows). */
export function buildStats(visits: Visit[], notes: Note[], prefs: PlacePref[]): Map<string, PlaceStats> {
  const out = new Map<string, PlaceStats>();
  const get = (id: string) => {
    let s = out.get(id);
    if (!s) out.set(id, (s = { ...EMPTY_STATS }));
    return s;
  };
  for (const v of visits) {
    const s = get(v.placeId);
    s.visitCount++;
    if (!s.lastVisited || v.date > s.lastVisited) s.lastVisited = v.date;
  }
  const starSums = new Map<string, { sum: number; n: number }>();
  for (const n of notes) {
    const s = get(n.placeId);
    s.noteCount++;
    if (n.stars) {
      const acc = starSums.get(n.placeId) ?? { sum: 0, n: 0 };
      acc.sum += n.stars;
      acc.n++;
      starSums.set(n.placeId, acc);
    }
  }
  for (const [id, { sum, n }] of starSums) get(id).avgStars = Math.round((sum / n) * 10) / 10;
  for (const p of prefs) {
    const s = get(p.placeId);
    s.favourite = !!p.favourite;
    s.hidden = !!p.hidden;
  }
  return out;
}

/** Whole days between an ISO date and now (0 = today). */
export function daysSince(iso: string, now = new Date()): number {
  const a = new Date(iso);
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((startOf(now) - startOf(a)) / 86_400_000);
}

/** "tänään", "eilen", "3 pv sitten", "2 vk sitten", "5 kk sitten". */
export function relativeDay(iso: string, now = new Date()): string {
  const d = daysSince(iso, now);
  if (d <= 0) return 'tänään';
  if (d === 1) return 'eilen';
  if (d < 14) return `${d} pv sitten`;
  if (d < 60) return `${Math.round(d / 7)} vk sitten`;
  return `${Math.round(d / 30)} kk sitten`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fi-FI', { weekday: 'short', day: 'numeric', month: 'numeric', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
}
