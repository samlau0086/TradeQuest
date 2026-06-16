import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface CRMWorkspaceLayoutProps {
  header?: ReactNode;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  bodyScroll?: 'auto' | 'hidden' | 'visible';
  scrollable?: boolean;
}

export function CRMWorkspaceLayout({
  header,
  children,
  className,
  headerClassName,
  contentClassName,
  bodyScroll = 'visible',
  scrollable = true,
}: CRMWorkspaceLayoutProps) {
  const bodyScrollClass = bodyScroll === 'auto' ? 'overflow-y-auto' : bodyScroll === 'hidden' ? 'overflow-hidden' : undefined;

  return (
    <div className={cn('flex-1 bg-slate-900', scrollable ? 'overflow-y-auto' : 'flex min-h-0 flex-col overflow-hidden', className)}>
      {header && (
        <div className={cn('shrink-0 border-b border-slate-800 pb-5', headerClassName)}>
          {header}
        </div>
      )}
      <div className={cn('min-h-0', !scrollable ? 'flex-1' : undefined, header ? 'pt-6' : undefined, bodyScrollClass, contentClassName)}>
        {children}
      </div>
    </div>
  );
}
