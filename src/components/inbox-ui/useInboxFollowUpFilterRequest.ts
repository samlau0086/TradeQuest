import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { InboxChannelFilter, UnifiedCommunicationConversation } from './inboxModel';

type InboxMailFilter = 'inbox' | 'sent' | 'scheduled' | 'drafts';
type EmailListMode = 'list' | 'conversation';

interface UseInboxFollowUpFilterRequestOptions {
  request: unknown;
  clearBulkSelection: () => void;
  selectEmail: (id: string | null) => void;
  setFilter: Dispatch<SetStateAction<InboxMailFilter>>;
  setChannelFilter: Dispatch<SetStateAction<InboxChannelFilter>>;
  setEmailListMode: Dispatch<SetStateAction<EmailListMode>>;
  setFollowUpOnly: Dispatch<SetStateAction<boolean>>;
  setIsComposing: Dispatch<SetStateAction<boolean>>;
  setIsStartingWhatsApp: Dispatch<SetStateAction<boolean>>;
  setSelectedWhatsAppPhone: Dispatch<SetStateAction<string | null>>;
  setSelectedWhatsAppClientId: Dispatch<SetStateAction<string | null>>;
  setSelectedTelegramConversation: Dispatch<SetStateAction<UnifiedCommunicationConversation | null>>;
  setSelectedLiveChatConversation: Dispatch<SetStateAction<UnifiedCommunicationConversation | null>>;
}

export function useInboxFollowUpFilterRequest({
  request,
  clearBulkSelection,
  selectEmail,
  setFilter,
  setChannelFilter,
  setEmailListMode,
  setFollowUpOnly,
  setIsComposing,
  setIsStartingWhatsApp,
  setSelectedWhatsAppPhone,
  setSelectedWhatsAppClientId,
  setSelectedTelegramConversation,
  setSelectedLiveChatConversation,
}: UseInboxFollowUpFilterRequestOptions) {
  useEffect(() => {
    if (!request) return;
    setFilter('inbox');
    setChannelFilter('all');
    setEmailListMode('list');
    setFollowUpOnly(true);
    clearBulkSelection();
    setIsComposing(false);
    setIsStartingWhatsApp(false);
    setSelectedWhatsAppPhone(null);
    setSelectedWhatsAppClientId(null);
    setSelectedTelegramConversation(null);
    setSelectedLiveChatConversation(null);
    selectEmail(null);
  }, [
    request,
    clearBulkSelection,
    selectEmail,
    setChannelFilter,
    setEmailListMode,
    setFilter,
    setFollowUpOnly,
    setIsComposing,
    setIsStartingWhatsApp,
    setSelectedLiveChatConversation,
    setSelectedTelegramConversation,
    setSelectedWhatsAppClientId,
    setSelectedWhatsAppPhone,
  ]);
}
