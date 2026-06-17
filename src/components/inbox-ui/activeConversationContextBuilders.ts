import { buildUnifiedAgentContext, UnifiedAgentContext } from '../../lib/agentContext';
import { Client, ContactMethod, EmailMessage } from '../../store';
import {
  ConversationMessageTranslation,
  InboxWhatsAppConversation,
  UnifiedCommunicationConversation,
  conversationAutoTranslateId,
  conversationTranslationBucketId,
  emailToUnifiedConversation,
  whatsappToUnifiedConversation,
} from './inboxModel';

export const emptyAgentContext: UnifiedAgentContext = {
  cacheKey: '',
  body: '',
  additionalContext: '',
  hasCustomerMessage: false,
};

export function matchWhatsAppClient(clients: Client[], phone: string) {
  return clients.find(client => client.contactMethods?.some(method => (
    ['whatsapp', 'phone'].includes(method.type) && method.value.replace(/[^0-9]/g, '').endsWith(phone.slice(-8))
  )));
}

interface BuildWhatsAppSelectionArgs {
  clients: Client[];
  selectedWhatsAppPhone: string | null;
  selectedWhatsAppClientId: string | null;
  whatsappConversations: InboxWhatsAppConversation[];
}

export function buildWhatsAppSelection({
  clients,
  selectedWhatsAppPhone,
  selectedWhatsAppClientId,
  whatsappConversations,
}: BuildWhatsAppSelectionArgs) {
  const activeWhatsAppConversation = selectedWhatsAppPhone
    ? whatsappConversations.find(conversation => conversation.targetPhone === selectedWhatsAppPhone) || null
    : null;
  const activeWhatsAppClient = selectedWhatsAppPhone
    ? clients.find(client => client.id === (activeWhatsAppConversation?.clientId || selectedWhatsAppClientId))
      || matchWhatsAppClient(clients, activeWhatsAppConversation?.targetPhone || selectedWhatsAppPhone)
      || null
    : null;

  return {
    activeWhatsAppConversation,
    activeWhatsAppClient,
  };
}

interface BuildTelegramContextArgs {
  language: string;
  clients: Client[];
  emails: EmailMessage[];
  logs: any[];
  deals: any[];
  knowledgeBase: any[];
  products: any[];
  conversationAutoTranslateConfig: Record<string, boolean>;
  conversationTranslations: Record<string, Record<string, ConversationMessageTranslation>>;
  selectedTelegramConversation: UnifiedCommunicationConversation | null;
  telegramMessages: any[];
}

