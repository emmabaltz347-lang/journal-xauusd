import type { ComputedTrade } from '../../types/trade';
import { drawdown, drawdownPercent } from './drawdown';
import { round } from './trade';

export interface Stats {
  count: number;
  wins: number;
  losses: number;
  breakeven: number;
  totalR: number;
  totalEur: number;
  winrate: number; // 0..1
  expectancy: number; // R moyen par trade
  profitFactor: number; // Infinity si aucune perte
  avgWinR: number;
  avgLossR: number; // négatif
  maxDrawdownR: number;
  maxDrawdownPct: number; // 0..1
  longestWinStreak: number;
  longestLossStreak: number;
}

export interface Streaks {
  win: number;
  loss: number;
}

export function streaks(rs: number[]): Streaks {
  let win = 0;
  let loss = 0;
  let cw = 0;
  let cl = 0;
  for (const r of rs) {
    if (r > 0) {
      cw++;
      cl = 0;
    } else if (r < 0) {
      cl++;
      cw = 0;
    } else {
      // un breakeven casse les deux séries
      cw = 0;
      cl = 0;
    }
    win = Math.max(win, cw);
    loss = Math.max(loss, cl);
  }
  return { win, loss };
}

export function profitFactor(rs: number[]): number {
  const gains = rs.filter((r) => r > 0).reduce((a, b) => a + b, 0);
  const losses = -rs.filter((r) => r < 0).reduce((a, b) => a + b, 0);
  if (losses === 0) return gains > 0 ? Infinity : 0;
  return gains / losses;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Statistiques sur des trades déjà triés chronologiquement */
export function computeStats(trades: ComputedTrade[]): Stats {
  const closed = trades.filter((t) => t.closed);
  const rs = closed.map((t) => t.r);
  const winsR = rs.filter((r) => r > 0);
  const lossesR = rs.filter((r) => r < 0);

  // Courbes cumulées
  let cumR = 0;
  const curveR = rs.map((r) => (cumR += r));
  const startCapital = closed[0]?.capitalBefore ?? 0;
  let cap = startCapital;
  const curveEur = closed.map((t) => (cap += t.pnlEur));

  const s = streaks(rs);
  return {
    count: closed.length,
    wins: winsR.length,
    losses: lossesR.length,
    breakeven: rs.length - winsR.length - lossesR.length,
    totalR: round(rs.reduce((a, b) => a + b, 0), 2),
    totalEur: round(closed.reduce((a, t) => a + t.pnlEur, 0), 2),
    winrate: closed.length ? winsR.length / closed.length : 0,
    expectancy: round(mean(rs), 3),
    profitFactor: profitFactor(rs),
    avgWinR: round(mean(winsR), 2),
    avgLossR: round(mean(lossesR), 2),
    maxDrawdownR: round(drawdown(curveR, 0).max, 2),
    maxDrawdownPct: drawdownPercent(curveEur, startCapital),
    longestWinStreak: s.win,
    longestLossStreak: s.loss,
  };
}

export interface EquityPoint {
  index: number;
  date: string;
  r: number;
  cumR: number;
  ddR: number;
  capital: number;
  ddEur: number;
}

/** Points de la courbe d'equity (premier point = départ) */
export function equityCurve(trades: ComputedTrade[]): EquityPoint[] {
  const closed = trades.filter((t) => t.closed);
  if (!closed.length) return [];
  const start = closed[0].capitalBefore;
  let cumR = 0;
  let cap = start;
  let peakR = 0;
  let peakEur = start;
  const pts: EquityPoint[] = [
    { index: 0, date: closed[0].entryAt, r: 0, cumR: 0, ddR: 0, capital: start, ddEur: 0 },
  ];
  closed.forEach((t, i) => {
    cumR = round(cumR + t.r, 2);
    cap = round(cap + t.pnlEur, 2);
    peakR = Math.max(peakR, cumR);
    peakEur = Math.max(peakEur, cap);
    pts.push({
      index: i + 1,
      date: t.exitAt ?? t.entryAt,
      r: t.r,
      cumR,
      ddR: round(cumR - peakR, 2),
      capital: cap,
      ddEur: round(cap - peakEur, 2),
    });
  });
  return pts;
}
