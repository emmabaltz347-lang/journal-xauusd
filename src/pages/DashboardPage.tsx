import { useRef, useState } from 'react';
import { KpiGrid } from '../components/dashboard/KpiGrid';
import { EquityChart } from '../components/dashboard/EquityChart';
import { HourChart, RDistributionChart, WeekdayChart } from '../components/dashboard/BarCharts';
import { FilterBar } from '../components/dashboard/FilterBar';
import { TradesView } from '../components/trades/TradesView';
import { PageHeader } from '../components/ui/PageHeader';
import { Segmented } from '../components/ui/Segmented';
import { Icon } from '../components/ui/Icon';
import { LoadState } from '../components/layout/LoadState';
import { exportJpg, exportPdf } from '../lib/export/visual';
import { useToast } from '../hooks/useToast';
import { useStats } from '../hooks/useStats';
import { useFilters } from '../hooks/useFilters';
import { isFiltered, periodLabel } from '../lib/calc/filters';

type Tab = 'stats' | 'trades';

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>('stats');
  const ref = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const { openCount } = useStats();
  const { filters } = useFilters();

  const run = async (fn: (n: HTMLElement, name: string) => Promise<void>) => {
    if (!ref.current) return;
    setBusy(true);
    try {
      await fn(ref.current, 'dashboard');
    } catch (e) {
      toast(`Export impossible : ${e instanceof Error ? e.message : e}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={ref} className="space-y-4">
      <PageHeader
        title="Dashboard"
        subtitle={
          <>
            {isFiltered(filters) ? (
              <span className="text-gold">
                Filtré · {periodLabel(filters)}
                {filters.direction !== 'all' && ` · ${filters.direction === 'buy' ? 'achats' : 'ventes'}`}
                {filters.emotion !== 'all' && ` · ${filters.emotion}`}
                {filters.errorTag !== 'all' && ` · ${filters.errorTag === 'none' ? 'sans erreur' : filters.errorTag}`}
              </span>
            ) : (
              'Tous les trades · statistiques en R'
            )}
            {openCount > 0 && ` · ${openCount} en cours non comptabilisé${openCount > 1 ? 's' : ''}`}
          </>
        }
        actions={
          tab === 'stats' && (
          <div className="flex gap-2" data-no-export>
            <button className="btn-ghost !px-3" disabled={busy} onClick={() => run(exportPdf)}>
              <Icon name="download" size={16} /> PDF
            </button>
            <button className="btn-ghost !px-3" disabled={busy} onClick={() => run(exportJpg)}>
              <Icon name="image" size={16} /> JPG
            </button>
          </div>
          )
        }
      />

      <FilterBar />

      <div data-no-export>
        <Segmented
          ariaLabel="Onglet"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'stats', label: 'Statistiques' },
            { value: 'trades', label: 'Récap trades' },
          ]}
        />
      </div>

      <LoadState>
        {tab === 'stats' ? (
          <div className="space-y-4">
            <KpiGrid />
            <EquityChart />
            <div className="grid gap-4 lg:grid-cols-3">
              <RDistributionChart />
              <WeekdayChart />
              <HourChart />
            </div>
          </div>
        ) : (
          <TradesView />
        )}
      </LoadState>
    </div>
  );
}
