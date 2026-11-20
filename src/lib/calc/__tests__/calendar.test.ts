import { describe, expect, it } from 'vitest';
import { buildMonth, parisDayKey } from '../calendar';
import { computeTrades } from '../trade';
import { mkTrade } from './fixtures';

const trades = computeTrades(
  [
    mkTrade({ entryAt: '2026-11-02T09:00:00+01:00', notes: 'ok' }), // lundi 2 : +2R
    mkTrade({ entryAt: '2026-11-02T15:00:00+01:00', exitPrice: 2647 }), // lundi 2 : -1R
    mkTrade({ entryAt: '2026-11-13T10:00:00+01:00', exitPrice: 2647 }), // vendredi 13 : -1R
    mkTrade({ entryAt: '2026-10-30T10:00:00+01:00' }), // hors mois
    mkTrade({ entryAt: '2026-11-20T10:00:00+01:00', exitPrice: null, outcome: null }), // ouvert : ignoré
  ],
  10000,
);

describe('calendrier mensuel', () => {
  const m = buildMonth(trades, 2026, 11);
  it('semaines du lundi au dimanche', () => {
    // le 1er novembre 2026 est un dimanche → la 1re semaine commence le lundi 26 octobre
    expect(m.weeks[0].days[0].date).toBe('2026-10-26');
    expect(m.weeks[0].days[6]).toMatchObject({ date: '2026-11-01', inMonth: true });
    expect(m.weeks).toHaveLength(6);
  });
  it('regroupe par jour', () => {
    const d2 = m.weeks[1].days[0];
    expect(d2).toMatchObject({ date: '2026-11-02', count: 2, wins: 1, r: 1, hasNotes: true });
    expect(d2.pnl).toBeCloseTo(trades[1].pnlEur + trades[2].pnlEur, 2);
  });
  it('ignore les jours hors du mois et les trades ouverts', () => {
    expect(m.weeks[0].days[4]).toMatchObject({ date: '2026-10-30', inMonth: false, count: 0 });
    expect(m.count).toBe(3);
    expect(m.tradingDays).toBe(2);
    expect(m.r).toBe(0);
  });
  it('totaux par semaine', () => {
    expect(m.weeks[1]).toMatchObject({ r: 1, tradingDays: 1 });
    expect(m.weeks[2]).toMatchObject({ r: -1, tradingDays: 1 });
  });
  it('jour en heure de Paris', () => expect(parisDayKey('2026-11-02T23:30:00Z')).toBe('2026-11-03'));
});
