import { describe, expect, it } from 'vitest';
import { drawdown, drawdownPercent } from '../drawdown';
import { computeStats, equityCurve, profitFactor, streaks } from '../stats';
import { computeTrades } from '../trade';
import { mkTrade } from './fixtures';

const seq = (rs: number[]) =>
  computeTrades(
    rs.map((r, i) =>
      mkTrade({
        entryAt: new Date(Date.UTC(2026, 10, 1 + i, 9)).toISOString(),
        rManual: true,
        rMultiple: r,
      }),
    ),
    10000,
  );

describe('séries', () => {
  it('plus longues séries', () => {
    expect(streaks([1, 2, -1, -1, -1, 2, 2, 2, 2, -1])).toEqual({ win: 4, loss: 3 });
  });
  it('breakeven casse la série', () => expect(streaks([1, 0, 1])).toEqual({ win: 1, loss: 0 }));
});

describe('profit factor', () => {
  it('gains / pertes', () => expect(profitFactor([2, 2, -1, -1])).toBe(2));
  it('aucune perte → Infinity', () => expect(profitFactor([1, 2])).toBe(Infinity));
  it('aucun trade → 0', () => expect(profitFactor([])).toBe(0));
});

describe('drawdown', () => {
  it('courbe en R', () => {
    const dd = drawdown([2, 1, 0, 3, 1.5, 4]);
    expect(dd.max).toBe(2);
    expect(dd.series).toEqual([0, -1, -2, 0, -1.5, 0]);
  });
  it('drawdown depuis le départ', () => expect(drawdown([-1, -2, -1]).max).toBe(2));
  it('en %', () => expect(drawdownPercent([11000, 9900, 12000], 10000)).toBeCloseTo(0.1));
});

describe('computeStats', () => {
  const s = computeStats(seq([2, -1, -1, 2, 2, -1]));
  it('totaux et winrate', () => {
    expect(s.count).toBe(6);
    expect(s.totalR).toBe(3);
    expect(s.winrate).toBe(0.5);
    expect(s.expectancy).toBe(0.5);
  });
  it('moyennes', () => {
    expect(s.avgWinR).toBe(2);
    expect(s.avgLossR).toBe(-1);
    expect(s.profitFactor).toBe(2);
  });
  it('drawdown max en R', () => expect(s.maxDrawdownR).toBe(2));
  it('drawdown max en % ≈ 2 %', () => expect(s.maxDrawdownPct).toBeCloseTo(0.0198, 3));
  it('total € cohérent avec le capital', () => {
    const t = seq([2, -1, -1, 2, 2, -1]);
    expect(s.totalEur).toBeCloseTo(t[t.length - 1].capitalAfter - 10000, 2);
  });
  it('liste vide', () => {
    const e = computeStats([]);
    expect(e.count).toBe(0);
    expect(e.winrate).toBe(0);
  });
});

describe('equityCurve', () => {
  it('point de départ + un point par trade', () => {
    const c = equityCurve(seq([1, -1, 2]));
    expect(c).toHaveLength(4);
    expect(c.map((p) => p.cumR)).toEqual([0, 1, 0, 2]);
    expect(c.map((p) => p.ddR)).toEqual([0, 0, -1, 0]);
  });
});
