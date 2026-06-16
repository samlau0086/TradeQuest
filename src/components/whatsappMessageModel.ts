import { type Comment } from '../store';

export interface WhatsAppHubClient {
  id: string;
  name: string;
  phone?: string;
  status: string;
  quota?: { sentToday: number; dailyQuota: number; remaining: number; replyRate: number };
}

export interface WhatsAppTranslation {
  language?: string;
  kind?: 'inbound_translation' | 'outbound_original' | string;
  text: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  bodyHash: string;
  skipped?: boolean;
  modelId?: string | null;
  updatedAt?: string;
}

export interface WhatsAppHubMessage {
  id: string;
  client_id: string;
  direction: 'inbound' | 'outbound';
  sender: string;
  recipient: string;
  body: string;
  message_type?: string;
  payload?: any;
  translation?: WhatsAppTranslation;
  created_at: string;
  received_at?: string;
}

export interface WhatsAppConversation {
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
  comments: Comment[];
  agentContextAnalysis?: any;
  agentContextAnalysisKey?: string;
  whatsappSummary?: string;
  whatsappSummaryKeyPoints?: string[];
  whatsappSummaryNextStep?: string;
  whatsappSummaryMessageId?: string;
  whatsappSummaryUpdatedAt?: string | null;
}

export const cleanWhatsAppPhone = (value: string) => value.replace(/[^0-9]/g, '');
export const isWhatsAppChatId = (value: string) => /@(?:lid|c\.us|g\.us|broadcast)$/i.test(value || '');

export function simpleHash(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return String(Math.abs(hash));
}

const whatsappMessageCacheKey = (targetPhone: string) => `tradequest.whatsapp.messages.cache.v1.${targetPhone}`;
const whatsappTranslationCacheKey = (targetPhone: string, language: 'en' | 'zh') => `tradequest.whatsapp.translations.v2.${language}.${targetPhone}`;

export function readCachedWhatsAppMessages(targetPhone: string): WhatsAppHubMessage[] {
  try {
    const raw = sessionStorage.getItem(whatsappMessageCacheKey(targetPhone));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeCachedWhatsAppMessages(targetPhone: string, messages: WhatsAppHubMessage[]) {
  try {
    sessionStorage.setItem(whatsappMessageCacheKey(targetPhone), JSON.stringify(messages.slice(-300)));
  } catch {
    // Session storage is only a speed cache.
  }
}

export function readCachedWhatsAppTranslations(targetPhone: string, language: 'en' | 'zh'): Record<string, WhatsAppTranslation> {
  try {
    const raw = localStorage.getItem(whatsappTranslationCacheKey(targetPhone, language));
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function writeCachedWhatsAppTranslations(targetPhone: string, language: 'en' | 'zh', translations: Record<string, WhatsAppTranslation>) {
  try {
    localStorage.setItem(whatsappTranslationCacheKey(targetPhone, language), JSON.stringify(translations));
  } catch {
    // Browser translation cache is optional; database remains the source of truth.
  }
}

export function mapUnifiedWhatsAppMessage(row: any): WhatsAppHubMessage {
  const payload = row.payload || {};
  return {
    id: row.source_message_id || row.id,
    client_id: payload.hubClientId || payload.clientId || payload.client_id || '',
    direction: row.direction === 'inbound' ? 'inbound' : 'outbound',
    sender: row.sender || '',
    recipient: row.recipient || '',
    body: row.body || '',
    message_type: row.message_type || payload.messageType || 'text',
    payload,
    translation: payload.translation,
    created_at: row.source_created_at || row.created_at,
    received_at: row.created_at
  };
}

export const resolveWhatsAppMediaUrl = (url: string, hubBaseUrl?: string) => {
  const rawUrl = String(url || '').trim();
  const baseUrl = String(hubBaseUrl || '').replace(/\/+$/, '');
  if (!rawUrl) return '';
  if (rawUrl.startsWith('/')) return baseUrl ? `${baseUrl}${rawUrl}` : rawUrl;
  try {
    const parsed = new URL(rawUrl);
    if (baseUrl && parsed.pathname.startsWith('/uploads/') && parsed.origin === window.location.origin) {
      return `${baseUrl}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    // Non-URL values are left untouched.
  }
  return rawUrl;
};

export const getWhatsAppMessageMedia = (message: WhatsAppHubMessage, hubBaseUrl?: string) => {
  const payload = message.payload || {};
  const media = payload.media || payload.file || payload.attachment || {};
  const url = resolveWhatsAppMediaUrl(media.url || media.mediaUrl || media.fileUrl || payload.mediaUrl || payload.fileUrl || payload.url || '', hubBaseUrl);
  const mimeType = media.mimeType || media.type || payload.mimeType || payload.type || '';
  const name = media.originalName || media.filename || media.name || payload.originalName || payload.filename || payload.name || message.message_type || 'Media';
  const lowerMime = String(mimeType || '').toLowerCase();
  const lowerName = String(name || url || '').toLowerCase();
  const isImage = lowerMime.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(lowerName);
  const isVideo = lowerMime.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogg)$/i.test(lowerName);
  const hasMedia = Boolean(payload.hasMedia || url || media.url || message.message_type !== 'chat');
  return { hasMedia, url, mimeType, name, isImage, isVideo };
};
