import type { Settings, Trade } from '../types/trade';

const KEY_SETTINGS = 'jx.settings.v1';
const KEY_LOCAL_TRADES = 'jx.localTrades.v1';
const KEY_FILTERS = 'jx.filters.v1';

export const DEFAULT_SETTINGS: Settings = {
  githubToken: '',
  owner: '',
  repo: 'journal-xauusd',
  branch: 'main',
  startingCapital: 10000,
  defaultRiskPercent: 1,
  knownErrorTags: [],
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

export const loadSettings = (): Settings => ({ ...DEFAULT_SETTINGS, ...(read<Settings>(KEY_SETTINGS) ?? {}) });
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
