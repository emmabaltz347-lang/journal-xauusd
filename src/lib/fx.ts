/** Récupération du taux EUR/USD (1 € = x $) depuis des sources publiques, sans clé d'API */

export interface FxQuote {
  rate: number;
  /** live : cours en direct (mis à jour en continu) ; bce : taux de référence quotidien de la BCE */
  source: 'live' | 'bce';
  at: Date;
}

async function getJson(url: string, timeoutMs: number): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const valid = (n: number) => Number.isFinite(n) && n > 0.5 && n < 3;

/** Cours en direct (Coinbase, actualisé en continu) */
async function live(timeoutMs: number): Promise<FxQuote> {
  const body = (await getJson('https://api.coinbase.com/v2/exchange-rates?currency=EUR', timeoutMs)) as {
    data?: { rates?: { USD?: string } };
  };
  const rate = Number(body?.data?.rates?.USD);
  if (!valid(rate)) throw new Error('taux invalide');
  return { rate: Math.round(rate * 10000) / 10000, source: 'live', at: new Date() };
}

/** Taux de référence BCE du jour (repli si le cours en direct est indisponible) */
async function bce(timeoutMs: number): Promise<FxQuote> {
  const body = (await getJson('https://api.frankfurter.app/latest?from=EUR&to=USD', timeoutMs)) as {
    rates?: { USD?: number };
    date?: string;
  };
  const rate = Number(body?.rates?.USD);
  if (!valid(rate)) throw new Error('taux invalide');
  return { rate, source: 'bce', at: body?.date ? new Date(`${body.date}T16:00:00+01:00`) : new Date() };
}

export async function fetchEurUsd(timeoutMs = 5000): Promise<FxQuote> {
  try {
    return await live(timeoutMs);
  } catch {
    return await bce(timeoutMs);
  }
}
