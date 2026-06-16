import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  title?: string;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  options: SegmentedControlOption<T>[];
  onChange: (value: T) => void;
  className?: string;
  size?: 'icon' | 'md';
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className,
  size = 'md',
}: SegmentedControlProps<T>) {
  return (
    <div className={cn('inline-flex rounded-lg border border-slate-800 bg-slate-950 p-1', className)}>
      {options.map(option => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            title={option.title}
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-md font-bold transition-colors',
              size === 'icon' ? 'p-1.5' : 'px-4 py-2 text-sm',
              isActive
                ? 'bg-slate-800 text-cyan-400 shadow-sm'
                : 'text-slate-500 hover:bg-slate-800/60 hover:text-slate-100'
            )}
          >
            {option.icon}
            {size !== 'icon' && option.label}
          </button>
        );
      })}
    </div>
  );
}
