import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ComputedTrade, Trade } from '../types/trade';
import { computeTrades } from '../lib/calc/trade';
import {
  loadTrades,
  mutateTrades,
  parseTradesFile,
  removeScreenshot,
  uploadScreenshot,
} from '../lib/github/repository';
import { blobToDataUrl, type CompressedImage } from '../lib/image/compress';
import { clearLocalTrades, loadLocalTrades, saveLocalTrades } from '../lib/storage';
import { mergeTrades } from '../lib/export/json';
import { useSettings } from './useSettings';

export type Mode = 'github' | 'local';
export type Status = 'loading' | 'ready' | 'error';

/** Modification d'image : nouvelle image compressée, suppression, ou inchangée (undefined) */
export type ImageChange = CompressedImage | 'remove' | undefined;

interface Ctx {
  mode: Mode;
  status: Status;
  error: string | null;
  syncing: boolean;
  trades: Trade[];
  computed: ComputedTrade[];
  saveTrade: (t: Trade, images: { before?: ImageChange; after?: ImageChange }) => Promise<void>;
  deleteTrade: (id: string) => Promise<void>;
  importTrades: (incoming: Trade[], replace: boolean) => Promise<void>;
  reload: () => Promise<void>;
  resetDemo: () => Promise<void>;
}

const TradesContext = createContext<Ctx | null>(null);

async function fetchDemo(): Promise<Trade[]> {
  const res = await fetch(`${import.meta.env.BASE_URL}demo-trades.json`, { cache: 'no-cache' });
  if (!res.ok) return [];
  return parseTradesFile(await res.text()).trades;
}

export function TradesProvider({ children }: { children: ReactNode }) {
  const { repo, settings } = useSettings();
  const mode: Mode = repo ? 'github' : 'local';
  const [trades, setTrades] = useState<Trade[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const tradesRef = useRef(trades);
  tradesRef.current = trades;

  const reload = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      if (repo) {
        setTrades(await loadTrades(repo));
      } else {
        setTrades(loadLocalTrades() ?? (await fetchDemo()));
      }
      setStatus('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }, [repo]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** Applique une mutation, de façon optimiste, puis la persiste */
  const persist = useCallback(
    async (mutate: (t: Trade[]) => Trade[], message: string) => {
      const previous = tradesRef.current;
      setTrades(mutate(previous));
      setSyncing(true);
      try {
        if (repo) {
          const saved = await mutateTrades(repo, mutate, message);
          setTrades(saved);
        } else if (!saveLocalTrades(mutate(previous))) {
          throw new Error('Stockage local plein : configurez GitHub ou exportez en JSON.');
        }
      } catch (e) {
        setTrades(previous);
        throw e;
      } finally {
        setSyncing(false);
      }
    },
    [repo],
  );

  const storeImage = useCallback(
    async (tradeId: string, kind: 'avant' | 'apres', img: CompressedImage) =>
      repo ? uploadScreenshot(repo, tradeId, kind, img.blob, img.ext) : blobToDataUrl(img.blob),
    [repo],
  );

  const saveTrade = useCallback<Ctx['saveTrade']>(
    async (trade, images) => {
      const old = tradesRef.current.find((t) => t.id === trade.id);
      const next: Trade = { ...trade, screenshots: { ...trade.screenshots }, updatedAt: new Date().toISOString() };
      const obsolete: string[] = [];

      setSyncing(true);
      try {
        for (const [key, kind] of [
          ['before', 'avant'],
          ['after', 'apres'],
        ] as const) {
          const change = images[key];
          if (change === undefined) continue;
          const prev = old?.screenshots[key];
          if (prev && !prev.startsWith('data:')) obsolete.push(prev);
          next.screenshots[key] = change === 'remove' ? null : await storeImage(trade.id, kind, change);
        }
      } finally {
        setSyncing(false);
      }

      const verb = old ? '✏️ Modification' : '➕ Ajout';
      await persist(
        (list) => (list.some((t) => t.id === next.id) ? list.map((t) => (t.id === next.id ? next : t)) : [...list, next]),
        `${verb} du trade ${next.id}`,
      );
      if (repo) obsolete.forEach((p) => void removeScreenshot(repo, p).catch(() => {}));
    },
    [persist, repo, storeImage],
  );

  const deleteTrade = useCallback<Ctx['deleteTrade']>(
    async (id) => {
      const old = tradesRef.current.find((t) => t.id === id);
      await persist((list) => list.filter((t) => t.id !== id), `🗑️ Suppression du trade ${id}`);
      if (repo && old) {
        [old.screenshots.before, old.screenshots.after]
          .filter((p): p is string => !!p && !p.startsWith('data:'))
          .forEach((p) => void removeScreenshot(repo, p).catch(() => {}));
      }
    },
    [persist, repo],
  );

  const importTrades = useCallback<Ctx['importTrades']>(
    (incoming, replace) =>
      persist(
        (list) => (replace ? incoming : mergeTrades(list, incoming)),
        `📥 Import JSON (${incoming.length} trades${replace ? ', remplacement' : ''})`,
      ),
    [persist],
  );

  const resetDemo = useCallback(async () => {
    clearLocalTrades();
    await reload();
  }, [reload]);

  const computed = useMemo(() => computeTrades(trades, settings.startingCapital), [trades, settings.startingCapital]);

  const value = useMemo(
    () => ({ mode, status, error, syncing, trades, computed, saveTrade, deleteTrade, importTrades, reload, resetDemo }),
    [mode, status, error, syncing, trades, computed, saveTrade, deleteTrade, importTrades, reload, resetDemo],
  );
  return <TradesContext.Provider value={value}>{children}</TradesContext.Provider>;
}

export function useTrades() {
  const ctx = useContext(TradesContext);
  if (!ctx) throw new Error('useTrades hors TradesProvider');
  return ctx;
}
