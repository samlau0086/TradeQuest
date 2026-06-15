import { EmailMessage } from '../../store';

export interface InboxWhatsAppConversation {
  id: string;
  unifiedId?: string;
  targetPhone: string;
  contactPhone?: string;
  rawChatId?: string;
  conversationKey?: string;
  clientId?: string;
  clientName?: string;
  clientCompany?: string;
  tags: string[];
  comments: any[];
  lastMessageAt?: string;
  lastBody?: string;
  lastDirection?: 'inbound' | 'outbound';
  lastHubClientId?: string;
}

export interface UnifiedCommunicationConversation {
  id: string;
  channel: 'email' | 'whatsapp' | 'live_chat' | 'telegram';
  source_id: string;
  client_id?: string;
  owner_id?: string;
  stage?: string;
  client_name?: string;
  client_company?: string;
  status?: string;
  direction?: 'inbound' | 'outbound';
  title?: string;
  subject?: string;
  contact_name?: string;
  contact_address?: string;
  last_message_preview?: string;
  last_message_at?: string;
  read?: boolean;
  is_important?: boolean;
  todo_at?: string;
  todo_note?: string;
  tags?: string[];
  comments?: any[];
  agent_context_analysis?: any;
  agent_context_analysis_key?: string;
  metadata?: any;
}

export type InboxChannelFilter = 'all' | 'email' | 'whatsapp' | 'live_chat' | 'telegram';

export interface ConversationMessageTranslation {
  language?: string;
  text: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  bodyHash: string;
  skipped?: boolean;
  modelId?: string | null;
  updatedAt?: string;
}

export const INBOX_OPEN_REQUEST_KEY = 'tradequest:inbox-open-request:v1';
export const WHATSAPP_CONVERSATION_POLL_MS = 20_000;
export const WHATSAPP_FOLLOW_UP_MARKER = '__FOLLOW_UP__';
export const CONVERSATION_AUTO_TRANSLATE_KEY = 'tradequest.conversation.autoTranslate.v1';

const WHATSAPP_CONVERSATION_CACHE_KEY = 'tradequest.whatsapp.conversations.cache.v1';

