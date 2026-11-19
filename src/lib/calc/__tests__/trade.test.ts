import { describe, expect, it } from 'vitest';
import {
  computePnlEur,
  computeR,
  computeTrades,
  inferOutcome,
  isStopValid,
  lotsToEur,
  priceToPips,
  riskEurFromLots,
} from '../trade';
import { mkTrade } from './fixtures';

describe('pips XAUUSD', () => {
  it('par défaut 1 $ = 10 pips (3903,56 → 3913,56 = 100 pips)', () => {
    expect(priceToPips(3903.56 - 3913.56)).toBe(100);
    expect(priceToPips(-3.25)).toBe(32.5);
  });
  it('convention réglable', () => expect(priceToPips(1, 100)).toBe(100));
});

describe('lots', () => {
  const opts = { pipsPerDollar: 10, contractSize: 100, eurUsd: 1.15 };
  it('0,10 lot × 10 $ × 100 oz = 100 $ → € au taux EUR/USD', () => {
    expect(lotsToEur(10, 0.1, opts)).toBe(86.96);
    expect(lotsToEur(10, 0.1, { ...opts, eurUsd: 1 })).toBe(100);
  });
  it('risque en € à partir du SL', () => expect(riskEurFromLots(3903.56, 3913.56, 0.1, { ...opts, eurUsd: 1 })).toBe(100));
  it('vente au SL avec lots', () => {
    const t = mkTrade({ direction: 'sell', entryPrice: 3903.56, stopLoss: 3913.56, takeProfit: 3883.56, exitPrice: 3913.56, lots: 0.1 });
    const [c] = computeTrades([t], 10000, { ...opts, eurUsd: 1 });
    expect(c.r).toBe(-1);
    expect(c.pnlEur).toBe(-100);
    expect(c.pnlSource).toBe('lots');
    expect(c.riskEur).toBe(100);
    expect(c.slPips).toBe(100);
  });
  it('vente au TP avec lots', () => {
    const t = mkTrade({ direction: 'sell', entryPrice: 3903.56, stopLoss: 3913.56, takeProfit: 3883.56, exitPrice: 3883.56, lots: 0.2 });
    expect(computeTrades([t], 10000, { ...opts, eurUsd: 1 })[0].pnlEur).toBe(400);
  });
  it('€ manuel prioritaire', () => {
    const t = mkTrade({ lots: 0.1, pnlManual: 512.34 });
    const [c] = computeTrades([t], 10000, opts);
    expect(c.pnlEur).toBe(512.34);
    expect(c.pnlSource).toBe('manual');
  });
});

describe('computeR', () => {
  it('achat au TP à 2R', () => expect(computeR('buy', 2650, 2647, 2656)).toBe(2));
  it('achat au SL = -1R', () => expect(computeR('buy', 2650, 2647, 2647)).toBe(-1));
  it('vente au TP à 1,5R', () => expect(computeR('sell', 2650, 2654, 2644)).toBe(1.5));
  it('vente au SL = -1R', () => expect(computeR('sell', 2650, 2654, 2654)).toBe(-1));
  it('stop du mauvais côté → null', () => expect(computeR('buy', 2650, 2655, 2660)).toBeNull());
  it('pas de sortie → null', () => expect(computeR('buy', 2650, 2647, null)).toBeNull());
});

describe('validation et issue', () => {
  it('stop valide selon le sens', () => {
    expect(isStopValid('buy', 2650, 2647)).toBe(true);
    expect(isStopValid('sell', 2650, 2647)).toBe(false);
  });
  it('déduit TP / SL', () => {
    expect(inferOutcome('buy', 2650, 2647, 2656, 2656)).toBe('tp');
    expect(inferOutcome('sell', 2650, 2654, 2644, 2654)).toBe('sl');
  });
});

describe('€ et chaîne de capital', () => {
  it('capital × risque × R', () => expect(computePnlEur(10000, 1, 2)).toBe(200));

  it('chaîne le capital dans l’ordre chronologique', () => {
    const a = mkTrade({ entryAt: '2026-11-03T09:00:00+01:00' }); // +2R
    const b = mkTrade({ entryAt: '2026-11-04T09:00:00+01:00', exitPrice: 2647, outcome: 'sl' }); // -1R
    const res = computeTrades([b, a], 10000);
    expect(res.map((t) => t.id)).toEqual([a.id, b.id]);
    expect(res[0].pnlEur).toBe(200);
    expect(res[1].capitalBefore).toBe(10200);
    expect(res[1].pnlEur).toBe(-102);
    expect(res[1].capitalAfter).toBe(10098);
  });

  it('R manuel prioritaire', () => {
    const t = mkTrade({ rManual: true, rMultiple: 1.8 });
    expect(computeTrades([t], 10000)[0].r).toBe(1.8);
  });

  it('trade ouvert : pas de PnL', () => {
    const t = mkTrade({ exitPrice: null, outcome: null });
    const [c] = computeTrades([t], 10000);
    expect(c.closed).toBe(false);
    expect(c.pnlEur).toBe(0);
  });
});
