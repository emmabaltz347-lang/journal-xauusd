import { describe, expect, it } from 'vitest';
import { rByHour, rByWeekday, rHistogram } from '../distribution';
import { isoToLocalInput, localInputToIso, parisParts } from '../paris';
import { computeTrades } from '../trade';
import { mkTrade } from './fixtures';

describe('heure de Paris', () => {
  it('hiver UTC+1', () => {
    const p = parisParts('2026-01-15T08:30:00Z');
    expect(p.hour).toBe(9);
    expect(p.weekday).toBe(3); // jeudi
  });
  it('été UTC+2', () => expect(parisParts('2026-07-15T08:30:00Z').hour).toBe(10));
  it('aller-retour saisie', () => {
    expect(localInputToIso('2026-07-15T10:30')).toBe('2026-07-15T10:30:00+02:00');
    expect(localInputToIso('2026-11-18T09:30')).toBe('2026-11-18T09:30:00+01:00');
    expect(isoToLocalInput('2026-11-18T08:30:00Z')).toBe('2026-11-18T09:30');
  });
});

describe('histogramme', () => {
  it('tranches de 0,5 R', () => {
    const h = rHistogram([-1, -1, 2, 2, 1.5, 0.2]);
    expect(h[0].from).toBe(-1);
    expect(h.reduce((a, b) => a + b.count, 0)).toBe(6);
    expect(h.find((b) => b.from === 2)?.count).toBe(2);
    expect(h.find((b) => b.from === 0)?.count).toBe(1);
  });
  it('vide', () => expect(rHistogram([])).toEqual([]));
});

describe('regroupements', () => {
  const trades = computeTrades(
    [
      mkTrade({ entryAt: '2026-11-16T09:15:00+01:00' }), // lundi 9h, +2
      mkTrade({ entryAt: '2026-11-16T14:40:00+01:00', exitPrice: 2647 }), // lundi 14h, -1
      mkTrade({ entryAt: '2026-11-18T09:05:00+01:00' }), // mercredi 9h, +2
    ],
    10000,
  );
  it('par jour', () => {
    const d = rByWeekday(trades);
    expect(d).toHaveLength(5);
    expect(d[0]).toMatchObject({ label: 'Lun', totalR: 1, count: 2, winrate: 0.5 });
    expect(d[2]).toMatchObject({ label: 'Mer', totalR: 2 });
  });
  it('par heure', () => {
    const h = rByHour(trades);
    expect(h.map((x) => x.label)).toEqual(['09h', '14h']);
    expect(h[0].totalR).toBe(4);
  });
});
