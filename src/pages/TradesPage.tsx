import { useNavigate, useParams } from 'react-router-dom';
import { FilterBar } from '../components/dashboard/FilterBar';
import { TradesRecap } from '../components/trades/TradesRecap';
import { TradeDetailModal } from '../components/trades/TradeDetailModal';
import { PageHeader } from '../components/ui/PageHeader';
import { LoadState } from '../components/layout/LoadState';
import { useTrades } from '../hooks/useTrades';
import { Icon } from '../components/ui/Icon';

export default function TradesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { computed } = useTrades();
  const open = id ? computed.find((t) => t.id === id) ?? null : null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Récap trades"
        subtitle="Filtrez par semaine, mois ou trimestre · cliquez sur un trade pour le détail"
        actions={
          <button className="btn-gold hidden md:inline-flex" onClick={() => navigate('/ajouter')}>
            <Icon name="plus" size={16} /> Nouveau trade
          </button>
        }
      />
      <FilterBar />
      <LoadState>
        <TradesRecap onOpen={(t) => navigate(`/trades/${t.id}`)} />
      </LoadState>
      <TradeDetailModal trade={open} onClose={() => navigate('/trades')} />
    </div>
  );
}
