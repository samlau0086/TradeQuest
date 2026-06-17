import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type EmptyStateTone = 'default' | 'subtle' | 'amber';
type EmptyStateSize = 'compact' | 'default';
type EmptyStateTheme = 'dark' | 'light';

const toneClasses: Record<EmptyStateTheme, Record<EmptyStateTone, string>> = {
  dark: {
    default: 'border-slate-800 bg-slate-900/50 text-slate-500',
    subtle: 'border-transparent bg-transparent text-slate-500',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
  },
  light: {
    default: 'border-slate-200 bg-white text-slate-500',
    subtle: 'border-transparent bg-transparent text-slate-500',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
  },
};

const sizeClasses: Record<EmptyStateSize, string> = {
  compact: 'px-0 py-1 text-sm',
  default: 'rounded-lg border p-4 text-sm',
};

interface EmptyStateProps {
  children: ReactNode;
  tone?: EmptyStateTone;
  size?: EmptyStateSize;
  theme?: EmptyStateTheme;
  className?: string;
}

export function EmptyState({
  children,
  tone = 'default',
  size = 'default',
  theme = 'dark',
  className,
}: EmptyStateProps) {
  return (
    <div className={cn(toneClasses[theme][tone], sizeClasses[size], className)}>
      {children}
    </div>
  );
}
