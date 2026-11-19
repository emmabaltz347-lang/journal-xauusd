import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTrades } from '../../hooks/useTrades';

export function LoadState({ children }: { children: ReactNode }) {
  const { status, error, reload } = useTrades();
  if (status === 'loading')
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="glass h-28 animate-pulse" />
        ))}
      </div>
    );
  if (status === 'error')
    return (
      <div className="glass mx-auto max-w-xl p-6 text-center">
        <div className="text-lg font-semibold text-loss">Impossible de charger les trades</div>
        <p className="mt-2 text-sm text-white/60">{error}</p>
        <div className="mt-4 flex justify-center gap-2">
          <button className="btn-ghost" onClick={() => void reload()}>
            Réessayer
          </button>
          <Link to="/reglages" className="btn-gold">
            Vérifier les réglages
          </Link>
        </div>
      </div>
    );
  return <>{children}</>;
}
