import { useMemo, useState } from 'react';
import { useFilters } from '../../hooks/useFilters';
import { TradesTable } from './TradesTable';
import { TradeDetailModal } from './TradeDetailModal';

/** Tableau filtré + fenêtre de détail (onglet du dashboard) */
export function TradesView() {
  const { filtered } = useFilters();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = useMemo(() => filtered.find((t) => t.id === openId) ?? null, [filtered, openId]);
  return (
    <>
      <TradesTable trades={filtered} onOpen={(t) => setOpenId(t.id)} />
      <TradeDetailModal trade={open} onClose={() => setOpenId(null)} />
    </>
  );
}
