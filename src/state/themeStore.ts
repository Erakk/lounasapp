import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { safeStorage } from './storage';

export type ThemeChoice = 'auto' | 'light' | 'dark';
export const THEME_STORAGE_KEY = 'lounas.theme.v1';

interface ThemeState {
  theme: ThemeChoice;
  setTheme: (t: ThemeChoice) => void;
}

export const useTheme = create<ThemeState>()(
  persist((set) => ({ theme: 'auto', setTheme: (theme) => set({ theme }) }), {
    name: THEME_STORAGE_KEY,
    storage: createJSONStorage(() => safeStorage),
    version: 1,
    partialize: ({ theme }) => ({ theme }),
  }),
);

/** Applies the choice to <html data-theme> (CSS tokens react to it) and the browser UI colour. */
export function applyTheme(theme: ThemeChoice) {
  const root = document.documentElement;
  if (theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
  const dark = theme === 'dark' || (theme === 'auto' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#151816' : '#C8364A');
}
