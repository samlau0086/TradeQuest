import { useMemo } from 'react';
import type { InboxConversationSidebarProps } from './InboxConversationSidebarTypes';

interface UseInboxSidebarPropsOptions {
  workspace: Pick<
    InboxConversationSidebarProps,
    | 'language'
    | 'filter'
    | 'channelFilter'
    | 'search'
    | 'searchTags'
    | 'followUpOnly'
    | 'queueSortMode'
    | 'queueOwnerFilter'
    | 'queueDensity'
    | 'savedViews'
    | 'activeSavedViewId'
    | 'currentQueueViewDirty'
    | 'visibleFollowUpCount'
    | 'unifiedConversationList'
    | 'selectableVisibleCount'
    | 'totalVisibleCount'
    | 'isUnifiedConversationLoading'
    | 'isSyncing'
    | 'isWhatsAppBackgroundSyncing'
    | 'syncError'
    | 'lastSyncAt'
    | 'emails'
    | 'clients'
    | 'currentUser'
  >;
  selection: Pick<
    InboxConversationSidebarProps,
    | 'selectedEmailId'
    | 'selectedWhatsAppPhone'
    | 'selectedTelegramConversation'
    | 'selectedLiveChatConversation'
    | 'selectedConversationIds'
    | 'selectedCount'
    | 'allVisibleSelected'
    | 'someVisibleSelected'
  >;
  bulk: Pick<
    InboxConversationSidebarProps,
    | 'bulkTagInput'
    | 'bulkNoteInput'
    | 'bulkOwnerId'
    | 'bulkStage'
    | 'bulkFollowUpAt'
  >;
  actions: Omit<
    Pick<
      InboxConversationSidebarProps,
      | 'onFilterChange'
      | 'onChannelFilterChange'
      | 'onSearchChange'
      | 'onSearchTagsChange'
      | 'onToggleFollowUpOnly'
      | 'onClearFollowUpOnly'
      | 'onQueueSortModeChange'
      | 'onQueueOwnerFilterChange'
      | 'onQueueDensityChange'
      | 'onApplySavedView'
      | 'onSaveSavedView'
      | 'onDeleteSavedView'
      | 'onSetDefaultSavedView'
      | 'onResetQueueView'
      | 'onComposeEmail'
      | 'onStartWhatsApp'
      | 'onToggleSelectAll'
      | 'onClearSelection'
      | 'onBulkTagInputChange'
      | 'onBulkNoteInputChange'
      | 'onBulkOwnerIdChange'
      | 'onBulkStageChange'
      | 'onBulkFollowUpAtChange'
      | 'onAddTag'
      | 'onAddComment'
      | 'onAssignOwner'
      | 'onSetStage'
      | 'onSetFollowUp'
      | 'onMarkImportant'
      | 'onDeleteSelected'
      | 'onSelectConversation'
      | 'onToggleConversationSelection'
      | 'onDeleteWhatsAppConversation'
      | 'onOwnerStageChange'
    >,
    never
  > & {
    onSync: () => void | Promise<void>;
  };
}

export function useInboxSidebarProps({
  workspace,
  selection,
  bulk,
  actions,
}: UseInboxSidebarPropsOptions): InboxConversationSidebarProps {
  return useMemo(() => ({
    ...workspace,
    ...selection,
    ...bulk,
    ...actions,
    tagSuggestions: Array.from(new Set(workspace.emails.flatMap(email => email.tags || []))),
    onSync: () => {
      void actions.onSync();
    },
  }), [actions, bulk, selection, workspace]);
}
