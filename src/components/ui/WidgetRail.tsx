import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface WidgetRailProps {
  children: ReactNode;
  className?: string;
}

export function WidgetRail({ children, className }: WidgetRailProps) {
  return (
    <aside className={cn('min-w-0 space-y-6', className)}>
      {children}
    </aside>
  );
}
