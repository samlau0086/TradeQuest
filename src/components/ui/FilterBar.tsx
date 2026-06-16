import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface FilterBarProps {
  children: ReactNode;
  className?: string;
}

export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div className={cn(
      'flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 sm:flex-row sm:items-center sm:justify-between',
      className
    )}>
      {children}
    </div>
  );
}
