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
  it('semaines du lundi au vendredi, sans semaine vide', () => {
    // le 1er novembre 2026 est un dimanche : la semaine du 26 oct. n'a aucun jour ouvré en novembre → ignorée
    expect(m.weeks[0].days[0].date).toBe('2026-11-02');
    expect(m.weeks.every((w) => w.days.length === 5)).toBe(true);
    // dernière semaine : lundi 30 novembre seul jour du mois
    expect(m.weeks.at(-1)!.days.filter((d) => d.inMonth).map((d) => d.date)).toEqual(['2026-11-30']);
    expect(m.weeks).toHaveLength(5);
  });
  it('regroupe par jour', () => {
    const d2 = m.weeks[0].days[0];
    expect(d2).toMatchObject({ date: '2026-11-02', count: 2, wins: 1, r: 1, hasNotes: true });
    expect(d2.pnl).toBeCloseTo(trades[1].pnlEur + trades[2].pnlEur, 2);
  });
  it('ignore les jours hors du mois et les trades ouverts', () => {
    const oct = buildMonth(trades, 2026, 10);
    expect(oct.weeks.at(-1)!.days[4]).toMatchObject({ date: '2026-10-30', inMonth: true, count: 1 });
    expect(m.weeks.flatMap((w) => w.days).find((d) => d.date === '2026-10-30')).toBeUndefined();
    expect(m.count).toBe(3);
    expect(m.tradingDays).toBe(2);
    expect(m.r).toBe(0);
  });
  it('totaux par semaine', () => {
    expect(m.weeks[0]).toMatchObject({ r: 1, tradingDays: 1 });
    expect(m.weeks[1]).toMatchObject({ r: -1, tradingDays: 1 });
  });
  it('jour en heure de Paris', () => expect(parisDayKey('2026-11-02T23:30:00Z')).toBe('2026-11-03'));
});
