import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface ConversationWorkspaceShellProps {
  header?: ReactNode;
  summary?: ReactNode;
  followUp?: ReactNode;
  content: ReactNode;
  composer?: ReactNode;
  className?: string;
  contentClassName?: string;
  composerClassName?: string;
}

export function ConversationWorkspaceShell({
  header,
  summary,
  followUp,
  content,
  composer,
  className,
  contentClassName,
  composerClassName,
}: ConversationWorkspaceShellProps) {
  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,#f8fafc_0%,#eef3f8_100%)]',
        className,
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 pb-4 pt-4 lg:px-5 lg:pb-5 lg:pt-5">
          {header}
          {summary}
          {followUp}
          <div className={cn('min-h-0 flex-1 overflow-hidden', contentClassName)}>
            {content}
          </div>
        </div>
      </div>
      {composer && (
        <div
          className={cn(
            'shrink-0 border-t border-slate-200/70 bg-white/96 shadow-[0_-18px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm',
            composerClassName,
          )}
        >
          {composer}
        </div>
      )}
    </div>
  );
}
