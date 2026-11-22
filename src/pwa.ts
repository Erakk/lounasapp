import { registerSW } from 'virtual:pwa-register';
import { useToast } from './state/toastStore';

/**
 * Keeps the installed app up to date.
 *
 * - Checks for a new version when the app starts, every time it comes back to the foreground
 *   (phones rarely "start" an installed app fresh), and every 30 min while open.
 * - When a new version has downloaded it reloads straight into it, unless the user is typing
 *   (e.g. a note): then a toast offers "Päivitä" so nothing they're writing is lost.
 */
export function setupAutoUpdate() {
  if (!('serviceWorker' in navigator)) return;

  let applyUpdate: (reload?: boolean) => Promise<void> = async () => {};

  const isTyping = () => {
    const el = document.activeElement as HTMLElement | null;
    return !!el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && (el as HTMLInputElement).type !== 'checkbox') || el.isContentEditable);
  };

  applyUpdate = registerSW({
    immediate: true,
    onNeedRefresh() {
      if (isTyping()) {
        useToast.getState().show('Uusi versio saatavilla', { label: 'Päivitä', run: () => void applyUpdate(true) }, 60_000);
      } else {
        void applyUpdate(true); // activates the new service worker and reloads the page
      }
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => {
        if (navigator.onLine) registration.update().catch(() => {});
      };
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
      setInterval(check, 30 * 60 * 1000);
    },
  });
}
