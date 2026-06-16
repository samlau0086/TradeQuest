import type { InputHTMLAttributes, ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface TagSearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  tags?: string[];
  leadingChips?: ReactNode;
  onRemoveTag?: (index: number) => void;
  wrapperClassName?: string;
}

export function TagSearchInput({
  tags = [],
  leadingChips,
  onRemoveTag,
  wrapperClassName,
  className,
  ...props
}: TagSearchInputProps) {
  return (
    <div
      className={cn(
        'flex min-h-[36px] w-full flex-wrap items-center gap-2 rounded border border-slate-800 bg-slate-950 px-2 transition-colors focus-within:border-cyan-500 sm:w-[450px]',
        wrapperClassName
      )}
    >
      {leadingChips}
      {tags.map((tag, index) => (
        <span key={`${tag}-${index}`} className="flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
          {tag}
          {onRemoveTag && (
            <button type="button" onClick={() => onRemoveTag(index)} className="ml-1 hover:text-red-400">
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      ))}
      <input
        type="text"
        className={cn('min-w-[100px] flex-1 bg-transparent py-1.5 text-sm text-slate-200 outline-none', className)}
        {...props}
      />
    </div>
  );
}
