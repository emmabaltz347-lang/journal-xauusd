import { useMemo, useState } from 'react';
import type { ComputedTrade } from '../../types/trade';
import { EMOTION_EMOJI } from '../../types/trade';
import { fmtDate, fmtEur, fmtPrice, fmtR, fmtTime, resultClass } from '../../lib/format';
import { Thumbnail } from './Thumbnail';
import { DirectionBadge } from './TradeDetailModal';
import { Icon } from '../ui/Icon';

type SortKey = 'date' | 'r' | 'eur' | 'discipline' | 'direction';

const COLS: { key: SortKey | null; label: string; className?: string }[] = [
  { key: null, label: '' },
  { key: 'date', label: 'Date' },
  { key: 'direction', label: 'Sens' },
  { key: null, label: 'Entrée', className: 'text-right' },
  { key: null, label: 'SL', className: 'text-right' },
  { key: null, label: 'TP', className: 'text-right' },
  { key: null, label: 'Sortie', className: 'text-right' },
  { key: 'r', label: 'R', className: 'text-right' },
  { key: 'eur', label: '€', className: 'text-right' },
  { key: null, label: 'Émotions' },
  { key: 'discipline', label: 'Disc.', className: 'text-center' },
  { key: null, label: 'Erreurs' },
];

const value = (t: ComputedTrade, k: SortKey): number | string => {
  switch (k) {
    case 'date':
      return t.entryAt;
    case 'r':
      return t.r;
    case 'eur':
      return t.pnlEur;
    case 'discipline':
      return t.discipline ?? -1;
    case 'direction':
      return t.direction;
  }
};

export function TradesTable({ trades, onOpen }: { trades: ComputedTrade[]; onOpen: (t: ComputedTrade) => void }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'date', dir: -1 });
  const [q, setQ] = useState('');
  const [result, setResult] = useState<'all' | 'win' | 'loss'>('all');

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return trades
      .filter((t) => (result === 'win' ? t.r > 0 : result === 'loss' ? t.r < 0 : true))
      .filter(
        (t) =>
          !needle ||
          t.notes.toLowerCase().includes(needle) ||
          t.errorTags.some((e) => e.toLowerCase().includes(needle)) ||
          fmtDate(t.entryAt).includes(needle),
      )
      .sort((a, b) => {
        const va = value(a, sort.key);
        const vb = value(b, sort.key);
        return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
      });
  }, [trades, sort, q, result]);

  const toggle = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: -1 }));

  return (
    <div className="glass overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 p-3">
        <input className="field !w-full !py-2 sm:!w-64" placeholder="Rechercher (notes, erreurs, date)…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="field !w-auto !py-2" value={result} onChange={(e) => setResult(e.target.value as typeof result)} aria-label="Résultat">
          <option value="all">Tous les résultats</option>
          <option value="win">Gagnants</option>
          <option value="loss">Perdants</option>
        </select>
        <select
          className="field !w-auto !py-2 md:hidden"
          value={`${sort.key}:${sort.dir}`}
          onChange={(e) => {
            const [key, dir] = e.target.value.split(':');
            setSort({ key: key as SortKey, dir: Number(dir) as 1 | -1 });
          }}
          aria-label="Trier"
        >
          <option value="date:-1">Plus récents</option>
          <option value="date:1">Plus anciens</option>
          <option value="r:-1">Meilleur R</option>
          <option value="r:1">Pire R</option>
          <option value="discipline:-1">Discipline</option>
        </select>
        <span className="ml-auto text-xs text-white/45">
          <span className="num text-white/70">{rows.length}</span> ligne{rows.length > 1 ? 's' : ''}
        </span>
      </div>

      {rows.length === 0 && <div className="p-10 text-center text-sm text-white/40">Aucun trade ne correspond.</div>}

      {/* Mobile : cartes */}
      <ul className="divide-y divide-white/[0.06] md:hidden">
        {rows.map((t) => (
          <li key={t.id}>
            <button onClick={() => onOpen(t)} className="flex w-full items-center gap-3 p-3 text-left active:bg-white/[0.05]">
              <Thumbnail path={t.screenshots.after ?? t.screenshots.before} className="h-12 w-16 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <DirectionBadge d={t.direction} />
                  <span className="num text-xs text-white/50">
                    {fmtDate(t.entryAt)} · {fmtTime(t.entryAt)}
                  </span>
                </div>
                <div className="mt-1 truncate text-xs text-white/50">
                  {t.emotionBefore && EMOTION_EMOJI[t.emotionBefore]} {t.errorTags.join(', ') || t.notes || '—'}
                </div>
              </div>
              <div className="text-right">
                <div className={`num font-semibold ${resultClass(t.r)}`}>{t.closed ? fmtR(t.r) : '…'}</div>
                <div className={`num text-xs ${resultClass(t.pnlEur)}`}>{fmtEur(t.pnlEur, true)}</div>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {/* Desktop : tableau */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-white/45">
              {COLS.map((c, i) => (
                <th key={i} className={`whitespace-nowrap px-3 py-3 font-medium ${c.className ?? ''}`}>
                  {c.key ? (
                    <button onClick={() => toggle(c.key!)} className={`inline-flex items-center gap-1 hover:text-white ${sort.key === c.key ? 'text-gold' : ''}`}>
                      {c.label}
                      <Icon name={sort.key === c.key ? (sort.dir === 1 ? 'up' : 'down') : 'sort'} size={12} />
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr
                key={t.id}
                onClick={() => onOpen(t)}
                className="cursor-pointer border-t border-white/[0.06] transition hover:bg-white/[0.05]"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onOpen(t)}
              >
                <td className="px-3 py-2">
                  <Thumbnail path={t.screenshots.after ?? t.screenshots.before} />
                </td>
                <td className="num whitespace-nowrap px-3 py-2 text-white/80">
                  {fmtDate(t.entryAt)}
                  <span className="ml-1.5 text-white/40">{fmtTime(t.entryAt)}</span>
                </td>
                <td className="px-3 py-2">
                  <DirectionBadge d={t.direction} />
                </td>
                <td className="num px-3 py-2 text-right text-white/80">{fmtPrice(t.entryPrice)}</td>
                <td className="num px-3 py-2 text-right text-white/50">{fmtPrice(t.stopLoss)}</td>
                <td className="num px-3 py-2 text-right text-white/50">{fmtPrice(t.takeProfit)}</td>
                <td className="num px-3 py-2 text-right text-white/80">{fmtPrice(t.exitPrice)}</td>
                <td className={`num whitespace-nowrap px-3 py-2 text-right font-semibold ${resultClass(t.r)}`}>{t.closed ? fmtR(t.r) : '…'}</td>
                <td className={`num whitespace-nowrap px-3 py-2 text-right ${resultClass(t.pnlEur)}`}>{fmtEur(t.pnlEur, true)}</td>
                <td className="whitespace-nowrap px-3 py-2" title={`${t.emotionBefore ?? '—'} → ${t.emotionAfter ?? '—'}`}>
                  {t.emotionBefore ? EMOTION_EMOJI[t.emotionBefore] : '·'} <span className="text-white/30">→</span>{' '}
                  {t.emotionAfter ? EMOTION_EMOJI[t.emotionAfter] : '·'}
                </td>
                <td className="num px-3 py-2 text-center text-gold">{t.discipline ?? '—'}</td>
                <td className="max-w-[14rem] px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {t.errorTags.map((e) => (
                      <span key={e} className="chip !px-2 !py-0.5 border-loss/30 text-[11px] text-loss">
                        {e}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
