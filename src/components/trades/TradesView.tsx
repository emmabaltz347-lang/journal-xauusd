import { useMemo, useState } from 'react';
import { useFilters } from '../../hooks/useFilters';
import { TradesRecap } from './TradesRecap';
import { TradeDetailModal } from './TradeDetailModal';

/** Onglet « Récap trades » du dashboard, avec fenêtre de détail */
export function TradesView() {
  const { filtered } = useFilters();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = useMemo(() => filtered.find((t) => t.id === openId) ?? null, [filtered, openId]);
  return (
    <>
      <TradesRecap onOpen={(t) => setOpenId(t.id)} />
      <TradeDetailModal trade={open} onClose={() => setOpenId(null)} />
    </>
  );
}
