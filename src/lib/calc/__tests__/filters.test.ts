import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS, applyFilters, periodRange } from '../filters';
import { mkTrade } from './fixtures';

const now = new Date(2026, 10, 19, 12); // jeudi 19 novembre 2026

const trades = [
  mkTrade({ id: 'a', entryAt: new Date(2026, 10, 17, 9).toISOString(), direction: 'buy', emotionBefore: 'calme' }),
  mkTrade({ id: 'b', entryAt: new Date(2026, 10, 3, 9).toISOString(), direction: 'sell', errorTags: ['hors plan'] }),
  mkTrade({ id: 'c', entryAt: new Date(2026, 7, 3, 9).toISOString(), emotionAfter: 'calme' }),
  mkTrade({ id: 'd', entryAt: new Date(2025, 11, 3, 9).toISOString() }),
];
const ids = (f: Partial<typeof DEFAULT_FILTERS>) =>
  applyFilters(trades, { ...DEFAULT_FILTERS, ...f }, now).map((t) => t.id);

describe('filtres', () => {
  it('semaine commence le lundi', () => {
    const [s] = periodRange({ ...DEFAULT_FILTERS, period: 'week' }, now)!;
    expect(s.getDate()).toBe(16);
  });
  it('périodes', () => {
    expect(ids({ period: 'week' })).toEqual(['a']);
    expect(ids({ period: 'month' })).toEqual(['a', 'b']);
    expect(ids({ period: 'quarter' })).toEqual(['a', 'b']);
    expect(ids({ period: 'year' })).toEqual(['a', 'b', 'c']);
    expect(ids({ period: 'all' })).toHaveLength(4);
  });
  it('personnalisée inclusive', () => {
    expect(ids({ period: 'custom', from: '2026-11-03', to: '2026-11-17' })).toEqual(['a', 'b']);
  });
  it('sens, émotion, tag', () => {
    expect(ids({ direction: 'sell' })).toEqual(['b']);
    expect(ids({ emotion: 'calme' })).toEqual(['a', 'c']);
    expect(ids({ errorTag: 'hors plan' })).toEqual(['b']);
    expect(ids({ errorTag: 'none' })).toEqual(['a', 'c', 'd']);
  });
});
