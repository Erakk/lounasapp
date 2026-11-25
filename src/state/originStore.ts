import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { safeStorage } from './storage';
import { ORIGIN } from '../data/categories';
import { isInTampere } from '../domain/tampere';

/** The point all distances, walking times and the map's walking rings are measured from. */
export interface Origin {
  id: string;
  name: string;
  lat: number;
  lon: number;
  kind: 'preset' | 'gps' | 'search' | 'map';
}

export const DEFAULT_ORIGIN: Origin = { id: 'kehrasaari', name: ORIGIN.name, lat: ORIGIN.lat, lon: ORIGIN.lon, kind: 'preset' };

/** Ready-made starting points around the centre (coordinates from OpenStreetMap). */
export const ORIGIN_PRESETS: Origin[] = [
  DEFAULT_ORIGIN,
  { id: 'keskustori', name: 'Keskustori', lat: 61.498016, lon: 23.760825, kind: 'preset' },
  { id: 'rautatieasema', name: 'Rautatieasema', lat: 61.498237, lon: 23.773858, kind: 'preset' },
  { id: 'tuni-keskusta', name: 'Tampereen yliopisto', lat: 61.493463, lon: 23.77895, kind: 'preset' },
  { id: 'tullintori', name: 'Tullintori', lat: 61.496931, lon: 23.776982, kind: 'preset' },
  { id: 'nokia-arena', name: 'Nokia Arena', lat: 61.49363, lon: 23.773934, kind: 'preset' },
  { id: 'finlayson', name: 'Finlayson', lat: 61.501933, lon: 23.75545, kind: 'preset' },
];

const MAX_RECENT = 3;

interface OriginState {
  origin: Origin;
  /** Last few own picks (location, search, map), newest first. */
  recent: Origin[];
  /** Returns false (and changes nothing) if the point is outside Tampere. */
  setOrigin: (o: Origin) => boolean;
  reset: () => void;
}

export const useOrigin = create<OriginState>()(
  persist(
    (set) => ({
      origin: DEFAULT_ORIGIN,
      recent: [],
      setOrigin: (o) => {
        if (!isInTampere(o.lat, o.lon)) return false;
        set((s) => ({
          origin: o,
          recent:
            o.kind === 'preset'
              ? s.recent
              : [o, ...s.recent.filter((r) => r.id !== o.id && (r.lat !== o.lat || r.lon !== o.lon))].slice(0, MAX_RECENT),
        }));
        return true;
      },
      reset: () => set({ origin: DEFAULT_ORIGIN }),
    }),
    {
      name: 'lounas.origin.v1',
      storage: createJSONStorage(() => safeStorage),
      version: 1,
      partialize: ({ origin, recent }) => ({ origin, recent }),
      // Never trust stored coordinates blindly: anything outside Tampere falls back to Kehräsaari.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<OriginState>;
        const ok = (o: unknown): o is Origin =>
          !!o && typeof (o as Origin).lat === 'number' && typeof (o as Origin).lon === 'number' && isInTampere((o as Origin).lat, (o as Origin).lon);
        return {
          ...current,
          origin: ok(p.origin) ? p.origin : DEFAULT_ORIGIN,
          recent: Array.isArray(p.recent) ? p.recent.filter(ok).slice(0, MAX_RECENT) : [],
        };
      },
    },
  ),
);

export const isDefaultOrigin = (o: Origin) => o.lat === DEFAULT_ORIGIN.lat && o.lon === DEFAULT_ORIGIN.lon;
