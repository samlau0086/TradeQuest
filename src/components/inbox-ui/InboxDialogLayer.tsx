import type React from 'react';
import type { ContactMethod, EmailMessage, LiveChatSession } from '../../store';
import { InboxAuxiliaryDialogs } from './InboxAuxiliaryDialogs';
import { InboxContactLinkingModals } from './InboxContactLinkingModals';
import type { UnifiedCommunicationConversation } from './inboxModel';

interface InboxDialogLayerProps {
  isCreatingLead: boolean;
  isAddingContactToClient: boolean;
  filter: 'inbox' | 'sent' | 'scheduled' | 'drafts';
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
  onCloseCreateLead: () => void;
  onCloseAddToExistingClient: () => void;
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
  onCloseConfirm: () => void;
  onCloseAlert: () => void;
  onCloseAttachment: () => void;
  onUploadAttachments: (files: File[]) => void;
  onTagInputChange: (value: string) => void;
  onSubmitTag: () => void | Promise<void>;
  onCloseTag: () => void;
  onTodoAtChange: (value: string) => void;
  onTodoNoteChange: (value: string) => void;
  onSubmitTodo: () => void | Promise<void>;
  onCloseTodo: () => void;
}

export function InboxDialogLayer({
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
  onCloseCreateLead,
  onCloseAddToExistingClient,
  patchUnifiedConversation,
  setSelectedTelegramConversation,
  setSelectedLiveChatConversation,
  updateLiveChatSession,
  fetchLiveChatSessions,
  refreshUnifiedConversationData,
  editEmail,
  selectClient,
  onCloseConfirm,
  onCloseAlert,
  onCloseAttachment,
  onUploadAttachments,
  onTagInputChange,
  onSubmitTag,
  onCloseTag,
  onTodoAtChange,
  onTodoNoteChange,
  onSubmitTodo,
  onCloseTodo,
}: InboxDialogLayerProps) {
  return (
    <>
      <InboxContactLinkingModals
        isCreatingLead={isCreatingLead}
        isAddingContactToClient={isAddingContactToClient}
        filter={filter}
        selectedEmail={selectedEmail}
        selectedTelegramConversation={selectedTelegramConversation}
        selectedLiveChatConversation={selectedLiveChatConversation}
        activeTelegramDisplayName={activeTelegramDisplayName}
        activeLiveChatDisplayName={activeLiveChatDisplayName}
        activeTelegramContactMethod={activeTelegramContactMethod}
        activeLiveChatContactMethod={activeLiveChatContactMethod}
        activeLinkableContactMethod={activeLinkableContactMethod}
        activeLinkableDisplayName={activeLinkableDisplayName}
        activeUnifiedConversation={activeUnifiedConversation}
        onCloseCreateLead={onCloseCreateLead}
        onCloseAddToExistingClient={onCloseAddToExistingClient}
        patchUnifiedConversation={patchUnifiedConversation}
        setSelectedTelegramConversation={setSelectedTelegramConversation}
        setSelectedLiveChatConversation={setSelectedLiveChatConversation}
        updateLiveChatSession={updateLiveChatSession}
        fetchLiveChatSessions={fetchLiveChatSessions}
        refreshUnifiedConversationData={refreshUnifiedConversationData}
        editEmail={editEmail}
        selectClient={selectClient}
      />

      <InboxAuxiliaryDialogs
        confirmDialog={confirmDialog}
        alertDialog={alertDialog}
        showCommentAttachmentModal={showCommentAttachmentModal}
        tagModalEmail={tagModalEmail}
        tagInput={tagInput}
        todoModalEmail={todoModalEmail}
        todoAt={todoAt}
        todoNote={todoNote}
        onCloseConfirm={onCloseConfirm}
        onCloseAlert={onCloseAlert}
        onCloseAttachment={onCloseAttachment}
        onUploadAttachments={onUploadAttachments}
        onTagInputChange={onTagInputChange}
        onSubmitTag={onSubmitTag}
        onCloseTag={onCloseTag}
        onTodoAtChange={onTodoAtChange}
        onTodoNoteChange={onTodoNoteChange}
        onSubmitTodo={onSubmitTodo}
        onCloseTodo={onCloseTodo}
      />
    </>
  );
}
