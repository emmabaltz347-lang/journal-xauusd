import type { Settings, Trade } from '../types/trade';
import { DEFAULT_THEME, defaultThemeLibrary } from './theme';
import { defaultAccounts } from './calc/accounts';

const KEY_SETTINGS = 'jx.settings.v1';
const KEY_LOCAL_TRADES = 'jx.localTrades.v1';
const KEY_FILTERS = 'jx.filters.v1';

export const DEFAULT_SETTINGS: Settings = {
  githubToken: '',
  owner: '',
  repo: 'journal-xauusd-data',
  branch: 'main',
  startingCapital: 10000,
  defaultRiskPercent: 1,
  knownErrorTags: [],
  theme: DEFAULT_THEME,
  pipsPerDollar: 10,
  contractSize: 100,
  eurUsd: 1.15,
  accounts: defaultAccounts(),
  themeLibrary: defaultThemeLibrary(),
};

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const loadSettings = (): Settings => {
  const saved = read<Partial<Settings>>(KEY_SETTINGS) ?? {};
  const merged = { ...DEFAULT_SETTINGS, ...saved, theme: { ...DEFAULT_THEME, ...(saved.theme ?? {}) } };
  // anciennes versions : un seul capital → compte principal
  if (!saved.themeLibrary?.length) merged.themeLibrary = defaultThemeLibrary();
  // anciennes sauvegardes sans transparence
  merged.themeLibrary = merged.themeLibrary.map((x) => ({ ...x, style: { ...x.style, glass: x.style.glass ?? merged.theme.glass ?? 25 } }));
  if (!saved.accounts?.length) merged.accounts = defaultAccounts(merged.startingCapital, merged.defaultRiskPercent);
  return merged;
};
export const saveSettings = (s: Settings) => write(KEY_SETTINGS, s);

/** Trades du mode local (sans token) */
export const loadLocalTrades = () => read<Trade[]>(KEY_LOCAL_TRADES);
export const saveLocalTrades = (t: Trade[]) => write(KEY_LOCAL_TRADES, t);
export const clearLocalTrades = () => {
  try {
    localStorage.removeItem(KEY_LOCAL_TRADES);
  } catch {
    /* ignore */
  }
};

export const loadFilters = <T>() => read<T>(KEY_FILTERS);
export const saveFilters = (f: unknown) => write(KEY_FILTERS, f);

const KEY_LAST_ACCOUNT = 'jx.lastAccount';
export const loadLastAccount = () => {
  try {
    return localStorage.getItem(KEY_LAST_ACCOUNT);
  } catch {
    return null;
  }
};
export const saveLastAccount = (id: string) => {
  try {
    localStorage.setItem(KEY_LAST_ACCOUNT, id);
  } catch {
    /* ignore */
  }
};
