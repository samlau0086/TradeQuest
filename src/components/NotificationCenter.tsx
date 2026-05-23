import React from 'react';
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from 'lucide-react';
import { useStore, NotificationTone } from '../store';
import { cn } from '../lib/utils';
import { translateLiteral } from '../lib/i18n';

const toneStyles: Record<NotificationTone, { icon: React.ElementType; className: string; iconClassName: string }> = {
  success: {
    icon: CheckCircle2,
    className: 'border-emerald-500/30 bg-emerald-950/80 text-emerald-50',
    iconClassName: 'text-emerald-400'
  },
  error: {
    icon: AlertCircle,
    className: 'border-rose-500/30 bg-rose-950/80 text-rose-50',
    iconClassName: 'text-rose-400'
  },
  warning: {
    icon: AlertTriangle,
    className: 'border-amber-500/30 bg-amber-950/80 text-amber-50',
    iconClassName: 'text-amber-400'
  },
  info: {
    icon: Info,
    className: 'border-cyan-500/30 bg-slate-900/90 text-slate-100',
    iconClassName: 'text-cyan-400'
  }
};

export function NotificationCenter() {
  const { notifications, removeNotification, language } = useStore();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed right-5 top-20 z-[10000] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-3">
      {notifications.map(notification => {
        const tone = toneStyles[notification.tone];
        const Icon = tone.icon;
        return (
          <div
            key={notification.id}
            className={cn(
              'flex items-start gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-md animate-in slide-in-from-right-4 fade-in duration-200',
              tone.className
            )}
          >
            <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', tone.iconClassName)} />
            <div className="min-w-0 flex-1 text-sm leading-5">
              {translateLiteral(notification.message, language)}
            </div>
            <button
              type="button"
              onClick={() => removeNotification(notification.id)}
              className="rounded-md p-1 text-current opacity-60 transition hover:bg-white/10 hover:opacity-100"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
