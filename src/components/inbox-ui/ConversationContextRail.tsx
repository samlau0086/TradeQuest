import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ConversationContextRailBadge {
  label: ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'info' | 'violet' | 'sky';
}

interface ConversationContextRailProps {
  children: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  badges?: ConversationContextRailBadge[];
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
  variant?: 'plain' | 'panel' | 'rail';
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

const railVariantClassNames = {
  plain: 'space-y-4',
  panel: 'overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm',
  rail: 'min-w-0 space-y-4 lg:w-[380px] lg:shrink-0',
} as const;

const badgeToneClassNames = {
  default: 'border-slate-200 bg-white text-slate-500',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  info: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  violet: 'border-violet-200 bg-violet-50 text-violet-700',
  sky: 'border-sky-200 bg-sky-50 text-sky-700',
} as const;

export function ConversationContextRail({
  children,
  title,
  description,
  actions,
  badges,
  className,
  bodyClassName,
  headerClassName,
  variant = 'plain',
  collapsible = false,
  defaultCollapsed = false,
}: ConversationContextRailProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const hasHeader = Boolean(title || description || actions || badges?.length || collapsible);
  const isPanel = variant === 'panel';
  const isRail = variant === 'rail';

  const body = (
    <div
      className={cn(
        isPanel ? 'space-y-4 p-4' : '',
        isRail ? 'space-y-4 p-5' : '',
        !isPanel && !isRail ? 'space-y-4' : '',
        bodyClassName,
      )}
    >
      {children}
    </div>
  );

  return (
    <aside
      className={cn(
        railVariantClassNames[variant],
        isRail && 'overflow-hidden rounded-[26px] border border-slate-200/80 bg-white/96 shadow-[0_18px_48px_rgba(15,23,42,0.08)] backdrop-blur-sm',
        className,
      )}
      data-conversation-context-rail="true"
    >
      {hasHeader && (
        <header
          className={cn(
            'flex items-start justify-between gap-3',
            isPanel ? 'border-b border-slate-100 px-4 py-3' : '',
            isRail ? 'border-b border-slate-200/80 bg-[linear-gradient(180deg,#f8fafc_0%,#f4f7fb_100%)] px-5 py-4' : '',
            !isPanel && !isRail ? 'mb-3' : '',
            headerClassName,
          )}
        >
          <div className="min-w-0">
            {title && (
              <div className={cn(
                'truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500',
                isRail && 'text-slate-600',
              )}>
                {title}
              </div>
            )}
            {description && (
              <div className={cn(
                'mt-1 text-xs leading-relaxed text-slate-500',
                isRail && 'max-w-[30ch] text-[12px] leading-6 text-slate-500',
              )}>
                {description}
              </div>
            )}
            {badges && badges.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {badges.map((badge, index) => (
                  <div
                    key={index}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                      badgeToneClassNames[badge.tone || 'default'],
                    )}
                  >
                    {badge.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {actions}
            {collapsible && (
              <button
                type="button"
                onClick={() => setCollapsed(prev => !prev)}
                className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-400 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-700"
                aria-expanded={!collapsed}
              >
                <ChevronDown className={cn('h-4 w-4 transition-transform', collapsed && '-rotate-90')} />
              </button>
            )}
          </div>
        </header>
      )}

      {!collapsed && (hasHeader || isPanel || isRail ? body : children)}
    </aside>
  );
}
