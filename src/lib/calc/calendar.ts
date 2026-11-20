import type { ComputedTrade } from '../../types/trade';
import { parisParts } from './paris';
import { round } from './trade';

export interface CalendarDay {
  /** AAAA-MM-JJ (heure de Paris) */
  date: string;
  day: number;
  inMonth: boolean;
  count: number;
  wins: number;
  pnl: number;
  r: number;
  hasNotes: boolean;
}

export interface CalendarWeek {
  days: CalendarDay[]; // 5 jours, du lundi au vendredi (marché fermé le week-end)
  pnl: number;
  r: number;
  /** jours tradés de la semaine (dans le mois affiché) */
  tradingDays: number;
}

export interface CalendarMonth {
  year: number;
  month: number; // 1..12
  weeks: CalendarWeek[];
  pnl: number;
  r: number;
  tradingDays: number;
  count: number;
}

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

/** Clé du jour (heure de Paris) d'une date ISO */
export function parisDayKey(iso: string): string {
  const p = parisParts(iso);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Calendrier d'un mois : résultats des trades clôturés regroupés par jour d'entrée (heure de Paris) */
export function buildMonth(trades: ComputedTrade[], year: number, month: number): CalendarMonth {
  const byDay = new Map<string, { count: number; wins: number; pnl: number; r: number; notes: boolean }>();
  for (const t of trades) {
    if (!t.closed) continue;
    const k = parisDayKey(t.entryAt);
    const g = byDay.get(k) ?? { count: 0, wins: 0, pnl: 0, r: 0, notes: false };
    g.count++;
    if (t.r > 0) g.wins++;
    g.pnl += t.pnlEur;
    g.r += t.r;
    g.notes ||= !!t.notes.trim();
    byDay.set(k, g);
  }

  const first = new Date(Date.UTC(year, month - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7; // lundi = 0
  const start = new Date(Date.UTC(year, month - 1, 1 - offset));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const nbWeeks = Math.ceil((offset + daysInMonth) / 7);

  const weeks: CalendarWeek[] = [];
  for (let w = 0; w < nbWeeks; w++) {
    const days: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start.getTime() + (w * 7 + i) * 86400000);
      const key = ymd(d);
      const inMonth = d.getUTCMonth() === month - 1;
      const g = inMonth ? byDay.get(key) : undefined;
      days.push({
        date: key,
        day: d.getUTCDate(),
        inMonth,
        count: g?.count ?? 0,
        wins: g?.wins ?? 0,
        pnl: round(g?.pnl ?? 0, 2),
        r: round(g?.r ?? 0, 2),
        hasNotes: g?.notes ?? false,
      });
    }
    const weekdays = days.slice(0, 5);
    // une semaine sans aucun jour ouvré dans le mois n'est pas affichée
    if (!weekdays.some((d) => d.inMonth)) continue;
    const traded = weekdays.filter((d) => d.count > 0);
    weeks.push({
      days: weekdays,
      pnl: round(traded.reduce((a, d) => a + d.pnl, 0), 2),
      r: round(traded.reduce((a, d) => a + d.r, 0), 2),
      tradingDays: traded.length,
    });
  }

  return {
    year,
    month,
    weeks,
    pnl: round(weeks.reduce((a, w) => a + w.pnl, 0), 2),
    r: round(weeks.reduce((a, w) => a + w.r, 0), 2),
    tradingDays: weeks.reduce((a, w) => a + w.tradingDays, 0),
    count: weeks.reduce((a, w) => a + w.days.reduce((b, d) => b + d.count, 0), 0),
  };
}
