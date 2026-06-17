import type { InboxPageShellAssemblyInputs, UseInboxPageShellInputsOptions } from './useInboxPageShellInputTypes';

export function buildInboxDialogLayerInputs(
  options: UseInboxPageShellInputsOptions,
): InboxPageShellAssemblyInputs['dialogLayer'] {
  return {
    selection: {
      isCreatingLead: options.isCreatingLead,
      isAddingContactToClient: options.isAddingContactToClient,
      filter: options.filter,
      selectedEmail: options.selectedEmailState.selectedEmail,
      selectedTelegramConversation: options.selectedTelegramConversation,
      selectedLiveChatConversation: options.selectedLiveChatConversation,
      activeUnifiedConversation: options.activeConversationState.activeUnifiedConversation,
    },
    linking: {
      activeTelegramDisplayName: options.activeConversationState.activeTelegramDisplayName,
      activeLiveChatDisplayName: options.activeConversationState.activeLiveChatDisplayName,
      activeTelegramContactMethod: options.activeConversationState.activeTelegramContactMethod,
      activeLiveChatContactMethod: options.activeConversationState.activeLiveChatContactMethod,
      activeLinkableContactMethod: options.activeConversationState.activeLinkableContactMethod,
      activeLinkableDisplayName: options.activeConversationState.activeLinkableDisplayName,
    },
    dialogs: {
      confirmDialog: options.confirmDialog,
      alertDialog: options.alertDialog,
      showCommentAttachmentModal: options.showCommentAttachmentModal,
      tagModalEmail: options.tagModalEmail,
      tagInput: options.tagInput,
      todoModalEmail: options.todoModalEmail,
      todoAt: options.todoAt,
      todoNote: options.todoNote,
    },
    actions: {
      setIsCreatingLead: options.setIsCreatingLead,
      setIsAddingContactToClient: options.setIsAddingContactToClient,
      patchUnifiedConversation: options.patchUnifiedConversation,
      setSelectedTelegramConversation: options.setSelectedTelegramConversation,
      setSelectedLiveChatConversation: options.setSelectedLiveChatConversation,
      updateLiveChatSession: options.updateLiveChatSession,
      fetchLiveChatSessions: options.fetchLiveChatSessions,
      refreshUnifiedConversationData: options.refreshUnifiedConversationData,
      editEmail: options.editEmail,
      selectClient: options.selectClient,
      setConfirmDialog: options.setConfirmDialog,
      setAlertDialog: options.setAlertDialog,
      setShowCommentAttachmentModal: options.setShowCommentAttachmentModal,
      setCommentAttachments: options.setCommentAttachments,
      setTagInput: options.setTagInput,
      submitTag: options.submitTag,
      setTagModalEmail: options.setTagModalEmail,
      setTodoAt: options.setTodoAt,
      setTodoNote: options.setTodoNote,
      submitTodo: options.submitTodo,
      setTodoModalEmail: options.setTodoModalEmail,
    },
  };
}
