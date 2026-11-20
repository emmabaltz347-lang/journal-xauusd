/**
 * Mise à jour de l'application (site et icône installée sur l'iPhone).
 *
 * Deux mécanismes complémentaires :
 * 1. le service worker : la nouvelle version s'installe et prend la main immédiatement ;
 * 2. version.json : au retour sur l'app (et toutes les 5 min), on compare la version en ligne
 *    à celle qui tourne. Si elles diffèrent, on vide les caches et on recharge.
 * Pendant la saisie d'un trade, on ne recharge jamais : un bandeau propose la mise à jour.
 */
export const APP_VERSION = __APP_VERSION__;
export const BUILD_TIME = new Date(__BUILD_TIME__);

const BASE = import.meta.env.BASE_URL;
let pending = false;
const listeners = new Set<() => void>();

export const updatePending = () => pending;
export function onUpdatePending(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const editing = () => /#\/(ajouter|modifier)/.test(location.hash);

/** Vide les caches de l'app, désinscrit le service worker et recharge la dernière version */
export async function forceUpdate() {
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations?.()) ?? [];
    await Promise.all(regs.map((r) => r.unregister()));
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } finally {
    const url = new URL(location.href);
    url.searchParams.set('v', String(Date.now()));
    location.replace(url.toString());
  }
}

export function applyUpdate() {
  void forceUpdate();
}

function needUpdate() {
  if (!editing()) return void forceUpdate();
  if (pending) return;
  pending = true;
  listeners.forEach((fn) => fn());
}

/** Compare la version en ligne à celle qui tourne (sans passer par aucun cache) */
async function checkVersion() {
  if (APP_VERSION === 'dev' || document.visibilityState !== 'visible' || !navigator.onLine) return;
  try {
    const res = await fetch(`${BASE}version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    const { version } = (await res.json()) as { version?: string };
    if (!version || version === APP_VERSION) return;
    // garde-fou : au plus 2 tentatives par version, pour ne jamais boucler
    const key = `jx.update.${version}`;
    const tries = Number(sessionStorage.getItem(key) ?? 0);
    if (tries >= 2) return;
    sessionStorage.setItem(key, String(tries + 1));
    needUpdate();
  } catch {
    /* hors ligne : on réessaiera plus tard */
  }
}

export function setupPwa() {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    navigator.serviceWorker
      .register(`${BASE}sw.js`, { scope: BASE })
      .then((reg) => {
        const check = () => document.visibilityState === 'visible' && void reg.update().catch(() => {});
        document.addEventListener('visibilitychange', check);
        window.setInterval(check, 5 * 60 * 1000);
      })
      .catch(() => {});
    // une nouvelle version vient de prendre la main : on recharge pour l'afficher
    let hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController) needUpdate();
      hadController = true;
    });
  }
  void checkVersion();
  document.addEventListener('visibilitychange', () => void checkVersion());
  window.setInterval(() => void checkVersion(), 5 * 60 * 1000);
}
