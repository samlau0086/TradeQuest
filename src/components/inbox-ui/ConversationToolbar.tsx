import React from 'react';
import { cn } from '../../lib/utils';

export type ToolbarTone =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'violet'
  | 'sky';

const buttonToneClasses: Record<ToolbarTone, string> = {
  default: 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900',
  primary: 'border-[#ff7a59]/20 bg-[#fff4f1] text-[#d54e2d] hover:bg-[#ffe7e0]',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  warning: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
  danger: 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100',
  info: 'border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100',
  violet: 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100',
  sky: 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100',
};

const pillToneClasses: Record<ToolbarTone, string> = {
  default: 'border-slate-200 bg-slate-50 text-slate-600',
  primary: 'border-[#ffcfbf] bg-[#fff4f1] text-[#d54e2d]',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  danger: 'border-rose-200 bg-rose-50 text-rose-700',
  info: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  violet: 'border-violet-200 bg-violet-50 text-violet-700',
  sky: 'border-sky-200 bg-sky-50 text-sky-700',
};

interface ConversationToolbarGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function ConversationToolbarGroup({ children, className }: ConversationToolbarGroupProps) {
  return <div className={cn('flex flex-wrap items-center gap-2', className)}>{children}</div>;
}

interface ConversationToolbarButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ToolbarTone;
  compact?: boolean;
  children: React.ReactNode;
}

export function ConversationToolbarButton({
  tone = 'default',
  compact = false,
  className,
  children,
  ...props
}: ConversationToolbarButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center gap-2 rounded-xl border font-semibold transition disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-70',
        compact ? 'px-2.5 py-1.5 text-[11px]' : 'px-3 py-2 text-xs',
        buttonToneClasses[tone],
        className,
      )}
    >
      {children}
    </button>
  );
}

interface ConversationToolbarPillProps {
  tone?: ToolbarTone;
  className?: string;
  children: React.ReactNode;
}

export function ConversationToolbarPill({
  tone = 'default',
  className,
  children,
}: ConversationToolbarPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
        pillToneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

interface ConversationToolbarFieldProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export function ConversationToolbarField({
  label,
  children,
  className,
}: ConversationToolbarFieldProps) {
  return (
    <div className={cn('min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2', className)}>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </div>
      {children}
    </div>
  );
}
