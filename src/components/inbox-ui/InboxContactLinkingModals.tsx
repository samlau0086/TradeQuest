import React from 'react';
import type { ContactMethod, EmailMessage, LiveChatSession } from '../../store';
import { AddContactToClientModal } from '../AddContactToClientModal';
import { ClientFormModal } from '../ClientFormModal';
import type { UnifiedCommunicationConversation } from './inboxModel';

interface InboxContactLinkingModalsProps {
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
}

async function linkTelegramConversation(conversation: UnifiedCommunicationConversation, clientId: string) {
  const res = await fetch(`/api/telegram/conversations/${encodeURIComponent(conversation.source_id)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({ clientId })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to link Telegram conversation');
  }
}

export function InboxContactLinkingModals({
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
}: InboxContactLinkingModalsProps) {
  const hasSource = !!(selectedEmail || selectedLiveChatConversation || selectedTelegramConversation);

  const linkCurrentConversationToClient = async (clientId: string) => {
    if (activeUnifiedConversation && !activeUnifiedConversation.metadata?.localFallback) {
      await patchUnifiedConversation(activeUnifiedConversation, { clientId });
    }
    if (selectedTelegramConversation) {
      await linkTelegramConversation(selectedTelegramConversation, clientId);
      setSelectedTelegramConversation(prev => prev ? { ...prev, client_id: clientId } : prev);
      await refreshUnifiedConversationData();
    } else if (selectedLiveChatConversation) {
      await updateLiveChatSession(selectedLiveChatConversation.source_id, { clientId } as Partial<LiveChatSession>);
      setSelectedLiveChatConversation(prev => prev ? { ...prev, client_id: clientId } : prev);
      await fetchLiveChatSessions();
      await refreshUnifiedConversationData();
    } else if (selectedEmail) {
      editEmail(selectedEmail.id, { clientId });
    }
    selectClient(clientId);
  };

  return (
    <>
      {isCreatingLead && hasSource && (
        <ClientFormModal
          onClose={onCloseCreateLead}
          initialData={{
            name: selectedEmail
              ? (filter === 'inbox' ? (selectedEmail.senderName || selectedEmail.sender.split('@')[0]) : selectedEmail.recipient.split('@')[0])
              : selectedTelegramConversation
                ? activeTelegramDisplayName
                : activeLiveChatDisplayName,
            company: 'Unknown',
            country: 'Unknown',
            status: 'Leads',
            tags: selectedLiveChatConversation ? ['live-chat'] : selectedTelegramConversation ? ['telegram'] : [],
            sourceType: selectedLiveChatConversation ? 'live_chat' : selectedTelegramConversation ? 'telegram' : 'email',
            sourceId: selectedLiveChatConversation?.source_id || selectedTelegramConversation?.source_id || selectedEmail?.id,
            sourceLabel: selectedLiveChatConversation ? `Live Chat: ${activeLiveChatDisplayName}` : selectedTelegramConversation ? `Telegram: ${activeTelegramDisplayName}` : selectedEmail?.subject,
            contactMethods: selectedEmail
              ? [{ type: 'email', value: filter === 'inbox' ? selectedEmail.sender : selectedEmail.recipient }]
              : selectedTelegramConversation
                ? (activeTelegramContactMethod ? [activeTelegramContactMethod] : [])
                : (activeLiveChatContactMethod ? [activeLiveChatContactMethod] : [])
          }}
          onSave={linkCurrentConversationToClient}
        />
      )}

      {isAddingContactToClient && activeLinkableContactMethod && (
        <AddContactToClientModal
          contactMethod={activeLinkableContactMethod}
          displayName={activeLinkableDisplayName}
          onClose={onCloseAddToExistingClient}
          onLinked={linkCurrentConversationToClient}
        />
      )}
    </>
  );
}
