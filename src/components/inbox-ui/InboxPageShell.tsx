import { InboxContentPanel } from './InboxContentPanel';
import { InboxConversationSidebar } from './InboxConversationSidebar';
import { InboxDialogLayer } from './InboxDialogLayer';
import { InboxWorkspaceLayout } from './InboxWorkspaceLayout';
import type { InboxContentPanelProps } from './InboxContentPanelTypes';
import type { InboxConversationSidebarProps } from './InboxConversationSidebar';
import type { InboxDialogLayerProps } from './InboxDialogLayer';

interface InboxPageShellProps {
  sidebarHidden: boolean;
  contentHidden: boolean;
  sidebarProps: InboxConversationSidebarProps;
  contentPanelProps: InboxContentPanelProps;
  dialogLayerProps: InboxDialogLayerProps;
}

export function InboxPageShell({
  sidebarHidden,
  contentHidden,
  sidebarProps,
  contentPanelProps,
  dialogLayerProps,
}: InboxPageShellProps) {
  return (
    <InboxWorkspaceLayout
      sidebarHidden={sidebarHidden}
      contentHidden={contentHidden}
      sidebar={<InboxConversationSidebar {...sidebarProps} />}
      content={<InboxContentPanel {...contentPanelProps} />}
    >
      <InboxDialogLayer {...dialogLayerProps} />
    </InboxWorkspaceLayout>
  );
}
