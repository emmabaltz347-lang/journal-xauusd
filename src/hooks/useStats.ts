import { useMemo } from 'react';
import { computeStats, equityCurve } from '../lib/calc/stats';
import { rByHour, rByWeekday, rHistogram } from '../lib/calc/distribution';
import { useFilters } from './useFilters';

export function useStats() {
  const { filtered } = useFilters();
  return useMemo(() => {
    const closed = filtered.filter((t) => t.closed);
    return {
      stats: computeStats(filtered),
      equity: equityCurve(filtered),
      histogram: rHistogram(closed.map((t) => t.r)),
      byWeekday: rByWeekday(filtered),
      byHour: rByHour(filtered),
      openCount: filtered.length - closed.length,
    };
  }, [filtered]);
}
