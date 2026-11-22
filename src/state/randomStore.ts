import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_RANDOM_SETTINGS, type RandomSettings } from '../domain/randomPick';
import { safeStorage } from './storage';

interface RandomState extends RandomSettings {
  set: (patch: Partial<RandomSettings>) => void;
  reset: () => void;
}

export const useRandomSettings = create<RandomState>()(
  persist(
    (set) => ({
      ...DEFAULT_RANDOM_SETTINGS,
      set: (patch) => set(patch),
      reset: () => set(DEFAULT_RANDOM_SETTINGS),
    }),
    {
      name: 'lounas.random.v1',
      storage: createJSONStorage(() => safeStorage),
      version: 1,
      partialize: ({ set: _s, reset: _r, ...data }) => data,
    },
  ),
);

export function selectRandomSettings(s: RandomState): RandomSettings {
  const { set: _s, reset: _r, ...data } = s;
  return data;
}
