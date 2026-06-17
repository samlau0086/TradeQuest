import { useMemo } from 'react';
import { Client, EmailMessage } from '../../store';
import {
  ConversationMessageTranslation,
  InboxWhatsAppConversation,
  UnifiedCommunicationConversation,
  getWhatsAppFollowUp,
} from './inboxModel';
import {
  buildLinkableContact,
  buildLiveChatContext,
  buildTelegramContext,
  buildWhatsAppSelection,
  resolveActiveUnifiedConversation,
} from './activeConversationContextBuilders';

interface UseActiveConversationContextArgs {
  language: string;
  clients: Client[];
  emails: EmailMessage[];
  logs: any[];
  deals: any[];
  knowledgeBase: any[];
  products: any[];
  conversationAutoTranslateConfig: Record<string, boolean>;
  conversationTranslations: Record<string, Record<string, ConversationMessageTranslation>>;
  liveChatSessions: any[];
  liveChatMessages: Record<string, any[]>;
  selectedEmail: EmailMessage | undefined;
  selectedEmailContactAddress: string;
  selectedWhatsAppPhone: string | null;
  selectedWhatsAppClientId: string | null;
  selectedTelegramConversation: UnifiedCommunicationConversation | null;
  telegramMessages: any[];
  selectedLiveChatConversation: UnifiedCommunicationConversation | null;
  unifiedConversationSource: UnifiedCommunicationConversation[];
  whatsappConversations: InboxWhatsAppConversation[];
}

export function useActiveConversationContext({
  language,
  clients,
  emails,
  logs,
  deals,
  knowledgeBase,
  products,
  conversationAutoTranslateConfig,
  conversationTranslations,
  liveChatSessions,
  liveChatMessages,
  selectedEmail,
  selectedEmailContactAddress,
  selectedWhatsAppPhone,
  selectedWhatsAppClientId,
  selectedTelegramConversation,
  telegramMessages,
  selectedLiveChatConversation,
  unifiedConversationSource,
  whatsappConversations,
}: UseActiveConversationContextArgs) {
  const { activeWhatsAppConversation, activeWhatsAppClient } = buildWhatsAppSelection({
    clients,
    selectedWhatsAppPhone,
    selectedWhatsAppClientId,
    whatsappConversations,
  });

  const telegramContext = buildTelegramContext({
    language,
    clients,
    emails,
    logs,
    deals,
    knowledgeBase,
    products,
    conversationAutoTranslateConfig,
    conversationTranslations,
    selectedTelegramConversation,
    telegramMessages,
  });

  const liveChatContext = buildLiveChatContext({
    language,
    clients,
    emails,
    logs,
    deals,
    knowledgeBase,
    products,
    conversationAutoTranslateConfig,
    conversationTranslations,
    liveChatSessions,
    liveChatMessages,
    selectedLiveChatConversation,
  });

  const { activeLinkableContactMethod, activeLinkableDisplayName } = buildLinkableContact({
    selectedEmail,
    selectedEmailContactAddress,
    selectedTelegramConversation,
    activeTelegramContactMethod: telegramContext.activeTelegramContactMethod,
    activeTelegramDisplayName: telegramContext.activeTelegramDisplayName,
    selectedLiveChatConversation,
    activeLiveChatContactMethod: liveChatContext.activeLiveChatContactMethod,
    activeLiveChatDisplayName: liveChatContext.activeLiveChatDisplayName,
  });

  const activeUnifiedConversation = useMemo(() => resolveActiveUnifiedConversation({
    selectedEmail,
    selectedWhatsAppPhone,
    selectedTelegramConversation,
    selectedLiveChatConversation,
    activeWhatsAppConversation,
    unifiedConversationSource,
  }), [
    activeWhatsAppConversation,
    selectedEmail,
    selectedWhatsAppPhone,
    selectedTelegramConversation,
    selectedLiveChatConversation,
    unifiedConversationSource,
  ]);

  return {
    activeWhatsAppConversation,
    activeWhatsAppClient,
    activeWhatsAppFollowUp: getWhatsAppFollowUp(activeWhatsAppConversation),
    ...telegramContext,
    ...liveChatContext,
    activeLinkableContactMethod,
    activeLinkableDisplayName,
    activeUnifiedConversation,
  };
}
