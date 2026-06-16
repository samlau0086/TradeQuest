import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface ConversationContextRailProps {
  children: ReactNode;
  className?: string;
}

export function ConversationContextRail({ children, className }: ConversationContextRailProps) {
  return (
    <aside
      className={cn('space-y-4', className)}
      data-conversation-context-rail="true"
    >
      {children}
    </aside>
  );
}
