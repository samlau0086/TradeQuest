import type { InputHTMLAttributes } from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  wrapperClassName?: string;
  tone?: 'cyan' | 'indigo';
}

const focusClasses: Record<NonNullable<SearchInputProps['tone']>, string> = {
  cyan: 'focus-within:border-cyan-500 focus-within:ring-cyan-500',
  indigo: 'focus-within:border-indigo-500 focus-within:ring-indigo-500',
};

export function SearchInput({
  wrapperClassName,
  className,
  tone = 'cyan',
  ...props
}: SearchInputProps) {
  return (
    <div
      className={cn(
        'relative flex-1 rounded-lg border border-slate-700 bg-slate-950 transition-colors focus-within:ring-1 sm:w-64',
        focusClasses[tone],
        wrapperClassName
      )}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        className={cn('w-full bg-transparent py-2 pl-9 pr-4 text-sm text-slate-200 outline-none', className)}
        {...props}
      />
    </div>
  );
}
