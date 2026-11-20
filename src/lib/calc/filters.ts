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
// --- jours de marché (lundi → vendredi) -------------------------------------------------
const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
/** Jour ouvré le plus proche : on recule (dir = -1) ou on avance (dir = 1) jusqu'à un jour de semaine */
export function toWeekday(d: Date, dir: 1 | -1 = -1): Date {
  let x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  while (isWeekend(x)) x = addDays(x, dir);
  return x;
}

/**
 * Semaine « du mois » contenant `d` : du lundi au dimanche, coupée aux limites du mois.
 * Ex. la semaine du 30 nov. au 6 déc. donne [30 nov., 1er déc.[ côté novembre et [1er déc., 7 déc.[ côté décembre.
 */
export function monthWeek(d: Date): [Date, Date] {
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const monday = addDays(day, -((day.getDay() + 6) % 7));
  const mStart = new Date(day.getFullYear(), day.getMonth(), 1);
  const mEnd = new Date(day.getFullYear(), day.getMonth() + 1, 1);
  const start = monday < mStart ? mStart : monday;
  const sunEnd = addDays(monday, 7);
  return [start, sunEnd > mEnd ? mEnd : sunEnd];
}

/** Premier et dernier jour ouvré d'un intervalle [début, fin[ (null s'il n'y en a aucun) */
export function tradingBounds([s, e]: [Date, Date]): [Date, Date] | null {
  const first = toWeekday(s, 1);
  const last = toWeekday(addDays(e, -1), -1);
  return first <= last && first < e && last >= s ? [first, last] : null;
}

export function periodRange(f: Filters, today = new Date()): [Date, Date] | null {
  // sans date choisie, un week-end est ramené au vendredi précédent (marché fermé)
  const now = f.anchor ? new Date(`${f.anchor}T12:00:00`) : f.period === 'day' ? toWeekday(today, -1) : today;
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (f.period) {
    case 'all':
      return null;
    case 'day': {
      const start = new Date(y, m, now.getDate());
      return [start, new Date(y, m, now.getDate() + 1)];
    }
    case 'week':
      return monthWeek(now);
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
  if (f.period === 'day') {
    // jour ouvré précédent / suivant
    return toYmd(toWeekday(addDays(range[0], step), step > 0 ? 1 : -1));
  }
  if (f.period === 'week') {
    // semaine du mois précédente / suivante, en sautant celles sans jour ouvré
    let r = range;
    for (let i = 0; i < Math.abs(step); i++) {
      do {
        r = monthWeek(step > 0 ? r[1] : addDays(r[0], -1));
      } while (!tradingBounds(r));
    }
    return toYmd(r[0]);
  }
  const d = new Date(range[0]);
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
    case 'week': {
      // affichage du lundi au vendredi (jours de marché)
      const tb = tradingBounds([s, e]);
      if (!tb) return `Semaine du ${FULL.format(s)}`;
      const [a, b] = tb;
      if (a.getTime() === b.getTime()) return `Semaine du ${FULL.format(a)}`;
      return a.getMonth() === b.getMonth()
        ? `Semaine du ${a.getDate()} au ${FULL.format(b)}`
        : `Semaine du ${DAY_MONTH.format(a)} au ${FULL.format(b)}`;
    }
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
