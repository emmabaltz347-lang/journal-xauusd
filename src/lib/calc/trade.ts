import type { Account, ComputedTrade, Direction, Trade } from '../../types/trade';
import { accountIdOf, defaultAccounts } from './accounts';

/** Paramètres de calcul, réglables dans les Réglages */
export interface CalcOptions {
  /** Pips pour 1 $ de mouvement (10 par défaut : 3903,56 → 3913,56 = 100 pips) */
  pipsPerDollar: number;
  /** Onces par lot (100 par défaut) */
  contractSize: number;
  /** Taux EUR/USD (1 € = x $) */
  eurUsd: number;
}

export const DEFAULT_CALC: CalcOptions = { pipsPerDollar: 10, contractSize: 100, eurUsd: 1.15 };

export const round = (n: number, d = 2) => {
  const f = 10 ** d;
  return Math.round((n + Number.EPSILON) * f) / f;
};

export function priceToPips(distance: number, pipsPerDollar = DEFAULT_CALC.pipsPerDollar): number {
  return round(Math.abs(distance) * pipsPerDollar, 1);
}

/** Signe du trade : +1 pour un achat, -1 pour une vente */
const sign = (d: Direction) => (d === 'buy' ? 1 : -1);

/** Le stop est-il du bon côté du prix d'entrée ? */
export function isStopValid(direction: Direction, entry: number, sl: number): boolean {
  return direction === 'buy' ? sl < entry : sl > entry;
}

export function isTakeProfitValid(direction: Direction, entry: number, tp: number): boolean {
  return direction === 'buy' ? tp > entry : tp < entry;
}

/**
 * R = (sortie - entrée) / (entrée - SL), signé selon le sens.
 * Retourne null si le calcul est impossible (risque nul, données manquantes).
 */
export function computeR(direction: Direction, entry: number, sl: number, exit: number | null): number | null {
  if (exit === null || !Number.isFinite(exit)) return null;
  const risk = (entry - sl) * sign(direction);
  if (!Number.isFinite(risk) || risk <= 0) return null;
  const move = (exit - entry) * sign(direction);
  return round(move / risk, 2);
}

/** Ratio risque / rendement planifié (TP) */
export function plannedRR(direction: Direction, entry: number, sl: number, tp: number): number | null {
  return computeR(direction, entry, sl, tp);
}

/** Déduit l'issue (TP/SL) d'un prix de sortie, à 1 centime près */
export function inferOutcome(
  direction: Direction,
  entry: number,
  sl: number,
  tp: number,
  exit: number | null,
): 'tp' | 'sl' | null {
  if (exit === null) return null;
  const tol = 0.01;
  if (Math.abs(exit - tp) <= tol) return 'tp';
  if (Math.abs(exit - sl) <= tol) return 'sl';
  const move = (exit - entry) * sign(direction);
  return move >= 0 ? 'tp' : 'sl';
}

/** € d'un trade sans lots = capital × % de risque × R */
export function computePnlEur(capitalBefore: number, riskPercent: number, r: number): number {
  return round(capitalBefore * (riskPercent / 100) * r, 2);
}

/**
 * Gain/perte en € à partir des lots : mouvement en $ × onces par lot × lots, converti en €.
 * Ex. 0,10 lot, +10 $ de mouvement, 100 oz/lot → 100 $ → 86,96 € à 1,15.
 */
export function lotsToEur(move: number, lots: number, opts: CalcOptions = DEFAULT_CALC): number {
  return round((move * lots * opts.contractSize) / opts.eurUsd, 2);
}

/** Montant risqué en € pour une taille de position donnée (perte si le SL est touché) */
export function riskEurFromLots(entry: number, sl: number, lots: number, opts: CalcOptions = DEFAULT_CALC): number {
  return lotsToEur(Math.abs(entry - sl), lots, opts);
}

/** R effectif d'un trade : saisie manuelle prioritaire, sinon calcul */
export function effectiveR(t: Trade): number | null {
  if (t.rManual && t.rMultiple !== null) return t.rMultiple;
  return computeR(t.direction, t.entryPrice, t.stopLoss, t.exitPrice) ?? t.rMultiple;
}

/**
 * Résultat en € d'un trade clôturé, par ordre de priorité :
 * 1. montant saisi à la main, 2. calcul à partir des lots, 3. capital × % de risque × R.
 */
export function tradePnlEur(
  t: Trade,
  r: number,
  capitalBefore: number,
  opts: CalcOptions = DEFAULT_CALC,
): { pnl: number; source: ComputedTrade['pnlSource'] } {
  if (t.pnlManual != null) return { pnl: round(t.pnlManual, 2), source: 'manual' };
  if (t.lots && t.exitPrice != null) {
    const move = (t.exitPrice - t.entryPrice) * sign(t.direction);
    return { pnl: lotsToEur(move, t.lots, { ...opts, eurUsd: t.eurUsd ?? opts.eurUsd }), source: 'lots' };
  }
  return { pnl: computePnlEur(capitalBefore, t.riskPercent, r), source: 'risk' };
}

export const byEntryDate = (a: Trade, b: Trade) => new Date(a.entryAt).getTime() - new Date(b.entryAt).getTime();

/**
 * Enrichit tous les trades (ordre chronologique) avec R, capital avant/après et € gagnés.
 * Le capital est chaîné compte par compte : chaque trade utilise le capital laissé
 * par le trade précédent du même compte.
 * Doit être appelé sur TOUS les trades (pas les trades filtrés) pour un capital juste.
 * `accounts` peut être un simple capital de départ (un seul compte).
 */
export function computeTrades(
  trades: Trade[],
  accounts: Account[] | number,
  opts: CalcOptions = DEFAULT_CALC,
): ComputedTrade[] {
  const accs = typeof accounts === 'number' ? defaultAccounts(accounts) : accounts.length ? accounts : defaultAccounts();
  const capitals = new Map(accs.map((a) => [a.id, a.startingCapital]));
  return [...trades].sort(byEntryDate).map((t) => {
    const accountId = accountIdOf(t, accs);
    let capital = capitals.get(accountId) ?? 0;
    const r = effectiveR(t);
    const closed = r !== null || t.pnlManual != null;
    const rr = r ?? 0;
    const { pnl, source } = closed ? tradePnlEur(t, rr, capital, opts) : { pnl: 0, source: 'risk' as const };
    const capitalBefore = capital;
    capital = round(capital + pnl, 2);
    capitals.set(accountId, capital);
    // risque prévu = capital × % de risque saisi (indépendant des lots)
    const riskEur = round((capitalBefore * t.riskPercent) / 100, 2);
    return {
      ...t,
      accountId,
      r: rr,
      closed,
      capitalBefore,
      pnlEur: pnl,
      pnlSource: source,
      riskEur,
      capitalAfter: capital,
      slPips: priceToPips(t.entryPrice - t.stopLoss, opts.pipsPerDollar),
    };
  });
}
