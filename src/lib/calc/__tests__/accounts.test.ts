import { describe, expect, it } from 'vitest';
import { accountIdOf, capitalAt, currentCapital, newAccount } from '../accounts';
import { computeTrades } from '../trade';
import { applyFilters, DEFAULT_FILTERS } from '../filters';
import { computeStats } from '../stats';
import { mkTrade } from './fixtures';
import type { Account } from '../../../types/trade';

const accounts: Account[] = [
  { id: 'principal', name: 'Compte principal', startingCapital: 10000, defaultRiskPercent: 1 },
  { id: 'ftmo', name: 'FTMO', startingCapital: 100000, defaultRiskPercent: 0.5 },
];

const trades = [
  mkTrade({ id: 'a', entryAt: '2026-11-02T09:00:00+01:00' }), // principal (null) +2R
  mkTrade({ id: 'b', entryAt: '2026-11-03T09:00:00+01:00', accountId: 'ftmo', riskPercent: 0.5 }), // ftmo +2R
  mkTrade({ id: 'c', entryAt: '2026-11-04T09:00:00+01:00', exitPrice: 2647 }), // principal -1R
  mkTrade({ id: 'd', entryAt: '2026-11-05T09:00:00+01:00', accountId: 'supprimé' }), // compte inconnu → principal
];

describe('comptes', () => {
  const c = computeTrades(trades, accounts);
  it('capital chaîné séparément par compte', () => {
    const byId = Object.fromEntries(c.map((t) => [t.id, t]));
    expect(byId.a.capitalBefore).toBe(10000);
    expect(byId.b.capitalBefore).toBe(100000);
    expect(byId.b.pnlEur).toBe(1000); // 100 000 × 0,5 % × 2
    expect(byId.c.capitalBefore).toBe(10200); // non affecté par le trade FTMO
    expect(byId.d.accountId).toBe('principal');
  });
  it('capital actuel par compte et cumulé', () => {
    expect(currentCapital(c, accounts, ['ftmo'])).toEqual({ start: 100000, current: 101000 });
    const all = currentCapital(c, accounts, ['principal', 'ftmo']);
    expect(all.start).toBe(110000);
    expect(all.current).toBeCloseTo(101000 + c.find((t) => t.id === 'd')!.capitalAfter, 2);
  });
  it('capital à une date', () => {
    expect(capitalAt(c, accounts, ['principal', 'ftmo'], Date.parse('2026-11-04T00:00:00Z'))).toBe(10200 + 101000);
  });
  it('filtre par compte', () => {
    expect(applyFilters(c, { ...DEFAULT_FILTERS, account: 'ftmo' }).map((t) => t.id)).toEqual(['b']);
    expect(applyFilters(c, { ...DEFAULT_FILTERS, account: 'principal' }).map((t) => t.id)).toEqual(['a', 'c', 'd']);
    expect(applyFilters(c, DEFAULT_FILTERS)).toHaveLength(4);
  });
  it('drawdown % calculé sur le capital cumulé des comptes', () => {
    const s = computeStats(c, 110000);
    expect(s.maxDrawdownPct).toBeLessThan(0.01);
  });
  it('nouveau compte : mêmes réglages que le compte principal', () => {
    const n = newAccount(accounts);
    expect(n).toMatchObject({ name: 'Compte 3', startingCapital: 10000, defaultRiskPercent: 1 });
    expect(accounts.some((a) => a.id === n.id)).toBe(false);
  });
  it('compte d’un trade', () => {
    expect(accountIdOf({ accountId: null }, accounts)).toBe('principal');
    expect(accountIdOf({ accountId: 'ftmo' }, accounts)).toBe('ftmo');
  });
});
