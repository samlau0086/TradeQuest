import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface InboxSidebarSectionProps {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function InboxSidebarSection({
  eyebrow,
  title,
  description,
  children,
  className,
  bodyClassName,
}: InboxSidebarSectionProps) {
  return (
    <section
      className={cn(
        'rounded-[22px] border border-slate-200/80 bg-white shadow-[0_12px_34px_rgba(15,23,42,0.06)]',
        className,
      )}
    >
      <div className="border-b border-slate-100 px-4 py-3.5">
        {eyebrow && (
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {eyebrow}
          </div>
        )}
        <div className="mt-1 text-[15px] font-semibold tracking-tight text-slate-900">{title}</div>
        {description && (
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        )}
      </div>
      <div className={cn('px-0 py-0', bodyClassName)}>{children}</div>
    </section>
  );
}
