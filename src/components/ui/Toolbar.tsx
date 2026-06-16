import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface ToolbarProps {
  children: ReactNode;
  className?: string;
}

export function Toolbar({ children, className }: ToolbarProps) {
  return (
    <div className={cn('flex w-full items-center gap-3 sm:w-auto', className)}>
      {children}
    </div>
  );
}
