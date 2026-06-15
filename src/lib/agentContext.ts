import type { Client, Deal, EmailMessage, KnowledgeItem, Log, Product } from '../store';

type Direction = 'inbound' | 'outbound' | 'system';

export interface ConversationContextMessage {
  id?: string;
  direction: Direction;
  body?: string;
  subject?: string;
  createdAt?: string;
  channel?: string;
  sender?: string;
}

export interface BuildUnifiedAgentContextInput {
  channel: 'email' | 'whatsapp' | 'live_chat' | 'telegram';
  subject?: string;
  contactLabel?: string;
  client?: Client | null;
  messages: ConversationContextMessage[];
  emails?: EmailMessage[];
  logs?: Log[];
  deals?: Deal[];
  knowledgeBase?: KnowledgeItem[];
  products?: Product[];
  memory?: string;
  extraFacts?: string[];
  currentMessageId?: string;
}

export interface UnifiedAgentContext {
  cacheKey: string;
  body: string;
  additionalContext: string;
  hasCustomerMessage: boolean;
  latestInbound?: ConversationContextMessage;
}

const stripHtml = (value: string) => value
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<blockquote[\s\S]*?<\/blockquote>/gi, ' ')
  .replace(/<div[^>]*gmail_quote[\s\S]*$/i, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/\s+/g, ' ')
  .trim();

export const extractLatestMessageText = (value: string) => {
  const text = stripHtml(value || '');
  return text
    .split(/\n?On .+ wrote:\n?/i)[0]
    .split(/\n?From:\s.+\nSent:\s.+/i)[0]
    .split(/\n?-{2,}\s*Original Message\s*-{2,}/i)[0]
    .trim();
};

const clip = (value: unknown, max = 600) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);

const formatMessages = (label: string, messages: ConversationContextMessage[]) => {
  if (messages.length === 0) return `${label}: N/A`;
  return [
    `${label}:`,
    ...messages.map(message => {
      const parts = [
        message.createdAt ? new Date(message.createdAt).toLocaleString() : '',
        message.channel || '',
        message.sender || ''
      ].filter(Boolean).join(' · ');
      return `${message.direction}${parts ? ` (${parts})` : ''}: ${clip(message.body || message.subject || '', 420)}`;
    })
  ].join('\n');
};

export function buildUnifiedAgentContext(input: BuildUnifiedAgentContextInput): UnifiedAgentContext {
  const {
    channel,
    subject = '',
    contactLabel = '',
    client,
    messages,
    emails = [],
    logs = [],
    deals = [],
    knowledgeBase = [],
    products = [],
    memory = '',
    extraFacts = [],
    currentMessageId
  } = input;

  const inbound = messages.filter(message => message.direction === 'inbound' && clip(message.body || message.subject));
  const outbound = messages.filter(message => message.direction === 'outbound' && clip(message.body || message.subject));
  const latestInbound = inbound[inbound.length - 1];
  const body = inbound.length > 0
    ? [
      'Customer inbound messages. Use only these messages to infer customer intent:',
      ...inbound.slice(-8).map(message => `inbound customer: ${clip(message.body || message.subject, 800)}`),
      '',
      'Our outbound/team messages. Use as background only; never infer customer intent from these:',
      ...outbound.slice(-8).map(message => `outbound team: ${clip(message.body || message.subject, 600)}`)
    ].join('\n')
    : [
      'NO_INBOUND_CUSTOMER_MESSAGES',
      `No inbound customer message is available in this ${channel} conversation.`,
      'Our outbound/team messages are background only and must not be treated as customer intent:',
      ...outbound.slice(-8).map(message => `outbound team: ${clip(message.body || message.subject, 600)}`)
    ].join('\n');

  const clientEmails = client?.id ? emails.filter(email => email.clientId === client.id) : [];
  const otherEmailHistory = clientEmails
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8)
    .map(email => `${email.type} ${email.date}: ${email.subject} - ${clip(extractLatestMessageText(email.body || ''), 260)}`);
  const relatedDeals = client?.id ? deals.filter(deal => deal.clientId === client.id).slice(0, 8) : [];
  const relatedKnowledge = knowledgeBase
    .filter(item => !item.clientId || (client?.id && item.clientId === client.id))
    .slice(0, 8);
  const productContext = products.slice(0, 12).map(product => (
    `${product.name}${product.sku ? ` (${product.sku})` : ''}: ${clip(product.salesPoints || product.description, 420)}`
  ));
  const clientLogs = client?.id
    ? logs.filter(log => log.clientId === client.id).slice(0, 12).map(log => `${log.date}: ${log.content}`)
    : [];

  const additionalContext = [
    `Channel: ${channel}`,
    `Subject/contact: ${subject || contactLabel || 'N/A'}`,
    client
      ? `Client profile: ${[client.name, client.company, client.country].filter(Boolean).join(' · ') || client.id}`
      : `Unlinked contact: ${contactLabel || 'N/A'}`,
    client ? `Preferred language: ${client.preferredLanguage || 'N/A'}` : '',
    client ? `AI customer summary: ${client.agentSummary || client.leadSummary || 'N/A'}` : '',
    client ? `Best next action: ${client.agentNextStep || client.leadNextStep || 'N/A'}` : '',
    client ? `Lead score: ${client.leadScore ?? 'N/A'}` : '',
    client ? `Tags: ${(client.tags || []).join(', ') || 'N/A'}` : '',
    client ? `Recent internal comments: ${(client.comments || []).slice(-6).map(comment => comment.content).join(' | ') || 'N/A'}` : '',
    clientLogs.length ? `Recent CRM activity: ${clientLogs.join(' | ')}` : 'Recent CRM activity: N/A',
    otherEmailHistory.length ? `Cross-channel email history: ${otherEmailHistory.join(' | ')}` : 'Cross-channel email history: N/A',
    formatMessages('Current channel recent inbound/outbound split', messages.slice(-16)),
    memory || '',
    relatedDeals.length
      ? `Related leads/deals: ${relatedDeals.map(deal => `${deal.name} (${deal.status}) score ${deal.leadScore ?? 'N/A'} summary: ${deal.leadSummary || 'N/A'} next: ${deal.leadNextStep || 'N/A'}`).join(' | ')}`
      : 'Related leads/deals: N/A',
    relatedKnowledge.length
      ? `Relevant knowledge snippets: ${relatedKnowledge.map(item => `${item.clientId ? 'client' : 'global'}:${item.title}: ${clip(item.content, 520)}`).join(' | ')}`
      : 'Relevant knowledge snippets: N/A',
    productContext.length ? `Product context: ${productContext.join(' | ')}` : 'Product context: N/A',
    ...extraFacts.filter(Boolean)
  ].filter(Boolean).join('\n');

  const cacheKey = latestInbound
    ? `${channel}:${contactLabel || client?.id || 'unknown'}:inbound:${latestInbound.id || currentMessageId || clip(latestInbound.body, 80)}`
    : `${channel}:${contactLabel || client?.id || 'unknown'}:no-inbound`;

  return {
    cacheKey,
    body,
    additionalContext,
    hasCustomerMessage: inbound.length > 0,
    latestInbound
  };
}
