import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from './db';
import { EMPTY_STATS, buildStats, type PlaceStats } from '../domain/stats';

/** Live per-place stats for the whole app (re-renders when any visit/note/pref changes). */
export function useAllStats(): Map<string, PlaceStats> {
  const data = useLiveQuery(async () => {
    const [visits, notes, prefs] = await Promise.all([db.visits.toArray(), db.notes.toArray(), db.prefs.toArray()]);
    return { visits, notes, prefs };
  }, []);
  return useMemo(() => (data ? buildStats(data.visits, data.notes, data.prefs) : new Map()), [data]);
}

export function usePlaceStats(placeId: string): PlaceStats {
  const all = useAllStats();
  return all.get(placeId) ?? EMPTY_STATS;
}

export function useVisits(placeId: string) {
  return useLiveQuery(() => db.visits.where('placeId').equals(placeId).reverse().sortBy('date'), [placeId]) ?? [];
}

export function useNotes(placeId: string) {
  return useLiveQuery(() => db.notes.where('placeId').equals(placeId).reverse().sortBy('date'), [placeId]) ?? [];
}

export function useAllVisits() {
  return useLiveQuery(() => db.visits.orderBy('date').reverse().toArray(), []) ?? [];
}

export function useAllNotes() {
  return useLiveQuery(() => db.notes.orderBy('date').reverse().toArray(), []) ?? [];
}
