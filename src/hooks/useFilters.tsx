import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_FILTERS, applyFilters, type Filters } from '../lib/calc/filters';
import { loadFilters, saveFilters } from '../lib/storage';
import { useTrades } from './useTrades';
import { useSettings } from './useSettings';
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
  const { settings } = useSettings();

  useEffect(() => {
    saveFilters(filters);
  }, [filters]);

  // un compte supprimé entre-temps : retour à « Tous les comptes »
  const accountOk = filters.account === 'all' || !filters.account || settings.accounts.some((a) => a.id === filters.account);
  const effective = useMemo(() => (accountOk ? filters : { ...filters, account: 'all' }), [filters, accountOk]);
  const filtered = useMemo(() => applyFilters(computed, effective), [computed, effective]);
  const value = useMemo(
    () => ({ filters: effective, setFilters, reset: () => setFilters(DEFAULT_FILTERS), filtered }),
    [effective, filtered],
  );
  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export function useFilters() {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error('useFilters hors FiltersProvider');
  return ctx;
}