export function buildTelegramContext({
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
}: BuildTelegramContextArgs) {
  const activeTelegramClient = selectedTelegramConversation?.client_id
    ? clients.find(client => client.id === selectedTelegramConversation.client_id) || null
    : null;
  const activeTelegramUsername = String(
    selectedTelegramConversation?.metadata?.username || selectedTelegramConversation?.contact_address || '',
  ).replace(/^@/, '').trim();
  const activeTelegramUserId = String(selectedTelegramConversation?.metadata?.telegramUserId || '').trim();
  const activeTelegramChatId = String(
    selectedTelegramConversation?.metadata?.telegramChatId || selectedTelegramConversation?.source_id || '',
  ).trim();
  const activeTelegramContactMethod: ContactMethod | null = selectedTelegramConversation
    ? {
        type: 'telegram',
        value: activeTelegramUsername ? `@${activeTelegramUsername}` : activeTelegramUserId || activeTelegramChatId,
      }
    : null;
  const activeTelegramDisplayName = selectedTelegramConversation?.contact_name
    || selectedTelegramConversation?.title
    || (activeTelegramUsername ? `@${activeTelegramUsername}` : '')
    || activeTelegramUserId
    || activeTelegramChatId
    || 'Telegram User';
  const activeTelegramTranslateKey = selectedTelegramConversation?.id || '';
  const activeTelegramTranslateEnabled = Boolean(
    activeTelegramTranslateKey
    && conversationAutoTranslateConfig[conversationAutoTranslateId('telegram', activeTelegramTranslateKey)],
  );
  const activeTelegramTranslations = activeTelegramTranslateKey
    ? (conversationTranslations[conversationTranslationBucketId('telegram', activeTelegramTranslateKey, language)] || {})
    : {};

  const activeTelegramAgentContext = selectedTelegramConversation
    ? buildUnifiedAgentContext({
        channel: 'telegram',
        subject: selectedTelegramConversation.title || 'Telegram conversation',
        contactLabel: activeTelegramDisplayName,
        client: activeTelegramClient,
        messages: telegramMessages.map(message => ({
          id: message.id,
          direction: message.direction === 'inbound' ? 'inbound' : message.direction === 'outbound' ? 'outbound' : 'system',
          body: message.body || '',
          createdAt: message.source_created_at || message.sourceCreatedAt || message.created_at || message.createdAt,
          channel: 'telegram',
          sender: message.sender || message.senderName || message.direction,
        })),
        emails,
        logs,
        deals,
        knowledgeBase,
        products,
        extraFacts: [
          activeTelegramUsername ? `Telegram username: @${activeTelegramUsername}` : '',
          activeTelegramUserId ? `Telegram user id: ${activeTelegramUserId}` : '',
          activeTelegramChatId ? `Telegram chat id: ${activeTelegramChatId}` : '',
          selectedTelegramConversation.metadata?.humanTakeover ? 'Human takeover is active.' : '',
        ],
      })
    : emptyAgentContext;

  return {
    activeTelegramClient,
    activeTelegramUsername,
    activeTelegramUserId,
    activeTelegramChatId,
    activeTelegramContactMethod,
    activeTelegramDisplayName,
    activeTelegramTranslateKey,
    activeTelegramTranslateEnabled,
    activeTelegramTranslations,
    activeTelegramAgentContext,
  };
}

interface BuildLiveChatContextArgs {
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
  selectedLiveChatConversation: UnifiedCommunicationConversation | null;
}

