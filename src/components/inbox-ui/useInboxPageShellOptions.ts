import { useMemo } from 'react';
import type { UseInboxPageShellInputsOptions } from './useInboxPageShellInputTypes';

export type InboxPageShellWorkspaceOptions = Pick<
  UseInboxPageShellInputsOptions,
  | 'language'
  | 'currentUser'
  | 'clients'
  | 'emails'
  | 'editEmail'
  | 'selectEmail'
  | 'selectClient'
>;

export type InboxPageShellQueueOptions = Pick<
  UseInboxPageShellInputsOptions,
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
  | 'queueConversationList'
  | 'selectableVisibleCount'
  | 'totalVisibleCount'
  | 'isUnifiedConversationLoading'
  | 'isSyncing'
  | 'isWhatsAppBackgroundSyncing'
  | 'syncError'
  | 'lastSyncAt'
  | 'selectedConversationIds'
  | 'selectedCount'
  | 'allVisibleSelected'
  | 'someVisibleSelected'
  | 'bulkTagInput'
  | 'setBulkTagInput'
  | 'bulkNoteInput'
  | 'setBulkNoteInput'
  | 'bulkOwnerId'
  | 'setBulkOwnerId'
  | 'bulkStage'
  | 'setBulkStage'
  | 'bulkFollowUpAt'
  | 'setBulkFollowUpAt'
  | 'applySavedView'
  | 'saveCurrentQueueView'
  | 'deleteSavedQueueView'
  | 'setDefaultSavedQueueView'
  | 'resetQueueView'
  | 'handleFilterChange'
  | 'handleChannelFilterChange'
  | 'handleToggleFollowUpOnly'
  | 'handleClearFollowUpOnly'
  | 'handleBulkAddTag'
  | 'handleBulkAddComment'
  | 'handleBulkAssignOwner'
  | 'handleBulkSetStage'
  | 'handleBulkSetFollowUp'
  | 'handleBulkMarkImportant'
  | 'handleDeleteSelected'
  | 'toggleSelectAll'
  | 'clearBulkSelection'
  | 'setSearch'
  | 'setSearchTags'
  | 'setQueueSortMode'
  | 'setQueueOwnerFilter'
  | 'setQueueDensity'
>;

export type InboxPageShellSelectionOptions = Pick<
  UseInboxPageShellInputsOptions,
  | 'selectedEmailId'
  | 'selectedWhatsAppPhone'
  | 'selectedWhatsAppClientId'
  | 'selectedTelegramConversation'
  | 'selectedLiveChatConversation'
  | 'setSelectedWhatsAppPhone'
  | 'setSelectedWhatsAppClientId'
  | 'setSelectedTelegramConversation'
  | 'setTelegramMessages'
  | 'setSelectedLiveChatConversation'
  | 'handleSelectUnifiedConversation'
  | 'toggleUnifiedSelection'
  | 'updateConversationOwnerStage'
  | 'patchUnifiedConversation'
  | 'deleteUnifiedConversation'
  | 'applyUnifiedConversationUpdate'
  | 'refreshUnifiedConversationData'
>;

export type InboxPageShellComposeOptions = Pick<
  UseInboxPageShellInputsOptions,
  | 'isComposing'
  | 'setIsComposing'
  | 'composeDefaults'
  | 'setComposeDefaults'
  | 'isStartingWhatsApp'
  | 'setIsStartingWhatsApp'
  | 'newWhatsAppPhone'
  | 'visibleWhatsAppContactOptions'
  | 'setNewWhatsAppPhone'
  | 'setShowWhatsAppContactPicker'
  | 'isCreatingLead'
  | 'setIsCreatingLead'
  | 'isAddingContactToClient'
  | 'setIsAddingContactToClient'
  | 'commentText'
  | 'setCommentText'
  | 'commentAttachments'
  | 'setCommentAttachments'
  | 'showCommentAttachmentModal'
  | 'setShowCommentAttachmentModal'
  | 'confirmDialog'
  | 'setConfirmDialog'
  | 'alertDialog'
  | 'setAlertDialog'
  | 'tagModalEmail'
  | 'setTagModalEmail'
  | 'tagInput'
  | 'setTagInput'
  | 'todoModalEmail'
  | 'setTodoModalEmail'
  | 'todoAt'
  | 'setTodoAt'
  | 'todoNote'
  | 'setTodoNote'
>;

export type InboxPageShellChannelWorkspaceOptions = Pick<
  UseInboxPageShellInputsOptions,
  | 'telegramMessages'
  | 'isTelegramMessagesLoading'
  | 'telegramReply'
  | 'isSendingTelegramReply'
  | 'setTelegramReply'
  | 'toggleTelegramHumanTakeover'
  | 'draftTelegramReply'
  | 'sendTelegramReply'
  | 'liveChatReply'
  | 'isSendingLiveChatReply'
  | 'isRunningLiveChatAgent'
  | 'liveChatEndRef'
  | 'setLiveChatReply'
  | 'toggleLiveChatHumanTakeover'
  | 'runSelectedLiveChatAgent'
  | 'sendLiveChatReply'
  | 'handleComposeEmail'
  | 'handleStartWhatsApp'
  | 'handleSync'
  | 'loadWhatsAppConversations'
  | 'handleDeleteWhatsAppConversation'
  | 'selectWhatsAppContactOption'
  | 'startNewWhatsApp'
  | 'handleCreateLead'
  | 'updateLiveChatSession'
  | 'fetchLiveChatSessions'
>;

export type InboxPageShellConversationStateOptions = Pick<
  UseInboxPageShellInputsOptions,
  | 'selectedEmailState'
  | 'activeConversationState'
  | 'commentsState'
  | 'followUpState'
  | 'translationState'
  | 'addingToRag'
  | 'addedToRagId'
  | 'handleAddToRag'
  | 'submitTag'
  | 'submitTodo'
  | 'setConversationAutoTranslateEnabled'
  | 'appendActiveConversationComment'
  | 'updateActiveConversationFollowUp'
  | 'replyActiveConversationComment'
>;

interface UseInboxPageShellOptionsArgs {
  workspace: InboxPageShellWorkspaceOptions;
  queue: InboxPageShellQueueOptions;
  selection: InboxPageShellSelectionOptions;
  compose: InboxPageShellComposeOptions;
  channelWorkspace: InboxPageShellChannelWorkspaceOptions;
  conversationState: InboxPageShellConversationStateOptions;
}

export function useInboxPageShellOptions({
  workspace,
  queue,
  selection,
  compose,
  channelWorkspace,
  conversationState,
}: UseInboxPageShellOptionsArgs): UseInboxPageShellInputsOptions {
  return useMemo(() => ({
    ...workspace,
    ...queue,
    ...selection,
    ...compose,
    ...channelWorkspace,
    ...conversationState,
  }), [
    channelWorkspace,
    compose,
    conversationState,
    queue,
    selection,
    workspace,
  ]);
}
