import { useNavigate, useParams } from 'react-router-dom';
import { TradeForm } from '../components/form/TradeForm';
import { PageHeader } from '../components/ui/PageHeader';
import { LoadState } from '../components/layout/LoadState';
import { useTrades } from '../hooks/useTrades';
import { useToast } from '../hooks/useToast';

export default function AddEditTradePage() {
  const { id } = useParams();
  const { trades, status, mode } = useTrades();
  const navigate = useNavigate();
  const toast = useToast();
  const trade = id ? trades.find((t) => t.id === id) : undefined;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={id ? 'Modifier le trade' : 'Nouveau trade'}
        subtitle={mode === 'local' ? 'Mode démo : enregistré dans ce navigateur uniquement' : 'Enregistré dans votre repo GitHub'}
      />
      <LoadState>
        {id && status === 'ready' && !trade ? (
          <div className="glass p-6 text-center text-white/60">Trade introuvable.</div>
        ) : (
          <TradeForm
            key={trade?.id ?? 'new'}
            trade={trade}
            onDone={(t) => {
              toast(id ? 'Trade modifié' : 'Trade enregistré', 'success');
              navigate(`/trades/${t.id}`);
            }}
          />
        )}
      </LoadState>
    </div>
  );
}