export function buildLiveChatContext({
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
}: BuildLiveChatContextArgs) {
  const activeLiveChatSession = selectedLiveChatConversation
    ? liveChatSessions.find(session => session.id === selectedLiveChatConversation.source_id) || null
    : null;
  const activeLiveChatMessages = selectedLiveChatConversation
    ? (liveChatMessages[selectedLiveChatConversation.source_id] || [])
    : [];
  const activeLiveChatTranslateKey = selectedLiveChatConversation?.source_id || '';
  const activeLiveChatTranslateEnabled = Boolean(
    activeLiveChatTranslateKey
    && conversationAutoTranslateConfig[conversationAutoTranslateId('live_chat', activeLiveChatTranslateKey)],
  );
  const activeLiveChatTranslations = activeLiveChatTranslateKey
    ? (conversationTranslations[conversationTranslationBucketId('live_chat', activeLiveChatTranslateKey, language)] || {})
    : {};
  const visibleLiveChatMessages = activeLiveChatMessages.filter(message => message.role !== 'system').slice(-200);
  const activeLiveChatClient = activeLiveChatSession?.clientId || selectedLiveChatConversation?.client_id
    ? clients.find(client => client.id === (activeLiveChatSession?.clientId || selectedLiveChatConversation?.client_id)) || null
    : null;
  const activeLiveChatVisitorInfo = activeLiveChatSession?.metadata?.visitorInfo || selectedLiveChatConversation?.metadata?.visitorInfo || {};
  const latestLiveChatVisitorMessage = [...visibleLiveChatMessages].reverse().find(message => message.role === 'visitor') || null;
  const activeLiveChatTranscriptContext = visibleLiveChatMessages
    .slice(-12)
    .map(message => `${message.role}: ${message.body}`)
    .join('\n');
  const activeLiveChatEvidenceItems = [
    activeLiveChatSession?.pageUrl ? { label: language === 'zh' ? '访问页面' : 'Page URL', value: activeLiveChatSession.pageUrl } : null,
    activeLiveChatVisitorInfo.ip ? { label: 'IP', value: activeLiveChatVisitorInfo.ip } : null,
    activeLiveChatVisitorInfo.country ? { label: language === 'zh' ? '国家/地区' : 'Country', value: activeLiveChatVisitorInfo.country } : null,
    [activeLiveChatVisitorInfo.browserName, activeLiveChatVisitorInfo.browserVersion].filter(Boolean).join(' ')
      ? { label: language === 'zh' ? '浏览器' : 'Browser', value: [activeLiveChatVisitorInfo.browserName, activeLiveChatVisitorInfo.browserVersion].filter(Boolean).join(' ') }
      : null,
    activeLiveChatVisitorInfo.os ? { label: language === 'zh' ? '系统' : 'OS', value: activeLiveChatVisitorInfo.os } : null,
    activeLiveChatVisitorInfo.language || activeLiveChatVisitorInfo.acceptLanguage
      ? { label: language === 'zh' ? '语言' : 'Language', value: activeLiveChatVisitorInfo.language || activeLiveChatVisitorInfo.acceptLanguage }
      : null,
    activeLiveChatVisitorInfo.timezone ? { label: language === 'zh' ? '时区' : 'Timezone', value: activeLiveChatVisitorInfo.timezone } : null,
    activeLiveChatVisitorInfo.localTime ? { label: language === 'zh' ? '当地时间' : 'Local time', value: activeLiveChatVisitorInfo.localTime } : null,
    activeLiveChatSession?.createdAt ? { label: language === 'zh' ? '首次会话' : 'Session started', value: new Date(activeLiveChatSession.createdAt).toLocaleString() } : null,
    activeLiveChatSession?.lastMessageAt ? { label: language === 'zh' ? '最近消息' : 'Last message', value: new Date(activeLiveChatSession.lastMessageAt).toLocaleString() } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;
  const activeLiveChatContactMethod: ContactMethod | null = activeLiveChatSession?.visitorEmail
    ? { type: 'email', value: activeLiveChatSession.visitorEmail }
    : activeLiveChatSession?.visitorPhone
      ? { type: 'phone', value: activeLiveChatSession.visitorPhone }
      : null;
  const activeLiveChatDisplayName = activeLiveChatSession?.visitorName
    || activeLiveChatSession?.visitorEmail
    || activeLiveChatSession?.visitorPhone
    || selectedLiveChatConversation?.contact_name
    || selectedLiveChatConversation?.contact_address
    || 'Live Chat Visitor';
  const activeLiveChatAgentContext = selectedLiveChatConversation
    ? buildUnifiedAgentContext({
        channel: 'live_chat',
        subject: selectedLiveChatConversation.title || 'Live Chat conversation',
        contactLabel: activeLiveChatDisplayName,
        client: activeLiveChatClient,
        messages: visibleLiveChatMessages.map(message => ({
          id: message.id,
          direction: message.role === 'visitor' ? 'inbound' : message.role === 'system' ? 'system' : 'outbound',
          body: message.body,
          createdAt: message.createdAt,
          channel: 'live_chat',
          sender: message.senderName || message.role,
        })),
        emails,
        logs,
        deals,
        knowledgeBase,
        products,
        extraFacts: [
          activeLiveChatSession?.visitorEmail ? `Visitor email: ${activeLiveChatSession.visitorEmail}` : '',
          activeLiveChatSession?.visitorPhone ? `Visitor phone: ${activeLiveChatSession.visitorPhone}` : '',
          activeLiveChatSession?.pageUrl ? `Page URL: ${activeLiveChatSession.pageUrl}` : '',
          activeLiveChatEvidenceItems.length ? `Visitor evidence:\n${activeLiveChatEvidenceItems.map(item => `${item.label}: ${item.value}`).join('\n')}` : '',
          activeLiveChatTranscriptContext ? `Recent live chat transcript:\n${activeLiveChatTranscriptContext}` : '',
        ],
      })
    : emptyAgentContext;

  return {
    activeLiveChatSession,
    activeLiveChatMessages,
    activeLiveChatTranslateKey,
    activeLiveChatTranslateEnabled,
    activeLiveChatTranslations,
    visibleLiveChatMessages,
    activeLiveChatClient,
    activeLiveChatVisitorInfo,
    latestLiveChatVisitorMessage,
    activeLiveChatEvidenceItems,
    activeLiveChatContactMethod,
    activeLiveChatDisplayName,
    activeLiveChatAgentContext,
  };
}

interface BuildLinkableContactArgs {
  selectedEmail: EmailMessage | undefined;
  selectedEmailContactAddress: string;
  selectedTelegramConversation: UnifiedCommunicationConversation | null;
  activeTelegramContactMethod: ContactMethod | null;
  activeTelegramDisplayName: string;
  selectedLiveChatConversation: UnifiedCommunicationConversation | null;
  activeLiveChatContactMethod: ContactMethod | null;
  activeLiveChatDisplayName: string;
}

export function buildLinkableContact({
  selectedEmail,
  selectedEmailContactAddress,
  selectedTelegramConversation,
  activeTelegramContactMethod,
  activeTelegramDisplayName,
  selectedLiveChatConversation,
  activeLiveChatContactMethod,
  activeLiveChatDisplayName,
}: BuildLinkableContactArgs) {
  const activeLinkableContactMethod: ContactMethod | null = selectedEmail && selectedEmailContactAddress
    ? { type: 'email', value: selectedEmailContactAddress }
    : selectedLiveChatConversation
      ? activeLiveChatContactMethod
      : selectedTelegramConversation
        ? activeTelegramContactMethod
        : null;
  const activeLinkableDisplayName = selectedEmail
    ? (selectedEmail.senderName || selectedEmailContactAddress)
    : selectedTelegramConversation
      ? activeTelegramDisplayName
      : activeLiveChatDisplayName;

  return {
    activeLinkableContactMethod,
    activeLinkableDisplayName,
  };
}

interface ResolveActiveUnifiedConversationArgs {
  selectedEmail: EmailMessage | undefined;
  selectedWhatsAppPhone: string | null;
  selectedTelegramConversation: UnifiedCommunicationConversation | null;
  selectedLiveChatConversation: UnifiedCommunicationConversation | null;
  activeWhatsAppConversation: InboxWhatsAppConversation | null;
  unifiedConversationSource: UnifiedCommunicationConversation[];
}

export function resolveActiveUnifiedConversation({
  selectedEmail,
  selectedWhatsAppPhone,
  selectedTelegramConversation,
  selectedLiveChatConversation,
  activeWhatsAppConversation,
  unifiedConversationSource,
}: ResolveActiveUnifiedConversationArgs) {
  if (selectedEmail) {
    return unifiedConversationSource.find(conversation => conversation.channel === 'email' && conversation.source_id === selectedEmail.id)
      || emailToUnifiedConversation(selectedEmail);
  }
  if (selectedWhatsAppPhone) {
    return unifiedConversationSource.find(conversation => (
      conversation.channel === 'whatsapp'
      && (
        conversation.source_id === activeWhatsAppConversation?.id
        || conversation.metadata?.targetPhone === selectedWhatsAppPhone
        || conversation.contact_address === selectedWhatsAppPhone
      )
    )) || (activeWhatsAppConversation ? whatsappToUnifiedConversation(activeWhatsAppConversation) : null);
  }
  if (selectedTelegramConversation) {
    return unifiedConversationSource.find(conversation => (
      conversation.channel === 'telegram' && conversation.source_id === selectedTelegramConversation.source_id
    )) || selectedTelegramConversation;
  }
  if (selectedLiveChatConversation) {
    return unifiedConversationSource.find(conversation => (
      conversation.channel === 'live_chat' && conversation.source_id === selectedLiveChatConversation.source_id
    )) || selectedLiveChatConversation;
  }
  return null;
}
