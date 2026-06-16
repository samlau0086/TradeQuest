import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type EmptyStateTone = 'default' | 'subtle' | 'amber';
type EmptyStateSize = 'compact' | 'default';

const toneClasses: Record<EmptyStateTone, string> = {
  default: 'border-slate-800 bg-slate-900/50 text-slate-500',
  subtle: 'border-transparent bg-transparent text-slate-500',
  amber: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
};

const sizeClasses: Record<EmptyStateSize, string> = {
  compact: 'px-0 py-1 text-sm',
  default: 'rounded-lg border p-4 text-sm',
};

interface EmptyStateProps {
  children: ReactNode;
  tone?: EmptyStateTone;
  size?: EmptyStateSize;
  className?: string;
}

export function EmptyState({
  children,
  tone = 'default',
  size = 'default',
  className,
}: EmptyStateProps) {
  return (
    <div className={cn(toneClasses[tone], sizeClasses[size], className)}>
      {children}
    </div>
  );
}
