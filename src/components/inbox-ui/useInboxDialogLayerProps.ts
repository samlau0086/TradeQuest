import { useMemo } from 'react';
import type React from 'react';
import type { ContactMethod, EmailMessage, LiveChatSession } from '../../store';
import type { InboxDialogLayerProps } from './InboxDialogLayer';
import type { UnifiedCommunicationConversation } from './inboxModel';

type InboxMailFilter = 'inbox' | 'sent' | 'scheduled' | 'drafts';

interface UseInboxDialogLayerPropsOptions {
  selection: {
    isCreatingLead: boolean;
    isAddingContactToClient: boolean;
    filter: InboxMailFilter;
    selectedEmail?: EmailMessage;
    selectedTelegramConversation: UnifiedCommunicationConversation | null;
    selectedLiveChatConversation: UnifiedCommunicationConversation | null;
    activeUnifiedConversation?: UnifiedCommunicationConversation | null;
  };
  linking: {
    activeTelegramDisplayName: string;
    activeLiveChatDisplayName: string;
    activeTelegramContactMethod?: ContactMethod | null;
    activeLiveChatContactMethod?: ContactMethod | null;
    activeLinkableContactMethod?: ContactMethod | null;
    activeLinkableDisplayName: string;
  };
  dialogs: {
    confirmDialog: { message: string; onConfirm: () => void } | null;
    alertDialog: string | null;
    showCommentAttachmentModal: boolean;
    tagModalEmail: string | null;
    tagInput: string;
    todoModalEmail: string | null;
    todoAt: string;
    todoNote: string;
  };
  actions: {
    setIsCreatingLead: React.Dispatch<React.SetStateAction<boolean>>;
    setIsAddingContactToClient: React.Dispatch<React.SetStateAction<boolean>>;
    patchUnifiedConversation: (
      conversation: UnifiedCommunicationConversation,
      updates: Record<string, any>
    ) => Promise<UnifiedCommunicationConversation>;
    setSelectedTelegramConversation: React.Dispatch<React.SetStateAction<UnifiedCommunicationConversation | null>>;
    setSelectedLiveChatConversation: React.Dispatch<React.SetStateAction<UnifiedCommunicationConversation | null>>;
    updateLiveChatSession: (sessionId: string, updates: Partial<LiveChatSession>) => Promise<any> | void;
    fetchLiveChatSessions: () => Promise<any> | void;
    refreshUnifiedConversationData: () => Promise<any> | void;
    editEmail: (id: string, updates: Partial<EmailMessage>) => void;
    selectClient: (clientId: string) => void;
    setConfirmDialog: React.Dispatch<React.SetStateAction<{ message: string; onConfirm: () => void } | null>>;
    setAlertDialog: React.Dispatch<React.SetStateAction<string | null>>;
    setShowCommentAttachmentModal: React.Dispatch<React.SetStateAction<boolean>>;
    setCommentAttachments: React.Dispatch<React.SetStateAction<File[]>>;
    setTagInput: React.Dispatch<React.SetStateAction<string>>;
    submitTag: () => void | Promise<void>;
    setTagModalEmail: React.Dispatch<React.SetStateAction<string | null>>;
    setTodoAt: React.Dispatch<React.SetStateAction<string>>;
    setTodoNote: React.Dispatch<React.SetStateAction<string>>;
    submitTodo: () => void | Promise<void>;
    setTodoModalEmail: React.Dispatch<React.SetStateAction<string | null>>;
  };
}

export function useInboxDialogLayerProps({
  selection,
  linking,
  dialogs,
  actions,
}: UseInboxDialogLayerPropsOptions): InboxDialogLayerProps {
  return useMemo(() => ({
    isCreatingLead: selection.isCreatingLead,
    isAddingContactToClient: selection.isAddingContactToClient,
    filter: selection.filter,
    selectedEmail: selection.selectedEmail,
    selectedTelegramConversation: selection.selectedTelegramConversation,
    selectedLiveChatConversation: selection.selectedLiveChatConversation,
    activeTelegramDisplayName: linking.activeTelegramDisplayName,
    activeLiveChatDisplayName: linking.activeLiveChatDisplayName,
    activeTelegramContactMethod: linking.activeTelegramContactMethod,
    activeLiveChatContactMethod: linking.activeLiveChatContactMethod,
    activeLinkableContactMethod: linking.activeLinkableContactMethod,
    activeLinkableDisplayName: linking.activeLinkableDisplayName,
    activeUnifiedConversation: selection.activeUnifiedConversation,
    onCloseCreateLead: () => actions.setIsCreatingLead(false),
    onCloseAddToExistingClient: () => actions.setIsAddingContactToClient(false),
    patchUnifiedConversation: actions.patchUnifiedConversation,
    setSelectedTelegramConversation: actions.setSelectedTelegramConversation,
    setSelectedLiveChatConversation: actions.setSelectedLiveChatConversation,
    updateLiveChatSession: actions.updateLiveChatSession,
    fetchLiveChatSessions: actions.fetchLiveChatSessions,
    refreshUnifiedConversationData: actions.refreshUnifiedConversationData,
    editEmail: actions.editEmail,
    selectClient: actions.selectClient,
    confirmDialog: dialogs.confirmDialog,
    alertDialog: dialogs.alertDialog,
    showCommentAttachmentModal: dialogs.showCommentAttachmentModal,
    tagModalEmail: dialogs.tagModalEmail,
    tagInput: dialogs.tagInput,
    todoModalEmail: dialogs.todoModalEmail,
    todoAt: dialogs.todoAt,
    todoNote: dialogs.todoNote,
    onCloseConfirm: () => actions.setConfirmDialog(null),
    onCloseAlert: () => actions.setAlertDialog(null),
    onCloseAttachment: () => actions.setShowCommentAttachmentModal(false),
    onUploadAttachments: (files) => {
      actions.setCommentAttachments(prev => [...prev, ...files]);
      actions.setShowCommentAttachmentModal(false);
    },
    onTagInputChange: actions.setTagInput,
    onSubmitTag: actions.submitTag,
    onCloseTag: () => actions.setTagModalEmail(null),
    onTodoAtChange: actions.setTodoAt,
    onTodoNoteChange: actions.setTodoNote,
    onSubmitTodo: actions.submitTodo,
    onCloseTodo: () => actions.setTodoModalEmail(null),
  }), [actions, dialogs, linking, selection]);
}
