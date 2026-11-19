import { useNavigate, useParams } from 'react-router-dom';
import { FilterBar } from '../components/dashboard/FilterBar';
import { TradesTable } from '../components/trades/TradesTable';
import { TradeDetailModal } from '../components/trades/TradeDetailModal';
import { PageHeader } from '../components/ui/PageHeader';
import { LoadState } from '../components/layout/LoadState';
import { useFilters } from '../hooks/useFilters';
import { useTrades } from '../hooks/useTrades';
import { Icon } from '../components/ui/Icon';

export default function TradesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { filtered } = useFilters();
  const { computed } = useTrades();
  const open = id ? computed.find((t) => t.id === id) ?? null : null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Trades"
        subtitle="Cliquez sur un trade pour voir les captures et les notes"
        actions={
          <button className="btn-gold hidden md:inline-flex" onClick={() => navigate('/ajouter')}>
            <Icon name="plus" size={16} /> Nouveau trade
          </button>
        }
      />
      <FilterBar />
      <LoadState>
        <TradesTable trades={filtered} onOpen={(t) => navigate(`/trades/${t.id}`)} />
      </LoadState>
      <TradeDetailModal trade={open} onClose={() => navigate('/trades')} />
    </div>
  );
}
