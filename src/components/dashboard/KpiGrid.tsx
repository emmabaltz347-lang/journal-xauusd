import { useAccountScope, useStats } from '../../hooks/useStats';
import { currentCapital } from '../../lib/calc/accounts';
import { useTrades } from '../../hooks/useTrades';
import { useSettings } from '../../hooks/useSettings';
import { useFilters } from '../../hooks/useFilters';
import { fmtCompactR, fmtEur, fmtNumber, fmtPF, fmtPct, fmtR, resultClass } from '../../lib/format';
import { CountUp, KpiCard } from './KpiCard';

export function KpiGrid() {
  const { stats: s, startCapital: selStart, grossGainEur, grossLossEur } = useStats();
  const eurPct = selStart ? s.totalEur / selStart : 0;
  const { computed } = useTrades();
  const { filtered } = useFilters();
  const { settings } = useSettings();
  const scope = useAccountScope();
  const { start: startCap, current: capital } = currentCapital(computed, settings.accounts, scope);
  const growth = startCap ? capital / startCap - 1 : 0;
  const capLabel =
    scope.length === 1 && settings.accounts.length > 1
      ? `Capital · ${settings.accounts.find((a) => a.id === scope[0])?.name ?? ''}`
      : settings.accounts.length > 1
        ? 'Capital · tous les comptes'
        : 'Capital actuel';
  const disc = filtered.filter((t) => t.discipline != null);
  const avgDisc = disc.length ? disc.reduce((a, t) => a + (t.discipline ?? 0), 0) / disc.length : null;

  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
      <KpiCard
        index={0}
        label="Résultat total"
        className="col-span-2 lg:row-span-2 lg:flex lg:flex-col lg:justify-center"
        sub={`${s.count} trade${s.count > 1 ? 's' : ''} clôturé${s.count > 1 ? 's' : ''} · ${fmtR(s.expectancy)} en moyenne`}
      >
        <CountUp value={s.totalR} format={(n) => fmtR(n)} className={`text-3xl md:text-5xl ${resultClass(s.totalR)}`} />
      </KpiCard>
      <KpiCard
        index={1}
        label={capLabel}
        className="col-span-2"
        sub={
          <>
            Départ <span className="num">{fmtEur(startCap)}</span> ·{' '}
            <span className={`num ${resultClass(growth)}`}>{growth > 0 ? '+' : ''}{fmtPct(growth, 2)}</span>
          </>
        }
        hint="Capital de départ + gains cumulés de tous les trades du ou des comptes (hors filtres de période)"
      >
        <CountUp value={capital} format={(n) => fmtEur(n)} className="text-3xl text-gold md:text-4xl" />
      </KpiCard>

      <KpiCard
        index={2}
        label="Résultat en euros"
        className="col-span-2"
        sub={
          <>
            <span className="num text-gain">{fmtEur(grossGainEur, true)}</span> de gains ·{' '}
            <span className="num text-loss">{fmtEur(grossLossEur, true)}</span> de pertes
            {selStart > 0 && (
              <>
                {' '}
                · <span className={`num ${resultClass(eurPct)}`}>{eurPct > 0 ? '+' : ''}{fmtPct(eurPct, 2)}</span> du capital
              </>
            )}
          </>
        }
        hint="Somme des gains et pertes en € des trades affichés (filtres appliqués)"
      >
        <CountUp value={s.totalEur} format={(n) => fmtEur(n, true)} className={`text-3xl md:text-4xl ${resultClass(s.totalEur)}`} />
      </KpiCard>

      <KpiCard index={2} label="Winrate" sub={`${s.wins} gagnants · ${s.losses} perdants`}>
        <CountUp value={s.winrate} format={(n) => fmtPct(n)} className="text-gold" />
      </KpiCard>
      <KpiCard index={3} label="Espérance" sub="R moyen par trade" hint="Somme des R / nombre de trades">
        <CountUp value={s.expectancy} format={(n) => fmtR(n)} className={resultClass(s.expectancy)} />
      </KpiCard>
      <KpiCard index={4} label="Profit factor" sub="Gains R / pertes R" hint="Somme des R gagnés / somme des R perdus">
        <CountUp value={s.profitFactor} format={fmtPF} className={s.profitFactor >= 1 ? 'text-gain' : 'text-loss'} />
      </KpiCard>
      <KpiCard index={5} label="Drawdown max" sub={<span className="num">{fmtPct(-s.maxDrawdownPct)}</span>}>
        <CountUp value={-s.maxDrawdownR} format={(n) => (n === 0 ? '0,00 R' : fmtR(n))} className={s.maxDrawdownR ? 'text-loss' : ''} />
      </KpiCard>

      <KpiCard index={6} label="Gain / perte moyens" sub="En R par trade">
        <span className="num text-gain">{fmtCompactR(s.avgWinR)}</span>
        <span className="mx-1.5 text-white/30">/</span>
        <span className="num text-loss">{fmtCompactR(s.avgLossR)}</span>
      </KpiCard>
      <KpiCard index={7} label="Séries max" sub="Gagnante · perdante">
        <span className="num text-gain">{s.longestWinStreak}</span>
        <span className="mx-1.5 text-white/30">·</span>
        <span className="num text-loss">{s.longestLossStreak}</span>
      </KpiCard>
      <KpiCard index={8} label="Trades" sub={s.breakeven ? `dont ${s.breakeven} à l'équilibre` : 'clôturés'}>
        <CountUp value={s.count} format={(n) => fmtNumber(Math.round(n), 0)} />
      </KpiCard>
      <KpiCard index={9} label="Discipline moyenne" sub="sur 5">
        <span className="num text-gold">{avgDisc == null ? '—' : fmtNumber(avgDisc, 1)}</span>
      </KpiCard>
    </div>
  );
}
