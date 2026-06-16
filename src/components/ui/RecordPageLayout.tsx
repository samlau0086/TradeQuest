import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface RecordPageLayoutProps {
  header: ReactNode;
  mainColumn: ReactNode;
  sidebarColumn?: ReactNode;
  footer?: ReactNode;
  overlays?: ReactNode;
  className?: string;
  bodyClassName?: string;
  innerClassName?: string;
  gridClassName?: string;
}

export function RecordPageLayout({
  header,
  mainColumn,
  sidebarColumn,
  footer,
  overlays,
  className,
  bodyClassName,
  innerClassName,
  gridClassName,
}: RecordPageLayoutProps) {
  return (
    <div className={cn('fixed inset-0 z-50 overflow-hidden bg-[#05070b] text-slate-100 pointer-events-auto', className)}>
      {header}

      <div className={cn('h-[calc(100dvh-93px)] overflow-y-auto px-5 py-6 lg:px-8', bodyClassName)}>
        <div className={cn('mx-auto max-w-[1800px] space-y-6', innerClassName)}>
          <div className={cn(
            'grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(360px,0.85fr)]',
            gridClassName
          )}>
            <div className="min-w-0 space-y-6">
              {mainColumn}
            </div>
            {sidebarColumn && (
              <div className="min-w-0 space-y-6">
                {sidebarColumn}
              </div>
            )}
          </div>

          {footer}
        </div>
      </div>

      {overlays}
    </div>
  );
}
