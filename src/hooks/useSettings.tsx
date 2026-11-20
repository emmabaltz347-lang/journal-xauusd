import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { applyTheme } from '../lib/theme';
import type { Settings } from '../types/trade';
import { loadSettings, saveSettings } from '../lib/storage';
import type { RepoConfig } from '../lib/github/client';
import { loadSharedSettings, pickShared, saveSharedSettings, SHARED_KEYS, type SharedSettings } from '../lib/github/repository';

export type SharedStatus = 'local' | 'loading' | 'synced' | 'error';

interface Ctx {
  settings: Settings;
  /** Modifie un réglage sur cet appareil uniquement (token, apparence) */
  update: (patch: Partial<Settings>) => void;
  /** Modifie les réglages de calcul et les enregistre dans le repo pour tous les appareils */
  updateShared: (patch: Partial<SharedSettings>) => Promise<void>;
  /** Relit les réglages partagés depuis GitHub. `pushIfMissing` : crée le fichier avec les valeurs de cet appareil */
  pullShared: (pushIfMissing?: boolean) => Promise<'applied' | 'created' | 'none'>;
  sharedStatus: SharedStatus;
  repo: RepoConfig | null;
}

const SettingsContext = createContext<Ctx | null>(null);

const sameShared = (a: SharedSettings, b: Partial<SharedSettings>) =>
  SHARED_KEYS.every((k) => b[k] === undefined || JSON.stringify(a[k]) === JSON.stringify(b[k]));

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [sharedStatus, setSharedStatus] = useState<SharedStatus>('local');
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => applyTheme(settings.theme), [settings.theme]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const { githubToken, owner, repo: repoName, branch } = settings;
  const repo = useMemo<RepoConfig | null>(() => {
    if (!githubToken || !owner || !repoName) return null;
    return { token: githubToken.trim(), owner: owner.trim(), repo: repoName.trim(), branch: branch.trim() || 'main' };
  }, [githubToken, owner, repoName, branch]);

  const pullShared = useCallback<Ctx['pullShared']>(
    async (pushIfMissing = false) => {
      if (!repo) return 'none';
      try {
        const remote = await loadSharedSettings(repo);
        if (!remote) {
          if (pushIfMissing) {
            await saveSharedSettings(repo, settingsRef.current);
            setSharedStatus('synced');
            return 'created';
          }
          setSharedStatus('synced');
          return 'none';
        }
        if (!sameShared(settingsRef.current, remote)) update(remote);
        setSharedStatus('synced');
        return 'applied';
      } catch {
        setSharedStatus('error');
        return 'none';
      }
    },
    [repo, update],
  );

  const updateShared = useCallback<Ctx['updateShared']>(
    async (patch) => {
      update(patch);
      if (!repo) return;
      await saveSharedSettings(repo, { ...pickShared(settingsRef.current), ...patch });
      setSharedStatus('synced');
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
