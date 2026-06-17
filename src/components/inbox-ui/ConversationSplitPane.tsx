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
          ? 'min-h-0 flex-1 overflow-hidden bg-transparent lg:grid lg:h-full lg:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.55fr)] lg:gap-5 lg:px-5 lg:pb-5'
          : 'min-h-0 flex-1 overflow-y-auto bg-transparent',
        className,
      )}
      data-conversation-split-pane="true"
    >
      <section
        className={cn(
          split
            ? 'min-h-0 h-full overflow-y-auto rounded-[28px] border border-slate-200/80 bg-white/78 p-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] backdrop-blur-sm space-y-4 lg:p-5'
            : 'bg-transparent p-4 space-y-4 lg:px-5 lg:pb-5',
          mainClassName,
        )}
      >
        {main}
      </section>
      {rail && (
        <div
          className={cn(
            split
              ? 'min-h-0 h-full overflow-y-auto px-4 pb-4 lg:px-0 lg:pb-0'
              : 'border-t border-slate-200/70 bg-white/90 p-4',
            railClassName,
          )}
        >
          {rail}
        </div>
      )}
    </div>
  );
}
