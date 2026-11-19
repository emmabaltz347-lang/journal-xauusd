import type { ComputedTrade } from '../../types/trade';
import { parisParts } from './paris';
import { round } from './trade';

export type RecapKind = 'week' | 'month' | 'quarter';

export interface RecapRow {
  key: string; // clé triable
  kind: RecapKind;
  start: string; // AAAA-MM-JJ du premier jour de la période
  label: string;
  count: number;
  wins: number;
  losses: number;
  winrate: number;
  totalR: number;
  totalEur: number;
  bestR: number;
  worstR: number;
}

const pad = (n: number) => String(n).padStart(2, '0');
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const MONTHS_LONG = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

/** Période (en heure de Paris) à laquelle appartient une date d'entrée */
export function periodOf(iso: string, kind: RecapKind): { key: string; start: string; label: string } {
  const p = parisParts(iso);
  if (kind === 'month') {
    return { key: `${p.year}-${pad(p.month)}`, start: `${p.year}-${pad(p.month)}-01`, label: `${MONTHS_LONG[p.month - 1]} ${p.year}` };
  }
  if (kind === 'quarter') {
    const q = Math.floor((p.month - 1) / 3) + 1;
    return { key: `${p.year}-Q${q}`, start: `${p.year}-${pad((q - 1) * 3 + 1)}-01`, label: `T${q} ${p.year}` };
  }
  // semaine du lundi au dimanche
  const monday = new Date(Date.UTC(p.year, p.month - 1, p.day - p.weekday));
  const sunday = new Date(monday.getTime() + 6 * 86400000);
  const start = monday.toISOString().slice(0, 10);
  const label =
    monday.getUTCMonth() === sunday.getUTCMonth()
      ? `${monday.getUTCDate()} – ${sunday.getUTCDate()} ${MONTHS[sunday.getUTCMonth()]} ${sunday.getUTCFullYear()}`
      : `${monday.getUTCDate()} ${MONTHS[monday.getUTCMonth()]} – ${sunday.getUTCDate()} ${MONTHS[sunday.getUTCMonth()]} ${sunday.getUTCFullYear()}`;
  return { key: start, start, label };
}

/** Récapitulatif des trades clôturés par semaine, mois ou trimestre (plus récent en premier) */
export function recapByPeriod(trades: ComputedTrade[], kind: RecapKind): RecapRow[] {
  const map = new Map<string, RecapRow>();
  for (const t of trades) {
    if (!t.closed) continue;
    const p = periodOf(t.entryAt, kind);
    const row =
      map.get(p.key) ??
      ({ key: p.key, kind, start: p.start, label: p.label, count: 0, wins: 0, losses: 0, winrate: 0, totalR: 0, totalEur: 0, bestR: -Infinity, worstR: Infinity } as RecapRow);
    row.count++;
    if (t.r > 0) row.wins++;
    if (t.r < 0) row.losses++;
    row.totalR += t.r;
    row.totalEur += t.pnlEur;
    row.bestR = Math.max(row.bestR, t.r);
    row.worstR = Math.min(row.worstR, t.r);
    map.set(p.key, row);
  }
  return [...map.values()]
    .map((r) => ({ ...r, totalR: round(r.totalR, 2), totalEur: round(r.totalEur, 2), winrate: r.count ? r.wins / r.count : 0 }))
    .sort((a, b) => b.key.localeCompare(a.key));
}
