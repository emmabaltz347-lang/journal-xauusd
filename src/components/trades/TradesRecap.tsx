import { useMemo, useRef, useState } from 'react';
import { useFilters } from '../../hooks/useFilters';
import { useSettings } from '../../hooks/useSettings';
import { useToast } from '../../hooks/useToast';
import { recapByPeriod, type RecapKind } from '../../lib/calc/recap';
import { periodLabel } from '../../lib/calc/filters';
import { exportTradesPdf } from '../../lib/export/tradesPdf';
import { exportJpg } from '../../lib/export/visual';
import type { ComputedTrade } from '../../types/trade';
import { Icon } from '../ui/Icon';
import { PeriodRecap, RECAP_TITLES } from './PeriodRecap';
import { TradesTable } from './TradesTable';

/** Onglet « Récap trades » : récap par période + tableau, avec exports PDF / JPG */
export function TradesRecap({ onOpen }: { onOpen: (t: ComputedTrade) => void }) {
  const { filtered, filters, setFilters } = useFilters();
  const { settings } = useSettings();
  const toast = useToast();
  const [kind, setKind] = useState<RecapKind>('week');
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const recap = useMemo(() => recapByPeriod(filtered, kind), [filtered, kind]);

  const filtersLabel = [
    filters.account !== 'all' && `compte : ${settings.accounts.find((a) => a.id === filters.account)?.name ?? ''}`,
    filters.direction !== 'all' && (filters.direction === 'buy' ? 'achats' : 'ventes'),
    filters.emotion !== 'all' && `émotion : ${filters.emotion}`,
    filters.errorTag === 'none' ? 'sans erreur' : filters.errorTag !== 'all' && `erreur : ${filters.errorTag}`,
  ]
    .filter(Boolean)
    .join(' · ');

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast(`Export impossible : ${e instanceof Error ? e.message : e}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={ref} className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2" data-no-export>
        <button
          className="btn-gold !px-4"
          disabled={busy || !filtered.length}
          onClick={() =>
            run(() =>
              exportTradesPdf({
                trades: filtered,
                recap,
                recapTitle: RECAP_TITLES[kind],
                periodLabel: periodLabel(filters),
                filtersLabel,
                theme: settings.theme,
              }),
            )
          }
        >
          <Icon name="download" size={16} /> {busy ? 'Export…' : 'Télécharger le PDF'}
        </button>
        <button className="btn-ghost !px-3" disabled={busy} onClick={() => ref.current && run(() => exportJpg(ref.current!, 'recap-trades'))}>
          <Icon name="image" size={16} /> JPG
        </button>
      </div>
      <PeriodRecap
        rows={recap}
        kind={kind}
        onKind={setKind}
        onPick={(r) => setFilters((f) => ({ ...f, period: r.kind, anchor: r.start }))}
      />
      <TradesTable trades={filtered} onOpen={onOpen} />
    </div>
  );
}
