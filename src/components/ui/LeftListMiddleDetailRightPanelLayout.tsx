import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface LeftListMiddleDetailRightPanelLayoutProps {
  left: ReactNode;
  middle: ReactNode;
  right?: ReactNode;
  className?: string;
  leftClassName?: string;
  middleClassName?: string;
  rightClassName?: string;
  showLeft?: boolean;
  showMiddle?: boolean;
  showRight?: boolean;
}

export function LeftListMiddleDetailRightPanelLayout({
  left,
  middle,
  right,
  className,
  leftClassName,
  middleClassName,
  rightClassName,
  showLeft = true,
  showMiddle = true,
  showRight = true,
}: LeftListMiddleDetailRightPanelLayoutProps) {
  return (
    <div className={cn('flex min-h-0 flex-1 overflow-hidden', className)}>
      {showLeft && (
        <aside className={cn('min-h-0 shrink-0 overflow-hidden border-r border-slate-800', leftClassName)}>
          {left}
        </aside>
      )}

      {showMiddle && (
        <main className={cn('min-h-0 flex-1 overflow-hidden', middleClassName)}>
          {middle}
        </main>
      )}

      {right && showRight && (
        <aside className={cn('min-h-0 shrink-0 overflow-hidden border-l border-slate-800', rightClassName)}>
          {right}
        </aside>
      )}
    </div>
  );
}
