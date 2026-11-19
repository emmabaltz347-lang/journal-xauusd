import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface Props {
  children: ReactNode;
  className?: string;
  delay?: number;
  title?: ReactNode;
  action?: ReactNode;
}

export function GlassCard({ children, className = '', delay = 0, title, action }: Props) {
  const reduced = useReducedMotion();
  return (
    <motion.section
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`glass p-4 md:p-5 ${className}`}
    >
      {(title || action) && (
        <header className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-sm font-semibold text-white/80">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </motion.section>
  );
}
