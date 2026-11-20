/** Taux EUR/USD (1 € = x $) à une date et une heure données, depuis des sources publiques sans clé d'API */

export interface FxQuote {
  rate: number;
  /** minute : cours de la minute demandée ; bce : taux de référence BCE du jour */
  source: 'minute' | 'bce';
  /** Moment auquel correspond le taux */
  at: Date;
}

async function getJson(url: string, timeoutMs: number): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const valid = (n: number) => Number.isFinite(n) && n > 0.5 && n < 3;

// Données de marché publiques de Binance (deux domaines, le second est un miroir dédié aux données)
const BINANCE_HOSTS = ['https://data-api.binance.vision', 'https://api.binance.com'];

/**
 * Cours EUR/USDT de la minute demandée (bougie 1 min). L'USDT suit le dollar à ~0,1 % près.
 * Si la minute exacte n'a pas de cotation, on prend la bougie suivante la plus proche (dans l'heure).
 */
async function minute(at: Date, timeoutMs: number): Promise<FxQuote> {
  const start = Math.floor(at.getTime() / 60000) * 60000;
  const path = `/api/v3/klines?symbol=EURUSDT&interval=1m&startTime=${start}&endTime=${start + 3600000}&limit=1`;
  let lastError: unknown;
  for (const host of BINANCE_HOSTS) {
    try {
      const rows = (await getJson(host + path, timeoutMs)) as [number, string, string, string, string][];
      if (!Array.isArray(rows) || !rows.length) throw new Error('aucune cotation');
      const [openTime, open] = rows[0];
      const rate = Number(open);
      if (!valid(rate)) throw new Error('taux invalide');
      return { rate: Math.round(rate * 10000) / 10000, source: 'minute', at: new Date(openTime) };
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

/** Taux de référence BCE du jour de l'entrée (repli) */
async function bce(at: Date, timeoutMs: number): Promise<FxQuote> {
  const day = at.toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const body = (await getJson(`https://api.frankfurter.app/${day > today ? 'latest' : day}?from=EUR&to=USD`, timeoutMs)) as {
    rates?: { USD?: number };
    date?: string;
  };
  const rate = Number(body?.rates?.USD);
  if (!valid(rate)) throw new Error('taux invalide');
  return { rate, source: 'bce', at: body?.date ? new Date(`${body.date}T12:00:00Z`) : at };
}

/** Taux EUR/USD au moment `at` (heure d'entrée du trade) */
export async function fetchEurUsdAt(at: Date, timeoutMs = 6000): Promise<FxQuote> {
  // une date future (saisie anticipée) prend le cours le plus récent
  const when = at.getTime() > Date.now() ? new Date(Date.now() - 60000) : at;
  try {
    return await minute(when, timeoutMs);
  } catch {
    return await bce(when, timeoutMs);
  }
}
