import { registerSW } from 'virtual:pwa-register';
import { useToast } from './state/toastStore';

declare const __APP_VERSION__: string;
/** Build version, e.g. "2026-11-25 · 51bfe4a" ("dev" when running locally). */
export const APP_VERSION = __APP_VERSION__;

/**
 * Keeps the installed app up to date.
 *
 * 1. The service worker route: on start, whenever the app returns to the foreground and every 30 min,
 *    the browser checks for a new service worker; when one is ready the page reloads into it
 *    (unless the user is typing – then a "Päivitä" toast waits for them).
 * 2. The safety net: every build also publishes version.json, which is never cached. If the deployed
 *    version differs from the running one and the service worker route hasn't delivered it within
 *    ~10 s, the app drops its cached files (never visits, notes or settings) and reloads.
 *    That covers phones stuck on an old service worker, which is otherwise only fixed by closing
 *    every tab of the app.
 */
const FORCED_KEY = 'lounas.forcedUpdate';
let registration: ServiceWorkerRegistration | undefined;
let applyUpdate: (reload?: boolean) => Promise<void> = async () => {};
let updateReady = false;
let checking = false;

const isTyping = () => {
  const el = document.activeElement as HTMLElement | null;
  return !!el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && (el as HTMLInputElement).type !== 'checkbox') || el.isContentEditable);
};

function offerOrApply() {
  if (isTyping()) useToast.getState().show('Uusi versio saatavilla', { label: 'Päivitä', run: () => void applyUpdate(true) }, 60_000);
  else void applyUpdate(true); // activates the waiting service worker and reloads
}

export function setupAutoUpdate() {
  if (!('serviceWorker' in navigator)) return;
  applyUpdate = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateReady = true;
      offerOrApply();
    },
    onRegisteredSW(_url, reg) {
      registration = reg;
      const check = () => {
        if (!navigator.onLine) return;
        reg?.update().catch(() => {});
        void checkForUpdate({ auto: true });
      };
      document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check());
      setInterval(check, 30 * 60 * 1000);
      check();
    },
  });
}

/** Version currently deployed on the server, or null if it can't be read (offline, local dev). */
async function deployedVersion(): Promise<string | null> {
  try {
    const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return ((await res.json()) as { version?: string }).version ?? null;
  } catch {
    return null;
  }
}

export type UpdateResult = 'latest' | 'updating' | 'offline';

/**
 * Compares the running version with the deployed one and updates if they differ.
 * `auto`: called in the background – never interrupts typing and forces at most once per version.
 */
export async function checkForUpdate({ auto = false } = {}): Promise<UpdateResult> {
  if (checking) return 'updating';
  const deployed = await deployedVersion();
  if (deployed === null) return 'offline';
  if (deployed === APP_VERSION) {
    safeSession(() => sessionStorage.removeItem(FORCED_KEY));
    return 'latest';
  }
  checking = true;
  try {
    await registration?.update().catch(() => {});
    // Give the normal route a moment: onNeedRefresh fires once the new service worker has installed.
    for (let i = 0; i < 20 && !updateReady; i++) await new Promise((r) => setTimeout(r, 500));
    if (updateReady) {
      offerOrApply();
      return 'updating';
    }
    if (auto && (isTyping() || safeSession(() => sessionStorage.getItem(FORCED_KEY)) === deployed)) return 'updating';
    safeSession(() => sessionStorage.setItem(FORCED_KEY, deployed));
    await forceUpdate();
    return 'updating';
  } finally {
    checking = false;
  }
}

/**
 * Last resort: unregister the service worker and delete the cached app files, then reload from the network.
 * Visits, notes, favourites (IndexedDB) and settings (localStorage) are not touched.
 */
export async function forceUpdate(): Promise<void> {
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations?.()) ?? [];
    await Promise.all(regs.map((r) => r.unregister()));
    if ('caches' in window) await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
  } finally {
    location.reload();
  }
}

function safeSession<T>(fn: () => T): T | undefined {
  try {
    return fn();
  } catch {
    return undefined;
  }
}
