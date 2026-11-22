import { create } from 'zustand';

export interface Toast {
  id: number;
  message: string;
  action?: { label: string; run: () => void };
}

interface ToastState {
  toast: Toast | null;
  show: (message: string, action?: Toast['action'], ms?: number) => void;
  dismiss: () => void;
}

let timer: ReturnType<typeof setTimeout> | undefined;
let seq = 0;

/** One toast at a time; a new one replaces the old. Undo toasts stay 6 s, plain ones 3 s. */
export const useToast = create<ToastState>((set) => ({
  toast: null,
  show: (message, action, ms = action ? 6000 : 3000) => {
    clearTimeout(timer);
    const id = ++seq;
    set({ toast: { id, message, action } });
    timer = setTimeout(() => set((s) => (s.toast?.id === id ? { toast: null } : s)), ms);
  },
  dismiss: () => {
    clearTimeout(timer);
    set({ toast: null });
  },
}));