export const normalizeTagSearchTerm = (term: string) => term.trim().replace(/^#/, '').toLowerCase();

export function simpleHash(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return String(Math.abs(hash));
}

export function conversationAutoTranslateId(channel: 'live_chat' | 'telegram', conversationKey: string) {
  return `${channel}:${conversationKey}`.toLowerCase();
}

export function conversationTranslationBucketId(channel: 'live_chat' | 'telegram', conversationKey: string, language: string) {
  return `${channel}:${conversationKey}:${language}`.toLowerCase();
}

function conversationTranslationCacheKey(channel: 'live_chat' | 'telegram', conversationKey: string, language: string) {
  return `tradequest.${channel}.translations.v1.${language}.${conversationKey}`;
}

export function readConversationAutoTranslateConfig(): Record<string, boolean> {
  try {
    const parsed = JSON.parse(localStorage.getItem(CONVERSATION_AUTO_TRANSLATE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function readCachedConversationTranslations(channel: 'live_chat' | 'telegram', conversationKey: string, language: string): Record<string, ConversationMessageTranslation> {
  try {
    const parsed = JSON.parse(localStorage.getItem(conversationTranslationCacheKey(channel, conversationKey, language)) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function writeCachedConversationTranslations(channel: 'live_chat' | 'telegram', conversationKey: string, language: string, translations: Record<string, ConversationMessageTranslation>) {
  try {
    localStorage.setItem(conversationTranslationCacheKey(channel, conversationKey, language), JSON.stringify(translations));
  } catch {
    // Browser cache is optional; server metadata remains the source of truth.
  }
}

export const getWhatsAppFollowUp = (conversation?: InboxWhatsAppConversation | null) => {
  if (!conversation) return null;
  const marker = [...(conversation.comments || [])]
    .reverse()
    .find(comment => String(comment.content || '').startsWith(WHATSAPP_FOLLOW_UP_MARKER));
  if (!marker) return null;
  try {
    const parsed = JSON.parse(String(marker.content).slice(WHATSAPP_FOLLOW_UP_MARKER.length));
    return parsed?.status === 'open' && parsed?.dueAt
      ? { dueAt: String(parsed.dueAt), note: parsed.note ? String(parsed.note) : '' }
      : null;
  } catch {
    return null;
  }
};

export const hasOpenWhatsAppFollowUp = (conversation: InboxWhatsAppConversation) => Boolean(getWhatsAppFollowUp(conversation));

export function readCachedWhatsAppConversations(): InboxWhatsAppConversation[] {
  try {
    const raw = sessionStorage.getItem(WHATSAPP_CONVERSATION_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeCachedWhatsAppConversations(conversations: InboxWhatsAppConversation[]) {
  try {
    sessionStorage.setItem(WHATSAPP_CONVERSATION_CACHE_KEY, JSON.stringify(conversations.slice(0, 300)));
  } catch {
    // Session storage is an optional speed cache only.
  }
}

export function mapUnifiedWhatsAppConversation(row: UnifiedCommunicationConversation): InboxWhatsAppConversation {
  const metadata = row.metadata || {};
  return {
    id: row.source_id,
    unifiedId: row.id,
    targetPhone: metadata.targetPhone || row.contact_address || row.title || row.source_id,
    contactPhone: metadata.contactPhone || row.contact_address || undefined,
    rawChatId: metadata.rawChatId || undefined,
    conversationKey: metadata.conversationKey || metadata.targetPhone || row.contact_address || undefined,
    clientId: row.client_id,
    clientName: row.client_name,
    clientCompany: row.client_company,
    tags: Array.isArray(row.tags) ? row.tags : [],
    comments: Array.isArray(row.comments) ? row.comments : [],
    lastMessageAt: row.last_message_at,
    lastBody: row.last_message_preview,
    lastDirection: row.direction
  };
}

export function emailToUnifiedConversation(email: EmailMessage): UnifiedCommunicationConversation {
  const outbound = ['sent', 'outbound', 'scheduled'].includes(email.type);
  return {
    id: `local_email_${email.id}`,
    channel: 'email',
    source_id: email.id,
    client_id: email.clientId,
    status: email.type === 'draft' || email.type === 'scheduled' ? email.type : 'open',
    direction: outbound ? 'outbound' : 'inbound',
    title: email.subject || '(No Subject)',
    subject: email.subject,
    contact_name: email.senderName || (outbound ? email.recipient : email.sender),
    contact_address: outbound ? email.recipient : email.sender,
    last_message_preview: htmlEmailToText(email.body || '').slice(0, 500),
    last_message_at: email.scheduledAt || email.date,
    read: email.read,
    is_important: email.isImportant,
    todo_at: email.todoAt,
    todo_note: email.todoNote,
    tags: email.tags || [],
    comments: email.comments || [],
    metadata: { emailType: email.type, localFallback: true }
  };
}

export function whatsappToUnifiedConversation(conversation: InboxWhatsAppConversation): UnifiedCommunicationConversation {
  return {
    id: `local_whatsapp_${conversation.id}`,
    channel: 'whatsapp',
    source_id: conversation.id,
    client_id: conversation.clientId,
    client_name: conversation.clientName,
    client_company: conversation.clientCompany,
    status: 'open',
    direction: conversation.lastDirection,
    title: conversation.clientName || conversation.contactPhone || conversation.targetPhone,
    contact_address: conversation.contactPhone || conversation.targetPhone,
    last_message_preview: conversation.lastBody || '',
    last_message_at: conversation.lastMessageAt,
    tags: conversation.tags || [],
    comments: conversation.comments || [],
    metadata: {
      targetPhone: conversation.targetPhone,
      contactPhone: conversation.contactPhone,
      rawChatId: conversation.rawChatId,
      conversationKey: conversation.conversationKey,
      localFallback: true
    }
  };
}

function decodeHtmlEntities(value: string) {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
}

export function htmlEmailToText(html: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html || '', 'text/html');
  doc.querySelectorAll([
    'script',
    'style',
    'meta',
    'link',
    'img[src*="/api/track/open/"]',
    'blockquote',
    '.gmail_quote',
    '.gmail_attr',
    '.yahoo_quoted',
    '.moz-cite-prefix',
    '.protonmail_quote',
    '.OutlookMessageHeader',
    '[type="cite"]'
  ].join(',')).forEach(node => node.remove());
  const htmlWithBreaks = doc.body.innerHTML
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|li|tr|h[1-6])\s*>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '\n- ');
  return decodeHtmlEntities(htmlWithBreaks.replace(/<[^>]+>/g, ' '))
    .replace(/\r/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function extractLatestEmailText(htmlOrText: string) {
  const text = htmlEmailToText(htmlOrText);
  const separators = [
    /\n\s*On\s.+?\bwrote:\s*\n/i,
    /\n\s*-{2,}\s*Original Message\s*-{2,}\s*\n/i,
    /\n\s*From:\s.+\n\s*(Sent|Date):\s.+\n/i,
    /\n\s*鍙戜欢浜篬:锛歖\s.+\n/i,
    /\n\s*鍙戦€佹椂闂碵:锛歖\s.+\n/i,
    /\n\s*De\s*:\s.+\n\s*Envoy茅\s*:\s.+\n/i,
    /\n\s*Von:\s.+\n\s*Gesendet:\s.+\n/i,
    /\n\s*_{6,}\s*\n/
  ];
  const cutAt = separators
    .map(pattern => {
      const match = pattern.exec(text);
      return match?.index ?? -1;
    })
    .filter(index => index > 0)
    .sort((a, b) => a - b)[0];
  const latest = cutAt ? text.slice(0, cutAt) : text;
  return latest
    .split('\n')
    .filter(line => !line.trim().startsWith('>'))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function fallbackEmailKnowledgeSummary(text: string) {
  const compact = text.replace(/\s+/g, ' ').trim();
  return compact.length > 1200 ? `${compact.slice(0, 1200)}...` : compact;
}

export function getInboxFilterForEmail(email: EmailMessage): 'inbox' | 'sent' | 'scheduled' | 'drafts' {
  if (email.type === 'sent' || email.type === 'outbound') return 'sent';
  if (email.type === 'scheduled') return 'scheduled';
  if (email.type === 'draft') return 'drafts';
  return 'inbox';
}
