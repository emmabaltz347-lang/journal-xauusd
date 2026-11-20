import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { applyTheme } from '../lib/theme';
import type { Settings } from '../types/trade';
import { loadSettings, saveSettings } from '../lib/storage';
import type { RepoConfig } from '../lib/github/client';
import { loadSharedSettings, pickShared, saveSharedSettings, SHARED_KEYS, type SharedSettings } from '../lib/github/repository';

export type SharedStatus = 'local' | 'loading' | 'synced' | 'saving' | 'error';

interface Ctx {
  settings: Settings;
  /** Modifie un réglage sur cet appareil uniquement (token, connexion) */
  update: (patch: Partial<Settings>) => void;
  /**
   * Modifie des réglages communs (comptes, calcul, apparence) : appliqués tout de suite ici,
   * puis enregistrés dans le repo (regroupés, au plus un commit toutes les ~1,5 s).
   */
  updateShared: (patch: Partial<SharedSettings>) => Promise<void>;
  /** Relit les réglages partagés depuis GitHub. `pushIfMissing` : crée le fichier avec les valeurs de cet appareil */
  pullShared: (pushIfMissing?: boolean) => Promise<'applied' | 'created' | 'none'>;
  sharedStatus: SharedStatus;
  repo: RepoConfig | null;
}

const SettingsContext = createContext<Ctx | null>(null);

const sameShared = (a: SharedSettings, b: Partial<SharedSettings>) =>
  SHARED_KEYS.every((k) => b[k] === undefined || JSON.stringify(a[k]) === JSON.stringify(b[k]));

/** Le premier compte reste recopié dans startingCapital / defaultRiskPercent (compatibilité) */
function withLegacy(patch: Partial<SharedSettings>): Partial<SharedSettings> {
  const first = patch.accounts?.[0];
  return first ? { ...patch, startingCapital: first.startingCapital, defaultRiskPercent: first.defaultRiskPercent } : patch;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [sharedStatus, setSharedStatus] = useState<SharedStatus>('local');
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => applyTheme(settings.theme), [settings.theme]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      settingsRef.current = next;
      saveSettings(next);
      return next;
    });
  }, []);

  const { githubToken, owner, repo: repoName, branch } = settings;
  const repo = useMemo<RepoConfig | null>(() => {
    if (!githubToken || !owner || !repoName) return null;
    return { token: githubToken.trim(), owner: owner.trim(), repo: repoName.trim(), branch: branch.trim() || 'main' };
  }, [githubToken, owner, repoName, branch]);

  // --- enregistrement groupé des réglages partagés -------------------------------------
  const flushTimer = useRef<number | null>(null);
  const waiters = useRef<{ resolve: () => void; reject: (e: unknown) => void }[]>([]);
  const dirty = useRef(false);

  const flush = useCallback(async () => {
    flushTimer.current = null;
    const list = waiters.current;
    waiters.current = [];
    if (!repo) {
      dirty.current = false;
      list.forEach((w) => w.resolve());
      return;
    }
    setSharedStatus('saving');
    try {
      await saveSharedSettings(repo, pickShared(settingsRef.current));
      dirty.current = false;
      setSharedStatus('synced');
      list.forEach((w) => w.resolve());
    } catch (e) {
      dirty.current = false;
      setSharedStatus('error');
      list.forEach((w) => w.reject(e));
    }
  }, [repo]);

  const updateShared = useCallback<Ctx['updateShared']>(
    (patch) => {
      update(withLegacy(patch));
      if (!repo) return Promise.resolve();
      dirty.current = true;
      if (flushTimer.current) window.clearTimeout(flushTimer.current);
      flushTimer.current = window.setTimeout(() => void flush(), 1500);
      return new Promise<void>((resolve, reject) => waiters.current.push({ resolve, reject }));
    },
    [repo, update, flush],
  );

  const pullShared = useCallback<Ctx['pullShared']>(
    async (pushIfMissing = false) => {
      // une modification locale est en attente d'envoi : on ne l'écrase pas
      if (!repo || dirty.current) return 'none';
      try {
        const remote = await loadSharedSettings(repo);
        if (dirty.current) return 'none';
        if (!remote) {
          if (pushIfMissing) {
            await saveSharedSettings(repo, settingsRef.current);
            setSharedStatus('synced');
            return 'created';
          }
          setSharedStatus('synced');
          return 'none';
        }
        // anciens fichiers sans apparence : on garde celle de cet appareil et on complète le fichier
        const missing = SHARED_KEYS.filter((k) => remote[k] === undefined);
        if (!sameShared(settingsRef.current, remote)) update(withLegacy(remote));
        if (missing.length && pushIfMissing) await saveSharedSettings(repo, pickShared(settingsRef.current));
        setSharedStatus('synced');
        return 'applied';
      } catch {
        setSharedStatus('error');
        return 'none';
      }
    },
    [repo, update],
  );

  // Réglages communs relus à la connexion, au retour sur l'app et toutes les minutes
  useEffect(() => {
    if (!repo) {
      setSharedStatus('local');
      return;
    }
    setSharedStatus('loading');
    void pullShared(true);
    const onVisible = () => document.visibilityState === 'visible' && void pullShared(false);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    const timer = window.setInterval(onVisible, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.clearInterval(timer);
    };
  }, [repo, pullShared]);

  // envoi immédiat si l'app passe en arrière-plan avec une modification en attente
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden' && flushTimer.current) {
        window.clearTimeout(flushTimer.current);
        void flush();
      }
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [flush]);

  const value = useMemo(
    () => ({ settings, update, updateShared, pullShared, sharedStatus, repo }),
    [settings, update, updateShared, pullShared, sharedStatus, repo],
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings hors SettingsProvider');
  return ctx;
}
