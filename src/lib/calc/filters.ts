import type { Direction, Emotion, Trade } from '../../types/trade';

export type PeriodKind = 'all' | 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export interface Filters {
  period: PeriodKind;
  /** Date (AAAA-MM-JJ) incluse dans la période affichée ; null = période en cours */
  anchor: string | null;
  from: string | null; // AAAA-MM-JJ (période personnalisée)
  to: string | null;
  direction: Direction | 'all';
  emotion: Emotion | 'all'; // émotion avant OU après
  errorTag: string | 'all' | 'none';
  /** Identifiant du compte, ou 'all' pour tous les comptes */
  account: string | 'all';
}

export const DEFAULT_FILTERS: Filters = {
  period: 'all',
  anchor: null,
  from: null,
  to: null,
  direction: 'all',
  emotion: 'all',
  errorTag: 'all',
  account: 'all',
};

/** Bornes [début, fin[ de la période courante, calculées en heure locale du navigateur */
export function periodRange(f: Filters, today = new Date()): [Date, Date] | null {
  const now = f.anchor ? new Date(`${f.anchor}T12:00:00`) : today;
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (f.period) {
    case 'all':
      return null;
    case 'day': {
      const start = new Date(y, m, now.getDate());
      return [start, new Date(y, m, now.getDate() + 1)];
    }
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

export function applyFilters<T extends Trade>(trades: T[], f: Filters, now = new Date(), defaultAccountId = 'principal'): T[] {
  const range = periodRange(f, now);
  return trades.filter((t) => {
    if (f.account && f.account !== 'all' && (t.accountId ?? defaultAccountId) !== f.account) return false;
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
    f.period !== 'all' || f.direction !== 'all' || f.emotion !== 'all' || f.errorTag !== 'all' || (!!f.account && f.account !== 'all')
  );
}

const toYmd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Décale la période affichée de `step` semaines / mois / trimestres / années */
export function shiftAnchor(f: Filters, step: number, today = new Date()): string | null {
  const range = periodRange(f, today);
  if (!range || f.period === 'custom' || f.period === 'all') return f.anchor;
  const d = new Date(range[0]);
  if (f.period === 'day') d.setDate(d.getDate() + step);
  if (f.period === 'week') d.setDate(d.getDate() + 7 * step);
  if (f.period === 'month') d.setMonth(d.getMonth() + step);
  if (f.period === 'quarter') d.setMonth(d.getMonth() + 3 * step);
  if (f.period === 'year') d.setFullYear(d.getFullYear() + step);
  return toYmd(d);
}

const MONTHS = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
const DAY_LONG = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const DAY_MONTH = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const FULL = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

/** Libellé lisible de la période filtrée, ex. « Semaine du 16 au 22 nov. 2026 » */
export function periodLabel(f: Filters, today = new Date()): string {
  const range = periodRange(f, today);
  if (!range) return 'Tous les trades';
  const [s, e] = range;
  const last = new Date(e.getTime() - 86400000);
  switch (f.period) {
    case 'day': {
      const d = DAY_LONG.format(s);
      return d.charAt(0).toUpperCase() + d.slice(1);
    }
    case 'week':
      return s.getMonth() === last.getMonth()
        ? `Semaine du ${s.getDate()} au ${FULL.format(last)}`
        : `Semaine du ${DAY_MONTH.format(s)} au ${FULL.format(last)}`;
    case 'month': {
      const m = MONTHS.format(s);
      return m.charAt(0).toUpperCase() + m.slice(1);
    }
    case 'quarter':
      return `T${Math.floor(s.getMonth() / 3) + 1} ${s.getFullYear()}`;
    case 'year':
      return `Année ${s.getFullYear()}`;
    default:
      return `Du ${f.from ? FULL.format(s) : '…'} au ${f.to ? FULL.format(last) : '…'}`;
  }
}

/** La période affichée est-elle la période en cours ? */
export function isCurrentPeriod(f: Filters, today = new Date()): boolean {
  const a = periodRange(f, today);
  const b = periodRange({ ...f, anchor: null }, today);
  return !a || !b || a[0].getTime() === b[0].getTime();
}
