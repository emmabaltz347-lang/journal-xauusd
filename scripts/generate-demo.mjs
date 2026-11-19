// Génère data/trades.json + public/demo-trades.json et des captures SVG fictives.
// Usage : npm run demo
import { mkdirSync, writeFileSync } from 'node:fs';

let seed = 42;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const r2 = (n) => Math.round(n * 100) / 100;

const EMO_BEFORE = ['calme', 'calme', 'confiante', 'confiante', 'impatiente', 'stressée', 'fatiguée'];
const NOTES_WIN = [
  'Cassure du range asiatique, retest propre puis continuation.',
  'Rejet net sur la zone de demande H1, confluence avec le VWAP.',
  'Setup A+ : liquidité prise sous le plus bas de la veille puis reprise.',
  'Patience récompensée, entrée sur la bougie de confirmation M5.',
  'Tendance H4 claire, pullback sur la EMA 21.',
];
const NOTES_LOSS = [
  'Entrée avant la confirmation, le marché a balayé le stop.',
  'Faux breakout juste avant les news US.',
  'Contre-tendance sans vraie structure, à éviter.',
  'Volatilité trop forte à l’ouverture de New York.',
  'Setup correct mais invalidé, perte acceptée.',
];
const TAGS = ['entrée trop tôt', 'hors plan', 'revenge trade', 'news ignorée', 'SL trop serré'];

// 20 jours ouvrés entre le 8 septembre et le 18 novembre 2026
const days = [];
for (let d = new Date(Date.UTC(2026, 8, 8)); d <= new Date(Date.UTC(2026, 10, 18)); d.setUTCDate(d.getUTCDate() + 1)) {
  if (d.getUTCDay() > 0 && d.getUTCDay() < 6) days.push(new Date(d));
}
const chosen = [];
while (chosen.length < 20) {
  const d = pick(days);
  if (!chosen.some((x) => x.getTime() === d.getTime())) chosen.push(d);
}
chosen.sort((a, b) => a - b);

// séquence de résultats : 11 gagnants / 9 perdants
const outcomes = ['tp','sl','tp','tp','sl','tp','sl','sl','tp','tp','sl','tp','tp','sl','sl','tp','sl','tp','tp','sl'];

const pad = (n) => String(n).padStart(2, '0');
// décalage Paris : +02:00 jusqu'au 25 octobre 2026, +01:00 ensuite
const offset = (d) => (d < new Date(Date.UTC(2026, 9, 25)) ? '+02:00' : '+01:00');

let price = 3985;
const trades = [];
const svgs = [];

chosen.forEach((day, i) => {
  const outcome = outcomes[i];
  const direction = rnd() < 0.55 ? 'buy' : 'sell';
  const s = direction === 'buy' ? 1 : -1;
  const hour = pick([8, 9, 9, 10, 10, 14, 14, 15, 15, 16]);
  const minute = pick([0, 5, 15, 20, 30, 40, 45, 50]);
  price = r2(price + (rnd() - 0.4) * 40);
  const entry = r2(price);
  const risk = r2(3 + rnd() * 4); // 300 à 700 pips
  const rr = pick([1.5, 2, 2, 2.5, 3]);
  const sl = r2(entry - s * risk);
  const tp = r2(entry + s * risk * rr);
  const exit = outcome === 'tp' ? tp : sl;
  const dur = 20 + Math.floor(rnd() * 160);
  const date = `${day.toISOString().slice(0, 10)}`;
  const off = offset(day);
  const entryAt = `${date}T${pad(hour)}:${pad(minute)}:00${off}`;
  const exitDate = new Date(Date.parse(entryAt) + dur * 60000);
  const exitAt = `${date}T${pad((hour + Math.floor((minute + dur) / 60)) % 24)}:${pad((minute + dur) % 60)}:00${off}`;
  void exitDate;
  const id = `t_${date}_${pad(hour)}${pad(minute)}_${Math.floor(rnd() * 46656).toString(36).padStart(3, '0')}`;
  const win = outcome === 'tp';
  const errorTags = win ? (rnd() < 0.15 ? ['entrée trop tôt'] : []) : rnd() < 0.6 ? [pick(TAGS)] : [];
  if (!win && i === 7) errorTags.push('revenge trade');
  const emotionBefore = errorTags.includes('revenge trade') ? 'frustrée' : pick(EMO_BEFORE);
  const emotionAfter = win ? pick(['calme', 'confiante', 'euphorique']) : pick(['frustrée', 'calme', 'stressée', 'fatiguée']);
  const discipline = Math.max(1, Math.min(5, (errorTags.length ? 3 : 4) + (rnd() < 0.4 ? 1 : 0) - errorTags.length));
  const hasShots = i % 4 !== 3;

  trades.push({
    id,
    symbol: 'XAUUSD',
    entryAt,
    exitAt,
    direction,
    entryPrice: entry,
    stopLoss: sl,
    takeProfit: tp,
    exitPrice: exit,
    outcome,
    riskPercent: i > 12 ? 0.75 : 1,
    rMultiple: win ? rr : -1,
    rManual: false,
    screenshots: hasShots
      ? { before: `data/screenshots/${id}-avant.svg`, after: `data/screenshots/${id}-apres.svg` }
      : { before: null, after: null },
    notes: win ? pick(NOTES_WIN) : pick(NOTES_LOSS),
    emotionBefore,
    emotionAfter,
    discipline,
    errorTags,
    createdAt: new Date(Date.parse(exitAt)).toISOString(),
    updatedAt: new Date(Date.parse(exitAt)).toISOString(),
  });
  if (hasShots) svgs.push({ id, direction, entry, sl, tp, exit, win });
});

