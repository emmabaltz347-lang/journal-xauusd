import type { ComputedTrade, Direction, Trade } from '../../types/trade';

/** Convention XAUUSD : 1 $ de mouvement = 100 pips */
export const PIPS_PER_DOLLAR = 100;

export const round = (n: number, d = 2) => {
  const f = 10 ** d;
  return Math.round((n + Number.EPSILON) * f) / f;
};

export function priceToPips(distance: number): number {
  return round(Math.abs(distance) * PIPS_PER_DOLLAR, 1);
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
export function computeR(
  direction: Direction,
  entry: number,
  sl: number,
  exit: number | null,
): number | null {
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

/** Déduit l'issue (TP/SL) d'un prix de sortie, à la tolérance d'un pip près */
export function inferOutcome(
  direction: Direction,
  entry: number,
  sl: number,
  tp: number,
  exit: number | null,
): 'tp' | 'sl' | null {
  if (exit === null) return null;
  const tol = 1 / PIPS_PER_DOLLAR;
  if (Math.abs(exit - tp) <= tol) return 'tp';
  if (Math.abs(exit - sl) <= tol) return 'sl';
  const move = (exit - entry) * sign(direction);
  return move >= 0 ? 'tp' : 'sl';
}

/** € d'un trade = capital × % de risque × R */
export function computePnlEur(capitalBefore: number, riskPercent: number, r: number): number {
  return round(capitalBefore * (riskPercent / 100) * r, 2);
}

/** R effectif d'un trade : saisie manuelle prioritaire, sinon calcul */
export function effectiveR(t: Trade): number | null {
  if (t.rManual && t.rMultiple !== null) return t.rMultiple;
  return computeR(t.direction, t.entryPrice, t.stopLoss, t.exitPrice) ?? t.rMultiple;
}

export const byEntryDate = (a: Trade, b: Trade) =>
  new Date(a.entryAt).getTime() - new Date(b.entryAt).getTime();

/**
 * Enrichit tous les trades (ordre chronologique) avec R, capital avant/après et € gagnés.
 * Le capital est chaîné : chaque trade utilise le capital laissé par le précédent.
 * Doit être appelé sur TOUS les trades (pas les trades filtrés) pour un capital juste.
 */
export function computeTrades(trades: Trade[], startingCapital: number): ComputedTrade[] {
  let capital = startingCapital;
  return [...trades].sort(byEntryDate).map((t) => {
    const r = effectiveR(t);
    const closed = r !== null;
    const rr = r ?? 0;
    const pnlEur = closed ? computePnlEur(capital, t.riskPercent, rr) : 0;
    const capitalBefore = capital;
    capital = round(capital + pnlEur, 2);
    return {
      ...t,
      r: rr,
      closed,
      capitalBefore,
      pnlEur,
      capitalAfter: capital,
      slPips: priceToPips(t.entryPrice - t.stopLoss),
    };
  });
}
