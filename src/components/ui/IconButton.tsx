import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

type IconButtonTone = 'default' | 'danger';
type IconButtonSize = 'sm' | 'md';

const toneClasses: Record<IconButtonTone, string> = {
  default: 'border-slate-800 bg-slate-950/80 text-slate-400 hover:border-slate-600 hover:text-white',
  danger: 'border-transparent bg-transparent text-slate-500 hover:bg-rose-500/10 hover:text-rose-400',
};

const sizeClasses: Record<IconButtonSize, string> = {
  sm: 'p-2',
  md: 'p-2.5',
};

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  tone?: IconButtonTone;
  size?: IconButtonSize;
}

export function IconButton({
  icon,
  label,
  tone = 'default',
  size = 'sm',
  className,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center rounded-lg border transition-colors',
        toneClasses[tone],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {icon}
    </button>
  );
}
