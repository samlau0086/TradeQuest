import { Dispatch, SetStateAction, useCallback } from 'react';
import type { InboxChannelFilter, UnifiedCommunicationConversation } from './inboxModel';

type InboxMailFilter = 'inbox' | 'sent' | 'scheduled' | 'drafts';
type EmailListMode = 'list' | 'conversation';
type ComposeDefaults = {
  recipient: string;
  subject: string;
  originalEmailBody?: string;
  initialBody?: string;
  draftId?: string;
  replyToEmailId?: string;
  initialOutboxId?: string;
} | null;

interface UseInboxSidebarActionsArgs {
  selectedWhatsAppPhone: string | null;
  selectEmail: (id: string | null) => void;
  clearBulkSelection: () => void;
  setFilter: Dispatch<SetStateAction<InboxMailFilter>>;
  setChannelFilter: Dispatch<SetStateAction<InboxChannelFilter>>;
  setEmailListMode: Dispatch<SetStateAction<EmailListMode>>;
  setFollowUpOnly: Dispatch<SetStateAction<boolean>>;
  setIsComposing: Dispatch<SetStateAction<boolean>>;
  setComposeDefaults: Dispatch<SetStateAction<ComposeDefaults>>;
  setIsStartingWhatsApp: Dispatch<SetStateAction<boolean>>;
  setSelectedWhatsAppPhone: Dispatch<SetStateAction<string | null>>;
  setSelectedWhatsAppClientId: Dispatch<SetStateAction<string | null>>;
  setSelectedTelegramConversation: Dispatch<SetStateAction<UnifiedCommunicationConversation | null>>;
  setTelegramMessages: Dispatch<SetStateAction<any[]>>;
  setSelectedLiveChatConversation: Dispatch<SetStateAction<UnifiedCommunicationConversation | null>>;
}

export function useInboxSidebarActions({
  selectedWhatsAppPhone,
  selectEmail,
  clearBulkSelection,
  setFilter,
  setChannelFilter,
  setEmailListMode,
  setFollowUpOnly,
  setIsComposing,
  setComposeDefaults,
  setIsStartingWhatsApp,
  setSelectedWhatsAppPhone,
  setSelectedWhatsAppClientId,
  setSelectedTelegramConversation,
  setTelegramMessages,
  setSelectedLiveChatConversation,
}: UseInboxSidebarActionsArgs) {
  const handleFilterChange = useCallback((nextFilter: InboxMailFilter) => {
    selectEmail(null);
    setSelectedWhatsAppPhone(null);
    setSelectedTelegramConversation(null);
    setSelectedLiveChatConversation(null);
    setFilter(nextFilter);
  }, [selectEmail, setFilter, setSelectedLiveChatConversation, setSelectedTelegramConversation, setSelectedWhatsAppPhone]);

  const handleChannelFilterChange = useCallback((nextChannel: InboxChannelFilter) => {
    setChannelFilter(nextChannel);
    if (nextChannel === 'whatsapp' || nextChannel === 'live_chat' || nextChannel === 'telegram') {
      setFilter('inbox');
      setEmailListMode('list');
      selectEmail(null);
    }
    if (nextChannel !== 'whatsapp' && selectedWhatsAppPhone) {
      setSelectedWhatsAppPhone(null);
      setSelectedWhatsAppClientId(null);
    }
    if (nextChannel !== 'telegram') {
      setSelectedTelegramConversation(null);
      setTelegramMessages([]);
    }
    if (nextChannel !== 'live_chat') {
      setSelectedLiveChatConversation(null);
    }
  }, [
    selectEmail,
    selectedWhatsAppPhone,
    setChannelFilter,
    setEmailListMode,
    setFilter,
    setSelectedLiveChatConversation,
    setSelectedTelegramConversation,
    setSelectedWhatsAppClientId,
    setSelectedWhatsAppPhone,
    setTelegramMessages,
  ]);

  const handleToggleFollowUpOnly = useCallback(() => {
    setFollowUpOnly(prev => !prev);
    clearBulkSelection();
  }, [clearBulkSelection, setFollowUpOnly]);

  const handleClearFollowUpOnly = useCallback(() => {
    setFollowUpOnly(false);
  }, [setFollowUpOnly]);

  const handleComposeEmail = useCallback(() => {
    setComposeDefaults(null);
    setIsComposing(true);
    setIsStartingWhatsApp(false);
    setSelectedWhatsAppPhone(null);
    setSelectedTelegramConversation(null);
    setSelectedLiveChatConversation(null);
    selectEmail(null);
  }, [
    selectEmail,
    setComposeDefaults,
    setIsComposing,
    setIsStartingWhatsApp,
    setSelectedLiveChatConversation,
    setSelectedTelegramConversation,
    setSelectedWhatsAppPhone,
  ]);

  const handleStartWhatsApp = useCallback(() => {
    setIsStartingWhatsApp(true);
    setIsComposing(false);
    setSelectedWhatsAppPhone(null);
    setSelectedWhatsAppClientId(null);
    setSelectedTelegramConversation(null);
    setSelectedLiveChatConversation(null);
    selectEmail(null);
  }, [
    selectEmail,
    setIsComposing,
    setIsStartingWhatsApp,
    setSelectedLiveChatConversation,
    setSelectedTelegramConversation,
    setSelectedWhatsAppClientId,
    setSelectedWhatsAppPhone,
  ]);

  return {
    handleFilterChange,
    handleChannelFilterChange,
    handleToggleFollowUpOnly,
    handleClearFollowUpOnly,
    handleComposeEmail,
    handleStartWhatsApp,
  };
}
