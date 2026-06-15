import { Dispatch, SetStateAction, useEffect } from 'react';
import { ContactMethod, EmailMessage } from '../../store';
import {
  INBOX_OPEN_REQUEST_KEY,
  InboxWhatsAppConversation,
  UnifiedCommunicationConversation,
  mapUnifiedWhatsAppConversation,
  writeCachedWhatsAppConversations,
} from './inboxModel';

interface WhatsAppContactOptionLike {
  clientId: string;
  phone: string;
}

interface UseInboxNavigationActionsArgs {
  whatsappConversations: InboxWhatsAppConversation[];
  unifiedConversationSource: UnifiedCommunicationConversation[];
  selectedEmail: EmailMessage | undefined;
  selectedEmailId: string | null;
  selectedWhatsAppPhone: string | null;
  selectedLiveChatConversation: UnifiedCommunicationConversation | null;
  selectedTelegramConversation: UnifiedCommunicationConversation | null;
  activeLiveChatClient: any;
  activeLiveChatContactMethod: ContactMethod | null;
  activeTelegramClient: any;
  activeTelegramContactMethod: ContactMethod | null;
  newWhatsAppPhone: string;
  markEmailRead: (id: string) => void;
  selectEmail: (id: string | null) => void;
  setIsComposing: (value: boolean) => void;
  setComposeDefaults: (defaults: any) => void;
  setIsStartingWhatsApp: (value: boolean) => void;
  setSelectedWhatsAppPhone: (phone: string | null) => void;
  setSelectedWhatsAppClientId: (clientId: string | null) => void;
  setSelectedTelegramConversation: Dispatch<SetStateAction<UnifiedCommunicationConversation | null>>;
  setTelegramMessages: Dispatch<SetStateAction<any[]>>;
  setTelegramReply: (value: string) => void;
  setSelectedLiveChatConversation: Dispatch<SetStateAction<UnifiedCommunicationConversation | null>>;
  setLiveChatReply: (value: string) => void;
  setWhatsappConversations: Dispatch<SetStateAction<InboxWhatsAppConversation[]>>;
  setNewWhatsAppPhone: (value: string) => void;
  setShowWhatsAppContactPicker: (value: boolean) => void;
  setChannelFilter: (value: any) => void;
  setIsCreatingLead: (value: boolean) => void;
  setConfirmDialog: (dialog: any) => void;
  findEmailUnifiedConversation: (emailId: string) => UnifiedCommunicationConversation | undefined;
  patchUnifiedConversation: (conversation: UnifiedCommunicationConversation, updates: any) => Promise<any>;
  deleteUnifiedConversation: (conversation: UnifiedCommunicationConversation) => Promise<any>;
  refreshUnifiedConversationData: () => Promise<void>;
  loadTelegramMessages: (conversation: UnifiedCommunicationConversation) => Promise<void>;
  fetchLiveChatMessages: (sessionId: string) => Promise<any>;
  fetchLiveChatSessions: () => Promise<any>;
  notify: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export function useInboxNavigationActions({
  whatsappConversations,
  unifiedConversationSource,
  selectedEmail,
  selectedEmailId,
  selectedWhatsAppPhone,
  selectedLiveChatConversation,
  selectedTelegramConversation,
  activeLiveChatClient,
  activeLiveChatContactMethod,
  activeTelegramClient,
  activeTelegramContactMethod,
  newWhatsAppPhone,
  markEmailRead,
  selectEmail,
  setIsComposing,
  setComposeDefaults,
  setIsStartingWhatsApp,
  setSelectedWhatsAppPhone,
  setSelectedWhatsAppClientId,
  setSelectedTelegramConversation,
  setTelegramMessages,
  setTelegramReply,
  setSelectedLiveChatConversation,
  setLiveChatReply,
  setWhatsappConversations,
  setNewWhatsAppPhone,
  setShowWhatsAppContactPicker,
  setChannelFilter,
  setIsCreatingLead,
  setConfirmDialog,
  findEmailUnifiedConversation,
  patchUnifiedConversation,
  deleteUnifiedConversation,
  refreshUnifiedConversationData,
  loadTelegramMessages,
  fetchLiveChatMessages,
  fetchLiveChatSessions,
  notify,
}: UseInboxNavigationActionsArgs) {
  const resetConversationSelection = () => {
    setSelectedWhatsAppPhone(null);
    setSelectedWhatsAppClientId(null);
    setSelectedTelegramConversation(null);
    setTelegramMessages([]);
    setSelectedLiveChatConversation(null);
  };

  const handleSelect = (id: string) => {
    setIsComposing(false);
    setIsStartingWhatsApp(false);
    resetConversationSelection();
    selectEmail(id);
    const conversation = findEmailUnifiedConversation(id);
    if (conversation && !conversation.metadata?.localFallback) {
      void patchUnifiedConversation(conversation, { read: true }).then(() => refreshUnifiedConversationData()).catch(() => markEmailRead(id));
    } else {
      markEmailRead(id);
    }
  };

  const handleSelectWhatsApp = (conversation: InboxWhatsAppConversation) => {
    setIsComposing(false);
    setIsStartingWhatsApp(false);
    setSelectedTelegramConversation(null);
    setTelegramMessages([]);
    setSelectedLiveChatConversation(null);
    selectEmail(null);
    setSelectedWhatsAppPhone(conversation.targetPhone);
    setSelectedWhatsAppClientId(conversation.clientId || null);
  };

  const handleSelectUnifiedConversation = (conversation: UnifiedCommunicationConversation) => {
    if (conversation.channel === 'email') {
      setSelectedTelegramConversation(null);
      setTelegramMessages([]);
      handleSelect(conversation.source_id);
      return;
    }
    if (conversation.channel === 'whatsapp') {
      setSelectedTelegramConversation(null);
      setTelegramMessages([]);
      const mapped = mapUnifiedWhatsAppConversation(conversation);
      setWhatsappConversations(prev => prev.some(item => item.id === mapped.id) ? prev : [mapped, ...prev]);
      handleSelectWhatsApp(mapped);
      return;
    }
    if (conversation.channel === 'telegram') {
      setIsComposing(false);
      setIsStartingWhatsApp(false);
      selectEmail(null);
      setSelectedWhatsAppPhone(null);
      setSelectedWhatsAppClientId(null);
      setSelectedLiveChatConversation(null);
      setSelectedTelegramConversation(conversation);
      setTelegramReply('');
      void loadTelegramMessages(conversation);
      return;
    }
    selectEmail(null);
    setSelectedWhatsAppPhone(null);
    setSelectedWhatsAppClientId(null);
    setSelectedTelegramConversation(null);
    setTelegramMessages([]);
    setSelectedLiveChatConversation(conversation);
    setLiveChatReply('');
    setIsComposing(false);
    setIsStartingWhatsApp(false);
    void fetchLiveChatMessages(conversation.source_id);
    void fetchLiveChatSessions();
  };

  useEffect(() => {
    const consumeOpenRequest = () => {
      const raw = localStorage.getItem(INBOX_OPEN_REQUEST_KEY);
      if (!raw) return;
      let request: any = null;
      try {
        request = JSON.parse(raw);
      } catch {
        localStorage.removeItem(INBOX_OPEN_REQUEST_KEY);
        return;
      }
      if (!request || typeof request !== 'object') {
        localStorage.removeItem(INBOX_OPEN_REQUEST_KEY);
        return;
      }
      if (request.type === 'composeEmail') {
        setIsStartingWhatsApp(false);
        setSelectedWhatsAppPhone(null);
        setSelectedWhatsAppClientId(null);
        setSelectedTelegramConversation(null);
        setSelectedLiveChatConversation(null);
        selectEmail(null);
        setComposeDefaults({
          recipient: String(request.recipient || ''),
          subject: String(request.subject || ''),
          initialBody: String(request.initialBody || ''),
        });
        setIsComposing(true);
        localStorage.removeItem(INBOX_OPEN_REQUEST_KEY);
        return;
      }
      if (request.type === 'whatsapp') {
        const phone = String(request.phone || '').trim();
        if (!phone) {
          localStorage.removeItem(INBOX_OPEN_REQUEST_KEY);
          return;
        }
        const normalizedPhone = phone.replace(/[^0-9]/g, '') || phone;
        const conversation = whatsappConversations.find(item => {
          const values = [item.targetPhone, item.contactPhone, item.rawChatId, item.conversationKey].filter(Boolean).map(value => String(value));
          return values.some(value => value === phone || value === normalizedPhone || value.replace(/[^0-9]/g, '') === normalizedPhone);
        });
        if (conversation) {
          handleSelectWhatsApp(conversation);
        } else {
          setIsComposing(false);
          setIsStartingWhatsApp(false);
          setSelectedTelegramConversation(null);
          setTelegramMessages([]);
          setSelectedLiveChatConversation(null);
          selectEmail(null);
          setSelectedWhatsAppPhone(normalizedPhone);
          setSelectedWhatsAppClientId(request.clientId || null);
        }
        setChannelFilter('whatsapp');
        localStorage.removeItem(INBOX_OPEN_REQUEST_KEY);
      }
    };
    consumeOpenRequest();
    window.addEventListener('storage', consumeOpenRequest);
    window.addEventListener('tradequest:open-inbox-request', consumeOpenRequest);
    return () => {
      window.removeEventListener('storage', consumeOpenRequest);
      window.removeEventListener('tradequest:open-inbox-request', consumeOpenRequest);
    };
  }, [whatsappConversations, selectEmail]);

  const handleDeleteWhatsAppConversation = (conversation: InboxWhatsAppConversation) => {
    setConfirmDialog({
      message: `Are you sure you want to delete this WhatsApp conversation with ${conversation.clientName || conversation.targetPhone}? This will remove the saved conversation and messages from this system.`,
      onConfirm: async () => {
        try {
          const unified = unifiedConversationSource.find(item => item.channel === 'whatsapp' && (item.id === conversation.unifiedId || item.source_id === conversation.id));
          if (!unified) throw new Error('Unified WhatsApp conversation is not loaded yet.');
          await deleteUnifiedConversation(unified);
          setWhatsappConversations(prev => {
            const next = prev.filter(item => item.id !== conversation.id);
            writeCachedWhatsAppConversations(next);
            return next;
          });
          if (selectedWhatsAppPhone === conversation.targetPhone) setSelectedWhatsAppPhone(null);
          await refreshUnifiedConversationData();
          notify('WhatsApp conversation deleted.', 'success');
        } catch (error) {
          notify(error instanceof Error ? error.message : 'Failed to delete WhatsApp conversation.', 'error');
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  const startNewWhatsApp = () => {
    const phone = newWhatsAppPhone.replace(/[^0-9]/g, '');
    if (!phone) return;
    setSelectedWhatsAppPhone(phone);
    setIsStartingWhatsApp(false);
    setNewWhatsAppPhone('');
    setShowWhatsAppContactPicker(false);
  };

  const selectWhatsAppContactOption = (option: WhatsAppContactOptionLike) => {
    setNewWhatsAppPhone(option.phone);
    setSelectedWhatsAppClientId(option.clientId);
    setShowWhatsAppContactPicker(false);
  };

  const handleCreateLead = () => {
    const canCreateFromEmail = selectedEmail && !selectedEmail.clientId;
    const canCreateFromLiveChat = selectedLiveChatConversation && !activeLiveChatClient && activeLiveChatContactMethod;
    const canCreateFromTelegram = selectedTelegramConversation && !activeTelegramClient && activeTelegramContactMethod;
    if (!canCreateFromEmail && !canCreateFromLiveChat && !canCreateFromTelegram) return;
    setIsCreatingLead(true);
  };

  return {
    handleSelect,
    handleSelectWhatsApp,
    handleSelectUnifiedConversation,
    handleDeleteWhatsAppConversation,
    startNewWhatsApp,
    selectWhatsAppContactOption,
    handleCreateLead,
  };
}
