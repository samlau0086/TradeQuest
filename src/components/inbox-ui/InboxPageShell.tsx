import { Edit3, Mail, MessageCircle, RefreshCw } from 'lucide-react';
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
  const selectedCount = sidebarProps.selectedCount;
  const followUpCount = sidebarProps.visibleFollowUpCount;
  const conversationCount = sidebarProps.unifiedConversationList.length;
  const selectedLabel = sidebarProps.language === 'zh' ? '已选' : 'selected';
  const conversationLabel = sidebarProps.language === 'zh' ? '会话' : 'conversations';
  const followUpLabel = sidebarProps.language === 'zh' ? '待跟进' : 'follow-ups';

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#f6f8fb] text-slate-950">
      <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              <Mail className="h-4 w-4 text-[#ff7a59]" />
              Unified Inbox
            </div>
            <h1 className="truncate text-2xl font-bold tracking-tight text-slate-950">
              {sidebarProps.language === 'zh' ? '统一收件箱' : 'Inbox workspace'}
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              {sidebarProps.language === 'zh'
                ? '集中处理 Email、WhatsApp、Live Chat 和 Telegram，并把每次沟通沉淀到客户上下文。'
                : 'Handle Email, WhatsApp, Live Chat, and Telegram from one customer conversation workspace.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
              {conversationCount} {conversationLabel}
            </span>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
              {followUpCount} {followUpLabel}
            </span>
            {selectedCount > 0 && (
              <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                {selectedCount} {selectedLabel}
              </span>
            )}
            <button
              type="button"
              onClick={sidebarProps.onSync}
              disabled={sidebarProps.isSyncing}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw className={sidebarProps.isSyncing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
              {sidebarProps.language === 'zh' ? '同步' : 'Sync'}
            </button>
            <button
              type="button"
              onClick={sidebarProps.onComposeEmail}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-[#ff7a59] px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#f25f3a]"
            >
              <Edit3 className="h-4 w-4" />
              {sidebarProps.language === 'zh' ? '写邮件' : 'Compose'}
            </button>
            <button
              type="button"
              onClick={sidebarProps.onStartWhatsApp}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </button>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 p-4">
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
