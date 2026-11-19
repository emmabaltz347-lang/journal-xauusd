import type { ReactNode } from 'react';

export const C = {
  gold: '#E6C068',
  gain: '#34d399',
  loss: '#ff6b6b',
  axis: 'rgba(255,255,255,0.45)',
  grid: 'rgba(255,255,255,0.06)',
};

export const axisProps = {
  tickLine: false,
  axisLine: false,
  tick: { fill: C.axis, fontSize: 11 },
} as const;

/** Tooltip en verre */
export function GlassTooltip({ title, rows }: { title?: ReactNode; rows: { label: string; value: ReactNode; color?: string }[] }) {
  return (
    <div className="glass-strong min-w-[9rem] rounded-xl bg-night-800/70 px-3 py-2 text-xs shadow-xl">
      {title && <div className="mb-1 font-medium text-white/80">{title}</div>}
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-white/55">
            {r.color && <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />}
            {r.label}
          </span>
          <span className="num text-white">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Barre à extrémité arrondie (4 px) côté valeur, ancrée sur la ligne zéro.
 * Recharts peut fournir une hauteur négative pour les valeurs négatives.
 */
export function SignedBar(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number | number[];
  fill?: string;
  positive?: boolean;
}) {
  const { x = 0, y = 0, width = 0, height = 0 } = props;
  const raw = Array.isArray(props.value) ? props.value[1] : props.value;
  const positive = props.positive ?? (raw ?? 0) >= 0;
  const top = Math.min(y, y + height);
  const h = Math.abs(height);
  if (h < 0.5 || width <= 0) return null;
  const r = Math.min(4, width / 2, h);
  const fill = props.fill ?? (positive ? C.gain : C.loss);
  const d = positive
    ? `M${x},${top + h} V${top + r} Q${x},${top} ${x + r},${top} H${x + width - r} Q${x + width},${top} ${x + width},${top + r} V${top + h} Z`
    : `M${x},${top} V${top + h - r} Q${x},${top + h} ${x + r},${top + h} H${x + width - r} Q${x + width},${top + h} ${x + width},${top + h - r} V${top} Z`;
  return <path d={d} fill={fill} />;
}

export function EmptyChart({ text = 'Aucun trade clôturé sur cette sélection' }: { text?: string }) {
  return <div className="flex h-48 items-center justify-center text-sm text-white/40">{text}</div>;
}
