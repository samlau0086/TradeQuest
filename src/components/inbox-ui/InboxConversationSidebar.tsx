import type { InboxConversationSidebarProps } from './InboxConversationSidebarTypes';
import { InboxQueueSidebarWorkspace } from './InboxQueueSidebarWorkspace';

export type { InboxConversationSidebarProps } from './InboxConversationSidebarTypes';

export function InboxConversationSidebar(props: InboxConversationSidebarProps) {
  return <InboxQueueSidebarWorkspace {...props} />;
}
