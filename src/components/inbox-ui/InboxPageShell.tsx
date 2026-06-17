import { InboxContentPanel } from './InboxContentPanel';
import { InboxConversationSidebar } from './InboxConversationSidebar';
import { InboxDialogLayer } from './InboxDialogLayer';
import { InboxWorkspaceHeader } from './InboxWorkspaceHeader';
import { InboxWorkspaceLayout } from './InboxWorkspaceLayout';
import type { InboxContentPanelProps } from './InboxContentPanelTypes';
import type { InboxConversationSidebarProps } from './InboxConversationSidebarTypes';
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
  const selectedCount = sidebarProps.selectedCount;
  const followUpCount = sidebarProps.visibleFollowUpCount;
  const conversationCount = sidebarProps.unifiedConversationList.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] text-slate-950">
      <header className="shrink-0 border-b border-slate-200/80 bg-white/90 px-5 py-6 shadow-sm backdrop-blur">
        <InboxWorkspaceHeader
          language={sidebarProps.language}
          conversationCount={conversationCount}
          followUpCount={followUpCount}
          selectedCount={selectedCount}
          isSyncing={sidebarProps.isSyncing}
          onSync={sidebarProps.onSync}
          onComposeEmail={sidebarProps.onComposeEmail}
          onStartWhatsApp={sidebarProps.onStartWhatsApp}
        />
      </header>

      <div className="min-h-0 flex-1 px-4 pb-4 pt-5">
        <InboxWorkspaceLayout
          sidebarHidden={sidebarHidden}
          contentHidden={contentHidden}
          sidebar={<InboxConversationSidebar {...sidebarProps} />}
          content={<InboxContentPanel {...contentPanelProps} />}
        >
          <InboxDialogLayer {...dialogLayerProps} />
        </InboxWorkspaceLayout>
      </div>
    </div>
  );
}
