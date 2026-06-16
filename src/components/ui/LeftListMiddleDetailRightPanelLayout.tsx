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

export const THREE_PANE_WORKSPACE_STYLES = {
  root: 'flex min-h-0 flex-1 overflow-hidden',
  left: 'min-h-0 shrink-0 overflow-hidden border-r border-slate-800',
  middle: 'min-h-0 flex-1 overflow-hidden',
  right: 'min-h-0 shrink-0 overflow-hidden border-l border-slate-800',
} as const;

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
    <div className={cn(THREE_PANE_WORKSPACE_STYLES.root, className)}>
      {showLeft && (
        <aside className={cn(THREE_PANE_WORKSPACE_STYLES.left, leftClassName)}>
          {left}
        </aside>
      )}

      {showMiddle && (
        <main className={cn(THREE_PANE_WORKSPACE_STYLES.middle, middleClassName)}>
          {middle}
        </main>
      )}

      {right && showRight && (
        <aside className={cn(THREE_PANE_WORKSPACE_STYLES.right, rightClassName)}>
          {right}
        </aside>
      )}
    </div>
  );
}
