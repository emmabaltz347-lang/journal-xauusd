import { useMemo, useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { Segmented } from '../ui/Segmented';
import { Icon } from '../ui/Icon';
import { useFilters } from '../../hooks/useFilters';
import { useTrades } from '../../hooks/useTrades';
import { applyFilters } from '../../lib/calc/filters';
import { buildMonth, parisDayKey, type CalendarDay } from '../../lib/calc/calendar';
import { parisParts } from '../../lib/calc/paris';
import { fmtCompactR, fmtEur, fmtPct, fmtR } from '../../lib/format';

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven']; // marché fermé le week-end
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const eurCompact = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', notation: 'compact', maximumFractionDigits: 1 });
const signed = (n: number, s: string) => (n > 0 ? `+${s}` : s);
const fmtEurCompact = (n: number) => signed(n, Math.abs(n) >= 1000 ? eurCompact.format(n) : fmtEur(Math.round(n)).replace(/,00/, ''));

type Unit = 'EUR' | 'R';

/** Calendrier mensuel des résultats (jours tradés colorés, totaux par semaine et par mois) */
export function CalendarCard() {
  const { computed } = useTrades();
  const { filters, setFilters } = useFilters();
  const today = parisDayKey(new Date().toISOString());
  const now = parisParts(new Date());

  // mois affiché : celui de la période filtrée si elle est précise, sinon le mois en cours
  const initial = (() => {
    if (filters.anchor && ['day', 'week', 'month'].includes(filters.period)) {
      const [y, m] = filters.anchor.split('-').map(Number);
      return { y, m };
    }
    return { y: now.year, m: now.month };
  })();
  const [ym, setYm] = useState(initial);
  const [unit, setUnit] = useState<Unit>('EUR');

  // tous les filtres sauf la période (le calendrier a sa propre navigation)
  const trades = useMemo(() => applyFilters(computed, { ...filters, period: 'all' }), [computed, filters]);
  const month = useMemo(() => buildMonth(trades, ym.y, ym.m), [trades, ym]);

  const shift = (step: number) =>
    setYm(({ y, m }) => {
      const d = new Date(Date.UTC(y, m - 1 + step, 1));
      return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 };
    });
  const isCurrent = ym.y === now.year && ym.m === now.month;
  const selectedDay = filters.period === 'day' ? filters.anchor : null;

  const value = (pnl: number, r: number, compact = false) =>
    unit === 'EUR' ? (compact ? fmtEurCompact(pnl) : fmtEur(pnl, true)) : compact ? `${fmtCompactR(r)}R` : fmtR(r);
  const tone = (v: number) => (v > 0 ? 'text-gain' : v < 0 ? 'text-loss' : 'text-white/60');

  const pickDay = (d: CalendarDay) => {
    if (!d.inMonth || !d.count) return;
    setFilters((f) => (f.period === 'day' && f.anchor === d.date ? { ...f, period: 'all', anchor: null } : { ...f, period: 'day', anchor: d.date }));
  };
  const pickWeek = (monday: string) => setFilters((f) => ({ ...f, period: 'week', anchor: monday }));

  return (
    <GlassCard delay={0.1}>
      {/* En-tête */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button className="rounded-lg p-2 text-white/60 hover:bg-white/[0.08] hover:text-white" onClick={() => shift(-1)} aria-label="Mois précédent">
            <Icon name="chevron" size={16} className="rotate-180" />
          </button>
          <h2 className="min-w-[8.5rem] text-center text-sm font-semibold text-title">
            {MONTHS[ym.m - 1]} {ym.y}
          </h2>
          <button className="rounded-lg p-2 text-white/60 hover:bg-white/[0.08] hover:text-white" onClick={() => shift(1)} aria-label="Mois suivant">
            <Icon name="chevron" size={16} />
          </button>
          {!isCurrent && (
            <button className="chip ml-1 border-gold/40 text-gold hover:bg-gold/10" onClick={() => setYm({ y: now.year, m: now.month })}>
              Ce mois
            </button>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`chip num ${month.pnl > 0 ? 'border-gain/40 bg-gain/10 text-gain' : month.pnl < 0 ? 'border-loss/40 bg-loss/10 text-loss' : ''}`}>
            {value(month.pnl, month.r)}
          </span>
          <span className="chip">
            {month.tradingDays} jour{month.tradingDays > 1 ? 's' : ''} · {month.count} trade{month.count > 1 ? 's' : ''}
          </span>
          <Segmented
            ariaLabel="Unité du calendrier"
            value={unit}
            onChange={setUnit}
            options={[
              { value: 'EUR', label: '€' },
              { value: 'R', label: 'R' },
            ]}
          />
        </div>
      </div>

      <div className="grid gap-2 lg:grid-cols-[1fr_9rem]">
        {/* Grille des jours */}
        <div>
          <div className="mb-1.5 grid grid-cols-5 gap-1 md:gap-1.5">
            {WEEKDAYS.map((d) => (
              <div key={d} className="rounded-lg bg-white/[0.04] py-1 text-center text-[11px] font-medium text-white/50">
                {d}
              </div>
            ))}
          </div>
          <div className="grid gap-1 md:gap-1.5">
            {month.weeks.map((w, wi) => (
              <div key={wi} className="grid grid-cols-5 gap-1 md:gap-1.5">
                {w.days.map((d) => {
                  const traded = d.inMonth && d.count > 0;
                  const pos = traded && (unit === 'EUR' ? d.pnl : d.r) > 0;
                  const neg = traded && (unit === 'EUR' ? d.pnl : d.r) < 0;
                  return (
                    <button
                      key={d.date}
                      onClick={() => pickDay(d)}
                      disabled={!traded}
                      title={traded ? `${d.count} trade${d.count > 1 ? 's' : ''} · cliquer pour filtrer sur ce jour` : undefined}
                      className={`relative flex aspect-square flex-col items-end justify-between rounded-lg border p-1 text-right transition md:aspect-[16/10] md:rounded-xl md:p-2 ${
                        !d.inMonth
                          ? 'border-transparent bg-transparent opacity-30'
                          : pos
                            ? 'border-gain/50 bg-gain/[0.14] hover:bg-gain/[0.22]'
                            : neg
                              ? 'border-loss/50 bg-loss/[0.16] hover:bg-loss/[0.24]'
                              : 'border-white/[0.06] bg-white/[0.03]'
                      } ${selectedDay === d.date ? 'ring-2 ring-gold' : d.date === today ? 'ring-1 ring-white/40' : ''} ${traded ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <span className={`num text-[10px] md:text-xs ${d.inMonth ? 'text-white/55' : 'text-white/30'}`}>{d.day}</span>
                      {d.hasNotes && (
                        <span className="absolute left-1 top-1 text-white/50 md:left-2 md:top-2" title="Notes">
                          <Icon name="edit" size={12} />
                        </span>
                      )}
                      {traded && (
                        <span className="w-full">
                          <span className={`num block truncate text-[10px] font-semibold leading-tight md:text-sm ${tone(unit === 'EUR' ? d.pnl : d.r)}`}>
                            {value(d.pnl, d.r, true)}
                          </span>
                          <span className="hidden text-[10px] leading-tight text-white/55 md:block">
                            {d.count} trade{d.count > 1 ? 's' : ''}
                          </span>
                          <span className="num hidden text-[10px] leading-tight text-white/40 md:block">{fmtPct(d.wins / d.count, 0)}</span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Totaux par semaine */}
        <div className="mt-1 grid grid-cols-3 gap-1.5 sm:grid-cols-6 lg:mt-[1.85rem] lg:grid-cols-1 lg:gap-1.5">
          {month.weeks.map((w, wi) => (
            <button
              key={wi}
              onClick={() => w.tradingDays && pickWeek((w.days.find((d) => d.inMonth) ?? w.days[0]).date)}
              disabled={!w.tradingDays}
              className="flex flex-col justify-center rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-2 text-left transition enabled:hover:bg-white/[0.08] lg:aspect-auto lg:min-h-0 lg:flex-1"
              title={w.tradingDays ? 'Filtrer sur cette semaine' : undefined}
            >
              <span className="text-[11px] text-white/50">Semaine {wi + 1}</span>
              <span className={`num text-sm font-semibold ${tone(unit === 'EUR' ? w.pnl : w.r)}`}>
                {w.tradingDays ? value(w.pnl, w.r, true) : unit === 'EUR' ? '0 €' : '0R'}
              </span>
              <span className="text-[10px] text-white/40">
                {w.tradingDays} jour{w.tradingDays > 1 ? 's' : ''}
              </span>
            </button>
          ))}
        </div>
      </div>
      <p className="mt-2 text-[11px] text-white/40">
        Cliquez sur un jour ou une semaine pour filtrer le dashboard. Les filtres compte, sens, émotion et erreur s'appliquent au calendrier.
      </p>
    </GlassCard>
  );
}
