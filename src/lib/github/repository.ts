import { TradesFileSchema, type Trade, type TradesFile } from '../../types/trade';
import {
  GitHubError,
  bytesToBase64,
  deleteFile,
  getBlob,
  getTextFile,
  putFile,
  utf8ToBase64,
  type RepoConfig,
} from './client';

export const TRADES_PATH = 'data/trades.json';
export const SCREENSHOTS_DIR = 'data/screenshots';

export function parseTradesFile(text: string): TradesFile {
  const json = JSON.parse(text);
  // accepte aussi un simple tableau de trades
  const obj = Array.isArray(json) ? { version: 1, trades: json } : json;
  return TradesFileSchema.parse(obj);
}

export function serializeTrades(trades: Trade[]): string {
  const sorted = [...trades].sort((a, b) => a.entryAt.localeCompare(b.entryAt));
  return JSON.stringify({ version: 1, trades: sorted } satisfies TradesFile, null, 2) + '\n';
}

export async function loadTrades(cfg: RepoConfig): Promise<Trade[]> {
  const file = await getTextFile(cfg, TRADES_PATH);
  if (!file) return [];
  return parseTradesFile(file.text).trades;
}

/**
 * Applique une modification à la dernière version du fichier puis commit.
 * En cas de conflit (le fichier a changé entre-temps), recharge et réessaie.
 */
export async function mutateTrades(
  cfg: RepoConfig,
  mutate: (trades: Trade[]) => Trade[],
  message: string,
  attempts = 3,
): Promise<Trade[]> {
  for (let i = 0; i < attempts; i++) {
    const file = await getTextFile(cfg, TRADES_PATH);
    const current = file ? parseTradesFile(file.text).trades : [];
    const next = mutate(current);
    try {
      await putFile(cfg, TRADES_PATH, utf8ToBase64(serializeTrades(next)), message, file?.sha);
      return next;
    } catch (e) {
      const conflict = e instanceof GitHubError && (e.status === 409 || e.status === 422);
      if (!conflict || i === attempts - 1) throw e;
    }
  }
  throw new Error('Échec de la sauvegarde');
}

export async function uploadScreenshot(
  cfg: RepoConfig,
  tradeId: string,
  kind: 'avant' | 'apres',
  blob: Blob,
  ext: string,
): Promise<string> {
  const path = `${SCREENSHOTS_DIR}/${tradeId}-${kind}-${Date.now().toString(36)}.${ext}`;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  await putFile(cfg, path, bytesToBase64(bytes), `📷 Capture ${kind} du trade ${tradeId}`);
  return path;
}

export async function removeScreenshot(cfg: RepoConfig, path: string): Promise<void> {
  try {
    await deleteFile(cfg, path, `🗑️ Suppression capture ${path.split('/').pop()}`);
  } catch (e) {
    // une capture déjà absente n'est pas bloquante
    if (!(e instanceof GitHubError && e.status === 404)) throw e;
  }
}

export const fetchScreenshot = (cfg: RepoConfig, path: string) => getBlob(cfg, path);

// --- Réglages partagés entre appareils (data/settings.json du repo privé) ---------------
export const SETTINGS_PATH = 'data/settings.json';

/** Réglages de calcul communs à tous les appareils (le token et l'apparence restent par appareil) */
export interface SharedSettings {
  startingCapital: number;
  defaultRiskPercent: number;
  pipsPerDollar: number;
  contractSize: number;
  eurUsd: number;
  knownErrorTags: string[];
}

export const SHARED_KEYS: (keyof SharedSettings)[] = [
  'startingCapital',
  'defaultRiskPercent',
  'pipsPerDollar',
  'contractSize',
  'eurUsd',
  'knownErrorTags',
];

export function pickShared(s: SharedSettings): SharedSettings {
  return Object.fromEntries(SHARED_KEYS.map((k) => [k, s[k]])) as unknown as SharedSettings;
}

/** Lit les réglages partagés ; null si le fichier n'existe pas encore */
export async function loadSharedSettings(cfg: RepoConfig): Promise<Partial<SharedSettings> | null> {
  const file = await getTextFile(cfg, SETTINGS_PATH);
  if (!file) return null;
  const raw = JSON.parse(file.text) as Record<string, unknown>;
  const out: Partial<SharedSettings> = {};
  for (const k of SHARED_KEYS) {
    const v = raw[k];
    if (k === 'knownErrorTags') {
      if (Array.isArray(v)) out.knownErrorTags = v.filter((x): x is string => typeof x === 'string');
    } else if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
      (out as Record<string, number>)[k] = v;
    }
  }
  return out;
}

export async function saveSharedSettings(cfg: RepoConfig, s: SharedSettings, attempts = 3): Promise<void> {
  const body = utf8ToBase64(JSON.stringify(pickShared(s), null, 2) + '\n');
  for (let i = 0; i < attempts; i++) {
    const file = await getTextFile(cfg, SETTINGS_PATH);
    try {
      await putFile(cfg, SETTINGS_PATH, body, '⚙️ Réglages du journal', file?.sha);
      return;
    } catch (e) {
      const conflict = e instanceof GitHubError && (e.status === 409 || e.status === 422);
      if (!conflict || i === attempts - 1) throw e;
    }
  }
}
