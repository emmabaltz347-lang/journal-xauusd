import { describe, expect, it } from 'vitest';
import { periodOf, recapByPeriod } from '../recap';
import { DEFAULT_FILTERS, periodLabel, periodRange, shiftAnchor } from '../filters';
import { computeTrades } from '../trade';
import { mkTrade } from './fixtures';

const trades = computeTrades(
  [
    mkTrade({ entryAt: '2026-11-16T09:00:00+01:00' }), // lun. 16/11 +2
    mkTrade({ entryAt: '2026-11-20T09:00:00+01:00', exitPrice: 2647 }), // ven. 20/11 -1
    mkTrade({ entryAt: '2026-11-23T09:00:00+01:00' }), // lun. 23/11 +2
    mkTrade({ entryAt: '2026-09-30T09:00:00+02:00' }), // T3
  ],
  10000,
);

describe('periodOf', () => {
  it('semaine du lundi au dimanche', () => {
    expect(periodOf('2026-11-22T23:30:00+01:00', 'week').start).toBe('2026-11-16');
    expect(periodOf('2026-11-16T00:10:00+01:00', 'week').label).toBe('16 – 22 nov. 2026');
    expect(periodOf('2026-12-01T10:00:00+01:00', 'week').label).toBe('30 nov. – 6 déc. 2026');
  });
  it('mois et trimestre', () => {
    expect(periodOf('2026-11-16T09:00:00+01:00', 'month')).toMatchObject({ label: 'Novembre 2026', start: '2026-11-01' });
    expect(periodOf('2026-11-16T09:00:00+01:00', 'quarter')).toMatchObject({ label: 'T4 2026', start: '2026-10-01' });
  });
});

describe('recapByPeriod', () => {
  it('par semaine, plus récente en premier', () => {
    const r = recapByPeriod(trades, 'week');
    expect(r.map((x) => x.start)).toEqual(['2026-11-23', '2026-11-16', '2026-09-28']);
    expect(r[1]).toMatchObject({ count: 2, wins: 1, losses: 1, totalR: 1, winrate: 0.5, bestR: 2, worstR: -1 });
  });
  it('par trimestre', () => {
    const r = recapByPeriod(trades, 'quarter');
    expect(r.map((x) => [x.label, x.count])).toEqual([['T4 2026', 3], ['T3 2026', 1]]);
    expect(r[0].totalEur).toBeCloseTo(trades.slice(1).reduce((a, t) => a + t.pnlEur, 0), 2);
  });
});

describe('navigation de période', () => {
  const today = new Date(2026, 10, 19, 12);
  it('semaine précédente', () => {
    const f = { ...DEFAULT_FILTERS, period: 'week' as const };
    const anchor = shiftAnchor(f, -1, today);
    expect(anchor).toBe('2026-11-09');
    expect(periodRange({ ...f, anchor }, today)![0].getDate()).toBe(9);
  });
  it('jour : période, navigation et libellé', () => {
    const f = { ...DEFAULT_FILTERS, period: 'day' as const };
    const [s, e] = periodRange(f, today)!;
    expect([s.getDate(), e.getDate()]).toEqual([19, 20]);
    expect(shiftAnchor(f, -1, today)).toBe('2026-11-18');
    expect(periodLabel({ ...f, anchor: '2026-11-18' }, today)).toBe('Mercredi 18 novembre 2026');
  });
  it('mois précédent et libellés', () => {
    const f = { ...DEFAULT_FILTERS, period: 'month' as const };
    expect(periodLabel({ ...f, anchor: shiftAnchor(f, -2, today) }, today)).toBe('Septembre 2026');
    expect(periodLabel({ ...DEFAULT_FILTERS, period: 'quarter' }, today)).toBe('T4 2026');
    expect(periodLabel({ ...DEFAULT_FILTERS, period: 'week' }, today)).toBe('Semaine du 16 au 22 nov. 2026');
  });
});
