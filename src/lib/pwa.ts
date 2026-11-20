import { registerSW } from 'virtual:pwa-register';

/**
 * Mise à jour de l'application installée (PWA).
 * - vérifie s'il existe une nouvelle version au retour sur l'app et toutes les 30 min ;
 * - l'installe aussitôt, sauf pendant la saisie d'un trade : un bandeau propose alors la mise à jour.
 */
export const APP_VERSION = __APP_VERSION__;
export const BUILD_TIME = new Date(__BUILD_TIME__);

let pending = false;
let apply: ((reload?: boolean) => Promise<void>) | null = null;
const listeners = new Set<() => void>();

export const updatePending = () => pending;
export function onUpdatePending(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function applyUpdate() {
  void apply?.(true);
}

const editing = () => /#\/(ajouter|modifier)/.test(location.hash);

export function setupPwa() {
  if (!('serviceWorker' in navigator)) return;
  apply = registerSW({
    immediate: true,
    onNeedRefresh() {
      if (!editing()) return applyUpdate();
      pending = true;
      listeners.forEach((fn) => fn());
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => {
        if (document.visibilityState === 'visible' && navigator.onLine) void registration.update().catch(() => {});
      };
      document.addEventListener('visibilitychange', check);
      window.setInterval(check, 30 * 60 * 1000);
    },
  });
}
