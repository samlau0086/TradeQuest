import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface ModalDialogProps {
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  titleClassName?: string;
  className?: string;
}

export function ModalDialog({
  title,
  children,
  footer,
  titleClassName,
  className,
}: ModalDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className={cn('w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-xl', className)}>
        <h3 className={cn('mb-2 text-lg font-bold text-white', titleClassName)}>{title}</h3>
        {children}
        {footer && <div className="mt-6 flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}
