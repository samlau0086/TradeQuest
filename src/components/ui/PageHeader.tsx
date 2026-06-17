import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type PageHeaderSize = 'md' | 'lg';
type PageHeaderTheme = 'dark' | 'light';

const titleSizeClasses: Record<PageHeaderSize, string> = {
  md: 'text-xl',
  lg: 'text-2xl',
};

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  size?: PageHeaderSize;
  theme?: PageHeaderTheme;
  className?: string;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  icon,
  actions,
  size = 'md',
  theme = 'dark',
  className,
}: PageHeaderProps) {
  const isLight = theme === 'light';

  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-3">
          {icon && (
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-white'
              )}
            >
              {icon}
            </div>
          )}
          <div className="min-w-0">
            {eyebrow && (
              <div
                className={cn(
                  'mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]',
                  isLight ? 'text-slate-500' : 'text-slate-400'
                )}
              >
                {eyebrow}
              </div>
            )}
            <h1
              className={cn(
                'truncate font-bold',
                titleSizeClasses[size],
                isLight ? 'text-slate-950' : 'text-white'
              )}
            >
              {title}
            </h1>
            {description && (
              <p className={cn('mt-1 text-sm', isLight ? 'text-slate-500' : 'text-slate-400')}>
                {description}
              </p>
            )}
          </div>
        </div>
      </div>
      {actions && (
        <div className={cn('flex w-full shrink-0 items-center gap-3 sm:w-auto', isLight && 'justify-start sm:justify-end')}>
          {actions}
        </div>
      )}
    </div>
  );
}
