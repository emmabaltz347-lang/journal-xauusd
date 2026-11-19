const TZ = 'Europe/Paris';

const num = (min: number, max: number) =>
  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: min, maximumFractionDigits: max });

const n2 = num(2, 2);
const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
const eur0 = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

const signed = (n: number, s: string) => (n > 0 ? `+${s}` : s);

export const fmtNumber = (n: number, d = 2) => num(d, d).format(n);
export const fmtPrice = (n: number | null | undefined) => (n == null ? '—' : n2.format(n));
export const fmtR = (n: number, d = 2) => signed(n, `${num(d, d).format(n)} R`);
export const fmtEur = (n: number, sign = false) => (sign ? signed(n, eur.format(n)) : eur.format(n));
export const fmtEurShort = (n: number) => eur0.format(n);
export const fmtPct = (ratio: number, d = 1) => `${num(d, d).format(ratio * 100)} %`;
export const fmtPips = (n: number) => `${num(0, 1).format(n)} pips`;
export const fmtPF = (n: number) => (Number.isFinite(n) ? n2.format(n) : '∞');
const n01 = num(0, 1);
export const fmtCompactR = (n: number) => signed(n, n01.format(n));

const dateFmt = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('fr-FR', {
  timeZone: TZ,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const longFmt = new Intl.DateTimeFormat('fr-FR', {
  timeZone: TZ,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const shortFmt = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, day: '2-digit', month: 'short' });
const timeFmt = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });

export const fmtDate = (iso: string) => dateFmt.format(new Date(iso));
export const fmtDateTime = (iso: string) => dateTimeFmt.format(new Date(iso));
export const fmtDateLong = (iso: string) => longFmt.format(new Date(iso));
export const fmtDateShort = (iso: string) => shortFmt.format(new Date(iso));
export const fmtTime = (iso: string) => timeFmt.format(new Date(iso));

/** "2 650,40" ou "2650.40" → 2650.4 */
export function parseDecimal(s: string): number | null {
  const clean = s.replace(/\s| | /g, '').replace(',', '.');
  if (clean === '' || clean === '-' || clean === '.') return null;
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
}

/** Valeur numérique → texte de saisie français */
export const toInput = (n: number | null | undefined) => (n == null ? '' : String(n).replace('.', ','));

export const resultClass = (n: number) => (n > 0 ? 'text-gain' : n < 0 ? 'text-loss' : 'text-white/70');
