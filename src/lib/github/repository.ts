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
