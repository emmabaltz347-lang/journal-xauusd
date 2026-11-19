import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStats } from '../../hooks/useStats';
import { fmtCompactR, fmtDateShort, fmtEur, fmtEurShort, fmtR } from '../../lib/format';
import { GlassCard } from '../ui/GlassCard';
import { Segmented } from '../ui/Segmented';
import { C, EmptyChart, GlassTooltip, axisProps } from './chartParts';
import type { EquityPoint } from '../../lib/calc/stats';
import { useReducedMotion } from '../../hooks/useReducedMotion';

type Unit = 'R' | 'EUR';

export function EquityChart() {
  const { equity } = useStats();
  const [unit, setUnit] = useState<Unit>('R');
  const reduced = useReducedMotion();
  const start = equity[0]?.capital ?? 0;
  const data = equity.map((p) => ({ ...p, gainEur: Math.round((p.capital - start) * 100) / 100 }));
  const valueKey = unit === 'R' ? 'cumR' : 'gainEur';
  const ddKey = unit === 'R' ? 'ddR' : 'ddEur';

  return (
    <GlassCard
      delay={0.15}
      title="Courbe d'equity"
      action={
        <Segmented
          ariaLabel="Unité"
          value={unit}
          onChange={setUnit}
          options={[
            { value: 'R', label: 'R' },
            { value: 'EUR', label: '€' },
          ]}
        />
      }
    >
      {data.length < 2 ? (
        <EmptyChart />
      ) : (
        <>
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.gold} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={C.gold} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="ddFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.loss} stopOpacity={0.05} />
                    <stop offset="100%" stopColor={C.loss} stopOpacity={0.45} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="index" {...axisProps} tickFormatter={(i) => (i === 0 ? 'Départ' : `#${i}`)} minTickGap={24} />
                <YAxis
                  {...axisProps}
                  width={unit === 'R' ? 40 : 64}
                  tickFormatter={(v) => (unit === 'R' ? fmtCompactR(v) : fmtEurShort(v))}
                />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                <Tooltip
                  cursor={{ stroke: 'rgba(255,255,255,0.25)', strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload as EquityPoint & { gainEur: number };
                    return (
                      <GlassTooltip
                        title={p.index === 0 ? 'Départ' : `Trade #${p.index} · ${fmtDateShort(p.date)}`}
                        rows={[
                          ...(p.index ? [{ label: 'Trade', value: fmtR(p.r) }] : []),
                          unit === 'R'
                            ? { label: 'Cumul', value: fmtR(p.cumR), color: C.gold }
                            : { label: 'Gains', value: fmtEur(p.gainEur, true), color: C.gold },
                          { label: 'Capital', value: fmtEur(p.capital) },
                          {
                            label: 'Drawdown',
                            value: unit === 'R' ? fmtR(p.ddR) : fmtEur(p.ddEur),
                            color: C.loss,
                          },
                        ]}
                      />
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={ddKey}
                  stroke={C.loss}
                  strokeOpacity={0.6}
                  strokeWidth={1}
                  fill="url(#ddFill)"
                  isAnimationActive={!reduced}
                  name="Drawdown"
                />
                <Area
                  type="monotone"
                  dataKey={valueKey}
                  stroke={C.gold}
                  strokeWidth={2}
                  fill="url(#eqFill)"
                  dot={false}
                  activeDot={{ r: 5, stroke: '#0b0f2a', strokeWidth: 2, fill: C.gold }}
                  isAnimationActive={!reduced}
                  animationDuration={1200}
                  name="Equity"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex gap-4 text-xs text-white/55">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded bg-gold" /> Equity cumulée
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-4 rounded-sm bg-loss/40" /> Drawdown
            </span>
          </div>
        </>
      )}
    </GlassCard>
  );
}
