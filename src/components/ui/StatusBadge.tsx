import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type StatusBadgeTone = 'default' | 'cyan' | 'purple' | 'indigo' | 'amber' | 'emerald' | 'red';
type StatusBadgeSize = 'xs' | 'sm';

const toneClasses: Record<StatusBadgeTone, string> = {
  default: 'border-slate-700 bg-slate-950 text-slate-400',
  cyan: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200',
  purple: 'border-purple-500/30 bg-purple-500/20 text-purple-200',
  indigo: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-200',
  amber: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  red: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
};

const sizeClasses: Record<StatusBadgeSize, string> = {
  xs: 'px-2 py-0.5 text-[10px]',
  sm: 'px-2.5 py-1 text-[11px]',
};

interface StatusBadgeProps {
  children: ReactNode;
  tone?: StatusBadgeTone;
  size?: StatusBadgeSize;
  className?: string;
}

export function StatusBadge({
  children,
  tone = 'default',
  size = 'xs',
  className,
}: StatusBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center rounded border font-bold uppercase leading-none',
      toneClasses[tone],
      sizeClasses[size],
      className
    )}>
      {children}
    </span>
  );
}
