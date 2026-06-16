import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type PageHeaderSize = 'md' | 'lg';

const titleSizeClasses: Record<PageHeaderSize, string> = {
  md: 'text-xl',
  lg: 'text-2xl',
};

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  size?: PageHeaderSize;
  className?: string;
}

export function PageHeader({
  title,
  description,
  icon,
  actions,
  size = 'md',
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-3">
          {icon && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1 className={cn('truncate font-bold text-white', titleSizeClasses[size])}>{title}</h1>
            {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
          </div>
        </div>
      </div>
      {actions && <div className="flex w-full shrink-0 items-center gap-3 sm:w-auto">{actions}</div>}
    </div>
  );
}
