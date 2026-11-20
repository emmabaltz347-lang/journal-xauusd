import { useMemo } from 'react';
import { computeStats, equityCurve } from '../lib/calc/stats';
import { rByHour, rByWeekday, rHistogram } from '../lib/calc/distribution';
import { capitalAt } from '../lib/calc/accounts';
import { useFilters } from './useFilters';
import { useTrades } from './useTrades';
import { useSettings } from './useSettings';

/** Identifiants des comptes concernés par le filtre */
export function useAccountScope(): string[] {
  const { filters } = useFilters();
  const { settings } = useSettings();
  return useMemo(
    () => (filters.account && filters.account !== 'all' ? [filters.account] : settings.accounts.map((a) => a.id)),
    [filters.account, settings.accounts],
  );
}

export function useStats() {
  const { filtered } = useFilters();
  const { computed } = useTrades();
  const { settings } = useSettings();
  const scope = useAccountScope();
  return useMemo(() => {
    const closed = filtered.filter((t) => t.closed);
    // capital des comptes concernés au moment du premier trade de la sélection
    const start = closed.length
      ? capitalAt(computed, settings.accounts, scope, new Date(closed[0].entryAt).getTime())
      : undefined;
    return {
      stats: computeStats(filtered, start),
      equity: equityCurve(filtered, start),
      histogram: rHistogram(closed.map((t) => t.r)),
      byWeekday: rByWeekday(filtered),
      byHour: rByHour(filtered),
      openCount: filtered.length - closed.length,
      /** Capital des comptes concernés au début de la sélection */
      startCapital: start ?? 0,
      grossGainEur: closed.reduce((a, t) => a + Math.max(0, t.pnlEur), 0),
      grossLossEur: closed.reduce((a, t) => a + Math.min(0, t.pnlEur), 0),
    };
  }, [filtered, computed, settings.accounts, scope]);
}
