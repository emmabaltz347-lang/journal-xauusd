import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_FILTERS, applyFilters, type Filters } from '../lib/calc/filters';
import { loadFilters, saveFilters } from '../lib/storage';
import { useTrades } from './useTrades';
import type { ComputedTrade } from '../types/trade';

interface Ctx {
  filters: Filters;
  setFilters: (f: Filters | ((f: Filters) => Filters)) => void;
  reset: () => void;
  filtered: ComputedTrade[];
}

const FiltersContext = createContext<Ctx | null>(null);

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<Filters>(() => ({ ...DEFAULT_FILTERS, ...(loadFilters<Filters>() ?? {}) }));
  const { computed } = useTrades();

  useEffect(() => {
    saveFilters(filters);
  }, [filters]);

  const filtered = useMemo(() => applyFilters(computed, filters), [computed, filters]);
  const value = useMemo(
    () => ({ filters, setFilters, reset: () => setFilters(DEFAULT_FILTERS), filtered }),
    [filters, filtered],
  );
  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export function useFilters() {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error('useFilters hors FiltersProvider');
  return ctx;
}
