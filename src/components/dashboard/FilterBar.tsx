import { useMemo } from 'react';
import { useFilters } from '../../hooks/useFilters';
import { useTrades } from '../../hooks/useTrades';
import { useSettings } from '../../hooks/useSettings';
import { isCurrentPeriod, isFiltered, periodLabel, shiftAnchor, type PeriodKind } from '../../lib/calc/filters';
import { Icon } from '../ui/Icon';
import { EMOTIONS, EMOTION_EMOJI } from '../../types/trade';

const PERIODS: { value: PeriodKind; label: string; short: string }[] = [
  { value: 'all', label: 'Tout', short: 'Tout' },
  { value: 'day', label: 'Jour', short: 'Jour' },
  { value: 'week', label: 'Semaine', short: 'Sem.' },
  { value: 'month', label: 'Mois', short: 'Mois' },
  { value: 'quarter', label: 'Trimestre', short: 'Trim.' },
  { value: 'year', label: 'Année', short: 'Année' },
  { value: 'custom', label: 'Personnalisée', short: 'Perso.' },
];

const sel = 'field min-w-0 !px-2.5 !py-2 !text-xs md:!w-auto md:!px-3.5 md:!pr-8 md:!text-sm';

export function FilterBar() {
  const { filters: f, setFilters, reset, filtered } = useFilters();
  const { trades } = useTrades();
  const { settings } = useSettings();
  const tags = useMemo(() => [...new Set(trades.flatMap((t) => t.errorTags))].sort(), [trades]);
  const set = (patch: Partial<typeof f>) => setFilters((x) => ({ ...x, ...patch }));

  return (
    <div className="glass p-3" data-no-export>
      <div className="grid grid-cols-7 gap-0.5 md:flex md:gap-1">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => set({ period: p.value, anchor: null })}
            className={`shrink-0 whitespace-nowrap rounded-lg px-0.5 py-1.5 text-[11px] font-medium transition md:px-3 md:text-xs ${
              f.period === p.value ? 'bg-gold text-onaccent' : 'text-white/60 hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            <span className="md:hidden">{p.short}</span>
            <span className="hidden md:inline">{p.label}</span>
          </button>
        ))}
      </div>
      {f.period !== 'all' && f.period !== 'custom' && (
        <div className="mt-2 flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
          <button className="rounded-lg p-2 text-white/60 hover:bg-white/[0.08] hover:text-white" onClick={() => set({ anchor: shiftAnchor(f, -1) })} aria-label="Période précédente">
            <Icon name="chevron" size={16} className="rotate-180" />
          </button>
          <div className="flex-1 text-center text-sm font-medium text-white">{periodLabel(f)}</div>
          {!isCurrentPeriod(f) && (
            <button className="rounded-lg px-2 py-1 text-xs text-gold hover:bg-white/[0.08]" onClick={() => set({ anchor: null })}>
              Aujourd'hui
            </button>
          )}
          <button className="rounded-lg p-2 text-white/60 hover:bg-white/[0.08] hover:text-white" onClick={() => set({ anchor: shiftAnchor(f, 1) })} aria-label="Période suivante">
            <Icon name="chevron" size={16} />
          </button>
        </div>
      )}
      <div className="mt-2 grid grid-cols-3 items-center gap-2 md:flex md:flex-wrap">
        {(
          <select
            className={`${sel} col-span-3 md:col-span-1 ${f.account !== 'all' ? '!border-gold/60 !text-gold' : ''}`}
            value={f.account}
            onChange={(e) => set({ account: e.target.value })}
            aria-label="Compte"
          >
            <option value="all">Tous les comptes</option>
            {settings.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                Compte : {a.name}
              </option>
            ))}
          </select>
        )}
        {f.period === 'custom' && (
          <>
            <input type="date" className={sel} value={f.from ?? ''} onChange={(e) => set({ from: e.target.value || null })} aria-label="Du" />
            <span className="hidden text-xs text-white/40 md:inline">→</span>
            <input type="date" className={sel} value={f.to ?? ''} onChange={(e) => set({ to: e.target.value || null })} aria-label="Au" />
          </>
        )}
        <select className={sel} value={f.direction} onChange={(e) => set({ direction: e.target.value as typeof f.direction })} aria-label="Sens">
          <option value="all">Tous sens</option>
          <option value="buy">Achats</option>
          <option value="sell">Ventes</option>
        </select>
        <select className={sel} value={f.emotion} onChange={(e) => set({ emotion: e.target.value as typeof f.emotion })} aria-label="Émotion">
          <option value="all">Émotions</option>
          {EMOTIONS.map((e) => (
            <option key={e} value={e}>
              {EMOTION_EMOJI[e]} {e}
            </option>
          ))}
        </select>
        <select className={sel} value={f.errorTag} onChange={(e) => set({ errorTag: e.target.value })} aria-label="Erreur">
          <option value="all">Erreurs</option>
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
