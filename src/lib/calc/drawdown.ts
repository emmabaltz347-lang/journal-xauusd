export interface DrawdownResult {
  /** Plus grande baisse depuis un sommet (valeur positive) */
  max: number;
  /** Série du drawdown à chaque point (valeur ≤ 0) */
  series: number[];
  peakIndex: number;
  troughIndex: number;
}

/**
 * Drawdown absolu sur une courbe cumulée.
 * `initial` est le niveau de départ (0 pour une courbe en R, capital pour une courbe en €).
 */
export function drawdown(curve: number[], initial = 0): DrawdownResult {
  let peak = initial;
  let peakIdx = -1;
  let max = 0;
  let res = { peakIndex: -1, troughIndex: -1 };
  const series = curve.map((v, i) => {
    if (v > peak) {
      peak = v;
      peakIdx = i;
    }
    const dd = v - peak;
    if (-dd > max) {
      max = -dd;
      res = { peakIndex: peakIdx, troughIndex: i };
    }
    return dd;
  });
  return { max, series, ...res };
}

/** Drawdown maximal en % sur une courbe de capital (ex. 0.052 = 5,2 %) */
export function drawdownPercent(capitalCurve: number[], initial: number): number {
  let peak = initial;
  let max = 0;
  for (const v of capitalCurve) {
    if (v > peak) peak = v;
    if (peak > 0) {
      const dd = (peak - v) / peak;
      if (dd > max) max = dd;
    }
  }
  return max;
}
