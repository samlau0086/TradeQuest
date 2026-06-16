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
