import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useCountUp } from '../../hooks/useCountUp';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export function CountUp({ value, format, className = '' }: { value: number; format: (n: number) => string; className?: string }) {
  const v = useCountUp(value);
  return <span className={`num ${className}`}>{format(Number.isFinite(value) ? v : value)}</span>;
}

export function KpiCard({
  label,
  children,
  sub,
  className = '',
  index = 0,
  hint,
}: {
  label: string;
  children: ReactNode;
  sub?: ReactNode;
  className?: string;
  index?: number;
  hint?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className={`glass relative overflow-hidden p-4 md:p-5 ${className}`}
      title={hint}
    >
      <div className="text-[11px] font-medium uppercase tracking-wider text-title/60">{label}</div>
      <div className="mt-2 text-2xl font-semibold leading-tight md:text-[1.7rem]">{children}</div>
      {sub && <div className="mt-1.5 text-xs text-white/50">{sub}</div>}
    </motion.div>
  );
}
