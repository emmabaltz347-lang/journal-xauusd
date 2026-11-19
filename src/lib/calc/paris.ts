/** Utilitaires de fuseau Europe/Paris basés sur Intl (gère l'heure d'été) */
const TZ = 'Europe/Paris';

const partsFmt = new Intl.DateTimeFormat('fr-FR', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  weekday: 'short',
  hourCycle: 'h23',
});

const WEEKDAY_INDEX: Record<string, number> = {
  'lun.': 0,
  'mar.': 1,
  'mer.': 2,
  'jeu.': 3,
  'ven.': 4,
  'sam.': 5,
  'dim.': 6,
};

export interface ParisParts {
  year: number;
  month: number; // 1..12
  day: number;
  hour: number;
  minute: number;
  weekday: number; // 0 = lundi … 6 = dimanche
}

export function parisParts(iso: string | Date): ParisParts {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const p = Object.fromEntries(partsFmt.formatToParts(d).map((x) => [x.type, x.value]));
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    weekday: WEEKDAY_INDEX[p.weekday] ?? 0,
  };
}

/** Décalage Paris/UTC en minutes à une date donnée (60 ou 120) */
export function parisOffsetMinutes(date: Date): number {
  const p = parisParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return Math.round((asUtc - Math.floor(date.getTime() / 60000) * 60000) / 60000);
}

/** "2026-11-18T09:30" (heure de Paris) → ISO avec décalage "+01:00" */
export function localInputToIso(value: string): string {
  const [datePart, timePart = '00:00'] = value.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh, mm] = timePart.split(':').map(Number);
  // première estimation en supposant UTC, puis correction par le décalage réel
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm));
  let offset = parisOffsetMinutes(guess);
  const real = new Date(guess.getTime() - offset * 60000);
  offset = parisOffsetMinutes(real);
  const sign = offset >= 0 ? '+' : '-';
  const abs = Math.abs(offset);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${datePart}T${pad(hh)}:${pad(mm)}:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** ISO → "2026-11-18T09:30" en heure de Paris (pour <input type="datetime-local">) */
export function isoToLocalInput(iso: string): string {
  const p = parisParts(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

export function nowLocalInput(): string {
  return isoToLocalInput(new Date().toISOString());
}