// --- captures SVG fictives ------------------------------------------------
function chart({ direction, entry, sl, tp, exit, win }, after) {
  const W = 1600, H = 1000, N = after ? 70 : 42;
  const lo = Math.min(sl, tp) - 2, hi = Math.max(sl, tp) + 2;
  const y = (p) => 60 + ((hi - p) / (hi - lo)) * (H - 120);
  const candles = [];
  let p = entry + (direction === 'buy' ? 1 : -1) * (Math.abs(entry - sl) * 0.4);
  for (let i = 0; i < N; i++) {
    let target;
    if (i < 42) target = entry + Math.sin(i / 5) * Math.abs(entry - sl) * 0.5 * (1 - i / 42);
    else target = entry + ((exit - entry) * (i - 42)) / (N - 43);
    const o = p;
    const c = i === 41 ? entry : i === N - 1 ? exit : target + (rnd() - 0.5) * 1.6;
    const h = Math.max(o, c) + rnd() * 1.2;
    const l = Math.min(o, c) - rnd() * 1.2;
    candles.push({ o, c, h: Math.min(h, hi), l: Math.max(l, lo) });
    p = c;
  }
  const cw = (W - 200) / 72;
  const body = candles
    .map((k, i) => {
      const x = 60 + i * cw;
      const up = k.c >= k.o;
      const col = up ? '#26a69a' : '#ef5350';
      return `<line x1="${x + cw / 2}" x2="${x + cw / 2}" y1="${y(k.h)}" y2="${y(k.l)}" stroke="${col}" stroke-width="2"/><rect x="${x + 2}" y="${Math.min(y(k.o), y(k.c))}" width="${cw - 4}" height="${Math.max(2, Math.abs(y(k.o) - y(k.c)))}" fill="${col}"/>`;
    })
    .join('');
  const xe = 60 + 41 * cw;
  const zone = (a, b, col) => `<rect x="${xe}" width="${W - 140 - xe}" y="${Math.min(y(a), y(b))}" height="${Math.abs(y(a) - y(b))}" fill="${col}" opacity="0.14"/>`;
  const line = (p, col, label) =>
    `<line x1="40" x2="${W - 140}" y1="${y(p)}" y2="${y(p)}" stroke="${col}" stroke-dasharray="8 6" stroke-width="2"/><rect x="${W - 136}" y="${y(p) - 16}" width="124" height="32" rx="6" fill="${col}"/><text x="${W - 74}" y="${y(p) + 7}" text-anchor="middle" font-family="monospace" font-size="20" fill="#fff">${label} ${p.toFixed(2)}</text>`;
  const grid = Array.from({ length: 9 }, (_, i) => `<line x1="0" x2="${W}" y1="${60 + (i * (H - 120)) / 8}" y2="${60 + (i * (H - 120)) / 8}" stroke="#ffffff" stroke-opacity="0.05"/>`).join('');
  const tag = after
    ? `<text x="60" y="40" font-family="sans-serif" font-size="26" fill="${win ? '#26a69a' : '#ef5350'}">XAUUSD · M5 · ${win ? 'TP atteint' : 'SL touché'}</text>`
    : `<text x="60" y="40" font-family="sans-serif" font-size="26" fill="#d1d4dc">XAUUSD · M5 · ${direction === 'buy' ? 'Achat' : 'Vente'} prévu</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#131722"/>${grid}${zone(entry, tp, '#26a69a')}${zone(entry, sl, '#ef5350')}${body}${line(tp, '#26a69a', 'TP')}${line(entry, '#5d6680', 'E')}${line(sl, '#ef5350', 'SL')}${tag}</svg>`;
}

mkdirSync('data/screenshots', { recursive: true });
mkdirSync('public/demo/screenshots', { recursive: true });
for (const s of svgs) {
  for (const [kind, after] of [['avant', false], ['apres', true]]) {
    const svg = chart(s, after);
    writeFileSync(`data/screenshots/${s.id}-${kind}.svg`, svg);
    writeFileSync(`public/demo/screenshots/${s.id}-${kind}.svg`, svg);
  }
}
const json = JSON.stringify({ version: 1, trades }, null, 2) + '\n';
writeFileSync('data/trades.json', json);
writeFileSync('public/demo-trades.json', json);
console.log(`${trades.length} trades, ${svgs.length * 2} captures`);
