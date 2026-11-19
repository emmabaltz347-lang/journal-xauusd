import { useMemo } from 'react';
import { useFilters } from '../../hooks/useFilters';
import { useTrades } from '../../hooks/useTrades';
import { isFiltered, type PeriodKind } from '../../lib/calc/filters';
import { EMOTIONS, EMOTION_EMOJI } from '../../types/trade';

const PERIODS: { value: PeriodKind; label: string }[] = [
  { value: 'all', label: 'Tout' },
  { value: 'week', label: 'Semaine' },
  { value: 'month', label: 'Mois' },
  { value: 'quarter', label: 'Trimestre' },
  { value: 'year', label: 'Année' },
  { value: 'custom', label: 'Personnalisée' },
];

const sel = 'field min-w-0 !px-2.5 !py-2 !text-xs md:!w-auto md:!px-3.5 md:!pr-8 md:!text-sm';

export function FilterBar() {
  const { filters: f, setFilters, reset, filtered } = useFilters();
  const { trades } = useTrades();
  const tags = useMemo(() => [...new Set(trades.flatMap((t) => t.errorTags))].sort(), [trades]);
  const set = (patch: Partial<typeof f>) => setFilters((x) => ({ ...x, ...patch }));

  return (
    <div className="glass p-3" data-no-export>
      <div className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto px-1">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => set({ period: p.value })}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              f.period === p.value ? 'bg-gold/90 text-night-900' : 'text-white/60 hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-3 items-center gap-2 md:flex md:flex-wrap">
        {f.period === 'custom' && (
          <>
            <input type="date" className={sel} value={f.from ?? ''} onChange={(e) => set({ from: e.target.value || null })} aria-label="Du" />
            <span className="hidden text-xs text-white/40 md:inline">→</span>
            <input type="date" className={sel} value={f.to ?? ''} onChange={(e) => set({ to: e.target.value || null })} aria-label="Au" />
          </>
        )}
        <select className={sel} value={f.direction} onChange={(e) => set({ direction: e.target.value as typeof f.direction })} aria-label="Sens">
          <option value="all">Achat + Vente</option>
          <option value="buy">Achats</option>
          <option value="sell">Ventes</option>
        </select>
        <select className={sel} value={f.emotion} onChange={(e) => set({ emotion: e.target.value as typeof f.emotion })} aria-label="Émotion">
          <option value="all">Toutes émotions</option>
          {EMOTIONS.map((e) => (
            <option key={e} value={e}>
              {EMOTION_EMOJI[e]} {e}
            </option>
          ))}
        </select>
        <select className={sel} value={f.errorTag} onChange={(e) => set({ errorTag: e.target.value })} aria-label="Erreur">
          <option value="all">Toutes erreurs</option>
          <option value="none">Sans erreur</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <span className="col-span-2 text-xs text-white/45 md:col-span-1 md:ml-auto">
          <span className="num text-white/70">{filtered.length}</span> trade{filtered.length > 1 ? 's' : ''}
        </span>
        {isFiltered(f) && (
          <button onClick={reset} className="text-xs text-gold hover:underline">
            Réinitialiser
          </button>
        )}
      </div>
    </div>
  );
}
