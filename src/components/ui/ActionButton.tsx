import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

type ActionButtonTone = 'primary' | 'secondary' | 'ghost' | 'indigo' | 'danger';
type ActionButtonSize = 'sm' | 'md';

const toneClasses: Record<ActionButtonTone, string> = {
  primary: 'border-cyan-500 bg-cyan-600 text-white shadow shadow-cyan-900/20 hover:bg-cyan-500',
  secondary: 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white',
  ghost: 'border-transparent bg-transparent text-slate-400 hover:text-white',
  indigo: 'border-indigo-500 bg-indigo-600 text-white shadow shadow-indigo-900/20 hover:bg-indigo-500',
  danger: 'border-rose-500 bg-rose-600 text-white shadow shadow-rose-900/20 hover:bg-rose-500',
};

const sizeClasses: Record<ActionButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
};

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  icon?: ReactNode;
  tone?: ActionButtonTone;
  size?: ActionButtonSize;
}

export function ActionButton({
  children,
  icon,
  tone = 'secondary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ActionButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg border font-medium transition-colors disabled:opacity-50',
        toneClasses[tone],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
