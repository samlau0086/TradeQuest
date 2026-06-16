import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface ConversationSplitPaneProps {
  main: ReactNode;
  rail?: ReactNode;
  split?: boolean;
  className?: string;
  mainClassName?: string;
  railClassName?: string;
}

export function ConversationSplitPane({
  main,
  rail,
  split = true,
  className,
  mainClassName,
  railClassName,
}: ConversationSplitPaneProps) {
  return (
    <div
      className={cn(
        split
          ? 'flex-1 min-h-0 bg-[#f3f6fb] lg:grid lg:grid-cols-[minmax(0,1fr)_360px]'
          : 'flex-1 min-h-0 overflow-y-auto bg-[#f3f6fb]',
        className,
      )}
      data-conversation-split-pane="true"
    >
      <section
        className={cn(
          split
            ? 'min-h-0 overflow-y-auto bg-[#f3f6fb] p-5 space-y-4'
            : 'bg-[#f3f6fb] p-4 space-y-3',
          mainClassName,
        )}
      >
        {main}
      </section>
      {rail && (
        <div
          className={cn(
            split
              ? 'min-h-0 overflow-y-auto border-t border-slate-200 bg-white p-4 lg:border-l lg:border-t-0'
              : 'border-t border-slate-200 bg-white p-4',
            railClassName,
          )}
        >
          {rail}
        </div>
      )}
    </div>
  );
}
