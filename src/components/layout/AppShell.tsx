import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Icon, type IconName } from '../ui/Icon';
import { useTrades } from '../../hooks/useTrades';

const NAV: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/trades', label: 'Récap', icon: 'list' },
  { to: '/ajouter', label: 'Ajouter', icon: 'plus' },
  { to: '/reglages', label: 'Réglages', icon: 'settings' },
];

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 64 64" className="h-9 w-9" aria-hidden="true">
        <rect width="64" height="64" rx="14" className="fill-white/[0.08]" />
        <path d="M12 44 L24 32 L32 38 L50 18" fill="none" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'rgb(var(--c-accent))' }} />
        <circle cx="50" cy="18" r="4" style={{ fill: 'rgb(var(--c-accent))' }} />
      </svg>
      <div className="leading-tight">
        <div className="text-sm font-semibold text-white">Journal Or</div>
        <div className="num text-[11px] tracking-widest text-gold">XAUUSD</div>
      </div>
    </div>
  );
}

function SyncBadge() {
  const { mode, syncing, status } = useTrades();
  if (syncing)
    return (
      <span className="chip border-gold/40 text-gold">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" /> Enregistrement…
      </span>
    );
  if (mode === 'local')
    return (
      <NavLink to="/reglages" className="chip border-gold/30 text-gold/90 hover:bg-gold/10">
        Mode démo · local
      </NavLink>
    );
  return (
    <span className={`chip ${status === 'error' ? 'border-loss/40 text-loss' : 'border-gain/30 text-gain'}`}>
      <Icon name="cloud" size={13} /> {status === 'error' ? 'Erreur GitHub' : 'Synchronisé'}
    </span>
  );
}

export default function AppShell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const onForm = pathname.startsWith('/ajouter') || pathname.startsWith('/modifier');

  return (
    <div className="min-h-screen">
      <div className="bg-aurora" aria-hidden />
      <div className="bg-grain" aria-hidden />

      {/* Barre latérale desktop */}
      <aside className="glass fixed inset-y-4 left-4 z-30 hidden w-60 flex-col gap-8 p-5 md:flex">
        <Logo />
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  isActive ? 'bg-white/[0.10] text-gold shadow-inner' : 'text-white/65 hover:bg-white/[0.05] hover:text-white'
                }`
              }
            >
              <Icon name={n.icon} size={19} />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto">
          <SyncBadge />
        </div>
      </aside>

      {/* En-tête mobile */}
      <header className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] md:hidden">
        <Logo />
        <SyncBadge />
      </header>

      <main className="pb-nav mx-auto max-w-[1400px] px-4 pt-4 md:pl-[17.5rem] md:pr-6 md:pt-6">
        <Outlet />
      </main>

      {/* Bouton flottant mobile */}
      {!onForm && (
        <button
          onClick={() => navigate('/ajouter')}
          className="fixed right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-b from-gold-light to-gold-dark text-onaccent shadow-[0_10px_30px_rgb(var(--c-accent)/0.4)] transition active:scale-90 md:hidden"
          style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
          aria-label="Ajouter un trade"
        >
          <Icon name="plus" size={28} strokeWidth={2.4} />
        </button>
      )}

      {/* Navigation mobile en bas */}
      <nav
        className="glass-strong fixed inset-x-3 z-40 flex justify-around rounded-[22px] bg-night-800/60 px-2 py-1.5 md:hidden"
        style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `flex min-w-[4rem] flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] transition ${
                isActive ? 'text-gold' : 'text-white/55'
              }`
            }
          >
            <Icon name={n.icon} size={22} />
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
