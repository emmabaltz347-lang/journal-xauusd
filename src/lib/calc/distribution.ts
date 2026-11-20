import type { ComputedTrade } from '../../types/trade';
import { parisParts } from './paris';
import { round } from './trade';

export interface Bucket {
  label: string;
  from: number;
  to: number;
  count: number;
}

/** Histogramme des R par tranches de `step` (par défaut 0,5 R) */
export function rHistogram(rs: number[], step = 0.5): Bucket[] {
  if (!rs.length) return [];
  const min = Math.floor(Math.min(...rs) / step) * step;
  const max = Math.floor(Math.max(...rs) / step) * step;
  const buckets: Bucket[] = [];
  for (let from = min; from <= max + 1e-9; from = round(from + step, 4)) {
    buckets.push({ label: fmtR(from), from, to: round(from + step, 4), count: 0 });
  }
  for (const r of rs) {
    const i = Math.min(buckets.length - 1, Math.floor(round((r - min) / step, 6)));
    buckets[i].count++;
  }
  return buckets;
}

const fmtR = (n: number) => `${n > 0 ? '+' : ''}${n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}`;

export interface GroupedR {
  key: number;
  label: string;
  totalR: number;
  count: number;
  winrate: number;
}

export const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function group(
  trades: ComputedTrade[],
  keyOf: (t: ComputedTrade) => number,
  keys: number[],
  labelOf: (k: number) => string,
): GroupedR[] {
  const map = new Map<number, { total: number; count: number; wins: number }>();
  keys.forEach((k) => map.set(k, { total: 0, count: 0, wins: 0 }));
  for (const t of trades) {
    if (!t.closed) continue;
    const k = keyOf(t);
    const g = map.get(k) ?? { total: 0, count: 0, wins: 0 };
    g.total += t.r;
    g.count++;
    if (t.r > 0) g.wins++;
    map.set(k, g);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([key, g]) => ({
      key,
      label: labelOf(key),
      totalR: round(g.total, 2),
      count: g.count,
      winrate: g.count ? g.wins / g.count : 0,
    }));
}

/** Résultat en R par jour de la semaine (heure de Paris), du lundi au vendredi */
export function rByWeekday(trades: ComputedTrade[]): GroupedR[] {
  // marché ouvert du lundi au vendredi : les week-ends ne sont pas affichés
  const res = group(trades, (t) => parisParts(t.entryAt).weekday, [0, 1, 2, 3, 4], (k) => WEEKDAY_LABELS[k]);
  return res.filter((g) => g.key < 5);
}

/** Résultat en R par heure d'entrée (heure de Paris), uniquement les heures tradées */
export function rByHour(trades: ComputedTrade[]): GroupedR[] {
  return group(trades, (t) => parisParts(t.entryAt).hour, [], (k) => `${String(k).padStart(2, '0')}h`);
}
