import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { applyTheme } from '../lib/theme';
import type { Settings } from '../types/trade';
import { loadSettings, saveSettings } from '../lib/storage';
import type { RepoConfig } from '../lib/github/client';

interface Ctx {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  repo: RepoConfig | null;
}

const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);

  useEffect(() => applyTheme(settings.theme), [settings.theme]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const repo = useMemo<RepoConfig | null>(() => {
    const { githubToken, owner, repo, branch } = settings;
    if (!githubToken || !owner || !repo) return null;
    return { token: githubToken.trim(), owner: owner.trim(), repo: repo.trim(), branch: branch.trim() || 'main' };
  }, [settings]);

  const value = useMemo(() => ({ settings, update, repo }), [settings, update, repo]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings hors SettingsProvider');
  return ctx;
}
