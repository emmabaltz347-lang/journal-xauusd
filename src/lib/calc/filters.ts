import type { Direction, Emotion, Trade } from '../../types/trade';

export type PeriodKind = 'all' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export interface Filters {
  period: PeriodKind;
  from: string | null; // AAAA-MM-JJ (période personnalisée)
  to: string | null;
  direction: Direction | 'all';
  emotion: Emotion | 'all'; // émotion avant OU après
  errorTag: string | 'all' | 'none';
}

export const DEFAULT_FILTERS: Filters = {
  period: 'all',
  from: null,
  to: null,
  direction: 'all',
  emotion: 'all',
  errorTag: 'all',
};

/** Bornes [début, fin[ de la période courante, calculées en heure locale du navigateur */
export function periodRange(f: Filters, now = new Date()): [Date, Date] | null {
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (f.period) {
    case 'all':
      return null;
    case 'week': {
      const d = new Date(y, m, now.getDate());
      const dow = (d.getDay() + 6) % 7; // lundi = 0
      const start = new Date(y, m, d.getDate() - dow);
      return [start, new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7)];
    }
    case 'month':
      return [new Date(y, m, 1), new Date(y, m + 1, 1)];
    case 'quarter': {
      const q = Math.floor(m / 3) * 3;
      return [new Date(y, q, 1), new Date(y, q + 3, 1)];
    }
    case 'year':
      return [new Date(y, 0, 1), new Date(y + 1, 0, 1)];
    case 'custom': {
      const start = f.from ? new Date(`${f.from}T00:00:00`) : new Date(0);
      const end = f.to ? new Date(`${f.to}T00:00:00`) : new Date(8.64e15);
      if (f.to) end.setDate(end.getDate() + 1);
      return [start, end];
    }
  }
}

export function applyFilters<T extends Trade>(trades: T[], f: Filters, now = new Date()): T[] {
  const range = periodRange(f, now);
  return trades.filter((t) => {
    if (range) {
      const d = new Date(t.entryAt).getTime();
      if (d < range[0].getTime() || d >= range[1].getTime()) return false;
    }
    if (f.direction !== 'all' && t.direction !== f.direction) return false;
    if (f.emotion !== 'all' && t.emotionBefore !== f.emotion && t.emotionAfter !== f.emotion) return false;
    if (f.errorTag === 'none' && t.errorTags.length > 0) return false;
    if (f.errorTag !== 'all' && f.errorTag !== 'none' && !t.errorTags.includes(f.errorTag)) return false;
    return true;
  });
}

export function isFiltered(f: Filters): boolean {
  return (
    f.period !== 'all' || f.direction !== 'all' || f.emotion !== 'all' || f.errorTag !== 'all'
  );
}
