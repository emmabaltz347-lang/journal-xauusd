import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStats } from '../../hooks/useStats';
import { fmtCompactR, fmtPct, fmtR } from '../../lib/format';
import type { GroupedR } from '../../lib/calc/distribution';
import { GlassCard } from '../ui/GlassCard';
import { C, EmptyChart, GlassTooltip, SignedBar, axisProps } from './chartParts';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export function RDistributionChart() {
  const { histogram } = useStats();
  const reduced = useReducedMotion();
  return (
    <GlassCard delay={0.2} title="Distribution des résultats (R)">
      {!histogram.length ? (
        <EmptyChart />
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={histogram} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap={2}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
              <YAxis {...axisProps} allowDecimals={false} width={28} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const b = payload[0].payload as (typeof histogram)[number];
                  return (
                    <GlassTooltip
                      title={`De ${fmtR(b.from, 1)} à ${fmtR(b.to, 1)}`}
                      rows={[{ label: 'Trades', value: b.count, color: b.from >= 0 ? C.gain : C.loss }]}
                    />
                  );
                }}
              />
              <Bar dataKey="count" isAnimationActive={!reduced} shape={<SignedBar positive />}>
                {histogram.map((b) => (
                  <Cell key={b.label} fill={b.from >= 0 ? C.gain : C.loss} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </GlassCard>
  );
}

function GroupedChart({ data, title, delay, xLabel }: { data: GroupedR[]; title: string; delay: number; xLabel: (g: GroupedR) => string }) {
  const reduced = useReducedMotion();
  const has = data.some((d) => d.count > 0);
  return (
    <GlassCard delay={delay} title={title}>
      {!has ? (
        <EmptyChart />
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="22%">
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" {...axisProps} interval={0} />
              <YAxis {...axisProps} width={44} tickFormatter={fmtCompactR} />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.25)" />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const g = payload[0].payload as GroupedR;
                  return (
                    <GlassTooltip
                      title={xLabel(g)}
                      rows={[
                        { label: 'Résultat', value: fmtR(g.totalR), color: g.totalR >= 0 ? C.gain : C.loss },
                        { label: 'Trades', value: g.count },
                        { label: 'Winrate', value: g.count ? fmtPct(g.winrate, 0) : '—' },
                      ]}
                    />
                  );
                }}
              />
              <Bar dataKey="totalR" isAnimationActive={!reduced} shape={<SignedBar />} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </GlassCard>
  );
}

const DAY_NAMES: Record<string, string> = {
  Lun: 'Lundi',
  Mar: 'Mardi',
  Mer: 'Mercredi',
  Jeu: 'Jeudi',
  Ven: 'Vendredi',
  Sam: 'Samedi',
  Dim: 'Dimanche',
};

export function WeekdayChart() {
  const { byWeekday } = useStats();
  return <GroupedChart data={byWeekday} title="Résultat par jour de la semaine" delay={0.25} xLabel={(g) => DAY_NAMES[g.label]} />;
}

export function HourChart() {
  const { byHour } = useStats();
  return (
    <GroupedChart
      data={byHour}
      title="Résultat par heure d'entrée (Paris)"
      delay={0.3}
      xLabel={(g) => `${g.label} – ${String(g.key + 1).padStart(2, '0')}h`}
    />
  );
}
