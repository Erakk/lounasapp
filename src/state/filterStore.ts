import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { safeStorage } from './storage';
import type { CategoryId } from '../data/categories';
import { DEFAULT_FILTERS, type Filters } from '../domain/filters';
import type { Diet, Format } from '../domain/schema';


const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

interface FilterState extends Filters {
  set: (patch: Partial<Filters>) => void;
  toggleCategory: (c: CategoryId) => void;
  toggleFormat: (f: Format) => void;
  toggleDiet: (d: Diet) => void;
  /** Clears everything except sort and area (the area is a scope, set with the starting point). */
  reset: () => void;
}

export const useFilters = create<FilterState>()(
  persist(
    (set) => ({
      ...DEFAULT_FILTERS,
      set: (patch) => set(patch),
      toggleCategory: (c) => set((s) => ({ categories: toggle(s.categories, c) })),
      toggleFormat: (f) => set((s) => ({ formats: toggle(s.formats, f) })),
      toggleDiet: (d) => set((s) => ({ diets: toggle(s.diets, d) })),
      reset: () => set((s) => ({ ...DEFAULT_FILTERS, sort: s.sort, maxDistanceM: s.maxDistanceM })),
    }),
    {
      name: 'lounas.filters.v1',
      storage: createJSONStorage(() => safeStorage),
      version: 1,
      // Only persist data, never the action functions.
      partialize: ({ set: _s, toggleCategory: _c, toggleFormat: _f, toggleDiet: _d, reset: _r, ...data }) => data,
    },
  ),
);

/** Plain Filters object from the store (without actions). */
export function selectFilters(s: FilterState): Filters {
  const { set: _s, toggleCategory: _c, toggleFormat: _f, toggleDiet: _d, reset: _r, ...data } = s;
  return data;
}
