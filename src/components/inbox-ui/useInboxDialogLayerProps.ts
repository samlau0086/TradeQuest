import type React from 'react';
import type { ContactMethod, EmailMessage, LiveChatSession } from '../../store';
import type { InboxDialogLayerProps } from './InboxDialogLayer';
import type { UnifiedCommunicationConversation } from './inboxModel';

type InboxMailFilter = 'inbox' | 'sent' | 'scheduled' | 'drafts';

interface UseInboxDialogLayerPropsOptions {
  isCreatingLead: boolean;
  isAddingContactToClient: boolean;
  filter: InboxMailFilter;
  selectedEmail?: EmailMessage;
  selectedTelegramConversation: UnifiedCommunicationConversation | null;
  selectedLiveChatConversation: UnifiedCommunicationConversation | null;
  activeTelegramDisplayName: string;
  activeLiveChatDisplayName: string;
  activeTelegramContactMethod?: ContactMethod | null;
  activeLiveChatContactMethod?: ContactMethod | null;
  activeLinkableContactMethod?: ContactMethod | null;
  activeLinkableDisplayName: string;
  activeUnifiedConversation?: UnifiedCommunicationConversation | null;
  confirmDialog: { message: string; onConfirm: () => void } | null;
  alertDialog: string | null;
  showCommentAttachmentModal: boolean;
  tagModalEmail: string | null;
  tagInput: string;
  todoModalEmail: string | null;
  todoAt: string;
  todoNote: string;
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
}

export function useInboxDialogLayerProps({
  isCreatingLead,
  isAddingContactToClient,
  filter,
  selectedEmail,
  selectedTelegramConversation,
  selectedLiveChatConversation,
  activeTelegramDisplayName,
  activeLiveChatDisplayName,
  activeTelegramContactMethod,
  activeLiveChatContactMethod,
  activeLinkableContactMethod,
  activeLinkableDisplayName,
  activeUnifiedConversation,
  confirmDialog,
  alertDialog,
  showCommentAttachmentModal,
  tagModalEmail,
  tagInput,
  todoModalEmail,
  todoAt,
  todoNote,
  setIsCreatingLead,
  setIsAddingContactToClient,
  patchUnifiedConversation,
  setSelectedTelegramConversation,
  setSelectedLiveChatConversation,
  updateLiveChatSession,
  fetchLiveChatSessions,
  refreshUnifiedConversationData,
  editEmail,
  selectClient,
  setConfirmDialog,
  setAlertDialog,
  setShowCommentAttachmentModal,
  setCommentAttachments,
  setTagInput,
  submitTag,
  setTagModalEmail,
  setTodoAt,
  setTodoNote,
  submitTodo,
  setTodoModalEmail,
}: UseInboxDialogLayerPropsOptions): InboxDialogLayerProps {
  return {
    isCreatingLead,
    isAddingContactToClient,
    filter,
    selectedEmail,
    selectedTelegramConversation,
    selectedLiveChatConversation,
    activeTelegramDisplayName,
    activeLiveChatDisplayName,
    activeTelegramContactMethod,
    activeLiveChatContactMethod,
    activeLinkableContactMethod,
    activeLinkableDisplayName,
    activeUnifiedConversation,
    onCloseCreateLead: () => setIsCreatingLead(false),
    onCloseAddToExistingClient: () => setIsAddingContactToClient(false),
    patchUnifiedConversation,
    setSelectedTelegramConversation,
    setSelectedLiveChatConversation,
    updateLiveChatSession,
    fetchLiveChatSessions,
    refreshUnifiedConversationData,
    editEmail,
    selectClient,
    confirmDialog,
    alertDialog,
    showCommentAttachmentModal,
    tagModalEmail,
    tagInput,
    todoModalEmail,
    todoAt,
    todoNote,
    onCloseConfirm: () => setConfirmDialog(null),
    onCloseAlert: () => setAlertDialog(null),
    onCloseAttachment: () => setShowCommentAttachmentModal(false),
    onUploadAttachments: (files) => {
      setCommentAttachments(prev => [...prev, ...files]);
      setShowCommentAttachmentModal(false);
    },
    onTagInputChange: setTagInput,
    onSubmitTag: submitTag,
    onCloseTag: () => setTagModalEmail(null),
    onTodoAtChange: setTodoAt,
    onTodoNoteChange: setTodoNote,
    onSubmitTodo: submitTodo,
    onCloseTodo: () => setTodoModalEmail(null),
  };
}
