import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface CRMWorkspaceLayoutProps {
  header?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  scrollable?: boolean;
}

export function CRMWorkspaceLayout({
  header,
  children,
  className,
  contentClassName,
  scrollable = true,
}: CRMWorkspaceLayoutProps) {
  return (
    <div className={cn('flex-1 bg-slate-900', scrollable ? 'overflow-y-auto' : 'min-h-0 overflow-hidden', className)}>
      {header && (
        <div className="border-b border-slate-800 pb-5">
          {header}
        </div>
      )}
      <div className={cn('min-h-0', header ? 'pt-6' : undefined, contentClassName)}>
        {children}
      </div>
    </div>
  );
}
