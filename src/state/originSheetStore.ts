import { create } from 'zustand';

/** Open/closed state of the "Lähtöpiste" sheet, so any screen can open it (it's rendered once in Layout). */
export const useOriginSheet = create<{ open: boolean; show: () => void; hide: () => void }>((set) => ({
  open: false,
  show: () => set({ open: true }),
  hide: () => set({ open: false }),
}));
