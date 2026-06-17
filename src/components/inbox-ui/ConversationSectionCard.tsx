import React from 'react';
import { cn } from '../../lib/utils';

interface ConversationSectionCardProps {
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function ConversationSectionCard({
  children,
  className,
  bodyClassName,
}: ConversationSectionCardProps) {
  return (
    <section
      className={cn(
        'rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfe_100%)] shadow-[0_16px_38px_rgba(15,23,42,0.06)]',
        className,
      )}
    >
      <div className={cn('p-5 lg:p-6', bodyClassName)}>
        {children}
      </div>
    </section>
  );
}

interface ConversationSectionHeaderProps {
  title: React.ReactNode;
  icon?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function ConversationSectionHeader({
  title,
  icon,
  description,
  actions,
  className,
}: ConversationSectionHeaderProps) {
  return (
    <div className={cn('mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
          {icon}
          <span>{title}</span>
        </div>
        {description && (
          <div className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            {description}
          </div>
        )}
      </div>
      {actions && <div className="shrink-0 sm:pl-4">{actions}</div>}
    </div>
  );
}
