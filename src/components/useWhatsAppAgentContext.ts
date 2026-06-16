import { useMemo } from 'react';
import { type Client, type Deal, type EmailMessage, type KnowledgeItem, type Log, type Product } from '../store';
import { buildUnifiedAgentContext } from '../lib/agentContext';
import { getCustomerOutputLanguage, getOutboundLanguage } from '../lib/language';
import { PREFERRED_LANGUAGES } from './ClientFormModal';
import { type WhatsAppConversation, type WhatsAppHubMessage } from './whatsappMessageModel';

interface UseWhatsAppAgentContextOptions {
  activeClient: Client | null;
  conversation: WhatsAppConversation | null;
  displayPhone: string;
  messages: WhatsAppHubMessage[];
  emails: EmailMessage[];
  logs: Log[];
  deals: Deal[];
  knowledgeBase: KnowledgeItem[];
  products: Product[];
}

export function useWhatsAppAgentContext({
  activeClient,
  conversation,
  displayPhone,
  messages,
  emails,
  logs,
  deals,
  knowledgeBase,
  products,
}: UseWhatsAppAgentContextOptions) {
  const relatedDeals = useMemo(() => (
    activeClient
      ? deals
          .filter(deal => deal.clientId === activeClient.id)
          .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
          .slice(0, 5)
      : []
  ), [activeClient?.id, deals]);

  const whatsappMemoryContext = useMemo(() => {
    if (!conversation?.whatsappSummary) return '';
    return [
      `Compressed WhatsApp memory: ${conversation.whatsappSummary}`,
      conversation.whatsappSummaryNextStep ? `Compressed WhatsApp next step: ${conversation.whatsappSummaryNextStep}` : '',
      Array.isArray(conversation.whatsappSummaryKeyPoints) && conversation.whatsappSummaryKeyPoints.length > 0
        ? `Compressed WhatsApp key points: ${conversation.whatsappSummaryKeyPoints.join(' | ')}`
        : '',
      conversation.whatsappSummaryUpdatedAt ? `Compressed WhatsApp memory updated at: ${conversation.whatsappSummaryUpdatedAt}` : ''
    ].filter(Boolean).join('\n');
  }, [
    conversation?.whatsappSummary,
    conversation?.whatsappSummaryKeyPoints,
    conversation?.whatsappSummaryNextStep,
    conversation?.whatsappSummaryUpdatedAt
  ]);

  const latestInboundMessage = useMemo(() => (
    messages.filter(message => message.direction === 'inbound').slice(-1)[0]
  ), [messages]);
  const latestOutboundMessage = useMemo(() => (
    messages.filter(message => message.direction === 'outbound').slice(-1)[0]
  ), [messages]);

  const whatsappAgentContext = useMemo(() => buildUnifiedAgentContext({
    channel: 'whatsapp',
    subject: conversation?.clientName || activeClient?.name || displayPhone,
    contactLabel: displayPhone,
    client: activeClient,
    messages: messages.map(message => ({
      id: message.id,
      direction: message.direction,
      body: message.body,
      createdAt: message.created_at || message.received_at,
      channel: 'whatsapp',
      sender: message.sender || message.client_id
    })),
    emails,
    logs,
    deals,
    knowledgeBase,
    products,
    memory: whatsappMemoryContext || 'Compressed WhatsApp memory: N/A',
    currentMessageId: latestInboundMessage?.id || latestOutboundMessage?.id
  }), [
    activeClient,
    conversation?.clientName,
    deals,
    displayPhone,
    emails,
    knowledgeBase,
    latestInboundMessage?.id,
    latestOutboundMessage?.id,
    logs,
    messages,
    products,
    whatsappMemoryContext
  ]);

  const outboundLanguage = getCustomerOutputLanguage({
    lastCommunicationText: latestInboundMessage?.body,
    preferredLanguage: activeClient?.preferredLanguage,
    country: activeClient?.country
  });
  const outboundAutoTranslateLanguage = getOutboundLanguage(activeClient?.preferredLanguage, activeClient?.country);
  const outboundLanguageOptions = useMemo(() => {
    const options = PREFERRED_LANGUAGES.map(item => item.name);
    return options.includes(outboundAutoTranslateLanguage)
      ? options
      : [outboundAutoTranslateLanguage, ...options];
  }, [outboundAutoTranslateLanguage]);

  return {
    relatedDeals,
    latestInboundMessage,
    latestOutboundMessage,
    whatsappAgentContext,
    outboundLanguage,
    outboundAutoTranslateLanguage,
    outboundLanguageOptions,
  };
}
