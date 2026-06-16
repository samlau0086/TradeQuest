import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ConversationContextRailProps {
  children: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
  variant?: 'plain' | 'panel' | 'rail';
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

const railVariantClassNames = {
  plain: 'space-y-4',
  panel: 'overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm',
  rail: 'min-w-0 space-y-4 lg:w-[344px] lg:shrink-0',
} as const;

export function ConversationContextRail({
  children,
  title,
  description,
  actions,
  className,
  bodyClassName,
  headerClassName,
  variant = 'plain',
  collapsible = false,
  defaultCollapsed = false,
}: ConversationContextRailProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const hasHeader = Boolean(title || description || actions || collapsible);
  const isPanel = variant === 'panel';
  const body = (
    <div className={cn(isPanel ? 'space-y-4 p-4' : 'space-y-4', bodyClassName)}>
      {children}
    </div>
  );

  return (
    <aside
      className={cn(railVariantClassNames[variant], className)}
      data-conversation-context-rail="true"
    >
      {hasHeader && (
        <header
          className={cn(
            'flex items-start justify-between gap-3',
            isPanel ? 'border-b border-slate-200 px-4 py-3' : 'mb-3',
            headerClassName,
          )}
        >
          <div className="min-w-0">
            {title && <div className="truncate text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{title}</div>}
            {description && <div className="mt-1 text-xs leading-relaxed text-slate-500">{description}</div>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {actions}
            {collapsible && (
              <button
                type="button"
                onClick={() => setCollapsed(prev => !prev)}
                className="rounded-md border border-slate-200 bg-white p-1 text-slate-400 transition-colors hover:border-slate-300 hover:text-slate-700"
                aria-expanded={!collapsed}
              >
                <ChevronDown className={cn('h-4 w-4 transition-transform', collapsed && '-rotate-90')} />
              </button>
            )}
          </div>
        </header>
      )}
      {!collapsed && (hasHeader || isPanel ? body : children)}
    </aside>
  );
}
